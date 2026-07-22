/**
 * Which jobs count as stalled — the rule, evaluated against real documents.
 *
 * `stalledJobTimeoutMs` used to be a wall-clock deadline measured from `claimedAt`, which cannot tell
 * "wedged" from "slow". A 400-page PDF transcribed a page at a time was requeued mid-flight for
 * taking a while, re-claimed, and killed again at the same page — not a lost job but an infinite
 * loop that burns the model budget and never finishes, while the file sits at `pending` looking like
 * it is still being worked on. Jobs now carry `progressAt`, advanced as each page lands.
 *
 * SCOPE, stated plainly: this imports the real `stalledJobFilter` and evaluates it against document
 * fixtures with a minimal matcher. It checks the RULE — which of three cases a job falls into — not
 * that MongoDB agrees with the matcher. A database-level test is not possible from here: the test
 * stack does not publish a Mongo port to the host and no standalone test connects to one. That gap
 * is real and tracked; it is not a reason to leave the rule unchecked, since the case that actually
 * bites (a job with no `progressAt` at all, claimed by a build older than the heartbeat) is a
 * branch-coverage question rather than a query-semantics one.
 *
 * Run: node --test testing/standalone/job-stall-rule.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let stalledJobFilter;

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

/** Just enough Mongo to evaluate this filter: $or, $lt, $exists, and equality. */
function matches(filter, doc) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some(sub => matches(sub, doc));
    const value = doc[key];
    if (cond !== null && typeof cond === 'object') {
      return Object.entries(cond).every(([op, operand]) => {
        if (op === '$lt') return value !== undefined && value !== null && value < operand;
        if (op === '$exists') return (value !== undefined) === operand;
        throw new Error(`unsupported operator in test matcher: ${op}`);
      });
    }
    return value === cond;
  });
}

const CUTOFF = iso(300_000); // a five-minute timeout

describe('stalled-job rule', () => {
  before(async () => {
    ({ stalledJobFilter } = await import('../../server/dist/files/media/job-queue.js'));
  });

  it('leaves a job that is still making progress, however long it has been claimed', () => {
    // The whole point: claimed ten minutes ago, but it ticked one second ago.
    const job = { status: 'processing', claimedAt: iso(600_000), progressAt: iso(1_000) };
    assert.equal(matches(stalledJobFilter(CUTOFF), job), false);
  });

  it('recovers a job that has stopped making progress', () => {
    const job = { status: 'processing', claimedAt: iso(600_000), progressAt: iso(600_000) };
    assert.equal(matches(stalledJobFilter(CUTOFF), job), true);
  });

  it('recovers a job claimed before the heartbeat existed (no progressAt at all)', () => {
    // Upgrade path. Miss this and those jobs become immortal — never progressing, never recovered.
    const job = { status: 'processing', claimedAt: iso(600_000) };
    assert.equal(matches(stalledJobFilter(CUTOFF), job), true);
  });

  it('recovers a pre-heartbeat job whose progressAt is explicitly null', () => {
    const job = { status: 'processing', claimedAt: iso(600_000), progressAt: null };
    assert.equal(matches(stalledJobFilter(CUTOFF), job), true);
  });

  it('leaves a freshly claimed pre-heartbeat job alone', () => {
    const job = { status: 'processing', claimedAt: iso(1_000) };
    assert.equal(matches(stalledJobFilter(CUTOFF), job), false);
  });

  it('only ever considers processing jobs', () => {
    for (const status of ['pending', 'complete', 'failed']) {
      const job = { status, claimedAt: iso(600_000), progressAt: iso(600_000) };
      assert.equal(matches(stalledJobFilter(CUTOFF), job), false, `${status} must not be recovered`);
    }
  });

  it('a job that ticked exactly at the cutoff is not yet stalled', () => {
    // Boundary: `$lt`, not `$lte` — equality must not reap.
    const job = { status: 'processing', claimedAt: iso(600_000), progressAt: CUTOFF };
    assert.equal(matches(stalledJobFilter(CUTOFF), job), false);
  });
});
