import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { SortableHeaderComponent } from './sortable-header.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { TimestampComponent } from '../../shared/timestamp.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = () => [];
const _forTrack0 = ($index, $item) => $item._id;
function EntitiesTabComponent_Conditional_5_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 27);
    i0.ɵɵtext(1, "*");
    i0.ɵɵelementEnd();
} }
function EntitiesTabComponent_Conditional_5_Conditional_12_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 11);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r4 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r4);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r4);
} }
function EntitiesTabComponent_Conditional_5_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 40);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_Conditional_5_Conditional_12_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.entityForm.type, $event) || (ctx_r1.entityForm.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_Conditional_5_Conditional_12_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onEntityTypeChange($event, "create")); });
    i0.ɵɵrepeaterCreate(1, EntitiesTabComponent_Conditional_5_Conditional_12_For_2_Template, 2, 2, "option", 11, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.entityForm.type);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.entityTypeNames());
} }
function EntitiesTabComponent_Conditional_5_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 41);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_Conditional_5_Conditional_13_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.entityForm.type, $event) || (ctx_r1.entityForm.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.entityForm.type);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(1, 2, "brain.entities.form.typePlaceholder"));
} }
function EntitiesTabComponent_Conditional_5_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 38);
} }
function EntitiesTabComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 22);
    i0.ɵɵlistener("ngSubmit", function EntitiesTabComponent_Conditional_5_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.createEntity()); });
    i0.ɵɵelementStart(1, "div", 23)(2, "div", 24)(3, "label");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "input", 25);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_Conditional_5_Template_input_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.entityForm.name, $event) || (ctx_r1.entityForm.name = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 26)(8, "label");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵconditionalCreate(11, EntitiesTabComponent_Conditional_5_Conditional_11_Template, 2, 0, "span", 27);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(12, EntitiesTabComponent_Conditional_5_Conditional_12_Template, 3, 1, "select", 28)(13, EntitiesTabComponent_Conditional_5_Conditional_13_Template, 2, 4, "input", 29);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "div", 30)(15, "label");
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "app-tag-input", 31);
    i0.ɵɵtwoWayListener("valueChange", function EntitiesTabComponent_Conditional_5_Template_app_tag_input_valueChange_18_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.entityForm.tags, $event) || (ctx_r1.entityForm.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(19, "div", 32)(20, "div", 33)(21, "label");
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "textarea", 34);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_Conditional_5_Template_textarea_ngModelChange_24_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.entityForm.description, $event) || (ctx_r1.entityForm.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(25, "div", 33)(26, "label");
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "app-properties-editor", 35);
    i0.ɵɵtwoWayListener("valueChange", function EntitiesTabComponent_Conditional_5_Template_app_properties_editor_valueChange_29_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.entityForm.properties, $event) || (ctx_r1.entityForm.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(30, "div", 36)(31, "button", 37);
    i0.ɵɵconditionalCreate(32, EntitiesTabComponent_Conditional_5_Conditional_32_Template, 1, 0, "span", 38);
    i0.ɵɵtext(33);
    i0.ɵɵpipe(34, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(35, "button", 39);
    i0.ɵɵlistener("click", function EntitiesTabComponent_Conditional_5_Template_button_click_35_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showEntityForm.set(false)); });
    i0.ɵɵtext(36);
    i0.ɵɵpipe(37, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 18, "brain.entities.table.name"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.entityForm.name);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 20, "brain.entities.table.type"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.store.entityTypeNames().length ? 11 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.store.entityTypeNames().length ? 12 : 13);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 22, "brain.entities.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.entityForm.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.entityTagSuggestions());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 24, "brain.entities.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.entityForm.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 26, "brain.entities.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.entitySchema(ctx_r1.entityForm.type))("required", ctx_r1.store.requiredProps(ctx_r1.store.entitySchema(ctx_r1.entityForm.type)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.entityForm.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.creatingEntity() || !ctx_r1.entityForm.name.trim() || (ctx_r1.store.entityTypeNames().length ? !ctx_r1.entityForm.type : false));
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.creatingEntity() ? 32 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(34, 28, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 30, "common.cancel"));
} }
function EntitiesTabComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.createEntityError());
} }
function EntitiesTabComponent_For_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 11);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r6 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r6);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r6);
} }
function EntitiesTabComponent_For_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 11);
} if (rf & 2) {
    const s_r7 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r7);
} }
function EntitiesTabComponent_For_42_Conditional_0_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 27);
    i0.ɵɵtext(1, "*");
    i0.ɵɵelementEnd();
} }
function EntitiesTabComponent_For_42_Conditional_0_Conditional_12_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 11);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r11 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r11);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r11);
} }
function EntitiesTabComponent_For_42_Conditional_0_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 59);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_For_42_Conditional_0_Conditional_12_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.editEntity.type, $event) || (ctx_r1.editEntity.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_For_42_Conditional_0_Conditional_12_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.onEntityTypeChange($event, "inline")); });
    i0.ɵɵrepeaterCreate(1, EntitiesTabComponent_For_42_Conditional_0_Conditional_12_For_2_Template, 2, 2, "option", 11, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEntity.type);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.entityTypeNames());
} }
function EntitiesTabComponent_For_42_Conditional_0_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 60);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_For_42_Conditional_0_Conditional_13_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.editEntity.type, $event) || (ctx_r1.editEntity.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEntity.type);
} }
function EntitiesTabComponent_For_42_Conditional_0_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 56);
} }
function EntitiesTabComponent_For_42_Conditional_0_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 58);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.recordList.editError());
} }
function EntitiesTabComponent_For_42_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 42)(2, "div", 43)(3, "div", 44)(4, "label");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "input", 45);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_For_42_Conditional_0_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEntity.name, $event) || (ctx_r1.editEntity.name = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 46)(9, "label");
    i0.ɵɵtext(10, "Type ");
    i0.ɵɵconditionalCreate(11, EntitiesTabComponent_For_42_Conditional_0_Conditional_11_Template, 2, 0, "span", 27);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(12, EntitiesTabComponent_For_42_Conditional_0_Conditional_12_Template, 3, 1, "select", 47)(13, EntitiesTabComponent_For_42_Conditional_0_Conditional_13_Template, 1, 1, "input", 48);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "div", 49)(15, "label");
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "textarea", 50);
    i0.ɵɵtwoWayListener("ngModelChange", function EntitiesTabComponent_For_42_Conditional_0_Template_textarea_ngModelChange_18_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEntity.description, $event) || (ctx_r1.editEntity.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "div", 51)(20, "label");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "app-tag-input", 52);
    i0.ɵɵtwoWayListener("valueChange", function EntitiesTabComponent_For_42_Conditional_0_Template_app_tag_input_valueChange_23_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEntity.tags, $event) || (ctx_r1.editEntity.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "div", 53)(25, "label");
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "app-properties-editor", 35);
    i0.ɵɵtwoWayListener("valueChange", function EntitiesTabComponent_For_42_Conditional_0_Template_app_properties_editor_valueChange_28_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEntity.properties, $event) || (ctx_r1.editEntity.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(29, "div", 54)(30, "button", 55);
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_0_Template_button_click_30_listener() { i0.ɵɵrestoreView(_r9); const ent_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.saveEditEntity(ent_r13._id)); });
    i0.ɵɵconditionalCreate(31, EntitiesTabComponent_For_42_Conditional_0_Conditional_31_Template, 1, 0, "span", 56);
    i0.ɵɵtext(32, " Save ");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "button", 57);
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_0_Template_button_click_33_listener() { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.recordList.cancelEdit()); });
    i0.ɵɵtext(34);
    i0.ɵɵpipe(35, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(36, EntitiesTabComponent_For_42_Conditional_0_Conditional_36_Template, 2, 1, "div", 58);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 17, "brain.entities.table.name"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEntity.name);
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(ctx_r1.store.entityTypeNames().length ? 11 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.store.entityTypeNames().length ? 12 : 13);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 19, "brain.entities.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEntity.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 21, "brain.entities.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.editEntity.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.entityTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 23, "brain.entities.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.entitySchema(ctx_r1.editEntity.type))("required", ctx_r1.store.requiredProps(ctx_r1.store.entitySchema(ctx_r1.editEntity.type)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.editEntity.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.recordList.editSaving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.editSaving() ? 31 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(35, 25, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.editError() ? 36 : -1);
} }
function EntitiesTabComponent_For_42_Conditional_1_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 61);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ent_r13 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ent_r13.type);
} }
function EntitiesTabComponent_For_42_Conditional_1_For_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 65);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const tag_r15 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(tag_r15);
} }
function EntitiesTabComponent_For_42_Conditional_1_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 66);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function EntitiesTabComponent_For_42_Conditional_1_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 72);
    i0.ɵɵtext(1, " Delete? ");
    i0.ɵɵelementStart(2, "button", 74);
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_1_Conditional_25_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r16); const ent_r13 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.deleteEntity(ent_r13._id)); });
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 57);
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_1_Conditional_25_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelDelete()); });
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 2, "common.yes"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 4, "common.no"));
} }
function EntitiesTabComponent_For_42_Conditional_1_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 75);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_1_Conditional_26_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r17); const ent_r13 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.requestDelete(ent_r13._id)); });
    i0.ɵɵelement(2, "ph-icon", 76);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "brain.entities.deleteAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
} }
function EntitiesTabComponent_For_42_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵconditionalCreate(4, EntitiesTabComponent_For_42_Conditional_1_Conditional_4_Template, 2, 1, "span", 61);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "td", 62)(6, "div", 63);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "td", 64);
    i0.ɵɵrepeaterCreate(9, EntitiesTabComponent_For_42_Conditional_1_For_10_Template, 2, 1, "span", 65, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵconditionalCreate(11, EntitiesTabComponent_For_42_Conditional_1_Conditional_11_Template, 2, 0, "span", 66);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "td");
    i0.ɵɵelement(13, "app-properties-view", 67);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "td");
    i0.ɵɵelement(15, "app-timestamp", 11);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "td", 68)(17, "button", 69);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_1_Template_button_click_17_listener() { i0.ɵɵrestoreView(_r14); const ent_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.drawerState.open("entity", ent_r13)); });
    i0.ɵɵelement(20, "ph-icon", 70);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(21, "button", 69);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵlistener("click", function EntitiesTabComponent_For_42_Conditional_1_Template_button_click_21_listener() { i0.ɵɵrestoreView(_r14); const ent_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.viewInGraph.emit(ent_r13._id)); });
    i0.ɵɵelement(24, "ph-icon", 71);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(25, EntitiesTabComponent_For_42_Conditional_1_Conditional_25_Template, 8, 6, "span", 72)(26, EntitiesTabComponent_For_42_Conditional_1_Conditional_26_Template, 3, 4, "button", 73);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ent_r13 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ent_r13.name);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ent_r13.type ? 4 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", ent_r13.description ?? "");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ent_r13.description || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ent_r13.tags ?? i0.ɵɵpureFunction0(23, _c0));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!(ent_r13.tags == null ? null : ent_r13.tags.length) ? 11 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("properties", ent_r13.properties)("schema", ctx_r1.store.entitySchema(ent_r13.type));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", ent_r13.createdAt);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(18, 15, "common.viewDetails"))("aria-label", i0.ɵɵpipeBind1(19, 17, "common.viewDetails"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(22, 19, "common.viewInGraph"))("aria-label", i0.ɵɵpipeBind1(23, 21, "common.viewInGraph"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.confirmDeleteId() === ent_r13._id ? 25 : 26);
} }
function EntitiesTabComponent_For_42_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, EntitiesTabComponent_For_42_Conditional_0_Template, 37, 27, "tr")(1, EntitiesTabComponent_For_42_Conditional_1_Template, 27, 24, "tr");
} if (rf & 2) {
    const ent_r13 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.recordList.editingId() === ent_r13._id ? 0 : 1);
} }
function EntitiesTabComponent_ForEmpty_43_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 79);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function EntitiesTabComponent_ForEmpty_43_Conditional_2_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryCurrentTab()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "brain.error.loadEntities"))("reason", ctx_r1.recordList.loadError() ?? "");
} }
function EntitiesTabComponent_ForEmpty_43_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 78)(1, "div", 80);
    i0.ɵɵelement(2, "ph-icon", 81);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 2, "brain.entities.empty.title"));
} }
function EntitiesTabComponent_ForEmpty_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 42);
    i0.ɵɵconditionalCreate(2, EntitiesTabComponent_ForEmpty_43_Conditional_2_Template, 2, 4, "app-error-state", 77)(3, EntitiesTabComponent_ForEmpty_43_Conditional_3_Template, 6, 4, "div", 78);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.loadError() !== null ? 2 : 3);
} }
/**
 * The Entities record tab, extracted from BrainComponent (A17.9b-6e) following the memories pattern.
 * Owns the entity create form, the (drawer-superseded) inline edit, delete, and the tab's own
 * entity-search / type-tag filter / pagination + loader. Self-loads via an effect on the `spaceId`
 * input; create/delete emit `mutated` so the shell refreshes tab-count stats.
 *
 * Entity delta from memories: both create AND inline-edit strip empty optional properties via the
 * entity schema. Search: the top bar is the semantic-only `<app-entity-search>` finder
 * (`[showModeToggle]="false"`, 2b-iii-d) — typing drives its own dropdown; picking a result feeds the
 * name into the docked Name column freetext filter (the list's plain-text `?search=` path), so there
 * is no separate exact-`?name=` list filter. Plain substring list filtering is the column header.
 */
