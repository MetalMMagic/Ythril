import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { groupRecallResults, chunkLabel, passageText, flattenRecallItems } from './recall-grouping';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BrainApi } from '../../core/brain-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { BrainStore } from './brain-store.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = (a0, a1) => ({ returned: a0, count: a1 });
const _c1 = a0 => ({ count: a0 });
const _c2 = (a0, a1) => ({ count: a0, collection: a1 });
const _forTrack0 = ($index, $item) => $item.type;
function QueryTabComponent_Conditional_8_Conditional_29_For_70_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 48);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_For_70_Conditional_4_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r6); const opt_r5 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(opt_r5.min, $event) || (opt_r5.min = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const opt_r5 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", opt_r5.min);
    i0.ɵɵproperty("name", "recallMin-" + opt_r5.type)("max", ctx_r1.recallForm.topK)("placeholder", i0.ɵɵpipeBind1(1, 5, "brain.query.minPerType.placeholder"));
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(2, 7, "brain.query.minPerType.tooltip"));
} }
function QueryTabComponent_Conditional_8_Conditional_29_For_70_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 37)(1, "input", 45);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_For_70_Template_input_ngModelChange_1_listener($event) { const opt_r5 = i0.ɵɵrestoreView(_r4).$implicit; i0.ɵɵtwoWayBindingSet(opt_r5.on, $event) || (opt_r5.on = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "span", 46);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(4, QueryTabComponent_Conditional_8_Conditional_29_For_70_Conditional_4_Template, 3, 9, "input", 47);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const opt_r5 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", opt_r5.on);
    i0.ɵɵproperty("name", "recallType-" + opt_r5.type);
    i0.ɵɵattribute("aria-label", opt_r5.type);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(opt_r5.type);
    i0.ɵɵadvance();
    i0.ɵɵconditional(opt_r5.on ? 4 : -1);
} }
function QueryTabComponent_Conditional_8_Conditional_29_For_86_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 42);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r7 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r7);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r7);
} }
function QueryTabComponent_Conditional_8_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 15)(1, "div", 22)(2, "div", 23)(3, "label");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementStart(6, "span", 8);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelement(8, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "input", 24);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_9_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.maxPerType, $event) || (ctx_r1.recallForm.maxPerType = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "div", 25)(12, "label");
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementStart(15, "span", 8);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelement(17, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(18, "input", 26);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_18_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.traverse, $event) || (ctx_r1.recallForm.traverse = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(20, "div", 27)(21, "label");
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementStart(24, "span", 8);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelement(26, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(27, "input", 28);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_27_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.maxTimeMS, $event) || (ctx_r1.recallForm.maxTimeMS = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(29, "div", 29)(30, "label");
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementStart(33, "span", 8);
    i0.ɵɵpipe(34, "transloco");
    i0.ɵɵelement(35, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(36, "input", 30);
    i0.ɵɵpipe(37, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_36_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.maxBytes, $event) || (ctx_r1.recallForm.maxBytes = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(38, "label", 31)(39, "input", 32);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_39_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.includeFreshWrites, $event) || (ctx_r1.recallForm.includeFreshWrites = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(40, "span");
    i0.ɵɵtext(41);
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(43, "span", 8);
    i0.ɵɵpipe(44, "transloco");
    i0.ɵɵelement(45, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(46, "label", 31)(47, "input", 33);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_47_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.includeContent, $event) || (ctx_r1.recallForm.includeContent = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(48, "span");
    i0.ɵɵtext(49);
    i0.ɵɵpipe(50, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(51, "span", 8);
    i0.ɵɵpipe(52, "transloco");
    i0.ɵɵelement(53, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(54, "label", 31)(55, "input", 34);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_55_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.includeDiagnostics, $event) || (ctx_r1.recallForm.includeDiagnostics = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(56, "span");
    i0.ɵɵtext(57);
    i0.ɵɵpipe(58, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(59, "span", 8);
    i0.ɵɵpipe(60, "transloco");
    i0.ɵɵelement(61, "ph-icon", 9);
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(62, "label", 35);
    i0.ɵɵtext(63);
    i0.ɵɵpipe(64, "transloco");
    i0.ɵɵelementStart(65, "span", 8);
    i0.ɵɵpipe(66, "transloco");
    i0.ɵɵelement(67, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(68, "div", 36);
    i0.ɵɵrepeaterCreate(69, QueryTabComponent_Conditional_8_Conditional_29_For_70_Template, 5, 5, "span", 37, _forTrack0);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(71, "div", 38)(72, "label");
    i0.ɵɵtext(73);
    i0.ɵɵpipe(74, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(75, "input", 39);
    i0.ɵɵpipe(76, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_input_ngModelChange_75_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.tags, $event) || (ctx_r1.recallForm.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(77, "div", 38)(78, "label");
    i0.ɵɵtext(79);
    i0.ɵɵpipe(80, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(81, "select", 40);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_select_ngModelChange_81_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.type, $event) || (ctx_r1.recallForm.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(82, "option", 41);
    i0.ɵɵtext(83);
    i0.ɵɵpipe(84, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(85, QueryTabComponent_Conditional_8_Conditional_29_For_86_Template, 2, 2, "option", 42, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(87, "div", 43)(88, "label");
    i0.ɵɵtext(89);
    i0.ɵɵpipe(90, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(91, "textarea", 44);
    i0.ɵɵpipe(92, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Conditional_29_Template_textarea_ngModelChange_91_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.filter, $event) || (ctx_r1.recallForm.filter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(5, 44, "brain.query.maxPerType"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(7, 46, "brain.query.maxPerType.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.maxPerType);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(10, 48, "brain.query.maxPerType.none"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(14, 50, "brain.query.traverse"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(16, 52, "brain.query.traverse.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.traverse);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(19, 54, "brain.query.traverse.none"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(23, 56, "brain.query.maxTimeMs"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(25, 58, "brain.query.recallMaxTimeMs.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.maxTimeMS);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(28, 60, "brain.query.recallMaxTimeMs.none"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(32, 62, "brain.query.recallMaxBytes"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(34, 64, "brain.query.recallMaxBytes.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.maxBytes);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(37, 66, "brain.query.recallMaxBytes.default"));
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.includeFreshWrites);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 68, "brain.query.includeFreshWrites"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(44, 70, "brain.query.includeFreshWrites.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.includeContent);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 72, "brain.query.includeContent"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(52, 74, "brain.query.includeContent.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.includeDiagnostics);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(58, 76, "brain.query.includeDiagnostics"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(60, 78, "brain.query.includeDiagnostics.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(64, 80, "brain.query.types"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(66, 82, "brain.query.types.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.recallTypeOpts);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(74, 84, "brain.query.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.tags);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(76, 86, "brain.query.tags.placeholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(80, 88, "brain.query.filterByType"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.type);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(84, 90, "brain.query.anyType"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.recallTypeSchemaOptions());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(90, 92, "brain.query.filter"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.filter);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(92, 94, "brain.query.filter.placeholder"));
} }
function QueryTabComponent_Conditional_8_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 18);
} }
function QueryTabComponent_Conditional_8_Conditional_35_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 49);
    i0.ɵɵlistener("click", function QueryTabComponent_Conditional_8_Conditional_35_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.clearRecall()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.query.clearResults"));
} }
function QueryTabComponent_Conditional_8_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 20);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.recallError());
} }
function QueryTabComponent_Conditional_8_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 21)(1, "div")(2, "strong");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(5, "div", 50);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "div", 50);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const t_r9 = ctx;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 3, "brain.query.truncated.title", i0.ɵɵpureFunction2(10, _c0, t_r9.returned, t_r9.count)));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 6, "brain.query.truncated.body"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 8, "brain.query.truncated.what"));
} }
function QueryTabComponent_Conditional_8_Conditional_38_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 52);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "brain.query.groupedPassages", i0.ɵɵpureFunction1(4, _c1, ctx_r1.recallResults().length)));
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 57);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const g_r10 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(2, 2, "common.score"), ": ", g_r10.score.toFixed(3));
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 58);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const g_r10 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "brain.query.passages", i0.ɵɵpureFunction1(4, _c1, g_r10.hitCount)));
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 59);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const f_r11 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(f_r11.description);
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 62);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 63);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 64);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const h_r12 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.formatQueryDoc(h_r12));
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li", 61);
    i0.ɵɵconditionalCreate(1, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Conditional_1_Template, 2, 1, "span", 62);
    i0.ɵɵconditionalCreate(2, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Conditional_2_Template, 2, 1, "div", 63)(3, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Conditional_3_Template, 2, 1, "div", 64);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_24_0;
    let tmp_25_0;
    const h_r12 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(5);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_24_0 = ctx_r1.chunkHeading(h_r12)) ? 1 : -1, tmp_24_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_25_0 = ctx_r1.passageOf(h_r12)) ? 2 : 3, tmp_25_0);
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 54)(1, "span", 55);
    i0.ɵɵtext(2, "file");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "strong", 56);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(5, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Conditional_5_Template, 3, 4, "span", 57);
    i0.ɵɵconditionalCreate(6, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Conditional_6_Template, 3, 6, "span", 58);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(7, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Conditional_7_Template, 2, 1, "div", 59);
    i0.ɵɵelementStart(8, "ul", 60);
    i0.ɵɵrepeaterCreate(9, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_For_10_Template, 4, 2, "li", 61, i0.ɵɵrepeaterTrackByIndex);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const f_r11 = ctx;
    const g_r10 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(f_r11.path);
    i0.ɵɵadvance();
    i0.ɵɵconditional(g_r10.score != null ? 5 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(g_r10.hitCount > 1 ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(f_r11.description ? 7 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(g_r10.hits);
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 57);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const g_r10 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(2, 2, "common.score"), ": ", g_r10.score.toFixed(3));
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 67);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Conditional_4_Template_button_click_0_listener() { const target_r14 = i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(5); return i0.ɵɵresetView(ctx_r1.viewInGraph.emit(target_r14)); });
    i0.ɵɵelement(3, "ph-icon", 68);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 3, "common.viewInGraph"))("aria-label", i0.ɵɵpipeBind1(2, 5, "common.viewInGraph"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 65)(1, "span", 55);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Conditional_3_Template, 3, 4, "span", 57);
    i0.ɵɵconditionalCreate(4, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Conditional_4_Template, 4, 7, "button", 66);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "div", 64);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_15_0;
    const g_r10 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(g_r10.hits[0].type);
    i0.ɵɵadvance();
    i0.ɵɵconditional(g_r10.score != null ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_15_0 = ctx_r1.graphTargetOf(g_r10.hits[0])) ? 4 : -1, tmp_15_0);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.formatQueryDoc(g_r10.hits[0]));
} }
function QueryTabComponent_Conditional_8_Conditional_38_For_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 53);
    i0.ɵɵconditionalCreate(1, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_1_Template, 11, 4)(2, QueryTabComponent_Conditional_8_Conditional_38_For_7_Conditional_2_Template, 7, 4);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_12_0;
    const g_r10 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_12_0 = g_r10.file) ? 1 : 2, tmp_12_0);
} }
function QueryTabComponent_Conditional_8_Conditional_38_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 51)(1, "strong");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵconditionalCreate(5, QueryTabComponent_Conditional_8_Conditional_38_Conditional_5_Template, 3, 6, "span", 52);
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(6, QueryTabComponent_Conditional_8_Conditional_38_For_7_Template, 3, 1, "div", 53, i0.ɵɵrepeaterTrackByIndex);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.recallGroups().length);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(4, 3, "brain.query.resultsCount", i0.ɵɵpureFunction1(6, _c1, ctx_r1.recallGroups().length)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recallResults().length !== ctx_r1.recallGroups().length ? 5 : -1);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.recallGroups());
} }
function QueryTabComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 3)(1, "div", 4)(2, "label");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "input", 5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Template_input_ngModelChange_5_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.query, $event) || (ctx_r1.recallForm.query = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keydown.enter", function QueryTabComponent_Conditional_8_Template_input_keydown_enter_5_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.runRecall()); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 6)(9, "div", 7)(10, "label");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementStart(13, "span", 8);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelement(15, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(16, "input", 10);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Template_input_ngModelChange_16_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.topK, $event) || (ctx_r1.recallForm.topK = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(17, "div", 11)(18, "label");
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementStart(21, "span", 8);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelement(23, "ph-icon", 9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "input", 12);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_8_Template_input_ngModelChange_24_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.recallForm.minScore, $event) || (ctx_r1.recallForm.minScore = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(25, "div", 13)(26, "button", 14);
    i0.ɵɵlistener("click", function QueryTabComponent_Conditional_8_Template_button_click_26_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showRecallAdvanced.set(!ctx_r1.showRecallAdvanced())); });
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(29, QueryTabComponent_Conditional_8_Conditional_29_Template, 93, 96, "div", 15);
    i0.ɵɵelementStart(30, "div", 16)(31, "button", 17);
    i0.ɵɵlistener("click", function QueryTabComponent_Conditional_8_Template_button_click_31_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.runRecall()); });
    i0.ɵɵconditionalCreate(32, QueryTabComponent_Conditional_8_Conditional_32_Template, 1, 0, "span", 18);
    i0.ɵɵtext(33);
    i0.ɵɵpipe(34, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(35, QueryTabComponent_Conditional_8_Conditional_35_Template, 3, 3, "button", 19);
    i0.ɵɵconditionalCreate(36, QueryTabComponent_Conditional_8_Conditional_36_Template, 2, 1, "span", 20);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(37, QueryTabComponent_Conditional_8_Conditional_37_Template, 11, 13, "div", 21);
    i0.ɵɵconditionalCreate(38, QueryTabComponent_Conditional_8_Conditional_38_Template, 8, 8);
} if (rf & 2) {
    let tmp_20_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 21, "brain.query.search.label"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.query);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(6, 23, "brain.query.search.placeholder"));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(7, 25, "brain.query.search.label"));
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(12, 27, "brain.query.topK"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(14, 29, "brain.query.topK.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.topK);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(20, 31, "brain.query.minScore"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(22, 33, "brain.query.minScore.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.recallForm.minScore);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(28, 35, ctx_r1.showRecallAdvanced() ? "brain.query.hideAdvanced" : "brain.query.showAdvanced"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.showRecallAdvanced() ? 29 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.recallRunning() || !ctx_r1.recallForm.query.trim());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recallRunning() ? 32 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(34, 37, "brain.query.searchButton"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recallResults().length ? 35 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recallError() ? 36 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_20_0 = ctx_r1.recallTruncated()) ? 37 : -1, tmp_20_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recallResults().length ? 38 : -1);
} }
function QueryTabComponent_Conditional_9_For_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 42);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r16 = ctx.$implicit;
    i0.ɵɵproperty("value", c_r16);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(c_r16);
} }
function QueryTabComponent_Conditional_9_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 77);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.queryFilterError());
} }
function QueryTabComponent_Conditional_9_Conditional_39_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 77);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.queryProjectionError());
} }
function QueryTabComponent_Conditional_9_Conditional_42_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 18);
} }
function QueryTabComponent_Conditional_9_Conditional_45_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 49);
    i0.ɵɵlistener("click", function QueryTabComponent_Conditional_9_Conditional_45_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.clearQuery()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.query.clearResults"));
} }
function QueryTabComponent_Conditional_9_Conditional_46_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 20);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.queryError());
} }
function QueryTabComponent_Conditional_9_Conditional_47_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 81);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.query.noDocuments"));
} }
function QueryTabComponent_Conditional_9_Conditional_47_Conditional_6_For_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 82);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const doc_r18 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.formatQueryDoc(doc_r18));
} }
function QueryTabComponent_Conditional_9_Conditional_47_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵrepeaterCreate(0, QueryTabComponent_Conditional_9_Conditional_47_Conditional_6_For_1_Template, 2, 1, "div", 82, i0.ɵɵrepeaterTrackByIndex);
} if (rf & 2) {
    const res_r19 = i0.ɵɵnextContext();
    i0.ɵɵrepeater(res_r19.results);
} }
function QueryTabComponent_Conditional_9_Conditional_47_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 80)(1, "strong");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(5, QueryTabComponent_Conditional_9_Conditional_47_Conditional_5_Template, 3, 3, "div", 81)(6, QueryTabComponent_Conditional_9_Conditional_47_Conditional_6_Template, 2, 0);
} if (rf & 2) {
    const res_r19 = ctx;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(res_r19.count);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(4, 3, "brain.query.resultsFrom", i0.ɵɵpureFunction2(6, _c2, res_r19.count, res_r19.collection)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(res_r19.results.length === 0 ? 5 : 6);
} }
function QueryTabComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 3)(1, "div", 69)(2, "div", 70)(3, "label");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "select", 71);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_9_Template_select_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.queryForm.collection, $event) || (ctx_r1.queryForm.collection = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(8, QueryTabComponent_Conditional_9_For_9_Template, 2, 2, "option", 42, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "div", 72)(11, "label");
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "input", 73);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_9_Template_input_ngModelChange_14_listener($event) { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.queryForm.limit, $event) || (ctx_r1.queryForm.limit = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "div", 27)(16, "label");
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "input", 74);
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_9_Template_input_ngModelChange_19_listener($event) { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.queryForm.maxTimeMS, $event) || (ctx_r1.queryForm.maxTimeMS = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(20, "div", 75)(21, "label");
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementStart(24, "span", 8);
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(27, "textarea", 76);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_9_Template_textarea_ngModelChange_27_listener($event) { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.queryForm.filter, $event) || (ctx_r1.queryForm.filter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(29, QueryTabComponent_Conditional_9_Conditional_29_Template, 2, 1, "div", 77);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(30, "div", 75)(31, "label");
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementStart(34, "span", 8);
    i0.ɵɵtext(35);
    i0.ɵɵpipe(36, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(37, "textarea", 78);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function QueryTabComponent_Conditional_9_Template_textarea_ngModelChange_37_listener($event) { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.queryForm.projection, $event) || (ctx_r1.queryForm.projection = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(39, QueryTabComponent_Conditional_9_Conditional_39_Template, 2, 1, "div", 77);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(40, "div", 79)(41, "button", 17);
    i0.ɵɵlistener("click", function QueryTabComponent_Conditional_9_Template_button_click_41_listener() { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.runQuery()); });
    i0.ɵɵconditionalCreate(42, QueryTabComponent_Conditional_9_Conditional_42_Template, 1, 0, "span", 18);
    i0.ɵɵtext(43);
    i0.ɵɵpipe(44, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(45, QueryTabComponent_Conditional_9_Conditional_45_Template, 3, 3, "button", 19);
    i0.ɵɵconditionalCreate(46, QueryTabComponent_Conditional_9_Conditional_46_Template, 2, 1, "span", 20);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(47, QueryTabComponent_Conditional_9_Conditional_47_Template, 7, 9);
} if (rf & 2) {
    let tmp_26_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 27, "brain.query.collection"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.queryForm.collection);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(7, 29, "brain.query.collection"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.queryCollections);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 31, "brain.query.limit"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.queryForm.limit);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 33, "brain.query.maxTimeMs"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.queryForm.maxTimeMS);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(23, 35, "brain.query.filter"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 37, "brain.query.filterHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("error", ctx_r1.queryFilterError());
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.queryForm.filter);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(28, 39, "brain.query.filterPlaceholder"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.queryFilterError() ? 29 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(33, 41, "brain.query.projection"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(36, 43, "brain.query.projectionHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("error", ctx_r1.queryProjectionError());
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.queryForm.projection);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(38, 45, "brain.query.projectionPlaceholder"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.queryProjectionError() ? 39 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.queryRunning());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.queryRunning() ? 42 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(44, 47, "brain.query.runQuery"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.queryResult() ? 45 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.queryError() ? 46 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_26_0 = ctx_r1.queryResult()) ? 47 : -1, tmp_26_0);
} }
/**
 * The brain page's Query tab — advanced (MongoDB-style) query + semantic recall.
 *
 * Extracted from BrainComponent (A17.9b-6a) as the first tab component. Read-only: it owns the
 * query/recall forms and results, and talks only to `BrainApi` (+ `BrainStore` for the recall
 * "filter by type" options). The active space id is a required input — the shell's nav state stays on
 * the shell — and the async methods read it at call time so a mid-flight space switch cannot stale it.
 *
 * OnPush: every result path writes a signal.
 */
