/**
 * A component that renders `.dialog-backdrop` must carry the rules that make it a dialog.
 *
 * ## What happened
 *
 * `tokens.component.ts` defined `.dialog-backdrop` and `.dialog`. The create-token markup lived inside it and
 * was styled by them. Extracting that markup into `token-create-dialog.component.ts` moved the template and
 * **left the CSS behind** — and Angular scopes component styles, so the new component inherited nothing.
 *
 * The result was a "dialog" that rendered as a plain full-width block at the top of the page: no backdrop, no
 * centring, no panel, pushing the token list down the screen. Nothing failed. The template compiled, the
 * component rendered, every unit test passed. The owner found it by looking at the page:
 *
 *   > "ux on the token page is really bad and does not look like we mocked... its also no pop-up"
 *
 * That is the failure mode of a per-component copy of shared CSS: it breaks at the exact moment the markup
 * moves, and it breaks silently, because a missing style is not an error anywhere in the toolchain.
 *
 * ## What this asserts
 *
 * Any component whose template contains `.dialog-backdrop` must either import `DIALOG_STYLES` or define the
 * backdrop rule itself. Importing is preferred and is what new dialogs should do — a constant cannot be left
 * behind by a move — but a component that spells the rules out is styled correctly, and this gate is about
 * "is it styled", not "is it DRY".
 *
 * Run: node --test testing/standalone/dialogs-carry-their-own-shell.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** git, not readdir: a scratch copy of a component outside the repo is not something to gate on. */
const files = execSync('git ls-files "client/src/**/*.ts"', { encoding: 'utf8' })
  .trim().split('\n').filter(f => f && !f.endsWith('.spec.ts'));

const USES_BACKDROP = /class="dialog-backdrop"/;
/** The rule itself, not the class name — a selector mentioned in a comment styles nothing. */
const DEFINES_BACKDROP = /\.dialog-backdrop\s*\{/;
const IMPORTS_SHELL = /styles:\s*\[[^\]]*DIALOG_STYLES/;

describe('every dialog carries the shell it renders', () => {
  const hosts = files.filter(f => USES_BACKDROP.test(readFileSync(f, 'utf8')));

  it('finds the dialogs it is meant to be checking', () => {
    // A gate that enumerates nothing passes vacuously, and would keep passing if the class were renamed.
    assert.ok(hosts.length >= 4, `expected several dialog components, found ${hosts.length}`);
  });

  it('each one either imports DIALOG_STYLES or defines the backdrop itself', () => {
    const unstyled = hosts.filter(f => {
      const src = readFileSync(f, 'utf8');
      return !IMPORTS_SHELL.test(src) && !DEFINES_BACKDROP.test(src);
    });
    assert.deepEqual(unstyled, [],
      `${unstyled.join(', ')} render a .dialog-backdrop with no rules for it. Angular scopes component `
      + 'styles, so this renders as a plain full-width block instead of a modal — and nothing in the build, '
      + 'the types or the tests says so.');
  });

  it('the shared constant actually contains the rules, so importing it is not a no-op', () => {
    // The other half. A component could import an EMPTY constant and satisfy the check above while
    // rendering exactly as badly as before.
    const shell = readFileSync('client/src/app/pages/settings/dialog.styles.ts', 'utf8');
    assert.match(shell, DEFINES_BACKDROP, 'DIALOG_STYLES no longer defines .dialog-backdrop');
    assert.match(shell, /position:\s*fixed/, 'without fixed positioning the backdrop is an inline block');
    assert.match(shell, /\.dialog\s*\{/, 'the panel rule is missing, so the dialog has no width or padding');
  });
});
