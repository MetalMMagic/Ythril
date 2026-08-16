/**
 * `excludeFromVectorSearch` and `suppressEmbeddings` are ONE switch at three tiers, and both doors say so.
 *
 * ## X-1, the half that needs no migration
 *
 * Owner, 2026-08-15: *"excludefromvector does also exclude from recalls traversal? ambigous and i want
 * entries to be findable via traversal even if they are not embedded themselves."*
 *
 * The behaviour was already right — recall's `traverse` expansion walks EDGES and never consults a vector,
 * so an excluded record is reached exactly as before. What was wrong is the vocabulary, in two ways that a
 * caller pays for:
 *
 * 1. **Three names for one mechanism.** The per-record flag is `excludeFromVectorSearch`; a type schema and
 *    the space both call it `suppressEmbeddings`; `embeddingSuppressed` resolves `record > schema > space`.
 *    Nothing in the record-level name hints the other two exist, so a record with no vector and no flag set
 *    reads as a bug.
 * 2. **`false` is "not stated", not "do embed".** `embed-record.ts` maps a stored `false` to `undefined`, so
 *    it FALLS THROUGH to the tiers below rather than overriding them. Sending `false` on a record whose type
 *    or space suppresses embedding succeeds and changes nothing — and the MCP schema said, in as many words,
 *    "or return it to it (false)".
 *
 * ## Exercised, not grepped
 *
 * `embeddingSuppressed` is pure, so the tier rules below are real calls. The description assertions are held
 * to what those calls return, rather than to a phrasing — four gates this week were found pinning a sentence
 * instead of a rule, and two of the four were pinning one that was false.
 *
 * Run: node --test testing/standalone/one-switch-three-tiers-is-documented.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

let embeddingSuppressed, EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA;
before(async () => {
  ({ embeddingSuppressed } = await import('../../server/dist/brain/suppress-embeddings.js'));
  ({ EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA } = await import('../../server/dist/mcp/tools/shared.js'));
});

const DESC = () => EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA.description;

describe('the resolver really is one switch at three tiers', () => {
  it('record wins over both', () => {
    assert.equal(embeddingSuppressed({ record: true, schema: { suppressEmbeddings: false }, space: false }), true);
    assert.equal(embeddingSuppressed({ record: false, schema: { suppressEmbeddings: true }, space: true }), false,
      'an explicitly stored `false` at the record tier does override — the falling-through case is a SEPARATE '
      + 'mapping in embed-record.ts, asserted below');
  });

  it('schema wins over space', () => {
    assert.equal(embeddingSuppressed({ schema: { suppressEmbeddings: true }, space: false }), true);
    assert.equal(embeddingSuppressed({ schema: { suppressEmbeddings: false }, space: true }), false);
  });

  it('and "not stated" falls through rather than counting as false', () => {
    // Reading absent as `false` would make the space-wide switch do nothing for any type that had a schema
    // at all, which is every type worth suppressing.
    assert.equal(embeddingSuppressed({ space: true }), true, 'no record flag, no schema → the space decides');
    assert.equal(embeddingSuppressed({ schema: {}, space: true }), true, 'a schema that says nothing is not a "no"');
    assert.equal(embeddingSuppressed({}), false, 'and nothing anywhere means embed');
  });
});

describe('`false` at the record tier never reaches the resolver as `false`', () => {
  it('embed-record maps a stored false to undefined', () => {
    // This is the whole of the trap, and it is one ternary. Bounded by the call's own closing brace rather
    // than by a character count.
    const src = stripComments(readFileSync('server/src/brain/embed-record.ts', 'utf8'));
    const at = src.indexOf('embeddingSuppressed({');
    assert.ok(at > 0, 'the suppression call was not found — the scanner is wrong, not the code');
    const call = src.slice(at, src.indexOf('})', at));
    assert.match(call, /record:\s*doc\['excludeFromVectorSearch'\]\s*===\s*true\s*\?\s*true\s*:\s*undefined/,
      'a stored `false` must arrive as "not stated" — if this becomes a plain read, the docs saying `false` '
      + 'cannot un-suppress stop being true');
  });

  it('so the description must NOT promise that false re-embeds unconditionally', () => {
    assert.doesNotMatch(DESC(), /or return it to it \(false\)/i,
      'the sentence that was wrong: false falls through, it does not override');
    assert.match(DESC(), /not stated/i, 'say what false actually means');
    assert.match(DESC(), /cannot/i, 'and that it cannot re-embed a suppressed type or space');
  });
});

describe('both doors name all three tiers', () => {
  it('the MCP schema names the other two and their other name', () => {
    const d = DESC();
    assert.match(d, /suppressEmbeddings/, 'the name the other two tiers use');
    assert.match(d, /record\s*>\s*schema\s*>\s*space/, 'and the resolution order');
  });

  it('and it still states the traversal answer the owner asked for', () => {
    // The question that started X-1. Losing this while adding the tier text would be a straight regression.
    const d = DESC();
    assert.match(d, /traverse/i, 'both traversals reach an excluded record');
    assert.match(d, /never consults a vector|edges out of a match/i, 'and WHY, which is what makes it believable');
  });

  it('the REST reference says the same, from the record side', () => {
    // `06a-schema-api.md` already said it from the SPACE side. One direction is not parity: a reader who
    // starts at the record flag never opens the schema page.
    const doc = readFileSync('docs/integration-guide/04-brain-api.md', 'utf8');
    assert.match(doc, /suppressEmbeddings/, 'the record-side page must name the other tiers');
    assert.match(doc, /record\s*>\s*schema\s*>\s*space/, 'and the order');
    assert.match(doc, /means \*not stated\*|means \*\*not stated\*\*|not stated/i, 'and the false trap');
  });

  it('and the space-side page still says it too', () => {
    const doc = readFileSync('docs/integration-guide/06a-schema-api.md', 'utf8');
    assert.match(doc, /excludeFromVectorSearch/, 'the space page names the record tier');
    assert.match(doc, /LOWEST of three tiers/, 'and that it is the bottom of three');
  });
});