export class QueryTabComponent {
    constructor() {
        this.brainApi = inject(BrainApi);
        this.store = inject(BrainStore);
        this.transloco = inject(TranslocoService);
        this.spaceId = input.required(...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
        // Query panel
        this.queryMode = signal('search', ...(ngDevMode ? [{ debugName: "queryMode" }] : /* istanbul ignore next */ []));
        this.queryCollections = ['memories', 'entities', 'edges', 'chrono', 'files'];
        this.queryForm = { collection: 'memories', filter: '', projection: '', limit: 20, maxTimeMS: 5000 };
        this.queryRunning = signal(false, ...(ngDevMode ? [{ debugName: "queryRunning" }] : /* istanbul ignore next */ []));
        this.queryResult = signal(null, ...(ngDevMode ? [{ debugName: "queryResult" }] : /* istanbul ignore next */ []));
        this.queryError = signal('', ...(ngDevMode ? [{ debugName: "queryError" }] : /* istanbul ignore next */ []));
        this.queryFilterError = signal('', ...(ngDevMode ? [{ debugName: "queryFilterError" }] : /* istanbul ignore next */ []));
        this.queryProjectionError = signal('', ...(ngDevMode ? [{ debugName: "queryProjectionError" }] : /* istanbul ignore next */ []));
        // Semantic search
        this.recallKnowledgeTypes = ['memory', 'entity', 'edge', 'chrono', 'file'];
        // `maxPerType: 0` and `includeContent: true` are the SERVER's defaults expressed as form state, not new policy:
        // 0 means "no cap" and is omitted from the request, and `includeContent` starts true because sending false makes
        // recall look as though it has stopped returning passages. `includeFreshWrites` starts false because it is an
        // opt-in scan.
        /** Focus an entity in the graph tab — the shell switches tab and sets the focus id, exactly as it does
         *  for the entities and edges tabs. */
        this.viewInGraph = output();
        this.recallForm = {
            query: '', topK: 10, minScore: 0, filter: '', tags: '', type: '',
            maxPerType: 0, includeFreshWrites: false, includeContent: true, includeDiagnostics: false,
            // Both 0 = "don't send it". `traverse: 0` is also the server default (no expansion), and `maxTimeMS: 0`
            // is not a legal deadline, so neither zero can be mistaken for a value the operator chose.
            traverse: 0, maxTimeMS: 0,
            // Same rule: 0 means "use the instance default". The server's own floor is 1000, so zero could never be a
            // ceiling an operator chose either.
            maxBytes: 0,
        };
        /**
         * Set when the answer was SHORTENED by the byte budget, so the page can say so.
         *
         * The server has reported this since the spill shipped and the client never read it — so a hundred-match
         * search could show a handful of records with nothing anywhere on the page explaining why. Under the old
         * record cap that was three records out of a hundred.
         *
         * Only the two numbers an operator can act on are kept. `budgetBytes` and `bytesReturned` are deliberately
         * left out: they are for a caller tuning a request programmatically, and a byte count in the interface is a
         * number nobody can do anything with.
         */
        this.recallTruncated = signal(null, ...(ngDevMode ? [{ debugName: "recallTruncated" }] : /* istanbul ignore next */ []));
        /** Type restriction + per-type minimums. Unchecked types are simply not sent. */
        this.recallTypeOpts = ['memory', 'entity', 'edge', 'chrono', 'file']
            .map(type => ({ type, on: false, min: null }));
        this.showRecallAdvanced = signal(false, ...(ngDevMode ? [{ debugName: "showRecallAdvanced" }] : /* istanbul ignore next */ []));
        this.recallRunning = signal(false, ...(ngDevMode ? [{ debugName: "recallRunning" }] : /* istanbul ignore next */ []));
        this.recallResults = signal([], ...(ngDevMode ? [{ debugName: "recallResults" }] : /* istanbul ignore next */ []));
        this.recallError = signal('', ...(ngDevMode ? [{ debugName: "recallError" }] : /* istanbul ignore next */ []));
        /**
         * Recall hits with each document's chunk matches collapsed under it (4c-ii).
         *
         * A long paper relevant in five places used to return five near-identical rows, pushing everything else
         * out of view. The server has always sent `parentFileId` + an inlined `parentFile` on chunk hits; nothing
         * read them until now, so this is presentation only — no API change, and MCP callers still get the flat
         * list they are built around.
         */
        this.recallGroups = computed(() => groupRecallResults(this.recallResults()), ...(ngDevMode ? [{ debugName: "recallGroups" }] : /* istanbul ignore next */ []));
    }
    /** Type names offered by the recall "filter by type" dropdown (F5): schema type
     *  names for the space UNION the distinct `type` values present in the loaded
     *  records, so it's usable whether or not a schema is defined. */
    recallTypeSchemaOptions() {
        const ts = this.store.spaceMeta()?.typeSchemas;
        return [...new Set([
                ...Object.keys(ts?.entity ?? {}),
                ...Object.keys(ts?.memory ?? {}),
                ...this.store.memories().map(m => m.type),
                ...this.store.entities().map(e => e.type),
                ...this.store.edges().map(e => e.type),
            ].filter((t) => !!t))].sort();
    }
    /** The heading a passage sits under, when the chunker recorded one. */
    chunkHeading(r) {
        return chunkLabel(r);
    }
    /** The passage's own text for display, or undefined when the hit carries none. */
    passageOf(r) {
        return passageText(r);
    }
    runQuery() {
        this.queryFilterError.set('');
        this.queryProjectionError.set('');
        this.queryError.set('');
        let filter = {};
        let projection;
        if (this.queryForm.filter.trim()) {
            try {
                filter = JSON.parse(this.queryForm.filter.trim());
            }
            catch (e) {
                this.queryFilterError.set(`Invalid JSON — ${e instanceof Error ? e.message : 'check your filter syntax'}`);
                return;
            }
        }
        if (this.queryForm.projection.trim()) {
            try {
                projection = JSON.parse(this.queryForm.projection.trim());
            }
            catch (e) {
                this.queryProjectionError.set(`Invalid JSON — ${e instanceof Error ? e.message : 'check your projection syntax'}`);
                return;
            }
        }
        this.queryRunning.set(true);
        this.brainApi.queryBrain(this.spaceId(), {
            collection: this.queryForm.collection,
            filter,
            projection,
            limit: this.queryForm.limit,
            maxTimeMS: this.queryForm.maxTimeMS,
        }).subscribe({
            next: (res) => { this.queryRunning.set(false); this.queryResult.set(res); },
            error: (err) => {
                this.queryRunning.set(false);
                this.queryError.set(err.error?.error ?? 'Query failed');
            },
        });
    }
    clearQuery() {
        this.queryResult.set(null);
        this.queryError.set('');
    }
    runRecall() {
        if (!this.recallForm.query.trim())
            return;
        // Optional structured filter — same expression grammar as the Advanced Query
        // filter. Parse it here so a typo surfaces as a form error rather than a 400.
        let filter;
        const rawFilter = this.recallForm.filter.trim();
        if (rawFilter) {
            try {
                const parsed = JSON.parse(rawFilter);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    this.recallError.set(this.transloco.translate('brain.query.filterMustBeObject'));
                    return;
                }
                filter = parsed;
            }
            catch {
                this.recallError.set(this.transloco.translate('brain.query.filterInvalidJson'));
                return;
            }
        }
        // The "filter by type" dropdown (F5) is a friendly shortcut for
        // filter:{type:{eq}}; it merges into (and overrides the `type` key of) any
        // hand-written JSON filter above.
        if (this.recallForm.type) {
            filter = { ...(filter ?? {}), type: { eq: this.recallForm.type } };
        }
        const selected = this.recallTypeOpts.filter(o => o.on);
        const types = selected.length ? selected.map(o => o.type) : undefined;
        const minPerType = {};
        for (const o of selected) {
            if (o.min != null && o.min > 0)
                minPerType[o.type] = o.min;
        }
        const tags = this.recallForm.tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        this.recallRunning.set(true);
        this.recallError.set('');
        this.recallResults.set([]);
        this.recallTruncated.set(null);
        this.brainApi.recallBrain(this.spaceId(), {
            query: this.recallForm.query.trim(),
            topK: this.recallForm.topK,
            minScore: this.recallForm.minScore || undefined,
            ...(types ? { types } : {}),
            ...(Object.keys(minPerType).length ? { minPerType } : {}),
            ...(tags.length ? { tags } : {}),
            ...(filter ? { filter } : {}),
            // Each omitted unless it says something. `maxPerType: 0` is "no cap" and must not be sent as a literal zero,
            // which would cap every type at nothing. `includeFreshWrites` is only sent when true — the route rejects a
            // non-boolean, and there is no reason to spell out the default. `includeContent` is only sent when the operator
            // has actually turned it off.
            ...(this.recallForm.maxPerType > 0 ? { maxPerType: this.recallForm.maxPerType } : {}),
            ...(this.recallForm.includeFreshWrites ? { includeFreshWrites: true } : {}),
            ...(this.recallForm.includeContent ? {} : { includeContent: false }),
            // Same rule as above and the same reason: the server default is false, so only an operator who
            // switched it ON sends it. Sending `false` explicitly would put a parameter in every request that
            // means exactly what its absence means.
            ...(this.recallForm.includeDiagnostics ? { includeDiagnostics: true } : {}),
            ...(this.recallForm.traverse > 0 ? { traverse: this.recallForm.traverse } : {}),
            ...(this.recallForm.maxTimeMS > 0 ? { maxTimeMS: this.recallForm.maxTimeMS } : {}),
            ...(this.recallForm.maxBytes > 0 ? { maxBytes: this.recallForm.maxBytes } : {}),
        }).subscribe({
            // Flattened on arrival: `traverse > 0` returns each item wrapped in an envelope, and the grouping and
            // rendering below both read the record's own fields directly.
            next: (res) => {
                this.recallRunning.set(false);
                this.recallResults.set(flattenRecallItems(res.results));
                // `=== true` rather than truthy: the field is optional on the type (an older server sends none), and an
                // absent one must read as "not truncated" rather than as "unknown".
                this.recallTruncated.set(res.truncated === true
                    ? { returned: res.returned ?? res.results.length, count: res.count }
                    : null);
            },
            error: (err) => { this.recallRunning.set(false); this.recallError.set(err.error?.error ?? 'Search failed'); },
        });
    }
    clearRecall() {
        this.recallResults.set([]);
        this.recallError.set('');
        this.recallTruncated.set(null);
    }
    formatQueryDoc(doc) {
        return JSON.stringify(doc, null, 2);
    }
    /**
     * The graph node a recall hit corresponds to, or null when it has none.
     *
     * An entity IS a node. An edge is shown by focusing the entity it starts from — the same choice the edges
     * tab makes, so the button means the same thing in both places. Memories, chrono entries and file chunks
     * have no node, and get no button rather than one that lands on an empty graph.
     */
    graphTargetOf(hit) {
        const id = hit.type === 'entity' ? hit['_id'] : hit.type === 'edge' ? hit['from'] : undefined;
        return typeof id === 'string' && id.length > 0 ? id : null;
    }
    static { this.ɵfac = function QueryTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || QueryTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: QueryTabComponent, selectors: [["app-query-tab"]], inputs: { spaceId: [1, "spaceId"] }, outputs: { viewInGraph: "viewInGraph" }, decls: 10, vars: 16, consts: [[1, "query-panel"], [2, "display", "flex", "gap", "8px", "margin-bottom", "12px"], [1, "btn", "btn-sm", 3, "click"], [1, "query-form"], [1, "field", 2, "margin-bottom", "0"], ["type", "text", "name", "recallQuery", 2, "width", "100%", "font-size", "14px", "padding", "8px 12px", 3, "ngModelChange", "keydown.enter", "ngModel", "placeholder"], [1, "query-form-row", 2, "margin-top", "8px"], [1, "field", 2, "min-width", "100px", "margin", "0"], [2, "color", "var(--text-muted)", "font-size", "11px"], ["name", "info", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], ["type", "number", "name", "recallTopK", "min", "1", "max", "100", 2, "width", "80px", 3, "ngModelChange", "ngModel"], [1, "field", 2, "min-width", "120px", "margin", "0"], ["type", "number", "name", "recallMinScore", "min", "0", "max", "1", "step", "0.05", 2, "width", "80px", 3, "ngModelChange", "ngModel"], [1, "field", 2, "margin", "0", "align-self", "flex-end"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "margin-top", "10px", "padding", "10px", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)"], [2, "display", "flex", "align-items", "center", "gap", "10px", "margin-top", "8px"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "btn", "btn-sm", "btn-secondary"], [2, "font-size", "12px", "color", "var(--error)"], [1, "alert", "alert-warning", 2, "margin-top", "12px"], [1, "row", 2, "gap", "14px", "flex-wrap", "wrap", "margin-bottom", "10px"], [1, "field", 2, "margin", "0"], ["type", "number", "name", "recallMaxPerType", "min", "0", "max", "100", 2, "width", "90px", 3, "ngModelChange", "ngModel", "placeholder"], [1, "field", 2, "min-width", "90px"], ["type", "number", "name", "recallTraverse", "min", "0", "max", "5", 2, "width", "80px", 3, "ngModelChange", "ngModel", "placeholder"], [1, "field", 2, "min-width", "100px"], ["type", "number", "name", "recallMaxTimeMS", "min", "0", "max", "30000", 2, "width", "100px", 3, "ngModelChange", "ngModel", "placeholder"], [1, "field", 2, "min-width", "120px"], ["type", "number", "name", "recallMaxBytes", "min", "0", "max", "5000000", "step", "1000", 2, "width", "110px", 3, "ngModelChange", "ngModel", "placeholder"], [2, "display", "flex", "align-items", "center", "gap", "6px", "align-self", "flex-end", "cursor", "pointer"], ["type", "checkbox", "name", "recallFresh", 3, "ngModelChange", "ngModel"], ["type", "checkbox", "name", "recallIncludeContent", 3, "ngModelChange", "ngModel"], ["type", "checkbox", "name", "recallIncludeDiagnostics", 3, "ngModelChange", "ngModel"], [2, "display", "block", "margin-bottom", "6px"], [2, "display", "flex", "flex-wrap", "wrap", "gap", "12px"], [2, "display", "inline-flex", "align-items", "center", "gap", "5px"], [1, "field", 2, "margin-top", "10px"], ["type", "text", "name", "recallTags", 2, "width", "100%", 3, "ngModelChange", "ngModel", "placeholder"], ["name", "recallType", 2, "max-width", "220px", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], [1, "field", 2, "margin-top", "8px", "margin-bottom", "0"], ["name", "recallFilter", "rows", "3", 2, "width", "100%", "font-family", "var(--font-mono, monospace)", "font-size", "12px", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "checkbox", 3, "ngModelChange", "ngModel", "name"], [2, "font-size", "13px"], ["type", "number", "min", "0", 2, "width", "56px", 3, "ngModel", "name", "max", "placeholder"], ["type", "number", "min", "0", 2, "width", "56px", 3, "ngModelChange", "ngModel", "name", "max", "placeholder"], [1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "font-size", "12px", "margin-top", "4px"], [1, "query-results-header", 2, "margin-top", "12px"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-left", "6px"], [1, "query-result-card", 2, "margin-top", "6px"], [2, "display", "flex", "gap", "8px", "margin-bottom", "4px", "align-items", "center", "flex-wrap", "wrap"], [1, "badge", "badge-purple"], [2, "font-size", "12px", "word-break", "break-all"], [2, "font-size", "11px", "color", "var(--text-muted)"], [1, "badge"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-bottom", "4px"], [2, "margin", "0", "padding-left", "16px"], [2, "margin", "2px 0"], [2, "font-size", "11px", "color", "var(--text-secondary)", "font-weight", "550"], [2, "white-space", "pre-wrap", "word-break", "break-word", "font-size", "12px"], [2, "white-space", "pre-wrap", "word-break", "break-all"], [2, "display", "flex", "gap", "8px", "margin-bottom", "4px", "align-items", "center"], [1, "icon-btn", 2, "margin-left", "auto"], [1, "icon-btn", 2, "margin-left", "auto", 3, "click"], ["name", "graph", 3, "size"], [1, "query-form-row"], [1, "field", 2, "min-width", "160px"], ["name", "queryCollection", 3, "ngModelChange", "ngModel"], [1, "field", 2, "min-width", "80px"], ["type", "number", "name", "queryLimit", "min", "1", "max", "100", 2, "width", "80px", 3, "ngModelChange", "ngModel"], ["type", "number", "name", "queryMaxTimeMS", "min", "100", "max", "30000", 2, "width", "100px", 3, "ngModelChange", "ngModel"], [1, "field"], ["name", "queryFilter", "rows", "3", 1, "query-textarea", 3, "ngModelChange", "ngModel", "placeholder"], [2, "font-size", "11px", "color", "var(--error)", "margin-top", "3px"], ["name", "queryProjection", "rows", "2", 1, "query-textarea", 3, "ngModelChange", "ngModel", "placeholder"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [1, "query-results-header"], [1, "query-empty"], [1, "query-result-card"]], template: function QueryTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1)(2, "button", 2);
            i0.ɵɵlistener("click", function QueryTabComponent_Template_button_click_2_listener() { return ctx.queryMode.set("search"); });
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(5, "button", 2);
            i0.ɵɵlistener("click", function QueryTabComponent_Template_button_click_5_listener() { return ctx.queryMode.set("advanced"); });
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(8, QueryTabComponent_Conditional_8_Template, 39, 39);
            i0.ɵɵconditionalCreate(9, QueryTabComponent_Conditional_9_Template, 48, 49);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("btn-primary", ctx.queryMode() === "search")("btn-secondary", ctx.queryMode() !== "search");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 12, "brain.query.mode.semanticSearch"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("btn-primary", ctx.queryMode() === "advanced")("btn-secondary", ctx.queryMode() !== "advanced");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 14, "brain.query.mode.advancedQuery"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.queryMode() === "search" ? 8 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.queryMode() === "advanced" ? 9 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.MinValidator, i1.MaxValidator, i1.NgModel, PhIconComponent, TranslocoPipe], styles: [".query-panel[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 14px;\n    }\n    .query-form[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 10px;\n      padding: 16px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n    }\n    .query-form-row[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 10px;\n      flex-wrap: wrap;\n      align-items: flex-end;\n    }\n    .query-form-row[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin: 0; }\n    .query-textarea[_ngcontent-%COMP%] {\n      width: 100%;\n      font-family: var(--font-mono, monospace);\n      font-size: 12px;\n      padding: 8px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n      resize: vertical;\n      min-height: 64px;\n    }\n    .query-textarea.error[_ngcontent-%COMP%] { border-color: var(--error); }\n    .query-results-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      font-size: 13px;\n      color: var(--text-muted);\n    }\n    .query-results-header[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] { color: var(--text-primary); }\n    .query-result-card[_ngcontent-%COMP%] {\n      padding: 10px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      font-family: var(--font-mono, monospace);\n      font-size: 11px;\n      line-height: 1.5;\n      white-space: pre-wrap;\n      word-break: break-all;\n      color: var(--text-secondary);\n    }\n    .query-empty[_ngcontent-%COMP%] {\n      text-align: center;\n      padding: 40px 20px;\n      color: var(--text-muted);\n      font-size: 14px;\n    }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(QueryTabComponent, [{
        type: Component,
        args: [{ selector: 'app-query-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent], template: `
          <div class="query-panel">
            <!-- Mode switcher -->
            <div style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="btn btn-sm" [class.btn-primary]="queryMode() === 'search'" [class.btn-secondary]="queryMode() !== 'search'" (click)="queryMode.set('search')">{{ 'brain.query.mode.semanticSearch' | transloco }}</button>
              <button class="btn btn-sm" [class.btn-primary]="queryMode() === 'advanced'" [class.btn-secondary]="queryMode() !== 'advanced'" (click)="queryMode.set('advanced')">{{ 'brain.query.mode.advancedQuery' | transloco }}</button>
            </div>

            <!-- Semantic Search mode -->
            @if (queryMode() === 'search') {
              <div class="query-form">
                <div class="field" style="margin-bottom:0;">
                  <label>{{ 'brain.query.search.label' | transloco }}</label>
                  <input
                    type="text"
                    [(ngModel)]="recallForm.query"
                    name="recallQuery"
                    [placeholder]="'brain.query.search.placeholder' | transloco"
                    style="width:100%; font-size:14px; padding:8px 12px;"
                    (keydown.enter)="runRecall()"
                    [attr.aria-label]="'brain.query.search.label' | transloco"
                  />
                </div>
                <div class="query-form-row" style="margin-top:8px;">
                  <div class="field" style="min-width:100px; margin:0;">
                    <label>{{ 'brain.query.topK' | transloco }} <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.topK.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span></label>
                    <input type="number" [(ngModel)]="recallForm.topK" name="recallTopK" min="1" max="100" style="width:80px;" />
                  </div>
                  <div class="field" style="min-width:120px; margin:0;">
                    <label>{{ 'brain.query.minScore' | transloco }} <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.minScore.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span></label>
                    <input type="number" [(ngModel)]="recallForm.minScore" name="recallMinScore" min="0" max="1" step="0.05" style="width:80px;" />
                  </div>
                  <div class="field" style="margin:0; align-self:flex-end;">
                    <button class="btn btn-sm btn-secondary" type="button" (click)="showRecallAdvanced.set(!showRecallAdvanced())">
                      {{ (showRecallAdvanced() ? 'brain.query.hideAdvanced' : 'brain.query.showAdvanced') | transloco }}
                    </button>
                  </div>
                </div>

                @if (showRecallAdvanced()) {
                  <div style="margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                    <!-- The rest of the recall surface. Owner asked for every fillable MCP/REST field to be
                         reachable from the UI; before this, maxPerType, includeFreshWrites and includeContent could
                         only be set by hand-writing a request.
                         NOTE: no backticks anywhere in this template, including comments. One ends the template
                         string and the error points at @Component, never here. -->
                    <div class="row" style="gap:14px; flex-wrap:wrap; margin-bottom:10px;">
                      <div class="field" style="margin:0;">
                        <label>{{ 'brain.query.maxPerType' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.maxPerType.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.maxPerType" name="recallMaxPerType" min="0" max="100"
                          [placeholder]="'brain.query.maxPerType.none' | transloco" style="width:90px;" />
                      </div>
                      <div class="field" style="min-width:90px;">
                        <label>{{ 'brain.query.traverse' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.traverse.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.traverse" name="recallTraverse" min="0" max="5"
                          [placeholder]="'brain.query.traverse.none' | transloco" style="width:80px;" />
                      </div>
                      <div class="field" style="min-width:100px;">
                        <label>{{ 'brain.query.maxTimeMs' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.recallMaxTimeMs.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.maxTimeMS" name="recallMaxTimeMS" min="0" max="30000"
                          [placeholder]="'brain.query.recallMaxTimeMs.none' | transloco" style="width:100px;" />
                      </div>
                      <div class="field" style="min-width:120px;">
                        <!-- ONE control for the size ceiling, not two. maxTokens is a convenience onto the same
                             number and the server applies whichever is smaller, so offering both would let an
                             operator set two limits and then have to work out which one won. -->
                        <label>{{ 'brain.query.recallMaxBytes' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.recallMaxBytes.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.maxBytes" name="recallMaxBytes" min="0" max="5000000" step="1000"
                          [placeholder]="'brain.query.recallMaxBytes.default' | transloco" style="width:110px;" />
                      </div>
                      <label style="display:flex; align-items:center; gap:6px; align-self:flex-end; cursor:pointer;">
                        <input type="checkbox" [(ngModel)]="recallForm.includeFreshWrites" name="recallFresh" />
                        <span>{{ 'brain.query.includeFreshWrites' | transloco }}</span>
                        <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.includeFreshWrites.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                      </label>
                      <label style="display:flex; align-items:center; gap:6px; align-self:flex-end; cursor:pointer;">
                        <input type="checkbox" [(ngModel)]="recallForm.includeContent" name="recallIncludeContent" />
                        <span>{{ 'brain.query.includeContent' | transloco }}</span>
                        <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.includeContent.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                      </label>
                      <label style="display:flex; align-items:center; gap:6px; align-self:flex-end; cursor:pointer;">
                        <input type="checkbox" [(ngModel)]="recallForm.includeDiagnostics" name="recallIncludeDiagnostics" />
                        <span>{{ 'brain.query.includeDiagnostics' | transloco }}</span>
                        <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.includeDiagnostics.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                      </label>
                    </div>

                    <!-- Type restriction + per-type minimums -->
                    <label style="display:block; margin-bottom:6px;">
                      {{ 'brain.query.types' | transloco }}
                      <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.types.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                    </label>
                    <div style="display:flex; flex-wrap:wrap; gap:12px;">
                      @for (opt of recallTypeOpts; track opt.type) {
                        <span style="display:inline-flex; align-items:center; gap:5px;">
                          <input
                            type="checkbox"
                            [(ngModel)]="opt.on"
                            [name]="'recallType-' + opt.type"
                            [attr.aria-label]="opt.type"
                          />
                          <span style="font-size:13px;">{{ opt.type }}</span>
                          @if (opt.on) {
                            <input
                              type="number"
                              [(ngModel)]="opt.min"
                              [name]="'recallMin-' + opt.type"
                              min="0"
                              [max]="recallForm.topK"
                              style="width:56px;"
                              [placeholder]="'brain.query.minPerType.placeholder' | transloco"
                              [attr.title]="'brain.query.minPerType.tooltip' | transloco"
                            />
                          }
                        </span>
                      }
                    </div>

                    <div class="field" style="margin-top:10px;">
                      <label>{{ 'brain.query.tags' | transloco }}</label>
                      <input
                        type="text"
                        [(ngModel)]="recallForm.tags"
                        name="recallTags"
                        [placeholder]="'brain.query.tags.placeholder' | transloco"
                        style="width:100%;"
                      />
                    </div>

                    <!-- Schema/type filter (F5): a friendly picker for filter:{type:{eq}}. -->
                    <div class="field" style="margin-top:10px;">
                      <label>{{ 'brain.query.filterByType' | transloco }}</label>
                      <select [(ngModel)]="recallForm.type" name="recallType" style="max-width:220px;">
                        <option value="">{{ 'brain.query.anyType' | transloco }}</option>
                        @for (t of recallTypeSchemaOptions(); track t) {
                          <option [value]="t">{{ t }}</option>
                        }
                      </select>
                    </div>

                    <div class="field" style="margin-top:8px; margin-bottom:0;">
                      <label>{{ 'brain.query.filter' | transloco }}</label>
                      <textarea
                        [(ngModel)]="recallForm.filter"
                        name="recallFilter"
                        rows="3"
                        [placeholder]="'brain.query.filter.placeholder' | transloco"
                        style="width:100%; font-family:var(--font-mono, monospace); font-size:12px;"
                      ></textarea>
                    </div>
                  </div>
                }

                <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                  <button class="btn btn-sm btn-primary" [disabled]="recallRunning() || !recallForm.query.trim()" (click)="runRecall()">
                    @if (recallRunning()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'brain.query.searchButton' | transloco }}
                  </button>
                  @if (recallResults().length) {
                    <button class="btn btn-sm btn-secondary" (click)="clearRecall()">{{ 'brain.query.clearResults' | transloco }}</button>
                  }
                  @if (recallError()) {
                    <span style="font-size:12px; color:var(--error);">{{ recallError() }}</span>
                  }
                </div>
              </div>

              <!-- THE ANSWER WAS SHORTENED, and until now the page did not say so.
                   Placed above the results rather than below them: a reader who scrolls to the end has already
                   concluded that is all there was, which is the whole failure. Says both guarantees, because
                   "shortened" on its own reads as "unreliable" — the records that came back are complete and
                   they are the top of the ranking, with nothing missing from the middle. -->
              @if (recallTruncated(); as t) {
                <div class="alert alert-warning" style="margin-top:12px;">
                  <div><strong>{{ 'brain.query.truncated.title' | transloco: { returned: t.returned, count: t.count } }}</strong></div>
                  <div style="font-size:12px; margin-top:4px;">{{ 'brain.query.truncated.body' | transloco }}</div>
                  <div style="font-size:12px; margin-top:4px;">{{ 'brain.query.truncated.what' | transloco }}</div>
                </div>
              }

              @if (recallResults().length) {
                <div class="query-results-header" style="margin-top:12px;">
                  <strong>{{ recallGroups().length }}</strong> {{ 'brain.query.resultsCount' | transloco: { count: recallGroups().length } }}
                  <!-- Grouping makes a topK of 10 look like 6, so the passage count is stated rather than
                       left for the reader to wonder about. Only shown when grouping actually happened. -->
                  @if (recallResults().length !== recallGroups().length) {
                    <span style="font-size:11px; color:var(--text-muted); margin-left:6px;">{{ 'brain.query.groupedPassages' | transloco: { count: recallResults().length } }}</span>
                  }
                </div>
                @for (g of recallGroups(); track $index) {
                  <div class="query-result-card" style="margin-top:6px;">
                    @if (g.file; as f) {
                      <!-- A grouped document: name the FILE once, then say where inside it matched. -->
                      <div style="display:flex; gap:8px; margin-bottom:4px; align-items:center; flex-wrap:wrap;">
                        <span class="badge badge-purple">file</span>
                        <strong style="font-size:12px; word-break:break-all;">{{ f.path }}</strong>
                        @if (g.score != null) {
                          <span style="font-size:11px; color:var(--text-muted);">{{ 'common.score' | transloco }}: {{ g.score.toFixed(3) }}</span>
                        }
                        @if (g.hitCount > 1) {
                          <span class="badge">{{ 'brain.query.passages' | transloco: { count: g.hitCount } }}</span>
                        }
                      </div>
                      @if (f.description) {
                        <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">{{ f.description }}</div>
                      }
                      <ul style="margin:0; padding-left:16px;">
                        @for (h of g.hits; track $index) {
                          <li style="margin:2px 0;">
                            @if (chunkHeading(h); as heading) {
                              <span style="font-size:11px; color:var(--text-secondary); font-weight:550;">{{ heading }}</span>
                            }
                            <!-- The passage's own text, not the raw record: a JSON dump per passage is
                                 unreadable stacked six deep, and the text is what actually matched.
                                 Falls back to the record only when a hit carries no text at all. -->
                            @if (passageOf(h); as text) {
                              <div style="white-space:pre-wrap; word-break:break-word; font-size:12px;">{{ text }}</div>
                            } @else {
                              <div style="white-space:pre-wrap; word-break:break-all;">{{ formatQueryDoc(h) }}</div>
                            }
                          </li>
                        }
                      </ul>
                    } @else {
                      <div style="display:flex; gap:8px; margin-bottom:4px; align-items:center;">
                        <span class="badge badge-purple">{{ g.hits[0].type }}</span>
                        @if (g.score != null) {
                          <span style="font-size:11px; color:var(--text-muted);">{{ 'common.score' | transloco }}: {{ g.score.toFixed(3) }}</span>
                        }
                        <!-- A hit that HAS a node in the graph gets the same jump the entities and edges tabs
                             offer. Traverse results are entities too, so an expanded neighbour is reachable
                             from here without going back to a list. -->
                        @if (graphTargetOf(g.hits[0]); as target) {
                          <button class="icon-btn" style="margin-left:auto;" [attr.title]="'common.viewInGraph' | transloco"
                            [attr.aria-label]="'common.viewInGraph' | transloco" (click)="viewInGraph.emit(target)"><ph-icon name="graph" [size]="16"/></button>
                        }
                      </div>
                      <div style="white-space:pre-wrap; word-break:break-all;">{{ formatQueryDoc(g.hits[0]) }}</div>
                    }
                  </div>
                }
              }
            }

            <!-- Advanced Query mode -->
            @if (queryMode() === 'advanced') {
              <div class="query-form">
                <div class="query-form-row">
                  <div class="field" style="min-width:160px;">
                    <label>{{ 'brain.query.collection' | transloco }}</label>
                    <select [(ngModel)]="queryForm.collection" name="queryCollection" [attr.aria-label]="'brain.query.collection' | transloco">
                      @for (c of queryCollections; track c) { <option [value]="c">{{ c }}</option> }
                    </select>
                  </div>
                  <div class="field" style="min-width:80px;">
                    <label>{{ 'brain.query.limit' | transloco }}</label>
                    <input type="number" [(ngModel)]="queryForm.limit" name="queryLimit" min="1" max="100" style="width:80px;" />
                  </div>
                  <div class="field" style="min-width:100px;">
                    <label>{{ 'brain.query.maxTimeMs' | transloco }}</label>
                    <input type="number" [(ngModel)]="queryForm.maxTimeMS" name="queryMaxTimeMS" min="100" max="30000" style="width:100px;" />
                  </div>
                </div>
                <div class="field">
                  <label>{{ 'brain.query.filter' | transloco }} <span style="color:var(--text-muted);font-size:11px;">{{ 'brain.query.filterHint' | transloco }}</span></label>
                  <textarea
                    class="query-textarea"
                    [class.error]="queryFilterError()"
                    [(ngModel)]="queryForm.filter"
                    name="queryFilter"
                    rows="3"
                    [placeholder]="'brain.query.filterPlaceholder' | transloco"
                  ></textarea>
                  @if (queryFilterError()) {
                    <div style="font-size:11px; color:var(--error); margin-top:3px;">{{ queryFilterError() }}</div>
                  }
                </div>
                <div class="field">
                  <label>{{ 'brain.query.projection' | transloco }} <span style="color:var(--text-muted);font-size:11px;">{{ 'brain.query.projectionHint' | transloco }}</span></label>
                  <textarea
                    class="query-textarea"
                    [class.error]="queryProjectionError()"
                    [(ngModel)]="queryForm.projection"
                    name="queryProjection"
                    rows="2"
                    [placeholder]="'brain.query.projectionPlaceholder' | transloco"
                  ></textarea>
                  @if (queryProjectionError()) {
                    <div style="font-size:11px; color:var(--error); margin-top:3px;">{{ queryProjectionError() }}</div>
                  }
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <button class="btn btn-sm btn-primary" [disabled]="queryRunning()" (click)="runQuery()">
                    @if (queryRunning()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'brain.query.runQuery' | transloco }}
                  </button>
                  @if (queryResult()) {
                    <button class="btn btn-sm btn-secondary" (click)="clearQuery()">{{ 'brain.query.clearResults' | transloco }}</button>
                  }
                  @if (queryError()) {
                    <span style="font-size:12px; color:var(--error);">{{ queryError() }}</span>
                  }
                </div>
              </div>

              @if (queryResult(); as res) {
                <div class="query-results-header">
                  <strong>{{ res.count }}</strong> {{ 'brain.query.resultsFrom' | transloco: { count: res.count, collection: res.collection } }}
                </div>
                @if (res.results.length === 0) {
                  <div class="query-empty">{{ 'brain.query.noDocuments' | transloco }}</div>
                } @else {
                  @for (doc of res.results; track $index) {
                    <div class="query-result-card">{{ formatQueryDoc(doc) }}</div>
                  }
                }
              }
            }
          </div>
  `, styles: ["\n    .query-panel {\n      display: flex;\n      flex-direction: column;\n      gap: 14px;\n    }\n    .query-form {\n      display: flex;\n      flex-direction: column;\n      gap: 10px;\n      padding: 16px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n    }\n    .query-form-row {\n      display: flex;\n      gap: 10px;\n      flex-wrap: wrap;\n      align-items: flex-end;\n    }\n    .query-form-row .field { margin: 0; }\n    .query-textarea {\n      width: 100%;\n      font-family: var(--font-mono, monospace);\n      font-size: 12px;\n      padding: 8px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n      resize: vertical;\n      min-height: 64px;\n    }\n    .query-textarea.error { border-color: var(--error); }\n    .query-results-header {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      font-size: 13px;\n      color: var(--text-muted);\n    }\n    .query-results-header strong { color: var(--text-primary); }\n    .query-result-card {\n      padding: 10px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      font-family: var(--font-mono, monospace);\n      font-size: 11px;\n      line-height: 1.5;\n      white-space: pre-wrap;\n      word-break: break-all;\n      color: var(--text-secondary);\n    }\n    .query-empty {\n      text-align: center;\n      padding: 40px 20px;\n      color: var(--text-muted);\n      font-size: 14px;\n    }\n  "] }]
    }], null, { spaceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaceId", required: true }] }], viewInGraph: [{ type: i0.Output, args: ["viewInGraph"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(QueryTabComponent, { className: "QueryTabComponent", filePath: "app/pages/brain/query-tab.component.ts", lineNumber: 417 }); })();
