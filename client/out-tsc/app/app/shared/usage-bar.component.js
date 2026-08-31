/**
 * UsageBar — one "X of Y used" bar with health thresholds (settings design system, PR-U1).
 *
 * Consolidates two separate implementations (storage's `usage-bar-*` and about's `disk-bar-*`) that
 * rendered the same concept differently. Colour tracks the fill level: ok → warn (≥ warnAtPercent) →
 * danger (≥ 95%).
 *
 * Usage:  <app-usage-bar [used]="usedGiB" [total]="limitGiB" [warnAtPercent]="80"/>
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import * as i0 from "@angular/core";
/** Pure level classifier — exported for testing. */
export function usageLevel(pct, warnAtPercent) {
    if (pct >= 95)
        return 'danger';
    if (pct >= warnAtPercent)
        return 'warn';
    return 'ok';
}
export class UsageBarComponent {
    constructor() {
        this.used = input.required(...(ngDevMode ? [{ debugName: "used" }] : /* istanbul ignore next */ []));
        this.total = input(null, ...(ngDevMode ? [{ debugName: "total" }] : /* istanbul ignore next */ []));
        this.warnAtPercent = input(80, ...(ngDevMode ? [{ debugName: "warnAtPercent" }] : /* istanbul ignore next */ []));
        this.pct = computed(() => { const t = this.total(); return t && t > 0 ? (this.used() / t) * 100 : 0; }, ...(ngDevMode ? [{ debugName: "pct" }] : /* istanbul ignore next */ []));
        this.width = computed(() => Math.min(Math.max(this.pct(), 0), 100), ...(ngDevMode ? [{ debugName: "width" }] : /* istanbul ignore next */ []));
        this.level = computed(() => usageLevel(this.pct(), this.warnAtPercent()), ...(ngDevMode ? [{ debugName: "level" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function UsageBarComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || UsageBarComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: UsageBarComponent, selectors: [["app-usage-bar"]], inputs: { used: [1, "used"], total: [1, "total"], warnAtPercent: [1, "warnAtPercent"] }, decls: 2, vars: 5, consts: [["role", "progressbar", "aria-valuemin", "0", "aria-valuemax", "100", 1, "track"], [1, "fill"]], template: function UsageBarComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "div", 0);
            i0.ɵɵdomElement(1, "div", 1);
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵattribute("aria-valuenow", ctx.pct().toFixed(0));
            i0.ɵɵadvance();
            i0.ɵɵclassMap(ctx.level());
            i0.ɵɵstyleProp("width", ctx.width(), "%");
        } }, styles: [".track[_ngcontent-%COMP%] { height: 8px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }\n    .fill[_ngcontent-%COMP%]  { height: 100%; border-radius: 4px; transition: width .4s ease, background .2s ease; }\n    \n\n\n\n    .fill.ok[_ngcontent-%COMP%]     { background: var(--state-active); }\n    .fill.warn[_ngcontent-%COMP%]   { background: var(--warning); }\n    .fill.danger[_ngcontent-%COMP%] { background: var(--error); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(UsageBarComponent, [{
        type: Component,
        args: [{ selector: 'app-usage-bar', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="track" role="progressbar" [attr.aria-valuenow]="pct().toFixed(0)" aria-valuemin="0" aria-valuemax="100">
      <div class="fill" [class]="level()" [style.width.%]="width()"></div>
    </div>
  `, styles: ["\n    .track { height: 8px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }\n    .fill  { height: 100%; border-radius: 4px; transition: width .4s ease, background .2s ease; }\n    /* --state-active, not --accent: \"usage is fine\" is a fact, and warn/danger below are already semantic, so a\n       themed brand colour recoloured only the healthy state \u2014 the one an operator glances at to confirm nothing\n       is wrong. Same value as the default accent, so the default theme is unchanged. */\n    .fill.ok     { background: var(--state-active); }\n    .fill.warn   { background: var(--warning); }\n    .fill.danger { background: var(--error); }\n  "] }]
    }], null, { used: [{ type: i0.Input, args: [{ isSignal: true, alias: "used", required: true }] }], total: [{ type: i0.Input, args: [{ isSignal: true, alias: "total", required: false }] }], warnAtPercent: [{ type: i0.Input, args: [{ isSignal: true, alias: "warnAtPercent", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(UsageBarComponent, { className: "UsageBarComponent", filePath: "app/shared/usage-bar.component.ts", lineNumber: 41 }); })();
