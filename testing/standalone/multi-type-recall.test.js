/**
 * Multi-type recall — against the REAL functions.
 *
 * This file was 1002 lines and re-implemented roughly ten functions before testing the copies:
 * `formatRecallSummary`, `toRecallRecord`, five `*EmbedText` builders, plus hand-written stand-ins
 * for the recall merge (`mergeAndSort`, `recallWithMinPerType`, `applyMinScore`), a `resolveActiveTypes`
 * that production does not have, and a `tagsApply` that was literally `return true`.
 *
 * Three different problems, so three different fixes:
 *
 *  - **`formatRecallSummary` / `toRecallRecord` are real and exported.** Imported now. The copy of
 *    `formatRecallSummary` had already drifted defensively — `r.fact ?? ''`, a `default:` arm —
 *    against a production function whose switch is exhaustive over a discriminated union. Those
 *    branches were unreachable in the copy and do not exist in production, so they tested nothing.
 *
 *  - **The five `*EmbedText` sections were deleted, not converted.** `embed-text-builders.test.js`
 *    already tests the real builders from `brain/embed-text.js`, and its header documents the exact
 *    drift incident these copies came from. Converting them here would have produced a second copy
 *    of a test that already exists — the same mistake in a new coat.
 *
 *  - **The merge logic had no seam to test.** It sat between two `await`s into MongoDB inside
 *    `recallMultiType`, which is why it got hand-copied in the first place. It is now
 *    `mergeRecallResults`, exported and pure, and tested here for real.
 *
 * Deleted outright as tautologies, per the tracker: `tagsApply()` (a function whose body was
 * `return true`, asserted to return true) and `resolveActiveTypes` (production inlines the default,
 * and the copy tested a function that does not exist).
 *
 * Run: node --test testing/standalone/multi-type-recall.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { formatRecallSummary, toRecallRecord } = await import('../../server/dist/mcp/tools/shared.js');
const { mergeRecallResults } = await import('../../server/dist/brain/recall.js');

// ── Fixtures: the real RecallResult shapes ───────────────────────────────────

const memory = (o = {}) => ({ type: 'memory', _id: 'm1', fact: 'the sky is blue', score: 0.9, ...o });
const entity = (o = {}) => ({ type: 'entity', _id: 'e1', name: 'Alice', entityType: 'person', score: 0.8, ...o });
const edge   = (o = {}) => ({ type: 'edge', _id: 'g1', from: 'Alice', label: 'knows', to: 'Bob', score: 0.7, ...o });
const chrono = (o = {}) => ({ type: 'chrono', _id: 'c1', title: 'Launch', chronoType: 'event', startsAt: '2026-01-01', score: 0.6, ...o });
const file   = (o = {}) => ({ type: 'file', _id: 'f1', path: 'docs/a.md', score: 0.5, ...o });

describe('formatRecallSummary — one readable line per type', () => {
  it('memory is the fact itself', () => {
    assert.equal(formatRecallSummary(memory()), 'the sky is blue');
  });

  it('entity names its type, because a bare name is ambiguous across types', () => {
    assert.equal(formatRecallSummary(entity()), 'Alice (person)');
  });

  it('edge reads as a sentence in the direction the edge points', () => {
    assert.equal(formatRecallSummary(edge()), 'Alice → knows → Bob');
  });

  it('chrono appends the description only when there is one', () => {
    assert.equal(formatRecallSummary(chrono()), 'Launch');
    assert.equal(formatRecallSummary(chrono({ description: 'v2 ships' })), 'Launch: v2 ships');
  });

  it('file appends the description only when there is one', () => {
    assert.equal(formatRecallSummary(file()), 'docs/a.md');
    assert.equal(formatRecallSummary(file({ description: 'the readme' })), 'docs/a.md: the readme');
  });
});

describe('toRecallRecord — common fields appear only when present', () => {
  it('always carries _id', () => {
    for (const r of [memory(), entity(), edge(), chrono(), file()]) {
      assert.equal(toRecallRecord(r)._id, r._id);
    }
  });

  it('omits absent optional fields rather than emitting undefined', () => {
    // An explicit `"tags": undefined` in an MCP payload is noise an agent has to reason about.
    const rec = toRecallRecord(memory());
    // `seq`/`embeddingModel` are not in this list: they are dropped unconditionally now, present or
    // not, which the next test pins.
    for (const k of ['createdAt', 'updatedAt', 'tags', 'description', 'properties']) {
      assert.ok(!(k in rec), `${k} should be absent, got ${JSON.stringify(rec)}`);
    }
  });

  it('includes them when they are present', () => {
    const rec = toRecallRecord(memory({ tags: ['t'], description: 'd', properties: { a: 1 }, createdAt: '2026-01-01T00:00:00Z' }));
    assert.deepEqual(rec.tags, ['t']);
    assert.equal(rec.description, 'd');
    assert.deepEqual(rec.properties, { a: 1 });
    assert.equal(rec.createdAt, '2026-01-01T00:00:00Z');
  });

  it('drops seq and embeddingModel even when the source record carries them', () => {
    // Cost with no per-row information: `embeddingModel` is identical for every record in a space, and
    // `seq` is the counter sync orders replication by — not an input to any tool. `createdAt`/
    // `updatedAt` cost the same and stay, because they answer whether a hit is still current.
    const rec = toRecallRecord(memory({ seq: 3, embeddingModel: 'nomic-v1.5', updatedAt: '2026-01-02T00:00:00Z' }));
    assert.ok(!('seq' in rec), `seq must not reach an MCP response: ${JSON.stringify(rec)}`);
    assert.ok(!('embeddingModel' in rec), `embeddingModel must not be repeated per row: ${JSON.stringify(rec)}`);
    assert.equal(rec.updatedAt, '2026-01-02T00:00:00Z');
  });
});

describe('toRecallRecord — the type discriminator is renamed per type', () => {
  // Each type reports its own `type` field under the name that type uses, NOT the recall
  // discriminator. Getting this wrong would surface `"type": "entity"` where an agent expects
  // `"type": "person"` — a silent semantic swap that reads as valid.
  it('entity reports entityType as `type`', () => {
    assert.equal(toRecallRecord(entity()).type, 'person');
    assert.equal(toRecallRecord(entity()).name, 'Alice');
  });

  it('chrono reports chronoType as `type`, and keeps startsAt', () => {
    const rec = toRecallRecord(chrono());
    assert.equal(rec.type, 'event');
    assert.equal(rec.startsAt, '2026-01-01');
  });

  it('edge reports edgeType as `type` only when it has one', () => {
    assert.ok(!('type' in toRecallRecord(edge())), 'no edgeType means no type key');
    assert.equal(toRecallRecord(edge({ edgeType: 'social' })).type, 'social');
  });

  it('memory carries no type key at all', () => {
    assert.ok(!('type' in toRecallRecord(memory())));
    assert.equal(toRecallRecord(memory()).fact, 'the sky is blue');
  });
});

describe('toRecallRecord — per-type optional fields', () => {
  it('edge weight appears only when set', () => {
    assert.ok(!('weight' in toRecallRecord(edge())));
    assert.equal(toRecallRecord(edge({ weight: 2 })).weight, 2);
  });

  it('file chunk fields appear only when set', () => {
    assert.ok(!('parentFileId' in toRecallRecord(file())));
    const chunk = toRecallRecord(file({ parentFileId: 'p1', chunkIndex: 3, headingText: 'Intro', content: '...' }));
    assert.equal(chunk.parentFileId, 'p1');
    assert.equal(chunk.chunkIndex, 3);
    assert.equal(chunk.headingText, 'Intro');
  });

  it('chunkIndex 0 is emitted — falsy but meaningful', () => {
    // The classic `if (x)` bug: chunk 0 is the FIRST chunk, not a missing one.
    assert.equal(toRecallRecord(file({ chunkIndex: 0 })).chunkIndex, 0);
  });

  it('entityIds appear on memory and chrono when set', () => {
    assert.deepEqual(toRecallRecord(memory({ entityIds: ['e1'] })).entityIds, ['e1']);
    assert.deepEqual(toRecallRecord(chrono({ entityIds: ['e1'] })).entityIds, ['e1']);
  });
});

describe('mergeRecallResults — floors, topK and minScore', () => {
  it('returns the global results in score order when there are no floors', () => {
    const all = [entity(), memory(), edge()]; // 0.8, 0.9, 0.7
    assert.deepEqual(mergeRecallResults([], all, 10).map(r => r._id), ['m1', 'e1', 'g1']);
  });

  it('honours topK', () => {
    const all = [memory(), entity(), edge(), chrono(), file()];
    assert.equal(mergeRecallResults([], all, 2).length, 2);
  });

  it('a guaranteed result survives even when it would not make topK on score', () => {
    // The whole point of minPerType: a low-scoring type still gets representation.
    const guaranteed = [file({ _id: 'floor', score: 0.01 })];
    const all = Array.from({ length: 10 }, (_, i) => memory({ _id: `m${i}`, score: 0.9 }));
    const out = mergeRecallResults(guaranteed, all, 3);
    assert.ok(out.some(r => r._id === 'floor'), 'the floor result was dropped');
    assert.equal(out.length, 3);
  });

  it('does not duplicate a result that is both guaranteed and globally returned', () => {
    const dup = memory({ _id: 'same', score: 0.9 });
    const out = mergeRecallResults([dup], [dup, entity()], 10);
    assert.equal(out.filter(r => r._id === 'same').length, 1);
  });

  it('sorts the combined list, so a floor result can outrank a global one', () => {
    const out = mergeRecallResults([file({ _id: 'hi', score: 0.99 })], [memory({ score: 0.5 })], 10);
    assert.equal(out[0]._id, 'hi');
  });

  it('minScore filters LAST — it can drop even a guaranteed result', () => {
    // Deliberate: a floor is a request for coverage, not a licence to return matches the caller has
    // explicitly called too weak to want.
    const out = mergeRecallResults([file({ _id: 'weak', score: 0.1 })], [memory({ score: 0.9 })], 10, 0.5);
    assert.deepEqual(out.map(r => r._id), ['m1']);
  });

  it('a zero or absent minScore filters nothing', () => {
    const all = [memory({ score: 0 })];
    assert.equal(mergeRecallResults([], all, 10, 0).length, 1);
    assert.equal(mergeRecallResults([], all, 10, null).length, 1);
    assert.equal(mergeRecallResults([], all, 10).length, 1);
  });

  it('treats a missing score as zero rather than throwing', () => {
    const out = mergeRecallResults([], [memory({ score: undefined }), entity()], 10);
    assert.equal(out[0]._id, 'e1', 'the scored result should sort first');
    assert.equal(out.length, 2);
  });

  it('handles more guaranteed results than topK without going negative', () => {
    const guaranteed = [memory({ _id: 'a' }), entity({ _id: 'b' }), edge({ _id: 'c' })];
    const out = mergeRecallResults(guaranteed, [file()], 1);
    // Every floor result is kept; fill is simply skipped. Slots are clamped at zero.
    assert.equal(out.length, 3);
    assert.ok(!out.some(r => r._id === 'f1'));
  });

  it('an empty input produces an empty result', () => {
    assert.deepEqual(mergeRecallResults([], [], 10), []);
  });
});
