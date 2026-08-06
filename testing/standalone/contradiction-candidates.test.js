/**
 * Standalone tests for the contradiction-candidate decision (F-REVIEW slice 3b).
 *
 * `decideCandidateAction` is pure — what a verdict MEANS for the stored row, with no database in the way.
 * That split follows the precedent `decideDismissed` set in the dupe scanner ("Pure (no DB) so it is
 * exhaustively unit-testable"), and it is why these cases can be enumerated rather than sampled.
 *
 * The properties worth pinning are the ones that decide whether a review queue can be trusted:
 *
 *  1. **An `unjudged` verdict writes NOTHING.** Not a row marked unjudged, not a clean row. Every status
 *     query filters on open/dismissed/resolved, so a row that is none of those either hides the pair
 *     forever or reads as reviewed-and-fine. The pair must stay unsettled and be re-examined later. This
 *     is the difference between "the judge was down" and "there is nothing wrong here".
 *  2. **`agree` retracts a stale OPEN finding** — a disagreement since fixed must leave the reviewer's
 *     list — but never touches a dismissed or resolved row, which are human decisions.
 *  3. **A dismissed pair follows the duplicates policy**, via the same `decideDismissed`, not a copy.
 *  4. **A human `resolved` is never silently re-opened** by a later scan.
 *
 * Run: node --test testing/standalone/contradiction-candidates.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let decideCandidateAction, contradictionPairId, fieldsInStoredOrder;

const CONTRA = { kind: 'contradiction', basis: 'structured-field', confidence: 1, fields: [{ key: 'port', aValue: 1, bValue: 2 }] };
const NLI = { kind: 'contradiction', basis: 'nli', confidence: 0.91 };
const AGREE = { kind: 'agree', basis: 'nli', confidence: 0.9 };
const UNJUDGED = { kind: 'unjudged', reason: 'judge-unavailable' };
const row = (status) => ({ status });

describe('contradiction candidates — the decision', () => {
  before(async () => {
    ({ decideCandidateAction, contradictionPairId, fieldsInStoredOrder } =
      await import('../../server/dist/brain/contradiction-candidates.js'));
  });

  it('gives a pair one identity regardless of argument order', () => {
    assert.equal(contradictionPairId('b', 'a'), contradictionPairId('a', 'b'));
    assert.equal(contradictionPairId('a', 'b'), 'a:b', 'lexicographically ordered');
  });

  describe('unjudged is not a finding and not a clearance', () => {
    it('writes nothing, whatever the stored row is', () => {
      for (const existing of [null, row('open'), row('dismissed'), row('resolved')]) {
        const a = decideCandidateAction(existing, UNJUDGED, null);
        assert.equal(a.do, 'nothing', 'an outage must never be persisted as a review');
        assert.equal(a.outcome, 'skipped-unjudged');
      }
    });
  });

  describe('agree', () => {
    it('retracts a stale OPEN finding', () => {
      assert.equal(decideCandidateAction(row('open'), AGREE, null).do, 'delete');
    });

    it('leaves a dismissed or resolved row alone — those are human decisions', () => {
      assert.equal(decideCandidateAction(row('dismissed'), AGREE, 'keep').do, 'nothing');
      assert.equal(decideCandidateAction(row('resolved'), AGREE, null).do, 'nothing');
    });

    it('writes nothing when there was no row to begin with', () => {
      assert.equal(decideCandidateAction(null, AGREE, null).do, 'nothing');
    });
  });

  describe('contradiction', () => {
    it('inserts when the pair is new', () => {
      const a = decideCandidateAction(null, CONTRA, null);
      assert.equal(a.do, 'insert');
      assert.equal(a.outcome, 'created');
    });

    it('refreshes the evidence on an already-open pair', () => {
      assert.equal(decideCandidateAction(row('open'), NLI, null).do, 'update');
    });

    it('never silently re-opens what a human resolved', () => {
      const a = decideCandidateAction(row('resolved'), CONTRA, null);
      assert.equal(a.do, 'update', 'evidence may refresh…');
      assert.notEqual(a.do, 'reopen', '…but a resolution is a decision, not a suggestion');
    });

    describe('a dismissed pair follows the duplicates sticky policy', () => {
      it('keep → stays dismissed, no write', () => {
        assert.equal(decideCandidateAction(row('dismissed'), CONTRA, 'keep').do, 'keep');
      });
      it('refresh → stays dismissed, fingerprint back-filled', () => {
        const a = decideCandidateAction(row('dismissed'), CONTRA, 'refresh');
        assert.equal(a.do, 'refresh-dismissed');
        assert.equal(a.outcome, 'kept-dismissed', 'a refresh is not a new finding');
      });
      it('reopen → back onto the review list', () => {
        const a = decideCandidateAction(row('dismissed'), CONTRA, 'reopen');
        assert.equal(a.do, 'reopen');
        assert.equal(a.outcome, 'reopened');
      });
    });
  });

  /**
   * The evidence must describe the side it is stored against.
   *
   * A verdict names values by ARGUMENT position (`aValue` = first argument), a row names sides by ID order
   * (`aId` = lower id). Whichever way the scanner met the pair decided which of those two orders applied, so
   * half of all structured findings stored each value against the other record — a real disagreement,
   * described backwards. Nothing throws when that happens, which is exactly why it needs a test.
   */
  describe('a structured finding attributes each value to the right record', () => {
    const fields = [{ key: 'port', aValue: 8080, bValue: 443 }, { key: 'env', aValue: 'prod', bValue: 'staging' }];

    it('passes fields through untouched when the sides are already in id order', () => {
      assert.deepEqual(fieldsInStoredOrder(fields, false), fields);
    });

    it('mirrors every field when the sides were swapped into id order', () => {
      assert.deepEqual(fieldsInStoredOrder(fields, true), [
        { key: 'port', aValue: 443, bValue: 8080 },
        { key: 'env', aValue: 'staging', bValue: 'prod' },
      ]);
    });

    it('keeps the key with its own pair of values — not a wholesale reverse of the list', () => {
      // A plausible near-miss fix: reversing the array instead of each entry. It looks right on a
      // single-field finding, which is the common case, and silently mislabels every multi-field one.
      assert.deepEqual(fieldsInStoredOrder(fields, true).map(f => f.key), ['port', 'env']);
    });

    it('does not mutate the verdict it was given', () => {
      const original = JSON.parse(JSON.stringify(fields));
      fieldsInStoredOrder(fields, true);
      assert.deepEqual(fields, original, 'the verdict is reused by the caller; mirroring must copy');
    });

    it('mirroring twice returns the original', () => {
      assert.deepEqual(fieldsInStoredOrder(fieldsInStoredOrder(fields, true), true), fields);
    });
  });
});
