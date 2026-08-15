/**
 * A record retired from semantic ranking is still reachable through its edges — including by recall's own
 * `traverse` expansion — and every surface that says so must keep saying it.
 *
 * ## The question this exists because of
 *
 * Owner, 2026-08-15: *"excludefromvector does also exclude from recalls traversal? ambigous and i want
 * entries to be findable via traversal even if they are not embedded themselves."*
 *
 * The answer is no, and it is structural rather than a policy anyone chose: `excludeFromVectorSearch` is
 * implemented as the ABSENCE of a vector (`brain/embed-record.ts`), not as a query-time filter. Recall's
 * `traverse` expansion walks EDGES out of a match, so it never consults a vector, and `recall-graph.ts`
 * filters on nothing but the edge.
 *
 * ## Why the question had to be asked at all
 *
 * The schema description listed `traverse` among the readers that still reach an excluded record. That is
 * true of BOTH traversals — the `traverse` tool and `recall(traverse: n)` — and reads as neither, because a
 * reader has to already know there are two before the word tells them anything.
 *
 * `help()` says the tool schema is the authoritative reference, and CLAUDE.md records what a stale sentence
 * there already cost: aigents read *"filter applied after vector search"*, believed it, and built a skill
 * that avoided filtered recall. An ambiguous sentence is cheaper than a wrong one and not by much.
 *
 * ## What is gated
 *
 * That the behaviour stays absent from the read path — no query-time filter creeping in — and that both
 * surfaces keep naming both traversals. A doc that stops saying it is how the question gets asked again.
 *
 * Run: node --test testing/standalone/exclusion-does-not-hide-from-traversal.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
/** Line comments first, then block — a block-open inside a line comment otherwise swallows real code. */
const strip = (src) => src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the exclusion is a missing vector, never a read-time filter', () => {
  it('the graph walk does not consult the flag', () => {
    // If this ever grew a filter on `excludeFromVectorSearch`, an excluded record would silently vanish from
    // `_graph` — the exact behaviour the owner asked us NOT to have, and invisible from any single result.
    const src = strip(read('server/src/brain/recall-graph.ts'));
    assert.doesNotMatch(src, /excludeFromVectorSearch/,
      'traversal must reach an excluded record; it walks edges and must not read the flag');
  });

  it('only the embed path reads it, which is what makes it a missing vector', () => {
    // One writer, no readers. The flag has meaning exactly once — when deciding whether to store a vector.
    const embed = strip(read('server/src/brain/embed-record.ts'));
    assert.match(embed, /excludeFromVectorSearch/, 'the embed path is where the flag is honoured');
    assert.match(embed, /\$unset/, 'setting it must REMOVE the vector, not mark the record');
  });
});

describe('both surfaces name both traversals', () => {
  // "traverse" alone is the ambiguity that produced the question. Each surface has to distinguish the tool
  // from recall's expansion, in whatever words it uses.
  it('the MCP schema description does', () => {
    const d = read('server/src/mcp/tools/shared.ts');
    assert.match(d, /traverse` tool/, 'name the traverse TOOL');
    assert.match(d, /traverse` expansion/, "name recall's own expansion");
    assert.match(d, /walks\s*'?\s*\+?\s*'?edges|walks edges/,
      'say WHY it still reaches — it walks edges and never consults a vector');
  });

  it('the integration guide does', () => {
    const g = read('docs/integration-guide/04-brain-api.md');
    assert.match(g, /recall\(traverse: n\)/, 'the guide must name recall.s expansion explicitly');
    assert.match(g, /the `traverse` tool/, 'and the tool, as a separate row');
    assert.match(g, /still findable through its relationships/i,
      'state the consequence, which is the half the owner actually wanted');
  });
});
