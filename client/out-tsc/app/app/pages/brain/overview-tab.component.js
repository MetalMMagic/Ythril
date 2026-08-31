/**
 * Brain → Overview tab (F9, slice 1).
 *
 * The space's landing view: a governance/health dashboard assembled over data the Brain shell already
 * holds, so it adds almost no fetch of its own. Presentational by design — `space` and `stats` come in as
 * inputs (the shell preloads them for every space), and the one action, Reindex, is emitted back to the
 * shell's existing reindex flow behind a confirm.
 *
 * Panels so far: Statistics, Indexing, Embedding queue (per-space media-job counts), Governance (open
 * votes across the space's networks), Networks (F8's `networks`/`networkStatus`) and Instance
 * (`/api/about`). Every input is preloaded by the shell.
 *
 * ONE EXCEPTION, added with the data-model panel: that panel asks for its own ER model. A full derivation is
 * too expensive to put on the shell's critical path for a space nobody opens this panel on, so it fetches
 * lazily and owns its own loading, empty and FAILED states. The claim above was 'this component still
 * fetches nothing itself' until 2026-08-08; it is corrected rather than left to be discovered.
 * The token-access panel is a later slice (admin-gating).
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SkeletonLinesComponent } from '../../shared/skeleton-lines.component';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
// Aliased: the class members below carry the same names, and a bare call that resolves to the import
// rather than the member is the kind of line a reader has to stop and check.
import { retentionSummary as summariseRetention, retentionTypeOverrides as retentionOverridesOf } from './overview-retention';
import { ErModelPanelComponent } from './er-model-panel.component';
import * as i0 from "@angular/core";
const _c0 = a0 => ({ count: a0 });
const _c1 = (a0, a1, a2) => ({ affected: a0, total: a1, scope: a2 });
const _c2 = (a0, a1) => ({ shown: a0, total: a1 });
const _c3 = a0 => ({ date: a0 });
const _forTrack0 = ($index, $item) => $item.id + $item.scope;
const _forTrack1 = ($index, $item) => $item.key;
const _forTrack2 = ($index, $item) => $item.reason;
const _forTrack3 = ($index, $item) => $item.path;
const _forTrack4 = ($index, $item) => $item.id;
const _forTrack5 = ($index, $item) => $item.name;
function OverviewTabComponent_Conditional_25_Conditional_0_Conditional_36_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    const act_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtextInterpolate2(" \u00B7 ", i0.ɵɵpipeBind1(1, 2, "brain.overview.useTopScore"), " ", act_r1.meanTopScore, " ");
} }
function OverviewTabComponent_Conditional_25_Conditional_0_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 12)(2, "span", 13);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 14);
    i0.ɵɵtext(6);
    i0.ɵɵconditionalCreate(7, OverviewTabComponent_Conditional_25_Conditional_0_Conditional_36_Conditional_7_Template, 2, 4);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 16);
    i0.ɵɵelement(9, "span");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const rate_r2 = ctx;
    const act_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 10, "brain.overview.useAnswerRate"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2("", act_r1.answered, " / ", act_r1.recall);
    i0.ɵɵadvance();
    i0.ɵɵconditional(act_r1.meanTopScore !== null ? 7 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵstyleProp("width", rate_r2, "%");
    i0.ɵɵclassProp("warn", rate_r2 < 50 && rate_r2 >= 20)("err", rate_r2 < 20);
} }
function OverviewTabComponent_Conditional_25_Conditional_0_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 38)(1, "span", 13);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 14);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const act_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 3, "brain.overview.useSlow"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2("", act_r1.over1s, " \u00B7 max ", act_r1.maxMs, " ms");
} }
function OverviewTabComponent_Conditional_25_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 29)(1, "div", 30)(2, "div", 31);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 32);
    i0.ɵɵelement(5, "ph-icon", 33);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 30)(9, "div", 31);
    i0.ɵɵtext(10);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "div", 32);
    i0.ɵɵelement(12, "ph-icon", 34);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "div", 30)(16, "div", 31);
    i0.ɵɵtext(17);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "div", 32);
    i0.ɵɵelement(19, "ph-icon", 35);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(22, "div", 30)(23, "div", 31);
    i0.ɵɵtext(24);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(25, "div", 32);
    i0.ɵɵelement(26, "ph-icon", 36);
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(29, "div", 30)(30, "div", 31);
    i0.ɵɵtext(31);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(32, "div", 32);
    i0.ɵɵelement(33, "ph-icon", 37);
    i0.ɵɵtext(34);
    i0.ɵɵpipe(35, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(36, OverviewTabComponent_Conditional_25_Conditional_0_Conditional_36_Template, 10, 12, "div", 11);
    i0.ɵɵconditionalCreate(37, OverviewTabComponent_Conditional_25_Conditional_0_Conditional_37_Template, 6, 5, "div", 38);
} if (rf & 2) {
    let tmp_19_0;
    const act_r1 = i0.ɵɵnextContext();
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(act_r1.calls);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 19, "brain.overview.useCalls"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(act_r1.recall);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 21, "brain.overview.useRecall"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("total", ctx_r2.answerRate() !== null);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r2.answerRate() === null ? "\u2014" : ctx_r2.answerRate() + "%");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 23, "brain.overview.useAnswered"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(act_r1.writes);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 25, "brain.overview.useWrites"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(act_r1.meanMs === null ? "\u2014" : act_r1.meanMs + " ms");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(35, 27, "brain.overview.useMean"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_19_0 = ctx_r2.answerRate()) ? 36 : -1, tmp_19_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional(act_r1.over1s > 0 ? 37 : -1);
} }
function OverviewTabComponent_Conditional_25_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 28);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.useNone"));
} }
function OverviewTabComponent_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, OverviewTabComponent_Conditional_25_Conditional_0_Template, 38, 29)(1, OverviewTabComponent_Conditional_25_Conditional_1_Template, 3, 3, "span", 28);
} if (rf & 2) {
    i0.ɵɵconditional(ctx.calls > 0 ? 0 : 1);
} }
function OverviewTabComponent_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-skeleton-lines", 10);
} if (rf & 2) {
    i0.ɵɵproperty("rows", 4);
} }
function OverviewTabComponent_Conditional_27_Conditional_0_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 41);
} }
function OverviewTabComponent_Conditional_27_Conditional_0_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 42);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r2.usageResetResult());
} }
function OverviewTabComponent_Conditional_27_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 39)(1, "button", 40);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function OverviewTabComponent_Conditional_27_Conditional_0_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r4); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.requestUsageReset()); });
    i0.ɵɵconditionalCreate(3, OverviewTabComponent_Conditional_27_Conditional_0_Conditional_3_Template, 1, 0, "span", 41);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, OverviewTabComponent_Conditional_27_Conditional_0_Conditional_6_Template, 2, 1, "span", 42);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r2.resettingUsage());
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(2, 5, "brain.overview.useResetHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.resettingUsage() ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(5, 7, "brain.overview.useReset"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.usageResetResult() ? 6 : -1);
} }
function OverviewTabComponent_Conditional_27_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, OverviewTabComponent_Conditional_27_Conditional_0_Template, 7, 9, "div", 39);
} if (rf & 2) {
    i0.ɵɵconditional(ctx.calls > 0 ? 0 : -1);
} }
function OverviewTabComponent_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate3("", ctx_r2.usageIsFloor() ? "\u2265 " : "", "", ctx_r2.used(), " / ", ctx_r2.space().maxGiB, " GiB");
} }
function OverviewTabComponent_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 14);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate3("", ctx_r2.usageIsFloor() ? "\u2265 " : "", "", ctx_r2.used(), " GiB \u00B7 ", i0.ɵɵpipeBind1(2, 3, "brain.overview.storageUnlimited"));
} }
function OverviewTabComponent_Conditional_35_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵelement(1, "ph-icon", 43);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵproperty("title", ctx_r2.usageIncompleteReason());
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 3, "brain.overview.storageIncomplete"), " ");
} }
function OverviewTabComponent_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16);
    i0.ɵɵelement(1, "span");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const pct_r5 = ctx;
    i0.ɵɵadvance();
    i0.ɵɵstyleProp("width", pct_r5, "%");
    i0.ɵɵclassProp("warn", pct_r5 >= 80 && pct_r5 < 95)("err", pct_r5 >= 95);
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 53);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r6 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("title", c_r6.sample.join(", "));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(c_r6.sample.join(", "));
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 55);
    i0.ɵɵlistener("click", function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Conditional_8_Template_button_click_0_listener() { const tab_r8 = i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(5); return i0.ɵɵresetView(ctx_r2.openTab.emit(tab_r8)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.comp.go"));
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li");
    i0.ɵɵelement(1, "ph-icon", 50);
    i0.ɵɵelementStart(2, "span", 51)(3, "span", 52);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(7, OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Conditional_7_Template, 2, 2, "span", 53);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(8, OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Conditional_8_Template, 3, 3, "button", 54);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_20_0;
    const c_r6 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵclassProp("warn-ic", c_r6.severity === "warn")("info-ic", c_r6.severity !== "warn");
    i0.ɵɵproperty("name", c_r6.severity === "warn" ? "warning" : "info")("size", 14);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(6, 11, "brain.overview.comp.check." + c_r6.id, i0.ɵɵpureFunction3(14, _c1, c_r6.affected, c_r6.total, i0.ɵɵpipeBind1(5, 9, "brain.overview.comp.scope." + c_r6.scope))));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(c_r6.sample.length ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_20_0 = c_r6.targetTab) ? 8 : -1, tmp_20_0);
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 47);
    i0.ɵɵrepeaterCreate(1, OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_For_2_Template, 9, 18, "li", null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.deductions());
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 48);
    i0.ɵɵelement(1, "ph-icon", 35);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "brain.overview.comp.clear"));
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 49);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.comp.truncated"));
} }
function OverviewTabComponent_Conditional_37_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 35);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9)(12, "div", 44)(13, "span", 45);
    i0.ɵɵtext(14);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "span", 46);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(18, "div", 16);
    i0.ɵɵelement(19, "span");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(20, OverviewTabComponent_Conditional_37_Conditional_0_Conditional_20_Template, 3, 0, "ul", 47)(21, OverviewTabComponent_Conditional_37_Conditional_0_Conditional_21_Template, 4, 4, "div", 48);
    i0.ɵɵconditionalCreate(22, OverviewTabComponent_Conditional_37_Conditional_0_Conditional_22_Template, 3, 3, "div", 49);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const comp_r9 = i0.ɵɵnextContext();
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 19, "brain.overview.compTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 21, "brain.overview.compHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵclassProp("good", comp_r9.score >= 85)("mid", comp_r9.score >= 60 && comp_r9.score < 85)("bad", comp_r9.score < 60);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", comp_r9.score, "%");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(17, 23, "brain.overview.comp.of", i0.ɵɵpureFunction1(26, _c0, comp_r9.checks.length)));
    i0.ɵɵadvance(3);
    i0.ɵɵstyleProp("width", comp_r9.score, "%");
    i0.ɵɵclassProp("warn", comp_r9.score < 85)("err", comp_r9.score < 60);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.deductions().length ? 20 : 21);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(comp_r9.truncated ? 22 : -1);
} }
function OverviewTabComponent_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, OverviewTabComponent_Conditional_37_Conditional_0_Template, 23, 28, "section", 7);
} if (rf & 2) {
    i0.ɵɵconditional(ctx.score !== null ? 0 : -1);
} }
function OverviewTabComponent_Conditional_38_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 35);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9);
    i0.ɵɵelement(12, "app-skeleton-lines", 10);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵattribute("aria-busy", true);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 5, "brain.overview.compTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 7, "brain.overview.compHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("rows", 4);
} }
function OverviewTabComponent_Conditional_58_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 21);
    i0.ɵɵelement(1, "ph-icon", 43);
    i0.ɵɵelementStart(2, "span");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 2, "brain.overview.reindexNeeded"));
} }
function OverviewTabComponent_Conditional_59_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 21);
    i0.ɵɵelement(1, "ph-icon", 56);
    i0.ɵɵelementStart(2, "span");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 2, "brain.overview.reindexProxy"));
} }
function OverviewTabComponent_Conditional_67_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r10 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r10.label);
} }
function OverviewTabComponent_Conditional_67_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 24);
    i0.ɵɵrepeaterCreate(1, OverviewTabComponent_Conditional_67_For_2_Template, 2, 1, "li", null, _forTrack1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.retentionTypes());
} }
function OverviewTabComponent_Conditional_71_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 58);
} }
function OverviewTabComponent_Conditional_71_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 26)(1, "button", 57);
    i0.ɵɵlistener("click", function OverviewTabComponent_Conditional_71_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r11); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.requestReindex()); });
    i0.ɵɵconditionalCreate(2, OverviewTabComponent_Conditional_71_Conditional_2_Template, 1, 0, "span", 58);
    i0.ɵɵelement(3, "ph-icon", 59);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r2.reindexing());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.reindexing() ? 2 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(5, 4, "brain.overview.reindexButton"), " ");
} }
function OverviewTabComponent_Conditional_72_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 60);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.queue.idle"));
} }
function OverviewTabComponent_Conditional_72_Conditional_32_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "span", 63);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 64);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const r_r12 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(r_r12.count);
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", r_r12.reason);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r12.reason || i0.ɵɵpipeBind1(5, 3, "brain.overview.queue.unknownError"));
} }
function OverviewTabComponent_Conditional_72_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 61);
    i0.ɵɵrepeaterCreate(1, OverviewTabComponent_Conditional_72_Conditional_32_For_2_Template, 6, 5, "li", null, _forTrack2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.failureReasons());
} }
function OverviewTabComponent_Conditional_72_Conditional_33_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "span", 67);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 68);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const f_r13 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", f_r13.path);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(f_r13.path);
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", f_r13.lastError);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(f_r13.lastError || i0.ɵɵpipeBind1(5, 4, "brain.overview.queue.unknownError"));
} }
function OverviewTabComponent_Conditional_72_Conditional_33_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 66);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const q_r14 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "brain.overview.queue.failedMore", i0.ɵɵpureFunction2(4, _c2, q_r14.failedSample.length, q_r14.failed)));
} }
function OverviewTabComponent_Conditional_72_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 65);
    i0.ɵɵrepeaterCreate(1, OverviewTabComponent_Conditional_72_Conditional_33_For_2_Template, 6, 6, "li", null, _forTrack3);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, OverviewTabComponent_Conditional_72_Conditional_33_Conditional_3_Template, 3, 7, "p", 66);
} if (rf & 2) {
    const q_r14 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(q_r14.failedSample);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(q_r14.failed > q_r14.failedSample.length ? 3 : -1);
} }
function OverviewTabComponent_Conditional_72_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 69);
    i0.ɵɵlistener("click", function OverviewTabComponent_Conditional_72_Conditional_34_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r15); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.requestRetryFailed()); });
    i0.ɵɵelement(1, "ph-icon", 59);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 2, "brain.overview.queue.retryFailed"), " ");
} }
function OverviewTabComponent_Conditional_72_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9)(12, "div", 29)(13, "div", 30)(14, "div", 31);
    i0.ɵɵtext(15);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "div", 32);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "div", 30)(20, "div", 31);
    i0.ɵɵtext(21);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "div", 32);
    i0.ɵɵtext(23);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(25, "div", 30)(26, "div", 31);
    i0.ɵɵtext(27);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "div", 32);
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(31, OverviewTabComponent_Conditional_72_Conditional_31_Template, 3, 3, "div", 60);
    i0.ɵɵconditionalCreate(32, OverviewTabComponent_Conditional_72_Conditional_32_Template, 3, 0, "ul", 61);
    i0.ɵɵconditionalCreate(33, OverviewTabComponent_Conditional_72_Conditional_33_Template, 4, 1);
    i0.ɵɵconditionalCreate(34, OverviewTabComponent_Conditional_72_Conditional_34_Template, 4, 4, "button", 62);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const q_r14 = ctx;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 15, "brain.overview.queueTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 17, "brain.overview.queueHint"));
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(q_r14.pending);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 19, "brain.overview.queue.pending"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(q_r14.processing);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 21, "brain.overview.queue.processing"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("err-stat", q_r14.failed > 0);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(q_r14.failed);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(30, 23, "brain.overview.queue.failed"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(q_r14.failed === 0 && q_r14.pending === 0 && q_r14.processing === 0 ? 31 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.failureReasons().length > 1 ? 32 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(q_r14.failedSample.length ? 33 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(q_r14.failed > 0 ? 34 : -1);
} }
function OverviewTabComponent_Conditional_73_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9);
    i0.ɵɵelement(12, "app-skeleton-lines", 10);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵattribute("aria-busy", true);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 5, "brain.overview.queueTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 7, "brain.overview.queueHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("rows", 3);
} }
function OverviewTabComponent_Conditional_74_For_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "div", 72)(2, "span", 73);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 74);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "div", 75)(7, "span");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵpipe(10, "date");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "span", 76);
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const v_r16 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("title", v_r16.subject);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(v_r16.subject);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(v_r16.type);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(9, 9, "brain.overview.gov.deadline"), ": ", i0.ɵɵpipeBind2(10, 11, v_r16.deadline, "dd.MM.yyyy HH:mm"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate4("", ctx_r2.tallyYes(v_r16), " ", i0.ɵɵpipeBind1(13, 14, "brain.overview.gov.yes"), " \u00B7 ", ctx_r2.tallyVeto(v_r16), " ", i0.ɵɵpipeBind1(14, 16, "brain.overview.gov.veto"));
} }
function OverviewTabComponent_Conditional_74_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 8);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9)(12, "ul", 70);
    i0.ɵɵrepeaterCreate(13, OverviewTabComponent_Conditional_74_For_14_Template, 15, 18, "li", null, _forTrack4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "a", 71);
    i0.ɵɵelement(16, "ph-icon", 8);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 5, "brain.overview.govTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 7, "brain.overview.govHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r2.openVotes());
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(18, 9, "brain.overview.gov.review"), " ");
} }
function OverviewTabComponent_Conditional_87_For_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li");
    i0.ɵɵelement(1, "ph-icon", 27);
    i0.ɵɵelementStart(2, "span", 79);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 80);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const n_r17 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(n_r17.label);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(n_r17.type);
} }
function OverviewTabComponent_Conditional_87_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 77)(1, "span", 19);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "app-status-pill", 20);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "ul", 78);
    i0.ɵɵrepeaterCreate(8, OverviewTabComponent_Conditional_87_For_9_Template, 6, 3, "li", null, _forTrack4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "brain.overview.syncStatus"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("variant", ctx_r2.netVariant())("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 6, "brain.overview.net." + ctx_r2.netStatus()));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r2.networks());
} }
function OverviewTabComponent_Conditional_88_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 28);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.noNetworks"));
} }
function OverviewTabComponent_Conditional_89_Conditional_12_For_2_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 85);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.tok.peer"));
} }
function OverviewTabComponent_Conditional_89_Conditional_12_For_2_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 85);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.tok.allSpaces"));
} }
function OverviewTabComponent_Conditional_89_Conditional_12_For_2_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 85);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "date");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r18 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(3, 4, "brain.overview.tok.expires", i0.ɵɵpureFunction1(7, _c3, i0.ɵɵpipeBind2(2, 1, t_r18.expiresAt, "mediumDate"))));
} }
function OverviewTabComponent_Conditional_89_Conditional_12_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "span", 83);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 84);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, OverviewTabComponent_Conditional_89_Conditional_12_For_2_Conditional_6_Template, 3, 3, "span", 85);
    i0.ɵɵconditionalCreate(7, OverviewTabComponent_Conditional_89_Conditional_12_For_2_Conditional_7_Template, 3, 3, "span", 85);
    i0.ɵɵconditionalCreate(8, OverviewTabComponent_Conditional_89_Conditional_12_For_2_Conditional_8_Template, 4, 9, "span", 85);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r18 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵclassProp("admin", t_r18.level === "admin")("full", t_r18.level === "full")("readOnly", t_r18.level === "readOnly");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 11, "brain.overview.tok." + t_r18.level));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(t_r18.name);
    i0.ɵɵadvance();
    i0.ɵɵconditional(t_r18.peer ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(t_r18.allSpaces ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(t_r18.expiresAt ? 8 : -1);
} }
function OverviewTabComponent_Conditional_89_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 82);
    i0.ɵɵrepeaterCreate(1, OverviewTabComponent_Conditional_89_Conditional_12_For_2_Template, 9, 13, "li", null, _forTrack5);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const toks_r19 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(toks_r19);
} }
function OverviewTabComponent_Conditional_89_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 28);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.tok.none"));
} }
function OverviewTabComponent_Conditional_89_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 81);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9);
    i0.ɵɵconditionalCreate(12, OverviewTabComponent_Conditional_89_Conditional_12_Template, 3, 0, "ul", 82)(13, OverviewTabComponent_Conditional_89_Conditional_13_Template, 3, 3, "div", 28);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 4, "brain.overview.tokenTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 6, "brain.overview.tokenHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx.length ? 12 : 13);
} }
function OverviewTabComponent_Conditional_90_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section", 7)(1, "header", 2)(2, "span", 3);
    i0.ɵɵelement(3, "ph-icon", 81);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div")(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 9);
    i0.ɵɵelement(12, "app-skeleton-lines", 10);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵattribute("aria-busy", true);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 5, "brain.overview.tokenTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 7, "brain.overview.tokenHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("rows", 3);
} }
export class OverviewTabComponent {
    constructor() {
        this.space = input.required(...(ngDevMode ? [{ debugName: "space" }] : /* istanbul ignore next */ []));
        /** Admin tokens get the schema pen on each type card. */
        this.canEditSchema = input(false, ...(ngDevMode ? [{ debugName: "canEditSchema" }] : /* istanbul ignore next */ []));
        /** Set by the host while the reset request is in flight, so a second press cannot fire a second delete. */
        this.resettingUsage = input(false, ...(ngDevMode ? [{ debugName: "resettingUsage" }] : /* istanbul ignore next */ []));
        /** What the last reset did, reported inline the way runReindex reports its result. */
        this.usageResetResult = input('', ...(ngDevMode ? [{ debugName: "usageResetResult" }] : /* istanbul ignore next */ []));
        /** The panel confirms; the host performs the request and reloads. Same split as reindex and retry-failed. */
        this.resetUsage = output();
        /** The SHELL owns the schema dialog: this tab reports which type was asked for and nothing more. */
        this.editSchemaType = output();
        this.stats = input(undefined, ...(ngDevMode ? [{ debugName: "stats" }] : /* istanbul ignore next */ []));
        this.reindexing = input(false, ...(ngDevMode ? [{ debugName: "reindexing" }] : /* istanbul ignore next */ []));
        /**
         * A proxy space stands in for its members and holds no records — so it has no index of its own and
         * nothing to reindex. The server has refused the call since the double-embed fix (`planReindex` answers
         * 400 naming the members), so offering the button could only ever produce that refusal.
         *
         * Read from the space this panel was already given, not fetched: `proxyFor` is on the record, and the
         * space chip beside this panel already branches on it to draw the proxy badge.
         */
        this.isProxy = () => (this.space().proxyFor?.length ?? 0) > 0;
        this.needsReindex = input(false, ...(ngDevMode ? [{ debugName: "needsReindex" }] : /* istanbul ignore next */ []));
        /** Instance identity/health (from /api/about), preloaded by the shell — null until it lands. */
        this.about = input(null, ...(ngDevMode ? [{ debugName: "about" }] : /* istanbul ignore next */ []));
        /** Embedding-job backlog for this space (from the shell) — null until it lands. */
        this.embeddingQueue = input(null, ...(ngDevMode ? [{ debugName: "embeddingQueue" }] : /* istanbul ignore next */ []));
        /** Open governance votes across this space's networks (from the shell). */
        this.openVotes = input([], ...(ngDevMode ? [{ debugName: "openVotes" }] : /* istanbul ignore next */ []));
        /** Tokens that can reach this space (from the shell). Null for non-admins → the panel stays hidden. */
        this.tokenAccess = input(null, ...(ngDevMode ? [{ debugName: "tokenAccess" }] : /* istanbul ignore next */ []));
        /** Completeness checks + roll-up (from the shell) — null until it lands, and the panel stays hidden. */
        this.completeness = input(null, ...(ngDevMode ? [{ debugName: "completeness" }] : /* istanbul ignore next */ []));
        /**
         * This space's usage over the shell's window (from the shell) — null until it lands, panel hidden.
         *
         * A single already-summed row rather than the endpoint's array: for a proxy space the shell sums its
         * members, because the question "is this space useful" is about the thing the operator sees in the list, not
         * about which member answered.
         */
        this.activity = input(null, ...(ngDevMode ? [{ debugName: "activity" }] : /* istanbul ignore next */ []));
        /**
         * Which panels have been blanked for a space switch and are still awaiting a first answer.
         *
         * Separate from the values because `null` cannot say it: `tokenAccess` is null **permanently** for a non-admin
         * (the endpoint 403s) and `completeness` is null after a failure, so a skeleton keyed on null alone would sit
         * there forever. The parent raises these only where it blanks, and clears each from both handlers.
         */
        // `stats` and `about` are gone from this record with the panels they gated (owner, 2026-08-08). A pending
        // flag with no skeleton branch left to drive is not harmless: it is a blank that never resolves into
        // anything, and the gate that enforces the pairing is what caught them.
        this.pending = input({
            activity: false, completeness: false, queue: false, tokens: false,
        }, ...(ngDevMode ? [{ debugName: "pending" }] : /* istanbul ignore next */ []));
        /** Emitted (after a confirm) so the shell's existing reindex flow runs — no duplicate API path. */
        /** A collection tile was clicked — the shell switches to that tab. */
        this.openTab = output();
        this.reindex = output();
        /** Emitted so the shell re-queues every failed embedding job and reloads the queue (fetch-free tab). */
        this.retryFailed = output();
        this.confirmDialog = inject(ConfirmDialogService);
        this.transloco = inject(TranslocoService);
        /**
         * Answered recalls as a percentage, or null when nothing was asked.
         *
         * Null rather than 0 for "no questions": 0% reads as "this space answers nothing", which is a judgement
         * about quality, when the truth is that nobody asked it anything. The two need different responses from an
         * operator — fill the space, versus find out why nobody queries it.
         */
        this.answerRate = computed(() => {
            const a = this.activity();
            if (!a || a.recall === 0)
                return null;
            return Math.round((a.answered / a.recall) * 100);
        }, ...(ngDevMode ? [{ debugName: "answerRate" }] : /* istanbul ignore next */ []));
        /**
         * Failed jobs grouped by reason, most common first — over the whole failed set, not the five-path sample.
         *
         * Tolerates the field being absent so an older server (or a cached response from one) renders the panel
         * rather than throwing on `.length`: absent and empty both mean "nothing to add here".
         */
        this.failureReasons = computed(() => this.embeddingQueue()?.failedByReason ?? [], ...(ngDevMode ? [{ debugName: "failureReasons" }] : /* istanbul ignore next */ []));
        /**
         * The space-wide tier, in words. "No expiry" is a real answer and the one most spaces give.
         *
         * Reads the buckets rather than the raw field, because the tier is five numbers now. When they all agree it
         * still says the one sentence it always did — a space with one window should not be made to look complicated
         * by an implementation detail — and only lists per bucket when they actually differ.
         */
        /** Delegated to `overview-retention.ts` — pure, and out of a file the ratchet has frozen. */
        this.retentionSummary = computed(() => summariseRetention(this.space(), (k, p) => this.transloco.translate(k, p)), ...(ngDevMode ? [{ debugName: "retentionSummary" }] : /* istanbul ignore next */ []));
        /** Same. The list of types whose own schema overrides the space-wide window. */
        this.retentionTypes = computed(() => retentionOverridesOf(this.space(), (k, p) => this.transloco.translate(k, p)), ...(ngDevMode ? [{ debugName: "retentionTypes" }] : /* istanbul ignore next */ []));
        // `total` and `statCards` went with the statistics strip. Both existed only to feed those tiles, and the
        // ER diagram computes its own per-type counts from the model it already fetched — keeping a second
        // source of the same numbers is how two counts of one thing come to disagree.
        /**
         * The checks that actually cost points, heaviest loss first — a passing check is not a deduction and
         * listing it would bury the three lines that matter. Ranked by points LOST (`weight - earned`), not by
         * `affected`: 3 unreachable files outrank 300 unlinked entities, because that is what the weights say.
         */
        this.deductions = computed(() => {
            const cs = this.completeness()?.checks ?? [];
            return cs.filter(c => c.earned < c.weight)
                .sort((a, b) => (b.weight - b.earned) - (a.weight - a.earned))
                .slice(0, 6);
        }, ...(ngDevMode ? [{ debugName: "deductions" }] : /* istanbul ignore next */ []));
        /**
         * True when the server said the usage figure is a FLOOR — a directory it could not read.
         *
         * Shown rather than hidden because the alternative is worse than a missing number: an unreadable space
         * reported 0 GiB, which is what an empty space reports, so the bar sat at 0% while the quota was being
         * approached. A figure qualified as "at least" is usable; one silently short is not.
         */
        this.usageIsFloor = computed(() => (this.space().usageIncomplete?.length ?? 0) > 0, ...(ngDevMode ? [{ debugName: "usageIsFloor" }] : /* istanbul ignore next */ []));
        /** What the server could not read, for the tooltip — the operator's actual next step. */
        this.usageIncompleteReason = computed(() => this.space().usageIncomplete?.join('; ') ?? '', ...(ngDevMode ? [{ debugName: "usageIncompleteReason" }] : /* istanbul ignore next */ []));
        /** Networks this space belongs to (F8 data, already on the space payload — no extra fetch). */
        this.networks = computed(() => this.space().networks ?? [], ...(ngDevMode ? [{ debugName: "networks" }] : /* istanbul ignore next */ []));
    }
    /** Two decimals of GiB, without trailing noise. */
    used() { return (this.space().usageGiB ?? 0).toFixed(2); }
    usagePct() {
        const sp = this.space();
        if (!sp.maxGiB)
            return null;
        return Math.min(100, ((sp.usageGiB ?? 0) / sp.maxGiB) * 100);
    }
    /** Aggregate sync/governance status; defaults to 'idle' when connected but unreported. */
    netStatus() {
        return this.space().networkStatus ?? 'idle';
    }
    netVariant() {
        switch (this.space().networkStatus) {
            case 'degraded': return 'error';
            case 'syncing': return 'pending';
            case 'vote': return 'warn'; // a governance vote is awaiting this instance — needs attention
            default: return 'ok'; // idle = connected and healthy
        }
    }
    /** Running vote tallies for the Governance panel. */
    tallyYes(v) { return v.votes.filter(x => x.vote === 'yes').length; }
    tallyVeto(v) { return v.votes.filter(x => x.vote === 'veto').length; }
    /** Space.indexStatus is optional (proxy/legacy spaces have none) → 'none'. */
    indexState() {
        return this.space().indexStatus ?? 'none';
    }
    indexVariant() {
        switch (this.indexState()) {
            case 'ready': return 'ok';
            case 'building': return 'warn';
            case 'failed': return 'error';
            default: return 'off';
        }
    }
    /**
     * Confirm, then ask the host to clear this space's recorded usage.
     *
     * Exactly the shape `requestReindex` and `requestRetryFailed` already have: the panel owns the confirmation
     * because the panel is where the button is, and the host owns the request and the reload.
     *
     * `danger: true` because the buckets are deleted, not hidden — the usage history for this space is gone and
     * there is no undo. Guarded on `resettingUsage()` so a second press during the request cannot fire a second
     * delete.
     */
    async requestUsageReset() {
        if (this.resettingUsage())
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('brain.overview.confirmUsageResetTitle'),
            message: this.transloco.translate('brain.overview.confirmUsageReset', { label: this.space().label }),
            confirmLabel: this.transloco.translate('brain.overview.useReset'),
            danger: true,
        });
        if (!ok)
            return;
        this.resetUsage.emit();
    }
    async requestReindex() {
        if (this.reindexing())
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('brain.overview.confirmReindexTitle'),
            message: this.transloco.translate('brain.overview.confirmReindex', { label: this.space().label }),
            confirmLabel: this.transloco.translate('brain.overview.reindexButton'),
            danger: true,
        });
        if (!ok)
            return;
        this.reindex.emit();
    }
    async requestRetryFailed() {
        const failed = this.embeddingQueue()?.failed ?? 0;
        if (failed <= 0)
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('brain.overview.confirmRetryFailedTitle'),
            message: this.transloco.translate('brain.overview.confirmRetryFailed', { count: failed }),
            confirmLabel: this.transloco.translate('brain.overview.queue.retryFailed'),
        });
        if (!ok)
            return;
        this.retryFailed.emit();
    }
    static { this.ɵfac = function OverviewTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || OverviewTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: OverviewTabComponent, selectors: [["app-overview-tab"]], inputs: { space: [1, "space"], canEditSchema: [1, "canEditSchema"], resettingUsage: [1, "resettingUsage"], usageResetResult: [1, "usageResetResult"], stats: [1, "stats"], reindexing: [1, "reindexing"], needsReindex: [1, "needsReindex"], about: [1, "about"], embeddingQueue: [1, "embeddingQueue"], openVotes: [1, "openVotes"], tokenAccess: [1, "tokenAccess"], completeness: [1, "completeness"], activity: [1, "activity"], pending: [1, "pending"] }, outputs: { resetUsage: "resetUsage", editSchemaType: "editSchemaType", openTab: "openTab", reindex: "reindex", retryFailed: "retryFailed" }, decls: 91, vars: 62, consts: [[1, "grid"], [1, "panel", "span-all"], [1, "panel-h"], [1, "ic"], ["name", "stack", 3, "size"], [1, "hint"], [3, "editType", "spaceId", "canEdit"], [1, "panel"], ["name", "broadcast", 3, "size"], [1, "panel-b"], [3, "rows"], [1, "store"], [1, "store-row"], [1, "cap"], [1, "num"], [1, "usage-floor", 3, "title"], [1, "bar"], ["name", "database", 3, "size"], [1, "idx-row"], [1, "lab"], [3, "variant", "dot"], [1, "reindex-note"], [1, "retention"], [1, "ret-line"], [1, "ret-types"], [1, "muted", "ret-edit"], [1, "actions"], ["name", "link", 3, "size"], [1, "muted"], [1, "stat-grid"], [1, "stat"], [1, "v"], [1, "l"], ["name", "binoculars", 3, "size"], ["name", "magnifying-glass", 3, "size"], ["name", "check-circle", 3, "size"], ["name", "pencil-simple", 3, "size"], ["name", "timer", 3, "size"], [1, "store-row", 2, "margin-top", "9px"], [1, "store-row", 2, "margin-top", "12px", "justify-content", "flex-end"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "muted", 2, "margin-left", "10px", "font-size", "12px"], ["name", "warning", 3, "size"], [1, "comp-top"], [1, "comp-score"], [1, "comp-of"], [1, "comp-list"], [1, "comp-clear"], [1, "muted", 2, "margin-top", "10px"], [3, "name", "size"], [1, "comp-txt"], [1, "ct"], [1, "cs", 3, "title"], ["type", "button", 1, "comp-go"], ["type", "button", 1, "comp-go", 3, "click"], ["name", "info", 3, "size"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], ["name", "arrows-clockwise", 2, "margin-right", "5px", "vertical-align", "-2px", 3, "size"], [1, "muted", 2, "margin-top", "12px"], [1, "fail-reasons"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", "retry-failed-btn", 2, "margin-top", "12px"], [1, "rc"], [1, "re", 3, "title"], [1, "fail-list"], [1, "muted", "fail-more"], [1, "fp", 3, "title"], [1, "fe", 3, "title"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", "retry-failed-btn", 2, "margin-top", "12px", 3, "click"], [1, "vote-list"], ["routerLink", "/settings/networks", 1, "btn", "btn-sm", "btn-secondary", 2, "margin-top", "12px", "display", "inline-flex", "align-items", "center", "gap", "5px"], [1, "vote-top"], [1, "vs", 3, "title"], [1, "vt"], [1, "vote-meta"], [1, "tally"], [1, "idx-row", 2, "margin-bottom", "11px"], [1, "net-list"], [1, "nl"], [1, "nt"], ["name", "key", 3, "size"], [1, "tok-list"], [1, "lvl"], [1, "tn"], [1, "tx"]], template: function OverviewTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "section", 1)(2, "header", 2)(3, "span", 3);
            i0.ɵɵelement(4, "ph-icon", 4);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(5, "div")(6, "h3");
            i0.ɵɵtext(7);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(9, "p", 5);
            i0.ɵɵtext(10);
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(12, "app-er-model-panel", 6);
            i0.ɵɵlistener("editType", function OverviewTabComponent_Template_app_er_model_panel_editType_12_listener($event) { return ctx.editSchemaType.emit($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(13, "section", 7)(14, "header", 2)(15, "span", 3);
            i0.ɵɵelement(16, "ph-icon", 8);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(17, "div")(18, "h3");
            i0.ɵɵtext(19);
            i0.ɵɵpipe(20, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(21, "p");
            i0.ɵɵtext(22);
            i0.ɵɵpipe(23, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(24, "div", 9);
            i0.ɵɵconditionalCreate(25, OverviewTabComponent_Conditional_25_Template, 2, 1)(26, OverviewTabComponent_Conditional_26_Template, 1, 1, "app-skeleton-lines", 10);
            i0.ɵɵconditionalCreate(27, OverviewTabComponent_Conditional_27_Template, 1, 1);
            i0.ɵɵelementStart(28, "div", 11)(29, "div", 12)(30, "span", 13);
            i0.ɵɵtext(31);
            i0.ɵɵpipe(32, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(33, OverviewTabComponent_Conditional_33_Template, 2, 3, "span", 14)(34, OverviewTabComponent_Conditional_34_Template, 3, 5, "span", 14);
            i0.ɵɵconditionalCreate(35, OverviewTabComponent_Conditional_35_Template, 4, 5, "span", 15);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(36, OverviewTabComponent_Conditional_36_Template, 2, 6, "div", 16);
            i0.ɵɵelementEnd()()();
            i0.ɵɵconditionalCreate(37, OverviewTabComponent_Conditional_37_Template, 1, 1)(38, OverviewTabComponent_Conditional_38_Template, 13, 9, "section", 7);
            i0.ɵɵelementStart(39, "section", 7)(40, "header", 2)(41, "span", 3);
            i0.ɵɵelement(42, "ph-icon", 17);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(43, "div")(44, "h3");
            i0.ɵɵtext(45);
            i0.ɵɵpipe(46, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(47, "p");
            i0.ɵɵtext(48);
            i0.ɵɵpipe(49, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(50, "div", 9)(51, "div", 18)(52, "span", 19);
            i0.ɵɵtext(53);
            i0.ɵɵpipe(54, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(55, "app-status-pill", 20);
            i0.ɵɵtext(56);
            i0.ɵɵpipe(57, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(58, OverviewTabComponent_Conditional_58_Template, 5, 4, "div", 21);
            i0.ɵɵconditionalCreate(59, OverviewTabComponent_Conditional_59_Template, 5, 4, "div", 21);
            i0.ɵɵelementStart(60, "div", 22)(61, "div", 18)(62, "span", 19);
            i0.ɵɵtext(63);
            i0.ɵɵpipe(64, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(65, "p", 23);
            i0.ɵɵtext(66);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(67, OverviewTabComponent_Conditional_67_Template, 3, 0, "ul", 24);
            i0.ɵɵelementStart(68, "p", 25);
            i0.ɵɵtext(69);
            i0.ɵɵpipe(70, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(71, OverviewTabComponent_Conditional_71_Template, 6, 6, "div", 26);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(72, OverviewTabComponent_Conditional_72_Template, 35, 25, "section", 7)(73, OverviewTabComponent_Conditional_73_Template, 13, 9, "section", 7);
            i0.ɵɵconditionalCreate(74, OverviewTabComponent_Conditional_74_Template, 19, 11, "section", 7);
            i0.ɵɵelementStart(75, "section", 7)(76, "header", 2)(77, "span", 3);
            i0.ɵɵelement(78, "ph-icon", 27);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(79, "div")(80, "h3");
            i0.ɵɵtext(81);
            i0.ɵɵpipe(82, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(83, "p");
            i0.ɵɵtext(84);
            i0.ɵɵpipe(85, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(86, "div", 9);
            i0.ɵɵconditionalCreate(87, OverviewTabComponent_Conditional_87_Template, 10, 8)(88, OverviewTabComponent_Conditional_88_Template, 3, 3, "span", 28);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(89, OverviewTabComponent_Conditional_89_Template, 14, 8, "section", 7)(90, OverviewTabComponent_Conditional_90_Template, 13, 9, "section", 7);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            let tmp_8_0;
            let tmp_9_0;
            let tmp_13_0;
            let tmp_14_0;
            let tmp_29_0;
            let tmp_35_0;
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 36, "brain.overview.er.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 38, "brain.overview.er.hint"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("spaceId", ctx.space().id)("canEdit", ctx.canEditSchema());
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 40, "brain.overview.useTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 42, "brain.overview.useHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional((tmp_8_0 = ctx.activity()) ? 25 : ctx.pending().activity ? 26 : -1, tmp_8_0);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_9_0 = ctx.canEditSchema() && ctx.activity()) ? 27 : -1, tmp_9_0);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(32, 44, "brain.overview.storage"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.space().maxGiB ? 33 : 34);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.usageIsFloor() ? 35 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_13_0 = ctx.usagePct()) ? 36 : -1, tmp_13_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_14_0 = ctx.completeness()) ? 37 : ctx.pending().completeness ? 38 : -1, tmp_14_0);
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(46, 46, "brain.overview.indexingTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(49, 48, "brain.overview.indexingHint"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(54, 50, "brain.overview.vectorIndex"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("variant", ctx.indexVariant())("dot", true);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(57, 52, "brain.overview.idx." + ctx.indexState()));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.needsReindex() && !ctx.isProxy() ? 58 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.isProxy() ? 59 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(64, 54, "brain.overview.retentionTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.retentionSummary());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.retentionTypes().length ? 67 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(70, 56, "brain.overview.retentionEdit"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(!ctx.isProxy() ? 71 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_29_0 = ctx.embeddingQueue()) ? 72 : ctx.pending().queue ? 73 : -1, tmp_29_0);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.openVotes().length ? 74 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(82, 58, "brain.overview.networksTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(85, 60, "brain.overview.networksHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.networks().length ? 87 : 88);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_35_0 = ctx.tokenAccess()) ? 89 : ctx.pending().tokens ? 90 : -1, tmp_35_0);
        } }, dependencies: [ErModelPanelComponent, PhIconComponent, StatusPillComponent, SkeletonLinesComponent, RouterLink, TranslocoPipe, DatePipe], styles: ["[_nghost-%COMP%] { display: block; }\n\n    \n\n\n\n    .grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: 1fr; gap: 16px; }\n    @media (min-width: 820px)  { .grid[_ngcontent-%COMP%] { grid-template-columns: repeat(2, minmax(0, 1fr)); } }\n    @media (min-width: 1280px) { .grid[_ngcontent-%COMP%] { grid-template-columns: repeat(3, minmax(0, 1fr)); } }\n\n    \n\n\n    .panel.span-all[_ngcontent-%COMP%] { grid-column: 1 / -1; }\n\n    \n\n\n    .panel[_ngcontent-%COMP%] { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;\n      display: flex; flex-direction: column; }\n    .panel-h[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 9px; padding: 13px 16px;\n      border-bottom: 1px solid var(--border-muted); }\n    .panel-h[_ngcontent-%COMP%]   .ic[_ngcontent-%COMP%] { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .panel-h[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin: 0; font-size: 14px; font-weight: 620; }\n    \n\n\n\n\n    .panel-h[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 1px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.35;\n      min-height: calc(2 * 1.35em);\n      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n    .panel-b[_ngcontent-%COMP%] { padding: 14px 16px; flex: 1; }\n\n    \n\n\n\n    .stat-grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n    \n\n    .span-all[_ngcontent-%COMP%]   .stat-grid[_ngcontent-%COMP%] { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n    @media (min-width: 560px)  { .span-all[_ngcontent-%COMP%]   .stat-grid[_ngcontent-%COMP%] { grid-template-columns: repeat(3, minmax(0, 1fr)); } }\n    @media (min-width: 1000px) { .span-all[_ngcontent-%COMP%]   .stat-grid[_ngcontent-%COMP%] { grid-template-columns: repeat(6, minmax(0, 1fr)); } }\n    .stat[_ngcontent-%COMP%] { background: var(--bg-elevated); border: 1px solid var(--border-muted); border-radius: 8px; padding: 11px 12px; }\n    .stat[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%] { font-size: 22px; font-weight: 700; font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; line-height: 1.1; }\n    .stat[_ngcontent-%COMP%]   .l[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); }\n    \n\n\n\n    .stat-link[_ngcontent-%COMP%] { font: inherit; color: inherit; text-align: left; width: 100%; cursor: pointer;\n      transition: border-color var(--transition), background var(--transition); }\n    .stat-link[_ngcontent-%COMP%]:hover { border-color: var(--accent); background: var(--bg-surface); }\n    .stat-link[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .stat.total[_ngcontent-%COMP%] { border-color: color-mix(in srgb, var(--accent) 45%, transparent);\n      background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated)); }\n    .stat.total[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%] { color: var(--accent-ink, var(--accent)); }\n\n    .store[_ngcontent-%COMP%] { margin-top: 14px; }\n    .store-row[_ngcontent-%COMP%] { display: flex; align-items: baseline; justify-content: space-between; font-size: 12.5px; }\n    .store-row[_ngcontent-%COMP%]   .cap[_ngcontent-%COMP%] { color: var(--text-secondary); }\n    .store-row[_ngcontent-%COMP%]   .num[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; color: var(--text-primary); }\n    \n\n\n\n    .store-row[_ngcontent-%COMP%]   .usage-floor[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;\n      color: var(--warn, #b26a00); font-size: 11.5px; white-space: nowrap; cursor: help; }\n    .bar[_ngcontent-%COMP%] { height: 7px; border-radius: 4px; background: var(--bg-elevated); margin-top: 7px; overflow: hidden; border: 1px solid var(--border-muted); }\n    .bar[_ngcontent-%COMP%]    > span[_ngcontent-%COMP%] { display: block; height: 100%; border-radius: 4px; background: var(--accent); }\n    .bar[_ngcontent-%COMP%]    > span.warn[_ngcontent-%COMP%] { background: var(--warning); } .bar[_ngcontent-%COMP%]    > span.err[_ngcontent-%COMP%] { background: var(--error); }\n\n    .idx-row[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; }\n    .idx-row[_ngcontent-%COMP%]   .lab[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-secondary); flex: 1; }\n    .reindex-note[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 8px; margin-top: 13px; padding: 10px 12px;\n      border-radius: 8px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }\n    .reindex-note[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; margin-top: 1px; color: var(--warning); }\n    .actions[_ngcontent-%COMP%] { margin-top: 13px; }\n    .retention[_ngcontent-%COMP%] { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-muted); }\n    .ret-line[_ngcontent-%COMP%] { margin: 4px 0 0; font-size: 12.5px; color: var(--text-primary); }\n    .ret-types[_ngcontent-%COMP%] { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px;\n      font-size: 11.5px; color: var(--text-secondary); }\n    .ret-edit[_ngcontent-%COMP%] { margin: 7px 0 0; font-size: 11px; }\n    .muted[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 12.5px; }\n\n    .net-list[_ngcontent-%COMP%] { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }\n    .net-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; font-size: 13px; }\n    .net-list[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { color: var(--text-muted); flex: none; }\n    .net-list[_ngcontent-%COMP%]   .nl[_ngcontent-%COMP%] { flex: 1; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .net-list[_ngcontent-%COMP%]   .nt[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono, monospace); }\n\n    .kv[_ngcontent-%COMP%] { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 12.5px; margin: 0; }\n    .kv[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%] { color: var(--text-secondary); white-space: nowrap; }\n    .kv[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%] { margin: 0; color: var(--text-primary); text-align: right; }\n    .kv[_ngcontent-%COMP%]   dd.mono[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 11px; word-break: break-all; }\n\n    .stat.err-stat[_ngcontent-%COMP%] { border-color: color-mix(in srgb, var(--error) 45%, transparent); background: color-mix(in srgb, var(--error) 10%, var(--bg-elevated)); }\n    .stat.err-stat[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%] { color: var(--error); }\n    .fail-list[_ngcontent-%COMP%] { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }\n    .fail-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 1px; font-size: 11.5px; border-top: 1px solid var(--border-muted); padding-top: 6px; }\n    .fail-list[_ngcontent-%COMP%]   .fp[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .fail-list[_ngcontent-%COMP%]   .fe[_ngcontent-%COMP%] { color: var(--error); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    \n\n\n    .fail-reasons[_ngcontent-%COMP%] { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }\n    .fail-reasons[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; align-items: baseline; gap: 8px; font-size: 11.5px; }\n    .fail-reasons[_ngcontent-%COMP%]   .rc[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-weight: 650; color: var(--error); min-width: 2.5ch; text-align: right; flex: none; }\n    .fail-reasons[_ngcontent-%COMP%]   .re[_ngcontent-%COMP%] { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .fail-more[_ngcontent-%COMP%] { font-size: 11px; margin: 6px 0 0; }\n\n    .vote-list[_ngcontent-%COMP%] { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }\n    .vote-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { border: 1px solid var(--border-muted); border-radius: 8px; padding: 9px 11px; background: var(--bg-elevated); }\n    .vote-top[_ngcontent-%COMP%] { display: flex; align-items: baseline; gap: 8px; }\n    .vote-top[_ngcontent-%COMP%]   .vs[_ngcontent-%COMP%] { flex: 1; font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .vote-top[_ngcontent-%COMP%]   .vt[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono, monospace); }\n    .vote-meta[_ngcontent-%COMP%] { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); flex-wrap: wrap; }\n    .vote-meta[_ngcontent-%COMP%]   .tally[_ngcontent-%COMP%] { font-variant-numeric: tabular-nums; }\n    .tok-list[_ngcontent-%COMP%] { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }\n    .tok-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; font-size: 13px; }\n    .tok-list[_ngcontent-%COMP%]   .tn[_ngcontent-%COMP%] { flex: 1; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .tok-list[_ngcontent-%COMP%]   .tx[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); white-space: nowrap; }\n    .lvl[_ngcontent-%COMP%] { font-size: 10.5px; font-weight: 620; padding: 1px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; flex: none; }\n    .lvl.admin[_ngcontent-%COMP%] { background: color-mix(in srgb, var(--error) 16%, transparent); color: var(--error); }\n\n    \n\n\n    .net-list[_ngcontent-%COMP%], .vote-list[_ngcontent-%COMP%], .tok-list[_ngcontent-%COMP%], .fail-list[_ngcontent-%COMP%] { max-height: 216px; overflow-y: auto; }\n    .lvl.full[_ngcontent-%COMP%] { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }\n    .lvl.readOnly[_ngcontent-%COMP%] { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-secondary); }\n\n    \n\n\n    .comp-top[_ngcontent-%COMP%] { display: flex; align-items: baseline; gap: 10px; }\n    .comp-score[_ngcontent-%COMP%] { font-size: 30px; font-weight: 700; font-family: var(--font-mono, monospace);\n      font-variant-numeric: tabular-nums; line-height: 1; }\n    .comp-score.good[_ngcontent-%COMP%] { color: var(--success); } .comp-score.mid[_ngcontent-%COMP%] { color: var(--warning); } .comp-score.bad[_ngcontent-%COMP%] { color: var(--error); }\n    .comp-of[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-secondary); }\n    .comp-list[_ngcontent-%COMP%] { list-style: none; margin: 13px 0 0; padding: 0; display: flex; flex-direction: column; gap: 7px; max-height: 216px; overflow-y: auto; }\n    .comp-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px;\n      border-top: 1px solid var(--border-muted); padding-top: 7px; }\n    .comp-list[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; margin-top: 2px; }\n    .comp-list[_ngcontent-%COMP%]   .warn-ic[_ngcontent-%COMP%] { color: var(--warning); } .comp-list[_ngcontent-%COMP%]   .info-ic[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .comp-txt[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n    .comp-txt[_ngcontent-%COMP%]   .ct[_ngcontent-%COMP%] { color: var(--text-primary); }\n    .comp-txt[_ngcontent-%COMP%]   .cs[_ngcontent-%COMP%] { display: block; color: var(--text-muted); font-size: 11px; font-family: var(--font-mono, monospace);\n      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .comp-go[_ngcontent-%COMP%] { font: inherit; font-size: 11.5px; background: none; border: 0; color: var(--accent); cursor: pointer;\n      padding: 0; flex: none; text-decoration: underline; }\n    .comp-go[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .comp-clear[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--success); margin-top: 13px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(OverviewTabComponent, [{
        type: Component,
        args: [{ selector: 'app-overview-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [ErModelPanelComponent, TranslocoPipe, PhIconComponent, StatusPillComponent, SkeletonLinesComponent, RouterLink, DatePipe], template: `
    <div class="grid">
      <!-- ── Data model (full width: a diagram in a third-width card is unreadable) ──── -->
      <section class="panel span-all">
        <header class="panel-h">
          <!-- NO BACKTICKS in a template comment: one ends the inline template string and the error points
               at @Component, not here.
               This is "stack", not "graph". The panel is the space's SCHEMA — record TYPES and their fields,
               with the relationships between them. "graph" is the node-graph VIEW and now labels that tab;
               two things wearing one icon made this read as a small copy of the Graph tab. Not "database"
               either: the Indexing panel below already owns that, and swapping one collision for another is
               not a fix. -->
          <span class="ic"><ph-icon name="stack" [size]="16"/></span>
          <div>
            <h3>{{ 'brain.overview.er.title' | transloco }}</h3>
            <p class="hint">{{ 'brain.overview.er.hint' | transloco }}</p>
          </div>
        </header>
        <app-er-model-panel [spaceId]="space().id" [canEdit]="canEditSchema()"
                            (editType)="editSchemaType.emit($event)" />
      </section>

      <!-- The record-count strip that used to sit here is gone (owner, 2026-08-08): the ER diagram above
           shows the same counts per type AND how the types relate, so a flat row of the same numbers was
           the diagram's data with the structure removed. Its per-type tab links live on the diagram now.
           The STORAGE bar was not duplicated by the diagram, so it moved into Usage below rather than
           being deleted with the strip around it — disk consumed is usage. -->

      <!-- ── Usage: storage, and whether anyone gets anything OUT of this space ── -->
      <!-- The SECTION is unconditional; only the ACTIVITY block inside it is gated. It used to be the other
           way round, which is why storage could not live here: the whole card waited on activity data, so on
           a space nobody had called yet the card was absent and storage with it — exactly the space where a
           filling disk is least expected. Giving storage its own card worked around that and was the wrong
           fix: it made a card for one number. -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="broadcast" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.useTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.useHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          @if (activity(); as act) {
            @if (act.calls > 0) {
              <div class="stat-grid">
                <div class="stat">
                  <div class="v">{{ act.calls }}</div>
                  <div class="l"><ph-icon name="binoculars" [size]="13"/>{{ 'brain.overview.useCalls' | transloco }}</div>
                </div>
                <div class="stat">
                  <div class="v">{{ act.recall }}</div>
                  <div class="l"><ph-icon name="magnifying-glass" [size]="13"/>{{ 'brain.overview.useRecall' | transloco }}</div>
                </div>
                <!-- The headline. Demand without this number is not usefulness — a space asked 380 times that
                     answered 41 reads identically to the best space in the instance if you only count calls. -->
                <div class="stat" [class.total]="answerRate() !== null">
                  <div class="v">{{ answerRate() === null ? '—' : answerRate() + '%' }}</div>
                  <div class="l"><ph-icon name="check-circle" [size]="13"/>{{ 'brain.overview.useAnswered' | transloco }}</div>
                </div>
                <div class="stat">
                  <div class="v">{{ act.writes }}</div>
                  <div class="l"><ph-icon name="pencil-simple" [size]="13"/>{{ 'brain.overview.useWrites' | transloco }}</div>
                </div>
                <div class="stat">
                  <div class="v">{{ act.meanMs === null ? '—' : act.meanMs + ' ms' }}</div>
                  <div class="l"><ph-icon name="timer" [size]="13"/>{{ 'brain.overview.useMean' | transloco }}</div>
                </div>
              </div>

              @if (answerRate(); as rate) {
                <div class="store">
                  <div class="store-row">
                    <span class="cap">{{ 'brain.overview.useAnswerRate' | transloco }}</span>
                    <span class="num">{{ act.answered }} / {{ act.recall }}<!--
                      -->@if (act.meanTopScore !== null) { · {{ 'brain.overview.useTopScore' | transloco }} {{ act.meanTopScore }} }</span>
                  </div>
                  <!-- Inverted thresholds against the storage bar below: there, full is bad. Here a LOW rate
                       is the warning — questions arriving and going unanswered is the content gap this panel
                       exists to make visible. -->
                  <div class="bar"><span [class.warn]="rate < 50 && rate >= 20" [class.err]="rate < 20" [style.width.%]="rate"></span></div>
                </div>
              }

              @if (act.over1s > 0) {
                <div class="store-row" style="margin-top:9px">
                  <span class="cap">{{ 'brain.overview.useSlow' | transloco }}</span>
                  <span class="num">{{ act.over1s }} · max {{ act.maxMs }} ms</span>
                </div>
              }
            } @else {
              <!-- Not "no data": no calls. A space with nothing asked of it is the clearest answer this panel
                   can give, and blanking it would look like a loading failure instead. -->
              <span class="muted">{{ 'brain.overview.useNone' | transloco }}</span>
            }
          } @else if (pending().activity) {
            <app-skeleton-lines [rows]="4" />
          }

          <!-- Reset. Inside the calls>0 branch on purpose: with nothing recorded there is nothing to clear,
               and a control that does nothing is worse than an absent one. Admin only, matching the server —
               clearing a usage record is bookkeeping rather than a knowledge write, but it is still an
               irreversible delete. -->
          @if (canEditSchema() && activity(); as act) {
            @if (act.calls > 0) {
              <div class="store-row" style="margin-top:12px;justify-content:flex-end;">
                <button class="btn btn-secondary btn-sm" type="button"
                        [disabled]="resettingUsage()"
                        [attr.title]="'brain.overview.useResetHint' | transloco"
                        (click)="requestUsageReset()">
                  @if (resettingUsage()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                  {{ 'brain.overview.useReset' | transloco }}
                </button>
                <!-- The outcome, beside the button. Afterwards the panel reads zero either way, so without this
                     the cleared count — which the route returns for exactly this reason — reaches nobody. -->
                @if (usageResetResult()) {
                  <span class="muted" style="margin-left:10px;font-size:12px;">{{ usageResetResult() }}</span>
                }
              </div>
            }
          }

          <!-- Storage: a SECTION of usage, not a card of its own. Disk consumed IS usage, and one number does
               not earn a card in a grid of panels. It sits OUTSIDE the activity branch above, so it renders
               whether or not anyone has ever called this space. -->
          <div class="store">
            <div class="store-row">
              <span class="cap">{{ 'brain.overview.storage' | transloco }}</span>
              @if (space().maxGiB) {
                <span class="num">{{ usageIsFloor() ? '≥ ' : '' }}{{ used() }} / {{ space().maxGiB }} GiB</span>
              } @else {
                <span class="num">{{ usageIsFloor() ? '≥ ' : '' }}{{ used() }} GiB · {{ 'brain.overview.storageUnlimited' | transloco }}</span>
              }
              <!-- The figure is a floor, and saying which paths could not be read is what an operator acts on.
                   A warning icon rather than a hidden number: the number is still the best available. -->
              @if (usageIsFloor()) {
                <span class="usage-floor" [title]="usageIncompleteReason()">
                  <ph-icon name="warning" [size]="14"></ph-icon>
                  {{ 'brain.overview.storageIncomplete' | transloco }}
                </span>
              }
            </div>
            @if (usagePct(); as pct) {
              <div class="bar"><span [class.warn]="pct >= 80 && pct < 95" [class.err]="pct >= 95" [style.width.%]="pct"></span></div>
            }
          </div>
        </div>
      </section>

      <!-- ── Completeness ───────────────────────────────────────────── -->
      @if (completeness(); as comp) {
        @if (comp.score !== null) {
          <section class="panel">
            <header class="panel-h">
              <span class="ic"><ph-icon name="check-circle" [size]="16"/></span>
              <div><h3>{{ 'brain.overview.compTitle' | transloco }}</h3>
                <p>{{ 'brain.overview.compHint' | transloco }}</p></div>
            </header>
            <div class="panel-b">
              <div class="comp-top">
                <span class="comp-score" [class.good]="comp.score >= 85" [class.mid]="comp.score >= 60 && comp.score < 85" [class.bad]="comp.score < 60">{{ comp.score }}%</span>
                <span class="comp-of">{{ 'brain.overview.comp.of' | transloco: { count: comp.checks.length } }}</span>
              </div>
              <div class="bar"><span [class.warn]="comp.score < 85" [class.err]="comp.score < 60" [style.width.%]="comp.score"></span></div>

              <!-- The deductions, heaviest first. The score never appears without them: a percentage
                   nobody can decompose is a number nobody can act on. -->
              @if (deductions().length) {
                <ul class="comp-list">
                  @for (c of deductions(); track c.id + c.scope) {
                    <li>
                      <ph-icon [name]="c.severity === 'warn' ? 'warning' : 'info'" [size]="14"
                               [class.warn-ic]="c.severity === 'warn'" [class.info-ic]="c.severity !== 'warn'"/>
                      <span class="comp-txt">
                        <span class="ct">{{ 'brain.overview.comp.check.' + c.id | transloco: { affected: c.affected, total: c.total, scope: ('brain.overview.comp.scope.' + c.scope | transloco) } }}</span>
                        @if (c.sample.length) { <span class="cs" [title]="c.sample.join(', ')">{{ c.sample.join(', ') }}</span> }
                      </span>
                      @if (c.targetTab; as tab) {
                        <button type="button" class="comp-go" (click)="openTab.emit(tab)">{{ 'brain.overview.comp.go' | transloco }}</button>
                      }
                    </li>
                  }
                </ul>
              } @else {
                <div class="comp-clear"><ph-icon name="check-circle" [size]="15"/>{{ 'brain.overview.comp.clear' | transloco }}</div>
              }

              @if (comp.truncated) {
                <div class="muted" style="margin-top:10px;">{{ 'brain.overview.comp.truncated' | transloco }}</div>
              }
            </div>
          </section>
        }
      } @else if (pending().completeness) {
        <section class="panel" [attr.aria-busy]="true">
          <header class="panel-h">
            <span class="ic"><ph-icon name="check-circle" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.compTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.compHint' | transloco }}</p></div>
          </header>
          <div class="panel-b"><app-skeleton-lines [rows]="4" /></div>
        </section>
      }

      <!-- ── Indexing ───────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="database" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.indexingTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.indexingHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          <div class="idx-row">
            <span class="lab">{{ 'brain.overview.vectorIndex' | transloco }}</span>
            <app-status-pill [variant]="indexVariant()" [dot]="true">{{ 'brain.overview.idx.' + indexState() | transloco }}</app-status-pill>
          </div>

          @if (needsReindex() && !isProxy()) {
            <div class="reindex-note">
              <ph-icon name="warning" [size]="15"/>
              <span>{{ 'brain.overview.reindexNeeded' | transloco }}</span>
            </div>
          }
          @if (isProxy()) {
            <!-- Said rather than left blank: a card whose action silently vanishes reads as broken, and the
                 remedy (reindex the members) is not guessable from an absent button. -->
            <div class="reindex-note">
              <ph-icon name="info" [size]="15"/>
              <span>{{ 'brain.overview.reindexProxy' | transloco }}</span>
            </div>
          }

          <!-- Retention belongs on this card: both answers here are about the lifecycle of what is stored,
               and "why did that record disappear?" is asked far more often than it is answered. Read-only —
               it is set in the Danger Zone (space-wide) and on the type in the Schema tab, and duplicating an
               editor is how the two drift. -->
          <div class="retention">
            <div class="idx-row">
              <span class="lab">{{ 'brain.overview.retentionTitle' | transloco }}</span>
            </div>
            <p class="ret-line">{{ retentionSummary() }}</p>
            @if (retentionTypes().length) {
              <ul class="ret-types">
                @for (r of retentionTypes(); track r.key) { <li>{{ r.label }}</li> }
              </ul>
            }
            <p class="muted ret-edit">{{ 'brain.overview.retentionEdit' | transloco }}</p>
          </div>

          <!-- Not offered on a proxy at all. The server has refused it since the double-embed fix -- a proxy
               has no index of its own, and reindexing one re-embedded every member a second time -- so the
               button could only ever produce a 400. -->
          @if (!isProxy()) {
            <div class="actions">
              <button class="btn btn-sm btn-secondary" type="button" [disabled]="reindexing()" (click)="requestReindex()">
                @if (reindexing()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:5px;vertical-align:-2px;"/>{{ 'brain.overview.reindexButton' | transloco }}
              </button>
            </div>
          }
        </div>
      </section>

      <!-- ── Embedding queue ────────────────────────────────────────── -->
      @if (embeddingQueue(); as q) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="stack" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.queueTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.queueHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            <div class="stat-grid">
              <div class="stat"><div class="v">{{ q.pending }}</div><div class="l">{{ 'brain.overview.queue.pending' | transloco }}</div></div>
              <div class="stat"><div class="v">{{ q.processing }}</div><div class="l">{{ 'brain.overview.queue.processing' | transloco }}</div></div>
              <div class="stat" [class.err-stat]="q.failed > 0"><div class="v">{{ q.failed }}</div><div class="l">{{ 'brain.overview.queue.failed' | transloco }}</div></div>
            </div>
            @if (q.failed === 0 && q.pending === 0 && q.processing === 0) {
              <div class="muted" style="margin-top:12px;">{{ 'brain.overview.queue.idle' | transloco }}</div>
            }
            <!-- Reasons first, and only when they add something. Five paths answer "which file"; the
                 grouping answers "why", over EVERY failure rather than the arbitrary first five — which is
                 the difference between one dead endpoint and forty unrelated problems. Hidden when there is
                 a single reason, because then the list below already says it. -->
            @if (failureReasons().length > 1) {
              <ul class="fail-reasons">
                @for (r of failureReasons(); track r.reason) {
                  <li>
                    <span class="rc">{{ r.count }}</span>
                    <span class="re" [title]="r.reason">{{ r.reason || ('brain.overview.queue.unknownError' | transloco) }}</span>
                  </li>
                }
              </ul>
            }
            @if (q.failedSample.length) {
              <ul class="fail-list">
                @for (f of q.failedSample; track f.path) {
                  <li><span class="fp" [title]="f.path">{{ f.path }}</span><span class="fe" [title]="f.lastError">{{ f.lastError || ('brain.overview.queue.unknownError' | transloco) }}</span></li>
                }
              </ul>
              @if (q.failed > q.failedSample.length) {
                <p class="muted fail-more">{{ 'brain.overview.queue.failedMore' | transloco: { shown: q.failedSample.length, total: q.failed } }}</p>
              }
            }
            @if (q.failed > 0) {
              <button class="btn btn-sm btn-secondary retry-failed-btn" type="button" style="margin-top:12px;" (click)="requestRetryFailed()">
                <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:5px;vertical-align:-2px;"/>{{ 'brain.overview.queue.retryFailed' | transloco }}
              </button>
            }
          </div>
        </section>
      } @else if (pending().queue) {
        <section class="panel" [attr.aria-busy]="true">
          <header class="panel-h">
            <span class="ic"><ph-icon name="stack" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.queueTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.queueHint' | transloco }}</p></div>
          </header>
          <div class="panel-b"><app-skeleton-lines [rows]="3" /></div>
        </section>
      }

      <!-- ── Governance (open votes) ────────────────────────────────── -->
      @if (openVotes().length) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="broadcast" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.govTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.govHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            <ul class="vote-list">
              @for (v of openVotes(); track v.id) {
                <li>
                  <div class="vote-top"><span class="vs" [title]="v.subject">{{ v.subject }}</span><span class="vt">{{ v.type }}</span></div>
                  <div class="vote-meta">
                    <span>{{ 'brain.overview.gov.deadline' | transloco }}: {{ v.deadline | date:'dd.MM.yyyy HH:mm' }}</span>
                    <span class="tally">{{ tallyYes(v) }} {{ 'brain.overview.gov.yes' | transloco }} · {{ tallyVeto(v) }} {{ 'brain.overview.gov.veto' | transloco }}</span>
                  </div>
                </li>
              }
            </ul>
            <a class="btn btn-sm btn-secondary" routerLink="/settings/networks" style="margin-top:12px; display:inline-flex; align-items:center; gap:5px;">
              <ph-icon name="broadcast" [size]="14"/> {{ 'brain.overview.gov.review' | transloco }}
            </a>
          </div>
        </section>
      }

      <!-- ── Networks ───────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="link" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.networksTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.networksHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          @if (networks().length) {
            <div class="idx-row" style="margin-bottom:11px;">
              <span class="lab">{{ 'brain.overview.syncStatus' | transloco }}</span>
              <app-status-pill [variant]="netVariant()" [dot]="true">{{ 'brain.overview.net.' + netStatus() | transloco }}</app-status-pill>
            </div>
            <ul class="net-list">
              @for (n of networks(); track n.id) {
                <li><ph-icon name="link" [size]="13"/><span class="nl">{{ n.label }}</span><span class="nt">{{ n.type }}</span></li>
              }
            </ul>
          } @else {
            <span class="muted">{{ 'brain.overview.noNetworks' | transloco }}</span>
          }
        </div>
      </section>

      <!-- The Instance card is gone (owner, 2026-08-08): instance label, version, id, uptime and Mongo
           version are properties of the INSTANCE, not of the space being looked at, and every one of them
           is already on the About page. A space overview that answers "which build am I on?" invites the
           reader to think it is telling them something about this space. -->

      <!-- ── Token access (admin-only; null for non-admins → hidden) ──── -->
      @if (tokenAccess(); as toks) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="key" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.tokenTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.tokenHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            @if (toks.length) {
              <ul class="tok-list">
                @for (t of toks; track t.name) {
                  <li>
                    <span class="lvl" [class.admin]="t.level === 'admin'" [class.full]="t.level === 'full'" [class.readOnly]="t.level === 'readOnly'">{{ 'brain.overview.tok.' + t.level | transloco }}</span>
                    <span class="tn">{{ t.name }}</span>
                    @if (t.peer) { <span class="tx">{{ 'brain.overview.tok.peer' | transloco }}</span> }
                    @if (t.allSpaces) { <span class="tx">{{ 'brain.overview.tok.allSpaces' | transloco }}</span> }
                    @if (t.expiresAt) { <span class="tx">{{ 'brain.overview.tok.expires' | transloco: { date: (t.expiresAt | date:'mediumDate') } }}</span> }
                  </li>
                }
              </ul>
            } @else {
              <div class="muted">{{ 'brain.overview.tok.none' | transloco }}</div>
            }
          </div>
        </section>
      } @else if (pending().tokens) {
        <section class="panel" [attr.aria-busy]="true">
          <header class="panel-h">
            <span class="ic"><ph-icon name="key" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.tokenTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.tokenHint' | transloco }}</p></div>
          </header>
          <div class="panel-b"><app-skeleton-lines [rows]="3" /></div>
        </section>
      }
    </div>
  `, styles: ["\n    :host { display: block; }\n\n    /* Deterministic column count instead of auto-fit: auto-fit re-flowed at every viewport width and\n       regularly orphaned a card on a row of its own, which is what made the board look arbitrary.\n       Cards STRETCH to their row height (no align-items:start), so every card in a row ends level. */\n    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }\n    @media (min-width: 820px)  { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }\n    @media (min-width: 1280px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }\n\n    /* The summary spans the full row \u2014 it is the heaviest card (six tiles + the storage bar) and\n       reads as the page's headline rather than one tile among equals. */\n    .panel.span-all { grid-column: 1 / -1; }\n\n    /* A card is a column: header, then a body that FILLS the stretched height. Without the filling\n       body a short card's content floats against a tall border box. */\n    .panel { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;\n      display: flex; flex-direction: column; }\n    .panel-h { display: flex; align-items: center; gap: 9px; padding: 13px 16px;\n      border-bottom: 1px solid var(--border-muted); }\n    .panel-h .ic { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .panel-h h3 { margin: 0; font-size: 14px; font-weight: 620; }\n    /* Every hint RESERVES two lines and clamps to two, so a card whose hint wraps and one whose hint\n       fits on a single line still put their divider rule at the same height. Reserving (rather than\n       truncating to one line) keeps the full hint readable \u2014 the alignment costs a little whitespace,\n       not information. em-based, so it survives a font-size change; no magic total-height number. */\n    .panel-h p { margin: 1px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.35;\n      min-height: calc(2 * 1.35em);\n      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n    .panel-b { padding: 14px 16px; flex: 1; }\n\n    /* Default tile grid: the embedding-queue card's three counters, in a normal-width card. NOTE the\n       breakpoints below are VIEWPORT-based, so they must not be allowed to reach this card \u2014 six\n       columns inside a one-third-width card squeezes the labels to nothing. Hence the .span-all scope. */\n    .stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n    /* The summary's six tiles (five collections + total) across the full-width card. */\n    .span-all .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n    @media (min-width: 560px)  { .span-all .stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }\n    @media (min-width: 1000px) { .span-all .stat-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }\n    .stat { background: var(--bg-elevated); border: 1px solid var(--border-muted); border-radius: 8px; padding: 11px 12px; }\n    .stat .v { font-size: 22px; font-weight: 700; font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; line-height: 1.1; }\n    .stat .l { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); }\n    /* The five collection tiles are buttons now. Reset the UA button styling so they still read as\n       tiles, and give them a real affordance \u2014 a clickable thing that looks inert gets clicked by\n       nobody. The total tile stays a div: it has no single tab to open. */\n    .stat-link { font: inherit; color: inherit; text-align: left; width: 100%; cursor: pointer;\n      transition: border-color var(--transition), background var(--transition); }\n    .stat-link:hover { border-color: var(--accent); background: var(--bg-surface); }\n    .stat-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .stat.total { border-color: color-mix(in srgb, var(--accent) 45%, transparent);\n      background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated)); }\n    .stat.total .v { color: var(--accent-ink, var(--accent)); }\n\n    .store { margin-top: 14px; }\n    .store-row { display: flex; align-items: baseline; justify-content: space-between; font-size: 12.5px; }\n    .store-row .cap { color: var(--text-secondary); }\n    .store-row .num { font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; color: var(--text-primary); }\n    /* A qualified figure, not an error state: the number is still the best available, and the icon is what\n       says it is a lower bound. Sits on its own line when the row runs out of width rather than pushing the\n       number out of view. */\n    .store-row .usage-floor { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;\n      color: var(--warn, #b26a00); font-size: 11.5px; white-space: nowrap; cursor: help; }\n    .bar { height: 7px; border-radius: 4px; background: var(--bg-elevated); margin-top: 7px; overflow: hidden; border: 1px solid var(--border-muted); }\n    .bar > span { display: block; height: 100%; border-radius: 4px; background: var(--accent); }\n    .bar > span.warn { background: var(--warning); } .bar > span.err { background: var(--error); }\n\n    .idx-row { display: flex; align-items: center; gap: 10px; }\n    .idx-row .lab { font-size: 13px; color: var(--text-secondary); flex: 1; }\n    .reindex-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 13px; padding: 10px 12px;\n      border-radius: 8px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }\n    .reindex-note ph-icon { flex: none; margin-top: 1px; color: var(--warning); }\n    .actions { margin-top: 13px; }\n    .retention { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-muted); }\n    .ret-line { margin: 4px 0 0; font-size: 12.5px; color: var(--text-primary); }\n    .ret-types { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px;\n      font-size: 11.5px; color: var(--text-secondary); }\n    .ret-edit { margin: 7px 0 0; font-size: 11px; }\n    .muted { color: var(--text-muted); font-size: 12.5px; }\n\n    .net-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }\n    .net-list li { display: flex; align-items: center; gap: 8px; font-size: 13px; }\n    .net-list ph-icon { color: var(--text-muted); flex: none; }\n    .net-list .nl { flex: 1; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .net-list .nt { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono, monospace); }\n\n    .kv { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 12.5px; margin: 0; }\n    .kv dt { color: var(--text-secondary); white-space: nowrap; }\n    .kv dd { margin: 0; color: var(--text-primary); text-align: right; }\n    .kv dd.mono { font-family: var(--font-mono, monospace); font-size: 11px; word-break: break-all; }\n\n    .stat.err-stat { border-color: color-mix(in srgb, var(--error) 45%, transparent); background: color-mix(in srgb, var(--error) 10%, var(--bg-elevated)); }\n    .stat.err-stat .v { color: var(--error); }\n    .fail-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }\n    .fail-list li { display: flex; flex-direction: column; gap: 1px; font-size: 11.5px; border-top: 1px solid var(--border-muted); padding-top: 6px; }\n    .fail-list .fp { font-family: var(--font-mono, monospace); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .fail-list .fe { color: var(--error); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    /* Reasons read as a count-first tally, deliberately unlike the path list below it: the eye should land on\n       \"38\" before the message, because the number is the diagnosis. */\n    .fail-reasons { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }\n    .fail-reasons li { display: flex; align-items: baseline; gap: 8px; font-size: 11.5px; }\n    .fail-reasons .rc { font-family: var(--font-mono, monospace); font-weight: 650; color: var(--error); min-width: 2.5ch; text-align: right; flex: none; }\n    .fail-reasons .re { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .fail-more { font-size: 11px; margin: 6px 0 0; }\n\n    .vote-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }\n    .vote-list li { border: 1px solid var(--border-muted); border-radius: 8px; padding: 9px 11px; background: var(--bg-elevated); }\n    .vote-top { display: flex; align-items: baseline; gap: 8px; }\n    .vote-top .vs { flex: 1; font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .vote-top .vt { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono, monospace); }\n    .vote-meta { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); flex-wrap: wrap; }\n    .vote-meta .tally { font-variant-numeric: tabular-nums; }\n    .tok-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }\n    .tok-list li { display: flex; align-items: center; gap: 8px; font-size: 13px; }\n    .tok-list .tn { flex: 1; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .tok-list .tx { font-size: 11px; color: var(--text-muted); white-space: nowrap; }\n    .lvl { font-size: 10.5px; font-weight: 620; padding: 1px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; flex: none; }\n    .lvl.admin { background: color-mix(in srgb, var(--error) 16%, transparent); color: var(--error); }\n\n    /* Rows are as tall as their tallest card, so an unbounded list (many tokens, many peers) used to\n       stretch every sibling with it. Cap the lists and let the long ones scroll in place. */\n    .net-list, .vote-list, .tok-list, .fail-list { max-height: 216px; overflow-y: auto; }\n    .lvl.full { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }\n    .lvl.readOnly { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-secondary); }\n\n    /* Completeness. The score sits beside its deductions, never alone: a number on its own is the one\n       thing this panel must not be. Same bar primitive as storage \u2014 no new visual language. */\n    .comp-top { display: flex; align-items: baseline; gap: 10px; }\n    .comp-score { font-size: 30px; font-weight: 700; font-family: var(--font-mono, monospace);\n      font-variant-numeric: tabular-nums; line-height: 1; }\n    .comp-score.good { color: var(--success); } .comp-score.mid { color: var(--warning); } .comp-score.bad { color: var(--error); }\n    .comp-of { font-size: 12.5px; color: var(--text-secondary); }\n    .comp-list { list-style: none; margin: 13px 0 0; padding: 0; display: flex; flex-direction: column; gap: 7px; max-height: 216px; overflow-y: auto; }\n    .comp-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px;\n      border-top: 1px solid var(--border-muted); padding-top: 7px; }\n    .comp-list ph-icon { flex: none; margin-top: 2px; }\n    .comp-list .warn-ic { color: var(--warning); } .comp-list .info-ic { color: var(--text-muted); }\n    .comp-txt { flex: 1; min-width: 0; }\n    .comp-txt .ct { color: var(--text-primary); }\n    .comp-txt .cs { display: block; color: var(--text-muted); font-size: 11px; font-family: var(--font-mono, monospace);\n      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .comp-go { font: inherit; font-size: 11.5px; background: none; border: 0; color: var(--accent); cursor: pointer;\n      padding: 0; flex: none; text-decoration: underline; }\n    .comp-go:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .comp-clear { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--success); margin-top: 13px; }\n  "] }]
    }], null, { space: [{ type: i0.Input, args: [{ isSignal: true, alias: "space", required: true }] }], canEditSchema: [{ type: i0.Input, args: [{ isSignal: true, alias: "canEditSchema", required: false }] }], resettingUsage: [{ type: i0.Input, args: [{ isSignal: true, alias: "resettingUsage", required: false }] }], usageResetResult: [{ type: i0.Input, args: [{ isSignal: true, alias: "usageResetResult", required: false }] }], resetUsage: [{ type: i0.Output, args: ["resetUsage"] }], editSchemaType: [{ type: i0.Output, args: ["editSchemaType"] }], stats: [{ type: i0.Input, args: [{ isSignal: true, alias: "stats", required: false }] }], reindexing: [{ type: i0.Input, args: [{ isSignal: true, alias: "reindexing", required: false }] }], needsReindex: [{ type: i0.Input, args: [{ isSignal: true, alias: "needsReindex", required: false }] }], about: [{ type: i0.Input, args: [{ isSignal: true, alias: "about", required: false }] }], embeddingQueue: [{ type: i0.Input, args: [{ isSignal: true, alias: "embeddingQueue", required: false }] }], openVotes: [{ type: i0.Input, args: [{ isSignal: true, alias: "openVotes", required: false }] }], tokenAccess: [{ type: i0.Input, args: [{ isSignal: true, alias: "tokenAccess", required: false }] }], completeness: [{ type: i0.Input, args: [{ isSignal: true, alias: "completeness", required: false }] }], activity: [{ type: i0.Input, args: [{ isSignal: true, alias: "activity", required: false }] }], pending: [{ type: i0.Input, args: [{ isSignal: true, alias: "pending", required: false }] }], openTab: [{ type: i0.Output, args: ["openTab"] }], reindex: [{ type: i0.Output, args: ["reindex"] }], retryFailed: [{ type: i0.Output, args: ["retryFailed"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(OverviewTabComponent, { className: "OverviewTabComponent", filePath: "app/pages/brain/overview-tab.component.ts", lineNumber: 605 }); })();
