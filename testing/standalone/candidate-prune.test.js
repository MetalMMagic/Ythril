/**
 * Which review findings may be deleted — the decision, isolated from the plumbing.
 *
 * This is the branch worth testing exhaustively, because getting it wrong does not error: it silently
 * deletes a decision a person made. A finding is a claim about two records, and the naive retention policy
 * ("delete settled findings older than N days") would forget dismissals — the exact thing the sticky-
 * dismissal machinery exists to preserve. Age is the wrong axis; **can this ever resurface** is the right
 * one.
 *
 * Run: node --test testing/standalone/candidate-prune.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let decideCandidatePrune;
const row = (over = {}) => ({ status: 'open', aId: 'a', bId: 'b', ...over });

describe('candidate prune — a human decision is never deleted', () => {
  before(async () => {
    ({ decideCandidatePrune } = await import('../../server/dist/brain/candidate-prune.js'));
  });

  it('keeps a dismissal while both records still exist', () => {
    // The whole point of sticky dismissal: forgetting this re-flags the pair on the next sweep, which is
    // how a queue teaches people to stop reading it.
    assert.equal(decideCandidatePrune(row({ status: 'dismissed' }), true, true), 'keep');
  });

  it('keeps a resolution that could still be re-detected', () => {
    // The records still exist and still look contradictory on the surface — only the stored resolution
    // says otherwise.
    assert.equal(decideCandidatePrune(row({ status: 'resolved', resolution: 'edited' }), true, true), 'keep');
    assert.equal(decideCandidatePrune(row({ status: 'resolved', resolution: 'linked' }), true, true), 'keep');
    assert.equal(decideCandidatePrune(row({ status: 'resolved', resolution: 'notified' }), true, true), 'keep');
  });

  it('keeps an open finding — that is the queue', () => {
    assert.equal(decideCandidatePrune(row(), true, true), 'keep');
  });
});

describe('candidate prune — what can never come back', () => {
  before(async () => {
    ({ decideCandidatePrune } = await import('../../server/dist/brain/candidate-prune.js'));
  });

  it('prunes a merged pair — the absorbed record is gone, so it cannot re-detect', () => {
    assert.equal(decideCandidatePrune(row({ status: 'resolved', resolution: 'merged' }), true, true), 'prune-merged');
  });

  it('prunes a finding whose record was deleted, whatever its status', () => {
    // Unopenable: the Review tab lists it and clicking through leads nowhere.
    for (const status of ['open', 'dismissed', 'resolved']) {
      assert.equal(decideCandidatePrune(row({ status }), false, true), 'prune-orphan', `${status} / A gone`);
      assert.equal(decideCandidatePrune(row({ status }), true, false), 'prune-orphan', `${status} / B gone`);
    }
  });

  it('drops a dismissal only once its pair can no longer be re-detected', () => {
    // Not a contradiction of the rule above: a dismissal protects against re-flagging, and a pair whose
    // record is gone can never be flagged again. Nothing is lost.
    assert.equal(decideCandidatePrune(row({ status: 'dismissed' }), true, true), 'keep');
    assert.equal(decideCandidatePrune(row({ status: 'dismissed' }), false, false), 'prune-orphan');
  });

  it('treats a row with no record ids as an orphan rather than keeping it forever', () => {
    assert.equal(decideCandidatePrune({ status: 'open' }, false, false), 'prune-orphan');
  });
});

describe('candidate prune — merged wins over orphaned, and both are reported', () => {
  before(async () => {
    ({ decideCandidatePrune } = await import('../../server/dist/brain/candidate-prune.js'));
  });

  it('reports a merged pair as merged even though its record is also gone', () => {
    // A merge deletes the absorbed record, so every merged row is ALSO an orphan. The more specific reason
    // is the useful one in the log line.
    assert.equal(decideCandidatePrune(row({ status: 'resolved', resolution: 'merged' }), true, false), 'prune-merged');
  });
});
