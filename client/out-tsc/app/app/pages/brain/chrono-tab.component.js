import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntityRefFieldComponent } from './entity-ref-field.component';
import { MemoryRefFieldComponent } from './memory-ref-field.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
import { SortableHeaderComponent } from './sortable-header.component';
import { RecordSearchBarComponent } from './record-search-bar.component';
import { fmtApiError, toLocalDatetime } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { TimestampComponent } from '../../shared/timestamp.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item._id;
function ChronoTabComponent_Conditional_5_For_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const k_r3 = ctx.$implicit;
    i0.ɵɵproperty("value", k_r3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(k_r3);
} }
function ChronoTabComponent_Conditional_5_Conditional_54_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 40);
} }
function ChronoTabComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 21);
    i0.ɵɵlistener("ngSubmit", function ChronoTabComponent_Conditional_5_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.createChrono()); });
    i0.ɵɵelementStart(1, "div", 22)(2, "div", 23)(3, "label");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "input", 24);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_Conditional_5_Template_input_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.title, $event) || (ctx_r1.chronoForm.title = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 25)(8, "label");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "select", 26);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_Conditional_5_Template_select_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.kind, $event) || (ctx_r1.chronoForm.kind = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Conditional_5_Template_select_ngModelChange_11_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onChronoFormKindChange()); });
    i0.ɵɵrepeaterCreate(12, ChronoTabComponent_Conditional_5_For_13_Template, 2, 2, "option", 12, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(14, "div", 27)(15, "label");
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "input", 28);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_Conditional_5_Template_input_ngModelChange_18_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.startsAt, $event) || (ctx_r1.chronoForm.startsAt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "div", 27)(20, "label");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "input", 29);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_Conditional_5_Template_input_ngModelChange_23_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.endsAt, $event) || (ctx_r1.chronoForm.endsAt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(24, "div", 30)(25, "div", 31)(26, "label");
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "textarea", 32);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_Conditional_5_Template_textarea_ngModelChange_29_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.description, $event) || (ctx_r1.chronoForm.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(30, "div", 30)(31, "div", 31)(32, "label");
    i0.ɵɵtext(33);
    i0.ɵɵpipe(34, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(35, "app-tag-input", 33);
    i0.ɵɵtwoWayListener("valueChange", function ChronoTabComponent_Conditional_5_Template_app_tag_input_valueChange_35_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.tags, $event) || (ctx_r1.chronoForm.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(36, "div", 31)(37, "label");
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(40, "app-entity-ref-field", 34);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(41, "div", 31)(42, "label");
    i0.ɵɵtext(43);
    i0.ɵɵpipe(44, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(45, "app-memory-ref-field", 35);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(46, "div", 30)(47, "div", 36)(48, "label");
    i0.ɵɵtext(49);
    i0.ɵɵpipe(50, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(51, "app-properties-editor", 37);
    i0.ɵɵtwoWayListener("valueChange", function ChronoTabComponent_Conditional_5_Template_app_properties_editor_valueChange_51_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.chronoForm.properties, $event) || (ctx_r1.chronoForm.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(52, "div", 38)(53, "button", 39);
    i0.ɵɵconditionalCreate(54, ChronoTabComponent_Conditional_5_Conditional_54_Template, 1, 0, "span", 40);
    i0.ɵɵtext(55);
    i0.ɵɵpipe(56, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(57, "button", 41);
    i0.ɵɵlistener("click", function ChronoTabComponent_Conditional_5_Template_button_click_57_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showChronoForm.set(false)); });
    i0.ɵɵtext(58);
    i0.ɵɵpipe(59, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 26, "common.form.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.chronoForm.title);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 28, "common.form.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.chronoForm.kind);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.chronoAllowedTypes());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 30, "brain.chrono.form.startsAt"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.chronoForm.startsAt);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 32, "brain.chrono.form.endsAt"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.chronoForm.endsAt);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 34, "brain.chrono.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.chronoForm.description);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(34, 36, "brain.chrono.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.chronoForm.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.chronoTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 38, "brain.chrono.table.entities"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.chronoForm)("spaceId", ctx_r1.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(44, 40, "brain.chrono.form.memories"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.chronoForm);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 42, "brain.chrono.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.chronoSchema(ctx_r1.chronoFormKind()))("required", ctx_r1.store.requiredProps(ctx_r1.store.chronoSchema(ctx_r1.chronoFormKind())));
    i0.ɵɵtwoWayProperty("value", ctx_r1.chronoForm.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.creatingChrono() || !ctx_r1.chronoForm.title.trim() || !ctx_r1.chronoForm.startsAt || !ctx_r1.chronoForm.kind);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.creatingChrono() ? 54 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(56, 44, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(59, 46, "common.cancel"));
} }
function ChronoTabComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.createChronoError());
} }
function ChronoTabComponent_For_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const k_r4 = ctx.$implicit;
    i0.ɵɵproperty("value", k_r4);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(k_r4);
} }
function ChronoTabComponent_For_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const st_r5 = ctx.$implicit;
    i0.ɵɵproperty("value", st_r5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(st_r5);
} }
function ChronoTabComponent_For_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 12);
} if (rf & 2) {
    const s_r6 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r6);
} }
function ChronoTabComponent_For_52_Conditional_0_For_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const k_r9 = ctx.$implicit;
    i0.ɵɵproperty("value", k_r9);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(k_r9);
} }
function ChronoTabComponent_For_52_Conditional_0_For_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r10 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r10);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r10);
} }
function ChronoTabComponent_For_52_Conditional_0_Conditional_54_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 58);
} }
function ChronoTabComponent_For_52_Conditional_0_Conditional_60_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 60);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.recordList.editError());
} }
function ChronoTabComponent_For_52_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 42)(2, "div", 43)(3, "div", 44)(4, "label");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "input", 45);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.title, $event) || (ctx_r1.editChrono.title = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 46)(9, "label");
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "select", 47);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_select_ngModelChange_12_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.kind, $event) || (ctx_r1.editChrono.kind = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_select_ngModelChange_12_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onEditChronoKindChange()); });
    i0.ɵɵrepeaterCreate(13, ChronoTabComponent_For_52_Conditional_0_For_14_Template, 2, 2, "option", 12, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "div", 46)(16, "label");
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "select", 48);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_select_ngModelChange_19_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.status, $event) || (ctx_r1.editChrono.status = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(20, ChronoTabComponent_For_52_Conditional_0_For_21_Template, 2, 2, "option", 12, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(22, "div", 49)(23, "label");
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(26, "input", 50);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_input_ngModelChange_26_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.startsAt, $event) || (ctx_r1.editChrono.startsAt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(27, "div", 49)(28, "label");
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(31, "input", 51);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_input_ngModelChange_31_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.endsAt, $event) || (ctx_r1.editChrono.endsAt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(32, "div", 52)(33, "label");
    i0.ɵɵtext(34);
    i0.ɵɵpipe(35, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(36, "textarea", 53);
    i0.ɵɵtwoWayListener("ngModelChange", function ChronoTabComponent_For_52_Conditional_0_Template_textarea_ngModelChange_36_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.description, $event) || (ctx_r1.editChrono.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(37, "div", 52)(38, "label");
    i0.ɵɵtext(39);
    i0.ɵɵpipe(40, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(41, "app-tag-input", 54);
    i0.ɵɵtwoWayListener("valueChange", function ChronoTabComponent_For_52_Conditional_0_Template_app_tag_input_valueChange_41_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.tags, $event) || (ctx_r1.editChrono.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(42, "div", 55)(43, "label");
    i0.ɵɵtext(44);
    i0.ɵɵpipe(45, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(46, "app-entity-ref-field", 34);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(47, "div", 52)(48, "label");
    i0.ɵɵtext(49);
    i0.ɵɵpipe(50, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(51, "app-properties-editor", 37);
    i0.ɵɵtwoWayListener("valueChange", function ChronoTabComponent_For_52_Conditional_0_Template_app_properties_editor_valueChange_51_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editChrono.properties, $event) || (ctx_r1.editChrono.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(52, "div", 56)(53, "button", 57);
    i0.ɵɵlistener("click", function ChronoTabComponent_For_52_Conditional_0_Template_button_click_53_listener() { i0.ɵɵrestoreView(_r8); const entry_r11 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.saveEditChrono(entry_r11._id)); });
    i0.ɵɵconditionalCreate(54, ChronoTabComponent_For_52_Conditional_0_Conditional_54_Template, 1, 0, "span", 58);
    i0.ɵɵtext(55);
    i0.ɵɵpipe(56, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(57, "button", 59);
    i0.ɵɵlistener("click", function ChronoTabComponent_For_52_Conditional_0_Template_button_click_57_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.recordList.cancelEdit()); });
    i0.ɵɵtext(58);
    i0.ɵɵpipe(59, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(60, ChronoTabComponent_For_52_Conditional_0_Conditional_60_Template, 2, 1, "div", 60);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 27, "common.form.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editChrono.title);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 29, "common.form.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editChrono.kind);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.chronoAllowedTypes());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 31, "brain.chrono.table.status"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editChrono.status);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.chronoStatusOptions);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 33, "brain.chrono.form.startsAt"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editChrono.startsAt);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(30, 35, "common.form.endsAt"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editChrono.endsAt);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(35, 37, "brain.chrono.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editChrono.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(40, 39, "brain.chrono.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.editChrono.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.chronoTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(45, 41, "brain.chrono.table.entities"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.editChrono)("spaceId", ctx_r1.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 43, "brain.chrono.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.chronoSchema(ctx_r1.editChrono.kind))("required", ctx_r1.store.requiredProps(ctx_r1.store.chronoSchema(ctx_r1.editChrono.kind)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.editChrono.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.recordList.editSaving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.editSaving() ? 54 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(56, 45, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(59, 47, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.editError() ? 60 : -1);
} }
function ChronoTabComponent_For_52_Conditional_1_For_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 65);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const tag_r13 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(tag_r13);
} }
function ChronoTabComponent_For_52_Conditional_1_Conditional_20_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 74);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const id_r14 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵproperty("title", id_r14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.picker.entityNameCache()[id_r14] || id_r14.slice(0, 8) + "\u2026");
} }
function ChronoTabComponent_For_52_Conditional_1_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 67);
    i0.ɵɵrepeaterCreate(1, ChronoTabComponent_For_52_Conditional_1_Conditional_20_For_2_Template, 2, 2, "span", 74, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(entry_r11.entityIds);
} }
function ChronoTabComponent_For_52_Conditional_1_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 68);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function ChronoTabComponent_For_52_Conditional_1_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 72);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "button", 75);
    i0.ɵɵlistener("click", function ChronoTabComponent_For_52_Conditional_1_Conditional_29_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r15); const entry_r11 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.deleteChrono(entry_r11._id)); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "button", 59);
    i0.ɵɵlistener("click", function ChronoTabComponent_For_52_Conditional_1_Conditional_29_Template_button_click_6_listener() { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelDelete()); });
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 3, "common.deleteConfirm"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 5, "common.yes"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 7, "common.no"));
} }
function ChronoTabComponent_For_52_Conditional_1_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 76);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function ChronoTabComponent_For_52_Conditional_1_Conditional_30_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r16); const entry_r11 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.requestDelete(entry_r11._id)); });
    i0.ɵɵelement(2, "ph-icon", 77);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "brain.chrono.deleteAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
} }
function ChronoTabComponent_For_52_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td", 61)(4, "div", 62);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "td")(7, "span", 63);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "td")(10, "span", 64);
    i0.ɵɵtext(11);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(12, "td");
    i0.ɵɵelement(13, "app-timestamp", 12);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "td");
    i0.ɵɵelement(15, "app-timestamp", 12);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "td");
    i0.ɵɵrepeaterCreate(17, ChronoTabComponent_For_52_Conditional_1_For_18_Template, 2, 1, "span", 65, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "td", 66);
    i0.ɵɵconditionalCreate(20, ChronoTabComponent_For_52_Conditional_1_Conditional_20_Template, 3, 0, "div", 67)(21, ChronoTabComponent_For_52_Conditional_1_Conditional_21_Template, 2, 0, "span", 68);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "td");
    i0.ɵɵelement(23, "app-timestamp", 12);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "td", 69)(25, "button", 70);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵlistener("click", function ChronoTabComponent_For_52_Conditional_1_Template_button_click_25_listener() { i0.ɵɵrestoreView(_r12); const entry_r11 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.drawerState.open("chrono", entry_r11)); });
    i0.ɵɵelement(28, "ph-icon", 71);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(29, ChronoTabComponent_For_52_Conditional_1_Conditional_29_Template, 9, 9, "span", 72)(30, ChronoTabComponent_For_52_Conditional_1_Conditional_30_Template, 3, 4, "button", 73);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(entry_r11.title);
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", entry_r11.description ?? "");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(entry_r11.description || "\u2014");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(entry_r11.type);
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("badge-purple", entry_r11.status === "upcoming")("badge-blue", entry_r11.status === "active");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(entry_r11.status);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", entry_r11.startsAt);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", entry_r11.endsAt);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(entry_r11.tags);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(entry_r11.entityIds.length ? 20 : 21);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("value", entry_r11.createdAt);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(26, 17, "common.viewDetails"))("aria-label", i0.ɵɵpipeBind1(27, 19, "common.viewDetails"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.confirmDeleteId() === entry_r11._id ? 29 : 30);
} }
function ChronoTabComponent_For_52_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ChronoTabComponent_For_52_Conditional_0_Template, 61, 49, "tr")(1, ChronoTabComponent_For_52_Conditional_1_Template, 31, 21, "tr");
} if (rf & 2) {
    const entry_r11 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.recordList.editingId() === entry_r11._id ? 0 : 1);
} }
function ChronoTabComponent_ForEmpty_53_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 80);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function ChronoTabComponent_ForEmpty_53_Conditional_2_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r7); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryCurrentTab()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "brain.error.loadChrono"))("reason", ctx_r1.recordList.loadError() ?? "");
} }
function ChronoTabComponent_ForEmpty_53_Conditional_3_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "common.noMatches"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "brain.chrono.empty.noMatchQuery"));
} }
function ChronoTabComponent_ForEmpty_53_Conditional_3_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.chrono.empty.title"));
} }
function ChronoTabComponent_ForEmpty_53_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 79)(1, "div", 81);
    i0.ɵɵelement(2, "ph-icon", 82);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, ChronoTabComponent_ForEmpty_53_Conditional_3_Conditional_3_Template, 6, 6)(4, ChronoTabComponent_ForEmpty_53_Conditional_3_Conditional_4_Template, 3, 3, "h3");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.store.chronoSearch() ? 3 : 4);
} }
function ChronoTabComponent_ForEmpty_53_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 42);
    i0.ɵɵconditionalCreate(2, ChronoTabComponent_ForEmpty_53_Conditional_2_Template, 2, 4, "app-error-state", 78)(3, ChronoTabComponent_ForEmpty_53_Conditional_3_Template, 5, 2, "div", 79);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.loadError() !== null ? 2 : 3);
} }
function ChronoTabComponent_Conditional_54_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 20)(1, "button", 83);
    i0.ɵɵlistener("click", function ChronoTabComponent_Conditional_54_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.prevPage()); });
    i0.ɵɵelement(2, "ph-icon", 84);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 85);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 83);
    i0.ɵɵlistener("click", function ChronoTabComponent_Conditional_54_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.nextPage()); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelement(10, "ph-icon", 86);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.skip() === 0);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(4, 7, "common.prev"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r1.store.chrono().length ? ctx_r1.skip() + 1 + "\u2013" + (ctx_r1.skip() + ctx_r1.store.chrono().length) : "\u2013");
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.store.chrono().length < ctx_r1.pageSize);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(9, 9, "common.next"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
} }
/**
 * The Chrono record tab, extracted from BrainComponent (A17.9b-6g) following the memories/edges pattern.
 * Owns the chrono create form, the (drawer-superseded) inline edit, delete, and the tab's own search
 * (semantic-only top bar via `store.chronoSearch` + a docked Title column freetext filter, 2b-iii-c) +
 * type-tag filter + pagination + loader. Self-loads via a `spaceId` effect.
 *
 * Chrono deltas: every type select offers `store.chronoAllowedTypes()` — the client's mirror of the
 * server's per-space chrono allowlist. There is no free-text type any more; that path predated the
 * allowlist and could only ever return 400. It has NO `mutated` output: chrono
 * create AND delete never refreshed the space stats in the original shell (unlike memory/entity), so
 * there is nothing for the shell to re-fetch.
 */
