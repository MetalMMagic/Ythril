/**
 * Every editable control on the Models settings tab can disable itself.
 *
 * ## The failure this prevents
 *
 * Instance model configuration can be pinned by environment variables. When a field is pinned the UI must
 * render its input disabled, because the alternative is silent: the operator types a value, presses Save,
 * and the environment wins. Nothing errors. The field simply shows the old value again on reload, and the
 * obvious conclusion is that the save failed rather than that the field was never theirs to set.
 *
 * ## Why the invariant is "has a `[disabled]` binding" and not something cleverer
 *
 * This came out of the A-L2-5 angle — adding a seventh model provider should not mean copying a block and
 * hoping. The tab has six provider blocks written out by hand, so copying is exactly what it does mean, and
 * a copied block is where a new field loses its guard.
 *
 * The first two attempts at this gate encoded a model of the providers, and both were wrong:
 *
 *   - Discovering providers by `<prefix>Configured()` swept up `assistConfigured`, `vlmConfigured` and
 *     `faceExternalConfigured`, which are internal predicates, not editable blocks.
 *   - Discovering by `<prefix>Locked()` and then demanding that exact lock on each field reported
 *     `faceApiKeyInput` as unguarded. It is guarded — by `faceExternalLocked()`, because the key belongs to
 *     the external-face block. The heuristic was wrong, not the code.
 *
 * And the guards are not even uniform in shape: six providers use a `<prefix>Locked()` helper while the
 * vision and speech blocks call `isLocked('vision.apiKey')` directly. Both are correct. A gate that knew
 * about providers would have had to encode that too, and would have been wrong a third time.
 *
 * So it asserts the thing that is actually true of all of them and needs no taxonomy: an `ngModel`-bound
 * control on this tab has a `[disabled]` binding. What it binds to is the author's business.
 *
 * Run: node --test testing/standalone/model-config-controls-can-lock.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TAB = 'client/src/app/pages/settings/media-processing/models-tab.component.ts';

/** Each `<input>`/`<select>` as its own chunk, since an element's attributes span several lines. */
function formElements(src) {
  return src.split(/<(?=input\b|select\b)/).slice(1)
    .map(s => { const i = s.indexOf('>'); return i === -1 ? s : s.slice(0, i + 1); });
}

describe('an env-pinnable model setting cannot be rendered as editable', () => {
  const src = readFileSync(join(ROOT, TAB), 'utf8');
  const bound = formElements(src).filter(el => el.includes('[(ngModel)]'));

  it('found the tab and its controls', () => {
    // Floors the enumeration. A regex that stopped matching would leave `bound` empty, and an empty
    // "everything passed" is indistinguishable from a real pass — which is how the earlier version of
    // this gate nearly shipped inverted.
    assert.ok(src.includes('models-tab') || src.length > 10_000, 'the tab source looks wrong');
    assert.ok(bound.length >= 25,
      `only found ${bound.length} ngModel-bound controls on the Models tab — the element split is broken`);
  });

  it('every bound control has a [disabled] binding', () => {
    const naked = bound
      .filter(el => !el.includes('[disabled]'))
      .map(el => el.replace(/\s+/g, ' ').slice(0, 120));
    assert.deepEqual(naked, [],
      'this control edits instance model configuration but can never disable itself. If an environment '
      + 'variable pins the value, the operator edits the field, saves, and the environment silently wins — '
      + 'which reads as a broken save rather than a field that was never theirs to set. Add '
      + '`[disabled]="s.<provider>Locked(\'<field>\')"`, or `s.isLocked(\'<path>\')` for a block with no '
      + 'per-provider helper. Both shapes are in use and both are fine.');
  });

  it('the detector can tell a guarded control from an unguarded one', () => {
    // Positive control. Without it, a change that made `formElements` return whole-file blobs would find
    // `[disabled]` somewhere in every "element" and report perfect health.
    const guarded = '<input [(ngModel)]="s.x" [disabled]="s.xLocked(\'y\')" />';
    const unguarded = '<input [(ngModel)]="s.x" />';
    const found = formElements(`${guarded}${unguarded}`).filter(el => el.includes('[(ngModel)]'));
    assert.equal(found.length, 2, 'the element split did not separate two adjacent controls');
    assert.equal(found.filter(el => !el.includes('[disabled]')).length, 1,
      'the detector cannot distinguish a guarded control from an unguarded one');
  });
});
