/**
 * A record replicated from a peer gets a vector on THIS instance.
 *
 * ## The bug
 *
 * `embedding` is a derived field, deliberately excluded from replication (`merkle.ts` `DERIVED_FIELDS`)
 * because two peers may run different models. Sync ingest is a plain `replaceOne` of the incoming
 * document. Put those together and a record arriving from a peer had **no vector on the receiving
 * instance, and nothing ever gave it one**.
 *
 * A vectorless record is invisible to recall — the vector search never returns it, and the lexical channel
 * needs an embedding to compute a real similarity and skips what it cannot score. So an instance could
 * hold a peer's entire knowledge base and answer nothing from it, silently, until an operator happened to
 * run a manual whole-space `POST /reindex`. Nothing measured it and nothing reported it.
 *
 * ## What this pins
 *
 * The decision, not the route. `enqueueIngestedRecord` is what every ingest write site calls, so this
 * tests the thing all twelve of them share: an unembedded arrival is queued, an arrival that already
 * carries a vector is left alone, and the job names the right record.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/sync-ingest-embeds-db.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'general';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-sync-embed-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;

let mongo, queue;
const jobs = () => mongo.col(`${SPACE}_embed_jobs`);

describe('a synced-in record is queued for embedding', { skip }, () => {
  before(async () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(
      { spaces: [{ id: SPACE, label: 'General' }], networks: [], tokens: [] }, null, 2,
    ));
    mongo = await openTestMongo('syncembed');
    const loader = await import('../../server/dist/config/loader.js');
    loader.loadConfig();
    queue = await import('../../server/dist/brain/embed-queue.js');
  });

  after(async () => {
    await closeTestMongo();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  beforeEach(async () => { await jobs().deleteMany({}); });

  it('an arrival with no vector is queued', async () => {
    await queue.enqueueIngestedRecord(SPACE, 'memory', { _id: 'm-1' });
    const job = await jobs().findOne({ _id: 'memory:m-1' });
    assert.ok(job, 'the peer stripped the embedding, so this instance must compute one');
    assert.equal(job.status, 'pending');
    assert.equal(job.recordType, 'memory');
    assert.equal(job.recordId, 'm-1');
  });

  it('an arrival that already carries a vector is left alone', async () => {
    // A peer that DOES send one — an older build, or a future change of mind about derived fields —
    // should not have it thrown away and recomputed.
    await queue.enqueueIngestedRecord(SPACE, 'entity', { _id: 'e-1', embedding: [0.1, 0.2, 0.3] });
    assert.equal(await jobs().countDocuments({}), 0);
  });

  it('an empty vector counts as no vector', async () => {
    await queue.enqueueIngestedRecord(SPACE, 'edge', { _id: 'g-1', embedding: [] });
    assert.ok(await jobs().findOne({ _id: 'edge:g-1' }), 'an empty array is not an embedding');
  });

  it('every sync-ingest write site enqueues', () => {
    // Scoped from the SHAPE of a write, not a list of route names — a name list is how the merge-rule
    // sweep missed its twelfth copy. Every `.replaceOne(`/`.insertOne(` into a synced brain collection
    // must be followed by an enqueue, or a record can still arrive and never be embedded.
    const src = execFileSync('git', ['show', 'HEAD:server/src/api/sync/docs.ts'], { encoding: 'utf8' }).length
      ? fs.readFileSync('server/src/api/sync/docs.ts', 'utf8')
      : '';
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).filter(l => !/^\s*\/\//.test(l));

    const writes = code.filter(l =>
      /col<\w+>\(`\$\{spaceId\}_(memories|entities|edges|chrono)`\)\.(replaceOne|insertOne)\(/.test(l)).length;
    const enqueues = code.filter(l => /enqueueIngestedRecord\(/.test(l)).length;

    assert.ok(writes > 0, 'the detector must actually find the writes it is gating');
    assert.equal(enqueues, writes,
      `${writes} sync-ingest write(s) into a synced brain collection, but ${enqueues} enqueue(s). `
      + 'A write without one leaves a record that is stored, replicated, and permanently unsearchable '
      + 'on this instance.');
  });
});
