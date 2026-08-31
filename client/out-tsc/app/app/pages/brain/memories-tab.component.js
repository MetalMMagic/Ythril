import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { EntityRefFieldComponent } from './entity-ref-field.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
import { SortableHeaderComponent } from './sortable-header.component';
import { RecordSearchBarComponent } from './record-search-bar.component';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { TimestampComponent } from '../../shared/timestamp.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = () => [];
const _c1 = a0 => ({ query: a0 });
const _forTrack0 = ($index, $item) => $item._id;
function MemoriesTabComponent_Conditional_5_Conditional_17_For_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 13);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r4 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r4);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r4);
} }
function MemoriesTabComponent_Conditional_5_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 33);
    i0.ɵɵtwoWayListener("ngModelChange", function MemoriesTabComponent_Conditional_5_Conditional_17_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.memoryForm.type, $event) || (ctx_r1.memoryForm.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(1, "option", 12);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(4, MemoriesTabComponent_Conditional_5_Conditional_17_For_5_Template, 2, 2, "option", 13, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.memoryForm.type);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "brain.memories.form.typePlaceholder"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.store.memoryAllowedTypes());
} }
function MemoriesTabComponent_Conditional_5_Conditional_18_For_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 13);
} if (rf & 2) {
    const t_r6 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r6);
} }
function MemoriesTabComponent_Conditional_5_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 34);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function MemoriesTabComponent_Conditional_5_Conditional_18_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.memoryForm.type, $event) || (ctx_r1.memoryForm.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "datalist", 35);
    i0.ɵɵrepeaterCreate(3, MemoriesTabComponent_Conditional_5_Conditional_18_For_4_Template, 1, 1, "option", 13, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.memoryForm.type);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(1, 2, "brain.memories.form.typePlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r1.store.memoryTypeOptions());
} }
function MemoriesTabComponent_Conditional_5_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 31);
} }
function MemoriesTabComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 20);
    i0.ɵɵlistener("ngSubmit", function MemoriesTabComponent_Conditional_5_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.createMemory()); });
    i0.ɵɵelementStart(1, "div", 21)(2, "div", 22)(3, "label");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "textarea", 23);
    i0.ɵɵtwoWayListener("ngModelChange", function MemoriesTabComponent_Conditional_5_Template_textarea_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.memoryForm.fact, $event) || (ctx_r1.memoryForm.fact = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 22)(8, "label");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "textarea", 24);
    i0.ɵɵtwoWayListener("ngModelChange", function MemoriesTabComponent_Conditional_5_Template_textarea_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.memoryForm.description, $event) || (ctx_r1.memoryForm.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(12, "div", 21)(13, "div", 22)(14, "label");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(17, MemoriesTabComponent_Conditional_5_Conditional_17_Template, 6, 4, "select", 25)(18, MemoriesTabComponent_Conditional_5_Conditional_18_Template, 5, 4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "div", 22)(20, "label");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "app-tag-input", 26);
    i0.ɵɵtwoWayListener("valueChange", function MemoriesTabComponent_Conditional_5_Template_app_tag_input_valueChange_23_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.memoryForm.tags, $event) || (ctx_r1.memoryForm.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "div", 22)(25, "label");
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(28, "app-entity-ref-field", 27);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "div", 22)(30, "label");
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "app-properties-editor", 28);
    i0.ɵɵtwoWayListener("valueChange", function MemoriesTabComponent_Conditional_5_Template_app_properties_editor_valueChange_33_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.memoryForm.properties, $event) || (ctx_r1.memoryForm.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(34, "div", 29)(35, "button", 30);
    i0.ɵɵconditionalCreate(36, MemoriesTabComponent_Conditional_5_Conditional_36_Template, 1, 0, "span", 31);
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(39, "button", 32);
    i0.ɵɵlistener("click", function MemoriesTabComponent_Conditional_5_Template_button_click_39_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showMemoryForm.set(false)); });
    i0.ɵɵtext(40);
    i0.ɵɵpipe(41, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 20, "common.form.fact"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.memoryForm.fact);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 22, "common.form.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.memoryForm.description);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 24, "common.form.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.store.memoryTypesAreRestricted() ? 17 : 18);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 26, "common.form.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.memoryForm.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.memoryTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 28, "common.form.entities"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.memoryForm)("spaceId", ctx_r1.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(32, 30, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.memorySchema())("required", ctx_r1.store.requiredProps(ctx_r1.store.memorySchema()));
    i0.ɵɵtwoWayProperty("value", ctx_r1.memoryForm.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.creatingMemory() || !ctx_r1.memoryForm.fact.trim());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.creatingMemory() ? 36 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(38, 32, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(41, 34, "common.cancel"));
} }
function MemoriesTabComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.createMemoryError());
} }
function MemoriesTabComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 5)(1, "span", 36);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "button", 37);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵlistener("click", function MemoriesTabComponent_Conditional_7_Template_button_click_4_listener() { i0.ɵɵrestoreView(_r7); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.clearFilter("entity")); });
    i0.ɵɵelement(6, "ph-icon", 38);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(3, 4, "brain.filter.entityPrefix"), " ", ctx, " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(5, 6, "brain.filter.clearEntityAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function MemoriesTabComponent_For_27_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 13);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r8 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r8);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r8);
} }
function MemoriesTabComponent_For_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 13);
} if (rf & 2) {
    const s_r9 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r9);
} }
function MemoriesTabComponent_For_47_Conditional_0_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 51);
} }
function MemoriesTabComponent_For_47_Conditional_0_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 53);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.recordList.editError());
} }
function MemoriesTabComponent_For_47_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 39)(2, "div", 40)(3, "div", 41)(4, "label");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "textarea", 42);
    i0.ɵɵtwoWayListener("ngModelChange", function MemoriesTabComponent_For_47_Conditional_0_Template_textarea_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editMemory.fact, $event) || (ctx_r1.editMemory.fact = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 43)(9, "label");
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "textarea", 44);
    i0.ɵɵtwoWayListener("ngModelChange", function MemoriesTabComponent_For_47_Conditional_0_Template_textarea_ngModelChange_12_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editMemory.description, $event) || (ctx_r1.editMemory.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(13, "div", 45)(14, "label");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "app-tag-input", 46);
    i0.ɵɵtwoWayListener("valueChange", function MemoriesTabComponent_For_47_Conditional_0_Template_app_tag_input_valueChange_17_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editMemory.tags, $event) || (ctx_r1.editMemory.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(18, "div", 47)(19, "label");
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(22, "app-entity-ref-field", 27);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "div", 48)(24, "label");
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "app-properties-editor", 28);
    i0.ɵɵtwoWayListener("valueChange", function MemoriesTabComponent_For_47_Conditional_0_Template_app_properties_editor_valueChange_27_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editMemory.properties, $event) || (ctx_r1.editMemory.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(28, "div", 49)(29, "button", 50);
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_0_Template_button_click_29_listener() { i0.ɵɵrestoreView(_r11); const mem_r12 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.saveEditMemory(mem_r12._id)); });
    i0.ɵɵconditionalCreate(30, MemoriesTabComponent_For_47_Conditional_0_Conditional_30_Template, 1, 0, "span", 51);
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "button", 52);
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_0_Template_button_click_33_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.recordList.cancelEdit()); });
    i0.ɵɵtext(34);
    i0.ɵɵpipe(35, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(36, MemoriesTabComponent_For_47_Conditional_0_Conditional_36_Template, 2, 1, "div", 53);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 19, "common.form.fact"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editMemory.fact);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 21, "common.form.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editMemory.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 23, "common.form.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.editMemory.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.memoryTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 25, "common.form.entities"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.editMemory)("spaceId", ctx_r1.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 27, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.memorySchema())("required", ctx_r1.store.requiredProps(ctx_r1.store.memorySchema()));
    i0.ɵɵtwoWayProperty("value", ctx_r1.editMemory.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.recordList.editSaving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.editSaving() ? 30 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(32, 29, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(35, 31, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.editError() ? 36 : -1);
} }
function MemoriesTabComponent_For_47_Conditional_1_For_10_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 68);
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_1_For_10_Template_span_click_0_listener() { const tag_r15 = i0.ɵɵrestoreView(_r14).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.applyFilter("tag", tag_r15)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const tag_r15 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(tag_r15);
} }
function MemoriesTabComponent_For_47_Conditional_1_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 60);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function MemoriesTabComponent_For_47_Conditional_1_Conditional_13_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 69);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const id_r16 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵproperty("title", id_r16);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.picker.entityNameCache()[id_r16] || id_r16.slice(0, 8) + "\u2026");
} }
function MemoriesTabComponent_For_47_Conditional_1_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 61);
    i0.ɵɵrepeaterCreate(1, MemoriesTabComponent_For_47_Conditional_1_Conditional_13_For_2_Template, 2, 2, "span", 69, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const mem_r12 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(mem_r12.entityIds);
} }
function MemoriesTabComponent_For_47_Conditional_1_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 60);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function MemoriesTabComponent_For_47_Conditional_1_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 66);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "button", 70);
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_1_Conditional_24_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r17); const mem_r12 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.deleteMemory(mem_r12._id)); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "button", 52);
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_1_Conditional_24_Template_button_click_6_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelDelete()); });
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
function MemoriesTabComponent_For_47_Conditional_1_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    const _r18 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 71);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_1_Conditional_25_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r18); const mem_r12 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.requestDelete(mem_r12._id)); });
    i0.ɵɵelement(3, "ph-icon", 38);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 3, "brain.memories.deleteTitle"))("aria-label", i0.ɵɵpipeBind1(2, 5, "brain.memories.deleteAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
} }
function MemoriesTabComponent_For_47_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 54);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td", 55)(4, "div", 56);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "td", 57);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "td", 58);
    i0.ɵɵrepeaterCreate(9, MemoriesTabComponent_For_47_Conditional_1_For_10_Template, 2, 1, "span", 59, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵconditionalCreate(11, MemoriesTabComponent_For_47_Conditional_1_Conditional_11_Template, 2, 0, "span", 60);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "td", 58);
    i0.ɵɵconditionalCreate(13, MemoriesTabComponent_For_47_Conditional_1_Conditional_13_Template, 3, 0, "div", 61)(14, MemoriesTabComponent_For_47_Conditional_1_Conditional_14_Template, 2, 0, "span", 60);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "td");
    i0.ɵɵelement(16, "app-properties-view", 62);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "td");
    i0.ɵɵelement(18, "app-timestamp", 13);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "td", 63)(20, "button", 64);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵlistener("click", function MemoriesTabComponent_For_47_Conditional_1_Template_button_click_20_listener() { i0.ɵɵrestoreView(_r13); const mem_r12 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.drawerState.open("memory", mem_r12)); });
    i0.ɵɵelement(23, "ph-icon", 65);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(24, MemoriesTabComponent_For_47_Conditional_1_Conditional_24_Template, 9, 9, "span", 66)(25, MemoriesTabComponent_For_47_Conditional_1_Conditional_25_Template, 4, 7, "button", 67);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const mem_r12 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(mem_r12.fact);
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", mem_r12.description ?? "");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(mem_r12.description || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(mem_r12.type || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(mem_r12.tags ?? i0.ɵɵpureFunction0(17, _c0));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!(mem_r12.tags == null ? null : mem_r12.tags.length) ? 11 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((mem_r12.entityIds == null ? null : mem_r12.entityIds.length) ? 13 : 14);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("properties", mem_r12.properties)("schema", ctx_r1.store.memorySchema());
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", mem_r12.createdAt);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(21, 13, "common.viewDetails"))("aria-label", i0.ɵɵpipeBind1(22, 15, "common.viewDetails"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.confirmDeleteId() === mem_r12._id ? 24 : 25);
} }
function MemoriesTabComponent_For_47_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, MemoriesTabComponent_For_47_Conditional_0_Template, 37, 33, "tr")(1, MemoriesTabComponent_For_47_Conditional_1_Template, 26, 18, "tr");
} if (rf & 2) {
    const mem_r12 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.recordList.editingId() === mem_r12._id ? 0 : 1);
} }
function MemoriesTabComponent_ForEmpty_48_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 74);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function MemoriesTabComponent_ForEmpty_48_Conditional_2_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryCurrentTab()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "brain.error.loadMemories"))("reason", ctx_r1.recordList.loadError() ?? "");
} }
function MemoriesTabComponent_ForEmpty_48_Conditional_3_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "common.noMatches"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(5, 4, "brain.memories.empty.noMatchQuery", i0.ɵɵpureFunction1(7, _c1, ctx_r1.store.memorySearch())));
} }
function MemoriesTabComponent_ForEmpty_48_Conditional_3_Conditional_4_Template(rf, ctx) { if (rf & 1) {
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
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "brain.memories.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 4, "brain.memories.empty.body"));
} }
function MemoriesTabComponent_ForEmpty_48_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 73)(1, "div", 75);
    i0.ɵɵelement(2, "ph-icon", 76);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, MemoriesTabComponent_ForEmpty_48_Conditional_3_Conditional_3_Template, 6, 9)(4, MemoriesTabComponent_ForEmpty_48_Conditional_3_Conditional_4_Template, 6, 6);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.store.memorySearch() ? 3 : 4);
} }
function MemoriesTabComponent_ForEmpty_48_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 39);
    i0.ɵɵconditionalCreate(2, MemoriesTabComponent_ForEmpty_48_Conditional_2_Template, 2, 4, "app-error-state", 72)(3, MemoriesTabComponent_ForEmpty_48_Conditional_3_Template, 5, 2, "div", 73);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.loadError() !== null ? 2 : 3);
} }
function MemoriesTabComponent_Conditional_49_Template(rf, ctx) { if (rf & 1) {
    const _r19 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 19)(1, "button", 77);
    i0.ɵɵlistener("click", function MemoriesTabComponent_Conditional_49_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.prevPage()); });
    i0.ɵɵelement(2, "ph-icon", 78);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 79);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 77);
    i0.ɵɵlistener("click", function MemoriesTabComponent_Conditional_49_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.nextPage()); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelement(10, "ph-icon", 80);
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
    i0.ɵɵtextInterpolate(ctx_r1.store.memories().length ? ctx_r1.skip() + 1 + "\u2013" + (ctx_r1.skip() + ctx_r1.store.memories().length) : "\u2013");
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.store.memories().length < ctx_r1.pageSize);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(9, 9, "common.next"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
} }
/**
 * The Memories record tab, extracted from BrainComponent (A17.9b-6d) — the first of the five record
 * tabs to become its own component. Owns the memory create form, the (drawer-superseded) inline edit,
 * delete, and the tab's own search / filter / pagination + loader. Reads records and derived views
 * from BrainStore; shares the singleton load/edit/delete interaction with the shell via
 * RecordListState; uses EntityRefPicker for entity chips and RecordDrawerState to open the detail
 * drawer.
 *
 * Self-loading: the shell renders this behind `@if (activeTab() === 'memories')`, so it is created on
 * activation and destroyed on switch. An effect on the `spaceId` input loads on creation and reloads
 * on a space switch while mounted. Create/delete emit `mutated` so the shell can refresh the tab-count
 * stats (the one legitimate output — tab counts are parent view-state).
 *
 * OnPush: every async path writes a signal; the plain ngModel form models render because a sibling
 * signal write (`showMemoryForm`/`recordList.editingId`) happens in the same turn.
 */
