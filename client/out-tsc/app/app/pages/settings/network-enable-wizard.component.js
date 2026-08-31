import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworksApi } from '../../core/networks-api.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = () => [1, 2, 3];
const _c1 = a0 => ({ current: a0, total: 3 });
function NetworkEnableWizardComponent_For_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} if (rf & 2) {
    const n_r1 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("active", ctx_r1.enableWizardStep() === n_r1)("done", ctx_r1.enableWizardStep() > n_r1);
} }
function NetworkEnableWizardComponent_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 9);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.enableWizardError());
} }
function NetworkEnableWizardComponent_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "p", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p", 11);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "ul", 12)(7, "li");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "li");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "li");
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(16, "div", 13)(17, "button", 14);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_17_Template_button_click_17_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.close.emit()); });
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "button", 15);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_17_Template_button_click_20_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.enableWizardStep.set(2)); });
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 7, "networks.wizard.step1.p1"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 9, "networks.wizard.step1.p2"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 11, "networks.wizard.step1.whyItem"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 13, "networks.wizard.step1.riskItem"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 15, "networks.wizard.step1.resultItem"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 17, "common.cancel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 19, "networks.wizard.continue"));
} }
function NetworkEnableWizardComponent_Conditional_18_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.localAgentStatusMessage());
} }
function NetworkEnableWizardComponent_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, NetworkEnableWizardComponent_Conditional_18_Conditional_0_Template, 2, 1, "div", 16);
    i0.ɵɵelementStart(1, "p", 11);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 17)(5, "label");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "input", 18);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkEnableWizardComponent_Conditional_18_Template_input_ngModelChange_8_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.enableHostname, $event) || (ctx_r1.enableHostname = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "div", 17)(11, "label");
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "select", 19);
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkEnableWizardComponent_Conditional_18_Template_select_ngModelChange_14_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.enableOs, $event) || (ctx_r1.enableOs = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(15, "option", 20);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "option", 21);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(21, "div", 17)(22, "label", 22)(23, "input", 23);
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkEnableWizardComponent_Conditional_18_Template_input_ngModelChange_23_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.enableAutostart, $event) || (ctx_r1.enableAutostart = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(26, "div", 17)(27, "label", 22)(28, "input", 24);
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkEnableWizardComponent_Conditional_18_Template_input_ngModelChange_28_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.enableOverwriteDns, $event) || (ctx_r1.enableOverwriteDns = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(31, "div", 25);
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(34, "div", 17)(35, "label", 26)(36, "input", 27);
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkEnableWizardComponent_Conditional_18_Template_input_ngModelChange_36_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.enableAcknowledgeCritical, $event) || (ctx_r1.enableAcknowledgeCritical = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(37, "span");
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(40, "div", 13)(41, "button", 14);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_18_Template_button_click_41_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.enableWizardStep.set(1)); });
    i0.ɵɵtext(42);
    i0.ɵɵpipe(43, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(44, "button", 15);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_18_Template_button_click_44_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.prepareEnableWizardCommands()); });
    i0.ɵɵtext(45);
    i0.ɵɵpipe(46, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.localAgentStatusMessage() ? 0 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 18, "networks.wizard.step2.hostnameHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 20, "networks.wizard.step2.publicHostnameLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.enableHostname);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(9, 22, "networks.wizard.step2.publicHostnamePlaceholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 24, "networks.wizard.step2.osLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.enableOs);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 26, "networks.wizard.step2.os.windows"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 28, "networks.wizard.step2.os.linux"));
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.enableAutostart);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(25, 30, "networks.wizard.step2.autostart"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.enableOverwriteDns);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(30, 32, "networks.wizard.step2.overwriteDns"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 34, "networks.wizard.step2.overwriteDnsHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.enableAcknowledgeCritical);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 36, "networks.wizard.step2.ackCritical"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(43, 38, "networks.wizard.back"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(46, 40, "networks.wizard.continue"));
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.wizard.step3.checkingStatus"));
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.wizard.step3.autoReady"));
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.wizard.step3.autoUnavailable"));
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.localAgentStatusMessage());
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_4_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 32);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.enableWindowsCommand());
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_4_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 32);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.enableLinuxCommand());
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, NetworkEnableWizardComponent_Conditional_19_Conditional_4_Conditional_0_Template, 2, 1, "div", 32)(1, NetworkEnableWizardComponent_Conditional_19_Conditional_4_Conditional_1_Template, 2, 1, "div", 32);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional(ctx_r1.enableOs === "windows" ? 0 : 1);
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_6_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 34);
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 33);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_19_Conditional_6_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r6); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.runEnableNetworksAutomatically()); });
    i0.ɵɵconditionalCreate(1, NetworkEnableWizardComponent_Conditional_19_Conditional_6_Conditional_1_Template, 1, 0, "span", 34);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("disabled", ctx_r1.enableAutoRunning() || !ctx_r1.enableAcknowledgeCritical);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.enableAutoRunning() ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 3, "networks.wizard.step3.runAutomatically"), " ");
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 35);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_19_Conditional_7_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r7); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.copyEnableWizardCommands()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.wizard.step3.copyCommands"));
} }
function NetworkEnableWizardComponent_Conditional_19_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 15);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_19_Conditional_11_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.completeEnableWizard()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.wizard.step3.finishedSetup"));
} }
function NetworkEnableWizardComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, NetworkEnableWizardComponent_Conditional_19_Conditional_0_Template, 3, 3, "p", 11)(1, NetworkEnableWizardComponent_Conditional_19_Conditional_1_Template, 3, 3, "p", 11)(2, NetworkEnableWizardComponent_Conditional_19_Conditional_2_Template, 3, 3, "p", 11);
    i0.ɵɵconditionalCreate(3, NetworkEnableWizardComponent_Conditional_19_Conditional_3_Template, 2, 1, "div", 16);
    i0.ɵɵconditionalCreate(4, NetworkEnableWizardComponent_Conditional_19_Conditional_4_Template, 2, 1);
    i0.ɵɵelementStart(5, "div", 28);
    i0.ɵɵconditionalCreate(6, NetworkEnableWizardComponent_Conditional_19_Conditional_6_Template, 4, 5, "button", 29);
    i0.ɵɵconditionalCreate(7, NetworkEnableWizardComponent_Conditional_19_Conditional_7_Template, 3, 3, "button", 30);
    i0.ɵɵelementStart(8, "button", 14);
    i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Conditional_19_Template_button_click_8_listener() { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.enableWizardStep.set(2)); });
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(11, NetworkEnableWizardComponent_Conditional_19_Conditional_11_Template, 3, 3, "button", 31);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.localAgentChecking() ? 0 : ctx_r1.localAgentCanExecute() ? 1 : 2);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.localAgentStatusMessage() ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!ctx_r1.localAgentCanExecute() && !ctx_r1.localAgentChecking() ? 4 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.localAgentCanExecute() ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!ctx_r1.localAgentCanExecute() && !ctx_r1.localAgentChecking() ? 7 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 7, "networks.wizard.back"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!ctx_r1.localAgentCanExecute() && !ctx_r1.localAgentChecking() ? 11 : -1);
} }
/**
 * Enable-Networks wizard, extracted from the (large) NetworksComponent as the last of the three dialogs
 * (PR-U3). A 3-step flow that helps a locally-reachable brain get a public HTTPS URL (via a Cloudflare
 * tunnel) so it can join networks: (1) explain, (2) collect hostname + options and generate the OS
 * commands, (3) either run the setup automatically through the local-agent connector (bootstrapping it if
 * needed) or copy the commands to run by hand. On success it emits `enabled(url)` — the host adopts that
 * URL as this brain's own and drops the "enable networks" prompt. Behaviour matches the inline version;
 * the wizard characterization tests moved here with it.
 *
 * Rendered gated by the host (`@if (showEnableNetworksWizard()) { … }`), so it initialises fresh on each
 * open (ngOnInit) and needs no visibility state of its own.
 */