export class ChronoTabComponent extends RecordTabBase {
    constructor() {
        super(...arguments);
        this.drawerState = inject(RecordDrawerState);
        this.brainApi = inject(BrainApi);
        this.showChronoForm = signal(false, ...(ngDevMode ? [{ debugName: "showChronoForm" }] : /* istanbul ignore next */ []));
        this.creatingChrono = signal(false, ...(ngDevMode ? [{ debugName: "creatingChrono" }] : /* istanbul ignore next */ []));
        this.createChronoError = signal('', ...(ngDevMode ? [{ debugName: "createChronoError" }] : /* istanbul ignore next */ []));
        this.chronoForm = { title: '', kind: 'event', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
        this.editChrono = { title: '', kind: '', status: '', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
        this._chronoSemTimer = null;
        /** Docked Status header filter. Its own signal: `status` is chrono-only, not part of RecordFilter. */
        this.statusFilter = signal('', ...(ngDevMode ? [{ debugName: "statusFilter" }] : /* istanbul ignore next */ []));
    }
    setStatusFilter(value) {
        this.statusFilter.set(value);
        this.skip.set(0);
        this.load();
    }
    resetOnSpaceChange() {
        this.recordFilter.set({ type: '', tag: '', description: '', properties: '', fromName: '', toName: '', entityName: '' });
        this.statusFilter.set('');
    }
    load() {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        this.recordList.loading.set(true);
        this.recordList.loadError.set(null);
        const cf = {};
        // Docked Title column freetext filter → server-side substring (2b-iii-c), matching memories/edges.
        // The top bar is semantic-only now and never feeds this.
        if (this.searchParam())
            cf.search = this.searchParam();
        if (this.recordFilter().type)
            cf.type = this.recordFilter().type;
        if (this.recordFilter().tag)
            cf.tag = this.recordFilter().tag;
        if (this.recordFilter().description)
            cf.description = this.recordFilter().description;
        if (this.recordFilter().entityName)
            cf.entityName = this.recordFilter().entityName;
        if (this.statusFilter())
            cf.status = this.statusFilter();
        this.brainApi.listChrono(spaceId, this.pageSize, this.skip(), cf, this.sortParam()).subscribe({
            next: ({ chrono }) => {
                this.store.chrono.set(chrono);
                const ids = [...new Set(chrono.flatMap(e => e.entityIds ?? []))];
                if (ids.length)
                    this.picker.resolveEntityNames(ids);
                this.recordList.loading.set(false);
            },
            error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
        });
    }
    /**
     * The top-bar search is SEMANTIC-only (2b-iii-c): typing issues a debounced `recallBrain`. Plain
     * substring search moved to the docked Title column freetext filter (server-side, via `load()`).
     * Clearing the box restores the normal paginated list.
     */
    onChronoSearch(q) {
        this.store.chronoSearch.set(q);
        if (this._chronoSemTimer)
            clearTimeout(this._chronoSemTimer);
        if (!q.trim()) {
            this.skip.set(0);
            this.load();
            return;
        }
        this._chronoSemTimer = setTimeout(() => this.runSemanticChronoSearch(), 300);
    }
    runSemanticChronoSearch() {
        const q = this.store.chronoSearch().trim();
        const spaceId = this.spaceId();
        if (!q || !spaceId) {
            this.store.chrono.set([]);
            return;
        }
        this.brainApi.recallBrain(spaceId, { query: q, types: ['chrono'], topK: 20 }).pipe(catchError(() => of({ results: [], count: 0 }))).subscribe(res => {
            this.store.chrono.set(res.results.filter(r => r.type === 'chrono').map(r => ({
                _id: r['_id'],
                spaceId: r['spaceId'] ?? spaceId,
                title: r['title'] ?? '',
                description: r['description'],
                type: (r['type'] ?? 'event'),
                startsAt: r['startsAt'] ?? '',
                endsAt: r['endsAt'],
                status: 'upcoming',
                confidence: r['confidence'],
                tags: r['tags'] ?? [],
                entityIds: r['entityIds'] ?? [],
                memoryIds: [],
                author: r['author'] ?? { instanceId: '', instanceLabel: '' },
                createdAt: r['createdAt'] ?? '',
                updatedAt: r['createdAt'] ?? '',
                seq: r['seq'] ?? 0,
            })));
        });
    }
    /** Effective chrono type for schema lookup. */
    chronoFormKind() {
        return this.chronoForm.kind;
    }
    openChronoForm() {
        // Seed from the space's OWN allowlist, not from 'event': a space that declares `typeSchemas.chrono`
        // does not allow the built-ins, so opening on 'event' there armed the form with a value the server 400s on.
        const kind = this.store.chronoAllowedTypes()[0] ?? 'event';
        this.chronoForm = { title: '', kind, startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: this.store.buildPropertiesObject('chrono', {}, kind) };
        this.showChronoForm.set(true);
    }
    /** Reseed the create form's properties from the newly selected kind's schema (preserving values). */
    onChronoFormKindChange() {
        this.chronoForm.properties = this.store.buildPropertiesObject('chrono', this.chronoForm.properties, this.chronoFormKind());
    }
    /** Reseed the inline-edit form's properties from the newly selected kind's schema. */
    onEditChronoKindChange() {
        this.editChrono.properties = this.store.buildPropertiesObject('chrono', this.editChrono.properties, this.editChrono.kind);
    }
    createChrono() {
        if (!this.chronoForm.title.trim() || !this.chronoForm.startsAt)
            return;
        // No free-text branch any more: every chrono write is gated on the space's allowlist, so a typed
        // value that is not already a declared type could only ever come back 400.
        const resolvedKind = this.chronoForm.kind;
        if (!resolvedKind)
            return;
        this.creatingChrono.set(true);
        this.createChronoError.set('');
        const entityIds = this.chronoForm.entityIds.split(',').map(s => s.trim()).filter(Boolean);
        const body = {
            title: this.chronoForm.title.trim(),
            type: resolvedKind,
            startsAt: new Date(this.chronoForm.startsAt).toISOString(),
        };
        if (this.chronoForm.endsAt)
            body.endsAt = new Date(this.chronoForm.endsAt).toISOString();
        if (this.chronoForm.description.trim())
            body.description = this.chronoForm.description.trim();
        if (this.chronoForm.tags.length)
            body.tags = this.chronoForm.tags;
        if (entityIds.length)
            body.entityIds = entityIds;
        if (this.chronoForm.memoryIds.length)
            body.memoryIds = this.chronoForm.memoryIds;
        const props = this.store.stripEmptyOptionalProps(this.chronoForm.properties, this.store.chronoSchema(resolvedKind));
        if (Object.keys(props).length)
            body.properties = props;
        this.brainApi.createChrono(this.spaceId(), body).subscribe({
            next: () => {
                this.creatingChrono.set(false);
                this.showChronoForm.set(false);
                this.chronoForm = { title: '', kind: resolvedKind, startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: this.store.buildPropertiesObject('chrono', {}, resolvedKind) };
                this.load();
            },
            error: (err) => { this.creatingChrono.set(false); this.createChronoError.set(fmtApiError(err, 'Failed to create chrono entry')); },
        });
    }
    startEditChrono(entry) {
        this.recordList.editingId.set(entry._id);
        this.recordList.editError.set('');
        this.editChrono = {
            title: entry.title,
            kind: entry.type,
            status: entry.status,
            startsAt: entry.startsAt ? toLocalDatetime(entry.startsAt) : '',
            endsAt: entry.endsAt ? toLocalDatetime(entry.endsAt) : '',
            description: entry.description ?? '',
            tags: entry.tags ?? [],
            entityIds: (entry.entityIds ?? []).join(', '),
            memoryIds: [...(entry.memoryIds ?? [])],
            properties: this.store.buildPropertiesObject('chrono', entry.properties ?? {}, entry.type),
        };
        this.picker.resolveMemoryTitles(entry.memoryIds ?? []);
    }
    saveEditChrono(id) {
        this.recordList.editSaving.set(true);
        this.recordList.editError.set('');
        this.brainApi.updateChrono(this.spaceId(), id, {
            title: this.editChrono.title.trim(),
            type: this.editChrono.kind,
            status: this.editChrono.status,
            ...(this.editChrono.startsAt ? { startsAt: new Date(this.editChrono.startsAt).toISOString() } : {}),
            ...(this.editChrono.endsAt ? { endsAt: new Date(this.editChrono.endsAt).toISOString() } : {}),
            description: this.editChrono.description.trim(),
            tags: this.editChrono.tags,
            entityIds: this.editChrono.entityIds.split(',').map(s => s.trim()).filter(Boolean),
            memoryIds: this.editChrono.memoryIds,
            properties: this.store.stripEmptyOptionalProps(this.editChrono.properties, this.store.chronoSchema(this.editChrono.kind)),
        }).subscribe({
            next: (updated) => {
                this.recordList.editSaving.set(false);
                this.recordList.editingId.set('');
                this.store.chrono.update(list => list.map(c => c._id === id ? updated : c));
            },
            error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
        });
    }
    deleteChrono(id) {
        this.recordList.confirmDeleteId.set('');
        this.brainApi.deleteChrono(this.spaceId(), id).subscribe({
            next: () => this.store.chrono.update(list => list.filter(c => c._id !== id)),
            error: () => { },
        });
    }
    static { this.ɵfac = /*@__PURE__*/ (() => { let ɵChronoTabComponent_BaseFactory; return function ChronoTabComponent_Factory(__ngFactoryType__) { return (ɵChronoTabComponent_BaseFactory || (ɵChronoTabComponent_BaseFactory = i0.ɵɵgetInheritedFactory(ChronoTabComponent)))(__ngFactoryType__ || ChronoTabComponent); }; })(); }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ChronoTabComponent, selectors: [["app-chrono-tab"]], features: [i0.ɵɵInheritDefinitionFeature], decls: 55, vars: 65, consts: [[1, "content-header"], ["placeholder", "brain.chrono.searchPlaceholder", 3, "valueChange", "value"], [1, "btn-primary", "btn", "btn-sm", 3, "click", "disabled"], [1, "create-form"], [1, "alert", "alert-error", 2, "margin-bottom", "12px"], ["hscrollTop", "", 1, "table-wrapper"], ["app-sort-th", "", "field", "title", "label", "brain.chrono.table.title", 3, "sort", "activeField", "dir"], ["type", "text", 1, "col-filter-input", 3, "ngModelChange", "ngModel", "placeholder"], ["app-sort-th", "", "label", "brain.chrono.table.description"], ["app-sort-th", "", "field", "type", "label", "brain.chrono.table.type", 3, "sort", "activeField", "dir"], [1, "col-filter-select", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["app-sort-th", "", "field", "status", "label", "brain.chrono.table.status", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "startsAt", "label", "brain.chrono.table.starts", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "endsAt", "label", "brain.chrono.table.ends", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "label", "brain.chrono.table.tags"], [3, "id"], ["app-sort-th", "", "label", "brain.chrono.table.entities"], ["app-sort-th", "", "field", "createdAt", "label", "brain.chrono.table.created", 3, "sort", "activeField", "dir"], [1, "pagination"], [1, "create-form", 3, "ngSubmit"], [1, "form-row"], [1, "field", 2, "flex", "2", "min-width", "200px"], ["type", "text", "name", "title", "required", "", 3, "ngModelChange", "ngModel"], [1, "field", 2, "width", "160px"], ["name", "kind", 3, "ngModelChange", "ngModel"], [1, "field", 2, "width", "200px"], ["type", "datetime-local", "name", "startsAt", "required", "", 3, "ngModelChange", "ngModel"], ["type", "datetime-local", "name", "endsAt", 3, "ngModelChange", "ngModel"], [1, "form-row", "rich"], [1, "field"], ["name", "description", "rows", "3", 3, "ngModelChange", "ngModel"], ["inputName", "chronoFormTags", 3, "valueChange", "value", "suggestions"], [3, "target", "spaceId"], [3, "target"], [1, "field", 2, "flex", "1"], [3, "valueChange", "schema", "required", "value"], [2, "display", "flex", "gap", "8px"], ["type", "submit", 1, "btn-primary", "btn", "btn-sm", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], ["type", "button", 1, "btn-secondary", "btn", "btn-sm", 3, "click"], ["colspan", "9"], [1, "create-form", 2, "border", "none", "padding", "8px 0"], [1, "field", 2, "flex", "2", "min-width", "180px", "margin-bottom", "0"], ["type", "text", "name", "editChronoTitle", 3, "ngModelChange", "ngModel"], [1, "field", 2, "width", "130px", "margin-bottom", "0"], ["name", "editChronoKind", 3, "ngModelChange", "ngModel"], ["name", "editChronoStatus", 3, "ngModelChange", "ngModel"], [1, "field", 2, "width", "190px", "margin-bottom", "0"], ["type", "datetime-local", "name", "editChronoStarts", 3, "ngModelChange", "ngModel"], ["type", "datetime-local", "name", "editChronoEnds", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "180px", "margin-bottom", "0"], ["name", "editChronoDesc", "rows", "2", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], ["inputName", "chronoEditTags", 3, "valueChange", "value", "suggestions"], [1, "field", 2, "flex", "1", "min-width", "140px", "margin-bottom", "0"], [2, "display", "flex", "gap", "6px", "align-items", "flex-end"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "font-size", "12px", "color", "var(--error)"], [1, "desc-cell", 2, "max-width", "160px", 3, "title"], [1, "desc-clamp"], [1, "badge", "badge-blue"], [1, "badge"], [1, "tag"], [2, "font-size", "11px"], [1, "chip-list"], [2, "color", "var(--text-muted)"], [2, "white-space", "nowrap"], [1, "icon-btn", 3, "click"], ["name", "eye", 3, "size"], [1, "inline-confirm"], [1, "icon-btn", "danger"], [1, "chip", 3, "title"], [1, "btn", "btn-sm", "btn-danger", 3, "click"], [1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [3, "message", "reason"], [1, "empty-state", 2, "padding", "32px"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "timer", 3, "size"], [1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], ["name", "arrow-left", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], [1, "pager-info"], ["name", "arrow-right", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"]], template: function ChronoTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-record-search-bar", 1);
            i0.ɵɵlistener("valueChange", function ChronoTabComponent_Template_app_record_search_bar_valueChange_1_listener($event) { return ctx.onChronoSearch($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "button", 2);
            i0.ɵɵlistener("click", function ChronoTabComponent_Template_button_click_2_listener() { return ctx.openChronoForm(); });
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(5, ChronoTabComponent_Conditional_5_Template, 60, 48, "form", 3);
            i0.ɵɵconditionalCreate(6, ChronoTabComponent_Conditional_6_Template, 2, 1, "div", 4);
            i0.ɵɵelementStart(7, "div", 5)(8, "table")(9, "thead")(10, "tr")(11, "th", 6);
            i0.ɵɵlistener("sort", function ChronoTabComponent_Template_th_sort_11_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(12, "input", 7);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Template_input_ngModelChange_12_listener($event) { return ctx.setSearchFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(15, "th", 8)(16, "input", 7);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Template_input_ngModelChange_16_listener($event) { return ctx.setDescriptionFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(19, "th", 9);
            i0.ɵɵlistener("sort", function ChronoTabComponent_Template_th_sort_19_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(20, "select", 10);
            i0.ɵɵpipe(21, "transloco");
            i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Template_select_ngModelChange_20_listener($event) { return ctx.setTypeFilter($event); });
            i0.ɵɵelementStart(22, "option", 11);
            i0.ɵɵtext(23);
            i0.ɵɵpipe(24, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(25, ChronoTabComponent_For_26_Template, 2, 2, "option", 12, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(27, "th", 13);
            i0.ɵɵlistener("sort", function ChronoTabComponent_Template_th_sort_27_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(28, "select", 10);
            i0.ɵɵpipe(29, "transloco");
            i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Template_select_ngModelChange_28_listener($event) { return ctx.setStatusFilter($event); });
            i0.ɵɵelementStart(30, "option", 11);
            i0.ɵɵtext(31);
            i0.ɵɵpipe(32, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(33, ChronoTabComponent_For_34_Template, 2, 2, "option", 12, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(35, "th", 14);
            i0.ɵɵlistener("sort", function ChronoTabComponent_Template_th_sort_35_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(36, "th", 15);
            i0.ɵɵlistener("sort", function ChronoTabComponent_Template_th_sort_36_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(37, "th", 16)(38, "input", 7);
            i0.ɵɵpipe(39, "transloco");
            i0.ɵɵpipe(40, "transloco");
            i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Template_input_ngModelChange_38_listener($event) { return ctx.setTagFilter($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(41, "datalist", 17);
            i0.ɵɵrepeaterCreate(42, ChronoTabComponent_For_43_Template, 1, 1, "option", 12, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(44, "th", 18)(45, "input", 7);
            i0.ɵɵpipe(46, "transloco");
            i0.ɵɵpipe(47, "transloco");
            i0.ɵɵlistener("ngModelChange", function ChronoTabComponent_Template_input_ngModelChange_45_listener($event) { return ctx.setNameFilter("entityName", $event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(48, "th", 19);
            i0.ɵɵlistener("sort", function ChronoTabComponent_Template_th_sort_48_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelement(49, "th");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(50, "tbody");
            i0.ɵɵrepeaterCreate(51, ChronoTabComponent_For_52_Template, 2, 1, null, null, _forTrack0, false, ChronoTabComponent_ForEmpty_53_Template, 4, 1, "tr");
            i0.ɵɵelementEnd()()();
            i0.ɵɵconditionalCreate(54, ChronoTabComponent_Conditional_54_Template, 11, 11, "div", 20);
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("value", ctx.store.chronoSearch());
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.showChronoForm());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 39, "brain.chrono.addButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.showChronoForm() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createChronoError() ? 6 : -1);
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.search())("placeholder", i0.ɵɵpipeBind1(13, 41, "brain.filter.searchPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(14, 43, "brain.filter.searchPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().description)("placeholder", i0.ɵɵpipeBind1(17, 45, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(18, 47, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.recordFilter().type);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(21, 49, "brain.filter.label"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 51, "brain.filter.allTypes"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.store.chronoTypeOptions());
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.statusFilter());
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(29, 53, "brain.filter.statusLabel"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(32, 55, "brain.filter.allStatuses"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.store.chronoStatusOptions);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().tag)("placeholder", i0.ɵɵpipeBind1(39, 57, "brain.filter.tagPlaceholder"));
            i0.ɵɵattribute("list", ctx.tagListId)("aria-label", i0.ɵɵpipeBind1(40, 59, "brain.filter.tagPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("id", ctx.tagListId);
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.store.chronoTagSuggestions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().entityName)("placeholder", i0.ɵɵpipeBind1(46, 61, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(47, 63, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.store.chrono());
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(!ctx.store.chronoSearch().trim() ? 54 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.NgModel, i1.NgForm, TagInputComponent, EntityRefFieldComponent, MemoryRefFieldComponent, PropertiesEditorComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent, TranslocoPipe], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }", ".content-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    \n\n\n\n    .content-header[_ngcontent-%COMP%]   app-entity-search[_ngcontent-%COMP%] {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; \n\n    }\n    \n\n\n    .list-filter-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    \n\n\n    .col-filter-select[_ngcontent-%COMP%], .col-filter-input[_ngcontent-%COMP%] {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select[_ngcontent-%COMP%] { min-width: 96px; }\n    .col-filter-input[_ngcontent-%COMP%] { min-width: 90px; }\n    .filter-chip[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable[_ngcontent-%COMP%], .entity-clickable[_ngcontent-%COMP%] {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable[_ngcontent-%COMP%]:hover, .entity-clickable[_ngcontent-%COMP%]:hover { opacity: 0.7; }\n    \n\n\n\n\n    .create-form[_ngcontent-%COMP%] { --brain-control-h: 34px; }\n    .create-form[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    \n\n\n\n\n\n\n    .create-form[_ngcontent-%COMP%]   .form-row[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form[_ngcontent-%COMP%]   .form-row.rich[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%] { flex: 1; min-width: 220px; }\n    .create-form[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    \n\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:not([type=checkbox]), .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { min-height: var(--brain-control-h); }\n    \n\n    .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { font-size: 11px; }\n    \n\n\n    .desc-cell[_ngcontent-%COMP%] {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell[_ngcontent-%COMP%]   .desc-clamp[_ngcontent-%COMP%] {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group[_ngcontent-%COMP%] { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child { border-right:none; }\n    .pill-group[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) { background:var(--bg-surface); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ChronoTabComponent, [{
        type: Component,
        args: [{ selector: 'app-chrono-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, EntityRefFieldComponent, MemoryRefFieldComponent, PropertiesEditorComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent], template: `

          <div class="content-header">
            <app-record-search-bar
              [value]="store.chronoSearch()" (valueChange)="onChronoSearch($event)"
              placeholder="brain.chrono.searchPlaceholder" />
            <button class="btn-primary btn btn-sm" (click)="openChronoForm()" [disabled]="showChronoForm()">{{ 'brain.chrono.addButton' | transloco }}</button>
          </div>

          @if (showChronoForm()) {
            <form class="create-form" (ngSubmit)="createChrono()">
              <!-- Order follows the feedback (Title, Description, tags, entities) while keeping chrono's
                   required kind/start/end. Single-line fields share one height; description grows. -->
              <div class="form-row">
                <div class="field" style="flex:2; min-width:200px;">
                  <label>{{ 'common.form.title' | transloco }}</label>
                  <input type="text" [(ngModel)]="chronoForm.title" name="title" required />
                </div>
                <div class="field" style="width:160px;">
                  <label>{{ 'common.form.type' | transloco }}</label>
                  <select [(ngModel)]="chronoForm.kind" name="kind" (ngModelChange)="onChronoFormKindChange()">
                    @for (k of store.chronoAllowedTypes(); track k) { <option [value]="k">{{ k }}</option> }
                  </select>
                </div>
                <div class="field" style="width:200px;">
                  <label>{{ 'brain.chrono.form.startsAt' | transloco }}</label>
                  <input type="datetime-local" [(ngModel)]="chronoForm.startsAt" name="startsAt" required />
                </div>
                <div class="field" style="width:200px;">
                  <label>{{ 'brain.chrono.form.endsAt' | transloco }}</label>
                  <input type="datetime-local" [(ngModel)]="chronoForm.endsAt" name="endsAt" />
                </div>
              </div>
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'brain.chrono.table.description' | transloco }}</label>
                  <textarea [(ngModel)]="chronoForm.description" name="description" rows="3"></textarea>
                </div>
              </div>
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'brain.chrono.table.tags' | transloco }}</label>
                  <app-tag-input [(value)]="chronoForm.tags" [suggestions]="store.chronoTagSuggestions()" inputName="chronoFormTags" />
                </div>
                <div class="field">
                  <label>{{ 'brain.chrono.table.entities' | transloco }}</label>
                  <app-entity-ref-field [target]="chronoForm" [spaceId]="spaceId()" />
                </div>
                <div class="field">
                  <label>{{ 'brain.chrono.form.memories' | transloco }}</label>
                  <app-memory-ref-field [target]="chronoForm" />
                </div>
              </div>
              <div class="form-row rich">
                <div class="field" style="flex:1;">
                  <label>{{ 'brain.chrono.table.properties' | transloco }}</label>
                  <app-properties-editor
                    [schema]="store.chronoSchema(chronoFormKind())"
                    [required]="store.requiredProps(store.chronoSchema(chronoFormKind()))"
                    [(value)]="chronoForm.properties"
                  />
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingChrono() || !chronoForm.title.trim() || !chronoForm.startsAt || !chronoForm.kind">
                  @if (creatingChrono()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                  {{ 'common.save' | transloco }}
                </button>
                <button class="btn-secondary btn btn-sm" type="button" (click)="showChronoForm.set(false)">{{ 'common.cancel' | transloco }}</button>
              </div>
            </form>
          }

          @if (createChronoError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createChronoError() }}</div>
          }

          <div class="table-wrapper" hscrollTop>
            <table>
              <thead>
                <tr>
                  <th app-sort-th field="title" label="brain.chrono.table.title" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <input class="col-filter-input" type="text" [ngModel]="search()" (ngModelChange)="setSearchFilter($event)"
                      [placeholder]="'brain.filter.searchPlaceholder' | transloco" [attr.aria-label]="'brain.filter.searchPlaceholder' | transloco" />
                  </th><th app-sort-th label="brain.chrono.table.description">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().description" (ngModelChange)="setDescriptionFilter($event)"
                      [placeholder]="'brain.filter.descriptionPlaceholder' | transloco" [attr.aria-label]="'brain.filter.descriptionPlaceholder' | transloco" />
                  </th><th app-sort-th field="type" label="brain.chrono.table.type" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <select class="col-filter-select" [ngModel]="recordFilter().type" (ngModelChange)="setTypeFilter($event)" [attr.aria-label]="'brain.filter.label' | transloco">
                      <option value="">{{ 'brain.filter.allTypes' | transloco }}</option>
                      @for (k of store.chronoTypeOptions(); track k) { <option [value]="k">{{ k }}</option> }
                    </select>
                  </th><th app-sort-th field="status" label="brain.chrono.table.status" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <select class="col-filter-select" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)" [attr.aria-label]="'brain.filter.statusLabel' | transloco">
                      <option value="">{{ 'brain.filter.allStatuses' | transloco }}</option>
                      @for (st of store.chronoStatusOptions; track st) { <option [value]="st">{{ st }}</option> }
                    </select>
                  </th><th app-sort-th field="startsAt" label="brain.chrono.table.starts" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th app-sort-th field="endsAt" label="brain.chrono.table.ends" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th app-sort-th label="brain.chrono.table.tags">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().tag" (ngModelChange)="setTagFilter($event)"
                      [attr.list]="tagListId" [placeholder]="'brain.filter.tagPlaceholder' | transloco" [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco" />
                    <datalist [id]="tagListId">@for (s of store.chronoTagSuggestions(); track s) { <option [value]="s"></option> }</datalist>
                  </th><th app-sort-th label="brain.chrono.table.entities">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().entityName" (ngModelChange)="setNameFilter('entityName', $event)"
                      [placeholder]="'brain.filter.entityNamePlaceholder' | transloco" [attr.aria-label]="'brain.filter.entityNamePlaceholder' | transloco" />
                  </th><th app-sort-th field="createdAt" label="brain.chrono.table.created" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (entry of store.chrono(); track entry._id) {
                  @if (recordList.editingId() === entry._id) {
                    <tr>
                      <td colspan="9">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="flex:2; min-width:180px; margin-bottom:0;">
                            <label>{{ 'common.form.title' | transloco }}</label>
                            <input type="text" [(ngModel)]="editChrono.title" name="editChronoTitle" />
                          </div>
                          <div class="field" style="width:130px; margin-bottom:0;">
                            <label>{{ 'common.form.type' | transloco }}</label>
                            <select [(ngModel)]="editChrono.kind" name="editChronoKind" (ngModelChange)="onEditChronoKindChange()">
                              @for (k of store.chronoAllowedTypes(); track k) { <option [value]="k">{{ k }}</option> }
                            </select>
                          </div>
                          <div class="field" style="width:130px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.status' | transloco }}</label>
                            <select [(ngModel)]="editChrono.status" name="editChronoStatus">
                              @for (s of store.chronoStatusOptions; track s) { <option [value]="s">{{ s }}</option> }
                            </select>
                          </div>
                          <div class="field" style="width:190px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.form.startsAt' | transloco }}</label>
                            <input type="datetime-local" [(ngModel)]="editChrono.startsAt" name="editChronoStarts" />
                          </div>
                          <div class="field" style="width:190px; margin-bottom:0;">
                            <label>{{ 'common.form.endsAt' | transloco }}</label>
                            <input type="datetime-local" [(ngModel)]="editChrono.endsAt" name="editChronoEnds" />
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.description' | transloco }}</label>
                            <textarea [(ngModel)]="editChrono.description" name="editChronoDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editChrono.tags" [suggestions]="store.chronoTagSuggestions()" inputName="chronoEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.entities' | transloco }}</label>
                            <app-entity-ref-field [target]="editChrono" [spaceId]="spaceId()" />
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.chronoSchema(editChrono.kind)"
                              [required]="store.requiredProps(store.chronoSchema(editChrono.kind))"
                              [(value)]="editChrono.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditChrono(entry._id)">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (recordList.editError()) { <div style="font-size:12px; color:var(--error);">{{ recordList.editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td>{{ entry.title }}</td>
                      <td class="desc-cell" style="max-width:160px;" [title]="entry.description ?? ''">
                        <div class="desc-clamp">{{ entry.description || '—' }}</div>
                      </td>
                      <td><span class="badge badge-blue">{{ entry.type }}</span></td>
                      <td><span class="badge" [class.badge-purple]="entry.status === 'upcoming'" [class.badge-blue]="entry.status === 'active'">{{ entry.status }}</span></td>
                      <td><app-timestamp [value]="entry.startsAt"/></td>
                      <td><app-timestamp [value]="entry.endsAt"/></td>
                      <td>
                        @for (tag of entry.tags; track tag) { <span class="tag">{{ tag }}</span> }
                      </td>
                      <td style="font-size:11px;">
                        @if (entry.entityIds.length) {
                          <div class="chip-list">
                            @for (id of entry.entityIds; track id) {
                              <span class="chip" [title]="id">{{ picker.entityNameCache()[id] || id.slice(0,8) + '…' }}</span>
                            }
                          </div>
                        } @else { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td><app-timestamp [value]="entry.createdAt"/></td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('chrono', entry)"><ph-icon name="eye" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === entry._id) {
                          <span class="inline-confirm">
                            {{ 'common.deleteConfirm' | transloco }}
                            <button class="btn btn-sm btn-danger" (click)="deleteChrono(entry._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.aria-label]="'brain.chrono.deleteAriaLabel' | transloco" (click)="requestDelete(entry._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="9">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadChrono' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="timer" [size]="48"/></div>
                      @if (store.chronoSearch()) {
                        <h3>{{ 'common.noMatches' | transloco }}</h3>
                        <p>{{ 'brain.chrono.empty.noMatchQuery' | transloco }}</p>
                      } @else {
                        <h3>{{ 'brain.chrono.empty.title' | transloco }}</h3>
                      }
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (!store.chronoSearch().trim()) {
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.chrono().length ? (skip() + 1) + '–' + (skip() + store.chrono().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.chrono().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n", "\n    .content-header {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    /* The plain search input styles itself (record-search-bar.component.ts) and app-entity-search\n       matches that spec \u2014 see the note there. Both are capped to the same width here so the entities\n       bar and the other tabs' bars line up. */\n    .content-header app-entity-search {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; /* match the plain search input above (was 520 \u2014 the entities bar rendered wider) */\n    }\n    /* A slim row above the table, now only carrying the memories tab's active ENTITY-filter chip\n       (the type/tag filters moved into the headers in 2b-ii). */\n    .list-filter-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    /* Slice 2b-ii: filters dock UNDER each column label (via th[app-sort-th]'s projected slot).\n       These style the docked controls uniformly across every tab. */\n    .col-filter-select, .col-filter-input {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select { min-width: 96px; }\n    .col-filter-input { min-width: 90px; }\n    .filter-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip button {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable, .entity-clickable {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable:hover, .entity-clickable:hover { opacity: 0.7; }\n    /* Uniform control height across every brain form control. 34px matches app-tag-input's wrap \u2014\n       the tallest single-line control \u2014 so aligning to it lifts the plain inputs/selects up to a\n       shared height instead of leaving four different ones on the page (search 5/10, filter 30,\n       create 5/8, global 8/12). Single-line fields become identical; textarea/properties grow. */\n    .create-form { --brain-control-h: 34px; }\n    .create-form {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    /* The form is a vertical stack of .form-row blocks. Each tab composes its own rows in\n       table-column order: single-line fields (name/type/tags, from/to/label/weight) go in a plain\n       row at one uniform height; the tall fields (description then properties, or fact then\n       description) go in a .form-row.rich where each field flexes and grows, tops aligned. This makes\n       the feedback's \"same input height \u2026 description the current height as baseline but expands with\n       properties container\" a structure rather than a pile of per-field inline widths. */\n    .create-form .form-row {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form .form-row.rich > .field { flex: 1; min-width: 220px; }\n    .create-form .field { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form input, .create-form select, .create-form textarea {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    /* Single-line controls (and app-tag-input's wrap, already 34px) share the one height. */\n    .create-form input:not([type=checkbox]), .create-form select { min-height: var(--brain-control-h); }\n    /* Description starts at the single-line height as its baseline and grows from there. */\n    .create-form textarea { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm button { font-size: 11px; }\n    /* The td stays a real table cell so it fills its column; the 3-line clamp lives on an inner box\n       (setting display:-webkit-box on the td itself drops it out of table layout). */\n    .desc-cell {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell .desc-clamp {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group button { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group button:last-child { border-right:none; }\n    .pill-group button.active { background:var(--accent-dim); color:var(--accent); }\n    .pill-group button:hover:not(.active) { background:var(--bg-surface); }\n"] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ChronoTabComponent, { className: "ChronoTabComponent", filePath: "app/pages/brain/chrono-tab.component.ts", lineNumber: 277 }); })();
