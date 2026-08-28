/**
 * The create-token dialog offers the two instance-level rights, and its shared styles actually reach it.
 *
 * ## The defect
 *
 * `draftRights` initialised `instanceAdmin` and `createSpaces` to `false` and **no control could change
 * them** — so a token that should hold either had to be created and then EDITED. The create API accepted both
 * throughout (`CreateTokenBody` declares them); the edit dialog grew the controls in #908 and nothing brought
 * them here. Reported by the canary operator 2026-08-17 §9 as the two forms presenting different rights
 * surfaces. It is one missing block, not a diverged surface.
 *
 * ## And the second half, which no existing test could have caught
 *
 * `.danger-zone`, `.danger-title` and `.permission-help` were defined inside OTHER components' style arrays.
 * Angular's emulated encapsulation scopes those, so markup here using them renders **unstyled** — and
 * `.permission-help` was already in this template before this change, already unstyled, with
 * `tokens.component.spec.ts` asserting only that *"the element is not null"*. It passed the whole time.
 *
 * That is the shape of `verify-visual-changes-with-screenshots`: a thing can pass every measurement and be
 * wrong to look at. A DOM assertion cannot see it, so this file asserts the mechanism instead — the classes
 * must come from the stylesheet this component actually imports.
 *
 * Run: npm run test:client
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const component = readFileSync('src/app/pages/settings/token-create-dialog.component.ts', 'utf8');
const shared = readFileSync('src/app/pages/settings/dialog.styles.ts', 'utf8');
const editor = readFileSync('src/app/pages/settings/token-rights-dialog.component.ts', 'utf8');

describe('create-token dialog: instance-level rights', () => {
  it('offers both flags, bound to the draft', () => {
    for (const flag of ['instanceAdmin', 'createSpaces']) {
      expect(component).toContain(`draftRights().${flag}`);
      expect(component).toContain(`setFlag('${flag}',`);
    }
  });

  it('can actually change them — a checkbox with no handler is the defect wearing a control', () => {
    expect(component).toMatch(/setFlag\(key: 'instanceAdmin' \| 'createSpaces', on: boolean\)/);
    expect(component).toMatch(/this\.draftRights\.update\(/);
  });

  it('puts them OUTSIDE the spaces check, or the one case they matter most is unreachable', () => {
    /*
     * The matrix sits inside `@else` on `availableSpaces().length === 0`. A fresh instance with no spaces is
     * exactly when `createSpaces` is the right thing to grant — so nesting the flags in that branch would hide
     * them precisely when they are needed. Asserted by ORDER: the flags must come after the block that closes
     * the spaces conditional.
     */
    const spacesBranch = component.indexOf('loadingSpaces');
    const matrixClose = component.indexOf('</div>', component.indexOf('app-rights-matrix'));
    const flags = component.indexOf('tokens.rights.instanceLevel');
    expect(spacesBranch).toBeGreaterThan(-1);
    expect(flags).toBeGreaterThan(matrixClose);
  });

  it('sends them: the body carries the whole matrix, flags included', () => {
    // `rights: this.draftRights()` is what makes the controls mean anything. A body assembled field by field
    // could offer a checkbox and post without it.
    expect(component).toMatch(/rights: this\.draftRights\(\)/);
  });
});

describe('the dialog is wide enough for the matrix it contains', () => {
  it('widens itself, or two of the four areas are unreachable', () => {
    /*
     * FOUND BY SCREENSHOT, and findable no other way.
     *
     * At the shared 600px default this dialog rendered with DATA QUALITY off-screen and SCHEMA's rungs
     * clipped mid-cell — so a token could not be minted with a rung in either. Every DOM assertion passed
     * throughout: five headers present, eight rung pickers present, clientWidth 598 and scrollWidth EQUAL to
     * it, so nothing overflowed and nothing scrolled. The table was squeezed, not clipped in any way a
     * measurement notices.
     *
     * Verified after the fix at 1500px viewport: clientWidth 1398, and all four area headers inside the
     * viewport bounds.
     */
    expect(component).toMatch(/--dialog-max-width:\s*min\(1400px, 94vw\)/);
  });

  it('uses the SAME width as the rights dialog, not a second answer to one question', () => {
    const width = /--dialog-max-width:\s*(min\([^)]*\))/;
    const mine = component.match(width);
    const theirs = editor.match(width);
    expect(mine).not.toBeNull();
    expect(theirs).not.toBeNull();
    expect(mine[1]).toBe(theirs[1]);
  });
});

describe('the shared styles reach this component', () => {
  it('imports the stylesheet that defines the classes it uses', () => {
    expect(component).toContain("import { DIALOG_STYLES } from './dialog.styles'");
    // The RULE, not one spelling: DIALOG_STYLES must be in the styles array. This asserted the literal
    // `styles: [DIALOG_STYLES]` and broke the moment the array gained a second entry for the dialog width —
    // a change that honours the rule completely. A gate pinned to one spelling fails on a correct change and
    // teaches the next person to loosen it.
    expect(component).toMatch(/styles: \[\s*DIALOG_STYLES/);
  });

  for (const cls of ['danger-zone', 'danger-title', 'permission-help']) {
    it(`\`.${cls}\` is defined in DIALOG_STYLES, not in another component's scope`, () => {
      // The whole failure mode: the class exists SOMEWHERE, the markup looks right, and Angular scopes the
      // definition to a component this markup is not in.
      expect(component).toContain(`class="${cls}"`);
      expect(shared).toContain(`.${cls} {`);
    });
  }

  it('and the editor no longer keeps its own copy of the two it shared', () => {
    // Two copies of one rule is how they drift. The row styles STAY there — rotate and revoke exist only in
    // the editor, so a create form has nothing to rotate.
    expect(editor).not.toMatch(/^\s*\.danger-zone \{/m);
    expect(editor).not.toMatch(/^\s*\.danger-title \{/m);
    expect(editor).toMatch(/\.danger-row \{/);
  });
});
