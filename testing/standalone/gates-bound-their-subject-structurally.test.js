/**
 * A gate may not bound its subject with a magic number. Ratchet: the grandfathered list only shrinks.
 *
 * ## Why this exists, with the cost attached
 *
 * `src.slice(at, at + 3000)` decides in advance how much of its subject a gate can see. Grow the subject and the
 * window stops covering it, and the gate then either fails on correct code or passes while checking less than it
 * meant to. A character count also spans different LINES on CRLF than on LF, so a window that fits locally can
 * fall short in CI.
 *
 * Three of them failed in one session, 2026-08-19:
 *
 * - `index-ready-poll.test.js` at `at + 3000` — a new branch pushed its subject out.
 * - `rights-are-explained.test.js` capped a `<thead>` at 1 400 characters — a fifth column took it to 1 770.
 * - `rights-matrix.component.spec.ts` asserted a header count `toBe(4)`.
 *
 * **The last one is why the Space Admin column was reverted five releases earlier.** It had been built, it worked,
 * and it was thrown away because a count broke — which reads as *"the feature broke the tests"* rather than as
 * *"the test was written wrong"*. The owner had asked five times. His words: *"must be noob mistake what you are
 * doing, cant be real that one column creates such problems"*.
 *
 * ## Why a ratchet and not a sweep
 *
 * There are 26 of these, spread over 21 files. Rewriting them blind is how a gate quietly starts checking less than it did — each window
 * has a subject, and only someone reading it knows what the real bound is. So this refuses NEW ones and lets the
 * list shrink as they are converted, the same shape `no-new-god-files.test.js` uses for file size.
 *
 * ## What is deliberately NOT banned
 *
 * `slice(0, N)` for truncating a value inside a failure MESSAGE — 79 of those, and they are correct: a 400-line
 * JSON blob in an assertion message helps nobody. The banned shape is a window whose start is a FOUND POSITION and
 * whose end is that position plus a number, because only that shape claims to cover a subject.
 *
 * Run: node --test testing/standalone/gates-bound-their-subject-structurally.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { stripComments } from './_strip-comments.mjs';

/**
 * A window whose end is its start plus a constant: `slice(at, at + 400)`.
 *
 * Requires the SAME identifier on both sides, which is what distinguishes a window over a subject from an
 * unrelated pair of offsets — and keeps `slice(0, 300)` message truncation out of scope entirely.
 */
const MAGIC_WINDOW = /\.slice\(\s*([A-Za-z_$][\w$]*)\s*,\s*\1\s*\+\s*\d+\s*\)/g;

/*
 * NOT BANNED HERE, and the reason is the whole discipline of this file: `[\s\S]{0,N}` inside a pattern.
 *
 * A first draft banned it and found 30 sites. Reading them showed two different things wearing one syntax:
 *
 *   /<thead>([\s\S]{0,1400}?)<\/thead>/          a WINDOW between markers — the cap can only stop it short,
 *                                                and this is the one that failed on a fifth table column
 *   /if \(!x\) \{[\s\S]{0,220}?return false;/    an ADJACENCY bound — "these two must be near each other",
 *                                                which is a deliberate claim, not a guessed extent
 *
 * The second is legitimate and there are many of them. Banning both without reading all 30 would be exactly the
 * blind sweep this ratchet exists to avoid — a gate rewritten without understanding its subject is a gate that
 * quietly checks less. So this PR takes the unambiguous half, and the 30 are recorded in `QA-TODO.md` as an
 * unassessed population rather than as a number someone can wave through.
 */

const ROOTS = ['testing', join('client', 'src')];

