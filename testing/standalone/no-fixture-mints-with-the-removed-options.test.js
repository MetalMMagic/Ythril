/**
 * No test fixture mints a token with the options 4.0 removed.
 *
 * `POST /api/tokens` stopped accepting `spaces`, `admin` and `readOnly` in 4.0 (`D-5`). Forty-six fixture
 * sites across twenty-four files used them, and every one now goes through `legacyRights`, which delegates
 * to the same `migrateToken` the server used — so a migrated fixture asks for precisely what its old input
 * produced rather than for a hand-written matrix that happens to pass its own test.
 *
 * ## Why a gate rather than trusting the sweep
 *
 * A fixture written next month by copying an old one gets a `400` and looks like a broken test. The person
 * fixing it has to work out that the field was removed, from a refusal in a log. This says it at the point
 * the file is written, and names what to use.
 *
 * It is also the rule this repo keeps re-learning: find every instance, then gate against a new copy. The
 * sweep that produced the forty-six missed one, twice — first because the window was a regex that stopped
 * at a template hole, then because `get(url, tok, '/api/tokens')` has no object after it and the scanner
 * grabbed the next unrelated `{`, shifting every site below it. Neither would have been caught by reading
 * the diff.
 *
 * ## It scans TWO shapes, and missing the second is how it was first written
 *
 * A fixture mints either through the helper — `post(url, tok, '/api/tokens', { … })` — or with a raw
 * `fetch` at a template-literal URL and the body inside `JSON.stringify({ … })`. The first version of
 * this gate saw only the helper form, reported the tree clean, and two raw-fetch fixtures were still
 * minting with `readOnly` and `spaces`. One of them failed in CI; the other would have passed for the
 * wrong reason, because it asserts a 400 and a removed field answers 400.
 *
 * So the scan is keyed on the PATH — `/api/tokens` however it is written — and then on whichever
 * object literal actually carries the body.
 *
 * ## What it does NOT forbid
 *
 * The words themselves. `legacyRights({ admin: true })` is the sanctioned form and contains `admin:` — the
 * subject is a legacy key sitting directly in a MINT BODY, which is what the route refuses.
 *
 * Run: node --test testing/standalone/no-fixture-mints-with-the-removed-options.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';

const REMOVED = ['spaces', 'admin', 'readOnly'];

/** Tracked test files only — an untracked scratch copy is not part of the suite. */
function testFiles() {
  return execFileSync('git', ['ls-files', 'testing'], { encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
}

/**
 * The brace-matched object literal following `at`, or null when no object follows.
 *
 * Brace-matched rather than regex-bounded because a mint body spans lines and carries `${…}` template
 * holes — a `[^{}]*` window stops at the first one. And it returns null when the next thing is not an
 * object, because `get(url, tok, '/api/tokens')` takes no body and scanning past it to the next `{`
 * anywhere below is how a sweep silently reports on the wrong code.
 */
function bodyAfter(src, at) {
  const rest = src.slice(at);
  const gap = /^\s*,\s*/.exec(rest);
  if (!gap || rest[gap[0].length] !== '{') return null;
  let depth = 0, str = null, esc = false;
  const start = at + gap[0].length;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (str) { if (ch === str) str = null; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** Top-level keys of an object literal — nested objects and arrays skipped. */
function topKeys(obj) {
  const keys = [];
  let depth = 0, str = null, esc = false, atTop = true, word = '';
  for (const ch of obj.slice(1, -1)) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (str) { if (ch === str) str = null; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { str = ch; continue; }
    if ('{[('.includes(ch)) { depth++; continue; }
    if ('}])'.includes(ch)) { depth--; continue; }
    if (depth > 0) continue;
    if (ch === ',') { atTop = true; word = ''; continue; }
    if (ch === ':') { if (atTop && word.trim()) keys.push(word.trim()); atTop = false; word = ''; continue; }
    word += ch;
  }
  return keys;
}

/** Every object literal that could be a mint body in this file, from either call shape. */
function mintBodies(src) {
  const found = [];
  // Shape 1: the helper — `post(url, tok, '/api/tokens', { … })`.
  let at = 0;
  while ((at = src.indexOf("'/api/tokens'", at)) >= 0) {
    const body = bodyAfter(src, at + "'/api/tokens'".length);
    if (body) found.push(body);
    at += 1;
  }
  // Shape 2: a raw fetch at `${…}/api/tokens` with the body in JSON.stringify({ … }).
  at = 0;
  while ((at = src.indexOf('/api/tokens`', at)) >= 0) {
    const call = src.slice(at, src.indexOf('});', at) + 3);
    const j = call.indexOf('JSON.stringify(');
    if (j >= 0) {
      // `bodyAfter` expects `…, {` — the shape a helper call has. A JSON.stringify argument starts at
      // the brace, so a comma is prefixed to meet it. The first version sliced one character early,
      // handed it `(` instead of `{`, and quietly found nothing: the gate reported the tree clean while
      // two raw-fetch fixtures still carried a removed option. Mutation-testing is what caught it.
      const body = bodyAfter(',' + call.slice(j + 'JSON.stringify('.length), 0);
      if (body) found.push(body);
    }
    at += 1;
  }
  return found;
}

describe('no fixture mints a token with the options 4.0 removed', () => {
  it('the sweep sees mint calls at all', () => {
    /*
     * The vacuity guard. If the scan finds no mint bodies — a renamed route, a changed helper — it would
     * report a clean result over a rule it never applied, which is the failure mode this repo produces
     * most often in its own gates.
     */
    let bodies = 0;
    for (const f of testFiles()) bodies += mintBodies(stripComments(readFileSync(f, 'utf8'))).length;
    assert.ok(bodies >= 20,
      `only ${bodies} mint bodies found across the test tree — the scan has stopped matching how these `
      + 'fixtures are written, so a pass says nothing');
  });

  it('and none of them carries a removed option', () => {
    const offenders = [];
    for (const f of testFiles()) {
      for (const body of mintBodies(stripComments(readFileSync(f, 'utf8')))) {
        const bad = topKeys(body).filter(k => REMOVED.includes(k));
        if (bad.length) offenders.push(`${f} — ${bad.join(', ')}`);
      }
    }
    assert.deepEqual(offenders, [],
      `${offenders.join('; ')}\n\nPOST /api/tokens refuses \`spaces\`, \`admin\` and \`readOnly\` since 4.0. `
      + 'Use `legacyRights({ … })` from `testing/_shared/legacy-token-rights.mjs` — it calls the same '
      + '`migrateToken` the server used, so the fixture asks for exactly what the old option produced.');
  });

  it('the helper delegates rather than reimplementing the mapping', () => {
    /*
     * If it ever grows its own matrix-building, every migrated fixture stops being provably equivalent to
     * what it asked for before — which is the entire reason there is a helper instead of forty-six
     * hand-written matrices.
     */
    const helper = stripComments(readFileSync('testing/_shared/legacy-token-rights.mjs', 'utf8'));
    assert.match(helper, /migrateToken/,
      'the helper no longer delegates to migrateToken, so a migrated fixture is only as correct as a '
      + 'hand-written matrix — which is what it exists to avoid');
    assert.doesNotMatch(helper, /instanceAdmin|perSpace/,
      'the helper builds a matrix itself instead of delegating');
  });
});
