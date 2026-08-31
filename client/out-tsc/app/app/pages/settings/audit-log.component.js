import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/admin-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
import * as i2 from "@angular/common";
const _c0 = a0 => ({ days: a0 });
const _c1 = a0 => ({ count: a0 });
const _forTrack0 = ($index, $item) => $item.id;
const _forTrack1 = ($index, $item) => $item._id;
const _forTrack2 = ($index, $item) => $item.field;
function AuditLogComponent_Conditional_10_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" \u00A0\u00B7 ", i0.ɵɵpipeBind1(1, 1, "auditLog.server.live"), " ");
} }
function AuditLogComponent_Conditional_10_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7);
    i0.ɵɵelement(1, "span", 10);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 1, "common.loading"), " ");
} }
function AuditLogComponent_Conditional_10_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 8)(1, "div", 11);
    i0.ɵɵtext(2, "\uD83D\uDCCB");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p", 12);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 2, "auditLog.server.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 4, "auditLog.server.empty.body"));
} }
function AuditLogComponent_Conditional_10_Conditional_11_For_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const line_r3 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵstyleProp("color", ctx_r1.serverLogColor(line_r3));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(line_r3);
} }
function AuditLogComponent_Conditional_10_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 9, 0);
    i0.ɵɵrepeaterCreate(2, AuditLogComponent_Conditional_10_Conditional_11_For_3_Template, 2, 3, "div", 13, i0.ɵɵrepeaterTrackByIndex);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.serverLogLines());
} }
function AuditLogComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 3)(1, "button", 4);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_10_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.loadServerLogs()); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(4, "span", 5);
    i0.ɵɵelementStart(5, "span", 6);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵconditionalCreate(8, AuditLogComponent_Conditional_10_Conditional_8_Template, 2, 3);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(9, AuditLogComponent_Conditional_10_Conditional_9_Template, 4, 3, "div", 7)(10, AuditLogComponent_Conditional_10_Conditional_10_Template, 9, 6, "div", 8)(11, AuditLogComponent_Conditional_10_Conditional_11_Template, 4, 0, "div", 9);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 5, "auditLog.server.refreshButton"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate2("", ctx_r1.serverLogLines().length, " ", i0.ɵɵpipeBind1(7, 7, "auditLog.server.lines"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.serverLogStreaming() ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.serverLogLoading() ? 9 : ctx_r1.serverLogLines().length === 0 ? 10 : 11);
} }
function AuditLogComponent_Conditional_11_For_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 18);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const op_r5 = ctx.$implicit;
    i0.ɵɵproperty("value", op_r5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(op_r5);
} }
function AuditLogComponent_Conditional_11_For_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 18);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r6 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r6.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", s_r6.label, " (", s_r6.id, ")");
} }
function AuditLogComponent_Conditional_11_For_35_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 18);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r7 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r7);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r7);
} }
function AuditLogComponent_Conditional_11_Conditional_59_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 6);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "auditLog.retention", i0.ɵɵpureFunction1(4, _c0, ctx_r1.retentionDays())));
} }
function AuditLogComponent_Conditional_11_Conditional_60_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 25);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.exportError());
} }
function AuditLogComponent_Conditional_11_Conditional_61_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 26);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.error());
} }
function AuditLogComponent_Conditional_11_Conditional_62_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-summary-strip", 27);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("items", ctx_r1.summaryItems());
} }
function AuditLogComponent_Conditional_11_Conditional_63_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.loading"));
} }
function AuditLogComponent_Conditional_11_Conditional_64_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 28);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "auditLog.empty"));
} }
function AuditLogComponent_Conditional_11_Conditional_65_For_28_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td");
    i0.ɵɵelement(2, "app-relative-time", 18);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "td", 36);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "td");
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "td")(10, "app-status-pill", 37);
    i0.ɵɵtext(11);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(12, "td", 36);
    i0.ɵɵtext(13);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "td", 38);
    i0.ɵɵtext(15);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "td")(17, "button", 39);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Conditional_65_For_28_Template_button_click_17_listener() { const e_r10 = i0.ɵɵrestoreView(_r9).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.showDetail(e_r10)); });
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const e_r10 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵclassMap(ctx_r1.rowClass(e_r10));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", e_r10.timestamp);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(e_r10.tokenLabel ?? e_r10.oidcSubject ?? "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(e_r10.operation);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(e_r10.spaceId ?? "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("variant", ctx_r1.statusVariant(e_r10.status));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(e_r10.status);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(e_r10.ip);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", e_r10.durationMs, "ms");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 11, "auditLog.table.detailButton"));
} }
function AuditLogComponent_Conditional_11_Conditional_65_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 30)(1, "table", 31)(2, "thead")(3, "tr")(4, "th");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
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
    i0.ɵɵelement(25, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(26, "tbody");
    i0.ɵɵrepeaterCreate(27, AuditLogComponent_Conditional_11_Conditional_65_For_28_Template, 20, 13, "tr", 32, _forTrack1);
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(29, "div", 33)(30, "span");
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "div", 34)(34, "button", 35);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Conditional_65_Template_button_click_34_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.prevPage()); });
    i0.ɵɵtext(35);
    i0.ɵɵpipe(36, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(37, "button", 35);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Conditional_65_Template_button_click_37_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.nextPage()); });
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 12, "auditLog.table.timestamp"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 14, "auditLog.table.tokenUser"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 16, "auditLog.table.operation"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 18, "auditLog.table.space"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 20, "auditLog.table.status"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 22, "auditLog.table.ip"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 24, "auditLog.table.duration"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r1.entries());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(32, 26, "auditLog.pagination.total", i0.ɵɵpureFunction1(33, _c1, ctx_r1.total())));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", ctx_r1.offset() === 0);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(36, 29, "auditLog.pagination.prev"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", !ctx_r1.hasMore());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 31, "auditLog.pagination.next"));
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
} if (rf & 2) {
    const e_r12 = i0.ɵɵnextContext();
    i0.ɵɵtextInterpolate1(" \u00A0\u00B7 ", e_r12.authMethod, " ");
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_50_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "dt");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "dd", 36);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const e_r12 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "auditLog.detail.entryId"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(e_r12.entryId);
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_54_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "dd", 36);
    i0.ɵɵtext(1);
    i0.ɵɵelementStart(2, "button", 47);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Conditional_66_Conditional_54_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r13); const e_r12 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.filterByRequestId(e_r12.requestId)); });
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const e_r12 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", e_r12.requestId, " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(4, 2, "auditLog.detail.requestIdFilter"), " ");
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_55_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "dd", 12);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "auditLog.detail.requestIdAbsent"));
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_56_For_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 36);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td", 49);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "td", 50);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const c_r14 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r14.field);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r14.from === undefined ? i0.ɵɵpipeBind1(5, 3, "auditLog.detail.notSet") : ctx_r1.fmtValue(c_r14.from));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(c_r14.to === undefined ? i0.ɵɵpipeBind1(8, 5, "auditLog.detail.notSet") : ctx_r1.fmtValue(c_r14.to));
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_56_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 43)(1, "h4");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "table", 48)(5, "thead")(6, "tr")(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "th");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "th");
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(16, "tbody");
    i0.ɵɵrepeaterCreate(17, AuditLogComponent_Conditional_11_Conditional_66_Conditional_56_For_18_Template, 9, 7, "tr", null, _forTrack2);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const e_r12 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "auditLog.detail.changes"));
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 6, "auditLog.detail.changeField"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 8, "auditLog.detail.changeFrom"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 10, "auditLog.detail.changeTo"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(e_r12.changes);
} }
function AuditLogComponent_Conditional_11_Conditional_66_Conditional_57_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 44);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "auditLog.detail.changesNotRecorded"));
} }
function AuditLogComponent_Conditional_11_Conditional_66_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 29)(1, "div", 40);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function AuditLogComponent_Conditional_11_Conditional_66_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.selectedEntry.set(null)); })("click", function AuditLogComponent_Conditional_11_Conditional_66_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "dl", 41)(7, "dt");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "dd");
    i0.ɵɵelement(11, "app-relative-time", 18);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "dt");
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "dd");
    i0.ɵɵtext(16);
    i0.ɵɵelementStart(17, "span", 42);
    i0.ɵɵconditionalCreate(18, AuditLogComponent_Conditional_11_Conditional_66_Conditional_18_Template, 1, 1);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "dt");
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "dd", 36);
    i0.ɵɵtext(23);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "dt");
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "dd", 36);
    i0.ɵɵtext(28);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "dt");
    i0.ɵɵtext(30);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(32, "dd")(33, "app-status-pill", 37);
    i0.ɵɵtext(34);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(35, "dt");
    i0.ɵɵtext(36);
    i0.ɵɵpipe(37, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(38, "dd");
    i0.ɵɵtext(39);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(40, "dt");
    i0.ɵɵtext(41);
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(43, "dd", 36);
    i0.ɵɵtext(44);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(45, "dt");
    i0.ɵɵtext(46);
    i0.ɵɵpipe(47, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(48, "dd", 38);
    i0.ɵɵtext(49);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(50, AuditLogComponent_Conditional_11_Conditional_66_Conditional_50_Template, 5, 4);
    i0.ɵɵelementStart(51, "dt");
    i0.ɵɵtext(52);
    i0.ɵɵpipe(53, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(54, AuditLogComponent_Conditional_11_Conditional_66_Conditional_54_Template, 5, 4, "dd", 36)(55, AuditLogComponent_Conditional_11_Conditional_66_Conditional_55_Template, 3, 3, "dd", 12);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(56, AuditLogComponent_Conditional_11_Conditional_66_Conditional_56_Template, 19, 12, "div", 43)(57, AuditLogComponent_Conditional_11_Conditional_66_Conditional_57_Template, 3, 3, "p", 44);
    i0.ɵɵelementStart(58, "details", 45)(59, "summary");
    i0.ɵɵtext(60);
    i0.ɵɵpipe(61, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(62, "pre");
    i0.ɵɵtext(63);
    i0.ɵɵpipe(64, "json");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(65, "button", 46);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Conditional_66_Template_button_click_65_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.selectedEntry.set(null)); });
    i0.ɵɵtext(66);
    i0.ɵɵpipe(67, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const e_r12 = ctx;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 28, "auditLog.detail.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 30, "auditLog.detail.title"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 32, "auditLog.table.timestamp"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("value", e_r12.timestamp);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 34, "auditLog.table.tokenUser"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(e_r12.tokenLabel ?? e_r12.oidcSubject ?? "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(e_r12.authMethod ? 18 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 36, "auditLog.table.operation"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(e_r12.operation);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 38, "auditLog.detail.request"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2("", e_r12.method, " ", e_r12.path);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 40, "auditLog.table.status"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("variant", ctx_r1.statusVariant(e_r12.status));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(e_r12.status);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 42, "auditLog.table.space"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(e_r12.spaceId ?? "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 44, "auditLog.table.ip"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(e_r12.ip);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(47, 46, "auditLog.table.duration"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", e_r12.durationMs, "ms");
    i0.ɵɵadvance();
    i0.ɵɵconditional(e_r12.entryId ? 50 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(53, 48, "auditLog.detail.requestId"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(e_r12.requestId ? 54 : 55);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((e_r12.changes == null ? null : e_r12.changes.length) ? 56 : 57);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(61, 50, "auditLog.detail.rawJson"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(64, 52, e_r12));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(67, 54, "auditLog.detail.closeButton"));
} }
function AuditLogComponent_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "input", 15);
    i0.ɵɵtwoWayListener("ngModelChange", function AuditLogComponent_Conditional_11_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.filterAfter, $event) || (ctx_r1.filterAfter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(5, "label");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementStart(8, "input", 15);
    i0.ɵɵtwoWayListener("ngModelChange", function AuditLogComponent_Conditional_11_Template_input_ngModelChange_8_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.filterBefore, $event) || (ctx_r1.filterBefore = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "label");
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementStart(12, "select", 16);
    i0.ɵɵtwoWayListener("ngModelChange", function AuditLogComponent_Conditional_11_Template_select_ngModelChange_12_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.filterOperation, $event) || (ctx_r1.filterOperation = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(13, "option", 17);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(16, AuditLogComponent_Conditional_11_For_17_Template, 2, 2, "option", 18, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(18, "label");
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementStart(21, "select", 16);
    i0.ɵɵtwoWayListener("ngModelChange", function AuditLogComponent_Conditional_11_Template_select_ngModelChange_21_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.filterSpaceId, $event) || (ctx_r1.filterSpaceId = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(22, "option", 17);
    i0.ɵɵtext(23);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(25, AuditLogComponent_Conditional_11_For_26_Template, 2, 3, "option", 18, _forTrack0);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(27, "label");
    i0.ɵɵtext(28);
    i0.ɵɵpipe(29, "transloco");
    i0.ɵɵelementStart(30, "select", 16);
    i0.ɵɵtwoWayListener("ngModelChange", function AuditLogComponent_Conditional_11_Template_select_ngModelChange_30_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.filterStatus, $event) || (ctx_r1.filterStatus = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(31, "option", 17);
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(34, AuditLogComponent_Conditional_11_For_35_Template, 2, 2, "option", 18, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(36, "label");
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementStart(39, "input", 19);
    i0.ɵɵpipe(40, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function AuditLogComponent_Conditional_11_Template_input_ngModelChange_39_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.filterIp, $event) || (ctx_r1.filterIp = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(41, "button", 20);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Template_button_click_41_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.applyFilters()); });
    i0.ɵɵtext(42);
    i0.ɵɵpipe(43, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(44, "button", 20);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Template_button_click_44_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.resetFilters()); });
    i0.ɵɵtext(45);
    i0.ɵɵpipe(46, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(47, "div", 21)(48, "div", 22)(49, "button", 23);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Template_button_click_49_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportJson()); });
    i0.ɵɵtext(50);
    i0.ɵɵpipe(51, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(52, "button", 23);
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Template_button_click_52_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportCsv()); });
    i0.ɵɵtext(53);
    i0.ɵɵpipe(54, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(55, "button", 24);
    i0.ɵɵpipe(56, "transloco");
    i0.ɵɵlistener("click", function AuditLogComponent_Conditional_11_Template_button_click_55_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportAll()); });
    i0.ɵɵtext(57);
    i0.ɵɵpipe(58, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(59, AuditLogComponent_Conditional_11_Conditional_59_Template, 3, 6, "span", 6);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(60, AuditLogComponent_Conditional_11_Conditional_60_Template, 2, 1, "div", 25);
    i0.ɵɵconditionalCreate(61, AuditLogComponent_Conditional_11_Conditional_61_Template, 2, 1, "p", 26);
    i0.ɵɵconditionalCreate(62, AuditLogComponent_Conditional_11_Conditional_62_Template, 1, 1, "app-summary-strip", 27);
    i0.ɵɵconditionalCreate(63, AuditLogComponent_Conditional_11_Conditional_63_Template, 3, 3, "p")(64, AuditLogComponent_Conditional_11_Conditional_64_Template, 3, 3, "div", 28)(65, AuditLogComponent_Conditional_11_Conditional_65_Template, 40, 35);
    i0.ɵɵconditionalCreate(66, AuditLogComponent_Conditional_11_Conditional_66_Template, 68, 56, "div", 29);
} if (rf & 2) {
    let tmp_32_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 29, "auditLog.filter.after"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.filterAfter);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(7, 31, "auditLog.filter.before"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.filterBefore);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(11, 33, "auditLog.filter.operation"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.filterOperation);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 35, "common.all"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.operations);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(20, 37, "auditLog.filter.space"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.filterSpaceId);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 39, "common.all"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.spaces());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(29, 41, "auditLog.filter.status"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.filterStatus);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 43, "common.all"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.statusOptions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(38, 45, "auditLog.filter.ip"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.filterIp);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(40, 47, "auditLog.filter.ipPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(43, 49, "auditLog.filter.searchButton"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(46, 51, "auditLog.filter.resetButton"));
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(51, 53, "auditLog.exportJson"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(54, 55, "auditLog.exportCsv"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.exportingAll());
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(56, 57, "auditLog.exportAllTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(58, 59, ctx_r1.exportingAll() ? "auditLog.exportAllBusy" : "auditLog.exportAll"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.retentionDays() > 0 ? 59 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.exportError() ? 60 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.error() ? 61 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!ctx_r1.loading() && ctx_r1.entries().length > 0 ? 62 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.loading() ? 63 : ctx_r1.entries().length === 0 ? 64 : 65);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional((tmp_32_0 = ctx_r1.selectedEntry()) ? 66 : -1, tmp_32_0);
} }
export class AuditLogComponent {
    constructor() {
        this.adminApi = inject(AdminApi);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        this.activeLogTab = signal('audit', ...(ngDevMode ? [{ debugName: "activeLogTab" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.entries = signal([], ...(ngDevMode ? [{ debugName: "entries" }] : /* istanbul ignore next */ []));
        this.total = signal(0, ...(ngDevMode ? [{ debugName: "total" }] : /* istanbul ignore next */ []));
        this.hasMore = signal(false, ...(ngDevMode ? [{ debugName: "hasMore" }] : /* istanbul ignore next */ []));
        this.offset = signal(0, ...(ngDevMode ? [{ debugName: "offset" }] : /* istanbul ignore next */ []));
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.selectedEntry = signal(null, ...(ngDevMode ? [{ debugName: "selectedEntry" }] : /* istanbul ignore next */ []));
        this.retentionDays = signal(90, ...(ngDevMode ? [{ debugName: "retentionDays" }] : /* istanbul ignore next */ []));
        /** Status codes present in the current result set — the filter offers only what's actually there
         *  instead of a fixed guess-list. */
        this.statusOptions = computed(() => [...new Set(this.entries().map(e => e.status))].sort((a, b) => a - b), ...(ngDevMode ? [{ debugName: "statusOptions" }] : /* istanbul ignore next */ []));
        /** At-a-glance rollup of what's currently in view, with warn/error emphasis when non-zero. */
        this.summaryItems = computed(() => {
            const tr = (k) => this.transloco.translate(k);
            const es = this.entries();
            const c4 = es.filter(e => e.status >= 400 && e.status < 500).length;
            const c5 = es.filter(e => e.status >= 500).length;
            const authFailed = es.filter(e => e.operation === 'auth.failed').length;
            return [
                { label: tr('auditLog.summary.shown'), value: es.length },
                { label: tr('auditLog.summary.clientErrors'), value: c4, variant: c4 ? 'warn' : undefined },
                { label: tr('auditLog.summary.serverErrors'), value: c5, variant: c5 ? 'error' : undefined },
                { label: tr('auditLog.summary.authFailures'), value: authFailed, variant: authFailed ? 'error' : undefined },
            ];
        }, ...(ngDevMode ? [{ debugName: "summaryItems" }] : /* istanbul ignore next */ []));
        /** True while the full NDJSON export is in flight — it can take a moment on a busy instance. */
        this.exportingAll = signal(false, ...(ngDevMode ? [{ debugName: "exportingAll" }] : /* istanbul ignore next */ []));
        /** A failed export says so; a download that quietly does nothing looks exactly like an empty result. */
        this.exportError = signal('', ...(ngDevMode ? [{ debugName: "exportError" }] : /* istanbul ignore next */ []));
        this.filterAfter = '';
        this.filterBefore = '';
        this.filterOperation = '';
        this.filterSpaceId = '';
        this.filterStatus = '';
        this.filterIp = '';
        /**
         * Exact request id, set by the detail panel's "find this request" button rather than typed.
         *
         * No input of its own on the filter bar: nobody types a UUID from memory, and a text box for one would be a
         * control that only ever gets pasted into. It arrives from a bug report through the detail panel, which is
         * where somebody actually holds one.
         */
        this.filterRequestId = '';
        this.pageSize = 100;
        // Server log state
        this.serverLogLines = signal([], ...(ngDevMode ? [{ debugName: "serverLogLines" }] : /* istanbul ignore next */ []));
        this.serverLogLoading = signal(false, ...(ngDevMode ? [{ debugName: "serverLogLoading" }] : /* istanbul ignore next */ []));
        this.serverLogStreaming = signal(false, ...(ngDevMode ? [{ debugName: "serverLogStreaming" }] : /* istanbul ignore next */ []));
        this.serverLogEventSource = null;
        this.operations = [
            'memory.create', 'memory.update', 'memory.delete',
            'entity.create', 'entity.update', 'entity.delete',
            'edge.create', 'edge.update', 'edge.delete',
            'chrono.create', 'chrono.update', 'chrono.delete',
            'file.create', 'file.update', 'file.delete',
            'space.create', 'space.update', 'space.delete', 'space.wipe',
            'token.create', 'token.delete',
            'webhook.create', 'webhook.update', 'webhook.delete',
            'config.reload',
            'auth.failed',
            'brain.recall', 'brain.recall_global', 'brain.query', 'brain.stats',
            'chrono.list', 'memory.list', 'entity.list', 'edge.list',
            'file.read', 'file.list', 'space.list',
        ];
        effect(() => {
            if (this.activeLogTab() === 'server') {
                if (!this.serverLogStreaming()) {
                    this.startServerLogStream();
                }
            }
            else {
                this.stopServerLogStream();
            }
        });
    }
    ngOnInit() {
        this.spacesApi.listSpaces().subscribe({
            next: (data) => this.spaces.set(data.spaces),
            error: () => { },
        });
        this.load();
    }
    applyFilters() {
        this.offset.set(0);
        this.load();
    }
    /**
     * Show only this request's row, from the detail panel.
     *
     * Clears the other filters, because a request id identifies ONE row and combining it with a date range or a
     * status that happens to be set would return nothing and read as "there is no such request" — which is the
     * one wrong answer this control can give.
     */
    filterByRequestId(requestId) {
        this.filterAfter = '';
        this.filterBefore = '';
        this.filterOperation = '';
        this.filterSpaceId = '';
        this.filterStatus = '';
        this.filterIp = '';
        this.filterRequestId = requestId;
        this.selectedEntry.set(null);
        this.offset.set(0);
        this.load();
    }
    resetFilters() {
        this.filterRequestId = '';
        this.filterAfter = '';
        this.filterBefore = '';
        this.filterOperation = '';
        this.filterSpaceId = '';
        this.filterStatus = '';
        this.filterIp = '';
        this.offset.set(0);
        this.load();
    }
    nextPage() {
        this.offset.set(this.offset() + this.pageSize);
        this.load();
    }
    prevPage() {
        this.offset.set(Math.max(0, this.offset() - this.pageSize));
        this.load();
    }
    showDetail(e) {
        this.selectedEntry.set(e);
    }
    buildParams() {
        const p = { limit: this.pageSize, offset: this.offset() };
        if (this.filterAfter)
            p.after = new Date(this.filterAfter).toISOString();
        if (this.filterBefore)
            p.before = new Date(this.filterBefore).toISOString();
        if (this.filterOperation)
            p.operation = this.filterOperation;
        if (this.filterSpaceId)
            p.spaceId = this.filterSpaceId;
        if (this.filterStatus)
            p.status = parseInt(this.filterStatus, 10);
        if (this.filterIp)
            p.ip = this.filterIp;
        if (this.filterRequestId)
            p.requestId = this.filterRequestId;
        return p;
    }
    load() {
        this.loading.set(true);
        this.error.set('');
        this.adminApi.getAuditLog(this.buildParams()).subscribe({
            next: (data) => {
                this.entries.set(data.entries);
                this.total.set(data.total);
                this.hasMore.set(data.hasMore);
                if (data.retentionDays !== undefined)
                    this.retentionDays.set(data.retentionDays);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err?.error?.error ?? 'Failed to load audit log');
                this.loading.set(false);
            },
        });
    }
    /**
     * Render an audited value for display.
     *
     * `null` is printed as `null` rather than a dash, because the template already uses "not set" for a
     * field that did not exist — collapsing the two would lose the difference between "this field was
     * introduced" and "this field was cleared", which is exactly the kind of distinction someone reads an
     * audit log to recover. Strings are quoted so a value of `"null"` cannot be mistaken for the literal.
     */
    fmtValue(v) {
        if (v === null)
            return 'null';
        if (typeof v === 'string')
            return `"${v}"`;
        return String(v);
    }
    /** Map an HTTP status to the shared status-pill vocabulary. */
    statusVariant(status) {
        if (status >= 500)
            return 'error';
        if (status >= 400)
            return 'warn';
        if (status >= 300)
            return 'off';
        return 'ok';
    }
    /** Leading severity stripe for rows worth noticing: 5xx → error, 4xx / auth failure → warn. */
    rowClass(e) {
        if (e.status >= 500)
            return 'row-error';
        if (e.status >= 400 || e.operation === 'auth.failed')
            return 'row-warn';
        return '';
    }
    /**
     * The page on screen, as JSON.
     *
     * Both of these export `entries()` — **one page**, at most `pageSize` rows out of `total()`. That was not wrong,
     * but the buttons used to say only "Export JSON" / "Export CSV", so an operator asked to produce someone's
     * activity record could hand over a 100-row file believing it was the whole thing. The labels now say `page`, and
     * `exportAll()` below is the one that means everything.
     */
    exportJson() {
        const blob = new Blob([JSON.stringify(this.entries(), null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, 'audit-log-page.json');
    }
    /**
     * Every entry matching the current filters, streamed from the server as NDJSON.
     *
     * The filters are the ones already on screen, so what comes down is what the operator was looking at — without
     * the 1,000-row ceiling the paged endpoint has to impose on a table.
     */
    exportAll() {
        if (this.exportingAll())
            return;
        this.exportingAll.set(true);
        this.exportError.set('');
        const params = this.buildParams();
        delete params.limit;
        delete params.offset;
        this.adminApi.exportAuditLog(params).subscribe({
            next: (blob) => {
                const stamp = new Date().toISOString().slice(0, 10);
                this.downloadBlob(blob, `audit-log-${stamp}.ndjson`);
                this.exportingAll.set(false);
            },
            error: (err) => {
                // Surfaced rather than swallowed: a download that silently does nothing is indistinguishable from an
                // empty result, and for an audit export those two must never look the same.
                this.exportError.set(err?.error?.error ?? this.transloco.translate('auditLog.exportAllFailed'));
                this.exportingAll.set(false);
            },
        });
    }
    exportCsv() {
        // `requestId` included: a CSV of an activity record is exactly where somebody correlates a row with the
        // server log afterwards, and a column that exists in the API but not the export is one the reader of the
        // file cannot know to ask for.
        const headers = ['timestamp', 'requestId', 'tokenId', 'tokenLabel', 'authMethod', 'oidcSubject', 'ip', 'method', 'path', 'spaceId', 'operation', 'status', 'entryId', 'durationMs'];
        const rows = this.entries().map(e => headers.map(h => {
            const v = e[h];
            const s = v === null || v === undefined ? '' : String(v);
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadBlob(blob, 'audit-log-page.csv');
    }
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    // ── Server Log ─────────────────────────────────────────────────────────────
    loadServerLogs() {
        this.serverLogLoading.set(true);
        this.adminApi.getAboutLogs(500).subscribe({
            next: ({ lines }) => {
                this.serverLogLines.set(lines);
                this.serverLogLoading.set(false);
            },
            error: () => this.serverLogLoading.set(false),
        });
    }
    toggleServerLogStream() {
        if (this.serverLogStreaming()) {
            this.stopServerLogStream();
        }
        else {
            this.startServerLogStream();
        }
    }
    startServerLogStream() {
        // First load existing lines, then start the SSE stream. EventSource can't send an Authorization
        // header and a raw token in the URL leaks into logs/history, so mint a single-use ticket first, then
        // open the stream with ?ticket=.
        this.loadServerLogs();
        this.serverLogStreaming.set(true); // optimistic so the toggle button reflects intent immediately
        this.adminApi.mintLogsTicket().subscribe({
            next: ({ ticket }) => {
                if (typeof EventSource === 'undefined' || !this.serverLogStreaming())
                    return; // stopped while minting
                const es = new EventSource(`/api/about/logs/stream?ticket=${encodeURIComponent(ticket)}`);
                es.onmessage = (event) => {
                    this.serverLogLines.update(lines => {
                        const updated = [...lines, event.data];
                        return updated.length > 1000 ? updated.slice(-1000) : updated;
                    });
                };
                es.onerror = () => {
                    // SSE connection lost — stop streaming (the ticket is single-use; the user can restart).
                    this.stopServerLogStream();
                };
                this.serverLogEventSource = es;
            },
            error: () => this.stopServerLogStream(), // mint failed (auth / rate limit)
        });
    }
    stopServerLogStream() {
        if (this.serverLogEventSource) {
            this.serverLogEventSource.close();
            this.serverLogEventSource = null;
        }
        this.serverLogStreaming.set(false);
    }
    serverLogColor(line) {
        if (line.includes('[ERROR]'))
            return 'var(--error)';
        if (line.includes('[WARN '))
            return 'var(--warning)';
        if (line.includes('[DEBUG]'))
            return 'var(--text-muted)';
        return 'var(--text-primary)';
    }
    ngOnDestroy() {
        this.stopServerLogStream();
    }
    static { this.ɵfac = function AuditLogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || AuditLogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: AuditLogComponent, selectors: [["app-audit-log"]], decls: 12, vars: 19, consts: [["serverLogContainer", ""], [2, "display", "flex", "gap", "8px", "margin-bottom", "16px"], [1, "btn", "btn-sm", 3, "click"], [2, "display", "flex", "gap", "8px", "align-items", "center", "margin-bottom", "12px"], [1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "flex", "1"], [2, "font-size", "12px", "color", "var(--text-muted)"], [1, "empty", 2, "padding", "24px"], [1, "empty", 2, "padding", "40px"], [2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)", "overflow", "auto", "max-height", "70vh", "font-family", "var(--font-mono)", "font-size", "12px", "line-height", "1.6", "padding", "12px", "white-space", "pre-wrap", "word-break", "break-all"], [1, "spinner"], [2, "font-size", "24px"], [2, "color", "var(--text-muted)"], [3, "color"], [1, "audit-toolbar"], ["type", "datetime-local", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["type", "text", 2, "width", "120px", 3, "ngModelChange", "ngModel", "placeholder"], [3, "click"], [2, "display", "flex", "justify-content", "space-between", "align-items", "center", "flex-wrap", "wrap", "gap", "8px", "margin-bottom", "8px"], [1, "export-btns"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click"], ["type", "button", 1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "alert", "alert-error", 2, "margin-bottom", "8px"], [1, "error-msg"], [3, "items"], [1, "empty"], [1, "detail-overlay"], ["hscrollTop", "", 1, "table-wrapper"], [1, "audit-table"], [3, "class"], [1, "pagination"], [1, "pagination-btns"], [3, "click", "disabled"], [1, "mono"], [3, "variant"], [1, "num"], [1, "detail-close", 2, "padding", "2px 8px", "font-size", "11px", 3, "click"], ["appModalCloseOnBackdrop", "", 1, "detail-panel", 3, "dismiss", "click", "appModal"], [1, "detail-grid"], [1, "mono", 2, "color", "var(--text-muted)"], [1, "changes-block"], [1, "changes-none"], [1, "detail-raw"], [1, "detail-close", 3, "click"], ["type", "button", 1, "link-btn", 3, "click"], [1, "changes-table"], [1, "mono", "val-from"], [1, "mono", "val-to"]], template: function AuditLogComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "h2");
            i0.ɵɵtext(1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(3, "div", 1)(4, "button", 2);
            i0.ɵɵlistener("click", function AuditLogComponent_Template_button_click_4_listener() { return ctx.activeLogTab.set("audit"); });
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 2);
            i0.ɵɵlistener("click", function AuditLogComponent_Template_button_click_7_listener() { return ctx.activeLogTab.set("server"); });
            i0.ɵɵtext(8);
            i0.ɵɵpipe(9, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(10, AuditLogComponent_Conditional_10_Template, 12, 9);
            i0.ɵɵconditionalCreate(11, AuditLogComponent_Conditional_11_Template, 67, 61);
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 13, "auditLog.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("btn-primary", ctx.activeLogTab() === "audit")("btn-secondary", ctx.activeLogTab() !== "audit");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 15, "auditLog.tab.audit"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("btn-primary", ctx.activeLogTab() === "server")("btn-secondary", ctx.activeLogTab() !== "server");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 17, "auditLog.tab.server"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.activeLogTab() === "server" ? 10 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.activeLogTab() === "audit" ? 11 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, StatusPillComponent, RelativeTimeComponent, SummaryStripComponent, ModalDirective, HscrollTopDirective, i2.JsonPipe, TranslocoPipe], styles: [".audit-toolbar[_ngcontent-%COMP%] {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 10px;\n      align-items: flex-end;\n      margin-bottom: 16px;\n    }\n    .audit-toolbar[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 3px;\n      font-size: 12px;\n      color: var(--text-secondary);\n    }\n    \n\n\n    .audit-toolbar[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      padding: 6px 14px;\n      font-size: 13px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-primary);\n      cursor: pointer;\n      font-family: var(--font);\n    }\n    .audit-toolbar[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover { background: var(--bg-surface); }\n\n    .audit-table[_ngcontent-%COMP%] {\n      width: 100%;\n      border-collapse: collapse;\n      font-size: 13px;\n    }\n    .audit-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n      text-align: left;\n      padding: 8px 10px;\n      border-bottom: 2px solid var(--border);\n      font-weight: 600;\n      color: var(--text-secondary);\n      font-size: 11px;\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n    }\n    .audit-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n      padding: 7px 10px;\n      border-bottom: 1px solid var(--border);\n      color: var(--text-primary);\n      vertical-align: top;\n    }\n    .audit-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n\n    .mono[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 12px; }\n    .num[_ngcontent-%COMP%] { font-variant-numeric: tabular-nums; }\n\n    \n\n\n    .audit-table[_ngcontent-%COMP%]   tr.row-warn[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow: inset 3px 0 0 var(--warning); }\n    .audit-table[_ngcontent-%COMP%]   tr.row-error[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow: inset 3px 0 0 var(--error); }\n    .audit-table[_ngcontent-%COMP%]   tr.row-error[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:nth-child(3) { color: var(--error); font-weight: 600; }\n\n    \n\n    .detail-grid[_ngcontent-%COMP%] {\n      display: grid;\n      grid-template-columns: auto 1fr;\n      gap: 6px 16px;\n      align-items: baseline;\n      margin: 4px 0 14px;\n      font-size: 13px;\n    }\n    .detail-grid[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%] {\n      color: var(--text-muted);\n      font-size: 11px;\n      text-transform: uppercase;\n      letter-spacing: 0.04em;\n    }\n    .detail-grid[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%] { margin: 0; color: var(--text-primary); word-break: break-word; }\n    \n\n    .changes-block[_ngcontent-%COMP%] { margin-top: 12px; }\n    .changes-block[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }\n    .changes-table[_ngcontent-%COMP%] { width: 100%; border-collapse: collapse; font-size: 12px; }\n    .changes-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); padding: 2px 8px 4px 0; font-weight: 600; }\n    .changes-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding: 3px 8px 3px 0; vertical-align: top; word-break: break-word; }\n    .changes-table[_ngcontent-%COMP%]   .val-from[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .changes-table[_ngcontent-%COMP%]   .val-to[_ngcontent-%COMP%] { color: var(--text-primary); font-weight: 550; }\n    .changes-none[_ngcontent-%COMP%] { margin: 12px 0 0; font-size: 11px; color: var(--text-muted); font-style: italic; }\n\n    .detail-raw[_ngcontent-%COMP%] { margin-top: 8px; }\n    .detail-raw[_ngcontent-%COMP%]   summary[_ngcontent-%COMP%] { cursor: pointer; font-size: 12px; color: var(--text-secondary); }\n\n    .pagination[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-top: 12px;\n      font-size: 13px;\n      color: var(--text-secondary);\n    }\n    .pagination[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      padding: 5px 12px;\n      font-size: 13px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-primary);\n      cursor: pointer;\n      font-family: var(--font);\n    }\n    .pagination[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:disabled { opacity: 0.4; cursor: default; }\n    .pagination[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:not(:disabled):hover { background: var(--bg-surface); }\n    .pagination-btns[_ngcontent-%COMP%] { display: flex; gap: 8px; }\n\n    .empty[_ngcontent-%COMP%] { text-align: center; padding: 40px; color: var(--text-muted); }\n\n    .detail-overlay[_ngcontent-%COMP%] {\n      position: fixed; top: 0; left: 0; right: 0; bottom: 0;\n      background: var(--bg-scrim);\n      display: flex; align-items: center; justify-content: center;\n      z-index: 100;\n    }\n    .detail-panel[_ngcontent-%COMP%] {\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      padding: 24px;\n      max-width: 600px;\n      width: 90%;\n      max-height: 80vh;\n      overflow-y: auto;\n    }\n    .detail-panel[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin-top: 0; }\n    .detail-panel[_ngcontent-%COMP%]   pre[_ngcontent-%COMP%] {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      padding: 12px;\n      font-size: 12px;\n      overflow-x: auto;\n      white-space: pre-wrap;\n      word-break: break-all;\n    }\n    .detail-close[_ngcontent-%COMP%] {\n      margin-top: 12px;\n      padding: 6px 16px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-primary);\n      cursor: pointer;\n      font-family: var(--font);\n    }\n\n    \n\n\n    .export-btns[_ngcontent-%COMP%] { display: flex; gap: 8px; flex-wrap: wrap; }\n    \n\n\n\n    .error-msg[_ngcontent-%COMP%] { color: var(--error); margin: 12px 0; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AuditLogComponent, [{
        type: Component,
        args: [{ selector: 'app-audit-log', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, StatusPillComponent, RelativeTimeComponent, SummaryStripComponent, ModalDirective, HscrollTopDirective], template: `
    <h2>{{ 'auditLog.title' | transloco }}</h2>

    <!-- Sub-tabs -->
    <div style="display:flex; gap:8px; margin-bottom:16px;">
      <button class="btn btn-sm" [class.btn-primary]="activeLogTab() === 'audit'" [class.btn-secondary]="activeLogTab() !== 'audit'" (click)="activeLogTab.set('audit')">{{ 'auditLog.tab.audit' | transloco }}</button>
      <button class="btn btn-sm" [class.btn-primary]="activeLogTab() === 'server'" [class.btn-secondary]="activeLogTab() !== 'server'" (click)="activeLogTab.set('server')">{{ 'auditLog.tab.server' | transloco }}</button>
    </div>

    @if (activeLogTab() === 'server') {
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
        <button class="btn btn-sm btn-secondary" (click)="loadServerLogs()">{{ 'auditLog.server.refreshButton' | transloco }}</button>
        <span style="flex:1;"></span>
        <span style="font-size:12px; color:var(--text-muted);">{{ serverLogLines().length }} {{ 'auditLog.server.lines' | transloco }}@if (serverLogStreaming()) { &nbsp;· {{ 'auditLog.server.live' | transloco }} }</span>
      </div>

      @if (serverLogLoading()) {
        <div class="empty" style="padding:24px;">
          <span class="spinner"></span> {{ 'common.loading' | transloco }}
        </div>
      } @else if (serverLogLines().length === 0) {
        <div class="empty" style="padding:40px;">
          <div style="font-size:24px;">📋</div>
          <h3>{{ 'auditLog.server.empty.title' | transloco }}</h3>
          <p style="color:var(--text-muted);">{{ 'auditLog.server.empty.body' | transloco }}</p>
        </div>
      } @else {
        <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-sm); overflow:auto; max-height:70vh; font-family:var(--font-mono); font-size:12px; line-height:1.6; padding:12px; white-space:pre-wrap; word-break:break-all;" #serverLogContainer>
          @for (line of serverLogLines(); track $index) {
            <div [style.color]="serverLogColor(line)">{{ line }}</div>
          }
        </div>
      }
    }

    @if (activeLogTab() === 'audit') {

    <!-- Filters -->
    <div class="audit-toolbar">
      <label>
        {{ 'auditLog.filter.after' | transloco }}
        <input type="datetime-local" [(ngModel)]="filterAfter" />
      </label>
      <label>
        {{ 'auditLog.filter.before' | transloco }}
        <input type="datetime-local" [(ngModel)]="filterBefore" />
      </label>
      <label>
        {{ 'auditLog.filter.operation' | transloco }}
        <select [(ngModel)]="filterOperation">
          <option value="">{{ 'common.all' | transloco }}</option>
          @for (op of operations; track op) {
            <option [value]="op">{{ op }}</option>
          }
        </select>
      </label>
      <label>
        {{ 'auditLog.filter.space' | transloco }}
        <select [(ngModel)]="filterSpaceId">
          <option value="">{{ 'common.all' | transloco }}</option>
          @for (s of spaces(); track s.id) {
            <option [value]="s.id">{{ s.label }} ({{ s.id }})</option>
          }
        </select>
      </label>
      <label>
        {{ 'auditLog.filter.status' | transloco }}
        <select [(ngModel)]="filterStatus">
          <option value="">{{ 'common.all' | transloco }}</option>
          @for (s of statusOptions(); track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
      </label>
      <label>
        {{ 'auditLog.filter.ip' | transloco }}
        <input type="text" [(ngModel)]="filterIp" [placeholder]="'auditLog.filter.ipPlaceholder' | transloco" style="width:120px" />
      </label>
      <button (click)="applyFilters()">{{ 'auditLog.filter.searchButton' | transloco }}</button>
      <button (click)="resetFilters()">{{ 'auditLog.filter.resetButton' | transloco }}</button>
    </div>

    <!-- Export -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
      <div class="export-btns">
        <button class="btn btn-sm btn-secondary" type="button" (click)="exportJson()">{{ 'auditLog.exportJson' | transloco }}</button>
        <button class="btn btn-sm btn-secondary" type="button" (click)="exportCsv()">{{ 'auditLog.exportCsv' | transloco }}</button>
        <button class="btn btn-sm btn-primary" type="button" (click)="exportAll()" [disabled]="exportingAll()" [attr.title]="'auditLog.exportAllTitle' | transloco">
          {{ (exportingAll() ? 'auditLog.exportAllBusy' : 'auditLog.exportAll') | transloco }}
        </button>
      </div>
      @if (retentionDays() > 0) {
        <span style="font-size:12px; color:var(--text-muted);">{{ 'auditLog.retention' | transloco: { days: retentionDays() } }}</span>
      }
    </div>

    @if (exportError()) {
      <div class="alert alert-error" style="margin-bottom:8px;">{{ exportError() }}</div>
    }

    @if (error()) {
      <p class="error-msg">{{ error() }}</p>
    }

    @if (!loading() && entries().length > 0) {
      <app-summary-strip [items]="summaryItems()" />
    }

    @if (loading()) {
      <p>{{ 'common.loading' | transloco }}</p>
    } @else if (entries().length === 0) {
      <div class="empty">{{ 'auditLog.empty' | transloco }}</div>
    } @else {
      <div class="table-wrapper" hscrollTop>
      <table class="audit-table">
        <thead>
          <tr>
            <th>{{ 'auditLog.table.timestamp' | transloco }}</th>
            <th>{{ 'auditLog.table.tokenUser' | transloco }}</th>
            <th>{{ 'auditLog.table.operation' | transloco }}</th>
            <th>{{ 'auditLog.table.space' | transloco }}</th>
            <th>{{ 'auditLog.table.status' | transloco }}</th>
            <th>{{ 'auditLog.table.ip' | transloco }}</th>
            <th>{{ 'auditLog.table.duration' | transloco }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (e of entries(); track e._id) {
            <tr [class]="rowClass(e)">
              <td><app-relative-time [value]="e.timestamp" /></td>
              <td>{{ e.tokenLabel ?? e.oidcSubject ?? '—' }}</td>
              <td class="mono">{{ e.operation }}</td>
              <td>{{ e.spaceId ?? '—' }}</td>
              <td><app-status-pill [variant]="statusVariant(e.status)">{{ e.status }}</app-status-pill></td>
              <td class="mono">{{ e.ip }}</td>
              <td class="num">{{ e.durationMs }}ms</td>
              <td><button class="detail-close" style="padding:2px 8px;font-size:11px" (click)="showDetail(e)">{{ 'auditLog.table.detailButton' | transloco }}</button></td>
            </tr>
          }
        </tbody>
      </table>
      </div>

      <div class="pagination">
        <span>{{ 'auditLog.pagination.total' | transloco: { count: total() } }}</span>
        <div class="pagination-btns">
          <button [disabled]="offset() === 0" (click)="prevPage()">{{ 'auditLog.pagination.prev' | transloco }}</button>
          <button [disabled]="!hasMore()" (click)="nextPage()">{{ 'auditLog.pagination.next' | transloco }}</button>
        </div>
      </div>
    }

    <!-- Detail panel -->
    @if (selectedEntry(); as e) {
      <div class="detail-overlay">
        <div class="detail-panel" [appModal]="'auditLog.detail.title' | transloco" appModalCloseOnBackdrop (dismiss)="selectedEntry.set(null)" (click)="$event.stopPropagation()">
          <h3>{{ 'auditLog.detail.title' | transloco }}</h3>
          <dl class="detail-grid">
            <dt>{{ 'auditLog.table.timestamp' | transloco }}</dt>
            <dd><app-relative-time [value]="e.timestamp" /></dd>
            <dt>{{ 'auditLog.table.tokenUser' | transloco }}</dt>
            <dd>{{ e.tokenLabel ?? e.oidcSubject ?? '—' }}<span class="mono" style="color:var(--text-muted)">@if (e.authMethod) { &nbsp;· {{ e.authMethod }} }</span></dd>
            <dt>{{ 'auditLog.table.operation' | transloco }}</dt>
            <dd class="mono">{{ e.operation }}</dd>
            <dt>{{ 'auditLog.detail.request' | transloco }}</dt>
            <dd class="mono">{{ e.method }} {{ e.path }}</dd>
            <dt>{{ 'auditLog.table.status' | transloco }}</dt>
            <dd><app-status-pill [variant]="statusVariant(e.status)">{{ e.status }}</app-status-pill></dd>
            <dt>{{ 'auditLog.table.space' | transloco }}</dt>
            <dd>{{ e.spaceId ?? '—' }}</dd>
            <dt>{{ 'auditLog.table.ip' | transloco }}</dt>
            <dd class="mono">{{ e.ip }}</dd>
            <dt>{{ 'auditLog.table.duration' | transloco }}</dt>
            <dd class="num">{{ e.durationMs }}ms</dd>
            @if (e.entryId) {
              <dt>{{ 'auditLog.detail.entryId' | transloco }}</dt>
              <dd class="mono">{{ e.entryId }}</dd>
            }
            <!-- The request id, and the only row here whose ABSENCE has to be spelled out. Every audited action
                 had a request behind it, so a blank would read as "none" when it means "this row predates the
                 field" — the same trap the changes note below describes. (No backticks in here: this template
                 is a template literal, and one would end it.) -->
            <dt>{{ 'auditLog.detail.requestId' | transloco }}</dt>
            @if (e.requestId) {
              <dd class="mono">
                {{ e.requestId }}
                <button type="button" class="link-btn" (click)="filterByRequestId(e.requestId!)">
                  {{ 'auditLog.detail.requestIdFilter' | transloco }}
                </button>
              </dd>
            } @else {
              <dd style="color:var(--text-muted)">{{ 'auditLog.detail.requestIdAbsent' | transloco }}</dd>
            }
          </dl>
          <!-- What the request actually changed. Only allowlisted operations record this, so its ABSENCE
               means "not recorded for this operation" — never "nothing changed". Saying so explicitly
               matters: an empty detail pane that looks authoritative is how a reader concludes a rename
               never happened. -->
          @if (e.changes?.length) {
            <div class="changes-block">
              <h4>{{ 'auditLog.detail.changes' | transloco }}</h4>
              <table class="changes-table">
                <thead>
                  <tr>
                    <th>{{ 'auditLog.detail.changeField' | transloco }}</th>
                    <th>{{ 'auditLog.detail.changeFrom' | transloco }}</th>
                    <th>{{ 'auditLog.detail.changeTo' | transloco }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of e.changes; track c.field) {
                    <tr>
                      <td class="mono">{{ c.field }}</td>
                      <!-- "not set" and "set to null" are different facts and must not both render as a
                           dash: one means the field did not exist, the other that it existed and was null. -->
                      <td class="mono val-from">{{ c.from === undefined ? ('auditLog.detail.notSet' | transloco) : fmtValue(c.from) }}</td>
                      <td class="mono val-to">{{ c.to === undefined ? ('auditLog.detail.notSet' | transloco) : fmtValue(c.to) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="changes-none">{{ 'auditLog.detail.changesNotRecorded' | transloco }}</p>
          }
          <details class="detail-raw">
            <summary>{{ 'auditLog.detail.rawJson' | transloco }}</summary>
            <pre>{{ e | json }}</pre>
          </details>
          <button class="detail-close" (click)="selectedEntry.set(null)">{{ 'auditLog.detail.closeButton' | transloco }}</button>
        </div>
      </div>
    }

    } <!-- end audit tab -->
  `, styles: ["\n    .audit-toolbar {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 10px;\n      align-items: flex-end;\n      margin-bottom: 16px;\n    }\n    .audit-toolbar label {\n      display: flex;\n      flex-direction: column;\n      gap: 3px;\n      font-size: 12px;\n      color: var(--text-secondary);\n    }\n    /* Geometry comes from the ONE input rule in styles.scss \u2014 this block restated it almost exactly, which is\n       precisely how a shared control drifts: every copy is defensible on its own and no two agree. */\n    .audit-toolbar button {\n      padding: 6px 14px;\n      font-size: 13px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-primary);\n      cursor: pointer;\n      font-family: var(--font);\n    }\n    .audit-toolbar button:hover { background: var(--bg-surface); }\n\n    .audit-table {\n      width: 100%;\n      border-collapse: collapse;\n      font-size: 13px;\n    }\n    .audit-table th {\n      text-align: left;\n      padding: 8px 10px;\n      border-bottom: 2px solid var(--border);\n      font-weight: 600;\n      color: var(--text-secondary);\n      font-size: 11px;\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n    }\n    .audit-table td {\n      padding: 7px 10px;\n      border-bottom: 1px solid var(--border);\n      color: var(--text-primary);\n      vertical-align: top;\n    }\n    .audit-table tr:hover { background: var(--bg-elevated); }\n\n    .mono { font-family: var(--font-mono, monospace); font-size: 12px; }\n    .num { font-variant-numeric: tabular-nums; }\n\n    /* Rows worth noticing get a leading severity stripe (semantic colour, not the accent) so an auth\n       failure or a 5xx reads at a glance without relying on the status pill alone. */\n    .audit-table tr.row-warn td:first-child { box-shadow: inset 3px 0 0 var(--warning); }\n    .audit-table tr.row-error td:first-child { box-shadow: inset 3px 0 0 var(--error); }\n    .audit-table tr.row-error td:nth-child(3) { color: var(--error); font-weight: 600; }\n\n    /* Structured detail panel \u2014 a labelled field grid + a collapsible raw-JSON block. */\n    .detail-grid {\n      display: grid;\n      grid-template-columns: auto 1fr;\n      gap: 6px 16px;\n      align-items: baseline;\n      margin: 4px 0 14px;\n      font-size: 13px;\n    }\n    .detail-grid dt {\n      color: var(--text-muted);\n      font-size: 11px;\n      text-transform: uppercase;\n      letter-spacing: 0.04em;\n    }\n    .detail-grid dd { margin: 0; color: var(--text-primary); word-break: break-word; }\n    /* What the request changed. */\n    .changes-block { margin-top: 12px; }\n    .changes-block h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }\n    .changes-table { width: 100%; border-collapse: collapse; font-size: 12px; }\n    .changes-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); padding: 2px 8px 4px 0; font-weight: 600; }\n    .changes-table td { padding: 3px 8px 3px 0; vertical-align: top; word-break: break-word; }\n    .changes-table .val-from { color: var(--text-muted); }\n    .changes-table .val-to { color: var(--text-primary); font-weight: 550; }\n    .changes-none { margin: 12px 0 0; font-size: 11px; color: var(--text-muted); font-style: italic; }\n\n    .detail-raw { margin-top: 8px; }\n    .detail-raw summary { cursor: pointer; font-size: 12px; color: var(--text-secondary); }\n\n    .pagination {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-top: 12px;\n      font-size: 13px;\n      color: var(--text-secondary);\n    }\n    .pagination button {\n      padding: 5px 12px;\n      font-size: 13px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-primary);\n      cursor: pointer;\n      font-family: var(--font);\n    }\n    .pagination button:disabled { opacity: 0.4; cursor: default; }\n    .pagination button:not(:disabled):hover { background: var(--bg-surface); }\n    .pagination-btns { display: flex; gap: 8px; }\n\n    .empty { text-align: center; padding: 40px; color: var(--text-muted); }\n\n    .detail-overlay {\n      position: fixed; top: 0; left: 0; right: 0; bottom: 0;\n      background: var(--bg-scrim);\n      display: flex; align-items: center; justify-content: center;\n      z-index: 100;\n    }\n    .detail-panel {\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      padding: 24px;\n      max-width: 600px;\n      width: 90%;\n      max-height: 80vh;\n      overflow-y: auto;\n    }\n    .detail-panel h3 { margin-top: 0; }\n    .detail-panel pre {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      padding: 12px;\n      font-size: 12px;\n      overflow-x: auto;\n      white-space: pre-wrap;\n      word-break: break-all;\n    }\n    .detail-close {\n      margin-top: 12px;\n      padding: 6px 16px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-primary);\n      cursor: pointer;\n      font-family: var(--font);\n    }\n\n    /* flex-wrap because \"Export all matching (NDJSON)\" is 195px and cannot shrink: at 420px these three\n       pushed the page pane 72px past its box, so the whole audit log slid sideways. */\n    .export-btns { display: flex; gap: 8px; flex-wrap: wrap; }\n    /* No button geometry here. These three carried NO class and re-created .btn-sm's metrics locally; they use the\n       class now, so the small-button size is defined in one place. */\n\n    .error-msg { color: var(--error); margin: 12px 0; }\n  "] }]
    }], () => [], null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(AuditLogComponent, { className: "AuditLogComponent", filePath: "app/pages/settings/audit-log.component.ts", lineNumber: 422 }); })();
