import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AdminApi } from '../../core/admin-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { WEBHOOK_EVENT_GROUPS, } from '../../core/api.types';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ n: a0 });
const _forTrack0 = ($index, $item) => $item.group;
const _forTrack1 = ($index, $item) => $item.id;
function WebhooksComponent_Conditional_0_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.formError());
} }
function WebhooksComponent_Conditional_0_Conditional_33_For_2_For_5_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "label", 28)(1, "input", 29);
    i0.ɵɵlistener("change", function WebhooksComponent_Conditional_0_Conditional_33_For_2_For_5_Template_input_change_1_listener() { const ev_r5 = i0.ɵɵrestoreView(_r4).$implicit; const f_r3 = i0.ɵɵnextContext(3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.toggleEvent(f_r3, ev_r5)); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ev_r5 = ctx.$implicit;
    const f_r3 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵproperty("checked", f_r3.events.has(ev_r5));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ev_r5, " ");
} }
function WebhooksComponent_Conditional_0_Conditional_33_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 26)(1, "div", 27);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(4, WebhooksComponent_Conditional_0_Conditional_33_For_2_For_5_Template, 3, 2, "label", 28, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const g_r6 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "webhooks.eventGroup." + g_r6.group));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(g_r6.events);
} }
function WebhooksComponent_Conditional_0_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 20);
    i0.ɵɵrepeaterCreate(1, WebhooksComponent_Conditional_0_Conditional_33_For_2_Template, 6, 3, "div", 26, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.eventGroups);
} }
function WebhooksComponent_Conditional_0_Conditional_39_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "label", 28)(1, "input", 29);
    i0.ɵɵlistener("change", function WebhooksComponent_Conditional_0_Conditional_39_For_2_Template_input_change_1_listener() { const s_r8 = i0.ɵɵrestoreView(_r7).$implicit; const f_r3 = i0.ɵɵnextContext(2); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.toggleSpace(f_r3, s_r8.id)); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r8 = ctx.$implicit;
    const f_r3 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("checked", f_r3.spaces.has(s_r8.id));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", s_r8.label, " ");
} }
function WebhooksComponent_Conditional_0_Conditional_39_ForEmpty_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 30);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "webhooks.field.noSpaces"));
} }
function WebhooksComponent_Conditional_0_Conditional_39_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 20);
    i0.ɵɵrepeaterCreate(1, WebhooksComponent_Conditional_0_Conditional_39_For_2_Template, 3, 2, "label", 28, _forTrack1, false, WebhooksComponent_Conditional_0_Conditional_39_ForEmpty_3_Template, 3, 3, "span", 30);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.spaces());
} }
function WebhooksComponent_Conditional_0_Conditional_50_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 25);
} }
function WebhooksComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 9);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function WebhooksComponent_Conditional_0_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeForm()); })("click", function WebhooksComponent_Conditional_0_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 10)(4, "div", 3);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 11);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_0_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeForm()); });
    i0.ɵɵelement(9, "ph-icon", 12);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(10, WebhooksComponent_Conditional_0_Conditional_10_Template, 2, 1, "div", 13);
    i0.ɵɵelementStart(11, "div", 14)(12, "label");
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "input", 15);
    i0.ɵɵtwoWayListener("ngModelChange", function WebhooksComponent_Conditional_0_Template_input_ngModelChange_15_listener($event) { const f_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(f_r3.url, $event) || (f_r3.url = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "span", 16);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "div", 14)(20, "label");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "input", 17);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function WebhooksComponent_Conditional_0_Template_input_ngModelChange_23_listener($event) { const f_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(f_r3.secret, $event) || (f_r3.secret = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(25, "span", 16);
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(28, "div", 14)(29, "label", 18)(30, "input", 19);
    i0.ɵɵtwoWayListener("ngModelChange", function WebhooksComponent_Conditional_0_Template_input_ngModelChange_30_listener($event) { const f_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(f_r3.allEvents, $event) || (f_r3.allEvents = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(33, WebhooksComponent_Conditional_0_Conditional_33_Template, 3, 0, "div", 20);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "div", 14)(35, "label", 18)(36, "input", 19);
    i0.ɵɵtwoWayListener("ngModelChange", function WebhooksComponent_Conditional_0_Template_input_ngModelChange_36_listener($event) { const f_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(f_r3.allSpaces, $event) || (f_r3.allSpaces = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(39, WebhooksComponent_Conditional_0_Conditional_39_Template, 4, 1, "div", 20);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(40, "div", 21)(41, "label", 18)(42, "input", 19);
    i0.ɵɵtwoWayListener("ngModelChange", function WebhooksComponent_Conditional_0_Template_input_ngModelChange_42_listener($event) { const f_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(f_r3.enabled, $event) || (f_r3.enabled = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(43);
    i0.ɵɵpipe(44, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(45, "div", 22)(46, "button", 23);
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_0_Template_button_click_46_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeForm()); });
    i0.ɵɵtext(47);
    i0.ɵɵpipe(48, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(49, "button", 24);
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_0_Template_button_click_49_listener() { const f_r3 = i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.save(f_r3)); });
    i0.ɵɵconditionalCreate(50, WebhooksComponent_Conditional_0_Conditional_50_Template, 1, 0, "span", 25);
    i0.ɵɵtext(51);
    i0.ɵɵpipe(52, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const f_r3 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 24, f_r3.id ? "webhooks.dialog.editTitle" : "webhooks.dialog.createTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 26, f_r3.id ? "webhooks.dialog.editTitle" : "webhooks.dialog.createTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 28, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.formError() ? 10 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 30, "webhooks.field.url"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", f_r3.url);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 32, "webhooks.field.urlHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 34, "webhooks.field.secret"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", f_r3.secret);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(24, 36, f_r3.id ? "webhooks.field.secretKeep" : "webhooks.field.secretPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 38, "webhooks.field.secretHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", f_r3.allEvents);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(32, 40, "webhooks.field.allEvents"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!f_r3.allEvents ? 33 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", f_r3.allSpaces);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(38, 42, "webhooks.field.allSpaces"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!f_r3.allSpaces ? 39 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", f_r3.enabled);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(44, 44, "webhooks.field.enabled"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(48, 46, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.saving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.saving() ? 50 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(52, 48, f_r3.id ? "common.save" : "webhooks.dialog.createButton"), " ");
} }
function WebhooksComponent_Conditional_1_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 33);
    i0.ɵɵelement(1, "span", 36);
    i0.ɵɵelementEnd();
} }
function WebhooksComponent_Conditional_1_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 34);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "webhooks.deliveries.empty"));
} }
function WebhooksComponent_Conditional_1_Conditional_14_For_18_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 16);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const dl_r10 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" \u00B7 ", dl_r10.error);
} }
function WebhooksComponent_Conditional_1_Conditional_14_For_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 37);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵconditionalCreate(5, WebhooksComponent_Conditional_1_Conditional_14_For_18_Conditional_5_Template, 2, 1, "span", 16);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "td", 38);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "td", 30);
    i0.ɵɵelement(9, "app-relative-time", 39);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dl_r10 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(dl_r10.event);
    i0.ɵɵadvance();
    i0.ɵɵclassMap(dl_r10.success ? "del-ok" : "del-fail");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", dl_r10.responseStatus || "\u2014", " ");
    i0.ɵɵadvance();
    i0.ɵɵconditional(!dl_r10.success && dl_r10.error ? 5 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", dl_r10.latencyMs, " ms");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", dl_r10.timestamp);
} }
function WebhooksComponent_Conditional_1_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 35)(1, "table")(2, "thead")(3, "tr")(4, "th");
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
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(16, "tbody");
    i0.ɵɵrepeaterCreate(17, WebhooksComponent_Conditional_1_Conditional_14_For_18_Template, 10, 7, "tr", null, _forTrack1);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 4, "webhooks.deliveries.event"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 6, "webhooks.deliveries.status"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 8, "webhooks.deliveries.latency"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 10, "webhooks.deliveries.when"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r1.deliveries());
} }
function WebhooksComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 31);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function WebhooksComponent_Conditional_1_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.deliveriesFor.set(null)); })("click", function WebhooksComponent_Conditional_1_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 10)(4, "div", 3);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 11);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_1_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.deliveriesFor.set(null)); });
    i0.ɵɵelement(9, "ph-icon", 12);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "div", 32);
    i0.ɵɵtext(11);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(12, WebhooksComponent_Conditional_1_Conditional_12_Template, 2, 0, "div", 33)(13, WebhooksComponent_Conditional_1_Conditional_13_Template, 3, 3, "p", 34)(14, WebhooksComponent_Conditional_1_Conditional_14_Template, 19, 12, "div", 35);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 6, "webhooks.deliveries.title"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 8, "webhooks.deliveries.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 10, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx.url);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.deliveriesLoading() ? 12 : ctx_r1.deliveries().length === 0 ? 13 : 14);
} }
function WebhooksComponent_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵelement(1, "span", 36);
    i0.ɵɵelementEnd();
} }
function WebhooksComponent_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 40);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function WebhooksComponent_Conditional_15_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.load()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 1, "webhooks.loadError"));
} }
function WebhooksComponent_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 8)(1, "h3");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "p");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "webhooks.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 4, "webhooks.empty.body"));
} }
function WebhooksComponent_Conditional_17_For_21_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 16);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const w_r13 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "webhooks.failures", i0.ɵɵpureFunction1(4, _c0, w_r13.consecutiveFailures)));
} }
function WebhooksComponent_Conditional_17_For_21_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 48);
} }
function WebhooksComponent_Conditional_17_For_21_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 42);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td", 43);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "td", 43);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "td")(12, "span", 44)(13, "app-status-pill", 45);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(16, WebhooksComponent_Conditional_17_For_21_Conditional_16_Template, 3, 6, "span", 16);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(17, "td")(18, "div", 46)(19, "button", 47);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_17_For_21_Template_button_click_19_listener() { const w_r13 = i0.ɵɵrestoreView(_r12).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.test(w_r13)); });
    i0.ɵɵconditionalCreate(21, WebhooksComponent_Conditional_17_For_21_Conditional_21_Template, 1, 0, "span", 48);
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "button", 23);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_17_For_21_Template_button_click_24_listener() { const w_r13 = i0.ɵɵrestoreView(_r12).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.openDeliveries(w_r13)); });
    i0.ɵɵelement(26, "ph-icon", 49);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "button", 23);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_17_For_21_Template_button_click_27_listener() { const w_r13 = i0.ɵɵrestoreView(_r12).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.openEdit(w_r13)); });
    i0.ɵɵelement(29, "ph-icon", 50);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(30, "button", 51);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵlistener("click", function WebhooksComponent_Conditional_17_For_21_Template_button_click_30_listener() { const w_r13 = i0.ɵɵrestoreView(_r12).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.remove(w_r13)); });
    i0.ɵɵelement(32, "ph-icon", 52);
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const w_r13 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(w_r13.url);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(w_r13.events.length ? w_r13.events.length + " " + i0.ɵɵpipeBind1(5, 17, "webhooks.selected") : i0.ɵɵpipeBind1(6, 19, "webhooks.all"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(w_r13.spaces.length ? w_r13.spaces.length + " " + i0.ɵɵpipeBind1(9, 21, "webhooks.selected") : i0.ɵɵpipeBind1(10, 23, "webhooks.all"));
    i0.ɵɵadvance(5);
    i0.ɵɵproperty("variant", ctx_r1.statusVariant(w_r13.status))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 25, "webhooks.status." + w_r13.status));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(w_r13.consecutiveFailures > 0 ? 16 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", ctx_r1.testingIds().has(w_r13.id));
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(20, 27, "webhooks.action.test"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.testingIds().has(w_r13.id) ? 21 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(23, 29, "webhooks.action.test"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(25, 31, "webhooks.action.deliveries"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(28, 33, "common.edit"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(31, 35, "common.delete"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
} }
function WebhooksComponent_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-summary-strip", 41);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵelementStart(2, "div", 35)(3, "table")(4, "thead")(5, "tr")(6, "th");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "th");
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "th");
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "th");
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(18, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "tbody");
    i0.ɵɵrepeaterCreate(20, WebhooksComponent_Conditional_17_For_21_Template, 33, 37, "tr", null, _forTrack1);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(1, 6, "webhooks.title"))("items", ctx_r1.summary());
    i0.ɵɵadvance(7);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 8, "webhooks.col.url"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 10, "webhooks.col.events"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 12, "webhooks.col.spaces"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 14, "webhooks.col.status"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r1.sortedWebhooks());
} }
export class WebhooksComponent {
    constructor() {
        this.admin = inject(AdminApi);
        this.spacesApi = inject(SpacesApi);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.transloco = inject(TranslocoService);
        this.eventGroups = WEBHOOK_EVENT_GROUPS;
        this.webhooks = signal([], ...(ngDevMode ? [{ debugName: "webhooks" }] : /* istanbul ignore next */ []));
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.loadError = signal(false, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.form = signal(null, ...(ngDevMode ? [{ debugName: "form" }] : /* istanbul ignore next */ []));
        this.saving = signal(false, ...(ngDevMode ? [{ debugName: "saving" }] : /* istanbul ignore next */ []));
        this.formError = signal('', ...(ngDevMode ? [{ debugName: "formError" }] : /* istanbul ignore next */ []));
        this.deliveriesFor = signal(null, ...(ngDevMode ? [{ debugName: "deliveriesFor" }] : /* istanbul ignore next */ []));
        this.deliveries = signal([], ...(ngDevMode ? [{ debugName: "deliveries" }] : /* istanbul ignore next */ []));
        this.deliveriesLoading = signal(false, ...(ngDevMode ? [{ debugName: "deliveriesLoading" }] : /* istanbul ignore next */ []));
        /** Per-row in-flight state for the Test action (spinner + disabled while queuing). */
        this.testingIds = signal(new Set(), ...(ngDevMode ? [{ debugName: "testingIds" }] : /* istanbul ignore next */ []));
        /** Failing first, then disabled, then active — an operational problem should read at the top. */
        this.sortedWebhooks = computed(() => {
            const rank = { failing: 0, disabled: 1, active: 2 };
            return [...this.webhooks()].sort((a, b) => rank[a.status] - rank[b.status]);
        }, ...(ngDevMode ? [{ debugName: "sortedWebhooks" }] : /* istanbul ignore next */ []));
        /** Operator health rollup: total endpoints + failing/disabled counts (shown only when > 0). */
        this.summary = computed(() => {
            const ws = this.webhooks();
            const failing = ws.filter(w => w.status === 'failing').length;
            const disabled = ws.filter(w => w.status === 'disabled').length;
            const tr = (k) => this.transloco.translate(k);
            const items = [{ label: tr('webhooks.summary.endpoints'), value: ws.length }];
            if (failing)
                items.push({ label: tr('webhooks.summary.failing'), value: failing, variant: 'error' });
            if (disabled)
                items.push({ label: tr('webhooks.summary.disabled'), value: disabled, variant: 'off' });
            return items;
        }, ...(ngDevMode ? [{ debugName: "summary" }] : /* istanbul ignore next */ []));
    }
    statusVariant(s) {
        return s === 'failing' ? 'error' : s === 'disabled' ? 'off' : 'active';
    }
    ngOnInit() {
        this.load();
        this.spacesApi.listSpaces().subscribe({ next: ({ spaces }) => this.spaces.set(spaces), error: () => { } });
    }
    load() {
        this.loading.set(true);
        this.loadError.set(false);
        this.admin.listWebhooks().subscribe({
            next: ({ webhooks }) => { this.webhooks.set(webhooks); this.loading.set(false); },
            error: () => { this.loadError.set(true); this.loading.set(false); },
        });
    }
    openCreate() {
        this.formError.set('');
        this.form.set({ id: null, url: '', secret: '', enabled: true, allEvents: true, events: new Set(), allSpaces: true, spaces: new Set() });
    }
    openEdit(w) {
        this.formError.set('');
        this.form.set({
            id: w.id, url: w.url, secret: '', enabled: w.enabled,
            allEvents: w.events.length === 0, events: new Set(w.events),
            allSpaces: w.spaces.length === 0, spaces: new Set(w.spaces),
        });
    }
    closeForm() { this.form.set(null); }
    toggleEvent(f, ev) {
        f.events.has(ev) ? f.events.delete(ev) : f.events.add(ev);
    }
    toggleSpace(f, id) {
        f.spaces.has(id) ? f.spaces.delete(id) : f.spaces.add(id);
    }
    save(f) {
        this.saving.set(true);
        this.formError.set('');
        const body = {
            url: f.url.trim(),
            events: f.allEvents ? [] : [...f.events],
            spaces: f.allSpaces ? [] : [...f.spaces],
            enabled: f.enabled,
            // Only send the secret when the user typed one (server never returns it, so blank on edit = keep).
            ...(f.secret ? { secret: f.secret } : {}),
        };
        const req$ = f.id ? this.admin.updateWebhook(f.id, body) : this.admin.createWebhook(body);
        req$.subscribe({
            next: () => {
                this.saving.set(false);
                this.toast.success(this.transloco.translate(f.id ? 'webhooks.toast.updated' : 'webhooks.toast.created'));
                this.closeForm();
                this.load();
            },
            error: (err) => { this.saving.set(false); this.formError.set(err.error?.error ?? this.transloco.translate('webhooks.toast.saveFailed')); },
        });
    }
    test(w) {
        this.testingIds.update(s => new Set(s).add(w.id));
        this.admin.testWebhook(w.id).subscribe({
            next: () => { this.clearTesting(w.id); this.toast.success(this.transloco.translate('webhooks.toast.testQueued')); },
            error: (err) => { this.clearTesting(w.id); this.toast.error(err.error?.error ?? this.transloco.translate('webhooks.toast.testFailed')); },
        });
    }
    clearTesting(id) {
        this.testingIds.update(s => { const n = new Set(s); n.delete(id); return n; });
    }
    async remove(w) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('webhooks.delete.title'),
            message: this.transloco.translate('webhooks.delete.message', { url: w.url }),
            confirmLabel: this.transloco.translate('common.delete'),
            danger: true,
        });
        if (!ok)
            return;
        this.admin.deleteWebhook(w.id).subscribe({
            next: () => { this.toast.success(this.transloco.translate('webhooks.toast.deleted')); this.load(); },
            error: (err) => this.toast.error(err.error?.error ?? this.transloco.translate('webhooks.toast.deleteFailed')),
        });
    }
    openDeliveries(w) {
        this.deliveriesFor.set(w);
        this.deliveries.set([]);
        this.deliveriesLoading.set(true);
        this.admin.getWebhookDeliveries(w.id).subscribe({
            next: ({ deliveries }) => { this.deliveries.set(deliveries); this.deliveriesLoading.set(false); },
            error: () => { this.deliveriesLoading.set(false); this.toast.error(this.transloco.translate('webhooks.toast.deliveriesFailed')); },
        });
    }
    static { this.ɵfac = function WebhooksComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || WebhooksComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: WebhooksComponent, selectors: [["app-webhooks"]], decls: 18, vars: 12, consts: [[1, "dialog-backdrop"], [1, "card"], [1, "card-header"], [1, "card-title"], [1, "card-subtitle"], [1, "btn", "btn-primary", "btn-sm", 3, "click"], [1, "loading-overlay"], [3, "message"], [1, "empty-state", 2, "padding", "32px"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], ["type", "button", 1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "alert", "alert-error", 2, "margin-bottom", "14px"], [1, "field", 2, "margin-bottom", "14px"], ["type", "url", "placeholder", "https://example.com/hook", 3, "ngModelChange", "ngModel"], [1, "muted", 2, "font-size", "11px"], ["type", "password", "autocomplete", "new-password", 3, "ngModelChange", "ngModel", "placeholder"], [2, "display", "flex", "align-items", "center", "gap", "6px"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [2, "margin-top", "8px"], [1, "field", 2, "margin-bottom", "20px"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"], ["type", "button", 1, "btn", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [1, "ev-group"], [1, "ev-group-label"], [1, "ev-check"], ["type", "checkbox", 3, "change", "checked"], [1, "muted", 2, "font-size", "12px"], ["appModalCloseOnBackdrop", "", 1, "dialog", "wide", 3, "dismiss", "click", "appModal"], [1, "url-cell", "muted", 2, "margin-bottom", "12px"], [2, "text-align", "center", "padding", "16px"], [1, "muted", 2, "font-size", "13px"], ["hscrollTop", "", 1, "table-wrapper"], [1, "spinner"], [2, "font-family", "var(--font-mono)", "font-size", "12px"], [2, "font-variant-numeric", "tabular-nums"], [3, "value"], [3, "retry", "message"], [2, "display", "block", "margin", "0 0 16px", 3, "heading", "items"], [1, "url-cell"], [2, "font-size", "12px"], [2, "display", "inline-flex", "align-items", "center", "gap", "6px", "flex-wrap", "wrap"], [3, "variant", "dot"], [2, "display", "flex", "gap", "6px", "justify-content", "flex-end", "flex-wrap", "wrap"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], ["name", "list-bullets", 3, "size"], ["name", "pencil-simple", 3, "size"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", "danger", 3, "click"], ["name", "trash", 3, "size"]], template: function WebhooksComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, WebhooksComponent_Conditional_0_Template, 53, 50, "div", 0);
            i0.ɵɵconditionalCreate(1, WebhooksComponent_Conditional_1_Template, 15, 12, "div", 0);
            i0.ɵɵelementStart(2, "div", 1)(3, "div", 2)(4, "div")(5, "div", 3);
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(8, "div", 4);
            i0.ɵɵtext(9);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(11, "button", 5);
            i0.ɵɵlistener("click", function WebhooksComponent_Template_button_click_11_listener() { return ctx.openCreate(); });
            i0.ɵɵtext(12);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(14, WebhooksComponent_Conditional_14_Template, 2, 0, "div", 6)(15, WebhooksComponent_Conditional_15_Template, 2, 3, "app-error-state", 7)(16, WebhooksComponent_Conditional_16_Template, 7, 6, "div", 8)(17, WebhooksComponent_Conditional_17_Template, 22, 16);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            let tmp_0_0;
            let tmp_1_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.form()) ? 0 : -1, tmp_0_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_1_0 = ctx.deliveriesFor()) ? 1 : -1, tmp_1_0);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 6, "webhooks.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 8, "webhooks.subtitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 10, "webhooks.createButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.loading() ? 14 : ctx.loadError() ? 15 : ctx.webhooks().length === 0 ? 16 : 17);
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.CheckboxControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, ModalDirective, ErrorStateComponent,
            SummaryStripComponent, StatusPillComponent, RelativeTimeComponent, HscrollTopDirective,
            TranslocoPipe], styles: [".dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n    .dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:92vw; max-width:560px; max-height:88vh; overflow-y:auto; }\n    .dialog.wide[_ngcontent-%COMP%] { max-width:760px; }\n    .dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }\n    .url-cell[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; word-break:break-all; max-width:320px; }\n    .ev-group[_ngcontent-%COMP%] { margin-bottom:10px; }\n    .ev-group-label[_ngcontent-%COMP%] { font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:4px; }\n    .ev-check[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:5px; margin:2px 12px 2px 0; font-size:12px; font-family:var(--font-mono); }\n    .del-ok[_ngcontent-%COMP%] { color:var(--success, #16a34a); }\n    .del-fail[_ngcontent-%COMP%] { color:var(--danger); }\n    .muted[_ngcontent-%COMP%] { color:var(--text-muted); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(WebhooksComponent, [{
        type: Component,
        args: [{ selector: 'app-webhooks', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, ErrorStateComponent,
                    SummaryStripComponent, StatusPillComponent, RelativeTimeComponent, HscrollTopDirective], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <!-- CREATE / EDIT DIALOG -->
    @if (form(); as f) {
      <div class="dialog-backdrop">
        <div class="dialog" [appModal]="(f.id ? 'webhooks.dialog.editTitle' : 'webhooks.dialog.createTitle') | transloco" (dismiss)="closeForm()" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div class="card-title">{{ (f.id ? 'webhooks.dialog.editTitle' : 'webhooks.dialog.createTitle') | transloco }}</div>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeForm()"><ph-icon name="x" [size]="16"/></button>
          </div>

          @if (formError()) { <div class="alert alert-error" style="margin-bottom:14px;">{{ formError() }}</div> }

          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'webhooks.field.url' | transloco }}</label>
            <input type="url" [(ngModel)]="f.url" placeholder="https://example.com/hook" />
            <span class="muted" style="font-size:11px;">{{ 'webhooks.field.urlHint' | transloco }}</span>
          </div>

          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'webhooks.field.secret' | transloco }}</label>
            <input type="password" [(ngModel)]="f.secret" autocomplete="new-password"
              [placeholder]="(f.id ? 'webhooks.field.secretKeep' : 'webhooks.field.secretPlaceholder') | transloco" />
            <span class="muted" style="font-size:11px;">{{ 'webhooks.field.secretHint' | transloco }}</span>
          </div>

          <div class="field" style="margin-bottom:14px;">
            <label style="display:flex;align-items:center;gap:6px;">
              <input type="checkbox" [(ngModel)]="f.allEvents" /> {{ 'webhooks.field.allEvents' | transloco }}
            </label>
            @if (!f.allEvents) {
              <div style="margin-top:8px;">
                @for (g of eventGroups; track g.group) {
                  <div class="ev-group">
                    <div class="ev-group-label">{{ 'webhooks.eventGroup.' + g.group | transloco }}</div>
                    @for (ev of g.events; track ev) {
                      <label class="ev-check">
                        <input type="checkbox" [checked]="f.events.has(ev)" (change)="toggleEvent(f, ev)" /> {{ ev }}
                      </label>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="field" style="margin-bottom:14px;">
            <label style="display:flex;align-items:center;gap:6px;">
              <input type="checkbox" [(ngModel)]="f.allSpaces" /> {{ 'webhooks.field.allSpaces' | transloco }}
            </label>
            @if (!f.allSpaces) {
              <div style="margin-top:8px;">
                @for (s of spaces(); track s.id) {
                  <label class="ev-check">
                    <input type="checkbox" [checked]="f.spaces.has(s.id)" (change)="toggleSpace(f, s.id)" /> {{ s.label }}
                  </label>
                } @empty { <span class="muted" style="font-size:12px;">{{ 'webhooks.field.noSpaces' | transloco }}</span> }
              </div>
            }
          </div>

          <div class="field" style="margin-bottom:20px;">
            <label style="display:flex;align-items:center;gap:6px;">
              <input type="checkbox" [(ngModel)]="f.enabled" /> {{ 'webhooks.field.enabled' | transloco }}
            </label>
          </div>

          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" type="button" (click)="closeForm()">{{ 'common.cancel' | transloco }}</button>
            <button class="btn btn-primary" type="button" (click)="save(f)" [disabled]="saving()">
              @if (saving()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
              {{ (f.id ? 'common.save' : 'webhooks.dialog.createButton') | transloco }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- DELIVERIES DIALOG -->
    @if (deliveriesFor(); as d) {
      <div class="dialog-backdrop">
        <div class="dialog wide" [appModal]="'webhooks.deliveries.title' | transloco" appModalCloseOnBackdrop (dismiss)="deliveriesFor.set(null)" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div class="card-title">{{ 'webhooks.deliveries.title' | transloco }}</div>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="deliveriesFor.set(null)"><ph-icon name="x" [size]="16"/></button>
          </div>
          <div class="url-cell muted" style="margin-bottom:12px;">{{ d.url }}</div>
          @if (deliveriesLoading()) {
            <div style="text-align:center;padding:16px;"><span class="spinner"></span></div>
          } @else if (deliveries().length === 0) {
            <p class="muted" style="font-size:13px;">{{ 'webhooks.deliveries.empty' | transloco }}</p>
          } @else {
            <div class="table-wrapper" hscrollTop>
              <table>
                <thead><tr>
                  <th>{{ 'webhooks.deliveries.event' | transloco }}</th>
                  <th>{{ 'webhooks.deliveries.status' | transloco }}</th>
                  <th>{{ 'webhooks.deliveries.latency' | transloco }}</th>
                  <th>{{ 'webhooks.deliveries.when' | transloco }}</th>
                </tr></thead>
                <tbody>
                  @for (dl of deliveries(); track dl.id) {
                    <tr>
                      <td style="font-family:var(--font-mono);font-size:12px;">{{ dl.event }}</td>
                      <td [class]="dl.success ? 'del-ok' : 'del-fail'">
                        {{ dl.responseStatus || '—' }}
                        @if (!dl.success && dl.error) { <span class="muted" style="font-size:11px;"> · {{ dl.error }}</span> }
                      </td>
                      <td style="font-variant-numeric:tabular-nums;">{{ dl.latencyMs }} ms</td>
                      <td class="muted" style="font-size:12px;"><app-relative-time [value]="dl.timestamp"/></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    }

    <!-- PAGE -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">{{ 'webhooks.title' | transloco }}</div>
          <div class="card-subtitle">{{ 'webhooks.subtitle' | transloco }}</div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openCreate()">{{ 'webhooks.createButton' | transloco }}</button>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (loadError()) {
        <app-error-state [message]="'webhooks.loadError' | transloco" (retry)="load()" />
      } @else if (webhooks().length === 0) {
        <div class="empty-state" style="padding:32px;"><h3>{{ 'webhooks.empty.title' | transloco }}</h3><p>{{ 'webhooks.empty.body' | transloco }}</p></div>
      } @else {
        <app-summary-strip [heading]="'webhooks.title' | transloco" [items]="summary()" style="display:block;margin:0 0 16px;"/>
        <div class="table-wrapper" hscrollTop>
          <table>
            <thead><tr>
              <th>{{ 'webhooks.col.url' | transloco }}</th>
              <th>{{ 'webhooks.col.events' | transloco }}</th>
              <th>{{ 'webhooks.col.spaces' | transloco }}</th>
              <th>{{ 'webhooks.col.status' | transloco }}</th>
              <th></th>
            </tr></thead>
            <tbody>
              <!-- failing hooks sorted to the top so an operational problem reads first -->
              @for (w of sortedWebhooks(); track w.id) {
                <tr>
                  <td class="url-cell">{{ w.url }}</td>
                  <td style="font-size:12px;">{{ w.events.length ? w.events.length + ' ' + ('webhooks.selected' | transloco) : ('webhooks.all' | transloco) }}</td>
                  <td style="font-size:12px;">{{ w.spaces.length ? w.spaces.length + ' ' + ('webhooks.selected' | transloco) : ('webhooks.all' | transloco) }}</td>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <app-status-pill [variant]="statusVariant(w.status)" [dot]="true">{{ 'webhooks.status.' + w.status | transloco }}</app-status-pill>
                      @if (w.consecutiveFailures > 0) {
                        <span class="muted" style="font-size:11px;">{{ 'webhooks.failures' | transloco: { n: w.consecutiveFailures } }}</span>
                      }
                    </span>
                  </td>
                  <td>
                    <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
                      <button class="btn btn-secondary btn-sm" type="button" (click)="test(w)" [disabled]="testingIds().has(w.id)" [attr.title]="'webhooks.action.test' | transloco">
                        @if (testingIds().has(w.id)) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                        {{ 'webhooks.action.test' | transloco }}
                      </button>
                      <button class="btn btn-secondary btn-sm" type="button" (click)="openDeliveries(w)" [attr.title]="'webhooks.action.deliveries' | transloco"><ph-icon name="list-bullets" [size]="14"/></button>
                      <button class="btn btn-secondary btn-sm" type="button" (click)="openEdit(w)" [attr.title]="'common.edit' | transloco"><ph-icon name="pencil-simple" [size]="14"/></button>
                      <button class="btn btn-secondary btn-sm danger" type="button" (click)="remove(w)" [attr.title]="'common.delete' | transloco"><ph-icon name="trash" [size]="14"/></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `, styles: ["\n    .dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n    .dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:92vw; max-width:560px; max-height:88vh; overflow-y:auto; }\n    .dialog.wide { max-width:760px; }\n    .dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }\n    .url-cell { font-family:var(--font-mono); font-size:12px; word-break:break-all; max-width:320px; }\n    .ev-group { margin-bottom:10px; }\n    .ev-group-label { font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:4px; }\n    .ev-check { display:inline-flex; align-items:center; gap:5px; margin:2px 12px 2px 0; font-size:12px; font-family:var(--font-mono); }\n    .del-ok { color:var(--success, #16a34a); }\n    .del-fail { color:var(--danger); }\n    .muted { color:var(--text-muted); }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(WebhooksComponent, { className: "WebhooksComponent", filePath: "app/pages/settings/webhooks.component.ts", lineNumber: 232 }); })();
