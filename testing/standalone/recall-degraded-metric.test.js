/**
 * Silent degradation is counted, and only where it can be counted honestly.
 *
 * Every other counter in the registry measures work done or work failed. This one measures the gap
 * between them: recall answered, 200, and the answer was quietly worse than the instance is configured
 * to produce. A reranker unreachable for a week generates no failed requests, no error rate and no
 * latency change worth noticing — every recall simply comes back in vector order and nobody is told.
 *
 * The tests worth having here are about **trustworthiness of the metric**, not the plumbing:
 *
 *  1. Both series exist from process start. "Absent" and "zero" render identically on a graph and mean
 *     opposite things — a scrape before the first degradation must say 0, not nothing.
 *  2. The label set is CLOSED. An unbounded `reason` is a cardinality bomb.
 *  3. Every declared reason is actually incremented somewhere. A label that can only ever read 0 is
 *     worse than no label: an operator reads it as "this never happens".
 *
 * Run: node --test testing/standalone/recall-degraded-metric.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let register, recallDegradedTotal;

before(async () => {
  ({ register, recallDegradedTotal } = await import('../../server/dist/metrics/registry.js'));
});

const REASONS = ['rerank_unavailable', 'rerank_skipped_budget'];

describe('ythril_recall_degraded_total', () => {
  it('exposes every reason at zero before anything has degraded', async () => {
    const metrics = await register.metrics();
    for (const reason of REASONS) {
      assert.match(metrics, new RegExp(`ythril_recall_degraded_total\\{reason="${reason}"\\} 0`),
        `${reason} must be pre-declared — an absent series and a zero series look the same on a graph`);
    }
  });

  it('counts up when a degradation is recorded', async () => {
    recallDegradedTotal.labels({ reason: 'rerank_unavailable' }).inc();
    const metrics = await register.metrics();
    assert.match(metrics, /ythril_recall_degraded_total\{reason="rerank_unavailable"\} 1/);
    // …and does not disturb its sibling.
    assert.match(metrics, /ythril_recall_degraded_total\{reason="rerank_skipped_budget"\} 0/);
  });

  it('every declared reason is incremented somewhere in the source', () => {
    // A label that can only ever read 0 tells an operator "this never happens", which is a stronger and
    // more misleading claim than saying nothing at all.
    const recall = readFileSync('server/src/brain/recall.ts', 'utf8');
    for (const reason of REASONS) {
      assert.ok(recall.includes(`reason: '${reason}'`), `${reason} is declared but never incremented`);
    }
  });

  it('the lexical channel is deliberately NOT counted, and the reason is recorded', () => {
    // `applyLexicalFusion` cannot tell "no text index" from "nothing matched" — both are an empty
    // result. Counting it would fire on ordinary queries and report degradation where there is none.
    // A metric an operator learns to ignore will not be read on the day it matters.
    const registrySrc = readFileSync('server/src/metrics/registry.ts', 'utf8');
    assert.ok(!registrySrc.includes("'lexical_unavailable'"),
      'the lexical reason must not be declared until it can be distinguished from a normal empty result');
    assert.match(registrySrc, /deliberately NOT counted/,
      'the omission must be explained, or someone will "fix" it by adding a misleading counter');
  });
});
