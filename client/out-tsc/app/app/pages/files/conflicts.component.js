import { Component, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilesApi } from '../../core/files-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { RouterLink } from '@angular/router';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ count: a0 });
const _forTrack0 = ($index, $item) => $item.id;
function ConflictsComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 3);
    i0.ɵɵelement(1, "span", 6);
    i0.ɵɵelementEnd();
} }
function ConflictsComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 7);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function ConflictsComponent_Conditional_6_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.reload()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "conflicts.loadError"))("reason", ctx_r1.loadError() ?? "");
} }
function ConflictsComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5)(1, "div", 8);
    i0.ɵɵelement(2, "ph-icon", 9);
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
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "conflicts.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "conflicts.empty.body"));
} }
function ConflictsComponent_Conditional_8_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(2, 1, "conflicts.truncated", i0.ɵɵpureFunction1(4, _c0, ctx_r1.conflicts().length)), " ");
} }
function ConflictsComponent_Conditional_8_Conditional_4_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 19);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function ConflictsComponent_Conditional_8_Conditional_4_Conditional_7_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.bulkAction, $event) || (ctx_r1.bulkAction = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(2, "option", 20);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "option", 21);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "option", 22);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "button", 23);
    i0.ɵɵlistener("click", function ConflictsComponent_Conditional_8_Conditional_4_Conditional_7_Template_button_click_11_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.bulkResolve()); });
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.bulkAction);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 7, "conflicts.bulkActionAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 9, "conflicts.action.keepLocal"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 11, "conflicts.action.keepIncoming"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 13, "conflicts.action.keepBoth"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.bulkResolving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.bulkResolving() ? i0.ɵɵpipeBind1(13, 15, "conflicts.resolving") : i0.ɵɵpipeBind2(14, 17, "conflicts.resolveSelected", i0.ɵɵpureFunction1(20, _c0, ctx_r1.selectedIds().length)), " ");
} }
function ConflictsComponent_Conditional_8_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 12)(1, "label", 15)(2, "input", 16);
    i0.ɵɵlistener("change", function ConflictsComponent_Conditional_8_Conditional_4_Template_input_change_2_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.toggleSelectAll()); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 17);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(6, "span", 18);
    i0.ɵɵconditionalCreate(7, ConflictsComponent_Conditional_8_Conditional_4_Conditional_7_Template, 15, 22);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("checked", ctx_r1.allSelected());
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "conflicts.selectAll"));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.selectedIds().length > 0 ? 7 : -1);
} }
function ConflictsComponent_Conditional_8_For_31_Conditional_32_For_3_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 37);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r8 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("value", s_r8.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r8.label || s_r8.id);
} }
function ConflictsComponent_Conditional_8_For_31_Conditional_32_For_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ConflictsComponent_Conditional_8_For_31_Conditional_32_For_3_Conditional_0_Template, 2, 2, "option", 37);
} if (rf & 2) {
    const s_r8 = ctx.$implicit;
    const c_r6 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵconditional(s_r8.id !== c_r6.spaceId ? 0 : -1);
} }
function ConflictsComponent_Conditional_8_For_31_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 36);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function ConflictsComponent_Conditional_8_For_31_Conditional_32_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r7); const c_r6 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.conflictTargetSpace[c_r6.id], $event) || (ctx_r1.conflictTargetSpace[c_r6.id] = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(2, ConflictsComponent_Conditional_8_For_31_Conditional_32_For_3_Template, 1, 1, null, null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r6 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.conflictTargetSpace[c_r6.id]);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "conflicts.targetSpaceAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.spaces());
} }
function ConflictsComponent_Conditional_8_For_31_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td")(2, "input", 16);
    i0.ɵɵlistener("change", function ConflictsComponent_Conditional_8_For_31_Template_input_change_2_listener() { const c_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.toggleSelect(c_r6.id)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(3, "td")(4, "span", 24);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "td", 25);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "td", 26);
    i0.ɵɵtext(9);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "td")(11, "span", 27);
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "slice");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(14, "td", 28);
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "date");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "td")(18, "select", 29);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function ConflictsComponent_Conditional_8_For_31_Template_select_ngModelChange_18_listener($event) { const c_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.conflictActions[c_r6.id], $event) || (ctx_r1.conflictActions[c_r6.id] = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(20, "option", 20);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "option", 21);
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(26, "option", 22);
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "option", 30);
    i0.ɵɵtext(30);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(32, ConflictsComponent_Conditional_8_For_31_Conditional_32_Template, 4, 4, "select", 31);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "td", 32)(34, "button", 33);
    i0.ɵɵlistener("click", function ConflictsComponent_Conditional_8_For_31_Template_button_click_34_listener() { const c_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.resolve(c_r6)); });
    i0.ɵɵtext(35);
    i0.ɵɵpipe(36, "transloco");
    i0.ɵɵpipe(37, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(38, "button", 34);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵpipe(40, "transloco");
    i0.ɵɵlistener("click", function ConflictsComponent_Conditional_8_For_31_Template_button_click_38_listener() { const c_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.dismiss(c_r6)); });
    i0.ɵɵelement(41, "ph-icon", 35);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const c_r6 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("checked", ctx_r1.selectedIds().includes(c_r6.id));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(c_r6.spaceId);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r6.originalPath);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r6.conflictPath);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("title", i0.ɵɵinterpolate(c_r6.peerInstanceId));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", c_r6.peerInstanceLabel || i0.ɵɵpipeBind3(13, 21, c_r6.peerInstanceId, 0, 8), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(16, 25, c_r6.detectedAt, "dd.MM.yyyy HH:mm"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.conflictActions[c_r6.id]);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(19, 28, "conflicts.resolveActionAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 30, "conflicts.action.keepLocal"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 32, "conflicts.action.keepIncoming"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 34, "conflicts.action.keepBoth"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 36, "conflicts.action.saveToSpace"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.conflictActions[c_r6.id] === "save-to-space" ? 32 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.resolving() === c_r6.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.resolving() === c_r6.id ? i0.ɵɵpipeBind1(36, 38, "conflicts.resolving") : i0.ɵɵpipeBind1(37, 40, "conflicts.resolveButton"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", ctx_r1.resolving() === c_r6.id);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(39, 42, "conflicts.dismissTitle"))("aria-label", i0.ɵɵpipeBind1(40, 44, "conflicts.dismissAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
} }
function ConflictsComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, ConflictsComponent_Conditional_8_Conditional_3_Template, 3, 6, "div", 11);
    i0.ɵɵconditionalCreate(4, ConflictsComponent_Conditional_8_Conditional_4_Template, 8, 5, "div", 12);
    i0.ɵɵelementStart(5, "div", 13)(6, "table")(7, "thead")(8, "tr");
    i0.ɵɵelement(9, "th", 14);
    i0.ɵɵelementStart(10, "th");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "th");
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "th");
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "th");
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "th");
    i0.ɵɵtext(23);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(25, "th");
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(28, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(29, "tbody");
    i0.ɵɵrepeaterCreate(30, ConflictsComponent_Conditional_8_For_31_Template, 42, 46, "tr", null, _forTrack0);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(2, 9, "conflicts.unresolvedCount", i0.ɵɵpureFunction1(24, _c0, ctx_r1.conflicts().length)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.truncated() ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.conflicts().length > 1 ? 4 : -1);
    i0.ɵɵadvance(7);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 12, "conflicts.table.space"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 14, "conflicts.table.localFile"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 16, "conflicts.table.incomingFile"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 18, "conflicts.table.fromPeer"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 20, "conflicts.table.detected"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 22, "conflicts.table.action"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r1.conflicts());
} }
export class ConflictsComponent {
    constructor() {
        this.filesApi = inject(FilesApi);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Null until the last load failed — checked before the empty state, so a failure never reads as "All clear". */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.conflicts = signal([], ...(ngDevMode ? [{ debugName: "conflicts" }] : /* istanbul ignore next */ []));
        /** True when the server capped the list — the user is NOT seeing every conflict (resolve some to see more). */
        this.truncated = signal(false, ...(ngDevMode ? [{ debugName: "truncated" }] : /* istanbul ignore next */ []));
        this.resolving = signal(null, ...(ngDevMode ? [{ debugName: "resolving" }] : /* istanbul ignore next */ []));
        this.bulkResolving = signal(false, ...(ngDevMode ? [{ debugName: "bulkResolving" }] : /* istanbul ignore next */ []));
        this.selectedIds = signal([], ...(ngDevMode ? [{ debugName: "selectedIds" }] : /* istanbul ignore next */ []));
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.conflictActions = {};
        this.conflictTargetSpace = {};
        this.bulkAction = 'keep-local';
    }
    ngOnInit() {
        this.load();
        this.spacesApi.listSpaces().subscribe({
            next: (r) => this.spaces.set(r.spaces || []),
            error: () => { },
        });
    }
    allSelected() {
        return this.conflicts().length > 0 && this.selectedIds().length === this.conflicts().length;
    }
    toggleSelectAll() {
        if (this.allSelected()) {
            this.selectedIds.set([]);
        }
        else {
            this.selectedIds.set(this.conflicts().map(c => c.id));
        }
    }
    toggleSelect(id) {
        this.selectedIds.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    }
    /** Public so the error state's Retry can re-run the load. */
    reload() {
        this.load();
    }
    load() {
        this.loading.set(true);
        this.loadError.set(null);
        this.filesApi.listConflicts().subscribe({
            next: ({ conflicts, truncated }) => {
                this.conflicts.set(conflicts);
                this.truncated.set(truncated === true);
                for (const c of conflicts) {
                    if (!this.conflictActions[c.id])
                        this.conflictActions[c.id] = 'keep-local';
                }
                this.loading.set(false);
            },
            error: (err) => { this.loadError.set(httpErrorReason(err)); this.loading.set(false); },
        });
    }
    resolve(c) {
        const action = this.conflictActions[c.id] || 'keep-local';
        const opts = {};
        if (action === 'save-to-space') {
            opts.targetSpaceId = this.conflictTargetSpace[c.id];
            if (!opts.targetSpaceId) {
                this.toast.error(this.transloco.translate('conflicts.error.selectTargetSpace'));
                return;
            }
        }
        this.resolving.set(c.id);
        this.filesApi.resolveConflict(c.id, action, opts).subscribe({
            next: () => {
                this.conflicts.update(list => list.filter(x => x.id !== c.id));
                this.selectedIds.update(ids => ids.filter(x => x !== c.id));
                this.resolving.set(null);
            },
            error: () => this.resolving.set(null),
        });
    }
    dismiss(c) {
        this.resolving.set(c.id);
        this.filesApi.dismissConflict(c.id).subscribe({
            next: () => {
                this.conflicts.update(list => list.filter(x => x.id !== c.id));
                this.selectedIds.update(ids => ids.filter(x => x !== c.id));
                this.resolving.set(null);
            },
            error: () => this.resolving.set(null),
        });
    }
    async bulkResolve() {
        const ids = this.selectedIds();
        if (ids.length === 0)
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('conflicts.confirm.bulkResolveTitle'),
            message: this.transloco.translate('conflicts.confirm.bulkResolve', {
                count: ids.length,
                action: this.bulkAction,
            }),
        });
        if (!ok)
            return;
        this.bulkResolving.set(true);
        this.filesApi.bulkResolveConflicts(ids, this.bulkAction).subscribe({
            next: (r) => {
                const resolvedSet = new Set(ids.filter(id => !r.failed.some(f => f.id === id)));
                this.conflicts.update(list => list.filter(x => !resolvedSet.has(x.id)));
                this.selectedIds.update(sel => sel.filter(x => !resolvedSet.has(x)));
                this.bulkResolving.set(false);
                if (r.failed.length > 0) {
                    const details = r.failed.map(f => `${f.id}: ${f.error}`).join('\n');
                    const summary = this.transloco.translate('conflicts.error.bulkResolveFailedSummary', {
                        resolved: r.resolved,
                        failed: r.failed.length,
                    });
                    this.toast.error(`${summary}\n${details}`);
                }
            },
            error: () => this.bulkResolving.set(false),
        });
    }
    static { this.ɵfac = function ConflictsComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ConflictsComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ConflictsComponent, selectors: [["app-conflicts"]], decls: 9, vars: 5, consts: [[2, "display", "flex", "justify-content", "flex-end", "margin-bottom", "12px"], ["routerLink", "/files", 1, "btn-secondary", "btn", "btn-sm"], ["name", "arrow-left", 3, "size"], [1, "loading-overlay"], [3, "message", "reason"], [1, "empty-state"], [1, "spinner"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "check-circle", 3, "size"], [1, "alert", "alert-warning", 2, "margin-bottom", "16px"], [1, "alert", "alert-info", 2, "margin-bottom", "16px"], [2, "display", "flex", "align-items", "center", "gap", "8px", "margin-bottom", "12px", "padding", "8px 12px", "background", "var(--bg-secondary)", "border-radius", "8px"], ["hscrollTop", "", 1, "table-wrapper"], [2, "width", "30px"], [2, "display", "flex", "align-items", "center", "gap", "4px", "cursor", "pointer"], ["type", "checkbox", 3, "change", "checked"], [2, "font-size", "13px"], [2, "flex", "1"], [2, "font-size", "13px", "padding", "4px 8px", "border", "1px solid var(--border-color)", "border-radius", "4px", "background", "var(--bg-primary)", 3, "ngModelChange", "ngModel"], ["value", "keep-local"], ["value", "keep-incoming"], ["value", "keep-both"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "badge", "badge-blue", "mono"], [1, "mono", 2, "font-size", "12px"], [1, "mono", 2, "font-size", "12px", "color", "var(--text-muted)"], [1, "mono", 2, "font-size", "12px", 3, "title"], [2, "color", "var(--text-muted)", "white-space", "nowrap"], [2, "font-size", "12px", "padding", "2px 6px", "border", "1px solid var(--border-color)", "border-radius", "4px", "background", "var(--bg-primary)", 3, "ngModelChange", "ngModel"], ["value", "save-to-space"], [2, "margin-left", "4px", "font-size", "12px", "padding", "2px 6px", "border", "1px solid var(--border-color)", "border-radius", "4px", "background", "var(--bg-primary)", 3, "ngModel"], [2, "white-space", "nowrap"], [1, "btn-primary", "btn", "btn-sm", 3, "click", "disabled"], [1, "btn-secondary", "btn", "btn-sm", 2, "margin-left", "4px", 3, "click", "disabled"], ["name", "x", 3, "size"], [2, "margin-left", "4px", "font-size", "12px", "padding", "2px 6px", "border", "1px solid var(--border-color)", "border-radius", "4px", "background", "var(--bg-primary)", 3, "ngModelChange", "ngModel"], [3, "value"]], template: function ConflictsComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "a", 1);
            i0.ɵɵelement(2, "ph-icon", 2);
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(5, ConflictsComponent_Conditional_5_Template, 2, 0, "div", 3)(6, ConflictsComponent_Conditional_6_Template, 2, 4, "app-error-state", 4)(7, ConflictsComponent_Conditional_7_Template, 9, 7, "div", 5)(8, ConflictsComponent_Conditional_8_Template, 32, 26);
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(4, 3, "conflicts.backToFiles"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.loading() ? 5 : ctx.loadError() !== null ? 6 : ctx.conflicts().length === 0 ? 7 : 8);
        } }, dependencies: [RouterLink, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, HscrollTopDirective, ErrorStateComponent, DatePipe, SlicePipe, TranslocoPipe], encapsulation: 2 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ConflictsComponent, [{
        type: Component,
        args: [{
                selector: 'app-conflicts',
                standalone: true,
                imports: [DatePipe, SlicePipe, RouterLink, FormsModule, PhIconComponent, TranslocoPipe, HscrollTopDirective, ErrorStateComponent],
                template: `
    <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <a routerLink="/files" class="btn-secondary btn btn-sm"><ph-icon name="arrow-left" [size]="14"/> {{ 'conflicts.backToFiles' | transloco }}</a>
    </div>

    @if (loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (loadError() !== null) {
      <!-- Before the empty state, and deliberately: that empty state is a green "All clear", which is the
           worst possible thing to show when we do not actually know whether there are conflicts. -->
      <app-error-state [message]="'conflicts.loadError' | transloco" [reason]="loadError() ?? ''" (retry)="reload()" />
    } @else if (conflicts().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="check-circle" [size]="48"/></div>
          <h3>{{ 'conflicts.empty.title' | transloco }}</h3>
          <p>{{ 'conflicts.empty.body' | transloco }}</p>
      </div>
    } @else {
      <div class="alert alert-warning" style="margin-bottom:16px;">
        {{ 'conflicts.unresolvedCount' | transloco: { count: conflicts().length } }}
      </div>
      @if (truncated()) {
        <div class="alert alert-info" style="margin-bottom:16px;">
          {{ 'conflicts.truncated' | transloco: { count: conflicts().length } }}
        </div>
      }

      <!-- Bulk action bar -->
      @if (conflicts().length > 1) {
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px 12px; background:var(--bg-secondary); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll()"/>
            <span style="font-size:13px">{{ 'conflicts.selectAll' | transloco }}</span>
          </label>
          <span style="flex:1"></span>
          @if (selectedIds().length > 0) {
            <select [(ngModel)]="bulkAction" [attr.aria-label]="'conflicts.bulkActionAriaLabel' | transloco" style="font-size:13px; padding:4px 8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-primary);">
              <option value="keep-local">{{ 'conflicts.action.keepLocal' | transloco }}</option>
              <option value="keep-incoming">{{ 'conflicts.action.keepIncoming' | transloco }}</option>
              <option value="keep-both">{{ 'conflicts.action.keepBoth' | transloco }}</option>
            </select>
            <button class="btn btn-sm btn-primary" (click)="bulkResolve()"
                    [disabled]="bulkResolving()">
              {{ bulkResolving() ? ('conflicts.resolving' | transloco) : ('conflicts.resolveSelected' | transloco: { count: selectedIds().length }) }}
            </button>
          }
        </div>
      }

      <div class="table-wrapper" hscrollTop>
        <table>
          <thead>
            <tr>
              <th style="width:30px"></th>
              <th>{{ 'conflicts.table.space' | transloco }}</th>
              <th>{{ 'conflicts.table.localFile' | transloco }}</th>
              <th>{{ 'conflicts.table.incomingFile' | transloco }}</th>
              <th>{{ 'conflicts.table.fromPeer' | transloco }}</th>
              <th>{{ 'conflicts.table.detected' | transloco }}</th>
              <th>{{ 'conflicts.table.action' | transloco }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (c of conflicts(); track c.id) {
              <tr>
                <td>
                  <input type="checkbox" [checked]="selectedIds().includes(c.id)"
                         (change)="toggleSelect(c.id)"/>
                </td>
                <td><span class="badge badge-blue mono">{{ c.spaceId }}</span></td>
                <td class="mono" style="font-size:12px">{{ c.originalPath }}</td>
                <td class="mono" style="font-size:12px; color:var(--text-muted)">{{ c.conflictPath }}</td>
                <td>
                  <span title="{{ c.peerInstanceId }}" class="mono" style="font-size:12px">
                    {{ c.peerInstanceLabel || (c.peerInstanceId | slice:0:8) }}
                  </span>
                </td>
                <td style="color:var(--text-muted); white-space:nowrap">
                  {{ c.detectedAt | date:'dd.MM.yyyy HH:mm' }}
                </td>
                <td>
                  <select [(ngModel)]="conflictActions[c.id]"
                          [attr.aria-label]="'conflicts.resolveActionAriaLabel' | transloco"
                          style="font-size:12px; padding:2px 6px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-primary);">
                    <option value="keep-local">{{ 'conflicts.action.keepLocal' | transloco }}</option>
                    <option value="keep-incoming">{{ 'conflicts.action.keepIncoming' | transloco }}</option>
                    <option value="keep-both">{{ 'conflicts.action.keepBoth' | transloco }}</option>
                    <option value="save-to-space">{{ 'conflicts.action.saveToSpace' | transloco }}</option>
                  </select>
                  @if (conflictActions[c.id] === 'save-to-space') {
                    <select [(ngModel)]="conflictTargetSpace[c.id]"
                            [attr.aria-label]="'conflicts.targetSpaceAriaLabel' | transloco"
                            style="margin-left:4px; font-size:12px; padding:2px 6px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-primary);">
                      @for (s of spaces(); track s.id) {
                        @if (s.id !== c.spaceId) {
                          <option [value]="s.id">{{ s.label || s.id }}</option>
                        }
                      }
                    </select>
                  }
                </td>
                <td style="white-space:nowrap">
                  <button class="btn-primary btn btn-sm" (click)="resolve(c)"
                          [disabled]="resolving() === c.id">
                    {{ resolving() === c.id ? ('conflicts.resolving' | transloco) : ('conflicts.resolveButton' | transloco) }}
                  </button>
                  <button class="btn-secondary btn btn-sm" style="margin-left:4px"
                          (click)="dismiss(c)" [disabled]="resolving() === c.id"
                      [attr.title]="'conflicts.dismissTitle' | transloco" [attr.aria-label]="'conflicts.dismissAriaLabel' | transloco"><ph-icon name="x" [size]="16"/></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
            }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ConflictsComponent, { className: "ConflictsComponent", filePath: "app/pages/files/conflicts.component.ts", lineNumber: 141 }); })();
