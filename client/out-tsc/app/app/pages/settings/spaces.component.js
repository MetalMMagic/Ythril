import { ChangeDetectionStrategy, Component, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProxySpaceBadgeComponent } from '../../shared/proxy-space-badge.component';
import { FormsModule } from '@angular/forms';
import { NetworksApi } from '../../core/networks-api.service';
import { SchemaApi } from '../../core/schema-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { ModalDirective } from '../../shared/modal.directive';
import { SpaceCreateDialogComponent } from './space-create-dialog.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { StatusPillComponent } from '../../shared/status-pill.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/cdk/drag-drop";
const SpacesComponent_Conditional_1_Defer_1_DepsFn = () => [import("./space-settings-popup.component").then(m => m.SpaceSettingsPopupComponent)];
const _forTrack0 = ($index, $item) => $item.id;
function SpacesComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-space-create-dialog", 13);
    i0.ɵɵlistener("closed", function SpacesComponent_Conditional_0_Template_app_space_create_dialog_closed_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showCreateDialog.set(false)); });
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_1_Defer_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-space-settings-popup");
} }
function SpacesComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomTemplate(0, SpacesComponent_Conditional_1_Defer_0_Template, 1, 0);
    i0.ɵɵdefer(1, 0, SpacesComponent_Conditional_1_Defer_1_DepsFn);
    i0.ɵɵdeferOnImmediate();
} }
function SpacesComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-summary-strip", 0);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("items", ctx_r1.spacesSummary());
} }
function SpacesComponent_Conditional_42_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵelement(1, "span", 14);
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "span");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "button", 15);
    i0.ɵɵlistener("click", function SpacesComponent_Conditional_43_Template_button_click_4_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.store.load()); });
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "spaces.table.loadError"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 4, "spaces.table.refreshButton"));
} }
function SpacesComponent_Conditional_44_For_26_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 22);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵelement(2, "span", 30);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "spaces.indexBuildingTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 4, "spaces.indexBuilding"));
} }
function SpacesComponent_Conditional_44_For_26_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 23);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "spaces.indexFailedTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "spaces.indexFailed"));
} }
function SpacesComponent_Conditional_44_For_26_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31);
    i0.ɵɵelement(1, "div");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "div", 32);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵnextContext();
    const bar_r7 = i0.ɵɵreadContextLet(0);
    i0.ɵɵadvance();
    i0.ɵɵclassMap("st-bar-fill " + bar_r7.cls);
    i0.ɵɵstyleProp("width", bar_r7.pct, "%");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(bar_r7.label);
} }
function SpacesComponent_Conditional_44_For_26_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 26);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_44_For_26_Conditional_18_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 36);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const rate_r8 = ctx;
    i0.ɵɵnextContext(2);
    const use_r9 = i0.ɵɵreadContextLet(17);
    i0.ɵɵclassProp("badge-green", rate_r8 >= 50)("badge-yellow", rate_r8 < 50 && rate_r8 >= 20)("badge-red", rate_r8 < 20);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 8, "spaces.table.usageAnsweredTitle") + " " + use_r9.answered + "/" + use_r9.recall);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", rate_r8, "%");
} }
function SpacesComponent_Conditional_44_For_26_Conditional_18_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 35);
    i0.ɵɵtext(1, "0%");
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_44_For_26_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 33);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(2, SpacesComponent_Conditional_44_For_26_Conditional_18_Conditional_2_Template, 3, 10, "span", 34)(3, SpacesComponent_Conditional_44_For_26_Conditional_18_Conditional_3_Template, 2, 0, "span", 35);
} if (rf & 2) {
    let tmp_16_0;
    i0.ɵɵnextContext();
    const use_r9 = i0.ɵɵreadContextLet(17);
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(use_r9.calls);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_16_0 = ctx_r1.answerRate(use_r9)) ? 2 : use_r9.recall > 0 ? 3 : -1, tmp_16_0);
} }
function SpacesComponent_Conditional_44_For_26_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 26);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_44_For_26_Conditional_22_For_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 37);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const n_r10 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(n_r10.label);
} }
function SpacesComponent_Conditional_44_For_26_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵrepeaterCreate(0, SpacesComponent_Conditional_44_For_26_Conditional_22_For_1_Template, 2, 1, "span", 37, _forTrack0);
} if (rf & 2) {
    i0.ɵɵnextContext();
    const nets_r11 = i0.ɵɵreadContextLet(21);
    i0.ɵɵrepeater(nets_r11);
} }
function SpacesComponent_Conditional_44_For_26_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 26);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_44_For_26_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-proxy-space-badge", 38);
    i0.ɵɵelementStart(1, "span", 39);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r12 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("proxyFor", s_r12.proxyFor)("size", 14)("showLabel", true);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "spaces.badge.allSpaces"));
} }
function SpacesComponent_Conditional_44_For_26_Conditional_26_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 41);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const pid_r13 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(pid_r13);
} }
function SpacesComponent_Conditional_44_For_26_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-proxy-space-badge", 40);
    i0.ɵɵrepeaterCreate(1, SpacesComponent_Conditional_44_For_26_Conditional_26_For_2_Template, 2, 1, "span", 41, i0.ɵɵrepeaterTrackByIdentity);
} if (rf & 2) {
    const s_r12 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("proxyFor", s_r12.proxyFor)("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(s_r12.proxyFor);
} }
function SpacesComponent_Conditional_44_For_26_Conditional_27_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 26);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function SpacesComponent_Conditional_44_For_26_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵdeclareLet(0);
    i0.ɵɵelementStart(1, "tr", 18)(2, "td")(3, "span", 19);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelement(5, "ph-icon", 20);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "td", 21);
    i0.ɵɵtext(7);
    i0.ɵɵconditionalCreate(8, SpacesComponent_Conditional_44_For_26_Conditional_8_Template, 5, 6, "span", 22)(9, SpacesComponent_Conditional_44_For_26_Conditional_9_Template, 4, 6, "span", 23);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "td")(11, "span", 24);
    i0.ɵɵtext(12);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(13, "td", 25);
    i0.ɵɵconditionalCreate(14, SpacesComponent_Conditional_44_For_26_Conditional_14_Template, 4, 5)(15, SpacesComponent_Conditional_44_For_26_Conditional_15_Template, 2, 0, "span", 26);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "td", 27);
    i0.ɵɵdeclareLet(17);
    i0.ɵɵconditionalCreate(18, SpacesComponent_Conditional_44_For_26_Conditional_18_Template, 4, 2)(19, SpacesComponent_Conditional_44_For_26_Conditional_19_Template, 2, 0, "span", 26);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "td");
    i0.ɵɵdeclareLet(21);
    i0.ɵɵconditionalCreate(22, SpacesComponent_Conditional_44_For_26_Conditional_22_Template, 2, 0)(23, SpacesComponent_Conditional_44_For_26_Conditional_23_Template, 2, 0, "span", 26);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "td");
    i0.ɵɵconditionalCreate(25, SpacesComponent_Conditional_44_For_26_Conditional_25_Template, 4, 6)(26, SpacesComponent_Conditional_44_For_26_Conditional_26_Template, 3, 2)(27, SpacesComponent_Conditional_44_For_26_Conditional_27_Template, 2, 0, "span", 26);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "td")(29, "button", 28);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵlistener("click", function SpacesComponent_Conditional_44_For_26_Template_button_click_29_listener() { const s_r12 = i0.ɵɵrestoreView(_r6).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.state.openSettings(s_r12)); });
    i0.ɵɵelement(31, "ph-icon", 29);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const s_r12 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    const bar_r14 = i0.ɵɵstoreLet(ctx_r1.storageInfo(s_r12));
    i0.ɵɵadvance();
    i0.ɵɵproperty("cdkDragDisabled", ctx_r1.sortMode() !== "custom");
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("drag-handle-disabled", ctx_r1.sortMode() !== "custom");
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(4, 15, "spaces.table.dragHandleTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", s_r12.label, " ");
    i0.ɵɵadvance();
    i0.ɵɵconditional(s_r12.indexStatus === "building" ? 8 : s_r12.indexStatus === "failed" ? 9 : -1);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(s_r12.id);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(bar_r14.label !== "\u2014" ? 14 : 15);
    i0.ɵɵadvance(3);
    const use_r15 = i0.ɵɵstoreLet(ctx_r1.activityFor(s_r12.id));
    i0.ɵɵadvance();
    i0.ɵɵconditional(use_r15 ? 18 : 19);
    i0.ɵɵadvance(3);
    const nets_r16 = i0.ɵɵstoreLet(ctx_r1.store.networksForSpace(s_r12.id));
    i0.ɵɵadvance();
    i0.ɵɵconditional(nets_r16.length ? 22 : 23);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional((s_r12.proxyFor == null ? null : s_r12.proxyFor[0]) === "*" ? 25 : (s_r12.proxyFor == null ? null : s_r12.proxyFor.length) ? 26 : 27);
    i0.ɵɵadvance(4);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(30, 19, "spaces.table.configureTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
} }
function SpacesComponent_Conditional_44_ForEmpty_27_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 42)(2, "div", 43)(3, "div", 44);
    i0.ɵɵelement(4, "ph-icon", 45);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "p");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "button", 46);
    i0.ɵɵlistener("click", function SpacesComponent_Conditional_44_ForEmpty_27_Template_button_click_11_listener() { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.showCreateDialog.set(true)); });
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    i0.ɵɵadvance(4);
    i0.ɵɵproperty("size", 40);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 4, "spaces.table.empty"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 6, "spaces.table.emptyBody"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 8, "spaces.table.createButton"));
} }
function SpacesComponent_Conditional_44_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 12)(1, "table")(2, "thead")(3, "tr");
    i0.ɵɵelement(4, "th", 16);
    i0.ɵɵelementStart(5, "th");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "th");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "th");
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "th");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "th");
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "th");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(23, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "tbody", 17);
    i0.ɵɵlistener("cdkDropListDropped", function SpacesComponent_Conditional_44_Template_tbody_cdkDropListDropped_24_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.store.reorder($event.previousIndex, $event.currentIndex)); });
    i0.ɵɵrepeaterCreate(25, SpacesComponent_Conditional_44_For_26_Template, 32, 21, "tr", 18, _forTrack0, false, SpacesComponent_Conditional_44_ForEmpty_27_Template, 14, 10, "tr");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 7, "spaces.table.column.label"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 9, "spaces.table.column.id"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 11, "spaces.table.column.storage"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 13, "spaces.table.column.usage"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 15, "spaces.table.column.networks"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 17, "spaces.table.column.proxy"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r1.sortedSpaces());
} }
export class SpacesComponent {
    constructor() {
        this.networksApi = inject(NetworksApi);
        this.schemaApi = inject(SchemaApi);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        /** Settings-dialog state, shared with the tabs. Public: the template binds to it. */
        this.state = inject(SpaceSettingsState);
        /** Server data for the page (space list + networks). Public: the template binds to it. */
        this.store = inject(SpacesStore);
        /** Operator-first rollup atop the list: how many spaces, total storage in use, and how many need attention. */
        this.spacesSummary = computed(() => {
            const list = this.store.spaces();
            const totalUsed = list.reduce((n, s) => n + (s.usageGiB ?? 0), 0);
            const attention = list.filter(s => s.indexStatus === 'building' || s.indexStatus === 'failed').length;
            return [
                { label: this.transloco.translate('spaces.summary.count'), value: String(list.length) },
                { label: this.transloco.translate('spaces.summary.storage'), value: `${totalUsed.toFixed(totalUsed < 10 ? 2 : 1)} GiB` },
                { label: this.transloco.translate('spaces.summary.indexing'), value: String(attention), variant: attention ? 'warn' : 'ok' },
            ];
        }, ...(ngDevMode ? [{ debugName: "spacesSummary" }] : /* istanbul ignore next */ []));
        /**
         * Usage per space id, over the last 7 days, from ONE request.
         *
         * A week, not a day: usefulness is a question about a habit, and a space queried every Monday reads as dead
         * in a 24-hour window. Empty until it lands, and empty forever for a non-admin — the column then shows an em
         * dash rather than an error, because a missing comparison is not a broken page.
         */
        this.activity = signal(new Map(), ...(ngDevMode ? [{ debugName: "activity" }] : /* istanbul ignore next */ []));
        this.spaceSearch = signal('', ...(ngDevMode ? [{ debugName: "spaceSearch" }] : /* istanbul ignore next */ []));
        this.sortMode = signal('custom', ...(ngDevMode ? [{ debugName: "sortMode" }] : /* istanbul ignore next */ []));
        this.sortedSpaces = computed(() => {
            const list = this.store.spaces();
            const sorted = (() => {
                switch (this.sortMode()) {
                    case 'az': return [...list].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
                    case 'za': return [...list].sort((a, b) => b.label.localeCompare(a.label, undefined, { sensitivity: 'base' }));
                    case 'usage-desc': return [...list].sort((a, b) => (b.usageGiB ?? 0) - (a.usageGiB ?? 0));
                    case 'usage-asc': return [...list].sort((a, b) => (a.usageGiB ?? 0) - (b.usageGiB ?? 0));
                    // Busiest first — demand, which is only half the answer, so the column shows the rate beside it.
                    case 'calls-desc': return [...list].sort((a, b) => (this.activityFor(b.id)?.calls ?? 0) - (this.activityFor(a.id)?.calls ?? 0));
                    // WORST answer rate first, and only among spaces that were actually asked something. This is the
                    // ordering that finds a content gap: a space fielding questions and returning nothing. A space nobody
                    // queries has no rate at all and sorts last rather than looking like the worst offender.
                    case 'answers-asc': return [...list].sort((a, b) => {
                        const ra = this.answerRate(this.activityFor(a.id));
                        const rb = this.answerRate(this.activityFor(b.id));
                        if (ra === null && rb === null)
                            return 0;
                        if (ra === null)
                            return 1;
                        if (rb === null)
                            return -1;
                        return ra - rb;
                    });
                    default: return list;
                }
            })();
            const q = this.spaceSearch().trim().toLowerCase();
            if (!q)
                return sorted;
            // Purpose, not the deprecated `description` alias: it is the field the settings dialog edits, so
            // it is the text an operator remembers writing and would search for.
            return sorted.filter(s => s.label.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q) ||
                (s.meta?.purpose ?? '').toLowerCase().includes(q));
        }, ...(ngDevMode ? [{ debugName: "sortedSpaces" }] : /* istanbul ignore next */ []));
        this.showCreateDialog = signal(false, ...(ngDevMode ? [{ debugName: "showCreateDialog" }] : /* istanbul ignore next */ []));
    }
    activityFor(spaceId) {
        return this.activity().get(spaceId);
    }
    /** Answered recalls as a percentage, or null when the space was never asked anything — see the sort. */
    answerRate(use) {
        if (!use || use.recall === 0)
            return null;
        return Math.round((use.answered / use.recall) * 100);
    }
    /** Tracks the kt/typeName target for per-type import. */
    ngOnInit() {
        this.store.load();
        this.loadActivity();
    }
    /**
     * One request for every space's usage. Admin-only server-side, so a non-admin simply gets nothing and the
     * column shows an em dash — a missing comparison is not a broken page, and an error toast for a panel nobody
     * asked to see would be worse than silence.
     */
    loadActivity() {
        this.spacesApi.listSpaceActivity(7 * 24).subscribe({
            next: r => this.activity.set(new Map((r.spaces ?? []).map(a => [a.space, a]))),
            error: () => this.activity.set(new Map()),
        });
    }
    storageInfo(s) {
        const used = s.usageGiB ?? 0;
        const max = s.maxGiB;
        if (!max && !used)
            return { pct: 0, label: '—', cls: 'ok' };
        if (!max)
            return { pct: 0, label: this.fmtGiB(used), cls: 'ok' };
        const pct = Math.min(100, Math.round(used / max * 100));
        return { pct, label: `${this.fmtGiB(used)} / ${max} GiB`, cls: pct > 90 ? 'danger' : pct > 70 ? 'warn' : 'ok' };
    }
    fmtGiB(gib) {
        if (gib < 0.001)
            return `${Math.round(gib * 1024)} MB`;
        return `${gib.toFixed(2)} GiB`;
    }
    // ── Unsaved-changes guard (U4) ─────────────────────────────────────────────
    /** CanDeactivate hook: block leaving the Spaces route while the editor has unsaved edits. */
    canLeave() {
        // The prompt lives on the service now: the pop-up's (X) needs the identical question, and two
        // copies of "are you sure you want to lose these edits" is two places for the answer to drift.
        // This hook stays here — a modal openable from two pages must not own either page's guard.
        return this.state.confirmDiscardIfDirty();
    }
    /** Native prompt on reload/tab-close while dirty — EventSource-style dialogs aren't allowed here. */
    onBeforeUnload(e) {
        if (this.state.isDirty()) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
    static { this.ɵfac = function SpacesComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpacesComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpacesComponent, selectors: [["app-spaces"]], hostBindings: function SpacesComponent_HostBindings(rf, ctx) { if (rf & 1) {
            i0.ɵɵlistener("beforeunload", function SpacesComponent_beforeunload_HostBindingHandler($event) { return ctx.onBeforeUnload($event); }, i0.ɵɵresolveWindow);
        } }, features: [i0.ɵɵProvidersFeature([SpacesStore, SpaceSettingsState])], decls: 45, vars: 68, consts: [[2, "display", "block", "margin-bottom", "16px", 3, "items"], [1, "card"], [1, "card-header"], [1, "card-title"], [2, "display", "flex", "gap", "8px", "align-items", "center", "flex-wrap", "wrap"], ["type", "search", 1, "space-search-input", 3, "input", "value", "placeholder"], [1, "sort-group"], [1, "sort-btn", 3, "click"], [1, "btn-primary", "btn", "btn-sm", 3, "click"], [1, "btn-secondary", "btn", "btn-sm", 3, "click"], [1, "loading-overlay"], [1, "alert", "alert-error", 2, "margin", "16px", "display", "flex", "gap", "10px", "align-items", "center", "justify-content", "space-between", "flex-wrap", "wrap"], ["hscrollTop", "", 1, "table-wrapper"], [3, "closed"], [1, "spinner"], [1, "btn", "btn-secondary", "btn-sm", 3, "click"], [2, "width", "32px"], ["cdkDropList", "", 3, "cdkDropListDropped"], ["cdkDrag", "", "cdkDragLockAxis", "y", 3, "cdkDragDisabled"], ["cdkDragHandle", "", 1, "drag-handle"], ["name", "dots-three-vertical", 3, "size"], [2, "font-weight", "500"], [1, "badge", "badge-blue", 2, "margin-left", "6px", "font-weight", "normal"], [1, "badge", "badge-red", 2, "margin-left", "6px", "font-weight", "normal"], [1, "badge", "badge-gray", "mono"], [2, "min-width", "140px"], [2, "color", "var(--text-muted)"], [2, "min-width", "120px", "white-space", "nowrap"], [1, "icon-btn", 3, "click"], ["name", "gear", 3, "size"], [1, "spinner", 2, "width", "8px", "height", "8px", "border-width", "1.5px", "display", "inline-block", "vertical-align", "middle", "margin-right", "3px"], [1, "st-bar"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-top", "2px", "white-space", "nowrap"], [1, "mono", 2, "font-size", "12px"], [1, "badge", 2, "margin-left", "6px", 3, "badge-green", "badge-yellow", "badge-red"], [1, "badge", "badge-red", 2, "margin-left", "6px"], [1, "badge", 2, "margin-left", "6px"], [1, "badge", "badge-gray", 2, "margin-right", "4px"], [3, "proxyFor", "size", "showLabel"], [1, "badge", "badge-blue", 2, "font-style", "italic", "margin-left", "4px"], [2, "margin-right", "4px", 3, "proxyFor", "size"], [1, "badge", "badge-blue", 2, "margin-right", "4px"], ["colspan", "8"], [1, "empty-state", 2, "padding", "28px 24px"], [1, "empty-state-icon"], ["name", "package", 3, "size"], [1, "btn", "btn-primary", "btn-sm", 2, "margin-top", "10px", 3, "click"]], template: function SpacesComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, SpacesComponent_Conditional_0_Template, 1, 0, "app-space-create-dialog");
            i0.ɵɵconditionalCreate(1, SpacesComponent_Conditional_1_Template, 3, 0);
            i0.ɵɵconditionalCreate(2, SpacesComponent_Conditional_2_Template, 1, 1, "app-summary-strip", 0);
            i0.ɵɵelementStart(3, "div", 1)(4, "div", 2)(5, "div", 3);
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(8, "div", 4)(9, "input", 5);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵlistener("input", function SpacesComponent_Template_input_input_9_listener($event) { return ctx.spaceSearch.set($event.target.value); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(11, "div", 6);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵelementStart(13, "button", 7);
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_13_listener() { return ctx.sortMode.set("custom"); });
            i0.ɵɵtext(15, "\u283F");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(16, "button", 7);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_16_listener() { return ctx.sortMode.set("az"); });
            i0.ɵɵtext(18, "A\u2192Z");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(19, "button", 7);
            i0.ɵɵpipe(20, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_19_listener() { return ctx.sortMode.set("za"); });
            i0.ɵɵtext(21, "Z\u2192A");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(22, "button", 7);
            i0.ɵɵpipe(23, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_22_listener() { return ctx.sortMode.set("usage-desc"); });
            i0.ɵɵtext(24, "\u2193 GiB");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(25, "button", 7);
            i0.ɵɵpipe(26, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_25_listener() { return ctx.sortMode.set("usage-asc"); });
            i0.ɵɵtext(27, "\u2191 GiB");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(28, "button", 7);
            i0.ɵɵpipe(29, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_28_listener() { return ctx.sortMode.set("calls-desc"); });
            i0.ɵɵtext(30);
            i0.ɵɵpipe(31, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(32, "button", 7);
            i0.ɵɵpipe(33, "transloco");
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_32_listener() { return ctx.sortMode.set("answers-asc"); });
            i0.ɵɵtext(34);
            i0.ɵɵpipe(35, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(36, "button", 8);
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_36_listener() { return ctx.showCreateDialog.set(true); });
            i0.ɵɵtext(37);
            i0.ɵɵpipe(38, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(39, "button", 9);
            i0.ɵɵlistener("click", function SpacesComponent_Template_button_click_39_listener() { return ctx.store.load(); });
            i0.ɵɵtext(40);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵconditionalCreate(42, SpacesComponent_Conditional_42_Template, 2, 0, "div", 10)(43, SpacesComponent_Conditional_43_Template, 7, 6, "div", 11)(44, SpacesComponent_Conditional_44_Template, 28, 19, "div", 12);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.showCreateDialog() ? 0 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.state.settingsSpace() ? 1 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(!ctx.store.loading() && !ctx.store.error() ? 2 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 40, "spaces.table.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("value", ctx.spaceSearch())("placeholder", i0.ɵɵpipeBind1(10, 42, "spaces.table.search.placeholder"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(12, 44, "spaces.table.sortLabel"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("active", ctx.sortMode() === "custom");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "custom")("title", i0.ɵɵpipeBind1(14, 46, "spaces.table.sort.custom"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("active", ctx.sortMode() === "az");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "az")("title", i0.ɵɵpipeBind1(17, 48, "spaces.table.sort.az"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("active", ctx.sortMode() === "za");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "za")("title", i0.ɵɵpipeBind1(20, 50, "spaces.table.sort.za"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("active", ctx.sortMode() === "usage-desc");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "usage-desc")("title", i0.ɵɵpipeBind1(23, 52, "spaces.table.sort.usageDesc"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("active", ctx.sortMode() === "usage-asc");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "usage-asc")("title", i0.ɵɵpipeBind1(26, 54, "spaces.table.sort.usageAsc"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("active", ctx.sortMode() === "calls-desc");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "calls-desc")("title", i0.ɵɵpipeBind1(29, 56, "spaces.table.sort.callsDesc"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1("\u2193 ", i0.ɵɵpipeBind1(31, 58, "spaces.table.sort.callsShort"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("active", ctx.sortMode() === "answers-asc");
            i0.ɵɵattribute("aria-pressed", ctx.sortMode() === "answers-asc")("title", i0.ɵɵpipeBind1(33, 60, "spaces.table.sort.answersAsc"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1("\u2191 ", i0.ɵɵpipeBind1(35, 62, "spaces.table.sort.answersShort"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(38, 64, "spaces.table.createButton"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(41, 66, "spaces.table.refreshButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.store.loading() ? 42 : ctx.store.error() ? 43 : 44);
        } }, dependencies: [ProxySpaceBadgeComponent, CommonModule, FormsModule, DragDropModule, i1.CdkDropList, i1.CdkDrag, i1.CdkDragHandle, PhIconComponent, SummaryStripComponent,
            SpaceCreateDialogComponent, HscrollTopDirective,
            TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadataAsync(SpacesComponent, () => [import("./space-settings-popup.component").then(m => m.SpaceSettingsPopupComponent)], SpaceSettingsPopupComponent => { i0.ɵsetClassMetadata(SpacesComponent, [{
        type: Component,
        args: [{ selector: 'app-spaces', standalone: true, imports: [ProxySpaceBadgeComponent, CommonModule, FormsModule, TranslocoPipe, DragDropModule, PhIconComponent, SummaryStripComponent, SpaceSettingsPopupComponent, SpaceCreateDialogComponent, ModalDirective, HscrollTopDirective, StatusPillComponent], providers: [SpacesStore, SpaceSettingsState], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <!-- CREATE DIALOG -->
    @if (showCreateDialog()) {
      <app-space-create-dialog (closed)="showCreateDialog.set(false)" />
    }

    <!-- The space settings pop-up: its own component, opened by setting state.settingsSpace().
         Deferred behind the same gate the Brain host uses. It is modal-only in both places, so neither page
         needs the schema editor, the duplicate rules and the danger zone until a cog is pressed — and while
         one host loaded it eagerly and the other did not, the shared code was hoisted out of this route's
         chunk, which cost spaces-component its name and took it off the bundle-budget list. A budget that
         names no chunk is evaluated against nothing, so the page could then grow unbounded while the build
         stayed green. -->
    @if (state.settingsSpace()) {
      @defer (on immediate) {
        <app-space-settings-popup />
      }
    }

    <!-- Import conflict dialog -->

    <!-- Library picker dialog -->

    <!-- SPACES TABLE -->
    @if (!store.loading() && !store.error()) {
      <app-summary-strip [items]="spacesSummary()" style="display:block;margin-bottom:16px;"/>
    }

    <div class="card">
      <div class="card-header">
        <div class="card-title">{{ 'spaces.table.title' | transloco }}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="search" [value]="spaceSearch()" (input)="spaceSearch.set($any($event.target).value)"
            class="space-search-input"
            [placeholder]="'spaces.table.search.placeholder' | transloco" />
          <div class="sort-group" [attr.aria-label]="'spaces.table.sortLabel' | transloco">
            <button class="sort-btn" [class.active]="sortMode()==='custom'" [attr.aria-pressed]="sortMode()==='custom'" (click)="sortMode.set('custom')" [attr.title]="'spaces.table.sort.custom' | transloco">⠿</button>
            <button class="sort-btn" [class.active]="sortMode()==='az'" [attr.aria-pressed]="sortMode()==='az'" (click)="sortMode.set('az')" [attr.title]="'spaces.table.sort.az' | transloco">A→Z</button>
            <button class="sort-btn" [class.active]="sortMode()==='za'" [attr.aria-pressed]="sortMode()==='za'" (click)="sortMode.set('za')" [attr.title]="'spaces.table.sort.za' | transloco">Z→A</button>
            <button class="sort-btn" [class.active]="sortMode()==='usage-desc'" [attr.aria-pressed]="sortMode()==='usage-desc'" (click)="sortMode.set('usage-desc')" [attr.title]="'spaces.table.sort.usageDesc' | transloco">↓ GiB</button>
            <button class="sort-btn" [class.active]="sortMode()==='usage-asc'" [attr.aria-pressed]="sortMode()==='usage-asc'" (click)="sortMode.set('usage-asc')" [attr.title]="'spaces.table.sort.usageAsc' | transloco">↑ GiB</button>
            <!-- Two orderings, because "useful" has two halves. Busiest finds the load; worst-answered finds
                 the content gap — a space fielding questions and returning nothing, which is invisible in
                 every other column on this page. -->
            <button class="sort-btn" [class.active]="sortMode()==='calls-desc'" [attr.aria-pressed]="sortMode()==='calls-desc'" (click)="sortMode.set('calls-desc')" [attr.title]="'spaces.table.sort.callsDesc' | transloco">↓ {{ 'spaces.table.sort.callsShort' | transloco }}</button>
            <button class="sort-btn" [class.active]="sortMode()==='answers-asc'" [attr.aria-pressed]="sortMode()==='answers-asc'" (click)="sortMode.set('answers-asc')" [attr.title]="'spaces.table.sort.answersAsc' | transloco">↑ {{ 'spaces.table.sort.answersShort' | transloco }}</button>
          </div>
          <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'spaces.table.createButton' | transloco }}</button>
          <button class="btn-secondary btn btn-sm" (click)="store.load()">{{ 'spaces.table.refreshButton' | transloco }}</button>
        </div>
      </div>
      @if (store.loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (store.error()) {
        <div class="alert alert-error" style="margin:16px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
          <span>{{ 'spaces.table.loadError' | transloco }}</span>
          <button class="btn btn-secondary btn-sm" (click)="store.load()">{{ 'spaces.table.refreshButton' | transloco }}</button>
        </div>
      } @else {
        <div class="table-wrapper" hscrollTop>
          <table>
            <thead>
              <tr><th style="width:32px;"></th><th>{{ 'spaces.table.column.label' | transloco }}</th><th>{{ 'spaces.table.column.id' | transloco }}</th><th>{{ 'spaces.table.column.storage' | transloco }}</th><th>{{ 'spaces.table.column.usage' | transloco }}</th><th>{{ 'spaces.table.column.networks' | transloco }}</th><th>{{ 'spaces.table.column.proxy' | transloco }}</th><th></th></tr>
            </thead>
            <tbody cdkDropList (cdkDropListDropped)="store.reorder($event.previousIndex, $event.currentIndex)">
              @for (s of sortedSpaces(); track s.id) {
                @let bar = storageInfo(s);
                <tr cdkDrag cdkDragLockAxis="y" [cdkDragDisabled]="sortMode() !== 'custom'">
                  <td><span class="drag-handle" cdkDragHandle [class.drag-handle-disabled]="sortMode() !== 'custom'" [attr.title]="'spaces.table.dragHandleTitle' | transloco"><ph-icon name="dots-three-vertical" [size]="16"/></span></td>
                  <td style="font-weight:500;">{{ s.label }}
                    @if (s.indexStatus === 'building') {
                      <span class="badge badge-blue" style="margin-left:6px;font-weight:normal" [attr.title]="'spaces.indexBuildingTitle' | transloco"><span class="spinner" style="width:8px;height:8px;border-width:1.5px;display:inline-block;vertical-align:middle;margin-right:3px;"></span>{{ 'spaces.indexBuilding' | transloco }}</span>
                    } @else if (s.indexStatus === 'failed') {
                      <span class="badge badge-red" style="margin-left:6px;font-weight:normal" [attr.title]="'spaces.indexFailedTitle' | transloco">{{ 'spaces.indexFailed' | transloco }}</span>
                    }
                  </td>
                  <td><span class="badge badge-gray mono">{{ s.id }}</span></td>
                  <td style="min-width:140px;">
                    @if (bar.label !== '—') {
                      <div class="st-bar"><div [class]="'st-bar-fill '+bar.cls" [style.width.%]="bar.pct"></div></div>
                      <div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;">{{ bar.label }}</div>
                    } @else {
                      <span style="color:var(--text-muted)">—</span>
                    }
                  </td>
                  <!-- Usage: calls over the window, and how many recalls found something.
                       Both numbers, never one: a space asked 380 times that answered 41 is not the busiest
                       space in a useful sense, and a call count on its own says it is. -->
                  <td style="min-width:120px;white-space:nowrap;">
                    @let use = activityFor(s.id);
                    @if (use) {
                      <span class="mono" style="font-size:12px;">{{ use.calls }}</span>
                      @if (answerRate(use); as rate) {
                        <span class="badge" style="margin-left:6px"
                              [class.badge-green]="rate >= 50" [class.badge-yellow]="rate < 50 && rate >= 20"
                              [class.badge-red]="rate < 20"
                              [attr.title]="('spaces.table.usageAnsweredTitle' | transloco) + ' ' + use.answered + '/' + use.recall">{{ rate }}%</span>
                      } @else if (use.recall > 0) {
                        <span class="badge badge-red" style="margin-left:6px">0%</span>
                      }
                    } @else {
                      <span style="color:var(--text-muted)">—</span>
                    }
                  </td>
                  <td>
                    @let nets = store.networksForSpace(s.id);
                    @if (nets.length) {
                      @for (n of nets; track n.id) {
                        <span class="badge badge-gray" style="margin-right:4px;">{{ n.label }}</span>
                      }
                    } @else { <span style="color:var(--text-muted)">—</span> }
                  </td>
                  <td>
                    @if (s.proxyFor?.[0]==='*') {
                      <app-proxy-space-badge [proxyFor]="s.proxyFor" [size]="14" [showLabel]="true" />
                      <span class="badge badge-blue" style="font-style:italic;margin-left:4px;">{{ 'spaces.badge.allSpaces' | transloco }}</span>
                    } @else if (s.proxyFor?.length) {
                      <app-proxy-space-badge [proxyFor]="s.proxyFor" [size]="14" style="margin-right:4px" />
                      @for (pid of s.proxyFor; track pid) {
                        <span class="badge badge-blue" style="margin-right:4px">{{ pid }}</span>
                      }
                    } @else { <span style="color:var(--text-muted)">—</span> }
                  </td>
                  <td><button class="icon-btn" [attr.title]="'spaces.table.configureTitle' | transloco" (click)="state.openSettings(s)"><ph-icon name="gear" [size]="16"/></button></td>
                </tr>
              } @empty {
                <tr><td colspan="8"><div class="empty-state" style="padding:28px 24px;">
                  <div class="empty-state-icon"><ph-icon name="package" [size]="40"/></div>
                  <h3>{{ 'spaces.table.empty' | transloco }}</h3>
                  <p>{{ 'spaces.table.emptyBody' | transloco }}</p>
                  <button class="btn btn-primary btn-sm" style="margin-top:10px;" (click)="showCreateDialog.set(true)">{{ 'spaces.table.createButton' | transloco }}</button>
                </div></td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n"] }]
    }], null, { onBeforeUnload: [{
            type: HostListener,
            args: ['window:beforeunload', ['$event']]
        }] }); }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpacesComponent, { className: "SpacesComponent", filePath: "app/pages/settings/spaces.component.ts", lineNumber: 184 }); })();
