import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { AdminApi } from '../../core/admin-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { NetworkCreateDialogComponent } from './network-create-dialog.component';
import { NetworkJoinDialogComponent } from './network-join-dialog.component';
import { NetworkEnableWizardComponent } from './network-enable-wizard.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
import * as i2 from "@angular/forms";
const _c0 = a0 => ({ count: a0 });
const _c1 = (a0, a1) => ({ yes: a0, veto: a1 });
const _forTrack0 = ($index, $item) => $item.id;
const _forTrack1 = ($index, $item) => $item.instanceId;
const _forTrack2 = ($index, $item) => $item._id;
function NetworksComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 9);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_5_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showEnableNetworksWizard.set(true)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.enableButton"));
} }
function NetworksComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 9);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_6_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showCreateDialog.set(true)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 10);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_6_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showJoinDialog.set(true)); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "networks.createButton"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "networks.joinButton"));
} }
function NetworksComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵelement(1, "span", 11);
    i0.ɵɵelementEnd();
} }
function NetworksComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 12);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function NetworksComponent_Conditional_8_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.load()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "networks.loadError"))("reason", ctx_r1.loadError() ?? "");
} }
function NetworksComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6)(1, "div", 13);
    i0.ɵɵtext(2, "\uD83D\uDD17");
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
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 2, "networks.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 4, "networks.empty.body"));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 20);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const net_r6 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", ctx_r1.openVotes(net_r6.id).length, " ", i0.ɵɵpipeBind1(2, 3, "networks.header.pendingVote"));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "networks.network.invite.pubsubDescription"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "networks.network.invite.description"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 40);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "button", 41);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_8_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r8); const net_r6 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.copyInvite(net_r6.id)); });
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const net_r6 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.bundleJson(ctx));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.copiedInvite() === net_r6.id ? i0.ɵɵpipeBind1(4, 2, "common.copied") : i0.ɵɵpipeBind1(5, 4, "networks.network.invite.copyBundle"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_9_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 33);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 32);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_9_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r9); const net_r6 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.generateInvite(net_r6.id)); });
    i0.ɵɵconditionalCreate(1, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_9_Conditional_1_Template, 1, 0, "span", 33);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const net_r6 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("disabled", ctx_r1.generatingInvite[net_r6.id]);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.generatingInvite[net_r6.id] ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 3, "networks.network.invite.generateButton"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 33);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 33);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 42);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r10 = ctx;
    i0.ɵɵclassProp("alert-success", r_r10.ok)("alert-error", !r_r10.ok);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", r_r10.ok ? i0.ɵɵpipeBind1(2, 5, "networks.network.sync.success") : i0.ɵɵpipeBind1(3, 7, "networks.network.sync.failed"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 43);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.network.syncHistory.loading"));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 45);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_1_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r11); const net_r6 = i0.ɵɵnextContext(3).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryHistory(net_r6.id)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(5);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 3, "networks.network.syncHistory.loadError"))("reason", ctx_r1.historyError() ?? "")("icon", 28);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 43);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.network.syncHistory.empty"));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 51);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_8_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r12); const rec_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(6); return i0.ɵɵresetView(ctx_r1.toggleHistoryErrors(rec_r13._id)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const rec_r13 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(6);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.expandedError() === rec_r13._id ? i0.ɵɵpipeBind1(2, 1, "networks.network.syncHistory.hideErrors") : rec_r13.errors.length + " " + i0.ɵɵpipeBind1(3, 3, "networks.network.syncHistory.errorCountSuffix"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_9_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const e_r14 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(e_r14);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 50);
    i0.ɵɵrepeaterCreate(1, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_9_For_2_Template, 2, 1, "div", null, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const rec_r13 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(rec_r13.errors);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 46)(1, "span", 47);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "date");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 48);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span");
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(8, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_8_Template, 4, 5, "button", 49);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(9, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Conditional_9_Template, 3, 0, "div", 50);
} if (rf & 2) {
    const rec_r13 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(6);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(3, 9, rec_r13.completedAt, "dd.MM.yyyy HH:mm"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngClass", "status-" + rec_r13.status);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(rec_r13.status);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate4(" \u2193 ", rec_r13.pulled.memories + rec_r13.pulled.entities + rec_r13.pulled.edges, " + ", rec_r13.pulled.files, " files \u00A0 \u2191 ", rec_r13.pushed.memories + rec_r13.pushed.entities + rec_r13.pushed.edges, " + ", rec_r13.pushed.files, " files ");
    i0.ɵɵadvance();
    i0.ɵɵconditional((rec_r13.errors == null ? null : rec_r13.errors.length) ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.expandedError() === rec_r13._id && rec_r13.errors ? 9 : -1);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵrepeaterCreate(0, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_For_1_Template, 10, 12, null, null, _forTrack2);
} if (rf & 2) {
    const net_r6 = i0.ɵɵnextContext(3).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵrepeater(ctx_r1.historyForNet(net_r6.id));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_0_Template, 3, 3, "div", 43)(1, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_1_Template, 2, 5, "app-error-state", 44)(2, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_2_Template, 3, 3, "div", 43)(3, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Conditional_3_Template, 2, 0);
} if (rf & 2) {
    const net_r6 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional(ctx_r1.historyLoading() ? 0 : ctx_r1.historyError() !== null ? 1 : ctx_r1.historyForNet(net_r6.id).length === 0 ? 2 : 3);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 54);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵelement(2, "ph-icon", 59);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const m_r16 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵattribute("title", i0.ɵɵpipeBind2(1, 3, "networks.member.failingTitle", i0.ɵɵpureFunction1(9, _c0, m_r16.consecutiveFailures)));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(4, 6, "networks.member.failing", i0.ɵɵpureFunction1(11, _c0, m_r16.consecutiveFailures)), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "date");
} if (rf & 2) {
    const m_r16 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵtextInterpolate2(" ", i0.ɵɵpipeBind1(1, 2, "networks.member.synced"), " ", i0.ɵɵpipeBind2(2, 4, m_r16.lastSyncAt, "dd.MM.yyyy HH:mm"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "networks.member.neverSynced"), " ");
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 36)(1, "span", 52);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 53);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 19);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(7, NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Conditional_7_Template, 5, 13, "span", 54);
    i0.ɵɵelementStart(8, "span", 55);
    i0.ɵɵpipe(9, "date");
    i0.ɵɵconditionalCreate(10, NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Conditional_10_Template, 3, 7)(11, NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Conditional_11_Template, 2, 3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "a", 56);
    i0.ɵɵtext(13);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "button", 57);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Template_button_click_14_listener() { const m_r16 = i0.ɵɵrestoreView(_r15).$implicit; const net_r6 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.removeMember(net_r6, m_r16.instanceId, m_r16.label)); });
    i0.ɵɵelement(17, "ph-icon", 58);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const m_r16 = ctx.$implicit;
    const net_r6 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(m_r16.instanceId.slice(0, 8));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(m_r16.label);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(m_r16.syncDirection ?? "both");
    i0.ɵɵadvance();
    i0.ɵɵconditional(m_r16.consecutiveFailures ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", m_r16.lastSyncAt ? i0.ɵɵpipeBind2(9, 13, m_r16.lastSyncAt, "dd.MM.yyyy HH:mm") : "");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(m_r16.lastSyncAt ? 10 : 11);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("href", m_r16.endpoint, i0.ɵɵsanitizeUrl);
    i0.ɵɵattribute("title", m_r16.endpoint);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(m_r16.endpoint);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.removingMember[net_r6.id + ":" + m_r16.instanceId]);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(15, 16, "networks.network.members.removeTitle"))("aria-label", i0.ɵɵpipeBind1(16, 18, "networks.network.members.removeAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_For_5_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 33);
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_For_5_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 60)(1, "span", 21);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 61);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelement(6, "app-relative-time", 62);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "span", 63);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "button", 64);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_For_5_Template_button_click_10_listener() { const round_r18 = i0.ɵɵrestoreView(_r17).$implicit; const net_r6 = i0.ɵɵnextContext(3).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.castVote(net_r6.id, round_r18.id, "yes")); });
    i0.ɵɵconditionalCreate(11, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_For_5_Conditional_11_Template, 1, 0, "span", 33);
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "button", 65);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_For_5_Template_button_click_14_listener() { const round_r18 = i0.ɵɵrestoreView(_r17).$implicit; const net_r6 = i0.ɵɵnextContext(3).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.castVote(net_r6.id, round_r18.id, "veto")); });
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const round_r18 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(5);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate2("", round_r18.type, ": ", round_r18.subject);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(5, 10, "networks.network.votes.deadline"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", round_r18.deadline);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(9, 12, "networks.network.votes.tally", i0.ɵɵpureFunction2(19, _c1, ctx_r1.voteTally(round_r18).yes, ctx_r1.voteTally(round_r18).veto)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.votingRound[round_r18.id]);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.votingRound[round_r18.id] ? 11 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(13, 15, "networks.network.votes.yes"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.votingRound[round_r18.id]);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 17, "networks.network.votes.veto"));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 37)(1, "div", 26);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(4, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_For_5_Template, 17, 22, "div", 60, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const net_r6 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "networks.network.votes.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.openVotes(net_r6.id));
} }
function NetworksComponent_Conditional_10_For_2_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 24)(1, "div", 25)(2, "div", 26);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "p", 27);
    i0.ɵɵconditionalCreate(6, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_6_Template, 2, 3)(7, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_7_Template, 2, 3);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(8, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_8_Template, 6, 6)(9, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_9_Template, 4, 5, "button", 28);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "div", 29)(11, "div", 26);
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "div", 30)(15, "input", 31);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵlistener("ngModelChange", function NetworksComponent_Conditional_10_For_2_Conditional_14_Template_input_ngModelChange_15_listener($event) { i0.ɵɵrestoreView(_r7); const net_r6 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.netSchedule[net_r6.id] = $event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "button", 32);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Template_button_click_18_listener() { i0.ɵɵrestoreView(_r7); const net_r6 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.saveSchedule(net_r6)); });
    i0.ɵɵconditionalCreate(19, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_19_Template, 1, 0, "span", 33);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "button", 32);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Template_button_click_22_listener() { i0.ɵɵrestoreView(_r7); const net_r6 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.sync(net_r6.id)); });
    i0.ɵɵconditionalCreate(23, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_23_Template, 1, 0, "span", 33);
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(26, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_26_Template, 4, 9, "div", 34);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "div", 29)(28, "div", 35);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Template_div_click_28_listener() { i0.ɵɵrestoreView(_r7); const net_r6 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.toggleHistory(net_r6.id)); });
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelement(31, "ph-icon", 23);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(32, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_32_Template, 4, 1);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "div", 26);
    i0.ɵɵtext(34);
    i0.ɵɵpipe(35, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(36, NetworksComponent_Conditional_10_For_2_Conditional_14_For_37_Template, 18, 20, "div", 36, _forTrack1);
    i0.ɵɵconditionalCreate(38, NetworksComponent_Conditional_10_For_2_Conditional_14_Conditional_38_Template, 6, 3, "div", 37);
    i0.ɵɵelementStart(39, "div", 38)(40, "button", 39);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Conditional_14_Template_button_click_40_listener() { i0.ɵɵrestoreView(_r7); const net_r6 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.leaveNetwork(net_r6)); });
    i0.ɵɵtext(41);
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    let tmp_14_0;
    let tmp_26_0;
    const net_r6 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 22, "networks.network.invite.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(net_r6.type === "pubsub" ? 6 : 7);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_14_0 = ctx_r1.inviteBundle(net_r6.id)) ? 8 : 9, tmp_14_0);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 24, "networks.network.sync.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("ngModel", net_r6.syncSchedule ?? "")("name", "sched-" + net_r6.id)("placeholder", i0.ɵɵpipeBind1(16, 26, "networks.network.sync.schedulePlaceholder"));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(17, 28, "networks.network.sync.scheduleAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", ctx_r1.savingSchedule[net_r6.id]);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.savingSchedule[net_r6.id] ? 19 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(21, 30, "networks.network.sync.saveScheduleButton"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.syncingNet[net_r6.id]);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.syncingNet[net_r6.id] ? 23 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(25, 32, "networks.network.sync.syncNowButton"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_26_0 = ctx_r1.syncResult(net_r6.id)) ? 26 : -1, tmp_26_0);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(30, 34, "networks.network.syncHistory.title"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("name", ctx_r1.historyExpanded() === net_r6.id ? "caret-up" : "caret-down")("size", 12);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.historyExpanded() === net_r6.id ? 32 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(35, 36, "networks.network.members.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(net_r6.members);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.openVotes(net_r6.id).length > 0 ? 38 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 38, "networks.network.leaveButton"));
} }
function NetworksComponent_Conditional_10_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 15)(1, "div", 16);
    i0.ɵɵlistener("click", function NetworksComponent_Conditional_10_For_2_Template_div_click_1_listener() { const net_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.toggleNetwork(net_r6.id)); });
    i0.ɵɵelementStart(2, "span", 17);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 18);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span", 19);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(10, NetworksComponent_Conditional_10_For_2_Conditional_10_Template, 3, 5, "app-status-pill", 20);
    i0.ɵɵelement(11, "span", 21);
    i0.ɵɵelementStart(12, "span", 22);
    i0.ɵɵelement(13, "ph-icon", 23);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(14, NetworksComponent_Conditional_10_For_2_Conditional_14_Template, 43, 40, "div", 24);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const net_r6 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(net_r6.label);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngClass", ctx_r1.typeBadge(net_r6.type));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(net_r6.type);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate2("", net_r6.members.length, " ", net_r6.members.length === 1 ? i0.ɵɵpipeBind1(8, 9, "networks.memberBadge.singular") : i0.ɵɵpipeBind1(9, 11, "networks.memberBadge.plural"));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.openVotes(net_r6.id).length > 0 ? 10 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("name", ctx_r1.expanded() === net_r6.id ? "caret-up" : "caret-down")("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.expanded() === net_r6.id ? 14 : -1);
} }
function NetworksComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-summary-strip", 14);
    i0.ɵɵrepeaterCreate(1, NetworksComponent_Conditional_10_For_2_Template, 15, 13, "div", 15, _forTrack0);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("items", ctx_r1.summaryItems());
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.networks());
} }
function NetworksComponent_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r19 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-network-create-dialog", 66);
    i0.ɵɵlistener("created", function NetworksComponent_Conditional_11_Template_app_network_create_dialog_created_0_listener($event) { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onNetworkCreated($event)); })("close", function NetworksComponent_Conditional_11_Template_app_network_create_dialog_close_0_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showCreateDialog.set(false)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("availableSpaces", ctx_r1.availableSpaces())("spacesLoadFailed", ctx_r1.spacesLoadFailed());
} }
function NetworksComponent_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    const _r20 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-network-join-dialog", 67);
    i0.ɵɵlistener("joined", function NetworksComponent_Conditional_12_Template_app_network_join_dialog_joined_0_listener() { i0.ɵɵrestoreView(_r20); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onJoined()); })("close", function NetworksComponent_Conditional_12_Template_app_network_join_dialog_close_0_listener() { i0.ɵɵrestoreView(_r20); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showJoinDialog.set(false)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("availableSpaces", ctx_r1.availableSpaces())("myUrl", ctx_r1.joinMyUrl);
} }
function NetworksComponent_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r21 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-network-enable-wizard", 68);
    i0.ɵɵlistener("enabled", function NetworksComponent_Conditional_13_Template_app_network_enable_wizard_enabled_0_listener($event) { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onEnabled($event)); })("close", function NetworksComponent_Conditional_13_Template_app_network_enable_wizard_close_0_listener() { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showEnableNetworksWizard.set(false)); });
    i0.ɵɵelementEnd();
} }
export class NetworksComponent {
    constructor() {
        this.networksApi = inject(NetworksApi);
        this.spacesApi = inject(SpacesApi);
        this.adminApi = inject(AdminApi);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.networks = signal([], ...(ngDevMode ? [{ debugName: "networks" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Null until the last load failed — checked before the empty state, so a failure never reads as "no networks". */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.showCreateDialog = signal(false, ...(ngDevMode ? [{ debugName: "showCreateDialog" }] : /* istanbul ignore next */ []));
        this.showJoinDialog = signal(false, ...(ngDevMode ? [{ debugName: "showJoinDialog" }] : /* istanbul ignore next */ []));
        this.expanded = signal('', ...(ngDevMode ? [{ debugName: "expanded" }] : /* istanbul ignore next */ []));
        this.netSchedule = {};
        this.availableSpaces = signal([], ...(ngDevMode ? [{ debugName: "availableSpaces" }] : /* istanbul ignore next */ []));
        this.spacesLoadFailed = signal(false, ...(ngDevMode ? [{ debugName: "spacesLoadFailed" }] : /* istanbul ignore next */ []));
        this.inviteBundles = {};
        this.syncResults = {};
        this.votesByNetwork = {};
        this.copiedInvite = signal('', ...(ngDevMode ? [{ debugName: "copiedInvite" }] : /* istanbul ignore next */ []));
        // This brain's own URL — computed in ngOnInit (and the enable-networks flow) and passed to the join
        // dialog as its `myUrl`; also gates whether the enable-networks wizard is offered.
        this.joinMyUrl = '';
        this.joinMyUrlAutoFilled = signal(false, ...(ngDevMode ? [{ debugName: "joinMyUrlAutoFilled" }] : /* istanbul ignore next */ []));
        this.removingMember = {};
        // Per-network / per-round in-flight flags so each async action shows a spinner and disables its button
        // (default change detection re-renders on the settling HTTP response).
        this.generatingInvite = {};
        this.savingSchedule = {};
        this.syncingNet = {};
        this.votingRound = {};
        // Sync history state
        this.historyExpanded = signal('', ...(ngDevMode ? [{ debugName: "historyExpanded" }] : /* istanbul ignore next */ []));
        this.historyLoading = signal(false, ...(ngDevMode ? [{ debugName: "historyLoading" }] : /* istanbul ignore next */ []));
        /** Null until the sync history failed to load — else "no sync history yet" claims the sync never ran. */
        this.historyError = signal(null, ...(ngDevMode ? [{ debugName: "historyError" }] : /* istanbul ignore next */ []));
        this.expandedError = signal('', ...(ngDevMode ? [{ debugName: "expandedError" }] : /* istanbul ignore next */ []));
        this.historyByNetwork = {};
        // Whether this brain looks locally-reachable (so it needs the enable-networks wizard to get a public
        // URL before it can join). Derived from its own URL in ngOnInit; cleared when the wizard reports success.
        this.needsNetworkEnable = signal(false, ...(ngDevMode ? [{ debugName: "needsNetworkEnable" }] : /* istanbul ignore next */ []));
        this.showEnableNetworksWizard = signal(false, ...(ngDevMode ? [{ debugName: "showEnableNetworksWizard" }] : /* istanbul ignore next */ []));
        /** At-a-glance rollup atop the page. Recomputes when `networks` changes — and `loadVotes` always
         *  bumps `networks` after updating the vote cache, so the "need your vote" count stays live. */
        this.summaryItems = computed(() => {
            const tr = (k) => this.transloco.translate(k);
            const nets = this.networks();
            const needVote = nets.filter(n => this.openVotes(n.id).length > 0).length;
            const members = nets.reduce((sum, n) => sum + (n.members?.length ?? 0), 0);
            return [
                { label: tr('networks.summary.networks'), value: nets.length },
                { label: tr('networks.summary.needVote'), value: needVote, variant: needVote ? 'warn' : undefined },
                { label: tr('networks.summary.members'), value: members },
            ];
        }, ...(ngDevMode ? [{ debugName: "summaryItems" }] : /* istanbul ignore next */ []));
    }
    inviteBundle(id) { return this.inviteBundles[id]; }
    bundleJson(bundle) { return JSON.stringify(bundle, null, 2); }
    syncResult(id) { return this.syncResults[id]; }
    /** Yes/veto counts for an open vote round (for the row tally). */
    voteTally(round) {
        return {
            yes: round.votes.filter(v => v.vote === 'yes').length,
            veto: round.votes.filter(v => v.vote === 'veto').length,
        };
    }
    ngOnInit() {
        this.load();
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces }) => this.availableSpaces.set(spaces),
            error: () => this.spacesLoadFailed.set(true),
        });
        // Auto-fill this brain's URL: prefer the server-configured publicUrl, fall
        // back to the current browser origin (works for most single-brain deployments).
        this.adminApi.getAbout().subscribe({
            next: (info) => {
                // Prefer server-configured publicUrl; fall back to current browser origin.
                // window.location.origin returns the string 'null' in sandboxed/restricted contexts.
                const url = info.publicUrl || window.location.origin;
                if (url && url !== 'null') {
                    this.joinMyUrl = url;
                    this.joinMyUrlAutoFilled.set(true);
                    this.needsNetworkEnable.set(this.isLocalOrPrivateUrl(url));
                }
            },
            error: () => {
                // window.location.origin can be the string 'null' in sandboxed/file:// contexts
                const origin = window.location.origin;
                if (origin && origin !== 'null') {
                    this.joinMyUrl = origin;
                    this.joinMyUrlAutoFilled.set(true);
                    this.needsNetworkEnable.set(this.isLocalOrPrivateUrl(origin));
                }
            },
        });
    }
    /** The enable-networks wizard (child) reports success with this brain's now-public URL; adopt it and
     *  drop the enable prompt. */
    onEnabled(url) {
        this.joinMyUrl = url;
        this.joinMyUrlAutoFilled.set(true);
        this.needsNetworkEnable.set(false);
    }
    isLocalOrPrivateUrl(raw) {
        try {
            const u = new URL(raw);
            const host = u.hostname.toLowerCase();
            if (host === 'localhost' || host === '::1')
                return true;
            if (/^127\./.test(host))
                return true;
            if (/^10\./.test(host))
                return true;
            if (/^192\.168\./.test(host))
                return true;
            if (/^169\.254\./.test(host))
                return true;
            if (/^172\.(1[6-9]|2\d|3[01])\./.test(host))
                return true;
            if (/^f[cd][0-9a-f]{0,2}:/i.test(host))
                return true;
            if (/^fe[89ab][0-9a-f]:/i.test(host))
                return true;
            return false;
        }
        catch {
            return true;
        }
    }
    load() {
        this.loading.set(true);
        this.loadError.set(null);
        this.networksApi.listNetworks().subscribe({
            next: ({ networks }) => {
                this.networks.set(networks);
                this.loading.set(false);
                // Load votes for each network
                for (const net of networks)
                    this.loadVotes(net.id);
            },
            error: (err) => { this.loadError.set(httpErrorReason(err)); this.loading.set(false); },
        });
    }
    toggleNetwork(id) {
        this.expanded.update(v => v === id ? '' : id);
    }
    /** The create dialog (child component) emits the new network; append it and close. */
    onNetworkCreated(net) {
        this.networks.update(list => [...list, net]);
        this.showCreateDialog.set(false);
    }
    async leaveNetwork(net) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('networks.confirm.leaveTitle'),
            message: this.transloco.translate('networks.confirm.leave', { label: net.label }),
            confirmLabel: this.transloco.translate('networks.leaveButton'),
            danger: true,
        });
        if (!ok)
            return;
        this.networksApi.leaveNetwork(net.id).subscribe({
            next: () => this.networks.update(list => list.filter(n => n.id !== net.id)),
            error: (err) => this.toast.error(err.error?.error ?? this.transloco.translate('networks.error.leaveFailed')),
        });
    }
    generateInvite(networkId) {
        this.generatingInvite[networkId] = true;
        this.networksApi.generateInvite(networkId).subscribe({
            next: (bundle) => {
                delete this.generatingInvite[networkId];
                this.inviteBundles[networkId] = bundle;
                this.networks.update(n => [...n]);
            },
            error: (err) => {
                delete this.generatingInvite[networkId];
                this.toast.error(err.error?.error ?? this.transloco.translate('networks.error.generateInviteFailed'));
            },
        });
    }
    copyInvite(networkId) {
        const bundle = this.inviteBundles[networkId];
        if (!bundle)
            return;
        navigator.clipboard.writeText(JSON.stringify(bundle, null, 2)).then(() => {
            this.copiedInvite.set(networkId);
            setTimeout(() => this.copiedInvite.set(''), 2000);
        });
    }
    saveSchedule(net) {
        const schedule = this.netSchedule[net.id] ?? net.syncSchedule ?? '';
        this.savingSchedule[net.id] = true;
        this.networksApi.updateNetworkSchedule(net.id, schedule).subscribe({
            next: () => {
                delete this.savingSchedule[net.id];
                this.networks.update(list => list.map(n => n.id === net.id ? { ...n, syncSchedule: schedule || undefined } : n));
            },
            error: (err) => {
                delete this.savingSchedule[net.id];
                this.toast.error(err.error?.error ?? this.transloco.translate('networks.error.saveScheduleFailed'));
            },
        });
    }
    /** The join dialog (child) emits after a successful join; reload networks and refresh the spaces list
     *  (a join can create new local spaces). */
    onJoined() {
        this.load();
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces }) => this.availableSpaces.set(spaces),
            error: () => { },
        });
    }
    async removeMember(net, instanceId, label) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('networks.confirm.removeMemberTitle'),
            message: this.transloco.translate('networks.confirm.removeMember', { label, networkLabel: net.label }),
            confirmLabel: this.transloco.translate('common.remove'),
            danger: true,
        });
        if (!ok)
            return;
        const key = `${net.id}:${instanceId}`;
        this.removingMember[key] = true;
        this.networksApi.removeMember(net.id, instanceId).subscribe({
            next: () => {
                delete this.removingMember[key];
                this.load();
            },
            error: (err) => {
                delete this.removingMember[key];
                this.toast.error(err.error?.error ?? this.transloco.translate('networks.error.removeMemberFailed'));
            },
        });
    }
    sync(networkId) {
        this.syncingNet[networkId] = true;
        this.networksApi.triggerSync(networkId).subscribe({
            next: (r) => {
                delete this.syncingNet[networkId];
                this.syncResults[networkId] = r;
                this.networks.update(n => [...n]);
                setTimeout(() => { delete this.syncResults[networkId]; this.networks.update(n => [...n]); }, 4000);
                // Auto-refresh history after sync completes (give it a moment)
                if (this.historyExpanded() === networkId) {
                    setTimeout(() => this.loadHistory(networkId), 3000);
                }
            },
            error: () => {
                delete this.syncingNet[networkId];
                this.syncResults[networkId] = { ok: false };
                this.networks.update(n => [...n]);
            },
        });
    }
    toggleHistory(networkId) {
        if (this.historyExpanded() === networkId) {
            this.historyExpanded.set('');
        }
        else {
            this.historyExpanded.set(networkId);
            this.loadHistory(networkId);
        }
    }
    historyForNet(networkId) {
        return this.historyByNetwork[networkId] ?? [];
    }
    toggleHistoryErrors(recordId) {
        this.expandedError.update(v => v === recordId ? '' : recordId);
    }
    /** Public so the history panel's error state can retry the one network it belongs to. */
    retryHistory(networkId) {
        this.loadHistory(networkId);
    }
    loadHistory(networkId) {
        this.historyLoading.set(true);
        this.historyError.set(null);
        this.networksApi.getSyncHistory(networkId).subscribe({
            next: ({ history }) => {
                this.historyByNetwork[networkId] = history;
                this.historyLoading.set(false);
                this.networks.update(n => [...n]);
            },
            error: (err) => { this.historyError.set(httpErrorReason(err)); this.historyLoading.set(false); },
        });
    }
    loadVotes(networkId) {
        this.networksApi.listVotes(networkId).subscribe({
            next: ({ rounds }) => {
                this.votesByNetwork[networkId] = rounds.filter(r => r.status === 'open');
                this.networks.update(n => [...n]);
            },
            error: () => { },
        });
    }
    openVotes(networkId) {
        return this.votesByNetwork[networkId] ?? [];
    }
    async castVote(networkId, roundId, vote) {
        // A veto is destructive — it blocks a pending join/governance round — so confirm it first. A "yes"
        // is safe and stays one click.
        if (vote === 'veto') {
            const ok = await this.confirmDialog.confirm({
                title: this.transloco.translate('networks.confirm.vetoTitle'),
                message: this.transloco.translate('networks.confirm.veto'),
                confirmLabel: this.transloco.translate('networks.network.votes.veto'),
                danger: true,
            });
            if (!ok)
                return;
        }
        this.votingRound[roundId] = true;
        this.networksApi.castVote(networkId, roundId, vote).subscribe({
            next: () => { delete this.votingRound[roundId]; this.loadVotes(networkId); },
            error: (err) => {
                delete this.votingRound[roundId];
                this.toast.error(err.error?.error ?? this.transloco.translate('networks.error.castVoteFailed'));
            },
        });
    }
    typeBadge(type) {
        const map = {
            closed: 'badge-gray',
            democratic: 'badge-green',
            club: 'badge-blue',
            braintree: 'badge-purple',
            pubsub: 'badge-orange',
        };
        return map[type] ?? 'badge-gray';
    }
    static { this.ɵfac = function NetworksComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || NetworksComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: NetworksComponent, selectors: [["app-networks"]], decls: 14, vars: 8, consts: [[2, "display", "flex", "justify-content", "space-between", "align-items", "center", "margin-bottom", "12px"], [1, "card-title"], [2, "display", "flex", "gap", "8px"], [1, "btn-primary", "btn", "btn-sm"], [1, "loading-overlay"], [3, "message", "reason"], [1, "empty-state"], [3, "availableSpaces", "spacesLoadFailed"], [3, "availableSpaces", "myUrl"], [1, "btn-primary", "btn", "btn-sm", 3, "click"], [1, "btn-secondary", "btn", "btn-sm", 3, "click"], [1, "spinner"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], [2, "display", "block", "margin-bottom", "16px", 3, "items"], [1, "network-card"], [1, "network-card-header", 3, "click"], [1, "network-name"], [1, "badge", 3, "ngClass"], [1, "badge", "badge-gray"], ["variant", "warn", 3, "dot"], [2, "flex", "1"], [2, "color", "var(--text-muted)", "display", "inline-flex"], [3, "name", "size"], [1, "network-body"], [2, "margin-bottom", "16px", "margin-top", "12px"], [1, "section-title"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin", "0 0 8px"], [1, "btn-secondary", "btn", "btn-sm", 3, "disabled"], [2, "margin-bottom", "16px"], [2, "display", "flex", "gap", "8px", "align-items", "center", "flex-wrap", "wrap"], ["type", "text", 2, "flex", "1", "min-width", "220px", 3, "ngModelChange", "ngModel", "name", "placeholder"], [1, "btn-secondary", "btn", "btn-sm", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "alert", 2, "margin-top", "8px", 3, "alert-success", "alert-error"], [1, "section-title", 2, "cursor", "pointer", "display", "inline-flex", "align-items", "center", "gap", "4px", 3, "click"], [1, "member-row"], [2, "margin-top", "16px"], [2, "margin-top", "16px", "padding-top", "12px", "border-top", "1px solid var(--border-muted)"], [1, "btn-danger", "btn", "btn-sm", 3, "click"], [1, "code-block", 2, "margin-bottom", "8px", "font-size", "11px", "white-space", "pre-wrap", "word-break", "break-all"], [1, "btn-ghost", "btn", "btn-sm", 3, "click"], [1, "alert", 2, "margin-top", "8px"], [2, "padding", "8px 0", "color", "var(--text-muted)", "font-size", "12px"], [3, "message", "reason", "icon"], [3, "retry", "message", "reason", "icon"], [1, "history-row"], [2, "color", "var(--text-muted)"], [1, "status-badge", 3, "ngClass"], [1, "btn-ghost", "btn", "btn-sm", 2, "font-size", "11px"], [2, "padding", "4px 0 8px 8px", "font-size", "11px", "color", "var(--error)"], [1, "btn-ghost", "btn", "btn-sm", 2, "font-size", "11px", 3, "click"], [1, "mono", "badge", "badge-gray", 2, "font-size", "11px"], [2, "font-weight", "500", "flex", "1"], [1, "member-failing"], [1, "member-sync"], ["target", "_blank", "rel", "noopener", 1, "member-endpoint", 3, "href"], [1, "btn-danger", "btn", "btn-sm", 2, "padding", "2px 8px", 3, "click", "disabled"], ["name", "x", 3, "size"], ["name", "warning", 3, "size"], [1, "vote-row"], [2, "font-size", "11px", "color", "var(--text-muted)", "white-space", "nowrap"], [3, "value"], [1, "num", 2, "font-size", "11px", "color", "var(--text-muted)", "white-space", "nowrap"], [1, "btn-primary", "btn", "btn-sm", 3, "click", "disabled"], [1, "btn-danger", "btn", "btn-sm", 3, "click", "disabled"], [3, "created", "close", "availableSpaces", "spacesLoadFailed"], [3, "joined", "close", "availableSpaces", "myUrl"], [3, "enabled", "close"]], template: function NetworksComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "div", 2);
            i0.ɵɵconditionalCreate(5, NetworksComponent_Conditional_5_Template, 3, 3, "button", 3)(6, NetworksComponent_Conditional_6_Template, 6, 6);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(7, NetworksComponent_Conditional_7_Template, 2, 0, "div", 4)(8, NetworksComponent_Conditional_8_Template, 2, 4, "app-error-state", 5)(9, NetworksComponent_Conditional_9_Template, 9, 6, "div", 6)(10, NetworksComponent_Conditional_10_Template, 3, 1);
            i0.ɵɵconditionalCreate(11, NetworksComponent_Conditional_11_Template, 1, 2, "app-network-create-dialog", 7);
            i0.ɵɵconditionalCreate(12, NetworksComponent_Conditional_12_Template, 1, 2, "app-network-join-dialog", 8);
            i0.ɵɵconditionalCreate(13, NetworksComponent_Conditional_13_Template, 1, 0, "app-network-enable-wizard");
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 6, "networks.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.needsNetworkEnable() ? 5 : 6);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.loading() ? 7 : ctx.loadError() !== null ? 8 : ctx.networks().length === 0 ? 9 : 10);
            i0.ɵɵadvance(4);
            i0.ɵɵconditional(ctx.showCreateDialog() ? 11 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showJoinDialog() ? 12 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showEnableNetworksWizard() ? 13 : -1);
        } }, dependencies: [CommonModule, i1.NgClass, FormsModule, i2.DefaultValueAccessor, i2.NgControlStatus, i2.NgModel, PhIconComponent, StatusPillComponent, SummaryStripComponent, RelativeTimeComponent, ErrorStateComponent, NetworkCreateDialogComponent, NetworkJoinDialogComponent, NetworkEnableWizardComponent, i1.DatePipe, TranslocoPipe], styles: [".network-card[_ngcontent-%COMP%] {\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      margin-bottom: 16px;\n      overflow: hidden;\n    }\n\n    .network-card-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      padding: 16px 20px;\n      cursor: pointer;\n      user-select: none;\n    }\n\n    .network-card-header[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n\n    .network-name[_ngcontent-%COMP%] {\n      font-size: 14px;\n      font-weight: 600;\n      color: var(--text-primary);\n      flex: 1;\n    }\n\n    .network-body[_ngcontent-%COMP%] {\n      padding: 0 20px 16px;\n      border-top: 1px solid var(--border-muted);\n    }\n\n    .member-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 8px 0;\n      border-bottom: 1px solid var(--border-muted);\n      font-size: 13px;\n      flex-wrap: wrap; \n\n    }\n    \n\n    .member-endpoint[_ngcontent-%COMP%] {\n      flex: 1 1 160px;\n      min-width: 0;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n      font-size: 11px;\n      color: var(--text-muted);\n    }\n\n    .member-row[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .member-sync[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); white-space: nowrap; }\n    .member-failing[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; font-size: 11px; white-space: nowrap;\n      padding: 1px 7px; border-radius: 10px; color: var(--error);\n      background: color-mix(in srgb, var(--error) 12%, transparent);\n      border: 1px solid color-mix(in srgb, var(--error) 45%, transparent);\n    }\n\n    .vote-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 8px 10px;\n      background: var(--bg-elevated);\n      border-radius: var(--radius-sm);\n      margin-bottom: 8px;\n      font-size: 13px;\n    }\n\n    .history-row[_ngcontent-%COMP%] {\n      display: grid;\n      grid-template-columns: 140px 70px 1fr auto;\n      gap: 8px;\n      align-items: center;\n      padding: 6px 0;\n      border-bottom: 1px solid var(--border-muted);\n      font-size: 12px;\n    }\n    .history-row[_ngcontent-%COMP%]    > span[_ngcontent-%COMP%]:nth-child(3) { min-width: 0; } \n\n    \n\n    @media (max-width: 680px) {\n      .history-row[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; }\n    }\n\n    .history-row[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n\n    .status-badge[_ngcontent-%COMP%] {\n      display: inline-block;\n      padding: 2px 8px;\n      border-radius: 10px;\n      font-size: 11px;\n      font-weight: 600;\n    }\n\n    .status-success[_ngcontent-%COMP%] { background: var(--status-success-bg); color: var(--status-success-fg); }\n    .status-partial[_ngcontent-%COMP%] { background: var(--status-warning-bg); color: var(--status-warning-fg); }\n    .status-failed[_ngcontent-%COMP%]  { background: var(--status-error-bg);   color: var(--status-error-fg); }\n    .create-join-row[_ngcontent-%COMP%] { display: flex; gap: 24px; margin-bottom: 24px; }\n    .create-join-row[_ngcontent-%COMP%]    > .card[_ngcontent-%COMP%] { flex: 1; min-width: 0; margin-bottom: 0; }\n    @media (max-width: 900px) { .create-join-row[_ngcontent-%COMP%] { flex-direction: column; } }\n    .spaces-toggle-list[_ngcontent-%COMP%] {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 6px;\n      margin-top: 6px;\n    }\n    .space-toggle-item[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 4px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      cursor: pointer;\n      font-size: 12px;\n      background: var(--bg-surface);\n      transition: background var(--transition), border-color var(--transition);\n      user-select: none;\n    }\n    .space-toggle-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n    .space-toggle-item[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] { width: 13px; height: 13px; margin: 0; flex-shrink: 0; }\n    .space-toggle-item[_ngcontent-%COMP%]   .space-id[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 11px; font-family: var(--font-mono); }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(NetworksComponent, [{
        type: Component,
        args: [{ selector: 'app-networks', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, StatusPillComponent, SummaryStripComponent, RelativeTimeComponent, ErrorStateComponent, NetworkCreateDialogComponent, NetworkJoinDialogComponent, NetworkEnableWizardComponent], template: `
    <!-- Network list (shown first) -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div class="card-title">{{ 'networks.title' | transloco }}</div>
      <div style="display:flex; gap:8px;">
        @if (needsNetworkEnable()) {
          <button class="btn-primary btn btn-sm" (click)="showEnableNetworksWizard.set(true)">{{ 'networks.enableButton' | transloco }}</button>
        } @else {
          <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'networks.createButton' | transloco }}</button>
          <button class="btn-secondary btn btn-sm" (click)="showJoinDialog.set(true)">{{ 'networks.joinButton' | transloco }}</button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (loadError() !== null) {
      <app-error-state [message]="'networks.loadError' | transloco" [reason]="loadError() ?? ''" (retry)="load()" />
    } @else if (networks().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <h3>{{ 'networks.empty.title' | transloco }}</h3>
        <p>{{ 'networks.empty.body' | transloco }}</p>
      </div>
    } @else {
      <app-summary-strip [items]="summaryItems()" style="display:block; margin-bottom:16px;" />
      @for (net of networks(); track net.id) {
        <div class="network-card">
          <div class="network-card-header" (click)="toggleNetwork(net.id)">
            <span class="network-name">{{ net.label }}</span>
            <span class="badge" [ngClass]="typeBadge(net.type)">{{ net.type }}</span>
            <span class="badge badge-gray">{{ net.members.length }} {{ net.members.length === 1 ? ('networks.memberBadge.singular' | transloco) : ('networks.memberBadge.plural' | transloco) }}</span>
            @if (openVotes(net.id).length > 0) {
              <app-status-pill variant="warn" [dot]="true">{{ openVotes(net.id).length }} {{ 'networks.header.pendingVote' | transloco }}</app-status-pill>
            }
            <span style="flex:1;"></span>
            <span style="color:var(--text-muted); display:inline-flex;"><ph-icon [name]="expanded() === net.id ? 'caret-up' : 'caret-down'" [size]="14" /></span>
          </div>

          @if (expanded() === net.id) {
            <div class="network-body">

              <!-- Invite bundle -->
              <div style="margin-bottom:16px; margin-top:12px;">
                <div class="section-title">{{ 'networks.network.invite.title' | transloco }}</div>
                <p style="font-size:12px; color:var(--text-muted); margin:0 0 8px;">
                  @if (net.type === 'pubsub') {
                    {{ 'networks.network.invite.pubsubDescription' | transloco }}
                  } @else {
                    {{ 'networks.network.invite.description' | transloco }}
                  }
                </p>
                @if (inviteBundle(net.id); as bundle) {
                  <div class="code-block" style="margin-bottom:8px; font-size:11px; white-space:pre-wrap; word-break:break-all;">{{ bundleJson(bundle) }}</div>
                  <button class="btn-ghost btn btn-sm" (click)="copyInvite(net.id)">
                    {{ copiedInvite() === net.id ? ('common.copied' | transloco) : ('networks.network.invite.copyBundle' | transloco) }}
                  </button>
                } @else {
                  <button class="btn-secondary btn btn-sm" [disabled]="generatingInvite[net.id]" (click)="generateInvite(net.id)">
                    @if (generatingInvite[net.id]) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'networks.network.invite.generateButton' | transloco }}
                  </button>
                }
              </div>

              <!-- Sync -->
              <div style="margin-bottom:16px;">
                <div class="section-title">{{ 'networks.network.sync.title' | transloco }}</div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <input
                    type="text"
                    [ngModel]="net.syncSchedule ?? ''"
                    (ngModelChange)="netSchedule[net.id] = $event"
                    [name]="'sched-' + net.id"
                    [placeholder]="'networks.network.sync.schedulePlaceholder' | transloco"
                    [attr.aria-label]="'networks.network.sync.scheduleAriaLabel' | transloco"
                    style="flex:1; min-width:220px;"
                  />
                  <button class="btn-secondary btn btn-sm" [disabled]="savingSchedule[net.id]" (click)="saveSchedule(net)">
                    @if (savingSchedule[net.id]) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'networks.network.sync.saveScheduleButton' | transloco }}
                  </button>
                  <button class="btn-secondary btn btn-sm" [disabled]="syncingNet[net.id]" (click)="sync(net.id)">
                    @if (syncingNet[net.id]) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'networks.network.sync.syncNowButton' | transloco }}
                  </button>
                </div>
                @if (syncResult(net.id); as r) {
                  <div class="alert" [class.alert-success]="r.ok" [class.alert-error]="!r.ok" style="margin-top:8px;">
                    {{ r.ok ? ('networks.network.sync.success' | transloco) : ('networks.network.sync.failed' | transloco) }}
                  </div>
                }
              </div>

              <!-- Sync History -->
              <div style="margin-bottom:16px;">
                <div class="section-title" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px;" (click)="toggleHistory(net.id)">
                  {{ 'networks.network.syncHistory.title' | transloco }} <ph-icon [name]="historyExpanded() === net.id ? 'caret-up' : 'caret-down'" [size]="12" />
                </div>
                @if (historyExpanded() === net.id) {
                  @if (historyLoading()) {
                    <div style="padding:8px 0; color:var(--text-muted); font-size:12px;">{{ 'networks.network.syncHistory.loading' | transloco }}</div>
                  } @else if (historyError() !== null) {
                    <app-error-state [message]="'networks.network.syncHistory.loadError' | transloco"
                                     [reason]="historyError() ?? ''" [icon]="28" (retry)="retryHistory(net.id)" />
                  } @else if (historyForNet(net.id).length === 0) {
                    <div style="padding:8px 0; color:var(--text-muted); font-size:12px;">{{ 'networks.network.syncHistory.empty' | transloco }}</div>
                  } @else {
                    @for (rec of historyForNet(net.id); track rec._id) {
                      <div class="history-row">
                        <span style="color:var(--text-muted);">{{ rec.completedAt | date:'dd.MM.yyyy HH:mm' }}</span>
                        <span class="status-badge" [ngClass]="'status-' + rec.status">{{ rec.status }}</span>
                        <span>
                          ↓ {{ rec.pulled.memories + rec.pulled.entities + rec.pulled.edges }}
                          + {{ rec.pulled.files }} files &nbsp;
                          ↑ {{ rec.pushed.memories + rec.pushed.entities + rec.pushed.edges }}
                          + {{ rec.pushed.files }} files
                        </span>
                        @if (rec.errors?.length) {
                          <button class="btn-ghost btn btn-sm" style="font-size:11px;"
                            (click)="toggleHistoryErrors(rec._id)">
                            {{ expandedError() === rec._id ? ('networks.network.syncHistory.hideErrors' | transloco) : (rec.errors!.length + ' ' + ('networks.network.syncHistory.errorCountSuffix' | transloco)) }}
                          </button>
                        }
                      </div>
                      @if (expandedError() === rec._id && rec.errors) {
                        <div style="padding:4px 0 8px 8px; font-size:11px; color:var(--error);">
                          @for (e of rec.errors; track e) {
                            <div>{{ e }}</div>
                          }
                        </div>
                      }
                    }
                  }
                }
              </div>

              <!-- Members -->
              <div class="section-title">{{ 'networks.network.members.title' | transloco }}</div>
              @for (m of net.members; track m.instanceId) {
                <div class="member-row">
                  <span class="mono badge badge-gray" style="font-size:11px;">{{ m.instanceId.slice(0, 8) }}</span>
                  <span style="font-weight:500; flex:1;">{{ m.label }}</span>
                  <span class="badge badge-gray">{{ m.syncDirection ?? 'both' }}</span>
                  <!-- Sync health at a glance: last successful sync + a failing badge when a run streak is failing. -->
                  @if (m.consecutiveFailures) {
                    <span class="member-failing" [attr.title]="'networks.member.failingTitle' | transloco: { count: m.consecutiveFailures }">
                      <ph-icon name="warning" [size]="11"/> {{ 'networks.member.failing' | transloco: { count: m.consecutiveFailures } }}
                    </span>
                  }
                  <span class="member-sync" [attr.title]="m.lastSyncAt ? (m.lastSyncAt | date:'dd.MM.yyyy HH:mm') : ''">
                    @if (m.lastSyncAt) { {{ 'networks.member.synced' | transloco }} {{ m.lastSyncAt | date:'dd.MM.yyyy HH:mm' }} }
                    @else { {{ 'networks.member.neverSynced' | transloco }} }
                  </span>
                  <a class="member-endpoint" [href]="m.endpoint" target="_blank" rel="noopener" [attr.title]="m.endpoint">{{ m.endpoint }}</a>
                  <button
                    class="btn-danger btn btn-sm"
                    style="padding:2px 8px;"
                    [disabled]="removingMember[net.id + ':' + m.instanceId]"
                    (click)="removeMember(net, m.instanceId, m.label)"
                    [attr.title]="'networks.network.members.removeTitle' | transloco"
                    [attr.aria-label]="'networks.network.members.removeAriaLabel' | transloco"
                  ><ph-icon name="x" [size]="14"/></button>
                </div>
              }

              <!-- Open votes -->
              @if (openVotes(net.id).length > 0) {
                <div style="margin-top:16px;">
                  <div class="section-title">{{ 'networks.network.votes.title' | transloco }}</div>
                  @for (round of openVotes(net.id); track round.id) {
                    <div class="vote-row">
                      <span style="flex:1;">{{ round.type }}: {{ round.subject }}</span>
                      <span style="font-size:11px; color:var(--text-muted); white-space:nowrap;">
                        {{ 'networks.network.votes.deadline' | transloco }} <app-relative-time [value]="round.deadline" />
                      </span>
                      <span class="num" style="font-size:11px; color:var(--text-muted); white-space:nowrap;">
                        {{ 'networks.network.votes.tally' | transloco: { yes: voteTally(round).yes, veto: voteTally(round).veto } }}
                      </span>
                      <button class="btn-primary btn btn-sm" [disabled]="votingRound[round.id]" (click)="castVote(net.id, round.id, 'yes')">
                        @if (votingRound[round.id]) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                        {{ 'networks.network.votes.yes' | transloco }}
                      </button>
                      <button class="btn-danger btn btn-sm" [disabled]="votingRound[round.id]" (click)="castVote(net.id, round.id, 'veto')">{{ 'networks.network.votes.veto' | transloco }}</button>
                    </div>
                  }
                </div>
              }

              <!-- Leave -->
              <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-muted);">
                <button class="btn-danger btn btn-sm" (click)="leaveNetwork(net)">{{ 'networks.network.leaveButton' | transloco }}</button>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- Create Network dialog -->
    @if (showCreateDialog()) {
      <app-network-create-dialog
        [availableSpaces]="availableSpaces()"
        [spacesLoadFailed]="spacesLoadFailed()"
        (created)="onNetworkCreated($event)"
        (close)="showCreateDialog.set(false)"
      />
    }

    <!-- Join Network dialog -->
    @if (showJoinDialog()) {
      <app-network-join-dialog
        [availableSpaces]="availableSpaces()"
        [myUrl]="joinMyUrl"
        (joined)="onJoined()"
        (close)="showJoinDialog.set(false)"
      />
    }

    <!-- Enable Networks wizard -->
    @if (showEnableNetworksWizard()) {
      <app-network-enable-wizard
        (enabled)="onEnabled($event)"
        (close)="showEnableNetworksWizard.set(false)"
      />
    }
  `, styles: ["\n    .network-card {\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      margin-bottom: 16px;\n      overflow: hidden;\n    }\n\n    .network-card-header {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      padding: 16px 20px;\n      cursor: pointer;\n      user-select: none;\n    }\n\n    .network-card-header:hover { background: var(--bg-elevated); }\n\n    .network-name {\n      font-size: 14px;\n      font-weight: 600;\n      color: var(--text-primary);\n      flex: 1;\n    }\n\n    .network-body {\n      padding: 0 20px 16px;\n      border-top: 1px solid var(--border-muted);\n    }\n\n    .member-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 8px 0;\n      border-bottom: 1px solid var(--border-muted);\n      font-size: 13px;\n      flex-wrap: wrap; /* narrow iframe: the endpoint URL + delete wrap to the next line, never overflow */\n    }\n    /* The peer endpoint can be a long URL \u2014 let it shrink and ellipsize instead of pushing the row wide. */\n    .member-endpoint {\n      flex: 1 1 160px;\n      min-width: 0;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n      font-size: 11px;\n      color: var(--text-muted);\n    }\n\n    .member-row:last-child { border-bottom: none; }\n    .member-sync { font-size: 11px; color: var(--text-muted); white-space: nowrap; }\n    .member-failing {\n      display: inline-flex; align-items: center; gap: 3px; font-size: 11px; white-space: nowrap;\n      padding: 1px 7px; border-radius: 10px; color: var(--error);\n      background: color-mix(in srgb, var(--error) 12%, transparent);\n      border: 1px solid color-mix(in srgb, var(--error) 45%, transparent);\n    }\n\n    .vote-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 8px 10px;\n      background: var(--bg-elevated);\n      border-radius: var(--radius-sm);\n      margin-bottom: 8px;\n      font-size: 13px;\n    }\n\n    .history-row {\n      display: grid;\n      grid-template-columns: 140px 70px 1fr auto;\n      gap: 8px;\n      align-items: center;\n      padding: 6px 0;\n      border-bottom: 1px solid var(--border-muted);\n      font-size: 12px;\n    }\n    .history-row > span:nth-child(3) { min-width: 0; } /* let the counts cell shrink instead of overflowing */\n    /* Narrow iframe: drop the fixed grid and let the cells wrap. */\n    @media (max-width: 680px) {\n      .history-row { display: flex; flex-wrap: wrap; }\n    }\n\n    .history-row:last-child { border-bottom: none; }\n\n    .status-badge {\n      display: inline-block;\n      padding: 2px 8px;\n      border-radius: 10px;\n      font-size: 11px;\n      font-weight: 600;\n    }\n\n    .status-success { background: var(--status-success-bg); color: var(--status-success-fg); }\n    .status-partial { background: var(--status-warning-bg); color: var(--status-warning-fg); }\n    .status-failed  { background: var(--status-error-bg);   color: var(--status-error-fg); }\n    .create-join-row { display: flex; gap: 24px; margin-bottom: 24px; }\n    .create-join-row > .card { flex: 1; min-width: 0; margin-bottom: 0; }\n    @media (max-width: 900px) { .create-join-row { flex-direction: column; } }\n    .spaces-toggle-list {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 6px;\n      margin-top: 6px;\n    }\n    .space-toggle-item {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 4px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      cursor: pointer;\n      font-size: 12px;\n      background: var(--bg-surface);\n      transition: background var(--transition), border-color var(--transition);\n      user-select: none;\n    }\n    .space-toggle-item:hover { background: var(--bg-elevated); }\n    .space-toggle-item input[type=checkbox] { width: 13px; height: 13px; margin: 0; flex-shrink: 0; }\n    .space-toggle-item .space-id { color: var(--text-muted); font-size: 11px; font-family: var(--font-mono); }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(NetworksComponent, { className: "NetworksComponent", filePath: "app/pages/settings/networks.component.ts", lineNumber: 379 }); })();
