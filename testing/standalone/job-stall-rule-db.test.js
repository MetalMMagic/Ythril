/**
 * Database-level test: MongoDB agrees with `stalledJobFilter`.
 *
 * `job-stall-rule.test.js` already checks the rule against hand-built fixtures and a minimal JS
 * matcher. That proves the rule is what its author meant. It cannot prove the thing that actually
 * matters — that **MongoDB** selects the same documents — because the matcher is the test's own code,
 * and a matcher and a database can disagree.
 *
 * They do disagree here, and it is load-bearing. `stalledJobFilter` has three `$or` branches:
 *
 *     { progressAt: { $lt: cutoff } }                              // ticked, but too long ago
 *     { progressAt: { $exists: false }, claimedAt: { $lt: cutoff } } // never ticked (old build)
 *     { progressAt: null,              claimedAt: { $lt: cutoff } } // ticked null
 *
 * In MongoDB, `{ progressAt: null }` matches documents where the field is **missing** as well as
 * those where it is explicitly null — so branch 3 already subsumes branch 2. Written the obvious way
 * in JS (`doc.progressAt === null`) it does not, so the fixture test believes branches 2 and 3 are
 * independent. Equally, `{ $lt: '<iso string>' }` does **not** match a null or missing value in
 * MongoDB (BSON type bracketing), which is precisely why branches 2 and 3 have to exist at all — but
 * a JS matcher doing `null < '2026-…'` gets `false` for its own unrelated reason, so it agrees by
 * accident rather than by rule.
 *
 * Both facts are asserted below against a real server. This is the queue's recovery path: a job that
 * this filter fails to select is a job that never gets recovered, and nothing surfaces it.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/job-stall-rule-db.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const CUTOFF = '2026-07-22T12:00:00.000Z';
const OLD = '2026-07-22T11:00:00.000Z'; // before the cutoff → stalled
const NEW = '2026-07-22T13:00:00.000Z'; // after the cutoff  → alive

let mongo;
let stalledJobFilter;
let jobs;

/** Insert a job document, omitting `progressAt` entirely when it is `undefined`. */
async function insertJob(_id, status, claimedAt, progressAt) {
  const doc = { _id, spaceId: 'general', status, claimedAt };
  if (progressAt !== undefined) doc.progressAt = progressAt;
  await jobs.insertOne(doc);
}

/** Ids MongoDB selects for the given cutoff, sorted — the real query, not a re-implementation. */
async function selected(cutoff = CUTOFF) {
  const found = await jobs.find(mongo.asFilter(stalledJobFilter(cutoff))).toArray();
  return found.map(d => d._id).sort();
}

describe('stalledJobFilter — against a real MongoDB', { skip }, () => {
  before(async () => {
    mongo = await openTestMongo('jobstall');
    ({ stalledJobFilter } = await import('../../server/dist/files/media/job-queue.js'));
    jobs = mongo.col('general_media_jobs');
  });

  after(async () => { await closeTestMongo(); });

  beforeEach(async () => { await jobs.deleteMany({}); });

  it('selects a job whose heartbeat went quiet before the cutoff', async () => {
    await insertJob('stale-tick', 'processing', OLD, OLD);
    assert.deepEqual(await selected(), ['stale-tick']);
  });

  it('leaves a job that ticked after the cutoff alone', async () => {
    await insertJob('alive', 'processing', OLD, NEW);
    assert.deepEqual(await selected(), []);
  });

  it('selects a job claimed long ago that has NO progressAt field at all', async () => {
    // The "claimed by a build older than the heartbeat" case. Without this the job is immortal:
    // nothing ever recovers it, and the file silently never finishes.
    await insertJob('never-ticked', 'processing', OLD, undefined);
    assert.deepEqual(await selected(), ['never-ticked']);
  });

  it('selects a job claimed long ago whose progressAt is explicitly null', async () => {
    await insertJob('null-tick', 'processing', OLD, null);
    assert.deepEqual(await selected(), ['null-tick']);
  });

  it('does NOT select a never-ticked job that was claimed recently', async () => {
    await insertJob('fresh-claim', 'processing', NEW, undefined);
    await insertJob('fresh-null', 'processing', NEW, null);
    assert.deepEqual(await selected(), []);
  });

  it('ignores jobs that are not processing, however old', async () => {
    for (const status of ['pending', 'done', 'failed', 'partial']) {
      await insertJob(`${status}-old`, status, OLD, OLD);
    }
    assert.deepEqual(await selected(), []);
  });

  // ── The divergences the fixture test cannot see ────────────────────────────

  it('MongoDB treats `{progressAt: null}` as matching a MISSING field — branch 3 subsumes branch 2', async () => {
    // The fact itself, asserted directly rather than inferred. If a future edit "simplifies" the
    // filter by deleting the $exists branch, this is what says that is safe; if MongoDB ever changed
    // this behaviour, this is what says it is not.
    await insertJob('missing-field', 'processing', OLD, undefined);
    const byNull = await jobs.find(mongo.asFilter({ progressAt: null })).toArray();
    assert.deepEqual(byNull.map(d => d._id), ['missing-field'],
      '{progressAt: null} must match a document with no progressAt field');
  });

  it('MongoDB does NOT match null/missing values with `$lt: <string>` — which is why branches 2 and 3 exist', async () => {
    // BSON type bracketing: a range predicate only matches values of the compared type. So the first
    // branch alone can never recover a job that has not ticked, no matter how old it is.
    await insertJob('null-tick', 'processing', OLD, null);
    await insertJob('missing-tick', 'processing', OLD, undefined);
    const byLt = await jobs.find(mongo.asFilter({ progressAt: { $lt: CUTOFF } })).toArray();
    assert.deepEqual(byLt.map(d => d._id), [],
      '$lt on a string must not match null or missing — if it did, branches 2/3 would be dead code');
  });

  it('picks exactly the stalled jobs out of a mixed queue', async () => {
    await insertJob('a-stale-tick', 'processing', OLD, OLD);
    await insertJob('b-alive', 'processing', OLD, NEW);
    await insertJob('c-never-ticked', 'processing', OLD, undefined);
    await insertJob('d-null-tick', 'processing', OLD, null);
    await insertJob('e-fresh-claim', 'processing', NEW, undefined);
    await insertJob('f-done', 'done', OLD, OLD);
    assert.deepEqual(await selected(), ['a-stale-tick', 'c-never-ticked', 'd-null-tick']);
  });
});
