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
    assert.equal((rest.match(/spillResultSet\(\{/g) ?? []).length, 2, 'REST recall and find-similar');
    assert.equal((mcp.match(/spillResultSet\(\{/g) ?? []).length, 2, 'MCP recall and find_similar');
    for (const [name, src] of [['REST', rest], ['MCP', mcp]]) {
      assert.equal((src.match(/slice\(0, SPILL_INLINE_RESULTS\)/g) ?? []).length, 2,
        `${name} must return the sample rather than the whole set when it spilled`);
    }
  });

  it('`count` still reports the real total, not the sample', () => {
    // The sample is three; a caller who read `count: 3` would conclude the space holds three matching records.
    const rest = read('server/src/api/brain/search.ts');
    assert.match(rest, /count: results\.length,/, 'count must be the full set');
    assert.match(rest, /count: items\.length,/);
  });
});
