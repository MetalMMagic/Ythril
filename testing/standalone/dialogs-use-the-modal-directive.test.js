/**
 * Every dialog surface goes through `ModalDirective`, so none of them hand-rolls accessibility.
 *
 * ## The finding — Accessibility & Internationalization audit lens
 *
 * `ModalDirective` is thorough: `role="dialog"`, `aria-modal`, an `aria-label`, a CDK focus trap that captures focus
 * on open and **restores it to the opener** on close, Escape, and opt-in backdrop dismissal. Its own docstring says
 * it exists so that no dialog hand-rolls this.
 *
 * One did. The file manager's full-screen preview overlay — a surface that covers the entire viewport — carried
 * `tabindex="0"` and a `#fsOverlay` template ref, and **the ref was never referenced from TypeScript**: focus had
 * been thought about and never wired. So:
 *
 *   - no `role="dialog"` / `aria-modal`, so a screen reader announced nothing and the page behind stayed in the
 *     accessibility tree;
 *   - **no focus trap** — Tab walked out of a full-screen overlay into a page that is covered and invisible;
 *   - no focus restore on close.
 *
 * Escape *was* handled, by the component's own document keydown listener, and that is worth stating because it means
 * the gap was narrower than it first looked. The rest is what `appModal` supplies in one attribute.
 *
 * ## Checked and CLEAN in the same pass, recorded so it is not re-derived
 *
 * - **Reduced motion.** Three components declare a keyframe animation with no local guard, which looked like a
 *   finding until `styles.scss` was read: a global `@media (prefers-reduced-motion: reduce)` block neutralises
 *   *every* animation and transition (`*:not(.spinner)`), exempting `.spinner` deliberately so loading indicators
 *   keep turning. A per-component sweep was measuring the wrong thing.
 * - **The shell's mobile drawer backdrop** is a `<button>` with an `aria-label`, dismissible by click — correct for
 *   a navigation drawer, which is not a modal dialog.
 * - **`loading-overlay`** is a spinner scrim, not a dialog, and is excluded below by name rather than by accident.
 *
 * Run: node --test testing/standalone/dialogs-use-the-modal-directive.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function clientSources(dir = join('client', 'src', 'app'), out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) clientSources(p, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const FILES = clientSources();
const read = (p) => readFileSync(p, 'utf8');

/**
 * Overlay classes that are NOT dialogs, excluded by name and with a reason.
 *
 * An allowlist rather than a heuristic: "does this overlay contain a form?" is exactly the kind of guess that makes
 * a gate wrong in both directions.
 */
const NOT_A_DIALOG = {
  'loading-overlay': 'a spinner scrim, no focusable content',
  'drawer-backdrop': 'the dismiss button for a navigation drawer, which is not a modal dialog',
};

/** Every `class="…overlay…"` / `class="…backdrop…"` in a file, minus the allowlisted ones. */
function dialogSurfaces(src) {
  const found = new Set();
  for (const m of src.matchAll(/class="([^"]*(?:overlay|backdrop)[^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!/overlay|backdrop/.test(cls)) continue;
      // BEM modifiers count as their base class: `loading-overlay--float` is the same spinner scrim as
      // `loading-overlay`, and an exact-match allowlist reported it as an unguarded dialog.
      const base = cls.split('--')[0];
      if (cls in NOT_A_DIALOG || base in NOT_A_DIALOG) continue;
      found.add(cls);
    }
  }
  return [...found];
}

describe('the sweep works before it is trusted', () => {
  it('sees the client, and finds the surface it is meant to police', () => {
    assert.ok(FILES.length > 100, `expected the client tree, found ${FILES.length} files`);
    const fm = read(join('client', 'src', 'app', 'pages', 'files', 'file-manager.component.ts'));
    assert.deepEqual(dialogSurfaces(fm), ['preview-fs-overlay'],
      'the file manager should expose exactly one dialog surface — if this changed, re-check the new one by hand');
  });

  it('the allowlist is small and reasoned', () => {
    // A growing allowlist is how this gate would quietly stop meaning anything.
    assert.ok(Object.keys(NOT_A_DIALOG).length <= 4, 'the not-a-dialog list is growing; re-justify each entry');
    for (const [cls, why] of Object.entries(NOT_A_DIALOG)) {
      assert.ok(why.length > 20, `${cls} is excluded without a real reason`);
    }
  });
});

describe('every dialog surface uses ModalDirective', () => {
  it('no component hand-rolls one', () => {
    const offenders = [];
    for (const f of FILES) {
      const src = read(f);
      const surfaces = dialogSurfaces(src);
      if (surfaces.length === 0) continue;
      if (!src.includes('appModal')) offenders.push(`${f}  →  ${surfaces.join(', ')}`);
    }
    assert.deepEqual(offenders, [],
      'these render a dialog-shaped overlay without appModal, so they have no focus trap, no role="dialog", and no '
      + 'focus restore on close — Tab walks out of the dialog into the page behind it:\n  ' + offenders.join('\n  '));
  });

  it('the full-screen preview specifically is a labelled dialog', () => {
    const fm = read(join('client', 'src', 'app', 'pages', 'files', 'file-manager.component.ts'));
    const at = fm.indexOf('class="preview-fs-overlay"');
    assert.ok(at > 0, 'the full-screen preview overlay is gone — re-anchor this gate');
    const tag = fm.slice(fm.lastIndexOf('<', at), fm.indexOf('>', at) + 1);
    assert.match(tag, /\[appModal\]/, 'the full-screen overlay must be a modal dialog');
    assert.match(tag, /transloco/, 'its aria-label must be translated, not an English literal');
    assert.doesNotMatch(tag, /#fsOverlay/,
      'the dangling template ref should be gone — it was never referenced from TypeScript, and leaving it suggests '
      + 'focus is handled somewhere it is not');
  });

  it('the directive still provides what the callers rely on', () => {
    // The gate above is only worth having while `appModal` actually means all of this.
    const dir = read(join('client', 'src', 'app', 'shared', 'modal.directive.ts'));
    assert.match(dir, /'role':\s*'dialog'/, 'role=dialog');
    assert.match(dir, /'aria-modal':\s*'true'/, 'aria-modal');
    assert.match(dir, /focusInitialElementWhenReady\(\)/, 'the focus trap must actually be entered');
    assert.match(dir, /this\.previouslyFocused\?\.focus\?\.\(\)/,
      'focus must be restored to the opener on close, or a keyboard user is dumped at the top of the page');
    assert.match(dir, /keydown\.escape/, 'Escape must dismiss');
  });
});

describe('reduced motion is handled globally, which is why per-component guards are not required', () => {
  it('the global rule exists and neutralises animation AND transition', () => {
    // Pinned because three components look unguarded and are not. Deleting this rule would make those three, and
    // everything else, animate for a user who asked for no motion — with nothing else in the tree to notice.
    const css = read(join('client', 'src', 'styles.scss'));
    const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
    assert.ok(at > 0, 'the global reduced-motion rule is gone; every component would now need its own guard');
    const block = css.slice(at, css.indexOf('\n}', at));
    assert.match(block, /animation-duration:\s*0\.01ms\s*!important/, 'animations must be neutralised');
    assert.match(block, /transition-duration:\s*0\.01ms\s*!important/, 'transitions must be neutralised');
    assert.match(block, /animation-iteration-count:\s*1\s*!important/, 'infinite animations must be stopped');
    assert.match(block, /\*:not\(\.spinner\)/,
      'the spinner exemption is deliberate — loading indicators keep turning; state it explicitly so it is not '
      + 'mistaken for an oversight');
  });
});
