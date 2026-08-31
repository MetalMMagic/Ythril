import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';
import { CHIP_STYLES } from './chip.styles';
import { PROP_TABLE_STYLES } from './prop-table.styles';
import { mergeFnsFor, mergeFnAfterTypeChange } from './merge-fns';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = () => [];
const _forTrack0 = ($index, $item) => $item.key;
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("enum ", p_r2.s.enum.length);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("min:", p_r2.s.minimum);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("max:", p_r2.s.maximum);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵtext(1, "pattern");
    i0.ɵɵelementEnd();
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("default:", p_r2.s.default);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 16);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(p_r2.s.mergeFn);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_For_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 34);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const fn_r5 = ctx.$implicit;
    i0.ɵɵproperty("value", fn_r5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(fn_r5);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 25)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 36);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "input", 37);
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_33_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r6); const p_r2 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r2.s.pattern, $event) || (p_r2.s.pattern = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_33_Template_input_ngModelChange_7_listener() { i0.ɵɵrestoreView(_r6); const ctx_r2 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r2.changed.emit()); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 3, "spaces.schema.propDetail.pattern"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 5, "spaces.schema.propDetail.patternHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2.s.pattern);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 25)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "input", 38);
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_34_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r7); const p_r2 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r2.s.minimum, $event) || (p_r2.s.minimum = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_34_Template_input_ngModelChange_4_listener() { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r2.changed.emit()); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(5, "div", 25)(6, "label");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "input", 38);
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_34_Template_input_ngModelChange_9_listener($event) { i0.ɵɵrestoreView(_r7); const p_r2 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r2.s.maximum, $event) || (p_r2.s.maximum = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_34_Template_input_ngModelChange_9_listener() { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r2.changed.emit()); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "spaces.schema.propDetail.min"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2.s.minimum);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 6, "spaces.schema.propDetail.max"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2.s.maximum);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_For_10_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 41);
    i0.ɵɵtext(1);
    i0.ɵɵelementStart(2, "button", 43);
    i0.ɵɵlistener("click", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_For_10_Template_button_click_2_listener() { const ev_r10 = i0.ɵɵrestoreView(_r9).$implicit; const p_r2 = i0.ɵɵnextContext(3).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.removeEnumVal(p_r2, ev_r10)); });
    i0.ɵɵelement(3, "ph-icon", 19);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ev_r10 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ev_r10);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 35)(1, "div", 25)(2, "label");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementStart(5, "span", 39);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 40);
    i0.ɵɵrepeaterCreate(9, PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_For_10_Template, 4, 2, "span", 41, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementStart(11, "input", 42);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_Template_input_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r8); const p_r2 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r2._enumInput, $event) || (p_r2._enumInput = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keydown", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_Template_input_keydown_11_listener($event) { i0.ɵɵrestoreView(_r8); const p_r2 = i0.ɵɵnextContext(2).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.onEnumKey($event, p_r2)); });
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(4, 4, "spaces.schema.propDetail.enumValues"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 6, "spaces.schema.propDetail.enumHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(p_r2.s.enum ?? i0.ɵɵpureFunction0(10, _c0));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2._enumInput);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(12, 8, "spaces.schema.propDetail.enumPlaceholder"));
} }
function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 21);
    i0.ɵɵlistener("click", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_tr_click_0_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(1, "td", 22)(2, "div", 23)(3, "div", 24)(4, "div", 25)(5, "label");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "select", 26);
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_select_ngModelChange_8_listener($event) { i0.ɵɵrestoreView(_r4); const p_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(p_r2.s.type, $event) || (p_r2.s.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_select_ngModelChange_8_listener() { i0.ɵɵrestoreView(_r4); const p_r2 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.onTypeChange(p_r2)); });
    i0.ɵɵelementStart(9, "option", 27);
    i0.ɵɵtext(10, "any");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "option", 28);
    i0.ɵɵtext(12, "string");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "option", 29);
    i0.ɵɵtext(14, "number");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "option", 30);
    i0.ɵɵtext(16, "boolean");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "option", 31);
    i0.ɵɵtext(18, "date");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(19, "div", 25)(20, "label");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "input", 32);
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_input_ngModelChange_23_listener($event) { i0.ɵɵrestoreView(_r4); const p_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(p_r2.s.default, $event) || (p_r2.s.default = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_input_ngModelChange_23_listener() { i0.ɵɵrestoreView(_r4); const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.changed.emit()); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "div", 25)(25, "label");
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "select", 33);
    i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_select_ngModelChange_28_listener($event) { i0.ɵɵrestoreView(_r4); const p_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(p_r2.s.mergeFn, $event) || (p_r2.s.mergeFn = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template_select_ngModelChange_28_listener() { i0.ɵɵrestoreView(_r4); const ctx_r2 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r2.changed.emit()); });
    i0.ɵɵelementStart(29, "option", 27);
    i0.ɵɵtext(30, "\u2014");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(31, PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_For_32_Template, 2, 2, "option", 34, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(33, PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_33_Template, 8, 7, "div", 25);
    i0.ɵɵconditionalCreate(34, PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_34_Template, 10, 8);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(35, PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Conditional_35_Template, 13, 11, "div", 35);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const p_r2 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 12, "spaces.schema.propDetail.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2.s.type);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngValue", undefined);
    i0.ɵɵadvance(12);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 14, "spaces.schema.propDetail.default"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2.s.default);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 16, "spaces.schema.propDetail.mergeFn"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r2.s.mergeFn);
    i0.ɵɵproperty("disabled", !ctx_r2.mergeFnsFor(p_r2.s.type).length);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngValue", undefined);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r2.mergeFnsFor(p_r2.s.type));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(p_r2.s.type === "string" || p_r2.s.type === undefined ? 33 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.type === "number" || p_r2.s.type === undefined ? 34 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.type !== "boolean" ? 35 : -1);
} }
function PropSchemaTableComponent_Conditional_0_For_15_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 7);
    i0.ɵɵlistener("click", function PropSchemaTableComponent_Conditional_0_For_15_Template_tr_click_0_listener() { const p_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.toggleExpand(p_r2.key)); });
    i0.ɵɵelementStart(1, "td")(2, "div", 8)(3, "span", 9);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "label", 10);
    i0.ɵɵlistener("click", function PropSchemaTableComponent_Conditional_0_For_15_Template_label_click_5_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(6, "input", 11);
    i0.ɵɵlistener("change", function PropSchemaTableComponent_Conditional_0_For_15_Template_input_change_6_listener() { const p_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); p_r2.s.required = !p_r2.s.required; return i0.ɵɵresetView(ctx_r2.changed.emit()); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(9, "td")(10, "span", 12);
    i0.ɵɵtext(11);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(12, "td", 13);
    i0.ɵɵconditionalCreate(13, PropSchemaTableComponent_Conditional_0_For_15_Conditional_13_Template, 2, 1, "span", 14);
    i0.ɵɵconditionalCreate(14, PropSchemaTableComponent_Conditional_0_For_15_Conditional_14_Template, 2, 1, "span", 15);
    i0.ɵɵconditionalCreate(15, PropSchemaTableComponent_Conditional_0_For_15_Conditional_15_Template, 2, 1, "span", 15);
    i0.ɵɵconditionalCreate(16, PropSchemaTableComponent_Conditional_0_For_15_Conditional_16_Template, 2, 0, "span", 15);
    i0.ɵɵconditionalCreate(17, PropSchemaTableComponent_Conditional_0_For_15_Conditional_17_Template, 2, 1, "span", 15);
    i0.ɵɵconditionalCreate(18, PropSchemaTableComponent_Conditional_0_For_15_Conditional_18_Template, 2, 1, "span", 16);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "td")(20, "div", 17)(21, "button", 18);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵlistener("click", function PropSchemaTableComponent_Conditional_0_For_15_Template_button_click_21_listener($event) { const p_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); ctx_r2.removeRow(p_r2.key); return i0.ɵɵresetView($event.stopPropagation()); });
    i0.ɵɵelement(23, "ph-icon", 19);
    i0.ɵɵelementEnd()()()();
    i0.ɵɵconditionalCreate(24, PropSchemaTableComponent_Conditional_0_For_15_Conditional_24_Template, 36, 18, "tr", 20);
} if (rf & 2) {
    const p_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("prow-open", ctx_r2.expandedKey() === p_r2.key);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(p_r2.key);
    i0.ɵɵadvance();
    i0.ɵɵclassProp("is-req", p_r2.s.required);
    i0.ɵɵadvance();
    i0.ɵɵproperty("checked", p_r2.s.required);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(8, 17, "spaces.schema.propDetail.required"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(p_r2.s.type ?? "any");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((p_r2.s.enum == null ? null : p_r2.s.enum.length) ? 13 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.minimum !== undefined ? 14 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.maximum !== undefined ? 15 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.pattern ? 16 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.default !== undefined ? 17 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r2.s.mergeFn ? 18 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(22, 19, "common.remove"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.expandedKey() === p_r2.key ? 24 : -1);
} }
function PropSchemaTableComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "table", 0)(1, "thead")(2, "tr")(3, "th", 5);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "th", 6);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "th");
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(12, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(13, "tbody");
    i0.ɵɵrepeaterCreate(14, PropSchemaTableComponent_Conditional_0_For_15_Template, 25, 21, null, null, _forTrack0);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "spaces.schema.propTable.property"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "spaces.schema.propTable.type"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 7, "spaces.schema.propTable.constraints"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r2.rows);
} }
function PropSchemaTableComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.schema.noProps"));
} }
export class PropSchemaTableComponent {
    constructor() {
        this.rows = [];
        this.changed = new EventEmitter();
        this.expandedKey = signal(null, ...(ngDevMode ? [{ debugName: "expandedKey" }] : /* istanbul ignore next */ []));
        this.newPropInput = '';
        /** The API's own rule about which merge functions a type may hold. */
        this.mergeFnsFor = mergeFnsFor;
    }
    toggleExpand(key) {
        this.expandedKey.set(this.expandedKey() === key ? null : key);
    }
    addRow() {
        const key = this.newPropInput.trim();
        if (!key || this.rows.some(r => r.key === key)) {
            this.newPropInput = '';
            return;
        }
        this.rows.push({ key, s: {}, _enumInput: '' });
        this.newPropInput = '';
        this.expandedKey.set(key);
        this.changed.emit();
    }
    removeRow(key) {
        const idx = this.rows.findIndex(r => r.key === key);
        if (idx !== -1)
            this.rows.splice(idx, 1);
        if (this.expandedKey() === key)
            this.expandedKey.set(null);
        this.changed.emit();
    }
    /**
     * Changing the type clears a merge function the new type cannot hold.
     *
     * The two hand-written lists this replaced covered `boolean` and `number` and left `string` and `date`
     * alone — but the server accepts NO merge function on either, so switching `number` to `date` kept `min`
     * and the save was refused.
     */
    onTypeChange(p) {
        p.s.mergeFn = mergeFnAfterTypeChange(p.s.type, p.s.mergeFn);
        this.changed.emit();
    }
    onEnumKey(e, p) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            this.addEnumVal(p);
        }
    }
    addEnumVal(p) {
        const val = (p._enumInput ?? '').trim();
        if (!val)
            return;
        const curr = p.s.enum ?? [];
        if (!curr.some(v => String(v) === val))
            p.s = { ...p.s, enum: [...curr, val] };
        p._enumInput = '';
        this.changed.emit();
    }
    removeEnumVal(p, val) {
        p.s = { ...p.s, enum: (p.s.enum ?? []).filter(v => v !== val) };
        this.changed.emit();
    }
    static { this.ɵfac = function PropSchemaTableComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PropSchemaTableComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: PropSchemaTableComponent, selectors: [["app-prop-schema-table"]], inputs: { rows: "rows" }, outputs: { changed: "changed" }, decls: 8, vars: 9, consts: [[1, "prop-table"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin", "4px 0 8px"], [1, "add-prop-row"], ["type", "text", 2, "flex", "1", "max-width", "220px", 3, "ngModelChange", "keydown.enter", "ngModel", "placeholder"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click", "disabled"], [2, "width", "160px"], [2, "width", "80px"], [1, "prop-row", 3, "click"], [1, "prop-name"], [1, "prop-name-key"], [1, "req-toggle", 3, "click"], ["type", "checkbox", 3, "change", "checked"], [1, "badge", "badge-gray"], [2, "font-size", "11px", "color", "var(--text-muted)"], [1, "badge", "badge-gray", 2, "margin-right", "3px"], [2, "margin-right", "4px"], [1, "badge", "badge-blue"], [2, "display", "flex", "gap", "4px", "justify-content", "flex-end"], ["type", "button", 1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [1, "prop-expand-row"], [1, "prop-expand-row", 3, "click"], ["colspan", "4", 2, "padding", "0"], [1, "pdet"], [1, "pdet-fields"], [1, "field", 2, "margin", "0"], [3, "ngModelChange", "ngModel"], [3, "ngValue"], ["value", "string"], ["value", "number"], ["value", "boolean"], ["value", "date"], ["type", "text", "placeholder", "\u2014", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel", "disabled"], [3, "value"], [1, "pdet-full"], [2, "font-size", "10px", "font-weight", "400", "color", "var(--text-muted)"], ["type", "text", "placeholder", "^[A-Z].*", 3, "ngModelChange", "ngModel"], ["type", "number", "placeholder", "\u2014", 3, "ngModelChange", "ngModel"], [2, "font-size", "11px", "font-weight", "normal", "color", "var(--text-muted)"], [1, "chip-wrap"], [1, "chip"], ["type", "text", 1, "chip-field", 3, "ngModelChange", "keydown", "ngModel", "placeholder"], ["type", "button", 1, "chip-rm", 3, "click"]], template: function PropSchemaTableComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, PropSchemaTableComponent_Conditional_0_Template, 16, 9, "table", 0)(1, PropSchemaTableComponent_Conditional_1_Template, 3, 3, "p", 1);
            i0.ɵɵelementStart(2, "div", 2)(3, "input", 3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function PropSchemaTableComponent_Template_input_ngModelChange_3_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.newPropInput, $event) || (ctx.newPropInput = $event); return $event; });
            i0.ɵɵlistener("keydown.enter", function PropSchemaTableComponent_Template_input_keydown_enter_3_listener($event) { ctx.addRow(); return $event.preventDefault(); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(5, "button", 4);
            i0.ɵɵlistener("click", function PropSchemaTableComponent_Template_button_click_5_listener() { return ctx.addRow(); });
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.rows.length ? 0 : 1);
            i0.ɵɵadvance(3);
            i0.ɵɵtwoWayProperty("ngModel", ctx.newPropInput);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(4, 5, "spaces.schema.newPropNamePlaceholder"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", !ctx.newPropInput.trim());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 7, "spaces.schema.addPropertyButton"));
        } }, dependencies: [FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }", "\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }", ".add-prop-row[_ngcontent-%COMP%] { display:flex; gap:8px; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PropSchemaTableComponent, [{
        type: Component,
        args: [{ selector: 'app-prop-schema-table', standalone: true, imports: [FormsModule, TranslocoPipe, PhIconComponent], template: `
    @if (rows.length) {
      <table class="prop-table">
        <thead><tr>
          <th style="width:160px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
          <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
          <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
          <th></th>
        </tr></thead>
        <tbody>
          @for (p of rows; track p.key) {
            <tr class="prop-row" [class.prow-open]="expandedKey() === p.key" (click)="toggleExpand(p.key)">
              <td>
                <div class="prop-name">
                  <span class="prop-name-key">{{ p.key }}</span>
                  <label class="req-toggle" [class.is-req]="p.s.required" (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="p.s.required" (change)="p.s.required = !p.s.required; changed.emit()" />
                    {{ 'spaces.schema.propDetail.required' | transloco }}
                  </label>
                </div>
              </td>
              <td><span class="badge badge-gray">{{ p.s.type ?? 'any' }}</span></td>
              <td style="font-size:11px;color:var(--text-muted);">
                @if (p.s.enum?.length) { <span class="badge badge-gray" style="margin-right:3px">enum {{ p.s.enum!.length }}</span> }
                @if (p.s.minimum !== undefined) { <span style="margin-right:4px;">min:{{ p.s.minimum }}</span> }
                @if (p.s.maximum !== undefined) { <span style="margin-right:4px;">max:{{ p.s.maximum }}</span> }
                @if (p.s.pattern) { <span style="margin-right:4px;">pattern</span> }
                @if (p.s.default !== undefined) { <span style="margin-right:4px;">default:{{ p.s.default }}</span> }
                @if (p.s.mergeFn) { <span class="badge badge-blue">{{ p.s.mergeFn }}</span> }
              </td>
              <td>
                <div style="display:flex;gap:4px;justify-content:flex-end;">
                  <button class="icon-btn danger" type="button" (click)="removeRow(p.key); $event.stopPropagation()" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
                </div>
              </td>
            </tr>
            @if (expandedKey() === p.key) {
              <tr class="prop-expand-row" (click)="$event.stopPropagation()">
                <td colspan="4" style="padding:0;">
                  <div class="pdet">
                    <div class="pdet-fields">
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.type' | transloco }}</label>
                        <select [(ngModel)]="p.s.type" (ngModelChange)="onTypeChange(p)">
                          <option [ngValue]="undefined">any</option>
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="date">date</option>
                        </select>
                      </div>
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.default' | transloco }}</label>
                        <input type="text" [(ngModel)]="p.s.default" placeholder="—" (ngModelChange)="changed.emit()" />
                      </div>
                      <!-- Only what the API accepts for this type — see merge-fns.ts.
                           NO BACKTICKS in this template, comments included: one ends the string, and the
                           error points at @Component rather than at the line that caused it. -->
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.mergeFn' | transloco }}</label>
                        <select [(ngModel)]="p.s.mergeFn" (ngModelChange)="changed.emit()"
                                [disabled]="!mergeFnsFor(p.s.type).length">
                          <option [ngValue]="undefined">—</option>
                          @for (fn of mergeFnsFor(p.s.type); track fn) { <option [value]="fn">{{ fn }}</option> }
                        </select>
                      </div>
                      @if (p.s.type === 'string' || p.s.type === undefined) {
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.pattern' | transloco }} <span style="font-size:10px;font-weight:400;color:var(--text-muted);">{{ 'spaces.schema.propDetail.patternHint' | transloco }}</span></label>
                          <input type="text" [(ngModel)]="p.s.pattern" placeholder="^[A-Z].*" (ngModelChange)="changed.emit()" />
                        </div>
                      }
                      @if (p.s.type === 'number' || p.s.type === undefined) {
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.min' | transloco }}</label>
                          <input type="number" [(ngModel)]="p.s.minimum" placeholder="—" (ngModelChange)="changed.emit()" />
                        </div>
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.max' | transloco }}</label>
                          <input type="number" [(ngModel)]="p.s.maximum" placeholder="—" (ngModelChange)="changed.emit()" />
                        </div>
                      }
                    </div>
                    @if (p.s.type !== 'boolean') {
                      <div class="pdet-full">
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.enumValues' | transloco }} <span style="font-size:11px;font-weight:normal;color:var(--text-muted);">{{ 'spaces.schema.propDetail.enumHint' | transloco }}</span></label>
                          <div class="chip-wrap">
                            @for (ev of (p.s.enum ?? []); track ev) {
                              <span class="chip">{{ ev }}<button type="button" class="chip-rm" (click)="removeEnumVal(p, ev)"><ph-icon name="x" [size]="12"/></button></span>
                            }
                            <input type="text" class="chip-field" [(ngModel)]="p._enumInput"
                              [placeholder]="'spaces.schema.propDetail.enumPlaceholder' | transloco"
                              (keydown)="onEnumKey($event, p)" />
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    } @else {
      <p style="font-size:12px;color:var(--text-muted);margin:4px 0 8px;">{{ 'spaces.schema.noProps' | transloco }}</p>
    }
    <div class="add-prop-row">
      <input type="text" [(ngModel)]="newPropInput"
        [placeholder]="'spaces.schema.newPropNamePlaceholder' | transloco"
        style="flex:1;max-width:220px;"
        (keydown.enter)="addRow(); $event.preventDefault()" />
      <button class="btn btn-secondary btn-sm" type="button"
        (click)="addRow()" [disabled]="!newPropInput.trim()">{{ 'spaces.schema.addPropertyButton' | transloco }}</button>
    </div>
  `, styles: ["\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n", "\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n", "\n    .add-prop-row { display:flex; gap:8px; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }\n  "] }]
    }], null, { rows: [{
            type: Input
        }], changed: [{
            type: Output
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(PropSchemaTableComponent, { className: "PropSchemaTableComponent", filePath: "app/shared/prop-schema-table.component.ts", lineNumber: 143 }); })();
