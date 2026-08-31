/**
 * Tab 2 — Pipelines. What actually runs, drawn as the real step chain.
 *
 * Five pipelines (Documents · Images · Audio · Video · Text), each with the actor named under every
 * step and that pipeline's knobs attached to it rather than pooled in one "Advanced" block at the
 * bottom of the page. Pooling them is what made the old page unreadable: a render-DPI field sitting
 * next to a worker-concurrency field tells you nothing about which pipeline either belongs to.
 *
 * Three rules from the approved layout, and what each is for:
 *
 *   - **Conditional steps are dashed, always-run steps are solid.** A repair pass that only engages
 *     when a repair model is wired in is not the same kind of thing as OCR, and drawing them alike
 *     is how an operator concludes a stage ran when it never could.
 *   - **The actor names the model, never the state — the dot is the state.** Writing "off" where a
 *     model name belongs conflates what a step *is* with whether it is *working*.
 *   - **Each pipeline carries its own instance ceiling** — the most any space may do with that class,
 *     not a default a space inherits. Lowering one silently caps every space above it, and "off"
 *     takes the class offline everywhere — so both facts are stated at the control, not in a doc.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent } from '../../../shared/status-pill.component';
import { HealthDotComponent } from './health-dot.component';
import { HscrollTopDirective } from '../../../shared/hscroll-top.directive';
import { MediaProcessingStateService } from './media-processing-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { MODE_STAGES, IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS } from './media-processing.types';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ detail: a0 });
const _c1 = a0 => ({ $implicit: a0 });
const _forTrack0 = ($index, $item) => $item.id;
const _forTrack1 = ($index, $item) => $item.key;
const _forTrack2 = ($index, $item) => $item.cls;
function PipelinesTabComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵelement(1, "ph-icon", 30);
    i0.ɵɵelementStart(2, "span");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 2, "mediaProcessing.pipelines.statusUnavailable", i0.ɵɵpureFunction1(5, _c0, ctx)));
} }
function PipelinesTabComponent_For_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementContainer(0, 3);
} if (rf & 2) {
    const p_r2 = ctx.$implicit;
    i0.ɵɵnextContext();
    const pipeCard_r3 = i0.ɵɵreference(65);
    i0.ɵɵproperty("ngTemplateOutlet", pipeCard_r3)("ngTemplateOutletContext", i0.ɵɵpureFunction1(2, _c1, p_r2));
} }
function PipelinesTabComponent_For_22_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 38);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function PipelinesTabComponent_For_22_Conditional_8_Template_button_click_0_listener() { const cid_r5 = i0.ɵɵrestoreView(_r4); const ctx_r5 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r5.s.requestFocusCard(cid_r5)); });
    i0.ɵɵelementStart(2, "span", 37)(3, "bdi");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const st_r7 = i0.ɵɵnextContext().$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("infra", ctx_r5.isInfra(ctx));
    i0.ɵɵattribute("title", st_r7.actor)("aria-label", i0.ɵɵpipeBind1(1, 5, "mediaProcessing.pipelines.configureLink") + ": " + st_r7.actor);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(st_r7.actor);
} }
function PipelinesTabComponent_For_22_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 37)(1, "bdi");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const st_r7 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵattribute("title", st_r7.actor);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(st_r7.actor);
} }
function PipelinesTabComponent_For_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31)(1, "div", 32)(2, "div", 33);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelement(5, "app-health-dot", 34);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 35);
    i0.ɵɵconditionalCreate(8, PipelinesTabComponent_For_22_Conditional_8_Template, 5, 7, "button", 36)(9, PipelinesTabComponent_For_22_Conditional_9_Template, 3, 2, "span", 37);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    let tmp_17_0;
    const st_r7 = ctx.$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("cond", st_r7.conditional)("dim", ctx_r5.stepDim(st_r7.key))("active", ctx_r5.stepActive(st_r7.key));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 10, st_r7.name));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("state", st_r7.health)("subject", i0.ɵɵpipeBind1(6, 12, st_r7.name));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional((tmp_17_0 = st_r7.cardId) ? 8 : 9, tmp_17_0);
} }
function PipelinesTabComponent_For_30_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 39);
    i0.ɵɵlistener("click", function PipelinesTabComponent_For_30_Template_button_click_0_listener() { const m_r9 = i0.ɵɵrestoreView(_r8).$implicit; const ctx_r5 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r5.s.setMode(m_r9)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const m_r9 = ctx.$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("on", ctx_r5.s.docMode() === m_r9);
    i0.ɵɵproperty("disabled", ctx_r5.s.managed);
    i0.ɵɵattribute("aria-pressed", ctx_r5.s.docMode() === m_r9);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, "mediaProcessing.mode." + m_r9), " ");
} }
function PipelinesTabComponent_Conditional_63_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 29)(1, "button", 40);
    i0.ɵɵlistener("click", function PipelinesTabComponent_Conditional_63_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r10); const ctx_r5 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r5.s.savePipe("pipe-documents")); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r5.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 2, ctx_r5.s.saving() ? "common.saving" : "common.save"), " ");
} }
function PipelinesTabComponent_ng_template_64_For_13_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 38);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function PipelinesTabComponent_ng_template_64_For_13_Conditional_8_Template_button_click_0_listener() { const cid_r12 = i0.ɵɵrestoreView(_r11); const ctx_r5 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r5.s.requestFocusCard(cid_r12)); });
    i0.ɵɵelementStart(2, "span", 37)(3, "bdi");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const st_r13 = i0.ɵɵnextContext().$implicit;
    const ctx_r5 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("infra", ctx_r5.isInfra(ctx));
    i0.ɵɵattribute("title", st_r13.actor)("aria-label", i0.ɵɵpipeBind1(1, 5, "mediaProcessing.pipelines.configureLink") + ": " + st_r13.actor);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(st_r13.actor);
} }
function PipelinesTabComponent_ng_template_64_For_13_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 37)(1, "bdi");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const st_r13 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵattribute("title", st_r13.actor);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(st_r13.actor);
} }
function PipelinesTabComponent_ng_template_64_For_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31)(1, "div", 32)(2, "div", 33);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelement(5, "app-health-dot", 34);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 35);
    i0.ɵɵconditionalCreate(8, PipelinesTabComponent_ng_template_64_For_13_Conditional_8_Template, 5, 7, "button", 36)(9, PipelinesTabComponent_ng_template_64_For_13_Conditional_9_Template, 3, 2, "span", 37);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    let tmp_19_0;
    const st_r13 = ctx.$implicit;
    const p_r14 = i0.ɵɵnextContext().$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("cond", st_r13.conditional)("dim", ctx_r5.mediaStepDim(p_r14.id, st_r13.key))("active", ctx_r5.mediaStepActive(p_r14.id, st_r13.key));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 10, st_r13.name));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("state", st_r13.health)("subject", i0.ɵɵpipeBind1(6, 12, st_r13.name));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional((tmp_19_0 = st_r13.cardId) ? 8 : 9, tmp_19_0);
} }
function PipelinesTabComponent_ng_template_64_For_19_For_7_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 39);
    i0.ɵɵlistener("click", function PipelinesTabComponent_ng_template_64_For_19_For_7_Template_button_click_0_listener() { const rung_r16 = i0.ɵɵrestoreView(_r15).$implicit; const c_r17 = i0.ɵɵnextContext().$implicit; const ctx_r5 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r5.setCeiling(c_r17.cls, rung_r16)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const rung_r16 = ctx.$implicit;
    const c_r17 = i0.ɵɵnextContext().$implicit;
    const p_r14 = i0.ɵɵnextContext().$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("on", ctx_r5.ceilingOf(c_r17.cls) === rung_r16);
    i0.ɵɵproperty("disabled", ctx_r5.rungDisabled(c_r17.cls, rung_r16, p_r14.steps));
    i0.ɵɵattribute("aria-pressed", ctx_r5.ceilingOf(c_r17.cls) === rung_r16);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, "mediaProcessing.level." + rung_r16), " ");
} }
function PipelinesTabComponent_ng_template_64_For_19_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 43);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function PipelinesTabComponent_ng_template_64_For_19_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 44);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pipelines.firstStepDown"));
} }
function PipelinesTabComponent_ng_template_64_For_19_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 44);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pipelines.ceilingOffWarning"));
} }
function PipelinesTabComponent_ng_template_64_For_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 42)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 14);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵrepeaterCreate(6, PipelinesTabComponent_ng_template_64_For_19_For_7_Template, 3, 7, "button", 15, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(8, PipelinesTabComponent_ng_template_64_For_19_Conditional_8_Template, 3, 3, "app-status-pill", 43);
    i0.ɵɵconditionalCreate(9, PipelinesTabComponent_ng_template_64_For_19_Conditional_9_Template, 3, 3, "span", 44);
    i0.ɵɵconditionalCreate(10, PipelinesTabComponent_ng_template_64_For_19_Conditional_10_Template, 3, 3, "span", 44);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r17 = ctx.$implicit;
    const p_r14 = i0.ɵɵnextContext().$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 5, "mediaProcessing.class." + c_r17.cls));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(5, 7, "mediaProcessing.class." + c_r17.cls));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(c_r17.ladder);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r5.s.isLocked("levels." + c_r17.cls) ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r5.firstStepUnavailable(p_r14.steps) ? 9 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r5.ceilingOf(c_r17.cls) === "off" ? 10 : -1);
} }
function PipelinesTabComponent_ng_template_64_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    const _r18 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 29)(1, "button", 40);
    i0.ɵɵlistener("click", function PipelinesTabComponent_ng_template_64_Conditional_20_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r18); const p_r14 = i0.ɵɵnextContext().$implicit; const ctx_r5 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r5.s.savePipe(ctx_r5.pipeIdOf(p_r14.id))); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r5.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 2, ctx_r5.s.saving() ? "common.saving" : "common.save"), " ");
} }
function PipelinesTabComponent_ng_template_64_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 4)(1, "header", 5)(2, "span", 6);
    i0.ɵɵelement(3, "ph-icon", 41);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 8)(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 10);
    i0.ɵɵrepeaterCreate(12, PipelinesTabComponent_ng_template_64_For_13_Template, 10, 14, "div", 11, _forTrack1);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "div", 12)(15, "div", 13);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(18, PipelinesTabComponent_ng_template_64_For_19_Template, 11, 9, "div", 42, _forTrack2);
    i0.ɵɵconditionalCreate(20, PipelinesTabComponent_ng_template_64_Conditional_20_Template, 4, 4, "div", 29);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r14 = ctx.$implicit;
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("name", p_r14.icon)("size", 17);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 6, p_r14.title));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 8, p_r14.purpose));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(p_r14.steps);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 10, "mediaProcessing.pipelines.ceiling"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(p_r14.ceilings);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r5.s.pipeDirty(ctx_r5.pipeIdOf(p_r14.id)) ? 20 : -1);
} }
function PipelinesTabComponent_For_67_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementContainer(0, 3);
} if (rf & 2) {
    const p_r19 = ctx.$implicit;
    i0.ɵɵnextContext();
    const pipeCard_r3 = i0.ɵɵreference(65);
    i0.ɵɵproperty("ngTemplateOutlet", pipeCard_r3)("ngTemplateOutletContext", i0.ɵɵpureFunction1(2, _c1, p_r19));
} }
export class PipelinesTabComponent {
    constructor() {
        this.s = inject(MediaProcessingStateService);
        this.pipeline = inject(PipelineStatusService);
        /** Which document stages the current mode actually runs — dims the rest rather than hiding them. */
        this.activeStages = computed(() => MODE_STAGES[this.s.docMode()], ...(ngDevMode ? [{ debugName: "activeStages" }] : /* istanbul ignore next */ []));
        this.notSet = '—';
        /** Cards rendered as infra (env-owned, read-only) on the Models tab — their actor links get the
         *  dotted underline that marks "you can see it here but change it in the environment". */
        this.infraCards = new Set(['doc-render', 'unstructured']);
        this.documentSteps = computed(() => {
            const doc = this.s.docCfg();
            const ps = this.pipeline;
            return [
                { key: 'ocr', name: 'mediaProcessing.step.ocr', actor: 'Tesseract', health: ps.sidecarState('unstructured'), conditional: false, cardId: 'unstructured' },
                { key: 'render', name: 'mediaProcessing.step.render', actor: 'doc-render', health: ps.sidecarState('doc-render'), conditional: true, cardId: 'doc-render' },
                { key: 'vlm', name: 'mediaProcessing.step.vlm', actor: doc.vlmModel || this.notSet, health: ps.modelState('doc-vlm'), conditional: true, cardId: 'doc-vlm' },
                // Validate is pure in-process arithmetic (does the VLM output cover the OCR text?), so it has no
                // endpoint and therefore no dot to report — undefined health, not a green one it has not earned.
                { key: 'validate', name: 'mediaProcessing.step.validate', actor: 'in-process', health: null, conditional: true },
                { key: 'repair', name: 'mediaProcessing.step.repair', actor: doc.repairModel || doc.vlmModel || this.notSet, health: ps.modelState('doc-repair'), conditional: true, cardId: 'doc-repair' },
                { key: 'verify', name: 'mediaProcessing.step.verify', actor: doc.verifyModel || this.notSet, health: ps.modelState('doc-verify'), conditional: true, cardId: 'doc-verify' },
                { key: 'embed', name: 'mediaProcessing.step.embed', actor: this.s.embedding.model || this.notSet, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
            ];
        }, ...(ngDevMode ? [{ debugName: "documentSteps" }] : /* istanbul ignore next */ []));
        /**
         * Ordered poor → rich media, from the reader's point of view: Text, Documents, Images, Audio, Video.
         *
         * Owner, 2026-07-30. Documents sits second even though it is by far the most complicated pipeline —
         * the ordering principle is how rich the *medium* is, not how hard it is to process, and a document is
         * text with structure. Sorting by implementation difficulty would put Documents last and make the list
         * incoherent to anyone who has not read the code.
         *
         * Documents renders between `textPipeline` and `otherPipelines` in the template because its control is
         * an extraction MODE rather than a class ceiling, so it does not fit this list's shape.
         */
        this.textPipeline = computed(() => this.mediaPipelines().filter(p => p.id === 'text'), ...(ngDevMode ? [{ debugName: "textPipeline" }] : /* istanbul ignore next */ []));
        this.otherPipelines = computed(() => this.mediaPipelines().filter(p => p.id !== 'text'), ...(ngDevMode ? [{ debugName: "otherPipelines" }] : /* istanbul ignore next */ []));
        this.mediaPipelines = computed(() => {
            const ps = this.pipeline;
            const embedModel = this.s.embedding.model || this.notSet;
            return [
                {
                    id: 'images', icon: 'image', title: 'mediaProcessing.pipelines.images', purpose: 'mediaProcessing.pipelines.imagesPurpose',
                    ceilings: [{ cls: 'images', ladder: IMAGE_LEVELS }],
                    steps: [
                        { key: 'caption', name: 'mediaProcessing.step.caption', actor: this.s.form.vision?.model || this.notSet, health: ps.modelState('vision'), conditional: false, cardId: 'vision' },
                        { key: 'img-embed', name: 'mediaProcessing.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
                        // Only at the `recognition` rung, and only when faceRecognition is enabled — genuinely conditional.
                        { key: 'faces', name: 'mediaProcessing.step.faces', actor: 'BlazeFace + FaceRes', health: ps.status()?.faceRecognition.state ?? null, conditional: true, cardId: 'face' },
                    ],
                },
                {
                    id: 'audio', icon: 'microphone', title: 'mediaProcessing.pipelines.audio', purpose: 'mediaProcessing.pipelines.audioPurpose',
                    ceilings: [{ cls: 'audio', ladder: AUDIO_LEVELS }],
                    steps: [
                        { key: 'transcribe', name: 'mediaProcessing.step.transcribe', actor: this.s.form.stt?.model || this.notSet, health: ps.modelState('stt'), conditional: false, cardId: 'stt' },
                        { key: 'aud-embed', name: 'mediaProcessing.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
                    ],
                },
                {
                    // Video is its own pipeline. It ALWAYS extracts the audio track and runs the audio pipeline
                    // (ffmpeg → transcribe → embed); at the `full`/`auto` level it ALSO captions keyframes with the
                    // vision model. The `audio` level is "take the audio pipeline instead of a model" — the keyframe
                    // step is skipped (conditional). ffmpeg + the chunker are bundled/in-process, so they report 'ok'.
                    id: 'video', icon: 'video-camera', title: 'mediaProcessing.pipelines.video', purpose: 'mediaProcessing.pipelines.videoPurpose',
                    ceilings: [{ cls: 'video', ladder: VIDEO_LEVELS }],
                    steps: [
                        { key: 'vid-split', name: 'mediaProcessing.step.split', actor: 'ffmpeg', health: 'ok', conditional: false },
                        { key: 'vid-transcribe', name: 'mediaProcessing.step.transcribe', actor: this.s.form.stt?.model || this.notSet, health: ps.modelState('stt'), conditional: false, cardId: 'stt' },
                        // Only at the `full`/`auto` rung — at `audio` the vision model is not called.
                        { key: 'vid-keyframe', name: 'mediaProcessing.step.keyframe', actor: this.s.form.vision?.model || this.notSet, health: ps.modelState('vision'), conditional: true, cardId: 'vision' },
                        { key: 'vid-embed', name: 'mediaProcessing.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
                    ],
                },
                {
                    id: 'text', icon: 'text-align-left', title: 'mediaProcessing.pipelines.text', purpose: 'mediaProcessing.pipelines.textPurpose',
                    ceilings: [{ cls: 'text', ladder: TEXT_LEVELS }],
                    steps: [
                        // Chunking only happens at the `chunk` rung; `embed` produces one vector for the whole
                        // document. The chunker is bundled and always available in-process, so it reports 'ok'.
                        { key: 'chunk', name: 'mediaProcessing.step.chunk', actor: 'text chunker', health: 'ok', conditional: true },
                        { key: 'txt-embed', name: 'mediaProcessing.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
                    ],
                },
            ];
        }, ...(ngDevMode ? [{ debugName: "mediaPipelines" }] : /* istanbul ignore next */ []));
    }
    /**
     * Whether a step is drawn as not-running.
     *
     * `MODE_STAGES` only describes the six EXTRACTION stages, so it cannot be consulted directly: a step
     * outside that vocabulary — Embed, which always runs on whatever text comes out — is absent from
     * every set and would be dimmed under every mode, saying the brain never gets the document. Steps
     * the mode does not govern are only dimmed when the whole pipeline is off.
     */
    stepDim(key) {
        if (this.s.docMode() === 'off')
            return true; // nothing in this pipeline runs at all
        if (!MODE_STAGES['auto'].has(key))
            return false; // not a mode-governed stage
        return !this.activeStages().has(key);
    }
    /**
     * Whether a step is on the path the current extraction mode actually runs — the inverse of dim while
     * the pipeline is on. Used to mark (border) the live steps in the viz so the chosen mode reads at a
     * glance; when the pipeline is off, nothing is marked.
     */
    stepActive(key) {
        return this.s.docMode() !== 'off' && !this.stepDim(key);
    }
    // ── What the MEDIA pipelines actually run ───────────────────────────────────
    //
    // The document pipeline has had dim/active markings since it shipped. The other four never did: their
    // steps rendered with `cond` alone, so nothing was ever highlighted and the traffic lights reported
    // only what was *available*, never what the configured level would actually execute. Owner, 2026-07-30:
    // "i can see with the traffic light what is available but not what is actually used in the pipeline."
    //
    // The rung governs it, and the mapping is per class rather than generic because the ladders mean
    // genuinely different things — `audio` on the video ladder is "run the audio pipeline and skip the
    // vision model", which no shared rule would guess.
    /** Steps a class runs at a given rung. `auto` resolves to the class's fullest rung. */
    static { this.RUNS = {
        images: {
            off: [],
            caption: ['caption', 'img-embed'],
            recognition: ['caption', 'img-embed', 'faces'],
        },
        audio: {
            off: [],
            on: ['transcribe', 'aud-embed'],
        },
        video: {
            off: [],
            // "audio" means take the audio track only — ffmpeg splits, STT transcribes, and the vision model
            // is not called at all.
            audio: ['vid-split', 'vid-transcribe', 'vid-embed'],
            full: ['vid-split', 'vid-transcribe', 'vid-keyframe', 'vid-embed'],
        },
        text: {
            off: [],
            // `embed` produces one vector for the whole document; only `chunk` splits it first.
            embed: ['txt-embed'],
            chunk: ['chunk', 'txt-embed'],
        },
    }; }
    /** The rung `auto` resolves to — the fullest one, since auto means "no ceiling of my own". */
    static { this.AUTO_RUNG = {
        images: 'recognition', audio: 'on', video: 'full', text: 'chunk',
    }; }
    runsAt(cls) {
        const rung = this.ceilingOf(cls);
        const resolved = rung === 'auto' ? PipelinesTabComponent.AUTO_RUNG[cls] ?? 'off' : rung;
        return PipelinesTabComponent.RUNS[cls]?.[resolved] ?? [];
    }
    /** True when this class runs nothing at all — the whole card reads as inert. */
    mediaOff(cls) { return this.runsAt(cls).length === 0; }
    /** Drawn as not-running: the class is off, or this rung skips the step. */
    mediaStepDim(cls, key) { return !this.runsAt(cls).includes(key); }
    /** On the path the current rung executes — mirrors `stepActive` on the document pipeline. */
    mediaStepActive(cls, key) { return this.runsAt(cls).includes(key); }
    // ── Gating a pipeline whose first step cannot run ───────────────────────────
    /** Health states that mean the step cannot do its job right now. */
    static { this.UNAVAILABLE = new Set(['down', 'blocked', 'unconfigured']); }
    /**
     * Whether a pipeline's FIRST step is unavailable.
     *
     * Everything downstream consumes its output, so if step one cannot run the rest cannot either, and
     * offering rungs that promise captioning or transcription is a promise the instance cannot keep.
     * Owner, 2026-07-30: "if step one of a pipeline is not available only allow state off and auto (=off)
     * on toggles."
     */
    firstStepUnavailable(steps) {
        const first = steps[0];
        if (!first || first.health == null)
            return false; // no endpoint to be down (in-process step)
        return PipelinesTabComponent.UNAVAILABLE.has(first.health);
    }
    /**
     * Which rungs stay selectable when step one is down: only `off` and `auto`.
     *
     * `auto` is kept because it is not a promise — it means "no ceiling of my own", and with the first
     * step unavailable it resolves to nothing running, exactly like `off`. Removing it too would strand an
     * operator whose stored value IS `auto` on a control with no valid option.
     */
    rungDisabled(cls, rung, steps) {
        if (this.s.isLocked('levels.' + cls) || this.s.managed)
            return true;
        if (!this.firstStepUnavailable(steps))
            return false;
        return rung !== 'off' && rung !== 'auto';
    }
    isInfra(cardId) { return this.infraCards.has(cardId); }
    /** Map a pipeline card's id to its config section, so each card can own its own Save. */
    pipeIdOf(id) { return `pipe-${id}`; }
    /** The stored ceiling for a class, defaulting to `auto` (no policy limit of its own). */
    ceilingOf(cls) { return (this.s.form.levels ?? {})[cls] ?? 'auto'; }
    /**
     * Set one class's ceiling. Writes only that class, mirroring the server's per-class merge — the
     * whole `levels` block is sent on save, so replacing the object here would be harmless, but keeping
     * the two sides shaped the same way is what stops them drifting apart later.
     */
    setCeiling(cls, value) {
        this.s.form.levels = { ...(this.s.form.levels ?? {}), [cls]: value };
        this.s.touched.set(true);
    }
    static { this.ɵfac = function PipelinesTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PipelinesTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: PipelinesTabComponent, selectors: [["app-pipelines-tab"]], decls: 68, vars: 55, consts: [["pipeCard", ""], [1, "statuswarn"], [1, "ceiling-hint", "tab-hint"], [3, "ngTemplateOutlet", "ngTemplateOutletContext"], [1, "pipe-card"], [1, "pipe-h"], [1, "ic"], ["name", "file", 3, "size"], [1, "t"], [3, "variant", "dot"], ["hscrollTop", "", 1, "chain"], [1, "step", 3, "cond", "dim", "active"], [1, "knobs"], [1, "knobs-h"], ["role", "group", 1, "modeseg"], ["type", "button", 3, "on", "disabled"], [1, "modedesc"], [1, "grid"], [1, "field"], ["for", "dp-dpi"], ["id", "dp-dpi", "type", "number", "min", "72", "max", "600", 3, "ngModelChange", "ngModel", "disabled"], ["for", "dp-maxpages"], ["id", "dp-maxpages", "type", "number", "min", "1", "max", "2000", 3, "ngModelChange", "ngModel", "disabled"], ["for", "dp-pagetimeout"], ["id", "dp-pagetimeout", "type", "number", "min", "1000", "max", "600000", 3, "ngModelChange", "ngModel", "disabled"], ["for", "dp-concurrency"], ["id", "dp-concurrency", "type", "number", "min", "1", "max", "8", 3, "ngModelChange", "ngModel", "disabled"], ["for", "dp-ocrtimeout"], ["id", "dp-ocrtimeout", "type", "number", "min", "10000", "max", "1800000", 3, "ngModelChange", "ngModel", "disabled"], [1, "pipe-save"], ["name", "warning", 3, "size"], [1, "step"], [1, "box"], [1, "nm"], [3, "state", "subject"], [1, "actor"], ["type", "button", 1, "link", 3, "infra"], [1, "val"], ["type", "button", 1, "link", 3, "click"], ["type", "button", 3, "click", "disabled"], ["type", "button", 1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [3, "name", "size"], [1, "ceiling"], ["variant", "env"], [1, "ceiling-warn"]], template: function PipelinesTabComponent_Template(rf, ctx) { if (rf & 1) {
            const _r1 = i0.ɵɵgetCurrentView();
            i0.ɵɵconditionalCreate(0, PipelinesTabComponent_Conditional_0_Template, 5, 7, "div", 1);
            i0.ɵɵelementStart(1, "p", 2);
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(4, PipelinesTabComponent_For_5_Template, 1, 4, "ng-container", 3, _forTrack0);
            i0.ɵɵelementStart(6, "section", 4)(7, "header", 5)(8, "span", 6);
            i0.ɵɵelement(9, "ph-icon", 7);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(10, "div", 8)(11, "h3");
            i0.ɵɵtext(12);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(14, "p");
            i0.ɵɵtext(15);
            i0.ɵɵpipe(16, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(17, "app-status-pill", 9);
            i0.ɵɵtext(18);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(20, "div", 10);
            i0.ɵɵrepeaterCreate(21, PipelinesTabComponent_For_22_Template, 10, 14, "div", 11, _forTrack1);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(23, "div", 12)(24, "div", 13);
            i0.ɵɵtext(25);
            i0.ɵɵpipe(26, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(27, "div", 14);
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵrepeaterCreate(29, PipelinesTabComponent_For_30_Template, 3, 7, "button", 15, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(31, "p", 16)(32, "b");
            i0.ɵɵtext(33);
            i0.ɵɵpipe(34, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵtext(35);
            i0.ɵɵpipe(36, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(37, "div", 17)(38, "div", 18)(39, "label", 19);
            i0.ɵɵtext(40);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(42, "input", 20);
            i0.ɵɵtwoWayListener("ngModelChange", function PipelinesTabComponent_Template_input_ngModelChange_42_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.s.form.documentProcessing.renderDpi, $event) || (ctx.s.form.documentProcessing.renderDpi = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(43, "div", 18)(44, "label", 21);
            i0.ɵɵtext(45);
            i0.ɵɵpipe(46, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(47, "input", 22);
            i0.ɵɵtwoWayListener("ngModelChange", function PipelinesTabComponent_Template_input_ngModelChange_47_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.s.form.documentProcessing.maxPages, $event) || (ctx.s.form.documentProcessing.maxPages = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(48, "div", 18)(49, "label", 23);
            i0.ɵɵtext(50);
            i0.ɵɵpipe(51, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(52, "input", 24);
            i0.ɵɵtwoWayListener("ngModelChange", function PipelinesTabComponent_Template_input_ngModelChange_52_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.s.form.documentProcessing.pageTimeoutMs, $event) || (ctx.s.form.documentProcessing.pageTimeoutMs = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(53, "div", 18)(54, "label", 25);
            i0.ɵɵtext(55);
            i0.ɵɵpipe(56, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(57, "input", 26);
            i0.ɵɵtwoWayListener("ngModelChange", function PipelinesTabComponent_Template_input_ngModelChange_57_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.s.form.documentProcessing.concurrency, $event) || (ctx.s.form.documentProcessing.concurrency = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(58, "div", 18)(59, "label", 27);
            i0.ɵɵtext(60);
            i0.ɵɵpipe(61, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(62, "input", 28);
            i0.ɵɵtwoWayListener("ngModelChange", function PipelinesTabComponent_Template_input_ngModelChange_62_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.s.form.documentProcessing.ocrTimeoutMs, $event) || (ctx.s.form.documentProcessing.ocrTimeoutMs = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()()();
            i0.ɵɵconditionalCreate(63, PipelinesTabComponent_Conditional_63_Template, 4, 4, "div", 29);
            i0.ɵɵelementEnd()();
            i0.ɵɵtemplate(64, PipelinesTabComponent_ng_template_64_Template, 21, 12, "ng-template", null, 0, i0.ɵɵtemplateRefExtractor);
            i0.ɵɵrepeaterCreate(66, PipelinesTabComponent_For_67_Template, 1, 4, "ng-container", 3, _forTrack0);
        } if (rf & 2) {
            let tmp_1_0;
            i0.ɵɵconditional((tmp_1_0 = ctx.pipeline.error()) ? 0 : -1, tmp_1_0);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 28, "mediaProcessing.pipelines.ceilingHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.textPipeline());
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("size", 17);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 30, "mediaProcessing.pipelines.documents"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(16, 32, ctx.s.docSummary().key, ctx.s.docSummary().params));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("variant", ctx.s.docVariant())("dot", true);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 35, ctx.s.docPillLabelKey()));
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.documentSteps());
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 37, "mediaProcessing.pipelines.extractionMode"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(28, 39, "mediaProcessing.pipelines.extractionMode"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.s.MODES);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(34, 41, "mediaProcessing.mode." + ctx.s.docMode()));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" \u2014 ", i0.ɵɵpipeBind1(36, 43, ctx.s.modeDescKey()));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(41, 45, "mediaProcessing.knob.renderDpi"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.documentProcessing.renderDpi);
            i0.ɵɵproperty("disabled", ctx.s.managed);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(46, 47, "mediaProcessing.knob.maxPages"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.documentProcessing.maxPages);
            i0.ɵɵproperty("disabled", ctx.s.managed);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(51, 49, "mediaProcessing.knob.pageTimeout"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.documentProcessing.pageTimeoutMs);
            i0.ɵɵproperty("disabled", ctx.s.managed);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(56, 51, "mediaProcessing.knob.pageConcurrency"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.documentProcessing.concurrency);
            i0.ɵɵproperty("disabled", ctx.s.managed);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(61, 53, "mediaProcessing.knob.ocrTimeout"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.documentProcessing.ocrTimeoutMs);
            i0.ɵɵproperty("disabled", ctx.s.managed);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.s.pipeDirty("pipe-documents") ? 63 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.otherPipelines());
        } }, dependencies: [NgTemplateOutlet, FormsModule, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.NgControlStatus, i1.MinValidator, i1.MaxValidator, i1.NgModel, PhIconComponent, StatusPillComponent, HealthDotComponent, HscrollTopDirective, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; }\n    .pipe-card[_ngcontent-%COMP%] { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;\n      margin-bottom: 16px; overflow: hidden; }\n    .pipe-h[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }\n    .ic[_ngcontent-%COMP%] { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .pipe-h[_ngcontent-%COMP%]   .t[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n    .pipe-h[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin: 0; font-size: 14.5px; font-weight: 620; }\n    .pipe-h[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n\n    \n\n    .chain[_ngcontent-%COMP%] { display: flex; gap: 0; padding: 4px 18px 16px; overflow-x: auto; }\n    .step[_ngcontent-%COMP%] { flex: 1 0 auto; min-width: 108px; max-width: 190px; position: relative; padding: 2px 5px; }\n    .step[_ngcontent-%COMP%]    + .step[_ngcontent-%COMP%]::before { content: \"\u2192\"; position: absolute; left: -6px; top: 26px;\n      color: var(--text-muted); font-size: 12px; }\n    .box[_ngcontent-%COMP%] { border: 1px solid var(--border); background: var(--bg-primary); border-radius: 9px;\n      padding: 9px 10px; height: 100%; }\n    .step.cond[_ngcontent-%COMP%]   .box[_ngcontent-%COMP%] { border-style: dashed; }\n    .step.dim[_ngcontent-%COMP%]   .box[_ngcontent-%COMP%] { opacity: .42; }\n    \n\n\n    .step.active[_ngcontent-%COMP%]   .box[_ngcontent-%COMP%] { border-color: var(--accent);\n      box-shadow: inset 0 0 0 1px var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--bg-primary)); }\n    .nm[_ngcontent-%COMP%] { font-size: 12px; font-weight: 620; display: flex; align-items: center; gap: 6px; }\n    \n\n    .actor[_ngcontent-%COMP%] { font-size: 10.5px; color: var(--text-muted); margin-top: 3px;\n      font-family: var(--font-mono, monospace); }\n    \n\n\n\n\n\n    .actor[_ngcontent-%COMP%]   .val[_ngcontent-%COMP%] { display: block; direction: rtl; text-align: left;\n      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }\n    \n\n\n    .actor[_ngcontent-%COMP%]   button.link[_ngcontent-%COMP%] { background: none; border: 0; padding: 0; font: inherit; text-align: left;\n      color: var(--text-secondary); text-decoration: underline; text-underline-offset: 2px; cursor: pointer;\n      display: block; max-width: 100%; }\n    .actor[_ngcontent-%COMP%]   button.link.infra[_ngcontent-%COMP%] { text-decoration-style: dotted; }\n    .actor[_ngcontent-%COMP%]   button.link[_ngcontent-%COMP%]:hover { color: var(--text-primary); }\n    .actor[_ngcontent-%COMP%]   button.link[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }\n\n    .knobs[_ngcontent-%COMP%] { border-top: 1px solid var(--border-muted); padding: 14px 18px; }\n    .knobs-h[_ngcontent-%COMP%] { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;\n      color: var(--text-muted); margin-bottom: 10px; }\n    .modeseg[_ngcontent-%COMP%] { display: inline-flex; background: var(--bg-primary); border: 1px solid var(--border);\n      border-radius: 9px; padding: 3px; gap: 2px; flex-wrap: wrap; }\n    .modeseg[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { border: 0; background: transparent; color: var(--text-secondary); font: inherit;\n      font-size: 12.5px; font-weight: 600; padding: 6px 13px; border-radius: 6px; cursor: pointer; }\n    .modeseg[_ngcontent-%COMP%]   button.on[_ngcontent-%COMP%] { background: var(--accent); color: var(--accent-text, #0d1117); }\n    .modeseg[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .modedesc[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-secondary); margin: 11px 0 0; }\n    .modedesc[_ngcontent-%COMP%]     b { color: var(--text-primary); }\n\n    .ceiling[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12.5px;\n      color: var(--text-secondary); margin-bottom: 9px; }\n    .ceiling[_ngcontent-%COMP%]:last-child { margin-bottom: 0; }\n    .ceiling[_ngcontent-%COMP%]    > label[_ngcontent-%COMP%] { min-width: 108px; font-weight: 500; }\n    \n\n\n    .ceiling[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { background: var(--bg-primary); color: var(--text-primary); font-size: 13px;\n      border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px;\n      width: auto; min-width: 190px; max-width: 260px; }\n    .ceiling[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:disabled { opacity: .6; cursor: not-allowed; }\n    .ceiling-hint[_ngcontent-%COMP%] { font-size: 12px; color: var(--text-muted); margin: 0 0 11px; max-width: 70ch; }\n    \n\n\n    .pipe-save[_ngcontent-%COMP%] { display: flex; justify-content: flex-end; margin-top: 12px; }\n    \n\n    .tab-hint[_ngcontent-%COMP%] { margin: 0 0 16px; }\n    \n\n\n    .ceiling-warn[_ngcontent-%COMP%] { color: var(--warning); font-size: 11.5px; }\n\n    .grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px 16px; margin-top: 14px; }\n    .field[_ngcontent-%COMP%]    > label[_ngcontent-%COMP%] { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }\n    \n\n\n\n    .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:disabled { opacity: .6; cursor: not-allowed; }\n    .warnline[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }\n    .warnline[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; margin-top: 1px; }\n    .statuswarn[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 12px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--border); background: var(--bg-surface);\n      color: var(--text-secondary); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PipelinesTabComponent, [{
        type: Component,
        args: [{ selector: 'app-pipelines-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [NgTemplateOutlet, FormsModule, TranslocoPipe, PhIconComponent, StatusPillComponent, HealthDotComponent, HscrollTopDirective], template: `
    @if (pipeline.error(); as e) {
      <!-- A failed status fetch must not read as "everything is off" — say which it is. -->
      <div class="statuswarn">
        <ph-icon name="warning" [size]="15"/>
        <span>{{ 'mediaProcessing.pipelines.statusUnavailable' | transloco: { detail: e } }}</span>
      </div>
    }

    <!-- The ceiling rule is one rule for the whole tab, so it is stated once here rather than repeated
         under every pipeline's ceiling control — five copies of the same paragraph is noise a reader
         learns to skip, which defeats the point of explaining it at all. -->
    <p class="ceiling-hint tab-hint">{{ 'mediaProcessing.pipelines.ceilingHint' | transloco }}</p>

    <!-- ── Text (first: the poorest medium) ───────────────────────────── -->
    @for (p of textPipeline(); track p.id) {
      <ng-container [ngTemplateOutlet]="pipeCard" [ngTemplateOutletContext]="{ $implicit: p }"/>
    }

    <!-- ── Documents ──────────────────────────────────────────────────── -->
    <section class="pipe-card">
      <header class="pipe-h">
        <span class="ic"><ph-icon name="file" [size]="17"/></span>
        <div class="t">
          <h3>{{ 'mediaProcessing.pipelines.documents' | transloco }}</h3>
          <p>{{ s.docSummary().key | transloco: s.docSummary().params }}</p>
        </div>
        <app-status-pill [variant]="s.docVariant()" [dot]="true">{{ s.docPillLabelKey() | transloco }}</app-status-pill>
      </header>

      <div class="chain" hscrollTop>
        @for (st of documentSteps(); track st.key) {
          <div class="step" [class.cond]="st.conditional" [class.dim]="stepDim(st.key)" [class.active]="stepActive(st.key)">
            <div class="box">
              <div class="nm">{{ st.name | transloco }}<app-health-dot [state]="st.health" [subject]="st.name | transloco"/></div>
              <div class="actor">
                @if (st.cardId; as cid) {
                  <button type="button" class="link" [class.infra]="isInfra(cid)" (click)="s.requestFocusCard(cid)"
                    [attr.title]="st.actor" [attr.aria-label]="('mediaProcessing.pipelines.configureLink' | transloco) + ': ' + st.actor"><span class="val"><bdi>{{ st.actor }}</bdi></span></button>
                } @else {
                  <span class="val" [attr.title]="st.actor"><bdi>{{ st.actor }}</bdi></span>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <div class="knobs">
        <div class="knobs-h">{{ 'mediaProcessing.pipelines.extractionMode' | transloco }}</div>
        <div class="modeseg" role="group" [attr.aria-label]="'mediaProcessing.pipelines.extractionMode' | transloco">
          @for (m of s.MODES; track m) {
            <button type="button" [class.on]="s.docMode() === m" [attr.aria-pressed]="s.docMode() === m" (click)="s.setMode(m)" [disabled]="s.managed">
              {{ 'mediaProcessing.mode.' + m | transloco }}
            </button>
          }
        </div>
        <p class="modedesc"><b>{{ 'mediaProcessing.mode.' + s.docMode() | transloco }}</b> — {{ s.modeDescKey() | transloco }}</p>

        <!-- The "no vision model configured, falls back to OCR" case is already carried by the header
             pill ("OCR fallback") and the pipeline summary line, so the extra warning box was redundant
             noise — removed per owner feedback. -->

        <div class="grid">
          <div class="field">
            <label for="dp-dpi">{{ 'mediaProcessing.knob.renderDpi' | transloco }}</label>
            <input id="dp-dpi" type="number" min="72" max="600" [(ngModel)]="s.form.documentProcessing!.renderDpi" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-maxpages">{{ 'mediaProcessing.knob.maxPages' | transloco }}</label>
            <input id="dp-maxpages" type="number" min="1" max="2000" [(ngModel)]="s.form.documentProcessing!.maxPages" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-pagetimeout">{{ 'mediaProcessing.knob.pageTimeout' | transloco }}</label>
            <input id="dp-pagetimeout" type="number" min="1000" max="600000" [(ngModel)]="s.form.documentProcessing!.pageTimeoutMs" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-concurrency">{{ 'mediaProcessing.knob.pageConcurrency' | transloco }}</label>
            <input id="dp-concurrency" type="number" min="1" max="8" [(ngModel)]="s.form.documentProcessing!.concurrency" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-ocrtimeout">{{ 'mediaProcessing.knob.ocrTimeout' | transloco }}</label>
            <input id="dp-ocrtimeout" type="number" min="10000" max="1800000" [(ngModel)]="s.form.documentProcessing!.ocrTimeoutMs" [disabled]="s.managed" />
          </div>
        </div>
        @if (s.pipeDirty('pipe-documents')) {
          <div class="pipe-save">
            <button class="btn btn-sm btn-primary" type="button"
              [disabled]="s.saving()" (click)="s.savePipe('pipe-documents')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          </div>
        }
      </div>
    </section>

    <!-- ── Images / Audio / Video / Text ──────────────────────────────── -->
    <!-- One card definition, instantiated twice: Text renders ABOVE the document pipeline and the rest
         below it, so the page reads poor → rich media. Documents cannot join the list because its
         control is an extraction mode rather than a class ceiling. -->
    <ng-template #pipeCard let-p>
      <section class="pipe-card">
        <header class="pipe-h">
          <span class="ic"><ph-icon [name]="p.icon" [size]="17"/></span>
          <div class="t">
            <h3>{{ p.title | transloco }}</h3>
            <p>{{ p.purpose | transloco }}</p>
          </div>
        </header>

        <div class="chain" hscrollTop>
          @for (st of p.steps; track st.key) {
            <!-- dim/active, same as the document pipeline. Without these the four media pipelines showed
                 availability only: green dots everywhere and no indication of which steps the chosen
                 rung actually executes. -->
            <div class="step" [class.cond]="st.conditional"
                 [class.dim]="mediaStepDim(p.id, st.key)" [class.active]="mediaStepActive(p.id, st.key)">
              <div class="box">
                <div class="nm">{{ st.name | transloco }}<app-health-dot [state]="st.health" [subject]="st.name | transloco"/></div>
                <div class="actor">
                  @if (st.cardId; as cid) {
                    <button type="button" class="link" [class.infra]="isInfra(cid)" (click)="s.requestFocusCard(cid)"
                      [attr.title]="st.actor" [attr.aria-label]="('mediaProcessing.pipelines.configureLink' | transloco) + ': ' + st.actor"><span class="val"><bdi>{{ st.actor }}</bdi></span></button>
                  } @else {
                    <span class="val" [attr.title]="st.actor"><bdi>{{ st.actor }}</bdi></span>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <div class="knobs">
          <div class="knobs-h">{{ 'mediaProcessing.pipelines.ceiling' | transloco }}</div>
          @for (c of p.ceilings; track c.cls) {
            <div class="ceiling">
              <label>{{ 'mediaProcessing.class.' + c.cls | transloco }}</label>
              <!-- Every media pipeline is single-class, so each uses the same segmented buttons as the
                   document extraction mode — one control vocabulary across all of them. -->
              <div class="modeseg" role="group" [attr.aria-label]="'mediaProcessing.class.' + c.cls | transloco">
                @for (rung of c.ladder; track rung) {
                  <button type="button" [class.on]="ceilingOf(c.cls) === rung" [attr.aria-pressed]="ceilingOf(c.cls) === rung" (click)="setCeiling(c.cls, rung)"
                    [disabled]="rungDisabled(c.cls, rung, p.steps)">
                    {{ 'mediaProcessing.level.' + rung | transloco }}
                  </button>
                }
              </div>
              @if (s.isLocked('levels.' + c.cls)) { <app-status-pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }
              @if (firstStepUnavailable(p.steps)) {
                <!-- Say WHY the rungs are greyed out. A disabled control with no explanation is read as
                     a bug, and the operator's next move is on the Models tab, not here. -->
                <span class="ceiling-warn">{{ 'mediaProcessing.pipelines.firstStepDown' | transloco }}</span>
              }
              @if (ceilingOf(c.cls) === 'off') {
                <!-- "off" is a floor as well as a ceiling: it takes the class offline for every space,
                     whatever that space asked for. Worth saying where it is chosen, not in a doc. -->
                <span class="ceiling-warn">{{ 'mediaProcessing.pipelines.ceilingOffWarning' | transloco }}</span>
              }
            </div>
          }
          <!-- This pipeline's own Save, shown only when this pipeline changed. -->
          @if (s.pipeDirty(pipeIdOf(p.id))) {
            <div class="pipe-save">
              <button class="btn btn-sm btn-primary" type="button"
                [disabled]="s.saving()" (click)="s.savePipe(pipeIdOf(p.id))">
                {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
              </button>
            </div>
          }
        </div>
      </section>
    </ng-template>

    <!-- The rest of the media pipelines, after Documents. -->
    @for (p of otherPipelines(); track p.id) {
      <ng-container [ngTemplateOutlet]="pipeCard" [ngTemplateOutletContext]="{ $implicit: p }"/>
    }
  `, styles: ["\n    :host { display: block; }\n    .pipe-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;\n      margin-bottom: 16px; overflow: hidden; }\n    .pipe-h { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }\n    .ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .pipe-h .t { flex: 1; min-width: 0; }\n    .pipe-h h3 { margin: 0; font-size: 14.5px; font-weight: 620; }\n    .pipe-h p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n\n    /* The chain scrolls inside itself rather than widening the page \u2014 this has to survive an iframe. */\n    .chain { display: flex; gap: 0; padding: 4px 18px 16px; overflow-x: auto; }\n    .step { flex: 1 0 auto; min-width: 108px; max-width: 190px; position: relative; padding: 2px 5px; }\n    .step + .step::before { content: \"\u2192\"; position: absolute; left: -6px; top: 26px;\n      color: var(--text-muted); font-size: 12px; }\n    .box { border: 1px solid var(--border); background: var(--bg-primary); border-radius: 9px;\n      padding: 9px 10px; height: 100%; }\n    .step.cond .box { border-style: dashed; }\n    .step.dim .box { opacity: .42; }\n    /* The extraction mode marks the steps it actually runs: an accent border + faint tint, so the live\n       path stands out from the dimmed ones at a glance. */\n    .step.active .box { border-color: var(--accent);\n      box-shadow: inset 0 0 0 1px var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--bg-primary)); }\n    .nm { font-size: 12px; font-weight: 620; display: flex; align-items: center; gap: 6px; }\n    /* The actor is the model, the dot is the state \u2014 kept visually separate on purpose. */\n    .actor { font-size: 10.5px; color: var(--text-muted); margin-top: 3px;\n      font-family: var(--font-mono, monospace); }\n    /* Model ids are long and their TAIL is the identifying part: \"nomic-ai/nomic-embed-text-v1.5\" is\n       told apart from its siblings by the version, not the vendor. So this truncates from the START.\n       direction:rtl puts the overflow (and therefore the ellipsis) on the left; the value itself is\n       wrapped in <bdi> so it still reads left-to-right instead of being reordered by the rtl context.\n       Previously this wrapped (overflow-wrap:anywhere) and spilled out of the fixed-height box. */\n    .actor .val { display: block; direction: rtl; text-align: left;\n      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }\n    /* A configurable step's actor is a link back to the Models-tab card that configures it. A real\n       button (not an anchor) so keyboard + screen readers get it for free. */\n    .actor button.link { background: none; border: 0; padding: 0; font: inherit; text-align: left;\n      color: var(--text-secondary); text-decoration: underline; text-underline-offset: 2px; cursor: pointer;\n      display: block; max-width: 100%; }\n    .actor button.link.infra { text-decoration-style: dotted; }\n    .actor button.link:hover { color: var(--text-primary); }\n    .actor button.link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }\n\n    .knobs { border-top: 1px solid var(--border-muted); padding: 14px 18px; }\n    .knobs-h { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;\n      color: var(--text-muted); margin-bottom: 10px; }\n    .modeseg { display: inline-flex; background: var(--bg-primary); border: 1px solid var(--border);\n      border-radius: 9px; padding: 3px; gap: 2px; flex-wrap: wrap; }\n    .modeseg button { border: 0; background: transparent; color: var(--text-secondary); font: inherit;\n      font-size: 12.5px; font-weight: 600; padding: 6px 13px; border-radius: 6px; cursor: pointer; }\n    .modeseg button.on { background: var(--accent); color: var(--accent-text, #0d1117); }\n    .modeseg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .modedesc { font-size: 12.5px; color: var(--text-secondary); margin: 11px 0 0; }\n    .modedesc ::ng-deep b { color: var(--text-primary); }\n\n    .ceiling { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12.5px;\n      color: var(--text-secondary); margin-bottom: 9px; }\n    .ceiling:last-child { margin-bottom: 0; }\n    .ceiling > label { min-width: 108px; font-weight: 500; }\n    /* The global select rule sets width:100%, which would take the whole row and wrap the label above\n       it \u2014 these read as a labelled row, not a stack of full-width fields. */\n    .ceiling select { background: var(--bg-primary); color: var(--text-primary); font-size: 13px;\n      border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px;\n      width: auto; min-width: 190px; max-width: 260px; }\n    .ceiling select:disabled { opacity: .6; cursor: not-allowed; }\n    .ceiling-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 11px; max-width: 70ch; }\n    /* Each pipeline's own Save, appearing only when that pipeline changed \u2014 same contract as the\n       Models cards. Right-aligned inside the knobs block so it reads as belonging to it. */\n    .pipe-save { display: flex; justify-content: flex-end; margin-top: 12px; }\n    /* Hoisted to the top of the tab: needs the breathing room a knobs block used to give it. */\n    .tab-hint { margin: 0 0 16px; }\n    /* Not a warning box: choosing \"off\" is legitimate. It states the blast radius, which is easy to\n       miss when the control sits next to three that only affect thoroughness. */\n    .ceiling-warn { color: var(--warning); font-size: 11.5px; }\n\n    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px 16px; margin-top: 14px; }\n    .field > label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }\n    /* Geometry comes from the ONE input rule in styles.scss. This was a second, identical copy of the block that\n       models-tab also had \u2014 including the same wrong 8px radius. The re-measurement is what found it: inputs still\n       reported 38px after the first copy was removed, because both tabs render on the Models page. */\n    .field input:disabled { opacity: .6; cursor: not-allowed; }\n    .warnline { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }\n    .warnline ph-icon { flex: none; margin-top: 1px; }\n    .statuswarn { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 12px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--border); background: var(--bg-surface);\n      color: var(--text-secondary); }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(PipelinesTabComponent, { className: "PipelinesTabComponent", filePath: "app/pages/settings/media-processing/pipelines-tab.component.ts", lineNumber: 318 }); })();
