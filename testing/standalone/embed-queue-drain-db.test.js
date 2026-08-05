/**
 * The queue actually stores a vector — the happy path, end to end, with nothing faked.
 *
 * ## Why a stub HTTP endpoint rather than a stubbed `embed()`
 *
 * The subject here is the QUEUE, not the model. But a test that monkey-patches `embed()` proves the
 * worker calls a function, not that a record becomes searchable: it would pass with a broken provider
 * path, a broken config resolution, or a vector written to the wrong field.
 *
 * Ythril already supports an OpenAI-compatible HTTP embedder (`EMBEDDING_URL`), so this stands one up on
 * localhost and lets the REAL `embed()` — real config resolution, real provider selection, real response
 * parsing and dimension check — talk to it. Nothing in the path under test is replaced, and it needs no
 * 274 MB model download, which is what made the sibling suite fail in CI while passing locally.
 *
 * `provider` is left at its default `local`, so the plain `fetch` is used rather than the SSRF-guarded
 * one — correct for a loopback address, and the same choice the product makes for an on-cluster embedder.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/embed-queue-drain-db.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'general';
const DIMS = 8;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-embed-drain-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;
process.env['EMBEDDING_DIMENSIONS'] = String(DIMS);

/** Requests the stub served, so a test can assert WHAT was embedded, not merely that something was. */
let seen = [];
/** Flip to make the endpoint fail, without tearing the server down. */
let failNext = false;

let server, mongo, memory, entities, edges, chrono, queue, worker;

const jobs = () => mongo.col(`${SPACE}_embed_jobs`);
const memories = () => mongo.col(`${SPACE}_memories`);

/** A deterministic pseudo-vector, so an assertion can name the expected numbers. */
const vectorFor = (text) => Array.from({ length: DIMS }, (_, i) => ((text.length + i) % 10) / 10);

