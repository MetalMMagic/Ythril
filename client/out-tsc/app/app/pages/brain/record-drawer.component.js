import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ModalDirective } from '../../shared/modal.directive';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { EntityRefFieldComponent } from './entity-ref-field.component';
import { MemoryRefFieldComponent } from './memory-ref-field.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { BRAIN_CHIP_STYLES, BRAIN_DRAWER_STYLES } from './brain-form.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
import * as i2 from "@angular/common";
function RecordDrawerComponent_Conditional_0_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.drawer.badge.memory"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 5);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.drawer.badge.entity"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.drawer.badge.edge"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 6);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.drawer.badge.chrono"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "slice");
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.state.drawerEditMemory.fact.length > 80 ? i0.ɵɵpipeBind3(1, 1, ctx_r1.state.drawerEditMemory.fact, 0, 80) + "\u2026" : ctx_r1.state.drawerEditMemory.fact, " ");
} }
function RecordDrawerComponent_Conditional_0_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.state.drawerEditEntity.name || dr_r3.record.name, " ");
} }
function RecordDrawerComponent_Conditional_0_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    i0.ɵɵtextInterpolate1(" ", (dr_r3.record.fromName || dr_r3.record.from) + " \u2192 " + (dr_r3.record.toName || dr_r3.record.to), " ");
} }
function RecordDrawerComponent_Conditional_0_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.state.drawerEditChrono.title || dr_r3.record.title, " ");
} }
function RecordDrawerComponent_Conditional_0_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function RecordDrawerComponent_Conditional_0_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.drawerError());
} }
function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_16_For_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 29);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r6 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r6);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r6);
} }
function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 27);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_16_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditMemory.type, $event) || (ctx_r1.state.drawerEditMemory.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelement(1, "option", 28);
    i0.ɵɵrepeaterCreate(2, RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_16_For_3_Template, 2, 2, "option", 29, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditMemory.type);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.store.memoryAllowedTypes());
} }
function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_17_For_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 29);
} if (rf & 2) {
    const t_r8 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r8);
} }
function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 30);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_17_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r7); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditMemory.type, $event) || (ctx_r1.state.drawerEditMemory.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(1, "datalist", 31);
    i0.ɵɵrepeaterCreate(2, RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_17_For_3_Template, 1, 1, "option", 29, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditMemory.type);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.store.memoryTypeOptions());
} }
function RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_45_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 25);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.authorInstanceId"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(dr_r3.record.author.instanceId);
} }
function RecordDrawerComponent_Conditional_0_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 16);
    i0.ɵɵtext(5, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "textarea", 17);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_25_Template_textarea_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditMemory.fact, $event) || (ctx_r1.state.drawerEditMemory.fact = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 14)(8, "div", 15);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "textarea", 18);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_25_Template_textarea_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditMemory.description, $event) || (ctx_r1.state.drawerEditMemory.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(12, "div", 14)(13, "div", 15);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(16, RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_16_Template, 4, 1, "select", 19)(17, RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_17_Template, 4, 1);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "div", 14)(19, "div", 15);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "app-tag-input", 20);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_25_Template_app_tag_input_valueChange_22_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditMemory.tags, $event) || (ctx_r1.state.drawerEditMemory.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(23, "div", 14)(24, "div", 15);
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(27, "app-entity-ref-field", 21);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "div", 14)(29, "div", 15);
    i0.ɵɵtext(30);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(32, "app-properties-editor", 22);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_25_Template_app_properties_editor_valueChange_32_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditMemory.properties, $event) || (ctx_r1.state.drawerEditMemory.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(33, "hr", 23);
    i0.ɵɵelementStart(34, "div", 14)(35, "div", 15);
    i0.ɵɵtext(36, "_id");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(37, "div", 24);
    i0.ɵɵtext(38);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(39, "div", 14)(40, "div", 15);
    i0.ɵɵtext(41);
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(43, "div", 25);
    i0.ɵɵtext(44);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(45, RecordDrawerComponent_Conditional_0_Conditional_25_Conditional_45_Template, 6, 4, "div", 14);
    i0.ɵɵelementStart(46, "div", 26)(47, "div", 15);
    i0.ɵɵtext(48);
    i0.ɵɵpipe(49, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(50, "div", 25);
    i0.ɵɵtext(51);
    i0.ɵɵpipe(52, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 22, "common.form.fact"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditMemory.fact);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 24, "common.form.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditMemory.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 26, "common.form.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.store.memoryTypesAreRestricted() ? 16 : 17);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 28, "common.form.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditMemory.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.memoryTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 30, "common.entityIds"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.state.drawerEditMemory)("spaceId", ctx_r1.state.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 32, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.memorySchema())("required", ctx_r1.store.requiredProps(ctx_r1.store.memorySchema()));
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditMemory.properties);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(dr_r3.record._id);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 34, "common.seq"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(dr_r3.record.seq);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.record.author ? 45 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(49, 36, "common.createdAt"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(52, 38, dr_r3.record.createdAt, "yyyy-MM-dd HH:mm:ss"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 16);
    i0.ɵɵtext(1, "*");
    i0.ɵɵelementEnd();
} }
function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_12_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 29);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r11 = ctx.$implicit;
    i0.ɵɵproperty("value", t_r11);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r11);
} }
function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 37);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_12_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEntity.type, $event) || (ctx_r1.state.drawerEditEntity.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_12_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.state.onEntityTypeChange($event)); });
    i0.ɵɵrepeaterCreate(1, RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_12_For_2_Template, 2, 2, "option", 29, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEntity.type);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.entityTypeNames());
} }
function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 38);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_13_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEntity.type, $event) || (ctx_r1.state.drawerEditEntity.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEntity.type);
} }
function RecordDrawerComponent_Conditional_0_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 16);
    i0.ɵɵtext(5, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "input", 32);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Template_input_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEntity.name, $event) || (ctx_r1.state.drawerEditEntity.name = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 14)(8, "div", 15);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵconditionalCreate(11, RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_11_Template, 2, 0, "span", 16);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(12, RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_12_Template, 3, 1, "select", 33)(13, RecordDrawerComponent_Conditional_0_Conditional_26_Conditional_13_Template, 1, 1, "input", 34);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "div", 14)(15, "div", 15);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "textarea", 35);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Template_textarea_ngModelChange_18_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEntity.description, $event) || (ctx_r1.state.drawerEditEntity.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "div", 14)(20, "div", 15);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "app-tag-input", 36);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Template_app_tag_input_valueChange_23_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEntity.tags, $event) || (ctx_r1.state.drawerEditEntity.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "div", 14)(25, "div", 15);
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "app-properties-editor", 22);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_26_Template_app_properties_editor_valueChange_28_listener($event) { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEntity.properties, $event) || (ctx_r1.state.drawerEditEntity.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(29, "hr", 23);
    i0.ɵɵelementStart(30, "div", 14)(31, "div", 15);
    i0.ɵɵtext(32, "_id");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "div", 24);
    i0.ɵɵtext(34);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(35, "div", 26)(36, "div", 15);
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(39, "div", 25);
    i0.ɵɵtext(40);
    i0.ɵɵpipe(41, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 17, "brain.entities.table.name"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEntity.name);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 19, "common.form.type"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.store.entityTypeNames().length ? 11 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.store.entityTypeNames().length ? 12 : 13);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 21, "common.form.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEntity.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 23, "common.form.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditEntity.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.entityTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 25, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.entitySchema(ctx_r1.state.drawerEditEntity.type))("required", ctx_r1.store.requiredProps(ctx_r1.store.entitySchema(ctx_r1.state.drawerEditEntity.type)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditEntity.properties);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(dr_r3.record._id);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(38, 27, "common.createdAt"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(41, 29, dr_r3.record.createdAt, "yyyy-MM-dd HH:mm:ss"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_17_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 29);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const l_r15 = ctx.$implicit;
    i0.ɵɵproperty("value", l_r15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(l_r15);
} }
function RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 47);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_17_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.label, $event) || (ctx_r1.state.drawerEditEdge.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(1, RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_17_For_2_Template, 2, 2, "option", 29, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEdge.label);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.edgeLabelNames());
} }
function RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 48);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_18_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.label, $event) || (ctx_r1.state.drawerEditEdge.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEdge.label);
} }
function RecordDrawerComponent_Conditional_0_Conditional_27_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 39);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 25);
    i0.ɵɵtext(8);
    i0.ɵɵelementStart(9, "span", 40);
    i0.ɵɵtext(10);
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "div", 14)(12, "div", 15);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementStart(15, "span", 16);
    i0.ɵɵtext(16, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(17, RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_17_Template, 3, 1, "select", 41)(18, RecordDrawerComponent_Conditional_0_Conditional_27_Conditional_18_Template, 1, 1, "input", 42);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "div", 14)(20, "div", 15);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementStart(23, "span", 39);
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(26, "div", 25);
    i0.ɵɵtext(27);
    i0.ɵɵelementStart(28, "span", 40);
    i0.ɵɵtext(29);
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(30, "div", 14)(31, "div", 15);
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "input", 43);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Template_input_ngModelChange_34_listener($event) { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.type, $event) || (ctx_r1.state.drawerEditEdge.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(35, "div", 14)(36, "div", 15);
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(39, "input", 44);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Template_input_ngModelChange_39_listener($event) { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.weight, $event) || (ctx_r1.state.drawerEditEdge.weight = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(40, "div", 14)(41, "div", 15);
    i0.ɵɵtext(42);
    i0.ɵɵpipe(43, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(44, "textarea", 45);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Template_textarea_ngModelChange_44_listener($event) { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.description, $event) || (ctx_r1.state.drawerEditEdge.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(45, "div", 14)(46, "div", 15);
    i0.ɵɵtext(47);
    i0.ɵɵpipe(48, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(49, "app-tag-input", 46);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Template_app_tag_input_valueChange_49_listener($event) { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.tags, $event) || (ctx_r1.state.drawerEditEdge.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(50, "div", 14)(51, "div", 15);
    i0.ɵɵtext(52);
    i0.ɵɵpipe(53, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(54, "app-properties-editor", 22);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_27_Template_app_properties_editor_valueChange_54_listener($event) { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditEdge.properties, $event) || (ctx_r1.state.drawerEditEdge.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(55, "hr", 23);
    i0.ɵɵelementStart(56, "div", 14)(57, "div", 15);
    i0.ɵɵtext(58, "_id");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(59, "div", 24);
    i0.ɵɵtext(60);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(61, "div", 26)(62, "div", 15);
    i0.ɵɵtext(63);
    i0.ɵɵpipe(64, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(65, "div", 25);
    i0.ɵɵtext(66);
    i0.ɵɵpipe(67, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 26, "common.form.from"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 28, "common.readOnly"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(dr_r3.record.fromName || dr_r3.record.from);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" (", dr_r3.record.from, ")");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(14, 30, "brain.edges.table.relation"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(ctx_r1.store.edgeLabelNames().length ? 17 : 18);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(22, 32, "common.form.to"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 34, "common.readOnly"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(dr_r3.record.toName || dr_r3.record.to);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" (", dr_r3.record.to, ")");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 36, "common.form.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEdge.type);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(38, 38, "common.form.weight"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEdge.weight);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(43, 40, "common.form.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditEdge.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(48, 42, "common.form.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditEdge.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.edgeTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(53, 44, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.edgeSchema(ctx_r1.state.drawerEditEdge.label))("required", ctx_r1.store.requiredProps(ctx_r1.store.edgeSchema(ctx_r1.state.drawerEditEdge.label)));
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditEdge.properties);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(dr_r3.record._id);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(64, 46, "common.createdAt"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(67, 48, dr_r3.record.createdAt, "yyyy-MM-dd HH:mm:ss"));
} }
function RecordDrawerComponent_Conditional_0_Conditional_28_For_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 29);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const k_r18 = ctx.$implicit;
    i0.ɵɵproperty("value", k_r18);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(k_r18);
} }
function RecordDrawerComponent_Conditional_0_Conditional_28_For_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 29);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r19 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r19);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r19);
} }
function RecordDrawerComponent_Conditional_0_Conditional_28_Conditional_74_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 24);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "json");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.recurrence"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 4, dr_r3.record.recurrence));
} }
function RecordDrawerComponent_Conditional_0_Conditional_28_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 16);
    i0.ɵɵtext(5, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "input", 49);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_input_ngModelChange_6_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.title, $event) || (ctx_r1.state.drawerEditChrono.title = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 14)(8, "div", 15);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementStart(11, "span", 16);
    i0.ɵɵtext(12, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(13, "select", 50);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_select_ngModelChange_13_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.kind, $event) || (ctx_r1.state.drawerEditChrono.kind = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_select_ngModelChange_13_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.state.onDrawerChronoKindChange()); });
    i0.ɵɵrepeaterCreate(14, RecordDrawerComponent_Conditional_0_Conditional_28_For_15_Template, 2, 2, "option", 29, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(16, "div", 14)(17, "div", 15);
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "select", 51);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_select_ngModelChange_20_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.status, $event) || (ctx_r1.state.drawerEditChrono.status = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(21, RecordDrawerComponent_Conditional_0_Conditional_28_For_22_Template, 2, 2, "option", 29, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(23, "div", 14)(24, "div", 15);
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementStart(27, "span", 16);
    i0.ɵɵtext(28, "*");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(29, "input", 52);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_input_ngModelChange_29_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.startsAt, $event) || (ctx_r1.state.drawerEditChrono.startsAt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(30, "div", 14)(31, "div", 15);
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "input", 53);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_input_ngModelChange_34_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.endsAt, $event) || (ctx_r1.state.drawerEditChrono.endsAt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(35, "div", 14)(36, "div", 15);
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementStart(39, "span", 39);
    i0.ɵɵtext(40, "(0-1)");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(41, "input", 54);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_input_ngModelChange_41_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.confidence, $event) || (ctx_r1.state.drawerEditChrono.confidence = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(42, "div", 14)(43, "div", 15);
    i0.ɵɵtext(44);
    i0.ɵɵpipe(45, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(46, "textarea", 55);
    i0.ɵɵtwoWayListener("ngModelChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_textarea_ngModelChange_46_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.description, $event) || (ctx_r1.state.drawerEditChrono.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(47, "div", 14)(48, "div", 15);
    i0.ɵɵtext(49);
    i0.ɵɵpipe(50, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(51, "app-tag-input", 56);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_app_tag_input_valueChange_51_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.tags, $event) || (ctx_r1.state.drawerEditChrono.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(52, "div", 14)(53, "div", 15);
    i0.ɵɵtext(54);
    i0.ɵɵpipe(55, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(56, "app-entity-ref-field", 21);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(57, "div", 14)(58, "div", 15);
    i0.ɵɵtext(59);
    i0.ɵɵpipe(60, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(61, "app-memory-ref-field", 57);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(62, "div", 14)(63, "div", 15);
    i0.ɵɵtext(64);
    i0.ɵɵpipe(65, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(66, "app-properties-editor", 22);
    i0.ɵɵtwoWayListener("valueChange", function RecordDrawerComponent_Conditional_0_Conditional_28_Template_app_properties_editor_valueChange_66_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.state.drawerEditChrono.properties, $event) || (ctx_r1.state.drawerEditChrono.properties = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelement(67, "hr", 23);
    i0.ɵɵelementStart(68, "div", 14)(69, "div", 15);
    i0.ɵɵtext(70);
    i0.ɵɵpipe(71, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(72, "div", 25);
    i0.ɵɵtext(73);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(74, RecordDrawerComponent_Conditional_0_Conditional_28_Conditional_74_Template, 7, 6, "div", 14);
    i0.ɵɵelementStart(75, "div", 14)(76, "div", 15);
    i0.ɵɵtext(77);
    i0.ɵɵpipe(78, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(79, "div", 25);
    i0.ɵɵtext(80);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(81, "div", 14)(82, "div", 15);
    i0.ɵɵtext(83);
    i0.ɵɵpipe(84, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(85, "div", 25);
    i0.ɵɵtext(86);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(87, "div", 14)(88, "div", 15);
    i0.ɵɵtext(89, "_id");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(90, "div", 24);
    i0.ɵɵtext(91);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(92, "div", 14)(93, "div", 15);
    i0.ɵɵtext(94);
    i0.ɵɵpipe(95, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(96, "div", 25);
    i0.ɵɵtext(97);
    i0.ɵɵpipe(98, "date");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(99, "div", 26)(100, "div", 15);
    i0.ɵɵtext(101);
    i0.ɵɵpipe(102, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(103, "div", 25);
    i0.ɵɵtext(104);
    i0.ɵɵpipe(105, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dr_r3 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 39, "common.form.title"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.title);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 41, "common.form.type"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.kind);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.chronoTypeOptions());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 43, "brain.chrono.table.status"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.status);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.store.chronoStatusOptions);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(26, 45, "common.form.startsAt"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.startsAt);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 47, "common.form.endsAt"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.endsAt);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(38, 49, "common.confidence"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.confidence);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(45, 51, "common.form.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.drawerEditChrono.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 53, "common.form.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditChrono.tags);
    i0.ɵɵproperty("suggestions", ctx_r1.store.chronoTagSuggestions());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(55, 55, "common.entityIds"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.state.drawerEditChrono)("spaceId", ctx_r1.state.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(60, 57, "common.memoryIds"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", ctx_r1.state.drawerEditChrono);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(65, 59, "brain.chrono.table.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("schema", ctx_r1.store.chronoSchema(ctx_r1.state.drawerChronoKind()))("required", ctx_r1.store.requiredProps(ctx_r1.store.chronoSchema(ctx_r1.state.drawerChronoKind())));
    i0.ɵɵtwoWayProperty("value", ctx_r1.state.drawerEditChrono.properties);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(71, 61, "common.spaceId"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(dr_r3.record.spaceId);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.record.recurrence ? 74 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(78, 63, "common.author"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2("", dr_r3.record.author.instanceLabel, " (", dr_r3.record.author.instanceId, ")");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(84, 65, "common.seq"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(dr_r3.record.seq);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(dr_r3.record._id);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(95, 67, "common.createdAt"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(98, 69, dr_r3.record.createdAt, "yyyy-MM-dd HH:mm:ss"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(102, 72, "common.updatedAt"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(105, 74, dr_r3.record.updatedAt, "yyyy-MM-dd HH:mm:ss"));
} }
function RecordDrawerComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function RecordDrawerComponent_Conditional_0_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.close()); })("click", function RecordDrawerComponent_Conditional_0_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 2)(4, "div", 3);
    i0.ɵɵconditionalCreate(5, RecordDrawerComponent_Conditional_0_Conditional_5_Template, 3, 3, "span", 4);
    i0.ɵɵconditionalCreate(6, RecordDrawerComponent_Conditional_0_Conditional_6_Template, 3, 3, "span", 5);
    i0.ɵɵconditionalCreate(7, RecordDrawerComponent_Conditional_0_Conditional_7_Template, 3, 3, "span", 4);
    i0.ɵɵconditionalCreate(8, RecordDrawerComponent_Conditional_0_Conditional_8_Template, 3, 3, "span", 6);
    i0.ɵɵelementStart(9, "div", 7);
    i0.ɵɵconditionalCreate(10, RecordDrawerComponent_Conditional_0_Conditional_10_Template, 2, 5);
    i0.ɵɵconditionalCreate(11, RecordDrawerComponent_Conditional_0_Conditional_11_Template, 1, 1);
    i0.ɵɵconditionalCreate(12, RecordDrawerComponent_Conditional_0_Conditional_12_Template, 1, 1);
    i0.ɵɵconditionalCreate(13, RecordDrawerComponent_Conditional_0_Conditional_13_Template, 1, 1);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(14, "div", 8)(15, "button", 9);
    i0.ɵɵlistener("click", function RecordDrawerComponent_Conditional_0_Template_button_click_15_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.save()); });
    i0.ɵɵconditionalCreate(16, RecordDrawerComponent_Conditional_0_Conditional_16_Template, 1, 0, "span", 10);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "button", 11);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵlistener("click", function RecordDrawerComponent_Conditional_0_Template_button_click_19_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.close()); });
    i0.ɵɵelement(22, "ph-icon", 12);
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(23, RecordDrawerComponent_Conditional_0_Conditional_23_Template, 2, 1, "div", 13);
    i0.ɵɵelementStart(24, "form");
    i0.ɵɵconditionalCreate(25, RecordDrawerComponent_Conditional_0_Conditional_25_Template, 53, 41);
    i0.ɵɵconditionalCreate(26, RecordDrawerComponent_Conditional_0_Conditional_26_Template, 42, 32);
    i0.ɵɵconditionalCreate(27, RecordDrawerComponent_Conditional_0_Conditional_27_Template, 68, 51);
    i0.ɵɵconditionalCreate(28, RecordDrawerComponent_Conditional_0_Conditional_28_Template, 106, 77);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const dr_r3 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 20, "brain.drawer.recordDetailsAriaLabel"));
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(dr_r3.kind === "memory" ? 5 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "entity" ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "edge" ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "chrono" ? 8 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(dr_r3.kind === "memory" ? 10 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "entity" ? 11 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "edge" ? 12 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "chrono" ? 13 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.state.drawerSaving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.drawerSaving() ? 16 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(18, 22, "common.save"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(20, 24, "common.close"))("aria-label", i0.ɵɵpipeBind1(21, 26, "brain.drawer.closeDetailsAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.drawerError() ? 23 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(dr_r3.kind === "memory" ? 25 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "entity" ? 26 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "edge" ? 27 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(dr_r3.kind === "chrono" ? 28 : -1);
} }
/**
 * The record detail drawer — edits one memory/entity/edge/chrono record, opened from every record tab.
 *
 * Extracted from BrainComponent (A17.9b-5). OnPush from birth: it renders `RecordDrawerState`'s plain
 * edit models via ngModel, which show only because `open()` writes the `drawerRecord` SIGNAL in the
 * same turn (marking this view dirty). That coupling is load-bearing and pinned by the spec.
 *
 * All three collaborators are provided by the parent shell (`RecordDrawerState`, `BrainStore`,
 * `EntityRefPicker`), so this component just injects and renders them.
 */
export class RecordDrawerComponent {
    constructor() {
        this.state = inject(RecordDrawerState);
        this.store = inject(BrainStore);
        this.picker = inject(EntityRefPicker);
    }
    static { this.ɵfac = function RecordDrawerComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RecordDrawerComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: RecordDrawerComponent, selectors: [["app-record-drawer"]], decls: 1, vars: 1, consts: [[1, "drawer-overlay"], [1, "drawer", 3, "dismiss", "click", "appModal"], [1, "drawer-header"], [2, "flex", "1", "min-width", "0"], [1, "badge", "badge-blue", 2, "margin-bottom", "6px", "display", "inline-block"], [1, "badge", "badge-purple", 2, "margin-bottom", "6px", "display", "inline-block"], [1, "badge", 2, "margin-bottom", "6px", "display", "inline-block"], [1, "drawer-title"], [2, "display", "flex", "gap", "8px", "flex-shrink", "0", "align-items", "flex-start", "padding-top", "2px"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "alert", "alert-error", 2, "margin-bottom", "16px", "font-size", "13px"], [1, "drawer-field"], [1, "drawer-label"], [2, "color", "var(--error)"], ["name", "drwMemFact", "rows", "4", 3, "ngModelChange", "ngModel"], ["name", "drwMemDesc", "rows", "3", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], ["name", "drwMemType", 3, "ngModel"], ["inputName", "drwMemTags", 3, "valueChange", "value", "suggestions"], [3, "target", "spaceId"], [3, "valueChange", "schema", "required", "value"], [1, "drawer-hr"], [1, "drawer-readonly-value", 2, "font-family", "var(--font-mono,monospace)", "font-size", "11px"], [1, "drawer-readonly-value"], [1, "drawer-field", 2, "margin-bottom", "0"], ["name", "drwMemType", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["type", "text", "name", "drwMemType", "list", "drwMemTypeOptions", 3, "ngModelChange", "ngModel"], ["id", "drwMemTypeOptions"], ["type", "text", "name", "drwEntName", 3, "ngModelChange", "ngModel"], ["name", "drwEntType", 3, "ngModel"], ["type", "text", "name", "drwEntType", 3, "ngModel"], ["name", "drwEntDesc", "rows", "3", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], ["inputName", "drwEntTags", 3, "valueChange", "value", "suggestions"], ["name", "drwEntType", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "drwEntType", 3, "ngModelChange", "ngModel"], [1, "drawer-muted"], [2, "font-size", "11px"], ["name", "drwEdgeLabel", 3, "ngModel"], ["type", "text", "name", "drwEdgeLabel", 3, "ngModel"], ["type", "text", "name", "drwEdgeType", 3, "ngModelChange", "ngModel"], ["type", "number", "name", "drwEdgeWeight", "step", "0.1", 3, "ngModelChange", "ngModel"], ["name", "drwEdgeDesc", "rows", "3", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], ["inputName", "drwEdgeTags", 3, "valueChange", "value", "suggestions"], ["name", "drwEdgeLabel", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "drwEdgeLabel", 3, "ngModelChange", "ngModel"], ["type", "text", "name", "drwChronoTitle", 3, "ngModelChange", "ngModel"], ["name", "drwChronoKind", 3, "ngModelChange", "ngModel"], ["name", "drwChronoStatus", 3, "ngModelChange", "ngModel"], ["type", "datetime-local", "name", "drwChronoStarts", 3, "ngModelChange", "ngModel"], ["type", "datetime-local", "name", "drwChronoEnds", 3, "ngModelChange", "ngModel"], ["type", "number", "name", "drwChronoConf", "min", "0", "max", "1", "step", "0.01", 3, "ngModelChange", "ngModel"], ["name", "drwChronoDesc", "rows", "3", 3, "ngModelChange", "ngModel"], ["inputName", "drwChronoTags", 3, "valueChange", "value", "suggestions"], [3, "target"]], template: function RecordDrawerComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, RecordDrawerComponent_Conditional_0_Template, 29, 28, "div", 0);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.state.drawerRecord()) ? 0 : -1, tmp_0_0);
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.MinValidator, i1.MaxValidator, i1.NgModel, i1.NgForm, TagInputComponent, PropertiesEditorComponent, EntityRefFieldComponent, MemoryRefFieldComponent, PhIconComponent, ModalDirective, i2.JsonPipe, i2.SlicePipe, i2.DatePipe, TranslocoPipe], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }", ".drawer-overlay[_ngcontent-%COMP%] {\n      position: fixed; inset: 0; background: var(--bg-scrim);\n      z-index: 200; display: flex; justify-content: flex-end;\n    }\n    .drawer[_ngcontent-%COMP%] {\n      width: min(480px, 100vw); background: var(--bg-primary); height: 100%;\n      overflow-y: auto; padding: 20px 24px;\n      box-shadow: var(--shadow-drawer);\n      display: flex; flex-direction: column;\n      animation: _ngcontent-%COMP%_drawer-in .18s ease;\n    }\n    @keyframes _ngcontent-%COMP%_drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }\n    .drawer-header[_ngcontent-%COMP%] {\n      display: flex; justify-content: space-between; align-items: flex-start;\n      margin-bottom: 20px; padding-bottom: 14px;\n      border-bottom: 1px solid var(--border); gap: 12px;\n    }\n    .drawer-title[_ngcontent-%COMP%] { font-size: 16px; font-weight: 600; color: var(--text-primary); word-break: break-word; }\n    .drawer-field[_ngcontent-%COMP%] { margin-bottom: 16px; }\n    .drawer-label[_ngcontent-%COMP%] {\n      font-size: 10px; font-weight: 600; color: var(--text-muted);\n      text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px;\n    }\n    .drawer-value[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; line-height: 1.5; }\n    .drawer-muted[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .drawer-hr[_ngcontent-%COMP%] { border: none; border-top: 1px solid var(--border-muted); margin: 16px 0; }\n    .drawer-readonly-value[_ngcontent-%COMP%] {\n      font-size: 13px; color: var(--text-muted); padding: 5px 8px;\n      border: 1px solid var(--border-muted); border-radius: var(--radius-sm);\n      background: var(--bg-surface); word-break: break-all; line-height: 1.4;\n    }\n    .drawer[_ngcontent-%COMP%]   input[type=text][_ngcontent-%COMP%], .drawer[_ngcontent-%COMP%]   input[type=number][_ngcontent-%COMP%], .drawer[_ngcontent-%COMP%]   input[type=datetime-local][_ngcontent-%COMP%], \n   .drawer[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%], .drawer[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n      width: 100%; padding: 5px 8px; border: 1px solid var(--border);\n      border-radius: var(--radius-sm); font-size: 13px;\n      background: var(--bg-primary); color: var(--text-primary); box-sizing: border-box;\n    }\n    .drawer[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] { resize: vertical; }\n    .drawer[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { cursor: pointer; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RecordDrawerComponent, [{
        type: Component,
        args: [{ selector: 'app-record-drawer', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesEditorComponent, EntityRefFieldComponent, MemoryRefFieldComponent, PhIconComponent, ModalDirective], template: `
      @if (state.drawerRecord(); as dr) {
        <div class="drawer-overlay">
          <div class="drawer" [appModal]="'brain.drawer.recordDetailsAriaLabel' | transloco" (dismiss)="state.close()" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <div style="flex:1; min-width:0;">
                @if (dr.kind === 'memory') { <span class="badge badge-blue" style="margin-bottom:6px; display:inline-block;">{{ 'brain.drawer.badge.memory' | transloco }}</span> }
                @if (dr.kind === 'entity') { <span class="badge badge-purple" style="margin-bottom:6px; display:inline-block;">{{ 'brain.drawer.badge.entity' | transloco }}</span> }
                @if (dr.kind === 'edge') { <span class="badge badge-blue" style="margin-bottom:6px; display:inline-block;">{{ 'brain.drawer.badge.edge' | transloco }}</span> }
                @if (dr.kind === 'chrono') { <span class="badge" style="margin-bottom:6px; display:inline-block;">{{ 'brain.drawer.badge.chrono' | transloco }}</span> }
                <div class="drawer-title">
                  @if (dr.kind === 'memory') { {{ state.drawerEditMemory.fact.length > 80 ? (state.drawerEditMemory.fact | slice:0:80) + '\u2026' : state.drawerEditMemory.fact }} }
                  @if (dr.kind === 'entity') { {{ state.drawerEditEntity.name || dr.record.name }} }
                  @if (dr.kind === 'edge') { {{ (dr.record.fromName || dr.record.from) + ' \u2192 ' + (dr.record.toName || dr.record.to) }} }
                  @if (dr.kind === 'chrono') { {{ state.drawerEditChrono.title || dr.record.title }} }
                </div>
              </div>
              <div style="display:flex; gap:8px; flex-shrink:0; align-items:flex-start; padding-top:2px;">
                <button class="btn btn-sm btn-primary" [disabled]="state.drawerSaving()" (click)="state.save()">
                  @if (state.drawerSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                </button>
                <button class="icon-btn" [attr.title]="'common.close' | transloco" [attr.aria-label]="'brain.drawer.closeDetailsAriaLabel' | transloco" (click)="state.close()"><ph-icon name="x" [size]="16"/></button>
              </div>
            </div>
            @if (state.drawerError()) {
              <div class="alert alert-error" style="margin-bottom:16px; font-size:13px;">{{ state.drawerError() }}</div>
            }

            <form>
              <!-- ── MEMORY ── -->
              @if (dr.kind === 'memory') {
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.fact' | transloco }} <span style="color:var(--error)">*</span></div>
                  <textarea [(ngModel)]="state.drawerEditMemory.fact" name="drwMemFact" rows="4"></textarea>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
                  <textarea [(ngModel)]="state.drawerEditMemory.description" name="drwMemDesc" rows="3" style="resize:vertical;"></textarea>
                </div>
                <div class="drawer-field">
                  <!-- Matches the create form exactly, and for the same reason: since P-24 a space declaring
                       typeSchemas.memory restricts memory types, so free text there would submit a value the
                       server refuses. A space declaring none is unrestricted and keeps the free-text input.
                       The two controls must agree — one door offering a type the other cannot write is the
                       shape this whole item was about. -->
                  <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
                  @if (store.memoryTypesAreRestricted()) {
                    <select [(ngModel)]="state.drawerEditMemory.type" name="drwMemType">
                      <option value=""></option>
                      @for (t of store.memoryAllowedTypes(); track t) { <option [value]="t">{{ t }}</option> }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="state.drawerEditMemory.type" name="drwMemType" list="drwMemTypeOptions" />
                    <datalist id="drwMemTypeOptions">
                      @for (t of store.memoryTypeOptions(); track t) { <option [value]="t"></option> }
                    </datalist>
                  }
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
                  <app-tag-input [(value)]="state.drawerEditMemory.tags" [suggestions]="store.memoryTagSuggestions()" inputName="drwMemTags" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.entityIds' | transloco }}</div>
                  <app-entity-ref-field [target]="state.drawerEditMemory" [spaceId]="state.spaceId()" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
                  <app-properties-editor [schema]="store.memorySchema()" [required]="store.requiredProps(store.memorySchema())" [(value)]="state.drawerEditMemory.properties" />
                </div>
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace); font-size:11px;">{{ dr.record._id }}</div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.seq' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.seq }}</div>
                </div>
                @if (dr.record.author) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.authorInstanceId' | transloco }}</div>
                    <div class="drawer-readonly-value">{{ dr.record.author.instanceId }}</div>
                  </div>
                }
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              }

              <!-- ── ENTITY ── -->
              @if (dr.kind === 'entity') {
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'brain.entities.table.name' | transloco }} <span style="color:var(--error)">*</span></div>
                  <input type="text" [(ngModel)]="state.drawerEditEntity.name" name="drwEntName" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.type' | transloco }} @if (store.entityTypeNames().length) { <span style="color:var(--error)">*</span> }</div>
                  @if (store.entityTypeNames().length) {
                    <select [(ngModel)]="state.drawerEditEntity.type" name="drwEntType" (ngModelChange)="state.onEntityTypeChange($event)">
                      @for (t of store.entityTypeNames(); track t) {
                        <option [value]="t">{{ t }}</option>
                      }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="state.drawerEditEntity.type" name="drwEntType" />
                  }
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
                  <textarea [(ngModel)]="state.drawerEditEntity.description" name="drwEntDesc" rows="3" style="resize:vertical;"></textarea>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
                  <app-tag-input [(value)]="state.drawerEditEntity.tags" [suggestions]="store.entityTagSuggestions()" inputName="drwEntTags" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
                  <app-properties-editor [schema]="store.entitySchema(state.drawerEditEntity.type)" [required]="store.requiredProps(store.entitySchema(state.drawerEditEntity.type))" [(value)]="state.drawerEditEntity.properties" />
                </div>
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace); font-size:11px;">{{ dr.record._id }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              }

              <!-- ── EDGE ── -->
              @if (dr.kind === 'edge') {
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.from' | transloco }} <span class="drawer-muted">{{ 'common.readOnly' | transloco }}</span></div>
                  <div class="drawer-readonly-value">{{ dr.record.fromName || dr.record.from }}<span style="font-size:11px;"> ({{ dr.record.from }})</span></div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'brain.edges.table.relation' | transloco }} <span style="color:var(--error)">*</span></div>
                  @if (store.edgeLabelNames().length) {
                    <select [(ngModel)]="state.drawerEditEdge.label" name="drwEdgeLabel">
                      @for (l of store.edgeLabelNames(); track l) {
                        <option [value]="l">{{ l }}</option>
                      }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="state.drawerEditEdge.label" name="drwEdgeLabel" />
                  }
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.to' | transloco }} <span class="drawer-muted">{{ 'common.readOnly' | transloco }}</span></div>
                  <div class="drawer-readonly-value">{{ dr.record.toName || dr.record.to }}<span style="font-size:11px;"> ({{ dr.record.to }})</span></div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
                  <input type="text" [(ngModel)]="state.drawerEditEdge.type" name="drwEdgeType" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.weight' | transloco }}</div>
                  <input type="number" [(ngModel)]="state.drawerEditEdge.weight" name="drwEdgeWeight" step="0.1" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
                  <textarea [(ngModel)]="state.drawerEditEdge.description" name="drwEdgeDesc" rows="3" style="resize:vertical;"></textarea>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
                  <app-tag-input [(value)]="state.drawerEditEdge.tags" [suggestions]="store.edgeTagSuggestions()" inputName="drwEdgeTags" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
                  <app-properties-editor [schema]="store.edgeSchema(state.drawerEditEdge.label)" [required]="store.requiredProps(store.edgeSchema(state.drawerEditEdge.label))" [(value)]="state.drawerEditEdge.properties" />
                </div>
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace); font-size:11px;">{{ dr.record._id }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              }

              <!-- ── CHRONO ── -->
              @if (dr.kind === 'chrono') {
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.title' | transloco }} <span style="color:var(--error)">*</span></div>
                  <input type="text" [(ngModel)]="state.drawerEditChrono.title" name="drwChronoTitle" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.type' | transloco }} <span style="color:var(--error)">*</span></div>
                  <select [(ngModel)]="state.drawerEditChrono.kind" name="drwChronoKind" (ngModelChange)="state.onDrawerChronoKindChange()">
                    @for (k of store.chronoTypeOptions(); track k) { <option [value]="k">{{ k }}</option> }
                  </select>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'brain.chrono.table.status' | transloco }}</div>
                  <select [(ngModel)]="state.drawerEditChrono.status" name="drwChronoStatus">
                    @for (s of store.chronoStatusOptions; track s) { <option [value]="s">{{ s }}</option> }
                  </select>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.startsAt' | transloco }} <span style="color:var(--error)">*</span></div>
                  <input type="datetime-local" [(ngModel)]="state.drawerEditChrono.startsAt" name="drwChronoStarts" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.endsAt' | transloco }}</div>
                  <input type="datetime-local" [(ngModel)]="state.drawerEditChrono.endsAt" name="drwChronoEnds" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.confidence' | transloco }} <span class="drawer-muted">(0-1)</span></div>
                  <input type="number" [(ngModel)]="state.drawerEditChrono.confidence" name="drwChronoConf" min="0" max="1" step="0.01" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
                  <textarea [(ngModel)]="state.drawerEditChrono.description" name="drwChronoDesc" rows="3"></textarea>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
                  <app-tag-input [(value)]="state.drawerEditChrono.tags" [suggestions]="store.chronoTagSuggestions()" inputName="drwChronoTags" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.entityIds' | transloco }}</div>
                  <app-entity-ref-field [target]="state.drawerEditChrono" [spaceId]="state.spaceId()" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.memoryIds' | transloco }}</div>
                  <app-memory-ref-field [target]="state.drawerEditChrono" />
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'brain.chrono.table.properties' | transloco }}</div>
                  <app-properties-editor [schema]="store.chronoSchema(state.drawerChronoKind())" [required]="store.requiredProps(store.chronoSchema(state.drawerChronoKind()))" [(value)]="state.drawerEditChrono.properties" />
                </div>
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.spaceId' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.spaceId }}</div>
                </div>
                @if (dr.record.recurrence) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.recurrence' | transloco }}</div>
                    <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace); font-size:11px;">{{ dr.record.recurrence | json }}</div>
                  </div>
                }
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.author' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.author.instanceLabel }} ({{ dr.record.author.instanceId }})</div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.seq' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.seq }}</div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace); font-size:11px;">{{ dr.record._id }}</div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">{{ 'common.updatedAt' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ dr.record.updatedAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              }
            </form>

          </div>
        </div>
      }
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n", "\n    .drawer-overlay {\n      position: fixed; inset: 0; background: var(--bg-scrim);\n      z-index: 200; display: flex; justify-content: flex-end;\n    }\n    .drawer {\n      width: min(480px, 100vw); background: var(--bg-primary); height: 100%;\n      overflow-y: auto; padding: 20px 24px;\n      box-shadow: var(--shadow-drawer);\n      display: flex; flex-direction: column;\n      animation: drawer-in .18s ease;\n    }\n    @keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }\n    .drawer-header {\n      display: flex; justify-content: space-between; align-items: flex-start;\n      margin-bottom: 20px; padding-bottom: 14px;\n      border-bottom: 1px solid var(--border); gap: 12px;\n    }\n    .drawer-title { font-size: 16px; font-weight: 600; color: var(--text-primary); word-break: break-word; }\n    .drawer-field { margin-bottom: 16px; }\n    .drawer-label {\n      font-size: 10px; font-weight: 600; color: var(--text-muted);\n      text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px;\n    }\n    .drawer-value { font-size: 13px; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; line-height: 1.5; }\n    .drawer-muted { color: var(--text-muted); }\n    .drawer-hr { border: none; border-top: 1px solid var(--border-muted); margin: 16px 0; }\n    .drawer-readonly-value {\n      font-size: 13px; color: var(--text-muted); padding: 5px 8px;\n      border: 1px solid var(--border-muted); border-radius: var(--radius-sm);\n      background: var(--bg-surface); word-break: break-all; line-height: 1.4;\n    }\n    .drawer input[type=text], .drawer input[type=number], .drawer input[type=datetime-local],\n    .drawer textarea, .drawer select {\n      width: 100%; padding: 5px 8px; border: 1px solid var(--border);\n      border-radius: var(--radius-sm); font-size: 13px;\n      background: var(--bg-primary); color: var(--text-primary); box-sizing: border-box;\n    }\n    .drawer textarea { resize: vertical; }\n    .drawer select { cursor: pointer; }\n"] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(RecordDrawerComponent, { className: "RecordDrawerComponent", filePath: "app/pages/brain/record-drawer.component.ts", lineNumber: 306 }); })();
