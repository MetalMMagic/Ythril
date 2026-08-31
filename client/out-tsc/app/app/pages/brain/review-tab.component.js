import { Component, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DuplicatesApi } from '../../core/duplicates-api.service';
import { ContradictionsApi } from '../../core/contradictions-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ count: a0 });
const _c1 = (a0, a1) => ({ lost: a0, weight: a1 });
const _c2 = (a0, a1, a2) => ({ affected: a0, total: a1, scope: a2 });
const _c3 = a0 => ({ more: a0 });
const _c4 = a0 => ({ tab: a0 });
const _c5 = a0 => ({ who: a0 });
const _forTrack0 = ($index, $item) => $item.id + $item.scope;
const _forTrack1 = ($index, $item) => $item.id;
const _forTrack2 = ($index, $item) => $item.key;
function ReviewTabComponent_For_6_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 7);
    i0.ɵɵlistener("click", function ReviewTabComponent_For_6_Template_button_click_0_listener() { const t_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.sub.set(t_r2)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("active", ctx_r2.sub() === t_r2);
    i0.ɵɵattribute("aria-selected", ctx_r2.sub() === t_r2)("id", "review-tab-" + t_r2)("aria-controls", "review-panel-" + t_r2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 6, "review.sub." + t_r2), " ");
} }
function ReviewTabComponent_Conditional_7_For_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 10);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r5 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r5);
} }
function ReviewTabComponent_Conditional_7_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "review.typeFilter.capped"));
} }
function ReviewTabComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 3)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "select", 8);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵlistener("ngModelChange", function ReviewTabComponent_Conditional_7_Template_select_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.typeFilter.set($event)); });
    i0.ɵɵelementStart(6, "option", 9);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(9, ReviewTabComponent_Conditional_7_For_10_Template, 2, 2, "option", 10, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(11, ReviewTabComponent_Conditional_7_Conditional_11_Template, 3, 3, "span", 11);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵattribute("for", "review-type-filter");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 6, "review.typeFilter.label"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngModel", ctx_r2.typeFilter());
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(5, 8, "review.typeFilter.label"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 10, "review.typeFilter.all"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r2.typeOptions());
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.listCapped() ? 11 : -1);
} }
function ReviewTabComponent_Conditional_8_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵelement(1, "span", 15);
    i0.ɵɵelementEnd();
} }
function ReviewTabComponent_Conditional_8_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "review.suggestions.loadError"));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16)(1, "span", 21);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 22);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const score_r6 = ctx;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵclassProp("good", score_r6 >= 85)("mid", score_r6 >= 60 && score_r6 < 85)("bad", score_r6 < 60);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", score_r6, "%");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(5, 8, "review.suggestions.scoreLabel", i0.ɵɵpureFunction1(11, _c0, ctx_r2.compChecks().length)));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_24_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li", 37);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r7 = ctx.$implicit;
    const c_r8 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r2 = i0.ɵɵnextContext(4);
    i0.ɵɵproperty("title", s_r7);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r2.sampleLabel(c_r8, s_r7));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_24_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 38);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r8 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "review.suggestions.andMore", i0.ɵɵpureFunction1(4, _c3, c_r8.affected - c_r8.sample.length)));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 36);
    i0.ɵɵrepeaterCreate(1, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_24_For_2_Template, 2, 2, "li", 37, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_24_Conditional_3_Template, 3, 6, "div", 38);
} if (rf & 2) {
    const c_r8 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(c_r8.sample);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r8.affected > c_r8.sample.length ? 3 : -1);
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 35)(1, "button", 39);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_25_Template_button_click_1_listener() { const tab_r10 = i0.ɵɵrestoreView(_r9); const ctx_r2 = i0.ɵɵnextContext(5); return i0.ɵɵresetView(ctx_r2.openTab.emit(tab_r10)); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(4, 3, "review.suggestions.open", i0.ɵɵpureFunction1(6, _c4, i0.ɵɵpipeBind1(3, 1, "brain.tab." + ctx))), " ");
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 23)(1, "div", 24)(2, "app-status-pill", 25);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 26);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "span", 27);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "div", 28)(12, "div", 29);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "div", 30);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "div", 31)(20, "span", 32);
    i0.ɵɵelement(21, "span", 33);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "span", 34);
    i0.ɵɵtext(23);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(24, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_24_Template, 4, 1);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(25, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Conditional_25_Template, 5, 8, "div", 35);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_23_0;
    const c_r8 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("variant", c_r8.severity === "warn" ? "warn" : "off");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 13, "review.suggestions.severity." + c_r8.severity));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 15, "brain.overview.comp.scope." + c_r8.scope));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(10, 17, "review.suggestions.pointsLost", i0.ɵɵpureFunction2(27, _c1, (c_r8.weight - c_r8.earned).toFixed(1), c_r8.weight)));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(15, 22, "brain.overview.comp.check." + c_r8.id, i0.ɵɵpureFunction3(30, _c2, c_r8.affected, c_r8.total, i0.ɵɵpipeBind1(14, 20, "brain.overview.comp.scope." + c_r8.scope))));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 25, "review.suggestions.why." + c_r8.id));
    i0.ɵɵadvance(4);
    i0.ɵɵclassMap(ctx_r2.scoreVariant(c_r8.earned / c_r8.weight));
    i0.ɵɵstyleProp("width", ctx_r2.earnedPct(c_r8), "%");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", ctx_r2.earnedPct(c_r8), "%");
    i0.ɵɵadvance();
    i0.ɵɵconditional(c_r8.sample.length ? 24 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_23_0 = c_r8.targetTab) ? 25 : -1, tmp_23_0);
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 17);
    i0.ɵɵrepeaterCreate(1, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_For_2_Template, 26, 34, "div", 23, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.failingChecks());
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 18)(1, "div", 40);
    i0.ɵɵelement(2, "ph-icon", 41);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "review.suggestions.clean.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "review.suggestions.clean.body"));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 18)(1, "div", 40);
    i0.ɵɵelement(2, "ph-icon", 42);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "review.suggestions.none.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "review.suggestions.none.body"));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_4_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li");
    i0.ɵɵelement(1, "ph-icon", 41);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r11 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 4, "brain.overview.comp.check." + c_r11.id, i0.ɵɵpureFunction3(7, _c2, c_r11.affected, c_r11.total, i0.ɵɵpipeBind1(3, 2, "brain.overview.comp.scope." + c_r11.scope))));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "details", 19)(1, "summary");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "ul");
    i0.ɵɵrepeaterCreate(5, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_4_For_6_Template, 5, 11, "li", null, _forTrack0);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(3, 1, "review.suggestions.passing", i0.ɵɵpureFunction1(4, _c0, ctx_r2.passingChecks().length)));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r2.passingChecks());
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 20);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.comp.truncated"));
} }
function ReviewTabComponent_Conditional_8_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_0_Template, 6, 13, "div", 16);
    i0.ɵɵconditionalCreate(1, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_1_Template, 3, 0, "div", 17)(2, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_2_Template, 9, 7, "div", 18)(3, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_3_Template, 9, 7, "div", 18);
    i0.ɵɵconditionalCreate(4, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_4_Template, 7, 6, "details", 19);
    i0.ɵɵconditionalCreate(5, ReviewTabComponent_Conditional_8_Conditional_6_Conditional_5_Template, 3, 3, "div", 20);
} if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional((tmp_2_0 = ctx_r2.compScore()) ? 0 : -1, tmp_2_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.failingChecks().length ? 1 : ctx_r2.compChecks().length ? 2 : 3);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r2.passingChecks().length ? 4 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.compTruncated() ? 5 : -1);
} }
function ReviewTabComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 4)(1, "p", 12);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(4, ReviewTabComponent_Conditional_8_Conditional_4_Template, 2, 0, "div", 13)(5, ReviewTabComponent_Conditional_8_Conditional_5_Template, 3, 3, "div", 14)(6, ReviewTabComponent_Conditional_8_Conditional_6_Template, 6, 4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "review.suggestions.intro"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.compLoading() ? 4 : ctx_r2.compError() ? 5 : 6);
} }
function ReviewTabComponent_Conditional_9_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 53);
} }
function ReviewTabComponent_Conditional_9_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵelement(1, "span", 15);
    i0.ɵɵelementEnd();
} }
function ReviewTabComponent_Conditional_9_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 55);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function ReviewTabComponent_Conditional_9_Conditional_30_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r13); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.loadContradictions()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "review.contradictions.loadError"))("reason", ctx_r2.conError() ?? "");
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "duplicates.noMatches.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "duplicates.noMatches.body"));
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "review.typeFilter.noneOfType"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "review.typeFilter.noneOfTypeBody"));
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "review.contradictions.noneWithStatus"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "review.contradictions.noneWithStatusBody"));
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "review.contradictions.structuredOnlyTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "review.contradictions.structuredOnlyBody"));
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Conditional_7_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "review.contradictions.judgeRan"));
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, ReviewTabComponent_Conditional_9_Conditional_31_Conditional_7_Conditional_6_Template, 3, 3, "p");
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 3, "review.contradictions.cleanTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 5, "review.contradictions.cleanBody"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.conNliConfigured() === true ? 6 : -1);
} }
function ReviewTabComponent_Conditional_9_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 18)(1, "div", 40);
    i0.ɵɵelement(2, "ph-icon", 56);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, ReviewTabComponent_Conditional_9_Conditional_31_Conditional_3_Template, 6, 6)(4, ReviewTabComponent_Conditional_9_Conditional_31_Conditional_4_Template, 6, 6)(5, ReviewTabComponent_Conditional_9_Conditional_31_Conditional_5_Template, 6, 6)(6, ReviewTabComponent_Conditional_9_Conditional_31_Conditional_6_Template, 6, 6)(7, ReviewTabComponent_Conditional_9_Conditional_31_Conditional_7_Template, 7, 7);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.query().trim() && ctx_r2.conRows().length ? 3 : ctx_r2.typeFilter() !== "all" && ctx_r2.conRows().length ? 4 : ctx_r2.conStatusFilter !== "open" ? 5 : ctx_r2.conNliConfigured() === false ? 6 : 7);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 58);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "review.contradictions.basis.structured"));
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 70);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 31);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementStart(5, "span", 32);
    i0.ɵɵelement(6, "span", 33);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "span", 34);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 7, "review.contradictions.basis.nli"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(4, 9, "review.contradictions.confidence"));
    i0.ɵɵadvance(3);
    i0.ɵɵclassMap(ctx_r2.scoreVariant(c_r14.confidence));
    i0.ɵɵstyleProp("width", ctx_r2.scorePct(c_r14.confidence), "%");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", ctx_r2.scorePct(c_r14.confidence), "%");
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 25);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("variant", c_r14.status === "resolved" ? "ok" : "off");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "duplicates.status." + c_r14.status));
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_9_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "span", 71);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 72);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 73);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "span", 74);
    i0.ɵɵtext(9);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const f_r15 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(f_r15.key);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(f_r15.aValue);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 4, "review.contradictions.versus"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(f_r15.bValue);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 59);
    i0.ɵɵrepeaterCreate(1, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_9_For_2_Template, 10, 6, "li", null, _forTrack2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(c_r14.fields);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 75);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵclassProp("win", c_r14.supersededId !== c_r14.aId)("lose", c_r14.supersededId === c_r14.aId);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, c_r14.supersededId === c_r14.aId ? "review.contradictions.superseded" : "review.contradictions.kept"), " ");
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_18_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "pre");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_18_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 76);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r2.fullError() ?? i0.ɵɵpipeBind1(2, 1, "common.loading"));
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 65);
    i0.ɵɵconditionalCreate(1, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_18_Conditional_1_Template, 2, 1, "pre")(2, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_18_Conditional_2_Template, 3, 3, "span", 76);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_13_0;
    const ctx_r2 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_13_0 = ctx_r2.fullA()) ? 1 : 2, tmp_13_0);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 75);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵclassProp("win", c_r14.supersededId !== c_r14.bId)("lose", c_r14.supersededId === c_r14.bId);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, c_r14.supersededId === c_r14.bId ? "review.contradictions.superseded" : "review.contradictions.kept"), " ");
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_29_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "pre");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_29_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 76);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r2.fullError() ?? i0.ɵɵpipeBind1(2, 1, "common.loading"));
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 65);
    i0.ɵɵconditionalCreate(1, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_29_Conditional_1_Template, 2, 1, "pre")(2, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_29_Conditional_2_Template, 3, 3, "span", 76);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_13_0;
    const ctx_r2 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_13_0 = ctx_r2.fullB()) ? 1 : 2, tmp_13_0);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 68);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "review.contradictions.decidedBy", i0.ɵɵpureFunction1(4, _c5, c_r14.resolvedBy)));
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 77);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_32_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r16); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.reopenContradiction(c_r14)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("disabled", ctx_r2.conBusy() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, "duplicates.reRate"), " ");
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 78)(1, "button", 77);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r17); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.keepSide(c_r14, "a")); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "button", 77);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template_button_click_4_listener() { i0.ɵɵrestoreView(_r17); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.keepSide(c_r14, "b")); });
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 79);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r17); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.toggleFull(c_r14)); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "button", 77);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template_button_click_10_listener() { i0.ɵɵrestoreView(_r17); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.dismissContradiction(c_r14)); });
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "button", 77);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template_button_click_13_listener() { i0.ɵɵrestoreView(_r17); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.resolveContradiction(c_r14, "edited")); });
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "button", 77);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template_button_click_16_listener() { i0.ɵɵrestoreView(_r17); const c_r14 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.resolveContradiction(c_r14, "linked")); });
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r14 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r2.conBusy() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 12, "review.contradictions.action.keepA"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r2.conBusy() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(6, 14, "review.contradictions.action.keepB"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-expanded", ctx_r2.expanded() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(9, 16, ctx_r2.expanded() === c_r14.id ? "review.contradictions.action.hideFull" : "review.contradictions.action.showFull"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r2.conBusy() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(12, 18, "duplicates.dismiss"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r2.conBusy() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(15, 20, "review.contradictions.action.edited"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r2.conBusy() === c_r14.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(18, 22, "review.contradictions.action.linked"), " ");
} }
function ReviewTabComponent_Conditional_9_Conditional_32_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 23)(1, "div", 24)(2, "span", 26);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(4, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_4_Template, 3, 3, "app-status-pill", 58)(5, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_5_Template, 9, 11);
    i0.ɵɵconditionalCreate(6, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_6_Template, 3, 4, "app-status-pill", 25);
    i0.ɵɵelementStart(7, "span", 27);
    i0.ɵɵelement(8, "app-relative-time", 10);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(9, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_9_Template, 3, 0, "ul", 59);
    i0.ɵɵelementStart(10, "div", 60)(11, "div", 61)(12, "div", 62);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵconditionalCreate(15, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_15_Template, 3, 7, "span", 63);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "div", 64);
    i0.ɵɵtext(17);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(18, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_18_Template, 3, 1, "div", 65);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "div", 66);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "div", 67)(23, "div", 62);
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵconditionalCreate(26, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_26_Template, 3, 7, "span", 63);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "div", 64);
    i0.ɵɵtext(28);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(29, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_29_Template, 3, 1, "div", 65);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(30, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_30_Template, 3, 6, "div", 68);
    i0.ɵɵelementStart(31, "div", 35);
    i0.ɵɵconditionalCreate(32, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_32_Template, 3, 4, "button", 69)(33, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Conditional_33_Template, 19, 24);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const c_r14 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵclassProp("expanded", ctx_r2.expanded() === c_r14.id);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(c_r14.type);
    i0.ɵɵadvance();
    i0.ɵɵconditional(c_r14.basis === "structured-field" ? 4 : 5);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r14.status !== "open" ? 6 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", c_r14.detectedAt);
    i0.ɵɵadvance();
    i0.ɵɵconditional((c_r14.fields == null ? null : c_r14.fields.length) ? 9 : -1);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(14, 18, "duplicates.table.recordA"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r14.supersededId ? 15 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r14.aSummary);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.expanded() === c_r14.id ? 18 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 20, "review.contradictions.versus"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(25, 22, "duplicates.table.recordB"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r14.supersededId ? 26 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r14.bSummary);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.expanded() === c_r14.id ? 29 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(c_r14.resolution === "superseded" && c_r14.resolvedBy ? 30 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r14.status === "dismissed" ? 32 : c_r14.status === "open" ? 33 : -1);
} }
function ReviewTabComponent_Conditional_9_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 17);
    i0.ɵɵrepeaterCreate(1, ReviewTabComponent_Conditional_9_Conditional_32_For_2_Template, 34, 24, "div", 57, _forTrack1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.conFilteredRows());
} }
function ReviewTabComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "section", 5)(1, "p", 12);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "app-summary-strip", 43)(5, "div", 44)(6, "label", 45);
    i0.ɵɵelement(7, "ph-icon", 46);
    i0.ɵɵelementStart(8, "input", 47);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵlistener("ngModelChange", function ReviewTabComponent_Conditional_9_Template_input_ngModelChange_8_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.query.set($event)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "select", 48);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function ReviewTabComponent_Conditional_9_Template_select_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r2 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r2.conStatusFilter, $event) || (ctx_r2.conStatusFilter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("change", function ReviewTabComponent_Conditional_9_Template_select_change_11_listener() { i0.ɵɵrestoreView(_r12); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.loadContradictions()); });
    i0.ɵɵelementStart(13, "option", 49);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "option", 50);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "option", 51);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "option", 9);
    i0.ɵɵtext(23);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(25, "button", 52);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_9_Template_button_click_25_listener() { i0.ɵɵrestoreView(_r12); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.scanContradictions()); });
    i0.ɵɵconditionalCreate(26, ReviewTabComponent_Conditional_9_Conditional_26_Template, 1, 0, "span", 53);
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(29, ReviewTabComponent_Conditional_9_Conditional_29_Template, 2, 0, "div", 13)(30, ReviewTabComponent_Conditional_9_Conditional_30_Template, 2, 4, "app-error-state", 54)(31, ReviewTabComponent_Conditional_9_Conditional_31_Template, 8, 2, "div", 18)(32, ReviewTabComponent_Conditional_9_Conditional_32_Template, 3, 0, "div", 17);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 16, "review.contradictions.intro"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("items", ctx_r2.conSummaryItems());
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngModel", ctx_r2.query())("placeholder", i0.ɵɵpipeBind1(9, 18, "duplicates.searchPlaceholder"));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(10, 20, "duplicates.searchPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r2.conStatusFilter);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(12, 22, "duplicates.statusFilterAria"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 24, "duplicates.status.open"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 26, "duplicates.status.dismissed"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 28, "duplicates.status.resolved"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 30, "duplicates.status.all"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r2.conScanning());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.conScanning() ? 26 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(28, 32, "duplicates.scanNow"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.conLoading() ? 29 : ctx_r2.conError() !== null ? 30 : ctx_r2.conFilteredRows().length === 0 ? 31 : 32);
} }
function ReviewTabComponent_Conditional_10_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 53);
} }
function ReviewTabComponent_Conditional_10_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵelement(1, "span", 15);
    i0.ɵɵelementEnd();
} }
function ReviewTabComponent_Conditional_10_Conditional_27_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "duplicates.loadError"));
} }
function ReviewTabComponent_Conditional_10_Conditional_28_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "duplicates.noMatches.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "duplicates.noMatches.body"));
} }
function ReviewTabComponent_Conditional_10_Conditional_28_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "review.typeFilter.noneOfType"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "review.typeFilter.noneOfTypeBody"));
} }
function ReviewTabComponent_Conditional_10_Conditional_28_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "duplicates.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "duplicates.empty.body"));
} }
function ReviewTabComponent_Conditional_10_Conditional_28_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 18)(1, "div", 40);
    i0.ɵɵelement(2, "ph-icon", 41);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, ReviewTabComponent_Conditional_10_Conditional_28_Conditional_3_Template, 6, 6)(4, ReviewTabComponent_Conditional_10_Conditional_28_Conditional_4_Template, 6, 6)(5, ReviewTabComponent_Conditional_10_Conditional_28_Conditional_5_Template, 6, 6);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.query().trim() && ctx_r2.rows().length ? 3 : ctx_r2.typeFilter() !== "all" && ctx_r2.rows().length ? 4 : 5);
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 25);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r19 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("variant", d_r19.status === "resolved" ? "ok" : "off");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "duplicates.status." + d_r19.status));
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_29_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 80);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r19 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "duplicates.resolution." + d_r19.resolution));
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_29_Conditional_0_Template, 3, 3, "div", 80);
} if (rf & 2) {
    const d_r19 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵconditional(d_r19.resolution ? 0 : -1);
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    const _r20 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 35)(1, "button", 52);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_30_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r20); const d_r19 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.reopen(d_r19)); });
    i0.ɵɵelement(2, "ph-icon", 81);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const d_r19 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r2.busy() === d_r19.id);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(4, 3, "duplicates.reRate"), " ");
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_31_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r22 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 84);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_31_Conditional_1_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r22); const d_r19 = i0.ɵɵnextContext(2).$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.merge(d_r19)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r19 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("disabled", ctx_r2.busy() === d_r19.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "duplicates.merge"));
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    const _r21 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 35);
    i0.ɵɵconditionalCreate(1, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_31_Conditional_1_Template, 3, 4, "button", 82);
    i0.ɵɵelementStart(2, "button", 52);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_31_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r21); const d_r19 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.dismiss(d_r19)); });
    i0.ɵɵelement(3, "ph-icon", 83);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const d_r19 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵconditional(d_r19.type === "entity" ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r2.busy() === d_r19.id);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(5, 4, "duplicates.dismiss"), " ");
} }
function ReviewTabComponent_Conditional_10_Conditional_29_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 23)(1, "div", 24)(2, "span", 26);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 31);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementStart(6, "span", 32);
    i0.ɵɵelement(7, "span", 33);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "span", 34);
    i0.ɵɵtext(9);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(10, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_10_Template, 3, 4, "app-status-pill", 25);
    i0.ɵɵelementStart(11, "span", 27);
    i0.ɵɵelement(12, "app-relative-time", 10);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(13, "div", 60)(14, "div", 61)(15, "div", 62);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "div", 64);
    i0.ɵɵtext(19);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(20, "div", 66);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "div", 67)(24, "div", 62);
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "div", 64);
    i0.ɵɵtext(28);
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(29, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_29_Template, 1, 1)(30, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_30_Template, 5, 5, "div", 35)(31, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Conditional_31_Template, 6, 6, "div", 35);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r19 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(d_r19.type);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(5, 15, "duplicates.confidence"));
    i0.ɵɵadvance(3);
    i0.ɵɵclassMap(ctx_r2.scoreVariant(d_r19.score));
    i0.ɵɵstyleProp("width", ctx_r2.scorePct(d_r19.score), "%");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", ctx_r2.scorePct(d_r19.score), "%");
    i0.ɵɵadvance();
    i0.ɵɵconditional(d_r19.status !== "open" ? 10 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", d_r19.detectedAt);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 17, "duplicates.table.recordA"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(d_r19.aSummary);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 19, "duplicates.vs"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 21, "duplicates.table.recordB"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(d_r19.bSummary);
    i0.ɵɵadvance();
    i0.ɵɵconditional(d_r19.status === "resolved" ? 29 : d_r19.status === "dismissed" ? 30 : 31);
} }
function ReviewTabComponent_Conditional_10_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 17);
    i0.ɵɵrepeaterCreate(1, ReviewTabComponent_Conditional_10_Conditional_29_For_2_Template, 32, 23, "div", 23, _forTrack1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.filteredRows());
} }
function ReviewTabComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r18 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "section", 6)(1, "p", 12);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "app-summary-strip", 43)(5, "div", 44)(6, "label", 45);
    i0.ɵɵelement(7, "ph-icon", 46);
    i0.ɵɵelementStart(8, "input", 47);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵlistener("ngModelChange", function ReviewTabComponent_Conditional_10_Template_input_ngModelChange_8_listener($event) { i0.ɵɵrestoreView(_r18); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.query.set($event)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "select", 48);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function ReviewTabComponent_Conditional_10_Template_select_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r18); const ctx_r2 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r2.statusFilter, $event) || (ctx_r2.statusFilter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("change", function ReviewTabComponent_Conditional_10_Template_select_change_11_listener() { i0.ɵɵrestoreView(_r18); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.load()); });
    i0.ɵɵelementStart(13, "option", 49);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "option", 50);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "option", 9);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(22, "button", 52);
    i0.ɵɵlistener("click", function ReviewTabComponent_Conditional_10_Template_button_click_22_listener() { i0.ɵɵrestoreView(_r18); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.scan()); });
    i0.ɵɵconditionalCreate(23, ReviewTabComponent_Conditional_10_Conditional_23_Template, 1, 0, "span", 53);
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(26, ReviewTabComponent_Conditional_10_Conditional_26_Template, 2, 0, "div", 13)(27, ReviewTabComponent_Conditional_10_Conditional_27_Template, 3, 3, "div", 14)(28, ReviewTabComponent_Conditional_10_Conditional_28_Template, 6, 2, "div", 18)(29, ReviewTabComponent_Conditional_10_Conditional_29_Template, 3, 0, "div", 17);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 15, "duplicates.intro"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("items", ctx_r2.summaryItems());
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngModel", ctx_r2.query())("placeholder", i0.ɵɵpipeBind1(9, 17, "duplicates.searchPlaceholder"));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(10, 19, "duplicates.searchPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r2.statusFilter);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(12, 21, "duplicates.statusFilterAria"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 23, "duplicates.status.open"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 25, "duplicates.status.dismissed"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 27, "duplicates.status.all"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r2.scanning());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.scanning() ? 23 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(25, 29, "duplicates.scanNow"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.loading() ? 26 : ctx_r2.error() ? 27 : ctx_r2.filteredRows().length === 0 ? 28 : 29);
} }
export class ReviewTabComponent {
    constructor() {
        this.contradictionsApi = inject(ContradictionsApi);
        this.conRows = signal([], ...(ngDevMode ? [{ debugName: "conRows" }] : /* istanbul ignore next */ []));
        this.conLoading = signal(false, ...(ngDevMode ? [{ debugName: "conLoading" }] : /* istanbul ignore next */ []));
        /**
         * Null until the contradictions load failed. The toast alone was not enough: it is transient, and
         * on a FIRST load `conRows()` is empty, so the page settled on "no contradictions — your brain is
         * consistent" while nobody had actually checked.
         */
        this.conError = signal(null, ...(ngDevMode ? [{ debugName: "conError" }] : /* istanbul ignore next */ []));
        this.conBusy = signal(null, ...(ngDevMode ? [{ debugName: "conBusy" }] : /* istanbul ignore next */ []));
        this.conScanning = signal(false, ...(ngDevMode ? [{ debugName: "conScanning" }] : /* istanbul ignore next */ []));
        /**
         * Which pile to show. Was **hardcoded to `open`**, which made `Dismiss` and both `Resolve` buttons
         * one-way: the API has supported `dismissed` / `resolved` / `all` all along, the UI simply never asked.
         * Three things were dead because of it — the status pill (rendered only when `status !== 'open'`), the
         * `re-rate` button (rendered only when `status === 'dismissed'`), and any chance of undoing a mis-click.
         */
        this.conStatusFilter = 'open';
        /**
         * Whether the model-judged pass is among the ones that run, as reported by the server.
         *
         * `null` means NOT KNOWN, and is deliberately a third state rather than a default of `true`. Defaulting
         * would make the strongest available claim — "both passes have run and found nothing" — on the weakest
         * available evidence, which is the exact move that produced the bug this whole item is about. When it is
         * unknown the empty state says only what it can see: nothing was found.
         */
        this.conNliConfigured = signal(null, ...(ngDevMode ? [{ debugName: "conNliConfigured" }] : /* istanbul ignore next */ []));
        // ── Keep A / Keep B ────────────────────────────────────────────────────────────────────────────────────
        //
        // The reviewer's real decision about two disagreeing records is "this one is right, that one is stale".
        // Neither existing resolution said it, so they were being recorded as `edited` (nothing was corrected) or
        // `linked` (nobody drew an edge). This names the loser and lets the server draw `supersedes` for an entity
        // pair — and nothing is deleted, which is the line between this and a duplicate merge.
        /** Which card has its full records expanded. One at a time: two full records is already a lot to read. */
        this.expanded = signal(null, ...(ngDevMode ? [{ debugName: "expanded" }] : /* istanbul ignore next */ []));
        this.fullA = signal(null, ...(ngDevMode ? [{ debugName: "fullA" }] : /* istanbul ignore next */ []));
        this.fullB = signal(null, ...(ngDevMode ? [{ debugName: "fullB" }] : /* istanbul ignore next */ []));
        this.fullError = signal(null, ...(ngDevMode ? [{ debugName: "fullError" }] : /* istanbul ignore next */ []));
        /** Sub-views of the space's record-QA queue. Ordered as a reviewer meets them. */
        this.SUBTABS = ['duplicates', 'contradictions', 'suggestions'];
        this.sub = signal('duplicates', ...(ngDevMode ? [{ debugName: "sub" }] : /* istanbul ignore next */ []));
        /** The space's completeness tab jumps back into the Brain's own tabs; the shell owns that switch. */
        this.openTab = new EventEmitter();
        /** The space being reviewed. Required: this view is per-space now, never instance-wide. */
        this.spaceId = '';
        this.duplicatesApi = inject(DuplicatesApi);
        this.spacesApi = inject(SpacesApi);
        this.brainApi = inject(BrainApi);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal(false, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.scanning = signal(false, ...(ngDevMode ? [{ debugName: "scanning" }] : /* istanbul ignore next */ []));
        this.busy = signal(null, ...(ngDevMode ? [{ debugName: "busy" }] : /* istanbul ignore next */ []));
        this.rows = signal([], ...(ngDevMode ? [{ debugName: "rows" }] : /* istanbul ignore next */ []));
        this.statusFilter = 'open';
        /** Free-text filter over the loaded list — a dismissed pile can grow large, so it is searchable. */
        this.query = signal('', ...(ngDevMode ? [{ debugName: "query" }] : /* istanbul ignore next */ []));
        /**
         * Record-type filter, shared by BOTH sub-tabs.
         *
         * The sub-tabs are kinds of FINDING (duplicates vs contradictions); this is the record TYPE. They are
         * orthogonal, which is exactly why type is not a third and fourth tab — that would produce a matrix
         * (duplicates×memory, contradictions×chrono, …) that grows badly. Sharing one signal across both panels
         * means "I am looking at chrono findings" survives a tab switch, rather than the filter silently meaning
         * something different on each side.
         */
        this.typeFilter = signal('all', ...(ngDevMode ? [{ debugName: "typeFilter" }] : /* istanbul ignore next */ []));
        /**
         * The types actually present in the current sub-tab's loaded rows, so the control never offers a choice
         * that can only ever yield nothing. Derived from the UNFILTERED rows — deriving from the filtered list
         * would make every other option vanish the moment one was picked.
         */
        this.availableTypes = computed(() => {
            const list = this.sub() === 'contradictions' ? this.conRows() : this.rows();
            return [...new Set(list.map(r => r.type))].sort();
        }, ...(ngDevMode ? [{ debugName: "availableTypes" }] : /* istanbul ignore next */ []));
        /**
         * Whether to render the control.
         *
         * Normally hidden when the queue is all one type — a filter with a single real choice is noise. But it
         * MUST stay visible whenever a filter is actually applied, even if this tab has one type or none: the
         * signal is shared across both sub-tabs, so filtering Duplicates to `memory` and switching to
         * Contradictions would otherwise hide the control while it was still constraining the list, leaving an
         * empty view and no way to clear it. Never hide a control that is currently narrowing what is on screen.
         */
        this.showTypeFilter = computed(() => 
        // Suggestions are not record findings — they are findings about the SCHEMA and the space, so a
        // record-type filter has nothing to narrow there. Showing it would imply the list is filtered when
        // it is not, which is the same lie as hiding an active filter.
        this.sub() !== 'suggestions' && (this.availableTypes().length > 1 || this.typeFilter() !== 'all'), ...(ngDevMode ? [{ debugName: "showTypeFilter" }] : /* istanbul ignore next */ []));
        // ── Suggestions (space completeness, part B) ─────────────────────────────────
        //
        // Overview shows the score and its three heaviest deductions; this is where the whole report lives,
        // with the samples resolved into something a reviewer can recognise. A raw entity UUID is not a
        // finding anyone can act on, so the entity-scoped samples are looked up by name.
        this.compLoading = signal(false, ...(ngDevMode ? [{ debugName: "compLoading" }] : /* istanbul ignore next */ []));
        this.compError = signal(false, ...(ngDevMode ? [{ debugName: "compError" }] : /* istanbul ignore next */ []));
        this.compScore = signal(null, ...(ngDevMode ? [{ debugName: "compScore" }] : /* istanbul ignore next */ []));
        this.compTruncated = signal(false, ...(ngDevMode ? [{ debugName: "compTruncated" }] : /* istanbul ignore next */ []));
        this.compChecks = signal([], ...(ngDevMode ? [{ debugName: "compChecks" }] : /* istanbul ignore next */ []));
        /** Entity id → name, for the samples that are record ids rather than schema keys. */
        this.entityNames = signal({}, ...(ngDevMode ? [{ debugName: "entityNames" }] : /* istanbul ignore next */ []));
        /** Costing points, heaviest loss first — what a reviewer came here to work through. */
        this.failingChecks = computed(() => this.compChecks()
            .filter(c => c.earned < c.weight)
            .sort((a, b) => (b.weight - b.earned) - (a.weight - a.earned)), ...(ngDevMode ? [{ debugName: "failingChecks" }] : /* istanbul ignore next */ []));
        /** Everything already clean. Listed, not hidden: on a healthy space this is the whole answer, and an
         *  empty page would read as "we checked nothing" rather than "nothing is wrong". */
        this.passingChecks = computed(() => this.compChecks().filter(c => c.earned >= c.weight), ...(ngDevMode ? [{ debugName: "passingChecks" }] : /* istanbul ignore next */ []));
        /**
         * The options to render: the types present here, plus the active filter if this tab has none of them.
         *
         * Without that union the `<select>` would hold a value with no matching `<option>` after a tab switch and
         * render blank — the control would look unset while still filtering the list.
         */
        this.typeOptions = computed(() => {
            const types = this.availableTypes();
            const active = this.typeFilter();
            return active !== 'all' && !types.includes(active) ? [...types, active].sort() : types;
        }, ...(ngDevMode ? [{ debugName: "typeOptions" }] : /* istanbul ignore next */ []));
        /** The list actually shown: the loaded rows narrowed by the search box (summaries, type, space). */
        this.filteredRows = computed(() => {
            const q = this.query().trim().toLowerCase();
            const type = this.typeFilter();
            let list = this.rows();
            if (type !== 'all')
                list = list.filter(r => r.type === type);
            if (!q)
                return list;
            return list.filter(r => `${r.aSummary} ${r.bSummary} ${r.type} ${r.spaceId}`.toLowerCase().includes(q));
        }, ...(ngDevMode ? [{ debugName: "filteredRows" }] : /* istanbul ignore next */ []));
        /**
         * Contradictions narrowed by the shared type filter and the shared search box.
         *
         * `query` is shared with Duplicates on purpose, exactly as `typeFilter` is: both are questions about
         * WHICH RECORDS, not about which kind of finding, so "I am looking at the Vault records" should survive
         * a tab switch. The status filters are NOT shared — contradictions have a `resolved` pile and duplicates
         * do not, so one control would have to offer an option that means nothing on one side.
         *
         * The searched text includes the disagreeing field values, which is what a reviewer actually remembers
         * about a structured finding — "the one about `region`" — and it is not in either summary.
         */
        this.conFilteredRows = computed(() => {
            const q = this.query().trim().toLowerCase();
            const type = this.typeFilter();
            let list = this.conRows();
            if (type !== 'all')
                list = list.filter(r => r.type === type);
            if (!q)
                return list;
            return list.filter(r => {
                const fields = (r.fields ?? []).map(f => `${f.key} ${f.aValue} ${f.bValue}`).join(' ');
                return `${r.aSummary} ${r.bSummary} ${r.type} ${r.spaceId} ${fields}`.toLowerCase().includes(q);
            });
        }, ...(ngDevMode ? [{ debugName: "conFilteredRows" }] : /* istanbul ignore next */ []));
        /** The same rollup Duplicates gets: what still needs attention, and how much of it is on screen. */
        this.conSummaryItems = computed(() => {
            const list = this.conRows();
            const open = list.filter(r => r.status === 'open').length;
            return [
                { label: this.transloco.translate('duplicates.summary.open'), value: String(open), variant: open ? 'warn' : 'ok' },
                { label: this.transloco.translate('duplicates.summary.shown'), value: String(this.conFilteredRows().length) },
            ];
        }, ...(ngDevMode ? [{ debugName: "conSummaryItems" }] : /* istanbul ignore next */ []));
        this.listCapped = computed(() => (this.sub() === 'contradictions' ? this.conRows() : this.rows()).length >= ReviewTabComponent.SERVER_CAP, ...(ngDevMode ? [{ debugName: "listCapped" }] : /* istanbul ignore next */ []));
        /** Operator-first rollup atop the list: how many still need attention + how strong the matches are. */
        this.summaryItems = computed(() => {
            const list = this.rows();
            const open = list.filter(r => r.status === 'open').length;
            const scores = list.map(r => r.score);
            const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return [
                { label: this.transloco.translate('duplicates.summary.open'), value: String(open), variant: open ? 'warn' : 'ok' },
                { label: this.transloco.translate('duplicates.summary.avgScore'), value: scores.length ? `${Math.round(avg * 100)}%` : '—' },
                { label: this.transloco.translate('duplicates.summary.shown'), value: String(this.filteredRows().length) },
            ];
        }, ...(ngDevMode ? [{ debugName: "summaryItems" }] : /* istanbul ignore next */ []));
    }
    /** Load this space's contradictions. Called on init, on space switch, and after every action. */
    loadContradictions() {
        this.conLoading.set(true);
        this.conError.set(null);
        this.contradictionsApi.listContradictions(this.conStatusFilter, this.spaceId).subscribe({
            next: r => {
                this.conRows.set(r.contradictions);
                this.conNliConfigured.set(typeof r.nliConfigured === 'boolean' ? r.nliConfigured : null);
                this.conLoading.set(false);
            },
            // A load failure must not read as "no contradictions" — the empty state would be a lie. Surface it
            // and leave whatever was already on screen.
            error: (err) => {
                this.conError.set(httpErrorReason(err));
                this.conLoading.set(false);
                this.toast.error(this.transloco.translate('review.contradictions.loadError'));
            },
        });
    }
    dismissContradiction(c) {
        this.conBusy.set(c.id);
        this.contradictionsApi.dismissContradiction(c.id).subscribe({
            next: () => { this.conBusy.set(null); this.loadContradictions(); },
            error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
        });
    }
    reopenContradiction(c) {
        this.conBusy.set(c.id);
        this.contradictionsApi.reopenContradiction(c.id).subscribe({
            next: () => { this.conBusy.set(null); this.loadContradictions(); },
            error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
        });
    }
    resolveContradiction(c, resolution) {
        this.conBusy.set(c.id);
        this.contradictionsApi.resolveContradiction(c.id, resolution).subscribe({
            next: () => { this.conBusy.set(null); this.loadContradictions(); },
            error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
        });
    }
    keepSide(c, winner) {
        this.conBusy.set(c.id);
        this.contradictionsApi.keepSide(c.id, winner).subscribe({
            next: (r) => {
                this.conBusy.set(null);
                // The server reports when it recorded the decision WITHOUT drawing an edge — edges connect
                // entities, so a memory or chrono pair gets the judgement and no link. Surfaced rather than
                // swallowed: a reviewer who believes the graph changed when it did not will not go and fix it.
                if (r.note)
                    this.toast.info(this.transloco.translate('review.contradictions.noEdge'));
                this.loadContradictions();
            },
            error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
        });
    }
    /**
     * Show both records IN FULL, fetched on demand.
     *
     * The card carries one-line summaries, which is enough to triage most pairs and not enough to decide one:
     * picking a winner means reading both. Fetched on expand rather than with the list because a queue of
     * fifty cards would otherwise pull a hundred records nobody opened.
     */
    toggleFull(c) {
        if (this.expanded() === c.id) {
            this.expanded.set(null);
            return;
        }
        this.expanded.set(c.id);
        this.fullA.set(null);
        this.fullB.set(null);
        this.fullError.set(null);
        for (const [id, sink] of [[c.aId, this.fullA], [c.bId, this.fullB]]) {
            this.brainApi.getRecord(c.spaceId, c.type, id).subscribe({
                next: (rec) => sink.set(JSON.stringify(rec, null, 2)),
                // Named, not silent: a record that cannot be loaded is exactly the case where a reviewer must not
                // decide from the summary alone.
                error: () => this.fullError.set(this.transloco.translate('review.contradictions.fullError')),
            });
        }
    }
    /** A sample entry rendered for a human: an entity id becomes its name, everything else is already one. */
    sampleLabel(check, value) {
        if (check.scope !== 'entity' || check.id !== 'entity-without-edges')
            return value;
        return this.entityNames()[value] ?? value;
    }
    /** How much of this check's weight the space kept, as a percentage — the card's bar. */
    earnedPct(c) {
        return c.weight > 0 ? Math.round((c.earned / c.weight) * 100) : 100;
    }
    loadCompleteness() {
        if (!this.spaceId)
            return;
        this.compLoading.set(true);
        this.compError.set(false);
        const forSpace = this.spaceId;
        this.spacesApi.getCompleteness(forSpace).subscribe({
            next: r => {
                if (this.spaceId !== forSpace)
                    return; // space switched mid-flight
                this.compScore.set(r.score);
                this.compChecks.set(r.checks);
                this.compTruncated.set(r.truncated);
                this.compLoading.set(false);
                this.resolveEntitySamples(forSpace, r.checks);
            },
            // A failed load must not render as a perfect space. Surface it and show nothing else.
            error: () => { if (this.spaceId === forSpace) {
                this.compError.set(true);
                this.compLoading.set(false);
            } },
        });
    }
    /** Turn the entity-id samples into names. Best-effort: a failure leaves the ids, which still identify
     *  the records — degraded, not broken. */
    resolveEntitySamples(forSpace, checks) {
        const ids = checks.filter(c => c.id === 'entity-without-edges').flatMap(c => c.sample);
        if (!ids.length) {
            this.entityNames.set({});
            return;
        }
        this.brainApi.getEntitiesByIds(forSpace, ids).subscribe({
            next: r => {
                if (this.spaceId !== forSpace)
                    return;
                this.entityNames.set(Object.fromEntries(r.entities.map(e => [e._id, e.name])));
            },
            error: () => { if (this.spaceId === forSpace)
                this.entityNames.set({}); },
        });
    }
    /** Run the contradiction scan now. The API method existed from the start with no caller. */
    scanContradictions() {
        this.conScanning.set(true);
        this.contradictionsApi.scanContradictions(this.spaceId).subscribe({
            next: (r) => {
                this.conScanning.set(false);
                // `nliStalled` means the judge was unreachable, so the NLI pass settled nothing and its cursor is
                // parked. Silence here would leave "0 found" reading as "nothing disagrees" — the same conflation
                // the empty state used to make, one layer up.
                if (r.nliStalled)
                    this.toast.error(this.transloco.translate('review.contradictions.scanStalled'));
                this.loadContradictions();
            },
            error: (e) => {
                this.conScanning.set(false);
                this.toast.error(this.transloco.translate(e?.status === 403 ? 'duplicates.scanForbidden' : 'duplicates.scanError'));
            },
        });
    }
    /**
     * True when the server's per-space cap was reached, so the list on screen is not the whole story.
     *
     * Both list endpoints return a capped set (500 per space) with no pagination. Filtering a truncated set
     * client-side would quietly under-report while looking authoritative — the filter would imply "these are
     * all the chrono findings" when it can only mean "these are the chrono findings among the first 500".
     * Say so rather than adding pagination as a side quest.
     */
    static { this.SERVER_CAP = 500; }
    scorePct(s) { return Math.round(Math.min(Math.max(s, 0), 1) * 100); }
    scoreVariant(s) { return s >= 0.95 ? 'high' : s >= 0.85 ? 'mid' : 'low'; }
    ngOnInit() { this.load(); this.loadContradictions(); this.loadCompleteness(); }
    /** Switching space in the Brain re-points this tab rather than leaving another space's pairs on screen. */
    ngOnChanges(ch) {
        if (ch['spaceId'] && !ch['spaceId'].firstChange) {
            this.load();
            this.loadContradictions();
            this.loadCompleteness();
        }
    }
    load() {
        this.loading.set(true);
        this.error.set(false);
        this.duplicatesApi.listDuplicates(this.statusFilter, this.spaceId).subscribe({
            next: ({ duplicates }) => { this.rows.set(duplicates); this.loading.set(false); },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
    }
    scan() {
        this.scanning.set(true);
        this.duplicatesApi.scanDuplicates(this.spaceId).subscribe({
            next: () => { this.scanning.set(false); this.load(); },
            error: (e) => {
                this.scanning.set(false);
                this.toast.error(this.transloco.translate(e?.status === 403 ? 'duplicates.scanForbidden' : 'duplicates.scanError'));
            },
        });
    }
    async dismiss(d) {
        // Guarded: dismissing hides the pair from the open list, so confirm before discarding it (U8).
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('duplicates.confirmDismissTitle'),
            message: this.transloco.translate('duplicates.confirmDismiss'),
            confirmLabel: this.transloco.translate('duplicates.dismiss'),
        });
        if (!ok)
            return;
        this.busy.set(d.id);
        this.duplicatesApi.dismissDuplicate(d.id).subscribe({
            next: () => { this.rows.update(list => this.statusFilter === 'open' ? list.filter(x => x.id !== d.id) : list.map(x => x.id === d.id ? { ...x, status: 'dismissed' } : x)); this.busy.set(null); },
            error: (e) => { this.busy.set(null); this.toast.error(e?.error?.error || this.transloco.translate('duplicates.dismissError')); },
        });
    }
    async reopen(d) {
        // Re-rating is the deliberate counterpart to a sticky dismissal — no confirm needed, it only
        // moves the pair back onto the review list (nothing is destroyed).
        this.busy.set(d.id);
        this.duplicatesApi.reopenDuplicate(d.id).subscribe({
            next: () => {
                // In the dismissed view the pair no longer belongs; in the "all" view it flips back to open.
                this.rows.update(list => this.statusFilter === 'dismissed'
                    ? list.filter(x => x.id !== d.id)
                    : list.map(x => x.id === d.id ? { ...x, status: 'open' } : x));
                this.busy.set(null);
                this.toast.success(this.transloco.translate('duplicates.reRateDone'));
            },
            error: (e) => { this.busy.set(null); this.toast.error(e?.error?.error || this.transloco.translate('duplicates.reRateError')); },
        });
    }
    async merge(d) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('duplicates.confirmMergeTitle'),
            message: this.transloco.translate('duplicates.confirmMerge'),
            confirmLabel: this.transloco.translate('duplicates.mergeButton'),
        });
        if (!ok)
            return;
        this.busy.set(d.id);
        this.duplicatesApi.mergeDuplicate(d.id).subscribe({
            next: () => { this.rows.update(list => list.filter(x => x.id !== d.id)); this.busy.set(null); },
            error: (e) => { this.busy.set(null); this.toast.error(e?.error?.error || this.transloco.translate('duplicates.mergeError')); },
        });
    }
    static { this.ɵfac = function ReviewTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ReviewTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ReviewTabComponent, selectors: [["app-review-tab"]], inputs: { spaceId: "spaceId" }, outputs: { openTab: "openTab" }, features: [i0.ɵɵNgOnChangesFeature], decls: 11, vars: 8, consts: [[1, "page-title"], ["role", "tablist", 1, "tabs"], ["type", "button", "role", "tab", 1, "tab", 3, "active"], [1, "type-filter"], ["role", "tabpanel", "id", "review-panel-suggestions", "aria-labelledby", "review-tab-suggestions"], ["role", "tabpanel", "id", "review-panel-contradictions", "aria-labelledby", "review-tab-contradictions"], ["role", "tabpanel", "id", "review-panel-duplicates", "aria-labelledby", "review-tab-duplicates"], ["type", "button", "role", "tab", 1, "tab", 3, "click"], ["id", "review-type-filter", 3, "ngModelChange", "ngModel"], ["value", "all"], [3, "value"], [1, "cap-note"], [1, "intro"], [1, "loading-overlay"], [1, "alert", "alert-warning", 2, "margin-top", "16px"], [1, "spinner"], [1, "sug-score"], [1, "dup-grid"], [1, "empty-state"], [1, "sug-passing"], [1, "cap-note", 2, "margin-top", "12px"], [1, "sug-score-v"], [1, "sug-score-l"], [1, "dup-card"], [1, "dup-card-h"], [3, "variant"], [1, "dup-type"], [1, "dup-when"], [1, "sug-body"], [1, "sug-title"], [1, "sug-why"], [1, "conf"], [1, "conf-track"], [1, "conf-fill"], [1, "conf-pct"], [1, "dup-actions"], [1, "sug-samples"], [3, "title"], [1, "sug-more"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", "sug-go", 3, "click"], [1, "empty-state-icon"], ["name", "check-circle", 3, "size"], ["name", "info", 3, "size"], [3, "items"], [1, "strip-ctl"], [1, "dup-search"], ["name", "magnifying-glass", 3, "size"], ["type", "search", 3, "ngModelChange", "ngModel", "placeholder"], [3, "ngModelChange", "change", "ngModel"], ["value", "open"], ["value", "dismissed"], ["value", "resolved"], [1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [3, "message", "reason"], [3, "retry", "message", "reason"], ["name", "warning", 3, "size"], [1, "dup-card", 3, "expanded"], ["variant", "warn"], [1, "con-fields"], [1, "dup-ab"], [1, "dup-rec"], [1, "dup-rec-l"], [1, "kept-badge", 3, "win", "lose"], [1, "dup-rec-txt"], [1, "rec-full"], [1, "dup-vs"], [1, "dup-rec", "b"], [1, "superseded-note"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "disabled"], ["variant", "off"], [1, "con-key"], [1, "con-a"], [1, "con-sep"], [1, "con-b"], [1, "kept-badge"], [1, "rec-err"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], [1, "keep-group"], ["type", "button", 1, "btn", "btn-sm", "btn-ghost", 3, "click"], [1, "dup-resolved"], ["name", "arrows-clockwise", 2, "margin-right", "4px", "vertical-align", "-2px", 3, "size"], [1, "btn", "btn-sm", "btn-primary", 3, "disabled"], ["name", "x", 2, "margin-right", "4px", "vertical-align", "-2px", 3, "size"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"]], template: function ReviewTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "h2", 0);
            i0.ɵɵtext(1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(3, "nav", 1);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵrepeaterCreate(5, ReviewTabComponent_For_6_Template, 3, 8, "button", 2, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(7, ReviewTabComponent_Conditional_7_Template, 12, 12, "div", 3);
            i0.ɵɵconditionalCreate(8, ReviewTabComponent_Conditional_8_Template, 7, 4, "section", 4)(9, ReviewTabComponent_Conditional_9_Template, 33, 34, "section", 5)(10, ReviewTabComponent_Conditional_10_Template, 30, 31, "section", 6);
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 4, "review.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(4, 6, "review.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.SUBTABS);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.showTypeFilter() ? 7 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.sub() === "suggestions" ? 8 : ctx.sub() === "contradictions" ? 9 : 10);
        } }, dependencies: [FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, SummaryStripComponent, StatusPillComponent, RelativeTimeComponent, ErrorStateComponent, TranslocoPipe], styles: [".page-title[_ngcontent-%COMP%] { margin: 0 0 4px; font-size: 18px; }\n    .intro[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }\n    .strip-ctl[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n    .strip-ctl[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { font-size: 13px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); }\n    .dup-search[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-muted); }\n    .dup-search[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { border: 0; background: transparent; color: var(--text-primary); font-size: 13px; outline: none; width: 150px; }\n\n    .dup-grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; margin-top: 16px; }\n    .dup-card[_ngcontent-%COMP%] { border: 1px solid var(--border); border-radius: 10px; background: var(--bg-surface); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }\n    .dup-card-h[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }\n    .dup-type[_ngcontent-%COMP%] { color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; }\n    .dup-when[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 11px; margin-left: auto; }\n\n    .conf[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 6px; }\n    .conf-track[_ngcontent-%COMP%] { width: 54px; height: 6px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; }\n    .conf-fill[_ngcontent-%COMP%] { height: 100%; border-radius: 3px; transition: width .3s ease; }\n    .conf-fill.high[_ngcontent-%COMP%] { background: var(--accent); }\n    .conf-fill.mid[_ngcontent-%COMP%]  { background: var(--info); }\n    .conf-fill.low[_ngcontent-%COMP%]  { background: var(--text-muted); }\n    .conf-pct[_ngcontent-%COMP%] { font-size: 11px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }\n\n    .dup-ab[_ngcontent-%COMP%] { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: stretch; }\n    .dup-rec[_ngcontent-%COMP%] { border: 1px solid var(--border-muted); border-radius: 8px; padding: 8px 9px; background: var(--bg-primary); min-width: 0; }\n    .dup-rec-l[_ngcontent-%COMP%] { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }\n    .dup-rec-txt[_ngcontent-%COMP%] { font-size: 12px; white-space: pre-wrap; word-break: break-word; color: var(--text-primary); }\n    .dup-rec.b[_ngcontent-%COMP%]   .dup-rec-txt[_ngcontent-%COMP%] { color: var(--text-secondary); }\n    .dup-vs[_ngcontent-%COMP%] { display: flex; align-items: center; color: var(--text-muted); font-size: 11px; font-style: italic; }\n\n    .con-fields[_ngcontent-%COMP%] { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 4px; }\n    .con-fields[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; align-items: baseline; gap: 7px; font-size: 12px; flex-wrap: wrap; }\n    .con-key[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-muted); }\n    .con-a[_ngcontent-%COMP%], .con-b[_ngcontent-%COMP%] { font-weight: 600; color: var(--text-primary); }\n    .con-sep[_ngcontent-%COMP%] { color: var(--text-muted); font-style: italic; font-size: 11px; }\n\n    .dup-actions[_ngcontent-%COMP%] { display: flex; gap: 8px; justify-content: flex-end; align-items: center; flex-wrap: wrap; }\n    .dup-resolved[_ngcontent-%COMP%] { font-size: 12px; color: var(--success); text-align: right; }\n\n    \n\n\n    .keep-group[_ngcontent-%COMP%] { display: flex; gap: 6px; margin-right: auto; }\n    .keep-hint[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); font-style: italic; }\n    \n\n\n    \n\n\n    .dup-card.expanded[_ngcontent-%COMP%] { grid-column: 1 / -1; }\n    .rec-full[_ngcontent-%COMP%] { margin-top: 6px; border-top: 1px dashed var(--border-muted); padding-top: 6px; }\n    .rec-full[_ngcontent-%COMP%]   pre[_ngcontent-%COMP%] { margin: 0; font-size: 11px; line-height: 1.45; white-space: pre-wrap; word-break: break-word;\n      color: var(--text-secondary); font-family: var(--font-mono, monospace); max-height: 260px; overflow: auto; }\n    .rec-full[_ngcontent-%COMP%]   .rec-err[_ngcontent-%COMP%] { font-size: 11px; color: var(--danger); }\n    .superseded-note[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); }\n    .kept-badge[_ngcontent-%COMP%] { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }\n    .kept-badge.win[_ngcontent-%COMP%] { color: var(--success); }\n    .kept-badge.lose[_ngcontent-%COMP%] { color: var(--text-muted); }\n\n    \n\n    .type-filter[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 12px 0 0; font-size: 13px; }\n    .type-filter[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 12px; }\n    \n\n\n    .type-filter[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { font-size: 13px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); width: auto; min-width: 140px; flex: 0 0 auto; }\n    .cap-note[_ngcontent-%COMP%] { font-size: 11px; color: var(--warning); }\n\n    \n\n\n    .sug-score[_ngcontent-%COMP%] { display: flex; align-items: baseline; gap: 10px; margin: 16px 0 4px; }\n    .sug-score-v[_ngcontent-%COMP%] { font-size: 26px; font-weight: 700; font-family: var(--font-mono, monospace);\n      font-variant-numeric: tabular-nums; line-height: 1; }\n    .sug-score-v.good[_ngcontent-%COMP%] { color: var(--success); } .sug-score-v.mid[_ngcontent-%COMP%] { color: var(--warning); } .sug-score-v.bad[_ngcontent-%COMP%] { color: var(--error); }\n    .sug-score-l[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-secondary); }\n    .sug-body[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 7px; }\n    .sug-title[_ngcontent-%COMP%] { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }\n    .sug-why[_ngcontent-%COMP%] { font-size: 12px; color: var(--text-secondary); line-height: 1.45; }\n    .sug-samples[_ngcontent-%COMP%] { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 5px; }\n    .sug-samples[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 7px;\n      border-radius: 999px; background: var(--bg-elevated); border: 1px solid var(--border-muted);\n      color: var(--text-primary); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .sug-more[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); }\n    .sug-passing[_ngcontent-%COMP%] { margin-top: 18px; font-size: 12.5px; color: var(--text-secondary); }\n    .sug-passing[_ngcontent-%COMP%]   summary[_ngcontent-%COMP%] { cursor: pointer; }\n    .sug-passing[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] { list-style: none; margin: 9px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }\n    .sug-passing[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 7px; }\n    .sug-passing[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { color: var(--success); flex: none; margin-top: 2px; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ReviewTabComponent, [{
        type: Component,
        args: [{ selector: 'app-review-tab', standalone: true, imports: [FormsModule, PhIconComponent, TranslocoPipe, SummaryStripComponent, StatusPillComponent, RelativeTimeComponent, ErrorStateComponent], template: `
    <h2 class="page-title">{{ 'review.title' | transloco }}</h2>

    <!-- Sub-tabs, not a compact toggle: this is the space's record-QA queue and it will grow past two
         views (contradictions now, orphans / schema violations later). A full tab strip keeps them all
         discoverable and reuses the same affordance as every other tab in the app, rather than hiding
         the second view behind a control people have to notice. -->
    <nav class="tabs" role="tablist" [attr.aria-label]="'review.title' | transloco">
      @for (t of SUBTABS; track t) {
        <button class="tab" type="button" role="tab" [class.active]="sub() === t"
          [attr.aria-selected]="sub() === t" [attr.id]="'review-tab-' + t"
          [attr.aria-controls]="'review-panel-' + t" (click)="sub.set(t)">
          {{ 'review.sub.' + t | transloco }}
        </button>
      }
    </nav>

    <!-- Record-TYPE filter, shared by both sub-tabs. The tabs are kinds of finding; this is the record
         type. Keeping them as separate axes is what avoids a duplicates×type / contradictions×type matrix.
         Only shown when the loaded rows actually span more than one type — a control with one real choice
         is noise. -->
    @if (showTypeFilter()) {
      <div class="type-filter">
        <label [attr.for]="'review-type-filter'">{{ 'review.typeFilter.label' | transloco }}</label>
        <select id="review-type-filter" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)"
          [attr.aria-label]="'review.typeFilter.label' | transloco">
          <option value="all">{{ 'review.typeFilter.all' | transloco }}</option>
          @for (t of typeOptions(); track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
        <!-- The lists are capped server-side with no pagination, so a filter over them can only ever mean
             "…among the first 500". Saying so beats letting the filter imply completeness. -->
        @if (listCapped()) {
          <span class="cap-note">{{ 'review.typeFilter.capped' | transloco }}</span>
        }
      </div>
    }

    @if (sub() === 'suggestions') {
      <section role="tabpanel" id="review-panel-suggestions" aria-labelledby="review-tab-suggestions">
        <p class="intro">{{ 'review.suggestions.intro' | transloco }}</p>

        @if (compLoading()) {
          <div class="loading-overlay"><span class="spinner"></span></div>
        } @else if (compError()) {
          <!-- Never render a failed load as a clean space: "nothing to fix" and "we could not look" are
               opposite answers and must not share a screen. -->
          <div class="alert alert-warning" style="margin-top:16px;">{{ 'review.suggestions.loadError' | transloco }}</div>
        } @else {
          @if (compScore(); as score) {
            <div class="sug-score">
              <span class="sug-score-v" [class.good]="score >= 85" [class.mid]="score >= 60 && score < 85" [class.bad]="score < 60">{{ score }}%</span>
              <span class="sug-score-l">{{ 'review.suggestions.scoreLabel' | transloco: { count: compChecks().length } }}</span>
            </div>
          }

          @if (failingChecks().length) {
            <div class="dup-grid">
              @for (c of failingChecks(); track c.id + c.scope) {
                <div class="dup-card">
                  <div class="dup-card-h">
                    <app-status-pill [variant]="c.severity === 'warn' ? 'warn' : 'off'">{{ 'review.suggestions.severity.' + c.severity | transloco }}</app-status-pill>
                    <span class="dup-type">{{ 'brain.overview.comp.scope.' + c.scope | transloco }}</span>
                    <span class="dup-when">{{ 'review.suggestions.pointsLost' | transloco: { lost: (c.weight - c.earned).toFixed(1), weight: c.weight } }}</span>
                  </div>

                  <div class="sug-body">
                    <div class="sug-title">{{ 'brain.overview.comp.check.' + c.id | transloco: { affected: c.affected, total: c.total, scope: ('brain.overview.comp.scope.' + c.scope | transloco) } }}</div>
                    <div class="sug-why">{{ 'review.suggestions.why.' + c.id | transloco }}</div>
                    <div class="conf">
                      <span class="conf-track"><span class="conf-fill" [class]="scoreVariant(c.earned / c.weight)" [style.width.%]="earnedPct(c)"></span></span>
                      <span class="conf-pct">{{ earnedPct(c) }}%</span>
                    </div>

                    @if (c.sample.length) {
                      <ul class="sug-samples">
                        @for (s of c.sample; track s) {
                          <li [title]="s">{{ sampleLabel(c, s) }}</li>
                        }
                      </ul>
                      @if (c.affected > c.sample.length) {
                        <!-- The sample is capped server-side. Say so rather than letting five entries
                             read as the whole finding. -->
                        <div class="sug-more">{{ 'review.suggestions.andMore' | transloco: { more: c.affected - c.sample.length } }}</div>
                      }
                    }
                  </div>

                  @if (c.targetTab; as tab) {
                    <div class="dup-actions">
                      <button class="btn btn-sm btn-secondary sug-go" type="button" (click)="openTab.emit(tab)">
                        {{ 'review.suggestions.open' | transloco: { tab: ('brain.tab.' + tab | transloco) } }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          } @else if (compChecks().length) {
            <div class="empty-state">
              <div class="empty-state-icon"><ph-icon name="check-circle" [size]="48"/></div>
              <h3>{{ 'review.suggestions.clean.title' | transloco }}</h3>
              <p>{{ 'review.suggestions.clean.body' | transloco }}</p>
            </div>
          } @else {
            <!-- No check applied at all. Not a perfect space — an unmeasurable one. -->
            <div class="empty-state">
              <div class="empty-state-icon"><ph-icon name="info" [size]="48"/></div>
              <h3>{{ 'review.suggestions.none.title' | transloco }}</h3>
              <p>{{ 'review.suggestions.none.body' | transloco }}</p>
            </div>
          }

          @if (passingChecks().length) {
            <details class="sug-passing">
              <summary>{{ 'review.suggestions.passing' | transloco: { count: passingChecks().length } }}</summary>
              <ul>
                @for (c of passingChecks(); track c.id + c.scope) {
                  <li><ph-icon name="check-circle" [size]="13"/>{{ 'brain.overview.comp.check.' + c.id | transloco: { affected: c.affected, total: c.total, scope: ('brain.overview.comp.scope.' + c.scope | transloco) } }}</li>
                }
              </ul>
            </details>
          }

          @if (compTruncated()) {
            <div class="cap-note" style="margin-top:12px;">{{ 'brain.overview.comp.truncated' | transloco }}</div>
          }
        }
      </section>
    } @else if (sub() === 'contradictions') {
      <section role="tabpanel" id="review-panel-contradictions" aria-labelledby="review-tab-contradictions">
        <p class="intro">{{ 'review.contradictions.intro' | transloco }}</p>

        <!-- Its own strip rather than one lifted above the tabs: the search box IS shared (same signal as
             Duplicates), but the status piles are not the same set — contradictions have a resolved pile
             and duplicates do not — so a single control would have to offer an option meaning nothing on
             one side. Sharing it would be a worse lie than repeating fifteen lines of markup. -->
        <app-summary-strip [items]="conSummaryItems()">
          <div class="strip-ctl">
            <label class="dup-search">
              <ph-icon name="magnifying-glass" [size]="14"/>
              <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)"
                [placeholder]="'duplicates.searchPlaceholder' | transloco"
                [attr.aria-label]="'duplicates.searchPlaceholder' | transloco" />
            </label>
            <select [(ngModel)]="conStatusFilter" (change)="loadContradictions()"
              [attr.aria-label]="'duplicates.statusFilterAria' | transloco">
              <option value="open">{{ 'duplicates.status.open' | transloco }}</option>
              <option value="dismissed">{{ 'duplicates.status.dismissed' | transloco }}</option>
              <option value="resolved">{{ 'duplicates.status.resolved' | transloco }}</option>
              <option value="all">{{ 'duplicates.status.all' | transloco }}</option>
            </select>
            <button class="btn btn-sm btn-secondary" (click)="scanContradictions()" [disabled]="conScanning()">
              @if (conScanning()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
              {{ 'duplicates.scanNow' | transloco }}
            </button>
          </div>
        </app-summary-strip>

        @if (conLoading()) {
          <div class="loading-overlay"><span class="spinner"></span></div>
        } @else if (conError() !== null) {
          <app-error-state [message]="'review.contradictions.loadError' | transloco" [reason]="conError() ?? ''"
                           (retry)="loadContradictions()" />
        } @else if (conFilteredRows().length === 0) {
          <div class="empty-state">
            <div class="empty-state-icon"><ph-icon name="warning" [size]="48"/></div>
            <!-- Four different reasons for an empty list, and they used to share one message which
                 asserted the most alarming of them. Narrowest cause first. -->
            @if (query().trim() && conRows().length) {
              <h3>{{ 'duplicates.noMatches.title' | transloco }}</h3>
              <p>{{ 'duplicates.noMatches.body' | transloco }}</p>
            } @else if (typeFilter() !== 'all' && conRows().length) {
              <!-- Distinct from "nothing to review": the queue is not empty, this filter is. -->
              <h3>{{ 'review.typeFilter.noneOfType' | transloco }}</h3>
              <p>{{ 'review.typeFilter.noneOfTypeBody' | transloco }}</p>
            } @else if (conStatusFilter !== 'open') {
              <!-- An empty dismissed or resolved pile is not a finding about the space at all. -->
              <h3>{{ 'review.contradictions.noneWithStatus' | transloco }}</h3>
              <p>{{ 'review.contradictions.noneWithStatusBody' | transloco }}</p>
            } @else if (conNliConfigured() === false) {
              <!-- No judge configured — so say what that costs and what still runs, rather than "detection
                   is not running". The deterministic pass runs with no model at all. -->
              <h3>{{ 'review.contradictions.structuredOnlyTitle' | transloco }}</h3>
              <p>{{ 'review.contradictions.structuredOnlyBody' | transloco }}</p>
            } @else {
              <!-- Nothing found. The body states only that; the extra line claiming BOTH passes ran is
                   added only when the server actually said so, never on an unknown. -->
              <h3>{{ 'review.contradictions.cleanTitle' | transloco }}</h3>
              <p>{{ 'review.contradictions.cleanBody' | transloco }}</p>
              @if (conNliConfigured() === true) {
                <p>{{ 'review.contradictions.judgeRan' | transloco }}</p>
              }
            }
          </div>
        } @else {
          <div class="dup-grid">
            @for (c of conFilteredRows(); track c.id) {
              <div class="dup-card" [class.expanded]="expanded() === c.id">
                <div class="dup-card-h">
                  <span class="dup-type">{{ c.type }}</span>
                  <!-- The basis, never a bare number: a deterministic field conflict and a model's opinion
                       are different kinds of claim, and a reviewer needs to tell them apart at a glance. -->
                  @if (c.basis === 'structured-field') {
                    <app-status-pill variant="warn">{{ 'review.contradictions.basis.structured' | transloco }}</app-status-pill>
                  } @else {
                    <app-status-pill variant="off">{{ 'review.contradictions.basis.nli' | transloco }}</app-status-pill>
                    <span class="conf" [attr.title]="'review.contradictions.confidence' | transloco">
                      <span class="conf-track"><span class="conf-fill" [class]="scoreVariant(c.confidence)" [style.width.%]="scorePct(c.confidence)"></span></span>
                      <span class="conf-pct">{{ scorePct(c.confidence) }}%</span>
                    </span>
                  }
                  @if (c.status !== 'open') {
                    <app-status-pill [variant]="c.status === 'resolved' ? 'ok' : 'off'">{{ ('duplicates.status.' + c.status) | transloco }}</app-status-pill>
                  }
                  <span class="dup-when"><app-relative-time [value]="c.detectedAt"/></span>
                </div>

                <!-- A structured verdict can NAME the disagreement; say what it is rather than asserting one. -->
                @if (c.fields?.length) {
                  <ul class="con-fields">
                    @for (f of c.fields; track f.key) {
                      <li><span class="con-key">{{ f.key }}</span>
                        <span class="con-a">{{ f.aValue }}</span>
                        <span class="con-sep">{{ 'review.contradictions.versus' | transloco }}</span>
                        <span class="con-b">{{ f.bValue }}</span></li>
                    }
                  </ul>
                }

                <div class="dup-ab">
                  <div class="dup-rec">
                    <div class="dup-rec-l">
                      {{ 'duplicates.table.recordA' | transloco }}
                      <!-- On a settled pair, say which side won where the reviewer is already looking. -->
                      @if (c.supersededId) {
                        <span class="kept-badge" [class.win]="c.supersededId !== c.aId" [class.lose]="c.supersededId === c.aId">
                          {{ (c.supersededId === c.aId ? 'review.contradictions.superseded' : 'review.contradictions.kept') | transloco }}
                        </span>
                      }
                    </div>
                    <div class="dup-rec-txt">{{ c.aSummary }}</div>
                    @if (expanded() === c.id) {
                      <div class="rec-full">
                        @if (fullA(); as full) { <pre>{{ full }}</pre> } @else { <span class="rec-err">{{ fullError() ?? ('common.loading' | transloco) }}</span> }
                      </div>
                    }
                  </div>
                  <div class="dup-vs">{{ 'review.contradictions.versus' | transloco }}</div>
                  <div class="dup-rec b">
                    <div class="dup-rec-l">
                      {{ 'duplicates.table.recordB' | transloco }}
                      @if (c.supersededId) {
                        <span class="kept-badge" [class.win]="c.supersededId !== c.bId" [class.lose]="c.supersededId === c.bId">
                          {{ (c.supersededId === c.bId ? 'review.contradictions.superseded' : 'review.contradictions.kept') | transloco }}
                        </span>
                      }
                    </div>
                    <div class="dup-rec-txt">{{ c.bSummary }}</div>
                    @if (expanded() === c.id) {
                      <div class="rec-full">
                        @if (fullB(); as full) { <pre>{{ full }}</pre> } @else { <span class="rec-err">{{ fullError() ?? ('common.loading' | transloco) }}</span> }
                      </div>
                    }
                  </div>
                </div>

                @if (c.resolution === 'superseded' && c.resolvedBy) {
                  <div class="superseded-note">{{ 'review.contradictions.decidedBy' | transloco: { who: c.resolvedBy } }}</div>
                }

                <div class="dup-actions">
                  @if (c.status === 'dismissed') {
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="reopenContradiction(c)">
                      {{ 'duplicates.reRate' | transloco }}
                    </button>
                  } @else if (c.status === 'open') {
                    <!-- Keep A / Keep B — the decision a reviewer actually makes about two disagreeing
                         records, which neither "resolved by edit" (nothing was corrected) nor "link as
                         contradiction" (they drew an edge by hand) could express. NOTHING is deleted: the
                         loser stays, marked as overtaken, which is why these are not destructive buttons.
                         NO BACKTICKS in this template — one kills the whole string and the error points at
                         the @Component decorator. -->
                    <div class="keep-group">
                      <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="keepSide(c, 'a')">
                        {{ 'review.contradictions.action.keepA' | transloco }}
                      </button>
                      <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="keepSide(c, 'b')">
                        {{ 'review.contradictions.action.keepB' | transloco }}
                      </button>
                      <button class="btn btn-sm btn-ghost" type="button" (click)="toggleFull(c)"
                              [attr.aria-expanded]="expanded() === c.id">
                        {{ (expanded() === c.id ? 'review.contradictions.action.hideFull' : 'review.contradictions.action.showFull') | transloco }}
                      </button>
                    </div>
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="dismissContradiction(c)">
                      {{ 'duplicates.dismiss' | transloco }}
                    </button>
                    <!-- Contradictions are never merged: both records are real and which is wrong is a
                         judgement call, so the reviewer records HOW they settled it. -->
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="resolveContradiction(c, 'edited')">
                      {{ 'review.contradictions.action.edited' | transloco }}
                    </button>
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="resolveContradiction(c, 'linked')">
                      {{ 'review.contradictions.action.linked' | transloco }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>
    } @else {
    <section role="tabpanel" id="review-panel-duplicates" aria-labelledby="review-tab-duplicates">
    <p class="intro">{{ 'duplicates.intro' | transloco }}</p>

    <app-summary-strip [items]="summaryItems()">
      <div class="strip-ctl">
        <label class="dup-search">
          <ph-icon name="magnifying-glass" [size]="14"/>
          <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)"
            [placeholder]="'duplicates.searchPlaceholder' | transloco"
            [attr.aria-label]="'duplicates.searchPlaceholder' | transloco" />
        </label>
        <select [(ngModel)]="statusFilter" (change)="load()" [attr.aria-label]="'duplicates.statusFilterAria' | transloco">
          <option value="open">{{ 'duplicates.status.open' | transloco }}</option>
          <option value="dismissed">{{ 'duplicates.status.dismissed' | transloco }}</option>
          <option value="all">{{ 'duplicates.status.all' | transloco }}</option>
        </select>
        <button class="btn btn-sm btn-secondary" (click)="scan()" [disabled]="scanning()">
          @if (scanning()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
          {{ 'duplicates.scanNow' | transloco }}
        </button>
      </div>
    </app-summary-strip>

    @if (loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (error()) {
      <div class="alert alert-warning" style="margin-top:16px;">{{ 'duplicates.loadError' | transloco }}</div>
    } @else if (filteredRows().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="check-circle" [size]="48"/></div>
        @if (query().trim() && rows().length) {
          <h3>{{ 'duplicates.noMatches.title' | transloco }}</h3>
          <p>{{ 'duplicates.noMatches.body' | transloco }}</p>
        } @else if (typeFilter() !== 'all' && rows().length) {
          <!-- The queue is not empty, this filter is — a distinction "nothing to review" would hide. -->
          <h3>{{ 'review.typeFilter.noneOfType' | transloco }}</h3>
          <p>{{ 'review.typeFilter.noneOfTypeBody' | transloco }}</p>
        } @else {
          <h3>{{ 'duplicates.empty.title' | transloco }}</h3>
          <p>{{ 'duplicates.empty.body' | transloco }}</p>
        }
      </div>
    } @else {
      <div class="dup-grid">
        @for (d of filteredRows(); track d.id) {
          <div class="dup-card">
            <div class="dup-card-h">
              <span class="dup-type">{{ d.type }}</span>
              <span class="conf" [attr.title]="'duplicates.confidence' | transloco">
                <span class="conf-track"><span class="conf-fill" [class]="scoreVariant(d.score)" [style.width.%]="scorePct(d.score)"></span></span>
                <span class="conf-pct">{{ scorePct(d.score) }}%</span>
              </span>
              @if (d.status !== 'open') {
                <app-status-pill [variant]="d.status === 'resolved' ? 'ok' : 'off'">{{ ('duplicates.status.' + d.status) | transloco }}</app-status-pill>
              }
              <span class="dup-when"><app-relative-time [value]="d.detectedAt"/></span>
            </div>

            <div class="dup-ab">
              <div class="dup-rec">
                <div class="dup-rec-l">{{ 'duplicates.table.recordA' | transloco }}</div>
                <div class="dup-rec-txt">{{ d.aSummary }}</div>
              </div>
              <div class="dup-vs">{{ 'duplicates.vs' | transloco }}</div>
              <div class="dup-rec b">
                <div class="dup-rec-l">{{ 'duplicates.table.recordB' | transloco }}</div>
                <div class="dup-rec-txt">{{ d.bSummary }}</div>
              </div>
            </div>

            @if (d.status === 'resolved') {
              @if (d.resolution) {
                <div class="dup-resolved">{{ ('duplicates.resolution.' + d.resolution) | transloco }}</div>
              }
            } @else if (d.status === 'dismissed') {
              <!-- A dismissed pair resurfaces on its own only if its content materially changes; this is
                   the manual way to bring it back for review sooner. -->
              <div class="dup-actions">
                <button class="btn btn-sm btn-secondary" (click)="reopen(d)" [disabled]="busy() === d.id">
                  <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:4px;vertical-align:-2px;"/>{{ 'duplicates.reRate' | transloco }}
                </button>
              </div>
            } @else {
              <div class="dup-actions">
                @if (d.type === 'entity') {
                  <button class="btn btn-sm btn-primary" (click)="merge(d)" [disabled]="busy() === d.id">{{ 'duplicates.merge' | transloco }}</button>
                }
                <button class="btn btn-sm btn-secondary" (click)="dismiss(d)" [disabled]="busy() === d.id">
                  <ph-icon name="x" [size]="14" style="margin-right:4px;vertical-align:-2px;"/>{{ 'duplicates.dismiss' | transloco }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    }
    </section>
    }
  `, styles: ["\n    .page-title { margin: 0 0 4px; font-size: 18px; }\n    .intro { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }\n    .strip-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n    .strip-ctl select { font-size: 13px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); }\n    .dup-search { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-muted); }\n    .dup-search input { border: 0; background: transparent; color: var(--text-primary); font-size: 13px; outline: none; width: 150px; }\n\n    .dup-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; margin-top: 16px; }\n    .dup-card { border: 1px solid var(--border); border-radius: 10px; background: var(--bg-surface); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }\n    .dup-card-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }\n    .dup-type { color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; }\n    .dup-when { color: var(--text-muted); font-size: 11px; margin-left: auto; }\n\n    .conf { display: inline-flex; align-items: center; gap: 6px; }\n    .conf-track { width: 54px; height: 6px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; }\n    .conf-fill { height: 100%; border-radius: 3px; transition: width .3s ease; }\n    .conf-fill.high { background: var(--accent); }\n    .conf-fill.mid  { background: var(--info); }\n    .conf-fill.low  { background: var(--text-muted); }\n    .conf-pct { font-size: 11px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }\n\n    .dup-ab { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: stretch; }\n    .dup-rec { border: 1px solid var(--border-muted); border-radius: 8px; padding: 8px 9px; background: var(--bg-primary); min-width: 0; }\n    .dup-rec-l { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }\n    .dup-rec-txt { font-size: 12px; white-space: pre-wrap; word-break: break-word; color: var(--text-primary); }\n    .dup-rec.b .dup-rec-txt { color: var(--text-secondary); }\n    .dup-vs { display: flex; align-items: center; color: var(--text-muted); font-size: 11px; font-style: italic; }\n\n    .con-fields { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 4px; }\n    .con-fields li { display: flex; align-items: baseline; gap: 7px; font-size: 12px; flex-wrap: wrap; }\n    .con-key { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-muted); }\n    .con-a, .con-b { font-weight: 600; color: var(--text-primary); }\n    .con-sep { color: var(--text-muted); font-style: italic; font-size: 11px; }\n\n    .dup-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; flex-wrap: wrap; }\n    .dup-resolved { font-size: 12px; color: var(--success); text-align: right; }\n\n    /* Keep A / Keep B. Deliberately NOT btn-danger: nothing is deleted \u2014 the loser stays, marked as\n       overtaken \u2014 so a destructive colour would misdescribe the action. */\n    .keep-group { display: flex; gap: 6px; margin-right: auto; }\n    .keep-hint { font-size: 11px; color: var(--text-muted); font-style: italic; }\n    /* The full records, expanded on demand. Collapsed by default because the summary is enough to triage\n       most pairs, and a wall of two full records per card is what stops a queue being read at all. */\n    /* An expanded card takes the whole row. Two full records inside a 340px grid cell wrap into a column of\n       three-word lines, which is technically \"in full\" and unreadable in practice. */\n    .dup-card.expanded { grid-column: 1 / -1; }\n    .rec-full { margin-top: 6px; border-top: 1px dashed var(--border-muted); padding-top: 6px; }\n    .rec-full pre { margin: 0; font-size: 11px; line-height: 1.45; white-space: pre-wrap; word-break: break-word;\n      color: var(--text-secondary); font-family: var(--font-mono, monospace); max-height: 260px; overflow: auto; }\n    .rec-full .rec-err { font-size: 11px; color: var(--danger); }\n    .superseded-note { font-size: 11px; color: var(--text-muted); }\n    .kept-badge { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }\n    .kept-badge.win { color: var(--success); }\n    .kept-badge.lose { color: var(--text-muted); }\n\n    /* Record-type filter \u2014 sits under the sub-tabs because it applies to whichever one is open. */\n    .type-filter { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 12px 0 0; font-size: 13px; }\n    .type-filter label { color: var(--text-muted); font-size: 12px; }\n    /* width/flex are explicit: a global full-width rule on select otherwise stretches this across the\n       whole page and pushes the label onto its own line. */\n    .type-filter select { font-size: 13px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); width: auto; min-width: 140px; flex: 0 0 auto; }\n    .cap-note { font-size: 11px; color: var(--warning); }\n\n    /* Suggestions. Reuses .dup-card wholesale \u2014 a finding is a finding, and a second card language\n       would make the same queue look like two products. */\n    .sug-score { display: flex; align-items: baseline; gap: 10px; margin: 16px 0 4px; }\n    .sug-score-v { font-size: 26px; font-weight: 700; font-family: var(--font-mono, monospace);\n      font-variant-numeric: tabular-nums; line-height: 1; }\n    .sug-score-v.good { color: var(--success); } .sug-score-v.mid { color: var(--warning); } .sug-score-v.bad { color: var(--error); }\n    .sug-score-l { font-size: 12.5px; color: var(--text-secondary); }\n    .sug-body { display: flex; flex-direction: column; gap: 7px; }\n    .sug-title { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }\n    .sug-why { font-size: 12px; color: var(--text-secondary); line-height: 1.45; }\n    .sug-samples { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 5px; }\n    .sug-samples li { font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 7px;\n      border-radius: 999px; background: var(--bg-elevated); border: 1px solid var(--border-muted);\n      color: var(--text-primary); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .sug-more { font-size: 11px; color: var(--text-muted); }\n    .sug-passing { margin-top: 18px; font-size: 12.5px; color: var(--text-secondary); }\n    .sug-passing summary { cursor: pointer; }\n    .sug-passing ul { list-style: none; margin: 9px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }\n    .sug-passing li { display: flex; align-items: flex-start; gap: 7px; }\n    .sug-passing ph-icon { color: var(--success); flex: none; margin-top: 2px; }\n  "] }]
    }], null, { openTab: [{
            type: Output
        }], spaceId: [{
            type: Input,
            args: [{ required: true }]
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ReviewTabComponent, { className: "ReviewTabComponent", filePath: "app/pages/brain/review-tab.component.ts", lineNumber: 523 }); })();
