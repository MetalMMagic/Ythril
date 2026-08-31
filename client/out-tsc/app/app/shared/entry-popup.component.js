import { Component, EventEmitter, inject, Input, Output, signal, computed, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { throwError } from 'rxjs';
import { BrainApi } from '../core/brain-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { ModalDirective } from './modal.directive';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.key;
const _forTrack1 = ($index, $item) => $item[0];
function EntryPopupComponent_Conditional_0_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("success", ctx_r1.statusType() === "success")("error", ctx_r1.statusType() === "error");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.statusMsg(), " ");
} }
function EntryPopupComponent_Conditional_0_Conditional_16_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "textarea", 15);
    i0.ɵɵlistener("ngModelChange", function EntryPopupComponent_Conditional_0_Conditional_16_Conditional_0_Template_textarea_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.onRawJsonChange($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("ngModel", ctx_r1.rawJson());
} }
function EntryPopupComponent_Conditional_0_Conditional_16_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "pre", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.rawJson());
} }
function EntryPopupComponent_Conditional_0_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, EntryPopupComponent_Conditional_0_Conditional_16_Conditional_0_Template, 1, 1, "textarea", 13)(1, EntryPopupComponent_Conditional_0_Conditional_16_Conditional_1_Template, 2, 1, "pre", 14);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional(ctx_r1.canEdit ? 0 : 1);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "input", 19);
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("ngModel", ctx_r1.stringify(field_r4.value));
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 23);
    i0.ɵɵlistener("ngModelChange", function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_4_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r5); const field_r4 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.onFieldChange(field_r4.key, $event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("ngModel", !!field_r4.value)("disabled", !ctx_r1.canEdit);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 24);
    i0.ɵɵlistener("ngModelChange", function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_5_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r6); const field_r4 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.onFieldChange(field_r4.key, $event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("ngModel", field_r4.value)("disabled", !ctx_r1.canEdit);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 25);
    i0.ɵɵlistener("ngModelChange", function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_6_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r7); const field_r4 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.onFieldChange(field_r4.key, $event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("ngModel", ctx_r1.stringify(field_r4.value))("disabled", !ctx_r1.canEdit);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 17);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "div", 18);
    i0.ɵɵconditionalCreate(3, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_3_Template, 1, 1, "input", 19)(4, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_4_Template, 1, 2, "input", 20)(5, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_5_Template, 1, 2, "input", 21)(6, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Conditional_6_Template, 1, 2, "input", 22);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(field_r4.key);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(field_r4.key === "_id" ? 3 : ctx_r1.isBoolean(field_r4.value) ? 4 : ctx_r1.isNumber(field_r4.value) ? 5 : 6);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_3_For_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const entry_r8 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(entry_r8[0]);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(entry_r8[1]);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "table", 27)(1, "thead")(2, "tr")(3, "th");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "th");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(9, "tbody");
    i0.ɵɵrepeaterCreate(10, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_3_For_11_Template, 5, 2, "tr", null, _forTrack1);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 2, "entryPopup.key"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 4, "propertiesEditor.valuePlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r1.objectEntries(field_r4.value));
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_4_For_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const item_r9 = ctx.$implicit;
    const $index_r10 = ctx.$index;
    const ctx_r1 = i0.ɵɵnextContext(6);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate($index_r10);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.stringify(item_r9));
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "table", 27)(1, "thead")(2, "tr")(3, "th");
    i0.ɵɵtext(4, "#");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "th");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(8, "tbody");
    i0.ɵɵrepeaterCreate(9, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_4_For_10_Template, 5, 2, "tr", null, i0.ɵɵrepeaterTrackByIndex);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext(2).$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 1, "entryPopup.value"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r1.asArray(field_r4.value));
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16)(1, "div", 26);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_3_Template, 12, 6, "table", 27);
    i0.ɵɵconditionalCreate(4, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Conditional_4_Template, 11, 3, "table", 27);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const field_r4 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(field_r4.key);
    i0.ɵɵadvance();
    i0.ɵɵconditional(field_r4.kind === "object" && ctx_r1.isObject(field_r4.value) ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(field_r4.kind === "array" && ctx_r1.isArray(field_r4.value) ? 4 : -1);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_0_Template, 7, 2)(1, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Conditional_1_Template, 5, 3, "div", 16);
} if (rf & 2) {
    const field_r4 = ctx.$implicit;
    i0.ɵɵconditional(field_r4.kind === "scalar" ? 0 : 1);
} }
function EntryPopupComponent_Conditional_0_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 8);
    i0.ɵɵrepeaterCreate(1, EntryPopupComponent_Conditional_0_Conditional_17_For_2_Template, 2, 1, null, null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.fields());
} }
function EntryPopupComponent_Conditional_0_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "entryPopup.saving"));
} }
function EntryPopupComponent_Conditional_0_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 28);
    i0.ɵɵlistener("click", function EntryPopupComponent_Conditional_0_Conditional_21_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.validate()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 29);
    i0.ɵɵlistener("click", function EntryPopupComponent_Conditional_0_Conditional_21_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.undo()); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "button", 30);
    i0.ɵɵlistener("click", function EntryPopupComponent_Conditional_0_Conditional_21_Template_button_click_6_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.cancel()); });
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "button", 31);
    i0.ɵɵlistener("click", function EntryPopupComponent_Conditional_0_Conditional_21_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.save()); });
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, "common.confirm"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(5, 7, "common.reset"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 9, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(11, 11, "common.save"), " ");
} }
function EntryPopupComponent_Conditional_0_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 30);
    i0.ɵɵlistener("click", function EntryPopupComponent_Conditional_0_Conditional_22_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.cancel()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.close"));
} }
function EntryPopupComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function EntryPopupComponent_Conditional_0_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closed.emit()); })("click", function EntryPopupComponent_Conditional_0_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 2)(4, "h2");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "span", 3);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "div", 4)(10, "label")(11, "input", 5);
    i0.ɵɵlistener("change", function EntryPopupComponent_Conditional_0_Template_input_change_11_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showRaw.set(!ctx_r1.showRaw())); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(14, "div", 6);
    i0.ɵɵconditionalCreate(15, EntryPopupComponent_Conditional_0_Conditional_15_Template, 2, 5, "div", 7);
    i0.ɵɵconditionalCreate(16, EntryPopupComponent_Conditional_0_Conditional_16_Template, 2, 1)(17, EntryPopupComponent_Conditional_0_Conditional_17_Template, 3, 0, "div", 8);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "div", 9);
    i0.ɵɵconditionalCreate(19, EntryPopupComponent_Conditional_0_Conditional_19_Template, 3, 3, "span", 3);
    i0.ɵɵelement(20, "div", 10);
    i0.ɵɵconditionalCreate(21, EntryPopupComponent_Conditional_0_Conditional_21_Template, 12, 13)(22, EntryPopupComponent_Conditional_0_Conditional_22_Template, 3, 3, "button", 11);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", ctx_r1.recordId() || i0.ɵɵpipeBind1(2, 9, "entryPopup.defaultTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.recordId() || i0.ɵɵpipeBind1(6, 11, "entryPopup.defaultTitle"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r1.recordType);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("checked", ctx_r1.showRaw());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(13, 13, "entryPopup.rawJson"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.statusMsg() ? 15 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.showRaw() ? 16 : 17);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.saving() ? 19 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.canEdit ? 21 : 22);
} }
export class EntryPopupComponent {
    constructor() {
        this.brainApi = inject(BrainApi);
        this.record = null;
        this.recordType = 'entity';
        this.spaceId = '';
        this.canEdit = false;
        this.closed = new EventEmitter();
        this.saved = new EventEmitter();
        this.showRaw = signal(false, ...(ngDevMode ? [{ debugName: "showRaw" }] : /* istanbul ignore next */ []));
        this.saving = signal(false, ...(ngDevMode ? [{ debugName: "saving" }] : /* istanbul ignore next */ []));
        this.statusMsg = signal('', ...(ngDevMode ? [{ debugName: "statusMsg" }] : /* istanbul ignore next */ []));
        this.statusType = signal('success', ...(ngDevMode ? [{ debugName: "statusType" }] : /* istanbul ignore next */ []));
        /** Working copy that can be mutated by the user. */
        this.draft = signal({}, ...(ngDevMode ? [{ debugName: "draft" }] : /* istanbul ignore next */ []));
        /** Snapshot of the record when it was last received/saved. */
        this.snapshot = signal({}, ...(ngDevMode ? [{ debugName: "snapshot" }] : /* istanbul ignore next */ []));
        this.recordId = computed(() => {
            const id = this.draft()['_id'];
            return id != null ? String(id) : '';
        }, ...(ngDevMode ? [{ debugName: "recordId" }] : /* istanbul ignore next */ []));
        this.rawJson = computed(() => JSON.stringify(this.draft(), null, 2), ...(ngDevMode ? [{ debugName: "rawJson" }] : /* istanbul ignore next */ []));
        this.fields = computed(() => {
            const d = this.draft();
            const keys = Object.keys(d);
            // _id always first
            const sorted = keys.sort((a, b) => {
                if (a === '_id')
                    return -1;
                if (b === '_id')
                    return 1;
                return a.localeCompare(b);
            });
            return sorted.map((key) => {
                const value = d[key];
                let kind = 'scalar';
                if (Array.isArray(value)) {
                    kind = 'array';
                }
                else if (value !== null && typeof value === 'object') {
                    kind = 'object';
                }
                return { key, value, kind };
            });
        }, ...(ngDevMode ? [{ debugName: "fields" }] : /* istanbul ignore next */ []));
    }
    /** React to input changes — reset draft + snapshot. */
    ngOnChanges() {
        if (this.record) {
            const copy = structuredClone(this.record);
            this.draft.set(copy);
            this.snapshot.set(structuredClone(this.record));
            this.clearStatus();
        }
    }
    // ── Template helpers ──────────────────────────────────────────────────────
    stringify(v) {
        if (v === null)
            return 'null';
        if (v === undefined)
            return '';
        return String(v);
    }
    isBoolean(v) {
        return typeof v === 'boolean';
    }
    isNumber(v) {
        return typeof v === 'number';
    }
    isObject(v) {
        return v !== null && typeof v === 'object' && !Array.isArray(v);
    }
    isArray(v) {
        return Array.isArray(v);
    }
    asArray(v) {
        return Array.isArray(v) ? v : [];
    }
    objectEntries(v) {
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            return Object.entries(v);
        }
        return [];
    }
    // ── Field editing ─────────────────────────────────────────────────────────
    onFieldChange(key, value) {
        this.draft.update((d) => ({ ...d, [key]: value }));
    }
    onRawJsonChange(raw) {
        try {
            const parsed = JSON.parse(raw);
            this.draft.set(parsed);
            this.clearStatus();
        }
        catch {
            // allow partial edits; don't overwrite draft with invalid JSON
        }
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    validate() {
        try {
            JSON.parse(JSON.stringify(this.draft()));
            this.statusMsg.set('Valid ✓');
            this.statusType.set('success');
        }
        catch {
            this.statusMsg.set('Invalid JSON');
            this.statusType.set('error');
        }
    }
    undo() {
        this.draft.set(structuredClone(this.snapshot()));
        this.clearStatus();
    }
    cancel() {
        this.closed.emit();
    }
    save() {
        const id = this.recordId();
        if (!id) {
            this.statusMsg.set('Cannot save: no _id field');
            this.statusType.set('error');
            return;
        }
        this.saving.set(true);
        this.clearStatus();
        const body = this.buildPatchBody();
        const call = this.getUpdateCall(id, body);
        call.subscribe({
            next: (result) => {
                this.saving.set(false);
                this.snapshot.set(structuredClone(result));
                this.draft.set(structuredClone(result));
                this.statusMsg.set('Saved ✓');
                this.statusType.set('success');
                this.saved.emit(result);
            },
            error: (err) => {
                this.saving.set(false);
                this.statusMsg.set(err.message ?? 'Save failed');
                this.statusType.set('error');
            },
        });
    }
    // ── Internals ─────────────────────────────────────────────────────────────
    buildPatchBody() {
        const d = { ...this.draft() };
        delete d['_id'];
        return d;
    }
    getUpdateCall(id, body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const b = body;
        switch (this.recordType) {
            case 'entity':
                return this.brainApi.updateEntity(this.spaceId, id, b);
            case 'edge':
                return this.brainApi.updateEdge(this.spaceId, id, b);
            case 'memory':
                return this.brainApi.updateMemory(this.spaceId, id, b);
            case 'chrono':
                return this.brainApi.updateChrono(this.spaceId, id, b);
            default: {
                const _exhaustive = this.recordType;
                return throwError(() => new Error(`Unknown record type: ${_exhaustive}`));
            }
        }
    }
    clearStatus() {
        this.statusMsg.set('');
    }
    static { this.ɵfac = function EntryPopupComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || EntryPopupComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: EntryPopupComponent, selectors: [["app-entry-popup"]], inputs: { record: "record", recordType: "recordType", spaceId: "spaceId", canEdit: "canEdit" }, outputs: { closed: "closed", saved: "saved" }, features: [i0.ɵɵNgOnChangesFeature], decls: 1, vars: 1, consts: [[1, "popup-backdrop"], [1, "popup-modal", 3, "dismiss", "click", "appModal"], [1, "popup-header"], [1, "badge"], [1, "toggle-row"], ["type", "checkbox", 3, "change", "checked"], [1, "popup-body"], [1, "status-msg", 3, "success", "error"], [1, "field-grid"], [1, "popup-footer"], [1, "spacer"], [1, "btn", "btn-sm"], [1, "status-msg"], [1, "raw-json", 2, "width", "100%", "min-height", "300px", "resize", "vertical", 3, "ngModel"], [1, "raw-json"], [1, "raw-json", 2, "width", "100%", "min-height", "300px", "resize", "vertical", 3, "ngModelChange", "ngModel"], [1, "sub-section"], [1, "field-label"], [1, "field-value"], ["type", "text", "disabled", "", 3, "ngModel"], ["type", "checkbox", 3, "ngModel", "disabled"], ["type", "number", 3, "ngModel", "disabled"], ["type", "text", 3, "ngModel", "disabled"], ["type", "checkbox", 3, "ngModelChange", "ngModel", "disabled"], ["type", "number", 3, "ngModelChange", "ngModel", "disabled"], ["type", "text", 3, "ngModelChange", "ngModel", "disabled"], [1, "sub-section-title"], [1, "sub-table"], [1, "btn", "btn-secondary", "btn-sm", 3, "click"], [1, "btn", "btn-ghost", "btn-sm", 3, "click"], [1, "btn", "btn-sm", 3, "click"], [1, "btn", "btn-primary", "btn-sm", 3, "click", "disabled"]], template: function EntryPopupComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, EntryPopupComponent_Conditional_0_Template, 23, 15, "div", 0);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.record ? 0 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.CheckboxControlValueAccessor, i1.NgControlStatus, i1.NgModel, ModalDirective, TranslocoPipe], styles: [".popup-backdrop[_ngcontent-%COMP%] {\n        position: fixed;\n        inset: 0;\n        background: var(--bg-overlay);\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        z-index: 1000;\n      }\n\n      .popup-modal[_ngcontent-%COMP%] {\n        background: var(--bg-surface);\n        border: 1px solid var(--border);\n        border-radius: var(--radius-lg);\n        width: 100%;\n        max-width: 640px;\n        max-height: 85vh;\n        overflow-y: auto;\n        display: flex;\n        flex-direction: column;\n      }\n\n      .popup-header[_ngcontent-%COMP%] {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        padding: 16px 20px;\n        border-bottom: 1px solid var(--border);\n      }\n\n      .popup-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n        margin: 0;\n        font-size: 1rem;\n        font-weight: 600;\n        color: var(--text-primary);\n      }\n\n      .popup-header[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] {\n        font-size: 0.75rem;\n      }\n\n      .toggle-row[_ngcontent-%COMP%] {\n        display: flex;\n        align-items: center;\n        gap: 8px;\n        padding: 8px 20px;\n        border-bottom: 1px solid var(--border);\n      }\n\n      .toggle-row[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n        font-size: 0.8rem;\n        color: var(--text-secondary);\n        cursor: pointer;\n        display: flex;\n        align-items: center;\n        gap: 4px;\n      }\n\n      .popup-body[_ngcontent-%COMP%] {\n        padding: 16px 20px;\n        flex: 1;\n        overflow-y: auto;\n      }\n\n      \n\n      .field-grid[_ngcontent-%COMP%] {\n        display: grid;\n        grid-template-columns: minmax(100px, auto) 1fr;\n        gap: 8px 12px;\n        align-items: start;\n      }\n\n      .field-label[_ngcontent-%COMP%] {\n        text-align: right;\n        color: var(--text-muted);\n        font-size: 0.8rem;\n        padding-top: 6px;\n        font-family: var(--font-mono);\n        word-break: break-all;\n      }\n\n      .field-value[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n   .field-value[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n        width: 100%;\n        box-sizing: border-box;\n      }\n\n      .field-value[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n        min-height: 60px;\n        resize: vertical;\n      }\n\n      \n\n      .sub-section[_ngcontent-%COMP%] {\n        grid-column: 1 / -1;\n        margin: 8px 0;\n      }\n\n      .sub-section-title[_ngcontent-%COMP%] {\n        font-family: var(--font-mono);\n        color: var(--text-muted);\n        font-size: 0.8rem;\n        margin-bottom: 4px;\n      }\n\n      .sub-table[_ngcontent-%COMP%] {\n        width: 100%;\n        border: 1px solid var(--border);\n        border-radius: var(--radius-sm);\n        background: var(--bg-elevated);\n        border-collapse: collapse;\n        font-size: 0.85rem;\n      }\n\n      .sub-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n   .sub-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n        padding: 4px 8px;\n        border-bottom: 1px solid var(--border);\n        text-align: left;\n      }\n\n      .sub-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n        color: var(--text-muted);\n        font-weight: 500;\n        font-size: 0.75rem;\n        text-transform: uppercase;\n        letter-spacing: 0.04em;\n      }\n\n      .sub-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n        color: var(--text-secondary);\n        font-family: var(--font-mono);\n        font-size: 0.8rem;\n        word-break: break-all;\n      }\n\n      .sub-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%] {\n        border-bottom: none;\n      }\n\n      \n\n      .raw-json[_ngcontent-%COMP%] {\n        background: var(--bg-primary);\n        border: 1px solid var(--border);\n        border-radius: var(--radius-sm);\n        padding: 12px;\n        font-family: var(--font-mono);\n        font-size: 0.8rem;\n        color: var(--text-secondary);\n        white-space: pre-wrap;\n        word-break: break-all;\n        overflow-x: auto;\n        max-height: 60vh;\n      }\n\n      \n\n      .popup-footer[_ngcontent-%COMP%] {\n        display: flex;\n        align-items: center;\n        justify-content: flex-end;\n        gap: 8px;\n        padding: 12px 20px;\n        border-top: 1px solid var(--border);\n      }\n\n      .popup-footer[_ngcontent-%COMP%]   .spacer[_ngcontent-%COMP%] {\n        flex: 1;\n      }\n\n      \n\n      .status-msg[_ngcontent-%COMP%] {\n        font-size: 0.8rem;\n        padding: 6px 12px;\n        border-radius: var(--radius-sm);\n        margin-bottom: 12px;\n      }\n\n      .status-msg.success[_ngcontent-%COMP%] {\n        background: var(--success-dim);\n        color: var(--success);\n      }\n\n      .status-msg.error[_ngcontent-%COMP%] {\n        background: var(--error-dim);\n        color: var(--error);\n      }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EntryPopupComponent, [{
        type: Component,
        args: [{ selector: 'app-entry-popup', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, ModalDirective], template: `
    @if (record) {
      <div class="popup-backdrop">
        <div class="popup-modal" [appModal]="recordId() || ('entryPopup.defaultTitle' | transloco)" (dismiss)="closed.emit()" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="popup-header">
            <h2>
              {{ recordId() || ('entryPopup.defaultTitle' | transloco) }}
            </h2>
            <span class="badge">{{ recordType }}</span>
          </div>

          <!-- Raw JSON toggle -->
          <div class="toggle-row">
            <label>
              <input
                type="checkbox"
                [checked]="showRaw()"
                (change)="showRaw.set(!showRaw())"
              />
              {{ 'entryPopup.rawJson' | transloco }}
            </label>
          </div>

          <!-- Body -->
          <div class="popup-body">
            @if (statusMsg()) {
              <div
                class="status-msg"
                [class.success]="statusType() === 'success'"
                [class.error]="statusType() === 'error'"
              >
                {{ statusMsg() }}
              </div>
            }

            @if (showRaw()) {
              @if (canEdit) {
                <textarea
                  class="raw-json"
                  style="width: 100%; min-height: 300px; resize: vertical"
                  [ngModel]="rawJson()"
                  (ngModelChange)="onRawJsonChange($event)"
                ></textarea>
              } @else {
                <pre class="raw-json">{{ rawJson() }}</pre>
              }
            } @else {
              <div class="field-grid">
                @for (field of fields(); track field.key) {
                  @if (field.kind === 'scalar') {
                    <div class="field-label">{{ field.key }}</div>
                    <div class="field-value">
                      @if (field.key === '_id') {
                        <input
                          type="text"
                          [ngModel]="stringify(field.value)"
                          disabled
                        />
                      } @else if (isBoolean(field.value)) {
                        <input
                          type="checkbox"
                          [ngModel]="!!field.value"
                          (ngModelChange)="onFieldChange(field.key, $event)"
                          [disabled]="!canEdit"
                        />
                      } @else if (isNumber(field.value)) {
                        <input
                          type="number"
                          [ngModel]="field.value"
                          (ngModelChange)="onFieldChange(field.key, $event)"
                          [disabled]="!canEdit"
                        />
                      } @else {
                        <input
                          type="text"
                          [ngModel]="stringify(field.value)"
                          (ngModelChange)="onFieldChange(field.key, $event)"
                          [disabled]="!canEdit"
                        />
                      }
                    </div>
                  } @else {
                    <div class="sub-section">
                      <div class="sub-section-title">{{ field.key }}</div>
                      @if (field.kind === 'object' && isObject(field.value)) {
                        <table class="sub-table">
                          <thead>
                            <tr>
                              <th>{{ 'entryPopup.key' | transloco }}</th>
                              <th>{{ 'propertiesEditor.valuePlaceholder' | transloco }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (
                              entry of objectEntries(field.value);
                              track entry[0]
                            ) {
                              <tr>
                                <td>{{ entry[0] }}</td>
                                <td>{{ entry[1] }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      }
                      @if (field.kind === 'array' && isArray(field.value)) {
                        <table class="sub-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>{{ 'entryPopup.value' | transloco }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (
                              item of asArray(field.value);
                              track $index
                            ) {
                              <tr>
                                <td>{{ $index }}</td>
                                <td>{{ stringify(item) }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      }
                    </div>
                  }
                }
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="popup-footer">
            @if (saving()) {
              <span class="badge">{{ 'entryPopup.saving' | transloco }}</span>
            }
            <div class="spacer"></div>
            @if (canEdit) {
              <button class="btn btn-secondary btn-sm" (click)="validate()">
                {{ 'common.confirm' | transloco }}
              </button>
              <button class="btn btn-ghost btn-sm" (click)="undo()">
                {{ 'common.reset' | transloco }}
              </button>
              <button class="btn btn-sm" (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
              <button
                class="btn btn-primary btn-sm"
                (click)="save()"
                [disabled]="saving()"
              >
                {{ 'common.save' | transloco }}
              </button>
            } @else {
              <button class="btn btn-sm" (click)="cancel()">{{ 'common.close' | transloco }}</button>
            }
          </div>
        </div>
      </div>
    }
  `, styles: ["\n      .popup-backdrop {\n        position: fixed;\n        inset: 0;\n        background: var(--bg-overlay);\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        z-index: 1000;\n      }\n\n      .popup-modal {\n        background: var(--bg-surface);\n        border: 1px solid var(--border);\n        border-radius: var(--radius-lg);\n        width: 100%;\n        max-width: 640px;\n        max-height: 85vh;\n        overflow-y: auto;\n        display: flex;\n        flex-direction: column;\n      }\n\n      .popup-header {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        padding: 16px 20px;\n        border-bottom: 1px solid var(--border);\n      }\n\n      .popup-header h2 {\n        margin: 0;\n        font-size: 1rem;\n        font-weight: 600;\n        color: var(--text-primary);\n      }\n\n      .popup-header .badge {\n        font-size: 0.75rem;\n      }\n\n      .toggle-row {\n        display: flex;\n        align-items: center;\n        gap: 8px;\n        padding: 8px 20px;\n        border-bottom: 1px solid var(--border);\n      }\n\n      .toggle-row label {\n        font-size: 0.8rem;\n        color: var(--text-secondary);\n        cursor: pointer;\n        display: flex;\n        align-items: center;\n        gap: 4px;\n      }\n\n      .popup-body {\n        padding: 16px 20px;\n        flex: 1;\n        overflow-y: auto;\n      }\n\n      /* \u2500\u2500 Field grid \u2500\u2500 */\n      .field-grid {\n        display: grid;\n        grid-template-columns: minmax(100px, auto) 1fr;\n        gap: 8px 12px;\n        align-items: start;\n      }\n\n      .field-label {\n        text-align: right;\n        color: var(--text-muted);\n        font-size: 0.8rem;\n        padding-top: 6px;\n        font-family: var(--font-mono);\n        word-break: break-all;\n      }\n\n      .field-value input,\n      .field-value textarea {\n        width: 100%;\n        box-sizing: border-box;\n      }\n\n      .field-value textarea {\n        min-height: 60px;\n        resize: vertical;\n      }\n\n      /* \u2500\u2500 Sub-tables \u2500\u2500 */\n      .sub-section {\n        grid-column: 1 / -1;\n        margin: 8px 0;\n      }\n\n      .sub-section-title {\n        font-family: var(--font-mono);\n        color: var(--text-muted);\n        font-size: 0.8rem;\n        margin-bottom: 4px;\n      }\n\n      .sub-table {\n        width: 100%;\n        border: 1px solid var(--border);\n        border-radius: var(--radius-sm);\n        background: var(--bg-elevated);\n        border-collapse: collapse;\n        font-size: 0.85rem;\n      }\n\n      .sub-table th,\n      .sub-table td {\n        padding: 4px 8px;\n        border-bottom: 1px solid var(--border);\n        text-align: left;\n      }\n\n      .sub-table th {\n        color: var(--text-muted);\n        font-weight: 500;\n        font-size: 0.75rem;\n        text-transform: uppercase;\n        letter-spacing: 0.04em;\n      }\n\n      .sub-table td {\n        color: var(--text-secondary);\n        font-family: var(--font-mono);\n        font-size: 0.8rem;\n        word-break: break-all;\n      }\n\n      .sub-table tr:last-child td {\n        border-bottom: none;\n      }\n\n      /* \u2500\u2500 Raw JSON \u2500\u2500 */\n      .raw-json {\n        background: var(--bg-primary);\n        border: 1px solid var(--border);\n        border-radius: var(--radius-sm);\n        padding: 12px;\n        font-family: var(--font-mono);\n        font-size: 0.8rem;\n        color: var(--text-secondary);\n        white-space: pre-wrap;\n        word-break: break-all;\n        overflow-x: auto;\n        max-height: 60vh;\n      }\n\n      /* \u2500\u2500 Footer \u2500\u2500 */\n      .popup-footer {\n        display: flex;\n        align-items: center;\n        justify-content: flex-end;\n        gap: 8px;\n        padding: 12px 20px;\n        border-top: 1px solid var(--border);\n      }\n\n      .popup-footer .spacer {\n        flex: 1;\n      }\n\n      /* \u2500\u2500 Status messages \u2500\u2500 */\n      .status-msg {\n        font-size: 0.8rem;\n        padding: 6px 12px;\n        border-radius: var(--radius-sm);\n        margin-bottom: 12px;\n      }\n\n      .status-msg.success {\n        background: var(--success-dim);\n        color: var(--success);\n      }\n\n      .status-msg.error {\n        background: var(--error-dim);\n        color: var(--error);\n      }\n    "] }]
    }], null, { record: [{
            type: Input
        }], recordType: [{
            type: Input
        }], spaceId: [{
            type: Input
        }], canEdit: [{
            type: Input
        }], closed: [{
            type: Output
        }], saved: [{
            type: Output
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(EntryPopupComponent, { className: "EntryPopupComponent", filePath: "app/shared/entry-popup.component.ts", lineNumber: 383 }); })();
