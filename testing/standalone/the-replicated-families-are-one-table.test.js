/**
 * The six replicated families are listed ONCE, and both directions iterate that list.
 *
 * ## What this replaces
 *
 * `sync/engine.ts` enumerated them twice — six `pullType` calls with six result assignments, then six
 * `pushCollection` calls with five more. A seventh family was six edits in two places, which is exactly
 * how the SIXTH came to be missing from three separate lists: `Q-2` found `filemeta` absent from pull's
 * watermark max, from push's, and from the local seq bump, and each omission was silent.
 *
 * `Q-2` removed the derived lists by building one object per direction. This removes the enumerations that
 * BUILD those objects, which is the half that was left — and it is what pays back the god-file raise that
 * `Q-2` took (975 → 979), rather than shortening lines to get under it.
 *
 * ## Why a gate rather than trusting the refactor
 *
 * The defect it prevents is additive: nothing breaks when a seventh family is added to one list and not
 * the other. It compiles, it runs, and one direction silently ignores a whole record type. That is the
 * shape `CLAUDE.md` names as this repo's most expensive, and it has already cost one release here.
 *
 * Run: node --test testing/standalone/the-replicated-families-are-one-table.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const ENGINE = 'server/src/sync/engine.ts';
/*
 * The list lives in its OWN module, not in the engine. Which record types replicate is a fact about
 * replication rather than about the engine's loop — the merkle hash, the ingest schemas and the
 * retention sweep each hold an opinion of the same set, and each has been wrong about it at least once.
 *
 * It also had to leave: folding the two enumerations into a table INSIDE `engine.ts` made that file
 * BIGGER (986 -> 993), and `A-12` exists to pay back a god-file raise rather than take another one.
 */
const FAMILIES = 'server/src/sync/replicated-families.ts';
const code = (f) => stripComments(readFileSync(f, 'utf8'));

describe('one list of families, iterated by both directions', () => {
  it('the list exists at all', () => {
    /*
     * Presence only. WHICH families belong in it is asserted by `one-watermark-every-transfer`, which
     * derives them from `BRAIN_COLLECTIONS` — the first version of this case wrote the six names out,
     * which made the gate against two hand-written lists into the second hand-written list.
     */
    const src = code(FAMILIES);
    const at = src.indexOf('REPLICATED_FAMILIES');
    assert.ok(at > 0, 'there is no single list of replicated families');
    const table = src.slice(at, src.indexOf('] as const', at));
    const rows = [...table.matchAll(/payloadKey:/g)].length;
    assert.ok(rows >= 5, `only ${rows} rows in the family list — it has stopped being the list`);
  });

  it('PULL iterates it instead of naming each family', () => {
    const src = code(ENGINE);
    const calls = [...src.matchAll(/await pullType[<(]/g)].length;
    assert.equal(calls, 1,
      `${calls} pullType call sites — the pull side must call it once, inside the loop over the list, or a `
      + 'seventh family is an edit here as well as in the list');
  });

  it('and PUSH iterates it too', () => {
    const src = code(ENGINE);
    const calls = [...src.matchAll(/await pushCollection[<(]/g)].length;
    assert.equal(calls, 1,
      `${calls} pushCollection call sites — the push side must call it once, inside the loop`);
  });

  it('the file-metadata push filter travels WITH the list, not beside it', () => {
    /*
     * `filemeta` pushes parents only: a chunk is derived from the blob and the receiver makes its own,
     * with its own chunker and model — sent, it would carry passage text and a vector another instance
     * cannot rank. That is a property OF the family, so it belongs in the row rather than in a special
     * case at the call site, which is where a seventh family with its own filter would be forgotten.
     */
    const src = code(FAMILIES);
    const at = src.indexOf('REPLICATED_FAMILIES');
    const table = src.slice(at, src.indexOf('] as const', at));
    assert.match(table, /parentFileId/,
      'the parents-only filter is not in the family list, so it is a special case at a call site');
  });
});
