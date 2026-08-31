/**
 * Schema Library page.
 *
 * Instance-level reusable TypeSchema definitions.  The editor UI mirrors the
 * per-type schema editor in settings/spaces.component.ts — same
 * TypeSchemaState model, same property table, same constraint fields.
 *
 * Route: /schema-library
 */
import { Component, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AuthApi } from '../../core/auth-api.service';
import { SchemaApi } from '../../core/schema-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { PropSchemaTableComponent } from '../../shared/prop-schema-table.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { ModalDirective } from '../../shared/modal.directive';
import { CHIP_STYLES } from '../../shared/chip.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
import * as i2 from "@angular/common";
const _c0 = ["importFileInput"];
const _c1 = () => ["entity", "memory", "edge", "chrono"];
const _c2 = a0 => ({ count: a0 });
const _c3 = a0 => ({ name: a0 });
const _forTrack0 = ($index, $item) => $item.name;
const _forTrack1 = ($index, $item) => $item.id;
const _forTrack2 = ($index, $item) => $item.spaceId + $item.knowledgeType + $item.typeName;
function SchemaLibraryComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 15);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_5_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.openExportSpace()); });
    i0.ɵɵelement(2, "ph-icon", 16);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 15);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_5_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.openApplyGroup()); });
    i0.ɵɵelement(7, "ph-icon", 17);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "button", 15);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_5_Template_button_click_10_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.triggerImportFile()); });
    i0.ɵɵelement(12, "ph-icon", 18);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "input", 19, 0);
    i0.ɵɵlistener("change", function SchemaLibraryComponent_Conditional_5_Template_input_change_15_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onImportFile($event)); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "button", 20);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_5_Template_button_click_17_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.openCreate()); });
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 10, "schemaLib.exportSpace.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 12, "schemaLib.exportSpace.button"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(6, 14, "schemaLib.applyGroup.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 16, "schemaLib.applyGroup.button"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(11, 18, "schemaLib.import.fileTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 20, "schemaLib.import.fileButton"));
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 22, "schemaLib.createButton"));
} }
function SchemaLibraryComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 20);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_6_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.openAddCatalog()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "schemaLib.catalog.addButton"));
} }
function SchemaLibraryComponent_Conditional_19_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 22);
} if (rf & 2) {
    i0.ɵɵproperty("size", 13);
} }
function SchemaLibraryComponent_Conditional_19_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 23);
} if (rf & 2) {
    i0.ɵɵproperty("size", 13);
} }
function SchemaLibraryComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 9)(1, "span", 21);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 15);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_19_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.copyLibraryUrl()); });
    i0.ɵɵconditionalCreate(5, SchemaLibraryComponent_Conditional_19_Conditional_5_Template, 1, 1, "ph-icon", 22)(6, SchemaLibraryComponent_Conditional_19_Conditional_6_Template, 1, 1, "ph-icon", 23);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 15);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_19_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showCreateLibToken.set(true)); });
    i0.ɵɵelement(9, "ph-icon", 24);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.libraryPublicUrl);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(4, 5, "schemaLib.share.copyButton"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.urlCopied() ? 5 : 6);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(8, 7, "schemaLib.share.createTokenButton"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
} }
function SchemaLibraryComponent_Conditional_20_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 27);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_20_For_2_Template_button_click_0_listener() { const kt_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.typeFilter.set(ctx_r1.typeFilter() === kt_r6 ? null : kt_r6)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const kt_r6 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r1.typeFilter() === kt_r6);
    i0.ɵɵattribute("aria-pressed", ctx_r1.typeFilter() === kt_r6);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(kt_r6);
} }
function SchemaLibraryComponent_Conditional_20_For_4_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 28);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_20_For_4_Template_button_click_0_listener() { const g_r8 = i0.ɵɵrestoreView(_r7).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.groupFilter.set(ctx_r1.groupFilter() === g_r8 ? null : g_r8)); });
    i0.ɵɵelement(1, "ph-icon", 29);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const g_r8 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r1.groupFilter() === g_r8);
    i0.ɵɵattribute("aria-pressed", ctx_r1.groupFilter() === g_r8);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 11);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(g_r8);
} }
function SchemaLibraryComponent_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵrepeaterCreate(1, SchemaLibraryComponent_Conditional_20_For_2_Template, 2, 4, "button", 25, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵrepeaterCreate(3, SchemaLibraryComponent_Conditional_20_For_4_Template, 3, 5, "button", 26, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(i0.ɵɵpureFunction0(0, _c1));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.availableGroups());
} }
function SchemaLibraryComponent_Conditional_21_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 30);
    i0.ɵɵelement(1, "span", 33);
    i0.ɵɵelementEnd();
} }
function SchemaLibraryComponent_Conditional_21_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 34);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function SchemaLibraryComponent_Conditional_21_Conditional_1_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r9); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.load()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "schemaLib.error.load"))("reason", ctx_r1.loadError() ?? "");
} }
function SchemaLibraryComponent_Conditional_21_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 30)(1, "div", 35);
    i0.ɵɵelement(2, "ph-icon", 36);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "schemaLib.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "schemaLib.empty.subtitle"));
} }
function SchemaLibraryComponent_Conditional_21_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 30)(1, "p", 37);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "schemaLib.noResults"));
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 45);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", ctx_r1.propCount(entry_r11), " prop", ctx_r1.propCount(entry_r11) !== 1 ? "s" : "");
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 46);
    i0.ɵɵtext(1, "pattern");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("title", entry_r11.schema.namingPattern);
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 47);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", ctx_r1.usageCounts()[entry_r11.name], " link", ctx_r1.usageCounts()[entry_r11.name] !== 1 ? "s" : "");
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 61);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_11_Template_span_click_0_listener($event) { i0.ɵɵrestoreView(_r12); const entry_r11 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(3); $event.stopPropagation(); return i0.ɵɵresetView(ctx_r1.groupFilter.set(ctx_r1.groupFilter() === entry_r11.schemaGroup ? null : entry_r11.schemaGroup)); });
    i0.ɵɵelement(2, "ph-icon", 62);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("title", i0.ɵɵpipeBind1(1, 3, "schemaLib.badge.groupTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 10);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(entry_r11.schemaGroup);
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 49);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "schemaLib.badge.published"));
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 50);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("title", entry_r11.sourceUrl || "");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(2, 3, "schemaLib.badge.from"), " ", entry_r11.sourceCatalog);
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 51);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const entry_r11 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(entry_r11.description);
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 39);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template_div_click_0_listener() { const entry_r11 = i0.ɵɵrestoreView(_r10).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.openEdit(entry_r11)); });
    i0.ɵɵelementStart(1, "div", 40)(2, "div", 41)(3, "span", 42);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "span", 43);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 44);
    i0.ɵɵconditionalCreate(8, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_8_Template, 2, 2, "span", 45);
    i0.ɵɵconditionalCreate(9, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_9_Template, 2, 1, "span", 46);
    i0.ɵɵconditionalCreate(10, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_10_Template, 2, 2, "span", 47);
    i0.ɵɵconditionalCreate(11, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_11_Template, 4, 5, "span", 48);
    i0.ɵɵconditionalCreate(12, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_12_Template, 3, 3, "span", 49);
    i0.ɵɵconditionalCreate(13, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_13_Template, 3, 5, "span", 50);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(14, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Conditional_14_Template, 2, 1, "div", 51);
    i0.ɵɵelementStart(15, "div", 52)(16, "span", 53);
    i0.ɵɵtext(17);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "span", 54);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "date");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(21, "div", 55);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template_div_click_21_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(22, "button", 56);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template_button_click_22_listener() { const entry_r11 = i0.ɵɵrestoreView(_r10).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.togglePublish(entry_r11)); });
    i0.ɵɵelement(24, "ph-icon", 57);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(25, "button", 56);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template_button_click_25_listener() { const entry_r11 = i0.ɵɵrestoreView(_r10).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.exportEntry(entry_r11)); });
    i0.ɵɵelement(27, "ph-icon", 58);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "button", 59);
    i0.ɵɵpipe(29, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template_button_click_28_listener() { const entry_r11 = i0.ɵɵrestoreView(_r10).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.initiateDelete(entry_r11.name)); });
    i0.ɵɵelement(30, "ph-icon", 60);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const entry_r11 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(entry_r11.knowledgeType);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(entry_r11.name);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.propCount(entry_r11) > 0 ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(entry_r11.schema.namingPattern ? 9 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((ctx_r1.usageCounts()[entry_r11.name] || 0) > 0 ? 10 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(entry_r11.schemaGroup ? 11 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(entry_r11.published ? 12 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(entry_r11.sourceCatalog ? 13 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(entry_r11.description ? 14 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(entry_r11.typeName);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(20, 19, entry_r11.updatedAt, "dd.MM.yyyy HH:mm"));
    i0.ɵɵadvance(3);
    i0.ɵɵstyleProp("color", entry_r11.published ? "var(--accent)" : undefined);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(23, 22, entry_r11.published ? "schemaLib.action.unpublish" : "schemaLib.action.publish"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(26, 24, "schemaLib.export.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(29, 26, "common.remove"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
} }
function SchemaLibraryComponent_Conditional_21_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 32);
    i0.ɵɵrepeaterCreate(1, SchemaLibraryComponent_Conditional_21_Conditional_4_For_2_Template, 31, 28, "div", 38, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.filteredEntries());
} }
function SchemaLibraryComponent_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, SchemaLibraryComponent_Conditional_21_Conditional_0_Template, 2, 0, "div", 30)(1, SchemaLibraryComponent_Conditional_21_Conditional_1_Template, 2, 4, "app-error-state", 31)(2, SchemaLibraryComponent_Conditional_21_Conditional_2_Template, 9, 7, "div", 30)(3, SchemaLibraryComponent_Conditional_21_Conditional_3_Template, 4, 3, "div", 30)(4, SchemaLibraryComponent_Conditional_21_Conditional_4_Template, 3, 0, "div", 32);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.loading() ? 0 : ctx_r1.loadError() !== null ? 1 : !ctx_r1.entries().length ? 2 : !ctx_r1.filteredEntries().length ? 3 : 4);
} }
function SchemaLibraryComponent_Conditional_22_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 30);
    i0.ɵɵelement(1, "span", 33);
    i0.ɵɵelementEnd();
} }
function SchemaLibraryComponent_Conditional_22_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 34);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function SchemaLibraryComponent_Conditional_22_Conditional_1_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.loadCatalogs()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "schemaLib.catalog.loadError"))("reason", ctx_r1.catalogsLoadError() ?? "");
} }
function SchemaLibraryComponent_Conditional_22_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 30)(1, "p", 37);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "schemaLib.catalog.empty"));
} }
function SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 68);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const cat_r15 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(cat_r15.description);
} }
function SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 69)(1, "span", 71);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "schemaLib.catalog.hasToken"));
} }
function SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 64)(1, "div", 65)(2, "div", 66);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 67);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Conditional_6_Template, 2, 1, "div", 68);
    i0.ɵɵconditionalCreate(7, SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Conditional_7_Template, 4, 3, "div", 69);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "div", 70)(9, "button", 15);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Template_button_click_9_listener() { const cat_r15 = i0.ɵɵrestoreView(_r14).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.openBrowse(cat_r15.name)); });
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "button", 59);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Template_button_click_12_listener() { const cat_r15 = i0.ɵɵrestoreView(_r14).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.removeCatalog(cat_r15.name)); });
    i0.ɵɵelement(14, "ph-icon", 60);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const cat_r15 = ctx.$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(cat_r15.name);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(cat_r15.url);
    i0.ɵɵadvance();
    i0.ɵɵconditional(cat_r15.description ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(cat_r15.hasAccessToken ? 7 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 7, "schemaLib.catalog.browseButton"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(13, 9, "schemaLib.catalog.deleteTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 13);
} }
function SchemaLibraryComponent_Conditional_22_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 63);
    i0.ɵɵrepeaterCreate(1, SchemaLibraryComponent_Conditional_22_Conditional_3_For_2_Template, 15, 11, "div", 64, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.catalogs());
} }
function SchemaLibraryComponent_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, SchemaLibraryComponent_Conditional_22_Conditional_0_Template, 2, 0, "div", 30)(1, SchemaLibraryComponent_Conditional_22_Conditional_1_Template, 2, 4, "app-error-state", 31)(2, SchemaLibraryComponent_Conditional_22_Conditional_2_Template, 4, 3, "div", 30)(3, SchemaLibraryComponent_Conditional_22_Conditional_3_Template, 3, 0, "div", 63);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.catalogsLoading() ? 0 : ctx_r1.catalogsLoadError() !== null ? 1 : !ctx_r1.catalogs().length ? 2 : 3);
} }
function SchemaLibraryComponent_Conditional_23_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 83);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.catalogError());
} }
function SchemaLibraryComponent_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 72);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_23_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showAddCatalog.set(false)); })("click", function SchemaLibraryComponent_Conditional_23_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 73)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 75);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_23_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showAddCatalog.set(false)); });
    i0.ɵɵelement(9, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "div", 77)(11, "label");
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "input", 78);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_23_Template_input_ngModelChange_14_listener($event) { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.newCatalog.name, $event) || (ctx_r1.newCatalog.name = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(16, "div", 77)(17, "label");
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "input", 79);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_23_Template_input_ngModelChange_20_listener($event) { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.newCatalog.url, $event) || (ctx_r1.newCatalog.url = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(22, "div", 77)(23, "label");
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(26, "input", 78);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_23_Template_input_ngModelChange_26_listener($event) { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.newCatalog.description, $event) || (ctx_r1.newCatalog.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(28, "div", 80)(29, "label");
    i0.ɵɵtext(30);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(32, "input", 81);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_23_Template_input_ngModelChange_32_listener($event) { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.newCatalog.accessToken, $event) || (ctx_r1.newCatalog.accessToken = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "span", 82);
    i0.ɵɵtext(35);
    i0.ɵɵpipe(36, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(37, SchemaLibraryComponent_Conditional_23_Conditional_37_Template, 2, 1, "p", 83);
    i0.ɵɵelementStart(38, "div", 84)(39, "button", 85);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_23_Template_button_click_39_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.addCatalog()); });
    i0.ɵɵtext(40);
    i0.ɵɵpipe(41, "transloco");
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 20, "schemaLib.catalog.addTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 22, "schemaLib.catalog.addTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 24, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 26, "schemaLib.catalog.nameLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.newCatalog.name);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(15, 28, "schemaLib.catalog.namePlaceholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 30, "schemaLib.catalog.urlLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.newCatalog.url);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(21, 32, "schemaLib.catalog.urlPlaceholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 34, "schemaLib.catalog.descLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.newCatalog.description);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(27, 36, "schemaLib.catalog.descPlaceholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 38, "schemaLib.catalog.accessTokenLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.newCatalog.accessToken);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(33, 40, "schemaLib.catalog.accessTokenPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(36, 42, "schemaLib.catalog.accessTokenHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.catalogError() ? 37 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.catalogSaving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.catalogSaving() ? i0.ɵɵpipeBind1(41, 44, "common.saving") : i0.ɵɵpipeBind1(42, 46, "schemaLib.catalog.addButton"), " ");
} }
function SchemaLibraryComponent_Conditional_24_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 89);
    i0.ɵɵelement(1, "span", 33);
    i0.ɵɵelementEnd();
} }
function SchemaLibraryComponent_Conditional_24_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 90);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const b_r18 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(b_r18.error);
} }
function SchemaLibraryComponent_Conditional_24_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 91);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "schemaLib.catalog.browseEmpty"));
} }
function SchemaLibraryComponent_Conditional_24_Conditional_15_For_2_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 97);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const e_r20 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(e_r20.description);
} }
function SchemaLibraryComponent_Conditional_24_Conditional_15_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r19 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 93)(1, "div", 65)(2, "span", 94);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 95);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span", 96);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(8, SchemaLibraryComponent_Conditional_24_Conditional_15_For_2_Conditional_8_Template, 2, 1, "span", 97);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "button", 98);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_24_Conditional_15_For_2_Template_button_click_9_listener() { const e_r20 = i0.ɵɵrestoreView(_r19).$implicit; const b_r18 = i0.ɵɵnextContext(2); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.importFromCatalog(b_r18.catalogName, e_r20)); });
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const e_r20 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(e_r20.name);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(e_r20.knowledgeType);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(e_r20.typeName);
    i0.ɵɵadvance();
    i0.ɵɵconditional(e_r20.description ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.catalogImporting());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(11, 6, "schemaLib.catalog.importButton"), " ");
} }
function SchemaLibraryComponent_Conditional_24_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 92);
    i0.ɵɵrepeaterCreate(1, SchemaLibraryComponent_Conditional_24_Conditional_15_For_2_Template, 12, 8, "div", 93, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const b_r18 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(b_r18.entries);
} }
function SchemaLibraryComponent_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 86);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_24_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.browsing.set(null)); })("click", function SchemaLibraryComponent_Conditional_24_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 87)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementStart(7, "span", 88);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "button", 75);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_24_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.browsing.set(null)); });
    i0.ɵɵelement(11, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(12, SchemaLibraryComponent_Conditional_24_Conditional_12_Template, 2, 0, "div", 89)(13, SchemaLibraryComponent_Conditional_24_Conditional_13_Template, 2, 1, "p", 90)(14, SchemaLibraryComponent_Conditional_24_Conditional_14_Template, 3, 3, "p", 91)(15, SchemaLibraryComponent_Conditional_24_Conditional_15_Template, 3, 0, "div", 92);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const b_r18 = ctx;
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 6, "schemaLib.catalog.browseTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(6, 8, "schemaLib.catalog.browseTitle"), ": ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(b_r18.catalogName);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(10, 10, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance();
    i0.ɵɵconditional(b_r18.loading ? 12 : b_r18.error ? 13 : !b_r18.entries.length ? 14 : 15);
} }
function SchemaLibraryComponent_Conditional_25_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 83);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.libTokenError());
} }
function SchemaLibraryComponent_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    const _r21 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 99);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_25_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeCreateLibToken()); })("click", function SchemaLibraryComponent_Conditional_25_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 100)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 75);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_25_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeCreateLibToken()); });
    i0.ɵɵelement(9, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "p", 101);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "div", 77)(14, "label");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "input", 102);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵlistener("ngModelChange", function SchemaLibraryComponent_Conditional_25_Template_input_ngModelChange_17_listener($event) { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.libTokenName.set($event)); })("keydown.enter", function SchemaLibraryComponent_Conditional_25_Template_input_keydown_enter_17_listener() { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.createLibraryToken()); });
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(19, SchemaLibraryComponent_Conditional_25_Conditional_19_Template, 2, 1, "p", 83);
    i0.ɵɵelementStart(20, "div", 84)(21, "button", 15);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_25_Template_button_click_21_listener() { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeCreateLibToken()); });
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "button", 85);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_25_Template_button_click_24_listener() { i0.ɵɵrestoreView(_r21); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.createLibraryToken()); });
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 12, "schemaLib.share.tokenDialogTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 14, "schemaLib.share.tokenDialogTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 16, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 18, "schemaLib.share.tokenDialogHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 20, "schemaLib.share.tokenNameLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngModel", ctx_r1.libTokenName())("placeholder", i0.ɵɵpipeBind1(18, 22, "schemaLib.share.tokenNamePlaceholder"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.libTokenError() ? 19 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 24, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.libTokenCreating());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.libTokenCreating() ? i0.ɵɵpipeBind1(26, 26, "common.saving") : i0.ɵɵpipeBind1(27, 28, "schemaLib.share.createTokenButton"), " ");
} }
function SchemaLibraryComponent_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    const _r22 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 12)(1, "div", 103);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_26_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r22); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.libTokenRevealed.set(null)); });
    i0.ɵɵelementStart(3, "div", 100)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "p", 104);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "div", 105);
    i0.ɵɵtext(11);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "div", 84)(13, "button", 15);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_26_Template_button_click_13_listener() { i0.ɵɵrestoreView(_r22); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.copyRevealedToken()); });
    i0.ɵɵelement(14, "ph-icon", 106);
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "button", 107);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_26_Template_button_click_17_listener() { i0.ɵɵrestoreView(_r22); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.libTokenRevealed.set(null)); });
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 7, "schemaLib.share.tokenCreatedTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 9, "schemaLib.share.tokenCreatedTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 11, "schemaLib.share.tokenCreatedHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r1.libTokenRevealed());
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 12);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(16, 13, "schemaLib.share.copyButton"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 15, "common.close"));
} }
function SchemaLibraryComponent_Conditional_27_For_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 111);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r24 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r24.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r24.label);
} }
function SchemaLibraryComponent_Conditional_27_Conditional_38_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 113);
    i0.ɵɵelement(1, "ph-icon", 114);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.exportSpaceDialog().result);
} }
function SchemaLibraryComponent_Conditional_27_Conditional_39_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 83);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.exportSpaceDialog().error);
} }
function SchemaLibraryComponent_Conditional_27_Template(rf, ctx) { if (rf & 1) {
    const _r23 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 108);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_27_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportSpaceDialog.set(null)); })("click", function SchemaLibraryComponent_Conditional_27_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 73)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 75);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_27_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportSpaceDialog.set(null)); });
    i0.ɵɵelement(9, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "p", 101);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "div", 77)(14, "label");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "select", 109);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_27_Template_select_ngModelChange_17_listener($event) { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.exportSpaceDialog().spaceId, $event) || (ctx_r1.exportSpaceDialog().spaceId = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(18, "option", 110);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(21, SchemaLibraryComponent_Conditional_27_For_22_Template, 2, 2, "option", 111, _forTrack1);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(23, "div", 77)(24, "label");
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "input", 112);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_27_Template_input_ngModelChange_27_listener($event) { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.exportSpaceDialog().groupName, $event) || (ctx_r1.exportSpaceDialog().groupName = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(29, "div", 80)(30, "label");
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "input", 112);
    i0.ɵɵpipe(34, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_27_Template_input_ngModelChange_33_listener($event) { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.exportSpaceDialog().namePrefix, $event) || (ctx_r1.exportSpaceDialog().namePrefix = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(35, "span", 82);
    i0.ɵɵtext(36);
    i0.ɵɵpipe(37, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(38, SchemaLibraryComponent_Conditional_27_Conditional_38_Template, 3, 2, "p", 113);
    i0.ɵɵconditionalCreate(39, SchemaLibraryComponent_Conditional_27_Conditional_39_Template, 2, 1, "p", 83);
    i0.ɵɵelementStart(40, "div", 84)(41, "button", 15);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_27_Template_button_click_41_listener() { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.exportSpaceDialog.set(null)); });
    i0.ɵɵtext(42);
    i0.ɵɵpipe(43, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(44, "button", 85);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_27_Template_button_click_44_listener() { i0.ɵɵrestoreView(_r23); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.doExportSpace()); });
    i0.ɵɵtext(45);
    i0.ɵɵpipe(46, "transloco");
    i0.ɵɵpipe(47, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 20, "schemaLib.exportSpace.dialogTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 22, "schemaLib.exportSpace.dialogTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 24, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 26, "schemaLib.exportSpace.dialogHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 28, "schemaLib.exportSpace.spaceLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.exportSpaceDialog().spaceId);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 30, "schemaLib.exportSpace.selectSpace"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.spaces());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 32, "schemaLib.exportSpace.groupNameLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.exportSpaceDialog().groupName);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(28, 34, "schemaLib.exportSpace.groupNamePlaceholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(32, 36, "schemaLib.exportSpace.namePrefixLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.exportSpaceDialog().namePrefix);
    i0.ɵɵproperty("placeholder", ctx_r1.exportSpaceDialog().groupName || i0.ɵɵpipeBind1(34, 38, "schemaLib.exportSpace.namePrefixPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 40, "schemaLib.exportSpace.namePrefixHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.exportSpaceDialog().result ? 38 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.exportSpaceDialog().error ? 39 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(43, 42, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.exportSpaceDialog().saving);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.exportSpaceDialog().saving ? i0.ɵɵpipeBind1(46, 44, "common.saving") : i0.ɵɵpipeBind1(47, 46, "schemaLib.exportSpace.confirmButton"), " ");
} }
function SchemaLibraryComponent_Conditional_28_For_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 111);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const g_r26 = ctx.$implicit;
    i0.ɵɵproperty("value", g_r26);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(g_r26);
} }
function SchemaLibraryComponent_Conditional_28_For_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 111);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r27 = ctx.$implicit;
    i0.ɵɵproperty("value", s_r27.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r27.label);
} }
function SchemaLibraryComponent_Conditional_28_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 113);
    i0.ɵɵelement(1, "ph-icon", 114);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.applyGroupDialog().result);
} }
function SchemaLibraryComponent_Conditional_28_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 83);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.applyGroupDialog().error);
} }
function SchemaLibraryComponent_Conditional_28_Template(rf, ctx) { if (rf & 1) {
    const _r25 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 108);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_28_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r25); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.applyGroupDialog.set(null)); })("click", function SchemaLibraryComponent_Conditional_28_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 73)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 75);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_28_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r25); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.applyGroupDialog.set(null)); });
    i0.ɵɵelement(9, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "p", 101);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "div", 77)(14, "label");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "select", 109);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_28_Template_select_ngModelChange_17_listener($event) { i0.ɵɵrestoreView(_r25); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.applyGroupDialog().group, $event) || (ctx_r1.applyGroupDialog().group = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(18, "option", 110);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(21, SchemaLibraryComponent_Conditional_28_For_22_Template, 2, 2, "option", 111, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(23, "div", 80)(24, "label");
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "select", 109);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_28_Template_select_ngModelChange_27_listener($event) { i0.ɵɵrestoreView(_r25); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.applyGroupDialog().spaceId, $event) || (ctx_r1.applyGroupDialog().spaceId = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(28, "option", 110);
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(31, SchemaLibraryComponent_Conditional_28_For_32_Template, 2, 2, "option", 111, _forTrack1);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(33, SchemaLibraryComponent_Conditional_28_Conditional_33_Template, 3, 2, "p", 113);
    i0.ɵɵconditionalCreate(34, SchemaLibraryComponent_Conditional_28_Conditional_34_Template, 2, 1, "p", 83);
    i0.ɵɵelementStart(35, "div", 84)(36, "button", 15);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_28_Template_button_click_36_listener() { i0.ɵɵrestoreView(_r25); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.applyGroupDialog.set(null)); });
    i0.ɵɵtext(37);
    i0.ɵɵpipe(38, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(39, "button", 85);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_28_Template_button_click_39_listener() { i0.ɵɵrestoreView(_r25); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.doApplyGroup()); });
    i0.ɵɵtext(40);
    i0.ɵɵpipe(41, "transloco");
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 16, "schemaLib.applyGroup.dialogTitle"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 18, "schemaLib.applyGroup.dialogTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 20, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 22, "schemaLib.applyGroup.dialogHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 24, "schemaLib.applyGroup.groupLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.applyGroupDialog().group);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 26, "schemaLib.applyGroup.selectGroup"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.availableGroups());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 28, "schemaLib.applyGroup.spaceLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.applyGroupDialog().spaceId);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(30, 30, "schemaLib.applyGroup.selectSpace"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.spaces());
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.applyGroupDialog().result ? 33 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.applyGroupDialog().error ? 34 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(38, 32, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.applyGroupDialog().saving);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.applyGroupDialog().saving ? i0.ɵɵpipeBind1(41, 34, "common.saving") : i0.ɵɵpipeBind1(42, 36, "schemaLib.applyGroup.confirmButton"), " ");
} }
function SchemaLibraryComponent_Conditional_29_For_51_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "option", 111);
} if (rf & 2) {
    const g_r29 = ctx.$implicit;
    i0.ɵɵproperty("value", g_r29);
} }
function SchemaLibraryComponent_Conditional_29_Conditional_55_Template(rf, ctx) { if (rf & 1) {
    const _r30 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 123)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 130);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "input", 131);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_29_Conditional_55_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r30); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.form.schemaState.namingPattern, $event) || (ctx_r1.form.schemaState.namingPattern = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 4, "spaces.schema.namingPattern"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 6, "spaces.schema.namingPatternHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.schemaState.namingPattern);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(8, 8, "spaces.schema.namingPatternPlaceholder"));
} }
function SchemaLibraryComponent_Conditional_29_Conditional_62_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 129);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.dialogError());
} }
function SchemaLibraryComponent_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    const _r28 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 13)(1, "div", 115);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_29_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeDialog()); })("click", function SchemaLibraryComponent_Conditional_29_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(4, "div", 116)(5, "h3");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "button", 75);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_29_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeDialog()); });
    i0.ɵɵelement(11, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(12, "div", 117)(13, "div", 118)(14, "label");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "input", 78);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵlistener("ngModelChange", function SchemaLibraryComponent_Conditional_29_Template_input_ngModelChange_17_listener($event) { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.autoSlugFromTypeName($event)); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "span", 82);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementStart(22, "span", 88);
    i0.ɵɵtext(23);
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(24, "div", 118)(25, "label");
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "select", 109);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_29_Template_select_ngModelChange_28_listener($event) { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.form.knowledgeType, $event) || (ctx_r1.form.knowledgeType = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(29, "option", 119);
    i0.ɵɵtext(30, "entity");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(31, "option", 120);
    i0.ɵɵtext(32, "edge");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "option", 121);
    i0.ɵɵtext(34, "memory");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(35, "option", 122);
    i0.ɵɵtext(36, "chrono");
    i0.ɵɵelementEnd()()()();
    i0.ɵɵelementStart(37, "div", 123)(38, "label");
    i0.ɵɵtext(39);
    i0.ɵɵpipe(40, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(41, "input", 78);
    i0.ɵɵpipe(42, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_29_Template_input_ngModelChange_41_listener($event) { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.form.description, $event) || (ctx_r1.form.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(43, "div", 123)(44, "label");
    i0.ɵɵtext(45);
    i0.ɵɵpipe(46, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(47, "input", 124);
    i0.ɵɵpipe(48, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaLibraryComponent_Conditional_29_Template_input_ngModelChange_47_listener($event) { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.form.schemaGroup, $event) || (ctx_r1.form.schemaGroup = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(49, "datalist", 125);
    i0.ɵɵrepeaterCreate(50, SchemaLibraryComponent_Conditional_29_For_51_Template, 1, 1, "option", 111, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(52, "span", 82);
    i0.ɵɵtext(53);
    i0.ɵɵpipe(54, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(55, SchemaLibraryComponent_Conditional_29_Conditional_55_Template, 9, 10, "div", 123);
    i0.ɵɵelementStart(56, "div")(57, "div", 126);
    i0.ɵɵtext(58);
    i0.ɵɵpipe(59, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(60, "app-prop-schema-table", 127);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(61, "div", 128);
    i0.ɵɵconditionalCreate(62, SchemaLibraryComponent_Conditional_29_Conditional_62_Template, 2, 1, "span", 129);
    i0.ɵɵelementStart(63, "button", 85);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_29_Template_button_click_63_listener() { i0.ɵɵrestoreView(_r28); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.saveEntry()); });
    i0.ɵɵtext(64);
    i0.ɵɵpipe(65, "transloco");
    i0.ɵɵpipe(66, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", ctx_r1.editingName() ? i0.ɵɵpipeBind1(2, 24, "schemaLib.dialog.editTitle") : i0.ɵɵpipeBind1(3, 26, "schemaLib.dialog.createTitle"));
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(ctx_r1.editingName() ? i0.ɵɵpipeBind1(7, 28, "schemaLib.dialog.editTitle") : i0.ɵɵpipeBind1(8, 30, "schemaLib.dialog.createTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(10, 32, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 34, "schemaLib.field.typeName"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngModel", ctx_r1.form.typeName)("placeholder", i0.ɵɵpipeBind1(18, 36, "schemaLib.field.typeNamePlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(21, 38, "schemaLib.field.nameAutoLabel"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r1.form.name || "\u2014");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 40, "schemaLib.field.knowledgeType"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.knowledgeType);
    i0.ɵɵadvance(11);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(40, 42, "schemaLib.field.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.description);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(42, 44, "schemaLib.field.descriptionPlaceholder"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(46, 46, "schemaLib.field.schemaGroup"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.schemaGroup);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(48, 48, "schemaLib.field.schemaGroupPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r1.availableGroups());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(54, 50, "schemaLib.field.schemaGroupHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.form.knowledgeType === "entity" ? 55 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(59, 52, "spaces.schema.propertySchemas"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("rows", ctx_r1.form.schemaState.propertySchemas);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.dialogError() ? 62 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.saving() ? i0.ɵɵpipeBind1(65, 54, "common.saving") : i0.ɵɵpipeBind1(66, 56, "common.save"), " ");
} }
function SchemaLibraryComponent_Conditional_30_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 134);
    i0.ɵɵelement(1, "span", 33);
    i0.ɵɵelementEnd();
} }
function SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_0_For_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "strong");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(3);
    i0.ɵɵelementStart(4, "code");
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const u_r33 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(u_r33.spaceLabel);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" \u2014 ", u_r33.knowledgeType, ": ");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(u_r33.typeName);
} }
function SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 135);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "ul", 139);
    i0.ɵɵrepeaterCreate(4, SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_0_For_5_Template, 6, 3, "li", null, _forTrack2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p", 140);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const dd_r34 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 2, "schemaLib.delete.usagesWarning", i0.ɵɵpureFunction1(7, _c2, dd_r34.usages.length)));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(dd_r34.usages);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "schemaLib.delete.unlinkNote"));
} }
function SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 135);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const dd_r34 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "schemaLib.delete.noUsages", i0.ɵɵpureFunction1(4, _c3, dd_r34.entryName)));
} }
function SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 136);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const dd_r34 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(dd_r34.error);
} }
function SchemaLibraryComponent_Conditional_30_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r32 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_0_Template, 9, 9)(1, SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_1_Template, 3, 6, "p", 135);
    i0.ɵɵconditionalCreate(2, SchemaLibraryComponent_Conditional_30_Conditional_11_Conditional_2_Template, 2, 1, "p", 136);
    i0.ɵɵelementStart(3, "div", 137)(4, "button", 98);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_30_Conditional_11_Template_button_click_4_listener() { i0.ɵɵrestoreView(_r32); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.closeDeleteDialog()); });
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 138);
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_30_Conditional_11_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r32); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.confirmDelete()); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const dd_r34 = i0.ɵɵnextContext();
    i0.ɵɵconditional(dd_r34.usages.length > 0 ? 0 : 1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(dd_r34.error ? 2 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", dd_r34.unlinking);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 6, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", dd_r34.unlinking);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", dd_r34.unlinking ? i0.ɵɵpipeBind1(9, 8, "schemaLib.delete.unlinking") : dd_r34.usages.length > 0 ? i0.ɵɵpipeBind1(10, 10, "schemaLib.delete.confirmUnlink") : i0.ɵɵpipeBind1(11, 12, "common.remove"), " ");
} }
function SchemaLibraryComponent_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    const _r31 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "div", 132);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function SchemaLibraryComponent_Conditional_30_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r31); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeDeleteDialog()); })("click", function SchemaLibraryComponent_Conditional_30_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "div", 133)(4, "h3", 74);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 75);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵlistener("click", function SchemaLibraryComponent_Conditional_30_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r31); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeDeleteDialog()); });
    i0.ɵɵelement(9, "ph-icon", 76);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(10, SchemaLibraryComponent_Conditional_30_Conditional_10_Template, 2, 0, "div", 134)(11, SchemaLibraryComponent_Conditional_30_Conditional_11_Template, 12, 14);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 5, "schemaLib.delete.title"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 7, "schemaLib.delete.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 9, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx.loading ? 10 : 11);
} }
function emptySchemaState() {
    return { namingPattern: '', propertySchemas: [], _newPropInput: '', _newTagInput: '' };
}
function entryToFormState(e) {
    const s = e.schema;
    return {
        name: e.name,
        description: e.description ?? '',
        knowledgeType: e.knowledgeType,
        typeName: e.typeName,
        schemaGroup: e.schemaGroup ?? '',
        schemaState: {
            namingPattern: s.namingPattern ?? '',
            propertySchemas: Object.entries(s.propertySchemas ?? {}).map(([k, ps]) => ({ key: k, s: { ...ps }, _enumInput: '' })),
            _newPropInput: '',
            _newTagInput: '',
        },
    };
}
function formStateToSchema(f) {
    const schema = {};
    if (f.knowledgeType === 'entity' && f.schemaState.namingPattern.trim()) {
        schema.namingPattern = f.schemaState.namingPattern.trim();
    }
    if (f.schemaState.propertySchemas.length) {
        const ps = {};
        for (const { key, s } of f.schemaState.propertySchemas) {
            const entry = {};
            if (s.type)
                entry.type = s.type;
            if (s.enum?.length)
                entry.enum = [...s.enum];
            if (s.minimum != null)
                entry.minimum = s.minimum;
            if (s.maximum != null)
                entry.maximum = s.maximum;
            if (s.pattern?.trim())
                entry.pattern = s.pattern.trim();
            if (s.mergeFn)
                entry.mergeFn = s.mergeFn;
            if (s.required)
                entry.required = s.required;
            if (s.default != null)
                entry.default = s.default;
            ps[key] = entry;
        }
        schema.propertySchemas = ps;
    }
    return schema;
}
// ── Component ───────────────────────────────────────────────────────────────
/** The four schema-bearing knowledge types, in the server's `export-space` iteration order. */
const KNOWLEDGE_TYPES = ['entity', 'memory', 'edge', 'chrono'];
/**
 * If `raw` is a space-schema export (a `{ typeSchemas: {...} }` envelope OR a bare typeSchemas map
 * keyed by knowledge type), return the typeSchemas map; otherwise null (it's a library-entry file).
 * A library entry has `name`+`knowledgeType`+`schema` at the top level, so we key off `typeSchemas`
 * and the knowledge-type keys to disambiguate.
 */
