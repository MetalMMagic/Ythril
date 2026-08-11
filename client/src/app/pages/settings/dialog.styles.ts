/**
 * The modal shell: backdrop, panel, header.
 *
 * ## Why this is a shared constant and not six copies
 *
 * Angular component styles are SCOPED. `tokens.component.ts` defined `.dialog-backdrop` and `.dialog`, and
 * for as long as the create-token markup lived inside that component it was styled by them. Extracting the
 * dialog into its own component moved the markup and left the CSS behind — so the "dialog" rendered as a
 * plain block at the top of the page: full width, no backdrop, no centring, pushing the token list down.
 *
 * Nothing failed. The template compiled, the component rendered, every test passed, and the page was simply
 * wrong to look at. The owner found it, not the build: *"its also no pop-up"*.
 *
 * That is the failure mode of a per-component copy of shared CSS — it is invisible at the moment the markup
 * moves, which is exactly when it breaks. A constant both files import cannot be left behind by a move, and
 * `dialogs-carry-their-own-shell.test.js` fails any component that writes `.dialog-backdrop` in a template
 * without taking these rules with it.
 *
 * Sizing stays with the caller: dialogs legitimately differ in width (a confirm is not a schema editor), so
 * `--dialog-max-width` is a variable the host sets rather than a value baked in here.
 */
export const DIALOG_STYLES = `
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: var(--bg-scrim);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }
  .dialog {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    width: 100%;
    max-width: var(--dialog-max-width, 600px);
    max-height: 90vh;
    overflow-y: auto;
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
`;
