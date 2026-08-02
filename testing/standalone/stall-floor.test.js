/**
 * The stall timeout can never be shorter than the longest single step a job may take.
 *
 * ## The measurement this came from
 *
 * Read out of the compiled config rather than assumed:
 *
 *     stalledJobTimeoutMs   300 000 ms   (default)
 *     pageTimeoutMs          60 000 ms   0.20x   settable to   600 000
 *     ocrTimeoutMs          120 000 ms   0.40x   settable to 1 800 000   (6x the stall default)
 *     describeTimeoutMs      30 000 ms   0.10x   settable to   600 000
 *
 * **CORRECTED: it binds at the defaults.** The reading above counted only SETTABLE config keys, and the longest
 * step is not one — the render of a page window is `pageTimeoutMs x min(maxPages, 20)` = **1 200 000 ms**,
 * computed at its call site, four times the stall default with nothing configured. Four more inline literals
 * were invisible for the same reason (Whisper at exactly 300 000, captioning at 120 000 / 60 000, external face
 * recognition at 30 000). `stall-floor-covers-every-hop.test.js` now enumerates the call sites so a hop cannot
 * be added without reaching the floor.
 *
 * The configuration trap is real as well, and following our own documentation gets an operator close to it: the
 * docs tell a swap-based host to raise `describeTimeoutMs` (ceiling 10 min) and tell large-scan operators to
 * raise `ocrTimeoutMs` (ceiling 30 min).
 *
 * ## Why exceeding it loops rather than merely being slow
 *
 * Each of those budgets bounds ONE call, and a call reports no progress while it is in flight — the heartbeat
 * fires between steps, not inside one. So a hop longer than the stall timeout means the job is re-queued *while
 * that hop is still working*; since the claim lease shipped, the original run then abandons, the replacement
 * starts the same document, reaches the same hop, and is re-queued at the same point. That is the "slow job
 * killed and killed again at the same page" failure the per-page heartbeat was written to end, reachable again
 * through configuration.
 *
 * Run: node --test testing/standalone/stall-floor.test.js
 */
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let effectiveStallTimeoutMs, stallTimeoutWithWarning, STALL_FLOOR_FACTOR, _resetStallWarningForTests;

const STALL_DEFAULT = 300_000;

describe('effectiveStallTimeoutMs', () => {
  before(async () => {
    ({ effectiveStallTimeoutMs, stallTimeoutWithWarning, STALL_FLOOR_FACTOR, _resetStallWarningForTests } =
      await import('../../server/dist/files/media/stall-floor.js'));
  });

  beforeEach(() => { _resetStallWarningForTests(); });

  it('does not bind at the shipped defaults — the worst hop is OCR at 0.40x', () => {
    // If this ever starts binding out of the box, either a default grew or the stall default shrank, and the
    // recovery delay changed for every instance without anyone deciding to.
    const { ms, raised } = effectiveStallTimeoutMs(STALL_DEFAULT, {
      pageTimeoutMs: 60_000, ocrTimeoutMs: 120_000, describeTimeoutMs: 30_000,
    });
    assert.equal(ms, STALL_DEFAULT);
    assert.equal(raised, undefined);
  });

  it('raises the timeout when a hop exceeds it, and says which hop', () => {
    // The reachable case: an operator raises the OCR ceiling for a large scan.
    const { ms, raised } = effectiveStallTimeoutMs(STALL_DEFAULT, { ocrTimeoutMs: 1_800_000 });
    assert.equal(ms, 1_800_000 * STALL_FLOOR_FACTOR);
    assert.equal(raised.hop, 'ocrTimeoutMs');
    assert.equal(raised.hopMs, 1_800_000);
    assert.equal(raised.from, STALL_DEFAULT);
  });

  it('leaves head-room over the hop rather than matching it exactly', () => {
    // Equal values would make "the hop gave up" and "the detector fired" indistinguishable in the log, at the
    // same instant, on every occurrence.
    const { ms } = effectiveStallTimeoutMs(100_000, { ocrTimeoutMs: 100_000 });
    assert.ok(ms > 100_000, `expected head-room, got ${ms}`);
    assert.ok(STALL_FLOOR_FACTOR > 1);
  });

  it('picks the LONGEST hop, not the first or the last', () => {
    const { raised } = effectiveStallTimeoutMs(STALL_DEFAULT, {
      pageTimeoutMs: 400_000, ocrTimeoutMs: 900_000, describeTimeoutMs: 500_000,
    });
    assert.equal(raised.hop, 'ocrTimeoutMs');
  });

  it('ignores absent, zero and non-finite budgets instead of treating them as huge', () => {
    // A missing budget must not raise the floor: the recovery delay would grow because a field was undefined.
    const { ms, raised } = effectiveStallTimeoutMs(STALL_DEFAULT, {
      pageTimeoutMs: undefined, ocrTimeoutMs: 0, describeTimeoutMs: NaN, other: Infinity,
    });
    assert.equal(ms, STALL_DEFAULT);
    assert.equal(raised, undefined);
  });

  it('respects a stall timeout the operator already set high enough', () => {
    // Raising stalledJobTimeoutMs is the documented way to silence this. It must actually silence it.
    const { ms, raised } = effectiveStallTimeoutMs(3_000_000, { ocrTimeoutMs: 1_800_000 });
    assert.equal(ms, 3_000_000);
    assert.equal(raised, undefined);
  });

  it('warns once per distinct combination, not once per sweep', () => {
    // The sweep fires every 30 s at most; the same line forever is how a real warning becomes wallpaper.
    const hops = { ocrTimeoutMs: 1_800_000 };
    assert.equal(stallTimeoutWithWarning(STALL_DEFAULT, hops), 2_700_000);
    assert.equal(stallTimeoutWithWarning(STALL_DEFAULT, hops), 2_700_000);
    assert.equal(stallTimeoutWithWarning(STALL_DEFAULT, { ocrTimeoutMs: 900_000 }), 1_350_000);
  });
});

