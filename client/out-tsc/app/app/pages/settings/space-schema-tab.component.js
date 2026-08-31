/**
 * Schema tab — per-type schemas, property rules, and schema-library import/export.
 *
 * Extracted from SpacesComponent (A17.8b), together with the import-conflict and library-picker
 * dialogs it owns. Needs no inputs/outputs: SpaceSettingsState holds the schema being edited.
 *
 * Layout is master/detail (PR-U4): a type list on the left selects the type shown in a stable editor
 * pane on the right, so editing a type or a property no longer collapses the whole list (the old
 * 4-level accordion). Property editors are multi-open — several can be expanded at once in the pane.
 *
 * `schImportError`/`schImportInfo` are signals here, unlike in the old component where they were
 * plain fields. They are written from `FileReader.onload`, which is a bare async callback with no
 * signal write of its own — under OnPush a plain field mutated there would leave the message
 * unrendered. That hazard is exactly why OnPush was not retrofitted onto the 1600-line parent and
 * is applied per component instead.
 */
import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState, emptyTypeSchemaState, typeSchemaFromState } from './space-settings-state.service';
import { SchemaApi } from '../../core/schema-api.service';
import { ToastService } from '../../core/toast.service';
import { recordTtlWindows } from '../../core/api.types';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { SCHEMA_MD_STYLES } from './schema-styles';
import { SchemaTypeEditorComponent } from './schema-type-editor.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
import * as i2 from "@angular/forms";
const _c0 = ["schImportInput"];
const _c1 = ["schTypeImportInput"];
const _c2 = a0 => ({ field: a0 });
const _c3 = a0 => ({ kt: a0 });
const _c4 = a0 => ({ names: a0 });
const _c5 = (a0, a1) => ({ name: a0, kt: a1 });
const _forTrack0 = ($index, $item) => $item.group;
const _forTrack1 = ($index, $item) => $item.name;
function SpaceSchemaTabComponent_Conditional_61_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 24);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.typeCount("entity"));
} }
function SpaceSchemaTabComponent_Conditional_65_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 24);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.typeCount("edge"));
} }
function SpaceSchemaTabComponent_Conditional_69_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 24);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.typeCount("memory"));
} }
function SpaceSchemaTabComponent_Conditional_73_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 24);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.typeCount("chrono"));
} }
function SpaceSchemaTabComponent_ng_container_82_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementContainer(0);
} }
function SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 49);
    i0.ɵɵtext(1, "Library");
    i0.ɵɵelementEnd();
} }
function SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 50);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const name_r6 = i0.ɵɵnextContext(2).$implicit;
    const kt_r4 = i0.ɵɵnextContext().kt;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", ctx_r1.state.typeState(kt_r4, name_r6).propertySchemas.length, "p");
} }
function SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 50);
    i0.ɵɵtext(1, "pat");
    i0.ɵɵelementEnd();
} }
function SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 51);
    i0.ɵɵtext(1, "ttl");
    i0.ɵɵelementEnd();
} }
function SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Conditional_0_Template, 2, 1, "span", 50);
    i0.ɵɵconditionalCreate(1, SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Conditional_1_Template, 2, 0, "span", 50);
    i0.ɵɵconditionalCreate(2, SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Conditional_2_Template, 2, 0, "span", 51);
} if (rf & 2) {
    const name_r6 = i0.ɵɵnextContext().$implicit;
    const kt_r4 = i0.ɵɵnextContext().kt;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.state.typeState(kt_r4, name_r6).propertySchemas.length ? 0 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(kt_r4 === "entity" && ctx_r1.state.typeState(kt_r4, name_r6).namingPattern ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.typeState(kt_r4, name_r6).retentionDays || ctx_r1.state.typeState(kt_r4, name_r6).retentionContentDays ? 2 : -1);
} }
function SpaceSchemaTabComponent_ng_template_83_For_16_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 46);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_ng_template_83_For_16_Template_button_click_0_listener() { const name_r6 = i0.ɵɵrestoreView(_r5).$implicit; const kt_r4 = i0.ɵɵnextContext().kt; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.selectType(kt_r4, name_r6)); });
    i0.ɵɵelementStart(1, "span", 47);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 48);
    i0.ɵɵconditionalCreate(4, SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_4_Template, 2, 0, "span", 49)(5, SpaceSchemaTabComponent_ng_template_83_For_16_Conditional_5_Template, 3, 3);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const name_r6 = ctx.$implicit;
    const kt_r4 = i0.ɵɵnextContext().kt;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("sel", ctx_r1.state.isTypeSelected(kt_r4, name_r6));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(name_r6);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.state.typeLibRef(kt_r4, name_r6) ? 4 : 5);
} }
function SpaceSchemaTabComponent_ng_template_83_ForEmpty_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 40);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const kt_r4 = i0.ɵɵnextContext().kt;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(kt_r4 === "edge" ? i0.ɵɵpipeBind1(2, 1, "spaces.schema.noEdgeLabels") : i0.ɵɵpipeBind1(3, 3, "spaces.schema.noTypes"));
} }
function SpaceSchemaTabComponent_ng_template_83_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 42);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.schImportError());
} }
function SpaceSchemaTabComponent_ng_template_83_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 42);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.schema.libPicker.skipped", i0.ɵɵpureFunction1(4, _c4, ctx_r1.libImportSkipped().join(", "))));
} }
function SpaceSchemaTabComponent_ng_template_83_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 43);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.schImportInfo());
} }
function SpaceSchemaTabComponent_ng_template_83_Conditional_23_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 55);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_ng_template_83_Conditional_23_Conditional_7_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r9); const name_r8 = i0.ɵɵnextContext(); const kt_r4 = i0.ɵɵnextContext().kt; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.saveTypeToLibrary(kt_r4, name_r8)); });
    i0.ɵɵelement(3, "ph-icon", 61);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 3, "spaces.schema.saveToLibraryTitle"))("aria-label", i0.ɵɵpipeBind1(2, 5, "spaces.schema.saveToLibraryButton"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 13);
} }
function SpaceSchemaTabComponent_ng_template_83_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 52)(1, "span", 53);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 54)(4, "button", 55);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_ng_template_83_Conditional_23_Template_button_click_4_listener() { const name_r8 = i0.ɵɵrestoreView(_r7); const kt_r4 = i0.ɵɵnextContext().kt; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportTypeSchema(kt_r4, name_r8)); });
    i0.ɵɵelement(6, "ph-icon", 56);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(7, SpaceSchemaTabComponent_ng_template_83_Conditional_23_Conditional_7_Template, 4, 7, "button", 57);
    i0.ɵɵelementStart(8, "button", 58);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_ng_template_83_Conditional_23_Template_button_click_8_listener() { const name_r8 = i0.ɵɵrestoreView(_r7); const kt_r4 = i0.ɵɵnextContext().kt; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.removeType(kt_r4, name_r8)); });
    i0.ɵɵelement(10, "ph-icon", 59);
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "app-schema-type-editor", 60);
    i0.ɵɵlistener("unlink", function SpaceSchemaTabComponent_ng_template_83_Conditional_23_Template_app_schema_type_editor_unlink_11_listener() { const name_r8 = i0.ɵɵrestoreView(_r7); const kt_r4 = i0.ɵɵnextContext().kt; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.unlinkType(kt_r4, name_r8)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const name_r8 = ctx;
    const kt_r4 = i0.ɵɵnextContext().kt;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(name_r8);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(5, 11, "spaces.schema.exportTypeTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!ctx_r1.state.typeLibRef(kt_r4, name_r8) ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(9, 13, "common.remove"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵproperty("knowledgeType", kt_r4)("draft", ctx_r1.state.typeState(kt_r4, name_r8))("libRef", ctx_r1.state.typeLibRef(kt_r4, name_r8))("linkedProps", ctx_r1.linkedProps(kt_r4, name_r8))("spaceWindowDays", ctx_r1.spaceWindow(kt_r4));
} }
function SpaceSchemaTabComponent_ng_template_83_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 45);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const kt_r4 = i0.ɵɵnextContext().kt;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(kt_r4 === "edge" ? i0.ɵɵpipeBind1(2, 1, "spaces.schema.detail.emptyEdge") : i0.ɵɵpipeBind1(3, 3, "spaces.schema.detail.empty"));
} }
function SpaceSchemaTabComponent_ng_template_83_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 32)(1, "div", 33)(2, "div", 34)(3, "input", 35);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SpaceSchemaTabComponent_ng_template_83_Template_input_ngModelChange_3_listener($event) { const kt_r4 = i0.ɵɵrestoreView(_r3).kt; const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.state.schNewTypeInputs[kt_r4], $event) || (ctx_r1.state.schNewTypeInputs[kt_r4] = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keydown.enter", function SpaceSchemaTabComponent_ng_template_83_Template_input_keydown_enter_3_listener($event) { const kt_r4 = i0.ɵɵrestoreView(_r3).kt; const ctx_r1 = i0.ɵɵnextContext(); $event.preventDefault(); return i0.ɵɵresetView(ctx_r1.state.addType(kt_r4)); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "button", 36);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_ng_template_83_Template_button_click_8_listener() { const kt_r4 = i0.ɵɵrestoreView(_r3).kt; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.addType(kt_r4)); });
    i0.ɵɵelement(13, "ph-icon", 37);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(14, "div", 38);
    i0.ɵɵrepeaterCreate(15, SpaceSchemaTabComponent_ng_template_83_For_16_Template, 6, 4, "button", 39, i0.ɵɵrepeaterTrackByIdentity, false, SpaceSchemaTabComponent_ng_template_83_ForEmpty_17_Template, 4, 5, "div", 40);
    i0.ɵɵelementEnd();
    i0.ɵɵelement(18, "div", 41);
    i0.ɵɵconditionalCreate(19, SpaceSchemaTabComponent_ng_template_83_Conditional_19_Template, 2, 1, "div", 42);
    i0.ɵɵconditionalCreate(20, SpaceSchemaTabComponent_ng_template_83_Conditional_20_Template, 3, 6, "div", 42);
    i0.ɵɵconditionalCreate(21, SpaceSchemaTabComponent_ng_template_83_Conditional_21_Template, 2, 1, "div", 43);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "div", 44);
    i0.ɵɵconditionalCreate(23, SpaceSchemaTabComponent_ng_template_83_Conditional_23_Template, 12, 15)(24, SpaceSchemaTabComponent_ng_template_83_Conditional_24_Template, 4, 5, "div", 45);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_16_0;
    const kt_r4 = ctx.kt;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.state.schNewTypeInputs[kt_r4]);
    i0.ɵɵproperty("placeholder", kt_r4 === "edge" ? i0.ɵɵpipeBind1(4, 12, "spaces.schema.newLabelPlaceholder") : i0.ɵɵpipeBind1(5, 14, "spaces.schema.newTypeNamePlaceholder"));
    i0.ɵɵattribute("aria-label", kt_r4 === "edge" ? i0.ɵɵpipeBind1(6, 16, "spaces.schema.addLabelButton") : i0.ɵɵpipeBind1(7, 18, "spaces.schema.addTypeButton"));
    i0.ɵɵadvance(5);
    i0.ɵɵproperty("disabled", !(ctx_r1.state.schNewTypeInputs[kt_r4] == null ? null : ctx_r1.state.schNewTypeInputs[kt_r4].trim()));
    i0.ɵɵattribute("title", kt_r4 === "edge" ? i0.ɵɵpipeBind1(9, 20, "spaces.schema.addLabelButton") : i0.ɵɵpipeBind1(10, 22, "spaces.schema.addTypeButton"))("aria-label", kt_r4 === "edge" ? i0.ɵɵpipeBind1(11, 24, "spaces.schema.addLabelButton") : i0.ɵɵpipeBind1(12, 26, "spaces.schema.addTypeButton"));
    i0.ɵɵadvance(5);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.state.typeNames(kt_r4));
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(ctx_r1.schImportError() ? 19 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.libImportSkipped().length ? 20 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.schImportInfo() ? 21 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_16_0 = ctx_r1.selectedTypeName(kt_r4)) ? 23 : 24, tmp_16_0);
} }
function SpaceSchemaTabComponent_Conditional_85_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 67)(1, "input", 69);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("ngModelChange", function SpaceSchemaTabComponent_Conditional_85_Conditional_12_Template_input_ngModelChange_1_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.importConflictAddAsName.set($event)); })("keydown.enter", function SpaceSchemaTabComponent_Conditional_85_Conditional_12_Template_input_keydown_enter_1_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); $event.preventDefault(); return i0.ɵɵresetView(ctx_r1.resolveImportConflictAddAs()); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 70);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_85_Conditional_12_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.resolveImportConflictAddAs()); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngModel", ctx_r1.importConflictAddAsName())("placeholder", i0.ɵɵpipeBind1(2, 4, "spaces.schema.conflict.newNamePlaceholder"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", !ctx_r1.importConflictAddAsName().trim());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 6, "spaces.schema.conflict.addAs"));
} }
function SpaceSchemaTabComponent_Conditional_85_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 30)(1, "div", 62);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SpaceSchemaTabComponent_Conditional_85_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.dismissImportConflict()); })("click", function SpaceSchemaTabComponent_Conditional_85_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 63);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(6, "p", 64);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementStart(8, "div", 65)(9, "button", 66);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_85_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.resolveImportConflictOverride()); });
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(12, SpaceSchemaTabComponent_Conditional_85_Conditional_12_Template, 6, 8, "div", 67);
    i0.ɵɵelementStart(13, "button", 68);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_85_Template_button_click_13_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.dismissImportConflict()); });
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const conflict_r12 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 6, "spaces.schema.conflict.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 8, "spaces.schema.conflict.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind2(7, 10, "spaces.schema.conflict.body", i0.ɵɵpureFunction2(17, _c5, conflict_r12.name, conflict_r12.kt)), i0.ɵɵsanitizeHtml);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 13, "spaces.schema.conflict.override"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.importConflict().allowAddAs ? 12 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 15, "common.cancel"));
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 74);
    i0.ɵɵelement(1, "span", 78);
    i0.ɵɵelementEnd();
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 79);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function SpaceSchemaTabComponent_Conditional_86_Conditional_11_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryLibPicker()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 3, "spaces.schema.libPicker.loadError"))("reason", ctx_r1.libPickerError() ?? "")("icon", 32);
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 76);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.schema.libPicker.empty"));
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 80)(1, "strong", 82);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 16);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_Conditional_0_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r15); const g_r16 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.importGroupFromLibrary(g_r16.group)); });
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const g_r16 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(g_r16.group);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 2, "spaces.schema.libPicker.importGroup"));
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_For_2_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 85);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r18 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(entry_r18.description);
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 81)(1, "div")(2, "div", 83);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 84);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_For_2_Conditional_6_Template, 2, 1, "div", 85);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 86)(8, "button", 16);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_For_2_Template_button_click_8_listener() { const entry_r18 = i0.ɵɵrestoreView(_r17).$implicit; const ctx_r1 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r1.importFromLibraryRef(entry_r18)); });
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const entry_r18 = ctx.$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(entry_r18.name);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate2("", entry_r18.knowledgeType, " \u00B7 ", entry_r18.typeName);
    i0.ɵɵadvance();
    i0.ɵɵconditional(entry_r18.description ? 6 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 5, "spaces.schema.libPicker.importRef"));
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_Conditional_0_Template, 6, 4, "div", 80);
    i0.ɵɵrepeaterCreate(1, SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_For_2_Template, 11, 7, "div", 81, _forTrack1);
} if (rf & 2) {
    const g_r16 = ctx.$implicit;
    i0.ɵɵconditional(g_r16.group ? 0 : -1);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(g_r16.entries);
} }
function SpaceSchemaTabComponent_Conditional_86_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 77);
    i0.ɵɵrepeaterCreate(1, SpaceSchemaTabComponent_Conditional_86_Conditional_13_For_2_Template, 3, 1, null, null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.libPickerGroups());
} }
function SpaceSchemaTabComponent_Conditional_86_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 31)(1, "div", 71);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SpaceSchemaTabComponent_Conditional_86_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeLibPicker()); })("click", function SpaceSchemaTabComponent_Conditional_86_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 72)(4, "strong");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 73);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_86_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeLibPicker()); });
    i0.ɵɵelement(9, "ph-icon", 59);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(10, SpaceSchemaTabComponent_Conditional_86_Conditional_10_Template, 2, 0, "div", 74)(11, SpaceSchemaTabComponent_Conditional_86_Conditional_11_Template, 2, 5, "app-error-state", 75)(12, SpaceSchemaTabComponent_Conditional_86_Conditional_12_Template, 3, 3, "p", 76)(13, SpaceSchemaTabComponent_Conditional_86_Conditional_13_Template, 3, 0, "div", 77);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 5, "spaces.schema.libPicker.title"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 7, "spaces.schema.libPicker.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 9, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.libPickerLoading() ? 10 : ctx_r1.libPickerError() !== null ? 11 : !ctx_r1.libPickerEntries().length ? 12 : 13);
} }
function SpaceSchemaTabComponent_Conditional_87_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 90);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.schema.exportToLibrary.dirtyWarning"));
} }
function SpaceSchemaTabComponent_Conditional_87_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 95);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r20 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(d_r20.error);
} }
function SpaceSchemaTabComponent_Conditional_87_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 97);
} }
function SpaceSchemaTabComponent_Conditional_87_Template(rf, ctx) { if (rf & 1) {
    const _r19 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 30)(1, "div", 87);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SpaceSchemaTabComponent_Conditional_87_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeExportToLibrary()); })("click", function SpaceSchemaTabComponent_Conditional_87_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 88)(4, "strong");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 73);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_87_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeExportToLibrary()); });
    i0.ɵɵelement(9, "ph-icon", 59);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "p", 89);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(13, SpaceSchemaTabComponent_Conditional_87_Conditional_13_Template, 3, 3, "div", 90);
    i0.ɵɵelementStart(14, "div", 91)(15, "label", 92);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "input", 93);
    i0.ɵɵlistener("ngModelChange", function SpaceSchemaTabComponent_Conditional_87_Template_input_ngModelChange_18_listener($event) { const d_r20 = i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportLibDialog.set({ ...d_r20, groupName: $event })); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(19, "div", 94)(20, "label", 92);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "input", 93);
    i0.ɵɵlistener("ngModelChange", function SpaceSchemaTabComponent_Conditional_87_Template_input_ngModelChange_23_listener($event) { const d_r20 = i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportLibDialog.set({ ...d_r20, namePrefix: $event })); });
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(24, SpaceSchemaTabComponent_Conditional_87_Conditional_24_Template, 2, 1, "div", 95);
    i0.ɵɵelementStart(25, "div", 96)(26, "button", 16);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_87_Template_button_click_26_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeExportToLibrary()); });
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(29, "button", 70);
    i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Conditional_87_Template_button_click_29_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.doExportToLibrary()); });
    i0.ɵɵconditionalCreate(30, SpaceSchemaTabComponent_Conditional_87_Conditional_30_Template, 1, 0, "span", 97);
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const d_r20 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 15, "spaces.schema.exportToLibrary.title"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 17, "spaces.schema.exportToLibrary.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 19, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 21, "spaces.schema.exportToLibrary.hint"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.state.isDirty() ? 13 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 23, "spaces.schema.exportToLibrary.groupLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngModel", d_r20.groupName);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 25, "spaces.schema.exportToLibrary.prefixLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngModel", d_r20.namePrefix);
    i0.ɵɵadvance();
    i0.ɵɵconditional(d_r20.error ? 24 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 27, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", d_r20.saving || ctx_r1.state.isDirty() || !d_r20.groupName.trim());
    i0.ɵɵadvance();
    i0.ɵɵconditional(d_r20.saving ? 30 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(32, 29, "spaces.schema.exportToLibrary.confirm"), " ");
} }
export class SpaceSchemaTabComponent {
    constructor() {
        this.state = inject(SpaceSettingsState);
        this.schemaApi = inject(SchemaApi);
        this.toast = inject(ToastService);
        this.transloco = inject(TranslocoService);
        this._typeImportTarget = null;
        /**
         * Where a library import lands. `kt: null` means the pick came from the TOP action row, which is not
         * scoped to a knowledge type — the entry carries its own, so the target is derived per entry.
         */
        this._libPickerTarget = null;
        this.schImportError = signal('', ...(ngDevMode ? [{ debugName: "schImportError" }] : /* istanbul ignore next */ []));
        /**
         * The record field the active collection's allowlist governs — the one word that differs between the
         * four collections, so the guidance around it can be a single string rather than four near-copies.
         */
        this.allowlistField = computed(() => {
            switch (this.state.schemaCollTab()) {
                case 'edge': return 'edge.label';
                case 'memory': return 'memory.type';
                case 'chrono': return 'chrono.type';
                default: return 'entity.type';
            }
        }, ...(ngDevMode ? [{ debugName: "allowlistField" }] : /* istanbul ignore next */ []));
        /** Success/info note after a schema import stages types (cleared on the next action). */
        this.schImportInfo = signal('', ...(ngDevMode ? [{ debugName: "schImportInfo" }] : /* istanbul ignore next */ []));
        /** Pending import conflict: holds the parsed state waiting for user resolution. */
        this.importConflict = signal(null, ...(ngDevMode ? [{ debugName: "importConflict" }] : /* istanbul ignore next */ []));
        this.importConflictAddAsName = signal('', ...(ngDevMode ? [{ debugName: "importConflictAddAsName" }] : /* istanbul ignore next */ []));
        this.showLibPickerDialog = signal(false, ...(ngDevMode ? [{ debugName: "showLibPickerDialog" }] : /* istanbul ignore next */ []));
        /** "Export whole schema to library" dialog state (null = closed). */
        this.exportLibDialog = signal(null, ...(ngDevMode ? [{ debugName: "exportLibDialog" }] : /* istanbul ignore next */ []));
        this.libPickerLoading = signal(false, ...(ngDevMode ? [{ debugName: "libPickerLoading" }] : /* istanbul ignore next */ []));
        /** Null until the picker's fetch failed — checked before its empty text, so a failure never reads as "the library is empty". */
        this.libPickerError = signal(null, ...(ngDevMode ? [{ debugName: "libPickerError" }] : /* istanbul ignore next */ []));
        this.libPickerEntries = signal([], ...(ngDevMode ? [{ debugName: "libPickerEntries" }] : /* istanbul ignore next */ []));
        /** All schema-library entries by name — used to show a linked type's properties read-only and to
         *  resolve its schema when unlinking (turning the $ref into an inline, editable copy). */
        this.libEntriesByName = signal({}, ...(ngDevMode ? [{ debugName: "libEntriesByName" }] : /* istanbul ignore next */ []));
        /** Entries bucketed by `schemaGroup`, so a whole group can be taken in one action. Ungrouped last. */
        this.libPickerGroups = computed(() => {
            const byGroup = new Map();
            for (const e of this.libPickerEntries()) {
                const g = e.schemaGroup?.trim() || '';
                byGroup.set(g, [...(byGroup.get(g) ?? []), e]);
            }
            return [...byGroup.entries()]
                .map(([group, entries]) => ({ group, entries }))
                .sort((a, b) => (a.group === '' ? 1 : b.group === '' ? -1 : a.group.localeCompare(b.group)));
        }, ...(ngDevMode ? [{ debugName: "libPickerGroups" }] : /* istanbul ignore next */ []));
        /** Type names a group import left alone because the space already had them. */
        this.libImportSkipped = signal([], ...(ngDevMode ? [{ debugName: "libImportSkipped" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        // Load the library once so linked types can render their (read-only) properties and be unlinked
        // into an inline copy without a per-type round-trip.
        this.schemaApi.listSchemaLibrary().subscribe({
            next: ({ entries }) => this.libEntriesByName.set(Object.fromEntries(entries.map(e => [e.name, e]))),
            error: () => this.libEntriesByName.set({}),
        });
    }
    /** The library entry a linked type points at, if it has been loaded — else null. */
    linkedEntry(kt, name) {
        const ref = this.state.typeLibRef(kt, name);
        return ref ? (this.libEntriesByName()[ref] ?? null) : null;
    }
    /** A linked type's property schemas, as a display list (read-only), resolved from the library. */
    linkedProps(kt, name) {
        const schema = this.linkedEntry(kt, name)?.schema;
        return Object.entries(schema?.propertySchemas ?? {}).map(([key, s]) => ({ key, s }));
    }
    /**
     * The effective delete window when a chrono type's content window sits at or beyond it — else null.
     *
     * Mirrors `contentDays()` on the server exactly, including its fall-through: a type with no `days` of its own
     * is still deleted at the SPACE default, so a 30-day content window under a 30-day space default never fires
     * either. Returning the number lets the message say which window it lost to, which is the part an operator
     * cannot work out from the two fields in front of them.
     */
    contentWindowNeverFires(kt, name) {
        if (kt !== 'chrono')
            return null;
        const s = this.state.typeState(kt, name);
        const content = Number(s.retentionContentDays);
        if (!Number.isFinite(content) || content <= 0)
            return null;
        const total = Number(s.retentionDays) || this.spaceWindow(kt) || 0;
        return total > 0 && content >= total ? total : null;
    }
    /**
     * The space-tier window this collection would inherit, or null.
     *
     * The space tier is five per-collection windows, so "the space default" is not one number. Naming the wrong
     * bucket in the hint would be worse than naming none — an operator would set a window against a figure that
     * does not apply to the type in front of them.
     */
    spaceWindow(kt) {
        return recordTtlWindows(this.state.settingsSpace()?.recordTtlDays)[kt];
    }
    /** A one-line, read-only summary of a property's constraints for the linked-type view. */
    propConstraintSummary(s) {
        const parts = [];
        if (s.required)
            parts.push(this.transloco.translate('spaces.schema.propDetail.required'));
        if (s.enum?.length)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.enumValues')}: ${s.enum.join(', ')}`);
        if (s.minimum != null)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.min')} ${s.minimum}`);
        if (s.maximum != null)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.max')} ${s.maximum}`);
        if (s.pattern)
            parts.push(`/${s.pattern}/`);
        if (s.default != null)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.default')} ${s.default}`);
        return parts.join(' · ') || '—';
    }
    /**
     * Unlink a library-linked type: replace the `$ref` with an inline copy of the library entry's schema
     * so the space can then customise it. Mirrors the inline branch of the state loader; leaves the change
     * pending in the form (buildMeta() then stores it inline instead of a $ref) — the footer Save persists.
     */
    unlinkType(kt, name) {
        const entry = this.linkedEntry(kt, name);
        if (!entry) {
            this.toast.error(this.transloco.translate('spaces.schema.libRef.unlinkFailed'));
            return;
        }
        const schema = entry.schema;
        this.state.schTypeSchemas = {
            ...this.state.schTypeSchemas,
            [kt]: {
                ...(this.state.schTypeSchemas[kt] ?? {}),
                // No retention: a library entry cannot carry one (the library's own schema rejects the field), so an
                // unlinked type starts on the space default rather than inheriting a window from somewhere it never had.
                // _libRef intentionally dropped — the type is now a plain inline schema.
                [name]: emptyTypeSchemaState({
                    namingPattern: schema.namingPattern ?? '',
                    propertySchemas: Object.entries(schema.propertySchemas ?? {}).map(([k, ps]) => ({ key: k, s: { ...ps }, _enumInput: '' })),
                }),
            },
        };
    }
    /** The selected type's name if it belongs to the given collection and still exists, else null. */
    selectedTypeName(kt) {
        const s = this.state.schSelectedType;
        return s && s.kt === kt && this.state.typeNames(kt).includes(s.name) ? s.name : null;
    }
    exportSchema() {
        const space = this.state.settingsSpace();
        if (!space)
            return;
        const meta = this.state.buildMeta();
        const payload = {
            spaceId: space.id,
            spaceLabel: space.label,
            exportedAt: new Date().toISOString(),
            typeSchemas: meta.typeSchemas ?? {},
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${space.id}_schemas.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    triggerImportSchema() {
        this.schImportError.set('');
        this.schImportInputRef?.nativeElement.click();
    }
    /**
     * Export the WHOLE space schema into the instance schema library as a named, reusable group
     * (auto-grouped: one entry per inline type, `$ref` types skipped). Reuses the server `export-space`
     * endpoint, which reads the SAVED space config — so it is disabled while the editor has unsaved
     * changes (the dialog says so). The Schema-Library page's "apply group" is the reverse.
     */
    openExportToLibrary() {
        const space = this.state.settingsSpace();
        if (!space)
            return;
        this.exportLibDialog.set({ groupName: space.label || space.id, namePrefix: space.id, saving: false, error: '' });
    }
    closeExportToLibrary() { this.exportLibDialog.set(null); }
    doExportToLibrary() {
        const d = this.exportLibDialog();
        const space = this.state.settingsSpace();
        if (!d || !space || this.state.isDirty() || !d.groupName.trim())
            return;
        this.exportLibDialog.set({ ...d, saving: true, error: '' });
        this.schemaApi.exportSpaceSchemaToLibrary({
            spaceId: space.id,
            groupName: d.groupName.trim(),
            namePrefix: d.namePrefix.trim() || undefined,
        }).subscribe({
            next: (r) => {
                this.exportLibDialog.set(null);
                this.toast.success(this.transloco.translate('spaces.schema.exportToLibrary.done', {
                    created: r.created, updated: r.updated, group: d.groupName.trim(),
                }));
            },
            error: (err) => {
                this.exportLibDialog.set({ ...d, saving: false, error: err?.error?.error ?? this.transloco.translate('spaces.schema.exportToLibrary.failed') });
            },
        });
    }
    /**
     * Map one raw type-schema object (as exported / stored) into editor state.
     *
     * A type-level `$ref` is read FIRST and short-circuits the rest. It used to be ignored entirely, and the
     * consequence was not a broken import but a silently empty one: `{ "$ref": "library:cross-space-reference" }`
     * has no `namingPattern`, no `propertySchemas` and no `retention`, so every field below read as absent and
     * the type saved as `{}` — no naming rule, nothing required, every new record accepted. The per-type
     * "import as $ref" action always handled this; the whole-file import did not, which is why the same file
     * gave two different answers depending on which button was used.
     */
    mapImportedTypeSchema(ts2) {
        const ref = ts2['$ref'];
        if (typeof ref === 'string' && ref.startsWith('library:')) {
            // `_libRef` is the editor's marker for "this type is a library reference"; `buildMeta()` turns it
            // back into `{ $ref: 'library:<name>' }` on save, and the server resolves it.
            return emptyTypeSchemaState({ _libRef: ref.slice('library:'.length) });
        }
        // A retention window travels with the type it belongs to. It is read defensively because the file is
        // arbitrary JSON: a string or a negative number becomes "inherit" rather than a save the API will reject.
        const ret = ts2['retention'];
        const win = (k) => {
            if (!ret || typeof ret !== 'object' || Array.isArray(ret))
                return null;
            const v = ret[k];
            return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
        };
        return emptyTypeSchemaState({
            namingPattern: typeof ts2['namingPattern'] === 'string' ? ts2['namingPattern'] : '',
            retentionDays: win('days'),
            retentionContentDays: win('contentDays'),
            propertySchemas: (() => {
                const ps = ts2['propertySchemas'];
                if (!ps || typeof ps !== 'object' || Array.isArray(ps))
                    return [];
                // Spread preserves every field, including `$ref` (library references).
                return Object.entries(ps).map(([k, v]) => ({
                    key: k,
                    s: { ...v },
                    _enumInput: '',
                }));
            })(),
        });
    }
    onImportSchemaFile(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        this.schImportError.set('');
        this.schImportInfo.set('');
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = JSON.parse(reader.result);
                // Accept either { typeSchemas: {...} } wrapper or a bare typeSchemas object.
                const ts = raw?.typeSchemas ?? raw;
                if (!ts || typeof ts !== 'object' || Array.isArray(ts)) {
                    this.schImportError.set(this.transloco.translate('spaces.schema.import.invalidFile'));
                    return;
                }
                const tsObj = ts;
                const KINDS = ['entity', 'edge', 'memory', 'chrono'];
                const merged = { ...this.state.schTypeSchemas };
                let imported = 0;
                if (typeof tsObj['knowledgeType'] === 'string'
                    && typeof tsObj['typeName'] === 'string'
                    && tsObj['schema'] && typeof tsObj['schema'] === 'object' && !Array.isArray(tsObj['schema'])) {
                    // Shape 1: Ythril's own per-type export — { knowledgeType, typeName, schema }.
                    const kt = tsObj['knowledgeType'];
                    if (KINDS.includes(kt)) {
                        const existing = { ...(merged[kt] ?? {}) };
                        existing[tsObj['typeName']] = this.mapImportedTypeSchema(tsObj['schema']);
                        merged[kt] = existing;
                        imported++;
                    }
                }
                else {
                    // Shape 2: { entity: { <typeName>: <schema>, ... }, edge: {...}, ... }.
                    for (const kt of KINDS) {
                        const ktRaw = tsObj[kt];
                        if (!ktRaw || typeof ktRaw !== 'object' || Array.isArray(ktRaw))
                            continue;
                        const existing = { ...(merged[kt] ?? {}) };
                        for (const [typeName, tsRaw] of Object.entries(ktRaw)) {
                            existing[typeName] = this.mapImportedTypeSchema(tsRaw);
                            imported++;
                        }
                        merged[kt] = existing;
                    }
                }
                if (imported === 0) {
                    // Valid JSON, but nothing recognisable — tell the user instead of silently
                    // clearing the error and appearing to succeed (B2).
                    const foundKeys = Object.keys(tsObj).slice(0, 12).join(', ') || '(none)';
                    this.schImportError.set(this.transloco.translate('spaces.schema.import.noTypesFound', { keys: foundKeys }));
                    return;
                }
                this.state.schTypeSchemas = merged;
                this.schImportError.set('');
                // Import only STAGES the schemas — they aren't persisted until Save is pressed.
                this.schImportInfo.set(this.transloco.translate('spaces.schema.import.staged', { count: imported }));
            }
            catch {
                this.schImportError.set(this.transloco.translate('spaces.schema.import.parseFailed'));
            }
            finally {
                // Reset the input so the same file can be re-imported if needed
                if (this.schImportInputRef)
                    this.schImportInputRef.nativeElement.value = '';
            }
        };
        reader.readAsText(file);
    }
    /** Download a single type definition as a JSON snippet. */
    exportTypeSchema(kt, name) {
        const space = this.state.settingsSpace();
        if (!space)
            return;
        // The export carries the retention window: it is part of what this type IS, and a file that omits it
        // re-imports as "inherit the space default" — a silent policy change on a round trip.
        const schema = typeSchemaFromState(kt, this.state.typeState(kt, name));
        const payload = { knowledgeType: kt, typeName: name, schema };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${space.id}_${kt}_${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    /** Open the file picker for per-type schema import (existing type replacement). */
    triggerImportTypeSchema(kt, name) {
        this._typeImportTarget = { kt, name };
        this.schImportError.set('');
        this.schTypeImportInputRef?.nativeElement.click();
    }
    /** Handle the file chosen for per-type import. */
    onImportTypeSchemaFile(event) {
        const file = event.target.files?.[0];
        if (!file || !this._typeImportTarget)
            return;
        const { kt } = this._typeImportTarget;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = JSON.parse(reader.result);
                // Accept either a full snippet { knowledgeType, typeName, schema } or a bare TypeSchema object
                const schemaRaw = raw?.schema ?? raw;
                if (!schemaRaw || typeof schemaRaw !== 'object' || Array.isArray(schemaRaw)) {
                    this.schImportError.set(this.transloco.translate('spaces.schema.import.invalidTypeFile'));
                    return;
                }
                // Determine target type name: from _typeImportTarget.name (existing), or file's typeName (new)
                const name = this._typeImportTarget?.name || (typeof raw?.typeName === 'string' ? raw.typeName.trim() : '');
                if (!name) {
                    this.schImportError.set(this.transloco.translate('spaces.schema.import.invalidTypeFile'));
                    return;
                }
                // Same mapping as the whole-schema import, and deliberately the same CALL: this was a hand-copied
                // duplicate of it, so the two paths read different subsets of a type — the bulk import gained
                // fields the per-type one silently dropped.
                const imported = this.mapImportedTypeSchema(schemaRaw);
                // When importing as a new type (name derived from file), check for collision
                if (!this._typeImportTarget?.name && this.state.typeNames(kt).includes(name)) {
                    // Stash parsed state and show conflict dialog instead of erroring
                    this.importConflict.set({ kt, name, state: imported, allowAddAs: true });
                    this.importConflictAddAsName.set(name + '-2');
                    return;
                }
                this.state.schTypeSchemas = {
                    ...this.state.schTypeSchemas,
                    [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [name]: imported },
                };
                this.schImportError.set('');
            }
            catch {
                this.schImportError.set(this.transloco.translate('spaces.schema.import.parseFailed'));
            }
            finally {
                if (this.schTypeImportInputRef)
                    this.schTypeImportInputRef.nativeElement.value = '';
                this._typeImportTarget = null;
            }
        };
        reader.readAsText(file);
    }
    dismissImportConflict() {
        this.importConflict.set(null);
        this.importConflictAddAsName.set('');
    }
    resolveImportConflictOverride() {
        const c = this.importConflict();
        if (!c)
            return;
        this.state.schTypeSchemas = {
            ...this.state.schTypeSchemas,
            [c.kt]: { ...(this.state.schTypeSchemas[c.kt] ?? {}), [c.name]: c.state },
        };
        this.dismissImportConflict();
    }
    resolveImportConflictAddAs() {
        const c = this.importConflict();
        const newName = this.importConflictAddAsName().trim();
        if (!c || !newName)
            return;
        if (this.state.typeNames(c.kt).includes(newName)) {
            // Still conflicts — update the suggested name signal so the input shakes visually
            this.importConflictAddAsName.set(newName);
            return;
        }
        this.state.schTypeSchemas = {
            ...this.state.schTypeSchemas,
            [c.kt]: { ...(this.state.schTypeSchemas[c.kt] ?? {}), [newName]: c.state },
        };
        this.dismissImportConflict();
    }
    saveTypeToLibrary(kt, name) {
        const state = this.state.typeState(kt, name);
        // Auto-derive entry name from the type name (slug)
        const entryName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 200);
        if (!entryName)
            return;
        // `withRetention: false` — a library entry has no `retention` key and its schema is strict, so including
        // one would 400. That is also why the caller is warned: converting this type to a $ref leaves the window
        // behind, and a silently-dropped delete policy is the worst kind to drop.
        const schema = typeSchemaFromState(kt, state, { withRetention: false });
        const losesRetention = state.retentionDays !== null || state.retentionContentDays !== null;
        const body = { knowledgeType: kt, typeName: name, schema: schema };
        this.schemaApi.upsertSchemaLibraryEntry(entryName, body).subscribe({
            next: () => {
                // Convert the in-space type to a $ref pointing at the new library entry
                const refState = emptyTypeSchemaState({ _libRef: entryName });
                this.state.schTypeSchemas = {
                    ...this.state.schTypeSchemas,
                    [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [name]: refState },
                };
                if (losesRetention)
                    this.toast.info(this.transloco.translate('spaces.schema.retention.libDropped', { name }));
            },
            error: (err) => {
                this.schImportError.set(err?.error?.error ?? this.transloco.translate('spaces.schema.libSave.failed'));
            },
        });
    }
    triggerImportFromLibrary(kt, name) {
        this._libPickerTarget = { kt, name };
        this.libPickerLoading.set(true);
        this.libPickerError.set(null);
        this.showLibPickerDialog.set(true);
        this.schemaApi.listSchemaLibrary().subscribe({
            next: ({ entries }) => {
                this.libPickerEntries.set(entries.filter(e => e.knowledgeType === kt));
                this.libPickerLoading.set(false);
            },
            error: (err) => {
                this.libPickerEntries.set([]);
                this.libPickerError.set(httpErrorReason(err));
                this.libPickerLoading.set(false);
            },
        });
    }
    /** Retry from the picker's error state — re-runs whichever of the two open paths produced it. */
    retryLibPicker() {
        const target = this._libPickerTarget;
        if (target?.kt)
            this.triggerImportFromLibrary(target.kt, target.name);
        else
            this.triggerImportFromLibraryAny();
    }
    /**
     * Open the library picker unscoped — every entry, from the top action row.
     *
     * Replaces the per-knowledge-type buttons that used to sit under each section: those existed only to
     * tell the importer where the schema belonged, and the library entry already records that.
     */
    triggerImportFromLibraryAny() {
        this.libImportSkipped.set([]);
        this._libPickerTarget = { kt: null, name: '' };
        this.libPickerLoading.set(true);
        this.libPickerError.set(null);
        this.showLibPickerDialog.set(true);
        this.schemaApi.listSchemaLibrary().subscribe({
            next: ({ entries }) => { this.libPickerEntries.set(entries); this.libPickerLoading.set(false); },
            error: (err) => {
                this.libPickerEntries.set([]);
                this.libPickerError.set(httpErrorReason(err));
                this.libPickerLoading.set(false);
            },
        });
    }
    /**
     * Import every entry in a group.
     *
     * Silently SKIPS a type that already exists rather than raising the single-import conflict dialog:
     * a group can hold many entries, and a modal per collision would be unusable. The skipped names are
     * surfaced so the outcome is never a silent partial import.
     */
    importGroupFromLibrary(group) {
        const entries = this.libPickerGroups().find(g => g.group === group)?.entries ?? [];
        const skipped = [];
        let next = { ...this.state.schTypeSchemas };
        for (const entry of entries) {
            const kt = entry.knowledgeType;
            const typeName = entry.typeName;
            if (!typeName)
                continue;
            if (Object.keys(next[kt] ?? {}).includes(typeName)) {
                skipped.push(typeName);
                continue;
            }
            const refState = emptyTypeSchemaState({ _libRef: entry.name });
            next = { ...next, [kt]: { ...(next[kt] ?? {}), [typeName]: refState } };
        }
        this.state.schTypeSchemas = next;
        this.libImportSkipped.set(skipped);
        this.closeLibPicker();
    }
    closeLibPicker() {
        this.showLibPickerDialog.set(false);
        this._libPickerTarget = null;
    }
    /** Set the space's type to use a $ref pointing at this library entry. */
    importFromLibraryRef(entry) {
        const target = this._libPickerTarget;
        if (!target)
            return;
        // An unscoped (top-row) pick takes the knowledge type from the ENTRY. That is what lets one button
        // replace the per-type ones: the library already records where each schema belongs.
        const kt = target.kt ?? entry.knowledgeType;
        const typeName = target.name || entry.typeName;
        if (!typeName)
            return;
        // Store as a special sentinel state that renders as a $ref in buildMeta()
        const refState = emptyTypeSchemaState({ _libRef: entry.name });
        // When adding a new type from lib (no pre-existing name), check for collision
        if (!target.name && this.state.typeNames(kt).includes(typeName)) {
            this.closeLibPicker();
            this.importConflict.set({ kt, name: typeName, state: refState, allowAddAs: false });
            return;
        }
        this.state.schTypeSchemas = {
            ...this.state.schTypeSchemas,
            [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [typeName]: refState },
        };
        this.closeLibPicker();
    }
    static { this.ɵfac = function SpaceSchemaTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceSchemaTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceSchemaTabComponent, selectors: [["app-space-schema-tab"]], viewQuery: function SpaceSchemaTabComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuery(_c0, 5)(_c1, 5);
        } if (rf & 2) {
            let _t;
            i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.schImportInputRef = _t.first);
            i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.schTypeImportInputRef = _t.first);
        } }, decls: 88, vars: 107, consts: [["schImportInput", ""], ["schTypeImportInput", ""], ["masterDetail", ""], [1, "sch-validation-bar"], [1, "svb-label"], [1, "svb-title"], [1, "svb-hint"], [1, "val-controls"], [1, "val-lbl"], [1, "val-select", 3, "ngModelChange", "ngModel"], ["value", "off"], ["value", "warn"], ["value", "strict"], [1, "val-check"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [2, "display", "flex", "gap", "8px", "align-items", "center", "margin-bottom", "14px", "flex-wrap", "wrap"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"], ["name", "upload", 2, "margin-right", "5px", 3, "size"], ["name", "download-simple", 2, "margin-right", "5px", 3, "size"], ["name", "bookmarks", 2, "margin-right", "5px", 3, "size"], ["type", "file", "accept", ".json,application/json", 2, "display", "none", 3, "change"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-left", "4px"], ["role", "tablist", 1, "sch-coll-tabs"], ["role", "tab", 1, "sch-coll-tab", 3, "click"], [1, "sch-cnt-badge"], [1, "sch-coll-body"], [1, "sch-head-row"], [1, "sch-sub"], [1, "sch-hint"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"], [2, "position", "fixed", "inset", "0", "background", "var(--bg-scrim)", "display", "flex", "align-items", "center", "justify-content", "center", "z-index", "320"], [2, "position", "fixed", "inset", "0", "background", "var(--bg-scrim)", "display", "flex", "align-items", "center", "justify-content", "center", "z-index", "310"], [1, "sch-md"], [1, "sch-master"], [1, "sch-add-row"], ["type", "text", 3, "ngModelChange", "keydown.enter", "ngModel", "placeholder"], ["type", "button", 1, "sch-add-btn", 3, "click", "disabled"], ["name", "plus-circle", 3, "size"], [1, "sch-type-list"], ["type", "button", 1, "sch-type-item", 3, "sel"], [1, "sch-empty-list"], [1, "sch-add-imports"], [1, "sch-msg", "err"], [1, "sch-msg", "ok"], [1, "sch-detail"], [1, "sch-detail-empty"], ["type", "button", 1, "sch-type-item", 3, "click"], [1, "nm"], [1, "sch-type-badges"], [1, "badge", "badge-blue"], [1, "badge", "badge-gray"], [1, "badge", "badge-yellow"], [1, "sch-detail-head"], [1, "dt"], [1, "acts"], ["type", "button", 1, "btn", "btn-ghost", "btn-sm", 2, "padding", "2px 6px", 3, "click"], ["name", "upload", 3, "size"], ["type", "button", 1, "btn", "btn-ghost", "btn-sm", 2, "padding", "2px 6px"], ["type", "button", 1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [3, "unlink", "knowledgeType", "draft", "libRef", "linkedProps", "spaceWindowDays"], ["name", "bookmarks", 3, "size"], [2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "440px", "max-width", "96vw", 3, "dismiss", "click", "appModal"], [2, "font-weight", "700", "font-size", "15px", "margin-bottom", "8px"], [2, "font-size", "13px", "color", "var(--text-secondary)", "margin-bottom", "20px", 3, "innerHTML"], [2, "display", "flex", "flex-direction", "column", "gap", "10px"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], [2, "display", "flex", "gap", "8px", "align-items", "center"], ["type", "button", 1, "btn", "btn-ghost", 3, "click"], ["type", "text", 2, "flex", "1", 3, "ngModelChange", "keydown.enter", "ngModel", "placeholder"], ["type", "button", 1, "btn", "btn-primary", "btn-sm", 3, "click", "disabled"], ["appModalCloseOnBackdrop", "", 2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "560px", "max-width", "96vw", "max-height", "80vh", "overflow-y", "auto", 3, "dismiss", "click", "appModal"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "margin-bottom", "16px"], ["type", "button", 1, "icon-btn", 3, "click"], [1, "empty-state"], [3, "message", "reason", "icon"], [2, "font-size", "13px", "color", "var(--text-muted)"], [2, "display", "grid", "gap", "8px"], [1, "spinner"], [3, "retry", "message", "reason", "icon"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "gap", "8px", "margin-top", "4px"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "gap", "8px", "padding", "10px 12px", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)", "background", "var(--bg-surface)"], [2, "font-size", "12px", "text-transform", "uppercase", "letter-spacing", ".04em", "color", "var(--text-muted)"], [2, "font-weight", "600", "font-size", "13px", "font-family", "var(--font-mono)"], [2, "font-size", "11px", "color", "var(--text-muted)"], [2, "font-size", "11px", "color", "var(--text-secondary)"], [2, "display", "flex", "gap", "6px", "flex-shrink", "0"], ["appModalCloseOnBackdrop", "", 2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "480px", "max-width", "96vw", 3, "dismiss", "click", "appModal"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "margin-bottom", "12px"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin", "0 0 14px"], [1, "alert", "alert-warning", 2, "font-size", "12px", "margin-bottom", "12px"], [1, "field", 2, "margin-bottom", "10px"], [2, "font-size", "12px"], ["type", "text", 2, "width", "100%", 3, "ngModelChange", "ngModel"], [1, "field", 2, "margin-bottom", "14px"], [1, "alert", "alert-error", 2, "font-size", "12px", "margin-bottom", "12px"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px", "margin-right", "5px"]], template: function SpaceSchemaTabComponent_Template(rf, ctx) { if (rf & 1) {
            const _r1 = i0.ɵɵgetCurrentView();
            i0.ɵɵelementStart(0, "div", 3)(1, "div", 4)(2, "span", 5);
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(5, "span", 6);
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(8, "div", 7)(9, "label", 8);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵtext(11);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵelementStart(13, "select", 9);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSchemaTabComponent_Template_select_ngModelChange_13_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.state.schValidation, $event) || (ctx.state.schValidation = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementStart(14, "option", 10);
            i0.ɵɵtext(15);
            i0.ɵɵpipe(16, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(17, "option", 11);
            i0.ɵɵtext(18);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(20, "option", 12);
            i0.ɵɵtext(21);
            i0.ɵɵpipe(22, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(23, "label", 13);
            i0.ɵɵpipe(24, "transloco");
            i0.ɵɵelementStart(25, "input", 14);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSchemaTabComponent_Template_input_ngModelChange_25_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.state.schStrictLinkage, $event) || (ctx.state.schStrictLinkage = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵtext(26);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(28, "div", 15)(29, "button", 16);
            i0.ɵɵpipe(30, "transloco");
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_29_listener() { return ctx.exportSchema(); });
            i0.ɵɵelement(31, "ph-icon", 17);
            i0.ɵɵtext(32);
            i0.ɵɵpipe(33, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(34, "button", 16);
            i0.ɵɵpipe(35, "transloco");
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_34_listener() { return ctx.triggerImportSchema(); });
            i0.ɵɵelement(36, "ph-icon", 18);
            i0.ɵɵtext(37);
            i0.ɵɵpipe(38, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(39, "button", 16);
            i0.ɵɵpipe(40, "transloco");
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_39_listener() { return ctx.openExportToLibrary(); });
            i0.ɵɵelement(41, "ph-icon", 19);
            i0.ɵɵtext(42);
            i0.ɵɵpipe(43, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(44, "button", 16);
            i0.ɵɵpipe(45, "transloco");
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_44_listener() { return ctx.triggerImportFromLibraryAny(); });
            i0.ɵɵelement(46, "ph-icon", 19);
            i0.ɵɵtext(47);
            i0.ɵɵpipe(48, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(49, "input", 20, 0);
            i0.ɵɵlistener("change", function SpaceSchemaTabComponent_Template_input_change_49_listener($event) { return ctx.onImportSchemaFile($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(51, "input", 20, 1);
            i0.ɵɵlistener("change", function SpaceSchemaTabComponent_Template_input_change_51_listener($event) { return ctx.onImportTypeSchemaFile($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(53, "span", 21);
            i0.ɵɵtext(54);
            i0.ɵɵpipe(55, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(56, "div", 22);
            i0.ɵɵpipe(57, "transloco");
            i0.ɵɵelementStart(58, "button", 23);
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_58_listener() { i0.ɵɵrestoreView(_r1); ctx.state.schemaCollTab.set("entity"); ctx.schImportError.set(""); return i0.ɵɵresetView(ctx.schImportInfo.set("")); });
            i0.ɵɵtext(59);
            i0.ɵɵpipe(60, "transloco");
            i0.ɵɵconditionalCreate(61, SpaceSchemaTabComponent_Conditional_61_Template, 2, 1, "span", 24);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(62, "button", 23);
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_62_listener() { i0.ɵɵrestoreView(_r1); ctx.state.schemaCollTab.set("edge"); ctx.schImportError.set(""); return i0.ɵɵresetView(ctx.schImportInfo.set("")); });
            i0.ɵɵtext(63);
            i0.ɵɵpipe(64, "transloco");
            i0.ɵɵconditionalCreate(65, SpaceSchemaTabComponent_Conditional_65_Template, 2, 1, "span", 24);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(66, "button", 23);
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_66_listener() { i0.ɵɵrestoreView(_r1); ctx.state.schemaCollTab.set("memory"); ctx.schImportError.set(""); return i0.ɵɵresetView(ctx.schImportInfo.set("")); });
            i0.ɵɵtext(67);
            i0.ɵɵpipe(68, "transloco");
            i0.ɵɵconditionalCreate(69, SpaceSchemaTabComponent_Conditional_69_Template, 2, 1, "span", 24);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(70, "button", 23);
            i0.ɵɵlistener("click", function SpaceSchemaTabComponent_Template_button_click_70_listener() { i0.ɵɵrestoreView(_r1); ctx.state.schemaCollTab.set("chrono"); ctx.schImportError.set(""); return i0.ɵɵresetView(ctx.schImportInfo.set("")); });
            i0.ɵɵtext(71);
            i0.ɵɵpipe(72, "transloco");
            i0.ɵɵconditionalCreate(73, SpaceSchemaTabComponent_Conditional_73_Template, 2, 1, "span", 24);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(74, "div", 25)(75, "div", 26)(76, "div", 27);
            i0.ɵɵtext(77);
            i0.ɵɵpipe(78, "transloco");
            i0.ɵɵelementStart(79, "span", 28);
            i0.ɵɵtext(80);
            i0.ɵɵpipe(81, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵtemplate(82, SpaceSchemaTabComponent_ng_container_82_Template, 1, 0, "ng-container", 29);
            i0.ɵɵelementEnd();
            i0.ɵɵtemplate(83, SpaceSchemaTabComponent_ng_template_83_Template, 25, 28, "ng-template", null, 2, i0.ɵɵtemplateRefExtractor);
            i0.ɵɵconditionalCreate(85, SpaceSchemaTabComponent_Conditional_85_Template, 16, 20, "div", 30);
            i0.ɵɵconditionalCreate(86, SpaceSchemaTabComponent_Conditional_86_Template, 14, 11, "div", 31);
            i0.ɵɵconditionalCreate(87, SpaceSchemaTabComponent_Conditional_87_Template, 33, 31, "div", 30);
        } if (rf & 2) {
            let tmp_48_0;
            let tmp_50_0;
            const masterDetail_r21 = i0.ɵɵreference(84);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 52, "spaces.schema.validation.sectionTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 54, "spaces.schema.validation.appliesHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(10, 56, "spaces.schema.validation.hint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(12, 58, "spaces.schema.validation.label"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.schValidation);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 60, "spaces.settings.validation.off"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 62, "spaces.settings.validation.warn"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 64, "spaces.settings.validation.strict"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(24, 66, "spaces.settings.strictLinkageHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.schStrictLinkage);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(27, 68, "spaces.settings.strictLinkage"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(30, 70, "spaces.schema.exportTitle"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 13);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 72, "spaces.schema.exportJsonButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(35, 74, "spaces.schema.importTitle"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 13);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(38, 76, "spaces.schema.importJsonButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(40, 78, "spaces.schema.exportToLibraryTitle"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 13);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(43, 80, "spaces.schema.exportToLibraryButton"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(45, 82, "spaces.schema.importFromLibraryTitle"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 13);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(48, 84, "spaces.schema.importLibraryButton"));
            i0.ɵɵadvance(7);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(55, 86, "spaces.schema.autoSyncHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(57, 88, "spaces.schema.collTabsAriaLabel"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("active", ctx.state.schemaCollTab() === "entity");
            i0.ɵɵattribute("aria-selected", ctx.state.schemaCollTab() === "entity");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(60, 90, "spaces.schema.tab.entities"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.typeCount("entity") ? 61 : -1);
            i0.ɵɵadvance();
            i0.ɵɵclassProp("active", ctx.state.schemaCollTab() === "edge");
            i0.ɵɵattribute("aria-selected", ctx.state.schemaCollTab() === "edge");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(64, 92, "spaces.schema.tab.edges"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.typeCount("edge") ? 65 : -1);
            i0.ɵɵadvance();
            i0.ɵɵclassProp("active", ctx.state.schemaCollTab() === "memory");
            i0.ɵɵattribute("aria-selected", ctx.state.schemaCollTab() === "memory");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(68, 94, "spaces.schema.tab.memories"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.typeCount("memory") ? 69 : -1);
            i0.ɵɵadvance();
            i0.ɵɵclassProp("active", ctx.state.schemaCollTab() === "chrono");
            i0.ɵɵattribute("aria-selected", ctx.state.schemaCollTab() === "chrono");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(72, 96, "spaces.schema.tab.chrono"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.typeCount("chrono") ? 73 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(78, 98, ctx.state.schemaCollTab() === "edge" ? "spaces.schema.subtitle.labels" : "spaces.schema.subtitle.types"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(81, 100, "spaces.schema.typeHint", i0.ɵɵpureFunction1(103, _c2, ctx.allowlistField())));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("ngTemplateOutlet", masterDetail_r21)("ngTemplateOutletContext", i0.ɵɵpureFunction1(105, _c3, ctx.state.schemaCollTab()));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional((tmp_48_0 = ctx.importConflict()) ? 85 : -1, tmp_48_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showLibPickerDialog() ? 86 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_50_0 = ctx.exportLibDialog()) ? 87 : -1, tmp_50_0);
        } }, dependencies: [SchemaTypeEditorComponent, CommonModule, i1.NgTemplateOutlet, FormsModule, i2.NgSelectOption, i2.ɵNgSelectMultipleOption, i2.DefaultValueAccessor, i2.CheckboxControlValueAccessor, i2.SelectControlValueAccessor, i2.NgControlStatus, i2.NgModel, PhIconComponent, ModalDirective, ErrorStateComponent, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }", "\n\n\n\n\n.sch-head-row[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;\n  min-height:20px; }\n.val-controls[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:16px; flex-wrap:wrap; }\n.val-lbl[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; }\n.val-select[_ngcontent-%COMP%] { font:inherit; font-size:12px; text-transform:none; letter-spacing:0; padding:3px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-elevated); color:var(--text-primary); }\n.val-check[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); cursor:pointer; }\n.val-check[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { margin:0; }\n.sch-validation-bar[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; gap:16px 20px; flex-wrap:wrap;\n  padding:12px 14px; margin-bottom:14px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); }\n.sch-validation-bar[_ngcontent-%COMP%]   .svb-label[_ngcontent-%COMP%] { display:flex; flex-direction:column; gap:2px; min-width:0; }\n.sch-validation-bar[_ngcontent-%COMP%]   .svb-title[_ngcontent-%COMP%] { font-size:13px; font-weight:640; color:var(--text-primary); }\n.sch-validation-bar[_ngcontent-%COMP%]   .svb-hint[_ngcontent-%COMP%] { font-size:11.5px; color:var(--text-muted); }\n.sch-md[_ngcontent-%COMP%] { display:grid; grid-template-columns:minmax(190px,250px) 1fr; gap:18px; align-items:start; margin-top:6px; }\n@media (max-width:760px) { .sch-md[_ngcontent-%COMP%] { grid-template-columns:1fr; } }\n.sch-master[_ngcontent-%COMP%] { display:flex; flex-direction:column; gap:3px; min-width:0; }\n\n\n.sch-type-list[_ngcontent-%COMP%] { display:flex; flex-direction:column; gap:3px; min-height:0; overflow-y:auto; max-height:340px; }\n.sch-type-item[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none;\n  border:1px solid transparent; border-radius:8px; padding:7px 9px; cursor:pointer; font:inherit; color:var(--text-primary); }\n.sch-type-item[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); }\n.sch-type-item.sel[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 12%,transparent); border-color:color-mix(in srgb,var(--accent) 34%,transparent); }\n.sch-type-item[_ngcontent-%COMP%]   .nm[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:13px; color:var(--accent); flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sch-type-badges[_ngcontent-%COMP%] { display:inline-flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; }\n.sch-empty-list[_ngcontent-%COMP%] { color:var(--text-muted); font-size:12.5px; font-style:italic; padding:14px 6px; text-align:center; }\n.sch-detail[_ngcontent-%COMP%] { min-width:0; }\n.sch-detail-empty[_ngcontent-%COMP%] { color:var(--text-muted); font-size:13px; font-style:italic; padding:26px 20px; text-align:center;\n  border:1px dashed var(--border); border-radius:10px; }\n.sch-detail-head[_ngcontent-%COMP%] { display:flex; align-items:center; gap:10px; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-detail-head[_ngcontent-%COMP%]   .dt[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:15px; color:var(--accent); font-weight:600; flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; }\n.sch-detail-head[_ngcontent-%COMP%]   .acts[_ngcontent-%COMP%] { display:flex; gap:4px; flex-shrink:0; }\n\n\n\n\n\n\n\n.sch-md[_ngcontent-%COMP%] { --sch-head-h:34px; }\n.sch-add-row[_ngcontent-%COMP%] { display:flex; gap:6px; align-items:center; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-add-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { flex:1; min-width:0; }\n.sch-add-btn[_ngcontent-%COMP%] { display:grid; place-items:center; flex:none; width:30px; height:30px; padding:0;\n  border:1px solid var(--border); border-radius:8px; background:var(--bg-primary);\n  color:var(--accent); cursor:pointer; }\n.sch-add-btn[_ngcontent-%COMP%]:hover:not(:disabled) { border-color:var(--accent); }\n.sch-add-btn[_ngcontent-%COMP%]:disabled { color:var(--text-muted); cursor:not-allowed; opacity:.6; }\n.sch-add-btn[_ngcontent-%COMP%]:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }\n\n\n.sch-add-prop[_ngcontent-%COMP%] { margin-bottom:0; padding-bottom:0; border-bottom:none;\n  margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }\n.sch-add-prop[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:260px; }\n.sch-add-imports[_ngcontent-%COMP%] { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:8px;\n  border-top:1px solid var(--border-muted); }\n\n\n\n\n\n\n\n\n.sch-hint[_ngcontent-%COMP%] { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted); }\n.sch-section-label[_ngcontent-%COMP%] { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }\n\n\n\n\n.sch-detail[_ngcontent-%COMP%]   .sch-section-label[_ngcontent-%COMP%], \n.sch-detail[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%]    > label[_ngcontent-%COMP%] { margin-top:16px; }\n.sch-detail[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%]:first-of-type    > label[_ngcontent-%COMP%], \n.sch-detail[_ngcontent-%COMP%]   .sch-section-label[_ngcontent-%COMP%]:first-of-type { margin-top:0; }\n\n\n\n\n\n\n.ret-row[_ngcontent-%COMP%] { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }\n.ret-row[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { flex:1 1 190px; min-width:0; max-width:260px; }\n.ret-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:150px; }\n.sch-msg[_ngcontent-%COMP%] { font-size:12px; margin-top:6px; }\n.sch-msg.err[_ngcontent-%COMP%] { color:var(--error); }\n.sch-msg.ok[_ngcontent-%COMP%]  { color:var(--success); }\n.sch-type-badges[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] { font-size:9px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceSchemaTabComponent, [{
        type: Component,
        args: [{ selector: 'app-space-schema-tab', standalone: true, imports: [SchemaTypeEditorComponent, CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, ErrorStateComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<!-- space-wide schema validation (governs every type in this space, not one collection) -->
<div class="sch-validation-bar">
  <div class="svb-label">
    <span class="svb-title">{{ 'spaces.schema.validation.sectionTitle' | transloco }}</span>
    <span class="svb-hint">{{ 'spaces.schema.validation.appliesHint' | transloco }}</span>
  </div>
  <div class="val-controls">
    <label class="val-lbl" [attr.title]="'spaces.schema.validation.hint' | transloco">
      {{ 'spaces.schema.validation.label' | transloco }}
      <select [(ngModel)]="state.schValidation" class="val-select">
        <option value="off">{{ 'spaces.settings.validation.off' | transloco }}</option>
        <option value="warn">{{ 'spaces.settings.validation.warn' | transloco }}</option>
        <option value="strict">{{ 'spaces.settings.validation.strict' | transloco }}</option>
      </select>
    </label>
    <label class="val-check" [attr.title]="'spaces.settings.strictLinkageHint' | transloco">
      <input type="checkbox" [(ngModel)]="state.schStrictLinkage" />
      {{ 'spaces.settings.strictLinkage' | transloco }}
    </label>
  </div>
</div>

<!-- export / import toolbar -->
<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
  <button class="btn btn-secondary btn-sm" type="button" (click)="exportSchema()" [attr.title]="'spaces.schema.exportTitle' | transloco"><ph-icon name="upload" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.exportJsonButton' | transloco }}</button>
  <button class="btn btn-secondary btn-sm" type="button" (click)="triggerImportSchema()" [attr.title]="'spaces.schema.importTitle' | transloco"><ph-icon name="download-simple" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.importJsonButton' | transloco }}</button>
  <button class="btn btn-secondary btn-sm" type="button" (click)="openExportToLibrary()" [attr.title]="'spaces.schema.exportToLibraryTitle' | transloco"><ph-icon name="bookmarks" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.exportToLibraryButton' | transloco }}</button>
  <button class="btn btn-secondary btn-sm" type="button" (click)="triggerImportFromLibraryAny()" [attr.title]="'spaces.schema.importFromLibraryTitle' | transloco"><ph-icon name="bookmarks" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.importLibraryButton' | transloco }}</button>
  <input #schImportInput type="file" accept=".json,application/json" style="display:none" (change)="onImportSchemaFile($event)" />
  <input #schTypeImportInput type="file" accept=".json,application/json" style="display:none" (change)="onImportTypeSchemaFile($event)" />
  <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">{{ 'spaces.schema.autoSyncHint' | transloco }}</span>
</div>
<!-- collection tabs -->
<div class="sch-coll-tabs" role="tablist" [attr.aria-label]="'spaces.schema.collTabsAriaLabel' | transloco">
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='entity'" [attr.aria-selected]="state.schemaCollTab()==='entity'" role="tab" (click)="state.schemaCollTab.set('entity');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.entities' | transloco }}
    @if (state.typeCount('entity')) { <span class="sch-cnt-badge">{{ state.typeCount('entity') }}</span> }
  </button>
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='edge'" [attr.aria-selected]="state.schemaCollTab()==='edge'" role="tab" (click)="state.schemaCollTab.set('edge');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.edges' | transloco }}
    @if (state.typeCount('edge')) { <span class="sch-cnt-badge">{{ state.typeCount('edge') }}</span> }
  </button>
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='memory'" [attr.aria-selected]="state.schemaCollTab()==='memory'" role="tab" (click)="state.schemaCollTab.set('memory');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.memories' | transloco }}
    @if (state.typeCount('memory')) { <span class="sch-cnt-badge">{{ state.typeCount('memory') }}</span> }
  </button>
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='chrono'" [attr.aria-selected]="state.schemaCollTab()==='chrono'" role="tab" (click)="state.schemaCollTab.set('chrono');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.chrono' | transloco }}
    @if (state.typeCount('chrono')) { <span class="sch-cnt-badge">{{ state.typeCount('chrono') }}</span> }
  </button>
</div>
<div class="sch-coll-body">

  <!-- collection sub-header (per-type guidance for the active collection) -->
  <!-- ONE hint, with the field name as a parameter. There used to be four near-identical strings that
       differed only in the field they named (entity.type, edge.label, and so on), which is both the
       "different styles" the owner saw and the reason this row changed height between collections —
       and everything below it, the add control included, moved with it. -->
  <div class="sch-head-row">
    <div class="sch-sub">
      {{ (state.schemaCollTab() === 'edge' ? 'spaces.schema.subtitle.labels' : 'spaces.schema.subtitle.types') | transloco }}
      <span class="sch-hint">{{ 'spaces.schema.typeHint' | transloco: { field: allowlistField() } }}</span>
    </div>
  </div>

  <!-- master / detail -->
  <ng-container *ngTemplateOutlet="masterDetail; context: { kt: state.schemaCollTab() }"></ng-container>

  <!-- The space-wide tag-suggestion editor stood here. Retired: one list, editable in a single
       place, applied to every type and every record form in the space — so it steered what agents
       and people tagged with while being easy to set once and never revisit. Tag autocomplete now
       comes from the tags actually in use, which maintains itself. Any stored list is preserved in
       config.json untouched (see space-settings-state.service). -->

</div><!-- sch-coll-body -->

<!-- ── master/detail template ── -->
<ng-template #masterDetail let-kt="kt">
  <div class="sch-md">
    <!-- MASTER: selectable type list -->
    <div class="sch-master">
      <!-- Pinned ABOVE the list on purpose. It used to sit underneath, so it slid further down the
           column with every type added — the control you reach for most moved every time you used
           it. Fixed position, one line: type a name, press Enter or the plus. -->
      <div class="sch-add-row">
        <input type="text" [(ngModel)]="state.schNewTypeInputs[kt]"
          [placeholder]="kt === 'edge' ? ('spaces.schema.newLabelPlaceholder' | transloco) : ('spaces.schema.newTypeNamePlaceholder' | transloco)"
          [attr.aria-label]="kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco)"
          (keydown.enter)="$event.preventDefault();state.addType(kt)" />
        <button class="sch-add-btn" type="button" (click)="state.addType(kt)"
          [disabled]="!state.schNewTypeInputs[kt]?.trim()"
          [attr.title]="kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco)"
          [attr.aria-label]="kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco)">
          <ph-icon name="plus-circle" [size]="18"/>
        </button>
      </div>

      <!-- The type list scrolls inside its own box: a long allowlist must not stretch the whole dialog
           (and push the imports / Save out of reach) — it stays put and the list scrolls. -->
      <div class="sch-type-list">
      @for (name of state.typeNames(kt); track name) {
        <button type="button" class="sch-type-item" [class.sel]="state.isTypeSelected(kt,name)" (click)="state.selectType(kt,name)">
          <span class="nm">{{ name }}</span>
          <span class="sch-type-badges">
            @if (state.typeLibRef(kt,name)) {
              <span class="badge badge-blue">Library</span>
            } @else {
              @if (state.typeState(kt,name).propertySchemas.length) {
                <span class="badge badge-gray">{{ state.typeState(kt,name).propertySchemas.length }}p</span>
              }
              @if (kt === 'entity' && state.typeState(kt,name).namingPattern) {
                <span class="badge badge-gray">pat</span>
              }
              <!-- A window deletes records, so it is visible from the list rather than only after selecting
                   the type. Amber, not grey: this is the one badge here that describes data loss. -->
              @if (state.typeState(kt,name).retentionDays || state.typeState(kt,name).retentionContentDays) {
                <span class="badge badge-yellow">ttl</span>
              }
            }
          </span>
        </button>
      } @empty {
        <div class="sch-empty-list">{{ kt === 'edge' ? ('spaces.schema.noEdgeLabels' | transloco) : ('spaces.schema.noTypes' | transloco) }}</div>
      }
      </div>

      <!-- Imports stay at the bottom: they are the occasional path, and putting them beside the
           everyday control is what made the top of this column busy. -->
      <div class="sch-add-imports">
      </div>
      @if (schImportError()) {
        <div class="sch-msg err">{{ schImportError() }}</div>
      }
      @if (libImportSkipped().length) {
        <div class="sch-msg err">{{ 'spaces.schema.libPicker.skipped' | transloco: { names: libImportSkipped().join(', ') } }}</div>
      }
      @if (schImportInfo()) {
        <div class="sch-msg ok">{{ schImportInfo() }}</div>
      }
    </div>

    <!-- DETAIL: editor for the selected type -->
    <div class="sch-detail">
      @if (selectedTypeName(kt); as name) {
        <div class="sch-detail-head">
          <span class="dt">{{ name }}</span>
          <span class="acts">
            <button class="btn btn-ghost btn-sm" type="button" (click)="exportTypeSchema(kt,name)"
              style="padding:2px 6px;" [attr.title]="'spaces.schema.exportTypeTitle' | transloco"><ph-icon name="upload" [size]="13"/></button>
            @if (!state.typeLibRef(kt,name)) {
              <button class="btn btn-ghost btn-sm" type="button" (click)="saveTypeToLibrary(kt,name)"
                style="padding:2px 6px;" [attr.title]="'spaces.schema.saveToLibraryTitle' | transloco"
                [attr.aria-label]="'spaces.schema.saveToLibraryButton' | transloco"><ph-icon name="bookmarks" [size]="13"/></button>
            }
            <button class="icon-btn danger" type="button" (click)="state.removeType(kt,name)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
          </span>
        </div>

        <!-- The editor body is a shared component: the Brain Overview opens the SAME one in a dialog, so a
             one-field schema change no longer means a trip to Space Settings and back. The header above
             keeps the library and delete actions deliberately — see the component for why. -->
        <app-schema-type-editor
          [knowledgeType]="kt"
          [draft]="state.typeState(kt,name)"
          [libRef]="state.typeLibRef(kt,name)"
          [linkedProps]="linkedProps(kt,name)"
          [spaceWindowDays]="spaceWindow(kt)"
          (unlink)="unlinkType(kt,name)" />
      } @else {
        <div class="sch-detail-empty">{{ kt === 'edge' ? ('spaces.schema.detail.emptyEdge' | transloco) : ('spaces.schema.detail.empty' | transloco) }}</div>
      }
    </div>
  </div>
</ng-template>

@if (importConflict(); as conflict) {
  <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:320;">
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:440px;max-width:96vw;" [appModal]="'spaces.schema.conflict.title' | transloco" (dismiss)="dismissImportConflict()" (click)="$event.stopPropagation()">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">{{ 'spaces.schema.conflict.title' | transloco }}</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;" [innerHTML]="'spaces.schema.conflict.body' | transloco: { name: conflict.name, kt: conflict.kt }"></p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-secondary" type="button" (click)="resolveImportConflictOverride()">{{ 'spaces.schema.conflict.override' | transloco }}</button>
        @if (importConflict()!.allowAddAs) {
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" [ngModel]="importConflictAddAsName()" (ngModelChange)="importConflictAddAsName.set($event)"
              [placeholder]="'spaces.schema.conflict.newNamePlaceholder' | transloco" style="flex:1;" (keydown.enter)="$event.preventDefault();resolveImportConflictAddAs()" />
            <button class="btn btn-primary btn-sm" type="button" (click)="resolveImportConflictAddAs()" [disabled]="!importConflictAddAsName().trim()">{{ 'spaces.schema.conflict.addAs' | transloco }}</button>
          </div>
        }
        <button class="btn btn-ghost" type="button" (click)="dismissImportConflict()">{{ 'common.cancel' | transloco }}</button>
      </div>
    </div>
  </div>
}

@if (showLibPickerDialog()) {
  <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:310;">
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:560px;max-width:96vw;max-height:80vh;overflow-y:auto;" [appModal]="'spaces.schema.libPicker.title' | transloco" appModalCloseOnBackdrop (dismiss)="closeLibPicker()" (click)="$event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <strong>{{ 'spaces.schema.libPicker.title' | transloco }}</strong>
        <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeLibPicker()"><ph-icon name="x" [size]="14"/></button>
      </div>
      @if (libPickerLoading()) {
        <div class="empty-state"><span class="spinner"></span></div>
      } @else if (libPickerError() !== null) {
        <app-error-state [message]="'spaces.schema.libPicker.loadError' | transloco" [reason]="libPickerError() ?? ''"
                         [icon]="32" (retry)="retryLibPicker()" />
      } @else if (!libPickerEntries().length) {
        <p style="font-size:13px;color:var(--text-muted);">{{ 'spaces.schema.libPicker.empty' | transloco }}</p>
      } @else {
        <div style="display:grid;gap:8px;">
          @for (g of libPickerGroups(); track g.group) {
            @if (g.group) {
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
                <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);">{{ g.group }}</strong>
                <button class="btn btn-secondary btn-sm" type="button" (click)="importGroupFromLibrary(g.group)">{{ 'spaces.schema.libPicker.importGroup' | transloco }}</button>
              </div>
            }
          @for (entry of g.entries; track entry.name) {
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface);">
              <div>
                <div style="font-weight:600;font-size:13px;font-family:var(--font-mono);">{{ entry.name }}</div>
                <div style="font-size:11px;color:var(--text-muted);">{{ entry.knowledgeType }} · {{ entry.typeName }}</div>
                @if (entry.description) { <div style="font-size:11px;color:var(--text-secondary);">{{ entry.description }}</div> }
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button class="btn btn-secondary btn-sm" type="button" (click)="importFromLibraryRef(entry)">{{ 'spaces.schema.libPicker.importRef' | transloco }}</button>
              </div>
            </div>
          }
          }
        </div>

      }
    </div>
  </div>
}

@if (exportLibDialog(); as d) {
  <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:320;">
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:480px;max-width:96vw;" [appModal]="'spaces.schema.exportToLibrary.title' | transloco" appModalCloseOnBackdrop (dismiss)="closeExportToLibrary()" (click)="$event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <strong>{{ 'spaces.schema.exportToLibrary.title' | transloco }}</strong>
        <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeExportToLibrary()"><ph-icon name="x" [size]="14"/></button>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;">{{ 'spaces.schema.exportToLibrary.hint' | transloco }}</p>
      @if (state.isDirty()) {
        <div class="alert alert-warning" style="font-size:12px;margin-bottom:12px;">{{ 'spaces.schema.exportToLibrary.dirtyWarning' | transloco }}</div>
      }
      <div class="field" style="margin-bottom:10px;">
        <label style="font-size:12px;">{{ 'spaces.schema.exportToLibrary.groupLabel' | transloco }}</label>
        <input type="text" [ngModel]="d.groupName" (ngModelChange)="exportLibDialog.set({ ...d, groupName: $event })" style="width:100%;" />
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label style="font-size:12px;">{{ 'spaces.schema.exportToLibrary.prefixLabel' | transloco }}</label>
        <input type="text" [ngModel]="d.namePrefix" (ngModelChange)="exportLibDialog.set({ ...d, namePrefix: $event })" style="width:100%;" />
      </div>
      @if (d.error) { <div class="alert alert-error" style="font-size:12px;margin-bottom:12px;">{{ d.error }}</div> }
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-secondary btn-sm" type="button" (click)="closeExportToLibrary()">{{ 'common.cancel' | transloco }}</button>
        <button class="btn btn-primary btn-sm" type="button" (click)="doExportToLibrary()" [disabled]="d.saving || state.isDirty() || !d.groupName.trim()">
          @if (d.saving) { <span class="spinner" style="width:12px;height:12px;border-width:2px;margin-right:5px;"></span> }
          {{ 'spaces.schema.exportToLibrary.confirm' | transloco }}
        </button>
      </div>
    </div>
  </div>
}
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n", "\n/* A floor, so this row cannot collapse and drag the master/detail grid up with it. The row's height is\n   otherwise stable by construction now: one hint string for all four collections, differing by a single\n   field name, so it wraps the same way whichever tab is open. That is what stops the add control below\n   from moving when you switch category. */\n.sch-head-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;\n  min-height:20px; }\n.val-controls { display:inline-flex; align-items:center; gap:16px; flex-wrap:wrap; }\n.val-lbl { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; }\n.val-select { font:inherit; font-size:12px; text-transform:none; letter-spacing:0; padding:3px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-elevated); color:var(--text-primary); }\n.val-check { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); cursor:pointer; }\n.val-check input { margin:0; }\n.sch-validation-bar { display:flex; align-items:center; justify-content:space-between; gap:16px 20px; flex-wrap:wrap;\n  padding:12px 14px; margin-bottom:14px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); }\n.sch-validation-bar .svb-label { display:flex; flex-direction:column; gap:2px; min-width:0; }\n.sch-validation-bar .svb-title { font-size:13px; font-weight:640; color:var(--text-primary); }\n.sch-validation-bar .svb-hint { font-size:11.5px; color:var(--text-muted); }\n.sch-md { display:grid; grid-template-columns:minmax(190px,250px) 1fr; gap:18px; align-items:start; margin-top:6px; }\n@media (max-width:760px) { .sch-md { grid-template-columns:1fr; } }\n.sch-master { display:flex; flex-direction:column; gap:3px; min-width:0; }\n/* The list of types scrolls inside itself; the add-row above and imports below stay pinned. */\n.sch-type-list { display:flex; flex-direction:column; gap:3px; min-height:0; overflow-y:auto; max-height:340px; }\n.sch-type-item { display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none;\n  border:1px solid transparent; border-radius:8px; padding:7px 9px; cursor:pointer; font:inherit; color:var(--text-primary); }\n.sch-type-item:hover { background:var(--bg-elevated); }\n.sch-type-item.sel { background:color-mix(in srgb,var(--accent) 12%,transparent); border-color:color-mix(in srgb,var(--accent) 34%,transparent); }\n.sch-type-item .nm { font-family:var(--font-mono); font-size:13px; color:var(--accent); flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sch-type-badges { display:inline-flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; }\n.sch-empty-list { color:var(--text-muted); font-size:12.5px; font-style:italic; padding:14px 6px; text-align:center; }\n.sch-detail { min-width:0; }\n.sch-detail-empty { color:var(--text-muted); font-size:13px; font-style:italic; padding:26px 20px; text-align:center;\n  border:1px dashed var(--border); border-radius:10px; }\n.sch-detail-head { display:flex; align-items:center; gap:10px; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-detail-head .dt { font-family:var(--font-mono); font-size:15px; color:var(--accent); font-weight:600; flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; }\n.sch-detail-head .acts { display:flex; gap:4px; flex-shrink:0; }\n/* Pinned above the list: a bottom rule, not a top one, because it now heads the column.\n\n   It and the detail pane's head are the two column headers, side by side, so they share one height and\n   one bottom margin \u2014 otherwise their rules sit at different y and the two columns read as misaligned\n   even though the grid starts them at the same top edge. --sch-head-h is that shared height; changing\n   it moves both. */\n.sch-md { --sch-head-h:34px; }\n.sch-add-row { display:flex; gap:6px; align-items:center; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-add-row input { flex:1; min-width:0; }\n.sch-add-btn { display:grid; place-items:center; flex:none; width:30px; height:30px; padding:0;\n  border:1px solid var(--border); border-radius:8px; background:var(--bg-primary);\n  color:var(--accent); cursor:pointer; }\n.sch-add-btn:hover:not(:disabled) { border-color:var(--accent); }\n.sch-add-btn:disabled { color:var(--text-muted); cursor:not-allowed; opacity:.6; }\n.sch-add-btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }\n/* Same row, but it heads the detail pane's foot rather than the list's head: rule on top, not bottom. */\n.sch-add-prop { margin-bottom:0; padding-bottom:0; border-bottom:none;\n  margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }\n.sch-add-prop input { max-width:260px; }\n.sch-add-imports { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:8px;\n  border-top:1px solid var(--border-muted); }\n/* .prop-caret moved to PROP_TABLE_STYLES \u2014 it belongs with the rows it opens, and a component rendering the\n   caret needs the row rules anyway. Two homes for one class is how the caret survived while the table around\n   it lost its styling. */\n/* One coherent text scale for the tab: guidance, section labels, inline messages.\n   Every section label reads the same and every hint hangs off it the same way \u2014 the delimiter is an\n   em dash in all of them, where it used to be parentheses in some and a dash in others. */\n.sch-hint { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted); }\n.sch-section-label { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }\n/* One rhythm between sections of the detail pane. They were spaced by whatever each block's own\n   margins happened to add up to, so the gaps above \"Tag suggestions\" and \"Property schemas\" differed\n   by several pixels for no reason a reader could infer. */\n.sch-detail .sch-section-label,\n.sch-detail > .field > label { margin-top:16px; }\n.sch-detail > .field:first-of-type > label,\n.sch-detail .sch-section-label:first-of-type { margin-top:0; }\n/* The two retention windows sit side by side and wrap only on a genuinely narrow pane.\n   .field must be given a BASIS: it is a flex column, so its intrinsic width is its widest child, and the\n   chrono hint under the second input is a long sentence \u2014 left to size itself that field claimed the whole\n   row and both stacked. Verified by measurement, not by looking at the CSS: the first attempt reported\n   two inputs with the labels and placeholders all correct, and they were one above the other. */\n.ret-row { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }\n.ret-row .field { flex:1 1 190px; min-width:0; max-width:260px; }\n.ret-row input { max-width:150px; }\n.sch-msg { font-size:12px; margin-top:6px; }\n.sch-msg.err { color:var(--error); }\n.sch-msg.ok  { color:var(--success); }\n.sch-type-badges .badge { font-size:9px; }\n"] }]
    }], null, { schImportInputRef: [{
            type: ViewChild,
            args: ['schImportInput']
        }], schTypeImportInputRef: [{
            type: ViewChild,
            args: ['schTypeImportInput']
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceSchemaTabComponent, { className: "SpaceSchemaTabComponent", filePath: "app/pages/settings/space-schema-tab.component.ts", lineNumber: 311 }); })();
