/**
 * A component that RENDERS a shared class must carry a stylesheet defining it.
 *
 * ## The failure this exists for, which has now happened twice to one component
 *
 * Angular scopes component styles. So a template using `.pdet-fields` inside a component whose `styles` array
 * does not define it renders with browser defaults — no error, no warning, no console line, and the component
 * still works. It is invisible to every other gate here: it type-checks, it builds, its specs pass, and the
 * only thing that reports it is somebody looking at the screen.
 *
 * `schema-type-editor.component.ts` was extracted out of `space-schema-tab.component.ts` and left behind:
 *
 *  - `CHIP_STYLES` — the enum remove button rendered as an oversized browser control. Reported by
 *    the canary operator, fixed, and a comment was added to the styles array saying why it mattered.
 *  - `PROP_TABLE_STYLES` — the SAME extraction, undetected for longer. The owner reported it on 2026-08-15
 *    with a screenshot: the Required pill rendered as a raw checkbox with its label wrapped underneath, and
 *    the property detail card lost its column grid and its padding, so every field ran the full width of the
 *    dialog with its label against the border.
 *
 * A comment did not prevent the second one, because the comment was on the const that WAS there.
 *
 * ## Why it resolves what a component CARRIES rather than naming one const
 *
 * The first version of this file asked "does the component mention `CHIP_STYLES`?" and reported five brain
 * components as broken. They were not: `.chip` is defined twice in this codebase, by `chip.styles.ts` for
 * schema enum chips and by `brain-form.styles.ts` for record-reference chips, and those five carry the second
 * one. A gate that cannot tell those apart reports healthy code, and a gate that reports healthy code gets
 * switched off — at which point it is not protecting the thing it was written for.
 *
 * So it resolves the `styles: [...]` array properly: inline literals, imported consts, and consts those
 * interpolate. A class is covered if ANY of them defines it, which is exactly what the browser will do.
 *
 * ## What is deliberately NOT checked
 *
 * Global classes. `.field`, `.badge`, `.btn`, `.icon-btn` live in `styles.css` and are correct to use
 * anywhere, so only classes owned by a SHARED style module are candidates. Everything else is out of scope,
 * which is what keeps a failure here always real.
 *
 * Run: node --test testing/standalone/shared-styles-reach-their-renderers.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { execSync } from 'node:child_process';

/** Shared style modules whose classes a renderer must carry. Not every style file — these are the shared ones. */
const SHARED = [
  'client/src/app/shared/prop-table.styles.ts',
  'client/src/app/shared/chip.styles.ts',
  'client/src/app/pages/brain/brain-form.styles.ts',
  // Added after the file-manager split (G-3) put five components' rules in one module and left two classes
  // behind on the PAGE with no rule that could reach them. This gate is written for exactly that failure and
  // was not asked about the module the whole split created.
  'client/src/app/pages/files/file-manager.styles.ts',
];

const read = (p) => readFileSync(p, 'utf8');

/**
 * Comment-stripped, or the gate fires on the prose explaining it, and passes on prose that names a const.
 *
 * LINE comments first, then block. The other order is itself gated in this suite: a block-open written inside
 * a line comment opens a phantom block that swallows every line until the next close, and the gate then reads
 * code that is not there.
 */
const strip = (src) => src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const posix = (p) => normalize(p).replace(/\\/g, '/');

/**
 * Classes a stylesheet OWNS: the subject of each rule, never a descendant it merely reaches into.
 *
 * `.pdet-fields .field label` owns `pdet-fields`. It does NOT own `field` — that is a global class this module
 * styles within its own scope, and treating it as owned made the first run of this gate report nine healthy
 * components for rendering `.field`, which every form in the app does.
 *
 * So: per rule, per comma-separated selector, take the FIRST compound and read its classes. A compound keeps
 * both halves of `.prop-row.prow-open`, because those are one element.
 */
function addOwnedClasses(into, css) {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of body.matchAll(/(^|[{}])\s*([^{}@;]+?)\s*\{/g)) {
    for (const sel of m[2].split(',')) {
      const first = sel.trim().split(/[\s>+~]/)[0] ?? '';
      for (const c of first.matchAll(/\.([a-z][a-z0-9-]*)/gi)) into.add(c[1]);
    }
  }
}

/** `import { A, B } from './x'` resolved to the file `A` came from, relative to the importer. */
function resolveImport(src, ident, fromFile) {
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim());
    if (!names.includes(ident)) continue;
    if (!m[2].startsWith('.')) return null;                       // a package, never one of ours
    const p = posix(join(dirname(fromFile), m[2]) + '.ts');
    return existsSync(p) ? p : null;
  }
  return null;
}

/**
 * Every class a style module defines, following interpolation into the modules it composes.
 *
 * `seen` stops a cycle, and stops re-reading a const that two importers share.
 */
function classesFromModule(file, seen = new Set()) {
  const out = new Set();
  if (seen.has(file)) return out;
  seen.add(file);
  const src = read(file);
  const body = strip(src);
  addOwnedClasses(out, body);
  for (const m of body.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)) {
    const p = resolveImport(src, m[1], file);
    if (p) for (const c of classesFromModule(p, seen)) out.add(c);
  }
  return out;
}

