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

/*
 * ---------------------------------------------------------------------------------------------------------------
 * The bounds below were each hand-rolled, or replaced by a character count, in at least one gate.
 *
 * `bodyOf` and `between` cover a named declaration and a literal-delimited block. They do not cover the four other
 * shapes a gate's subject actually takes, and every gate that needed one of those reached for `at + N` instead:
 *
 *   - a CALL or a BLOCK found by index, whose end is its matching bracket;
 *   - the rest of the STATEMENT an anchor sits in;
 *   - the block an anchor sits INSIDE, which ends before its own opening brace's match;
 *   - an HTML OPENING TAG, a markdown SECTION, a YAML LIST ITEM.
 *
 * Three files had already hand-rolled the bracket walker independently — `client-bodies-match-server.test.js`,
 * `credential-bodies-are-strict.test.js` and `no-boot-migration-on-synced-data.test.js` — which is the defect
 * `CLAUDE.md` names as this repo's most frequent, arriving in the test suite. None of the three skips strings or
 * comments, so a brace inside a string literal or a `// }` silently ends the window early: the same failure as a
 * magic number, wearing structure's clothes.
 * ---------------------------------------------------------------------------------------------------------------
 */

const PAIRS = { '(': ')', '{': '}', '[': ']' };

/**
 * Walk source from `i`, yielding only positions that are real code — never inside a string, template, regex-free
 * comment or line comment. Returns the index of the first depth-0 occurrence of any character in `stop`, or -1.
 *
 * Written once because every caller below needs the same skipping, and a walker that does not skip is how a `'}'`
 * in a message ends a window three declarations early.
 */
function scanCode(src, i, visit) {
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    // Comments first: `//` and `/* */`. A `"` inside a comment must not open a string.
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i === -1) return src.length; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e === -1 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) i += src[i] === '\\' ? 2 : 1;
      i++;
      continue;
    }
    const verdict = visit(c, i, depth);
    if (verdict !== undefined) return verdict;
    if (PAIRS[c]) depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    i++;
  }
  return -1;
}

/**
 * The bracketed group starting at or after `at`, inclusive of both brackets.
 *
 * For a call expression (`recordToolCall(...)`) or a block (`if (x) { ... }` — anchor on the `{`). The closing
 * bracket IS the bound, so the window cannot fall short however much the subject grows.
 */
export function balancedFrom(src, at, label = 'balancedFrom') {
  let open = -1;
  for (let i = at; i < src.length; i++) if (PAIRS[src[i]]) { open = i; break; }
  assert.ok(open > -1, `${label}: no bracket at or after index ${at} — re-anchor this gate`);
  /*
   * `depth === 1`, not 0: the walker reports each character with the depth it is AT, and a closer is still inside
   * the group it closes. The opening bracket is seen at 0 and takes the depth to 1, so its own match is the only
   * closer seen at 1 — every nested one is deeper. Asserted directly in `structural-window-helper.test.js`, because
   * getting this off by one returns a window that is too SMALL and every gate using it would still pass.
   */
  const wanted = PAIRS[src[open]];
  const close = scanCode(src, open, (c, i, depth) => (depth === 1 && c === wanted ? i : undefined));
  assert.ok(close > open, `${label}: the group opened at ${open} is never closed — re-anchor this gate`);
  return src.slice(open, close + 1);
}

/**
 * The `{ … }` block that follows `at` — the body of an `if`, a `for`, or a handler.
 *
 * `balancedFrom` on the anchor would return the CONDITION, because an `if`'s first bracket is its paren. Spelled out
 * as its own function because getting it wrong gives a window that looks plausible and contains none of the subject.
 */
export function blockAfter(src, at, label = 'blockAfter') {
  const brace = src.indexOf('{', at);
  assert.ok(brace > -1, `${label}: no block after index ${at} — re-anchor this gate`);
  return balancedFrom(src, brace, label);
}

/** From `at` to the `;` that ends the statement it begins, inclusive. */
export function statementFrom(src, at, label = 'statementFrom') {
  const end = scanCode(src, at, (c, i, depth) => (depth === 0 && c === ';' ? i : undefined));
  assert.ok(end > at, `${label}: no statement terminator after index ${at} — re-anchor this gate`);
  return src.slice(at, end + 1);
}

