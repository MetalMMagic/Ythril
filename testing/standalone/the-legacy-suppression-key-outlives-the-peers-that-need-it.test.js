/**
 * The legacy `excludeFromVectorSearch` key may only be removed once the peer floor is at or above 3.1.0.
 *
 * ## The dependency this makes structural
 *
 * `_DEPRECATIONS.md` row 1.8 retires the pre-3.1.0 spelling of the per-record never-embed mark. It cannot
 * go while any peer on the network can still be running a build that does not know the current spelling:
 * such a peer strips the mark on ingest, and its copy of the record then replicates onward carrying no
 * suppression at all. Content an author marked never-embed reaches an embedding model and re-enters ranked
 * search, on every instance, with nothing reporting it.
 *
 * 3.1.0 is the release that started writing `suppressEmbeddings`, so "no peer below 3.1.0" is exactly the
 * condition. `P-33` was ruled **B** on that basis — declare and enforce a floor — and `N-1` built it.
 *
 * ## Why a gate and not a note, and what it caught immediately
 *
 * `N-1` was recorded as unblocking `D-6`. It built the MECHANISM, and the mechanism's VALUE is derived
 * from the running major: on a 3.4.0 build the floor is 3.0.0, which admits a 3.0.x peer — and 3.0.x is
 * pre-3.1.0. So the tracker said unblocked and a build from this tree would still have admitted the exact
 * peer row 1.8 is about.
 *
 * The floor reaches 4.0.0 at the version bump, which is `R-1`. **So `D-6` depends on the bump, not on
 * `N-1`** — and this file is what says so in a way that cannot be forgotten: remove the key while the floor
 * is below 3.1.0 and it fails.
 *
 * ## The shape of the assertion
 *
 * A conditional, deliberately. It does not demand the key be present or absent — that is `D-6`'s decision
 * and the release's timing. It says the two facts must be consistent: **if the key is gone, the floor must
 * be high enough that its absence is safe.** So it passes today with the key present, passes after 4.0
 * with the key gone, and fails on exactly the combination that loses data quietly.
 *
 * Run: node --test testing/standalone/the-legacy-suppression-key-outlives-the-peers-that-need-it.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

/** The release that started writing the current spelling of the mark. */
const SPELLING_SHIPPED_IN = '3.1.0';

/** The one place the stored key is read back, and the one place it is written beside the new one. */
const READER = 'server/src/brain/suppress-embeddings.ts';
const code = (f) => stripComments(readFileSync(f, 'utf8'));

describe('the legacy suppression key and the peer floor stay consistent', () => {
  it('the floor is a real version, and the comparison works', async () => {
    /*
     * The vacuity guard. If the floor stopped being comparable — renamed, or answering something a
     * comparator cannot read — the conditional below would decide on nonsense and report a pass.
     */
    const { MIN_PEER_VERSION, comparePeerVersions } = await import('../../server/dist/sync/peer-floor.js');
    assert.match(MIN_PEER_VERSION, /^\d+\.\d+\.\d+$/,
      `the floor is ${JSON.stringify(MIN_PEER_VERSION)}, which is not a version`);
    assert.ok(comparePeerVersions('3.1.0', '3.0.0') > 0, 'the comparator is not ordering versions');
  });

  it('and the stored key is still readable, or this gate has no subject', () => {
    // Also a vacuity guard: if `suppress-embeddings.ts` stopped being the place the mark is resolved, the
    // presence check below would answer about a file that no longer decides anything.
    assert.match(code(READER), /suppressEmbeddings/,
      'the suppression reader no longer mentions the current spelling — re-point this gate');
  });

  it('THE RULE: the key may only be gone once the floor clears 3.1.0', async () => {
    const { MIN_PEER_VERSION, comparePeerVersions } = await import('../../server/dist/sync/peer-floor.js');
    const keyPresent = code(READER).includes('excludeFromVectorSearch');
    const floorClears = comparePeerVersions(MIN_PEER_VERSION, SPELLING_SHIPPED_IN) >= 0;

    assert.ok(keyPresent || floorClears,
      `the legacy suppression key has been removed while the peer floor is ${MIN_PEER_VERSION}, which `
      + `admits a peer below ${SPELLING_SHIPPED_IN}. Such a peer does not know the current spelling, strips `
      + 'the mark on ingest, and replicates its unsuppressed copy back — so a record an author marked '
      + 'never-embed is sent to an embedding model and returns to ranked search, silently. Either restore '
      + 'the key or raise the floor; the floor is this instance\'s own major, so it clears at 4.0.0.');
  });

  it('and the floor answers the question row 1.8 actually asks', async () => {
    /*
     * Stated as a probe rather than as arithmetic, because the interesting version is a REAL peer's, and
     * `3.0.4` is the shape that made the original derivation wrong: a 3.0.0 floor permits a 3.0.x peer,
     * and a 3.0.x peer IS pre-3.1.0. That confusion — the upgrade floor read as the peer floor — is what
     * `_DEPRECATIONS.md` corrected on 2026-09-04.
     */
    const { peerFloorRefusal, comparePeerVersions, MIN_PEER_VERSION } =
      await import('../../server/dist/sync/peer-floor.js');
    const stamped = '2026-09-05T00:00:00.000Z';
    const admitsStripper = peerFloorRefusal('3.0.4', stamped) === null;
    assert.equal(admitsStripper, comparePeerVersions(MIN_PEER_VERSION, SPELLING_SHIPPED_IN) < 0,
      'the floor and the refusal disagree about whether a 3.0.4 peer may sync — one of them is not being '
      + 'derived from MIN_PEER_VERSION');
  });
});
