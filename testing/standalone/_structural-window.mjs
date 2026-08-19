/**
 * Bound a gate's window by STRUCTURE, never by a character count.
 *
 * ## What a magic window costs, measured
 *
 * A gate that reads `src.slice(at, at + 3000)` has silently decided how much of its subject it can see. Grow the
 * subject and the window stops covering it — and the gate then either fails on correct code or, worse, passes by
 * looking at less than it meant to.
 *
 * On 2026-08-19 that cost three false failures in one session:
 *
 * - `index-ready-poll.test.js` windowed a function body at `at + 3000`; a new branch pushed the statement it
 *   checks past 3000 characters and it failed on working code.
 * - `rights-are-explained.test.js` capped a `<thead>` at 1 400 characters; a fifth column took it to 1 770.
 * - `rights-matrix.component.spec.ts` asserted a header count `toBe(4)`; a fifth column failed it.
 *
 * **The third one is why the Space Admin column was reverted five releases earlier.** The owner had asked for it
 * five times, and each time the obstacle was a test failing on an unrelated addition — which reads as *"the
 * feature broke the tests"* rather than as *"the test was written wrong"*. His words when it finally shipped:
 * *"must be noob mistake what you are doing, cant be real that one column creates such problems"*. It was.
 *
 * A character count also spans different LINES on CRLF than on LF, so a window that fits locally can fall short in
 * CI — which is the same failure with a slower feedback loop.
 *
 * ## Three copies of this existed before it did
 *
 * `optional-index-cannot-fail-a-space.test.js`, `no-polling-a-deleted-space.test.js` and
 * `index-ready-poll.test.js` each hand-rolled the same body-finding loop within hours of each other. That is the
 * defect `CLAUDE.md` names as the one this repo produces most — one rule, several implementations — arriving in
 * the test suite instead of the product.
 */
import assert from 'node:assert/strict';

/** A top-level declaration in a TS/JS source: where one subject ends and the next begins. */
const TOP_LEVEL = /^(?:export\s+)?(?:async\s+function|function|const|class|interface|type|abstract\s+class)\s/;

/**
 * The body of one named function or const, from its declaration to the next top-level declaration.
 *
 * Bounded by what the language actually says, so it cannot fall short as the subject grows. `name` is matched on
 * the declaration line rather than anywhere in the file, so a call to the function does not become the anchor.
 *
 * @param src   the whole source
 * @param name  the declared name, e.g. `pollVectorIndexReady`
 * @param label appears in the failure so a broken anchor says which gate to re-point
 */
export function bodyOf(src, name, label = name) {
  const lines = src.split(/\r?\n/);
  const declared = new RegExp(`^(?:export\\s+)?(?:async\\s+function|function|const|class)\\s+${name}\\b`);
  const start = lines.findIndex(l => declared.test(l));
  assert.ok(start > -1, `${label}: no top-level declaration of \`${name}\` — re-anchor this gate`);

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (TOP_LEVEL.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

/**
 * The text between an opening marker and its closing marker.
 *
 * For markup and for blocks whose end is a literal, like `<thead>` … `</thead>`. **No cap**: the closing marker
 * IS the bound, which is the whole point — a `[\s\S]{0,1400}?` between the two is a cap wearing a structural
 * disguise, and it is what failed on the fifth table column.
 */
export function between(src, open, close, label = open) {
  const a = src.indexOf(open);
  assert.ok(a > -1, `${label}: opening marker \`${open}\` not found — re-anchor this gate`);
  const b = src.indexOf(close, a + open.length);
  assert.ok(b > a, `${label}: closing marker \`${close}\` not found after \`${open}\``);
  return src.slice(a + open.length, b);
}

/**
 * A window plus proof it reached the end of its subject.
 *
 * The assertion that would have caught all three failures above on the day they were written: a window is only
 * trustworthy if something at the END of the subject is inside it. Pass the last thing the subject contains, and a
 * window that ever stops short says so instead of quietly checking less.
 */
export function bodyOfEndingWith(src, name, tail, label = name) {
  const body = bodyOf(src, name, label);
  assert.ok(body.includes(tail),
    `${label}: the window does not reach \`${tail}\` — it is not covering all of \`${name}\`, so anything `
    + 'asserted about the rest of it is being asserted about nothing');
  return body;
}
