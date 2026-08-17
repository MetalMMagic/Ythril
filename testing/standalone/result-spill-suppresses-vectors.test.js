/**
 * A spilled result set carries no vectors, and the whole set spills — not just the graph.
 *
 * ## The correction this pins
 *
 * The first version spilled the GRAPH: the neighbours that did not fit inline. The owner's intent was the whole
 * result set — *"when someone recalls with topK=100 and traverse=2 he gets a real big file to download but only 3
 * full results back in the response"*. A recall cannot be paged, so a large answer has nowhere to go otherwise.
 *
 * ## Why the vector strip is a WRITE-time rule and not a projection
 *
 * Recall's own queries already exclude `embedding`, and `traverseFromSeeds` projects it away too. This is the belt
 * to that braces, and it is at the write because a spill is the one place a whole result set is serialised
 * verbatim into a file an operator can open: one future field that forgets the projection would put thousands of
 * floats in front of them. A rule at the write cannot be forgotten by a caller who never knew it.
 *
 * Run: node --test testing/standalone/result-spill-suppresses-vectors.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const {
  suppressEmbeddings, SPILL_INLINE_RESULTS, SPILL_RECORD_THRESHOLD, SPILL_TTL_DAYS,
} = await import('../../server/dist/brain/graph-spill.js');

const read = p => stripComments(readFileSync(p, 'utf8'));

describe('vectors never reach the file', () => {
  it('strips every vector key, at every depth', () => {
    const out = suppressEmbeddings({
      _id: 'a',
      embedding: [1, 2, 3],
      record: { vector: [4], name: 'x', nested: [{ embeddings: [9], contentEmbedding: [1], ok: 1 }] },
    });
    assert.equal(JSON.stringify(out).includes('embedding'), false, JSON.stringify(out));
    assert.equal(JSON.stringify(out).includes('vector'), false, JSON.stringify(out));
    assert.equal(out.record.name, 'x', 'and keeps everything else');
    assert.equal(out.record.nested[0].ok, 1);
  });

  it('does not mutate what it was given', () => {
    // The results are also the response the caller gets inline; deleting in place would thin both.
    const input = { embedding: [1], keep: 2 };
    suppressEmbeddings(input);
    assert.deepEqual(input, { embedding: [1], keep: 2 });
  });

  it('survives the awkward shapes', () => {
    assert.equal(suppressEmbeddings(null), null);
    assert.equal(suppressEmbeddings('x'), 'x');
    assert.deepEqual(suppressEmbeddings([{ embedding: [1] }, 2]), [{}, 2]);
  });

  it('is applied at the write, not left to the caller', () => {
    const src = read('server/src/brain/graph-spill.ts');
    const at = src.indexOf('export async function spillResultSet');
    assert.ok(at > -1, 'spillResultSet is gone — re-anchor this gate');
    const body = src.slice(at, at + 1600);
    assert.match(body, /JSON\.stringify\(suppressEmbeddings\(\{/,
      'the strip must wrap the whole payload at serialisation, not a field somebody remembered');
  });
});

describe('the whole result set spills, with a TTL', () => {
  it('the threshold counts RECORDS — matches plus traversed nodes', () => {
    const src = read('server/src/brain/graph-spill.ts');
    assert.match(src, /const records = opts\.results\.length \+ opts\.graphNodes;/,
      'a threshold on matches alone would let traverse: 2 return an enormous answer');
    assert.match(src, /if \(records <= SPILL_RECORD_THRESHOLD\) return null;/);
  });

  it('a sample comes back inline, not the whole thing', () => {
    assert.equal(SPILL_INLINE_RESULTS, 3, 'the owner asked for three');
    assert.ok(SPILL_RECORD_THRESHOLD > SPILL_INLINE_RESULTS,
      'a threshold at or below the inline count would spill every call');
  });

  it('one-day TTL, through the record machinery', () => {
    assert.equal(SPILL_TTL_DAYS, 1);
    const src = read('server/src/brain/graph-spill.ts');
    const at = src.indexOf('export async function spillResultSet');
    assert.match(src.slice(at, at + 1800), /ttlDays: SPILL_TTL_DAYS/,
      'the file must expire with its record, like the graph spill beside it');
  });

  it('all four response sites use it', () => {
    // Two REST routes and two MCP tools. A site that skipped it would return the enormous answer this exists to
    // prevent, and nothing else would notice.
    const rest = read('server/src/api/brain/search.ts');
    const mcp = read('server/src/mcp/tools/search.ts');
    // TWO branches each: with and without `traverse`. The first version wired only the graph branch, so the
    // plainest large call — `topK: 100`, no traversal — returned everything. The E2E caught it; this counts it.
    //
    // MCP went 3 → 4 in 3.1.0. `find_similar` answered plain TEXT at `traverse: 0`, so it had nothing to
    // spill there and only its graph branch was wired; returning JSON at every depth gave the default depth
    // a size cap it had never had. That is the second time a "plainest large call" went uncapped, which is
    // why this counts sites rather than trusting that a new branch remembered.
    assert.equal((rest.match(/spillResultSet\(\{/g) ?? []).length, 4, 'REST recall + find-similar, both branches');
    assert.equal((mcp.match(/spillResultSet\(\{/g) ?? []).length, 4, 'MCP recall + find_similar, both branches each');
    // This used to assert `slice(0, SPILL_INLINE_RESULTS)` — the three-record sample. X-17 replaced that cap
    // with a byte budget, so the rule it was protecting has changed shape rather than gone: the response
    // must still be BOUNDED, and the spill must still receive what the caller did not get. The pinned detail
    // was the old mechanism; the rule is that neither door hands back an unbounded set.
    for (const [name, src] of [['REST', rest], ['MCP', mcp]]) {
      assert.ok((src.match(/budgetedEnvelope\(\{/g) ?? []).length >= 4,
        `${name} must bound every result path through the shared budget rather than returning what it has`);
      assert.doesNotMatch(src, /slice\(0, SPILL_INLINE_RESULTS\)/,
        `${name} still collapses to the fixed sample — that cap is what X-17 removed, and reintroducing it `
        + 'would restore the shape that doubled a caller\'s cost');
    }
  });

  it('the spill receives ONLY what did not fit', () => {
    // The old dump re-sent the whole result set, including the records already returned inline — which is
    // most of why the previous shape cost more than it saved. `budgetedEnvelope` hands its `spillRemainder`
    // callback the remainder alone, so a spilled file is the continuation rather than a duplicate.
    const restSrc = read('server/src/api/brain/search.ts');
    const mcpSrc = read('server/src/mcp/tools/search.ts');
    for (const [name, src] of [['REST', restSrc], ['MCP', mcpSrc]]) {
      const callbacks = (src.match(/spillRemainder: remainder => spillResultSet\(\{/g) ?? []).length;
      const remainders = (src.match(/results: remainder,/g) ?? []).length;
      assert.equal(callbacks, 4, `${name}: expected four spill callbacks, found ${callbacks}`);
      assert.equal(remainders, 4,
        `${name} spills something other than the remainder on ${callbacks - remainders} path(s) — a dump that `
        + 'repeats what was already sent is the defect this replaced');
    }
  });

  it('`count` still reports the real total, not the sample', () => {
    // The sample is three; a caller who read `count: 3` would conclude the space holds three matching records.
    // `count` moved into `budgetFields`, which is the point: one definition instead of four sites each
    // spelling it out and one of them eventually spelling it wrong. The rule is unchanged — it is the TOTAL
    // number of matches, never the number returned — and `returned` is the new field for the other question.
    const budget = read('server/src/brain/result-budget.ts');
    assert.match(budget, /count: totalMatches,/, 'count must be the full set, not the returned prefix');
    assert.match(budget, /returned: outcome\.returned\.length,/,
      'and `returned` must report the prefix, so the two questions have two fields');
  });
});