/**
 * The statement `at` sits in, from its start up to `at`.
 *
 * The bound for a question about what CHOOSES something — "is this `fetch` behind a locality test?" — where the
 * subject is behind the anchor rather than ahead of it. A fixed count backwards is the worst version of a magic
 * window: it starts in the middle of whatever precedes, so it can read half of the previous statement and none of
 * the relevant one, and nothing about the result says which happened.
 *
 * Boundaries are collected by scanning FORWARD from the start of the file, because that is the only direction in
 * which a string or a comment can be recognised — walking backwards, a `'` is as likely to close a string as open
 * one. That costs a pass per call and buys a bound that cannot be fooled by a `;` inside a message.
 */
export function statementUpTo(src, at, label = 'statementUpTo') {
  /*
   * DEPTH MATTERS, and the first version of this got it wrong in the way that would have mattered:
   *
   *     res = endpoint.external
   *       ? await ssrfSafeFetch(url, init, { allowPrivate: allowPrivateForSlot(endpoint.slot) })
   *       : await fetch(url, init);
   *
   * Taking the nearest `;`, `{` or `}` at any depth makes the closing brace of that OPTIONS OBJECT the boundary, so
   * the window starts at `) : await ` and contains no `.external` — and the gate reports a correctly-guarded fetch
   * as unguarded. Only a boundary at the anchor's own nesting level ends its statement.
   */
  const marks = [];
  let depthAt = null;
  scanCode(src, 0, (c, i, depth) => {
    if (i >= at) { if (depthAt === null) depthAt = depth; return at; }
    if (c === ';' || c === '{' || c === '}') marks.push({ c, i, depth });
    return undefined;
  });
  assert.ok(depthAt !== null, `${label}: index ${at} was never reached — it is inside a string or a comment`);
  const boundary = marks.filter(m =>
    (m.c === ';' && m.depth === depthAt)
    || (m.c === '{' && m.depth === depthAt - 1)    // the brace that opened the block we are in
    || (m.c === '}' && m.depth === depthAt),       // a sibling block that closed before us
  ).pop();
  return src.slice(boundary ? boundary.i + 1 : 0, at);
}

/**
 * From `at` to the end of the block `at` sits INSIDE — the first `}` reached at negative depth.
 *
 * The bound for an anchor in the middle of a branch (`forkDepthRefused++` inside its `if`): the subject is the rest
 * of that branch, and its end is the brace that closes it rather than a count of what fits today.
 */
export function enclosingBlockFrom(src, at, label = 'enclosingBlockFrom') {
  const end = scanCode(src, at, (c, i, depth) => (c === '}' && depth === 0 ? i : undefined));
  assert.ok(end > at, `${label}: index ${at} is not inside a block — re-anchor this gate`);
  return src.slice(at, end);
}

/** An HTML opening tag at or after `at`, `<` to `>` inclusive — the bound for an assertion about ATTRIBUTES. */
export function openTagAt(src, at, label = 'openTagAt') {
  const lt = src.indexOf('<', at);
  assert.ok(lt > -1, `${label}: no tag at or after index ${at} — re-anchor this gate`);
  const gt = src.indexOf('>', lt);
  assert.ok(gt > lt, `${label}: the tag opened at ${lt} is never closed`);
  return src.slice(lt, gt + 1);
}

/**
 * From `at` to the next markdown heading, or the end of the document.
 *
 * For prose: the claim and everything said about it, bounded by where the next subject starts. A character count on
 * markdown is the worst case of all, because prose is edited for readability by people who are not thinking about
 * a test.
 */
export function markdownSectionFrom(src, at, label = 'markdownSectionFrom') {
  const rest = src.slice(at);
  const next = /\n#{1,6} /.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/**
 * The YAML list item containing `at`, bounded by the next line at the same indentation or shallower.
 *
 * A workflow step. Its end is where the next step begins, which is indentation — not 400 characters, a number that
 * changes meaning the moment somebody adds a `name:` to the step above.
 */
export function yamlItemAt(src, at, label = 'yamlItemAt') {
  const lines = src.split(/\r?\n/);
  let idx = 0, seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (seen + lines[i].length >= at) { idx = i; break; }
    seen += lines[i].length + 1;
  }
  // Walk back to the `- ` that opens the item, so an anchor on any line of a step still bounds the whole step.
  let start = idx;
  while (start > 0 && !/^\s*- /.test(lines[start])) start--;
  const indent = /^(\s*)- /.exec(lines[start]);
  assert.ok(indent, `${label}: index ${at} is not inside a YAML list item — re-anchor this gate`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const lead = /^\s*/.exec(line)[0].length;
    if (lead <= indent[1].length) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}
