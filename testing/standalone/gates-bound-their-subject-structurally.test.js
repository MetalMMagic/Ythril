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
/**
 * A forward window: `src.slice(at, at + 1600)`, and now also `src.slice(f(x), f(x) + 900)`.
 *
 * The capture was a bare IDENTIFIER, which missed the form with the anchor inlined —
 * `src.slice(src.indexOf('async function indexServes'), src.indexOf('async function indexServes') + 900)`, found in
 * a file that already carried a comment explaining why character counts are wrong. Widened to any repeated
 * expression up to 80 characters with no comma in it. The backreference matches literally, so the two halves still
 * have to be the same text — which is what makes this a window rather than an ordinary two-index slice.
 */
const MAGIC_WINDOW = /\.slice\(\s*([^,()]{1,80}?(?:\([^()]{0,60}\))?)\s*,\s*\1\s*\+\s*\d+\s*\)/g;

/**
 * The same defect written BACKWARDS: `src.slice(Math.max(0, at - 400), at)`.
 *
 * It was outside the pattern above, so it was never counted and never grandfathered — nine of them across eight
 * files, none of which the first version of this gate could see. Found while converting the forward population,
 * which is the argument for widening a ratchet's pattern as soon as its blind spot is known: a rule that reports
 * zero because it is not looking reads exactly like a rule that is satisfied.
 *
 * Backwards is the WORSE half. A window that stops short of its subject going forwards usually breaks the
 * assertion and goes red; going backwards it silently starts inside the subject, and in this suite the backwards
 * form is mostly paired with `doesNotMatch` — an absence asserted over less text than intended, which passes.
 *
 * A LINE window (`lines.slice(Math.max(0, i - 3), i + 4).join(' ')`) is deliberately NOT matched. Those are
 * adjacency claims — "a comment within three lines of the call" — where the number IS the rule rather than a guess
 * at how much of a subject fits. The `.join(` is what separates them, and it is a reliable signal because a
 * character window has nothing to join.
 */
const MAGIC_WINDOW_BACK = /\.slice\(\s*Math\.max\(\s*0\s*,\s*[A-Za-z_$][\w$.]*\s*-\s*\d+\s*\)[^)]*\)(?!\s*\.join\()/g;

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
  /*
   * TWO ENTRIES LEFT, and both are here because the number is not a window at all.
   *
   * The other nineteen files are converted. `_structural-window.mjs` grew the four bounds they actually needed —
   * a bracketed group, a statement, the block an anchor sits inside, and the three markup shapes — and each
   * conversion was read individually rather than swept, because a window rewritten without understanding its
   * subject is a gate that quietly checks less.
   */

  /*
   * `parseInt(h.slice(i, i + 2), 16)` — reading the red, green and blue bytes out of a hex colour.
   *
   * A hex pair is two characters by definition. There is no subject that can grow, so there is nothing for a
   * structural bound to bound. This is a fixed-width FIELD read wearing the same syntax as a window, and the
   * distinction matters: converting it would replace a correct expression with a worse one to satisfy a pattern.
   */
  ['testing/standalone/text-contrast-meets-aa.test.js', 1],

  /*
   * `parseInt(bits.slice(i * 8, i * 8 + 8), 2)` — reading one byte out of a bit string.
   *
   * The same class as the hex pair above and found by the same widening: eight bits is what a byte IS. Both are
   * fixed-width FIELD reads, and the fact that two of the three surviving entries are this shape is the argument for
   * keeping the exemptions rather than contorting the pattern to exclude them — a pattern that tries to tell a field
   * read from a window by its arithmetic will get it wrong in the other direction eventually.
   */
  ['testing/red-team-tests/auth-surface-hardening.test.js', 1],

  /*
   * `JSON.stringify(src.slice(handlerStart, handlerStart + 90))` — inside an assertion MESSAGE.
   *
   * Nothing is asserted about those 90 characters. They are an excerpt shown to whoever reads the failure, so
   * they can find the handler; the check itself is `checkSites.some(...)` on real indices. A window only needs a
   * structural bound when something is CHECKED inside it, and a 90-character quote is the right length for a
   * message where a whole handler body would not be.
   */
  ['testing/standalone/meta-precondition.test.js', 1],
]);

