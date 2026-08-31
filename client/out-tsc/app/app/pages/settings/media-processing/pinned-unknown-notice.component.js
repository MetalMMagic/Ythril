import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
const _c0 = a0 => ({ count: a0 });
function PinnedUnknownNoticeComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 0)(1, "div")(2, "strong");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵdomElementEnd()();
    i0.ɵɵdomElementStart(5, "div", 1);
    i0.ɵɵtext(6);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(7, "div", 2);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 3, "mediaProcessing.pinnedUnknown.title", i0.ɵɵpureFunction1(8, _c0, ctx_r0.paths().length)));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.paths().join(", "));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 6, "mediaProcessing.pinnedUnknown.body"));
} }
/**
 * "These pinned field names matched nothing, so they are not locked."
 *
 * ## Why this is worth a component
 *
 * `YTHRIL_PINNED_FIELDS` lets an operator fix a field at whatever it resolves to, including nothing. Its one
 * dangerous failure is a typo: the operator believes a control is locked and it is not. The server reports those
 * entries as `pinnedUnknown` rather than only logging them, and **this screen is where somebody checking their pin
 * actually looks** — a warning in the server log is the one place they are not reading.
 *
 * ## Why it is a separate file rather than eleven lines in the Models tab
 *
 * `no-new-god-files.test.js` refused it inside `models-tab.component.ts`, which is frozen at its current size, and
 * its reason is the right one: *"the failure mode of a god-file is not its size on any given day — it is that every
 * change lands in the same place because that is where the code already is."* That tab is already 678 lines of
 * provider cards; a notice about environment pins has no reason to live inside it.
 *
 * It also earns the separation on its own terms — it has one input, no state, and nothing to do with any provider
 * card, so a reader looking for why an unrecognised pin is surfaced finds one file that says so.
 *
 * Rendered ABOVE the cards by its host. Below them it would be found only by somebody who had already scrolled
 * past the control they thought was locked, which is the wrong conclusion this exists to prevent.
 */
export class PinnedUnknownNoticeComponent {
    constructor() {
        /** The unrecognised entries, verbatim from the config response. Empty renders nothing at all. */
        this.paths = input.required(...(ngDevMode ? [{ debugName: "paths" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function PinnedUnknownNoticeComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PinnedUnknownNoticeComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: PinnedUnknownNoticeComponent, selectors: [["app-pinned-unknown-notice"]], inputs: { paths: [1, "paths"] }, decls: 1, vars: 1, consts: [[1, "alert", "alert-warning"], ["data-mono", "", 2, "font-size", "12px", "margin-top", "4px"], [2, "font-size", "12px", "margin-top", "4px"]], template: function PinnedUnknownNoticeComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, PinnedUnknownNoticeComponent_Conditional_0_Template, 10, 10, "div", 0);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.paths().length ? 0 : -1);
        } }, dependencies: [TranslocoPipe], encapsulation: 2, changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PinnedUnknownNoticeComponent, [{
        type: Component,
        args: [{
                selector: 'app-pinned-unknown-notice',
                standalone: true,
                changeDetection: ChangeDetectionStrategy.OnPush,
                imports: [TranslocoPipe],
                template: `
    @if (paths().length) {
      <div class="alert alert-warning">
        <div><strong>{{ 'mediaProcessing.pinnedUnknown.title' | transloco: { count: paths().length } }}</strong></div>
        <div data-mono style="font-size:12px; margin-top:4px;">{{ paths().join(', ') }}</div>
        <div style="font-size:12px; margin-top:4px;">{{ 'mediaProcessing.pinnedUnknown.body' | transloco }}</div>
      </div>
    }
  `,
            }]
    }], null, { paths: [{ type: i0.Input, args: [{ isSignal: true, alias: "paths", required: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(PinnedUnknownNoticeComponent, { className: "PinnedUnknownNoticeComponent", filePath: "app/pages/settings/media-processing/pinned-unknown-notice.component.ts", lineNumber: 42 }); })();
