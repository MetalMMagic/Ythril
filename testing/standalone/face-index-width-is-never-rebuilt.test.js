/**
 * The face gallery's index is never silently re-dimensioned.
 *
 * ## Why this index is different from every other one
 *
 * `ensureVectorSearchIndex` treats a dimension change as a definition change and rebuilds — in place if
 * Atlas allows it, otherwise drop-and-recreate. For a TEXT index that is correct and recoverable: the
 * records get re-embedded and the vectors catch up.
 *
 * The face gallery has no such path. Its vectors sit on `faceEmbedding` in already-stored face-chunk
 * records and **nothing re-derives them**. Rebuilding that index at a new width leaves 128-wide vectors
 * indexed as though they were 512-wide, so every cosine score is wrong and **no error is reported** — the
 * exact silent-corruption failure the shared width constant, `isUsableDescriptor`, and the in-process guard
 * were all added to prevent.
 *
 * That matters most precisely when the width becomes configurable, because the operator will have just been
 * told the number is theirs to choose. A config edit must not be able to invalidate a populated gallery.
 *
 * ## Why the ORDER is asserted, not just the presence
 *
 * A refusal placed after `updateSearchIndex` would read correctly and do nothing — the destructive call
 * would already have happened. Presence alone cannot tell those apart, so the position is pinned too.
 *
 * Run: node --test testing/standalone/face-index-width-is-never-rebuilt.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = 'server/src/spaces/vector-index.ts';
const src = readFileSync(join(ROOT, SRC), 'utf8');
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const code = withoutComments(src);

describe('the face index refuses a width change', () => {
  it('the face index asks for the refusal', () => {
    // Located by the index path rather than a line number: this call has moved before.
    const line = code.split('\n').find((l) => l.includes("'faceEmbedding'") && l.includes('ensureVectorSearchIndex'));
    assert.ok(line, "no ensureVectorSearchIndex call for 'faceEmbedding' — re-point this test");
    assert.match(
      line,
      /refuseWidthChange:\s*true/,
      'the face index is built without refuseWidthChange, so a width change would silently rebuild it and '
      + 'orphan every stored face vector',
    );
  });

  it('the guard exists and keeps the existing width', () => {
    assert.match(code, /opts\.refuseWidthChange/, 'ensureVectorSearchIndex does not implement the refusal');
    assert.match(code, /REFUSING to change/, 'the refusal must be logged — a silent refusal is its own defect');
  });

  it('the refusal is reached BEFORE anything rebuilds the index', () => {
    const guard = code.indexOf('opts.refuseWidthChange');
    const update = code.indexOf('updateSearchIndex(');
    const drop = code.indexOf('dropSearchIndex(');
    assert.ok(guard > 0 && update > 0, 'expected both the guard and the update call to exist');
    assert.ok(
      guard < update,
      'the refusal sits AFTER updateSearchIndex, so the rebuild it exists to prevent has already happened',
    );
    assert.ok(guard < drop, 'the refusal sits AFTER dropSearchIndex, which is the destructive path');
  });

  it('refuses on a width change specifically, not on any definition change', () => {
    // Filter-field changes must still apply — refusing those would freeze the index against legitimate
    // edits and quietly break filtered recall for the space.
    const i = code.indexOf('opts.refuseWidthChange');
    const stmt = code.slice(Math.max(0, i - 120), i + 40);
    assert.match(stmt, /!\s*dimsMatch/, 'the refusal must be conditioned on the WIDTH differing');
    assert.match(code.slice(i, i + 1400), /filtersMatch/,
      'a refused width change must still let a filter-field change through, at the existing width');
  });

  it('the text indexes are NOT refused, because re-embedding recovers them', () => {
    // The asymmetry is the point. If every index refused, a legitimate embedding-model change could never
    // be applied, and the fix would be worse than the problem.
    const faceLines = code.split('\n').filter((l) => l.includes('refuseWidthChange: true'));
    assert.equal(faceLines.length, 1,
      `expected exactly one index to refuse width changes, found ${faceLines.length} — if a second index `
      + 'genuinely needs it, say why here rather than letting the count drift');
  });
});
