/**
 * A method that writes the form PROGRAMMATICALLY must mark it touched — or its Save button is never rendered.
 *
 * ## The failure this exists for
 *
 * The Media Processing page arms its dirty state with **one delegated `(input)`/`(change)` listener** on the panel
 * wrapper. That covers a human typing in a field. It does not cover a method that writes the form itself, and it
 * cannot: a `<button>` click in a segmented control fires neither event.
 *
 * `setMode()` wrote the form and did not set `touched`. So `touched()` stayed false, `pipeDirty('pipe-documents')`
 * stayed false, and **the Documents pipeline's Save button was never rendered — not hidden, never rendered.** A
 * canary operator had `DOC_VERIFY_MODEL` configured and resident with no way to raise the extraction level its
 * consensus pass needs: a feature fully provisioned and unreachable, and nothing errored anywhere.
 *
 * `setCeiling()` already did it right and `models-tab` carries the same warning verbatim — *"programmatic change,
 * the page's input listener won't see it"*. **The trap was documented in two places and missed in the third.**
 * That is what a gate is for.
 *
 * ## Why this took a second attempt
 *
 * The first one was mis-scoped: the mutator lives in a state service and the dirty flag is set by a listener on
 * the component, so a check that reads one file cannot see the pair. The rule that IS checkable in one file is the
 * narrow one, and it is the one that matters: **inside the state service, a method that assigns into `this.form`
 * must set `touched` in the same method** — because a programmatic write is exactly what the listener misses.
 *
 * ## And the parser tests itself first
 *
 * The detector has to tell `this.form.x = 1` (a write) from `const y = this.form.x` (a read). Getting that
 * backwards makes the gate either silent or unbearable, so the first block pins it on both shapes before the
 * second block trusts it — the same reason the doc-link gate self-tests its slugifier.
 *
 * Run: node --test testing/standalone/form-mutators-mark-touched.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SERVICE = 'client/src/app/pages/settings/media-processing/media-processing-state.service.ts';

/**
 * Does this line ASSIGN INTO the form, rather than read out of it?
 *
 * Left-hand side only: `this.form.a.b = x` and `this.form['a'] = x` are writes; `const y = this.form.a` and
 * `if (this.form.a === b)` are not. `==`/`===`/`!=`/`>=` are excluded, and so is `=>`.
 */
function writesForm(line) {
  const m = line.match(/(^|[^\w.])this\.form((?:\.[\w$]+|\[[^\]]+\])+)\s*(=[^=>])/);
  return m !== null;
}

/** Class methods at two-space indent, brace-matched so one method's body cannot leak into the next. */
function methods(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  (?:(?:public|private|protected)\s+)?(?:async\s+)?([A-Za-z_][\w]*)\s*\([^)]*\)\s*(?::[^{]*)?\{/);
    if (!m) continue;
    let depth = 0, j = i;
    const body = [];
    for (; j < lines.length; j++) {
      body.push(lines[j]);
      for (const ch of lines[j]) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth === 0 && j > i) break;
    }
    out.push({ name: m[1], line: i + 1, body });
    i = j;
  }
  return out;
}

describe('the write detector, before it is trusted to judge anything', () => {
  it('recognises a write into the form', () => {
    for (const line of [
      '    this.form.documentProcessing.mode = m;',
      '    if (this.form.documentProcessing) this.form.documentProcessing.mode = m;',
      "    this.form['imageAnalysis'] = 'off';",
      '    this.form.a.b.c = 1;',
    ]) assert.equal(writesForm(line), true, line);
  });

  it('does NOT mistake a read for a write', () => {
    for (const line of [
      '    const mode = this.form.documentProcessing?.mode;',
      '    return this.form.imageAnalysis === level;',
      '    if (this.form.a !== b) return;',
      '    const on = this.form.levels[key] >= 1;',
      '    return Object.keys(this.form).map(k => this.form[k]);',
      '    payload.mode = this.form.documentProcessing.mode;',
    ]) assert.equal(writesForm(line), false, line);
  });

  it('brace-matches methods, so one body does not leak into the next', () => {
    const src = [
      'class X {',
      '  a(): void {',
      '    if (true) { this.form.x = 1; }',
      '  }',
      '  b(): void {',
      '    noop();',
      '  }',
      '}',
    ].join('\n');
    const m = methods(src);
    assert.deepEqual(m.map(x => x.name), ['a', 'b']);
    assert.ok(m[0].body.some(writesForm), 'a() writes the form');
    assert.ok(!m[1].body.some(writesForm), 'b() must not inherit a()\'s body');
  });
});

describe('every programmatic form write marks the form touched', () => {
  const src = readFileSync(join(ROOT, SERVICE), 'utf8');
  const all = methods(src);
  const writers = all.filter(m => m.body.some(writesForm));

  it('found the methods and the writers — the parse still works', () => {
    assert.ok(all.length >= 30, `only found ${all.length} methods in the state service`);
    assert.ok(writers.length >= 1, 'found no method that writes the form — the detector has stopped matching');
    assert.ok(writers.some(w => w.name === 'setMode'),
      'setMode is the method whose missing touched() was a BLOCKER; it must be among the writers');
  });

  it('each one sets touched, or is a loader that clears it', () => {
    const bad = [];
    for (const w of writers) {
      const sets = w.body.some(l => /this\.touched\.set\(true\)/.test(l));
      // A loader writes the form FROM the server and then declares it pristine. That is the opposite intent, and
      // `load()` / `save()` both do it explicitly — so clearing is the exemption, stated in code rather than here.
      const clears = w.body.some(l => /this\.touched\.set\(false\)/.test(l));
      if (!sets && !clears) bad.push(`${SERVICE}:${w.line} ${w.name}()`);
    }
    assert.deepEqual(bad, [], 'these write the form without marking it touched. The page arms its dirty state from '
      + 'ONE delegated (input)/(change) listener, which cannot see a programmatic write — so the affected Save '
      + `button is never RENDERED, and nothing errors:\n  ${bad.join('\n  ')}\n\n`
      + 'Add `this.touched.set(true);` after the write, or clear it explicitly if the method is a loader.');
  });

  it('the delegated listener still exists — it is the other half of the contract', () => {
    // If the listener were removed, every field would need its own touched() call and this gate would be checking
    // the wrong rule. Its presence is what makes "programmatic writes only" the correct scope.
    const page = readFileSync(join(ROOT, 'client/src/app/pages/settings/media-processing/media-processing-page.component.ts'), 'utf8');
    assert.match(page, /\((input|change)\)="[^"]*touched/,
      'the panel wrapper must still arm touched from a delegated (input)/(change) — without it, this gate is '
      + 'checking a narrower rule than the page needs');
  });

  it('the trap is still documented where it was missed', () => {
    // It was known in two places and missed in a third. The comment is not decoration: it is why the next person
    // writing a mutator here knows the listener will not save them.
    assert.match(src, /touched\.set\(true\)` is load-bearing/,
      'the note explaining why a programmatic write needs touched() has gone');
  });
});