/**
 * Files still allowed to carry a BACKWARDS character window, with how many.
 *
 * Nine sites the pattern could not previously see, recorded rather than converted in the same change: the forward
 * population was twenty-two, and rewriting thirty-one windows in one commit is the blind sweep this gate exists to
 * prevent. **This list may only shrink**, on the same terms as the one above.
 *
 * Named individually because each has a different subject. `theme-cannot-recolour-facts` reads 1 400 characters of
 * CSS behind a declaration; `config-key-docs-coverage` reads a doc comment above a key; `index-ready-poll` reads
 * what precedes a call. Those are three different structural bounds, not one conversion applied nine times.
 */
/**
 * A CAPPED GAP inside a regex: `/marker[\s\S]{0,400}?other/`. Files still allowed to carry one, with how many.
 *
 * **30 occurrences across 17 files**, down from 66/36 when this was first measured — and the tracker had recorded
 * 30, which is why the number lives in the gate now rather than in a markdown file that drifts.
 *
 * The nine that left were the ones whose subject is a NAMED FUNCTION or a BRANCH, where the structural bound is
 * unambiguous: an update call's arguments, a 412 branch, a catch block, an abandon branch, `spaceStillExists`,
 * `selectSpace` (a 2 000-character cap — nobody chooses that number, they raise it until the test passes),
 * `chronoAllowedTypes`, `getAllowedChronoTypes`, and a try/finally.
 *
 * The ten after those emptied five files, and two of them are worth recording because they change what
 * "structural" has to mean:
 *
 * - **A NOTICE entry read with a 900-character window was 13 characters from reading the WRONG entry.** `### jszip`
 *   sits at offset 18040 and the next entry's election at 18953. The check asks whether *this* package's licence
 *   arm is recorded; at 913 characters the neighbour's election would have answered for it, and the test that
 *   would have gone green is the one whose stated purpose is refusing exactly that. Nothing maintains a
 *   13-character margin, and nothing would have reported it.
 * - **The enclosing STATEMENT is the wrong bound for a ternary.** `pass === 'structured' ? judgePair(a, b,
 *   { structuredOnly: true }) : judgePair(a, b)` is one statement holding BOTH arms, so a statement-level bound is
 *   satisfied by the flag sitting on the other branch — the opposite behaviour, and a paid model call. The bound
 *   that holds is the ARGUMENT LIST of the call the branch makes. Structural is not automatically tighter than a
 *   character count: it is tighter only when the structure chosen is the subject.
 *
 * **And what remains is now SORTED, not merely counted.** The prose sites carry a one-line comment saying
 * the number IS the rule — `[^.]` and `[^.
]` cannot cross a full stop or a line, so those patterns assert
 * that two things sit in ONE SENTENCE, which is exactly what a schema description has to do for a caller to
 * read it. Widening those gaps would turn a working refusal into a false positive on prose that is now
 * correct. A site left in this list without such a comment has not been read yet.
 *
 * **What remains is the fails-LOUDLY class, and that is why it is a frozen list rather than a blocker.** Every one
 * of the six negative-polarity sites — where a short window makes an absence hold and the gate pass — was converted
 * first. For a POSITIVE assertion a cap that falls short breaks the match and turns the gate red on correct code:
 * a nuisance that announces itself, not a hole.
 *
 * ## Why this is a THIRD list rather than a ban
 *
 * The syntax wears two meanings and only one is a defect:
 *
 *   - a WINDOW between two markers — the cap is a guess at how much of a subject fits, and it can only ever make
 *     the check see less. This is the defect.
 *   - an ADJACENCY claim — "these two words in one sentence", `[^.\n]{0,40}`; "the guard within three lines". The
 *     number IS the rule, and converting it would replace a correct assertion with a vaguer one.
 *
 * Banning both without reading each is the blind sweep this whole gate exists to prevent. So the population is
 * frozen, and the SIX whose assertion was NEGATIVE are converted first — that is the polarity where a short window
 * finds nothing, the absence holds, and the gate passes on the thing it was written to catch.
 *
 * Two of those six turned out not to be cap problems at all. One bounded the wrong loop, because `indexOf` found a
 * braceless one and the window landed on an object literal in its argument. The other matched ZERO occurrences in
 * any version — the three stages it names are built in a `.map`, so their key is a template and never the quoted
 * literal the regex looked for. Both had been reading as passing gates.
 *
 * **This list may only shrink.**
 */
