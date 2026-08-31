/**
 * RelativeTime — one timestamp treatment for the whole app (settings design system, PR-U1).
 *
 * Before this, three date formats coexisted (`dd.MM.yyyy`, `date:'short'`, `toLocaleString()`), none
 * tabular, none relative — so scanning "which token expires soonest / which webhook failed most
 * recently" down a column was hard. This renders a locale-aware relative label ("2 hours ago") with the
 * absolute time on hover, tabular-nums, and a machine-readable <time datetime>.
 *
 * Usage:  <app-relative-time [value]="token.lastUsed"/>
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
/** Parse an ISO string / epoch-ms / Date to epoch-ms, or null if unparseable. Exported for testing. */
export function toEpochMs(value) {
    if (value == null)
        return null;
    const t = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(t) ? t : null;
}
/**
 * Locale-aware "2 hours ago" / "in 3 days" via `Intl.RelativeTimeFormat`. Pure — pass `nowMs` (and
 * optionally a locale) so it's deterministic under test. Picks the largest sensible unit.
 */
export function formatRelativeTime(value, nowMs, locale = 'en') {
    const t = toEpochMs(value);
    if (t === null)
        return '';
    const diff = t - nowMs; // negative = past
    const a = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H, W = 7 * D, MO = 30 * D, Y = 365 * D;
    if (a < M)
        return rtf.format(Math.round(diff / S), 'second');
    if (a < H)
        return rtf.format(Math.round(diff / M), 'minute');
    if (a < D)
        return rtf.format(Math.round(diff / H), 'hour');
    if (a < W)
        return rtf.format(Math.round(diff / D), 'day');
    if (a < MO)
        return rtf.format(Math.round(diff / W), 'week');
    if (a < Y)
        return rtf.format(Math.round(diff / MO), 'month');
    return rtf.format(Math.round(diff / Y), 'year');
}
export class RelativeTimeComponent {
    constructor() {
        this.transloco = inject(TranslocoService);
        this.value = input.required(...(ngDevMode ? [{ debugName: "value" }] : /* istanbul ignore next */ []));
        this.locale = () => this.transloco.getActiveLang() || 'en';
        this.iso = computed(() => { const t = toEpochMs(this.value()); return t === null ? '' : new Date(t).toISOString(); }, ...(ngDevMode ? [{ debugName: "iso" }] : /* istanbul ignore next */ []));
        this.absolute = computed(() => { const t = toEpochMs(this.value()); return t === null ? '' : new Date(t).toLocaleString(this.locale()); }, ...(ngDevMode ? [{ debugName: "absolute" }] : /* istanbul ignore next */ []));
        // Date.now() is read on each change-detection pass — fresh enough for settings screens (no live ticking).
        this.rel = computed(() => formatRelativeTime(this.value(), Date.now(), this.locale()), ...(ngDevMode ? [{ debugName: "rel" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function RelativeTimeComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RelativeTimeComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: RelativeTimeComponent, selectors: [["app-relative-time"]], inputs: { value: [1, "value"] }, decls: 2, vars: 3, consts: [[3, "title"]], template: function RelativeTimeComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "time", 0);
            i0.ɵɵtext(1);
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵdomProperty("title", ctx.absolute());
            i0.ɵɵattribute("datetime", ctx.iso());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(ctx.rel());
        } }, styles: ["time[_ngcontent-%COMP%] { font-variant-numeric: tabular-nums; white-space: nowrap; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RelativeTimeComponent, [{
        type: Component,
        args: [{ selector: 'app-relative-time', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `<time [attr.datetime]="iso()" [title]="absolute()">{{ rel() }}</time>`, styles: ["time { font-variant-numeric: tabular-nums; white-space: nowrap; }"] }]
    }], null, { value: [{ type: i0.Input, args: [{ isSignal: true, alias: "value", required: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(RelativeTimeComponent, { className: "RelativeTimeComponent", filePath: "app/shared/relative-time.component.ts", lineNumber: 50 }); })();
