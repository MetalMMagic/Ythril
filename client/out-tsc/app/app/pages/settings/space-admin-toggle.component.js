import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
/**
 * The Space Admin cell: two states, `—` and `A`.
 *
 * ## What it expresses
 *
 * A space administrator is a token holding **admin on all four areas of that space**. The server has enforced
 * that since #937 and publishes it as a derived rung on `GET /api/tokens/rights-shape`; what was missing was any
 * way to see or set it. The matrix showed four independent rungs and nothing said that all four at `admin` IS
 * administering the space — so the commonest grant meant setting four cells and hoping none was missed.
 *
 * Owner, five times over five releases, most recently as a screenshot with this column drawn in: *"i miss space
 * admin"*. It had been built once and reverted because three assertions in `rights-matrix.component.spec.ts`
 * counted `app-rung-picker` elements per row. Those assertions were about the per-area model and needed rewriting
 * by hand, which is a small job and is done in this change — reverting working UI over a test count was the wrong
 * trade and is why this took five releases.
 *
 * ## Why two states and not a rung picker
 *
 * Because it is not a rung. `read`, `write` and `admin` describe one area; this describes all four at once and has
 * exactly one meaningful value. Offering a four-position picker would imply "space read" and "space write" exist,
 * and they do not — the four columns beside it are how anything in between is said.
 *
 * ## Why it is a mirror, not a source of truth
 *
 * `on` is computed from the four cells' SHOWN values by the matrix, so a row that reached admin through the floor
 * reads as administered here. This control never holds state of its own: a column that could disagree with the four
 * cells next to it would be worse than no column.
 */
export class SpaceAdminToggleComponent {
    constructor() {
        /** Derived by the matrix from the four cells. Never stored here. */
        this.on = input.required(...(ngDevMode ? [{ debugName: "on" }] : /* istanbul ignore next */ []));
        /** The same read-only posture the rung pickers take, so one disabled matrix is uniformly disabled. */
        this.readonlyView = input(false, ...(ngDevMode ? [{ debugName: "readonlyView" }] : /* istanbul ignore next */ []));
        /** True to grant space admin, false to clear the row. The matrix writes all four areas in ONE emit. */
        this.changed = output();
    }
    static { this.ɵfac = function SpaceAdminToggleComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceAdminToggleComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceAdminToggleComponent, selectors: [["app-space-admin-toggle"]], inputs: { on: [1, "on"], readonlyView: [1, "readonlyView"] }, outputs: { changed: "changed" }, decls: 8, vars: 17, consts: [["role", "group", 1, "grp"], ["type", "button", 3, "click", "disabled"]], template: function SpaceAdminToggleComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "div", 0);
            i0.ɵɵpipe(1, "transloco");
            i0.ɵɵdomElementStart(2, "button", 1);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵdomListener("click", function SpaceAdminToggleComponent_Template_button_click_2_listener() { return ctx.changed.emit(false); });
            i0.ɵɵtext(4, "\u2013");
            i0.ɵɵdomElementEnd();
            i0.ɵɵdomElementStart(5, "button", 1);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵdomListener("click", function SpaceAdminToggleComponent_Template_button_click_5_listener() { return ctx.changed.emit(true); });
            i0.ɵɵtext(7, "A");
            i0.ɵɵdomElementEnd()();
        } if (rf & 2) {
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 11, "tokens.rights.spaceAdmin"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("on", !ctx.on());
            i0.ɵɵdomProperty("disabled", ctx.readonlyView());
            i0.ɵɵattribute("aria-pressed", !ctx.on())("title", i0.ɵɵpipeBind1(3, 13, "tokens.rights.spaceAdmin.off"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("on", ctx.on());
            i0.ɵɵdomProperty("disabled", ctx.readonlyView());
            i0.ɵɵattribute("aria-pressed", ctx.on())("title", i0.ɵɵpipeBind1(6, 15, "tokens.rights.spaceAdmin.on"));
        } }, dependencies: [TranslocoPipe], styles: ["[_nghost-%COMP%] { display: inline-flex; }\n    .grp[_ngcontent-%COMP%] { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }\n    button[_ngcontent-%COMP%] {\n      background: var(--bg-primary); color: var(--text-muted); border: 0; cursor: pointer;\n      font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1;\n      padding: 5px 8px; min-width: 24px;\n    }\n    button[_ngcontent-%COMP%]    + button[_ngcontent-%COMP%] { border-left: 1px solid var(--border); }\n    button[_ngcontent-%COMP%]:hover:not(:disabled) { color: var(--text-primary); }\n    \n\n\n    button.on[_ngcontent-%COMP%] { background: var(--state-active, var(--bg-surface)); color: var(--text-primary); font-weight: 600; }\n    button[_ngcontent-%COMP%]:disabled { cursor: default; opacity: .6; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceAdminToggleComponent, [{
        type: Component,
        args: [{ selector: 'app-space-admin-toggle', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe], template: `
    <div class="grp" role="group" [attr.aria-label]="'tokens.rights.spaceAdmin' | transloco">
      <button type="button" [class.on]="!on()" [disabled]="readonlyView()"
              [attr.aria-pressed]="!on()"
              [attr.title]="'tokens.rights.spaceAdmin.off' | transloco"
              (click)="changed.emit(false)">&ndash;</button>
      <button type="button" [class.on]="on()" [disabled]="readonlyView()"
              [attr.aria-pressed]="on()"
              [attr.title]="'tokens.rights.spaceAdmin.on' | transloco"
              (click)="changed.emit(true)">A</button>
    </div>
  `, styles: ["\n    :host { display: inline-flex; }\n    .grp { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }\n    button {\n      background: var(--bg-primary); color: var(--text-muted); border: 0; cursor: pointer;\n      font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1;\n      padding: 5px 8px; min-width: 24px;\n    }\n    button + button { border-left: 1px solid var(--border); }\n    button:hover:not(:disabled) { color: var(--text-primary); }\n    /* The ON state uses the same accent the rung pickers use for admin, so the column reads as part of the row\n       rather than as a different kind of control that happens to sit beside it. */\n    button.on { background: var(--state-active, var(--bg-surface)); color: var(--text-primary); font-weight: 600; }\n    button:disabled { cursor: default; opacity: .6; }\n  "] }]
    }], null, { on: [{ type: i0.Input, args: [{ isSignal: true, alias: "on", required: true }] }], readonlyView: [{ type: i0.Input, args: [{ isSignal: true, alias: "readonlyView", required: false }] }], changed: [{ type: i0.Output, args: ["changed"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceAdminToggleComponent, { className: "SpaceAdminToggleComponent", filePath: "app/pages/settings/space-admin-toggle.component.ts", lineNumber: 65 }); })();
