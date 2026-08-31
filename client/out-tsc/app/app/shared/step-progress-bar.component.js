/**
 * The progress bar for a file being processed — sections, not a spinner.
 *
 * Replaces a badge with a spinning dot in it, which said "something is happening" for as long as the
 * job ran and looked identical whether the job was working or wedged. Each section is a stage of
 * THAT document's route (routes differ per file and per extraction level), the active one fills as
 * its units land, and the whole thing degrades to a plain bar when the route has one stage.
 *
 * All of the judgement lives in `step-progress.model.ts`; this component draws what it is given.
 *
 * **Accessibility is not decoration here.** A bar that communicates only by width communicates
 * nothing to a screen reader, and "is this file done?" is exactly the question a progress indicator
 * exists to answer. It carries `role="progressbar"` with real values, plus a text label naming the
 * stage and its position — the same rule the pipeline health dots follow.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { buildBarModel, isStale } from './step-progress.model';
import * as i0 from "@angular/core";
function StepProgressBarComponent_Conditional_6_For_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 5);
    i0.ɵɵdomElement(1, "div", 6);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const s_r1 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassMap(s_r1.state);
    i0.ɵɵstyleProp("flex", s_r1.weight);
    i0.ɵɵclassProp("stale", ctx_r1.stale());
    i0.ɵɵadvance();
    i0.ɵɵstyleProp("width", s_r1.fill * 100, "%");
} }
function StepProgressBarComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵrepeaterCreate(0, StepProgressBarComponent_Conditional_6_For_1_Template, 2, 8, "div", 4, i0.ɵɵrepeaterTrackByIndex);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵrepeater(ctx_r1.model().segments);
} }
function StepProgressBarComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 7);
    i0.ɵɵdomElement(1, "div", 6);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("stale", ctx_r1.stale());
    i0.ɵɵadvance();
    i0.ɵɵstyleProp("width", (ctx_r1.model().overall ?? 0) * 100, "%");
} }
function StepProgressBarComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "files.progress.stalled"), " ");
} }
function StepProgressBarComponent_Conditional_10_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span");
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function StepProgressBarComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 8);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵdomElementEnd();
    i0.ɵɵconditionalCreate(3, StepProgressBarComponent_Conditional_10_Conditional_3_Template, 2, 1, "span");
} if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, ctx_r1.stepLabel()));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_2_0 = ctx_r1.unitText()) ? 3 : -1, tmp_2_0);
} }
export class StepProgressBarComponent {
    constructor() {
        this.progress = input(null, ...(ngDevMode ? [{ debugName: "progress" }] : /* istanbul ignore next */ []));
        /** ISO8601 of the job's last report, for the stalled check. */
        this.progressAt = input(null, ...(ngDevMode ? [{ debugName: "progressAt" }] : /* istanbul ignore next */ []));
        /** Instance stall timeout. Default matches the server's own default. */
        this.stallTimeoutMs = input(300_000, ...(ngDevMode ? [{ debugName: "stallTimeoutMs" }] : /* istanbul ignore next */ []));
        this.model = computed(() => buildBarModel(this.progress()), ...(ngDevMode ? [{ debugName: "model" }] : /* istanbul ignore next */ []));
        this.stale = computed(() => isStale(this.progressAt(), this.stallTimeoutMs()), ...(ngDevMode ? [{ debugName: "stale" }] : /* istanbul ignore next */ []));
        this.percent = computed(() => {
            const o = this.model().overall;
            return o === null ? null : Math.round(o * 100);
        }, ...(ngDevMode ? [{ debugName: "percent" }] : /* istanbul ignore next */ []));
        /** i18n key for the running stage. Unknown stages fall back to a generic "working" rather than
         *  rendering a raw internal identifier at the user. */
        this.stepLabel = computed(() => {
            const step = this.progress()?.step;
            if (!step)
                return 'files.progress.working';
            return KNOWN_STEPS.has(step) ? `mediaProcessing.step.${step}` : 'files.progress.working';
        }, ...(ngDevMode ? [{ debugName: "stepLabel" }] : /* istanbul ignore next */ []));
        /** "12 / 40" for a countable stage, else empty — never a fabricated count. */
        this.unitText = computed(() => {
            const p = this.progress();
            if (!p || typeof p.done !== 'number' || typeof p.total !== 'number' || p.total <= 0)
                return '';
            return `${Math.min(p.done, p.total)} / ${p.total}`;
        }, ...(ngDevMode ? [{ debugName: "unitText" }] : /* istanbul ignore next */ []));
        /** Everything after the translated stage name: " 12 / 40 — 45%". Joined in the template. */
        this.suffix = computed(() => {
            const pct = this.percent();
            const units = this.unitText();
            return `${units ? ' ' + units : ''}${pct === null ? '' : ` — ${pct}%`}`;
        }, ...(ngDevMode ? [{ debugName: "suffix" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function StepProgressBarComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || StepProgressBarComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: StepProgressBarComponent, selectors: [["app-step-progress-bar"]], inputs: { progress: [1, "progress"], progressAt: [1, "progressAt"], stallTimeoutMs: [1, "stallTimeoutMs"] }, decls: 11, vars: 17, consts: [[1, "wrap"], ["role", "progressbar", 1, "track"], [1, "seg", "active", 2, "flex", "1", 3, "stale"], [1, "label"], [1, "seg", 3, "class", "stale", "flex"], [1, "seg"], [1, "fill"], [1, "seg", "active", 2, "flex", "1"], [1, "step"]], template: function StepProgressBarComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵpipe(5, "transloco");
            i0.ɵɵconditionalCreate(6, StepProgressBarComponent_Conditional_6_Template, 2, 0)(7, StepProgressBarComponent_Conditional_7_Template, 2, 4, "div", 2);
            i0.ɵɵdomElementEnd();
            i0.ɵɵdomElementStart(8, "div", 3);
            i0.ɵɵconditionalCreate(9, StepProgressBarComponent_Conditional_9_Template, 2, 3)(10, StepProgressBarComponent_Conditional_10_Template, 4, 4);
            i0.ɵɵdomElementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵattribute("aria-valuemin", 0)("aria-valuemax", 100)("aria-valuenow", ctx.percent())("aria-valuetext", ctx.stale() ? i0.ɵɵpipeBind1(2, 9, "files.progress.stalled") : i0.ɵɵpipeBind1(3, 11, ctx.stepLabel()) + ctx.suffix())("aria-label", ctx.stale() ? i0.ɵɵpipeBind1(4, 13, "files.progress.stalled") : i0.ɵɵpipeBind1(5, 15, ctx.stepLabel()) + ctx.suffix());
            i0.ɵɵadvance(5);
            i0.ɵɵconditional(ctx.model().segmented ? 6 : 7);
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("stale", ctx.stale());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.stale() ? 9 : 10);
        } }, dependencies: [TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; min-width: 120px; }\n    .wrap[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 3px; }\n    .track[_ngcontent-%COMP%] { display: flex; gap: 2px; height: 6px; border-radius: 3px; overflow: hidden; }\n    .seg[_ngcontent-%COMP%] { position: relative; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }\n    .seg[_ngcontent-%COMP%]   .fill[_ngcontent-%COMP%] { position: absolute; inset: 0 auto 0 0; background: var(--accent); border-radius: 2px; }\n    .seg.done[_ngcontent-%COMP%]   .fill[_ngcontent-%COMP%] { width: 100%; }\n    \n\n    .seg.active[_ngcontent-%COMP%]   .fill[_ngcontent-%COMP%] { transition: width .4s ease; }\n    .seg.stale[_ngcontent-%COMP%]   .fill[_ngcontent-%COMP%] { background: var(--warning); }\n    @media (prefers-reduced-motion: reduce) { .seg.active[_ngcontent-%COMP%]   .fill[_ngcontent-%COMP%] { transition: none; } }\n\n    .label[_ngcontent-%COMP%] { font-size: 10px; color: var(--text-muted); display: flex; gap: 5px; align-items: baseline; }\n    .label[_ngcontent-%COMP%]   .step[_ngcontent-%COMP%] { color: var(--text-secondary); font-weight: 550; }\n    .label.stale[_ngcontent-%COMP%] { color: var(--warning); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(StepProgressBarComponent, [{
        type: Component,
        args: [{ selector: 'app-step-progress-bar', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe], template: `
    <div class="wrap">
      <!-- The accessible name is built HERE, through the pipe, not in a computed: a computed would
           put the raw i18n key into aria-valuetext and re-translate never. -->
      <div class="track" role="progressbar"
        [attr.aria-valuemin]="0" [attr.aria-valuemax]="100"
        [attr.aria-valuenow]="percent()"
        [attr.aria-valuetext]="stale() ? ('files.progress.stalled' | transloco) : ((stepLabel() | transloco) + suffix())"
        [attr.aria-label]="stale() ? ('files.progress.stalled' | transloco) : ((stepLabel() | transloco) + suffix())">
        @if (model().segmented) {
          @for (s of model().segments; track $index) {
            <div class="seg" [class]="s.state" [class.stale]="stale()" [style.flex]="s.weight">
              <div class="fill" [style.width.%]="s.fill * 100"></div>
            </div>
          }
        } @else {
          <!-- One stage, or a shape we cannot describe: a plain bar rather than a single box that
               implies there are other sections still to come. -->
          <div class="seg active" [class.stale]="stale()" style="flex:1">
            <div class="fill" [style.width.%]="(model().overall ?? 0) * 100"></div>
          </div>
        }
      </div>
      <div class="label" [class.stale]="stale()">
        @if (stale()) {
          {{ 'files.progress.stalled' | transloco }}
        } @else {
          <span class="step">{{ stepLabel() | transloco }}</span>
          @if (unitText(); as u) { <span>{{ u }}</span> }
        }
      </div>
    </div>
  `, styles: ["\n    :host { display: block; min-width: 120px; }\n    .wrap { display: flex; flex-direction: column; gap: 3px; }\n    .track { display: flex; gap: 2px; height: 6px; border-radius: 3px; overflow: hidden; }\n    .seg { position: relative; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }\n    .seg .fill { position: absolute; inset: 0 auto 0 0; background: var(--accent); border-radius: 2px; }\n    .seg.done .fill { width: 100%; }\n    /* The active segment animates its width so the bar moves rather than teleporting between ticks. */\n    .seg.active .fill { transition: width .4s ease; }\n    .seg.stale .fill { background: var(--warning); }\n    @media (prefers-reduced-motion: reduce) { .seg.active .fill { transition: none; } }\n\n    .label { font-size: 10px; color: var(--text-muted); display: flex; gap: 5px; align-items: baseline; }\n    .label .step { color: var(--text-secondary); font-weight: 550; }\n    .label.stale { color: var(--warning); }\n  "] }]
    }], null, { progress: [{ type: i0.Input, args: [{ isSignal: true, alias: "progress", required: false }] }], progressAt: [{ type: i0.Input, args: [{ isSignal: true, alias: "progressAt", required: false }] }], stallTimeoutMs: [{ type: i0.Input, args: [{ isSignal: true, alias: "stallTimeoutMs", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(StepProgressBarComponent, { className: "StepProgressBarComponent", filePath: "app/shared/step-progress-bar.component.ts", lineNumber: 75 }); })();
/**
 * Stage names that have a translated label (`mediaProcessing.step.*`).
 *
 * Keep this in step with what the pipeline can actually report. A stage that runs but is missing here does
 * NOT error — it silently renders as the generic "working", which is indistinguishable from a job whose
 * stage is genuinely unknown. `faces` was in exactly that state: translated in all three locales, absent
 * from this set. `step-progress-bar.component.spec.ts` now asserts every pipeline stage resolves to its
 * own label.
 */
const KNOWN_STEPS = new Set([
    'ocr', 'render', 'vlm', 'validate', 'repair', 'verify',
    'embed', 'chunk', 'caption', 'transcribe', 'split', 'faces',
]);