export class MemoriesTabComponent extends RecordTabBase {
    constructor() {
        super(...arguments);
        this.drawerState = inject(RecordDrawerState);
        this.brainApi = inject(BrainApi);
        /** Emitted after a create/delete so the shell can refresh the space's tab-count stats. */
        this.mutated = output();
        this.filterEntity = signal('', ...(ngDevMode ? [{ debugName: "filterEntity" }] : /* istanbul ignore next */ []));
        this.showMemoryForm = signal(false, ...(ngDevMode ? [{ debugName: "showMemoryForm" }] : /* istanbul ignore next */ []));
        this.creatingMemory = signal(false, ...(ngDevMode ? [{ debugName: "creatingMemory" }] : /* istanbul ignore next */ []));
        this.createMemoryError = signal('', ...(ngDevMode ? [{ debugName: "createMemoryError" }] : /* istanbul ignore next */ []));
        this.memoryForm = { fact: '', type: '', tags: [], entityIds: '', description: '', properties: {} };
        this.editMemory = { fact: '', tags: [], entityIds: '', description: '', properties: {} };
        this._memSemTimer = null;
    }
    resetOnSpaceChange() {
        this.recordFilter.set({ type: '', tag: '', description: '', properties: '', fromName: '', toName: '', entityName: '' });
        this.filterEntity.set('');
    }
    load() {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        this.recordList.loading.set(true);
        this.recordList.loadError.set(null);
        const filters = {};
        if (this.recordFilter().tag)
            filters.tag = this.recordFilter().tag;
        if (this.filterEntity())
            filters.entity = this.filterEntity();
        if (this.recordFilter().type)
            filters.type = this.recordFilter().type;
        if (this.recordFilter().description)
            filters.description = this.recordFilter().description;
        if (this.recordFilter().entityName)
            filters.entityName = this.recordFilter().entityName;
        if (this.recordFilter().properties)
            filters.properties = this.recordFilter().properties;
        this.brainApi.listMemories(spaceId, this.pageSize, this.skip(), filters, this.sortParam(), this.searchParam()).subscribe({
            next: ({ memories }) => {
                this.store.memories.set(memories);
                const ids = [...new Set(memories.flatMap(m => m.entityIds ?? []))];
                if (ids.length)
                    this.picker.resolveEntityNames(ids);
                this.recordList.loading.set(false);
            },
            error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
        });
    }
    /**
     * The top-bar search is SEMANTIC-only (2b-iii-c): typing issues a debounced `recallBrain`. Plain
     * substring search moved to the docked Fact column freetext filter (server-side, via `load()`).
     * Clearing the box restores the normal paginated list.
     */
    onMemorySearch(q) {
        this.store.memorySearch.set(q);
        if (this._memSemTimer)
            clearTimeout(this._memSemTimer);
        if (!q.trim()) {
            this.skip.set(0);
            this.load();
            return;
        }
        this._memSemTimer = setTimeout(() => this.runSemanticMemorySearch(), 300);
    }
    runSemanticMemorySearch() {
        const q = this.store.memorySearch().trim();
        const spaceId = this.spaceId();
        if (!q || !spaceId) {
            this.store.memories.set([]);
            return;
        }
        this.brainApi.recallBrain(spaceId, { query: q, types: ['memory'], topK: 20 }).pipe(catchError(() => of({ results: [], count: 0 }))).subscribe(res => {
            this.store.memories.set(res.results.filter(r => r.type === 'memory').map(r => ({
                _id: r['_id'],
                fact: r['fact'] ?? '',
                tags: r['tags'] ?? [],
                entityIds: r['entityIds'] ?? [],
                description: r['description'],
                properties: r['properties'] ?? {},
                createdAt: r['createdAt'] ?? '',
                seq: r['seq'] ?? 0,
                author: r['author'],
            })));
        });
    }
    applyFilter(type, value) {
        if (type === 'tag')
            this.recordFilter.set({ ...this.recordFilter(), tag: value });
        else
            this.filterEntity.set(value);
        this.skip.set(0);
        this.load();
    }
    clearFilter(which) {
        if (which === 'tag' || which === 'all')
            this.recordFilter.set({ ...this.recordFilter(), tag: '' });
        if (which === 'entity' || which === 'all')
            this.filterEntity.set('');
        this.skip.set(0);
        this.load();
    }
    openMemoryForm() {
        this.memoryForm = { fact: '', type: '', tags: [], entityIds: '', description: '', properties: this.store.buildPropertiesObject('memory') };
        this.showMemoryForm.set(true);
    }
    createMemory() {
        if (!this.memoryForm.fact.trim())
            return;
        this.creatingMemory.set(true);
        this.createMemoryError.set('');
        const entityIds = this.memoryForm.entityIds.split(',').map(s => s.trim()).filter(Boolean);
        const body = { fact: this.memoryForm.fact.trim() };
        // Sent only when non-empty: an empty `type` must stay ABSENT rather than become the string "", which would
        // select typeSchemas.memory[""], find nothing, and store a type nobody can filter for.
        if (this.memoryForm.type.trim())
            body.type = this.memoryForm.type.trim();
        if (this.memoryForm.tags.length)
            body.tags = this.memoryForm.tags;
        if (entityIds.length)
            body.entityIds = entityIds;
        if (this.memoryForm.description.trim())
            body.description = this.memoryForm.description.trim();
        if (Object.keys(this.memoryForm.properties).length)
            body.properties = this.memoryForm.properties;
        this.brainApi.createMemory(this.spaceId(), body).subscribe({
            next: () => {
                this.creatingMemory.set(false);
                this.showMemoryForm.set(false);
                this.memoryForm = { fact: '', type: '', tags: [], entityIds: '', description: '', properties: {} };
                this.mutated.emit();
                this.load();
            },
            error: (err) => { this.creatingMemory.set(false); this.createMemoryError.set(fmtApiError(err, 'Failed to create memory')); },
        });
    }
    startEditMemory(mem) {
        this.recordList.editingId.set(mem._id);
        this.recordList.editError.set('');
        this.editMemory = {
            fact: mem.fact,
            tags: mem.tags ?? [],
            entityIds: (mem.entityIds ?? []).join(', '),
            description: mem.description ?? '',
            properties: this.store.buildPropertiesObject('memory', mem.properties ?? {}),
        };
    }
    saveEditMemory(id) {
        this.recordList.editSaving.set(true);
        this.recordList.editError.set('');
        const memProps = this.editMemory.properties;
        this.brainApi.updateMemory(this.spaceId(), id, {
            fact: this.editMemory.fact.trim(),
            tags: this.editMemory.tags,
            entityIds: this.editMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean),
            description: this.editMemory.description.trim(),
            ...(Object.keys(memProps).length ? { properties: memProps } : {}),
        }).subscribe({
            next: (updated) => {
                this.recordList.editSaving.set(false);
                this.recordList.editingId.set('');
                this.store.memories.update(list => list.map(m => m._id === id ? updated : m));
            },
            error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
        });
    }
    deleteMemory(id) {
        this.recordList.confirmDeleteId.set('');
        this.brainApi.deleteMemory(this.spaceId(), id).subscribe({
            next: () => { this.store.memories.update(list => list.filter(m => m._id !== id)); this.mutated.emit(); },
            error: () => { },
        });
    }
    static { this.ɵfac = /*@__PURE__*/ (() => { let ɵMemoriesTabComponent_BaseFactory; return function MemoriesTabComponent_Factory(__ngFactoryType__) { return (ɵMemoriesTabComponent_BaseFactory || (ɵMemoriesTabComponent_BaseFactory = i0.ɵɵgetInheritedFactory(MemoriesTabComponent)))(__ngFactoryType__ || MemoriesTabComponent); }; })(); }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: MemoriesTabComponent, selectors: [["app-memories-tab"]], outputs: { mutated: "mutated" }, features: [i0.ɵɵInheritDefinitionFeature], decls: 50, vars: 58, consts: [[1, "content-header"], ["placeholder", "brain.memories.searchPlaceholder", 3, "valueChange", "value"], [1, "btn-primary", "btn", "btn-sm", 3, "click", "disabled"], [1, "create-form"], [1, "alert", "alert-error", 2, "margin-bottom", "12px"], [1, "list-filter-row"], ["hscrollTop", "", 1, "table-wrapper"], ["app-sort-th", "", "label", "brain.memories.table.fact"], ["type", "text", 1, "col-filter-input", 3, "ngModelChange", "ngModel", "placeholder"], ["app-sort-th", "", "label", "brain.memories.table.description"], ["app-sort-th", "", "field", "type", "label", "brain.memories.table.type", 3, "sort", "activeField", "dir"], [1, "col-filter-select", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["app-sort-th", "", "label", "brain.memories.table.tags"], [3, "id"], ["app-sort-th", "", "label", "brain.memories.table.entities"], ["app-sort-th", "", "label", "brain.memories.table.properties"], ["app-sort-th", "", "field", "createdAt", "label", "brain.memories.table.created", 3, "sort", "activeField", "dir"], [1, "pagination"], [1, "create-form", 3, "ngSubmit"], [1, "form-row", "rich"], [1, "field"], ["name", "fact", "rows", "3", "required", "", 3, "ngModelChange", "ngModel"], ["name", "description", "rows", "3", 3, "ngModelChange", "ngModel"], ["name", "memFormType", 3, "ngModel"], ["inputName", "memFormTags", 3, "valueChange", "value", "suggestions"], [3, "target", "spaceId"], [3, "valueChange", "schema", "required", "value"], [2, "display", "flex", "gap", "8px"], ["type", "submit", 1, "btn-primary", "btn", "btn-sm", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], ["type", "button", 1, "btn-secondary", "btn", "btn-sm", 3, "click"], ["name", "memFormType", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "memFormType", "list", "memTypeOptions", 3, "ngModelChange", "ngModel", "placeholder"], ["id", "memTypeOptions"], [1, "filter-chip"], [3, "click"], ["name", "x", 3, "size"], ["colspan", "8"], [1, "create-form", 2, "border", "none", "padding", "8px 0"], [1, "field", 2, "flex", "2", "min-width", "200px", "margin-bottom", "0"], ["name", "editFact", "rows", "2", 2, "width", "100%", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "160px", "margin-bottom", "0"], ["name", "editDesc", "rows", "2", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "180px", "margin-bottom", "0"], ["inputName", "memEditTags", 3, "valueChange", "value", "suggestions"], [1, "field", 2, "flex", "1", "min-width", "140px", "margin-bottom", "0"], [1, "field", 2, "flex", "1", "min-width", "220px", "margin-bottom", "0"], [2, "display", "flex", "gap", "6px", "align-items", "flex-end"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "font-size", "12px", "color", "var(--error)"], [2, "max-width", "300px", "white-space", "pre-wrap", "word-break", "break-word"], [1, "desc-cell", 2, "max-width", "180px", 3, "title"], [1, "desc-clamp"], [2, "font-size", "11px", "white-space", "nowrap"], [2, "font-size", "11px"], [1, "tag", "tag-clickable"], [2, "color", "var(--text-muted)"], [1, "chip-list"], [3, "properties", "schema"], [2, "white-space", "nowrap"], [1, "icon-btn", 3, "click"], ["name", "eye", 3, "size"], [1, "inline-confirm"], [1, "icon-btn", "danger"], [1, "tag", "tag-clickable", 3, "click"], [1, "chip", 3, "title"], [1, "btn", "btn-sm", "btn-danger", 3, "click"], [1, "icon-btn", "danger", 3, "click"], [3, "message", "reason"], [1, "empty-state", 2, "padding", "32px"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "brain", 3, "size"], [1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], ["name", "arrow-left", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], [1, "pager-info"], ["name", "arrow-right", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"]], template: function MemoriesTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-record-search-bar", 1);
            i0.ɵɵlistener("valueChange", function MemoriesTabComponent_Template_app_record_search_bar_valueChange_1_listener($event) { return ctx.onMemorySearch($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "button", 2);
            i0.ɵɵlistener("click", function MemoriesTabComponent_Template_button_click_2_listener() { return ctx.openMemoryForm(); });
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(5, MemoriesTabComponent_Conditional_5_Template, 42, 36, "form", 3);
            i0.ɵɵconditionalCreate(6, MemoriesTabComponent_Conditional_6_Template, 2, 1, "div", 4);
            i0.ɵɵconditionalCreate(7, MemoriesTabComponent_Conditional_7_Template, 7, 8, "div", 5);
            i0.ɵɵelementStart(8, "div", 6)(9, "table")(10, "thead")(11, "tr")(12, "th", 7)(13, "input", 8);
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵlistener("ngModelChange", function MemoriesTabComponent_Template_input_ngModelChange_13_listener($event) { return ctx.setSearchFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(16, "th", 9)(17, "input", 8);
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵlistener("ngModelChange", function MemoriesTabComponent_Template_input_ngModelChange_17_listener($event) { return ctx.setDescriptionFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(20, "th", 10);
            i0.ɵɵlistener("sort", function MemoriesTabComponent_Template_th_sort_20_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(21, "select", 11);
            i0.ɵɵpipe(22, "transloco");
            i0.ɵɵlistener("ngModelChange", function MemoriesTabComponent_Template_select_ngModelChange_21_listener($event) { return ctx.setTypeFilter($event); });
            i0.ɵɵelementStart(23, "option", 12);
            i0.ɵɵtext(24);
            i0.ɵɵpipe(25, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(26, MemoriesTabComponent_For_27_Template, 2, 2, "option", 13, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(28, "th", 14)(29, "input", 8);
            i0.ɵɵpipe(30, "transloco");
            i0.ɵɵpipe(31, "transloco");
            i0.ɵɵlistener("ngModelChange", function MemoriesTabComponent_Template_input_ngModelChange_29_listener($event) { return ctx.setTagFilter($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(32, "datalist", 15);
            i0.ɵɵrepeaterCreate(33, MemoriesTabComponent_For_34_Template, 1, 1, "option", 13, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(35, "th", 16)(36, "input", 8);
            i0.ɵɵpipe(37, "transloco");
            i0.ɵɵpipe(38, "transloco");
            i0.ɵɵlistener("ngModelChange", function MemoriesTabComponent_Template_input_ngModelChange_36_listener($event) { return ctx.setNameFilter("entityName", $event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(39, "th", 17)(40, "input", 8);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵlistener("ngModelChange", function MemoriesTabComponent_Template_input_ngModelChange_40_listener($event) { return ctx.setPropertiesFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(43, "th", 18);
            i0.ɵɵlistener("sort", function MemoriesTabComponent_Template_th_sort_43_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelement(44, "th");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(45, "tbody");
            i0.ɵɵrepeaterCreate(46, MemoriesTabComponent_For_47_Template, 2, 1, null, null, _forTrack0, false, MemoriesTabComponent_ForEmpty_48_Template, 4, 1, "tr");
            i0.ɵɵelementEnd()()();
            i0.ɵɵconditionalCreate(49, MemoriesTabComponent_Conditional_49_Template, 11, 11, "div", 19);
        } if (rf & 2) {
            let tmp_5_0;
            i0.ɵɵadvance();
            i0.ɵɵproperty("value", ctx.store.memorySearch());
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.showMemoryForm());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 32, "brain.memories.addButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.showMemoryForm() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createMemoryError() ? 6 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_5_0 = ctx.filterEntity()) ? 7 : -1, tmp_5_0);
            i0.ɵɵadvance(6);
            i0.ɵɵproperty("ngModel", ctx.search())("placeholder", i0.ɵɵpipeBind1(14, 34, "brain.filter.searchPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(15, 36, "brain.filter.searchPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().description)("placeholder", i0.ɵɵpipeBind1(18, 38, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(19, 40, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.recordFilter().type);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(22, 42, "brain.filter.label"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 44, "brain.filter.allTypes"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.store.memoryTypeOptions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().tag)("placeholder", i0.ɵɵpipeBind1(30, 46, "brain.filter.tagPlaceholder"));
            i0.ɵɵattribute("list", ctx.tagListId)("aria-label", i0.ɵɵpipeBind1(31, 48, "brain.filter.tagPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("id", ctx.tagListId);
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.store.memoryTagSuggestions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().entityName)("placeholder", i0.ɵɵpipeBind1(37, 50, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(38, 52, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().properties)("placeholder", i0.ɵɵpipeBind1(41, 54, "brain.filter.propertiesPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(42, 56, "brain.filter.propertiesPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.store.memories());
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(!ctx.store.memorySearch().trim() ? 49 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.NgModel, i1.NgForm, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntityRefFieldComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent, TranslocoPipe], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }", ".content-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    \n\n\n\n    .content-header[_ngcontent-%COMP%]   app-entity-search[_ngcontent-%COMP%] {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; \n\n    }\n    \n\n\n    .list-filter-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    \n\n\n    .col-filter-select[_ngcontent-%COMP%], .col-filter-input[_ngcontent-%COMP%] {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select[_ngcontent-%COMP%] { min-width: 96px; }\n    .col-filter-input[_ngcontent-%COMP%] { min-width: 90px; }\n    .filter-chip[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable[_ngcontent-%COMP%], .entity-clickable[_ngcontent-%COMP%] {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable[_ngcontent-%COMP%]:hover, .entity-clickable[_ngcontent-%COMP%]:hover { opacity: 0.7; }\n    \n\n\n\n\n    .create-form[_ngcontent-%COMP%] { --brain-control-h: 34px; }\n    .create-form[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    \n\n\n\n\n\n\n    .create-form[_ngcontent-%COMP%]   .form-row[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form[_ngcontent-%COMP%]   .form-row.rich[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%] { flex: 1; min-width: 220px; }\n    .create-form[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    \n\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:not([type=checkbox]), .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { min-height: var(--brain-control-h); }\n    \n\n    .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { font-size: 11px; }\n    \n\n\n    .desc-cell[_ngcontent-%COMP%] {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell[_ngcontent-%COMP%]   .desc-clamp[_ngcontent-%COMP%] {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group[_ngcontent-%COMP%] { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child { border-right:none; }\n    .pill-group[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) { background:var(--bg-surface); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MemoriesTabComponent, [{
        type: Component,
        args: [{ selector: 'app-memories-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntityRefFieldComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent], template: `

          <div class="content-header">
            <app-record-search-bar
              [value]="store.memorySearch()" (valueChange)="onMemorySearch($event)"
              placeholder="brain.memories.searchPlaceholder" />
            <button class="btn-primary btn btn-sm" (click)="openMemoryForm()" [disabled]="showMemoryForm()">{{ 'brain.memories.addButton' | transloco }}</button>
          </div>

          <!-- Add memory form -->
          @if (showMemoryForm()) {
            <form class="create-form" (ngSubmit)="createMemory()">
              <!-- Field order matches the table columns: Fact, Description, tags, entities, properties.
                   Fact and Description are the two multiline fields and share one size (feedback). -->
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'common.form.fact' | transloco }}</label>
                  <textarea [(ngModel)]="memoryForm.fact" name="fact" rows="3" required></textarea>
                </div>
                <div class="field">
                  <label>{{ 'common.form.description' | transloco }}</label>
                  <textarea [(ngModel)]="memoryForm.description" name="description" rows="3"></textarea>
                </div>
              </div>
              <div class="form-row rich">
                <div class="field">
                  <!-- TYPE follows the SERVER, and which control appears depends on the space.
                       This was free text with suggestions on the stated reasoning that "the server does not
                       restrict it ... a <select> would be stricter than the API". That reasoning was correct
                       and is now inverted: since P-24 (owner, 2026-08-30) declaring typeSchemas.memory makes
                       those names the allowed set, exactly as for entities, edges and chrono. Keeping free
                       text in such a space would let the form submit a value the server refuses, which is the
                       same defect the other way round. A space declaring NO memory types is unrestricted, and
                       there the free-text control is still the right one. -->
                  <label>{{ 'common.form.type' | transloco }}</label>
                  @if (store.memoryTypesAreRestricted()) {
                    <select [(ngModel)]="memoryForm.type" name="memFormType">
                      <option value="">{{ 'brain.memories.form.typePlaceholder' | transloco }}</option>
                      @for (t of store.memoryAllowedTypes(); track t) { <option [value]="t">{{ t }}</option> }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="memoryForm.type" name="memFormType" list="memTypeOptions"
                           [placeholder]="'brain.memories.form.typePlaceholder' | transloco" />
                    <datalist id="memTypeOptions">
                      @for (t of store.memoryTypeOptions(); track t) { <option [value]="t"></option> }
                    </datalist>
                  }
                </div>
                <div class="field">
                  <label>{{ 'common.form.tags' | transloco }}</label>
                  <app-tag-input [(value)]="memoryForm.tags" [suggestions]="store.memoryTagSuggestions()" inputName="memFormTags" />
                </div>
                <div class="field">
                  <label>{{ 'common.form.entities' | transloco }}</label>
                  <app-entity-ref-field [target]="memoryForm" [spaceId]="spaceId()" />
                </div>
                <div class="field">
                  <label>{{ 'common.form.properties' | transloco }}</label>
                  <app-properties-editor [schema]="store.memorySchema()" [required]="store.requiredProps(store.memorySchema())" [(value)]="memoryForm.properties" />
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingMemory() || !memoryForm.fact.trim()">
                  @if (creatingMemory()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                  {{ 'common.save' | transloco }}
                </button>
                <button class="btn-secondary btn btn-sm" type="button" (click)="showMemoryForm.set(false)">{{ 'common.cancel' | transloco }}</button>
              </div>
            </form>
          }

          @if (createMemoryError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createMemoryError() }}</div>
          }

          <!-- Tag/type filtering now docks in the column headers (2b-ii). The active ENTITY filter —
               set by clicking an entity chip in a row — stays as an indicator chip here since it has
               no column of its own. -->
          @if (filterEntity(); as ent) {
            <div class="list-filter-row">
              <span class="filter-chip">{{ 'brain.filter.entityPrefix' | transloco }} {{ ent }} <button [attr.aria-label]="'brain.filter.clearEntityAriaLabel' | transloco" (click)="clearFilter('entity')"><ph-icon name="x" [size]="12"/></button></span>
            </div>
          }

          <div class="table-wrapper" hscrollTop>
            <table>
              <thead>
                <tr>
                  <th app-sort-th label="brain.memories.table.fact">
                    <input class="col-filter-input" type="text" [ngModel]="search()" (ngModelChange)="setSearchFilter($event)"
                      [placeholder]="'brain.filter.searchPlaceholder' | transloco" [attr.aria-label]="'brain.filter.searchPlaceholder' | transloco" />
                  </th><th app-sort-th label="brain.memories.table.description">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().description" (ngModelChange)="setDescriptionFilter($event)"
                      [placeholder]="'brain.filter.descriptionPlaceholder' | transloco" [attr.aria-label]="'brain.filter.descriptionPlaceholder' | transloco" />
                  </th><th app-sort-th field="type" label="brain.memories.table.type" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <select class="col-filter-select" [ngModel]="recordFilter().type" (ngModelChange)="setTypeFilter($event)" [attr.aria-label]="'brain.filter.label' | transloco">
                      <option value="">{{ 'brain.filter.allTypes' | transloco }}</option>
                      @for (t of store.memoryTypeOptions(); track t) { <option [value]="t">{{ t }}</option> }
                    </select>
                  </th><th app-sort-th label="brain.memories.table.tags">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().tag" (ngModelChange)="setTagFilter($event)"
                      [attr.list]="tagListId" [placeholder]="'brain.filter.tagPlaceholder' | transloco" [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco" />
                    <datalist [id]="tagListId">@for (s of store.memoryTagSuggestions(); track s) { <option [value]="s"></option> }</datalist>
                  </th>
                  <th app-sort-th label="brain.memories.table.entities">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().entityName" (ngModelChange)="setNameFilter('entityName', $event)"
                      [placeholder]="'brain.filter.entityNamePlaceholder' | transloco" [attr.aria-label]="'brain.filter.entityNamePlaceholder' | transloco" />
                  </th><th app-sort-th label="brain.memories.table.properties">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().properties" (ngModelChange)="setPropertiesFilter($event)"
                      [placeholder]="'brain.filter.propertiesPlaceholder' | transloco" [attr.aria-label]="'brain.filter.propertiesPlaceholder' | transloco" />
                  </th><th app-sort-th field="createdAt" label="brain.memories.table.created" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (mem of store.memories(); track mem._id) {
                  @if (recordList.editingId() === mem._id) {
                    <tr>
                      <td colspan="8">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="flex:2; min-width:200px; margin-bottom:0;">
                            <label>{{ 'common.form.fact' | transloco }}</label>
                            <textarea [(ngModel)]="editMemory.fact" name="editFact" rows="2" style="width:100%;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:160px; margin-bottom:0;">
                            <label>{{ 'common.form.description' | transloco }}</label>
                            <textarea [(ngModel)]="editMemory.description" name="editDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'common.form.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editMemory.tags" [suggestions]="store.memoryTagSuggestions()" inputName="memEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                            <label>{{ 'common.form.entities' | transloco }}</label>
                            <app-entity-ref-field [target]="editMemory" [spaceId]="spaceId()" />
                          </div>
                          <div class="field" style="flex:1; min-width:220px; margin-bottom:0;">
                            <label>{{ 'common.form.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.memorySchema()"
                              [required]="store.requiredProps(store.memorySchema())"
                              [(value)]="editMemory.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditMemory(mem._id)">
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
                      <td style="max-width:300px; white-space:pre-wrap; word-break:break-word;">{{ mem.fact }}</td>
                      <td class="desc-cell" style="max-width:180px;" [title]="mem.description ?? ''">
                        <div class="desc-clamp">{{ mem.description || '—' }}</div>
                      </td>
                      <td style="font-size:11px; white-space:nowrap;">{{ mem.type || '—' }}</td>
                      <td style="font-size:11px;">
                        @for (tag of (mem.tags ?? []); track tag) { <span class="tag tag-clickable" (click)="applyFilter('tag', tag)">{{ tag }}</span> }
                        @if (!(mem.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td style="font-size:11px;">
                        @if (mem.entityIds?.length) {
                          <div class="chip-list">
                            @for (id of mem.entityIds!; track id) {
                              <span class="chip" [title]="id">{{ picker.entityNameCache()[id] || id.slice(0,8) + '…' }}</span>
                            }
                          </div>
                        } @else { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td><app-properties-view [properties]="mem.properties" [schema]="store.memorySchema()" /></td>
                      <td><app-timestamp [value]="mem.createdAt"/></td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('memory', mem)"><ph-icon name="eye" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === mem._id) {
                          <span class="inline-confirm">
                            {{ 'common.deleteConfirm' | transloco }}
                            <button class="btn btn-sm btn-danger" (click)="deleteMemory(mem._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.title]="'brain.memories.deleteTitle' | transloco" [attr.aria-label]="'brain.memories.deleteAriaLabel' | transloco" (click)="requestDelete(mem._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="8">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadMemories' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="brain" [size]="48"/></div>
                      @if (store.memorySearch()) {
                        <h3>{{ 'common.noMatches' | transloco }}</h3>
                        <p>{{ 'brain.memories.empty.noMatchQuery' | transloco: { query: store.memorySearch() } }}</p>
                      } @else {
                        <h3>{{ 'brain.memories.empty.title' | transloco }}</h3>
                        <p>{{ 'brain.memories.empty.body' | transloco }}</p>
                      }
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (!store.memorySearch().trim()) {
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.memories().length ? (skip() + 1) + '–' + (skip() + store.memories().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.memories().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n", "\n    .content-header {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    /* The plain search input styles itself (record-search-bar.component.ts) and app-entity-search\n       matches that spec \u2014 see the note there. Both are capped to the same width here so the entities\n       bar and the other tabs' bars line up. */\n    .content-header app-entity-search {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; /* match the plain search input above (was 520 \u2014 the entities bar rendered wider) */\n    }\n    /* A slim row above the table, now only carrying the memories tab's active ENTITY-filter chip\n       (the type/tag filters moved into the headers in 2b-ii). */\n    .list-filter-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    /* Slice 2b-ii: filters dock UNDER each column label (via th[app-sort-th]'s projected slot).\n       These style the docked controls uniformly across every tab. */\n    .col-filter-select, .col-filter-input {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select { min-width: 96px; }\n    .col-filter-input { min-width: 90px; }\n    .filter-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip button {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable, .entity-clickable {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable:hover, .entity-clickable:hover { opacity: 0.7; }\n    /* Uniform control height across every brain form control. 34px matches app-tag-input's wrap \u2014\n       the tallest single-line control \u2014 so aligning to it lifts the plain inputs/selects up to a\n       shared height instead of leaving four different ones on the page (search 5/10, filter 30,\n       create 5/8, global 8/12). Single-line fields become identical; textarea/properties grow. */\n    .create-form { --brain-control-h: 34px; }\n    .create-form {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    /* The form is a vertical stack of .form-row blocks. Each tab composes its own rows in\n       table-column order: single-line fields (name/type/tags, from/to/label/weight) go in a plain\n       row at one uniform height; the tall fields (description then properties, or fact then\n       description) go in a .form-row.rich where each field flexes and grows, tops aligned. This makes\n       the feedback's \"same input height \u2026 description the current height as baseline but expands with\n       properties container\" a structure rather than a pile of per-field inline widths. */\n    .create-form .form-row {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form .form-row.rich > .field { flex: 1; min-width: 220px; }\n    .create-form .field { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form input, .create-form select, .create-form textarea {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    /* Single-line controls (and app-tag-input's wrap, already 34px) share the one height. */\n    .create-form input:not([type=checkbox]), .create-form select { min-height: var(--brain-control-h); }\n    /* Description starts at the single-line height as its baseline and grows from there. */\n    .create-form textarea { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm button { font-size: 11px; }\n    /* The td stays a real table cell so it fills its column; the 3-line clamp lives on an inner box\n       (setting display:-webkit-box on the td itself drops it out of table layout). */\n    .desc-cell {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell .desc-clamp {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group button { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group button:last-child { border-right:none; }\n    .pill-group button.active { background:var(--accent-dim); color:var(--accent); }\n    .pill-group button:hover:not(.active) { background:var(--bg-surface); }\n"] }]
    }], null, { mutated: [{ type: i0.Output, args: ["mutated"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(MemoriesTabComponent, { className: "MemoriesTabComponent", filePath: "app/pages/brain/memories-tab.component.ts", lineNumber: 266 }); })();
