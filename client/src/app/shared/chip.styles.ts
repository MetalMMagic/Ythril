/**
 * The chip-input rules, in ONE place, because a component that renders a chip and does not carry them shows the
 * browser's defaults instead.
 *
 * ## The defect that produced this file
 *
 * breituai-platform, 2026-08-12T2230Z: *"the schema editor's enum-value remove buttons are oversized and clip their
 * own labels"*. They were unstyled. `schema-type-editor.component.ts` renders `.chip-wrap`, `.chip`, `.chip-rm` and
 * `.chip-field`, and its only stylesheet was `SCHEMA_MD_STYLES`, which defines none of them — so `.chip-rm`, a
 * `<button>`, rendered with the browser's border, background, padding and ~13px font inside a `<span>` with no
 * inline-flex and no padding. Oversized, and colliding with the label beside it. Exactly as reported.
 *
 * **Nothing was wrong with the CSS; the component simply never saw it.** Angular scopes component styles, so when the
 * editor body was extracted out of `space-schema-tab.component.ts` — which does carry these rules — the styles did not
 * follow the markup. There are no global `.chip` rules in `styles.scss` to fall back on, and `chip-styles-reach-their-
 * markup.test.js` now fails when a component uses a chip class it cannot reach.
 *
 * ## Why a shared const rather than a fourth copy
 *
 * `space-dialog.styles.ts` already warned about this: *"Rather than paste ~90 lines into each of the six components —
 * five copies free to drift apart — they share this one const."* The chip block had nevertheless been copied into
 * `prop-schema-table` and `schema-library` verbatim. Three identical copies were confirmed identical before being
 * replaced by this one, so consolidating changed no pixels.
 *
 * It lives in `shared/` rather than beside the spaces dialog because the consumers span three feature areas: settings,
 * the schema library, and the shared property table.
 */
export const CHIP_STYLES = `
.chip-wrap {
  display:flex; flex-wrap:wrap; gap:4px; align-items:center;
  border:1px solid var(--border); border-radius:var(--radius-sm);
  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;
}
.chip {
  display:inline-flex; align-items:center; gap:3px;
  background:color-mix(in srgb,var(--accent) 15%,transparent);
  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;
}
.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }
.chip-rm:hover { color:var(--danger); }
.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }
`;