/**
 * The `styles: [...]` array, scanned with balanced brackets rather than a lazy regex.
 *
 * A template literal inside the array can contain a closing bracket — an attribute selector does — so a lazy
 * match stops inside the CSS and silently reports half an array. Reading a gate's input wrong is how it fails
 * open, which is the failure this whole file exists to prevent.
 */
function stylesArray(src) {
  const at = src.search(/\bstyles\s*:\s*\[/);
  if (at === -1) return null;
  const i = src.indexOf('[', at);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === '`') { j = src.indexOf('`', j + 1); if (j === -1) return null; continue; }
    if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) return src.slice(i + 1, j);
  }
  return null;
}

/** Everything a component's own stylesheet defines: inline literals plus every const it names. */
function classesCarriedBy(file) {
  const src = read(file);
  const arr = stylesArray(strip(src));
  const out = new Set();
  if (!arr) return out;
  for (const lit of arr.matchAll(/`([\s\S]*?)`/g)) addOwnedClasses(out, lit[1]);
  for (const m of arr.matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
    const p = resolveImport(src, m[1], file);
    if (p) for (const c of classesFromModule(p)) out.add(c);
  }
  return out;
}

/** Component files: tracked `.ts`, not a spec, with a decorator and an inline template. */
function componentFiles() {
  // git ls-files, never a directory walk: `dist/` and any untracked scratch component are not the repo.
  return execSync('git ls-files "client/src/**/*.ts"', { encoding: 'utf8' })
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((f) => !f.endsWith('.spec.ts'))
    .filter((f) => existsSync(f))
    .filter((f) => { const s = read(f); return s.includes('@Component') && s.includes('template:'); });
}

/** The inline template, so a class named only in a comment or a plain string does not count as rendered. */
function templateOf(src) {
  const at = src.search(/\btemplate\s*:\s*`/);
  if (at === -1) return '';
  const open = src.indexOf('`', at);
  const close = src.indexOf('`', open + 1);
  return close === -1 ? src.slice(open + 1) : src.slice(open + 1, close);
}

/** Classes a template puts on an element: a static class attribute, or a bound class binding. */
function classesUsed(tpl) {
  const used = new Set();
  for (const m of tpl.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (/^[a-z][a-z0-9-]*$/i.test(c)) used.add(c);
  }
  for (const m of tpl.matchAll(/\[class\.([a-z][a-z0-9-]*)\]/gi)) used.add(m[1]);
  return used;
}

describe('shared styles reach the components that render them', () => {
  it('every component rendering a shared class carries a stylesheet defining it', () => {
    const owned = new Map();                       // class -> the shared module that owns it
    for (const f of SHARED) for (const c of classesFromModule(f)) owned.set(c, f);
    assert.ok(owned.size > 8, `parsed only ${owned.size} shared classes — the parser is wrong, not the code`);

    const missing = [];
    for (const f of componentFiles()) {
      const src = read(f);
      const used = classesUsed(templateOf(src));
      const candidates = [...used].filter((c) => owned.has(c));
      if (!candidates.length) continue;
      const carried = classesCarriedBy(f);
      const gaps = candidates.filter((c) => !carried.has(c)).sort();
      if (gaps.length) missing.push(`${f} renders ${gaps.join(', ')} (owned by ${owned.get(gaps[0])})`);
    }

    assert.deepEqual(missing, [], `unstyled by their own component:\n  ${missing.join('\n  ')}`);
  });

  it('sees through a const that composes another', () => {
    // The exemption that makes this gate usable: `SPACE_DIALOG_STYLES` interpolates both shared modules, so a
    // component carrying only it is correctly covered. If the resolver stopped following interpolation, the
    // gate would report every such component and be switched off.
    const viaWrapper = classesFromModule('client/src/app/pages/settings/space-dialog.styles.ts');
    assert.ok(viaWrapper.has('req-toggle'), 'SPACE_DIALOG_STYLES no longer reaches PROP_TABLE_STYLES');
    assert.ok(viaWrapper.has('chip-rm'), 'SPACE_DIALOG_STYLES no longer reaches CHIP_STYLES');
  });

  it('tells two different chip families apart', () => {
    // The false positive the first version of this gate produced. `.chip` is defined by chip.styles.ts for
    // schema enum values and by brain-form.styles.ts for record references; a brain component carrying the
    // second is not missing the first.
    assert.ok(classesFromModule('client/src/app/pages/brain/brain-form.styles.ts').has('chip'));
    assert.ok(classesCarriedBy('client/src/app/pages/brain/chrono-ref-field.component.ts').has('chip'));
  });

  it('the property-table rules are defined in exactly one place', () => {
    // Two character-identical copies existed before this was extracted, and a third consumer forced the issue.
    // A re-paste is the regression this catches.
    const owner = 'client/src/app/shared/prop-table.styles.ts';
    const dupes = componentFiles()
      .concat(['client/src/app/pages/settings/space-dialog.styles.ts', 'client/src/app/pages/settings/schema-styles.ts'])
      .filter((f) => f !== owner)
      .filter((f) => /^\s*\.(pdet-fields|req-toggle|prop-table)\s*\{/m.test(strip(read(f))));
    assert.deepEqual(dupes, [], `these files redefine property-table rules that ${owner} owns`);
  });
});
