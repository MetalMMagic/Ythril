/**
 * Two peers that independently create the same relationship must agree on its id.
 *
 * ## The defect
 *
 * An edge's `_id` was `uuidv4()` — random. The collection has a unique index on `(from, to, label)`
 * (`spaces/lifecycle.ts`), so the relationship itself cannot be stored twice; what happens instead is that two
 * peers each store it under a DIFFERENT id, sync exchanges them, and the receiving side's insert violates that
 * index. One relationship, two identities, and a duplicate-key error on every cycle.
 *
 * Deriving the id from the triplet makes the two peers arrive at the same `_id` without talking, which is what
 * turns the collision into an idempotent no-op.
 *
 * ## `spaceId` is NOT part of the key, and that is the whole subtlety
 *
 * It is the obvious thing to include, and `_LINKS-AND-SCHEMA-PLAN.md:304` still spells it that way. It is
 * wrong: `sync/space-map.ts` lets a peer's space live under a DIFFERENT local id, so a key including `spaceId`
 * derives differently on each side — reproducing the exact defect, and reproducing it precisely on the
 * networks that configured aliasing. The collection is already per-space, so the space is in the collection
 * name rather than in the key.
 *
 * ## What this does NOT do
 *
 * **Existing edges keep their v4 ids.** There is no migration: a derived id only has to be agreed on by peers
 * creating an edge from now on, and rewriting stored ids would mean a tombstone and a re-insert for every edge
 * in every space to fix a collision that is already handled.
 *
 * **An edge whose identity CHANGES keeps its old id**, and that is a stated limit rather than an oversight —
 * pinned below so it cannot quietly become a surprise. `merge.ts` relinks an edge by `$set`ting `from`/`to`,
 * and `updateEdgeById` accepts a new `label`; Mongo's `_id` is immutable, so after either the stored id no
 * longer equals its derivation. That edge then behaves exactly as every edge did before this change — no
 * worse — and re-keying it is its own work, because delete-and-reinsert on a synced natural-key collection
 * has to reason about the tombstone it leaves behind.
 *
 * Run: node --test testing/standalone/an-edge-id-is-derived-from-its-identity.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf } from './_structural-window.mjs';

let EDGES = null;
try { EDGES = await import('../../server/dist/brain/edge-id.js'); } catch { /* not built yet */ }
const edgeIdFor = EDGES?.edgeIdFor ?? (() => { throw new Error('brain/edge-id.ts does not exist yet'); });

const src = (p) => stripComments(readFileSync(p, 'utf8'));

