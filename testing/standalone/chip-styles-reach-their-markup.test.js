/**
 * A component that renders a chip class can REACH a rule for it.
 *
 * ## The defect
 *
 * The canary operator, 2026-08-12T2230Z: *"the schema editor's enum-value remove buttons are oversized and clip their own
 * labels"*. They were unstyled. `schema-type-editor.component.ts` renders `.chip-wrap`, `.chip`, `.chip-rm` and
 * `.chip-field`; its only stylesheet was `SCHEMA_MD_STYLES`, which defines none of them; and `styles.scss` has no global
 * chip rules to fall back on. So `.chip-rm` — a `<button>` — rendered with the browser's own border, background, padding
 * and font size, inside a `<span>` with no `inline-flex` and no padding.
 *
 * **Nothing was wrong with the CSS.** Angular scopes component styles, so when the editor body was extracted out of the
 * schema TAB — which does carry those rules — the styles did not follow the markup. `space-dialog.styles.ts` had even
 * written the rule down: *"a child that renders the chip inputs needs these rules in its OWN metadata"*. A comment is
 * not a check.
 *
 * ## Why this failure mode needs a gate specifically
 *
 * It produces **no error anywhere**. The template compiles, the class attribute is present, the build is clean, and the
 * component renders — just with browser defaults. The same shape as an unregistered `<ph-icon name>` rendering blank:
 * invisible to every automated check, obvious only to someone looking at the pixels. Nobody looked for four days, and
 * the partner found it.
 *
 * ## Derived, not listed
 *
 * The chip families are read from the source: every `class="chip…"` in any component template, and every `.chip…` rule
 * in any file. A component satisfies the check when the rule is defined in its own `styles`, in a style constant it
 * imports, or globally in `styles.scss`. So a NEW chip variant, or a new component using one, is covered on the day it
 * is written — which is the only day it is cheap.
 *
 * Run: node --test testing/standalone/chip-styles-reach-their-markup.test.js
 */
import { describe, it } from 'node:test';
import { trackedSources } from './_sources.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

const files = trackedSources('client/src', { specs: false });

const GLOBAL_CSS = 'client/src/styles.scss';

/** Every chip class used in a template, per file. */
function chipClassesUsed(src) {
  const used = new Set();
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) if (/^chip(-[a-z]+)*$/.test(cls)) used.add(cls);
  }
  return used;
}

/** Every chip class a stylesheet body defines. */
function chipClassesDefined(src) {
  const defined = new Set();
  for (const m of src.matchAll(/\.(chip(?:-[a-z]+)*)\s*(?::[a-z-]+)?\s*\{/g)) defined.add(m[1]);
  return defined;
}

/**
 * The stylesheets a component ACTUALLY APPLIES — the contents of its `styles: [...]` array, nothing else.
 *
 * The first version of this read every relative import instead, and it did not catch the defect it was written for.
 * `schema-type-editor.component.ts` still *imports* `CHIP_STYLES`; removing it from the `styles` array is what breaks
 * the rendering. An import is not an application, so a gate keyed on imports reports reachable when nothing is reached.
 *
 * That is the same mistake as a scope guard bound to the wrong parameter: it verifies PROXIMITY and calls it EFFECT.
 * Mutation-testing found it — the gate went green on the exact shipped defect.
 *
 * So: take the `styles: [...]` array, and for each entry either read the inline backtick block or resolve the named
 * constant through the file's imports and read that.
 */
function appliedStyleSources(file, src) {
  const at = src.indexOf('styles: [');
  if (at < 0) return [];
  // To the matching `]`, counting brackets so a `[` inside a template literal cannot end it early.
  let i = at + 'styles: ['.length, depth = 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') depth--;
    i++;
  }
  const arr = src.slice(at, i);

  const out = [];
  // Inline blocks: `styles: [\`.chip { … }\`]`.
  for (const m of arr.matchAll(/`([^`]*)`/g)) out.push(m[1]);
  // Named constants: resolve each through this file's own imports.
  for (const m of arr.matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
    const imp = new RegExp(`import \\{[^}]*\\b${m[1]}\\b[^}]*\\} from '(\\.[^']*)'`).exec(src);
    if (!imp) continue;
    const base = resolve(dirname(file), imp[1]).replace(/\\/g, '/');
    const rel = base.slice(base.indexOf('client/src'));
    for (const cand of [`${rel}.ts`, `${rel}/index.ts`]) {
      try { out.push(readFileSync(cand, 'utf8')); break; } catch { /* not this one */ }
    }
  }
  return out;
}

