/**
 * Both doors must say that recall's expansion cannot start from a non-entity match.
 *
 * ## The gap
 *
 * `recall`'s traversal reads the edge collection and nothing else (`traverseFromSeeds`), and an edge's
 * endpoints are entity ids. So a memory, chrono entry or file that matched semantically **is not on the graph
 * at all** — it comes back with an empty `_graph`, and raising `traverse` does not change it.
 *
 * Neither door said so. The integration guide had *"only entities are returned by traversal … memories, chrono
 * entries, and files still appear as seeds when they match semantically"*, which states the RETURN rule and
 * then invites exactly the wrong inference from the word "seeds"; the MCP schema said nothing at all. A caller
 * with a memory-heavy space asks for `traverse: 2`, gets empty subtrees, and has no way to tell a correct
 * answer from a broken one.
 *
 * This is the schema-description rule in `CLAUDE.md`: what a caller reads while constructing arguments is the
 * authoritative reference, and nobody reports a capability they were told they did not have — or, here, a
 * limit they were never told about.
 *
 * ## Why a gate rather than just the words
 *
 * The two doors are one API, and a sentence added to one is exactly how they drift. The standalone `traverse`
 * tool DOES reach these records, through `includeChrono` / `includeMemories` / `includeFiles`, so the
 * difference between the two traversals is precisely the thing a reader needs and precisely the thing easiest
 * to leave on one surface.
 *
 * Run: node --test testing/standalone/both-doors-say-a-memory-seed-reaches-nothing.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const DOORS = [
  { what: 'the integration guide', file: 'docs/integration-guide/04a-recall-api.md' },
  { what: "MCP's recall schema", file: 'server/src/mcp/tools/search.ts' },
];

describe('recall expansion cannot start from a non-entity match', () => {
  it('the behaviour is still what the docs describe', () => {
    /*
     * Checked from SOURCE, so this file cannot outlive the thing it documents.
     *
     * If `traverseFromSeeds` ever learns to read the chrono/memory/file collections the way `traverseGraph`
     * does, these sentences become false and must be removed — and a docs gate that never looked at the code
     * would keep enforcing a stale warning, which is the same defect one direction over.
     */
    const edges = readFileSync('server/src/brain/edges.ts', 'utf8');
    const at = edges.indexOf('export async function traverseFromSeeds');
    assert.notEqual(at, -1, 'traverseFromSeeds is gone — re-point this gate');
    const body = edges.slice(at, edges.indexOf('\nexport ', at + 10));
    assert.match(body, /_edges`\)/, 'the seed traversal must still read the edge collection');
    for (const other of ['_chrono`)', '_memories`)', '_files`)']) {
      assert.ok(
        !body.includes(other),
        `traverseFromSeeds now reads ${other} — a non-entity seed may no longer be a dead end, so the warning `
        + 'these doors carry has become false and must be removed rather than kept',
      );
    }
  });

  it('every door states it', () => {
    const silent = DOORS.filter(d => {
      /*
       * Whitespace collapsed first. One door is markdown wrapped at 110 columns and the other is a single
       * enormous string literal, so any phrase long enough to be worth asserting on will be split by a newline
       * in one of them and not the other. Matching the raw bytes found the sentence in the MCP schema and
       * missed the identical sentence in the guide, purely because "an empty" and "`_graph`" landed on
       * different lines.
       */
      const text = readFileSync(d.file, 'utf8').replace(/\s+/g, ' ');
      /*
       * THREE clauses, not one, and "at any depth" is the load-bearing one.
       *
       * A first version required only the phrase "non-entity seed", and a mutant that reworded the sentence to
       * "a non-entity seed is fine" walked straight through — the gate was matching a NOUN PHRASE while the
       * claim it cares about is what follows it. "At any depth" is the part that cannot be written by accident
       * while saying the opposite, because it is the whole surprise: raising `traverse` does not help.
       */
      return !(/non-entity seed/i.test(text)
        && /at any depth/i.test(text)
        && /empty `_graph`/.test(text));
    });
    assert.deepEqual(
      silent.map(d => `${d.what} (${d.file})`), [],
      'A caller here asks for graph expansion, gets empty subtrees on every memory match, and has nothing to '
      + 'distinguish that from a fault. One door carrying the warning and the other not is how these two '
      + 'descriptions drift.',
    );
  });

  it('and points at what DOES reach those records', () => {
    // A limit with no way forward is half an answer. The standalone traverse tool reaches them through its
    // include* flags, and that is the sentence that turns a dead end into a route.
    for (const d of DOORS) {
      const text = readFileSync(d.file, 'utf8');
      assert.match(
        text, /includeChrono/,
        `${d.what} states the limit without naming the standalone traverse flags that get past it`,
      );
      assert.match(
        text, /entityIds/,
        `${d.what} does not say WHY — the links live in \`entityIds\`, a field rather than an edge, which is `
        + 'the whole reason the walk cannot see them',
      );
    }
  });
});
