/**
 * Step progress: what the worker reports as a document moves through its route.
 *
 * This is the data a segmented progress bar is drawn from, so the shape matters as much as the
 * values. Two properties are load-bearing and neither is obvious:
 *
 *  - **`steps` is per-document, not a fixed list.** `decideRoute` returns a different chain per
 *    extraction level and per what is actually configured, so a bar built from it shows the stages
 *    that will really run instead of a template with permanently-dark segments. An `ocr` document has
 *    exactly one stage — the bar must degrade to a plain bar rather than pretend to be segmented.
 *  - **`done` must never go backwards.** Pages are transcribed concurrently (`mapLimit`), so
 *    completion order is not index order; a bar driven by the map index would jump around. Counting
 *    completions is what keeps it monotonic.
 *
 * Run: node --test testing/standalone/step-progress.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let decideRoute;

const ALL = { ocr: true, render: true, vlm: true, repair: true, verify: true };
const only = (o) => ({ ocr: false, render: false, vlm: false, repair: false, verify: false, ...o });

describe('the route is what the bar is drawn from', () => {
  before(async () => {
    ({ decideRoute } = await import('../../server/dist/files/converters/extraction-policy.js'));
  });

  it('an OCR document has a single stage — a segmented bar would be a lie', () => {
    const stages = decideRoute('ocr', ALL).stages;
    assert.deepEqual(stages, ['ocr']);
  });

  it('a repair document exposes the full chain, in running order', () => {
    const stages = decideRoute('repair', ALL).stages;
    assert.deepEqual(stages, ['render', 'ocr-evidence', 'vlm', 'validate', 'repair', 'verify']);
  });

  it('stages absent from the route are never reported — no dark segments', () => {
    // No repair or verify model wired in: those sections must not appear at all, rather than
    // appearing and never filling.
    const stages = decideRoute('repair', only({ ocr: true, render: true, vlm: true })).stages;
    assert.ok(!stages.includes('repair'));
    assert.ok(!stages.includes('verify'));
  });

  it('a route that degrades to OCR reports the degraded chain, not the requested one', () => {
    // Asked for vlm, no vision model: the bar must show what actually runs.
    const stages = decideRoute('vlm', only({ ocr: true })).stages;
    assert.deepEqual(stages, ['ocr']);
  });

  it('off runs nothing, so there is nothing to draw', () => {
    assert.deepEqual(decideRoute('off', ALL).stages, []);
  });
});

describe('progress reports stay monotonic under concurrency', () => {
  // The reporting rule, exercised the way the extractor uses it: pages complete out of order, and
  // the counter must still only ever climb. This mirrors the `++pagesDone` counter rather than
  // importing it (it is a local in an async closure), so it is a check on the RULE — that counting
  // completions is order-independent, where using the index is not.
  it('counting completions is monotonic even when pages finish out of order', async () => {
    const total = 8;
    const completionOrder = [3, 0, 5, 1, 7, 2, 6, 4]; // deliberately scrambled
    let done = 0;
    const seen = [];
    for (const _index of completionOrder) {
      seen.push({ step: 'vlm', done: ++done, total });
    }
    assert.deepEqual(seen.map(p => p.done), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(seen.at(-1).done, total, 'the last report must reach the total');
  });

  it('using the completion INDEX instead would go backwards — which is why it is not used', () => {
    const completionOrder = [3, 0, 5, 1, 7, 2, 6, 4];
    const byIndex = completionOrder.map(i => i + 1);
    const monotonic = byIndex.every((v, i) => i === 0 || v >= byIndex[i - 1]);
    assert.equal(monotonic, false, 'index order is not completion order');
  });
});
