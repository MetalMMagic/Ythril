/**
 * SummaryStrip — the operator-first "what's the state" row that sits atop a settings/list page
 * (design system, PR-U1). No page had one before; it's the highest-leverage shared add from the audit.
 *
 * Give it the headline stats (counts / rollups) and colour the ones that need attention; project extra
 * content (e.g. a usage bar) after them.
 *
 * Usage:
 *   <app-summary-strip heading="Tokens"
 *     [items]="[{label:'Active', value:4}, {label:'Expiring', value:1, variant:'warn'}]"/>
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import * as i0 from "@angular/core";
const _c0 = ["*"];
const _forTrack0 = ($index, $item) => $item.label;
function SummaryStripComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.heading());
} }
function SummaryStripComponent_For_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 3)(1, "span", 5);
    i0.ɵɵtext(2);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(3, "span", 6);
    i0.ɵɵtext(4);
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const it_r2 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵclassMap(it_r2.variant ?? "");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(it_r2.value);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(it_r2.label);
} }
export class SummaryStripComponent {
    constructor() {
        this.heading = input('', ...(ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []));
        this.items = input([], ...(ngDevMode ? [{ debugName: "items" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function SummaryStripComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SummaryStripComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SummaryStripComponent, selectors: [["app-summary-strip"]], inputs: { heading: [1, "heading"], items: [1, "items"] }, ngContentSelectors: _c0, decls: 7, vars: 1, consts: [[1, "summary"], [1, "summary-h"], [1, "items"], [1, "item"], [1, "extra"], [1, "v"], [1, "l"]], template: function SummaryStripComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵprojectionDef();
            i0.ɵɵdomElementStart(0, "div", 0);
            i0.ɵɵconditionalCreate(1, SummaryStripComponent_Conditional_1_Template, 2, 1, "div", 1);
            i0.ɵɵdomElementStart(2, "div", 2);
            i0.ɵɵrepeaterCreate(3, SummaryStripComponent_For_4_Template, 5, 4, "div", 3, _forTrack0);
            i0.ɵɵdomElementStart(5, "div", 4);
            i0.ɵɵprojection(6);
            i0.ɵɵdomElementEnd()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.heading() ? 1 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.items());
        } }, styles: [".summary[_ngcontent-%COMP%] { border: 1px solid var(--border); border-radius: 10px;\n               background: linear-gradient(180deg, var(--bg-surface), var(--bg-primary)); overflow: hidden; }\n    .summary-h[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; padding: 10px 16px 8px;\n                 color: var(--text-muted); font-size: 11px; font-weight: 600;\n                 text-transform: uppercase; letter-spacing: .07em; }\n    .items[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 8px 28px; padding: 12px 16px;\n             border-top: 1px solid var(--border-muted); align-items: center; }\n    .item[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 1px; }\n    .v[_ngcontent-%COMP%] { font-size: 20px; font-weight: 650; line-height: 1.1; font-variant-numeric: tabular-nums; color: var(--text-primary); }\n    \n\n\n\n\n    .v.active[_ngcontent-%COMP%], .v.ok[_ngcontent-%COMP%] { color: var(--state-active); }\n    .v.warn[_ngcontent-%COMP%]  { color: var(--warning); }\n    .v.error[_ngcontent-%COMP%] { color: var(--error); }\n    .v.pending[_ngcontent-%COMP%] { color: var(--info); }\n    .l[_ngcontent-%COMP%] { font-size: 11.5px; color: var(--text-secondary); }\n    .extra[_ngcontent-%COMP%] { margin-left: auto; display: flex; align-items: center; gap: 12px; flex: 1; min-width: 180px; justify-content: flex-end; }\n    @media (max-width: 560px) { .items[_ngcontent-%COMP%] { gap: 12px 20px; } .extra[_ngcontent-%COMP%] { margin-left: 0; justify-content: flex-start; } }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SummaryStripComponent, [{
        type: Component,
        args: [{ selector: 'app-summary-strip', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="summary">
      @if (heading()) { <div class="summary-h">{{ heading() }}</div> }
      <div class="items">
        @for (it of items(); track it.label) {
          <div class="item">
            <span class="v" [class]="it.variant ?? ''">{{ it.value }}</span>
            <span class="l">{{ it.label }}</span>
          </div>
        }
        <div class="extra"><ng-content/></div>
      </div>
    </div>
  `, styles: ["\n    .summary { border: 1px solid var(--border); border-radius: 10px;\n               background: linear-gradient(180deg, var(--bg-surface), var(--bg-primary)); overflow: hidden; }\n    .summary-h { display: flex; align-items: center; gap: 8px; padding: 10px 16px 8px;\n                 color: var(--text-muted); font-size: 11px; font-weight: 600;\n                 text-transform: uppercase; letter-spacing: .07em; }\n    .items { display: flex; flex-wrap: wrap; gap: 8px 28px; padding: 12px 16px;\n             border-top: 1px solid var(--border-muted); align-items: center; }\n    .item { display: flex; flex-direction: column; gap: 1px; }\n    .v { font-size: 20px; font-weight: 650; line-height: 1.1; font-variant-numeric: tabular-nums; color: var(--text-primary); }\n    /* --state-active, not --accent. Both of these report a FACT about the system, and its siblings below already\n       read semantic tokens \u2014 so a themed brand colour moved two of the five and left three alone. Found by\n       auditing every state colour rather than only the pill a red theme happened to surface.\n       The value is the default accent, so nothing changes on the default theme. */\n    .v.active, .v.ok { color: var(--state-active); }\n    .v.warn  { color: var(--warning); }\n    .v.error { color: var(--error); }\n    .v.pending { color: var(--info); }\n    .l { font-size: 11.5px; color: var(--text-secondary); }\n    .extra { margin-left: auto; display: flex; align-items: center; gap: 12px; flex: 1; min-width: 180px; justify-content: flex-end; }\n    @media (max-width: 560px) { .items { gap: 12px 20px; } .extra { margin-left: 0; justify-content: flex-start; } }\n  "] }]
    }], null, { heading: [{ type: i0.Input, args: [{ isSignal: true, alias: "heading", required: false }] }], items: [{ type: i0.Input, args: [{ isSignal: true, alias: "items", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SummaryStripComponent, { className: "SummaryStripComponent", filePath: "app/shared/summary-strip.component.ts", lineNumber: 63 }); })();
