/**
 * Every style property the graph sets must be one cytoscape actually implements.
 *
 * ## The bug this exists for
 *
 * The graph stylesheet set `shadow-blur`, `shadow-color`, `shadow-opacity` and `shadow-offset-x/y` across
 * seven selectors. Those are **cytoscape 2** properties. Cytoscape 3 removed them — the strings do not
 * appear anywhere in its bundle — and an unknown style property is silently discarded rather than warned
 * about. So the depth-tapering glow the module's own comment described had never once been painted, and
 * nothing anywhere said so.
 *
 * It compiled because each `style` block ended in `as any`. That is the whole shape of the defect: the
 * cast was not documenting a boundary where the type is unknowable, it was suppressing the one check that
 * could have noticed. The properties are now typed, so a removed property fails the build — but the build
 * only sees what the TYPINGS declare, and typings can lag a major version. This gate reads the shipped
 * RUNTIME instead, which is the thing that actually decides whether a property does anything.
 *
 * ## Why the runtime bundle rather than the .d.ts
 *
 * A property present in the typings and absent from the runtime is exactly the failure above, and only the
 * runtime can tell you. Checking both would be checking the same claim twice through the weaker copy.
 *
 * Run: node --test testing/standalone/graph-styles-exist-in-cytoscape.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const STYLESHEET = join(ROOT, 'client/src/app/pages/graph/graph-cytoscape.ts');
const BUNDLE = join(ROOT, 'node_modules/cytoscape/dist/cytoscape.cjs.js');

/** The body of `graphStylesheet`, so quoted keys elsewhere in the module are not mistaken for style props. */
function stylesheetBody(src) {
  const start = src.indexOf('function graphStylesheet');
  assert.notEqual(start, -1, 'graphStylesheet() not found — this gate is pointed at the wrong thing');
  const end = src.indexOf('\n}', start);
  assert.notEqual(end, -1, 'could not find the end of graphStylesheet()');
  return src.slice(start, end);
}

/**
 * Style property names: a quoted kebab-case key followed by a colon.
 *
 * Values are quoted too (`'cover'`, `'data(label)'`, `'110px'`) but are never followed by a colon, so the
 * trailing `:` is what separates a key from a value.
 */
function styleProps(body) {
  const props = new Set();
  for (const m of body.matchAll(/'([a-z][a-z0-9-]*)'\s*:/g)) props.add(m[1]);
  return [...props].sort();
}

describe('the graph only sets style properties cytoscape implements', () => {
  const src = readFileSync(STYLESHEET, 'utf8');
  const props = styleProps(stylesheetBody(src));

  it('read a real bundle and a real stylesheet', () => {
    // Floors both enumerations. A missing bundle greps empty exactly like an absent property does — which
    // is the mistake that nearly shipped this gate backwards — so the file's existence is asserted, not
    // assumed, and the property list must be substantial before any conclusion is drawn from it.
    assert.ok(existsSync(BUNDLE), `cytoscape bundle not found at ${BUNDLE} — run npm install`);
    assert.ok(readFileSync(BUNDLE, 'utf8').length > 1_000_000, 'cytoscape bundle is implausibly small');
    assert.ok(props.length >= 25, `only extracted ${props.length} style properties — the matcher is broken`);
  });

  it('distinguishes a real property from a removed one', () => {
    // The positive control. Without it, a gate that could not read the bundle at all would report that
    // every property is fine, which is the most dangerous way for this check to fail.
    const bundle = readFileSync(BUNDLE, 'utf8');
    assert.ok(bundle.includes("'text-outline-width'"), 'a property known to exist was not found — detector broken');
    assert.ok(!bundle.includes("'shadow-blur'"),
      'cytoscape now ships `shadow-blur`. If it was reinstated, this control needs re-aiming at another '
      + 'genuinely-absent property — but check first whether the graph should go back to using it.');
  });

  it('every property in the stylesheet exists in the shipped cytoscape', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    const missing = props.filter(p => !bundle.includes(`'${p}'`));
    assert.deepEqual(missing, [],
      'these style properties are not implemented by the installed cytoscape, so they are silently '
      + 'discarded at render time and whatever they were meant to do never happens. Either the property '
      + 'was removed in a major version and needs its modern equivalent (`shadow-*` became `underlay-*`), '
      + 'or it is a typo. Do not silence this with a cast — a cast is what hid it last time.');
  });

  it('no style block is cast away', () => {
    // The cast is what made the above possible for as long as it did. Style blocks are fully typed now;
    // reintroducing `as any` there would disable the compiler half of this guarantee.
    const body = stylesheetBody(src);
    const casts = body.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /\bas\s+any\b/.test(l));
    assert.deepEqual(casts.map(([n, l]) => `${n}: ${l.trim()}`), [],
      'a style block is cast to `any` again. That cast is precisely what let seven selectors set a '
      + 'property cytoscape had removed. If a property is genuinely missing from the typings but present '
      + 'in the runtime, cast that ONE property and say which, rather than the whole block.');
  });
});
