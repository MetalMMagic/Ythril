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
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { SortableHeaderComponent } from './sortable-header.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
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
function EdgesTabComponent_Conditional_5_Conditional_13_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const l_r4 = ctx.$implicit;
    i0.ɵɵproperty("value", l_r4);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(l_r4);
} }
function EdgesTabComponent_Conditional_5_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 40);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_Conditional_5_Conditional_13_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.edgeForm.label, $event) || (ctx_r1.edgeForm.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(1, EdgesTabComponent_Conditional_5_Conditional_13_For_2_Template, 2, 2, "option", 14, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.edgeForm.label);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.edgeLabelNames());
} }
function EdgesTabComponent_Conditional_5_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 41);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_Conditional_5_Conditional_14_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.edgeForm.label, $event) || (ctx_r1.edgeForm.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.edgeForm.label);
} }
function EdgesTabComponent_Conditional_5_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 38);
} }
function EdgesTabComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 21);
    i0.ɵɵlistener("ngSubmit", function EdgesTabComponent_Conditional_5_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.createEdge()); });
    i0.ɵɵelementStart(1, "div", 22)(2, "div", 23)(3, "label");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "app-entity-search", 24);
    i0.ɵɵlistener("selected", function EdgesTabComponent_Conditional_5_Template_app_entity_search_selected_6_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.pickEdgeFrom($event)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 23)(8, "label");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementStart(11, "span", 25);
    i0.ɵɵtext(12, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(13, EdgesTabComponent_Conditional_5_Conditional_13_Template, 3, 1, "select", 26)(14, EdgesTabComponent_Conditional_5_Conditional_14_Template, 1, 1, "input", 27);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "div", 23)(16, "label");
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "app-entity-search", 24);
    i0.ɵɵlistener("selected", function EdgesTabComponent_Conditional_5_Template_app_entity_search_selected_19_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.pickEdgeTo($event)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(20, "div", 28)(21, "label");
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "input", 29);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_Conditional_5_Template_input_ngModelChange_24_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.edgeForm.weight, $event) || (ctx_r1.edgeForm.weight = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(25, "div", 30)(26, "label");
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "app-tag-input", 31);
    i0.ɵɵtwoWayListener("valueChange", function EdgesTabComponent_Conditional_5_Template_app_tag_input_valueChange_29_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.edgeForm.tags, $event) || (ctx_r1.edgeForm.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(30, "div", 32)(31, "div", 33)(32, "label");
    i0.ɵɵtext(33);
    i0.ɵɵpipe(34, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(35, "textarea", 34);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_Conditional_5_Template_textarea_ngModelChange_35_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.edgeForm.description, $event) || (ctx_r1.edgeForm.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(36, "div", 33)(37, "label");
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(40, "app-properties-editor", 35);
    i0.ɵɵtwoWayListener("valueChange", function EdgesTabComponent_Conditional_5_Template_app_properties_editor_valueChange_40_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.edgeForm.properties, $event) || (ctx_r1.edgeForm.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(41, "div", 36)(42, "button", 37);
    i0.ɵɵconditionalCreate(43, EdgesTabComponent_Conditional_5_Conditional_43_Template, 1, 0, "span", 38);
    i0.ɵɵtext(44);
    i0.ɵɵpipe(45, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(46, "button", 39);
    i0.ɵɵlistener("click", function EdgesTabComponent_Conditional_5_Template_button_click_46_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showEdgeForm.set(false)); });
    i0.ɵɵtext(47);
    i0.ɵɵpipe(48, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 23, "common.form.from"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("spaceId", ctx_r1.spaceId())("value", ctx_r1.edgeForm.fromDisplay);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 25, "brain.edges.form.relation"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(ctx_r1.store.edgeLabelNames().length ? 13 : 14);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 27, "common.form.to"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("spaceId", ctx_r1.spaceId())("value", ctx_r1.edgeForm.toDisplay);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 29, "common.form.weight"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.edgeForm.weight);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 31, "brain.edges.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.edgeForm.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.edgeTagSuggestions());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(34, 33, "brain.edges.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.edgeForm.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 35, "brain.edges.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.edgeSchema(ctx_r1.edgeForm.label))("required", ctx_r1.store.requiredProps(ctx_r1.store.edgeSchema(ctx_r1.edgeForm.label)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.edgeForm.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.creatingEdge() || !ctx_r1.edgeForm.from.trim() || !ctx_r1.edgeForm.to.trim() || !ctx_r1.edgeForm.label.trim());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.creatingEdge() ? 43 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(45, 37, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(48, 39, "common.cancel"));
} }
function EdgesTabComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.createEdgeError());
} }
function EdgesTabComponent_For_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r6 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r6);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r6);
} }
function EdgesTabComponent_For_38_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 14);
} if (rf & 2) {
    const s_r7 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r7);
} }
function EdgesTabComponent_For_51_Conditional_0_Conditional_13_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const l_r11 = ctx.$implicit;
    i0.ɵɵproperty("value", l_r11);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(l_r11);
} }
function EdgesTabComponent_For_51_Conditional_0_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 63);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_For_51_Conditional_0_Conditional_13_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.editEdge.label, $event) || (ctx_r1.editEdge.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(1, EdgesTabComponent_For_51_Conditional_0_Conditional_13_For_2_Template, 2, 2, "option", 14, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEdge.label);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.edgeLabelNames());
} }
function EdgesTabComponent_For_51_Conditional_0_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 64);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_For_51_Conditional_0_Conditional_14_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.editEdge.label, $event) || (ctx_r1.editEdge.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEdge.label);
} }
function EdgesTabComponent_For_51_Conditional_0_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 60);
} }
function EdgesTabComponent_For_51_Conditional_0_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 62);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.recordList.editError());
} }
function EdgesTabComponent_For_51_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 43)(2, "div", 44)(3, "div", 45)(4, "label", 46);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 47);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "div", 48)(10, "label");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(13, EdgesTabComponent_For_51_Conditional_0_Conditional_13_Template, 3, 1, "select", 49)(14, EdgesTabComponent_For_51_Conditional_0_Conditional_14_Template, 1, 1, "input", 50);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "div", 51)(16, "label");
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "input", 52);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_For_51_Conditional_0_Template_input_ngModelChange_19_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEdge.weight, $event) || (ctx_r1.editEdge.weight = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(20, "div", 53)(21, "label");
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "textarea", 54);
    i0.ɵɵtwoWayListener("ngModelChange", function EdgesTabComponent_For_51_Conditional_0_Template_textarea_ngModelChange_24_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEdge.description, $event) || (ctx_r1.editEdge.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(25, "div", 55)(26, "label");
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "app-tag-input", 56);
    i0.ɵɵtwoWayListener("valueChange", function EdgesTabComponent_For_51_Conditional_0_Template_app_tag_input_valueChange_29_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEdge.tags, $event) || (ctx_r1.editEdge.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(30, "div", 57)(31, "label");
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "app-properties-editor", 35);
    i0.ɵɵtwoWayListener("valueChange", function EdgesTabComponent_For_51_Conditional_0_Template_app_properties_editor_valueChange_34_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.editEdge.properties, $event) || (ctx_r1.editEdge.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(35, "div", 58)(36, "button", 59);
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_0_Template_button_click_36_listener() { i0.ɵɵrestoreView(_r9); const edge_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.saveEditEdge(edge_r13._id)); });
    i0.ɵɵconditionalCreate(37, EdgesTabComponent_For_51_Conditional_0_Conditional_37_Template, 1, 0, "span", 60);
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(40, "button", 61);
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_0_Template_button_click_40_listener() { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.recordList.cancelEdit()); });
    i0.ɵɵtext(41);
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(43, EdgesTabComponent_For_51_Conditional_0_Conditional_43_Template, 2, 1, "div", 62);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 21, "brain.edges.form.editingLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2(" ", ctx_r1.editEdge.fromName || ctx_r1.editEdge.from, " \u2192 ", ctx_r1.editEdge.toName || ctx_r1.editEdge.to, " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 23, "brain.edges.form.relation"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.store.edgeLabelNames().length ? 13 : 14);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 25, "common.form.weight"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEdge.weight);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 27, "brain.edges.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editEdge.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 29, "brain.edges.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.editEdge.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.edgeTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 31, "brain.edges.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.edgeSchema(ctx_r1.editEdge.label))("required", ctx_r1.store.requiredProps(ctx_r1.store.edgeSchema(ctx_r1.editEdge.label)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.editEdge.properties);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.recordList.editSaving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.editSaving() ? 37 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(39, 33, "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 35, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.editError() ? 43 : -1);
} }
function EdgesTabComponent_For_51_Conditional_1_For_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 70);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const tag_r15 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(tag_r15);
} }
function EdgesTabComponent_For_51_Conditional_1_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 67);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵelementEnd();
} }
function EdgesTabComponent_For_51_Conditional_1_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 77);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "button", 79);
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_1_Conditional_31_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r16); const edge_r13 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.deleteEdge(edge_r13._id)); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "button", 61);
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_1_Conditional_31_Template_button_click_6_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelDelete()); });
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
function EdgesTabComponent_For_51_Conditional_1_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 80);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_1_Conditional_32_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r17); const edge_r13 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.requestDelete(edge_r13._id)); });
    i0.ɵɵelement(2, "ph-icon", 81);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "brain.edges.deleteAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
} }
function EdgesTabComponent_For_51_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 42)(1, "td", 65);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td")(4, "span", 66);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "td", 65);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "td", 67);
    i0.ɵɵtext(9);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "td", 68);
    i0.ɵɵtext(11);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "td", 69);
    i0.ɵɵrepeaterCreate(13, EdgesTabComponent_For_51_Conditional_1_For_14_Template, 2, 1, "span", 70, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵconditionalCreate(15, EdgesTabComponent_For_51_Conditional_1_Conditional_15_Template, 2, 0, "span", 67);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "td", 71);
    i0.ɵɵtext(17);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "td");
    i0.ɵɵelement(19, "app-properties-view", 72);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "td");
    i0.ɵɵelement(21, "app-timestamp", 14);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "td", 73)(23, "button", 74);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_1_Template_button_click_23_listener() { i0.ɵɵrestoreView(_r14); const edge_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.viewInGraph.emit(edge_r13.from)); });
    i0.ɵɵelement(26, "ph-icon", 75);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "button", 74);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵpipe(29, "transloco");
    i0.ɵɵlistener("click", function EdgesTabComponent_For_51_Conditional_1_Template_button_click_27_listener() { i0.ɵɵrestoreView(_r14); const edge_r13 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.drawerState.open("edge", edge_r13)); });
    i0.ɵɵelement(30, "ph-icon", 76);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(31, EdgesTabComponent_For_51_Conditional_1_Conditional_31_Template, 9, 9, "span", 77)(32, EdgesTabComponent_For_51_Conditional_1_Conditional_32_Template, 3, 4, "button", 78);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const edge_r13 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(edge_r13.fromName || edge_r13.from);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(edge_r13.label);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(edge_r13.toName || edge_r13.to);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(edge_r13.weight ?? "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(edge_r13.type || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(edge_r13.tags ?? i0.ɵɵpureFunction0(25, _c0));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!(edge_r13.tags == null ? null : edge_r13.tags.length) ? 15 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", edge_r13.description || "\u2014", " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("properties", edge_r13.properties)("schema", ctx_r1.store.edgeSchema(edge_r13.label));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", edge_r13.createdAt);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(24, 17, "common.viewInGraph"))("aria-label", i0.ɵɵpipeBind1(25, 19, "common.viewInGraph"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(28, 21, "common.viewDetails"))("aria-label", i0.ɵɵpipeBind1(29, 23, "common.viewDetails"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.recordList.confirmDeleteId() === edge_r13._id ? 31 : 32);
} }
function EdgesTabComponent_For_51_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, EdgesTabComponent_For_51_Conditional_0_Template, 44, 37, "tr")(1, EdgesTabComponent_For_51_Conditional_1_Template, 33, 26, "tr", 42);
} if (rf & 2) {
    const edge_r13 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.recordList.editingId() === edge_r13._id ? 0 : 1);
} }
function EdgesTabComponent_ForEmpty_52_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 84);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function EdgesTabComponent_ForEmpty_52_Conditional_2_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryCurrentTab()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "brain.error.loadEdges"))("reason", ctx_r1.recordList.loadError() ?? "");
} }
function EdgesTabComponent_ForEmpty_52_Conditional_3_Conditional_3_Template(rf, ctx) { if (rf & 1) {
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
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(5, 4, "brain.edges.empty.noMatchQuery", i0.ɵɵpureFunction1(7, _c1, ctx_r1.store.edgeSearch())));
} }
function EdgesTabComponent_ForEmpty_52_Conditional_3_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.edges.empty.title"));
} }
function EdgesTabComponent_ForEmpty_52_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 83)(1, "div", 85);
    i0.ɵɵelement(2, "ph-icon", 75);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, EdgesTabComponent_ForEmpty_52_Conditional_3_Conditional_3_Template, 6, 9)(4, EdgesTabComponent_ForEmpty_52_Conditional_3_Conditional_4_Template, 3, 3, "h3");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.store.edgeSearch() ? 3 : 4);
} }
function EdgesTabComponent_ForEmpty_52_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 43);
    i0.ɵɵconditionalCreate(2, EdgesTabComponent_ForEmpty_52_Conditional_2_Template, 2, 4, "app-error-state", 82)(3, EdgesTabComponent_ForEmpty_52_Conditional_3_Template, 5, 2, "div", 83);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.loadError() !== null ? 2 : 3);
} }
function EdgesTabComponent_Conditional_53_Template(rf, ctx) { if (rf & 1) {
    const _r18 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 20)(1, "button", 86);
    i0.ɵɵlistener("click", function EdgesTabComponent_Conditional_53_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r18); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.prevPage()); });
    i0.ɵɵelement(2, "ph-icon", 87);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 88);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 86);
    i0.ɵɵlistener("click", function EdgesTabComponent_Conditional_53_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r18); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.nextPage()); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelement(10, "ph-icon", 89);
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
    i0.ɵɵtextInterpolate(ctx_r1.store.edges().length ? ctx_r1.skip() + 1 + "\u2013" + (ctx_r1.skip() + ctx_r1.store.edges().length) : "\u2013");
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.store.edges().length < ctx_r1.pageSize);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(9, 9, "common.next"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
} }
/**
 * The Edges record tab, extracted from BrainComponent (A17.9b-6f) following the memories pattern.
 * Owns the edge create form, the (drawer-superseded) inline edit, delete, and the tab's own search
 * (semantic-only top bar via `store.edgeSearch` + the docked Relation column freetext filter, 2b-iii-c)
 * + type-tag filter + pagination + loader. Self-loads via a `spaceId` effect.
 *
 * Edge deltas: create AND inline-edit strip empty optional props (like entity); `deleteEdge` does NOT
 * refresh the space stats (so it does NOT emit `mutated`) — the asymmetry pinned by the A17.9b-6b tests.
 */
