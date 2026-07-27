/**
 * How hard the contradiction sweep is allowed to look, and how much it may spend doing it.
 *
 * Two decisions are pinned here, both of which were wrong in the shipped version:
 *
 *  1. **The similarity floor was inherited from duplicate detection (0.92).** That answers "are these the
 *     same record?", which is not this question — records can contradict without being near-identical.
 *
 *     Mind the SCALE when tuning it. These are not raw cosine: `$vectorSearch` normalises cosine to
 *     `(1 + cos) / 2`, measured directly here — a chrono pair with raw cosine 0.8957 came back from the
 *     search as 0.9479. So 0.92 ⇒ cosine 0.84 and 0.85 ⇒ cosine 0.70, while an innocent-looking 0.70 would
 *     mean cosine 0.40 and drag in a great deal of barely-related text.
 *
 *  2. **The NLI pass was treated as expensive because it calls a model.** It is an MNLI encoder: one
 *     forward pass, three labels, no generation. On a loopback sidecar that is not expensive. What is
 *     genuinely costly is a REMOTE judge — every judged pair is record text leaving the instance, and that
 *     cost does not shrink with a faster model. So the conservative defaults key on WHERE the judge runs,
 *     not on which pass is running.
 *
 * The numbers themselves are reasoned rather than measured — no NLI sidecar ships with the stack, so there
 * was nothing to time against. That is exactly why every one of them is configurable, and why these tests
 * pin the RELATIONSHIPS (local ≤ remote, explicit beats default) rather than blessing specific constants.
 *
 * Run: node --test testing/standalone/contradiction-tuning.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let scanTuning;

describe('scan tuning — the similarity floor is not the duplicate threshold', () => {
  before(async () => {
    ({ scanTuning } = await import('../../server/dist/brain/contradiction-scanner.js'));
  });

  it('leaves the default floor alone, because loosening it could not be justified empirically', () => {
    // These are NOT raw cosine: $vectorSearch normalises to (1 + cos) / 2. Measured — a pair with raw
    // cosine 0.8957 came back as 0.9479. So 0.92 ⇒ cosine 0.84 and a plausible-looking 0.70 ⇒ cosine 0.40.
    //
    // Two attempts to construct a genuinely-contradicting pair BELOW 0.92 both failed (0.9479, 0.9259):
    // records sharing a subject embed close together even when their descriptions diverge sharply. With no
    // reproducible miss, changing the default for every instance is not warranted — tuning it is.
    assert.equal(scanTuning(undefined, true).structuredThreshold, 0.92);
  });

  it('costs nothing extra to widen the structured net, so it does not depend on the judge', () => {
    // The structured pass reaches no endpoint at all — its floor has no reason to care where NLI lives.
    assert.equal(scanTuning(undefined, true).structuredThreshold, scanTuning(undefined, false).structuredThreshold);
  });
});

describe('scan tuning — the conservative defaults key on WHERE the judge runs', () => {
  before(async () => {
    ({ scanTuning } = await import('../../server/dist/brain/contradiction-scanner.js'));
  });

  it('bounds a remote judge by pair count, and leaves a local one unbounded', () => {
    // This is the part of the local/remote split that IS justified: a loopback forward pass sends nothing
    // anywhere, while every remote judgement is record text leaving the instance — a cost no faster model
    // reduces. Unlike the similarity floor, this needs no empirical case; it follows from what egress is.
    assert.equal(scanTuning(undefined, true).maxJudgedPairs, 0, '0 means unlimited');
    assert.ok(scanTuning(undefined, false).maxJudgedPairs > 0);
  });

  it('never lets the remote floor be looser than the local one', () => {
    const local = scanTuning(undefined, true);
    const remote = scanTuning(undefined, false);
    assert.ok(remote.nliThreshold >= local.nliThreshold);
  });
});

describe('scan tuning — explicit config always wins', () => {
  before(async () => {
    ({ scanTuning } = await import('../../server/dist/brain/contradiction-scanner.js'));
  });

  it('honours operator thresholds over either default', () => {
    const t = scanTuning({ structuredThreshold: 0.55, nliThreshold: 0.8 }, false);
    assert.equal(t.structuredThreshold, 0.55);
    assert.equal(t.nliThreshold, 0.8);
  });

  it('lets an operator lift the remote budget, including to unlimited', () => {
    assert.equal(scanTuning({ maxJudgedPairsPerRun: 0 }, false).maxJudgedPairs, 0);
    assert.equal(scanTuning({ maxJudgedPairsPerRun: 50 }, false).maxJudgedPairs, 50);
  });

  it('clamps thresholds into [0,1] rather than trusting a typo', () => {
    // A cosine floor of 92 (meaning 0.92) would silently match nothing at all, forever.
    assert.equal(scanTuning({ structuredThreshold: 92 }, true).structuredThreshold, 1);
    assert.equal(scanTuning({ nliThreshold: -3 }, true).nliThreshold, 0);
  });

  it('clamps batch and per-run sizes to sane bounds', () => {
    assert.equal(scanTuning({ batchSize: 0 }, true).batchSize, 1);
    assert.equal(scanTuning({ batchSize: 99999 }, true).batchSize, 1000);
    assert.equal(scanTuning({ maxPerRun: 0 }, true).maxPerRun, 1);
  });

  it('ignores a negative budget rather than treating it as unlimited', () => {
    // -1 must not read as "no cap" on a remote endpoint, which is the expensive direction to get wrong.
    assert.ok(scanTuning({ maxJudgedPairsPerRun: -1 }, false).maxJudgedPairs > 0);
  });
});
