/**
 * `suppressEmbeddings` is ONE switch at three tiers, under ONE name, and both doors say so.
 *
 * ## X-1, in two halves
 *
 * Owner, 2026-08-15: *"excludefromvector does also exclude from recalls traversal? ambigous and i want
 * entries to be findable via traversal even if they are not embedded themselves."*
 *
 * The behaviour was already right — recall's `traverse` expansion walks EDGES and never consults a vector,
 * so a suppressed record is reached exactly as before. What was wrong is the vocabulary, in two ways that a
 * caller pays for:
 *
 * 1. **Two names for one mechanism.** The per-record flag was `excludeFromVectorSearch` while a type schema
 *    and the space both called it `suppressEmbeddings`; `embeddingSuppressed` resolves `record > schema >
 *    space` between them. Nothing in the record-level name hinted the other two existed, so a record with no
 *    vector and no flag set read as a bug. X-1a (#961) documented the tiers; X-1b renamed the record tier so
 *    there is one name to find, and this file gates both halves.
 * 2. **`false` is "not stated", not "do embed".** A stored `false` maps to `undefined`, so it FALLS THROUGH
 *    to the tiers below rather than overriding them. Sending `false` on a record whose type or space
 *    suppresses embedding succeeds and changes nothing — and the MCP schema said, in as many words, "or
 *    return it to it (false)".
 *
 * ## Exercised, not grepped
 *
 * `embeddingSuppressed` and `recordSuppression` are pure, so the tier rules below are real calls. The
 * description assertions are held to what those calls return rather than to a phrasing — four gates in one
 * week were found pinning a sentence instead of a rule, and two of the four were pinning one that was false.
 * The `false`-falls-through rule used to be gated by a regex over `embed-record.ts`; it is now the behaviour
 * of `recordSuppression` plus the fact that the embed path defers to it, which is what the regex was trying
 * to approximate.
 *
 * Run: node --test testing/standalone/one-switch-three-tiers-is-documented.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

let embeddingSuppressed, recordSuppression, mirrorLegacySuppression, parseRecordSuppression;
let recordNotSuppressedFilter, SUPPRESS_EMBEDDINGS_SCHEMA;
before(async () => {
  ({
    embeddingSuppressed, recordSuppression, mirrorLegacySuppression, parseRecordSuppression,
    recordNotSuppressedFilter,
  } = await import('../../server/dist/brain/suppress-embeddings.js'));
  ({ SUPPRESS_EMBEDDINGS_SCHEMA } = await import('../../server/dist/mcp/tools/shared.js'));
});

const DESC = () => SUPPRESS_EMBEDDINGS_SCHEMA.description;

describe('the resolver really is one switch at three tiers', () => {
  it('record wins over both', () => {
    assert.equal(embeddingSuppressed({ record: true, schema: { suppressEmbeddings: false }, space: false }), true);
    assert.equal(embeddingSuppressed({ record: false, schema: { suppressEmbeddings: true }, space: true }), false,
      'an explicitly stored `false` at the record tier does override — the falling-through case is a SEPARATE '
      + 'mapping in `recordSuppression`, asserted below');
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
  it('a stored false arrives as "not stated", under either spelling', () => {
    // This is the whole of the trap, and it now lives in one function instead of being spelled inline at
    // each reader. Asserted by calling it: a regex over the call site could only ever check one caller.
    assert.equal(recordSuppression({ suppressEmbeddings: false }), undefined,
      'if this becomes a plain read, the docs saying `false` cannot un-suppress stop being true');
    assert.equal(recordSuppression({ excludeFromVectorSearch: false }), undefined);
    assert.equal(recordSuppression({ suppressEmbeddings: true }), true);
    assert.equal(recordSuppression({}), undefined);
    assert.equal(recordSuppression(undefined), undefined);
  });

  it('and every reader of the record tier goes through it', () => {
    // The rule was written out by hand at both readers before X-1b, which is the shape this repo produces
    // most: one rule, two implementations, and the weaker one winning silently. Bounded by the call's own
    // closing brace rather than by a character count — a count spans different lines on CRLF than on LF.
    for (const file of ['server/src/brain/embed-record.ts', 'server/src/brain/reembed.ts']) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const at = src.indexOf('embeddingSuppressed({');
      assert.ok(at > 0, `the suppression call was not found in ${file} — the scanner is wrong, not the code`);
      const call = src.slice(at, src.indexOf('})', at));
      assert.match(call, /record:\s*recordSuppression\(doc\)/,
        `${file} builds the record tier itself instead of asking recordSuppression, so the two readers can `
        + 'disagree about what a stored `false` means and about which spellings count');
    }
  });

  it('so the description must NOT promise that false re-embeds unconditionally', () => {
    assert.doesNotMatch(DESC(), /or return it to it \(false\)/i,
      'the sentence that was wrong: false falls through, it does not override');
    assert.match(DESC(), /not stated/i, 'say what false actually means');
    assert.match(DESC(), /cannot/i, 'and that it cannot re-embed a suppressed type or space');
  });
});

describe('one name, and the old one is read but never advertised', () => {
  it('the new spelling wins when a record carries both', () => {
    // A record written before 3.1.0 and then un-suppressed by this build carries `suppressEmbeddings: false`
    // beside a legacy `true` until the write lands. Preferring the legacy key there would keep a record
    // suppressed after somebody asked for it not to be.
    assert.equal(recordSuppression({ suppressEmbeddings: false, excludeFromVectorSearch: true }), undefined);
    assert.equal(recordSuppression({ suppressEmbeddings: true, excludeFromVectorSearch: false }), true);
  });

  it('the legacy spelling is still honoured on a record nobody has rewritten', () => {
    assert.equal(recordSuppression({ excludeFromVectorSearch: true }), true,
      'every record suppressed before 3.1.0 carries only this key — dropping it re-embeds all of them');
  });

  it('a write mirrors the record tier onto the legacy key in BOTH directions', () => {
    // These collections replicate by whole-document replace, so a peer on an older build must keep finding
    // the key it knows. Mirroring the set but not the unset is the half that bites: a stale legacy `true`
    // left behind is read by the fallback above and the record stays suppressed.
    const set = { suppressEmbeddings: true }, unset = {};
    mirrorLegacySuppression(set, unset);
    assert.deepEqual(set, { suppressEmbeddings: true, excludeFromVectorSearch: true });

    const set2 = {}, unset2 = { suppressEmbeddings: '' };
    mirrorLegacySuppression(set2, unset2);
    assert.deepEqual(unset2, { suppressEmbeddings: '', excludeFromVectorSearch: '' });

    const set3 = { tags: ['x'] }, unset3 = {};
    mirrorLegacySuppression(set3, unset3);
    assert.deepEqual(set3, { tags: ['x'] }, 'a write that does not touch the tier must not invent the key');
    assert.deepEqual(unset3, {});
  });

  it('both doors accept either spelling and refuse a non-boolean identically', () => {
    assert.deepEqual(parseRecordSuppression({ suppressEmbeddings: true }), { ok: true, value: true });
    assert.deepEqual(parseRecordSuppression({ excludeFromVectorSearch: true }), { ok: true, value: true },
      'the input alias: a caller written against 3.0 keeps working');
    assert.deepEqual(parseRecordSuppression({ suppressEmbeddings: false, excludeFromVectorSearch: true }),
      { ok: true, value: false }, 'the new spelling wins on input too');
    assert.deepEqual(parseRecordSuppression({}), { ok: true, value: undefined });
    assert.deepEqual(parseRecordSuppression(undefined), { ok: true, value: undefined });
    assert.equal(parseRecordSuppression({ suppressEmbeddings: 'true' }).ok, false,
      'a string must be a refusal on both doors — MCP used to drop it silently while REST answered 400');
    assert.equal(parseRecordSuppression({ excludeFromVectorSearch: 'true' }).ok, false);
  });

  it('a sweep excludes records suppressed under EITHER spelling', () => {
    // The backfill query is where the legacy key hides: a filter naming only the new one re-embeds every
    // record suppressed before the rename, which is the exact thing suppression was asked for.
    const f = recordNotSuppressedFilter();
    assert.deepEqual(f, { suppressEmbeddings: { $ne: true }, excludeFromVectorSearch: { $ne: true } });
  });
});

describe('both doors name the one tier name', () => {
  it('the MCP schema names all three tiers and the resolution order', () => {
    const d = DESC();
    assert.match(d, /suppressEmbeddings/, 'the name every tier uses');
    assert.match(d, /record\s*>\s*schema\s*>\s*space/, 'and the resolution order');
    assert.doesNotMatch(d, /excludeFromVectorSearch/,
      'the old spelling is an input alias, not a name to offer — a description is what an agent constructs '
      + 'arguments from, so naming both there rebuilds the defect the rename removed');
  });

  it('and it still states the traversal answer the owner asked for', () => {
    // The question that started X-1. Losing this while renaming would be a straight regression.
    const d = DESC();
    assert.match(d, /traverse/i, 'both traversals reach a suppressed record');
    assert.match(d, /never consults a vector|edges out of a match/i, 'and WHY, which is what makes it believable');
  });

  it('the REST reference says the same, from the record side', () => {
    // `06a-schema-api.md` already said it from the SPACE side. One direction is not parity: a reader who
    // starts at the record flag never opens the schema page.
    const doc = readFileSync('docs/integration-guide/04-brain-api.md', 'utf8');
    assert.match(doc, /suppressEmbeddings/, 'the record-side page must name the tier');
    assert.match(doc, /record\s*>\s*schema\s*>\s*space/, 'and the order');
    assert.match(doc, /means \*not stated\*|means \*\*not stated\*\*|not stated/i, 'and the false trap');
  });

  it('and the space-side page still says it too', () => {
    const doc = readFileSync('docs/integration-guide/06a-schema-api.md', 'utf8');
    assert.match(doc, /LOWEST of three tiers/, 'that it is the bottom of three');
    assert.match(doc, /per-record `suppressEmbeddings`/,
      'and that the tier above it is spelled the same — this page named the old spelling until 3.1.0');
  });

  it('the rename is written down where an upgrader looks', () => {
    // A renamed request field that appears in no changelog is a caller debugging a 200 that did nothing.
    // Bounded by the two headings, not by an offset: `\n## ` lands on a different character on this CRLF
    // working copy than in CI's LF checkout, and a window that starts in the wrong place passes by reading
    // less. `[\s\S]` rather than `.` so the section's own blank lines are inside it.
    const ch = readFileSync('CHANGELOG.md', 'utf8');
    const m = /^## \[Unreleased\]$([\s\S]*?)^## /m.exec(ch);
    assert.ok(m, 'no [Unreleased] section followed by a released one — this gate is measuring nothing');
    const unreleased = m[1];
    assert.match(unreleased, /excludeFromVectorSearch/,
      'the [Unreleased] section must name the OLD spelling — that is the word an upgrader searches for');
    assert.match(unreleased, /suppressEmbeddings/, 'and the new one');
  });
});
