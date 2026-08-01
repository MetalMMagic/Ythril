/**
 * Database-level test: a re-queued job's previous holder finds out.
 *
 * ## What was broken
 *
 * Stall recovery flips a `processing` job back to `pending` when nothing has reported progress for
 * `stalledJobTimeoutMs`. That is what makes a crashed pod's work resumable — but it had no way to tell the
 * previous holder, and the previous holder is not always dead. A phase that reported no progress (chunk
 * embedding reported none at all) looked identical to a wedged one, so a large document was recovered
 * mid-flight and then run TWICE: the original still embedding, the new claimant starting over, both writing
 * the same chunk `_id`s and competing for the CPU the first one was already too slow on.
 *
 * The lease is one field. Every heartbeat matches on it; recovery clears it; a heartbeat that matches
 * nothing is the signal to stop. The question "did this update match the document" has exactly one correct
 * answer and MongoDB is the only thing that knows it, which is why this test is database-level: a fixture
 * matcher would be asserting the author's belief about `matchedCount`.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/job-lease-db.test.js
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'general';
const OLD = '2026-07-22T11:00:00.000Z';   // long before any cutoff → stalled

let mongo, jobs, files;
let touchJobProgress, resetStalledJobs, claimNextJob, enqueueMediaJob;

/** A `processing` job as a worker would have left it, with an explicit claim token. */
async function insertProcessing(id, claimToken, progressAt = OLD) {
  await jobs.insertOne({
    _id: id, spaceId: SPACE, filePath: id, mimeType: 'application/pdf', mediaType: 'text',
    status: 'processing', attempts: 1, maxAttempts: 3, lastError: null,
    claimedAt: OLD, progressAt, claimToken,
    progress: { step: 'embed', steps: ['embed'], done: 143, total: 512 },
    createdAt: OLD, updatedAt: OLD,
  });
}