describe('brain embedding queue drains (real MongoDB, real embed() over a stub endpoint)', { skip }, () => {
  before(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        if (failNext) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'stub is down' } }));
          return;
        }
        const input = JSON.parse(body).input;
        seen.push(input);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ embedding: vectorFor(input) }] }));
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    process.env['EMBEDDING_URL'] = `http://127.0.0.1:${server.address().port}`;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(
      { spaces: [{ id: SPACE, label: 'General' }], networks: [], tokens: [] }, null, 2,
    ));
    mongo = await openTestMongo('embeddrain');
    const loader = await import('../../server/dist/config/loader.js');
    loader.loadConfig();
    memory = await import('../../server/dist/brain/memory.js');
    entities = await import('../../server/dist/brain/entities.js');
    edges = await import('../../server/dist/brain/edges.js');
    chrono = await import('../../server/dist/brain/chrono.js');
    queue = await import('../../server/dist/brain/embed-queue.js');
    worker = await import('../../server/dist/brain/embed-worker.js');
  });

  after(async () => {
    await closeTestMongo();
    await new Promise(resolve => server.close(resolve));
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  beforeEach(async () => {
    await jobs().deleteMany({});
    await memories().deleteMany({});
    await mongo.col(`${SPACE}_entities`).deleteMany({});
    await mongo.col(`${SPACE}_edges`).deleteMany({});
    await mongo.col(`${SPACE}_chrono`).deleteMany({});
    seen = [];
    failNext = false;
    queue.resetEmbedPendingHint();
  });

  it('a queued memory gets its vector, and the job is gone', async () => {
    const doc = await memory.remember(SPACE, 'node-7 runs the platform apps', [], ['prod']);
    assert.equal((await memories().findOne({ _id: doc._id })).embedding, undefined,
      'precondition: the write did not embed');

    assert.equal(await worker.runOneEmbedJob(), true);

    const stored = await memories().findOne({ _id: doc._id });
    assert.ok(Array.isArray(stored.embedding), 'the record now has a vector');
    assert.equal(stored.embedding.length, DIMS);
    assert.ok(stored.embeddingModel, 'and the model that produced it');
    assert.equal(await jobs().countDocuments({}), 0, 'a finished job is deleted, not left as a tombstone');
  });

  it('the queued job embeds the SAME text the inline path would have', async () => {
    // The property that makes async embedding invisible to the searcher. If the worker built the text
    // differently, a record's vector would silently stop corresponding to its own content — no error,
    // nothing to grep for, only worse recall.
    const doc = await memory.remember(SPACE, 'shared text check', ['e-missing'], ['a', 'b'], 'a description');
    const storedBefore = await memories().findOne({ _id: doc._id });

    await worker.runOneEmbedJob();

    assert.equal(seen.length, 1, 'exactly one embedding call');
    assert.equal(seen[0], storedBefore.matchedText,
      'the worker embedded exactly the matchedText the write recorded');
    const after = await memories().findOne({ _id: doc._id });
    assert.deepEqual(after.embedding, vectorFor(storedBefore.matchedText));
  });

  it('the vector is stored WITHOUT advancing seq', async () => {
    // An embedding is a derived field, excluded from replication because each peer computes its own.
    // Bumping seq would broadcast a no-op change to every peer in every network, on every embedding.
    const doc = await memory.remember(SPACE, 'seq must not move', [], []);
    const before = await memories().findOne({ _id: doc._id });

    await worker.runOneEmbedJob();

    const after = await memories().findOne({ _id: doc._id });
    assert.equal(after.seq, before.seq, 'embedding is not a content change');
    assert.equal(after.updatedAt, before.updatedAt, 'and does not look like one to a peer either');
  });

  it('a transient endpoint failure is retried and then succeeds', async () => {
    const doc = await memory.remember(SPACE, 'flaky endpoint', [], []);
    const id = `memory:${doc._id}`;

    failNext = true;
    assert.equal(await worker.runOneEmbedJob(), true);
    assert.equal((await jobs().findOne({ _id: id })).status, 'pending', 'requeued, not failed');

    failNext = false;
    await jobs().updateOne({ _id: id }, { $set: { claimableAfter: null } });
    queue.resetEmbedPendingHint();
    assert.equal(await worker.runOneEmbedJob(), true);

    assert.ok(Array.isArray((await memories().findOne({ _id: doc._id })).embedding),
      'the record recovered on its own — no operator, no whole-space reindex');
    assert.equal(await jobs().countDocuments({}), 0);
  });

  it('waitForEmbedding: true embeds inline and queues nothing', async () => {
    const doc = await memory.remember(SPACE, 'searchable right now', [], [], undefined, undefined,
      undefined, undefined, { waitForEmbedding: true });

    assert.ok(Array.isArray((await memories().findOne({ _id: doc._id })).embedding),
      'the record is searchable the moment the call returns');
    assert.equal(await jobs().countDocuments({}), 0,
      'nothing to queue — there is no work left to do');
    assert.equal(seen.length, 1);
  });

  // ── All four creators, as one table ─────────────────────────────────────────
  //
  // One table rather than four tests, for the reason the merge-rule suite is one table: the failure mode
  // being guarded against is precisely that the four types are wired in four places and nobody compares
  // them. A per-type test can be updated to match whatever that type does.
  const CREATORS = [
    {
      name: 'memory', collection: 'memories',
      create: (opts) => memory.remember(SPACE, 'creator table memory', [], ['prod'], undefined, undefined,
        undefined, undefined, opts),
    },
    {
      name: 'entity', collection: 'entities',
      create: async (opts) => (await entities.upsertEntity(SPACE, 'node-9', 'machine', ['prod'],
        { rack: 'B12' }, undefined, undefined, opts)).entity,
    },
    {
      name: 'edge', collection: 'edges',
      create: (opts) => edges.upsertEdge(SPACE, 'a-9', 'b-9', 'runs-on', undefined, undefined, undefined,
        { since: '2026' }, ['prod'], undefined, undefined, opts),
    },
    {
      name: 'chrono', collection: 'chrono',
      create: (opts) => chrono.createChrono(SPACE, {
        title: 'creator table chrono', type: 'event', startsAt: '2026-08-05T09:00:00Z', tags: ['prod'],
      }, undefined, undefined, opts),
    },
  ];

  for (const c of CREATORS) {
    it(`${c.name}: the write queues, the worker embeds`, async () => {
      const doc = await c.create(undefined);
      const stored = await mongo.col(`${SPACE}_${c.collection}`).findOne({ _id: doc._id });
      assert.equal(stored.embedding, undefined, `${c.name} must not embed on the write path by default`);
      assert.equal(await jobs().countDocuments({}), 1, `${c.name} enqueued exactly one job`);

      assert.equal(await worker.runOneEmbedJob(), true);
      const after = await mongo.col(`${SPACE}_${c.collection}`).findOne({ _id: doc._id });
      assert.ok(Array.isArray(after.embedding), `${c.name} got its vector from the queue`);
      assert.equal(await jobs().countDocuments({}), 0);
    });

    it(`${c.name}: waitForEmbedding embeds inline and queues nothing`, async () => {
      const doc = await c.create({ waitForEmbedding: true });
      const stored = await mongo.col(`${SPACE}_${c.collection}`).findOne({ _id: doc._id });
      assert.ok(Array.isArray(stored.embedding), `${c.name} is searchable the moment the call returns`);
      assert.equal(await jobs().countDocuments({}), 0, `${c.name} has no work left to queue`);
    });
  }

  it('all four creators agree — none embeds inline by default', async () => {
    // Stated as one comparison so a type drifting away fails here even if its own rows above were
    // updated to match it.
    const inline = {};
    for (const c of CREATORS) {
      const doc = await c.create(undefined);
      const stored = await mongo.col(`${SPACE}_${c.collection}`).findOne({ _id: doc._id });
      inline[c.name] = stored.embedding !== undefined;
    }
    assert.deepEqual(inline, { memory: false, entity: false, edge: false, chrono: false });
  });
});
