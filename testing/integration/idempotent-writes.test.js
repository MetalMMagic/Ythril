/**
 * A retried write must converge, not duplicate.
 *
 * ## The finding this closes
 *
 * An MCP agent or an integrator whose request times out will retry. Before this, what happened next differed per
 * record type by three different mechanisms, and none of it was documented:
 *
 * | type | a retried create | mechanism |
 * |---|---|---|
 * | entity | idempotent | a caller-supplied `id` makes it an upsert |
 * | edge | idempotent | natural key `(from, to, label)` |
 * | memory | **DUPLICATED** | no id parameter, no natural key |
 * | chrono | **DUPLICATED** | no id parameter, no natural key |
 *
 * Memory is the highest-volume write type and the one an agent retries most, so it had the worst of it. The owner
 * chose the caller-supplied id over an `Idempotency-Key` header because it reuses a path already shipped and
 * tested on entities: no new storage, no TTL to expire, and an agent that generates one UUID before its first
 * attempt gets idempotency for free.
 *
 * ## Why these tests need a real instance
 *
 * The whole behaviour is "what is in the collection after the second call", which is a database question. The
 * offline gate (`idempotent-writes-contract.test.js`) holds the parts that can be checked from source — that the
 * routes validate the shape, that the MCP tools advertise it, that the docs describe all four behaviours. Only
 * this file can prove the record count.
 *
 * Run: node --test testing/integration/idempotent-writes.test.js
 * (needs the Docker test stack: `npm run test:up`)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');

let tok;
before(() => { tok = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim(); });

/** A fresh UUID v4 per test, so one test's id can never make another's assertion pass. */
const uuid = () => crypto.randomUUID();

const listMemories = async () => {
  const r = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories/query', {});
  return r.body?.memories ?? r.body?.results ?? [];
};

describe('memories: a retry with the same id converges', () => {
  it('two identical creates with one id produce ONE record', async () => {
    const id = uuid();
    const fact = `idempotency probe ${id}`;

    const first = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories', { id, fact });
    assert.equal(first.status, 201, `first create failed: ${JSON.stringify(first.body)}`);
    assert.equal(first.body._id, id, 'the supplied id did not become the record id, so a retry cannot find it');

    // The retry. Byte-identical payload, which is what a client resending after a timeout actually sends.
    const second = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories', { id, fact });
    assert.equal(second.status, 201, `retry failed: ${JSON.stringify(second.body)}`);
    assert.equal(second.body._id, id, 'the retry produced a different id');

    const mine = (await listMemories()).filter(m => m.fact === fact);
    assert.equal(mine.length, 1,
      `the retry created a second memory (${mine.length} records with this fact). This is the bug: an agent whose `
      + 'request timed out and retried used to double every record it wrote.');
  });

  it('the retry moves seq and updatedAt — it converges, it is not a no-op', async () => {
    // Stated in the docs and asserted here, because "idempotent" is often read as "no effect" and that would be
    // wrong: the second write really happens, it just lands on the same record.
    const id = uuid();
    const fact = `seq probe ${id}`;
    const first = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories', { id, fact });
    const second = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories', { id, fact });

    assert.ok(second.body.seq > first.body.seq,
      `seq did not advance (${first.body.seq} -> ${second.body.seq}); the second write did not happen at all, which `
      + 'is a different behaviour from the one documented');
  });

  it('tags and properties MERGE on convergence, matching the entity path', async () => {
    const id = uuid();
    const fact = `merge probe ${id}`;
    await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories',
      { id, fact, tags: ['first'], properties: { a: '1' } });
    const second = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories',
      { id, fact, tags: ['second'], properties: { b: '2' } });

    assert.deepEqual([...second.body.tags].sort(), ['first', 'second'],
      'tags replaced rather than merged — entities merge, and one rule across four record types is the point');
    assert.deepEqual(second.body.properties, { a: '1', b: '2' }, 'properties did not shallow-merge');
  });

  it('omitting the id still creates a new record every time', async () => {
    // The default must not change. Every existing client omits the id and relies on this.
    const fact = `no-id probe ${uuid()}`;
    await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories', { fact });
    await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories', { fact });
    const mine = (await listMemories()).filter(m => m.fact === fact);
    assert.equal(mine.length, 2, 'omitting the id silently deduplicated, which would break every existing caller');
  });

  it('a malformed id is refused with 400, not stored', async () => {
    // A caller-supplied id becomes the sync identity of a record that replicates across networks.
    for (const bad of ['not-a-uuid', '', '../../etc/passwd', '12345']) {
      const r = await post(INSTANCES.a, tok, '/api/brain/spaces/general/memories',
        { id: bad, fact: `bad id ${bad}` });
      assert.equal(r.status, 400, `id "${bad}" was accepted (status ${r.status}) and became a record identity`);
    }
  });
});

