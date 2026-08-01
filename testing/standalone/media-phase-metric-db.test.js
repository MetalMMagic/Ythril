/**
 * Database-level test: the phase gauge reports zeros, not silence.
 *
 * `ythril_media_jobs_processing` says a job is running. It cannot say *what it is doing*, which is the only
 * question worth asking when one document has been "processing" for twenty minutes — reading, embedding, or
 * wedged all look identical. `ythril_media_job_phase` aggregates the step the worker already records with
 * every heartbeat, so the answer costs no new instrumentation.
 *
 * The failure mode being pinned is the one that makes a metric useless rather than wrong: a label set that
 * *disappears* when its count drops to zero. `embed` present at 1 and then absent is indistinguishable, in
 * PromQL, from a metric that was never emitted — so an alert on "stuck in embed" silently stops evaluating
 * exactly when the job leaves that phase. Once a step has been seen it must report `0`.
 *
 * A gauge with a `collect()` hook can only be checked against a real database: the numbers come out of a
 * query, and a fixture would be asserting the test's own aggregation.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/media-phase-metric-db.test.js
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'general';
const TEMP_CONFIG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-phase-metric-config.json');
let mongo, jobs, mediaJobPhase, embedChunksTotal;

/** Read the gauge the way a scrape does — through collect(), not by trusting the last set(). */
async function phaseCounts() {
  const { values } = await mediaJobPhase.get();
  const out = {};
  for (const v of values) if (v.labels.space === SPACE) out[v.labels.step] = v.value;
  return out;
}

async function insertProcessing(id, step) {
  await jobs.insertOne({
    _id: id, spaceId: SPACE, filePath: id, mimeType: 'application/pdf', mediaType: 'text',
    status: 'processing', attempts: 1, maxAttempts: 3, lastError: null,
    claimedAt: new Date().toISOString(), progressAt: new Date().toISOString(),
    ...(step ? { progress: { step, steps: [step], done: 1, total: 9 } } : {}),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}

describe('ythril_media_job_phase — against a real MongoDB', { skip }, () => {
  before(async () => {
    // The gauge enumerates spaces from config, so give the loader a real one on disk — the same way the
    // other loader-backed standalone tests do, rather than a test-only hook inside production code.
    fs.writeFileSync(TEMP_CONFIG, JSON.stringify({
      instanceId: 'phase-metric-test', instanceName: 'Phase', tokens: [], networks: [],
      spaces: [{ id: SPACE, name: 'General' }],
    }));
    process.env['CONFIG_PATH'] = TEMP_CONFIG;

    mongo = await openTestMongo('phasemetric');
    ({ mediaJobPhase, embedChunksTotal } = await import('../../server/dist/metrics/registry.js'));
    (await import('../../server/dist/config/loader.js')).loadConfig();
    jobs = mongo.col(`${SPACE}_media_jobs`);
  });

  after(async () => {
    await closeTestMongo();
    try { fs.unlinkSync(TEMP_CONFIG); } catch { /* already gone */ }
  });

  beforeEach(async () => { await jobs.deleteMany({}); });

  it('counts in-flight jobs by the step they are in', async () => {
    await insertProcessing('a.pdf', 'embed');
    await insertProcessing('b.pdf', 'embed');
    await insertProcessing('c.pdf', 'vlm');

    const counts = await phaseCounts();
    assert.equal(counts.embed, 2);
    assert.equal(counts.vlm, 1);
  });

  it('reports a step it has SEEN as 0 rather than dropping the series', async () => {
    await insertProcessing('a.pdf', 'embed');
    assert.equal((await phaseCounts()).embed, 1);

    await jobs.deleteMany({});
    const after = await phaseCounts();
    assert.equal(after.embed, 0, 'an absent series cannot be alerted on — 0 is the whole point');
  });

  it('shows a job with no step report as `unknown`, not as no job at all', async () => {
    await insertProcessing('legacy.pdf', null);
    assert.equal((await phaseCounts()).unknown, 1);
  });

  it('ignores jobs that are not processing', async () => {
    await insertProcessing('a.pdf', 'embed');
    await jobs.updateOne({ _id: 'a.pdf' }, { $set: { status: 'complete' } });
    assert.equal((await phaseCounts()).embed, 0);
  });

  it('the chunk counter exists from startup, so a dashboard has a series before the first job', async () => {
    // Pre-initialised with .inc(0), matching the convention the other counters follow: a panel that reads
    // `rate(ythril_embed_chunks_total[5m])` must not be empty until the first document arrives.
    const { values } = await embedChunksTotal.get();
    assert.ok(values.length >= 1, 'no series — the HELP/TYPE lines would be missing too');
  });
});
