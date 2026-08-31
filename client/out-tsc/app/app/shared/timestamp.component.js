/**
 * Timestamp — one absolute-time treatment for every data table.
 *
 * Date on the first line, local time with SECONDS on the second. Owner request, 2026-08-10: *"in data tables
 * timestamps should also show the time rendered in local time below the date with precision: seconds"*.
 *
 * ## What it replaces
 *
 * Measured before writing it: **23 `| date:` usages in five different formats** — `dd.MM.yyyy HH:mm` ×11,
 * `yyyy-MM-dd HH:mm:ss` ×5, `dd.MM.yyyy` ×4, `dd.MM.yy` ×2, `mediumDate` ×1. Five formats exist because each table
 * formatted its own, so this is a drift fix as much as a feature, and a sixth spelling of the same idea is how it
 * recurs.
 *
 * The two-line stack is the treatment the owner already approved for the tokens table — *"last used and expires
 * should be date and below time"* — generalised. The complaint behind it was `expires tomorrow`, which "makes me
 * wonder when tomorrow": a relative label needs the absolute one AVAILABLE, not replaced. So this does not compete
 * with `RelativeTime`; use that where "3 minutes ago" is the useful answer and this where the exact moment is.
 *
 * ## RENDERING ONLY
 *
 * Owner, 2026-08-10: *"dont change the 'we save utc' stance. just for rendering local"*. Storage, the wire format,
 * the API, sync and the audit log all stay UTC ISO strings. The local time exists in the DOM and nowhere else.
 *
 * That boundary is the one most likely to be crossed by accident, so this component is built to make crossing it
 * hard rather than to trust nobody will:
 *
 *  - it takes the **UTC value** and converts at render time, never the other way round;
 *  - `datetime` on the `<time>` element carries the **original UTC ISO string**, so anything reading the DOM
 *    programmatically — a test, a scraper, a copy-paste — gets UTC, not a localised string;
 *  - it exposes `sortKey()` returning epoch-ms, because a table that sorts on the RENDERED TEXT is the specific way
 *    this goes wrong. `01.02.2026` sorts before `02.01.2025` as a string. A timezone bug in stored data is invisible
 *    until someone in another offset reads it, and a sort bug is invisible until the rows happen to disagree.
 *
 * ## Seconds are the point
 *
 * `HH:mm` is the current majority format and drops them. An audit log where two entries share a minute is unreadable
 * without seconds, which is exactly where an operator looks hardest.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import * as i0 from "@angular/core";
function TimestampComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "time")(1, "span", 1);
    i0.ɵɵtext(2);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(3, "span", 2);
    i0.ɵɵtext(4);
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const p_r1 = ctx;
    i0.ɵɵattribute("datetime", p_r1.iso)("title", p_r1.iso);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(p_r1.date);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(p_r1.time);
} }
function TimestampComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 0);
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.empty());
} }
/** Epoch-ms from an ISO string / epoch-ms / Date, or null when unparseable. Exported for testing and sorting. */
export function toEpochMs(value) {
    if (value == null)
        return null;
    const t = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(t) ? t : null;
}
/**
 * The two lines, in the VIEWER's timezone.
 *
 * `Intl` rather than manual padding: it honours the locale's date order, which is the whole reason five hand-rolled
 * formats existed. `hourCycle: 'h23'` is pinned because a table with `11:59:03 PM` in one row and `23:59:03` in
 * another — which is what happens when the locale decides — cannot be scanned down a column.
 *
 * Pure, and `locale`/`timeZone` are parameters so a test is not at the mercy of the machine it runs on. That is not
 * hypothetical care: a test asserting a local rendering without pinning the zone passes in one office and fails in
 * the next.
 */
