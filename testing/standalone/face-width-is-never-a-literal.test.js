/**
 * Every face-descriptor width decision goes through the shared guard — no path compares against a literal.
 *
 * ## The defect this closes
 *
 * `face-descriptor.ts` was added to end a silent skip: both embedding paths compared `embedding.length !== 128`
 * and `continue`d with no error, no log and no counter, so a changed descriptor width would read as "this image
 * has no faces" forever. It introduced `FACE_DESCRIPTOR_DIMS` and `isUsableDescriptor`, and its own doc says the
 * constant replaced "the literal `128` that was written in both embedding paths".
 *
 * **Only one path was converted.** The external one got `isUsableDescriptor`; the in-process one kept
 * `embedding.length !== 128` and kept skipping silently — in the same file that imports the guard, under a
 * comment describing the fix. The half that was left behind is the half that runs on every default install,
 * because the external provider is opt-in.
 *
 * That is why this is a gate and not a single assertion. The first fix was believed complete, the file's own
 * documentation asserted it was complete, and nothing disagreed.
 *
 * ## Why it is asserted on the source
 *
 * The runtime behaviour — a wrong-width descriptor is skipped AND announced — is covered by the guard's own
 * unit tests. What cannot be observed at runtime is a *third* path appearing that never consults the guard at
 * all: it would simply behave like the code did before, which is to say it would look like nothing is wrong.
 * So the property pinned here is structural: anything that stores a face vector must reference the guard, and
 * nothing may re-derive the width from a number.
 *
 * Comments are stripped first, in both directions. The width is discussed in prose all over these files, so an
 * assertion that reads comments would fail on the explanation of the fix — and, worse, a "must mention the
 * guard" check would PASS on a comment merely naming it.
 *
 * Run: node --test testing/standalone/face-width-is-never-a-literal.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trackedSources } from './_sources.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const withoutComments = (text) =>
  text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

/** The one file allowed to write the number down. */
const GUARD = 'server/src/files/media/face-descriptor.ts';

/**
 * Discovered, not listed. A hand-written list of embedding paths is exactly what failed here: the list had two
 * entries, one was fixed, and the file's documentation counted it as both.
 */
function mediaSources() {
  // `specs: false` — the subject is what the PRODUCT computes; a test may legitimately write the number down
  // to assert on it. The floor is 3 rather than the default 100 because this is one directory.
  return trackedSources('server/src/files/media', { floor: 3, specs: false });
}

describe('face descriptor width is never a literal', () => {
  it('finds the media sources it is meant to be checking', () => {
    const files = mediaSources();
    // A gate that enumerates nothing passes vacuously, and would keep passing if the directory were renamed.
    assert.ok(files.length >= 3, `expected several media sources, found ${files.length}: ${files.join(', ')}`);
    assert.ok(files.includes(GUARD), `the guard itself must be among the enumerated sources, got ${files.join(', ')}`);
  });

  it('every path that stores a face vector consults the guard', () => {
    const writers = mediaSources().filter((f) => {
      const code = withoutComments(read(f));
      return f !== GUARD && /faceEmbedding\s*:/.test(code);
    });
    assert.ok(writers.length > 0, 'no face-vector writer found — the property this gate exists for is unchecked');

    for (const f of writers) {
      const code = withoutComments(read(f));
      assert.match(
        code,
        /isUsableDescriptor\s*\(/,
        `${f} stores a face vector without ever calling isUsableDescriptor — this is the silent-skip defect returning`,
      );
    }
  });

  it('both descriptor sources are named, so neither can be quietly dropped', () => {
    const sources = mediaSources()
      .filter((f) => f !== GUARD)
      .flatMap((f) => [...withoutComments(read(f)).matchAll(/isUsableDescriptor\s*\([^)]*?['"]([a-z-]+)['"]/g)]
        .map((m) => m[1]));
    // Build the regex fresh per use; a shared /g regex advances lastIndex between assertions.
    assert.ok(sources.includes('in-process'), `no in-process width check found, got: ${sources.join(', ') || '(none)'}`);
    assert.ok(sources.includes('external'), `no external width check found, got: ${sources.join(', ') || '(none)'}`);
  });

  it('no media source re-derives the width from a number', () => {
    for (const f of mediaSources()) {
      if (f === GUARD) continue;
      const code = withoutComments(read(f));
      // Scoped to descriptor identifiers on purpose. An emptiness check (`faces.length === 0`) and a shape
      // check (`box.length === 4`) are structural and correct; the defect is specifically a WIDTH re-derived
      // from a number, which is the one comparison that has to agree with the vector index to mean anything.
      const bad = [...code.matchAll(/\b(?:embedding|descriptor|emb)\w*\.length\s*(?:!==?|===?)\s*(\d+)/gi)]
        .map((m) => m[0]);
      assert.deepEqual(
        bad,
        [],
        `${f} compares a length against a literal: ${bad.join(', ')} — use isUsableDescriptor / FACE_DESCRIPTOR_DIMS`,
      );
    }
  });

  it('the vector index is built from the same constant the embedders check against', () => {
    const code = withoutComments(read('server/src/spaces/vector-index.ts'));
    assert.match(code, /FACE_DESCRIPTOR_DIMS/, 'the face index must be sized from the shared constant');
    assert.doesNotMatch(
      code,
      /'faceEmbedding'[^)]*\b128\b/,
      'the face index is sized from a literal — an index and an embedder that disagree give a cosine search that ranks nothing correctly and reports no error',
    );
  });
});
