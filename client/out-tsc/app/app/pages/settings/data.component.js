import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/admin-api.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.id;
const _forTrack1 = ($index, $item) => $item.value;
function DataComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 5);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r0.sourcePillVariant())("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 3, "data.db.source." + ctx_r0.uriSource()));
} }
function DataComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "code", 6);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.currentUriRedacted());
} }
function DataComponent_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 8);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.backups().length);
} }
function DataComponent_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.backup.success"));
} }
function DataComponent_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.backupError());
} }
function DataComponent_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.backup.restoreSuccess"));
} }
function DataComponent_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.restoreError());
} }
function DataComponent_Conditional_23_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 13);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.backup.empty"));
} }
function DataComponent_Conditional_25_For_13_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 27);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.backup.latest"));
} }
function DataComponent_Conditional_25_For_13_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_25_For_13_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td");
    i0.ɵɵelement(2, "app-relative-time", 26);
    i0.ɵɵconditionalCreate(3, DataComponent_Conditional_25_For_13_Conditional_3_Template, 3, 3, "app-status-pill", 27);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "td", 28);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "td", 29)(7, "button", 30);
    i0.ɵɵlistener("click", function DataComponent_Conditional_25_For_13_Template_button_click_7_listener() { const b_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.confirmRestore(b_r3.id)); });
    i0.ɵɵconditionalCreate(8, DataComponent_Conditional_25_For_13_Conditional_8_Template, 1, 0, "span", 10);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const b_r3 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", b_r3.createdAt);
    i0.ɵɵadvance();
    i0.ɵɵconditional(b_r3.id === ctx_r0.latestBackupId() ? 3 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(b_r3.collections.length);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", !!ctx_r0.restoringId());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.restoringId() === b_r3.id ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 6, "data.backup.restoreButton"), " ");
} }
function DataComponent_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14)(1, "table", 25)(2, "thead")(3, "tr")(4, "th");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(10, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "tbody");
    i0.ɵɵrepeaterCreate(12, DataComponent_Conditional_25_For_13_Template, 11, 8, "tr", null, _forTrack0);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 2, "data.backup.colDate"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 4, "data.backup.colCollections"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r0.backups());
} }
function DataComponent_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 5);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r0.destConfigured() ? "active" : "off")("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.destConfigured() ? i0.ɵɵpipeBind1(2, 3, "data.dest.configured") : i0.ɵɵpipeBind1(3, 5, "data.dest.notConfigured"));
} }
function DataComponent_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 13);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.dest.featureDisabled"));
} }
function DataComponent_Conditional_31_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 39);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.dest.pathHint"));
} }
function DataComponent_Conditional_31_Conditional_40_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 52);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 53);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, "data.dest.encryptWarnKey"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(5, 4, "data.dest.encryptWarnSize"), " ");
} }
function DataComponent_Conditional_31_Conditional_41_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.destSaveError());
} }
function DataComponent_Conditional_31_Conditional_44_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_31_Conditional_47_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 50);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "common.unsavedChanges"));
} }
function DataComponent_Conditional_31_Conditional_48_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 51);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.dest.saveSuccess"));
} }
function DataComponent_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 31)(1, "label", 32)(2, "input", 33);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_31_Template_input_ngModelChange_2_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.destForm.ythrilInternal, $event) || (ctx_r0.destForm.ythrilInternal = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 34);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "p", 35);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "div", 36)(10, "label", 37);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "input", 38);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_31_Template_input_ngModelChange_13_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.destForm.customPath, $event) || (ctx_r0.destForm.customPath = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(16, DataComponent_Conditional_31_Conditional_16_Template, 3, 3, "div", 39);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "div", 40)(18, "label", 37);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(21, "div", 41)(22, "input", 42);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_31_Template_input_ngModelChange_22_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.destForm.keepLocal, $event) || (ctx_r0.destForm.keepLocal = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "span", 43);
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(27, "div", 40)(28, "label", 37);
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(31, "label", 44)(32, "input", 45);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_31_Template_input_ngModelChange_32_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.destForm.encrypt, $event) || (ctx_r0.destForm.encrypt = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(33, "span")(34, "strong", 46);
    i0.ɵɵtext(35);
    i0.ɵɵpipe(36, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(37, "span", 47);
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(40, DataComponent_Conditional_31_Conditional_40_Template, 6, 6);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(41, DataComponent_Conditional_31_Conditional_41_Template, 2, 1, "div", 12);
    i0.ɵɵelementStart(42, "div", 48)(43, "button", 49);
    i0.ɵɵlistener("click", function DataComponent_Conditional_31_Template_button_click_43_listener() { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.saveDest()); });
    i0.ɵɵconditionalCreate(44, DataComponent_Conditional_31_Conditional_44_Template, 1, 0, "span", 10);
    i0.ɵɵtext(45);
    i0.ɵɵpipe(46, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(47, DataComponent_Conditional_31_Conditional_47_Template, 3, 4, "app-status-pill", 50)(48, DataComponent_Conditional_31_Conditional_48_Template, 3, 3, "app-status-pill", 51);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.destForm.ythrilInternal);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 23, "data.dest.internalLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 25, "data.dest.internalHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 27, "data.dest.pathLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r0.destForm.ythrilInternal);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.destForm.customPath);
    i0.ɵɵproperty("placeholder", ctx_r0.destForm.ythrilInternal ? ctx_r0.backupsPath() || i0.ɵɵpipeBind1(14, 29, "data.dest.internalPathHint") : i0.ɵɵpipeBind1(15, 31, "data.dest.pathPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(!ctx_r0.destForm.ythrilInternal ? 16 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 33, "data.dest.keepLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.destForm.keepLocal);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(23, 35, "data.dest.keepUnlimitedPlaceholder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 37, "data.dest.keepSuffix"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(30, 39, "data.dest.encryptLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.destForm.encrypt);
    i0.ɵɵattribute("aria-describedby", "data-encrypt-hint");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(36, 41, "data.dest.encryptToggle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(39, 43, "data.dest.encryptHint"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r0.destForm.encrypt ? 40 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.destSaveError() ? 41 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r0.savingDest());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.savingDest() ? 44 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(46, 45, "data.dest.saveButton"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r0.configDirty() ? 47 : ctx_r0.destSaveSuccess() ? 48 : -1);
} }
function DataComponent_Conditional_35_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 5);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r0.scheduleConfigured() ? "active" : "off")("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.scheduleConfigured() ? i0.ɵɵpipeBind1(2, 3, "data.schedule.configured") : i0.ɵɵpipeBind1(3, 5, "data.schedule.notConfigured"));
} }
function DataComponent_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 13);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.schedule.featureDisabled"));
} }
function DataComponent_Conditional_37_For_3_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "label", 57)(1, "input", 58);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_37_For_3_Template_input_ngModelChange_1_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r0 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r0.scheduleForm.frequency, $event) || (ctx_r0.scheduleForm.frequency = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const opt_r7 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("sel", ctx_r0.scheduleForm.frequency === opt_r7.value);
    i0.ɵɵadvance();
    i0.ɵɵproperty("value", opt_r7.value);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.scheduleForm.frequency);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 5, opt_r7.label), " ");
} }
function DataComponent_Conditional_37_Conditional_4_Conditional_0_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 62);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const h_r9 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(4);
    i0.ɵɵproperty("ngValue", h_r9);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.formatHour(h_r9));
} }
function DataComponent_Conditional_37_Conditional_4_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 36)(1, "label", 37);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "select", 61);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_37_Conditional_4_Conditional_0_Template_select_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r0 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r0.scheduleForm.hour, $event) || (ctx_r0.scheduleForm.hour = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(5, DataComponent_Conditional_37_Conditional_4_Conditional_0_For_6_Template, 2, 2, "option", 62, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "data.schedule.atTime"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.scheduleForm.hour);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r0.hours);
} }
function DataComponent_Conditional_37_Conditional_4_Conditional_1_For_6_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "label", 64)(1, "input", 65);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_37_Conditional_4_Conditional_1_For_6_Template_input_ngModelChange_1_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r0 = i0.ɵɵnextContext(4); i0.ɵɵtwoWayBindingSet(ctx_r0.scheduleForm.weekday, $event) || (ctx_r0.scheduleForm.weekday = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r11 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(4);
    i0.ɵɵclassProp("sel", ctx_r0.scheduleForm.weekday === d_r11.value);
    i0.ɵɵadvance();
    i0.ɵɵproperty("value", d_r11.value);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.scheduleForm.weekday);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 5, d_r11.label), " ");
} }
function DataComponent_Conditional_37_Conditional_4_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 36)(1, "label", 37);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 55);
    i0.ɵɵrepeaterCreate(5, DataComponent_Conditional_37_Conditional_4_Conditional_1_For_6_Template, 4, 7, "label", 63, _forTrack1);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "data.schedule.onWeekday"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r0.weekdays);
} }
function DataComponent_Conditional_37_Conditional_4_Conditional_2_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 62);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r13 = ctx.$implicit;
    i0.ɵɵproperty("ngValue", d_r13);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(d_r13);
} }
function DataComponent_Conditional_37_Conditional_4_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 36)(1, "label", 37);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "select", 66);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_37_Conditional_4_Conditional_2_Template_select_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r0 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r0.scheduleForm.monthDay, $event) || (ctx_r0.scheduleForm.monthDay = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵrepeaterCreate(5, DataComponent_Conditional_37_Conditional_4_Conditional_2_For_6_Template, 2, 2, "option", 62, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 39);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 3, "data.schedule.onMonthDay"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.scheduleForm.monthDay);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r0.monthDays);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 5, "data.schedule.monthDayHint"));
} }
function DataComponent_Conditional_37_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, DataComponent_Conditional_37_Conditional_4_Conditional_0_Template, 7, 4, "div", 36);
    i0.ɵɵconditionalCreate(1, DataComponent_Conditional_37_Conditional_4_Conditional_1_Template, 7, 3, "div", 36);
    i0.ɵɵconditionalCreate(2, DataComponent_Conditional_37_Conditional_4_Conditional_2_Template, 10, 7, "div", 36);
    i0.ɵɵelementStart(3, "div", 59);
    i0.ɵɵelement(4, "ph-icon", 60);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional(ctx_r0.scheduleForm.frequency !== "hourly" ? 0 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.scheduleForm.frequency === "weekly" ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.scheduleForm.frequency === "monthly" ? 2 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.scheduleSummary());
} }
function DataComponent_Conditional_37_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.scheduleSaveError());
} }
function DataComponent_Conditional_37_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_37_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 50);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "common.unsavedChanges"));
} }
function DataComponent_Conditional_37_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 51);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.schedule.saveSuccess"));
} }
function DataComponent_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 54)(1, "div", 55);
    i0.ɵɵrepeaterCreate(2, DataComponent_Conditional_37_For_3_Template, 4, 7, "label", 56, _forTrack1);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(4, DataComponent_Conditional_37_Conditional_4_Template, 6, 5);
    i0.ɵɵconditionalCreate(5, DataComponent_Conditional_37_Conditional_5_Template, 2, 1, "div", 12);
    i0.ɵɵelementStart(6, "div", 48)(7, "button", 49);
    i0.ɵɵlistener("click", function DataComponent_Conditional_37_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r5); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.saveSchedule()); });
    i0.ɵɵconditionalCreate(8, DataComponent_Conditional_37_Conditional_8_Template, 1, 0, "span", 10);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(11, DataComponent_Conditional_37_Conditional_11_Template, 3, 4, "app-status-pill", 50)(12, DataComponent_Conditional_37_Conditional_12_Template, 3, 3, "app-status-pill", 51);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r0.freqOptions);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r0.scheduleForm.frequency !== "never" ? 4 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.scheduleSaveError() ? 5 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r0.savingSchedule());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.savingSchedule() ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 6, "data.schedule.saveButton"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r0.configDirty() ? 11 : ctx_r0.scheduleSaveSuccess() ? 12 : -1);
} }
function DataComponent_Conditional_50_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 21);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r0.maintenanceActive() ? "warn" : "ok")("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.maintenanceActive() ? i0.ɵɵpipeBind1(2, 3, "data.maintenance.active") : i0.ɵɵpipeBind1(3, 5, "data.maintenance.inactive"));
} }
function DataComponent_Conditional_52_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_56_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 23);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.maintenanceError());
} }
function DataComponent_Conditional_61_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 24);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.migrate.envNote"));
} }
function DataComponent_Conditional_62_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 24);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.migrate.featureDisabled"));
} }
function DataComponent_Conditional_63_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 71);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵclassMap(ctx_r0.testResult().ok ? "alert-success" : "alert-error");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r0.testResult().ok ? i0.ɵɵpipeBind1(2, 3, "data.migrate.testOk") : i0.ɵɵpipeBind1(3, 5, "data.migrate.testFail") + ": " + ctx_r0.testResult().error, " ");
} }
function DataComponent_Conditional_63_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "data.migrate.success"));
} }
function DataComponent_Conditional_63_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.migrateError());
} }
function DataComponent_Conditional_63_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_63_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 10);
} }
function DataComponent_Conditional_63_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "p", 24);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 40)(4, "label", 37);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "input", 67);
    i0.ɵɵtwoWayListener("ngModelChange", function DataComponent_Conditional_63_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.migrateUri, $event) || (ctx_r0.migrateUri = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(8, DataComponent_Conditional_63_Conditional_8_Template, 4, 7, "div", 68);
    i0.ɵɵconditionalCreate(9, DataComponent_Conditional_63_Conditional_9_Template, 3, 3, "div", 11);
    i0.ɵɵconditionalCreate(10, DataComponent_Conditional_63_Conditional_10_Template, 2, 1, "div", 12);
    i0.ɵɵelementStart(11, "div", 55)(12, "button", 69);
    i0.ɵɵlistener("click", function DataComponent_Conditional_63_Template_button_click_12_listener() { i0.ɵɵrestoreView(_r14); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.testMigrateConnection()); });
    i0.ɵɵconditionalCreate(13, DataComponent_Conditional_63_Conditional_13_Template, 1, 0, "span", 10);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "button", 70);
    i0.ɵɵlistener("click", function DataComponent_Conditional_63_Template_button_click_16_listener() { i0.ɵɵrestoreView(_r14); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.confirmMigrate()); });
    i0.ɵɵconditionalCreate(17, DataComponent_Conditional_63_Conditional_17_Template, 1, 0, "span", 10);
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_10_0;
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 12, "data.migrate.description"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 14, "data.migrate.newUriLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.migrateUri);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.testResult() ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.migrateSuccess() ? 9 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.migrateError() ? 10 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r0.testing() || !ctx_r0.migrateUri.trim());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.testing() ? 13 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(15, 16, "data.migrate.testButton"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r0.migrating() || !((tmp_10_0 = ctx_r0.testResult()) == null ? null : tmp_10_0.ok));
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.migrating() ? 17 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(19, 18, "data.migrate.migrateButton"), " ");
} }
export class DataComponent {
    constructor() {
        this.adminApi = inject(AdminApi);
        this.transloco = inject(TranslocoService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.uriSource = signal(null, ...(ngDevMode ? [{ debugName: "uriSource" }] : /* istanbul ignore next */ []));
        this.currentUriRedacted = signal('', ...(ngDevMode ? [{ debugName: "currentUriRedacted" }] : /* istanbul ignore next */ []));
        this.migrationEnabled = signal(false, ...(ngDevMode ? [{ debugName: "migrationEnabled" }] : /* istanbul ignore next */ []));
        this.backups = signal([], ...(ngDevMode ? [{ debugName: "backups" }] : /* istanbul ignore next */ []));
        this.loadingBackups = signal(false, ...(ngDevMode ? [{ debugName: "loadingBackups" }] : /* istanbul ignore next */ []));
        this.backingUp = signal(false, ...(ngDevMode ? [{ debugName: "backingUp" }] : /* istanbul ignore next */ []));
        this.backupTaken = signal(false, ...(ngDevMode ? [{ debugName: "backupTaken" }] : /* istanbul ignore next */ []));
        this.backupError = signal(null, ...(ngDevMode ? [{ debugName: "backupError" }] : /* istanbul ignore next */ []));
        this.restoringId = signal(null, ...(ngDevMode ? [{ debugName: "restoringId" }] : /* istanbul ignore next */ []));
        this.restoreSuccess = signal(false, ...(ngDevMode ? [{ debugName: "restoreSuccess" }] : /* istanbul ignore next */ []));
        this.restoreError = signal(null, ...(ngDevMode ? [{ debugName: "restoreError" }] : /* istanbul ignore next */ []));
        this.backupConfig = signal(null, ...(ngDevMode ? [{ debugName: "backupConfig" }] : /* istanbul ignore next */ []));
        /** The most-recent backup id, for the "Latest" marker (backups come newest-first from the API). */
        this.latestBackupId = computed(() => this.backups()[0]?.id ?? null, ...(ngDevMode ? [{ debugName: "latestBackupId" }] : /* istanbul ignore next */ []));
        /**
         * Flips whenever a translation file finishes loading.
         *
         * `computed` memoises on its SIGNAL dependencies, and `transloco.translate()` is not one — it is a
         * plain method call. So a computed that translates imperatively evaluates once during the first
         * render, BEFORE the language file has resolved, gets the raw key back (Transloco logs
         * "Missing translation key"), and then never re-runs to pick up the real string.
         *
         * That was not visible here only by luck: `backups()` and `backupConfig()` land after their HTTP
         * calls, which happens to be after translations load, so the strip re-evaluated and looked correct.
         * Remove or reorder those loads and the labels would read `data.summary.backups` permanently.
         *
         * Reading this signal inside the computed makes "translations arrived" a real dependency.
         */
        this.translationLoad = toSignal(this.transloco.events$.pipe(filter(e => e.type === 'translationLoadSuccess')), { initialValue: null });
        /**
         * Are translations actually available to `translate()` right now?
         *
         * Both halves are needed. `events$` does NOT replay, so a component mounted after the language file
         * already loaded would never see the event and — if that were the only check — would render an empty
         * strip forever, which is a worse bug than the one being fixed. `getTranslation()` is synchronous and
         * covers exactly that case; the signal covers the first-load case and supplies the reactivity.
         */
        this.translationsReady = computed(() => {
            this.translationLoad(); // dependency, not a value
            // Ask whether the active language has been LOADED, not whether it has content. An empty-but-loaded
            // dictionary is a legitimate state — the spec harness uses exactly that, and so would a minimal
            // locale — and treating it as "not ready" would blank the strip permanently.
            return this.transloco.getTranslation().has(this.transloco.getActiveLang());
        }, ...(ngDevMode ? [{ debugName: "translationsReady" }] : /* istanbul ignore next */ []));
        /** Operator overview strip: DB source, maintenance state, backup count, and the saved schedule. */
        this.summaryItems = computed(() => {
            // Render nothing rather than translate too early. Calling `translate()` before the language file
            // resolves logs "Missing translation key" and bakes the raw key into the label; an empty strip for
            // one frame is honest, since the data behind it has not loaded either.
            if (!this.translationsReady())
                return [];
            const t = (k) => this.transloco.translate(k);
            const items = [];
            const src = this.uriSource();
            if (src)
                items.push({ label: t('data.summary.database'), value: t('data.db.source.' + src), variant: this.sourcePillVariant() });
            const maint = this.maintenanceActive();
            if (maint !== null)
                items.push({ label: t('data.summary.maintenance'), value: maint ? t('data.summary.maintenanceOn') : t('data.summary.maintenanceOff'), variant: maint ? 'warn' : 'ok' });
            items.push({ label: t('data.summary.backups'), value: this.backups().length });
            const freq = this.freqFromCron(this.backupConfig()?.schedule);
            items.push({ label: t('data.summary.schedule'), value: freq === 'never' ? t('data.schedule.notConfigured') : t('data.schedule.freq.' + freq), variant: freq === 'never' ? 'off' : 'active' });
            return items;
        }, ...(ngDevMode ? [{ debugName: "summaryItems" }] : /* istanbul ignore next */ []));
        // ─ Schedule form (human-friendly, not raw cron) ─────────────────────────────────────
        this.scheduleForm = {
            frequency: 'never',
            hour: 2,
            minute: 0,
            weekday: 1, // 0 = Sun … 6 = Sat
            monthDay: 1,
        };
        this.savingSchedule = signal(false, ...(ngDevMode ? [{ debugName: "savingSchedule" }] : /* istanbul ignore next */ []));
        this.scheduleSaveSuccess = signal(false, ...(ngDevMode ? [{ debugName: "scheduleSaveSuccess" }] : /* istanbul ignore next */ []));
        this.scheduleSaveError = signal(null, ...(ngDevMode ? [{ debugName: "scheduleSaveError" }] : /* istanbul ignore next */ []));
        // ─ Destination form ───────────────────────────────────────────────────────────
        this.destForm = {
            ythrilInternal: true,
            customPath: '',
            keepLocal: null,
            encrypt: false,
        };
        this.savingDest = signal(false, ...(ngDevMode ? [{ debugName: "savingDest" }] : /* istanbul ignore next */ []));
        this.destSaveSuccess = signal(false, ...(ngDevMode ? [{ debugName: "destSaveSuccess" }] : /* istanbul ignore next */ []));
        this.destSaveError = signal(null, ...(ngDevMode ? [{ debugName: "destSaveError" }] : /* istanbul ignore next */ []));
        this.backupsPath = signal('', ...(ngDevMode ? [{ debugName: "backupsPath" }] : /* istanbul ignore next */ []));
        /** Snapshot of the last-saved config, so the UI can flag unsaved edits and auto-dismiss "Saved". */
        this.savedSnapshot = signal('', ...(ngDevMode ? [{ debugName: "savedSnapshot" }] : /* istanbul ignore next */ []));
        // ─ Static option lists ──────────────────────────────────────────────────────────
        this.freqOptions = [
            { value: 'never', label: 'data.schedule.freq.never' },
            { value: 'hourly', label: 'data.schedule.freq.hourly' },
            { value: 'daily', label: 'data.schedule.freq.daily' },
            { value: 'weekly', label: 'data.schedule.freq.weekly' },
            { value: 'monthly', label: 'data.schedule.freq.monthly' },
        ];
        this.weekdays = [
            { value: 0, label: 'data.schedule.weekday.0' },
            { value: 1, label: 'data.schedule.weekday.1' },
            { value: 2, label: 'data.schedule.weekday.2' },
            { value: 3, label: 'data.schedule.weekday.3' },
            { value: 4, label: 'data.schedule.weekday.4' },
            { value: 5, label: 'data.schedule.weekday.5' },
            { value: 6, label: 'data.schedule.weekday.6' },
        ];
        this.hours = Array.from({ length: 24 }, (_, i) => i);
        this.monthDays = Array.from({ length: 28 }, (_, i) => i + 1);
        this.maintenanceActive = signal(null, ...(ngDevMode ? [{ debugName: "maintenanceActive" }] : /* istanbul ignore next */ []));
        this.togglingMaintenance = signal(false, ...(ngDevMode ? [{ debugName: "togglingMaintenance" }] : /* istanbul ignore next */ []));
        this.maintenanceError = signal(null, ...(ngDevMode ? [{ debugName: "maintenanceError" }] : /* istanbul ignore next */ []));
        this.migrateUri = '';
        this.testing = signal(false, ...(ngDevMode ? [{ debugName: "testing" }] : /* istanbul ignore next */ []));
        this.testResult = signal(null, ...(ngDevMode ? [{ debugName: "testResult" }] : /* istanbul ignore next */ []));
        this.migrating = signal(false, ...(ngDevMode ? [{ debugName: "migrating" }] : /* istanbul ignore next */ []));
        this.migrateSuccess = signal(false, ...(ngDevMode ? [{ debugName: "migrateSuccess" }] : /* istanbul ignore next */ []));
        this.migrateError = signal(null, ...(ngDevMode ? [{ debugName: "migrateError" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        this.loadConfig();
        this.loadMaintenance();
        this.refreshBackups();
    }
    /** StatusPill variant for the DB-source pill (env is flagged — it can't be changed from the UI). */
    sourcePillVariant() {
        const s = this.uriSource();
        if (s === 'env')
            return 'warn';
        if (s === 'config')
            return 'active';
        return 'off';
    }
    loadConfig() {
        this.adminApi.getDataConfig().subscribe({
            next: ({ source, mongoUriRedacted, migrationEnabled }) => {
                this.uriSource.set(source);
                this.currentUriRedacted.set(mongoUriRedacted);
                this.migrationEnabled.set(migrationEnabled);
                if (migrationEnabled)
                    this.loadBackupConfig();
            },
            error: () => { },
        });
    }
    loadMaintenance() {
        this.adminApi.getMaintenanceStatus().subscribe({
            next: ({ active }) => this.maintenanceActive.set(active),
            error: () => { },
        });
    }
    loadBackupConfig() {
        this.adminApi.getBackupConfig().subscribe({
            next: ({ config, backupsPath }) => {
                this.backupConfig.set(config);
                if (backupsPath)
                    this.backupsPath.set(backupsPath);
                // Populate destination form
                this.destForm.ythrilInternal = !config?.offsite;
                this.destForm.customPath = config?.offsite?.destPath ?? '';
                this.destForm.keepLocal = config?.offsite?.retention?.keepCount ?? config?.retention?.keepLocal ?? null;
                // Absent means plaintext, matching the server: the schema leaves `encrypt` optional on purpose.
                this.destForm.encrypt = config?.encrypt === true;
                // Populate schedule form
                this.parseCron(config?.schedule);
                this.savedSnapshot.set(JSON.stringify(this.buildConfig()));
            },
            error: () => { },
        });
    }
    refreshBackups() {
        this.loadingBackups.set(true);
        this.adminApi.listBackups().subscribe({
            next: ({ backups }) => {
                this.backups.set(backups);
                this.loadingBackups.set(false);
            },
            error: () => this.loadingBackups.set(false),
        });
    }
    takeBackup() {
        this.backingUp.set(true);
        this.backupTaken.set(false);
        this.backupError.set(null);
        this.adminApi.triggerBackup().subscribe({
            next: () => {
                this.backingUp.set(false);
                this.backupTaken.set(true);
                this.refreshBackups();
            },
            error: err => {
                this.backingUp.set(false);
                this.backupError.set(err?.error?.error ?? this.transloco.translate('data.backup.error'));
            },
        });
    }
    async confirmRestore(backupId) {
        // Irreversible: replaces ALL data. Require typing the backup id to proceed.
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('data.restore.confirmTitle'),
            message: this.transloco.translate('data.restore.confirmMessage'),
            confirmLabel: this.transloco.translate('data.restore.confirmButton'),
            danger: true,
            requireText: backupId,
            requireTextLabel: this.transloco.translate('data.restore.typeIdToConfirm', { id: backupId }),
        });
        if (!ok)
            return;
        this.restoringId.set(backupId);
        this.restoreSuccess.set(false);
        this.restoreError.set(null);
        this.adminApi.restoreBackup(backupId).subscribe({
            next: () => {
                this.restoringId.set(null);
                this.restoreSuccess.set(true);
                this.refreshBackups();
            },
            error: err => {
                this.restoringId.set(null);
                this.restoreError.set(err?.error?.error ?? this.transloco.translate('data.backup.restoreError'));
            },
        });
    }
    saveSchedule() {
        this.savingSchedule.set(true);
        this.scheduleSaveSuccess.set(false);
        this.scheduleSaveError.set(null);
        this.adminApi.saveBackupConfig(this.buildConfig()).subscribe({
            next: ({ config }) => {
                this.backupConfig.set(config);
                this.savingSchedule.set(false);
                this.scheduleSaveSuccess.set(true);
                this.savedSnapshot.set(JSON.stringify(this.buildConfig()));
            },
            error: err => {
                this.savingSchedule.set(false);
                this.scheduleSaveError.set(err?.error?.error ?? this.transloco.translate('data.schedule.saveError'));
            },
        });
    }
    saveDest() {
        this.savingDest.set(true);
        this.destSaveSuccess.set(false);
        this.destSaveError.set(null);
        this.adminApi.saveBackupConfig(this.buildConfig()).subscribe({
            next: ({ config }) => {
                this.backupConfig.set(config);
                this.savingDest.set(false);
                this.destSaveSuccess.set(true);
                this.savedSnapshot.set(JSON.stringify(this.buildConfig()));
            },
            error: err => {
                this.savingDest.set(false);
                this.destSaveError.set(err?.error?.error ?? this.transloco.translate('data.dest.saveError'));
            },
        });
    }
    // ─ Config builders / parsers ───────────────────────────────────────────────────────
    buildConfig() {
        const cfg = {};
        // Schedule
        const cron = this.buildCron();
        if (cron)
            cfg.schedule = cron;
        // Emitted only when ON, so turning it off removes the key rather than writing `false`. Keeps an
        // untouched backup.json byte-identical and keeps `absent === plaintext` the single source of truth.
        if (this.destForm.encrypt)
            cfg.encrypt = true;
        const keep = this.destForm.keepLocal;
        if (keep != null && keep > 0) {
            cfg.retention = { keepLocal: keep };
        }
        // Destination / offsite
        if (!this.destForm.ythrilInternal && this.destForm.customPath.trim()) {
            cfg.offsite = {
                destPath: this.destForm.customPath.trim(),
                ...(keep && keep > 0 ? { retention: { keepCount: keep } } : {}),
            };
        }
        return cfg;
    }
    buildCron() {
        const { frequency, hour, minute, weekday, monthDay } = this.scheduleForm;
        if (frequency === 'never')
            return undefined;
        if (frequency === 'hourly')
            return `0 * * * *`;
        if (frequency === 'daily')
            return `${minute} ${hour} * * *`;
        if (frequency === 'weekly')
            return `${minute} ${hour} * * ${weekday}`;
        if (frequency === 'monthly')
            return `${minute} ${hour} ${monthDay} * *`;
        return undefined;
    }
    parseCron(cron) {
        if (!cron?.trim()) {
            this.scheduleForm.frequency = 'never';
            return;
        }
        const parts = cron.trim().split(/\s+/);
        if (parts.length !== 5) {
            this.scheduleForm.frequency = 'never';
            return;
        }
        const [min, hr, dom, , dow] = parts;
        // hourly: minute field is a number, hour is '*'
        if (hr === '*' && dom === '*' && dow === '*') {
            this.scheduleForm.frequency = 'hourly';
            return;
        }
        this.scheduleForm.minute = Math.max(0, Math.min(59, parseInt(min, 10) || 0));
        this.scheduleForm.hour = Math.max(0, Math.min(23, parseInt(hr, 10) || 2));
        if (dom !== '*' && dow === '*') {
            this.scheduleForm.frequency = 'monthly';
            this.scheduleForm.monthDay = Math.max(1, Math.min(28, parseInt(dom, 10) || 1));
        }
        else if (dom === '*' && dow !== '*') {
            this.scheduleForm.frequency = 'weekly';
            this.scheduleForm.weekday = Math.max(0, Math.min(6, parseInt(dow, 10) || 1));
        }
        else {
            this.scheduleForm.frequency = 'daily';
        }
    }
    /** Pure classification of a cron string into a frequency bucket (for the summary strip, no side effects). */
    freqFromCron(cron) {
        if (!cron?.trim())
            return 'never';
        const parts = cron.trim().split(/\s+/);
        if (parts.length !== 5)
            return 'never';
        const [, hr, dom, , dow] = parts;
        if (hr === '*' && dom === '*' && dow === '*')
            return 'hourly';
        if (dom !== '*' && dow === '*')
            return 'monthly';
        if (dom === '*' && dow !== '*')
            return 'weekly';
        return 'daily';
    }
    // ─ Computed state helpers ──────────────────────────────────────────────────────────
    destConfigured() {
        return !this.destForm.ythrilInternal && !!this.destForm.customPath.trim();
    }
    scheduleConfigured() {
        return this.scheduleForm.frequency !== 'never';
    }
    /** True when the schedule/destination forms differ from what was last saved. */
    configDirty() {
        return this.migrationEnabled() && JSON.stringify(this.buildConfig()) !== this.savedSnapshot();
    }
    /** Localised clock label for an hour (0–23), shared by the time dropdown and the schedule summary. */
    formatHour(h) {
        if (h === 0)
            return this.transloco.translate('data.time.midnight');
        if (h === 12)
            return this.transloco.translate('data.time.noon');
        const h12 = h > 12 ? h - 12 : h;
        const ampm = this.transloco.translate(h < 12 ? 'data.time.am' : 'data.time.pm');
        return `${h12}:00 ${ampm}`;
    }
    scheduleSummary() {
        const f = this.scheduleForm.frequency;
        if (f === 'never')
            return '';
        if (f === 'hourly')
            return this.transloco.translate('data.schedule.summary.hourly');
        const time = this.formatHour(this.scheduleForm.hour);
        if (f === 'daily')
            return this.transloco.translate('data.schedule.summary.daily', { time });
        if (f === 'weekly')
            return this.transloco.translate('data.schedule.summary.weekly', { day: this.transloco.translate('data.schedule.weekday.' + this.scheduleForm.weekday), time });
        if (f === 'monthly')
            return this.transloco.translate('data.schedule.summary.monthly', { day: this.scheduleForm.monthDay, time });
        return '';
    }
    testMigrateConnection() {
        const uri = this.migrateUri.trim();
        if (!uri)
            return;
        this.testing.set(true);
        this.testResult.set(null);
        this.adminApi.testMongoConnection(uri).subscribe({
            next: result => {
                this.testResult.set(result);
                this.testing.set(false);
            },
            error: err => {
                this.testResult.set({ ok: false, error: err?.error?.error ?? this.transloco.translate('data.migrate.requestFailed') });
                this.testing.set(false);
            },
        });
    }
    toggleMaintenance() {
        const next = !this.maintenanceActive();
        this.togglingMaintenance.set(true);
        this.maintenanceError.set(null);
        this.adminApi.setMaintenance(next).subscribe({
            next: ({ active }) => {
                this.maintenanceActive.set(active);
                this.togglingMaintenance.set(false);
            },
            error: err => {
                this.maintenanceError.set(err?.error?.error ?? this.transloco.translate('data.maintenance.requestFailed'));
                this.togglingMaintenance.set(false);
            },
        });
    }
    async confirmMigrate() {
        const uri = this.migrateUri.trim();
        if (!uri)
            return;
        // Irreversible: dumps, switches DB, and restarts. Require the MIGRATE ritual.
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('data.migrate.confirmTitle'),
            message: this.transloco.translate('data.migrate.confirmMessage'),
            confirmLabel: this.transloco.translate('data.migrate.confirmButton'),
            danger: true,
            requireText: 'MIGRATE',
            requireTextLabel: this.transloco.translate('data.migrate.typeToConfirm'),
        });
        if (!ok)
            return;
        this.migrating.set(true);
        this.migrateSuccess.set(false);
        this.migrateError.set(null);
        this.testResult.set(null);
        this.adminApi.startMigration(uri).subscribe({
            next: () => {
                this.migrating.set(false);
                this.migrateSuccess.set(true);
            },
            error: err => {
                this.migrating.set(false);
                const code = err?.error?.code;
                if (code === 'FEATURE_DISABLED') {
                    this.migrateError.set(this.transloco.translate('data.migrate.errorFeatureDisabled'));
                }
                else if (code === 'INFRA_MANAGED') {
                    this.migrateError.set(this.transloco.translate('data.migrate.errorInfraManaged'));
                }
                else {
                    this.migrateError.set(err?.error?.error ?? this.transloco.translate('data.migrate.error'));
                }
            },
        });
    }
    static { this.ɵfac = function DataComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || DataComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: DataComponent, selectors: [["app-data"]], decls: 64, vars: 70, consts: [[1, "data-page"], [1, "page-header"], [1, "card-title"], [3, "items"], ["icon", "database", 3, "heading", "purpose"], ["pill", "", 3, "variant", "dot"], [1, "mono", 2, "color", "var(--text-secondary)"], ["icon", "floppy-disk", 3, "heading", "purpose"], ["pill", "", "variant", "ok", 3, "dot"], [1, "btn", "btn-secondary", "btn-sm", 2, "margin-bottom", "14px", 3, "click", "disabled"], [1, "spinner", "spinner-sm"], [1, "alert", "alert-success", 2, "margin-bottom", "12px"], [1, "alert", "alert-error", 2, "margin-bottom", "12px"], [1, "muted"], ["hscrollTop", "", 1, "table-wrapper"], ["icon", "timer", 3, "heading", "purpose"], [1, "dz"], [1, "dz-head"], ["name", "warning", 3, "size"], [1, "dz-hint"], [1, "dz-block"], [2, "margin-left", "8px", 3, "variant", "dot"], [1, "btn", "btn-sm", 3, "click", "disabled"], [1, "alert", "alert-error", 2, "margin-top", "10px"], [1, "sub"], [1, "table", 2, "font-size", "13px"], [3, "value"], ["variant", "active", 2, "margin-left", "8px"], [1, "mono"], [2, "text-align", "right"], [1, "btn", "btn-sm", "btn-danger", 3, "click", "disabled"], [2, "margin-bottom", "16px", "padding", "14px 16px", "background", "var(--bg-elevated)", "border-radius", "var(--radius-sm)"], [2, "display", "flex", "align-items", "center", "gap", "10px", "cursor", "pointer"], ["type", "checkbox", 1, "form-check-input", 2, "margin", "0", 3, "ngModelChange", "ngModel"], [2, "font-weight", "500", "font-size", "14px"], [2, "margin", "8px 0 0 26px", "font-size", "13px", "color", "var(--text-secondary)"], [1, "form-group", 2, "margin-bottom", "16px"], [1, "form-label"], ["type", "text", 1, "form-control", "mono", 3, "ngModelChange", "disabled", "ngModel", "placeholder"], [1, "muted", 2, "font-size", "12px", "margin-top", "4px"], [1, "form-group", 2, "margin-bottom", "12px"], [2, "display", "flex", "align-items", "center", "gap", "8px"], ["type", "number", "min", "1", 1, "form-control", 2, "width", "100px", 3, "ngModelChange", "ngModel", "placeholder"], [2, "font-size", "13px", "color", "var(--text-secondary)"], [1, "freq-opt", 2, "display", "flex", "align-items", "flex-start", "gap", "8px", "padding", "10px 12px"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [2, "font-size", "13px"], ["id", "data-encrypt-hint", 1, "muted", 2, "display", "block", "font-size", "12px", "margin-top", "3px"], [1, "save-row"], [1, "btn", "btn-primary", "btn-sm", 3, "click", "disabled"], ["variant", "warn", 3, "dot"], ["variant", "ok", "icon", "check-circle"], [1, "alert", "alert-warning", 2, "margin-top", "10px", "font-size", "12.5px"], [1, "muted", 2, "font-size", "12px", "margin-top", "6px"], [1, "form-group", 2, "margin-bottom", "20px"], [2, "display", "flex", "gap", "8px", "flex-wrap", "wrap"], [1, "freq-opt", 3, "sel"], [1, "freq-opt"], ["type", "radio", "name", "freq", 2, "display", "none", 3, "ngModelChange", "value", "ngModel"], [1, "sched-summary", 2, "margin-bottom", "16px"], ["name", "timer", 3, "size"], [1, "form-control", 2, "max-width", "240px", 3, "ngModelChange", "ngModel"], [3, "ngValue"], [1, "day-opt", 3, "sel"], [1, "day-opt"], ["type", "radio", "name", "weekday", 2, "display", "none", 3, "ngModelChange", "value", "ngModel"], [1, "form-control", 2, "max-width", "120px", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "mongodb://new-host:27017/", 1, "form-control", "mono", 3, "ngModelChange", "ngModel"], [1, "alert", 2, "margin-bottom", "12px", 3, "class"], [1, "btn", "btn-secondary", "btn-sm", 3, "click", "disabled"], [1, "btn", "btn-danger", "btn-sm", 3, "click", "disabled"], [1, "alert", 2, "margin-bottom", "12px"]], template: function DataComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1)(2, "div", 2);
            i0.ɵɵtext(3);
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelement(5, "app-summary-strip", 3);
            i0.ɵɵelementStart(6, "app-settings-card", 4);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵconditionalCreate(9, DataComponent_Conditional_9_Template, 3, 5, "app-status-pill", 5);
            i0.ɵɵconditionalCreate(10, DataComponent_Conditional_10_Template, 2, 1, "code", 6);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(11, "app-settings-card", 7);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵconditionalCreate(14, DataComponent_Conditional_14_Template, 2, 2, "app-status-pill", 8);
            i0.ɵɵelementStart(15, "button", 9);
            i0.ɵɵlistener("click", function DataComponent_Template_button_click_15_listener() { return ctx.takeBackup(); });
            i0.ɵɵconditionalCreate(16, DataComponent_Conditional_16_Template, 1, 0, "span", 10);
            i0.ɵɵtext(17);
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(19, DataComponent_Conditional_19_Template, 3, 3, "div", 11);
            i0.ɵɵconditionalCreate(20, DataComponent_Conditional_20_Template, 2, 1, "div", 12);
            i0.ɵɵconditionalCreate(21, DataComponent_Conditional_21_Template, 3, 3, "div", 11);
            i0.ɵɵconditionalCreate(22, DataComponent_Conditional_22_Template, 2, 1, "div", 12);
            i0.ɵɵconditionalCreate(23, DataComponent_Conditional_23_Template, 1, 0, "span", 10)(24, DataComponent_Conditional_24_Template, 3, 3, "p", 13)(25, DataComponent_Conditional_25_Template, 14, 6, "div", 14);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(26, "app-settings-card", 4);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵconditionalCreate(29, DataComponent_Conditional_29_Template, 4, 7, "app-status-pill", 5);
            i0.ɵɵconditionalCreate(30, DataComponent_Conditional_30_Template, 3, 3, "p", 13)(31, DataComponent_Conditional_31_Template, 49, 47);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(32, "app-settings-card", 15);
            i0.ɵɵpipe(33, "transloco");
            i0.ɵɵpipe(34, "transloco");
            i0.ɵɵconditionalCreate(35, DataComponent_Conditional_35_Template, 4, 7, "app-status-pill", 5);
            i0.ɵɵconditionalCreate(36, DataComponent_Conditional_36_Template, 3, 3, "p", 13)(37, DataComponent_Conditional_37_Template, 13, 8);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(38, "div", 16)(39, "div", 17);
            i0.ɵɵelement(40, "ph-icon", 18);
            i0.ɵɵtext(41);
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(43, "p", 19);
            i0.ɵɵtext(44);
            i0.ɵɵpipe(45, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(46, "div", 20)(47, "h4");
            i0.ɵɵtext(48);
            i0.ɵɵpipe(49, "transloco");
            i0.ɵɵconditionalCreate(50, DataComponent_Conditional_50_Template, 4, 7, "app-status-pill", 21);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(51, "button", 22);
            i0.ɵɵlistener("click", function DataComponent_Template_button_click_51_listener() { return ctx.toggleMaintenance(); });
            i0.ɵɵconditionalCreate(52, DataComponent_Conditional_52_Template, 1, 0, "span", 10);
            i0.ɵɵtext(53);
            i0.ɵɵpipe(54, "transloco");
            i0.ɵɵpipe(55, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(56, DataComponent_Conditional_56_Template, 2, 1, "div", 23);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(57, "div", 20)(58, "h4");
            i0.ɵɵtext(59);
            i0.ɵɵpipe(60, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(61, DataComponent_Conditional_61_Template, 3, 3, "p", 24)(62, DataComponent_Conditional_62_Template, 3, 3, "p", 24)(63, DataComponent_Conditional_63_Template, 20, 20);
            i0.ɵɵelementEnd()()();
        } if (rf & 2) {
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 38, "data.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("items", ctx.summaryItems());
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(7, 40, "data.db.title"))("purpose", ctx.uriSource() ? i0.ɵɵpipeBind1(8, 42, "data.db.sourceDesc." + ctx.uriSource()) : "");
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.uriSource() ? 9 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.currentUriRedacted() ? 10 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(12, 44, "data.backup.title"))("purpose", i0.ɵɵpipeBind1(13, 46, "data.backup.description"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.backups().length ? 14 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.backingUp());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.backingUp() ? 16 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(18, 48, "data.backup.takeButton"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.backupTaken() ? 19 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.backupError() ? 20 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.restoreSuccess() ? 21 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.restoreError() ? 22 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.loadingBackups() ? 23 : !ctx.backups().length ? 24 : 25);
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(27, 50, "data.dest.title"))("purpose", ctx.migrationEnabled() ? i0.ɵɵpipeBind1(28, 52, "data.dest.description") : "");
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.migrationEnabled() ? 29 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(!ctx.migrationEnabled() ? 30 : 31);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(33, 54, "data.schedule.title"))("purpose", ctx.migrationEnabled() ? i0.ɵɵpipeBind1(34, 56, "data.schedule.howOften") : "");
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.migrationEnabled() ? 35 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(!ctx.migrationEnabled() ? 36 : 37);
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 58, "data.dangerZone.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(45, 60, "data.dangerZone.hint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(49, 62, "data.maintenance.title"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.maintenanceActive() !== null ? 50 : -1);
            i0.ɵɵadvance();
            i0.ɵɵclassMap(ctx.maintenanceActive() ? "btn-primary" : "btn-danger");
            i0.ɵɵproperty("disabled", ctx.togglingMaintenance());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.togglingMaintenance() ? 52 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", ctx.maintenanceActive() ? i0.ɵɵpipeBind1(54, 64, "data.maintenance.deactivate") : i0.ɵɵpipeBind1(55, 66, "data.maintenance.activate"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.maintenanceError() ? 56 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(60, 68, "data.migrate.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.uriSource() === "env" ? 61 : !ctx.migrationEnabled() ? 62 : 63);
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.MinValidator, i1.NgModel, SettingsCardComponent, StatusPillComponent, SummaryStripComponent, RelativeTimeComponent, PhIconComponent, HscrollTopDirective,
            TranslocoPipe], styles: [".data-page[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 16px; max-width: 860px; }\n    .freq-opt[_ngcontent-%COMP%], .day-opt[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 6px; cursor: pointer; border-radius: var(--radius-sm);\n      border: 1px solid var(--border); background: transparent; color: var(--text-secondary); transition: all .15s; }\n    .freq-opt[_ngcontent-%COMP%] { padding: 8px 16px; font-size: 14px; }\n    .day-opt[_ngcontent-%COMP%] { padding: 6px 12px; font-size: 13px; }\n    .freq-opt.sel[_ngcontent-%COMP%], .day-opt.sel[_ngcontent-%COMP%] { border-color: var(--accent);\n      background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--text-primary); font-weight: 600; }\n    .sched-summary[_ngcontent-%COMP%] { padding: 10px 14px; background: var(--bg-elevated); border-radius: var(--radius-sm);\n      font-size: 13px; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 8px; }\n    .save-row[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px; }\n    \n\n    .dz[_ngcontent-%COMP%] { border: 1px solid var(--danger); border-radius: 12px; padding: 4px 16px 16px; margin-top: 8px;\n      background: color-mix(in srgb, var(--danger) 4%, transparent); }\n    .dz-head[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 8px; padding: 14px 2px 4px; color: var(--danger);\n      font-weight: 700; font-size: 14px; }\n    .dz-hint[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 12px; }\n    .dz-block[_ngcontent-%COMP%] { padding: 14px 0; border-top: 1px solid var(--border-muted); }\n    .dz-block[_ngcontent-%COMP%]:first-of-type { border-top: none; }\n    .dz-block[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] { margin: 0 0 4px; font-size: 14px; font-weight: 620; }\n    .dz-block[_ngcontent-%COMP%]   .sub[_ngcontent-%COMP%] { margin: 0 0 12px; font-size: 13px; color: var(--text-secondary); }\n    .mono[_ngcontent-%COMP%] { font-family: var(--font-mono); font-size: 13px; }\n    .muted[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 14px; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(DataComponent, [{
        type: Component,
        args: [{ selector: 'app-data', standalone: true, imports: [
                    CommonModule, FormsModule, TranslocoPipe,
                    SettingsCardComponent, StatusPillComponent, SummaryStripComponent, RelativeTimeComponent, PhIconComponent, HscrollTopDirective
                ], template: `
    <div class="data-page">
      <div class="page-header"><div class="card-title">{{ 'data.title' | transloco }}</div></div>

      <app-summary-strip [items]="summaryItems()"/>

      <!-- ── Database (read-only) ─────────────────────────────── -->
      <app-settings-card icon="database" [heading]="'data.db.title' | transloco" [purpose]="uriSource() ? (('data.db.sourceDesc.' + uriSource()) | transloco) : ''">
        @if (uriSource()) {
          <app-status-pill pill [variant]="sourcePillVariant()" [dot]="true">{{ ('data.db.source.' + uriSource()) | transloco }}</app-status-pill>
        }
        @if (currentUriRedacted()) { <code class="mono" style="color:var(--text-secondary);">{{ currentUriRedacted() }}</code> }
      </app-settings-card>

      <!-- ── Backups ──────────────────────────────────────────── -->
      <app-settings-card icon="floppy-disk" [heading]="'data.backup.title' | transloco" [purpose]="'data.backup.description' | transloco">
        @if (backups().length) { <app-status-pill pill variant="ok" [dot]="true">{{ backups().length }}</app-status-pill> }

        <button class="btn btn-secondary btn-sm" style="margin-bottom:14px;" [disabled]="backingUp()" (click)="takeBackup()">
          @if (backingUp()) { <span class="spinner spinner-sm"></span> }{{ 'data.backup.takeButton' | transloco }}
        </button>

        @if (backupTaken())    { <div class="alert alert-success" style="margin-bottom:12px;">{{ 'data.backup.success' | transloco }}</div> }
        @if (backupError())    { <div class="alert alert-error"   style="margin-bottom:12px;">{{ backupError() }}</div> }
        @if (restoreSuccess()) { <div class="alert alert-success" style="margin-bottom:12px;">{{ 'data.backup.restoreSuccess' | transloco }}</div> }
        @if (restoreError())   { <div class="alert alert-error"   style="margin-bottom:12px;">{{ restoreError() }}</div> }

        @if (loadingBackups()) {
          <span class="spinner spinner-sm"></span>
        } @else if (!backups().length) {
          <p class="muted">{{ 'data.backup.empty' | transloco }}</p>
        } @else {
          <div class="table-wrapper" hscrollTop>
          <table class="table" style="font-size:13px;">
            <thead><tr>
              <th>{{ 'data.backup.colDate' | transloco }}</th>
              <th>{{ 'data.backup.colCollections' | transloco }}</th>
              <th></th>
            </tr></thead>
            <tbody>
              @for (b of backups(); track b.id) {
                <tr>
                  <td>
                    <app-relative-time [value]="b.createdAt"/>
                    @if (b.id === latestBackupId()) { <app-status-pill variant="active" style="margin-left:8px;">{{ 'data.backup.latest' | transloco }}</app-status-pill> }
                  </td>
                  <td class="mono">{{ b.collections.length }}</td>
                  <td style="text-align:right;">
                    <button class="btn btn-sm btn-danger" [disabled]="!!restoringId()" (click)="confirmRestore(b.id)">
                      @if (restoringId() === b.id) { <span class="spinner spinner-sm"></span> }{{ 'data.backup.restoreButton' | transloco }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          </div>
        }
      </app-settings-card>

      <!-- ── Backup Destination ───────────────────────────────── -->
      <app-settings-card icon="database" [heading]="'data.dest.title' | transloco" [purpose]="migrationEnabled() ? ('data.dest.description' | transloco) : ''">
        @if (migrationEnabled()) {
          <app-status-pill pill [variant]="destConfigured() ? 'active' : 'off'" [dot]="true">{{ destConfigured() ? ('data.dest.configured' | transloco) : ('data.dest.notConfigured' | transloco) }}</app-status-pill>
        }
        @if (!migrationEnabled()) {
          <p class="muted">{{ 'data.dest.featureDisabled' | transloco }}</p>
        } @else {
          <div style="margin-bottom:16px;padding:14px 16px;background:var(--bg-elevated);border-radius:var(--radius-sm);">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input class="form-check-input" type="checkbox" [(ngModel)]="destForm.ythrilInternal" style="margin:0;" />
              <span style="font-weight:500;font-size:14px;">{{ 'data.dest.internalLabel' | transloco }}</span>
            </label>
            <p style="margin:8px 0 0 26px;font-size:13px;color:var(--text-secondary);">{{ 'data.dest.internalHint' | transloco }}</p>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">{{ 'data.dest.pathLabel' | transloco }}</label>
            <input class="form-control mono" type="text" [disabled]="destForm.ythrilInternal" [(ngModel)]="destForm.customPath"
              [placeholder]="destForm.ythrilInternal ? (backupsPath() || ('data.dest.internalPathHint' | transloco)) : ('data.dest.pathPlaceholder' | transloco)" />
            @if (!destForm.ythrilInternal) { <div class="muted" style="font-size:12px;margin-top:4px;">{{ 'data.dest.pathHint' | transloco }}</div> }
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">{{ 'data.dest.keepLabel' | transloco }}</label>
            <div style="display:flex;align-items:center;gap:8px;">
              <input class="form-control" type="number" [(ngModel)]="destForm.keepLocal" min="1" style="width:100px;" [placeholder]="'data.dest.keepUnlimitedPlaceholder' | transloco" />
              <span style="font-size:13px;color:var(--text-secondary);">{{ 'data.dest.keepSuffix' | transloco }}</span>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">{{ 'data.dest.encryptLabel' | transloco }}</label>
            <label class="freq-opt" style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;">
              <input type="checkbox" [(ngModel)]="destForm.encrypt" [attr.aria-describedby]="'data-encrypt-hint'" />
              <span>
                <strong style="font-size:13px;">{{ 'data.dest.encryptToggle' | transloco }}</strong>
                <span id="data-encrypt-hint" class="muted" style="display:block;font-size:12px;margin-top:3px;">
                  {{ 'data.dest.encryptHint' | transloco }}
                </span>
              </span>
            </label>
            @if (destForm.encrypt) {
              <!-- Both consequences, stated where the choice is made rather than in a doc.
                   The key one is not a nicety: an encrypted backup is unrecoverable without the secret, and
                   the operator most likely to enable this is the one least likely to have thought about where
                   that secret lives. The size one is measured - the fixed envelope wrapper dominates small
                   records, so a dump of many small ones can more than double. -->
              <div class="alert alert-warning" style="margin-top:10px;font-size:12.5px;">
                {{ 'data.dest.encryptWarnKey' | transloco }}
              </div>
              <div class="muted" style="font-size:12px;margin-top:6px;">
                {{ 'data.dest.encryptWarnSize' | transloco }}
              </div>
            }
          </div>

          @if (destSaveError()) { <div class="alert alert-error" style="margin-bottom:12px;">{{ destSaveError() }}</div> }
          <div class="save-row">
            <button class="btn btn-primary btn-sm" [disabled]="savingDest()" (click)="saveDest()">
              @if (savingDest()) { <span class="spinner spinner-sm"></span> }{{ 'data.dest.saveButton' | transloco }}
            </button>
            @if (configDirty()) { <app-status-pill variant="warn" [dot]="true">{{ 'common.unsavedChanges' | transloco }}</app-status-pill> }
            @else if (destSaveSuccess()) { <app-status-pill variant="ok" icon="check-circle">{{ 'data.dest.saveSuccess' | transloco }}</app-status-pill> }
          </div>
        }
      </app-settings-card>

      <!-- ── Scheduled Backups ────────────────────────────────── -->
      <app-settings-card icon="timer" [heading]="'data.schedule.title' | transloco" [purpose]="migrationEnabled() ? ('data.schedule.howOften' | transloco) : ''">
        @if (migrationEnabled()) {
          <app-status-pill pill [variant]="scheduleConfigured() ? 'active' : 'off'" [dot]="true">{{ scheduleConfigured() ? ('data.schedule.configured' | transloco) : ('data.schedule.notConfigured' | transloco) }}</app-status-pill>
        }
        @if (!migrationEnabled()) {
          <p class="muted">{{ 'data.schedule.featureDisabled' | transloco }}</p>
        } @else {
          <div class="form-group" style="margin-bottom:20px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              @for (opt of freqOptions; track opt.value) {
                <label class="freq-opt" [class.sel]="scheduleForm.frequency === opt.value">
                  <input type="radio" name="freq" [value]="opt.value" [(ngModel)]="scheduleForm.frequency" style="display:none;" />
                  {{ opt.label | transloco }}
                </label>
              }
            </div>
          </div>

          @if (scheduleForm.frequency !== 'never') {
            @if (scheduleForm.frequency !== 'hourly') {
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">{{ 'data.schedule.atTime' | transloco }}</label>
                <select class="form-control" [(ngModel)]="scheduleForm.hour" style="max-width:240px;">
                  @for (h of hours; track h) { <option [ngValue]="h">{{ formatHour(h) }}</option> }
                </select>
              </div>
            }
            @if (scheduleForm.frequency === 'weekly') {
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">{{ 'data.schedule.onWeekday' | transloco }}</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  @for (d of weekdays; track d.value) {
                    <label class="day-opt" [class.sel]="scheduleForm.weekday === d.value">
                      <input type="radio" name="weekday" [value]="d.value" [(ngModel)]="scheduleForm.weekday" style="display:none;" />
                      {{ d.label | transloco }}
                    </label>
                  }
                </div>
              </div>
            }
            @if (scheduleForm.frequency === 'monthly') {
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">{{ 'data.schedule.onMonthDay' | transloco }}</label>
                <select class="form-control" [(ngModel)]="scheduleForm.monthDay" style="max-width:120px;">
                  @for (d of monthDays; track d) { <option [ngValue]="d">{{ d }}</option> }
                </select>
                <div class="muted" style="font-size:12px;margin-top:4px;">{{ 'data.schedule.monthDayHint' | transloco }}</div>
              </div>
            }
            <div class="sched-summary" style="margin-bottom:16px;"><ph-icon name="timer" [size]="14"/>{{ scheduleSummary() }}</div>
          }

          @if (scheduleSaveError()) { <div class="alert alert-error" style="margin-bottom:12px;">{{ scheduleSaveError() }}</div> }
          <div class="save-row">
            <button class="btn btn-primary btn-sm" [disabled]="savingSchedule()" (click)="saveSchedule()">
              @if (savingSchedule()) { <span class="spinner spinner-sm"></span> }{{ 'data.schedule.saveButton' | transloco }}
            </button>
            @if (configDirty()) { <app-status-pill variant="warn" [dot]="true">{{ 'common.unsavedChanges' | transloco }}</app-status-pill> }
            @else if (scheduleSaveSuccess()) { <app-status-pill variant="ok" icon="check-circle">{{ 'data.schedule.saveSuccess' | transloco }}</app-status-pill> }
          </div>
        }
      </app-settings-card>

      <!-- ── Danger Zone: disruptive / irreversible ops ───────── -->
      <div class="dz">
        <div class="dz-head"><ph-icon name="warning" [size]="16"/>{{ 'data.dangerZone.title' | transloco }}</div>
        <p class="dz-hint">{{ 'data.dangerZone.hint' | transloco }}</p>

        <!-- Maintenance mode -->
        <div class="dz-block">
          <h4>{{ 'data.maintenance.title' | transloco }}
            @if (maintenanceActive() !== null) {
              <app-status-pill [variant]="maintenanceActive() ? 'warn' : 'ok'" [dot]="true" style="margin-left:8px;">{{ maintenanceActive() ? ('data.maintenance.active' | transloco) : ('data.maintenance.inactive' | transloco) }}</app-status-pill>
            }
          </h4>
          <button class="btn btn-sm" [class]="maintenanceActive() ? 'btn-primary' : 'btn-danger'" [disabled]="togglingMaintenance()" (click)="toggleMaintenance()">
            @if (togglingMaintenance()) { <span class="spinner spinner-sm"></span> }{{ maintenanceActive() ? ('data.maintenance.deactivate' | transloco) : ('data.maintenance.activate' | transloco) }}
          </button>
          @if (maintenanceError()) { <div class="alert alert-error" style="margin-top:10px;">{{ maintenanceError() }}</div> }
        </div>

        <!-- Migrate database -->
        <div class="dz-block">
          <h4>{{ 'data.migrate.title' | transloco }}</h4>
          @if (uriSource() === 'env') {
            <p class="sub">{{ 'data.migrate.envNote' | transloco }}</p>
          } @else if (!migrationEnabled()) {
            <p class="sub">{{ 'data.migrate.featureDisabled' | transloco }}</p>
          } @else {
            <p class="sub">{{ 'data.migrate.description' | transloco }}</p>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">{{ 'data.migrate.newUriLabel' | transloco }}</label>
              <input class="form-control mono" type="text" [(ngModel)]="migrateUri" placeholder="mongodb://new-host:27017/" />
            </div>
            @if (testResult()) {
              <div class="alert" [class]="testResult()!.ok ? 'alert-success' : 'alert-error'" style="margin-bottom:12px;">
                {{ testResult()!.ok ? ('data.migrate.testOk' | transloco) : (('data.migrate.testFail' | transloco) + ': ' + testResult()!.error) }}
              </div>
            }
            @if (migrateSuccess()) { <div class="alert alert-success" style="margin-bottom:12px;">{{ 'data.migrate.success' | transloco }}</div> }
            @if (migrateError())   { <div class="alert alert-error"   style="margin-bottom:12px;">{{ migrateError() }}</div> }
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" [disabled]="testing() || !migrateUri.trim()" (click)="testMigrateConnection()">
                @if (testing()) { <span class="spinner spinner-sm"></span> }{{ 'data.migrate.testButton' | transloco }}
              </button>
              <button class="btn btn-danger btn-sm" [disabled]="migrating() || !testResult()?.ok" (click)="confirmMigrate()">
                @if (migrating()) { <span class="spinner spinner-sm"></span> }{{ 'data.migrate.migrateButton' | transloco }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `, styles: ["\n    .data-page { display: flex; flex-direction: column; gap: 16px; max-width: 860px; }\n    .freq-opt, .day-opt { display: flex; align-items: center; gap: 6px; cursor: pointer; border-radius: var(--radius-sm);\n      border: 1px solid var(--border); background: transparent; color: var(--text-secondary); transition: all .15s; }\n    .freq-opt { padding: 8px 16px; font-size: 14px; }\n    .day-opt { padding: 6px 12px; font-size: 13px; }\n    .freq-opt.sel, .day-opt.sel { border-color: var(--accent);\n      background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--text-primary); font-weight: 600; }\n    .sched-summary { padding: 10px 14px; background: var(--bg-elevated); border-radius: var(--radius-sm);\n      font-size: 13px; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 8px; }\n    .save-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px; }\n    /* Danger zone \u2014 visually quarantined red region for disruptive / irreversible ops. */\n    .dz { border: 1px solid var(--danger); border-radius: 12px; padding: 4px 16px 16px; margin-top: 8px;\n      background: color-mix(in srgb, var(--danger) 4%, transparent); }\n    .dz-head { display: flex; align-items: center; gap: 8px; padding: 14px 2px 4px; color: var(--danger);\n      font-weight: 700; font-size: 14px; }\n    .dz-hint { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 12px; }\n    .dz-block { padding: 14px 0; border-top: 1px solid var(--border-muted); }\n    .dz-block:first-of-type { border-top: none; }\n    .dz-block h4 { margin: 0 0 4px; font-size: 14px; font-weight: 620; }\n    .dz-block .sub { margin: 0 0 12px; font-size: 13px; color: var(--text-secondary); }\n    .mono { font-family: var(--font-mono); font-size: 13px; }\n    .muted { color: var(--text-muted); font-size: 14px; }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(DataComponent, { className: "DataComponent", filePath: "app/pages/settings/data.component.ts", lineNumber: 303 }); })();