export function formatTimestampParts(value, locale, timeZone) {
    const t = toEpochMs(value);
    if (t === null)
        return null;
    const d = new Date(t);
    // `de-DE` by default, and that is deliberate rather than an oversight.
    //
    // The instruction was to render the local TIME — the zone. Taking the viewer's locale for the date as well would
    // make the field ORDER vary by browser: `15.01.2026` here, `01/15/2026` there, for the same row on the same
    // instance. This app has an explicit `dd.MM.yyyy` convention in eleven places, and a spec asserting it caught the
    // switch immediately. Varying the format by browser would also undo the point of the component, which is that a
    // column can be scanned.
    //
    // So the ZONE is the viewer's and the FORMAT is fixed. `locale` stays an input for tests and for a future explicit
    // per-user preference — a deliberate setting rather than whatever the browser happens to be.
    const opts = timeZone ? { timeZone } : {};
    const fmt = locale ?? 'de-DE';
    return {
        date: new Intl.DateTimeFormat(fmt, { ...opts, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
        time: new Intl.DateTimeFormat(fmt, { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d),
        // The ORIGINAL instant, in UTC. Never the localised string — see the class comment on why the DOM must stay UTC.
        iso: d.toISOString(),
    };
}
export class TimestampComponent {
    constructor() {
        this.value = input.required(...(ngDevMode ? [{ debugName: "value" }] : /* istanbul ignore next */ []));
        /** What to show when there is no timestamp. A dash, not an empty cell — an empty cell reads as a layout bug. */
        this.empty = input('—', ...(ngDevMode ? [{ debugName: "empty" }] : /* istanbul ignore next */ []));
        /**
         * Overridable for tests and for a future per-user preference. Undefined means the app's fixed `dd.MM.yyyy`, NOT the
         * browser's locale — see `formatTimestampParts` on why the field order must not vary by viewer.
         */
        this.locale = input(undefined, ...(ngDevMode ? [{ debugName: "locale" }] : /* istanbul ignore next */ []));
        this.timeZone = input(undefined, ...(ngDevMode ? [{ debugName: "timeZone" }] : /* istanbul ignore next */ []));
        this.parts = computed(() => formatTimestampParts(this.value(), this.locale(), this.timeZone()), ...(ngDevMode ? [{ debugName: "parts" }] : /* istanbul ignore next */ []));
        /**
         * Epoch-ms, for a caller that sorts a column of these.
         *
         * Exposed so nobody sorts the rendered text. `01.02.2026` before `02.01.2025` is a real ordering a string
         * comparison produces, and it looks plausible enough to survive review.
         */
        this.sortKey = computed(() => toEpochMs(this.value()), ...(ngDevMode ? [{ debugName: "sortKey" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function TimestampComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TimestampComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TimestampComponent, selectors: [["app-timestamp"]], inputs: { value: [1, "value"], empty: [1, "empty"], locale: [1, "locale"], timeZone: [1, "timeZone"] }, decls: 2, vars: 1, consts: [[1, "empty"], [1, "d"], [1, "t"]], template: function TimestampComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, TimestampComponent_Conditional_0_Template, 5, 4, "time")(1, TimestampComponent_Conditional_1_Template, 2, 1, "span", 0);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.parts()) ? 0 : 1, tmp_0_0);
        } }, styles: ["[_nghost-%COMP%] { display: inline-block; font-variant-numeric: tabular-nums; line-height: 1.25; }\n    .d[_ngcontent-%COMP%] { display: block; }\n    \n\n\n    .t[_ngcontent-%COMP%] { display: block; font-size: .85em; color: var(--text-muted); }\n    .empty[_ngcontent-%COMP%] { color: var(--text-muted); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TimestampComponent, [{
        type: Component,
        args: [{ selector: 'app-timestamp', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `
    @if (parts(); as p) {
      <time [attr.datetime]="p.iso" [attr.title]="p.iso">
        <span class="d">{{ p.date }}</span><span class="t">{{ p.time }}</span>
      </time>
    } @else {
      <span class="empty">{{ empty() }}</span>
    }
  `, styles: ["\n    :host { display: inline-block; font-variant-numeric: tabular-nums; line-height: 1.25; }\n    .d { display: block; }\n    /* The time is secondary: an operator scans dates first and reads the time on the row they stopped at. Dimmed\n       rather than smaller alone, because two lines of identical weight read as two separate values. */\n    .t { display: block; font-size: .85em; color: var(--text-muted); }\n    .empty { color: var(--text-muted); }\n  "] }]
    }], null, { value: [{ type: i0.Input, args: [{ isSignal: true, alias: "value", required: true }] }], empty: [{ type: i0.Input, args: [{ isSignal: true, alias: "empty", required: false }] }], locale: [{ type: i0.Input, args: [{ isSignal: true, alias: "locale", required: false }] }], timeZone: [{ type: i0.Input, args: [{ isSignal: true, alias: "timeZone", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TimestampComponent, { className: "TimestampComponent", filePath: "app/shared/timestamp.component.ts", lineNumber: 111 }); })();