describe('chrono: the same contract', () => {
  it('two identical creates with one id produce ONE entry', async () => {
    const id = uuid();
    const title = `chrono idempotency ${id}`;
    const body = { id, title, type: 'event', startsAt: '2026-01-01T00:00:00.000Z' };

    const first = await post(INSTANCES.a, tok, '/api/brain/spaces/general/chrono', body);
    assert.equal(first.status, 201, `first create failed: ${JSON.stringify(first.body)}`);
    assert.equal(first.body._id, id, 'the supplied id did not become the entry id');

    const second = await post(INSTANCES.a, tok, '/api/brain/spaces/general/chrono', body);
    assert.equal(second.status, 201, `retry failed: ${JSON.stringify(second.body)}`);

    const r = await post(INSTANCES.a, tok, '/api/brain/spaces/general/chrono/query', {});
    const entries = r.body?.entries ?? r.body?.chrono ?? r.body?.results ?? [];
    const mine = entries.filter(e => e.title === title);
    assert.equal(mine.length, 1, `the retry created a second chrono entry (${mine.length} with this title)`);
  });

  it('a malformed id is refused with 400', async () => {
    const r = await post(INSTANCES.a, tok, '/api/brain/spaces/general/chrono',
      { id: 'nope', title: 'bad', type: 'event', startsAt: '2026-01-01T00:00:00.000Z' });
    assert.equal(r.status, 400, `a malformed chrono id was accepted (status ${r.status})`);
  });
});

describe('entities and edges: the behaviour that already existed still holds', () => {
  it('an entity retry with the same id converges', async () => {
    // Regression cover for the path the new ones were modelled on — if this changes, the "one rule across four
    // types" claim in the docs stops being true and nothing else would notice.
    const id = uuid();
    const name = `idem entity ${id}`;
    const first = await post(INSTANCES.a, tok, '/api/brain/spaces/general/entities', { id, name, type: 'person' });
    assert.equal(first.status, 201, `entity create failed: ${JSON.stringify(first.body)}`);
    const second = await post(INSTANCES.a, tok, '/api/brain/spaces/general/entities', { id, name, type: 'person' });
    assert.ok(second.status === 200 || second.status === 201, `entity retry failed: ${second.status}`);
    assert.equal(second.body.entity?._id ?? second.body._id, id, 'the entity retry did not converge on the same id');
  });

  it('an edge retry converges on its natural key without any id', async () => {
    const suffix = uuid().slice(0, 8);
    const from = `edge-from-${suffix}`;
    const to = `edge-to-${suffix}`;
    for (const n of [from, to]) {
      await post(INSTANCES.a, tok, '/api/brain/spaces/general/entities', { name: n, type: 'person' });
    }
    const body = { from, to, label: 'knows' };
    const first = await post(INSTANCES.a, tok, '/api/brain/spaces/general/edges', body);
    assert.ok(first.status === 200 || first.status === 201, `edge create failed: ${JSON.stringify(first.body)}`);
    const second = await post(INSTANCES.a, tok, '/api/brain/spaces/general/edges', body);
    assert.ok(second.status === 200 || second.status === 201, `edge retry failed: ${second.status}`);
    const firstId = first.body.edge?._id ?? first.body._id;
    const secondId = second.body.edge?._id ?? second.body._id;
    assert.equal(secondId, firstId,
      'the edge retry created a second edge — the (from, to, label) natural key stopped being idempotent');
  });
});