const GRANDFATHERED_GAP = new Map([
  ['testing/red-team-tests/ssrf-ipv6.test.js', 1],
  ['testing/standalone/backups-are-not-world-readable.test.js', 1],
  ['testing/standalone/chrono-status-descriptions-match-the-derivation.test.js', 9],
  ['testing/standalone/document-description.test.js', 2],
  ['testing/standalone/infra-managed-locks-every-field.test.js', 2],
      ['testing/standalone/meta-precondition.test.js', 1],
  ['testing/standalone/no-boot-migration-on-synced-data.test.js', 1],
  ['testing/standalone/notice-coverage.test.js', 2],
  ['testing/standalone/oidc-carries-a-rights-matrix.test.js', 1],
    ['testing/standalone/reembed-backfill.test.js', 1],
  ['testing/standalone/rights-are-explained.test.js', 1],
  ['testing/standalone/route-guard-coverage.test.js', 1],
    ['testing/standalone/search-tool-schemas-document-their-response.test.js', 3],
  ['testing/standalone/single-flight.test.js', 1],
  ['testing/standalone/space-admin-reaches-its-own-space-settings.test.js', 1],
  ['testing/standalone/sync-waits-retrigger-and-diagnose.test.js', 1],
  ['testing/standalone/vlm-endpoint-egress.test.js', 1],
]);

