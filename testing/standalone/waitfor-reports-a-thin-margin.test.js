/**
 * A wait that only just passed says so, so a timeout can be decided from evidence.
 *
 * ## What happened
 *
 * `Subscriber-local content survives publisher tombstone` timed out in CI at its 25 s budget — on a diff of
 * client CSS, docs and a changelog, none of which can touch sync propagation. It passed on rerun with no code
 * change.
 *
 * The tempting move is to raise the 25 s. It is also a guess, and the two things it could be are different
 * problems:
 *
 *   - a green run genuinely takes ~20 s, the margin is thin, and a bigger budget is the fix; or
 *   - a green run takes ~3 s and something occasionally **stalls**, in which case the deadline is only how we
 *     found out, and raising it hides the stall until it is longer than the new number too.
 *
 * Nothing recorded how long a passing wait took, so nobody could tell which. That was the missing measurement,
 * and it was missing for every wait in the suite rather than just the one that went red.
 *
 * ## Why a warning and not a failure
 *
 * A slow pass failing the build would make CI stricter than the product, and propagation time legitimately
 * varies with what else the runner is doing. The point is to make the margin visible while it is still a margin.
 *
 * Run: node --test testing/standalone/waitfor-reports-a-thin-margin.test.js
 */
import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let waitFor;
before(async () => {
  ({ waitFor } = await import('../../testing/sync/helpers.js'));
});

/** Capture console.warn for one call. */
async function warnsDuring(fn) {
  const lines = [];
  const original = console.warn;
  console.warn = (...args) => lines.push(args.join(' '));
  try { await fn(); } finally { console.warn = original; }
  return lines;
}

describe('a comfortable pass is quiet', () => {
  it('says nothing when the condition is true immediately', async () => {
    const lines = await warnsDuring(() => waitFor(() => true, 1_000, 10));
    assert.deepEqual(lines, [], 'a wait that returned at once must not warn — that is noise on every test');
  });

  it('still returns true, so no caller changes', async () => {
    // The return value is load-bearing: several waits are used as `assert.ok(await waitFor(...))`. Returning
    // the elapsed time instead would make a wait that succeeded on its first poll return 0 — falsy — and
    // silently invert those assertions.
    assert.equal(await waitFor(() => true, 1_000, 10), true);
  });
});

describe('a thin pass reports the numbers', () => {
  it('warns when the wait consumed most of its budget', async () => {
    // 120ms budget, condition true after ~100ms: past the 60% mark.
    const start = Date.now();
    const lines = await warnsDuring(() => waitFor(() => Date.now() - start > 100, 160, 10));
    assert.equal(lines.length, 1, `expected one warning, got ${lines.length}`);
    assert.match(lines[0], /passed after \d+ms of a 160ms budget/,
      'the message must carry BOTH numbers — a percentage alone cannot be compared across different budgets');
    assert.match(lines[0], /\d+%/);
  });

  it('the warning says what to do with it', async () => {
    // A warning that only reports is a warning people learn to scroll past. This one has to distinguish the
    // two diagnoses, because picking the wrong one is how a stall gets hidden behind a bigger number.
    const start = Date.now();
    const lines = await warnsDuring(() => waitFor(() => Date.now() - start > 100, 160, 10));
    assert.match(lines[0], /stall/i, 'the message must name the alternative to "just raise it"');
  });
});

describe('the timeout path is unchanged', () => {
  it('still throws with the budget and the diagnosis', async () => {
    await assert.rejects(
      () => waitFor(() => false, 60, 10, 'the subscriber never saw it'),
      /waitFor timed out after 60ms — the subscriber never saw it/,
    );
  });

  it('a timeout does NOT also warn about a thin margin', async () => {
    // It failed; a note that it was close would be absurd and would bury the real error.
    const lines = await warnsDuring(async () => {
      await waitFor(() => false, 60, 10).catch(() => {});
    });
    assert.deepEqual(lines, []);
  });
});

describe('the threshold is a named constant, not a number in an expression', () => {
  it('is stated once and explained', () => {
    const src = readFileSync('testing/sync/helpers.js', 'utf8');
    assert.match(src, /const TIGHT_MARGIN = 0\.6/,
      'a bare 0.6 inside the comparison is a number nobody can find when they want to tune it');
  });
});