export class EntitiesTabComponent extends RecordTabBase {
    constructor() {
        super(...arguments);
        this.drawerState = inject(RecordDrawerState);
        this.brainApi = inject(BrainApi);
        this.route = inject(ActivatedRoute);
        /**
         * `?type=` seeds the type filter, so the Overview's data-model panel can link straight to "the entities
         * of this type" as a real URL.
         *
         * Read from the snapshot ONCE, not subscribed. A later navigation carrying a different `?type=` is not a
         * case worth serving: this tab unmounts when the user leaves it, so arriving here is always a fresh read.
         * Subscribing would additionally fight `resetOnSpaceChange`, which clears the filter deliberately — a
         * type filter must not survive a space change, because the same name can mean different things in two
         * spaces.
         */
        this.deepLinkedType = this.route.snapshot.queryParamMap.get('type') ?? undefined;
        /** Emitted after a create/delete so the shell can refresh the space's tab-count stats. */
        this.mutated = output();
        /**
         * "View in graph" — emits the entity id for the shell to open on the Graph tab.
         *
         * An output rather than a direct tab switch because this component does not own the tab strip, and
         * an event is what the Overview tiles and the Review tab already use to move the shell.
         */
        this.viewInGraph = output();
        this.showEntityForm = signal(false, ...(ngDevMode ? [{ debugName: "showEntityForm" }] : /* istanbul ignore next */ []));
        this.creatingEntity = signal(false, ...(ngDevMode ? [{ debugName: "creatingEntity" }] : /* istanbul ignore next */ []));
        this.createEntityError = signal('', ...(ngDevMode ? [{ debugName: "createEntityError" }] : /* istanbul ignore next */ []));
        this.entityForm = { name: '', type: '', tags: [], description: '', properties: {} };
        this.editEntity = { name: '', type: '', tags: [], description: '', properties: {} };
    }
    resetOnSpaceChange() {
        // The deep-linked type is applied HERE rather than in the constructor, because this is where the
        // filter's shape is defined — setting it earlier reads a signal the base class has not populated yet.
        //
        // Consumed once. It must not survive a space change: the same type name can mean different things in
        // two spaces, so carrying the filter across would silently show a filtered-empty list and look like the
        // space is empty. The tab unmounts when the user leaves it, so arriving here is always a fresh read of
        // the URL anyway.
        const type = this.deepLinkedType ?? '';
        this.deepLinkedType = undefined;
        this.recordFilter.set({ type, tag: '', description: '', properties: '', fromName: '', toName: '', entityName: '' });
    }
    load() {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        this.recordList.loading.set(true);
        this.recordList.loadError.set(null);
        const ef = {};
        if (this.recordFilter().type)
            ef.type = this.recordFilter().type;
        if (this.recordFilter().tag)
            ef.tag = this.recordFilter().tag;
        if (this.recordFilter().description)
            ef.description = this.recordFilter().description;
        if (this.recordFilter().properties)
            ef.properties = this.recordFilter().properties;
        this.brainApi.listEntities(spaceId, this.pageSize, this.skip(), ef, this.sortParam(), this.searchParam()).subscribe({
            next: ({ entities }) => { this.store.entities.set(entities); this.recordList.loading.set(false); },
            error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
        });
    }
    // The top bar is a SEMANTIC finder now (2b-iii-d): its A–Z half was removed since the docked Name
    // column freetext filter already does plain-text (substring `?search=`). Typing drives the bar's own
    // semantic dropdown; PICKING an entity feeds that name into the Name column filter so the list
    // narrows via the same server `?search=` as typing in the column would — no separate exact-`?name=`
    // list path (that was a redundant second name filter). Clearing the bar clears the column filter.
    onEntitySearchClear() {
        this.setSearchFilter('');
    }
    onEntitySearchPick(ent) {
        this.setSearchFilter(ent.name);
    }
    openEntityForm() {
        const firstType = Object.keys(this.store.spaceMeta()?.typeSchemas?.entity ?? {})[0] ?? '';
        this.entityForm = { name: '', type: firstType, tags: [], description: '', properties: this.store.buildPropertiesObject('entity', {}, firstType) };
        this.showEntityForm.set(true);
    }
    /** Called when the entity type dropdown changes. Rebuilds properties: keeps existing values, adds defaults for any new schema-required fields. */
    onEntityTypeChange(type, target) {
        if (target === 'create') {
            this.entityForm.properties = this.store.buildPropertiesObject('entity', this.entityForm.properties, type);
        }
        else {
            this.editEntity.properties = this.store.buildPropertiesObject('entity', this.editEntity.properties, type);
        }
    }
    createEntity() {
        if (!this.entityForm.name.trim())
            return;
        this.creatingEntity.set(true);
        this.createEntityError.set('');
        const body = { name: this.entityForm.name.trim() };
        if (this.entityForm.type.trim())
            body.type = this.entityForm.type.trim();
        if (this.entityForm.tags.length)
            body.tags = this.entityForm.tags;
        if (this.entityForm.description.trim())
            body.description = this.entityForm.description.trim();
        const props = this.store.stripEmptyOptionalProps(this.entityForm.properties, this.store.entitySchema(this.entityForm.type));
        if (Object.keys(props).length)
            body.properties = props;
        this.brainApi.createEntity(this.spaceId(), body).subscribe({
            next: () => {
                this.creatingEntity.set(false);
                this.showEntityForm.set(false);
                this.entityForm = { name: '', type: '', tags: [], description: '', properties: {} };
                this.mutated.emit();
                this.load();
            },
            error: (err) => { this.creatingEntity.set(false); this.createEntityError.set(fmtApiError(err, 'Failed to create entity')); },
        });
    }
    startEditEntity(ent) {
        this.recordList.editingId.set(ent._id);
        this.recordList.editError.set('');
        this.editEntity = {
            name: ent.name,
            type: ent.type ?? '',
            tags: ent.tags ?? [],
            description: ent.description ?? '',
            properties: this.store.buildPropertiesObject('entity', ent.properties ?? {}, ent.type),
        };
    }
    saveEditEntity(id) {
        this.recordList.editSaving.set(true);
        this.recordList.editError.set('');
        const entProps = this.store.stripEmptyOptionalProps(this.editEntity.properties, this.store.entitySchema(this.editEntity.type));
        this.brainApi.updateEntity(this.spaceId(), id, {
            name: this.editEntity.name.trim(),
            type: this.editEntity.type.trim(),
            tags: this.editEntity.tags,
            description: this.editEntity.description.trim(),
            ...(Object.keys(entProps).length ? { properties: entProps } : {}),
        }).subscribe({
            next: (updated) => {
                this.recordList.editSaving.set(false);
                this.recordList.editingId.set('');
                this.store.entities.update(list => list.map(e => e._id === id ? updated : e));
            },
            error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
        });
    }
    deleteEntity(id) {
        this.recordList.confirmDeleteId.set('');
        this.brainApi.deleteEntity(this.spaceId(), id).subscribe({
            next: () => { this.store.entities.update(list => list.filter(e => e._id !== id)); this.mutated.emit(); },
            error: () => { },
        });
    }
    static { this.ɵfac = /*@__PURE__*/ (() => { let ɵEntitiesTabComponent_BaseFactory; return function EntitiesTabComponent_Factory(__ngFactoryType__) { return (ɵEntitiesTabComponent_BaseFactory || (ɵEntitiesTabComponent_BaseFactory = i0.ɵɵgetInheritedFactory(EntitiesTabComponent)))(__ngFactoryType__ || EntitiesTabComponent); }; })(); }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: EntitiesTabComponent, selectors: [["app-entities-tab"]], outputs: { mutated: "mutated", viewInGraph: "viewInGraph" }, features: [i0.ɵɵInheritDefinitionFeature], decls: 55, vars: 63, consts: [[1, "content-header"], ["mode", "bar", "placeholder", "common.searchEntitiesPlaceholder", "defaultMode", "semantic", 3, "cleared", "selected", "spaceId", "showModeToggle"], [1, "btn-primary", "btn", "btn-sm", 3, "click", "disabled"], [1, "create-form"], [1, "alert", "alert-error", 2, "margin-bottom", "12px"], ["hscrollTop", "", 1, "table-wrapper"], ["app-sort-th", "", "field", "name", "label", "brain.entities.table.name", 3, "sort", "activeField", "dir"], ["type", "text", 1, "col-filter-input", 3, "ngModelChange", "ngModel", "placeholder"], ["app-sort-th", "", "field", "type", "label", "brain.entities.table.type", 3, "sort", "activeField", "dir"], [1, "col-filter-select", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["app-sort-th", "", "label", "brain.entities.table.description"], ["app-sort-th", "", "label", "brain.entities.table.tags"], [3, "id"], ["app-sort-th", "", "label", "brain.entities.table.properties"], ["app-sort-th", "", "field", "createdAt", "label", "brain.entities.table.created", 3, "sort", "activeField", "dir"], [1, "pagination"], [1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], ["name", "arrow-left", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], [1, "pager-info"], ["name", "arrow-right", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], [1, "create-form", 3, "ngSubmit"], [1, "form-row"], [1, "field", 2, "flex", "2", "min-width", "140px"], ["type", "text", "name", "name", "required", "", 3, "ngModelChange", "ngModel"], [1, "field", 2, "width", "150px"], [2, "color", "var(--error)"], ["name", "type", "required", "", 3, "ngModel"], ["type", "text", "name", "type", 3, "ngModel", "placeholder"], [1, "field", 2, "flex", "2", "min-width", "180px"], ["inputName", "entFormTags", 3, "valueChange", "value", "suggestions"], [1, "form-row", "rich"], [1, "field"], ["name", "description", "rows", "3", 3, "ngModelChange", "ngModel"], [3, "valueChange", "schema", "required", "value"], [2, "display", "flex", "gap", "8px"], ["type", "submit", 1, "btn-primary", "btn", "btn-sm", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], ["type", "button", 1, "btn-secondary", "btn", "btn-sm", 3, "click"], ["name", "type", "required", "", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "type", 3, "ngModelChange", "ngModel", "placeholder"], ["colspan", "7"], [1, "create-form", 2, "border", "none", "padding", "8px 0"], [1, "field", 2, "flex", "1", "min-width", "120px", "margin-bottom", "0"], ["type", "text", "name", "editEntName", 3, "ngModelChange", "ngModel"], [1, "field", 2, "width", "120px", "margin-bottom", "0"], ["name", "editEntType", 3, "ngModel"], ["type", "text", "name", "editEntType", 3, "ngModel"], [1, "field", 2, "flex", "1", "min-width", "160px", "margin-bottom", "0"], ["name", "editEntDesc", "rows", "2", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "180px", "margin-bottom", "0"], ["inputName", "entEditTags", 3, "valueChange", "value", "suggestions"], [1, "field", 2, "flex", "1", "min-width", "220px", "margin-bottom", "0"], [2, "display", "flex", "gap", "6px", "align-items", "flex-end"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "font-size", "12px", "color", "var(--error)"], ["name", "editEntType", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "editEntType", 3, "ngModelChange", "ngModel"], [1, "badge", "badge-purple"], [1, "desc-cell", 2, "max-width", "200px", 3, "title"], [1, "desc-clamp"], [2, "font-size", "11px"], [1, "tag"], [2, "color", "var(--text-muted)"], [3, "properties", "schema"], [2, "white-space", "nowrap"], [1, "icon-btn", 3, "click"], ["name", "eye", 3, "size"], ["name", "graph", 3, "size"], [1, "inline-confirm"], [1, "icon-btn", "danger"], [1, "btn", "btn-sm", "btn-danger", 3, "click"], [1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [3, "message", "reason"], [1, "empty-state", 2, "padding", "32px"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "tag", 3, "size"]], template: function EntitiesTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-entity-search", 1);
            i0.ɵɵlistener("cleared", function EntitiesTabComponent_Template_app_entity_search_cleared_1_listener() { return ctx.onEntitySearchClear(); })("selected", function EntitiesTabComponent_Template_app_entity_search_selected_1_listener($event) { return ctx.onEntitySearchPick($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "button", 2);
            i0.ɵɵlistener("click", function EntitiesTabComponent_Template_button_click_2_listener() { return ctx.openEntityForm(); });
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(5, EntitiesTabComponent_Conditional_5_Template, 38, 32, "form", 3);
            i0.ɵɵconditionalCreate(6, EntitiesTabComponent_Conditional_6_Template, 2, 1, "div", 4);
            i0.ɵɵelementStart(7, "div", 5)(8, "table")(9, "thead")(10, "tr")(11, "th", 6);
            i0.ɵɵlistener("sort", function EntitiesTabComponent_Template_th_sort_11_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(12, "input", 7);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_Template_input_ngModelChange_12_listener($event) { return ctx.setSearchFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(15, "th", 8);
            i0.ɵɵlistener("sort", function EntitiesTabComponent_Template_th_sort_15_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(16, "select", 9);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_Template_select_ngModelChange_16_listener($event) { return ctx.setTypeFilter($event); });
            i0.ɵɵelementStart(18, "option", 10);
            i0.ɵɵtext(19);
            i0.ɵɵpipe(20, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(21, EntitiesTabComponent_For_22_Template, 2, 2, "option", 11, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(23, "th", 12)(24, "input", 7);
            i0.ɵɵpipe(25, "transloco");
            i0.ɵɵpipe(26, "transloco");
            i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_Template_input_ngModelChange_24_listener($event) { return ctx.setDescriptionFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(27, "th", 13)(28, "input", 7);
            i0.ɵɵpipe(29, "transloco");
            i0.ɵɵpipe(30, "transloco");
            i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_Template_input_ngModelChange_28_listener($event) { return ctx.setTagFilter($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(31, "datalist", 14);
            i0.ɵɵrepeaterCreate(32, EntitiesTabComponent_For_33_Template, 1, 1, "option", 11, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(34, "th", 15)(35, "input", 7);
            i0.ɵɵpipe(36, "transloco");
            i0.ɵɵpipe(37, "transloco");
            i0.ɵɵlistener("ngModelChange", function EntitiesTabComponent_Template_input_ngModelChange_35_listener($event) { return ctx.setPropertiesFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(38, "th", 16);
            i0.ɵɵlistener("sort", function EntitiesTabComponent_Template_th_sort_38_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelement(39, "th");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(40, "tbody");
            i0.ɵɵrepeaterCreate(41, EntitiesTabComponent_For_42_Template, 2, 1, null, null, _forTrack0, false, EntitiesTabComponent_ForEmpty_43_Template, 4, 1, "tr");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(44, "div", 17)(45, "button", 18);
            i0.ɵɵlistener("click", function EntitiesTabComponent_Template_button_click_45_listener() { return ctx.prevPage(); });
            i0.ɵɵelement(46, "ph-icon", 19);
            i0.ɵɵtext(47);
            i0.ɵɵpipe(48, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(49, "span", 20);
            i0.ɵɵtext(50);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(51, "button", 18);
            i0.ɵɵlistener("click", function EntitiesTabComponent_Template_button_click_51_listener() { return ctx.nextPage(); });
            i0.ɵɵtext(52);
            i0.ɵɵpipe(53, "transloco");
            i0.ɵɵelement(54, "ph-icon", 21);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("spaceId", ctx.spaceId())("showModeToggle", false);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.showEntityForm());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 37, "brain.entities.addButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.showEntityForm() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createEntityError() ? 6 : -1);
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.search())("placeholder", i0.ɵɵpipeBind1(13, 39, "brain.filter.searchPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(14, 41, "brain.filter.searchPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.recordFilter().type);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(17, 43, "brain.filter.label"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 45, "brain.filter.allTypes"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.store.entityTypeOptions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().description)("placeholder", i0.ɵɵpipeBind1(25, 47, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(26, 49, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().tag)("placeholder", i0.ɵɵpipeBind1(29, 51, "brain.filter.tagPlaceholder"));
            i0.ɵɵattribute("list", ctx.tagListId)("aria-label", i0.ɵɵpipeBind1(30, 53, "brain.filter.tagPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("id", ctx.tagListId);
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.store.entityTagSuggestions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().properties)("placeholder", i0.ɵɵpipeBind1(36, 55, "brain.filter.propertiesPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(37, 57, "brain.filter.propertiesPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.store.entities());
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("disabled", ctx.skip() === 0);
            i0.ɵɵadvance();
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(48, 59, "common.prev"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.store.entities().length ? ctx.skip() + 1 + "\u2013" + (ctx.skip() + ctx.store.entities().length) : "\u2013");
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.store.entities().length < ctx.pageSize);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(53, 61, "common.next"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.NgModel, i1.NgForm, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent, TranslocoPipe], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }", ".content-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    \n\n\n\n    .content-header[_ngcontent-%COMP%]   app-entity-search[_ngcontent-%COMP%] {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; \n\n    }\n    \n\n\n    .list-filter-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    \n\n\n    .col-filter-select[_ngcontent-%COMP%], .col-filter-input[_ngcontent-%COMP%] {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select[_ngcontent-%COMP%] { min-width: 96px; }\n    .col-filter-input[_ngcontent-%COMP%] { min-width: 90px; }\n    .filter-chip[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable[_ngcontent-%COMP%], .entity-clickable[_ngcontent-%COMP%] {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable[_ngcontent-%COMP%]:hover, .entity-clickable[_ngcontent-%COMP%]:hover { opacity: 0.7; }\n    \n\n\n\n\n    .create-form[_ngcontent-%COMP%] { --brain-control-h: 34px; }\n    .create-form[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    \n\n\n\n\n\n\n    .create-form[_ngcontent-%COMP%]   .form-row[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form[_ngcontent-%COMP%]   .form-row.rich[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%] { flex: 1; min-width: 220px; }\n    .create-form[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    \n\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:not([type=checkbox]), .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { min-height: var(--brain-control-h); }\n    \n\n    .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { font-size: 11px; }\n    \n\n\n    .desc-cell[_ngcontent-%COMP%] {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell[_ngcontent-%COMP%]   .desc-clamp[_ngcontent-%COMP%] {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group[_ngcontent-%COMP%] { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child { border-right:none; }\n    .pill-group[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) { background:var(--bg-surface); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EntitiesTabComponent, [{
        type: Component,
        args: [{ selector: 'app-entities-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent], template: `

          <div class="content-header">
            <app-entity-search
              mode="bar"
              [spaceId]="spaceId()"
              placeholder="common.searchEntitiesPlaceholder"
              defaultMode="semantic"
              [showModeToggle]="false"
              (cleared)="onEntitySearchClear()"
              (selected)="onEntitySearchPick($event)"
            />
            <button class="btn-primary btn btn-sm" (click)="openEntityForm()" [disabled]="showEntityForm()">{{ 'brain.entities.addButton' | transloco }}</button>
          </div>

          @if (showEntityForm()) {
            <form class="create-form" (ngSubmit)="createEntity()">
              <!-- Row 1: single-line fields, one uniform height (name, type, tags). -->
              <div class="form-row">
                <div class="field" style="flex:2; min-width:140px;">
                  <label>{{ 'brain.entities.table.name' | transloco }}</label>
                  <input type="text" [(ngModel)]="entityForm.name" name="name" required />
                </div>
                <div class="field" style="width:150px;">
                  <label>{{ 'brain.entities.table.type' | transloco }} @if (store.entityTypeNames().length) { <span style="color:var(--error)">*</span> }</label>
                  @if (store.entityTypeNames().length) {
                    <select [(ngModel)]="entityForm.type" name="type" required (ngModelChange)="onEntityTypeChange($event, 'create')">
                      @for (t of store.entityTypeNames(); track t) {
                        <option [value]="t">{{ t }}</option>
                      }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="entityForm.type" name="type" [placeholder]="'brain.entities.form.typePlaceholder' | transloco" />
                  }
                </div>
                <div class="field" style="flex:2; min-width:180px;">
                  <label>{{ 'brain.entities.table.tags' | transloco }}</label>
                  <app-tag-input [(value)]="entityForm.tags" [suggestions]="store.entityTagSuggestions()" inputName="entFormTags" />
                </div>
              </div>
              <!-- Row 2: the tall fields, tops aligned, each grows (description | properties). -->
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'brain.entities.table.description' | transloco }}</label>
                  <textarea [(ngModel)]="entityForm.description" name="description" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>{{ 'brain.entities.table.properties' | transloco }}</label>
                  <app-properties-editor
                    [schema]="store.entitySchema(entityForm.type)"
                    [required]="store.requiredProps(store.entitySchema(entityForm.type))"
                    [(value)]="entityForm.properties"
                  />
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingEntity() || !entityForm.name.trim() || (store.entityTypeNames().length ? !entityForm.type : false)">
                  @if (creatingEntity()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                  {{ 'common.save' | transloco }}
                </button>
                <button class="btn-secondary btn btn-sm" type="button" (click)="showEntityForm.set(false)">{{ 'common.cancel' | transloco }}</button>
              </div>
            </form>
          }

          @if (createEntityError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createEntityError() }}</div>
          }

          <div class="table-wrapper" hscrollTop>
            <table>
              <thead>
                <tr>
                  <th app-sort-th field="name" label="brain.entities.table.name" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <input class="col-filter-input" type="text" [ngModel]="search()" (ngModelChange)="setSearchFilter($event)"
                      [placeholder]="'brain.filter.searchPlaceholder' | transloco" [attr.aria-label]="'brain.filter.searchPlaceholder' | transloco" />
                  </th>
                  <th app-sort-th field="type" label="brain.entities.table.type" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <select class="col-filter-select" [ngModel]="recordFilter().type" (ngModelChange)="setTypeFilter($event)" [attr.aria-label]="'brain.filter.label' | transloco">
                      <option value="">{{ 'brain.filter.allTypes' | transloco }}</option>
                      @for (t of store.entityTypeOptions(); track t) { <option [value]="t">{{ t }}</option> }
                    </select>
                  </th>
                  <th app-sort-th label="brain.entities.table.description">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().description" (ngModelChange)="setDescriptionFilter($event)"
                      [placeholder]="'brain.filter.descriptionPlaceholder' | transloco" [attr.aria-label]="'brain.filter.descriptionPlaceholder' | transloco" />
                  </th>
                  <th app-sort-th label="brain.entities.table.tags">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().tag" (ngModelChange)="setTagFilter($event)"
                      [attr.list]="tagListId" [placeholder]="'brain.filter.tagPlaceholder' | transloco" [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco" />
                    <datalist [id]="tagListId">@for (s of store.entityTagSuggestions(); track s) { <option [value]="s"></option> }</datalist>
                  </th>
                  <th app-sort-th label="brain.entities.table.properties">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().properties" (ngModelChange)="setPropertiesFilter($event)"
                      [placeholder]="'brain.filter.propertiesPlaceholder' | transloco" [attr.aria-label]="'brain.filter.propertiesPlaceholder' | transloco" />
                  </th>
                  <th app-sort-th field="createdAt" label="brain.entities.table.created" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (ent of store.entities(); track ent._id) {
                  @if (recordList.editingId() === ent._id) {
                    <tr>
                      <td colspan="7">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="flex:1; min-width:120px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.name' | transloco }}</label>
                            <input type="text" [(ngModel)]="editEntity.name" name="editEntName" />
                          </div>
                          <div class="field" style="width:120px; margin-bottom:0;">
                            <label>Type @if (store.entityTypeNames().length) { <span style="color:var(--error)">*</span> }</label>
                            @if (store.entityTypeNames().length) {
                              <select [(ngModel)]="editEntity.type" name="editEntType" (ngModelChange)="onEntityTypeChange($event, 'inline')">
                                @for (t of store.entityTypeNames(); track t) {
                                  <option [value]="t">{{ t }}</option>
                                }
                              </select>
                            } @else {
                              <input type="text" [(ngModel)]="editEntity.type" name="editEntType" />
                            }
                          </div>
                          <div class="field" style="flex:1; min-width:160px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.description' | transloco }}</label>
                            <textarea [(ngModel)]="editEntity.description" name="editEntDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editEntity.tags" [suggestions]="store.entityTagSuggestions()" inputName="entEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:220px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.entitySchema(editEntity.type)"
                              [required]="store.requiredProps(store.entitySchema(editEntity.type))"
                              [(value)]="editEntity.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditEntity(ent._id)">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } Save
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (recordList.editError()) { <div style="font-size:12px; color:var(--error);">{{ recordList.editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td>{{ ent.name }}</td>
                      <td>
                        @if (ent.type) { <span class="badge badge-purple">{{ ent.type }}</span> }
                      </td>
                      <td class="desc-cell" style="max-width:200px;" [title]="ent.description ?? ''">
                        <div class="desc-clamp">{{ ent.description || '—' }}</div>
                      </td>
                      <td style="font-size:11px;">
                        @for (tag of (ent.tags ?? []); track tag) { <span class="tag">{{ tag }}</span> }
                        @if (!(ent.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td><app-properties-view [properties]="ent.properties" [schema]="store.entitySchema(ent.type)" /></td>
                      <td><app-timestamp [value]="ent.createdAt"/></td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('entity', ent)"><ph-icon name="eye" [size]="16"/></button>
                        <button class="icon-btn" [attr.title]="'common.viewInGraph' | transloco" [attr.aria-label]="'common.viewInGraph' | transloco" (click)="viewInGraph.emit(ent._id)"><ph-icon name="graph" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === ent._id) {
                          <span class="inline-confirm">
                            Delete?
                            <button class="btn btn-sm btn-danger" (click)="deleteEntity(ent._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.aria-label]="'brain.entities.deleteAriaLabel' | transloco" (click)="requestDelete(ent._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="7">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadEntities' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="tag" [size]="48"/></div>
                      <h3>{{ 'brain.entities.empty.title' | transloco }}</h3>
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
            <span class="pager-info">{{ store.entities().length ? (skip() + 1) + '–' + (skip() + store.entities().length) : '–' }}</span>
            <button class="btn btn-sm btn-secondary" [disabled]="store.entities().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
          </div>
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n", "\n    .content-header {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    /* The plain search input styles itself (record-search-bar.component.ts) and app-entity-search\n       matches that spec \u2014 see the note there. Both are capped to the same width here so the entities\n       bar and the other tabs' bars line up. */\n    .content-header app-entity-search {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; /* match the plain search input above (was 520 \u2014 the entities bar rendered wider) */\n    }\n    /* A slim row above the table, now only carrying the memories tab's active ENTITY-filter chip\n       (the type/tag filters moved into the headers in 2b-ii). */\n    .list-filter-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    /* Slice 2b-ii: filters dock UNDER each column label (via th[app-sort-th]'s projected slot).\n       These style the docked controls uniformly across every tab. */\n    .col-filter-select, .col-filter-input {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select { min-width: 96px; }\n    .col-filter-input { min-width: 90px; }\n    .filter-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip button {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable, .entity-clickable {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable:hover, .entity-clickable:hover { opacity: 0.7; }\n    /* Uniform control height across every brain form control. 34px matches app-tag-input's wrap \u2014\n       the tallest single-line control \u2014 so aligning to it lifts the plain inputs/selects up to a\n       shared height instead of leaving four different ones on the page (search 5/10, filter 30,\n       create 5/8, global 8/12). Single-line fields become identical; textarea/properties grow. */\n    .create-form { --brain-control-h: 34px; }\n    .create-form {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    /* The form is a vertical stack of .form-row blocks. Each tab composes its own rows in\n       table-column order: single-line fields (name/type/tags, from/to/label/weight) go in a plain\n       row at one uniform height; the tall fields (description then properties, or fact then\n       description) go in a .form-row.rich where each field flexes and grows, tops aligned. This makes\n       the feedback's \"same input height \u2026 description the current height as baseline but expands with\n       properties container\" a structure rather than a pile of per-field inline widths. */\n    .create-form .form-row {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form .form-row.rich > .field { flex: 1; min-width: 220px; }\n    .create-form .field { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form input, .create-form select, .create-form textarea {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    /* Single-line controls (and app-tag-input's wrap, already 34px) share the one height. */\n    .create-form input:not([type=checkbox]), .create-form select { min-height: var(--brain-control-h); }\n    /* Description starts at the single-line height as its baseline and grows from there. */\n    .create-form textarea { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm button { font-size: 11px; }\n    /* The td stays a real table cell so it fills its column; the 3-line clamp lives on an inner box\n       (setting display:-webkit-box on the td itself drops it out of table layout). */\n    .desc-cell {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell .desc-clamp {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group button { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group button:last-child { border-right:none; }\n    .pill-group button.active { background:var(--accent-dim); color:var(--accent); }\n    .pill-group button:hover:not(.active) { background:var(--bg-surface); }\n"] }]
    }], null, { mutated: [{ type: i0.Output, args: ["mutated"] }], viewInGraph: [{ type: i0.Output, args: ["viewInGraph"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(EntitiesTabComponent, { className: "EntitiesTabComponent", filePath: "app/pages/brain/entities-tab.component.ts", lineNumber: 241 }); })();
