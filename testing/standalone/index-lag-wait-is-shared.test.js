/**
 * One index-lag poll, with one measured deadline.
 *
 * ## The failure this exists for
 *
 * The Atlas Local vector index is eventually consistent, and the lag has been observed at up to **150 s** on the
 * CI runner. Four integration files had each grown their own copy of "poll recall until these ids appear", every
 * one with a **30 s** deadline that had never been measured against anything. When the lag exceeded it the poll
 * threw from a `before` hook, which cancels every test in that suite and reads exactly like a real regression:
 *
 *     not ok 129 - Recall filter — tags in (any-of)
 *       failureType: 'hookFailed'
 *       error: 'Timed out waiting for indexing of: 527a9f04-…'
 *
 * That failed CI four separate times, on four different tests, and each occurrence was individually dismissible
 * as a flake. It is not a flake: it is a deadline shorter than the thing it waits for.
 *
 * ## Why a gate and not just a fix
 *
 * The four copies had already drifted in a way that matters: three matched `result._id` and one matched
 * `result.record?._id ?? result._id`. A copy that guesses the wrong shape matches nothing and times out in full,
 * so the drift was invisible until it wasn't. Consolidating without a gate just resets the clock on the next
 * copy — and the next copy will be written by whoever adds the fifth suite that needs to wait for the index.
 *
 * Run: node --test testing/standalone/index-lag-wait-is-shared.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Test files, from git rather than the filesystem — gitignored scratch must not count as repo content. */
function testFiles() {
  return execFileSync('git', ['ls-files', 'testing'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
}

const HELPERS = 'testing/sync/helpers.js';

describe('the vector-index wait is shared, and its deadline is the measured one', () => {
  it('helpers.js owns the poll and names the deadline as a constant', () => {
    const src = readFileSync(join(ROOT, HELPERS), 'utf8');
    assert.match(src, /export async function waitForIndexed\(/,
      'the shared poll must live in helpers.js, where every integration file already imports from');
    assert.match(src, /export const INDEX_LAG_TIMEOUT_MS = /,
      'the deadline must be a named constant, not a magic number repeated per call site');
  });

  it('the deadline comfortably exceeds the worst observed lag', () => {
    const src = readFileSync(join(ROOT, HELPERS), 'utf8');
    const ms = Number(/INDEX_LAG_TIMEOUT_MS = ([0-9_]+)/.exec(src)?.[1]?.replaceAll('_', ''));
    assert.ok(Number.isFinite(ms), 'could not read INDEX_LAG_TIMEOUT_MS');
    // 150 s observed. A margin, not a coin flip: the poll returns the moment the index catches up, so a larger
    // number costs nothing on a healthy runner and a smaller one buys nothing but earlier failure on a slow one.
    assert.ok(ms >= 240_000,
      `the index-lag deadline is ${ms}ms, but the lag has been measured at 150s — this is the bug, not a tuning knob`);
  });

  it('accepts both result shapes, because the old copies disagreed', () => {
    const src = readFileSync(join(ROOT, HELPERS), 'utf8');
    assert.match(src, /result\.record\?\._id \?\? result\._id/,
      'a poll that matches only one of the two recall result shapes never matches and always times out');
  });

  it('no test file re-implements the poll', () => {
    // Matched on the SHAPE (a bounded loop that polls recall for ids), not on the name `waitForIndexed` — a fifth
    // copy will be called something else. The two markers together are what a re-implementation cannot avoid:
    // it has to post to a recall route and it has to loop with its own deadline.
    const files = testFiles();
    // Floor the enumeration. Without this the check passes while examining nothing — `git ls-files` returning
    // an empty list (wrong cwd, a partial checkout) would read as a clean tree. This gate shipped in #710
    // without it and satisfied `gates-cannot-pass-vacuously` only by accident: that meta-gate accepted an
    // unrelated `assert.ok(ms >= 240_000)` as the floor, which is a floor on a timeout constant, not on the
    // walk. Both are fixed here.
    assert.ok(files.length >= 40, `only enumerated ${files.length} test files`);
    const offenders = [];
    for (const f of files) {
      if (f === HELPERS) continue;
      const src = readFileSync(join(ROOT, f), 'utf8');
      const pollsRecall = /['"`][^'"`\n]*\/recall['"`]|`[^`\n]*\/recall`/.test(src);
      const hasOwnDeadline = /Date\.now\(\)\s*\+\s*timeoutMs|deadline\s*=\s*Date\.now\(\)/.test(src);
      const waitsForIds = /pending\s*=\s*new Set\(/.test(src);
      if (pollsRecall && hasOwnDeadline && waitsForIds) offenders.push(f);
    }
    assert.deepEqual(offenders, [],
      'these files poll a recall route on their own deadline waiting for ids to appear — import waitForIndexed '
      + `from ${HELPERS} instead, or the next index-lag stall fails a suite from a before hook again`);
  });
});
