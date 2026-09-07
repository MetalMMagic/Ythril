/**
 * Two untested modules, both of them guards.
 *
 * From the QA tracker's "production modules with no importing test" list. Not a sweep — these two are
 * here because both are *guards*, and a guard with no test is indistinguishable from a guard that has
 * quietly stopped guarding.
 *
 *  - `brain/filter.ts` decides which record fields a caller may filter on. It is the allowlist standing
 *    between a user-supplied filter expression and a MongoDB query document.
 *  - `util/seq.ts` decides which `seq` values may be ingested from a peer. It exists to stop one hostile
 *    or broken document from stranding a space's counter near the protocol ceiling, after which every
 *    local write is rejected by every peer — silent, unrecoverable write loss.
 *
 * Run: node --test testing/standalone/filter-and-seq-guards.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let validateFilterExpression, buildMongoFilter, ALLOWED_FILTER_KEY_PREFIXES;
let isSeqImplausible, MAX_INGEST_SEQ, MAX_SYNC_SEQ, SEQ_CEILING_RESERVE;

before(async () => {
  ({ validateFilterExpression, buildMongoFilter, ALLOWED_FILTER_KEY_PREFIXES } =
    await import('../../server/dist/brain/filter.js'));
  ({ isSeqImplausible, MAX_INGEST_SEQ, MAX_SYNC_SEQ, SEQ_CEILING_RESERVE } =
    await import('../../server/dist/util/seq.js'));
});

const ok = f => assert.equal(validateFilterExpression(f), null);
const rejected = f => assert.match(validateFilterExpression(f) ?? '', /not allowed/);

describe('filter key allowlist — what a caller may filter on', () => {
  it('accepts each allowed key, bare and dotted', () => {
    // The allowlist itself, exported by the module under test -- the bare prefixes, since the dotted forms
    // are exercised by the three cases below. Written out here, a sixth allowed key would be untested.
    for (const k of ALLOWED_FILTER_KEY_PREFIXES.filter(p => !p.endsWith('.'))) ok({ [k]: { eq: 'x' } });
    ok({ 'properties.owner': { eq: 'x' } });
    ok({ 'properties.a.b.c': { eq: 'x' } });
    ok({ 'tags.0': { eq: 'x' } });
  });

  it('rejects Mongo operators at the top level — the injection this exists to stop', () => {
    for (const k of ['$where', '$or', '$and', '$expr', '$function', '$nor']) {
      rejected({ [k]: { eq: 1 } });
    }
  });

  it('rejects prototype-pollution shaped keys', () => {
    for (const k of ['__proto__', 'constructor', 'prototype']) rejected({ [k]: { eq: 1 } });
  });

  it('rejects near-misses — a prefix must end at a segment boundary', () => {
    // The bug this guards: a `startsWith` without the dot would let `typeface`, `namely` and
    // `tagsSecret` through, and with them any field whose name happens to begin with an allowed word.
    for (const k of ['typeface', 'namely', 'tagsSecret', 'labelled', 'statusy', 'embedding']) {
      rejected({ [k]: { eq: 1 } });
    }
  });

  it('rejects bare `properties` — only its sub-keys are filterable', () => {
    rejected({ properties: { eq: 1 } });
  });

  it('rejects the whole expression if ANY key is disallowed', () => {
    rejected({ tags: { eq: 'a' }, $where: { eq: 'b' } });
  });

  it('an empty expression is valid and constrains nothing', () => {
    ok({});
    assert.deepEqual(buildMongoFilter({}), {});
  });
});

describe('buildMongoFilter — falsy values are values', () => {
  it('maps every supported operator', () => {
    assert.deepEqual(
      buildMongoFilter({ 'properties.n': { gt: 1, gte: 2, lt: 3, lte: 4, ne: 5 } }),
      { 'properties.n': { $gt: 1, $gte: 2, $lt: 3, $lte: 4, $ne: 5 } },
    );
    assert.deepEqual(buildMongoFilter({ tags: { in: ['a', 'b'] } }), { tags: { $in: ['a', 'b'] } });
  });

  it('keeps `exists: false`', () => {
    // The classic bug: a truthiness check here silently turns "this field must be ABSENT" into no
    // constraint at all, which widens the result set instead of narrowing it. Same for eq below.
    assert.deepEqual(buildMongoFilter({ 'properties.x': { exists: false } }),
      { 'properties.x': { $exists: false } });
  });

  it('keeps `eq: 0`, `eq: false` and `eq: ""`', () => {
    assert.deepEqual(buildMongoFilter({ 'properties.n': { eq: 0 } }), { 'properties.n': { $eq: 0 } });
    assert.deepEqual(buildMongoFilter({ 'properties.b': { eq: false } }), { 'properties.b': { $eq: false } });
    assert.deepEqual(buildMongoFilter({ 'properties.s': { eq: '' } }), { 'properties.s': { $eq: '' } });
  });

  it('drops a key whose operator object is empty rather than emitting a match-anything clause', () => {
    assert.deepEqual(buildMongoFilter({ tags: {} }), {});
  });

  it('never emits a key the caller did not supply', () => {
    const out = buildMongoFilter({ tags: { eq: 'a' } });
    assert.deepEqual(Object.keys(out), ['tags']);
  });
});

describe('seq ingest guard — the sync-poisoning ceiling', () => {
  it('the reserve leaves real headroom below the protocol ceiling', () => {
    assert.equal(MAX_INGEST_SEQ, MAX_SYNC_SEQ - SEQ_CEILING_RESERVE);
    assert.ok(SEQ_CEILING_RESERVE > 0 && SEQ_CEILING_RESERVE < MAX_SYNC_SEQ);
  });

  it('accepts ordinary counter values', () => {
    for (const s of [0, 1, 42, 1_000_000, MAX_INGEST_SEQ]) {
      assert.equal(isSeqImplausible(s), false, `${s} should be ingestible`);
    }
  });

  it('rejects a value near the ceiling — the poisoning case', () => {
    // One document carrying this drags the space counter up via bumpSeq, and every subsequent LOCAL
    // write then exceeds what peers accept. The loss is silent and unrecoverable, which is why the
    // guard is absolute rather than relative to the current counter.
    assert.equal(isSeqImplausible(MAX_INGEST_SEQ + 1), true);
    assert.equal(isSeqImplausible(MAX_SYNC_SEQ), true);
    assert.equal(isSeqImplausible(MAX_SYNC_SEQ * 2), true);
  });

  it('rejects negatives and non-finite values', () => {
    for (const s of [-1, -0.5, NaN, Infinity, -Infinity]) {
      assert.equal(isSeqImplausible(s), true, `${s} should be refused`);
    }
  });
});
