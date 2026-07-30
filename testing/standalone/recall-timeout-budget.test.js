/**
 * Recall has an end-to-end budget, and the reranker is what it spends last.
 *
 * ## The gap
 *
 * Every hop on the recall path runs in series and each carried its own timeout, with nothing watching
 * the total: embed the query (30 s), the per-type vector searches (Mongo), the lexical channel (Mongo),
 * then the cross-encoder (20 s). Worst case is comfortably past the ~30 s an MCP client waits — so the
 * server finishes the work and hands it to a caller that stopped listening, which is the same as not
 * doing it, except slower and for everyone else's CPU too.
 *
 * ## Why the reranker is the right hop to cut
 *
 * It is last, it is the only OPTIONAL one, and the pipeline already knows how to live without it — an
 * unreachable reranker returns null and the fused order stands. So a deadline that bites here converts
 * a client-side timeout (no results at all) into a slightly worse ranking delivered on time.
 *
 * Cutting anywhere earlier would mean returning nothing, which is strictly worse than returning
 * something imperfect.
 *
 * Run: node --test testing/standalone/recall-timeout-budget.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let RECALL_BUDGET_MS, RERANK_MIN_BUDGET_MS;

before(async () => {
  ({ RECALL_BUDGET_MS, RERANK_MIN_BUDGET_MS } = await import('../../server/dist/brain/recall.js'));
});

describe('the budget is sized against a real caller', () => {
  it('sits under the ~30s an MCP client typically waits', () => {
    assert.ok(RECALL_BUDGET_MS > 0);
    assert.ok(RECALL_BUDGET_MS < 30_000,
      'a budget at or above the caller\'s own timeout cannot prevent the thing it exists to prevent');
  });

  it('leaves enough headroom that the skip threshold is meaningful', () => {
    assert.ok(RERANK_MIN_BUDGET_MS > 0);
    assert.ok(RERANK_MIN_BUDGET_MS < RECALL_BUDGET_MS / 2,
      'if the skip threshold approaches the whole budget the reranker would almost never run');
  });
});

describe('the deadline is threaded through the pipeline', () => {
  const recall = readFileSync('server/src/brain/recall.ts', 'utf8');

  it('the clock starts before the first hop, not after it', () => {
    // Starting it after the embed would hide the slowest single hop from the budget entirely.
    const startAt = recall.indexOf('const startedAt = Date.now()');
    const embedAt = recall.indexOf("await embed(query, 'query')");
    assert.ok(startAt > 0 && embedAt > 0);
    assert.ok(startAt < embedAt, 'the budget must include the embedding call');
  });

  it('the reranker is skipped when too little budget remains', () => {
    assert.match(recall, /remaining < RERANK_MIN_BUDGET_MS/,
      'there must be a skip, not merely a shortened timeout — starting a doomed pass still burns the time');
    assert.match(recall, /skipping the reranker/, 'the skip must be logged; a silent downgrade is unexplainable');
  });

  it('the remaining budget is passed to the reranker, not just checked', () => {
    assert.match(recall, /applyRerank\(query, guaranteed, allResults, remaining\)/);
    const client = readFileSync('server/src/brain/rerank-client.ts', 'utf8');
    assert.match(client, /Math\.min\(TIMEOUT_MS, budgetMs!\)/,
      'the reranker must cap its own timeout to what is left, never exceed it');
  });

  it('an absent budget still gets the full timeout — the parameter is optional', () => {
    // `rerank()` is called from find_similar too, which has no budget of its own. It must not
    // accidentally get a zero-length timeout.
    const client = readFileSync('server/src/brain/rerank-client.ts', 'utf8');
    assert.match(client, /Number\.isFinite\(budgetMs\) && budgetMs! > 0 \? .* : TIMEOUT_MS/);
  });

  it('the vector and lexical hops are NOT cancelled by the budget', () => {
    // Deliberate: they produce the results themselves. Cutting them returns nothing, which is worse
    // than returning an imperfectly ordered something.
    const phase2 = recall.slice(recall.indexOf('// Phase 2:'), recall.indexOf('// Phase 3'));
    assert.ok(!phase2.includes('RECALL_BUDGET_MS'),
      'the budget must not be able to cancel the searches that produce the results');
  });
});
