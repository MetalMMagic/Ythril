/**
 * When media config is infra-managed, EVERY editable control on that page is disabled.
 *
 * ## Why this is a gate and not a code review
 *
 * The owner asked whether editable API-key fields under infra-managed were intended. They are not: the server
 * refuses the write outright —
 *
 *     Media & model configuration is infra-managed on this instance (YTHRIL_MEDIA_INFRA_MANAGED=true ...)
 *
 * — so any control that still accepts typing composes a request the API will reject. "Most is blocked" is
 * exactly the shape a hand-maintained per-field list produces, and this page has **35** editable controls
 * across four tabs. Every one currently carries a `[disabled]` binding, and the thing that makes that true is
 * 35 separate decisions, each one an edit away from being forgotten.
 *
 * So the property is asserted by SHAPE: find every control bound to `ngModel` in the page's components, and
 * require a disabled binding on each. A new field added without one fails here rather than shipping as a form
 * that looks editable and answers 400.
 *
 * ## What this does NOT prove
 *
 * That the flag reaches the client. `isLocked()` short-circuits on `managed`, `managed` reads
 * `form.infraManaged`, and the loader spreads the whole response onto `form` — so the wiring is right in the
 * source. If a deployment still shows editable fields, the question is whether `GET /api/admin/media-config`
 * actually returns `infraManaged: true` there, which is one request and not something a static gate can see.
 *
 * Run: node --test testing/standalone/infra-managed-locks-every-field.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { angularTemplateOf, enclosingMarkupBlocksMatching } from './_structural-window.mjs';

const files = execSync('git ls-files "client/src/app/pages/settings/media-processing/*.component.ts"',
  { encoding: 'utf8' }).trim().split('\n').filter(f => f && !f.endsWith('.spec.ts'));

/** Every `<input>`, `<select>` and `<textarea>` that is bound to a model — i.e. that a person can change. */
function boundControls(componentSrc) {
  /*
   * The TEMPLATE, not the component file. The containment walk below reads markup braces, and the JS scanner in
   * `_structural-window.mjs` treats the whole template literal as a string and skips it — so run it on the markup.
   */
  const src = angularTemplateOf(componentSrc);
  const out = [];
  for (const m of src.matchAll(/<(input|select|textarea)\b[\s\S]{0,400}?(?:\/>|<\/(?:select|textarea)>)/g)) {
    const block = m[0];
    if (!block.includes('ngModel')) continue;
    // A control can be locked two ways, and only one of them lives on the control. The person-types picker sits
    // inside `@if (!(s.faceLocked('personEntityTypes') || s.managed))` — it does not RENDER when managed, which
    // is a stronger lock than a disabled attribute. A gate that understood only `[disabled]` reported that as a
    // defect, and following it would have meant adding a redundant binding to correct code.
    /*
     * CONTAINMENT, not proximity — and this is the one conversion in this batch that fixes a real hole rather than
     * merely stating the bound properly.
     *
     * `src.slice(m.index - 600, m.index)` asks "is there a managed guard NEARBY". The question is "is this control
     * INSIDE one". A guard that opened and closed above the control satisfies the first and contains nothing, so an
     * unguarded control 600 characters below a closed `@if` read as locked. The walk below keeps a brace stack, so
     * only a guard still OPEN at this control counts.
     *
     * It reads MARKUP braces rather than TypeScript ones, and that distinction is not cosmetic: the JS scanner in
     * `_structural-window.mjs` treats a template literal as a string and skips it whole, so on a component file it
     * finds no `@if` at all and reported this correctly-guarded picker as unguarded. Two languages in one file need
     * two walks.
     *
     * It also drops the `[\s\S]{0,120}?` gap: the whole opening line is returned, so a condition containing its own
     * parens — `s.faceLocked('personEntityTypes') || s.managed` — cannot be cut short of `managed`.
     */
    const guards = enclosingMarkupBlocksMatching(src, m.index, /@if\s*\(/);
    if (guards.some(g => /\bmanaged\b/.test(g))) continue;
    const id = /id="([^"]+)"/.exec(block)?.[1]
      ?? /\[\(ngModel\)\]="([^"]+)"/.exec(block)?.[1]
      ?? '(unnamed)';
    out.push({ id, block });
  }
  return out;
}

describe('the media-processing page locks every field when infra-managed', () => {
  it('finds the page it is meant to be checking', () => {
    // A sweep that matches nothing passes vacuously, and this one is scoped by SHAPE rather than by the field
    // names I happened to think of — which is the mistake that produces "most is blocked".
    assert.ok(files.length >= 3, `expected the media-processing components, found ${files.length}`);
    const total = files.reduce((n, f) => n + boundControls(readFileSync(f, 'utf8')).length, 0);
    assert.ok(total >= 25, `expected the page's editable controls, found ${total}`);
  });

  it('every control a person can type into carries a disabled binding', () => {
    const open = [];
    for (const f of files) {
      for (const { id, block } of boundControls(readFileSync(f, 'utf8'))) {
        if (!/\[disabled\]/.test(block)) open.push(`${f.split('/').pop()}#${id}`);
      }
    }
    assert.deepEqual(open, [],
      'these controls accept typing with no disabled binding, so under infra-managed they compose a request '
      + `the API refuses:\n  ${open.join('\n  ')}`);
  });

  it('the lock short-circuits on managed rather than listing fields', () => {
    // The one line that makes the 35 bindings mean something. Were it only `lockedByInfra.includes(field)`,
    // every field would depend on the server naming it — and a field the server forgot would stay editable.
    const svc = readFileSync('client/src/app/pages/settings/media-processing/media-processing-state.service.ts', 'utf8');
    assert.match(svc, /isLocked\(field: string\): boolean \{ return this\.managed \|\| /,
      'isLocked must return true for EVERY field when managed, not consult a list');
    assert.match(svc, /get managed\(\): boolean \{ return !!this\.form\.infraManaged; \}/,
      'managed must read the flag the server sends');
  });

  it('the flag survives the load onto the form', () => {
    // The other half of the wiring: a load that picked fields by name instead of spreading would drop
    // `infraManaged` silently, and every control would unlock while the server still refused every save.
    const svc = readFileSync('client/src/app/pages/settings/media-processing/media-processing-state.service.ts', 'utf8');
    assert.match(svc, /this\.form = \{[\s\S]{0,80}?\.\.\.cfg/,
      'the response must be spread onto the form, or infraManaged never arrives');
  });

  it('the server still refuses the write, so this is a lock and not the only defence', () => {
    // A disabled input is a courtesy. The refusal is the control, and a UI-only lock would be exactly the
    // "two surfaces, one rule, one weaker" shape this repo keeps finding.
    const api = readFileSync('server/src/api/media-config.ts', 'utf8');
    assert.match(api, /if \(activeCfg\.infraManaged\)/,
      'the API must refuse an infra-managed write regardless of what the UI allows');
  });
});
