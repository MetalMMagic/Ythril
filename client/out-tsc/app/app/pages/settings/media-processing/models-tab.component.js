/**
 * Tab 1 — Models. Anything you or infra can set.
 *
 * Seven cards, all through `app-model-provider-card`, all in one field order:
 * **provider → endpoint → model → credential → test**. The four configurable ones (embedding, vision,
 * speech-to-text, assist) previously each chose their own order inside one big file; the three
 * infra-owned ones (page renderer, document converter, face recognition) had no card at all — the
 * renderer and converter were a caption, and face recognition was absent from the admin surface
 * entirely, which is why it still shows here as read-only until it gets a real control.
 *
 * Rows that do not apply are omitted rather than dashed, per the owner's option B.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent } from '../../../shared/status-pill.component';
import { ModelProviderCardComponent } from './model-provider-card.component';
import { MediaProcessingStateService } from './media-processing-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { SchemaApi } from '../../../core/schema-api.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ host: a0 });
function ModelsTabComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function ModelsTabComponent_Conditional_69_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function ModelsTabComponent_Conditional_76_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31);
    i0.ɵɵelement(1, "ph-icon", 78)(2, "span", 96);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind1(3, 2, "mediaProcessing.embedding.reindexWarning"), i0.ɵɵsanitizeHtml);
} }
function ModelsTabComponent_Conditional_81_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 11);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "mediaProcessing.test.inProcess"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "mediaProcessing.test.inProcess"));
} }
function ModelsTabComponent_Conditional_82_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r1 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.testPillVariant(r_r1))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.testPillLabelKey(r_r1)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", r_r1.detail || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r1.detail || r_r1.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_83_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const v_r3 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.verifyPillVariant(v_r3))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.verifyPillLabelKey(v_r3)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", v_r3.detail || v_r3.sample || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(v_r3.sample || v_r3.detail || v_r3.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_88_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_88_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("embedding")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
function ModelsTabComponent_Conditional_95_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function ModelsTabComponent_Conditional_123_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31);
    i0.ɵɵelement(1, "ph-icon", 78)(2, "span", 96);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind1(3, 2, "mediaProcessing.rerank.egressWarning"), i0.ɵɵsanitizeHtml);
} }
function ModelsTabComponent_Conditional_128_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r5 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.testPillVariant(r_r5))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.testPillLabelKey(r_r5)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", r_r5.detail || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r5.detail || r_r5.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_129_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_129_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r6); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("rerank")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
function ModelsTabComponent_Conditional_136_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function ModelsTabComponent_Conditional_157_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31);
    i0.ɵɵelement(1, "ph-icon", 78)(2, "span", 96);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind1(3, 2, "mediaProcessing.nli.egressWarning"), i0.ɵɵsanitizeHtml);
} }
function ModelsTabComponent_Conditional_162_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r7 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.testPillVariant(r_r7))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.testPillLabelKey(r_r7)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", r_r7.detail || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r7.detail || r_r7.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_163_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_163_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("nli")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
function ModelsTabComponent_Conditional_170_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function ModelsTabComponent_Conditional_202_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r9 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.testPillVariant(r_r9))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.testPillLabelKey(r_r9)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", r_r9.detail || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r9.detail || r_r9.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_203_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const v_r10 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.verifyPillVariant(v_r10))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.verifyPillLabelKey(v_r10)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", v_r10.detail || v_r10.sample || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(v_r10.sample || v_r10.detail || v_r10.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_208_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_208_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("vision")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
function ModelsTabComponent_Conditional_215_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.pill.env"));
} }
function ModelsTabComponent_Conditional_247_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r12 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.testPillVariant(r_r12))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.testPillLabelKey(r_r12)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", r_r12.detail || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r12.detail || r_r12.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_248_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const v_r13 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.verifyPillVariant(v_r13))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.verifyPillLabelKey(v_r13)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", v_r13.detail || v_r13.sample || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(v_r13.sample || v_r13.detail || v_r13.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_253_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_253_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("stt")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
function ModelsTabComponent_Conditional_260_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 70);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "mediaProcessing.assist.pillAcknowledged", i0.ɵɵpureFunction1(4, _c0, ctx_r1.s.assist.acknowledgedHost)));
} }
function ModelsTabComponent_Conditional_286_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(1, 1, "mediaProcessing.assist.egressPending", i0.ɵɵpureFunction1(4, _c0, ctx_r1.s.assistHost())), " ");
} }
function ModelsTabComponent_Conditional_291_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r15 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.testPillVariant(r_r15))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.testPillLabelKey(r_r15)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", r_r15.detail || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r15.detail || r_r15.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_292_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 97);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 11);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const v_r16 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r1.s.verifyPillVariant(v_r16))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 5, ctx_r1.s.verifyPillLabelKey(v_r16)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", v_r16.detail || v_r16.sample || null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(v_r16.sample || v_r16.detail || v_r16.latencyMs + " ms");
} }
function ModelsTabComponent_Conditional_297_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_297_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("assist")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
function ModelsTabComponent_Conditional_358_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 80);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "mediaProcessing.field.lastProbe"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx);
} }
function ModelsTabComponent_Conditional_368_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 80);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "mediaProcessing.field.lastProbe"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx);
} }
function ModelsTabComponent_Conditional_378_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 80);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "mediaProcessing.field.lastProbe"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx);
} }
function ModelsTabComponent_Conditional_385_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 87);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "mediaProcessing.face.enabledPinned"), " ");
} }
function ModelsTabComponent_Conditional_386_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31);
    i0.ɵɵelement(1, "ph-icon", 78);
    i0.ɵɵelementStart(2, "span");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 2, "mediaProcessing.face.awaitingAck", i0.ɵɵpureFunction1(5, _c0, ctx_r1.s.faceExternalHost())));
} }
function ModelsTabComponent_Conditional_395_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 103);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(2, 1, "mediaProcessing.face.egressPending", i0.ɵɵpureFunction1(4, _c0, ctx_r1.s.faceExternalHost())), " ");
} }
function ModelsTabComponent_Conditional_395_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 104);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("variant", "ok");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 2, "mediaProcessing.face.egressAcknowledged", i0.ɵɵpureFunction1(5, _c0, ctx_r1.s.faceExternal.acknowledgedHost)));
} }
function ModelsTabComponent_Conditional_395_Template(rf, ctx) { if (rf & 1) {
    const _r18 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 4)(2, "label", 99);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "input", 100);
    i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Conditional_395_Template_input_ngModelChange_5_listener($event) { i0.ɵɵrestoreView(_r18); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.s.faceExternal.model, $event) || (ctx_r1.s.faceExternal.model = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "div", 4)(7, "label", 101);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "input", 102);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Conditional_395_Template_input_ngModelChange_10_listener($event) { i0.ɵɵrestoreView(_r18); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.s.faceApiKeyInput, $event) || (ctx_r1.s.faceApiKeyInput = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(12, ModelsTabComponent_Conditional_395_Conditional_12_Template, 3, 6, "div", 103)(13, ModelsTabComponent_Conditional_395_Conditional_13_Template, 3, 7, "app-status-pill", 104);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 8, "mediaProcessing.face.externalModelName"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.s.faceExternal.model);
    i0.ɵɵproperty("disabled", ctx_r1.s.faceExternalLocked() || ctx_r1.s.managed);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 10, "mediaProcessing.face.apiKey"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.s.faceApiKeyInput);
    i0.ɵɵproperty("disabled", ctx_r1.s.faceExternalLocked() || ctx_r1.s.managed)("placeholder", i0.ɵɵpipeBind1(11, 12, "mediaProcessing.face.apiKeyPlaceholder"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.s.faceExternalNeedsAck() ? 12 : 13);
} }
function ModelsTabComponent_Conditional_417_For_2_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r19 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 107);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_417_For_2_Conditional_2_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r19); const t_r20 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.removePersonType(t_r20)); });
    i0.ɵɵelement(2, "ph-icon", 108);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "common.remove"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
} }
function ModelsTabComponent_Conditional_417_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 105);
    i0.ɵɵtext(1);
    i0.ɵɵconditionalCreate(2, ModelsTabComponent_Conditional_417_For_2_Conditional_2_Template, 3, 4, "button", 106);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r20 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", t_r20, " ");
    i0.ɵɵadvance();
    i0.ɵɵconditional(!(ctx_r1.s.faceLocked("personEntityTypes") || ctx_r1.s.managed) ? 2 : -1);
} }
function ModelsTabComponent_Conditional_417_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 94);
    i0.ɵɵrepeaterCreate(1, ModelsTabComponent_Conditional_417_For_2_Template, 3, 2, "span", 105, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.s.face.personEntityTypes);
} }
function ModelsTabComponent_Conditional_418_Conditional_0_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 112);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r22 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r22);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r22);
} }
function ModelsTabComponent_Conditional_418_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r21 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 110);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("ngModelChange", function ModelsTabComponent_Conditional_418_Conditional_0_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.addPersonType($event)); });
    i0.ɵɵelementStart(2, "option", 111);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(5, ModelsTabComponent_Conditional_418_Conditional_0_For_6_Template, 2, 2, "option", 112, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("ngModel", "");
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 3, "mediaProcessing.face.personTypesAdd"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 5, "mediaProcessing.face.personTypesAdd"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.availablePersonTypes());
} }
function ModelsTabComponent_Conditional_418_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.face.personTypesEmpty"));
} }
function ModelsTabComponent_Conditional_418_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ModelsTabComponent_Conditional_418_Conditional_0_Template, 7, 7, "select", 109)(1, ModelsTabComponent_Conditional_418_Conditional_1_Template, 3, 3, "div", 11);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.availablePersonTypes().length ? 0 : !ctx_r1.libEntityTypes().length ? 1 : -1);
} }
function ModelsTabComponent_Conditional_429_Template(rf, ctx) { if (rf & 1) {
    const _r23 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 98);
    i0.ɵɵlistener("click", function ModelsTabComponent_Conditional_429_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.s.saveCard("face")); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("disabled", ctx_r1.s.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, ctx_r1.s.saving() ? "common.saving" : "common.save"), " ");
} }
/**
 * FACE_CARD_NOTES — why the face card labels two things separately, and the two prose rules above it.
 *
 * ## PROSE RULES INSIDE THE TEMPLATE, both load-bearing
 *
 * **No backtick.** The inline template is a template literal, so one backtick ends the string and the error
 * lands on `@Component`, nowhere near the line that caused it.
 *
 * **No apostrophe.** The markup walk in `_structural-window.mjs` lexes quotes, so a stray `'` in a comment
 * opened a phantom string that swallowed the braces after it. That is how a comment edit here silently blinded
 * `infra-managed-locks-every-field` to two enclosing `@if` guards, after which it reported a correctly guarded
 * control as a defect. The walk now skips comments, so the hazard is gone — but long prose belongs in a JS
 * comment like this one regardless, where it is neither lexed as markup nor counted as code.
 *
 * ## The card names what it EDITS, which is the endpoint
 *
 * It used to pass `faceLocked('enabled')` as its whole-card infra flag, so pinning `FACE_RECOGNITION_ENABLED`
 * dimmed the entire card to 62% and labelled it "Set by infra" while every control inside stayed operable and
 * governed by a different variable. An operator read that as "none of this is mine" and reported the endpoint
 * as unconfigurable. The assist card — the direct analogue — has never claimed whole-card ownership from a
 * field it does not edit.
 *
 * Owner ruling P-12 (A), 2026-08-20: *"may this instance use faces"* belongs to infra, *"may crops leave for
 * this host"* belongs to the operator. So the enable pin gets its own line saying what it does and does not
 * reach, and the card's dimming follows the endpoint lock.
 *
 * ## And the awaiting-acknowledgement notice
 *
 * Configured, stored, and NOT IN USE — a state that became reachable when consent moved to gating USE rather
 * than the validity of the config. It is silent by nature: faces fall back to the in-process model exactly as
 * they would for an unreachable endpoint. Quiet is right for *unreachable*, which nobody chose, and wrong for
 * *unacknowledged*, which is a decision waiting on a person. So the card says so rather than letting it be met
 * as a refusal.
 */