export class EdgesTabComponent extends RecordTabBase {
    constructor() {
        super(...arguments);
        this.drawerState = inject(RecordDrawerState);
        this.brainApi = inject(BrainApi);
        /** Emitted after a create so the shell can refresh the space's tab-count stats. (Delete does NOT — matches the shell's original edge behaviour.) */
        this.mutated = output();
        /**
         * "View in graph" — emits the **`from`** endpoint, because a graph is rooted at a node and an edge is
         * not one. At depth 2 with both directions the `to` endpoint is one hop away, so the edge itself is
         * always on the canvas; rooting at `from` just picks which end the view is centred on.
         */
        this.viewInGraph = output();
        this.showEdgeForm = signal(false, ...(ngDevMode ? [{ debugName: "showEdgeForm" }] : /* istanbul ignore next */ []));
        this.creatingEdge = signal(false, ...(ngDevMode ? [{ debugName: "creatingEdge" }] : /* istanbul ignore next */ []));
        this.createEdgeError = signal('', ...(ngDevMode ? [{ debugName: "createEdgeError" }] : /* istanbul ignore next */ []));
        this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: '', weight: null, tags: [], description: '', properties: {} };
        this.editEdge = { from: '', to: '', fromName: undefined, toName: undefined, label: '', weight: null, tags: [], description: '', properties: {} };
        this._edgeSemTimer = null;
    }
    resetOnSpaceChange() {
        this.recordFilter.set({ type: '', tag: '', description: '', properties: '', fromName: '', toName: '', entityName: '' });
    }
    load() {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        this.recordList.loading.set(true);
        this.recordList.loadError.set(null);
        const gf = {};
        if (this.recordFilter().type)
            gf.type = this.recordFilter().type;
        if (this.recordFilter().tag)
            gf.tag = this.recordFilter().tag;
        if (this.recordFilter().description)
            gf.description = this.recordFilter().description;
        if (this.recordFilter().properties)
            gf.properties = this.recordFilter().properties;
        if (this.recordFilter().fromName)
            gf.fromName = this.recordFilter().fromName;
        if (this.recordFilter().toName)
            gf.toName = this.recordFilter().toName;
        this.brainApi.listEdges(spaceId, this.pageSize, this.skip(), gf, this.sortParam(), this.searchParam()).subscribe({
            next: ({ edges }) => { this.store.edges.set(edges); this.recordList.loading.set(false); },
            error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
        });
    }
    /**
     * The top-bar search is SEMANTIC-only (2b-iii-c): typing issues a debounced `recallBrain`. Plain
     * substring search moved to the docked Relation column freetext filter (server-side, via `load()`).
     * Clearing the box restores the normal paginated list.
     */
    onEdgeSearch(q) {
        this.store.edgeSearch.set(q);
        if (this._edgeSemTimer)
            clearTimeout(this._edgeSemTimer);
        if (!q.trim()) {
            this.skip.set(0);
            this.load();
            return;
        }
        this._edgeSemTimer = setTimeout(() => this.runSemanticEdgeSearch(), 300);
    }
    runSemanticEdgeSearch() {
        const q = this.store.edgeSearch().trim();
        const spaceId = this.spaceId();
        if (!q || !spaceId) {
            this.store.edges.set([]);
            return;
        }
        this.brainApi.recallBrain(spaceId, { query: q, types: ['edge'], topK: 20 }).pipe(catchError(() => of({ results: [], count: 0 }))).subscribe(res => {
            this.store.edges.set(res.results.filter(r => r.type === 'edge').map(r => ({
                _id: r['_id'],
                from: r['from'] ?? '',
                fromName: r['fromName'],
                to: r['to'] ?? '',
                toName: r['toName'],
                label: r['label'] ?? '',
                weight: r['weight'],
                tags: r['tags'] ?? [],
                description: r['description'],
                properties: r['properties'] ?? {},
                createdAt: r['createdAt'] ?? '',
            })));
        });
    }
    openEdgeForm() {
        const firstLabel = Object.keys(this.store.spaceMeta()?.typeSchemas?.edge ?? {})[0] ?? '';
        this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: firstLabel, weight: null, tags: [], description: '', properties: this.store.buildPropertiesObject('edge', {}, firstLabel) };
        this.showEdgeForm.set(true);
    }
    createEdge() {
        if (!this.edgeForm.from.trim() || !this.edgeForm.to.trim() || !this.edgeForm.label.trim())
            return;
        this.creatingEdge.set(true);
        this.createEdgeError.set('');
        const body = {
            from: this.edgeForm.from.trim(),
            to: this.edgeForm.to.trim(),
            label: this.edgeForm.label.trim(),
        };
        if (this.edgeForm.weight != null)
            body.weight = this.edgeForm.weight;
        if (this.edgeForm.tags.length)
            body.tags = this.edgeForm.tags;
        if (this.edgeForm.description.trim())
            body.description = this.edgeForm.description.trim();
        const edgeProps = this.store.stripEmptyOptionalProps(this.edgeForm.properties, this.store.edgeSchema(this.edgeForm.label));
        if (Object.keys(edgeProps).length)
            body.properties = edgeProps;
        this.brainApi.createEdge(this.spaceId(), body).subscribe({
            next: () => {
                this.creatingEdge.set(false);
                this.showEdgeForm.set(false);
                this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: '', weight: null, tags: [], description: '', properties: {} };
                this.mutated.emit();
                this.load();
            },
            error: (err) => { this.creatingEdge.set(false); this.createEdgeError.set(fmtApiError(err, 'Failed to create edge')); },
        });
    }
    startEditEdge(edge) {
        this.recordList.editingId.set(edge._id);
        this.recordList.editError.set('');
        this.editEdge = {
            from: edge.from,
            to: edge.to,
            fromName: edge.fromName,
            toName: edge.toName,
            label: edge.label,
            weight: edge.weight ?? null,
            tags: edge.tags ?? [],
            description: edge.description ?? '',
            properties: this.store.buildPropertiesObject('edge', edge.properties ?? {}, edge.label),
        };
    }
    saveEditEdge(id) {
        this.recordList.editSaving.set(true);
        this.recordList.editError.set('');
        const edgeProps = this.store.stripEmptyOptionalProps(this.editEdge.properties, this.store.edgeSchema(this.editEdge.label));
        this.brainApi.updateEdge(this.spaceId(), id, {
            label: this.editEdge.label.trim(),
            tags: this.editEdge.tags,
            description: this.editEdge.description.trim(),
            ...(this.editEdge.weight != null ? { weight: this.editEdge.weight } : {}),
            ...(Object.keys(edgeProps).length ? { properties: edgeProps } : {}),
        }).subscribe({
            next: (updated) => {
                this.recordList.editSaving.set(false);
                this.recordList.editingId.set('');
                this.store.edges.update(list => list.map(e => e._id === id ? updated : e));
            },
            error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
        });
    }
    deleteEdge(id) {
        this.recordList.confirmDeleteId.set('');
        this.brainApi.deleteEdge(this.spaceId(), id).subscribe({
            next: () => this.store.edges.update(list => list.filter(e => e._id !== id)),
            error: () => { },
        });
    }
    // Edge from/to endpoints set display fields on edgeForm and do NOT touch the entity-name cache
    // (they're not chip fields) — the shell counterparts of the picker's target-based pickEntity.
    pickEdgeFrom(ent) {
        this.edgeForm.from = ent._id;
        this.edgeForm.fromDisplay = ent.name;
    }
    pickEdgeTo(ent) {
        this.edgeForm.to = ent._id;
        this.edgeForm.toDisplay = ent.name;
    }
    static { this.ɵfac = /*@__PURE__*/ (() => { let ɵEdgesTabComponent_BaseFactory; return function EdgesTabComponent_Factory(__ngFactoryType__) { return (ɵEdgesTabComponent_BaseFactory || (ɵEdgesTabComponent_BaseFactory = i0.ɵɵgetInheritedFactory(EdgesTabComponent)))(__ngFactoryType__ || EdgesTabComponent); }; })(); }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: EdgesTabComponent, selectors: [["app-edges-tab"]], outputs: { mutated: "mutated", viewInGraph: "viewInGraph" }, features: [i0.ɵɵInheritDefinitionFeature], decls: 54, vars: 72, consts: [[1, "content-header"], ["placeholder", "brain.edges.searchPlaceholder", 3, "valueChange", "value"], [1, "btn-primary", "btn", "btn-sm", 3, "click", "disabled"], [1, "create-form"], [1, "alert", "alert-error", 2, "margin-bottom", "12px"], ["hscrollTop", "", 1, "table-wrapper"], ["app-sort-th", "", "field", "from", "label", "brain.edges.table.from", 3, "sort", "activeField", "dir"], ["type", "text", 1, "col-filter-input", 3, "ngModelChange", "ngModel", "placeholder"], ["app-sort-th", "", "field", "label", "label", "brain.edges.table.relation", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "to", "label", "brain.edges.table.to", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "weight", "label", "brain.edges.table.weight", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "type", "label", "brain.edges.table.type", 3, "sort", "activeField", "dir"], [1, "col-filter-select", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["app-sort-th", "", "label", "brain.edges.table.tags"], [3, "id"], ["app-sort-th", "", "label", "brain.edges.table.description"], ["app-sort-th", "", "label", "brain.edges.table.properties"], ["app-sort-th", "", "field", "createdAt", "label", "brain.edges.table.created", 3, "sort", "activeField", "dir"], [1, "pagination"], [1, "create-form", 3, "ngSubmit"], [1, "form-row"], [1, "field", 2, "flex", "1", "min-width", "120px"], ["mode", "picker", "placeholder", "common.searchEntitiesPlaceholder", 3, "selected", "spaceId", "value"], [2, "color", "var(--error)"], ["name", "label", "required", "", 3, "ngModel"], ["type", "text", "name", "label", "required", "", 3, "ngModel"], [1, "field", 2, "width", "90px"], ["type", "number", "name", "weight", "step", "0.1", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "180px"], ["inputName", "edgeFormTags", 3, "valueChange", "value", "suggestions"], [1, "form-row", "rich"], [1, "field"], ["name", "description", "rows", "3", 3, "ngModelChange", "ngModel"], [3, "valueChange", "schema", "required", "value"], [2, "display", "flex", "gap", "8px"], ["type", "submit", 1, "btn-primary", "btn", "btn-sm", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], ["type", "button", 1, "btn-secondary", "btn", "btn-sm", 3, "click"], ["name", "label", "required", "", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "label", "required", "", 3, "ngModelChange", "ngModel"], [2, "vertical-align", "top"], ["colspan", "10"], [1, "create-form", 2, "border", "none", "padding", "8px 0"], [1, "field", 2, "min-width", "200px", "margin-bottom", "0"], [2, "font-size", "11px", "color", "var(--text-muted)"], [2, "font-size", "12px", "padding", "6px 8px", "background", "var(--bg-secondary)", "border-radius", "4px", "color", "var(--text-muted)"], [1, "field", 2, "flex", "1", "min-width", "120px", "margin-bottom", "0"], ["name", "editEdgeLabel", 3, "ngModel"], ["type", "text", "name", "editEdgeLabel", 3, "ngModel"], [1, "field", 2, "width", "80px", "margin-bottom", "0"], ["type", "number", "name", "editEdgeWeight", "step", "0.1", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "160px", "margin-bottom", "0"], ["name", "editEdgeDesc", "rows", "2", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], [1, "field", 2, "flex", "1", "min-width", "180px", "margin-bottom", "0"], ["inputName", "edgeEditTags", 3, "valueChange", "value", "suggestions"], [1, "field", 2, "flex", "1", "min-width", "220px", "margin-bottom", "0"], [2, "display", "flex", "gap", "6px", "align-items", "flex-end"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "btn", "btn-sm", "btn-secondary", 3, "click"], [2, "font-size", "12px", "color", "var(--error)"], ["name", "editEdgeLabel", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "editEdgeLabel", 3, "ngModelChange", "ngModel"], [2, "font-size", "12px", "white-space", "nowrap"], [1, "badge", "badge-blue"], [2, "color", "var(--text-muted)"], [2, "font-size", "11px", "white-space", "nowrap"], [2, "font-size", "11px"], [1, "tag"], [2, "font-size", "12px", "color", "var(--text-muted)", "white-space", "normal", "word-break", "break-word", "min-width", "140px", "min-height", "4.2em"], [3, "properties", "schema"], [2, "white-space", "nowrap"], [1, "icon-btn", 3, "click"], ["name", "graph", 3, "size"], ["name", "eye", 3, "size"], [1, "inline-confirm"], [1, "icon-btn", "danger"], [1, "btn", "btn-sm", "btn-danger", 3, "click"], [1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [3, "message", "reason"], [1, "empty-state", 2, "padding", "32px"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], [1, "btn", "btn-sm", "btn-secondary", 3, "click", "disabled"], ["name", "arrow-left", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], [1, "pager-info"], ["name", "arrow-right", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"]], template: function EdgesTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-record-search-bar", 1);
            i0.ɵɵlistener("valueChange", function EdgesTabComponent_Template_app_record_search_bar_valueChange_1_listener($event) { return ctx.onEdgeSearch($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "button", 2);
            i0.ɵɵlistener("click", function EdgesTabComponent_Template_button_click_2_listener() { return ctx.openEdgeForm(); });
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(5, EdgesTabComponent_Conditional_5_Template, 49, 41, "form", 3);
            i0.ɵɵconditionalCreate(6, EdgesTabComponent_Conditional_6_Template, 2, 1, "div", 4);
            i0.ɵɵelementStart(7, "div", 5)(8, "table")(9, "thead")(10, "tr")(11, "th", 6);
            i0.ɵɵlistener("sort", function EdgesTabComponent_Template_th_sort_11_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(12, "input", 7);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_input_ngModelChange_12_listener($event) { return ctx.setNameFilter("fromName", $event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(15, "th", 8);
            i0.ɵɵlistener("sort", function EdgesTabComponent_Template_th_sort_15_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(16, "input", 7);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_input_ngModelChange_16_listener($event) { return ctx.setSearchFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(19, "th", 9);
            i0.ɵɵlistener("sort", function EdgesTabComponent_Template_th_sort_19_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(20, "input", 7);
            i0.ɵɵpipe(21, "transloco");
            i0.ɵɵpipe(22, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_input_ngModelChange_20_listener($event) { return ctx.setNameFilter("toName", $event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(23, "th", 10);
            i0.ɵɵlistener("sort", function EdgesTabComponent_Template_th_sort_23_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(24, "th", 11);
            i0.ɵɵlistener("sort", function EdgesTabComponent_Template_th_sort_24_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementStart(25, "select", 12);
            i0.ɵɵpipe(26, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_select_ngModelChange_25_listener($event) { return ctx.setTypeFilter($event); });
            i0.ɵɵelementStart(27, "option", 13);
            i0.ɵɵtext(28);
            i0.ɵɵpipe(29, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(30, EdgesTabComponent_For_31_Template, 2, 2, "option", 14, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(32, "th", 15)(33, "input", 7);
            i0.ɵɵpipe(34, "transloco");
            i0.ɵɵpipe(35, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_input_ngModelChange_33_listener($event) { return ctx.setTagFilter($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(36, "datalist", 16);
            i0.ɵɵrepeaterCreate(37, EdgesTabComponent_For_38_Template, 1, 1, "option", 14, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(39, "th", 17)(40, "input", 7);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_input_ngModelChange_40_listener($event) { return ctx.setDescriptionFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(43, "th", 18)(44, "input", 7);
            i0.ɵɵpipe(45, "transloco");
            i0.ɵɵpipe(46, "transloco");
            i0.ɵɵlistener("ngModelChange", function EdgesTabComponent_Template_input_ngModelChange_44_listener($event) { return ctx.setPropertiesFilter($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(47, "th", 19);
            i0.ɵɵlistener("sort", function EdgesTabComponent_Template_th_sort_47_listener($event) { return ctx.setSort($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelement(48, "th");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(49, "tbody");
            i0.ɵɵrepeaterCreate(50, EdgesTabComponent_For_51_Template, 2, 1, null, null, _forTrack0, false, EdgesTabComponent_ForEmpty_52_Template, 4, 1, "tr");
            i0.ɵɵelementEnd()()();
            i0.ɵɵconditionalCreate(53, EdgesTabComponent_Conditional_53_Template, 11, 11, "div", 20);
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("value", ctx.store.edgeSearch());
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.showEdgeForm());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 42, "brain.edges.addButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.showEdgeForm() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createEdgeError() ? 6 : -1);
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.recordFilter().fromName)("placeholder", i0.ɵɵpipeBind1(13, 44, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(14, 46, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.search())("placeholder", i0.ɵɵpipeBind1(17, 48, "brain.filter.searchPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(18, 50, "brain.filter.searchPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.recordFilter().toName)("placeholder", i0.ɵɵpipeBind1(21, 52, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(22, 54, "brain.filter.entityNamePlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.recordFilter().type);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(26, 56, "brain.filter.label"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(29, 58, "brain.filter.allTypes"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.store.edgeTypeOptions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().tag)("placeholder", i0.ɵɵpipeBind1(34, 60, "brain.filter.tagPlaceholder"));
            i0.ɵɵattribute("list", ctx.tagListId)("aria-label", i0.ɵɵpipeBind1(35, 62, "brain.filter.tagPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("id", ctx.tagListId);
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.store.edgeTagSuggestions());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().description)("placeholder", i0.ɵɵpipeBind1(41, 64, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(42, 66, "brain.filter.descriptionPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("ngModel", ctx.recordFilter().properties)("placeholder", i0.ɵɵpipeBind1(45, 68, "brain.filter.propertiesPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(46, 70, "brain.filter.propertiesPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.store.edges());
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(!ctx.store.edgeSearch().trim() ? 53 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.NgModel, i1.NgForm, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent, TranslocoPipe], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }", ".content-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    \n\n\n\n    .content-header[_ngcontent-%COMP%]   app-entity-search[_ngcontent-%COMP%] {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; \n\n    }\n    \n\n\n    .list-filter-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    \n\n\n    .col-filter-select[_ngcontent-%COMP%], .col-filter-input[_ngcontent-%COMP%] {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select[_ngcontent-%COMP%] { min-width: 96px; }\n    .col-filter-input[_ngcontent-%COMP%] { min-width: 90px; }\n    .filter-chip[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable[_ngcontent-%COMP%], .entity-clickable[_ngcontent-%COMP%] {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable[_ngcontent-%COMP%]:hover, .entity-clickable[_ngcontent-%COMP%]:hover { opacity: 0.7; }\n    \n\n\n\n\n    .create-form[_ngcontent-%COMP%] { --brain-control-h: 34px; }\n    .create-form[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    \n\n\n\n\n\n\n    .create-form[_ngcontent-%COMP%]   .form-row[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form[_ngcontent-%COMP%]   .form-row.rich[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%] { flex: 1; min-width: 220px; }\n    .create-form[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    \n\n    .create-form[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:not([type=checkbox]), .create-form[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { min-height: var(--brain-control-h); }\n    \n\n    .create-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { font-size: 11px; }\n    \n\n\n    .desc-cell[_ngcontent-%COMP%] {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell[_ngcontent-%COMP%]   .desc-clamp[_ngcontent-%COMP%] {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group[_ngcontent-%COMP%] { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child { border-right:none; }\n    .pill-group[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) { background:var(--bg-surface); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EdgesTabComponent, [{
        type: Component,
        args: [{ selector: 'app-edges-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent, SortableHeaderComponent, HscrollTopDirective, TimestampComponent], template: `

          <div class="content-header">
            <app-record-search-bar
              [value]="store.edgeSearch()" (valueChange)="onEdgeSearch($event)"
              placeholder="brain.edges.searchPlaceholder" />
            <button class="btn-primary btn btn-sm" (click)="openEdgeForm()" [disabled]="showEdgeForm()">{{ 'brain.edges.addButton' | transloco }}</button>
          </div>

          @if (showEdgeForm()) {
            <form class="create-form" (ngSubmit)="createEdge()">
              <!-- Field order matches the table columns: from, relation, to, weight, tags | description, properties. -->
              <div class="form-row">
                <div class="field" style="flex:1; min-width:120px;">
                  <label>{{ 'common.form.from' | transloco }}</label>
                  <app-entity-search
                    mode="picker"
                    [spaceId]="spaceId()"
                    placeholder="common.searchEntitiesPlaceholder"
                    [value]="edgeForm.fromDisplay"
                    (selected)="pickEdgeFrom($event)"
                  />
                </div>
                <div class="field" style="flex:1; min-width:120px;">
                  <label>{{ 'brain.edges.form.relation' | transloco }} <span style="color:var(--error)">*</span></label>
                  @if (store.edgeLabelNames().length) {
                    <select [(ngModel)]="edgeForm.label" name="label" required>
                      @for (l of store.edgeLabelNames(); track l) {
                        <option [value]="l">{{ l }}</option>
                      }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="edgeForm.label" name="label" required />
                  }
                </div>
                <div class="field" style="flex:1; min-width:120px;">
                  <label>{{ 'common.form.to' | transloco }}</label>
                  <app-entity-search
                    mode="picker"
                    [spaceId]="spaceId()"
                    placeholder="common.searchEntitiesPlaceholder"
                    [value]="edgeForm.toDisplay"
                    (selected)="pickEdgeTo($event)"
                  />
                </div>
                <div class="field" style="width:90px;">
                  <label>{{ 'common.form.weight' | transloco }}</label>
                  <input type="number" [(ngModel)]="edgeForm.weight" name="weight" step="0.1" />
                </div>
                <div class="field" style="flex:1; min-width:180px;">
                  <label>{{ 'brain.edges.table.tags' | transloco }}</label>
                  <app-tag-input [(value)]="edgeForm.tags" [suggestions]="store.edgeTagSuggestions()" inputName="edgeFormTags" />
                </div>
              </div>
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'brain.edges.table.description' | transloco }}</label>
                  <textarea [(ngModel)]="edgeForm.description" name="description" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>{{ 'brain.edges.table.properties' | transloco }}</label>
                  <app-properties-editor
                    [schema]="store.edgeSchema(edgeForm.label)"
                    [required]="store.requiredProps(store.edgeSchema(edgeForm.label))"
                    [(value)]="edgeForm.properties"
                  />
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingEdge() || !edgeForm.from.trim() || !edgeForm.to.trim() || !edgeForm.label.trim()">
                  @if (creatingEdge()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                  {{ 'common.save' | transloco }}
                </button>
                <button class="btn-secondary btn btn-sm" type="button" (click)="showEdgeForm.set(false)">{{ 'common.cancel' | transloco }}</button>
              </div>
            </form>
          }

          @if (createEdgeError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createEdgeError() }}</div>
          }
          <div class="table-wrapper" hscrollTop>
            <table>
              <thead>
                <tr>
                  <th app-sort-th field="from" label="brain.edges.table.from" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().fromName" (ngModelChange)="setNameFilter('fromName', $event)"
                      [placeholder]="'brain.filter.entityNamePlaceholder' | transloco" [attr.aria-label]="'brain.filter.entityNamePlaceholder' | transloco" />
                  </th><th app-sort-th field="label" label="brain.edges.table.relation" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <input class="col-filter-input" type="text" [ngModel]="search()" (ngModelChange)="setSearchFilter($event)"
                      [placeholder]="'brain.filter.searchPlaceholder' | transloco" [attr.aria-label]="'brain.filter.searchPlaceholder' | transloco" />
                  </th><th app-sort-th field="to" label="brain.edges.table.to" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().toName" (ngModelChange)="setNameFilter('toName', $event)"
                      [placeholder]="'brain.filter.entityNamePlaceholder' | transloco" [attr.aria-label]="'brain.filter.entityNamePlaceholder' | transloco" />
                  </th><th app-sort-th field="weight" label="brain.edges.table.weight" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th app-sort-th field="type" label="brain.edges.table.type" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <select class="col-filter-select" [ngModel]="recordFilter().type" (ngModelChange)="setTypeFilter($event)" [attr.aria-label]="'brain.filter.label' | transloco">
                      <option value="">{{ 'brain.filter.allTypes' | transloco }}</option>
                      @for (t of store.edgeTypeOptions(); track t) { <option [value]="t">{{ t }}</option> }
                    </select>
                  </th>
                  <th app-sort-th label="brain.edges.table.tags">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().tag" (ngModelChange)="setTagFilter($event)"
                      [attr.list]="tagListId" [placeholder]="'brain.filter.tagPlaceholder' | transloco" [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco" />
                    <datalist [id]="tagListId">@for (s of store.edgeTagSuggestions(); track s) { <option [value]="s"></option> }</datalist>
                  </th>
                  <th app-sort-th label="brain.edges.table.description">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().description" (ngModelChange)="setDescriptionFilter($event)"
                      [placeholder]="'brain.filter.descriptionPlaceholder' | transloco" [attr.aria-label]="'brain.filter.descriptionPlaceholder' | transloco" />
                  </th><th app-sort-th label="brain.edges.table.properties">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().properties" (ngModelChange)="setPropertiesFilter($event)"
                      [placeholder]="'brain.filter.propertiesPlaceholder' | transloco" [attr.aria-label]="'brain.filter.propertiesPlaceholder' | transloco" />
                  </th><th app-sort-th field="createdAt" label="brain.edges.table.created" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (edge of store.edges(); track edge._id) {
                  @if (recordList.editingId() === edge._id) {
                    <tr>
                      <td colspan="10">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="min-width:200px; margin-bottom:0;">
                            <label style="font-size:11px; color:var(--text-muted);">{{ 'brain.edges.form.editingLabel' | transloco }}</label>
                            <div style="font-size:12px; padding:6px 8px; background:var(--bg-secondary); border-radius:4px; color:var(--text-muted);">
                              {{ editEdge.fromName || editEdge.from }} → {{ editEdge.toName || editEdge.to }}
                            </div>
                          </div>
                          <div class="field" style="flex:1; min-width:120px; margin-bottom:0;">
                            <label>{{ 'brain.edges.form.relation' | transloco }}</label>
                            @if (store.edgeLabelNames().length) {
                              <select [(ngModel)]="editEdge.label" name="editEdgeLabel">
                                @for (l of store.edgeLabelNames(); track l) {
                                  <option [value]="l">{{ l }}</option>
                                }
                              </select>
                            } @else {
                              <input type="text" [(ngModel)]="editEdge.label" name="editEdgeLabel" />
                            }
                          </div>
                          <div class="field" style="width:80px; margin-bottom:0;">
                            <label>{{ 'common.form.weight' | transloco }}</label>
                            <input type="number" [(ngModel)]="editEdge.weight" name="editEdgeWeight" step="0.1" />
                          </div>
                          <div class="field" style="flex:1; min-width:160px; margin-bottom:0;">
                            <label>{{ 'brain.edges.table.description' | transloco }}</label>
                            <textarea [(ngModel)]="editEdge.description" name="editEdgeDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.edges.table.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editEdge.tags" [suggestions]="store.edgeTagSuggestions()" inputName="edgeEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:220px; margin-bottom:0;">
                            <label>{{ 'brain.edges.table.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.edgeSchema(editEdge.label)"
                              [required]="store.requiredProps(store.edgeSchema(editEdge.label))"
                              [(value)]="editEdge.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditEdge(edge._id)">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (recordList.editError()) { <div style="font-size:12px; color:var(--error);">{{ recordList.editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr style="vertical-align:top;">
                      <td style="font-size:12px; white-space:nowrap;">{{ edge.fromName || edge.from }}</td>
                      <td><span class="badge badge-blue">{{ edge.label }}</span></td>
                      <td style="font-size:12px; white-space:nowrap;">{{ edge.toName || edge.to }}</td>
                      <td style="color:var(--text-muted);">{{ edge.weight ?? '—' }}</td>
                      <td style="font-size:11px; white-space:nowrap;">{{ edge.type || '—' }}</td>
                      <td style="font-size:11px;">
                        @for (tag of (edge.tags ?? []); track tag) { <span class="tag">{{ tag }}</span> }
                        @if (!(edge.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td style="font-size:12px; color:var(--text-muted); white-space:normal; word-break:break-word; min-width:140px; min-height:4.2em;">
                        {{ edge.description || '—' }}
                      </td>
                      <td><app-properties-view [properties]="edge.properties" [schema]="store.edgeSchema(edge.label)" /></td>
                      <td><app-timestamp [value]="edge.createdAt"/></td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewInGraph' | transloco" [attr.aria-label]="'common.viewInGraph' | transloco" (click)="viewInGraph.emit(edge.from)"><ph-icon name="graph" [size]="16"/></button>
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('edge', edge)"><ph-icon name="eye" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === edge._id) {
                          <span class="inline-confirm">
                            {{ 'common.deleteConfirm' | transloco }}
                            <button class="btn btn-sm btn-danger" (click)="deleteEdge(edge._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.aria-label]="'brain.edges.deleteAriaLabel' | transloco" (click)="requestDelete(edge._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="10">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadEdges' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="graph" [size]="48"/></div>
                      @if (store.edgeSearch()) {
                        <h3>{{ 'common.noMatches' | transloco }}</h3>
                        <p>{{ 'brain.edges.empty.noMatchQuery' | transloco: { query: store.edgeSearch() } }}</p>
                      } @else {
                        <h3>{{ 'brain.edges.empty.title' | transloco }}</h3>
                      }
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (!store.edgeSearch().trim()) {
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.edges().length ? (skip() + 1) + '–' + (skip() + store.edges().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.edges().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n", "\n    .content-header {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n    /* The plain search input styles itself (record-search-bar.component.ts) and app-entity-search\n       matches that spec \u2014 see the note there. Both are capped to the same width here so the entities\n       bar and the other tabs' bars line up. */\n    .content-header app-entity-search {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px; /* match the plain search input above (was 520 \u2014 the entities bar rendered wider) */\n    }\n    /* A slim row above the table, now only carrying the memories tab's active ENTITY-filter chip\n       (the type/tag filters moved into the headers in 2b-ii). */\n    .list-filter-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-bottom: 12px;\n    }\n    /* Slice 2b-ii: filters dock UNDER each column label (via th[app-sort-th]'s projected slot).\n       These style the docked controls uniformly across every tab. */\n    .col-filter-select, .col-filter-input {\n      height: 26px;\n      max-width: 100%;\n      box-sizing: border-box;\n      padding: 2px 6px;\n      font-size: 12px;\n      font-weight: 400;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n    .col-filter-select { min-width: 96px; }\n    .col-filter-input { min-width: 90px; }\n    .filter-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 10px;\n      background: var(--accent-dim);\n      border: 1px solid var(--accent);\n      color: var(--accent);\n      font-size: 11px;\n      font-weight: 500;\n    }\n    .filter-chip button {\n      background: none;\n      border: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 14px;\n      line-height: 1;\n      padding: 0 2px;\n    }\n    .tag-clickable, .entity-clickable {\n      cursor: pointer;\n      transition: opacity var(--transition);\n    }\n    .tag-clickable:hover, .entity-clickable:hover { opacity: 0.7; }\n    /* Uniform control height across every brain form control. 34px matches app-tag-input's wrap \u2014\n       the tallest single-line control \u2014 so aligning to it lifts the plain inputs/selects up to a\n       shared height instead of leaving four different ones on the page (search 5/10, filter 30,\n       create 5/8, global 8/12). Single-line fields become identical; textarea/properties grow. */\n    .create-form { --brain-control-h: 34px; }\n    .create-form {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n      padding: 12px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      margin-bottom: 12px;\n    }\n    /* The form is a vertical stack of .form-row blocks. Each tab composes its own rows in\n       table-column order: single-line fields (name/type/tags, from/to/label/weight) go in a plain\n       row at one uniform height; the tall fields (description then properties, or fact then\n       description) go in a .form-row.rich where each field flexes and grows, tops aligned. This makes\n       the feedback's \"same input height \u2026 description the current height as baseline but expands with\n       properties container\" a structure rather than a pile of per-field inline widths. */\n    .create-form .form-row {\n      display: flex;\n      gap: 10px;\n      align-items: flex-start;\n      flex-wrap: wrap;\n    }\n    .create-form .form-row.rich > .field { flex: 1; min-width: 220px; }\n    .create-form .field { margin-bottom: 0; display: flex; flex-direction: column; }\n    .create-form label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }\n    .create-form input, .create-form select, .create-form textarea {\n      padding: 6px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-primary);\n      color: var(--text-primary);\n      box-sizing: border-box;\n    }\n    /* Single-line controls (and app-tag-input's wrap, already 34px) share the one height. */\n    .create-form input:not([type=checkbox]), .create-form select { min-height: var(--brain-control-h); }\n    /* Description starts at the single-line height as its baseline and grows from there. */\n    .create-form textarea { resize: vertical; min-height: var(--brain-control-h); }\n    .inline-confirm {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-size: 12px;\n      color: var(--error);\n    }\n    .inline-confirm button { font-size: 11px; }\n    /* The td stays a real table cell so it fills its column; the 3-line clamp lives on an inner box\n       (setting display:-webkit-box on the td itself drops it out of table layout). */\n    .desc-cell {\n      font-size: 12px;\n      color: var(--text-muted);\n    }\n    .desc-cell .desc-clamp {\n      overflow: hidden;\n      display: -webkit-box;\n      -webkit-line-clamp: 3;\n      -webkit-box-orient: vertical;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n    .pill-group { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }\n    .pill-group button { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }\n    .pill-group button:last-child { border-right:none; }\n    .pill-group button.active { background:var(--accent-dim); color:var(--accent); }\n    .pill-group button:hover:not(.active) { background:var(--bg-surface); }\n"] }]
    }], null, { mutated: [{ type: i0.Output, args: ["mutated"] }], viewInGraph: [{ type: i0.Output, args: ["viewInGraph"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(EdgesTabComponent, { className: "EdgesTabComponent", filePath: "app/pages/brain/edges-tab.component.ts", lineNumber: 269 }); })();
