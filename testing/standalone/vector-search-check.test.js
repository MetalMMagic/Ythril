/**
 * The `$vectorSearch` availability probe — against the REAL one.
 *
 * The previous version of this file was the deepest drift in the batch. It did not merely copy the
 * production code; it tested a **different algorithm that no longer exists**. Its subject was
 * `checkVectorSearch` / `isVectorSearchAvailable` — neither of which appears anywhere in `server/src`
 * — and its premise was that the probe runs a `$vectorSearch` aggregate and classifies the resulting
 * error: "unknown stage" meaning unsupported, anything else meaning supported.
 *
 * Production does none of that. It calls `listSearchIndexes()` on a throwaway collection, retries six
 * times with a 2s backoff, and gives up. It does not distinguish error kinds at all — a cold `mongot`
 * and a permanently unsupported deployment look identical to it, and the retry is what tells them
 * apart in practice.
 *
 * So every assertion in the old file described behaviour the product had stopped having. It passed
 * throughout.
 *
 * What is worth pinning is the part with an incident behind it: **the probe is memoised**. It used to
 * be awaited from `ensureVectorSearchIndex`, which runs once per collection per space, so an
 * unmemoised probe made a cold boot pay the full 12-second backoff five times per space — enough to
 * delay startup past the point where crash recovery worked.
 *
 * Run: node --test testing/standalone/vector-search-check.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { searchAvailable, resetSearchReadyProbe } = await import('../../server/dist/spaces/vector-index.js');

/** A probe that fails `failures` times and then succeeds, counting calls. */
function flakyProbe(failures) {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls <= failures) throw new Error('mongot is not answering yet');
    return [];
  };
  Object.defineProperty(fn, 'calls', { get: () => calls });
  return fn;
}

/** Records the backoff waits without actually waiting. */
function fakeSleep() {
  const waits = [];
  const fn = async ms => { waits.push(ms); };
  fn.waits = waits;
  return fn;
}

describe('searchAvailable — answering', () => {
  beforeEach(() => resetSearchReadyProbe());

  it('returns true on the first successful probe, with no backoff', async () => {
    const probe = flakyProbe(0);
    const sleep = fakeSleep();
    assert.equal(await searchAvailable(probe, sleep), true);
    assert.equal(probe.calls, 1);
    assert.deepEqual(sleep.waits, [], 'a healthy database should not be made to wait');
  });
});

describe('searchAvailable — retrying past a cold start', () => {
  beforeEach(() => resetSearchReadyProbe());

  it('keeps trying and succeeds once search comes up', async () => {
    // The case the retry exists for: `mongot` is slower to start than the app. Failing immediately
    // would report the deployment as unsupported and leave recall silently empty.
    const probe = flakyProbe(3);
    const sleep = fakeSleep();
    assert.equal(await searchAvailable(probe, sleep), true);
    assert.equal(probe.calls, 4);
    assert.deepEqual(sleep.waits, [2000, 2000, 2000]);
  });

  it('gives up after six attempts and reports unavailable', async () => {
    const probe = flakyProbe(Infinity);
    const sleep = fakeSleep();
    assert.equal(await searchAvailable(probe, sleep), false);
    assert.equal(probe.calls, 6);
  });

  it('does not sleep after the final attempt', async () => {
    // Five waits for six attempts. A sixth would add two seconds of delay after the decision is
    // already made.
    const sleep = fakeSleep();
    await searchAvailable(flakyProbe(Infinity), sleep);
    assert.equal(sleep.waits.length, 5);
  });
});

describe('searchAvailable — the memoisation, which is the part with an incident behind it', () => {
  beforeEach(() => resetSearchReadyProbe());

  it('probes ONCE however many times it is called', async () => {
    // ensureVectorSearchIndex awaits this per collection per space. Without the cache a cold boot
    // paid the full backoff five times per space and delayed startup enough to break crash recovery.
    const probe = flakyProbe(0);
    const sleep = fakeSleep();
    await Promise.all([
      searchAvailable(probe, sleep),
      searchAvailable(probe, sleep),
      searchAvailable(probe, sleep),
    ]);
    assert.equal(probe.calls, 1, 'concurrent callers must share one probe');
  });

  it('caches a NEGATIVE answer too', async () => {
    // The expensive case. Re-probing after a failure would pay 12 seconds again per caller — the
    // exact cost the cache exists to avoid, on the path where it hurts most.
    const probe = flakyProbe(Infinity);
    const sleep = fakeSleep();
    assert.equal(await searchAvailable(probe, sleep), false);
    assert.equal(await searchAvailable(probe, sleep), false);
    assert.equal(probe.calls, 6, 'the second call must not re-probe');
  });

  it('resetSearchReadyProbe clears the cache, so a later call probes again', async () => {
    const probe = flakyProbe(0);
    const sleep = fakeSleep();
    await searchAvailable(probe, sleep);
    resetSearchReadyProbe();
    await searchAvailable(probe, sleep);
    assert.equal(probe.calls, 2);
  });
});
