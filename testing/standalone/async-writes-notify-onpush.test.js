/**
 * An async write to a rendered field must be one OnPush can see.
 *
 * ## The failure
 *
 * Every component here is OnPush. A subscribe callback that assigns to a plain field —
 * `this.rows = result.items` — changes the data and does not tell Angular, so the request succeeds, the
 * value is correct in memory, and the screen keeps showing the old one. Nothing throws and nothing logs.
 * The same assignment to a signal notifies, which is why almost all of this codebase uses signals for
 * anything rendered.
 *
 * ## The three things that make a plain-field write legitimate, and why each is a rule rather than a list
 *
 * This came out of the A-L2-6 angle. Measuring the shape found 55 async plain-field writes across 16
 * files, which sounds like a lot and is almost entirely legitimate:
 *
 *  1. **A signal is written in the same turn.** The plain edit models (`entityForm`, `chronoForm`, the
 *     drawer's four) render under OnPush only because the subscribe body also writes a signal, and that
 *     coupling is deliberate and documented where it lives. Filtering on it drops 55 to 6.
 *  2. **The field IS a signal**, and the assignment is a reassignment of the holder.
 *  3. **The field is `private`.** An Angular template cannot read a private member under
 *     `strictTemplates`, so a private field is not rendered state by construction.
 *
 * All six survivors of (1) turned out to be (3): an EventSource handle, a reconnect timer, a config array
 * and a re-entrancy guard. So this gate ships with **no exemption list** — every real case is covered by a
 * rule that stays true of code nobody has written yet.
 *
 * That last part is the point. Two gates written just before this one both had to be rewritten because
 * they encoded a model of the code drawn from the sample already read. `private` is not a model of these
 * four fields; it is a fact about what a template can reach.
 *
 * Run: node --test testing/standalone/async-writes-notify-onpush.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();

function sourceFiles() {
  return execFileSync('git', ['ls-files', 'client/src/app'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.d.ts'));
}

/** The text of each `.subscribe(...)` call, matched by balancing parens from the opening one. */
function subscribeBodies(src) {
  const out = [];
  for (const m of src.matchAll(/\.subscribe\s*\(/g)) {
    let depth = 0, end = -1;
    for (let i = src.indexOf('(', m.index); i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) out.push(src.slice(m.index, end));
  }
  return out;
}

/** Async assignments to a field that the template could render and that nothing notifies. */
function unnotifiedWrites(src) {
  const found = [];
  for (const body of subscribeBodies(src)) {
    // Rule 1 — a signal written in the same turn notifies OnPush, whatever else the body touches.
    if (/\.(set|update)\s*\(/.test(body)) continue;
    for (const a of body.matchAll(/this\.([a-zA-Z_$][\w$]*)\s*=(?!=)/g)) {
      const field = a[1];
      // Rule 2 — the field is itself a signal holder.
      if (new RegExp(`\\b${field}\\s*=\\s*(signal|computed|toSignal)\\s*[(<]`).test(src)) continue;
      if (new RegExp(`\\b${field}\\s*[:!]\\s*(Writable)?Signal\\b`).test(src)) continue;
      // Rule 3 — private fields cannot be read by a template under strictTemplates.
      if (new RegExp(`\\bprivate\\s+(readonly\\s+)?${field}\\b`).test(src)) continue;
      found.push(field);
    }
  }
  return found;
}

describe('an async write to a rendered field notifies OnPush', () => {
  const files = sourceFiles();

  it('walked a real tree and found real subscribes', () => {
    // Floors the enumeration twice over. A glob that matched nothing, or a paren-matcher that returned no
    // bodies, would both report a clean bill of health over an empty set.
    assert.ok(files.length >= 100, `only found ${files.length} client source files`);
    const withSubs = files.filter(f => subscribeBodies(readFileSync(join(ROOT, f), 'utf8')).length > 0);
    assert.ok(withSubs.length >= 10,
      `only ${withSubs.length} files yielded a .subscribe() body — the matcher is broken`);
  });

  it('the detector catches a write nothing notifies', () => {
    // Positive control. Each of the three rules is an escape hatch, and a bug in any of them turns the
    // gate into one that always passes — which is indistinguishable from a healthy codebase.
    const bad = `class C { rows: string[] = []; load() { this.api.get().subscribe(r => { this.rows = r; }); } }`;
    assert.deepEqual(unnotifiedWrites(bad), ['rows'], 'the detector missed an unnotified write');

    const viaSignal = `class C { rows = signal<string[]>([]); load() { this.api.get().subscribe(r => { this.rows.set(r); }); } }`;
    assert.deepEqual(unnotifiedWrites(viaSignal), [], 'a signal write must not be reported');

    const sameTurn = `class C { form = {}; open = signal(0); load() { this.api.get().subscribe(r => { this.form = r; this.open.set(1); }); } }`;
    assert.deepEqual(unnotifiedWrites(sameTurn), [], 'a same-turn signal write must clear the plain write');

    const priv = `class C { private handle?: X; load() { this.api.get().subscribe(r => { this.handle = r; }); } }`;
    assert.deepEqual(unnotifiedWrites(priv), [], 'a private field is not rendered state');
  });

  it('no component writes rendered state where nothing notifies', () => {
    const offenders = [];
    for (const f of files) {
      const fields = unnotifiedWrites(readFileSync(join(ROOT, f), 'utf8'));
      if (fields.length) offenders.push(`${f.replaceAll('\\', '/')}: ${[...new Set(fields)].join(', ')}`);
    }
    assert.deepEqual(offenders, [],
      'this subscribe callback assigns to a field a template can read, and nothing in the same turn tells '
      + 'Angular. Under OnPush the request succeeds, the value is right in memory, and the view keeps '
      + 'showing the old one — with nothing thrown and nothing logged. Make the field a signal, or write a '
      + 'signal in the same callback, or mark it `private` if it is genuinely not rendered.');
  });
});