describe('a chip class in a template can reach a rule for it', () => {
  const globalCss = readFileSync(GLOBAL_CSS, 'utf8');
  const globalChips = chipClassesDefined(globalCss);

  it('found the components to check — and the chip families they use', () => {
    // Floors it. A parser that matched nothing would report the whole client clean.
    const users = files.filter(f => chipClassesUsed(readFileSync(f, 'utf8')).size > 0);
    assert.ok(users.length >= 5, `only ${users.length} components use a chip class — the parser is wrong`);
    const all = new Set(users.flatMap(f => [...chipClassesUsed(readFileSync(f, 'utf8'))]));
    assert.ok(all.has('chip-rm') || all.has('chip-remove'),
      `no remove-button variant found among ${[...all].join(', ')} — that is the class that shipped unstyled`);
  });

  it('every component reaches a rule for every chip class it renders', () => {
    const orphans = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const used = chipClassesUsed(src);
      if (used.size === 0) continue;

      const reachable = new Set([
        ...chipClassesDefined(src),                                        // its own inline styles
        ...appliedStyleSources(f, src).flatMap(s => [...chipClassesDefined(s)]),  // a style APPLIED via styles: []
        ...globalChips,                                                    // or a global rule
      ]);
      for (const cls of used) {
        if (!reachable.has(cls)) orphans.push(`${f.replace('client/src/app/', '')} → .${cls}`);
      }
    }
    assert.deepEqual(orphans, [],
      'these render a chip class with no rule in reach, so the element falls back to browser defaults — an unstyled '
      + '<button> is oversized and collides with the label beside it, and nothing errors:\n  ' + orphans.join('\n  '));
  });

  it('the chip-INPUT rules live in one place, so the three copies cannot drift again', () => {
    // Scoped to the input family — `chip-wrap`, `chip-rm`, `chip-field` — because that is the family that had three
    // identical copies (`space-dialog.styles.ts`, `prop-schema-table`, `schema-library`) and the one whose absence
    // caused the reported defect. They were confirmed identical before consolidating, so it changed no pixels.
    //
    // **A SECOND family exists and is deliberately left alone.** `brain-form.styles.ts` defines `.chip`, `.chip-name`,
    // `.chip-remove` and `.chip-list` — a visually different chip used across the brain tabs — and `graph.styles.ts`
    // has its own. Folding those into one constant would change how the brain UI looks, which is not something to do
    // as a side effect of fixing an unstyled button. Asserting one home for ALL chip rules would have demanded exactly
    // that, so this asserts one home for the family that was broken and names the family that was not.
    //
    // What the two families DO share is `.chip` itself, which is why the next assertion exists.
    const INPUT_FAMILY = ['chip-wrap', 'chip-rm', 'chip-field'];
    const definers = files.filter(f => {
      if (f.endsWith('shared/chip.styles.ts')) return false;
      const defined = chipClassesDefined(readFileSync(f, 'utf8'));
      return INPUT_FAMILY.some(c => defined.has(c));
    });
    assert.deepEqual(definers, [],
      'the chip-input rules are defined outside shared/chip.styles.ts, which is how copies drift apart: '
      + definers.join(', '));
  });

  it('no component pulls in BOTH chip families, because they both define `.chip`', () => {
    // `.chip` is defined by the input family and by the brain family with different padding, colour and display. A
    // component importing both would get whichever came last in its styles array — a difference that shows up as a
    // slightly wrong chip and reads as a CSS mystery. Cheap to forbid, and nothing needs both today.
    const both = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // `\b` matters: /CHIP_STYLES/ is a SUBSTRING of BRAIN_CHIP_STYLES, so the naive test named every brain
      // component as importing both families. A gate that cries wolf on nine files is a gate people switch off.
      if (/\bCHIP_STYLES\b/.test(src) && /\bBRAIN_CHIP_STYLES\b/.test(src)) both.push(f);
    }
    assert.deepEqual(both, [],
      `these import both chip families, so \`.chip\` resolves by array order: ${both.join(', ')}`);
  });
});