const GRANDFATHERED_BACK = new Map([
  /*
   * EMPTY. All nine are converted, and the list stays here rather than being deleted because an empty ratchet is the
   * thing that keeps it empty — remove the map and the check goes with it.
   *
   * Reading the nine showed they were asking five different questions, which is why they were not swept: an
   * enclosing block, the line above, the doc comment above, the section around, and — the one that mattered — which
   * blocks CONTAIN the anchor. That last one was answering a containment question with a proximity measurement, so a
   * guard that opened and closed above a form control counted as guarding it.
   */
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

/*
 * The helper's own spec is excluded too. It contains every banned shape as a FIXTURE — that is what proves the
 * bounds are correct, and it is the one file where a magic window is the subject rather than a defect.
 */
const FIXTURES = 'structural-window-helper.test.js';

/** A capped gap inside a regex — `{0,400}` — whichever of the two things it means. */
const CAPPED_GAP = /\{0,\d+\}/g;

const found = new Map();
const foundBack = new Map();
const foundGap = new Map();
for (const root of ROOTS) {
  for (const file of sources(root)) {
    // Split on the platform separator and rejoin with `/`, so the keys read the same on Windows and in CI. A
    // grandfathered entry that only matched on one platform would be an allowance nobody could see.
    const key = file.split(sep).join('/');
    if (key.endsWith(SELF) || key.endsWith(FIXTURES)) continue;
    const code = stripComments(readFileSync(file, 'utf8'));
    const n = [...code.matchAll(MAGIC_WINDOW)].length;
    if (n > 0) found.set(key, n);
    const back = [...code.matchAll(MAGIC_WINDOW_BACK)].length;
    if (back > 0) foundBack.set(key, back);
    /*
     * Counted on the RAW source, not the comment-stripped copy. Every other count here is on `code`, and for this
     * one that would be wrong in the expensive direction: a `{0,N}` written inside a comment — which is how this
     * suite documents the lesson, and there are several — would be invisible, so a file could carry a real one and
     * a comment about it and the numbers would not add up. Counting raw keeps the frozen number checkable by hand
     * with a grep, which is what somebody converting one of these will actually do.
     */
    const gaps = [...readFileSync(file, 'utf8').matchAll(CAPPED_GAP)].length;
    if (gaps > 0) foundGap.set(key, gaps);
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

    /*
     * The INLINED-ANCHOR form, which the identifier-only capture could not see. Pinned as its own case because it is
     * how the widening was earned: three of these were sitting in the suite, one of them in a file that already
     * carried a comment about why character counts are wrong.
     */
    const inlined = "const fn = src.slice(src.indexOf('function f'), src.indexOf('function f') + 900);";
    assert.equal([...inlined.matchAll(MAGIC_WINDOW)].length, 1,
      'MAGIC_WINDOW no longer matches a window whose anchor is written out twice');

    // And does NOT match the shapes that are fine.
    for (const ok of [
      'JSON.stringify(b).slice(0, 300)',
      'src.slice(start, end)',
      'x.slice(a, b + 4)',
      // Two DIFFERENT expressions is an ordinary slice, not a window — the backreference is what separates them.
      "s.slice(s.indexOf('a'), s.indexOf('b') + 4)",
    ]) {
      assert.equal([...ok.matchAll(MAGIC_WINDOW)].length, 0, `false positive on: ${ok}`);
    }
  });

  it('the BACKWARDS pattern matches its shape, and leaves line windows alone', () => {
    const back = 'const before = src.slice(Math.max(0, at - 400), at);';
    assert.equal([...back.matchAll(MAGIC_WINDOW_BACK)].length, 1,
      'MAGIC_WINDOW_BACK no longer matches a backwards window — it would report zero by not looking');

    /*
     * A line window is an ADJACENCY claim, where the number is the rule. `.join(` is the signal, and asserting the
     * exclusion here is what stops a future tightening from banning thirty legitimate proximity checks.
     */
    for (const ok of [
      "const near = lines.slice(Math.max(0, i - 3), i + 4).join(' ')",
      'const around = lines.slice(Math.max(0, i - 6), i + 2).join("\\n")',
      'src.slice(0, i)',
    ]) {
      assert.equal([...ok.matchAll(MAGIC_WINDOW_BACK)].length, 0, `false positive on: ${ok}`);
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

  it('no NEW backwards window either, and that list only shrinks too', () => {
    // Both directions on one ratchet, so closing the forward half cannot look like closing the problem.
    const problems = [];
    for (const [file, n] of foundBack) {
      const allowed = GRANDFATHERED_BACK.get(file) ?? 0;
      if (n > allowed) problems.push(`${file}: ${n} backwards window(s), allowed ${allowed}`);
    }
    for (const [file, allowed] of GRANDFATHERED_BACK) {
      const actual = foundBack.get(file) ?? 0;
      if (actual < allowed) problems.push(`${file}: allowed ${allowed} backwards, now has ${actual} — lower it`);
    }
    assert.deepEqual(problems, [],
      'a gate reads a fixed number of characters BEHIND its anchor. That is the same defect as a forward window\n'
      + 'and a worse one: it starts inside its subject silently, and it is usually paired with `doesNotMatch`, so\n'
      + 'an absence gets asserted over less text than intended and passes. Bound it with `_structural-window.mjs`.\n'
      + problems.join('\n'));
  });

  it('no NEW capped gap inside a regex, and that list only shrinks too', () => {
    /*
     * Frozen rather than banned, because the syntax means two different things and only one is a defect — see the
     * note on `GRANDFATHERED_GAP`. What this refuses is a NEW one appearing anywhere, which is the part that does
     * not need each site read first.
     */
    const problems = [];
    for (const [file, n] of foundGap) {
      const allowed = GRANDFATHERED_GAP.get(file) ?? 0;
      if (n > allowed) problems.push(`${file}: ${n} capped gap(s), allowed ${allowed}`);
    }
    for (const [file, allowed] of GRANDFATHERED_GAP) {
      const actual = foundGap.get(file) ?? 0;
      if (actual < allowed) problems.push(`${file}: allowed ${allowed} gaps, now has ${actual} — lower it`);
    }
    assert.deepEqual(problems, [],
      'a capped gap inside a regex — `/marker[\\s\\S]{0,400}?other/`. If the number is a GUESS at how much of a\n'
      + 'subject fits, bound it with `_structural-window.mjs` instead; the cap can only make the check see less.\n'
      + 'If the number IS the rule — two words in one sentence, a guard within three lines — say so in a comment\n'
      + 'beside it and raise this file\'s entry deliberately.\n'
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
