import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { UsageBarComponent, usageLevel } from '../../shared/usage-bar.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.area;
function StorageComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 3);
} }
function StorageComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "metrics.error.load"));
} }
function StorageComponent_Conditional_9_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5);
    i0.ɵɵelement(1, "span", 7);
    i0.ɵɵelementEnd();
} }
function StorageComponent_Conditional_9_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "metrics.empty"));
} }
function StorageComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, StorageComponent_Conditional_9_Conditional_0_Template, 2, 0, "div", 5)(1, StorageComponent_Conditional_9_Conditional_1_Template, 3, 3, "div", 6);
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r0.loading() ? 0 : 1);
} }
function StorageComponent_Conditional_10_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 9)(1, "div", 10);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 11);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "div", 12);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 3, "metrics.stat.limit"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "metrics.stat.unit"));
} }
function StorageComponent_Conditional_10_Conditional_30_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 16);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const h_r2 = ctx;
    i0.ɵɵproperty("variant", h_r2.variant);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, h_r2.key));
} }
function StorageComponent_Conditional_10_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13)(1, "div", 14)(2, "span", 15);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵconditionalCreate(5, StorageComponent_Conditional_10_Conditional_30_Conditional_5_Template, 3, 4, "app-status-pill", 16);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span", 17);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(8, "app-usage-bar", 18);
    i0.ɵɵelementStart(9, "div", 19);
    i0.ɵɵtext(10);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_5_0;
    const limit_r3 = ctx;
    i0.ɵɵnextContext();
    const pct_r4 = i0.ɵɵreadContextLet(0);
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(4, 8, "metrics.bar.usage"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_5_0 = ctx_r0.healthPill()) ? 5 : -1, tmp_5_0);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", pct_r4.toFixed(1), "%");
    i0.ɵɵadvance();
    i0.ɵɵproperty("used", ctx_r0.data().usageGiB.total)("total", limit_r3)("warnAtPercent", ctx_r0.warnAtPercent());
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate2(" ", ctx_r0.fmt(ctx_r0.data().usageGiB.total), " of ", limit_r3, " GiB ");
} }
function StorageComponent_Conditional_10_Conditional_31_For_2_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 20);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function StorageComponent_Conditional_10_Conditional_31_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14)(1, "span", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵconditionalCreate(4, StorageComponent_Conditional_10_Conditional_31_For_2_Conditional_4_Template, 3, 3, "app-status-pill", 20);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 17);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const r_r5 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 3, "metrics.stat." + r_r5.area), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(r_r5.pinned ? 4 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(r_r5.text);
} }
function StorageComponent_Conditional_10_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵrepeaterCreate(1, StorageComponent_Conditional_10_Conditional_31_For_2_Template, 7, 5, "div", 14, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r0.limitRows());
} }
function StorageComponent_Conditional_10_Conditional_32_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "metrics.alert.full"), " ");
} }
function StorageComponent_Conditional_10_Conditional_32_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 21);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "metrics.alert.warning"), " ");
} }
function StorageComponent_Conditional_10_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, StorageComponent_Conditional_10_Conditional_32_Conditional_0_Template, 3, 3, "div", 4)(1, StorageComponent_Conditional_10_Conditional_32_Conditional_1_Template, 3, 3, "div", 21);
} if (rf & 2) {
    i0.ɵɵnextContext();
    const pct_r4 = i0.ɵɵreadContextLet(0);
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵconditional(pct_r4 >= 95 ? 0 : pct_r4 >= ctx_r0.warnAtPercent() ? 1 : -1);
} }
function StorageComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdeclareLet(0);
    i0.ɵɵelementStart(1, "div", 8)(2, "div", 9)(3, "div", 10);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "div", 11);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "div", 12);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "div", 9)(12, "div", 10);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "div", 11);
    i0.ɵɵtext(16);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "div", 12);
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(20, "div", 9)(21, "div", 10);
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "div", 11);
    i0.ɵɵtext(25);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(26, "div", 12);
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(29, StorageComponent_Conditional_10_Conditional_29_Template, 9, 7, "div", 9);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(30, StorageComponent_Conditional_10_Conditional_30_Template, 11, 10, "div", 13);
    i0.ɵɵconditionalCreate(31, StorageComponent_Conditional_10_Conditional_31_Template, 3, 0, "div", 13);
    i0.ɵɵconditionalCreate(32, StorageComponent_Conditional_10_Conditional_32_Template, 2, 1);
} if (rf & 2) {
    let tmp_11_0;
    let tmp_12_0;
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵstoreLet(ctx_r0.usagePct());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 14, "metrics.stat.totalUsed"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.fmt(ctx_r0.data().usageGiB.total));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 16, "metrics.stat.unit"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 18, "metrics.stat.brain"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.fmt(ctx_r0.data().usageGiB.brain));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 20, "metrics.stat.unit"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 22, "metrics.stat.files"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.fmt(ctx_r0.data().usageGiB.files));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 24, "metrics.stat.unit"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_11_0 = ctx_r0.totalHard()) ? 29 : -1, tmp_11_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_12_0 = ctx_r0.totalHard()) ? 30 : -1, tmp_12_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.limitRows().length > 0 ? 31 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.totalHard() ? 32 : -1);
} }
export class StorageComponent {
    constructor() {
        this.spacesApi = inject(SpacesApi);
        this.Math = Math;
        this.data = signal(null, ...(ngDevMode ? [{ debugName: "data" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Distinct from `!data()`: a load *failure*, so a successful-but-empty response isn't shown as an error. */
        this.error = signal(false, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /**
         * The ceiling the usage bar is drawn against: the HARD total limit, falling back to the soft one.
         *
         * Hard is what actually refuses a write, so it is the honest denominator. Falling back to soft matters
         * because an operator may set a warning threshold and no hard cap, and drawing no bar at all in that
         * case is how this page ended up looking unconfigured in the first place.
         */
        this.totalHard = computed(() => {
            const t = this.data()?.limits?.total;
            return t?.hardLimitGiB ?? t?.softLimitGiB;
        }, ...(ngDevMode ? [{ debugName: "totalHard" }] : /* istanbul ignore next */ []));
        /**
         * Where the bar turns amber: the soft limit expressed as a percentage of the hard one.
         *
         * Derived rather than configured. The old code read `limits.warnAtPercent`, which the server has never
         * sent — so it always fell through to a hard-coded 80% that had nothing to do with the operator's
         * actual soft limit. If soft is 80 GiB of a 100 GiB hard cap, the warning belongs at 80%, not at
         * whatever 80 happens to mean.
         */
        this.warnAtPercent = computed(() => {
            const t = this.data()?.limits?.total;
            if (!t?.softLimitGiB || !t?.hardLimitGiB || t.hardLimitGiB <= 0)
                return 80;
            return Math.min(100, (t.softLimitGiB / t.hardLimitGiB) * 100);
        }, ...(ngDevMode ? [{ debugName: "warnAtPercent" }] : /* istanbul ignore next */ []));
        /** One row per configured area, with whether the host pinned it from the environment. */
        this.limitRows = computed(() => {
            const lim = this.data()?.limits;
            if (!lim)
                return [];
            const locked = new Set(lim.lockedByInfra ?? []);
            const rows = [];
            for (const area of ['total', 'files', 'brain']) {
                const v = lim[area];
                if (!v || (v.softLimitGiB === undefined && v.hardLimitGiB === undefined))
                    continue;
                const parts = [];
                if (v.softLimitGiB !== undefined)
                    parts.push(`${v.softLimitGiB} GiB soft`);
                if (v.hardLimitGiB !== undefined)
                    parts.push(`${v.hardLimitGiB} GiB hard`);
                rows.push({
                    area,
                    text: parts.join(' · '),
                    pinned: locked.has(`${area}.softLimitGiB`) || locked.has(`${area}.hardLimitGiB`),
                });
            }
            return rows;
        }, ...(ngDevMode ? [{ debugName: "limitRows" }] : /* istanbul ignore next */ []));
        /** Derived from `data()` so it can never render a stale percentage against a prior/absent load. */
        this.usagePct = computed(() => {
            const limit = this.totalHard();
            const d = this.data();
            return limit && d ? (d.usageGiB.total / limit) * 100 : 0;
        }, ...(ngDevMode ? [{ debugName: "usagePct" }] : /* istanbul ignore next */ []));
        /** Storage health as a status pill — only meaningful when a limit is configured. */
        this.healthPill = computed(() => {
            if (!this.totalHard())
                return null;
            const level = usageLevel(this.usagePct(), this.warnAtPercent());
            return {
                ok: { variant: 'ok', key: 'metrics.health.ok' },
                warn: { variant: 'warn', key: 'metrics.health.warn' },
                danger: { variant: 'error', key: 'metrics.health.full' },
            }[level];
        }, ...(ngDevMode ? [{ debugName: "healthPill" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() { this.load(); }
    load() {
        this.loading.set(true);
        this.error.set(false);
        this.spacesApi.listSpaces().subscribe({
            next: ({ storage }) => {
                this.data.set(storage ? storage : null);
                this.loading.set(false);
            },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
    }
    fmt(v) { return v.toFixed(2); }
    static { this.ɵfac = function StorageComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || StorageComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: StorageComponent, selectors: [["app-storage"]], decls: 11, vars: 9, consts: [[1, "page-header", 2, "margin-bottom", "16px"], [1, "card-title"], [1, "btn-secondary", "btn", "btn-sm", 2, "margin-bottom", "20px", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [1, "alert", "alert-error"], [1, "loading-overlay"], [1, "alert", "alert-info"], [1, "spinner"], [1, "stat-grid"], [1, "stat-card"], [1, "stat-label"], [1, "stat-value"], [1, "stat-sub"], [1, "card", 2, "margin-bottom", "20px"], [1, "row"], [1, "label", 2, "display", "inline-flex", "align-items", "center", "gap", "8px"], [3, "variant"], [1, "value"], [2, "display", "block", "margin", "8px 0 6px", 3, "used", "total", "warnAtPercent"], [2, "font-size", "11px", "color", "var(--text-muted)"], ["variant", "env"], [1, "alert", "alert-warning"]], template: function StorageComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(4, "button", 2);
            i0.ɵɵlistener("click", function StorageComponent_Template_button_click_4_listener() { return ctx.load(); });
            i0.ɵɵconditionalCreate(5, StorageComponent_Conditional_5_Template, 1, 0, "span", 3);
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(8, StorageComponent_Conditional_8_Template, 3, 3, "div", 4)(9, StorageComponent_Conditional_9_Template, 2, 1)(10, StorageComponent_Conditional_10_Template, 33, 26);
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 5, "metrics.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.loading());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.loading() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(7, 7, "metrics.refreshButton"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.error() ? 8 : !ctx.data() ? 9 : 10);
        } }, dependencies: [CommonModule, UsageBarComponent, StatusPillComponent, TranslocoPipe], styles: [".row[_ngcontent-%COMP%] {\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      font-size: 13px;\n      margin-bottom: 4px;\n    }\n\n    .row[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] { color: var(--text-secondary); }\n    .row[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] { font-weight: 500; color: var(--text-primary); }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(StorageComponent, [{
        type: Component,
        args: [{ selector: 'app-storage', standalone: true, imports: [CommonModule, TranslocoPipe, UsageBarComponent, StatusPillComponent], template: `
    <div class="page-header" style="margin-bottom:16px;">
      <div class="card-title">{{ 'metrics.title' | transloco }}</div>
    </div>

    <button class="btn-secondary btn btn-sm" style="margin-bottom:20px;" [disabled]="loading()" (click)="load()">
      @if (loading()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
      {{ 'metrics.refreshButton' | transloco }}
    </button>

    @if (error()) {
      <div class="alert alert-error">{{ 'metrics.error.load' | transloco }}</div>
    } @else if (!data()) {
      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else {
        <div class="alert alert-info">{{ 'metrics.empty' | transloco }}</div>
      }
    } @else {
      @let pct = usagePct();
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">{{ 'metrics.stat.totalUsed' | transloco }}</div>
          <div class="stat-value">{{ fmt(data()!.usageGiB.total) }}</div>
          <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ 'metrics.stat.brain' | transloco }}</div>
          <div class="stat-value">{{ fmt(data()!.usageGiB.brain) }}</div>
          <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ 'metrics.stat.files' | transloco }}</div>
          <div class="stat-value">{{ fmt(data()!.usageGiB.files) }}</div>
          <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
        </div>
        @if (totalHard(); as limit) {
          <div class="stat-card">
            <div class="stat-label">{{ 'metrics.stat.limit' | transloco }}</div>
            <div class="stat-value">{{ limit }}</div>
            <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
          </div>
        }
      </div>

      @if (totalHard(); as limit) {
        <div class="card" style="margin-bottom:20px;">
          <div class="row">
            <span class="label" style="display:inline-flex; align-items:center; gap:8px;">
              {{ 'metrics.bar.usage' | transloco }}
              @if (healthPill(); as h) { <app-status-pill [variant]="h.variant">{{ h.key | transloco }}</app-status-pill> }
            </span>
            <span class="value">{{ pct.toFixed(1) }}%</span>
          </div>
          <app-usage-bar
            [used]="data()!.usageGiB.total"
            [total]="limit"
            [warnAtPercent]="warnAtPercent()"
            style="display:block; margin:8px 0 6px;"
          />
          <div style="font-size:11px; color:var(--text-muted);">
            {{ fmt(data()!.usageGiB.total) }} of {{ limit }} GiB
          </div>
        </div>
      }

      <!-- Every configured limit, per area, with a pill on the ones the host has pinned. Previously
           only a single "total" number was even attempted, and it was read from a field that does not
           exist — so files/brain limits were invisible whether pinned or not. -->
      @if (limitRows().length > 0) {
        <div class="card" style="margin-bottom:20px;">
          @for (r of limitRows(); track r.area) {
            <div class="row">
              <span class="label" style="display:inline-flex; align-items:center; gap:8px;">
                {{ 'metrics.stat.' + r.area | transloco }}
                @if (r.pinned) {
                  <app-status-pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill>
                }
              </span>
              <span class="value">{{ r.text }}</span>
            </div>
          }
        </div>
      }

      @if (totalHard()) {
        @if (pct >= 95) {
          <div class="alert alert-error">
            {{ 'metrics.alert.full' | transloco }}
          </div>
        } @else if (pct >= warnAtPercent()) {
          <div class="alert alert-warning">
            {{ 'metrics.alert.warning' | transloco }}
          </div>
        }
      }
    }
  `, styles: ["\n\n    .row {\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      font-size: 13px;\n      margin-bottom: 4px;\n    }\n\n    .row .label { color: var(--text-secondary); }\n    .row .value { font-weight: 500; color: var(--text-primary); }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(StorageComponent, { className: "StorageComponent", filePath: "app/pages/settings/storage.component.ts", lineNumber: 130 }); })();
