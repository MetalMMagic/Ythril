/**
 * Every `<ph-icon name="...">` in the client must exist in the icon registry.
 *
 * `PhIconComponent` resolves an unknown name to `ICONS[name] ?? ''` — an empty string. That renders a
 * silent, correctly-sized, completely blank space: no console error, no fallback glyph, no build
 * failure, and `ng build` cannot see it because the name is a template string rather than a symbol.
 * Three icons (`broadcast`, `export`, `stack`) shipped that way and were only found because someone
 * looked at the nav and noticed a gap.
 *
 * This scans the real templates and the real registry, so it fails the moment a fourth appears —
 * which is the only way this class of bug gets caught, since nothing else about it is observable.
 *
 * Run: node --test testing/standalone/icon-registry-coverage.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = path.join(__dirname, '..', '..', 'client', 'src', 'app');
const REGISTRY = path.join(CLIENT_SRC, 'shared', 'ph-icon.component.ts');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

/** Icon names the registry defines. */
function registeredIcons() {
  const src = fs.readFileSync(REGISTRY, 'utf8');
  const body = src.slice(src.indexOf('const ICONS'));
  return new Set([...body.matchAll(/^\s*'([a-z0-9-]+)':/gm)].map(m => m[1]));
}

/**
 * Every literal icon name the client references, however it reaches `<ph-icon>`.
 *
 * The original scan looked only for `<ph-icon name="...">`, and that blind spot has now shipped
 * three blank icons in three separate PRs:
 *
 *   - `text-align-left`, passed as `icon: 'text-align-left'` in a TypeScript object the template
 *     binds with `[name]="p.icon"`;
 *   - `file-image` and `user`, passed as `icon="..."` to a WRAPPER component (`app-model-provider-card`,
 *     `app-settings-card`) which forwards it to `<ph-icon [name]="icon()">`.
 *
 * In every case the literal is right there in the source — it just is not spelled `<ph-icon name=`.
 * So all three shapes are scanned. What genuinely cannot be checked is a name computed at runtime;
 * that is the residue, and it is much smaller than what was being missed.
 */
function usedIcons() {
  const used = new Map(); // name -> first file that uses it
  const patterns = [
    // <ph-icon name="foo">
    /<ph-icon[^>]*\bname="([a-z0-9-]+)"/g,
    // <app-settings-card icon="foo"> — any component that forwards an `icon` input
    /\bicon="([a-z0-9-]+)"/g,
    // { icon: 'foo' } in a TS object the template binds dynamically
    /\bicon:\s*'([a-z0-9-]+)'/g,
  ];
  for (const file of walk(CLIENT_SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const re of patterns) {
      for (const m of src.matchAll(re)) {
        if (!used.has(m[1])) used.set(m[1], path.relative(CLIENT_SRC, file));
      }
    }
  }
  return used;
}

describe('icon registry coverage', () => {
  it('every icon referenced in a template exists in the registry', () => {
    const registered = registeredIcons();
    const used = usedIcons();
    const missing = [...used.entries()].filter(([name]) => !registered.has(name));
    assert.deepEqual(
      missing.map(([name, file]) => `${name} (${file})`), [],
      'these render as a blank space with no error — add them to ICONS in ph-icon.component.ts',
    );
  });

  it('the scan actually finds icons, so a green result means something', () => {
    // Guards the guard: if the regex or the walk broke, "no missing icons" would be vacuously true
    // and this file would go quiet in exactly the situation it exists for.
    const used = usedIcons();
    assert.ok(used.size > 20, `expected the client to use many icons, found ${used.size}`);
    assert.ok(registeredIcons().size > 20, 'expected a populated registry');
  });

  it('the ones that shipped blank are present', () => {
    // Named explicitly: these are the regressions, and a generic assertion would not say so.
    // The first three were found by eye; the last three by widening the scan that missed them.
    const registered = registeredIcons();
    for (const name of ['broadcast', 'export', 'stack', 'text-align-left', 'file-image', 'user']) {
      assert.ok(registered.has(name), `'${name}' must be registered`);
    }
  });

  it('the scan sees icons passed through a wrapper component, not just <ph-icon> directly', () => {
    // The specific blind spot that let `file-image` and `user` ship blank. Without this, widening
    // the regex could be reverted and every test above would still pass.
    const used = usedIcons();
    assert.ok(used.has('file-image'), 'icon="..." on a wrapper component is not being scanned');
    assert.ok(used.has('text-align-left'), "icon: '...' in a TS object is not being scanned");
  });
});