describe('job lease — against a real MongoDB', { skip }, () => {
  before(async () => {
    mongo = await openTestMongo('joblease');
    ({ touchJobProgress, resetStalledJobs, claimNextJob, enqueueMediaJob } =
      await import('../../server/dist/files/media/job-queue.js'));
    jobs = mongo.col(`${SPACE}_media_jobs`);
    files = mongo.col(`${SPACE}_files`);
  });

  after(async () => { await closeTestMongo(); });

  beforeEach(async () => { await jobs.deleteMany({}); await files.deleteMany({}); });

  it('a claim carries a token, and the token is what the heartbeat matches', async () => {
    await jobs.insertOne({
      _id: 'fresh.pdf', spaceId: SPACE, filePath: 'fresh.pdf', mimeType: 'application/pdf',
      mediaType: 'text', status: 'pending', attempts: 0, maxAttempts: 3, lastError: null,
      claimedAt: null, createdAt: OLD, updatedAt: OLD,
    });
    const claimed = await claimNextJob([SPACE]);
    assert.ok(claimed, 'the job should be claimable');
    assert.ok(claimed.claimToken, 'a claim with no token cannot be checked');

    assert.equal(await touchJobProgress(SPACE, 'fresh.pdf', undefined, claimed.claimToken), true);
    assert.equal(await touchJobProgress(SPACE, 'fresh.pdf', undefined, 'some-other-run'), false,
      'a token from another run must not pass');
  });

  it('recovery CLEARS the token, so the old holder\'s next heartbeat reports false', async () => {
    // This is the whole fix: the previous holder learns it has been replaced, on the write it was already
    // making, and stops instead of racing the new claimant.
    await insertProcessing('slow.pdf', 'run-one');
    await resetStalledJobs([SPACE], 60_000);

    const after = await jobs.findOne({ _id: 'slow.pdf' });
    assert.equal(after.status, 'pending', 'recovery still re-queues the job');
    assert.equal(after.claimToken, null, 'and hands the old holder a way to notice');

    assert.equal(await touchJobProgress(SPACE, 'slow.pdf', undefined, 'run-one'), false);
  });

  it('a heartbeat from a replaced holder does not resurrect the job it lost', async () => {
    // The dangerous version of this bug: the old holder's heartbeat sets `progressAt` and `status` stays
    // whatever it is, so a losing run could keep a re-queued job looking alive and hide it from the sweep.
    await insertProcessing('slow.pdf', 'run-one');
    await resetStalledJobs([SPACE], 60_000);
    const requeuedAt = (await jobs.findOne({ _id: 'slow.pdf' })).updatedAt;

    await touchJobProgress(SPACE, 'slow.pdf', { step: 'embed', steps: ['embed'], done: 200, total: 512 }, 'run-one');

    const after = await jobs.findOne({ _id: 'slow.pdf' });
    assert.equal(after.status, 'pending', 'still pending — the new claimant owns it');
    assert.equal(after.progressAt, OLD, 'the losing run did not advance the clock');
    assert.equal(after.progress.done, 143, 'nor overwrite the progress the sweep recorded');
    assert.equal(after.updatedAt, requeuedAt);
  });

  it('the new claimant gets a DIFFERENT token, and the old one stays locked out', async () => {
    await insertProcessing('slow.pdf', 'run-one');
    await resetStalledJobs([SPACE], 60_000);

    const reclaimed = await claimNextJob([SPACE]);
    assert.ok(reclaimed, 'a recovered job must be immediately re-claimable');
    assert.notEqual(reclaimed.claimToken, 'run-one');
    assert.equal(await touchJobProgress(SPACE, 'slow.pdf', undefined, reclaimed.claimToken), true);
    assert.equal(await touchJobProgress(SPACE, 'slow.pdf', undefined, 'run-one'), false);
  });

  it('a heartbeat WITHOUT a token still works — jobs claimed by the previous build', async () => {
    // Rolling upgrade: a job claimed before this field existed has no token, and its worker passes none.
    // Refusing those would abandon every in-flight job on deploy.
    await insertProcessing('legacy.pdf', undefined);
    assert.equal(await touchJobProgress(SPACE, 'legacy.pdf', undefined, undefined), true);
    const after = await jobs.findOne({ _id: 'legacy.pdf' });
    assert.notEqual(after.progressAt, OLD, 'the heartbeat landed');
  });

  it('a job that is not processing never matches, token or no token', async () => {
    await insertProcessing('done.pdf', 'run-one');
    await jobs.updateOne({ _id: 'done.pdf' }, { $set: { status: 'complete' } });
    assert.equal(await touchJobProgress(SPACE, 'done.pdf', undefined, 'run-one'), false);
    assert.equal(await touchJobProgress(SPACE, 'done.pdf'), false);
  });

  it('a live job is left alone — the token does not change what counts as stalled', async () => {
    await insertProcessing('busy.pdf', 'run-one', new Date().toISOString());
    await resetStalledJobs([SPACE], 60_000);
    const after = await jobs.findOne({ _id: 'busy.pdf' });
    assert.equal(after.status, 'processing');
    assert.equal(after.claimToken, 'run-one', 'a working job keeps its claim');
    assert.equal(await touchJobProgress(SPACE, 'busy.pdf', undefined, 'run-one'), true);
  });

  it('recovery reads the file size for its warning without failing when there is no file record', async () => {
    // The warning does one extra lookup per recovered job. A missing filemeta record (deleted source,
    // sync in flight) must not turn recovery into an exception — recovery is the last line of defence.
    await insertProcessing('orphan.pdf', 'run-one');
    await assert.doesNotReject(resetStalledJobs([SPACE], 60_000));
    assert.equal((await jobs.findOne({ _id: 'orphan.pdf' })).status, 'pending');

    await insertProcessing('sized.pdf', 'run-two');
    await files.insertOne({ _id: 'sized.pdf', spaceId: SPACE, path: 'sized.pdf', sizeBytes: 358_400 });
    await assert.doesNotReject(resetStalledJobs([SPACE], 60_000));
    assert.equal((await jobs.findOne({ _id: 'sized.pdf' })).status, 'pending');
  });

  it('still increments attempts once per recovery', async () => {
    // `returnDocument` changed from 'after' to 'before' so the warning can name the step the job reached.
    // The counter must be unaffected by that: a second increment would burn the retry budget twice as fast.
    await insertProcessing('slow.pdf', 'run-one');
    await resetStalledJobs([SPACE], 60_000);
    assert.equal((await jobs.findOne({ _id: 'slow.pdf' })).attempts, 2);
  });

  it('enqueue does not invent a token — only a claim does', async () => {
    await files.insertOne({ _id: 'new.pdf', spaceId: SPACE, path: 'new.pdf', sizeBytes: 10 });
    await enqueueMediaJob(SPACE, 'new.pdf', 'application/pdf', 'text');
    const queued = await jobs.findOne({ _id: 'new.pdf' });
    assert.equal(queued.status, 'pending');
    assert.ok(!queued.claimToken, 'a pending job has no holder to identify');
  });
});