function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { sources(p, out); continue; }
    if (/\.(test|spec)\.(js|mjs|ts)$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * Files still allowed to carry a magic window, with how many.
 *
 * **This list may only shrink.** Converting one means removing or lowering its entry; a file not listed may have
 * none at all. Counts rather than a bare filename, so a file with three cannot silently gain a fourth.
 */
const GRANDFATHERED = new Map([
  ['testing/standalone/backups-are-not-world-readable.test.js', 1],
  ['testing/standalone/changelog-entry-is-enforced.test.js', 2],
  ['testing/standalone/console-redaction-coverage.test.js', 1],
  ['testing/standalone/credential-bodies-are-strict.test.js', 1],
  ['testing/standalone/every-token-carries-a-rights-matrix.test.js', 2],
  ['testing/standalone/face-index-width-is-never-rebuilt.test.js', 1],
  ['testing/standalone/file-meta-merges-like-the-brain-tools.test.js', 1],
  ['testing/standalone/mcp-audit-coverage.test.js', 1],
  ['testing/standalone/meta-precondition.test.js', 1],
  ['testing/standalone/mint-accepts-rights-capped.test.js', 1],
  ['testing/standalone/mongo-connect-retry.test.js', 1],
  ['testing/standalone/no-runtime-model-egress.test.js', 1],
  ['testing/standalone/notice-coverage.test.js', 1],
  ['testing/standalone/space-admin-rung-is-named.test.js', 1],
  ['testing/standalone/ssrf-allow-private-coverage.test.js', 1],
  ['testing/standalone/sync-dropped-record-is-not-silent.test.js', 1],
  ['testing/standalone/text-contrast-meets-aa.test.js', 1],
  ['testing/standalone/toggle-state-is-announced.test.js', 2],
  ['testing/standalone/vlm-endpoint-egress.test.js', 1],
]);

/**
 * THIS FILE is excluded from its own scan.
 *
 * It contains the banned shape as a STRING, in the test that proves the pattern still matches — which is the one
 * assertion stopping this whole gate from silently passing on a regex that broke. A scan flagging its own fixture
 * would force that proof to be deleted.
 *
 * Two files are absent from the list on purpose, having been converted in this change:
 * `startup-index-wait.test.js` and `result-spill-suppresses-vectors.test.js`. They are the two whose subjects I
 * had just read, which is the only basis on which a conversion is safe.
 */
const SELF = 'gates-bound-their-subject-structurally.test.js';

const found = new Map();
for (const root of ROOTS) {
  for (const file of sources(root)) {
    // Split on the platform separator and rejoin with `/`, so the keys read the same on Windows and in CI. A
    // grandfathered entry that only matched on one platform would be an allowance nobody could see.
    const key = file.split(sep).join('/');
    if (key.endsWith(SELF)) continue;
    const code = stripComments(readFileSync(file, 'utf8'));
    const n = [...code.matchAll(MAGIC_WINDOW)].length;
    if (n > 0) found.set(key, n);
  }
}

describe('the scan works before anything is concluded from it', () => {
  it('walked a real tree', () => {
    // A scan that matched nothing would report every rule below as satisfied.
    const files = ROOTS.flatMap(r => sources(r));
    assert.ok(files.length >= 100, `only found ${files.length} test files — the walk is broken`);
  });

  it('the pattern still matches the shape it is about', () => {
    // Proven against a literal, so a regex that silently stopped matching cannot pass as "none left".
    const sample = 'const body = src.slice(at, at + 1600);';
    assert.equal([...sample.matchAll(MAGIC_WINDOW)].length, 1, 'MAGIC_WINDOW no longer matches a magic window');
    // And does NOT match the two shapes that are fine.
    for (const ok of ['JSON.stringify(b).slice(0, 300)', 'src.slice(start, end)', 'x.slice(a, b + 4)']) {
      assert.equal([...ok.matchAll(MAGIC_WINDOW)].length, 0, `false positive on: ${ok}`);
    }
  });
});

describe('no NEW magic window', () => {
  it('every file carrying one is grandfathered, and none has more than its entry', () => {
    const problems = [];
    for (const [file, n] of found) {
      const allowed = GRANDFATHERED.get(file) ?? 0;
      if (n > allowed) {
        problems.push(`${file}: ${n} magic window(s), allowed ${allowed}`);
      }
    }
    assert.deepEqual(problems, [],
      'a gate bounds its subject with a character count. Use `_structural-window.mjs` — `bodyOf`, `between`, or\n'
      + '`bodyOfEndingWith` — which bound by the next top-level declaration or by the closing marker. A window that\n'
      + 'can fall short of its subject is a gate that can pass while checking less than it means to.\n'
      + problems.join('\n'));
  });

  it('the list only shrinks — an entry that is no longer needed must be removed', () => {
    /*
     * The other half of a ratchet. Without this the list is a place numbers go up: someone converts a window,
     * leaves the entry, and the slot stays open for the next one. `no-new-god-files` reports slack as a note; here
     * it is a failure, because unlike a file size these go to zero and stay there.
     */
    const stale = [];
    for (const [file, allowed] of GRANDFATHERED) {
      const actual = found.get(file) ?? 0;
      if (actual < allowed) stale.push(`${file}: allowed ${allowed}, now has ${actual} — lower or remove it`);
    }
    assert.deepEqual(stale, [], 'the grandfathered list is above reality:\n' + stale.join('\n'));
  });

  it('the total only goes down', () => {
    /*
     * A single number, so the direction of travel is visible without diffing a map. It is the sum of the list
     * above, and the point of stating it separately is that a reviewer can see at a glance whether a change moved
     * the debt or merely shuffled it between files.
     */
    const total = [...found.values()].reduce((a, b) => a + b, 0);
    const allowed = [...GRANDFATHERED.values()].reduce((a, b) => a + b, 0);
    assert.ok(total <= allowed,
      `${total} magic windows across the suite, and the list allows ${allowed}. It may only go down.`);
  });
});
