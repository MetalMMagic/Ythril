import { Component, inject, signal, computed } from '@angular/core';
import { AdminApi } from '../../core/admin-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { UsageBarComponent, usageLevel } from '../../shared/usage-bar.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.id;
function AboutComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.loading"));
} }
function AboutComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 2);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function AboutComponent_Conditional_1_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.reload()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "about.error.load"))("reason", ctx_r1.error());
} }
function AboutComponent_Conditional_2_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 6);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 8);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const i_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "about.publicUrl"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i_r3.publicUrl);
} }
function AboutComponent_Conditional_2_Conditional_57_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-settings-card", 15);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "app-status-pill", 18);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(1, 4, "about.card.components"))("purpose", i0.ɵɵpipeBind1(2, 6, "about.card.componentsDesc"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 8, "about.components.pending"));
} }
function AboutComponent_Conditional_2_Conditional_58_For_8_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 25);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r4 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(c_r4.impact);
} }
function AboutComponent_Conditional_2_Conditional_58_For_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 21)(1, "div", 22)(2, "span", 23);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "app-status-pill", 24);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(7, AboutComponent_Conditional_2_Conditional_58_For_8_Conditional_7_Template, 2, 1, "p", 25);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r4 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵclassProp("is-down", c_r4.configured && c_r4.reachable === false);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(c_r4.label);
    i0.ɵɵadvance();
    i0.ɵɵproperty("variant", ctx_r1.componentVariant(c_r4))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(6, 7, ctx_r1.componentLabel(c_r4)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r4.configured && c_r4.reachable === false ? 7 : -1);
} }
function AboutComponent_Conditional_2_Conditional_58_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-settings-card", 15);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "app-status-pill", 10);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "div", 19);
    i0.ɵɵrepeaterCreate(7, AboutComponent_Conditional_2_Conditional_58_For_8_Template, 8, 9, "div", 20, _forTrack0);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(1, 5, "about.card.components"))("purpose", i0.ɵɵpipeBind1(2, 7, "about.card.componentsDesc"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("variant", ctx_r1.healthPill().variant)("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 9, ctx_r1.healthPill().label));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx.components);
} }
function AboutComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1)(1, "app-settings-card", 3);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "app-status-pill", 4);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 5)(8, "span", 6);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "span", 7);
    i0.ɵɵtext(12);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "span", 6);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "span", 8);
    i0.ɵɵtext(17);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "span", 6);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(21, "span", 8);
    i0.ɵɵtext(22);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(23, AboutComponent_Conditional_2_Conditional_23_Template, 5, 4);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "app-settings-card", 9);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementStart(27, "app-status-pill", 10);
    i0.ɵɵtext(28);
    i0.ɵɵpipe(29, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(30, "div", 5)(31, "span", 6);
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "span", 8);
    i0.ɵɵtext(35);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(36, "span", 6);
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(39, "span", 7);
    i0.ɵɵtext(40);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(41, "div", 11)(42, "div", 12)(43, "span");
    i0.ɵɵtext(44);
    i0.ɵɵpipe(45, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(46, "span");
    i0.ɵɵtext(47);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(48, "div", 12)(49, "span");
    i0.ɵɵtext(50);
    i0.ɵɵpipe(51, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(52, "span")(53, "span", 13);
    i0.ɵɵtext(54);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(55);
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(56, "app-usage-bar", 14);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(57, AboutComponent_Conditional_2_Conditional_57_Template, 6, 10, "app-settings-card", 15);
    i0.ɵɵconditionalCreate(58, AboutComponent_Conditional_2_Conditional_58_Template, 9, 11, "app-settings-card", 15);
    i0.ɵɵelementStart(59, "app-settings-card", 16);
    i0.ɵɵpipe(60, "transloco");
    i0.ɵɵpipe(61, "transloco");
    i0.ɵɵelementStart(62, "a", 17);
    i0.ɵɵtext(63);
    i0.ɵɵpipe(64, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    let tmp_31_0;
    const i_r3 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(2, 34, "about.card.instance"))("purpose", i0.ɵɵpipeBind1(3, 36, "about.card.instanceDesc"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 38, "about.status.online"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 40, "about.instanceLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i_r3.instanceLabel);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 42, "about.instanceId"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i_r3.instanceId);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 44, "about.version"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i_r3.version);
    i0.ɵɵadvance();
    i0.ɵɵconditional(i_r3.publicUrl ? 23 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(25, 46, "about.card.system"))("purpose", i0.ɵɵpipeBind1(26, 48, "about.card.systemDesc"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("variant", ctx_r1.diskHealth().variant)("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(29, 50, ctx_r1.diskHealth().label));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 52, "about.mongoVersion"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i_r3.mongoVersion);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(38, 54, "about.uptime"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i_r3.uptime);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(45, 56, "about.dataUsage"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r1.formatBytes(i_r3.diskInfo.dataUsed));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(51, 58, "about.diskUsage"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", ctx_r1.diskPercent().toFixed(1), "%");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2(" \u00B7 ", ctx_r1.formatBytes(i_r3.diskInfo.used), " / ", ctx_r1.formatBytes(i_r3.diskInfo.total));
    i0.ɵɵadvance();
    i0.ɵɵproperty("used", i_r3.diskInfo.used)("total", i_r3.diskInfo.total)("warnAtPercent", 80);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!ctx_r1.health() ? 57 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_31_0 = ctx_r1.health()) ? 58 : -1, tmp_31_0);
    i0.ɵɵadvance();
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(60, 60, "about.card.help"))("purpose", i0.ɵɵpipeBind1(61, 62, "about.card.helpDesc"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(64, 64, "about.openHelp"));
} }
export class AboutComponent {
    constructor() {
        this.adminApi = inject(AdminApi);
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.info = signal(null, ...(ngDevMode ? [{ debugName: "info" }] : /* istanbul ignore next */ []));
        this.diskPercent = signal(0, ...(ngDevMode ? [{ debugName: "diskPercent" }] : /* istanbul ignore next */ []));
        /**
         * Disk health for the System-card pill. Derived from the SAME `usageLevel` classifier the shared
         * UsageBar uses (warn ≥ 80%, danger ≥ 95%), so the pill and the bar can never disagree and the
         * signal reads identically to the Storage page.
         */
        this.diskHealth = computed(() => {
            switch (usageLevel(this.diskPercent(), 80)) {
                case 'danger': return { variant: 'error', label: 'about.disk.critical' };
                case 'warn': return { variant: 'warn', label: 'about.disk.high' };
                default: return { variant: 'ok', label: 'about.disk.healthy' };
            }
        }, ...(ngDevMode ? [{ debugName: "diskHealth" }] : /* istanbul ignore next */ []));
        this.health = signal(null, ...(ngDevMode ? [{ debugName: "health" }] : /* istanbul ignore next */ []));
        /**
         * Pill for the components card.
         *
         * `unknown` is warn, not error: it means a probe could not run, which is a different thing from a
         * component that answered and failed. Showing it as an error would train people to ignore the colour.
         */
        this.healthPill = computed(() => {
            switch (this.health()?.level) {
                case 'degraded': return { variant: 'error', label: 'about.health.degraded' };
                case 'unknown': return { variant: 'warn', label: 'about.health.unknown' };
                default: return { variant: 'ok', label: 'about.health.ok' };
            }
        }, ...(ngDevMode ? [{ debugName: "healthPill" }] : /* istanbul ignore next */ []));
    }
    /** Per-component pill. An unconfigured component reads as `off` — not a fault, it was never asked for. */
    componentVariant(c) {
        if (!c.configured)
            return 'off';
        if (c.reachable === false)
            return 'error';
        if (c.reachable === null)
            return 'warn';
        return 'ok';
    }
    componentLabel(c) {
        if (!c.configured)
            return 'about.health.notConfigured';
        if (c.reachable === false)
            return 'about.health.unreachable';
        if (c.reachable === null)
            return 'about.health.unknown';
        return 'about.health.reachable';
    }
    ngOnInit() { this.load(); }
    reload() { this.load(); }
    load() {
        this.loading.set(true);
        this.error.set('');
        this.adminApi.getAbout().subscribe({
            next: (data) => {
                this.info.set(data);
                const d = data.diskInfo;
                this.diskPercent.set(d.total > 0 ? (d.used / d.total) * 100 : 0);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err?.error?.error ?? 'Failed to load about info');
                this.loading.set(false);
            },
        });
        // Separate request, deliberately not awaited with the one above: component probes can take a
        // moment, and the whole page should not wait on them. A failure here leaves the card unrendered
        // rather than erroring the page — the rest of About is still worth showing.
        this.adminApi.getAboutHealth().subscribe({
            next: (h) => this.health.set(h),
            error: () => this.health.set(null),
        });
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    }
    static { this.ɵfac = function AboutComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || AboutComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: AboutComponent, selectors: [["app-about"]], decls: 3, vars: 1, consts: [[3, "message", "reason"], [1, "grid"], [3, "retry", "message", "reason"], ["icon", "info", 3, "heading", "purpose"], ["pill", "", "variant", "active", 3, "dot"], [1, "kv"], [1, "k"], [1, "v"], [1, "v", "mono"], ["icon", "database", 3, "heading", "purpose"], ["pill", "", 3, "variant", "dot"], [1, "disk"], [1, "disk-fig"], [1, "pct"], [3, "used", "total", "warnAtPercent"], ["icon", "broadcast", 3, "heading", "purpose"], ["icon", "question", 3, "heading", "purpose"], ["routerLink", "/settings/help", 1, "btn", "btn-sm", "btn-secondary"], ["pill", "", "variant", "warn", 3, "dot"], [1, "components"], [1, "component", 3, "is-down"], [1, "component"], [1, "component-head"], [1, "component-label"], [3, "variant", "dot"], [1, "component-impact"]], template: function AboutComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, AboutComponent_Conditional_0_Template, 3, 3, "p")(1, AboutComponent_Conditional_1_Template, 2, 4, "app-error-state", 0)(2, AboutComponent_Conditional_2_Template, 65, 66, "div", 1);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional(ctx.loading() ? 0 : ctx.error() ? 1 : (tmp_0_0 = ctx.info()) ? 2 : -1, tmp_0_0);
        } }, dependencies: [RouterLink, SettingsCardComponent, StatusPillComponent, UsageBarComponent, ErrorStateComponent, TranslocoPipe], styles: [".grid[_ngcontent-%COMP%] {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n      gap: 16px;\n      align-items: stretch;\n    }\n    \n\n\n\n    .grid[_ngcontent-%COMP%]   app-settings-card[_ngcontent-%COMP%] { display: grid; }\n    .kv[_ngcontent-%COMP%] { display: grid; grid-template-columns: minmax(84px, 132px) 1fr; gap: 7px 14px; font-size: 13px; }\n    .kv[_ngcontent-%COMP%]   .k[_ngcontent-%COMP%] { color: var(--text-secondary); }\n    .kv[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%] { color: var(--text-primary); word-break: break-word; }\n    .mono[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 0.9em; }\n\n    .disk[_ngcontent-%COMP%] { margin-top: 14px; }\n    .disk-fig[_ngcontent-%COMP%] {\n      display: flex; justify-content: space-between; align-items: baseline;\n      font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;\n    }\n    .disk-fig[_ngcontent-%COMP%]   .pct[_ngcontent-%COMP%] { font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }\n\n    .components[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 10px; }\n    .component-head[_ngcontent-%COMP%] { display: flex; align-items: center; justify-content: space-between; gap: 10px; }\n    .component-label[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-primary); }\n    .component-impact[_ngcontent-%COMP%] {\n      margin: 4px 0 0; font-size: 12px; line-height: 1.45; color: var(--text-secondary);\n      border-left: 2px solid var(--danger, #f85149); padding-left: 8px;\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AboutComponent, [{
        type: Component,
        args: [{ selector: 'app-about', standalone: true, imports: [TranslocoPipe, RouterLink, SettingsCardComponent, StatusPillComponent, UsageBarComponent, ErrorStateComponent], template: `
    @if (loading()) {
      <p>{{ 'common.loading' | transloco }}</p>
    } @else if (error()) {
      <app-error-state
        [message]="'about.error.load' | transloco"
        [reason]="error()"
        (retry)="reload()" />
    } @else if (info(); as i) {
      <div class="grid">
        <app-settings-card icon="info"
                           [heading]="'about.card.instance' | transloco"
                           [purpose]="'about.card.instanceDesc' | transloco">
          <app-status-pill pill variant="active" [dot]="true">{{ 'about.status.online' | transloco }}</app-status-pill>
          <div class="kv">
            <span class="k">{{ 'about.instanceLabel' | transloco }}</span>
            <span class="v">{{ i.instanceLabel }}</span>

            <span class="k">{{ 'about.instanceId' | transloco }}</span>
            <span class="v mono">{{ i.instanceId }}</span>

            <span class="k">{{ 'about.version' | transloco }}</span>
            <span class="v mono">{{ i.version }}</span>

            @if (i.publicUrl) {
              <span class="k">{{ 'about.publicUrl' | transloco }}</span>
              <span class="v mono">{{ i.publicUrl }}</span>
            }
          </div>
        </app-settings-card>

        <app-settings-card icon="database"
                           [heading]="'about.card.system' | transloco"
                           [purpose]="'about.card.systemDesc' | transloco">
          <app-status-pill pill [variant]="diskHealth().variant" [dot]="true">{{ diskHealth().label | transloco }}</app-status-pill>
          <div class="kv">
            <span class="k">{{ 'about.mongoVersion' | transloco }}</span>
            <span class="v mono">{{ i.mongoVersion }}</span>

            <span class="k">{{ 'about.uptime' | transloco }}</span>
            <span class="v">{{ i.uptime }}</span>
          </div>

          <div class="disk">
            <div class="disk-fig">
              <span>{{ 'about.dataUsage' | transloco }}</span>
              <span>{{ formatBytes(i.diskInfo.dataUsed) }}</span>
            </div>
            <div class="disk-fig">
              <span>{{ 'about.diskUsage' | transloco }}</span>
              <span><span class="pct">{{ diskPercent().toFixed(1) }}%</span> · {{ formatBytes(i.diskInfo.used) }} / {{ formatBytes(i.diskInfo.total) }}</span>
            </div>
            <app-usage-bar [used]="i.diskInfo.used" [total]="i.diskInfo.total" [warnAtPercent]="80" />
          </div>
        </app-settings-card>

        <!-- Optional components.
             This used to render nothing at all until the probe answered, for a stated reason that was
             half right: an empty card filling in a moment later reads as "nothing configured", which is
             a different claim entirely. True — but the remedy was wrong. Rendering NOTHING makes the
             card appear out of nowhere seconds after the page settles, and the owner reported exactly
             that. A pending state claims neither: the card is there, and it says it is still looking. -->
        @if (!health()) {
          <app-settings-card icon="broadcast"
                             [heading]="'about.card.components' | transloco"
                             [purpose]="'about.card.componentsDesc' | transloco">
            <app-status-pill pill variant="warn" [dot]="true">{{ 'about.components.pending' | transloco }}</app-status-pill>
          </app-settings-card>
        }
        @if (health(); as h) {
          <app-settings-card icon="broadcast"
                             [heading]="'about.card.components' | transloco"
                             [purpose]="'about.card.componentsDesc' | transloco">
            <app-status-pill pill [variant]="healthPill().variant" [dot]="true">{{ healthPill().label | transloco }}</app-status-pill>
            <div class="components">
              @for (c of h.components; track c.id) {
                <div class="component" [class.is-down]="c.configured && c.reachable === false">
                  <div class="component-head">
                    <span class="component-label">{{ c.label }}</span>
                    <app-status-pill [variant]="componentVariant(c)" [dot]="true">
                      {{ componentLabel(c) | transloco }}
                    </app-status-pill>
                  </div>
                  <!-- The impact line is shown ONLY when something is actually broken. Printing it for a
                       healthy component turns the panel into a wall of warnings nobody reads. -->
                  @if (c.configured && c.reachable === false) {
                    <p class="component-impact">{{ c.impact }}</p>
                  }
                </div>
              }
            </div>
          </app-settings-card>
        }

        <!-- The guides ship WITH the instance, so About — the page people already open when they want to
             know what this thing is — is where the pointer to them belongs. -->
        <app-settings-card icon="question"
                           [heading]="'about.card.help' | transloco"
                           [purpose]="'about.card.helpDesc' | transloco">
          <a class="btn btn-sm btn-secondary" routerLink="/settings/help">{{ 'about.openHelp' | transloco }}</a>
        </app-settings-card>
      </div>
    }
  `, styles: ["\n    .grid {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n      gap: 16px;\n      align-items: stretch;\n    }\n    /* Uniform card size: stretch each card to fill its (equal-height) grid row. The host becomes a\n       grid so its single .card child fills the row height \u2014 scoped to About, the shared SettingsCard\n       is untouched. */\n    .grid app-settings-card { display: grid; }\n    .kv { display: grid; grid-template-columns: minmax(84px, 132px) 1fr; gap: 7px 14px; font-size: 13px; }\n    .kv .k { color: var(--text-secondary); }\n    .kv .v { color: var(--text-primary); word-break: break-word; }\n    .mono { font-family: var(--font-mono, monospace); font-size: 0.9em; }\n\n    .disk { margin-top: 14px; }\n    .disk-fig {\n      display: flex; justify-content: space-between; align-items: baseline;\n      font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;\n    }\n    .disk-fig .pct { font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }\n\n    .components { display: flex; flex-direction: column; gap: 10px; }\n    .component-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }\n    .component-label { font-size: 13px; color: var(--text-primary); }\n    .component-impact {\n      margin: 4px 0 0; font-size: 12px; line-height: 1.45; color: var(--text-secondary);\n      border-left: 2px solid var(--danger, #f85149); padding-left: 8px;\n    }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(AboutComponent, { className: "AboutComponent", filePath: "app/pages/settings/about.component.ts", lineNumber: 151 }); })();