export class NetworkEnableWizardComponent {
    constructor() {
        this.networksApi = inject(NetworksApi);
        this.transloco = inject(TranslocoService);
        this.confirmDialog = inject(ConfirmDialogService);
        /** Emitted with this brain's now-public URL when setup succeeds — the host adopts it and drops the
         *  enable prompt. */
        this.enabled = output();
        /** Emitted when the user cancels/dismisses (or after the confirm-and-adopt finish). */
        this.close = output();
        this.enableWizardStep = signal(1, ...(ngDevMode ? [{ debugName: "enableWizardStep" }] : /* istanbul ignore next */ []));
        this.enableWizardError = signal('', ...(ngDevMode ? [{ debugName: "enableWizardError" }] : /* istanbul ignore next */ []));
        this.enableHostname = '';
        this.enableOs = 'windows';
        this.enableAutostart = true;
        this.enableOverwriteDns = false;
        this.enableAcknowledgeCritical = false;
        this.enableWindowsCommand = signal('', ...(ngDevMode ? [{ debugName: "enableWindowsCommand" }] : /* istanbul ignore next */ []));
        this.enableLinuxCommand = signal('', ...(ngDevMode ? [{ debugName: "enableLinuxCommand" }] : /* istanbul ignore next */ []));
        this.localAgentCanExecute = signal(false, ...(ngDevMode ? [{ debugName: "localAgentCanExecute" }] : /* istanbul ignore next */ []));
        this.localAgentChecking = signal(false, ...(ngDevMode ? [{ debugName: "localAgentChecking" }] : /* istanbul ignore next */ []));
        this.localAgentStatusMessage = signal('', ...(ngDevMode ? [{ debugName: "localAgentStatusMessage" }] : /* istanbul ignore next */ []));
        this.enableAutoRunning = signal(false, ...(ngDevMode ? [{ debugName: "enableAutoRunning" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        this.enableOs = this.detectLocalOs();
    }
    prepareEnableWizardCommands() {
        this.enableWizardError.set('');
        const host = this.enableHostname.trim();
        if (!/^(?=.{4,253}$)(?!-)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}$/.test(host)) {
            this.enableWizardError.set(this.transloco.translate('networks.wizard.error.invalidHostname'));
            return;
        }
        this.enableWindowsCommand.set(this.buildWindowsCloudflareCommands(host));
        this.enableLinuxCommand.set(this.buildLinuxCloudflareCommands(host));
        this.localAgentStatusMessage.set(this.transloco.translate('networks.wizard.status.checkingConnector'));
        this.localAgentChecking.set(true);
        this.bootstrapLocalAgent();
        this.enableWizardStep.set(3);
    }
    copyEnableWizardCommands() {
        const text = this.enableOs === 'windows' ? this.enableWindowsCommand() : this.enableLinuxCommand();
        if (!text)
            return;
        navigator.clipboard.writeText(text).catch(() => { });
    }
    async completeEnableWizard() {
        const host = this.enableHostname.trim();
        if (!host)
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('networks.wizard.confirm.verifyHealthTitle'),
            message: this.transloco.translate('networks.wizard.confirm.verifyHealth', { host }),
        });
        if (!ok)
            return;
        this.enabled.emit(`https://${host}`);
        this.close.emit();
    }
    runEnableNetworksAutomatically() {
        const host = this.enableHostname.trim();
        if (!host) {
            this.enableWizardError.set(this.transloco.translate('networks.wizard.error.enterHostnameFirst'));
            return;
        }
        if (!this.enableAcknowledgeCritical) {
            this.enableWizardError.set(this.transloco.translate('networks.wizard.error.acknowledgeCritical'));
            return;
        }
        this.enableWizardError.set('');
        this.enableAutoRunning.set(true);
        if (!this.localAgentCanExecute()) {
            this.localAgentStatusMessage.set(this.transloco.translate('networks.wizard.status.bootstrappingConnector'));
            this.networksApi.bootstrapLocalAgent({ os: this.enableOs }).subscribe({
                next: () => this.executeEnableNetworks(host),
                error: (err) => {
                    this.enableAutoRunning.set(false);
                    this.enableWizardError.set(err.error?.error ?? this.transloco.translate('networks.wizard.error.bootstrapFailed'));
                },
            });
            return;
        }
        this.executeEnableNetworks(host);
    }
    executeEnableNetworks(host) {
        this.networksApi.executeEnableNetworksViaLocalAgent({
            hostname: host,
            os: this.enableOs,
            autostart: this.enableAutostart,
            overwriteDns: this.enableOverwriteDns,
            acknowledgeCriticalChanges: this.enableAcknowledgeCritical,
        }).subscribe({
            next: (result) => {
                this.enableAutoRunning.set(false);
                this.localAgentStatusMessage.set(result.message ?? this.transloco.translate('networks.wizard.status.autoSetupFinished'));
                this.enabled.emit(result.publicUrl || `https://${host}`);
            },
            error: (err) => {
                this.enableAutoRunning.set(false);
                this.enableWizardError.set(err.error?.error ?? this.transloco.translate('networks.wizard.error.autoSetupFailed'));
            },
        });
    }
    bootstrapLocalAgent() {
        // Try status first — if the connector is already running (feature enabled via env var, or started
        // manually), automatic mode becomes available without bootstrap.
        this.networksApi.getLocalAgentStatus().subscribe({
            next: (status) => {
                if (status.canExecute) {
                    this.localAgentCanExecute.set(true);
                    this.localAgentChecking.set(false);
                    this.localAgentStatusMessage.set(status.message ?? this.transloco.translate('networks.wizard.status.connectorReady'));
                }
                else {
                    this.triggerBootstrap();
                }
            },
            error: () => this.triggerBootstrap(),
        });
    }
    triggerBootstrap() {
        this.localAgentStatusMessage.set(this.transloco.translate('networks.wizard.status.startingConnector'));
        this.networksApi.bootstrapLocalAgent({ os: this.enableOs }).subscribe({
            next: (result) => {
                this.localAgentStatusMessage.set(result.message ?? this.transloco.translate('networks.wizard.status.connectorStarted'));
                this.refreshLocalAgentStatus();
            },
            error: (err) => {
                this.localAgentCanExecute.set(false);
                this.localAgentChecking.set(false);
                const detail = err?.error?.error ?? err?.message ?? `HTTP ${err?.status ?? 'unknown'}`;
                this.localAgentStatusMessage.set(this.transloco.translate('networks.wizard.status.connectorStartFailed', { detail }));
            },
        });
    }
    refreshLocalAgentStatus() {
        this.networksApi.getLocalAgentStatus().subscribe({
            next: (status) => {
                this.localAgentCanExecute.set(status.canExecute);
                this.localAgentChecking.set(false);
                this.localAgentStatusMessage.set(status.message ?? (status.canExecute ? this.transloco.translate('networks.wizard.status.connectorReady') : this.transloco.translate('networks.wizard.status.manualAvailable')));
            },
            error: () => {
                this.localAgentCanExecute.set(false);
                this.localAgentChecking.set(false);
                this.localAgentStatusMessage.set(this.transloco.translate('networks.wizard.status.statusEndpointUnreachable'));
            },
        });
    }
    buildWindowsCloudflareCommands(host) {
        const serviceBlock = this.enableAutostart
            ? 'cloudflared service install\nStart-Service cloudflared'
            : 'cloudflared tunnel run ythril-local';
        const routeCmd = this.enableOverwriteDns
            ? `cloudflared tunnel route dns --overwrite-dns ythril-local ${host}`
            : `cloudflared tunnel route dns ythril-local ${host}`;
        return [
            'winget install --id Cloudflare.cloudflared -e',
            'cloudflared tunnel login',
            'cloudflared tunnel create ythril-local',
            routeCmd,
            '$env:USERPROFILE',
            '# create %USERPROFILE%\\.cloudflared\\config.yml with hostname and localhost:3200 origin',
            serviceBlock,
            `curl https://${host}/health`,
        ].join('\n');
    }
    buildLinuxCloudflareCommands(host) {
        const serviceBlock = this.enableAutostart
            ? 'sudo cloudflared service install\nsudo systemctl enable --now cloudflared'
            : 'cloudflared tunnel run ythril-local';
        const routeCmd = this.enableOverwriteDns
            ? `cloudflared tunnel route dns --overwrite-dns ythril-local ${host}`
            : `cloudflared tunnel route dns ythril-local ${host}`;
        return [
            'curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb',
            'sudo dpkg -i /tmp/cloudflared.deb',
            'cloudflared tunnel login',
            'cloudflared tunnel create ythril-local',
            routeCmd,
            '# create ~/.cloudflared/config.yml with hostname and localhost:3200 origin',
            serviceBlock,
            `curl https://${host}/health`,
        ].join('\n');
    }
    detectLocalOs() {
        const ua = navigator.userAgent.toLowerCase();
        const platform = (navigator.platform || '').toLowerCase();
        if (ua.includes('windows') || platform.includes('win'))
            return 'windows';
        return 'linux';
    }
    static { this.ɵfac = function NetworkEnableWizardComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || NetworkEnableWizardComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: NetworkEnableWizardComponent, selectors: [["app-network-enable-wizard"]], outputs: { enabled: "enabled", close: "close" }, decls: 20, vars: 21, consts: [[1, "dialog-backdrop"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "card-title"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "wizard-steps"], [1, "wizard-step-dot", 3, "active", "done"], [1, "wizard-step-label"], [1, "alert", "alert-error"], [1, "wizard-step-dot"], [1, "wizard-note"], [1, "wizard-list"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end"], ["type", "button", 1, "btn-secondary", "btn", 3, "click"], ["type", "button", 1, "btn-primary", "btn", 3, "click"], [1, "wizard-status"], [1, "field"], ["type", "text", "name", "enableHostname", 3, "ngModelChange", "ngModel", "placeholder"], ["name", "enableOs", 3, "ngModelChange", "ngModel"], ["value", "windows"], ["value", "linux"], [2, "display", "flex", "align-items", "center", "gap", "8px"], ["type", "checkbox", "name", "enableAutostart", 3, "ngModelChange", "ngModel"], ["type", "checkbox", "name", "enableOverwriteDns", 3, "ngModelChange", "ngModel"], [1, "wizard-note", 2, "margin-top", "6px"], [2, "display", "flex", "align-items", "flex-start", "gap", "8px"], ["type", "checkbox", "name", "enableAcknowledgeCritical", 2, "margin-top", "2px", 3, "ngModelChange", "ngModel"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end", "margin-top", "12px"], ["type", "button", 1, "btn-primary", "btn", 3, "disabled"], ["type", "button", 1, "btn-ghost", "btn"], ["type", "button", 1, "btn-primary", "btn"], [1, "code-block", 2, "white-space", "pre-wrap", "word-break", "break-word", "font-size", "11px"], ["type", "button", 1, "btn-primary", "btn", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], ["type", "button", 1, "btn-ghost", "btn", 3, "click"]], template: function NetworkEnableWizardComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("dismiss", function NetworkEnableWizardComponent_Template_div_dismiss_1_listener() { return ctx.close.emit(); })("click", function NetworkEnableWizardComponent_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
            i0.ɵɵelementStart(3, "div", 2)(4, "div", 3);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 4);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵlistener("click", function NetworkEnableWizardComponent_Template_button_click_7_listener() { return ctx.close.emit(); });
            i0.ɵɵelement(9, "ph-icon", 5);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(10, "div", 6);
            i0.ɵɵrepeaterCreate(11, NetworkEnableWizardComponent_For_12_Template, 1, 4, "span", 7, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementStart(13, "span", 8);
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(16, NetworkEnableWizardComponent_Conditional_16_Template, 2, 1, "div", 9);
            i0.ɵɵconditionalCreate(17, NetworkEnableWizardComponent_Conditional_17_Template, 23, 21);
            i0.ɵɵconditionalCreate(18, NetworkEnableWizardComponent_Conditional_18_Template, 47, 42);
            i0.ɵɵconditionalCreate(19, NetworkEnableWizardComponent_Conditional_19_Template, 12, 9);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 9, "networks.wizard.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 11, "networks.wizard.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 13, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(i0.ɵɵpureFunction0(18, _c0));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(15, 15, "networks.wizard.stepLabel", i0.ɵɵpureFunction1(19, _c1, ctx.enableWizardStep())));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.enableWizardError() ? 16 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.enableWizardStep() === 1 ? 17 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.enableWizardStep() === 2 ? 18 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.enableWizardStep() === 3 ? 19 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, ModalDirective, TranslocoPipe], styles: [".dialog-backdrop[_ngcontent-%COMP%] {\n      position: fixed; inset: 0; background: var(--bg-scrim);\n      display: flex; align-items: center; justify-content: center; z-index: 100;\n    }\n    .dialog[_ngcontent-%COMP%] {\n      background: var(--bg-primary); border: 1px solid var(--border);\n      border-radius: var(--radius-lg); padding: 24px; width: 90%; max-width: 600px;\n      max-height: 90vh; overflow-y: auto;\n    }\n    .dialog-header[_ngcontent-%COMP%] { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }\n    .wizard-steps[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 6px; margin: 0 0 14px; }\n    .wizard-step-dot[_ngcontent-%COMP%] { width: 24px; height: 4px; border-radius: 2px; background: var(--border); transition: background var(--transition); }\n    .wizard-step-dot.done[_ngcontent-%COMP%] { background: var(--accent-dim); }\n    .wizard-step-dot.active[_ngcontent-%COMP%] { background: var(--accent); }\n    .wizard-step-label[_ngcontent-%COMP%] { margin-left: auto; font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }\n    .wizard-note[_ngcontent-%COMP%] { font-size: 12px; color: var(--text-muted); margin: 0 0 10px; line-height: 1.45; }\n    .wizard-list[_ngcontent-%COMP%] { margin: 0 0 12px; padding-left: 18px; font-size: 12px; color: var(--text-secondary); line-height: 1.45; }\n    .wizard-status[_ngcontent-%COMP%] {\n      margin: 8px 0 12px; padding: 8px 10px; border-radius: var(--radius-sm);\n      border: 1px solid var(--border); background: var(--bg-elevated); font-size: 12px; color: var(--text-secondary);\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(NetworkEnableWizardComponent, [{
        type: Component,
        args: [{ selector: 'app-network-enable-wizard', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective], template: `
    <div class="dialog-backdrop">
      <div class="dialog" [appModal]="'networks.wizard.title' | transloco" (dismiss)="close.emit()" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="card-title">{{ 'networks.wizard.title' | transloco }}</div>
          <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()"><ph-icon name="x" [size]="14"/></button>
        </div>

        <div class="wizard-steps">
          @for (n of [1, 2, 3]; track n) {
            <span class="wizard-step-dot" [class.active]="enableWizardStep() === n" [class.done]="enableWizardStep() > n"></span>
          }
          <span class="wizard-step-label">{{ 'networks.wizard.stepLabel' | transloco: { current: enableWizardStep(), total: 3 } }}</span>
        </div>

        @if (enableWizardError()) { <div class="alert alert-error">{{ enableWizardError() }}</div> }

        @if (enableWizardStep() === 1) {
          <p class="wizard-note">{{ 'networks.wizard.step1.p1' | transloco }}</p>
          <p class="wizard-note">{{ 'networks.wizard.step1.p2' | transloco }}</p>
          <ul class="wizard-list">
            <li>{{ 'networks.wizard.step1.whyItem' | transloco }}</li>
            <li>{{ 'networks.wizard.step1.riskItem' | transloco }}</li>
            <li>{{ 'networks.wizard.step1.resultItem' | transloco }}</li>
          </ul>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn-secondary btn" type="button" (click)="close.emit()">{{ 'common.cancel' | transloco }}</button>
            <button class="btn-primary btn" type="button" (click)="enableWizardStep.set(2)">{{ 'networks.wizard.continue' | transloco }}</button>
          </div>
        }

        @if (enableWizardStep() === 2) {
          @if (localAgentStatusMessage()) { <div class="wizard-status">{{ localAgentStatusMessage() }}</div> }
          <p class="wizard-note">{{ 'networks.wizard.step2.hostnameHint' | transloco }}</p>
          <div class="field">
            <label>{{ 'networks.wizard.step2.publicHostnameLabel' | transloco }}</label>
            <input type="text" [(ngModel)]="enableHostname" name="enableHostname" [placeholder]="'networks.wizard.step2.publicHostnamePlaceholder' | transloco" />
          </div>
          <div class="field">
            <label>{{ 'networks.wizard.step2.osLabel' | transloco }}</label>
            <select [(ngModel)]="enableOs" name="enableOs">
              <option value="windows">{{ 'networks.wizard.step2.os.windows' | transloco }}</option>
              <option value="linux">{{ 'networks.wizard.step2.os.linux' | transloco }}</option>
            </select>
          </div>
          <div class="field">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" [(ngModel)]="enableAutostart" name="enableAutostart" />
              {{ 'networks.wizard.step2.autostart' | transloco }}
            </label>
          </div>
          <div class="field">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" [(ngModel)]="enableOverwriteDns" name="enableOverwriteDns" />
              {{ 'networks.wizard.step2.overwriteDns' | transloco }}
            </label>
            <div class="wizard-note" style="margin-top:6px;">{{ 'networks.wizard.step2.overwriteDnsHint' | transloco }}</div>
          </div>
          <div class="field">
            <label style="display:flex; align-items:flex-start; gap:8px;">
              <input type="checkbox" [(ngModel)]="enableAcknowledgeCritical" name="enableAcknowledgeCritical" style="margin-top:2px;" />
              <span>{{ 'networks.wizard.step2.ackCritical' | transloco }}</span>
            </label>
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn-secondary btn" type="button" (click)="enableWizardStep.set(1)">{{ 'networks.wizard.back' | transloco }}</button>
            <button class="btn-primary btn" type="button" (click)="prepareEnableWizardCommands()">{{ 'networks.wizard.continue' | transloco }}</button>
          </div>
        }

        @if (enableWizardStep() === 3) {
          @if (localAgentChecking()) {
            <p class="wizard-note">{{ 'networks.wizard.step3.checkingStatus' | transloco }}</p>
          } @else if (localAgentCanExecute()) {
            <p class="wizard-note">{{ 'networks.wizard.step3.autoReady' | transloco }}</p>
          } @else {
            <p class="wizard-note">{{ 'networks.wizard.step3.autoUnavailable' | transloco }}</p>
          }
          @if (localAgentStatusMessage()) { <div class="wizard-status">{{ localAgentStatusMessage() }}</div> }
          @if (!localAgentCanExecute() && !localAgentChecking()) {
            @if (enableOs === 'windows') {
              <div class="code-block" style="white-space:pre-wrap; word-break:break-word; font-size:11px;">{{ enableWindowsCommand() }}</div>
            } @else {
              <div class="code-block" style="white-space:pre-wrap; word-break:break-word; font-size:11px;">{{ enableLinuxCommand() }}</div>
            }
          }
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
            @if (localAgentCanExecute()) {
              <button class="btn-primary btn" type="button" [disabled]="enableAutoRunning() || !enableAcknowledgeCritical" (click)="runEnableNetworksAutomatically()">
                @if (enableAutoRunning()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'networks.wizard.step3.runAutomatically' | transloco }}
              </button>
            }
            @if (!localAgentCanExecute() && !localAgentChecking()) {
              <button class="btn-ghost btn" type="button" (click)="copyEnableWizardCommands()">{{ 'networks.wizard.step3.copyCommands' | transloco }}</button>
            }
            <button class="btn-secondary btn" type="button" (click)="enableWizardStep.set(2)">{{ 'networks.wizard.back' | transloco }}</button>
            @if (!localAgentCanExecute() && !localAgentChecking()) {
              <button class="btn-primary btn" type="button" (click)="completeEnableWizard()">{{ 'networks.wizard.step3.finishedSetup' | transloco }}</button>
            }
          </div>
        }
      </div>
    </div>
  `, styles: ["\n    .dialog-backdrop {\n      position: fixed; inset: 0; background: var(--bg-scrim);\n      display: flex; align-items: center; justify-content: center; z-index: 100;\n    }\n    .dialog {\n      background: var(--bg-primary); border: 1px solid var(--border);\n      border-radius: var(--radius-lg); padding: 24px; width: 90%; max-width: 600px;\n      max-height: 90vh; overflow-y: auto;\n    }\n    .dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }\n    .wizard-steps { display: flex; align-items: center; gap: 6px; margin: 0 0 14px; }\n    .wizard-step-dot { width: 24px; height: 4px; border-radius: 2px; background: var(--border); transition: background var(--transition); }\n    .wizard-step-dot.done { background: var(--accent-dim); }\n    .wizard-step-dot.active { background: var(--accent); }\n    .wizard-step-label { margin-left: auto; font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }\n    .wizard-note { font-size: 12px; color: var(--text-muted); margin: 0 0 10px; line-height: 1.45; }\n    .wizard-list { margin: 0 0 12px; padding-left: 18px; font-size: 12px; color: var(--text-secondary); line-height: 1.45; }\n    .wizard-status {\n      margin: 8px 0 12px; padding: 8px 10px; border-radius: var(--radius-sm);\n      border: 1px solid var(--border); background: var(--bg-elevated); font-size: 12px; color: var(--text-secondary);\n    }\n  "] }]
    }], null, { enabled: [{ type: i0.Output, args: ["enabled"] }], close: [{ type: i0.Output, args: ["close"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(NetworkEnableWizardComponent, { className: "NetworkEnableWizardComponent", filePath: "app/pages/settings/network-enable-wizard.component.ts", lineNumber: 155 }); })();
