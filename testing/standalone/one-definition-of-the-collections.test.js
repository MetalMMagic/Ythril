/**
 * Every collection list either DERIVES from one tuple or says why it is a different set.
 *
 * ## Three sets, nine names, and only one of them shared
 *
 * A space's documents live in collections, and the list was written out twenty times under nine names. Eight
 * of those names look like one set and are not — they were identical only because the set has had four
 * members. Measured 2026-09-03:
 *
 *   1. **every collection a space owns** — `SPACE_COLLECTIONS` in `spaces/_shared.ts`. Nine entries, the
 *      machinery included: `tombstones`, `conflicts`, `dupe_candidates`, `contradiction_candidates`. It is
 *      what CREATES them, and nothing else does.
 *   2. **the knowledge-bearing ones** — `BRAIN_COLLECTIONS`. What a wipe clears, what `/query` reads, what
 *      the importer accepts, what the TTL sweep walks, what sync counts. This is the shared one.
 *   3. **the ones with a vector index** — `VECTOR_INDEXED_COLLECTIONS`. Knowledge-bearing MINUS anything
 *      never embedded, which is why it cannot be spelled as set 2.
 *
 * The Brain's tabs are a fourth question — what the UI shows, not where documents live.
 *
 * ## Why this gate is shaped as "derive OR declare"
 *
 * The first draft required every full-list site to read one tuple. It was written and deleted the same hour,
 * because it would have forced a vector index onto a collection that must never have one — a defect
 * introduced by a check. The same mistake, one level up, as a check that could not tell `RefKind` from the
 * knowledge types.
 *
 * So a site may write the names out, as long as it says in its own comment that it is a deliberate subset
 * and why. Adding a collection is then one edit for set 2, and a decision the author has to write down for
 * the other two.
 *
 * ## Why it matters now
 *
 * `M-2` stores links in a collection of their own — the owner's ruling is that link records must not live in
 * `_edges`, so `GET /edges` cannot see them. That collection joins set 1 first (no entry, no collection, no
 * indexes), joins set 2, and must stay out of set 3.
 *
 * Every miss is silent in its own way: `/query` refusing a collection it should allow, the importer skipping
 * a record kind, a wipe leaving links behind, the TTL sweep never expiring one, an MCP caller told the
 * collection does not exist. And the loudest silence of all — a collection absent from sync replicates
 * nothing, which for a record type whose whole purpose is to be shared ships the feature and none of it.
 *
 * Run: node --test testing/standalone/one-definition-of-the-collections.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';

const ROOT = process.cwd();
/**
 * The two files allowed to name the collections: the server's types LEAF, and the client's mirror of it.
 *
 * Two and not one for the reason the type lists have two — `client/src/app/core/api.types.ts` is the
 * client's deliberate mirror of the API's shapes, and the client does not import from `server/`.
 *
 * The leaf and not `brain/ttl.ts`, which is where the map used to live: `ttl.ts` sits on the delete path and
 * five of the callers that needed the map could not import it without a cycle. A vocabulary has to be
 * reachable from anywhere, which is what a leaf is for.
 */
const DECLARATIONS = ['server/src/config/types-knowledge.ts', 'client/src/app/core/api.types.ts'];

/** The marker a deliberate subset carries, in its own words, beside the list. */
const DECLARED_SUBSET = /NOT ALL BRAIN COLLECTIONS/;

function sourceFiles() {
  return execFileSync('git', ['ls-files', 'server/src', 'client/src'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.d.ts'));
}

/**
 * Every run naming ALL five knowledge collections as adjacent quoted literals.
 *
 * The whole list, and the plurals: `'entity', 'memory', 'edge', 'chrono'` is the TYPE list, a different
 * enumeration with its own gate, and a check that conflated them would report one as debt for looking like
 * the other.
 */
function enumerationsIn(src) {
  const COLS = ['memories', 'entities', 'edges', 'chrono', 'files'];
  const hits = [];
  const run = /(['"])(?:memories|entities|edges|chrono|files)\1(?:\s*[,|]\s*(['"])(?:memories|entities|edges|chrono|files)\2)+/g;
  for (const m of stripComments(src).matchAll(run)) {
    const named = COLS.filter(c => m[0].includes(`'${c}'`) || m[0].includes(`"${c}"`));
    if (named.length === COLS.length) hits.push(m[0].replace(/\s+/g, ' '));
  }
  return hits;
}

describe('a collection list derives from the one tuple, or declares itself a subset', () => {
  it('no file writes the collections out without saying why', () => {
    const offenders = [];
    for (const f of sourceFiles()) {
      if (DECLARATIONS.includes(f)) continue;
      const src = readFileSync(f, 'utf8');
      const hits = enumerationsIn(src);
      if (hits.length === 0) continue;
      // The declaration is read from the FULL source, comments included: it is a comment.
      if (DECLARED_SUBSET.test(src)) continue;
      for (const h of hits) offenders.push(`${f} — ${h.slice(0, 70)}`);
    }
    assert.deepEqual(
      offenders,
      [],
      `${offenders.length} site(s) write the collections out and neither derive nor declare:\n`
      + offenders.map(o => `  ${o}`).join('\n')
      + '\n\n      Import `BRAIN_COLLECTIONS`, or write `NOT ALL BRAIN COLLECTIONS` beside the list with the'
      + '\n      reason. A collection added to the wrong set is one feature silently absent for one record'
      + '\n      kind, and M-2 adds one.',
    );
  });

  it('the tuple DERIVES from the type list rather than repeating it', () => {
    // A hand-written tuple here is a twenty-first copy wearing the name of the fix. The knowledge
    // collections ARE the knowledge types' suffixes plus `files`, and that mapping already exists.
    const clean = stripComments(readFileSync(DECLARATIONS[0], 'utf8'));
    assert.match(clean, /BRAIN_COLLECTIONS[^=]*=[^;]*RECORD_COLLECTION/,
      'BRAIN_COLLECTIONS must be built from the record-to-collection map, not listed again');
    /*
     * A STRUCTURAL window, not a character count.
     *
     * The first draft asked for `files` within 240 characters of `RECORD_COLLECTION` — and
     * `no-magic-windows.test.js` refuses that, correctly: a character count spans a different number of
     * LINES on CRLF than on CI's LF, so the window silently looks at less on one of the two. The subject
     * here is the DECLARATION, so the bound is the declaration's own end.
     */
    const at = clean.indexOf('RECORD_COLLECTION');
    const decl = clean.slice(at, clean.indexOf('};', at) + 2);
    // `file` is the KEY and `'files'` is the value — the record kind is singular and the collection plural,
    // which is the whole reason this map exists. The first draft asserted it the other way round.
    assert.match(decl, /\bfile\s*:\s*['"]files['"]/,
      'the record map has to add `file: "files"`, the one collection with no knowledge type above it');
  });

  it('the two deliberate subsets each say so, so the exemption cannot be silent', () => {
    // An exemption nobody has to justify is a hole. These two are the ones the rule exists to protect: a
    // vector index a link must never get, and the UI's tabs, which answer a different question entirely.
    for (const f of ['server/src/spaces/vector-index.ts', 'client/src/app/pages/brain/brain-tabs.ts']) {
      assert.match(readFileSync(f, 'utf8'), DECLARED_SUBSET,
        `${f} is a deliberate subset and must say so beside its list`);
    }
  });
});