export function extractTypeSchemas(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const candidate = (obj['typeSchemas'] && typeof obj['typeSchemas'] === 'object' && !Array.isArray(obj['typeSchemas']))
        ? obj['typeSchemas']
        // A bare typeSchemas map: only if it has NO library-entry marker and at least one KT key.
        : (!('name' in obj) && !('schema' in obj) && KNOWLEDGE_TYPES.some(kt => kt in obj) ? obj : null);
    if (!candidate)
        return null;
    return candidate;
}
/**
 * Turn a space's `typeSchemas` into grouped library entries, mirroring the server `export-space`
 * naming (`<prefix>-<kt>-<typeName>`, sanitised) so a file import produces the same entries as
 * exporting the live space would. `$ref` types are skipped — they already point at a library entry.
 */
export function entriesFromTypeSchemas(typeSchemas, group) {
    const prefix = group.toLowerCase().replace(/[^a-z0-9_.-]/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 100);
    const entries = [];
    let skippedRefs = 0;
    for (const kt of KNOWLEDGE_TYPES) {
        const ktMap = typeSchemas[kt];
        if (!ktMap || typeof ktMap !== 'object')
            continue;
        for (const [typeName, schema] of Object.entries(ktMap)) {
            if (!schema || typeof schema !== 'object')
                continue;
            if ('$ref' in schema) {
                skippedRefs++;
                continue;
            }
            const safeName = typeName.toLowerCase().replace(/[^a-z0-9_.-]/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 80);
            const name = `${prefix}-${kt}-${safeName}`.slice(0, 200);
            entries.push({ name, knowledgeType: kt, typeName, schema, schemaGroup: group });
        }
    }
    return { entries, skippedRefs };
}
export class SchemaLibraryComponent {
    constructor() {
        this.authApi = inject(AuthApi);
        this.schemaApi = inject(SchemaApi);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.entries = signal([], ...(ngDevMode ? [{ debugName: "entries" }] : /* istanbul ignore next */ []));
        /** Failure reason for the library list load; null when it loaded (U3). */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.usageCounts = signal({}, ...(ngDevMode ? [{ debugName: "usageCounts" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.saving = signal(false, ...(ngDevMode ? [{ debugName: "saving" }] : /* istanbul ignore next */ []));
        this.showDialog = signal(false, ...(ngDevMode ? [{ debugName: "showDialog" }] : /* istanbul ignore next */ []));
        this.editingName = signal(null, ...(ngDevMode ? [{ debugName: "editingName" }] : /* istanbul ignore next */ []));
        this.dialogError = signal('', ...(ngDevMode ? [{ debugName: "dialogError" }] : /* istanbul ignore next */ []));
        this.confirmDeleteName = signal('', ...(ngDevMode ? [{ debugName: "confirmDeleteName" }] : /* istanbul ignore next */ []));
        this.searchQuery = signal('', ...(ngDevMode ? [{ debugName: "searchQuery" }] : /* istanbul ignore next */ []));
        this.typeFilter = signal(null, ...(ngDevMode ? [{ debugName: "typeFilter" }] : /* istanbul ignore next */ []));
        this.groupFilter = signal(null, ...(ngDevMode ? [{ debugName: "groupFilter" }] : /* istanbul ignore next */ []));
        /** Current page tab: 'library' | 'catalogs'. */
        this.pageTab = signal('library', ...(ngDevMode ? [{ debugName: "pageTab" }] : /* istanbul ignore next */ []));
        /** Foreign catalog signals. */
        this.catalogs = signal([], ...(ngDevMode ? [{ debugName: "catalogs" }] : /* istanbul ignore next */ []));
        this.catalogsLoading = signal(false, ...(ngDevMode ? [{ debugName: "catalogsLoading" }] : /* istanbul ignore next */ []));
        /**
         * Null until the catalog list failed to load. Distinct from `catalogError`, which belongs to the
         * add-catalog dialog: the load used to clear `catalogs` on failure, so the page reported "no catalogs
         * configured" to an operator who had configured several.
         */
        this.catalogsLoadError = signal(null, ...(ngDevMode ? [{ debugName: "catalogsLoadError" }] : /* istanbul ignore next */ []));
        this.catalogSaving = signal(false, ...(ngDevMode ? [{ debugName: "catalogSaving" }] : /* istanbul ignore next */ []));
        this.catalogError = signal('', ...(ngDevMode ? [{ debugName: "catalogError" }] : /* istanbul ignore next */ []));
        this.showAddCatalog = signal(false, ...(ngDevMode ? [{ debugName: "showAddCatalog" }] : /* istanbul ignore next */ []));
        this.catalogImporting = signal(false, ...(ngDevMode ? [{ debugName: "catalogImporting" }] : /* istanbul ignore next */ []));
        this.newCatalog = { name: '', url: '', description: '', accessToken: '' };
        /** Library sharing signals. */
        this.libraryPublicUrl = window.location.origin + '/api/schema-library';
        this.urlCopied = signal(false, ...(ngDevMode ? [{ debugName: "urlCopied" }] : /* istanbul ignore next */ []));
        this.showCreateLibToken = signal(false, ...(ngDevMode ? [{ debugName: "showCreateLibToken" }] : /* istanbul ignore next */ []));
        this.libTokenName = signal('', ...(ngDevMode ? [{ debugName: "libTokenName" }] : /* istanbul ignore next */ []));
        this.libTokenCreating = signal(false, ...(ngDevMode ? [{ debugName: "libTokenCreating" }] : /* istanbul ignore next */ []));
        this.libTokenRevealed = signal(null, ...(ngDevMode ? [{ debugName: "libTokenRevealed" }] : /* istanbul ignore next */ []));
        this.libTokenError = signal('', ...(ngDevMode ? [{ debugName: "libTokenError" }] : /* istanbul ignore next */ []));
        /** Space list for export/apply dialogs. */
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        /** Export space schema dialog state. */
        this.exportSpaceDialog = signal(null, ...(ngDevMode ? [{ debugName: "exportSpaceDialog" }] : /* istanbul ignore next */ []));
        /** Apply group to space dialog state. */
        this.applyGroupDialog = signal(null, ...(ngDevMode ? [{ debugName: "applyGroupDialog" }] : /* istanbul ignore next */ []));
        /** Catalog browse dialog state. */
        this.browsing = signal(null, ...(ngDevMode ? [{ debugName: "browsing" }] : /* istanbul ignore next */ []));
        /** State for the usage-aware delete warning dialog. */
        this.deleteDialog = signal(null, ...(ngDevMode ? [{ debugName: "deleteDialog" }] : /* istanbul ignore next */ []));
        /** Distinct group names derived from the current entries list. */
        this.availableGroups = computed(() => {
            const seen = new Set();
            const groups = [];
            for (const e of this.entries()) {
                if (e.schemaGroup && !seen.has(e.schemaGroup)) {
                    seen.add(e.schemaGroup);
                    groups.push(e.schemaGroup);
                }
            }
            return groups.sort();
        }, ...(ngDevMode ? [{ debugName: "availableGroups" }] : /* istanbul ignore next */ []));
        this.filteredEntries = computed(() => {
            const q = this.searchQuery().trim().toLowerCase();
            const kt = this.typeFilter();
            const g = this.groupFilter();
            let result = this.entries();
            if (kt)
                result = result.filter(e => e.knowledgeType === kt);
            if (g)
                result = result.filter(e => e.schemaGroup === g);
            if (!q)
                return result;
            return result.filter(e => e.name.toLowerCase().includes(q) ||
                e.typeName.toLowerCase().includes(q) ||
                (e.description ?? '').toLowerCase().includes(q) ||
                (e.schemaGroup ?? '').toLowerCase().includes(q));
        }, ...(ngDevMode ? [{ debugName: "filteredEntries" }] : /* istanbul ignore next */ []));
        this.form = this.blankForm();
    }
    blankForm() {
        return {
            name: '',
            description: '',
            knowledgeType: 'entity',
            typeName: '',
            schemaGroup: '',
            schemaState: emptySchemaState(),
        };
    }
    ngOnInit() {
        this.load();
        // Pre-load space list for export/apply dialogs
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces }) => this.spaces.set(spaces),
            error: () => { },
        });
    }
    load() {
        this.loading.set(true);
        this.loadError.set(null);
        this.schemaApi.listSchemaLibrary().pipe(finalize(() => this.loading.set(false))).subscribe({
            next: ({ entries }) => {
                this.entries.set(entries);
                if (entries.length === 0)
                    return;
                // Fetch usage counts for all entries (non-critical; errors silently ignored)
                forkJoin(entries.map(e => this.schemaApi.getSchemaLibraryUsages(e.name))).subscribe({
                    next: (results) => {
                        const counts = {};
                        entries.forEach((e, i) => { counts[e.name] = results[i]?.usages?.length ?? 0; });
                        this.usageCounts.set(counts);
                    },
                    error: () => { }, // usage counts are non-critical
                });
            },
            // Distinguish a failed load from a genuinely empty library (U3).
            error: (e) => { this.entries.set([]); this.loadError.set(httpErrorReason(e)); },
        });
    }
    propCount(entry) {
        return Object.keys(entry.schema.propertySchemas ?? {}).length;
    }
    // ── Dialog open/close ──────────────────────────────────────────────────────
    openCreate() {
        this.form = this.blankForm();
        this.editingName.set(null);
        this.dialogError.set('');
        this.showDialog.set(true);
    }
    openEdit(entry) {
        this.form = entryToFormState(entry);
        this.editingName.set(entry.name);
        this.dialogError.set('');
        this.showDialog.set(true);
    }
    closeDialog() {
        this.showDialog.set(false);
        this.editingName.set(null);
        this.dialogError.set('');
        this.confirmDeleteName.set('');
    }
    // ── Usage-aware delete flow ────────────────────────────────────────────────
    initiateDelete(name) {
        this.deleteDialog.set({ entryName: name, usages: [], loading: true, unlinking: false, error: '' });
        this.schemaApi.getSchemaLibraryUsages(name).subscribe({
            next: ({ usages }) => {
                this.deleteDialog.update(d => d ? { ...d, usages, loading: false } : d);
            },
            error: () => {
                // If we can't check usages, still allow delete (fail open — usages non-critical)
                this.deleteDialog.update(d => d ? { ...d, usages: [], loading: false } : d);
            },
        });
    }
    closeDeleteDialog() { this.deleteDialog.set(null); }
    confirmDelete() {
        const d = this.deleteDialog();
        if (!d)
            return;
        if (d.usages.length === 0) {
            this._doDelete(d.entryName);
            return;
        }
        // Unlink all linked types (replace $ref with inline schema from library entry),
        // then delete the library entry.
        const entry = this.entries().find(e => e.name === d.entryName);
        this.deleteDialog.update(s => s ? { ...s, unlinking: true, error: '' } : s);
        const unlinks$ = d.usages.map(u => this.spacesApi.upsertTypeSchema(u.spaceId, u.knowledgeType, u.typeName, entry ? { ...entry.schema } : {}));
        forkJoin(unlinks$.length ? unlinks$ : [Promise.resolve()]).subscribe({
            next: () => this._doDelete(d.entryName),
            error: (err) => {
                this.deleteDialog.update(s => s ? { ...s, unlinking: false, error: err?.error?.error ?? 'Failed to unlink one or more spaces.' } : s);
            },
        });
    }
    _doDelete(name) {
        this.schemaApi.deleteSchemaLibraryEntry(name).subscribe({
            next: () => {
                this.entries.update(list => list.filter(e => e.name !== name));
                this.usageCounts.update(c => { const n = { ...c }; delete n[name]; return n; });
                this.deleteDialog.set(null);
            },
            error: (err) => {
                this.deleteDialog.update(s => s ? { ...s, unlinking: false, error: err?.error?.error ?? this.transloco.translate('schemaLib.error.deleteFailed') } : s);
            },
        });
    }
    // ── Name slugify ───────────────────────────────────────────────────────────
    slugifyName() {
        if (!this.editingName()) {
            this.form.name = this.form.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 200);
        }
    }
    autoSlugFromTypeName(val) {
        this.form.typeName = val;
        if (!this.editingName()) {
            this.form.name = val.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 200);
        }
    }
    // ── Tag suggestions ────────────────────────────────────────────────────────
    // `addTag`/`removeTag` went with the editor. `schemaState.tagSuggestions` deliberately stays: it is
    // loaded from the stored entry and written back on save, so retiring the control does not delete an
    // operator's list. Same trade as the space-wide list in #365 — an unused field is a smaller cost
    // than silently destroying data on the next save.
    // ── Save ───────────────────────────────────────────────────────────────────
    saveEntry() {
        this.dialogError.set('');
        const name = this.editingName() ?? this.form.name.trim();
        const payload = {
            knowledgeType: this.form.knowledgeType,
            typeName: this.form.typeName.trim() || name,
            schema: formStateToSchema(this.form),
            description: this.form.description.trim() || undefined,
            schemaGroup: this.form.schemaGroup.trim() || undefined,
        };
        if (!name) {
            this.dialogError.set(this.transloco.translate('schemaLib.error.nameRequired'));
            return;
        }
        this.saving.set(true);
        const req$ = this.editingName()
            ? this.schemaApi.upsertSchemaLibraryEntry(name, payload)
            : this.schemaApi.createSchemaLibraryEntry({ ...payload, name });
        req$.pipe(finalize(() => this.saving.set(false))).subscribe({
            next: ({ entry }) => {
                this.entries.update(list => {
                    const idx = list.findIndex(e => e.name === entry.name);
                    if (idx === -1)
                        return [...list, entry];
                    const updated = [...list];
                    updated[idx] = entry;
                    return updated;
                });
                this.closeDialog();
            },
            error: (err) => {
                this.dialogError.set(err?.error?.error ?? this.transloco.translate('schemaLib.error.saveFailed'));
            },
        });
    }
    deleteEntry(name) {
        // Legacy inline confirm path — now superseded by initiateDelete().
        // Kept for safety; should not be reachable from current template.
        this._doDelete(name);
    }
    // ── Publish toggle ────────────────────────────────────────────────────────
    togglePublish(entry) {
        const next = !entry.published;
        this.schemaApi.publishSchemaLibraryEntry(entry.name, next).subscribe({
            next: ({ entry: updated }) => {
                this.entries.update(list => {
                    const idx = list.findIndex(e => e.name === updated.name);
                    if (idx === -1)
                        return list;
                    const copy = [...list];
                    copy[idx] = updated;
                    return copy;
                });
            },
            error: () => { },
        });
    }
    // ── Foreign catalogs ──────────────────────────────────────────────────────
    loadCatalogs() {
        if (this.catalogsLoading())
            return;
        this.catalogsLoading.set(true);
        this.catalogsLoadError.set(null);
        this.schemaApi.listSchemaCatalogs().pipe(finalize(() => this.catalogsLoading.set(false))).subscribe({
            next: ({ catalogs }) => this.catalogs.set(catalogs),
            error: (err) => { this.catalogs.set([]); this.catalogsLoadError.set(httpErrorReason(err)); },
        });
    }
    openAddCatalog() {
        this.newCatalog = { name: '', url: '', description: '', accessToken: '' };
        this.catalogError.set('');
        this.showAddCatalog.set(true);
    }
    addCatalog() {
        this.catalogError.set('');
        const { name, url, description, accessToken } = this.newCatalog;
        if (!name.trim() || !url.trim()) {
            this.catalogError.set(this.transloco.translate('schemaLib.catalog.errorRequired'));
            return;
        }
        this.catalogSaving.set(true);
        const baseUrl = url.trim().replace(/\/+$/, '');
        const catalogUrl = baseUrl.endsWith('/api/schema-library') ? baseUrl : `${baseUrl}/api/schema-library`;
        this.schemaApi.addSchemaCatalog({ name: name.trim(), url: catalogUrl, description: description.trim() || undefined, accessToken: accessToken.trim() || undefined }).pipe(finalize(() => this.catalogSaving.set(false))).subscribe({
            next: ({ catalog }) => {
                this.catalogs.update(list => [...list, catalog]);
                this.showAddCatalog.set(false);
            },
            error: (err) => {
                this.catalogError.set(err?.error?.error ?? this.transloco.translate('schemaLib.catalog.saveError'));
            },
        });
    }
    // ── Library sharing ──────────────────────────────────────────────────────
    copyLibraryUrl() {
        navigator.clipboard.writeText(this.libraryPublicUrl).then(() => {
            this.urlCopied.set(true);
            setTimeout(() => this.urlCopied.set(false), 2000);
        }).catch(() => { });
    }
    closeCreateLibToken() {
        this.showCreateLibToken.set(false);
        this.libTokenName.set('');
        this.libTokenError.set('');
    }
    createLibraryToken() {
        const name = this.libTokenName().trim();
        if (!name) {
            this.libTokenError.set(this.transloco.translate('tokens.error.nameRequired'));
            return;
        }
        this.libTokenCreating.set(true);
        this.libTokenError.set('');
        this.authApi.createToken({ name, schemaLibrary: true }).pipe(finalize(() => this.libTokenCreating.set(false))).subscribe({
            next: ({ plaintext }) => {
                this.closeCreateLibToken();
                this.libTokenRevealed.set(plaintext);
            },
            error: (err) => {
                this.libTokenError.set(err?.error?.error ?? this.transloco.translate('tokens.error.createFailed'));
            },
        });
    }
    copyRevealedToken() {
        const t = this.libTokenRevealed();
        if (t)
            navigator.clipboard.writeText(t).catch(() => { });
    }
    removeCatalog(name) {
        this.schemaApi.deleteSchemaCatalog(name).subscribe({
            next: () => this.catalogs.update(list => list.filter(c => c.name !== name)),
            error: () => { },
        });
    }
    openBrowse(catalogName) {
        this.browsing.set({ catalogName, entries: [], loading: true, error: '' });
        this.schemaApi.browseCatalog(catalogName).subscribe({
            next: ({ entries }) => this.browsing.update(b => b ? { ...b, entries, loading: false } : b),
            error: (err) => {
                const msg = err?.error?.error ?? this.transloco.translate('schemaLib.catalog.fetchFailed');
                this.browsing.update(b => b ? { ...b, loading: false, error: msg } : b);
            },
        });
    }
    importFromCatalog(catalogName, entry) {
        if (this.catalogImporting())
            return;
        // Fetch full schema for this entry, then upsert locally
        this.catalogImporting.set(true);
        this.schemaApi.getCatalogEntry(catalogName, entry.name).pipe(finalize(() => this.catalogImporting.set(false))).subscribe({
            next: ({ entry: full }) => {
                if (!full.schema)
                    return;
                this.schemaApi.upsertSchemaLibraryEntry(full.name, {
                    knowledgeType: full.knowledgeType,
                    typeName: full.typeName,
                    schema: full.schema,
                    description: full.description,
                    sourceCatalog: catalogName,
                }).subscribe({
                    next: ({ entry: upserted }) => {
                        this.entries.update(list => {
                            const idx = list.findIndex(e => e.name === upserted.name);
                            if (idx === -1)
                                return [...list, upserted];
                            const copy = [...list];
                            copy[idx] = upserted;
                            return copy;
                        });
                    },
                    error: () => { },
                });
            },
            error: () => { },
        });
    }
    // ── Export single entry to file ────────────────────────────────────────────
    exportEntry(entry) {
        const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schema-library_${entry.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    // ── Import entries from file ───────────────────────────────────────────────
    triggerImportFile() {
        this.importFileInputRef?.nativeElement.click();
    }
    onImportFile(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const raw = JSON.parse(reader.result);
                // Two accepted shapes:
                //  (a) a space-schema export envelope `{ spaceId?, spaceLabel?, typeSchemas: {...} }` (or a bare
                //      typeSchemas object) — auto-grouped into one library entry per inline type, and
                //  (b) a single library entry or an array of them (the per-entry export shape).
                const ts = extractTypeSchemas(raw);
                let items;
                let group;
                let skipped = 0;
                if (ts) {
                    const g = (raw?.spaceLabel || raw?.spaceId || file.name.replace(/\.json$/i, '') || 'imported').toString();
                    group = g;
                    const built = entriesFromTypeSchemas(ts, g);
                    items = built.entries;
                    skipped = built.skippedRefs;
                }
                else {
                    items = Array.isArray(raw) ? raw : [raw];
                }
                let imported = 0;
                for (const item of items) {
                    const e = item;
                    if (!e?.name || !e?.knowledgeType || !e?.schema)
                        continue;
                    try {
                        const r = await this.schemaApi.upsertSchemaLibraryEntry(e.name, {
                            knowledgeType: e.knowledgeType,
                            typeName: e.typeName ?? e.name,
                            schema: e.schema,
                            description: e.description,
                            schemaGroup: e.schemaGroup,
                        }).toPromise();
                        if (r?.entry) {
                            this.entries.update(list => {
                                const idx = list.findIndex(x => x.name === r.entry.name);
                                if (idx === -1)
                                    return [...list, r.entry];
                                const u = [...list];
                                u[idx] = r.entry;
                                return u;
                            });
                            imported++;
                        }
                    }
                    catch { /* skip invalid entries */ }
                }
                if (imported === 0) {
                    this.toast.info(this.transloco.translate('schemaLib.import.noneImported'));
                }
                else if (group !== undefined) {
                    const key = skipped > 0 ? 'schemaLib.import.spaceGroupedSkipped' : 'schemaLib.import.spaceGrouped';
                    this.toast.success(this.transloco.translate(key, { count: imported, group, skipped }));
                }
            }
            catch {
                this.toast.error(this.transloco.translate('schemaLib.import.parseFailed'));
            }
            finally {
                if (this.importFileInputRef)
                    this.importFileInputRef.nativeElement.value = '';
            }
        };
        reader.readAsText(file);
    }
    // ── Export space schema to library ────────────────────────────────────────
    openExportSpace() {
        this.exportSpaceDialog.set({ spaceId: '', groupName: '', namePrefix: '', saving: false, error: '', result: '' });
    }
    doExportSpace() {
        const d = this.exportSpaceDialog();
        if (!d)
            return;
        if (!d.spaceId) {
            this.exportSpaceDialog.update(s => s ? { ...s, error: this.transloco.translate('schemaLib.exportSpace.errorNoSpace') } : s);
            return;
        }
        if (!d.groupName.trim()) {
            this.exportSpaceDialog.update(s => s ? { ...s, error: this.transloco.translate('schemaLib.exportSpace.errorNoGroup') } : s);
            return;
        }
        this.exportSpaceDialog.update(s => s ? { ...s, saving: true, error: '', result: '' } : s);
        this.schemaApi.exportSpaceSchemaToLibrary({
            spaceId: d.spaceId,
            groupName: d.groupName.trim(),
            namePrefix: d.namePrefix.trim() || undefined,
        }).pipe(finalize(() => this.exportSpaceDialog.update(s => s ? { ...s, saving: false } : s))).subscribe({
            next: ({ created, updated, entries: newEntries }) => {
                // Merge new/updated entries into local list
                this.entries.update(list => {
                    let result = [...list];
                    for (const entry of newEntries) {
                        const idx = result.findIndex(e => e.name === entry.name);
                        if (idx === -1)
                            result = [...result, entry];
                        else {
                            result = [...result];
                            result[idx] = entry;
                        }
                    }
                    return result;
                });
                const msg = this.transloco.translate('schemaLib.exportSpace.success', { created, updated });
                this.exportSpaceDialog.update(s => s ? { ...s, result: msg } : s);
            },
            error: (err) => {
                this.exportSpaceDialog.update(s => s ? { ...s, error: err?.error?.error ?? this.transloco.translate('schemaLib.exportSpace.errorFailed') } : s);
            },
        });
    }
    // ── Apply group to space ──────────────────────────────────────────────────
    openApplyGroup() {
        this.applyGroupDialog.set({ group: this.groupFilter() ?? '', spaceId: '', saving: false, error: '', result: '' });
    }
    doApplyGroup() {
        const d = this.applyGroupDialog();
        if (!d)
            return;
        if (!d.group) {
            this.applyGroupDialog.update(s => s ? { ...s, error: this.transloco.translate('schemaLib.applyGroup.errorNoGroup') } : s);
            return;
        }
        if (!d.spaceId) {
            this.applyGroupDialog.update(s => s ? { ...s, error: this.transloco.translate('schemaLib.applyGroup.errorNoSpace') } : s);
            return;
        }
        this.applyGroupDialog.update(s => s ? { ...s, saving: true, error: '', result: '' } : s);
        this.schemaApi.applyGroupToSpace(d.group, d.spaceId).pipe(finalize(() => this.applyGroupDialog.update(s => s ? { ...s, saving: false } : s))).subscribe({
            next: ({ count }) => {
                const msg = this.transloco.translate('schemaLib.applyGroup.success', { count });
                this.applyGroupDialog.update(s => s ? { ...s, result: msg } : s);
            },
            error: (err) => {
                this.applyGroupDialog.update(s => s ? { ...s, error: err?.error?.error ?? this.transloco.translate('schemaLib.applyGroup.errorFailed') } : s);
            },
        });
    }
    static { this.ɵfac = function SchemaLibraryComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SchemaLibraryComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SchemaLibraryComponent, selectors: [["app-schema-library"]], viewQuery: function SchemaLibraryComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuery(_c0, 5);
        } if (rf & 2) {
            let _t;
            i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.importFileInputRef = _t.first);
        } }, decls: 31, vars: 35, consts: [["importFileInput", ""], [1, "header-row"], [1, "header-actions"], ["type", "button", 1, "btn", "btn-primary", "btn-sm"], ["role", "tablist", 1, "page-tabs"], ["type", "button", "role", "tab", 1, "page-tab", 3, "click"], ["name", "globe", 2, "margin-right", "4px", 3, "size"], [1, "search-row", 2, "display", "flex", "align-items", "center", "gap", "8px", "margin-bottom", "12px"], ["type", "search", 2, "flex", "1", "min-width", "0", 3, "ngModelChange", "ngModel", "placeholder"], [2, "display", "flex", "align-items", "center", "gap", "6px", "flex-shrink", "0"], [1, "type-filters"], [2, "position", "fixed", "inset", "0", "background", "var(--bg-scrim)", "display", "flex", "align-items", "center", "justify-content", "center", "z-index", "200"], [2, "position", "fixed", "inset", "0", "background", "var(--bg-scrim)", "display", "flex", "align-items", "center", "justify-content", "center", "z-index", "210"], [1, "dialog-backdrop"], [2, "position", "fixed", "inset", "0", "background", "rgba(0,0,0,.5)", "z-index", "320", "display", "flex", "align-items", "center", "justify-content", "center"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"], ["name", "export", 2, "margin-right", "5px", "vertical-align", "-2px", 3, "size"], ["name", "stack", 2, "margin-right", "5px", "vertical-align", "-2px", 3, "size"], ["name", "download-simple", 2, "margin-right", "5px", "vertical-align", "-2px", 3, "size"], ["type", "file", "accept", ".json", 2, "display", "none", 3, "change"], ["type", "button", 1, "btn", "btn-primary", "btn-sm", 3, "click"], [1, "share-bar-url", 2, "max-width", "260px"], ["name", "check", 3, "size"], ["name", "copy", 3, "size"], ["name", "key", 3, "size"], ["type", "button", 1, "type-filter-btn", 3, "active"], ["type", "button", 1, "group-filter-btn", 3, "active"], ["type", "button", 1, "type-filter-btn", 3, "click"], ["type", "button", 1, "group-filter-btn", 3, "click"], ["name", "tag", 2, "margin-right", "3px", "vertical-align", "-1px", 3, "size"], [1, "empty-state"], [3, "message", "reason"], [1, "entry-grid"], [1, "spinner"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "bookmarks", 3, "size"], [2, "color", "var(--text-muted)"], [1, "entry-card"], [1, "entry-card", 3, "click"], [1, "entry-main"], [1, "entry-title-row"], [1, "badge-kt"], [1, "entry-name"], [1, "entry-meta"], [1, "prop-badge"], [1, "prop-badge", 3, "title"], [1, "prop-badge", 2, "color", "var(--accent)", "background", "var(--accent-dim)"], [1, "badge-group", 3, "title"], [1, "badge-published"], [1, "badge-source", 3, "title"], [1, "entry-description"], [1, "entry-footer"], [1, "badge-type"], [1, "updated"], [1, "entry-actions", 3, "click"], ["type", "button", 1, "btn", "btn-ghost", "btn-sm", 3, "click"], ["name", "globe", 3, "size"], ["name", "upload", 3, "size"], ["type", "button", 1, "btn", "btn-ghost", "btn-sm", "danger", 3, "click"], ["name", "trash", 3, "size"], [1, "badge-group", 3, "click", "title"], ["name", "tag", 2, "margin-right", "2px", "vertical-align", "-1px", 3, "size"], [2, "display", "grid", "gap", "10px"], [1, "catalog-card"], [2, "flex", "1", "min-width", "0"], [2, "font-weight", "600", "font-size", "14px", "font-family", "var(--font-mono)"], [2, "font-size", "12px", "color", "var(--text-muted)", "word-break", "break-all", "margin-top", "2px"], [2, "font-size", "12px", "color", "var(--text-secondary)", "margin-top", "3px"], [2, "margin-top", "4px"], [2, "display", "flex", "gap", "6px", "flex-shrink", "0"], [1, "badge-auth"], [2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "92vw", "max-width", "480px", 3, "dismiss", "click", "appModal"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "margin-bottom", "20px"], [2, "margin", "0", "font-size", "15px"], ["type", "button", 1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "field", 2, "margin-bottom", "14px"], ["type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "url", 3, "ngModelChange", "ngModel", "placeholder"], [1, "field", 2, "margin-bottom", "20px"], ["type", "password", "autocomplete", "off", 3, "ngModelChange", "ngModel", "placeholder"], [2, "font-size", "11px", "color", "var(--text-muted)"], [2, "font-size", "12px", "color", "var(--danger)", "margin", "0 0 12px"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end"], ["type", "button", 1, "btn", "btn-primary", 3, "click", "disabled"], ["appModalCloseOnBackdrop", "", 2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "96vw", "max-width", "780px", "max-height", "85vh", "display", "flex", "flex-direction", "column", 3, "dismiss", "click", "appModal"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "margin-bottom", "16px", "flex-shrink", "0"], [2, "font-family", "var(--font-mono)"], [2, "flex", "1", "display", "flex", "align-items", "center", "justify-content", "center"], [2, "color", "var(--danger)", "font-size", "13px"], [2, "color", "var(--text-muted)", "font-size", "13px"], [2, "overflow-y", "auto", "flex", "1", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)"], [1, "catalog-entry-row"], [2, "font-weight", "600", "font-size", "13px", "font-family", "var(--font-mono)"], [1, "badge-kt", 2, "margin-left", "8px"], [1, "badge-type", 2, "margin-left", "4px"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin-left", "8px"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click", "disabled"], [2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "92vw", "max-width", "420px", 3, "dismiss", "click", "appModal"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "margin-bottom", "16px"], [2, "font-size", "13px", "color", "var(--text-secondary)", "margin", "0 0 16px"], ["type", "text", 3, "ngModelChange", "keydown.enter", "ngModel", "placeholder"], [2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "92vw", "max-width", "480px", 3, "dismiss", "appModal"], [2, "font-size", "13px", "color", "var(--text-secondary)", "margin", "0 0 12px"], [2, "background", "var(--bg-elevated)", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)", "padding", "10px 12px", "font-family", "var(--font-mono)", "font-size", "12px", "word-break", "break-all", "color", "var(--accent)", "margin-bottom", "16px"], ["name", "copy", 2, "margin-right", "4px", 3, "size"], ["type", "button", 1, "btn", "btn-primary", 3, "click"], [2, "background", "var(--bg-primary)", "border", "1px solid var(--border)", "border-radius", "var(--radius-lg)", "padding", "24px", "width", "92vw", "max-width", "500px", 3, "dismiss", "click", "appModal"], [2, "width", "100%", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["type", "text", "maxlength", "200", 3, "ngModelChange", "ngModel", "placeholder"], [2, "font-size", "12px", "color", "var(--success, #16a34a)", "margin", "0 0 12px"], ["name", "check-circle", 2, "margin-right", "4px", "vertical-align", "-2px", 3, "size"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "sch-grid", 2, "margin-bottom", "16px"], [1, "field"], ["value", "entity"], ["value", "edge"], ["value", "memory"], ["value", "chrono"], [1, "field", 2, "margin-bottom", "16px"], ["type", "text", "maxlength", "200", "list", "schema-group-suggestions", 3, "ngModelChange", "ngModel", "placeholder"], ["id", "schema-group-suggestions"], [1, "sch-sub"], [3, "rows"], [1, "dialog-footer"], [2, "font-size", "12px", "color", "var(--danger)", "flex", "1"], [2, "font-size", "10px", "font-weight", "400", "color", "var(--text-muted)"], ["type", "text", 2, "max-width", "320px", 3, "ngModelChange", "ngModel", "placeholder"], ["appModalCloseOnBackdrop", "", 2, "background", "var(--surface)", "border-radius", "8px", "padding", "24px", "max-width", "480px", "width", "90%", "display", "flex", "flex-direction", "column", "gap", "16px", 3, "dismiss", "click", "appModal"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "gap", "8px"], [2, "text-align", "center", "padding", "16px 0"], [2, "margin", "0", "font-size", "13px", "color", "var(--text-muted)"], [2, "margin", "0", "font-size", "12px", "color", "var(--danger)"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end", "margin-top", "4px"], ["type", "button", 1, "btn", "btn-danger", "btn-sm", 3, "click", "disabled"], [2, "margin", "0", "padding-left", "20px", "font-size", "12px", "color", "var(--text-muted)"], [2, "margin", "0", "font-size", "12px", "color", "var(--text-muted)"]], template: function SchemaLibraryComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 1)(1, "h2");
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "div", 2);
            i0.ɵɵconditionalCreate(5, SchemaLibraryComponent_Conditional_5_Template, 20, 24)(6, SchemaLibraryComponent_Conditional_6_Template, 3, 3, "button", 3);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(7, "div", 4);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵelementStart(9, "button", 5);
            i0.ɵɵlistener("click", function SchemaLibraryComponent_Template_button_click_9_listener() { return ctx.pageTab.set("library"); });
            i0.ɵɵtext(10);
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(12, "button", 5);
            i0.ɵɵlistener("click", function SchemaLibraryComponent_Template_button_click_12_listener() { ctx.pageTab.set("catalogs"); return ctx.loadCatalogs(); });
            i0.ɵɵelement(13, "ph-icon", 6);
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(16, "div", 7)(17, "input", 8);
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵlistener("ngModelChange", function SchemaLibraryComponent_Template_input_ngModelChange_17_listener($event) { return ctx.searchQuery.set($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(19, SchemaLibraryComponent_Conditional_19_Template, 10, 9, "div", 9);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(20, SchemaLibraryComponent_Conditional_20_Template, 5, 1, "div", 10);
            i0.ɵɵconditionalCreate(21, SchemaLibraryComponent_Conditional_21_Template, 5, 1)(22, SchemaLibraryComponent_Conditional_22_Template, 4, 1);
            i0.ɵɵconditionalCreate(23, SchemaLibraryComponent_Conditional_23_Template, 43, 48, "div", 11);
            i0.ɵɵconditionalCreate(24, SchemaLibraryComponent_Conditional_24_Template, 16, 12, "div", 11);
            i0.ɵɵconditionalCreate(25, SchemaLibraryComponent_Conditional_25_Template, 28, 30, "div", 11);
            i0.ɵɵconditionalCreate(26, SchemaLibraryComponent_Conditional_26_Template, 20, 17, "div", 12);
            i0.ɵɵconditionalCreate(27, SchemaLibraryComponent_Conditional_27_Template, 48, 48, "div", 11);
            i0.ɵɵconditionalCreate(28, SchemaLibraryComponent_Conditional_28_Template, 43, 38, "div", 11);
            i0.ɵɵconditionalCreate(29, SchemaLibraryComponent_Conditional_29_Template, 67, 58, "div", 13);
            i0.ɵɵconditionalCreate(30, SchemaLibraryComponent_Conditional_30_Template, 12, 11, "div", 14);
        } if (rf & 2) {
            let tmp_16_0;
            let tmp_22_0;
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 25, "schemaLib.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.pageTab() === "library" ? 5 : 6);
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 27, "schemaLib.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("active", ctx.pageTab() === "library");
            i0.ɵɵattribute("aria-selected", ctx.pageTab() === "library");
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 29, "schemaLib.tab.library"));
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("active", ctx.pageTab() === "catalogs");
            i0.ɵɵattribute("aria-selected", ctx.pageTab() === "catalogs");
            i0.ɵɵadvance();
            i0.ɵɵproperty("size", 13);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 31, "schemaLib.tab.catalogs"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.searchQuery())("placeholder", i0.ɵɵpipeBind1(18, 33, "schemaLib.searchPlaceholder"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.pageTab() === "library" ? 19 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.pageTab() === "library" && ctx.entries().length ? 20 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.pageTab() === "library" ? 21 : 22);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.showAddCatalog() ? 23 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_16_0 = ctx.browsing()) ? 24 : -1, tmp_16_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showCreateLibToken() ? 25 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.libTokenRevealed() ? 26 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.exportSpaceDialog() ? 27 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.applyGroupDialog() ? 28 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showDialog() ? 29 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_22_0 = ctx.deleteDialog()) ? 30 : -1, tmp_22_0);
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.MaxLengthValidator, i1.NgModel, PhIconComponent, PropSchemaTableComponent, ErrorStateComponent, ModalDirective, i2.DatePipe, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }", "\n\n    \n\n    .dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n    .dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:92vw; max-width:980px; max-height:90vh; overflow-y:auto; }\n    .dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }\n    .dialog-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin:0; font-size:17px; font-weight:700; }\n    .dialog-footer[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:24px; padding-top:16px; border-top:1px solid var(--border); }\n    \n\n    .sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; }\n    .sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n    .sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n    .sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n    .sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid var(--border); margin-top:20px; }\n    \n\n    .header-row[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n    .header-row[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] { margin:0; font-size:20px; font-weight:700; }\n    \n\n\n\n    .header-actions[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; gap:8px; }\n    .search-row[_ngcontent-%COMP%] { margin-bottom:12px; }\n    .search-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { width:100%; max-width:400px; }\n    .type-filters[_ngcontent-%COMP%] { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }\n    .type-filter-btn[_ngcontent-%COMP%] { background:none; border:1px solid var(--border); border-radius:20px; padding:2px 12px; font-size:12px; cursor:pointer; color:var(--text-muted); transition:all .15s; font-family:var(--font); }\n    .type-filter-btn[_ngcontent-%COMP%]:hover { color:var(--text-primary); border-color:var(--text-muted); }\n    .type-filter-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); border-color:color-mix(in srgb,var(--accent) 60%,transparent); font-weight:600; }\n    .entry-title-row[_ngcontent-%COMP%] { display:flex; align-items:center; gap:6px; margin-bottom:2px; }\n    .entry-footer[_ngcontent-%COMP%] { display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:6px; }\n    .entry-grid[_ngcontent-%COMP%] { display:grid; gap:10px; }\n    .entry-card[_ngcontent-%COMP%] { background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px 16px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; transition:border-color .15s; cursor:pointer; }\n    .entry-card[_ngcontent-%COMP%]:hover { border-color: var(--accent); }\n    .entry-main[_ngcontent-%COMP%] { flex:1; min-width:0; }\n    .entry-name[_ngcontent-%COMP%] { font-weight:600; font-size:14px; color:var(--text-primary); font-family:var(--font-mono); }\n    .entry-meta[_ngcontent-%COMP%] { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px; }\n    .entry-description[_ngcontent-%COMP%] { font-size:12px; color:var(--text-secondary); margin-top:4px; word-break:break-word; }\n    .entry-actions[_ngcontent-%COMP%] { display:flex; gap:6px; flex-shrink:0; }\n    .badge-kt[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 40%,transparent); border-radius:4px; padding:1px 7px; font-size:0.72rem; font-weight:600; letter-spacing:0.03em; text-transform:uppercase; }\n    .badge-type[_ngcontent-%COMP%] { background:var(--bg-elevated); color:var(--text-secondary); border:1px solid var(--border); border-radius:4px; padding:1px 7px; font-size:0.72rem; font-weight:500; font-family:var(--font-mono); }\n    .updated[_ngcontent-%COMP%] { font-size:11px; color:var(--text-muted); }\n    .prop-badge[_ngcontent-%COMP%] { font-size:10px; color:var(--text-muted); background:var(--bg-elevated); border-radius:3px; padding:1px 5px; }\n    .badge-published[_ngcontent-%COMP%] { font-size:10px; font-weight:600; color:#16a34a; background:rgba(22,163,74,.12); border-radius:3px; padding:1px 6px; }\n    .badge-source[_ngcontent-%COMP%] { font-size:10px; color:var(--text-muted); background:var(--bg-elevated); border-radius:3px; padding:1px 5px; font-style:italic; }\n    .badge-group[_ngcontent-%COMP%] { font-size:10px; font-weight:600; color:#7c3aed; background:rgba(124,58,237,.1); border-radius:3px; padding:1px 6px; cursor:pointer; }\n    .badge-group[_ngcontent-%COMP%]:hover { background:rgba(124,58,237,.2); }\n    .group-filter-btn[_ngcontent-%COMP%] { background:none; border:1px solid var(--border); border-radius:20px; padding:2px 12px; font-size:12px; cursor:pointer; color:#7c3aed; transition:all .15s; font-family:var(--font); }\n    .group-filter-btn[_ngcontent-%COMP%]:hover { border-color:#7c3aed; }\n    .group-filter-btn.active[_ngcontent-%COMP%] { background:rgba(124,58,237,.1); border-color:#7c3aed; font-weight:600; }\n    \n\n    .page-tabs[_ngcontent-%COMP%] { display:flex; gap:0; margin-bottom:20px; border-bottom:2px solid var(--border); }\n    .page-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n    .page-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n    .page-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n    \n\n    .catalog-card[_ngcontent-%COMP%] { background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px 16px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }\n    .catalog-entry-row[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; border-bottom:1px solid var(--border); font-size:13px; }\n    .catalog-entry-row[_ngcontent-%COMP%]:last-child { border-bottom:none; }\n    \n\n    .ref-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-secondary); background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px; margin-bottom:20px; font-family:var(--font-mono); }\n    .ref-hint[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] { color:var(--accent); }\n    .share-bar-url[_ngcontent-%COMP%] { font-size:12px; font-family:var(--font-mono); color:var(--accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n    .badge-auth[_ngcontent-%COMP%] { font-size:10px; font-weight:600; color:#0ea5e9; background:rgba(14,165,233,.12); border-radius:3px; padding:1px 6px; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SchemaLibraryComponent, [{
        type: Component,
        args: [{ selector: 'app-schema-library', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, PropSchemaTableComponent, ErrorStateComponent, ModalDirective], template: `
    <div class="header-row">
      <h2>{{ 'schemaLib.title' | transloco }}</h2>
      <div class="header-actions">
        @if (pageTab() === 'library') {
          <button class="btn btn-secondary btn-sm" type="button" (click)="openExportSpace()" [attr.title]="'schemaLib.exportSpace.title' | transloco"><ph-icon name="export" [size]="13" style="margin-right:5px;vertical-align:-2px;"/>{{ 'schemaLib.exportSpace.button' | transloco }}</button>
          <button class="btn btn-secondary btn-sm" type="button" (click)="openApplyGroup()" [attr.title]="'schemaLib.applyGroup.title' | transloco"><ph-icon name="stack" [size]="13" style="margin-right:5px;vertical-align:-2px;"/>{{ 'schemaLib.applyGroup.button' | transloco }}</button>
          <button class="btn btn-secondary btn-sm" type="button" (click)="triggerImportFile()" [attr.title]="'schemaLib.import.fileTitle' | transloco"><ph-icon name="download-simple" [size]="13" style="margin-right:5px;vertical-align:-2px;"/>{{ 'schemaLib.import.fileButton' | transloco }}</button>
          <input #importFileInput type="file" accept=".json" style="display:none" (change)="onImportFile($event)" />
          <button class="btn btn-primary btn-sm" type="button" (click)="openCreate()">{{ 'schemaLib.createButton' | transloco }}</button>
        } @else {
          <button class="btn btn-primary btn-sm" type="button" (click)="openAddCatalog()">{{ 'schemaLib.catalog.addButton' | transloco }}</button>
        }
      </div>
    </div>

    <!-- page tabs: My Library / Foreign Catalogs -->
    <div class="page-tabs" role="tablist" [attr.aria-label]="'schemaLib.title' | transloco">
      <button class="page-tab" type="button" role="tab" [class.active]="pageTab()==='library'" [attr.aria-selected]="pageTab()==='library'" (click)="pageTab.set('library')">{{ 'schemaLib.tab.library' | transloco }}</button>
      <button class="page-tab" type="button" role="tab" [class.active]="pageTab()==='catalogs'" [attr.aria-selected]="pageTab()==='catalogs'" (click)="pageTab.set('catalogs');loadCatalogs()"><ph-icon name="globe" [size]="13" style="margin-right:4px;"/>{{ 'schemaLib.tab.catalogs' | transloco }}</button>
    </div>

    <div class="search-row" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <input type="search" style="flex:1;min-width:0;" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" [placeholder]="'schemaLib.searchPlaceholder' | transloco" />
      @if (pageTab() === 'library') {
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span class="share-bar-url" style="max-width:260px;">{{ libraryPublicUrl }}</span>
          <button class="btn btn-secondary btn-sm" type="button" (click)="copyLibraryUrl()" [attr.title]="'schemaLib.share.copyButton' | transloco">
            @if (urlCopied()) { <ph-icon name="check" [size]="13"/> } @else { <ph-icon name="copy" [size]="13"/> }
          </button>
          <button class="btn btn-secondary btn-sm" type="button" (click)="showCreateLibToken.set(true)" [attr.title]="'schemaLib.share.createTokenButton' | transloco">
            <ph-icon name="key" [size]="13"/>
          </button>
        </div>
      }
    </div>
    @if (pageTab() === 'library' && entries().length) {
      <div class="type-filters">
        @for (kt of ['entity','memory','edge','chrono']; track kt) {
          <button class="type-filter-btn" [class.active]="typeFilter() === kt" [attr.aria-pressed]="typeFilter() === kt" type="button" (click)="typeFilter.set(typeFilter() === kt ? null : $any(kt))">{{ kt }}</button>
        }
        @for (g of availableGroups(); track g) {
          <button class="group-filter-btn" [class.active]="groupFilter() === g" [attr.aria-pressed]="groupFilter() === g" type="button" (click)="groupFilter.set(groupFilter() === g ? null : g)"><ph-icon name="tag" [size]="11" style="margin-right:3px;vertical-align:-1px;"/>{{ g }}</button>
        }
      </div>
    }

    <!-- ── MY LIBRARY TAB ─────────────────────────────────────────────────── -->
    @if (pageTab() === 'library') {
      @if (loading()) {
        <div class="empty-state"><span class="spinner"></span></div>
      } @else if (loadError() !== null) {
        <app-error-state [message]="'schemaLib.error.load' | transloco" [reason]="loadError() ?? ''" (retry)="load()" />
      } @else if (!entries().length) {
        <div class="empty-state">
          <div class="empty-state-icon"><ph-icon name="bookmarks" [size]="48"/></div>
          <h3>{{ 'schemaLib.empty.title' | transloco }}</h3>
          <p>{{ 'schemaLib.empty.subtitle' | transloco }}</p>
        </div>
      } @else if (!filteredEntries().length) {
        <div class="empty-state">
          <p style="color:var(--text-muted);">{{ 'schemaLib.noResults' | transloco }}</p>
        </div>
      } @else {
        <div class="entry-grid">
          @for (entry of filteredEntries(); track entry.name) {
            <div class="entry-card" (click)="openEdit(entry)">
              <div class="entry-main">
                <div class="entry-title-row">
                  <span class="badge-kt">{{ entry.knowledgeType }}</span>
                  <span class="entry-name">{{ entry.name }}</span>
                </div>
                <div class="entry-meta">
                  @if (propCount(entry) > 0) {
                    <span class="prop-badge">{{ propCount(entry) }} prop{{ propCount(entry) !== 1 ? 's' : '' }}</span>
                  }
                  @if (entry.schema.namingPattern) {
                    <span class="prop-badge" [title]="entry.schema.namingPattern">pattern</span>
                  }
                  @if ((usageCounts()[entry.name] || 0) > 0) {
                    <span class="prop-badge" style="color:var(--accent);background:var(--accent-dim);">{{ usageCounts()[entry.name] }} link{{ usageCounts()[entry.name] !== 1 ? 's' : '' }}</span>
                  }
                  @if (entry.schemaGroup) {
                    <span class="badge-group" [title]="'schemaLib.badge.groupTitle' | transloco" (click)="$event.stopPropagation(); groupFilter.set(groupFilter() === entry.schemaGroup ? null : entry.schemaGroup)"><ph-icon name="tag" [size]="10" style="margin-right:2px;vertical-align:-1px;"/>{{ entry.schemaGroup }}</span>
                  }
                  @if (entry.published) {
                    <span class="badge-published">{{ 'schemaLib.badge.published' | transloco }}</span>
                  }
                  @if (entry.sourceCatalog) {
                    <span class="badge-source" [title]="entry.sourceUrl || ''">{{ 'schemaLib.badge.from' | transloco }} {{ entry.sourceCatalog }}</span>
                  }
                </div>
                @if (entry.description) { <div class="entry-description">{{ entry.description }}</div> }
                <div class="entry-footer">
                  <span class="badge-type">{{ entry.typeName }}</span>
                  <span class="updated">{{ entry.updatedAt | date:'dd.MM.yyyy HH:mm' }}</span>
                </div>
              </div>
              <div class="entry-actions" (click)="$event.stopPropagation()">
                <button class="btn btn-ghost btn-sm" type="button" (click)="togglePublish(entry)" [attr.title]="(entry.published ? 'schemaLib.action.unpublish' : 'schemaLib.action.publish') | transloco" [style.color]="entry.published ? 'var(--accent)' : undefined"><ph-icon name="globe" [size]="13"/></button>
                <button class="btn btn-ghost btn-sm" type="button" (click)="exportEntry(entry)" [attr.title]="'schemaLib.export.title' | transloco"><ph-icon name="upload" [size]="13"/></button>
                <button class="btn btn-ghost btn-sm danger" type="button" (click)="initiateDelete(entry.name)" [attr.title]="'common.remove' | transloco"><ph-icon name="trash" [size]="13"/></button>
              </div>
            </div>
          }
        </div>
      }

    <!-- ── FOREIGN CATALOGS TAB ─────────────────────────────────────────────── -->
    } @else {
      @if (catalogsLoading()) {
        <div class="empty-state"><span class="spinner"></span></div>
      } @else if (catalogsLoadError() !== null) {
        <app-error-state [message]="'schemaLib.catalog.loadError' | transloco" [reason]="catalogsLoadError() ?? ''"
                         (retry)="loadCatalogs()" />
      } @else if (!catalogs().length) {
        <div class="empty-state">
          <p style="color:var(--text-muted);">{{ 'schemaLib.catalog.empty' | transloco }}</p>
        </div>
      } @else {
        <div style="display:grid;gap:10px;">
          @for (cat of catalogs(); track cat.name) {
            <div class="catalog-card">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;font-family:var(--font-mono);">{{ cat.name }}</div>
                <div style="font-size:12px;color:var(--text-muted);word-break:break-all;margin-top:2px;">{{ cat.url }}</div>
                @if (cat.description) { <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;">{{ cat.description }}</div> }
                @if (cat.hasAccessToken) { <div style="margin-top:4px;"><span class="badge-auth">{{ 'schemaLib.catalog.hasToken' | transloco }}</span></div> }
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button class="btn btn-secondary btn-sm" type="button" (click)="openBrowse(cat.name)">{{ 'schemaLib.catalog.browseButton' | transloco }}</button>
                <button class="btn btn-ghost btn-sm danger" type="button" (click)="removeCatalog(cat.name)" [attr.title]="'schemaLib.catalog.deleteTitle' | transloco"><ph-icon name="trash" [size]="13"/></button>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- Add Catalog dialog -->
    @if (showAddCatalog()) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:200;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:92vw;max-width:480px;" [appModal]="'schemaLib.catalog.addTitle' | transloco" (dismiss)="showAddCatalog.set(false)" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.catalog.addTitle' | transloco }}</h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="showAddCatalog.set(false)"><ph-icon name="x" [size]="18"/></button>
          </div>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.catalog.nameLabel' | transloco }}</label>
            <input type="text" [(ngModel)]="newCatalog.name" [placeholder]="'schemaLib.catalog.namePlaceholder' | transloco" />
          </div>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.catalog.urlLabel' | transloco }}</label>
            <input type="url" [(ngModel)]="newCatalog.url" [placeholder]="'schemaLib.catalog.urlPlaceholder' | transloco" />
          </div>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.catalog.descLabel' | transloco }}</label>
            <input type="text" [(ngModel)]="newCatalog.description" [placeholder]="'schemaLib.catalog.descPlaceholder' | transloco" />
          </div>
          <div class="field" style="margin-bottom:20px;">
            <label>{{ 'schemaLib.catalog.accessTokenLabel' | transloco }}</label>
            <input type="password" [(ngModel)]="newCatalog.accessToken" [placeholder]="'schemaLib.catalog.accessTokenPlaceholder' | transloco" autocomplete="off" />
            <span style="font-size:11px;color:var(--text-muted);">{{ 'schemaLib.catalog.accessTokenHint' | transloco }}</span>
          </div>
          @if (catalogError()) { <p style="font-size:12px;color:var(--danger);margin:0 0 12px;">{{ catalogError() }}</p> }
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-primary" type="button" (click)="addCatalog()" [disabled]="catalogSaving()">
              {{ catalogSaving() ? ('common.saving' | transloco) : ('schemaLib.catalog.addButton' | transloco) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Catalog browse dialog -->
    @if (browsing(); as b) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:200;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:96vw;max-width:780px;max-height:85vh;display:flex;flex-direction:column;" [appModal]="'schemaLib.catalog.browseTitle' | transloco" appModalCloseOnBackdrop (dismiss)="browsing.set(null)" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.catalog.browseTitle' | transloco }}: <span style="font-family:var(--font-mono);">{{ b.catalogName }}</span></h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="browsing.set(null)"><ph-icon name="x" [size]="18"/></button>
          </div>
          @if (b.loading) {
            <div style="flex:1;display:flex;align-items:center;justify-content:center;"><span class="spinner"></span></div>
          } @else if (b.error) {
            <p style="color:var(--danger);font-size:13px;">{{ b.error }}</p>
          } @else if (!b.entries.length) {
            <p style="color:var(--text-muted);font-size:13px;">{{ 'schemaLib.catalog.browseEmpty' | transloco }}</p>
          } @else {
            <div style="overflow-y:auto;flex:1;border:1px solid var(--border);border-radius:var(--radius-sm);">
              @for (e of b.entries; track e.name) {
                <div class="catalog-entry-row">
                  <div style="flex:1;min-width:0;">
                    <span style="font-weight:600;font-size:13px;font-family:var(--font-mono);">{{ e.name }}</span>
                    <span class="badge-kt" style="margin-left:8px;">{{ e.knowledgeType }}</span>
                    <span class="badge-type" style="margin-left:4px;">{{ e.typeName }}</span>
                    @if (e.description) { <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">{{ e.description }}</span> }
                  </div>
                  <button class="btn btn-secondary btn-sm" type="button" (click)="importFromCatalog(b.catalogName, e)" [disabled]="catalogImporting()">
                    {{ 'schemaLib.catalog.importButton' | transloco }}
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
    <!-- Create library access token dialog -->
    @if (showCreateLibToken()) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:200;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:92vw;max-width:420px;" [appModal]="'schemaLib.share.tokenDialogTitle' | transloco" (dismiss)="closeCreateLibToken()" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.share.tokenDialogTitle' | transloco }}</h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeCreateLibToken()"><ph-icon name="x" [size]="18"/></button>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px;">{{ 'schemaLib.share.tokenDialogHint' | transloco }}</p>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.share.tokenNameLabel' | transloco }}</label>
            <input type="text" [ngModel]="libTokenName()" (ngModelChange)="libTokenName.set($event)" [placeholder]="'schemaLib.share.tokenNamePlaceholder' | transloco" (keydown.enter)="createLibraryToken()" />
          </div>
          @if (libTokenError()) { <p style="font-size:12px;color:var(--danger);margin:0 0 12px;">{{ libTokenError() }}</p> }
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" type="button" (click)="closeCreateLibToken()">{{ 'common.cancel' | transloco }}</button>
            <button class="btn btn-primary" type="button" (click)="createLibraryToken()" [disabled]="libTokenCreating()">
              {{ libTokenCreating() ? ('common.saving' | transloco) : ('schemaLib.share.createTokenButton' | transloco) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Library access token one-time reveal -->
    @if (libTokenRevealed()) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:210;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:92vw;max-width:480px;" [appModal]="'schemaLib.share.tokenCreatedTitle' | transloco" (dismiss)="libTokenRevealed.set(null)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.share.tokenCreatedTitle' | transloco }}</h3>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin:0 0 12px;">{{ 'schemaLib.share.tokenCreatedHint' | transloco }}</p>
          <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-family:var(--font-mono);font-size:12px;word-break:break-all;color:var(--accent);margin-bottom:16px;">{{ libTokenRevealed() }}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" type="button" (click)="copyRevealedToken()">
              <ph-icon name="copy" [size]="12" style="margin-right:4px;"/>{{ 'schemaLib.share.copyButton' | transloco }}
            </button>
            <button class="btn btn-primary" type="button" (click)="libTokenRevealed.set(null)">{{ 'common.close' | transloco }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Export space schema dialog -->
    @if (exportSpaceDialog()) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:200;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:92vw;max-width:500px;" [appModal]="'schemaLib.exportSpace.dialogTitle' | transloco" (dismiss)="exportSpaceDialog.set(null)" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.exportSpace.dialogTitle' | transloco }}</h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="exportSpaceDialog.set(null)"><ph-icon name="x" [size]="18"/></button>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px;">{{ 'schemaLib.exportSpace.dialogHint' | transloco }}</p>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.exportSpace.spaceLabel' | transloco }}</label>
            <select [(ngModel)]="exportSpaceDialog()!.spaceId" style="width:100%;">
              <option value="">{{ 'schemaLib.exportSpace.selectSpace' | transloco }}</option>
              @for (s of spaces(); track s.id) {
                <option [value]="s.id">{{ s.label }}</option>
              }
            </select>
          </div>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.exportSpace.groupNameLabel' | transloco }}</label>
            <input type="text" [(ngModel)]="exportSpaceDialog()!.groupName" [placeholder]="'schemaLib.exportSpace.groupNamePlaceholder' | transloco" maxlength="200" />
          </div>
          <div class="field" style="margin-bottom:20px;">
            <label>{{ 'schemaLib.exportSpace.namePrefixLabel' | transloco }}</label>
            <input type="text" [(ngModel)]="exportSpaceDialog()!.namePrefix" [placeholder]="exportSpaceDialog()!.groupName || ('schemaLib.exportSpace.namePrefixPlaceholder' | transloco)" maxlength="200" />
            <span style="font-size:11px;color:var(--text-muted);">{{ 'schemaLib.exportSpace.namePrefixHint' | transloco }}</span>
          </div>
          @if (exportSpaceDialog()!.result) {
            <p style="font-size:12px;color:var(--success, #16a34a);margin:0 0 12px;"><ph-icon name="check-circle" [size]="13" style="margin-right:4px;vertical-align:-2px;"/>{{ exportSpaceDialog()!.result }}</p>
          }
          @if (exportSpaceDialog()!.error) { <p style="font-size:12px;color:var(--danger);margin:0 0 12px;">{{ exportSpaceDialog()!.error }}</p> }
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" type="button" (click)="exportSpaceDialog.set(null)">{{ 'common.cancel' | transloco }}</button>
            <button class="btn btn-primary" type="button" (click)="doExportSpace()" [disabled]="exportSpaceDialog()!.saving">
              {{ exportSpaceDialog()!.saving ? ('common.saving' | transloco) : ('schemaLib.exportSpace.confirmButton' | transloco) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Apply group to space dialog -->
    @if (applyGroupDialog()) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:200;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:92vw;max-width:500px;" [appModal]="'schemaLib.applyGroup.dialogTitle' | transloco" (dismiss)="applyGroupDialog.set(null)" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.applyGroup.dialogTitle' | transloco }}</h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="applyGroupDialog.set(null)"><ph-icon name="x" [size]="18"/></button>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px;">{{ 'schemaLib.applyGroup.dialogHint' | transloco }}</p>
          <div class="field" style="margin-bottom:14px;">
            <label>{{ 'schemaLib.applyGroup.groupLabel' | transloco }}</label>
            <select [(ngModel)]="applyGroupDialog()!.group" style="width:100%;">
              <option value="">{{ 'schemaLib.applyGroup.selectGroup' | transloco }}</option>
              @for (g of availableGroups(); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div class="field" style="margin-bottom:20px;">
            <label>{{ 'schemaLib.applyGroup.spaceLabel' | transloco }}</label>
            <select [(ngModel)]="applyGroupDialog()!.spaceId" style="width:100%;">
              <option value="">{{ 'schemaLib.applyGroup.selectSpace' | transloco }}</option>
              @for (s of spaces(); track s.id) {
                <option [value]="s.id">{{ s.label }}</option>
              }
            </select>
          </div>
          @if (applyGroupDialog()!.result) {
            <p style="font-size:12px;color:var(--success, #16a34a);margin:0 0 12px;"><ph-icon name="check-circle" [size]="13" style="margin-right:4px;vertical-align:-2px;"/>{{ applyGroupDialog()!.result }}</p>
          }
          @if (applyGroupDialog()!.error) { <p style="font-size:12px;color:var(--danger);margin:0 0 12px;">{{ applyGroupDialog()!.error }}</p> }
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" type="button" (click)="applyGroupDialog.set(null)">{{ 'common.cancel' | transloco }}</button>
            <button class="btn btn-primary" type="button" (click)="doApplyGroup()" [disabled]="applyGroupDialog()!.saving">
              {{ applyGroupDialog()!.saving ? ('common.saving' | transloco) : ('schemaLib.applyGroup.confirmButton' | transloco) }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-backdrop">
        <div class="dialog" [appModal]="editingName() ? ('schemaLib.dialog.editTitle' | transloco) : ('schemaLib.dialog.createTitle' | transloco)" (dismiss)="closeDialog()" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ editingName() ? ('schemaLib.dialog.editTitle' | transloco) : ('schemaLib.dialog.createTitle' | transloco) }}</h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeDialog()"><ph-icon name="x" [size]="18"/></button>
          </div>

          <!-- Entry metadata -->
          <div class="sch-grid" style="margin-bottom:16px;">
            <div class="field">
              <label>{{ 'schemaLib.field.typeName' | transloco }}</label>
              <input type="text" [ngModel]="form.typeName" (ngModelChange)="autoSlugFromTypeName($event)" [placeholder]="'schemaLib.field.typeNamePlaceholder' | transloco" />
              <span style="font-size:11px;color:var(--text-muted);">{{ 'schemaLib.field.nameAutoLabel' | transloco }} <span style="font-family:var(--font-mono);">{{ form.name || '—' }}</span></span>
            </div>
            <div class="field">
              <label>{{ 'schemaLib.field.knowledgeType' | transloco }}</label>
              <select [(ngModel)]="form.knowledgeType" style="width:100%;">
                <option value="entity">entity</option>
                <option value="edge">edge</option>
                <option value="memory">memory</option>
                <option value="chrono">chrono</option>
              </select>
            </div>
          </div>

          <div class="field" style="margin-bottom:16px;">
            <label>{{ 'schemaLib.field.description' | transloco }}</label>
            <input type="text" [(ngModel)]="form.description" [placeholder]="'schemaLib.field.descriptionPlaceholder' | transloco" />
          </div>

          <div class="field" style="margin-bottom:16px;">
            <label>{{ 'schemaLib.field.schemaGroup' | transloco }}</label>
            <input type="text" [(ngModel)]="form.schemaGroup" [placeholder]="'schemaLib.field.schemaGroupPlaceholder' | transloco" maxlength="200" list="schema-group-suggestions" />
            <datalist id="schema-group-suggestions">
              @for (g of availableGroups(); track g) { <option [value]="g"></option> }
            </datalist>
            <span style="font-size:11px;color:var(--text-muted);">{{ 'schemaLib.field.schemaGroupHint' | transloco }}</span>
          </div>

          <!-- Schema editor — matches spaces.component.ts per-type expand panel -->
          @if (form.knowledgeType === 'entity') {
            <div class="field" style="margin-bottom:16px;">
              <label>{{ 'spaces.schema.namingPattern' | transloco }} <span style="font-size:10px;font-weight:400;color:var(--text-muted);">{{ 'spaces.schema.namingPatternHint' | transloco }}</span></label>
              <input type="text" [(ngModel)]="form.schemaState.namingPattern" [placeholder]="'spaces.schema.namingPatternPlaceholder' | transloco" style="max-width:320px;" />
            </div>
          }

          <!-- The tag-suggestion editor was retired here for the same reason as on the space Schema
               tab: a library entry's suggestions are expanded into a type schema by a $ref, and that
               field reaches nothing — not the Brain record forms, not the MCP schema guidance. Stored
               values round-trip untouched. -->

          <!-- Property schemas -->
          <div>
            <div class="sch-sub">{{ 'spaces.schema.propertySchemas' | transloco }}</div>
            <app-prop-schema-table [rows]="form.schemaState.propertySchemas" />
          </div>

          <div class="dialog-footer">
            @if (dialogError()) { <span style="font-size:12px;color:var(--danger);flex:1;">{{ dialogError() }}</span> }
            <button class="btn btn-primary" type="button" (click)="saveEntry()" [disabled]="saving()">
              {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete warning dialog -->
    @if (deleteDialog(); as dd) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:320;display:flex;align-items:center;justify-content:center;">
        <div style="background:var(--surface);border-radius:8px;padding:24px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:16px;" [appModal]="'schemaLib.delete.title' | transloco" appModalCloseOnBackdrop (dismiss)="closeDeleteDialog()" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <h3 style="margin:0;font-size:15px;">{{ 'schemaLib.delete.title' | transloco }}</h3>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeDeleteDialog()"><ph-icon name="x" [size]="18"/></button>
          </div>
          @if (dd.loading) {
            <div style="text-align:center;padding:16px 0;"><span class="spinner"></span></div>
          } @else {
            @if (dd.usages.length > 0) {
              <p style="margin:0;font-size:13px;color:var(--text-muted);">{{ 'schemaLib.delete.usagesWarning' | transloco: { count: dd.usages.length } }}</p>
              <ul style="margin:0;padding-left:20px;font-size:12px;color:var(--text-muted);">
                @for (u of dd.usages; track u.spaceId + u.knowledgeType + u.typeName) {
                  <li><strong>{{ u.spaceLabel }}</strong> — {{ u.knowledgeType }}: <code>{{ u.typeName }}</code></li>
                }
              </ul>
              <p style="margin:0;font-size:12px;color:var(--text-muted);">{{ 'schemaLib.delete.unlinkNote' | transloco }}</p>
            } @else {
              <p style="margin:0;font-size:13px;color:var(--text-muted);">{{ 'schemaLib.delete.noUsages' | transloco: { name: dd.entryName } }}</p>
            }
            @if (dd.error) { <p style="margin:0;font-size:12px;color:var(--danger);">{{ dd.error }}</p> }
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
              <button class="btn btn-secondary btn-sm" type="button" (click)="closeDeleteDialog()" [disabled]="dd.unlinking">{{ 'common.cancel' | transloco }}</button>
              <button class="btn btn-danger btn-sm" type="button" (click)="confirmDelete()" [disabled]="dd.unlinking">
                {{ dd.unlinking ? ('schemaLib.delete.unlinking' | transloco) : (dd.usages.length > 0 ? ('schemaLib.delete.confirmUnlink' | transloco) : ('common.remove' | transloco)) }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `, styles: ["\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n", "\n    /* chip inputs \u2014 same as spaces.component.ts */\n    /* create / edit dialog */\n    .dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n    .dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:92vw; max-width:980px; max-height:90vh; overflow-y:auto; }\n    .dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }\n    .dialog-header h3 { margin:0; font-size:17px; font-weight:700; }\n    .dialog-footer { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:24px; padding-top:16px; border-top:1px solid var(--border); }\n    /* schema sub-tabs \u2014 same pattern as spaces.component.ts */\n    .sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; }\n    .sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n    .sch-coll-tab:hover { color:var(--text-primary); }\n    .sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n    .sch-sub { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid var(--border); margin-top:20px; }\n    /* entry list */\n    .header-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n    .header-row h2 { margin:0; font-size:20px; font-weight:700; }\n    /* Wraps. A non-wrapping button row is the same narrow-window bug as the tab strips (#534): with\n       five buttons it ran 84px past the pane at 600px and 264px at 420px, sliding the whole page\n       sideways. Found by testing/responsive-sweep.mjs, which #534 did not cover this route with. */\n    .header-actions { display:flex; flex-wrap:wrap; gap:8px; }\n    .search-row { margin-bottom:12px; }\n    .search-row input { width:100%; max-width:400px; }\n    .type-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }\n    .type-filter-btn { background:none; border:1px solid var(--border); border-radius:20px; padding:2px 12px; font-size:12px; cursor:pointer; color:var(--text-muted); transition:all .15s; font-family:var(--font); }\n    .type-filter-btn:hover { color:var(--text-primary); border-color:var(--text-muted); }\n    .type-filter-btn.active { background:var(--accent-dim); color:var(--accent); border-color:color-mix(in srgb,var(--accent) 60%,transparent); font-weight:600; }\n    .entry-title-row { display:flex; align-items:center; gap:6px; margin-bottom:2px; }\n    .entry-footer { display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:6px; }\n    .entry-grid { display:grid; gap:10px; }\n    .entry-card { background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px 16px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; transition:border-color .15s; cursor:pointer; }\n    .entry-card:hover { border-color: var(--accent); }\n    .entry-main { flex:1; min-width:0; }\n    .entry-name { font-weight:600; font-size:14px; color:var(--text-primary); font-family:var(--font-mono); }\n    .entry-meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px; }\n    .entry-description { font-size:12px; color:var(--text-secondary); margin-top:4px; word-break:break-word; }\n    .entry-actions { display:flex; gap:6px; flex-shrink:0; }\n    .badge-kt { background:var(--accent-dim); color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 40%,transparent); border-radius:4px; padding:1px 7px; font-size:0.72rem; font-weight:600; letter-spacing:0.03em; text-transform:uppercase; }\n    .badge-type { background:var(--bg-elevated); color:var(--text-secondary); border:1px solid var(--border); border-radius:4px; padding:1px 7px; font-size:0.72rem; font-weight:500; font-family:var(--font-mono); }\n    .updated { font-size:11px; color:var(--text-muted); }\n    .prop-badge { font-size:10px; color:var(--text-muted); background:var(--bg-elevated); border-radius:3px; padding:1px 5px; }\n    .badge-published { font-size:10px; font-weight:600; color:#16a34a; background:rgba(22,163,74,.12); border-radius:3px; padding:1px 6px; }\n    .badge-source { font-size:10px; color:var(--text-muted); background:var(--bg-elevated); border-radius:3px; padding:1px 5px; font-style:italic; }\n    .badge-group { font-size:10px; font-weight:600; color:#7c3aed; background:rgba(124,58,237,.1); border-radius:3px; padding:1px 6px; cursor:pointer; }\n    .badge-group:hover { background:rgba(124,58,237,.2); }\n    .group-filter-btn { background:none; border:1px solid var(--border); border-radius:20px; padding:2px 12px; font-size:12px; cursor:pointer; color:#7c3aed; transition:all .15s; font-family:var(--font); }\n    .group-filter-btn:hover { border-color:#7c3aed; }\n    .group-filter-btn.active { background:rgba(124,58,237,.1); border-color:#7c3aed; font-weight:600; }\n    /* page tabs */\n    .page-tabs { display:flex; gap:0; margin-bottom:20px; border-bottom:2px solid var(--border); }\n    .page-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n    .page-tab:hover { color:var(--text-primary); }\n    .page-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n    /* catalog panel */\n    .catalog-card { background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px 16px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }\n    .catalog-entry-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; border-bottom:1px solid var(--border); font-size:13px; }\n    .catalog-entry-row:last-child { border-bottom:none; }\n    /* import/export banner */\n    .ref-hint { font-size:12px; color:var(--text-secondary); background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px; margin-bottom:20px; font-family:var(--font-mono); }\n    .ref-hint code { color:var(--accent); }\n    .share-bar-url { font-size:12px; font-family:var(--font-mono); color:var(--accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n    .badge-auth { font-size:10px; font-weight:600; color:#0ea5e9; background:rgba(14,165,233,.12); border-radius:3px; padding:1px 6px; }\n  "] }]
    }], null, { importFileInputRef: [{
            type: ViewChild,
            args: ['importFileInput']
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SchemaLibraryComponent, { className: "SchemaLibraryComponent", filePath: "app/pages/schema-library/schema-library.component.ts", lineNumber: 646 }); })();