describe('the worker uses the floor, not the raw setting', () => {
  // The suite above proves the rule. This proves it is applied — at BOTH points the worker resolves the
  // timeout, since a config change between boot and the first sweep would otherwise leave one of them wrong.
  const src = readFileSync('server/src/files/media/worker.ts', 'utf8');

  it('floors the startup sweep', () => {
    assert.match(src, /const startupStalledTimeoutMs = stallTimeoutWithWarning\(/);
  });

  it('floors the periodic sweep too', () => {
    assert.match(src, /const stalledTimeoutMs = stallTimeoutWithWarning\(/);
  });

  it('never passes a raw configured value to resetStalledJobs', () => {
    // The regression this catches: someone "simplifies" one call site back to the plain config read.
    assert.doesNotMatch(src, /resetStalledJobs\([^)]*stalledJobTimeoutMs \?\? 300_000/);
  });

  it('names only DURATION budgets as hops', () => {
    // `maxPages` and `concurrency` are not durations; feeding one would raise the floor for no reason and make
    // recovery slower than it needs to be.
    //
    // Checked on the fed VALUES with comments stripped, not on the helper's whole text. The earlier version
    // grepped the raw source, so it failed the moment a comment mentioned `maxPages` while the code was
    // correct — and it would equally have passed a count fed under a duration-shaped key. What matters is what
    // reaches `effectiveStallTimeoutMs`.
    const helper = src.match(/function hopBudgets\(\)[\s\S]*?\n\}/)?.[0] ?? '';
    assert.ok(helper.length > 100, 'could not locate hopBudgets()');
    const code = helper.replace(/\/\/.*$/gm, '');

    const fed = [...code.matchAll(/^\s*(\w+):\s*([^,\n]+),/gm)].map(m => ({ key: m[1], value: m[2].trim() }));
    assert.ok(fed.length >= 4, `only ${fed.length} hops parsed out of hopBudgets()`);

    for (const { key, value } of fed) {
      assert.ok(!/^(doc\.)?(maxPages|concurrency)$/.test(value) && !/PollInterval/.test(value),
        `hopBudgets feeds '${key}: ${value}', which is not a duration — it would inflate the stall floor`);
      // Every fed value must NAME a millisecond quantity: a config `*TimeoutMs`, a `*_TIMEOUT_MS` constant, or
      // a helper whose name ends in `Ms`. That admits a DERIVED duration (the render window is
      // `pageTimeoutMs x min(maxPages, 20)`, computed inside `worstRenderWindowMs`) while still rejecting a
      // raw count.
      assert.match(value, /TimeoutMs\b|_TIMEOUT_MS\b|Ms\(/,
        `hopBudgets feeds '${key}: ${value}', which does not name a millisecond quantity`);
    }

    const keys = fed.map(f => f.key);
    for (const required of ['pageTimeoutMs', 'ocrTimeoutMs', 'describeTimeoutMs', 'renderWindowMs']) {
      assert.ok(keys.includes(required), `hopBudgets no longer feeds ${required}`);
    }
  });

  it('feeds the render window, which is the longest step at the DEFAULTS', () => {
    // The reason this file's opening measurement was wrong: it counted settable config keys, and the render
    // budget is computed at its call site. 60 000 x min(50, 20) = 1 200 000 ms against a 300 000 ms default.
    const helper = src.match(/function hopBudgets\(\)[\s\S]*?\n\}/)?.[0] ?? '';
    assert.match(helper, /renderWindowMs:\s*worstRenderWindowMs\(/);
  });
});
