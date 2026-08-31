/**
 * SettingsCard — the standard grouping primitive for settings screens (design system, PR-U1).
 *
 * Replaces ad-hoc `.section` blocks / raw label-value grids / inline-styled `div`s with one card:
 * header (icon + title + one-line purpose + a status-pill slot) over a body. Keeps every settings
 * page visually consistent and scannable.
 *
 * Usage:
 *   <app-settings-card icon="image" heading="Vision" purpose="Captions uploaded images.">
 *     <app-status-pill pill variant="active">Local · Ollama</app-status-pill>
 *     ...body...
 *   </app-settings-card>
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
const _c0 = [[["", "pill", ""]], "*"];
const _c1 = ["[pill]", "*"];
function SettingsCardComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 2);
    i0.ɵɵelement(1, "ph-icon", 6);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("name", ctx_r0.icon())("size", 18);
} }
function SettingsCardComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.purpose());
} }
export class SettingsCardComponent {
    constructor() {
        /** Optional leading ph-icon name. */
        this.icon = input('', ...(ngDevMode ? [{ debugName: "icon" }] : /* istanbul ignore next */ []));
        this.heading = input.required(...(ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []));
        this.purpose = input('', ...(ngDevMode ? [{ debugName: "purpose" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function SettingsCardComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SettingsCardComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SettingsCardComponent, selectors: [["app-settings-card"]], inputs: { icon: [1, "icon"], heading: [1, "heading"], purpose: [1, "purpose"] }, ngContentSelectors: _c1, decls: 11, vars: 3, consts: [[1, "card"], [1, "card-h"], [1, "ic"], [1, "t"], [1, "pillslot"], [1, "card-b"], [3, "name", "size"]], template: function SettingsCardComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵprojectionDef(_c0);
            i0.ɵɵelementStart(0, "section", 0)(1, "header", 1);
            i0.ɵɵconditionalCreate(2, SettingsCardComponent_Conditional_2_Template, 2, 2, "span", 2);
            i0.ɵɵelementStart(3, "div", 3)(4, "h3");
            i0.ɵɵtext(5);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(6, SettingsCardComponent_Conditional_6_Template, 2, 1, "p");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "div", 4);
            i0.ɵɵprojection(8);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(9, "div", 5);
            i0.ɵɵprojection(10, 1);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.icon() ? 2 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.heading());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.purpose() ? 6 : -1);
        } }, dependencies: [PhIconComponent], styles: [".card[_ngcontent-%COMP%] { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }\n    .card-h[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 12px; padding: 15px 18px; }\n    .ic[_ngcontent-%COMP%] { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none;\n          background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .t[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n    .t[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin: 0; font-size: 15px; font-weight: 620; }\n    .t[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]  { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n    .pillslot[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; }\n    .card-b[_ngcontent-%COMP%] { padding: 4px 18px 18px; border-top: 1px solid var(--border-muted); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SettingsCardComponent, [{
        type: Component,
        args: [{ selector: 'app-settings-card', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [PhIconComponent], template: `
    <section class="card">
      <header class="card-h">
        @if (icon()) { <span class="ic"><ph-icon [name]="icon()" [size]="18"/></span> }
        <div class="t">
          <h3>{{ heading() }}</h3>
          @if (purpose()) { <p>{{ purpose() }}</p> }
        </div>
        <div class="pillslot"><ng-content select="[pill]"/></div>
      </header>
      <div class="card-b"><ng-content/></div>
    </section>
  `, styles: ["\n    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }\n    .card-h { display: flex; align-items: center; gap: 12px; padding: 15px 18px; }\n    .ic { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none;\n          background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .t { flex: 1; min-width: 0; }\n    .t h3 { margin: 0; font-size: 15px; font-weight: 620; }\n    .t p  { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n    .pillslot { display: flex; align-items: center; gap: 8px; }\n    .card-b { padding: 4px 18px 18px; border-top: 1px solid var(--border-muted); }\n  "] }]
    }], null, { icon: [{ type: i0.Input, args: [{ isSignal: true, alias: "icon", required: false }] }], heading: [{ type: i0.Input, args: [{ isSignal: true, alias: "heading", required: true }] }], purpose: [{ type: i0.Input, args: [{ isSignal: true, alias: "purpose", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SettingsCardComponent, { className: "SettingsCardComponent", filePath: "app/shared/settings-card.component.ts", lineNumber: 47 }); })();