describe('the same relationship derives the same id', () => {
  it('is deterministic across calls', () => {
    assert.equal(edgeIdFor('a', 'b', 'knows'), edgeIdFor('a', 'b', 'knows'));
  });

  it('does NOT depend on the space — spaceMap aliasing is why', () => {
    /*
     * The load-bearing assertion, written as the thing the plan document gets wrong.
     *
     * `sync/space-map.ts` lets the same logical space carry a different id on each peer. A key including
     * `spaceId` therefore derives differently on the two sides, which is the defect this change exists to
     * remove — and it would appear only on networks that configured aliasing, i.e. exactly where it is
     * hardest to reproduce. The collection is per-space already; the space is in its name.
     *
     * Asserted through the SIGNATURE rather than by passing a space: a three-argument function cannot take
     * one, so this cannot rot into "we pass it but ignore it".
     */
    assert.equal(edgeIdFor.length, 3, 'edgeIdFor must take exactly (from, to, label) — no spaceId');
    const s = src('server/src/brain/edge-id.ts');
    assert.doesNotMatch(bodyOf(s, 'edgeIdFor'), /spaceId/, 'the space must not be part of the key');
  });

  it('is a valid UUID, version 5', () => {
    // Stored in the same `_id` field as the v4 ids that came before it, and read by clients that expect a
    // UUID. Version 5 is the name-based one; a v4 here would mean the derivation is not actually happening.
    assert.match(edgeIdFor('a', 'b', 'knows'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('different relationships derive different ids', () => {
  it('a different label is a different edge', () => {
    assert.notEqual(edgeIdFor('a', 'b', 'knows'), edgeIdFor('a', 'b', 'dislikes'));
  });

  it('direction matters — an edge is not symmetric', () => {
    // `(a)-[knows]->(b)` and `(b)-[knows]->(a)` are two rows under the unique index, so they must be two ids.
    // Sorting the endpoints to make the key order-insensitive would silently merge them.
    assert.notEqual(edgeIdFor('a', 'b', 'knows'), edgeIdFor('b', 'a', 'knows'));
  });

  it('the separator cannot be forged out of the parts', () => {
    /*
     * `${from}|${to}|${label}` is ambiguous if an id or label may contain the separator: ('a|b', 'c', 'd') and
     * ('a', 'b|c', 'd') would produce one key for two different edges. Entity ids are UUIDs today, but a label
     * is operator-supplied text and nothing stops it containing a pipe.
     */
    assert.notEqual(edgeIdFor('a|b', 'c', 'd'), edgeIdFor('a', 'b|c', 'd'));
    assert.notEqual(edgeIdFor('a', 'b', 'c|d'), edgeIdFor('a', 'b|c', 'd'));
  });
});

describe('the creation path uses it', () => {
  it('no random id is minted for a new edge', () => {
    const body = bodyOf(src('server/src/brain/edges.ts'), 'upsertEdge');
    assert.doesNotMatch(body, /uuidv4\(\)/,
      'a new edge still gets a random id, so two peers creating the same relationship still disagree');
    assert.match(body, /edgeIdFor\(/, 'the creation path must derive the id from the triplet');
  });

  it('the derivation is fed the same three values the unique index uses', () => {
    // The index is `{ from: 1, to: 1, label: 1 }`. A derivation over a different triple would produce ids that
    // collide where the index does not, or differ where it does — worse than random, because it would look
    // deliberate.
    const lifecycle = src('server/src/spaces/lifecycle.ts');
    assert.match(lifecycle, /createIndex\(\{ from: 1, to: 1, label: 1 \}, \{ unique: true \}\)/,
      'the unique index moved — re-check what the id is derived from');
    assert.match(bodyOf(src('server/src/brain/edges.ts'), 'upsertEdge'), /edgeIdFor\(from, to, label\)/);
  });
});

describe('the stated limit: an edge whose identity changes keeps its id', () => {
  /*
   * Pinned rather than left implicit, so the follow-up is visible in the source instead of living only in a
   * tracker. Both paths mutate an edge's identity in place, and Mongo's `_id` is immutable — so after either,
   * the stored id no longer equals its derivation.
   *
   * That edge is then exactly as it was before this change: two peers can still disagree about its id, and the
   * unique index still catches the duplicate. No worse, just not yet better. Re-keying means delete-and-insert
   * on a synced natural-key collection, which has to reason about the tombstone it leaves behind — its own
   * work, not a line in this one.
   */
  it('merge relinks by mutating from/to, and says so', () => {
    const merge = src('server/src/brain/merge.ts');
    assert.match(merge, /\$set\['from'\]|\$set\['to'\]|from: survivor|to: survivor/,
      'merge no longer mutates an edge endpoint — if it re-keys now, delete this limit and its docblock');
  });

  it('updateEdgeById accepts a new label, and says so', () => {
    const edges = src('server/src/brain/edges.ts');
    assert.match(bodyOf(edges, 'updateEdgeById'), /updates\.label/,
      'label is no longer patchable — if so, delete this limit and its docblock');
  });

  it('the limit is written where the derivation is, not only in a tracker', () => {
    // A limit recorded only in `todo/` is invisible to whoever next reads the code, and `todo/` is gitignored.
    const raw = readFileSync('server/src/brain/edge-id.ts', 'utf8');
    assert.match(raw, /immutable|re-key|identity changes/i,
      'the docblock must state that an edge whose identity changes keeps its old id');
  });
});
