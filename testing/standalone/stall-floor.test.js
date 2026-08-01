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
 * **At the defaults nothing binds.** The trap is what the admin API allows an operator to set — and following
 * our own documentation gets them close to it: the docs tell a swap-based host to raise `describeTimeoutMs`
 * (ceiling 10 min) and tell large-scan operators to raise `ocrTimeoutMs` (ceiling 30 min).
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
    // `maxPages` and `concurrency` are not durations; including one would raise the floor for no reason and
    // make recovery slower than it needs to be.
    const helper = src.match(/function hopBudgets\(\)[\s\S]*?\n\}/)?.[0] ?? '';
    assert.ok(helper.includes('pageTimeoutMs') && helper.includes('ocrTimeoutMs')
      && helper.includes('describeTimeoutMs'), 'the three call budgets must be listed');
    assert.ok(!/maxPages|concurrency|PollInterval/.test(helper),
      'a non-duration in hopBudgets would inflate the stall floor');
  });
});
