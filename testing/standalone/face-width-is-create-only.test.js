/**
 * A space's face descriptor width is chosen once, at creation, and can never be edited.
 *
 * ## Why create-only is the whole design
 *
 * The face gallery's vectors live on stored face-chunk records and **nothing re-derives them**. Changing a
 * populated space's width would leave 128-wide vectors indexed as though they were 512 — a cosine search
 * that ranks nothing correctly and reports no error at all.
 *
 * Two independent things have to hold, and each covers a different way of getting it wrong:
 *
 *  1. the field is on the CREATE body and NOT on the update body, so the API never offers the change;
 *  2. the index build passes `refuseWidthChange`, so a width that reached an existing space some other way
 *     — a hand-edited `config.json`, a restore, a future code path — is refused rather than applied.
 *
 * Only the second is a real guard. The first is what stops an operator being told "yes" and then discovering
 * their gallery is silently unsearchable. Asserting one and not the other is how this feature would look
 * finished while being dangerous.
 *
 * Run: node --test testing/standalone/face-width-is-create-only.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// The space request bodies live in `spaces/body-schemas.ts`, not in the router. They moved there because four of
// the router's five ratchet raises were single Zod lines — both `SpaceMetaBody` and `TypeSchemaZ` are `.strict()`,
// so a field the API must accept has nowhere smaller to go. The "finds the two body schemas" assertion below is
// what turns a move like that into a failure to re-point rather than three tests quietly passing on nothing.
const api = withoutComments(read('server/src/spaces/body-schemas.ts'));
const idx = withoutComments(read('server/src/spaces/vector-index.ts'));
const life = withoutComments(read('server/src/spaces/lifecycle.ts'));

/** The body schema named by `constName`, sliced to its own closing paren. */
function schemaBody(code, constName) {
  const start = code.indexOf(`const ${constName}`);
  if (start < 0) return null;
  let i = code.indexOf('z.object({', start);
  if (i < 0) return null;
  let depth = 1;
  i += 'z.object({'.length - 1;
  while (i < code.length && depth > 0) {
    i++;
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
  }
  return code.slice(start, i);
}

describe('the face descriptor width is create-only', () => {
  it('finds the two body schemas it is comparing', () => {
    // Without this the next two tests pass vacuously on a renamed constant.
    assert.ok(schemaBody(api, 'CreateSpaceBody'), 'CreateSpaceBody not found — re-point this test');
    assert.ok(schemaBody(api, 'UpdateSpaceBody'), 'UpdateSpaceBody not found — re-point this test');
  });

  it('the CREATE body accepts it', () => {
    assert.match(schemaBody(api, 'CreateSpaceBody'), /faceDescriptorDims/,
      'a space can no longer be created at a chosen width, which is the whole feature');
  });

  it('the UPDATE body does NOT accept it', () => {
    assert.doesNotMatch(schemaBody(api, 'UpdateSpaceBody'), /faceDescriptorDims/,
      'PATCH offers a width change that the index build then refuses — the operator is told yes and gets no');
  });

  it('the index is sized from the space, not from the built-in constant', () => {
    assert.match(idx, /faceDescriptorDims/,
      'buildSpaceVectorIndexes ignores the space setting, so every space is still built at the default');
  });

  it('and it still refuses to re-dimension an existing index', () => {
    // The guard that makes create-only enforceable rather than merely polite.
    assert.match(idx, /refuseWidthChange:\s*true/,
      'the face index would be rebuilt at a new width, orphaning every stored vector');
  });

  it('an absent width is omitted from the stored space, not defaulted to a number', () => {
    // A stored `128` reads as a deliberate choice. Absent reads as "nobody chose", which is the truth and
    // keeps an existing space and a new default-width space the same shape on disk.
    assert.match(life, /opts\.faceDescriptorDims\s*\?\s*\{\s*faceDescriptorDims/,
      'createSpace writes a width unconditionally; absent and default become indistinguishable');
  });
});