export class ModelsTabComponent {
    constructor() {
        this.s = inject(MediaProcessingStateService);
        this.pipeline = inject(PipelineStatusService);
        this.schemaApi = inject(SchemaApi);
        /** Face recognition runs in-process, so its only health is enabled/disabled. */
        this.faceState = computed(() => this.pipeline.status()?.faceRecognition.state ?? null, ...(ngDevMode ? [{ debugName: "faceState" }] : /* istanbul ignore next */ []));
        /** Entity type names defined in the Schema Library — the source for the person-types picker. */
        this.libEntityTypes = signal([], ...(ngDevMode ? [{ debugName: "libEntityTypes" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        // Load the library once so the person-types picker can offer known entity types by name.
        this.schemaApi.listSchemaLibrary().subscribe({
            next: ({ entries }) => this.libEntityTypes.set([...new Set(entries.filter(e => e.knowledgeType === 'entity').map(e => e.typeName))].sort()),
            error: () => this.libEntityTypes.set([]),
        });
    }
    /**
     * Person entity types govern the face gallery: only entities of these types are ever auto-labelled.
     * They are picked from the Schema Library's entity types (below), but any value already stored — e.g.
     * from before this was library-backed, or a type since removed from the library — stays selectable
     * and removable so nothing silently drops.
     */
    personTypes() { return this.s.face.personEntityTypes ?? []; }
    /**
     * Library entity types not already selected — the options the "add" dropdown offers. Deliberately a
     * method, not a computed: `s.face.personEntityTypes` is a plain field (not a signal), so a computed
     * would never re-run when the selection changes; a method re-evaluates every change-detection pass.
     */
    availablePersonTypes() {
        const selected = new Set(this.s.face.personEntityTypes ?? []);
        return this.libEntityTypes().filter(t => !selected.has(t));
    }
    addPersonType(type) {
        const t = type.trim();
        if (!t || this.personTypes().includes(t))
            return;
        this.s.face.personEntityTypes = [...this.personTypes(), t];
        this.s.touched.set(true); // programmatic change — the page's input listener won't see it
    }
    removePersonType(type) {
        this.s.face.personEntityTypes = this.personTypes().filter(t => t !== type);
        this.s.touched.set(true);
    }
    sidecarUrl(key) { return this.pipeline.bySidecarKey().get(key)?.url ?? '—'; }
    sidecarDetail(key) { return this.pipeline.bySidecarKey().get(key)?.detail ?? null; }
    /** Narrows the string union for `testConnection` call sites in the template. */
    target(t) { return t; }
    static { this.ɵfac = function ModelsTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ModelsTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ModelsTabComponent, selectors: [["app-models-tab"]], decls: 430, vars: 502, consts: [[1, "cards"], ["id", "embedding", "icon", "database", 3, "heading", "purpose", "health"], ["pill", "", 3, "variant"], ["pill", "", "variant", "env"], [1, "field"], ["for", "emb-provider"], ["id", "emb-provider", 3, "ngModelChange", "ngModel", "disabled"], ["value", "local"], ["value", "external"], ["for", "emb-endpoint"], ["id", "emb-endpoint", "data-mono", "", "type", "url", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], [1, "hint"], ["for", "emb-model"], ["id", "emb-model", "data-mono", "", "placeholder", "nomic-embed-text", 3, "ngModelChange", "ngModel", "disabled"], [1, "grid2"], ["for", "emb-dims"], ["id", "emb-dims", "type", "number", "min", "1", "max", "16384", 3, "ngModelChange", "ngModel", "disabled"], ["for", "emb-sim"], ["id", "emb-sim", 3, "ngModelChange", "ngModel", "disabled"], ["value", "cosine"], ["value", "dotProduct"], ["value", "euclidean"], ["for", "emb-prefix"], ["id", "emb-prefix", 3, "ngModelChange", "ngModel", "disabled"], ["value", "auto"], ["value", "none"], ["value", "nomic"], ["value", "qwen"], [1, "hint", 3, "innerHTML"], ["for", "emb-key"], ["id", "emb-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], [1, "warnline"], ["footer", "", 1, "testrow"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], ["type", "button", 1, "btn", "btn-sm", "btn-primary", "card-save", 3, "disabled"], ["id", "rerank", "icon", "sort-descending", 3, "heading", "purpose", "health"], ["for", "rr-endpoint"], ["id", "rr-endpoint", "data-mono", "", "type", "url", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["for", "rr-model"], ["id", "rr-model", "data-mono", "", "placeholder", "BAAI/bge-reranker-v2-m3", 3, "ngModelChange", "ngModel", "disabled"], ["for", "rr-mult"], ["id", "rr-mult", "type", "number", "min", "2", "max", "10", 3, "ngModelChange", "ngModel", "disabled"], ["for", "rr-key"], ["id", "rr-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["id", "nli", "icon", "check-circle", 3, "heading", "purpose", "health"], ["for", "nli-endpoint"], ["id", "nli-endpoint", "data-mono", "", "type", "url", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["for", "nli-model"], ["id", "nli-model", "data-mono", "", "placeholder", "MoritzLaurer/deberta-v3-base-zeroshot-v2.0", 3, "ngModelChange", "ngModel", "disabled"], ["for", "nli-key"], ["id", "nli-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["id", "vision", "icon", "image", 3, "heading", "purpose", "health"], ["for", "vis-provider"], ["id", "vis-provider", 3, "ngModelChange", "ngModel", "disabled"], ["for", "vis-endpoint"], ["id", "vis-endpoint", "data-mono", "", "type", "url", "placeholder", "http://ollama:11434", 3, "ngModelChange", "ngModel", "disabled"], ["for", "vis-model"], ["id", "vis-model", "data-mono", "", "placeholder", "moondream", 3, "ngModelChange", "ngModel", "disabled"], ["for", "vis-key"], ["id", "vis-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["id", "stt", "icon", "microphone", 3, "heading", "purpose", "health"], ["for", "stt-provider"], ["id", "stt-provider", 3, "ngModelChange", "ngModel", "disabled"], ["for", "stt-endpoint"], ["id", "stt-endpoint", "data-mono", "", "type", "url", "placeholder", "http://whisper:8000", 3, "ngModelChange", "ngModel", "disabled"], ["for", "stt-model"], ["id", "stt-model", "data-mono", "", "placeholder", "base", 3, "ngModelChange", "ngModel", "disabled"], ["for", "stt-key"], ["id", "stt-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["id", "assist", "icon", "globe", 3, "heading", "purpose", "health"], ["pill", "", "variant", "ok"], ["for", "assist-endpoint"], ["id", "assist-endpoint", "data-mono", "", "type", "url", "placeholder", "https://api.example.com", 3, "ngModelChange", "ngModel", "disabled"], ["for", "assist-model"], ["id", "assist-model", "data-mono", "", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], ["for", "assist-key"], ["id", "assist-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], [1, "hint", 2, "margin-bottom", "10px"], ["name", "warning", 3, "size"], ["id", "doc-vlm", "icon", "file-image", "envVar", "DOC_VLM_MODEL", 3, "heading", "purpose", "health", "infra"], [1, "ro"], ["id", "doc-repair", "icon", "file-image", "envVar", "DOC_REPAIR_MODEL", 3, "heading", "purpose", "health", "infra"], ["id", "doc-verify", "icon", "file-image", "envVar", "DOC_VERIFY_MODEL", 3, "heading", "purpose", "health", "infra"], ["id", "doc-render", "icon", "file-image", "envVar", "RENDER_SIDECAR_URL", 3, "heading", "purpose", "health", "infra"], ["id", "doc-office", "icon", "stack", "envVar", "RENDER_OFFICE_SIDECAR_URL", 3, "heading", "purpose", "health", "infra"], ["id", "unstructured", "icon", "file", "envVar", "CONVERSION_SIDECAR_URL", 3, "heading", "purpose", "health", "infra"], ["id", "face", "icon", "user", "envVar", "FACE_RECOGNITION_EXTERNAL_MODEL", 3, "heading", "purpose", "health", "infra"], [1, "hint", 2, "margin-bottom", "12px"], ["for", "face-endpoint"], ["id", "face-endpoint", "data-mono", "", "type", "url", "placeholder", "https://faces.example.com/embed", 3, "ngModelChange", "ngModel", "disabled"], ["for", "face-conf"], ["id", "face-conf", "type", "number", "min", "0", "max", "1", "step", "0.05", 3, "ngModelChange", "ngModel", "disabled"], ["for", "face-minsize"], ["id", "face-minsize", "type", "number", "min", "0", "max", "1", "step", "0.01", 3, "ngModelChange", "ngModel", "disabled"], [1, "ptype-chips"], [1, "field", 2, "margin-bottom", "0"], [3, "innerHTML"], [3, "variant", "dot"], ["type", "button", 1, "btn", "btn-sm", "btn-primary", "card-save", 3, "click", "disabled"], ["for", "face-ext-model"], ["id", "face-ext-model", "data-mono", "", 3, "ngModelChange", "ngModel", "disabled"], ["for", "face-key"], ["id", "face-key", "type", "password", 3, "ngModelChange", "ngModel", "disabled", "placeholder"], [1, "alert", "alert-warning", 2, "font-size", "12px", "margin-bottom", "12px"], [3, "variant"], [1, "ptype-chip"], ["type", "button", 1, "ptype-rm"], ["type", "button", 1, "ptype-rm", 3, "click"], ["name", "x", 3, "size"], [3, "ngModel"], [3, "ngModelChange", "ngModel"], ["value", "", "disabled", ""], [3, "value"]], template: function ModelsTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-model-provider-card", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementStart(4, "app-status-pill", 2);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(7, ModelsTabComponent_Conditional_7_Template, 3, 3, "app-status-pill", 3);
            i0.ɵɵelementStart(8, "div", 4)(9, "label", 5);
            i0.ɵɵtext(10);
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(12, "select", 6);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_select_ngModelChange_12_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embedding.provider, $event) || (ctx.s.embedding.provider = $event); return $event; });
            i0.ɵɵelementStart(13, "option", 7);
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(16, "option", 8);
            i0.ɵɵtext(17);
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(19, "div", 4)(20, "label", 9);
            i0.ɵɵtext(21);
            i0.ɵɵpipe(22, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(23, "input", 10);
            i0.ɵɵpipe(24, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_23_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embedding.baseUrl, $event) || (ctx.s.embedding.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(25, "div", 11);
            i0.ɵɵtext(26);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(28, "div", 4)(29, "label", 12);
            i0.ɵɵtext(30);
            i0.ɵɵpipe(31, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(32, "input", 13);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_32_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embedding.model, $event) || (ctx.s.embedding.model = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(33, "div", 14)(34, "div", 4)(35, "label", 15);
            i0.ɵɵtext(36);
            i0.ɵɵpipe(37, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(38, "input", 16);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_38_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embedding.dimensions, $event) || (ctx.s.embedding.dimensions = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(39, "div", 4)(40, "label", 17);
            i0.ɵɵtext(41);
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(43, "select", 18);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_select_ngModelChange_43_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embedding.similarity, $event) || (ctx.s.embedding.similarity = $event); return $event; });
            i0.ɵɵelementStart(44, "option", 19);
            i0.ɵɵtext(45, "cosine");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(46, "option", 20);
            i0.ɵɵtext(47, "dotProduct");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(48, "option", 21);
            i0.ɵɵtext(49, "euclidean");
            i0.ɵɵelementEnd()()()();
            i0.ɵɵelementStart(50, "div", 4)(51, "label", 22);
            i0.ɵɵtext(52);
            i0.ɵɵpipe(53, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(54, "select", 23);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_select_ngModelChange_54_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embedding.prefixScheme, $event) || (ctx.s.embedding.prefixScheme = $event); return $event; });
            i0.ɵɵelementStart(55, "option", 24);
            i0.ɵɵtext(56);
            i0.ɵɵpipe(57, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(58, "option", 25);
            i0.ɵɵtext(59);
            i0.ɵɵpipe(60, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(61, "option", 26);
            i0.ɵɵtext(62);
            i0.ɵɵpipe(63, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(64, "option", 27);
            i0.ɵɵtext(65);
            i0.ɵɵpipe(66, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelement(67, "div", 28);
            i0.ɵɵpipe(68, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(69, ModelsTabComponent_Conditional_69_Template, 3, 3, "app-status-pill", 3);
            i0.ɵɵelementStart(70, "div", 4)(71, "label", 29);
            i0.ɵɵtext(72);
            i0.ɵɵpipe(73, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(74, "input", 30);
            i0.ɵɵpipe(75, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_74_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.embeddingApiKeyInput, $event) || (ctx.s.embeddingApiKeyInput = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(76, ModelsTabComponent_Conditional_76_Template, 4, 4, "div", 31);
            i0.ɵɵelementStart(77, "div", 32)(78, "button", 33);
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_78_listener() { return ctx.s.testConnection("embedding"); });
            i0.ɵɵtext(79);
            i0.ɵɵpipe(80, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(81, ModelsTabComponent_Conditional_81_Template, 4, 6, "span", 11);
            i0.ɵɵconditionalCreate(82, ModelsTabComponent_Conditional_82_Template, 5, 7);
            i0.ɵɵconditionalCreate(83, ModelsTabComponent_Conditional_83_Template, 5, 7);
            i0.ɵɵelementStart(84, "button", 33);
            i0.ɵɵpipe(85, "transloco");
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_84_listener() { return ctx.s.verifyModel("embedding"); });
            i0.ɵɵtext(86);
            i0.ɵɵpipe(87, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(88, ModelsTabComponent_Conditional_88_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(89, "app-model-provider-card", 35);
            i0.ɵɵpipe(90, "transloco");
            i0.ɵɵpipe(91, "transloco");
            i0.ɵɵelementStart(92, "app-status-pill", 2);
            i0.ɵɵtext(93);
            i0.ɵɵpipe(94, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(95, ModelsTabComponent_Conditional_95_Template, 3, 3, "app-status-pill", 3);
            i0.ɵɵelementStart(96, "div", 4)(97, "label", 36);
            i0.ɵɵtext(98);
            i0.ɵɵpipe(99, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(100, "input", 37);
            i0.ɵɵpipe(101, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_100_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.rerank.baseUrl, $event) || (ctx.s.rerank.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelement(102, "div", 28);
            i0.ɵɵpipe(103, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(104, "div", 4)(105, "label", 38);
            i0.ɵɵtext(106);
            i0.ɵɵpipe(107, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(108, "input", 39);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_108_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.rerank.model, $event) || (ctx.s.rerank.model = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(109, "div", 4)(110, "label", 40);
            i0.ɵɵtext(111);
            i0.ɵɵpipe(112, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(113, "input", 41);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_113_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.rerank.candidateMultiplier, $event) || (ctx.s.rerank.candidateMultiplier = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(114, "div", 11);
            i0.ɵɵtext(115);
            i0.ɵɵpipe(116, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(117, "div", 4)(118, "label", 42);
            i0.ɵɵtext(119);
            i0.ɵɵpipe(120, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(121, "input", 43);
            i0.ɵɵpipe(122, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_121_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.rerankApiKeyInput, $event) || (ctx.s.rerankApiKeyInput = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(123, ModelsTabComponent_Conditional_123_Template, 4, 4, "div", 31);
            i0.ɵɵelementStart(124, "div", 32)(125, "button", 33);
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_125_listener() { return ctx.s.testConnection("rerank"); });
            i0.ɵɵtext(126);
            i0.ɵɵpipe(127, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(128, ModelsTabComponent_Conditional_128_Template, 5, 7);
            i0.ɵɵconditionalCreate(129, ModelsTabComponent_Conditional_129_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(130, "app-model-provider-card", 44);
            i0.ɵɵpipe(131, "transloco");
            i0.ɵɵpipe(132, "transloco");
            i0.ɵɵelementStart(133, "app-status-pill", 2);
            i0.ɵɵtext(134);
            i0.ɵɵpipe(135, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(136, ModelsTabComponent_Conditional_136_Template, 3, 3, "app-status-pill", 3);
            i0.ɵɵelementStart(137, "div", 4)(138, "label", 45);
            i0.ɵɵtext(139);
            i0.ɵɵpipe(140, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(141, "input", 46);
            i0.ɵɵpipe(142, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_141_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.nli.baseUrl, $event) || (ctx.s.nli.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(143, "div", 11);
            i0.ɵɵtext(144);
            i0.ɵɵpipe(145, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(146, "div", 4)(147, "label", 47);
            i0.ɵɵtext(148);
            i0.ɵɵpipe(149, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(150, "input", 48);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_150_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.nli.model, $event) || (ctx.s.nli.model = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(151, "div", 4)(152, "label", 49);
            i0.ɵɵtext(153);
            i0.ɵɵpipe(154, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(155, "input", 50);
            i0.ɵɵpipe(156, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_155_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.nliApiKeyInput, $event) || (ctx.s.nliApiKeyInput = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(157, ModelsTabComponent_Conditional_157_Template, 4, 4, "div", 31);
            i0.ɵɵelementStart(158, "div", 32)(159, "button", 33);
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_159_listener() { return ctx.s.testConnection("nli"); });
            i0.ɵɵtext(160);
            i0.ɵɵpipe(161, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(162, ModelsTabComponent_Conditional_162_Template, 5, 7);
            i0.ɵɵconditionalCreate(163, ModelsTabComponent_Conditional_163_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(164, "app-model-provider-card", 51);
            i0.ɵɵpipe(165, "transloco");
            i0.ɵɵpipe(166, "transloco");
            i0.ɵɵelementStart(167, "app-status-pill", 2);
            i0.ɵɵtext(168);
            i0.ɵɵpipe(169, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(170, ModelsTabComponent_Conditional_170_Template, 3, 3, "app-status-pill", 3);
            i0.ɵɵelementStart(171, "div", 4)(172, "label", 52);
            i0.ɵɵtext(173);
            i0.ɵɵpipe(174, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(175, "select", 53);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_select_ngModelChange_175_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.form.visionProvider, $event) || (ctx.s.form.visionProvider = $event); return $event; });
            i0.ɵɵelementStart(176, "option", 7);
            i0.ɵɵtext(177);
            i0.ɵɵpipe(178, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(179, "option", 8);
            i0.ɵɵtext(180);
            i0.ɵɵpipe(181, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(182, "div", 4)(183, "label", 54);
            i0.ɵɵtext(184);
            i0.ɵɵpipe(185, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(186, "input", 55);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_186_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.form.vision.baseUrl, $event) || (ctx.s.form.vision.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(187, "div", 4)(188, "label", 56);
            i0.ɵɵtext(189);
            i0.ɵɵpipe(190, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(191, "input", 57);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_191_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.form.vision.model, $event) || (ctx.s.form.vision.model = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(192, "div", 4)(193, "label", 58);
            i0.ɵɵtext(194);
            i0.ɵɵpipe(195, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(196, "input", 59);
            i0.ɵɵpipe(197, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_196_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.visionApiKeyInput, $event) || (ctx.s.visionApiKeyInput = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(198, "div", 32)(199, "button", 33);
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_199_listener() { return ctx.s.testConnection("vision"); });
            i0.ɵɵtext(200);
            i0.ɵɵpipe(201, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(202, ModelsTabComponent_Conditional_202_Template, 5, 7);
            i0.ɵɵconditionalCreate(203, ModelsTabComponent_Conditional_203_Template, 5, 7);
            i0.ɵɵelementStart(204, "button", 33);
            i0.ɵɵpipe(205, "transloco");
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_204_listener() { return ctx.s.verifyModel("vision"); });
            i0.ɵɵtext(206);
            i0.ɵɵpipe(207, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(208, ModelsTabComponent_Conditional_208_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(209, "app-model-provider-card", 60);
            i0.ɵɵpipe(210, "transloco");
            i0.ɵɵpipe(211, "transloco");
            i0.ɵɵelementStart(212, "app-status-pill", 2);
            i0.ɵɵtext(213);
            i0.ɵɵpipe(214, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(215, ModelsTabComponent_Conditional_215_Template, 3, 3, "app-status-pill", 3);
            i0.ɵɵelementStart(216, "div", 4)(217, "label", 61);
            i0.ɵɵtext(218);
            i0.ɵɵpipe(219, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(220, "select", 62);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_select_ngModelChange_220_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.form.sttProvider, $event) || (ctx.s.form.sttProvider = $event); return $event; });
            i0.ɵɵelementStart(221, "option", 7);
            i0.ɵɵtext(222);
            i0.ɵɵpipe(223, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(224, "option", 8);
            i0.ɵɵtext(225);
            i0.ɵɵpipe(226, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(227, "div", 4)(228, "label", 63);
            i0.ɵɵtext(229);
            i0.ɵɵpipe(230, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(231, "input", 64);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_231_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.form.stt.baseUrl, $event) || (ctx.s.form.stt.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(232, "div", 4)(233, "label", 65);
            i0.ɵɵtext(234);
            i0.ɵɵpipe(235, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(236, "input", 66);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_236_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.form.stt.model, $event) || (ctx.s.form.stt.model = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(237, "div", 4)(238, "label", 67);
            i0.ɵɵtext(239);
            i0.ɵɵpipe(240, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(241, "input", 68);
            i0.ɵɵpipe(242, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_241_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.sttApiKeyInput, $event) || (ctx.s.sttApiKeyInput = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(243, "div", 32)(244, "button", 33);
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_244_listener() { return ctx.s.testConnection("stt"); });
            i0.ɵɵtext(245);
            i0.ɵɵpipe(246, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(247, ModelsTabComponent_Conditional_247_Template, 5, 7);
            i0.ɵɵconditionalCreate(248, ModelsTabComponent_Conditional_248_Template, 5, 7);
            i0.ɵɵelementStart(249, "button", 33);
            i0.ɵɵpipe(250, "transloco");
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_249_listener() { return ctx.s.verifyModel("stt"); });
            i0.ɵɵtext(251);
            i0.ɵɵpipe(252, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(253, ModelsTabComponent_Conditional_253_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(254, "app-model-provider-card", 69);
            i0.ɵɵpipe(255, "transloco");
            i0.ɵɵpipe(256, "transloco");
            i0.ɵɵelementStart(257, "app-status-pill", 2);
            i0.ɵɵtext(258);
            i0.ɵɵpipe(259, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(260, ModelsTabComponent_Conditional_260_Template, 3, 6, "app-status-pill", 70);
            i0.ɵɵelementStart(261, "div", 4)(262, "label", 71);
            i0.ɵɵtext(263);
            i0.ɵɵpipe(264, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(265, "input", 72);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_265_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.assist.baseUrl, $event) || (ctx.s.assist.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(266, "div", 4)(267, "label", 73);
            i0.ɵɵtext(268);
            i0.ɵɵpipe(269, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(270, "input", 74);
            i0.ɵɵpipe(271, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_270_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.assist.model, $event) || (ctx.s.assist.model = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(272, "div", 4)(273, "label", 75);
            i0.ɵɵtext(274);
            i0.ɵɵpipe(275, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(276, "input", 76);
            i0.ɵɵpipe(277, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_276_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.assistApiKeyInput, $event) || (ctx.s.assistApiKeyInput = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(278, "div", 77);
            i0.ɵɵtext(279);
            i0.ɵɵpipe(280, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(281, "div", 31);
            i0.ɵɵelement(282, "ph-icon", 78);
            i0.ɵɵelementStart(283, "span");
            i0.ɵɵtext(284);
            i0.ɵɵpipe(285, "transloco");
            i0.ɵɵconditionalCreate(286, ModelsTabComponent_Conditional_286_Template, 2, 6);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(287, "div", 32)(288, "button", 33);
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_288_listener() { return ctx.s.testConnection("assist"); });
            i0.ɵɵtext(289);
            i0.ɵɵpipe(290, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(291, ModelsTabComponent_Conditional_291_Template, 5, 7);
            i0.ɵɵconditionalCreate(292, ModelsTabComponent_Conditional_292_Template, 5, 7);
            i0.ɵɵelementStart(293, "button", 33);
            i0.ɵɵpipe(294, "transloco");
            i0.ɵɵlistener("click", function ModelsTabComponent_Template_button_click_293_listener() { return ctx.s.verifyModel("assist"); });
            i0.ɵɵtext(295);
            i0.ɵɵpipe(296, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(297, ModelsTabComponent_Conditional_297_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(298, "app-model-provider-card", 79);
            i0.ɵɵpipe(299, "transloco");
            i0.ɵɵpipe(300, "transloco");
            i0.ɵɵelementStart(301, "div", 4)(302, "label");
            i0.ɵɵtext(303);
            i0.ɵɵpipe(304, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(305, "div", 80);
            i0.ɵɵtext(306);
            i0.ɵɵpipe(307, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(308, "div", 4)(309, "label");
            i0.ɵɵtext(310);
            i0.ɵɵpipe(311, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(312, "div", 80);
            i0.ɵɵtext(313);
            i0.ɵɵpipe(314, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(315, "app-model-provider-card", 81);
            i0.ɵɵpipe(316, "transloco");
            i0.ɵɵpipe(317, "transloco");
            i0.ɵɵelementStart(318, "div", 4)(319, "label");
            i0.ɵɵtext(320);
            i0.ɵɵpipe(321, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(322, "div", 80);
            i0.ɵɵtext(323);
            i0.ɵɵpipe(324, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(325, "div", 4)(326, "label");
            i0.ɵɵtext(327);
            i0.ɵɵpipe(328, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(329, "div", 80);
            i0.ɵɵtext(330);
            i0.ɵɵpipe(331, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(332, "app-model-provider-card", 82);
            i0.ɵɵpipe(333, "transloco");
            i0.ɵɵpipe(334, "transloco");
            i0.ɵɵelementStart(335, "div", 4)(336, "label");
            i0.ɵɵtext(337);
            i0.ɵɵpipe(338, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(339, "div", 80);
            i0.ɵɵtext(340);
            i0.ɵɵpipe(341, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(342, "div", 4)(343, "label");
            i0.ɵɵtext(344);
            i0.ɵɵpipe(345, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(346, "div", 80);
            i0.ɵɵtext(347);
            i0.ɵɵpipe(348, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(349, "app-model-provider-card", 83);
            i0.ɵɵpipe(350, "transloco");
            i0.ɵɵpipe(351, "transloco");
            i0.ɵɵelementStart(352, "div", 4)(353, "label");
            i0.ɵɵtext(354);
            i0.ɵɵpipe(355, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(356, "div", 80);
            i0.ɵɵtext(357);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(358, ModelsTabComponent_Conditional_358_Template, 6, 4, "div", 4);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(359, "app-model-provider-card", 84);
            i0.ɵɵpipe(360, "transloco");
            i0.ɵɵpipe(361, "transloco");
            i0.ɵɵelementStart(362, "div", 4)(363, "label");
            i0.ɵɵtext(364);
            i0.ɵɵpipe(365, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(366, "div", 80);
            i0.ɵɵtext(367);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(368, ModelsTabComponent_Conditional_368_Template, 6, 4, "div", 4);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(369, "app-model-provider-card", 85);
            i0.ɵɵpipe(370, "transloco");
            i0.ɵɵpipe(371, "transloco");
            i0.ɵɵelementStart(372, "div", 4)(373, "label");
            i0.ɵɵtext(374);
            i0.ɵɵpipe(375, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(376, "div", 80);
            i0.ɵɵtext(377);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(378, ModelsTabComponent_Conditional_378_Template, 6, 4, "div", 4);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(379, "app-model-provider-card", 86);
            i0.ɵɵpipe(380, "transloco");
            i0.ɵɵpipe(381, "transloco");
            i0.ɵɵelementStart(382, "div", 87);
            i0.ɵɵtext(383);
            i0.ɵɵpipe(384, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(385, ModelsTabComponent_Conditional_385_Template, 3, 3, "div", 87);
            i0.ɵɵconditionalCreate(386, ModelsTabComponent_Conditional_386_Template, 5, 7, "div", 31);
            i0.ɵɵelementStart(387, "div", 4)(388, "label", 88);
            i0.ɵɵtext(389);
            i0.ɵɵpipe(390, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(391, "input", 89);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_391_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.faceExternal.baseUrl, $event) || (ctx.s.faceExternal.baseUrl = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(392, "div", 11);
            i0.ɵɵtext(393);
            i0.ɵɵpipe(394, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(395, ModelsTabComponent_Conditional_395_Template, 14, 14);
            i0.ɵɵelementStart(396, "div", 14)(397, "div", 4)(398, "label", 90);
            i0.ɵɵtext(399);
            i0.ɵɵpipe(400, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(401, "input", 91);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_401_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.face.confidenceThreshold, $event) || (ctx.s.face.confidenceThreshold = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(402, "div", 11);
            i0.ɵɵtext(403);
            i0.ɵɵpipe(404, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(405, "div", 4)(406, "label", 92);
            i0.ɵɵtext(407);
            i0.ɵɵpipe(408, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(409, "input", 93);
            i0.ɵɵtwoWayListener("ngModelChange", function ModelsTabComponent_Template_input_ngModelChange_409_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.s.face.minFaceSizeFraction, $event) || (ctx.s.face.minFaceSizeFraction = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(410, "div", 11);
            i0.ɵɵtext(411);
            i0.ɵɵpipe(412, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(413, "div", 4)(414, "label");
            i0.ɵɵtext(415);
            i0.ɵɵpipe(416, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(417, ModelsTabComponent_Conditional_417_Template, 3, 0, "div", 94);
            i0.ɵɵconditionalCreate(418, ModelsTabComponent_Conditional_418_Template, 2, 1);
            i0.ɵɵelementStart(419, "div", 11);
            i0.ɵɵtext(420);
            i0.ɵɵpipe(421, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(422, "div", 95)(423, "label");
            i0.ɵɵtext(424);
            i0.ɵɵpipe(425, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(426, "div", 80);
            i0.ɵɵtext(427, "BlazeFace + FaceRes");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(428, "div", 32);
            i0.ɵɵconditionalCreate(429, ModelsTabComponent_Conditional_429_Template, 3, 4, "button", 34);
            i0.ɵɵelementEnd()()();
        } if (rf & 2) {
            let tmp_39_0;
            let tmp_40_0;
            let tmp_42_0;
            let tmp_43_0;
            let tmp_44_0;
            let tmp_46_0;
            let tmp_71_0;
            let tmp_72_0;
            let tmp_73_0;
            let tmp_94_0;
            let tmp_95_0;
            let tmp_96_0;
            let tmp_119_0;
            let tmp_120_0;
            let tmp_121_0;
            let tmp_122_0;
            let tmp_123_0;
            let tmp_125_0;
            let tmp_148_0;
            let tmp_149_0;
            let tmp_150_0;
            let tmp_151_0;
            let tmp_152_0;
            let tmp_154_0;
            let tmp_177_0;
            let tmp_178_0;
            let tmp_179_0;
            let tmp_180_0;
            let tmp_181_0;
            let tmp_183_0;
            let tmp_215_0;
            let tmp_222_0;
            let tmp_229_0;
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(2, 256, "mediaProcessing.embedding.title"))("purpose", i0.ɵɵpipeBind1(3, 258, "mediaProcessing.embedding.purpose"))("health", ctx.pipeline.modelState("embedding"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("variant", ctx.s.embedding.provider === "external" ? "active" : "ok");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(6, 260, ctx.s.embedding.provider === "external" ? "mediaProcessing.embedding.pillExternal" : ctx.s.embedding.baseUrl ? "mediaProcessing.embedding.pillLocalHttp" : "mediaProcessing.embedding.pillBundled"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.embeddingLocked("model") ? 7 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 262, "mediaProcessing.field.provider"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embedding.provider);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("provider"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 264, "mediaProcessing.embedding.optLocal"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 266, "mediaProcessing.embedding.optExternal"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 268, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embedding.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("baseUrl"))("placeholder", i0.ɵɵpipeBind1(24, 270, "mediaProcessing.embedding.endpointPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 272, "mediaProcessing.embedding.endpointHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 274, "mediaProcessing.field.model"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embedding.model);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("model"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 276, "mediaProcessing.field.dimensions"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embedding.dimensions);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("dimensions"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 278, "mediaProcessing.field.similarity"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embedding.similarity);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("model"));
            i0.ɵɵadvance(9);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(53, 280, "mediaProcessing.embedding.prefixSchemeLabel"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embedding.prefixScheme);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("prefixScheme"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(57, 282, "mediaProcessing.embedding.prefixAuto"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(60, 284, "mediaProcessing.embedding.prefixNone"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(63, 286, "mediaProcessing.embedding.prefixNomic"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(66, 288, "mediaProcessing.embedding.prefixQwen"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind1(68, 290, "mediaProcessing.embedding.prefixSchemeHint"), i0.ɵɵsanitizeHtml);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.embeddingLocked("prefixScheme") ? 69 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(73, 292, "mediaProcessing.field.apiKeyExternal"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.embeddingApiKeyInput);
            i0.ɵɵproperty("disabled", ctx.s.embeddingLocked("apiKey"))("placeholder", i0.ɵɵpipeBind1(75, 294, ctx.s.embedding.apiKey ? "mediaProcessing.field.apiKeyKeep" : "mediaProcessing.field.apiKeyOptional"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.embeddingNeedsReindex() ? 76 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ((tmp_39_0 = ctx.s.testOf("embedding")) == null ? null : tmp_39_0.loading) || !ctx.s.embedding.baseUrl);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(80, 296, ((tmp_40_0 = ctx.s.testOf("embedding")) == null ? null : tmp_40_0.loading) ? "mediaProcessing.action.testing" : "mediaProcessing.action.test"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(!ctx.s.embedding.baseUrl ? 81 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_42_0 = (tmp_42_0 = ctx.s.testOf("embedding")) == null ? null : tmp_42_0.res) ? 82 : -1, tmp_42_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_43_0 = (tmp_43_0 = ctx.s.verifyOf("embedding")) == null ? null : tmp_43_0.res) ? 83 : -1, tmp_43_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", (tmp_44_0 = ctx.s.verifyOf("embedding")) == null ? null : tmp_44_0.loading);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(85, 298, "mediaProcessing.verify.hint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(87, 300, ((tmp_46_0 = ctx.s.verifyOf("embedding")) == null ? null : tmp_46_0.loading) ? "mediaProcessing.verify.running" : "mediaProcessing.verify.action"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.cardDirty("embedding") ? 88 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(90, 302, "mediaProcessing.rerank.title"))("purpose", i0.ɵɵpipeBind1(91, 304, "mediaProcessing.rerank.purpose"))("health", ctx.pipeline.modelState("rerank"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("variant", ctx.s.rerankConfigured() ? "active" : "off");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(94, 306, ctx.s.rerankConfigured() ? "mediaProcessing.rerank.pillOn" : "mediaProcessing.rerank.pillOff"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.rerankLocked("baseUrl") ? 95 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(99, 308, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.rerank.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.rerankLocked("baseUrl"))("placeholder", i0.ɵɵpipeBind1(101, 310, "mediaProcessing.rerank.endpointPlaceholder"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind1(103, 312, "mediaProcessing.rerank.endpointHint"), i0.ɵɵsanitizeHtml);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(107, 314, "mediaProcessing.field.model"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.rerank.model);
            i0.ɵɵproperty("disabled", ctx.s.rerankLocked("model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(112, 316, "mediaProcessing.rerank.multiplierLabel"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.rerank.candidateMultiplier);
            i0.ɵɵproperty("disabled", ctx.s.rerankLocked("candidateMultiplier"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(116, 318, "mediaProcessing.rerank.multiplierHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(120, 320, "mediaProcessing.field.apiKeyExternal"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.rerankApiKeyInput);
            i0.ɵɵproperty("disabled", ctx.s.rerankLocked("apiKey"))("placeholder", i0.ɵɵpipeBind1(122, 322, ctx.s.rerank.apiKey ? "mediaProcessing.field.apiKeyKeep" : "mediaProcessing.field.apiKeyOptional"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.rerankIsExternal() ? 123 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ((tmp_71_0 = ctx.s.testOf("rerank")) == null ? null : tmp_71_0.loading) || !ctx.s.rerank.baseUrl);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(127, 324, ((tmp_72_0 = ctx.s.testOf("rerank")) == null ? null : tmp_72_0.loading) ? "mediaProcessing.action.testing" : "mediaProcessing.action.test"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_73_0 = (tmp_73_0 = ctx.s.testOf("rerank")) == null ? null : tmp_73_0.res) ? 128 : -1, tmp_73_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.s.cardDirty("rerank") ? 129 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(131, 326, "mediaProcessing.nli.title"))("purpose", i0.ɵɵpipeBind1(132, 328, "mediaProcessing.nli.purpose"))("health", ctx.pipeline.modelState("nli"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("variant", ctx.s.nliConfigured() ? "active" : "off");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(135, 330, ctx.s.nliConfigured() ? "mediaProcessing.nli.pillOn" : "mediaProcessing.nli.pillOff"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.nliLocked("baseUrl") ? 136 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(140, 332, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.nli.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.nliLocked("baseUrl"))("placeholder", i0.ɵɵpipeBind1(142, 334, "mediaProcessing.nli.endpointPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(145, 336, "mediaProcessing.nli.endpointHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(149, 338, "mediaProcessing.field.model"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.nli.model);
            i0.ɵɵproperty("disabled", ctx.s.nliLocked("model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(154, 340, "mediaProcessing.field.apiKeyExternal"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.nliApiKeyInput);
            i0.ɵɵproperty("disabled", ctx.s.nliLocked("apiKey"))("placeholder", i0.ɵɵpipeBind1(156, 342, ctx.s.nli.apiKey ? "mediaProcessing.field.apiKeyKeep" : "mediaProcessing.field.apiKeyOptional"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.nliIsExternal() ? 157 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ((tmp_94_0 = ctx.s.testOf("nli")) == null ? null : tmp_94_0.loading) || !ctx.s.nli.baseUrl);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(161, 344, ((tmp_95_0 = ctx.s.testOf("nli")) == null ? null : tmp_95_0.loading) ? "mediaProcessing.action.testing" : "mediaProcessing.action.test"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_96_0 = (tmp_96_0 = ctx.s.testOf("nli")) == null ? null : tmp_96_0.res) ? 162 : -1, tmp_96_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.s.cardDirty("nli") ? 163 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(165, 346, "mediaProcessing.vision.title"))("purpose", i0.ɵɵpipeBind1(166, 348, "mediaProcessing.vision.purpose"))("health", ctx.pipeline.modelState("vision"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("variant", ctx.s.mediaClassOn("images") ? "active" : "off");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(169, 350, ctx.s.form.visionProvider === "external" ? "mediaProcessing.pill.external" : "mediaProcessing.vision.pillLocal"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.isLocked("visionProvider") ? 170 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(174, 352, "mediaProcessing.field.provider"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.visionProvider);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("visionProvider"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(178, 354, "mediaProcessing.vision.optLocal"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(181, 356, "mediaProcessing.opt.externalOpenAi"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(185, 358, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.vision.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("vision.baseUrl"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(190, 360, "mediaProcessing.field.model"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.vision.model);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("vision.model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(195, 362, "mediaProcessing.field.apiKeyExternal"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.visionApiKeyInput);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("vision.apiKey"))("placeholder", i0.ɵɵpipeBind1(197, 364, "mediaProcessing.field.apiKeyKeep"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("disabled", (tmp_119_0 = ctx.s.testOf("vision")) == null ? null : tmp_119_0.loading);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(201, 366, ((tmp_120_0 = ctx.s.testOf("vision")) == null ? null : tmp_120_0.loading) ? "mediaProcessing.action.testing" : "mediaProcessing.action.test"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_121_0 = (tmp_121_0 = ctx.s.testOf("vision")) == null ? null : tmp_121_0.res) ? 202 : -1, tmp_121_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_122_0 = (tmp_122_0 = ctx.s.verifyOf("vision")) == null ? null : tmp_122_0.res) ? 203 : -1, tmp_122_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", (tmp_123_0 = ctx.s.verifyOf("vision")) == null ? null : tmp_123_0.loading);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(205, 368, "mediaProcessing.verify.hint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(207, 370, ((tmp_125_0 = ctx.s.verifyOf("vision")) == null ? null : tmp_125_0.loading) ? "mediaProcessing.verify.running" : "mediaProcessing.verify.action"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.cardDirty("vision") ? 208 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(210, 372, "mediaProcessing.stt.title"))("purpose", i0.ɵɵpipeBind1(211, 374, "mediaProcessing.stt.purpose"))("health", ctx.pipeline.modelState("stt"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("variant", ctx.s.mediaClassOn("audio") ? "active" : "off");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(214, 376, ctx.s.form.sttProvider === "external" ? "mediaProcessing.pill.external" : "mediaProcessing.stt.pillLocal"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.isLocked("sttProvider") ? 215 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(219, 378, "mediaProcessing.field.provider"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.sttProvider);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("sttProvider"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(223, 380, "mediaProcessing.stt.optLocal"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(226, 382, "mediaProcessing.opt.externalOpenAi"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(230, 384, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.stt.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("stt.baseUrl"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(235, 386, "mediaProcessing.field.model"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.form.stt.model);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("stt.model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(240, 388, "mediaProcessing.field.apiKeyExternal"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.sttApiKeyInput);
            i0.ɵɵproperty("disabled", ctx.s.isLocked("stt.apiKey"))("placeholder", i0.ɵɵpipeBind1(242, 390, "mediaProcessing.field.apiKeyKeep"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("disabled", (tmp_148_0 = ctx.s.testOf("stt")) == null ? null : tmp_148_0.loading);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(246, 392, ((tmp_149_0 = ctx.s.testOf("stt")) == null ? null : tmp_149_0.loading) ? "mediaProcessing.action.testing" : "mediaProcessing.action.test"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_150_0 = (tmp_150_0 = ctx.s.testOf("stt")) == null ? null : tmp_150_0.res) ? 247 : -1, tmp_150_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_151_0 = (tmp_151_0 = ctx.s.verifyOf("stt")) == null ? null : tmp_151_0.res) ? 248 : -1, tmp_151_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", (tmp_152_0 = ctx.s.verifyOf("stt")) == null ? null : tmp_152_0.loading);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(250, 394, "mediaProcessing.verify.hint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(252, 396, ((tmp_154_0 = ctx.s.verifyOf("stt")) == null ? null : tmp_154_0.loading) ? "mediaProcessing.verify.running" : "mediaProcessing.verify.action"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.cardDirty("stt") ? 253 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(255, 398, "mediaProcessing.assist.title"))("purpose", i0.ɵɵpipeBind1(256, 400, "mediaProcessing.assist.purpose"))("health", ctx.pipeline.modelState("assist"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("variant", ctx.s.assistLocked() ? "env" : ctx.s.assistInUse() ? "active" : "off");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(259, 402, ctx.s.assistLocked() ? "mediaProcessing.pill.env" : ctx.s.assistInUse() ? "mediaProcessing.assist.pillInUse" : "mediaProcessing.assist.pillUnset"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.assist.acknowledgedHost && !ctx.s.assistNeedsAck() ? 260 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(264, 404, "mediaProcessing.assist.endpointLabel"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.assist.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.assistLocked());
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(269, 406, "mediaProcessing.field.model"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.assist.model);
            i0.ɵɵproperty("disabled", ctx.s.assistLocked())("placeholder", i0.ɵɵpipeBind1(271, 408, "mediaProcessing.assist.modelPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(275, 410, "mediaProcessing.field.apiKey"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.assistApiKeyInput);
            i0.ɵɵproperty("disabled", ctx.s.assistLocked())("placeholder", i0.ɵɵpipeBind1(277, 412, ctx.s.assist.apiKey ? "mediaProcessing.field.apiKeyKeep" : "mediaProcessing.field.apiKeyOptional"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(280, 414, "mediaProcessing.assist.gatedByPipeline"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 15);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(285, 416, "mediaProcessing.assist.egressWarning"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.assistNeedsAck() ? 286 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ((tmp_177_0 = ctx.s.testOf("assist")) == null ? null : tmp_177_0.loading) || !ctx.s.assist.baseUrl);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(290, 418, ((tmp_178_0 = ctx.s.testOf("assist")) == null ? null : tmp_178_0.loading) ? "mediaProcessing.action.testing" : "mediaProcessing.action.test"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_179_0 = (tmp_179_0 = ctx.s.testOf("assist")) == null ? null : tmp_179_0.res) ? 291 : -1, tmp_179_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_180_0 = (tmp_180_0 = ctx.s.verifyOf("assist")) == null ? null : tmp_180_0.res) ? 292 : -1, tmp_180_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", (tmp_181_0 = ctx.s.verifyOf("assist")) == null ? null : tmp_181_0.loading);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(294, 420, "mediaProcessing.verify.hint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(296, 422, ((tmp_183_0 = ctx.s.verifyOf("assist")) == null ? null : tmp_183_0.loading) ? "mediaProcessing.verify.running" : "mediaProcessing.verify.action"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.cardDirty("assist") ? 297 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(299, 424, "mediaProcessing.docVlm.title"))("purpose", i0.ɵɵpipeBind1(300, 426, "mediaProcessing.docVlm.purpose"))("health", ctx.pipeline.modelState("doc-vlm"))("infra", true);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(304, 428, "mediaProcessing.field.model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.s.docCfg().vlmModel || i0.ɵɵpipeBind1(307, 430, "mediaProcessing.docSlot.notSet"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(311, 432, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.s.docCfg().vlmBaseUrl || i0.ɵɵpipeBind1(314, 434, "mediaProcessing.docSlot.inheritsVision"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(316, 436, "mediaProcessing.docRepair.title"))("purpose", i0.ɵɵpipeBind1(317, 438, "mediaProcessing.docRepair.purpose"))("health", ctx.pipeline.modelState("doc-repair"))("infra", true);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(321, 440, "mediaProcessing.field.model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.s.docCfg().repairModel || ctx.s.docCfg().vlmModel || i0.ɵɵpipeBind1(324, 442, "mediaProcessing.docSlot.notSet"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(328, 444, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.s.docCfg().repairBaseUrl || ctx.s.docCfg().vlmBaseUrl || i0.ɵɵpipeBind1(331, 446, "mediaProcessing.docSlot.inheritsVision"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(333, 448, "mediaProcessing.docVerify.title"))("purpose", i0.ɵɵpipeBind1(334, 450, "mediaProcessing.docVerify.purpose"))("health", ctx.pipeline.modelState("doc-verify"))("infra", true);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(338, 452, "mediaProcessing.field.model"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.s.docCfg().verifyModel || i0.ɵɵpipeBind1(341, 454, "mediaProcessing.docSlot.notSet"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(345, 456, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.s.docCfg().verifyBaseUrl || ctx.s.docCfg().vlmBaseUrl || i0.ɵɵpipeBind1(348, 458, "mediaProcessing.docSlot.inheritsVision"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(350, 460, "mediaProcessing.render.title"))("purpose", i0.ɵɵpipeBind1(351, 462, "mediaProcessing.render.purpose"))("health", ctx.pipeline.sidecarState("doc-render"))("infra", true);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(355, 464, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.sidecarUrl("doc-render"));
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_215_0 = ctx.sidecarDetail("doc-render")) ? 358 : -1, tmp_215_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(360, 466, "mediaProcessing.office.title"))("purpose", i0.ɵɵpipeBind1(361, 468, "mediaProcessing.office.purpose"))("health", ctx.pipeline.sidecarState("doc-office"))("infra", true);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(365, 470, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.sidecarUrl("doc-office"));
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_222_0 = ctx.sidecarDetail("doc-office")) ? 368 : -1, tmp_222_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(370, 472, "mediaProcessing.converter.title"))("purpose", i0.ɵɵpipeBind1(371, 474, "mediaProcessing.converter.purpose"))("health", ctx.pipeline.sidecarState("unstructured"))("infra", true);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(375, 476, "mediaProcessing.field.endpoint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.sidecarUrl("unstructured"));
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_229_0 = ctx.sidecarDetail("unstructured")) ? 378 : -1, tmp_229_0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(380, 478, "mediaProcessing.face.title"))("purpose", i0.ɵɵpipeBind1(381, 480, "mediaProcessing.face.purpose"))("health", ctx.faceState())("infra", ctx.s.faceExternalLocked());
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(384, 482, "mediaProcessing.face.gatedByPipeline"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.faceLocked("enabled") ? 385 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.s.faceAwaitingAcknowledgment() ? 386 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(390, 484, "mediaProcessing.face.endpoint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.faceExternal.baseUrl);
            i0.ɵɵproperty("disabled", ctx.s.faceExternalLocked() || ctx.s.managed);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(394, 486, "mediaProcessing.face.endpointHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.s.faceExternalConfigured() ? 395 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(400, 488, "mediaProcessing.face.confidence"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.face.confidenceThreshold);
            i0.ɵɵproperty("disabled", ctx.s.faceLocked("confidenceThreshold") || ctx.s.managed);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(404, 490, "mediaProcessing.face.confidenceHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(408, 492, "mediaProcessing.face.minSize"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.s.face.minFaceSizeFraction);
            i0.ɵɵproperty("disabled", ctx.s.faceLocked("minFaceSizeFraction") || ctx.s.managed);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(412, 494, "mediaProcessing.face.minSizeHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(416, 496, "mediaProcessing.face.personTypes"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((ctx.s.face.personEntityTypes == null ? null : ctx.s.face.personEntityTypes.length) ? 417 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(!(ctx.s.faceLocked("personEntityTypes") || ctx.s.managed) ? 418 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(421, 498, "mediaProcessing.face.personTypesHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(425, 500, "mediaProcessing.face.actorLabel"));
            i0.ɵɵadvance(5);
            i0.ɵɵconditional(ctx.s.cardDirty("face") ? 429 : -1);
        } }, dependencies: [FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.MinValidator, i1.MaxValidator, i1.NgModel, PhIconComponent, StatusPillComponent, ModelProviderCardComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; }\n    \n\n    .cards[_ngcontent-%COMP%] { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));\n      gap: 16px; align-items: stretch; }\n    .field[_ngcontent-%COMP%] { margin-bottom: 13px; }\n    .field[_ngcontent-%COMP%]:last-child { margin-bottom: 0; }\n    .field[_ngcontent-%COMP%]    > label[_ngcontent-%COMP%] { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }\n    \n\n\n\n    .field[_ngcontent-%COMP%]   input[data-mono][_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); }\n    .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:disabled, .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:disabled { opacity: .6; cursor: not-allowed; }\n    .grid2[_ngcontent-%COMP%] { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }\n    \n\n\n\n\n\n    .grid2[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%] { display: grid; grid-template-rows: subgrid; grid-row: span 3; margin-bottom: 0;\n      align-content: start; }\n    @media (max-width: 560px) { .grid2[_ngcontent-%COMP%] { grid-template-columns: 1fr; } }\n    .hint[_ngcontent-%COMP%] { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }\n    .ro[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 12.5px; color: var(--text-primary);\n      background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px;\n      overflow-wrap: anywhere; }\n    .warnline[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }\n    .warnline[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; margin-top: 1px; }\n    .checkrow[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px;\n      color: var(--text-secondary); font-weight: normal;\n      \n\n\n      text-transform: none; letter-spacing: normal; }\n    \n\n\n    .checkrow[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { margin-top: 2px; flex: none; width: auto; }\n    \n\n    .ptype-chips[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 7px; }\n    .ptype-chip[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 4px 2px 9px;\n      border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary);\n      font-family: var(--font-mono, monospace); }\n    .ptype-rm[_ngcontent-%COMP%] { display: inline-flex; align-items: center; background: none; border: 0; padding: 2px; cursor: pointer;\n      color: var(--text-muted); border-radius: 4px; }\n    .ptype-rm[_ngcontent-%COMP%]:hover { color: var(--error); }\n    .switchrow[_ngcontent-%COMP%] { margin-bottom: 13px; }\n    .switchrow[_ngcontent-%COMP%]   .hint[_ngcontent-%COMP%] { margin-left: 22px; }   \n\n    \n\n\n\n\n\n\n\n\n    .testrow[_ngcontent-%COMP%] { display: flex; gap: 10px; row-gap: 8px; align-items: center; flex-wrap: wrap; min-height: 34px; }\n    .testrow[_ngcontent-%COMP%]    > [_ngcontent-%COMP%]:not(.hint) { flex: none; }\n    .testrow[_ngcontent-%COMP%]   .hint[_ngcontent-%COMP%] { margin: 0; min-width: 0; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    \n\n\n\n\n\n\n\n    .testrow[_ngcontent-%COMP%]    > button[_ngcontent-%COMP%] { order: 0; }\n    .testrow[_ngcontent-%COMP%]    > app-status-pill[_ngcontent-%COMP%], .testrow[_ngcontent-%COMP%]    > .hint[_ngcontent-%COMP%] { order: 1; }\n    \n\n\n    .testrow[_ngcontent-%COMP%]   .card-save[_ngcontent-%COMP%] { order: 2; margin-left: auto; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ModelsTabComponent, [{
        type: Component,
        args: [{ selector: 'app-models-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule, TranslocoPipe, PhIconComponent, StatusPillComponent, ModelProviderCardComponent], template: `
    <div class="cards">
      <!-- ── Text embedding ─────────────────────────────────────────────── -->
      <app-model-provider-card id="embedding" icon="database"
        [heading]="'mediaProcessing.embedding.title' | transloco"
        [purpose]="'mediaProcessing.embedding.purpose' | transloco"
        [health]="pipeline.modelState('embedding')">
        <app-status-pill pill [variant]="s.embedding.provider === 'external' ? 'active' : 'ok'">
          {{ (s.embedding.provider === 'external' ? 'mediaProcessing.embedding.pillExternal'
              : (s.embedding.baseUrl ? 'mediaProcessing.embedding.pillLocalHttp' : 'mediaProcessing.embedding.pillBundled')) | transloco }}
        </app-status-pill>
        @if (s.embeddingLocked('model')) { <app-status-pill pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="emb-provider">{{ 'mediaProcessing.field.provider' | transloco }}</label>
          <select id="emb-provider" [(ngModel)]="s.embedding.provider" [disabled]="s.embeddingLocked('provider')">
            <option value="local">{{ 'mediaProcessing.embedding.optLocal' | transloco }}</option>
            <option value="external">{{ 'mediaProcessing.embedding.optExternal' | transloco }}</option>
          </select>
        </div>
        <div class="field">
          <label for="emb-endpoint">{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <input id="emb-endpoint" data-mono type="url" [(ngModel)]="s.embedding.baseUrl"
            [disabled]="s.embeddingLocked('baseUrl')" [placeholder]="'mediaProcessing.embedding.endpointPlaceholder' | transloco" />
          <div class="hint">{{ 'mediaProcessing.embedding.endpointHint' | transloco }}</div>
        </div>
        <div class="field">
          <label for="emb-model">{{ 'mediaProcessing.field.model' | transloco }}</label>
          <input id="emb-model" data-mono [(ngModel)]="s.embedding.model" [disabled]="s.embeddingLocked('model')" placeholder="nomic-embed-text" />
        </div>
        <div class="grid2">
          <div class="field">
            <label for="emb-dims">{{ 'mediaProcessing.field.dimensions' | transloco }}</label>
            <input id="emb-dims" type="number" min="1" max="16384" [(ngModel)]="s.embedding.dimensions" [disabled]="s.embeddingLocked('dimensions')" />
          </div>
          <div class="field">
            <label for="emb-sim">{{ 'mediaProcessing.field.similarity' | transloco }}</label>
            <select id="emb-sim" [(ngModel)]="s.embedding.similarity" [disabled]="s.embeddingLocked('model')">
              <option value="cosine">cosine</option>
              <option value="dotProduct">dotProduct</option>
              <option value="euclidean">euclidean</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="emb-prefix">{{ 'mediaProcessing.embedding.prefixSchemeLabel' | transloco }}</label>
          <select id="emb-prefix" [(ngModel)]="s.embedding.prefixScheme" [disabled]="s.embeddingLocked('prefixScheme')">
            <option value="auto">{{ 'mediaProcessing.embedding.prefixAuto' | transloco }}</option>
            <option value="none">{{ 'mediaProcessing.embedding.prefixNone' | transloco }}</option>
            <option value="nomic">{{ 'mediaProcessing.embedding.prefixNomic' | transloco }}</option>
            <option value="qwen">{{ 'mediaProcessing.embedding.prefixQwen' | transloco }}</option>
          </select>
          <!-- innerHTML, because all three translations of this string carry a <b> around the mode name.
               Interpolated, the reader saw the literal tags: "<b>Auto</b> reproduces what this instance
               did…". Found by looking at a screenshot of this card, not by any test. The reindex warning
               below already renders the same way. -->
          <div class="hint" [innerHTML]="'mediaProcessing.embedding.prefixSchemeHint' | transloco"></div>
        </div>
        @if (s.embeddingLocked('prefixScheme')) { <app-status-pill pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }
        <div class="field">
          <label for="emb-key">{{ 'mediaProcessing.field.apiKeyExternal' | transloco }}</label>
          <input id="emb-key" type="password" [(ngModel)]="s.embeddingApiKeyInput" [disabled]="s.embeddingLocked('apiKey')"
            [placeholder]="(s.embedding.apiKey ? 'mediaProcessing.field.apiKeyKeep' : 'mediaProcessing.field.apiKeyOptional') | transloco" />
        </div>
        @if (s.embeddingNeedsReindex()) {
          <div class="warnline">
            <ph-icon name="warning" [size]="15"/>
            <span [innerHTML]="'mediaProcessing.embedding.reindexWarning' | transloco"></span>
          </div>
        }

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('embedding')"
            [disabled]="s.testOf('embedding')?.loading || !s.embedding.baseUrl">
            {{ (s.testOf('embedding')?.loading ? 'mediaProcessing.action.testing' : 'mediaProcessing.action.test') | transloco }}
          </button>
          <!-- B.4: a dead button and a broken button look identical. With no endpoint the embedder IS the
               bundled in-process model, so there is nothing to probe — a fact about the configuration,
               not a fault, and the same thing classifyStage reports as in-process on the health dot.
               Verify still works: it embeds the word ping locally. -->
          @if (!s.embedding.baseUrl) {
            <!-- Titled, because the row truncates it: the card is narrow enough that the reason reads
                 "In-process mod…", and an explanation you cannot finish reading is the same failure this
                 line exists to fix. -->
            <span class="hint" [attr.title]="'mediaProcessing.test.inProcess' | transloco">{{ 'mediaProcessing.test.inProcess' | transloco }}</span>
          }
          @if (s.testOf('embedding')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.detail || null">{{ r.detail || (r.latencyMs + ' ms') }}</span>
          }
          @if (s.verifyOf('embedding')?.res; as v) {
            <app-status-pill [variant]="s.verifyPillVariant(v)" [dot]="true">{{ s.verifyPillLabelKey(v) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="v.detail || v.sample || null">{{ v.sample || v.detail || (v.latencyMs + ' ms') }}</span>
          }
          <button class="btn btn-sm btn-secondary" type="button"
            [attr.title]="'mediaProcessing.verify.hint' | transloco"
            [disabled]="s.verifyOf('embedding')?.loading"
            (click)="s.verifyModel('embedding')">
            {{ (s.verifyOf('embedding')?.loading ? 'mediaProcessing.verify.running' : 'mediaProcessing.verify.action') | transloco }}
          </button>
          @if (s.cardDirty('embedding')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('embedding')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Reranker ───────────────────────────────────────────────────── -->
      <app-model-provider-card id="rerank" icon="sort-descending"
        [heading]="'mediaProcessing.rerank.title' | transloco"
        [purpose]="'mediaProcessing.rerank.purpose' | transloco"
        [health]="pipeline.modelState('rerank')">
        <app-status-pill pill [variant]="s.rerankConfigured() ? 'active' : 'off'">
          {{ (s.rerankConfigured() ? 'mediaProcessing.rerank.pillOn' : 'mediaProcessing.rerank.pillOff') | transloco }}
        </app-status-pill>
        @if (s.rerankLocked('baseUrl')) { <app-status-pill pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="rr-endpoint">{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <input id="rr-endpoint" data-mono type="url" [(ngModel)]="s.rerank.baseUrl"
            [disabled]="s.rerankLocked('baseUrl')" [placeholder]="'mediaProcessing.rerank.endpointPlaceholder' | transloco" />
          <!-- Second instance of the same defect as the task-prefix hint above: this translation marks the
               two URL shapes with <b>, and interpolated they printed as literal tags. Enumerated by
               i18n-markup-rendering.test.js rather than found by eye a second time. -->
          <div class="hint" [innerHTML]="'mediaProcessing.rerank.endpointHint' | transloco"></div>
        </div>
        <div class="field">
          <label for="rr-model">{{ 'mediaProcessing.field.model' | transloco }}</label>
          <input id="rr-model" data-mono [(ngModel)]="s.rerank.model" [disabled]="s.rerankLocked('model')"
            placeholder="BAAI/bge-reranker-v2-m3" />
        </div>
        <div class="field">
          <label for="rr-mult">{{ 'mediaProcessing.rerank.multiplierLabel' | transloco }}</label>
          <input id="rr-mult" type="number" min="2" max="10" [(ngModel)]="s.rerank.candidateMultiplier"
            [disabled]="s.rerankLocked('candidateMultiplier')" />
          <div class="hint">{{ 'mediaProcessing.rerank.multiplierHint' | transloco }}</div>
        </div>
        <div class="field">
          <label for="rr-key">{{ 'mediaProcessing.field.apiKeyExternal' | transloco }}</label>
          <input id="rr-key" type="password" [(ngModel)]="s.rerankApiKeyInput" [disabled]="s.rerankLocked('apiKey')"
            [placeholder]="(s.rerank.apiKey ? 'mediaProcessing.field.apiKeyKeep' : 'mediaProcessing.field.apiKeyOptional') | transloco" />
        </div>
        @if (s.rerankIsExternal()) {
          <div class="warnline">
            <ph-icon name="warning" [size]="15"/>
            <span [innerHTML]="'mediaProcessing.rerank.egressWarning' | transloco"></span>
          </div>
        }

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('rerank')"
            [disabled]="s.testOf('rerank')?.loading || !s.rerank.baseUrl">
            {{ (s.testOf('rerank')?.loading ? 'mediaProcessing.action.testing' : 'mediaProcessing.action.test') | transloco }}
          </button>
          @if (s.testOf('rerank')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.detail || null">{{ r.detail || (r.latencyMs + ' ms') }}</span>
          }
          @if (s.cardDirty('rerank')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('rerank')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Contradiction judge (NLI) ──────────────────────────────────── -->
      <!-- Configurable by env and config.json since F-REVIEW shipped, and never reachable from the admin
           API or this screen — so the one page that claims to list what the pipeline calls was missing
           it, and an operator had no way to discover why the Contradictions view stayed empty. -->
      <app-model-provider-card id="nli" icon="check-circle"
        [heading]="'mediaProcessing.nli.title' | transloco"
        [purpose]="'mediaProcessing.nli.purpose' | transloco"
        [health]="pipeline.modelState('nli')">
        <app-status-pill pill [variant]="s.nliConfigured() ? 'active' : 'off'">
          {{ (s.nliConfigured() ? 'mediaProcessing.nli.pillOn' : 'mediaProcessing.nli.pillOff') | transloco }}
        </app-status-pill>
        @if (s.nliLocked('baseUrl')) { <app-status-pill pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="nli-endpoint">{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <input id="nli-endpoint" data-mono type="url" [(ngModel)]="s.nli.baseUrl"
            [disabled]="s.nliLocked('baseUrl')" [placeholder]="'mediaProcessing.nli.endpointPlaceholder' | transloco" />
          <div class="hint">{{ 'mediaProcessing.nli.endpointHint' | transloco }}</div>
        </div>
        <div class="field">
          <label for="nli-model">{{ 'mediaProcessing.field.model' | transloco }}</label>
          <input id="nli-model" data-mono [(ngModel)]="s.nli.model" [disabled]="s.nliLocked('model')"
            placeholder="MoritzLaurer/deberta-v3-base-zeroshot-v2.0" />
        </div>
        <div class="field">
          <label for="nli-key">{{ 'mediaProcessing.field.apiKeyExternal' | transloco }}</label>
          <input id="nli-key" type="password" [(ngModel)]="s.nliApiKeyInput" [disabled]="s.nliLocked('apiKey')"
            [placeholder]="(s.nli.apiKey ? 'mediaProcessing.field.apiKeyKeep' : 'mediaProcessing.field.apiKeyOptional') | transloco" />
        </div>
        @if (s.nliIsExternal()) {
          <div class="warnline">
            <ph-icon name="warning" [size]="15"/>
            <span [innerHTML]="'mediaProcessing.nli.egressWarning' | transloco"></span>
          </div>
        }

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('nli')"
            [disabled]="s.testOf('nli')?.loading || !s.nli.baseUrl">
            {{ (s.testOf('nli')?.loading ? 'mediaProcessing.action.testing' : 'mediaProcessing.action.test') | transloco }}
          </button>
          @if (s.testOf('nli')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.detail || null">{{ r.detail || (r.latencyMs + ' ms') }}</span>
          }
          @if (s.cardDirty('nli')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('nli')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Vision ─────────────────────────────────────────────────────── -->
      <app-model-provider-card id="vision" icon="image"
        [heading]="'mediaProcessing.vision.title' | transloco"
        [purpose]="'mediaProcessing.vision.purpose' | transloco"
        [health]="pipeline.modelState('vision')">
        <app-status-pill pill [variant]="s.mediaClassOn('images') ? 'active' : 'off'">
          {{ (s.form.visionProvider === 'external' ? 'mediaProcessing.pill.external' : 'mediaProcessing.vision.pillLocal') | transloco }}
        </app-status-pill>
        @if (s.isLocked('visionProvider')) { <app-status-pill pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="vis-provider">{{ 'mediaProcessing.field.provider' | transloco }}</label>
          <select id="vis-provider" [(ngModel)]="s.form.visionProvider" [disabled]="s.isLocked('visionProvider')">
            <option value="local">{{ 'mediaProcessing.vision.optLocal' | transloco }}</option>
            <option value="external">{{ 'mediaProcessing.opt.externalOpenAi' | transloco }}</option>
          </select>
        </div>
        <div class="field">
          <label for="vis-endpoint">{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <input id="vis-endpoint" data-mono type="url" [(ngModel)]="s.form.vision!.baseUrl" [disabled]="s.isLocked('vision.baseUrl')" placeholder="http://ollama:11434" />
        </div>
        <div class="field">
          <label for="vis-model">{{ 'mediaProcessing.field.model' | transloco }}</label>
          <input id="vis-model" data-mono [(ngModel)]="s.form.vision!.model" [disabled]="s.isLocked('vision.model')" placeholder="moondream" />
        </div>
        <div class="field">
          <label for="vis-key">{{ 'mediaProcessing.field.apiKeyExternal' | transloco }}</label>
          <input id="vis-key" type="password" [(ngModel)]="s.visionApiKeyInput" [disabled]="s.isLocked('vision.apiKey')"
            [placeholder]="'mediaProcessing.field.apiKeyKeep' | transloco" />
        </div>

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('vision')" [disabled]="s.testOf('vision')?.loading">
            {{ (s.testOf('vision')?.loading ? 'mediaProcessing.action.testing' : 'mediaProcessing.action.test') | transloco }}
          </button>
          @if (s.testOf('vision')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.detail || null">{{ r.detail || (r.latencyMs + ' ms') }}</span>
          }
          @if (s.verifyOf('vision')?.res; as v) {
            <app-status-pill [variant]="s.verifyPillVariant(v)" [dot]="true">{{ s.verifyPillLabelKey(v) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="v.detail || v.sample || null">{{ v.sample || v.detail || (v.latencyMs + ' ms') }}</span>
          }
          <button class="btn btn-sm btn-secondary" type="button"
            [attr.title]="'mediaProcessing.verify.hint' | transloco"
            [disabled]="s.verifyOf('vision')?.loading"
            (click)="s.verifyModel('vision')">
            {{ (s.verifyOf('vision')?.loading ? 'mediaProcessing.verify.running' : 'mediaProcessing.verify.action') | transloco }}
          </button>
          @if (s.cardDirty('vision')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('vision')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Speech-to-text ─────────────────────────────────────────────── -->
      <app-model-provider-card id="stt" icon="microphone"
        [heading]="'mediaProcessing.stt.title' | transloco"
        [purpose]="'mediaProcessing.stt.purpose' | transloco"
        [health]="pipeline.modelState('stt')">
        <app-status-pill pill [variant]="s.mediaClassOn('audio') ? 'active' : 'off'">
          {{ (s.form.sttProvider === 'external' ? 'mediaProcessing.pill.external' : 'mediaProcessing.stt.pillLocal') | transloco }}
        </app-status-pill>
        @if (s.isLocked('sttProvider')) { <app-status-pill pill variant="env">{{ 'mediaProcessing.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="stt-provider">{{ 'mediaProcessing.field.provider' | transloco }}</label>
          <select id="stt-provider" [(ngModel)]="s.form.sttProvider" [disabled]="s.isLocked('sttProvider')">
            <option value="local">{{ 'mediaProcessing.stt.optLocal' | transloco }}</option>
            <option value="external">{{ 'mediaProcessing.opt.externalOpenAi' | transloco }}</option>
          </select>
        </div>
        <div class="field">
          <label for="stt-endpoint">{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <input id="stt-endpoint" data-mono type="url" [(ngModel)]="s.form.stt!.baseUrl" [disabled]="s.isLocked('stt.baseUrl')" placeholder="http://whisper:8000" />
        </div>
        <div class="field">
          <label for="stt-model">{{ 'mediaProcessing.field.model' | transloco }}</label>
          <input id="stt-model" data-mono [(ngModel)]="s.form.stt!.model" [disabled]="s.isLocked('stt.model')" placeholder="base" />
        </div>
        <div class="field">
          <label for="stt-key">{{ 'mediaProcessing.field.apiKeyExternal' | transloco }}</label>
          <input id="stt-key" type="password" [(ngModel)]="s.sttApiKeyInput" [disabled]="s.isLocked('stt.apiKey')"
            [placeholder]="'mediaProcessing.field.apiKeyKeep' | transloco" />
        </div>

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('stt')" [disabled]="s.testOf('stt')?.loading">
            {{ (s.testOf('stt')?.loading ? 'mediaProcessing.action.testing' : 'mediaProcessing.action.test') | transloco }}
          </button>
          @if (s.testOf('stt')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.detail || null">{{ r.detail || (r.latencyMs + ' ms') }}</span>
          }
          @if (s.verifyOf('stt')?.res; as v) {
            <app-status-pill [variant]="s.verifyPillVariant(v)" [dot]="true">{{ s.verifyPillLabelKey(v) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="v.detail || v.sample || null">{{ v.sample || v.detail || (v.latencyMs + ' ms') }}</span>
          }
          <button class="btn btn-sm btn-secondary" type="button"
            [attr.title]="'mediaProcessing.verify.hint' | transloco"
            [disabled]="s.verifyOf('stt')?.loading"
            (click)="s.verifyModel('stt')">
            {{ (s.verifyOf('stt')?.loading ? 'mediaProcessing.verify.running' : 'mediaProcessing.verify.action') | transloco }}
          </button>
          @if (s.cardDirty('stt')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('stt')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>

      <!-- ── External assist model ──────────────────────────────────────── -->
      <app-model-provider-card id="assist" icon="globe"
        [heading]="'mediaProcessing.assist.title' | transloco"
        [purpose]="'mediaProcessing.assist.purpose' | transloco"
        [health]="pipeline.modelState('assist')">
        <app-status-pill pill [variant]="s.assistLocked() ? 'env' : (s.assistInUse() ? 'active' : 'off')">
          {{ (s.assistLocked() ? 'mediaProcessing.pill.env' : (s.assistInUse() ? 'mediaProcessing.assist.pillInUse' : 'mediaProcessing.assist.pillUnset')) | transloco }}
        </app-status-pill>
        <!-- Moved out of the footer, where it was effectively invisible. -->
        @if (s.assist.acknowledgedHost && !s.assistNeedsAck()) {
          <app-status-pill pill variant="ok">{{ 'mediaProcessing.assist.pillAcknowledged' | transloco: { host: s.assist.acknowledgedHost } }}</app-status-pill>
        }

        <div class="field">
          <label for="assist-endpoint">{{ 'mediaProcessing.assist.endpointLabel' | transloco }}</label>
          <input id="assist-endpoint" data-mono type="url" [(ngModel)]="s.assist.baseUrl" [disabled]="s.assistLocked()" placeholder="https://api.example.com" />
        </div>
        <div class="field">
          <label for="assist-model">{{ 'mediaProcessing.field.model' | transloco }}</label>
          <input id="assist-model" data-mono [(ngModel)]="s.assist.model" [disabled]="s.assistLocked()"
            [placeholder]="'mediaProcessing.assist.modelPlaceholder' | transloco" />
        </div>
        <div class="field">
          <label for="assist-key">{{ 'mediaProcessing.field.apiKey' | transloco }}</label>
          <input id="assist-key" type="password" [(ngModel)]="s.assistApiKeyInput" [disabled]="s.assistLocked()"
            [placeholder]="(s.assist.apiKey ? 'mediaProcessing.field.apiKeyKeep' : 'mediaProcessing.field.apiKeyOptional') | transloco" />
        </div>
        <!-- No "used for" tick: the assist model exists to serve the repair pass, so the extraction rung
             is the switch. Configure the endpoint here, then raise Document extraction to repair (or auto)
             to actually route through it — at which point the egress acknowledgement is demanded. -->
        <div class="hint" style="margin-bottom:10px;">{{ 'mediaProcessing.assist.gatedByPipeline' | transloco }}</div>
        <div class="warnline">
          <ph-icon name="warning" [size]="15"/>
          <span>
            {{ 'mediaProcessing.assist.egressWarning' | transloco }}
            @if (s.assistNeedsAck()) { {{ 'mediaProcessing.assist.egressPending' | transloco: { host: s.assistHost() } }} }
          </span>
        </div>

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('assist')"
            [disabled]="s.testOf('assist')?.loading || !s.assist.baseUrl">
            {{ (s.testOf('assist')?.loading ? 'mediaProcessing.action.testing' : 'mediaProcessing.action.test') | transloco }}
          </button>
          @if (s.testOf('assist')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.detail || null">{{ r.detail || (r.latencyMs + ' ms') }}</span>
          }
          @if (s.verifyOf('assist')?.res; as v) {
            <app-status-pill [variant]="s.verifyPillVariant(v)" [dot]="true">{{ s.verifyPillLabelKey(v) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="v.detail || v.sample || null">{{ v.sample || v.detail || (v.latencyMs + ' ms') }}</span>
          }
          <button class="btn btn-sm btn-secondary" type="button"
            [attr.title]="'mediaProcessing.verify.hint' | transloco"
            [disabled]="s.verifyOf('assist')?.loading"
            (click)="s.verifyModel('assist')">
            {{ (s.verifyOf('assist')?.loading ? 'mediaProcessing.verify.running' : 'mediaProcessing.verify.action') | transloco }}
          </button>
          @if (s.cardDirty('assist')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('assist')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Document VLM / repair / verify (env-only) ──────────────────── -->
      <!-- These had NO cards. A customer's ticket enumerated nine model endpoints from this screen and
           missed vlmModel, which is the tenth — and the Pipelines tab pointed its step at the VISION
           card, showing a different value, so the tenth was displayed as if it were one of the nine.
           They are env-only (no PATCH schema accepts them), so they render read-only with the env badge,
           the way the storage pins do: visible even when unsettable. -->
      <!-- Written out rather than looped: the completeness gate greps for a literal card element with a
           literal id attribute, and a card that only exists behind a binding is a card the gate cannot
           see. Three repetitions is a fair price for a check that cannot be fooled.
           (No backticks anywhere in this comment - one would terminate the inline template literal, and
           the resulting error points at the decorator rather than at the comment.) -->
      <app-model-provider-card id="doc-vlm" icon="file-image"
        [heading]="'mediaProcessing.docVlm.title' | transloco"
        [purpose]="'mediaProcessing.docVlm.purpose' | transloco"
        [health]="pipeline.modelState('doc-vlm')"
        [infra]="true" envVar="DOC_VLM_MODEL">
        <div class="field">
          <label>{{ 'mediaProcessing.field.model' | transloco }}</label>
          <div class="ro">{{ s.docCfg().vlmModel || ('mediaProcessing.docSlot.notSet' | transloco) }}</div>
        </div>
        <div class="field">
          <label>{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <div class="ro">{{ s.docCfg().vlmBaseUrl || ('mediaProcessing.docSlot.inheritsVision' | transloco) }}</div>
        </div>
      </app-model-provider-card>

      <app-model-provider-card id="doc-repair" icon="file-image"
        [heading]="'mediaProcessing.docRepair.title' | transloco"
        [purpose]="'mediaProcessing.docRepair.purpose' | transloco"
        [health]="pipeline.modelState('doc-repair')"
        [infra]="true" envVar="DOC_REPAIR_MODEL">
        <div class="field">
          <label>{{ 'mediaProcessing.field.model' | transloco }}</label>
          <div class="ro">{{ s.docCfg().repairModel || s.docCfg().vlmModel || ('mediaProcessing.docSlot.notSet' | transloco) }}</div>
        </div>
        <div class="field">
          <label>{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <div class="ro">{{ s.docCfg().repairBaseUrl || s.docCfg().vlmBaseUrl || ('mediaProcessing.docSlot.inheritsVision' | transloco) }}</div>
        </div>
      </app-model-provider-card>

      <app-model-provider-card id="doc-verify" icon="file-image"
        [heading]="'mediaProcessing.docVerify.title' | transloco"
        [purpose]="'mediaProcessing.docVerify.purpose' | transloco"
        [health]="pipeline.modelState('doc-verify')"
        [infra]="true" envVar="DOC_VERIFY_MODEL">
        <div class="field">
          <label>{{ 'mediaProcessing.field.model' | transloco }}</label>
          <div class="ro">{{ s.docCfg().verifyModel || ('mediaProcessing.docSlot.notSet' | transloco) }}</div>
        </div>
        <div class="field">
          <label>{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <div class="ro">{{ s.docCfg().verifyBaseUrl || s.docCfg().vlmBaseUrl || ('mediaProcessing.docSlot.inheritsVision' | transloco) }}</div>
        </div>
      </app-model-provider-card>

      <!-- ── Page renderer (infra) ──────────────────────────────────────── -->
      <app-model-provider-card id="doc-render" icon="file-image"
        [heading]="'mediaProcessing.render.title' | transloco"
        [purpose]="'mediaProcessing.render.purpose' | transloco"
        [health]="pipeline.sidecarState('doc-render')"
        [infra]="true" envVar="RENDER_SIDECAR_URL">
        <div class="field">
          <label>{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <div class="ro">{{ sidecarUrl('doc-render') }}</div>
        </div>
        @if (sidecarDetail('doc-render'); as d) {
          <div class="field"><label>{{ 'mediaProcessing.field.lastProbe' | transloco }}</label><div class="ro">{{ d }}</div></div>
        }
      </app-model-provider-card>

      <!-- ── Office renderer (infra) ────────────────────────────────────── -->
      <!-- Probed by the server and reported on the About page, but absent from this tab, so the one
           screen that claims to list the pipeline's models was quietly missing one of them. -->
      <!-- "stack" and not a Word/Office glyph: the registry has none, and an unregistered ph-icon name
           renders as nothing at all, with no error. A layered stack reads well enough for multi-sheet
           and multi-slide formats. -->
      <app-model-provider-card id="doc-office" icon="stack"
        [heading]="'mediaProcessing.office.title' | transloco"
        [purpose]="'mediaProcessing.office.purpose' | transloco"
        [health]="pipeline.sidecarState('doc-office')"
        [infra]="true" envVar="RENDER_OFFICE_SIDECAR_URL">
        <div class="field">
          <label>{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <div class="ro">{{ sidecarUrl('doc-office') }}</div>
        </div>
        @if (sidecarDetail('doc-office'); as d) {
          <div class="field"><label>{{ 'mediaProcessing.field.lastProbe' | transloco }}</label><div class="ro">{{ d }}</div></div>
        }
      </app-model-provider-card>

      <!-- ── Document converter (infra) ─────────────────────────────────── -->
      <app-model-provider-card id="unstructured" icon="file"
        [heading]="'mediaProcessing.converter.title' | transloco"
        [purpose]="'mediaProcessing.converter.purpose' | transloco"
        [health]="pipeline.sidecarState('unstructured')"
        [infra]="true" envVar="CONVERSION_SIDECAR_URL">
        <div class="field">
          <label>{{ 'mediaProcessing.field.endpoint' | transloco }}</label>
          <div class="ro">{{ sidecarUrl('unstructured') }}</div>
        </div>
        @if (sidecarDetail('unstructured'); as d) {
          <div class="field"><label>{{ 'mediaProcessing.field.lastProbe' | transloco }}</label><div class="ro">{{ d }}</div></div>
        }
      </app-model-provider-card>

      <!-- ── Face recognition ───────────────────────────────────────────── -->
      <!-- The one model in the pipeline an operator could not switch off: it was absent from the
           client entirely and from the PATCH schema, so opting out meant filesystem access. For a
           feature that detects and embeds people's faces that was the wrong default. -->
      <app-model-provider-card id="face" icon="user"
        [heading]="'mediaProcessing.face.title' | transloco"
        [purpose]="'mediaProcessing.face.purpose' | transloco"
        [health]="faceState()"
        [infra]="s.faceExternalLocked()" envVar="FACE_RECOGNITION_EXTERNAL_MODEL">

        <!-- Two decisions, labelled separately. See FACE_CARD_NOTES above the class. -->
        <!-- No enable switch: face recognition is turned on by raising the IMAGE pipeline to its
             recognition rung (instance ceiling here, then per space), so the ladder is the single
             control. faceRecognition.enabled still exists as an infra/env pin, deliberately not
             editable here. -->
        <div class="hint" style="margin-bottom:12px;">{{ 'mediaProcessing.face.gatedByPipeline' | transloco }}</div>

        @if (s.faceLocked('enabled')) {
          <div class="hint" style="margin-bottom:12px;">
            {{ 'mediaProcessing.face.enabledPinned' | transloco }}
          </div>
        }

        @if (s.faceAwaitingAcknowledgment()) {
          <div class="warnline">
            <ph-icon name="warning" [size]="15"/>
            <span>{{ 'mediaProcessing.face.awaitingAck' | transloco: { host: s.faceExternalHost() } }}</span>
          </div>
        }

        <!-- Optional external provider. In-process (BlazeFace + FaceRes) stays the default and the
             fallback, so leaving this empty changes nothing. -->
        <div class="field">
          <label for="face-endpoint">{{ 'mediaProcessing.face.endpoint' | transloco }}</label>
          <input id="face-endpoint" data-mono type="url" [(ngModel)]="s.faceExternal.baseUrl"
            [disabled]="s.faceExternalLocked() || s.managed" placeholder="https://faces.example.com/embed" />
          <div class="hint">{{ 'mediaProcessing.face.endpointHint' | transloco }}</div>
        </div>
        @if (s.faceExternalConfigured()) {
          <div class="grid2">
            <div class="field">
              <label for="face-ext-model">{{ 'mediaProcessing.face.externalModelName' | transloco }}</label>
              <input id="face-ext-model" data-mono [(ngModel)]="s.faceExternal.model"
                [disabled]="s.faceExternalLocked() || s.managed" />
            </div>
            <div class="field">
              <label for="face-key">{{ 'mediaProcessing.face.apiKey' | transloco }}</label>
              <input id="face-key" type="password" [(ngModel)]="s.faceApiKeyInput"
                [disabled]="s.faceExternalLocked() || s.managed"
                [placeholder]="'mediaProcessing.face.apiKeyPlaceholder' | transloco" />
            </div>
          </div>
          @if (s.faceExternalNeedsAck()) {
            <div class="alert alert-warning" style="font-size:12px;margin-bottom:12px;">
              {{ 'mediaProcessing.face.egressPending' | transloco: { host: s.faceExternalHost() } }}
            </div>
          } @else {
            <app-status-pill [variant]="'ok'">{{ 'mediaProcessing.face.egressAcknowledged' | transloco: { host: s.faceExternal.acknowledgedHost } }}</app-status-pill>
          }
        }

        <div class="grid2">
          <div class="field">
            <label for="face-conf">{{ 'mediaProcessing.face.confidence' | transloco }}</label>
            <input id="face-conf" type="number" min="0" max="1" step="0.05"
              [(ngModel)]="s.face.confidenceThreshold" [disabled]="s.faceLocked('confidenceThreshold') || s.managed" />
            <div class="hint">{{ 'mediaProcessing.face.confidenceHint' | transloco }}</div>
          </div>
          <div class="field">
            <label for="face-minsize">{{ 'mediaProcessing.face.minSize' | transloco }}</label>
            <input id="face-minsize" type="number" min="0" max="1" step="0.01"
              [(ngModel)]="s.face.minFaceSizeFraction" [disabled]="s.faceLocked('minFaceSizeFraction') || s.managed" />
            <div class="hint">{{ 'mediaProcessing.face.minSizeHint' | transloco }}</div>
          </div>
        </div>

        <div class="field">
          <label>{{ 'mediaProcessing.face.personTypes' | transloco }}</label>
          @if (s.face.personEntityTypes?.length) {
            <div class="ptype-chips">
              @for (t of s.face.personEntityTypes; track t) {
                <span class="ptype-chip">{{ t }}
                  @if (!(s.faceLocked('personEntityTypes') || s.managed)) {
                    <button type="button" class="ptype-rm" [attr.aria-label]="'common.remove' | transloco" (click)="removePersonType(t)"><ph-icon name="x" [size]="11"/></button>
                  }
                </span>
              }
            </div>
          }
          @if (!(s.faceLocked('personEntityTypes') || s.managed)) {
            @if (availablePersonTypes().length) {
              <select [ngModel]="''" (ngModelChange)="addPersonType($event)" [attr.aria-label]="'mediaProcessing.face.personTypesAdd' | transloco">
                <option value="" disabled>{{ 'mediaProcessing.face.personTypesAdd' | transloco }}</option>
                @for (t of availablePersonTypes(); track t) { <option [value]="t">{{ t }}</option> }
              </select>
            } @else if (!libEntityTypes().length) {
              <div class="hint">{{ 'mediaProcessing.face.personTypesEmpty' | transloco }}</div>
            }
          }
          <div class="hint">{{ 'mediaProcessing.face.personTypesHint' | transloco }}</div>
        </div>

        <div class="field" style="margin-bottom:0;">
          <label>{{ 'mediaProcessing.face.actorLabel' | transloco }}</label>
          <div class="ro">BlazeFace + FaceRes</div>
        </div>
        <div footer class="testrow">
          @if (s.cardDirty('face')) {
            <button class="btn btn-sm btn-primary card-save" type="button"
              [disabled]="s.saving()" (click)="s.saveCard('face')">
              {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          }
        </div>
      </app-model-provider-card>
    </div>
  `, styles: ["\n    :host { display: block; }\n    /* align-items: stretch is what pins every footer to a shared baseline (owner's point 4). */\n    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));\n      gap: 16px; align-items: stretch; }\n    .field { margin-bottom: 13px; }\n    .field:last-child { margin-bottom: 0; }\n    .field > label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }\n    /* Geometry comes from the ONE input rule in styles.scss. This used to restate it \u2014 and got the radius wrong,\n       hardcoding 8px where every other input uses var(--radius-sm) \u2014 which is how the product ended up with four\n       different inputs. */\n    .field input[data-mono] { font-family: var(--font-mono, monospace); }\n    .field input:disabled, .field select:disabled { opacity: .6; cursor: not-allowed; }\n    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }\n    /* Each field stacks label / input / hint. Left to themselves the two columns lay those out\n       independently, so as soon as one label wraps to a second line and its neighbour does not, the\n       two inputs sit at different heights. Subgrid makes both columns share the SAME three rows, so\n       the inputs line up whatever the labels do -- at any width, in any language. Row alignment is the\n       fix; nudging margins only moves the mismatch to the next viewport width. */\n    .grid2 > .field { display: grid; grid-template-rows: subgrid; grid-row: span 3; margin-bottom: 0;\n      align-content: start; }\n    @media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }\n    .hint { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }\n    .ro { font-family: var(--font-mono, monospace); font-size: 12.5px; color: var(--text-primary);\n      background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px;\n      overflow-wrap: anywhere; }\n    .warnline { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }\n    .warnline ph-icon { flex: none; margin-top: 1px; }\n    .checkrow { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px;\n      color: var(--text-secondary); font-weight: normal;\n      /* Undo the global \".field label\" caption styling (uppercase + tracking) \u2014 a checkbox's own\n         label is a normal sentence, not a field caption. */\n      text-transform: none; letter-spacing: normal; }\n    /* width:auto keeps a checkbox in a checkrow from being stretched to 100% by the .field input\n       rule when the checkrow sits inside a .field (assist card's repair-pass toggle). */\n    .checkrow input { margin-top: 2px; flex: none; width: auto; }\n    /* Person-type chips: the selected library entity types, each removable. */\n    .ptype-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 7px; }\n    .ptype-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 4px 2px 9px;\n      border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary);\n      font-family: var(--font-mono, monospace); }\n    .ptype-rm { display: inline-flex; align-items: center; background: none; border: 0; padding: 2px; cursor: pointer;\n      color: var(--text-muted); border-radius: 4px; }\n    .ptype-rm:hover { color: var(--error); }\n    .switchrow { margin-bottom: 13px; }\n    .switchrow .hint { margin-left: 22px; }   /* line up under the label, not the checkbox */\n    /* The row WRAPS, and that is a deliberate reversal (B.3).\n       It was nowrap to keep pressing Test from jolting the equal-height card row by a line. But nothing\n       in the row could shrink except the hint, so once a status pill appeared beside a second one the\n       fixed widths outgrew the card and pushed the **Verify button out of it, unclickable** \u2014 making the\n       feature one-shot per page load, and it is the feature the reporter most wanted. A row one line\n       taller after you click something is a far smaller cost than an action you cannot reach.\n       The detail still truncates with an ellipsis (full text on hover), so the common case stays on one\n       line; the pill labels were shortened to keep it that way, with the reason living in the hint. */\n    .testrow { display: flex; gap: 10px; row-gap: 8px; align-items: center; flex-wrap: wrap; min-height: 34px; }\n    .testrow > :not(.hint) { flex: none; }\n    .testrow .hint { margin: 0; min-width: 0; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    /* THE BUTTONS DO NOT MOVE WHEN A RESULT ARRIVES.\n       A test result is rendered where it belongs in the DOM \u2014 next to the button that produced it, which is\n       what a screen reader should hear \u2014 and that put a pill and a detail line BETWEEN Test and Verify. So\n       clicking Test pushed Verify sideways, out from under the pointer that had just been over it: the next\n       click landed on whatever had slid into that spot. Visual order is a layout concern, so it is fixed\n       here rather than by reordering the markup: actions are laid out first, results after them. Wrapping the\n       results in a div instead would also change what assistive tech reads, which is not the bug. */\n    .testrow > button { order: 0; }\n    .testrow > app-status-pill, .testrow > .hint { order: 1; }\n    /* Save belongs to the card it sits in and appears only when that card has an unsaved change, so it\n       is pushed to the far end of the row rather than sitting beside Test as a peer action. */\n    .testrow .card-save { order: 2; margin-left: auto; }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ModelsTabComponent, { className: "ModelsTabComponent", filePath: "app/pages/settings/media-processing/models-tab.component.ts", lineNumber: 764 }); })();
