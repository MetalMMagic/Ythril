import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked, HostListener, viewChild, Input, Output, EventEmitter } from '@angular/core';
import { SortableHeaderComponent } from '../brain/sortable-header.component';
import { FilePreviewComponent } from './file-preview.component';
import { UploadQueueComponent } from './upload-queue.component';
import { FileMetaEditorComponent } from './file-meta-editor.component';
import { FileExtractViewComponent } from './file-extract-view.component';
import { FileListingComponent } from './file-listing.component';
import { formatSize } from './file-format';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { FilesApi } from '../../core/files-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { AuthService } from '../../core/auth.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { StepProgressBarComponent } from '../../shared/step-progress-bar.component';
import { MarkdownRenderService } from '../../shared/markdown-render.service';
// The docked detail pane reuses the Brain's file-metadata edit fields. These are dumb, shared
// ref-field widgets; they resolve chip labels via EntityRefPicker, which the Brain provides — so the
// "File meta" edit mode is available only when embedded in the Brain (embeddedSpaceId set).
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntityRefFieldComponent } from '../brain/entity-ref-field.component';
import { MemoryRefFieldComponent } from '../brain/memory-ref-field.component';
import { ChronoRefFieldComponent } from '../brain/chrono-ref-field.component';
import { EntityRefPicker } from '../brain/entity-ref-picker.service';
import { BrainStore } from '../brain/brain-store.service';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import plaintext from 'highlight.js/lib/languages/plaintext';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { ModalDirective } from '../../shared/modal.directive';
import { TimestampComponent } from '../../shared/timestamp.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
import * as i2 from "@angular/forms";
const _c0 = ["detailPane"];
const _c1 = a0 => ({ $implicit: a0 });
const _forTrack0 = ($index, $item) => $item.id;
const _forTrack1 = ($index, $item) => $item.path;
function FileManagerComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 2);
    i0.ɵɵelement(1, "span", 5);
    i0.ɵɵelementEnd();
} }
function FileManagerComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 6);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function FileManagerComponent_Conditional_1_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.retrySpaces()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "files.loadSpacesError"))("reason", ctx_r1.spacesError() ?? "");
} }
function FileManagerComponent_Conditional_2_Conditional_0_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 9);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_0_For_2_Template_button_click_0_listener() { const s_r4 = i0.ɵɵrestoreView(_r3).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.selectSpace(s_r4.id)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r4 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵclassProp("btn-primary", ctx_r1.activeSpaceId() === s_r4.id)("btn-secondary", ctx_r1.activeSpaceId() !== s_r4.id);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r4.label);
} }
function FileManagerComponent_Conditional_2_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7);
    i0.ɵɵrepeaterCreate(1, FileManagerComponent_Conditional_2_Conditional_0_For_2_Template, 2, 5, "button", 8, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.spaces());
} }
function FileManagerComponent_Conditional_2_Conditional_1_For_3_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 24);
    i0.ɵɵtext(1, "/");
    i0.ɵɵelementEnd();
} }
function FileManagerComponent_Conditional_2_Conditional_1_For_3_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 23);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_For_3_Template_button_click_0_listener() { const seg_r7 = i0.ɵɵrestoreView(_r6).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.navigate(seg_r7.path)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(2, FileManagerComponent_Conditional_2_Conditional_1_For_3_Conditional_2_Template, 2, 0, "span", 24);
} if (rf & 2) {
    const seg_r7 = ctx.$implicit;
    const ɵ$index_23_r8 = ctx.$index;
    const ɵ$count_23_r9 = ctx.$count;
    i0.ɵɵclassProp("current", ɵ$index_23_r8 === ɵ$count_23_r9 - 1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(seg_r7.label);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!(ɵ$index_23_r8 === ɵ$count_23_r9 - 1) ? 2 : -1);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 25);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_4_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.showNewFolder.set(true)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.newFolder"));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 26);
    i0.ɵɵlistener("ngSubmit", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_5_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.createFolder()); });
    i0.ɵɵelementStart(1, "input", 27);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_5_Template_input_ngModelChange_1_listener($event) { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.newFolderName, $event) || (ctx_r1.newFolderName = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "button", 28);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 29);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_5_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.showNewFolder.set(false)); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.newFolderName);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(2, 5, "files.newFolderPlaceholder"));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(3, 7, "files.newFolderAriaLabel"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 9, "files.createFolder"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 11, "common.cancel"));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 30);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
} if (rf & 2) {
    i0.ɵɵproperty("size", 12);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, "files.sidebar.hideTree"), " ");
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 31);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
} if (rf & 2) {
    i0.ɵɵproperty("size", 12);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, "files.sidebar.showTree"), " ");
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-upload-queue", 32);
    i0.ɵɵlistener("retry", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_14_Template_app_upload_queue_retry_0_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.retryUpload($event)); })("cancel", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_14_Template_app_upload_queue_cancel_0_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelUpload($event)); })("dismiss", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_14_Template_app_upload_queue_dismiss_0_listener($event) { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.dismissUpload($event)); })("clearFinished", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_14_Template_app_upload_queue_clearFinished_0_listener() { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.clearFinishedUploads()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("uploads", ctx_r1.uploads())("hasFinished", ctx_r1.hasFinishedUploads());
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_16_ng_container_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementContainer(0);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 20);
    i0.ɵɵtemplate(1, FileManagerComponent_Conditional_2_Conditional_1_Conditional_16_ng_container_1_Template, 1, 0, "ng-container", 33);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    const treeTemplate_r13 = i0.ɵɵreference(4);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngTemplateOutlet", treeTemplate_r13)("ngTemplateOutletContext", i0.ɵɵpureFunction1(2, _c1, ctx_r1.treeRoot()));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 2);
    i0.ɵɵelement(1, "span", 5);
    i0.ɵɵelementEnd();
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "div", 34);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 1, "files.refreshing"));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 35);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.refreshFailed"));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Conditional_0_Template, 2, 3, "div", 34);
    i0.ɵɵconditionalCreate(1, FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Conditional_1_Template, 3, 3, "div", 35);
    i0.ɵɵelementStart(2, "app-file-listing", 36);
    i0.ɵɵtwoWayListener("renameValueChange", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_renameValueChange_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.renameValue, $event) || (ctx_r1.renameValue = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("sort", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_sort_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.setSort($event)); })("open", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_open_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.open($event)); })("download", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_download_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.downloadFile($event)); })("requeue", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_requeue_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.requeueEmbedding($event)); })("renameStart", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_renameStart_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.startRename($event)); })("renameConfirm", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_renameConfirm_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.confirmRename($event)); })("renameCancel", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_renameCancel_2_listener() { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.renamingEntry.set("")); })("remove", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_remove_2_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.deleteEntry($event)); })("retryLoad", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template_app_file_listing_retryLoad_2_listener() { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.reloadDir()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵconditional(ctx_r1.refreshing() ? 0 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.refreshFailed() ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("rows", ctx_r1.fileRows())("sortField", ctx_r1.sortField())("sortDir", ctx_r1.sortDir())("error", ctx_r1.loadError());
    i0.ɵɵtwoWayProperty("renameValue", ctx_r1.renameValue);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 45);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Conditional_8_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(5); return i0.ɵɵresetView(ctx_r1.showExtractMode()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(5);
    i0.ɵɵclassProp("active", ctx_r1.detailMode() === "extract");
    i0.ɵɵattribute("aria-selected", ctx_r1.detailMode() === "extract");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 4, "files.detail.extractTab"));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 38);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵelementStart(2, "button", 45);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r1.detailMode.set("preview")); });
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 45);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r1.showMetaMode()); });
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(8, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Conditional_8_Template, 3, 6, "button", 46);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 10, "files.detail.tabsAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.detailMode() === "preview");
    i0.ɵɵattribute("aria-selected", ctx_r1.detailMode() === "preview");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 12, "files.detail.previewTab"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.detailMode() === "meta");
    i0.ɵɵattribute("aria-selected", ctx_r1.detailMode() === "meta");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 14, "files.detail.metaTab"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.hasExtract() ? 8 : -1);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 39);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const pf_r18 = i0.ɵɵnextContext();
    i0.ɵɵproperty("title", pf_r18.name);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(pf_r18.name);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r19 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 51);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_1_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r19); const ctx_r1 = i0.ɵɵnextContext(5); return i0.ɵɵresetView(ctx_r1.previewFullscreen.set(true)); });
    i0.ɵɵelement(3, "ph-icon", 52);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 3, "files.preview.fullscreen"))("aria-label", i0.ɵɵpipeBind1(2, 5, "files.preview.fullscreen"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_3_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 53);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const src_r20 = ctx;
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "files.detail.descriptionSource." + src_r20 + "Hint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "files.detail.descriptionSource." + src_r20));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 50)(1, "h4");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵconditionalCreate(4, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_3_Conditional_4_Template, 4, 6, "span", 53);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "p");
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_9_0;
    const ctx_r1 = i0.ɵɵnextContext(5);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 3, "files.detail.description"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_9_0 = ctx_r1.selectedMeta().descriptionSource) ? 4 : -1, tmp_9_0);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.selectedMeta().description);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 47);
    i0.ɵɵconditionalCreate(1, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_1_Template, 4, 7, "button", 48);
    i0.ɵɵelement(2, "app-file-preview", 49);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Conditional_3_Template, 7, 5, "div", 50);
} if (rf & 2) {
    let tmp_9_0;
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance();
    i0.ɵɵconditional(!ctx_r1.previewLoading() && ctx_r1.previewError() === null && ctx_r1.previewKind() !== "unknown" ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("preview", ctx_r1.previewModel());
    i0.ɵɵadvance();
    i0.ɵɵconditional(((tmp_9_0 = ctx_r1.selectedMeta()) == null ? null : tmp_9_0.description) ? 3 : -1);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r21 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-file-extract-view", 54);
    i0.ɵɵlistener("more", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_10_Template_app_file_extract_view_more_0_listener() { i0.ɵɵrestoreView(_r21); const pf_r18 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.moreChunks(pf_r18)); })("retry", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_10_Template_app_file_extract_view_retry_0_listener() { i0.ɵɵrestoreView(_r21); const pf_r18 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.loadExtract(pf_r18)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵproperty("extract", ctx_r1.extract())("loading", ctx_r1.extractLoading())("error", ctx_r1.extractError());
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r22 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-file-meta-editor", 55);
    i0.ɵɵlistener("save", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_11_Template_app_file_meta_editor_save_0_listener() { i0.ɵɵrestoreView(_r22); const pf_r18 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.saveMeta(pf_r18)); })("cancel", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_11_Template_app_file_meta_editor_cancel_0_listener() { i0.ɵɵrestoreView(_r22); const ctx_r1 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r1.cancelMeta()); })("retryEmbedding", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_11_Template_app_file_meta_editor_retryEmbedding_0_listener() { i0.ɵɵrestoreView(_r22); const pf_r18 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.requeueEmbedding(pf_r18)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const pf_r18 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("model", ctx_r1.metaEditModel)("spaceId", ctx_r1.activeSpaceId())("error", ctx_r1.metaError())("saving", ctx_r1.metaSaving())("canRetryEmbedding", pf_r18.embeddingStatus === "failed" || pf_r18.embeddingStatus === "partial")("retryPending", ctx_r1.requeueingPath() === ctx_r1.relPath(pf_r18));
} }
function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 22, 1)(2, "div", 37);
    i0.ɵɵconditionalCreate(3, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_3_Template, 9, 16, "div", 38)(4, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_4_Template, 2, 2, "span", 39);
    i0.ɵɵelementStart(5, "button", 40);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.closePreview()); });
    i0.ɵɵelement(7, "ph-icon", 41);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 42);
    i0.ɵɵconditionalCreate(9, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_9_Template, 4, 3)(10, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_10_Template, 1, 3, "app-file-extract-view", 43)(11, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Conditional_11_Template, 1, 6, "app-file-meta-editor", 44);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.embeddedSpaceId ? 3 : 4);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(6, 4, "files.closePreviewAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.detailMode() === "preview" || !ctx_r1.embeddedSpaceId ? 9 : ctx_r1.detailMode() === "extract" ? 10 : 11);
} }
function FileManagerComponent_Conditional_2_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 10)(1, "div", 11);
    i0.ɵɵrepeaterCreate(2, FileManagerComponent_Conditional_2_Conditional_1_For_3_Template, 3, 4, null, null, _forTrack1);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(4, FileManagerComponent_Conditional_2_Conditional_1_Conditional_4_Template, 3, 3, "button", 12)(5, FileManagerComponent_Conditional_2_Conditional_1_Conditional_5_Template, 10, 13, "form", 13);
    i0.ɵɵelementStart(6, "label", 14);
    i0.ɵɵelement(7, "ph-icon", 15);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementStart(10, "input", 16);
    i0.ɵɵlistener("change", function FileManagerComponent_Conditional_2_Conditional_1_Template_input_change_10_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onFileInput($event)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "button", 17);
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_2_Conditional_1_Template_button_click_11_listener() { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.toggleSidebar()); });
    i0.ɵɵconditionalCreate(12, FileManagerComponent_Conditional_2_Conditional_1_Conditional_12_Template, 3, 4)(13, FileManagerComponent_Conditional_2_Conditional_1_Conditional_13_Template, 3, 4);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(14, FileManagerComponent_Conditional_2_Conditional_1_Conditional_14_Template, 1, 2, "app-upload-queue", 18);
    i0.ɵɵelementStart(15, "div", 19);
    i0.ɵɵconditionalCreate(16, FileManagerComponent_Conditional_2_Conditional_1_Conditional_16_Template, 2, 4, "div", 20);
    i0.ɵɵelementStart(17, "div", 21);
    i0.ɵɵconditionalCreate(18, FileManagerComponent_Conditional_2_Conditional_1_Conditional_18_Template, 2, 0, "div", 2)(19, FileManagerComponent_Conditional_2_Conditional_1_Conditional_19_Template, 3, 7);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(20, FileManagerComponent_Conditional_2_Conditional_1_Conditional_20_Template, 12, 6, "div", 22);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_12_0;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.breadcrumbs());
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!ctx_r1.showNewFolder() ? 4 : 5);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(9, 10, "files.upload"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(ctx_r1.sidebarOpen() ? 12 : 13);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.uploads().length ? 14 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.sidebarOpen() ? 16 : -1);
    i0.ɵɵadvance();
    i0.ɵɵclassProp("drag-over", ctx_r1.dragOver());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.loading() ? 18 : 19);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_12_0 = ctx_r1.previewFile()) ? 20 : -1, tmp_12_0);
} }
function FileManagerComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, FileManagerComponent_Conditional_2_Conditional_0_Template, 3, 0, "div", 7);
    i0.ɵɵconditionalCreate(1, FileManagerComponent_Conditional_2_Conditional_1_Template, 21, 12);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(!ctx_r1.embeddedSpaceId ? 0 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeSpaceId() ? 1 : -1);
} }
function FileManagerComponent_ng_template_3_For_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 59);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.tree.loading"));
} }
function FileManagerComponent_ng_template_3_For_1_Conditional_7_ng_container_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementContainer(0);
} }
function FileManagerComponent_ng_template_3_For_1_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 60);
    i0.ɵɵtemplate(1, FileManagerComponent_ng_template_3_For_1_Conditional_7_ng_container_1_Template, 1, 0, "ng-container", 33);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const node_r24 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵnextContext(2);
    const treeTemplate_r13 = i0.ɵɵreference(4);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngTemplateOutlet", treeTemplate_r13)("ngTemplateOutletContext", i0.ɵɵpureFunction1(2, _c1, node_r24.children));
} }
function FileManagerComponent_ng_template_3_For_1_Template(rf, ctx) { if (rf & 1) {
    const _r23 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 56);
    i0.ɵɵlistener("click", function FileManagerComponent_ng_template_3_For_1_Template_div_click_0_listener() { const node_r24 = i0.ɵɵrestoreView(_r23).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onTreeClick(node_r24)); });
    i0.ɵɵelementStart(1, "span", 57);
    i0.ɵɵelement(2, "ph-icon", 31);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span");
    i0.ɵɵelement(4, "ph-icon", 58);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(6, FileManagerComponent_ng_template_3_For_1_Conditional_6_Template, 3, 3, "div", 59);
    i0.ɵɵconditionalCreate(7, FileManagerComponent_ng_template_3_For_1_Conditional_7_Template, 2, 4, "div", 60);
} if (rf & 2) {
    const node_r24 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r1.currentPath() === node_r24.path);
    i0.ɵɵadvance();
    i0.ɵɵclassProp("expanded", node_r24.expanded);
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 10);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", node_r24.name);
    i0.ɵɵadvance();
    i0.ɵɵconditional(node_r24.loading ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(node_r24.expanded && node_r24.children ? 7 : -1);
} }
function FileManagerComponent_ng_template_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵrepeaterCreate(0, FileManagerComponent_ng_template_3_For_1_Template, 8, 9, null, null, _forTrack1);
} if (rf & 2) {
    const nodes_r25 = ctx.$implicit;
    i0.ɵɵrepeater(nodes_r25);
} }
function FileManagerComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r26 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵelementStart(2, "div", 61)(3, "span", 39);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 40);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵlistener("click", function FileManagerComponent_Conditional_5_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r26); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.previewFullscreen.set(false)); });
    i0.ɵɵelement(7, "ph-icon", 41);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 62);
    i0.ɵɵelement(9, "app-file-preview", 49);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const pf_r27 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(1, 6, "files.preview.fullscreenDialog"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("title", pf_r27.name);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(pf_r27.name);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(6, 8, "files.preview.exitFullscreen"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("preview", ctx_r1.previewModel());
} }
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('plaintext', plaintext);
/** A parsed spreadsheet preview: the first sheet as a capped grid, with a note when truncated. */
const XLSX_MAX_ROWS = 200;
const XLSX_MAX_COLS = 40;
const TEXT_EXTS = new Set([
    '.txt', '.json', '.yaml', '.yml', '.ts', '.js', '.py', '.sh',
    '.csv', '.xml', '.html', '.css', '.log', '.env', '.toml',
]);
// Markdown renders formatted (via marked) rather than as highlighted source.
const MARKDOWN_EXTS = new Set(['.md', '.markdown']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const PDF_EXTS = new Set(['.pdf']);
// exceljs reads the OOXML formats (.xlsx/.xlsm), not the legacy binary .xls — don't promise what won't parse.
const XLSX_EXTS = new Set(['.xlsx', '.xlsm']);
const EXT_LANG = {
    '.js': 'javascript', '.ts': 'typescript', '.json': 'json',
    '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.html': 'xml',
    '.css': 'css', '.md': 'markdown', '.py': 'python',
    '.sh': 'bash', '.bash': 'bash',
};
function extOf(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i).toLowerCase() : '';
}
function previewKind(name) {
    const ext = extOf(name);
    if (MARKDOWN_EXTS.has(ext))
        return 'markdown';
    if (TEXT_EXTS.has(ext))
        return 'text';
    if (IMAGE_EXTS.has(ext))
        return 'image';
    if (PDF_EXTS.has(ext))
        return 'pdf';
    if (XLSX_EXTS.has(ext))
        return 'xlsx';
    return 'unknown';
}
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}
/** Coerce an exceljs cell value (string | number | Date | formula | richText | hyperlink | error) to display text. */
function xlsxCellText(v) {
    if (v == null)
        return '';
    if (v instanceof Date)
        return v.toLocaleDateString();
    if (typeof v === 'object') {
        const o = v;
        if (Array.isArray(o['richText']))
            return o['richText'].map(t => t.text ?? '').join('');
        if ('result' in o)
            return o['result'] == null ? '' : String(o['result']); // formula → computed result
        if ('text' in o)
            return String(o['text']); // hyperlink label
        if ('error' in o)
            return String(o['error']);
        return '';
    }
    return String(v);
}
export class FileManagerComponent {
    constructor() {
        this.filesApi = inject(FilesApi);
        this.spacesApi = inject(SpacesApi);
        this.auth = inject(AuthService);
        this.sanitizer = inject(DomSanitizer);
        this.route = inject(ActivatedRoute);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.markdown = inject(MarkdownRenderService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.detailPaneRef = viewChild('detailPane', ...(ngDevMode ? [{ debugName: "detailPaneRef" }] : /* istanbul ignore next */ []));
        // Brain-provided (only present when embedded in the Brain). Optional so the standalone /files route,
        // where the Brain injector isn't in the tree, still constructs — there the meta edit mode is hidden.
        this.picker = inject(EntityRefPicker, { optional: true });
        /** Optional for the same reason as `picker`: this component also runs outside the Brain shell. */
        this.store = inject(BrainStore, { optional: true });
        /** When set (embedded in brain), skip space loading and use this space. */
        this.embeddedSpaceId = '';
        /** Fires whenever the file set in this space changes (delete or upload complete) so the host can refresh counts. */
        this.filesChanged = new EventEmitter();
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.activeSpaceId = signal('', ...(ngDevMode ? [{ debugName: "activeSpaceId" }] : /* istanbul ignore next */ []));
        this.currentPath = signal('/', ...(ngDevMode ? [{ debugName: "currentPath" }] : /* istanbul ignore next */ []));
        this.entries = signal([], ...(ngDevMode ? [{ debugName: "entries" }] : /* istanbul ignore next */ []));
        // ── Column sort (restores what #421 dropped) ───────────────────────────────
        // Sorted CLIENT-side, which is honest here and only here: `listFiles` returns a whole directory in one
        // response (no limit/skip), so this reorders the complete set. The paginated record tabs must sort
        // server-side for exactly the opposite reason — there, a client sort would reorder one page and lie
        // about the rest.
        this.sortField = signal('', ...(ngDevMode ? [{ debugName: "sortField" }] : /* istanbul ignore next */ []));
        this.sortDir = signal('asc', ...(ngDevMode ? [{ debugName: "sortDir" }] : /* istanbul ignore next */ []));
        /**
         * Folders always come first — this is a file explorer, and interleaving directories with files by size
         * or date makes the tree unnavigable. The chosen column orders WITHIN each group.
         */
        /**
         * The listing rows, with the three per-row questions answered before they leave this page.
         *
         * `canRequeue`, "is this row renaming" and "is a re-embed already in flight for it" were evaluated inside
         * the table's loop, which meant the table needed the requeue policy, the rename state and `relPath` just to
         * decide which buttons to draw. Answering them here is what kept the extracted component to nine bindings
         * instead of sixteen.
         */
        this.fileRows = computed(() => {
            const renaming = this.renamingEntry();
            const requeueing = this.requeueingPath();
            return this.sortedEntries().map(entry => ({
                entry,
                renaming: renaming === entry.name,
                requeueing: requeueing === this.relPath(entry),
                canRequeue: this.canRequeue(entry),
            }));
        }, ...(ngDevMode ? [{ debugName: "fileRows" }] : /* istanbul ignore next */ []));
        this.sortedEntries = computed(() => {
            const list = this.entries();
            const field = this.sortField();
            if (!field)
                return list;
            const sign = this.sortDir() === 'asc' ? 1 : -1;
            const key = (e) => {
                switch (field) {
                    case 'size': return e.size ?? 0;
                    case 'modified': return e.modified ?? '';
                    case 'status': return e.embeddingStatus ?? '';
                    default: return e.name.toLowerCase();
                }
            };
            return [...list].sort((a, b) => {
                if (a.isDirectory !== b.isDirectory)
                    return a.isDirectory ? -1 : 1;
                const ka = key(a), kb = key(b);
                if (ka === kb)
                    return a.name.localeCompare(b.name); // stable, human tiebreak
                return (typeof ka === 'number' && typeof kb === 'number')
                    ? (ka - kb) * sign
                    : String(ka).localeCompare(String(kb)) * sign;
            });
        }, ...(ngDevMode ? [{ debugName: "sortedEntries" }] : /* istanbul ignore next */ []));
        /**
         * True only while a load that has **nothing to show** is in flight — the state that replaces the view.
         *
         * A REFRESH must never enter it. It used to: `loadDir` set this on every call, including the 4-second progress
         * poll, so watching an ingest meant the whole file table was unmounted and replaced by a spinner every four
         * seconds. A reporting operator, verbatim: *"i only want to see progress bars move while waiting and not a
         * screenflickering."* They were right about the mechanism too — the view treated "a refetch is in flight" as
         * "we have no data yet".
         *
         * The rule, worth stating as a rule: **a refresh must never re-enter the empty state a first load uses.**
         */
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** True while a reload of the SAME directory is in flight over rows already on screen. Never unmounts them. */
        this.refreshing = signal(false, ...(ngDevMode ? [{ debugName: "refreshing" }] : /* istanbul ignore next */ []));
        /** Set when a background refresh failed, so stale rows are not passed off as current. Cleared on success. */
        this.refreshFailed = signal(false, ...(ngDevMode ? [{ debugName: "refreshFailed" }] : /* istanbul ignore next */ []));
        /** Failure reason for the directory listing; null when it loaded (U3). */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.loadingSpaces = signal(true, ...(ngDevMode ? [{ debugName: "loadingSpaces" }] : /* istanbul ignore next */ []));
        /** Null until the space list failed to load — else the page renders with no selector and no body. */
        this.spacesError = signal(null, ...(ngDevMode ? [{ debugName: "spacesError" }] : /* istanbul ignore next */ []));
        // ── Upload queue (U12) ─────────────────────────────────────────────────────
        // One row per file, each with its own status/percent. Files upload one at a
        // time; the rest sit `queued`. A failed row can be retried, and a queued or
        // in-flight row can be cancelled (the latter aborts the in-flight chunk).
        this.uploads = signal([], ...(ngDevMode ? [{ debugName: "uploads" }] : /* istanbul ignore next */ []));
        /** Subscriptions for active uploads, by item id — unsubscribing cancels. */
        this.uploadSubs = new Map();
        this.uploadSeq = 0;
        /** True while an item is mid-flight — serialises the queue. */
        this.processing = false;
        this.dragOver = signal(false, ...(ngDevMode ? [{ debugName: "dragOver" }] : /* istanbul ignore next */ []));
        this.showNewFolder = signal(false, ...(ngDevMode ? [{ debugName: "showNewFolder" }] : /* istanbul ignore next */ []));
        this.newFolderName = '';
        this.renamingEntry = signal('', ...(ngDevMode ? [{ debugName: "renamingEntry" }] : /* istanbul ignore next */ []));
        this.renameValue = '';
        this.breadcrumbs = signal([{ label: 'root', path: '/' }], ...(ngDevMode ? [{ debugName: "breadcrumbs" }] : /* istanbul ignore next */ []));
        // ── Preview state ────────────────────────────────────────────────────────
        this.previewFile = signal(null, ...(ngDevMode ? [{ debugName: "previewFile" }] : /* istanbul ignore next */ []));
        this.previewKind = signal('unknown', ...(ngDevMode ? [{ debugName: "previewKind" }] : /* istanbul ignore next */ []));
        // A string for highlighted source (Angular sanitizes on bind); a trusted SafeHtml for rendered markdown
        // (we sanitize with DOMPurify first, because it may contain inlined mermaid SVG that Angular would strip).
        this.previewHtml = signal('', ...(ngDevMode ? [{ debugName: "previewHtml" }] : /* istanbul ignore next */ []));
        this.previewLoading = signal(false, ...(ngDevMode ? [{ debugName: "previewLoading" }] : /* istanbul ignore next */ []));
        this.previewMediaUrl = signal('', ...(ngDevMode ? [{ debugName: "previewMediaUrl" }] : /* istanbul ignore next */ []));
        this.previewSafeUrl = signal('', ...(ngDevMode ? [{ debugName: "previewSafeUrl" }] : /* istanbul ignore next */ []));
        /** Set when preview fetch fails (e.g. auth/404) so we show a reason, not a blank pane. */
        this.previewError = signal(null, ...(ngDevMode ? [{ debugName: "previewError" }] : /* istanbul ignore next */ []));
        /** Parsed spreadsheet preview (first sheet, capped) when previewKind is 'xlsx'. */
        this.previewTable = signal(null, ...(ngDevMode ? [{ debugName: "previewTable" }] : /* istanbul ignore next */ []));
        /**
         * The eight preview signals as the one object the renderer takes.
         *
         * Computed here rather than passed as eight inputs: the states are mutually exclusive and saying so once, in
         * a place that can see all of them, is what stops the child re-deriving "am I loading or erroring" from
         * flags it receives separately. Null when nothing is open, which is the child's own empty case.
         */
        this.previewModel = computed(() => {
            const file = this.previewFile();
            if (!file)
                return null;
            return {
                file,
                loading: this.previewLoading(),
                error: this.previewError(),
                kind: this.previewKind(),
                html: this.previewHtml(),
                mediaUrl: this.previewMediaUrl(),
                safeUrl: this.previewSafeUrl(),
                table: this.previewTable(),
            };
        }, ...(ngDevMode ? [{ debugName: "previewModel" }] : /* istanbul ignore next */ []));
        /** Blob object URL backing the current image/PDF preview; revoked on close/next. */
        this._previewObjectUrl = null;
        /** True while the preview is expanded to a full-screen overlay (Escape collapses it first). */
        this.previewFullscreen = signal(false, ...(ngDevMode ? [{ debugName: "previewFullscreen" }] : /* istanbul ignore next */ []));
        // ── Docked detail-pane state (preview+description ⇄ file-meta record) ──────
        /** Which face of the detail pane is showing. Meta editing is only reachable when embedded. */
        this.detailMode = signal('preview', ...(ngDevMode ? [{ debugName: "detailMode" }] : /* istanbul ignore next */ []));
        /** The FileMeta record for the open file (its description + links); null until the fetch lands. */
        this.selectedMeta = signal(null, ...(ngDevMode ? [{ debugName: "selectedMeta" }] : /* istanbul ignore next */ []));
        // ── Extract face: what retrieval actually sees ─────────────────────────────
        this.extract = signal(null, ...(ngDevMode ? [{ debugName: "extract" }] : /* istanbul ignore next */ []));
        this.extractLoading = signal(false, ...(ngDevMode ? [{ debugName: "extractLoading" }] : /* istanbul ignore next */ []));
        this.extractError = signal(null, ...(ngDevMode ? [{ debugName: "extractError" }] : /* istanbul ignore next */ []));
        /**
         * A chunk's position in a recording, as mm:ss or mm:ss-mm:ss.
         *
         * Audio and video chunks carry `chunkOffsetMs`; documents do not, and get their heading instead. Rendered
         * here rather than server-side because it is a display choice, and the raw milliseconds are what an API
         * consumer wants.
         */
        /** Edit model for the meta form — same shape the Brain File Meta tab uses (entityIds is comma-joined
         *  for app-entity-ref-field; memory/chrono are id arrays). Mutated in place by the ref-field widgets. */
        /**
         * The edit model, held as a PLAIN object because the reference widgets write into it.
         *
         * Typed by the editor that renders it, so there is one definition of the shape rather than a structural
         * literal here and an interface there — the two drifting is how `entityIds` would quietly become an array
         * on one side.
         */
        this.metaEditModel = { description: '', tags: [], entityIds: '', memoryIds: [], chronoIds: [] };
        this.metaSaving = signal(false, ...(ngDevMode ? [{ debugName: "metaSaving" }] : /* istanbul ignore next */ []));
        this.metaError = signal(null, ...(ngDevMode ? [{ debugName: "metaError" }] : /* istanbul ignore next */ []));
        /**
         * The path whose re-embed request is in flight, or '' when none is.
         *
         * A path rather than a boolean because the action is now on every row as well as in the detail pane: one
         * shared boolean would grey out every row's button while a single file was being re-queued, which reads as
         * "the whole list is busy".
         */
        this.requeueingPath = signal('', ...(ngDevMode ? [{ debugName: "requeueingPath" }] : /* istanbul ignore next */ []));
        // ── Tree sidebar state ───────────────────────────────────────────────────
        this.sidebarOpen = signal(localStorage.getItem('ythril.sidebar') !== 'closed', ...(ngDevMode ? [{ debugName: "sidebarOpen" }] : /* istanbul ignore next */ []));
        this.treeRoot = signal([], ...(ngDevMode ? [{ debugName: "treeRoot" }] : /* istanbul ignore next */ []));
        this._keyHandler = (e) => this.onPreviewKey(e);
        /**
         * The path `entries()` currently describes, or null before the first successful listing.
         *
         * This is what decides load-vs-refresh, rather than a flag at each call site. `loadDir` has six callers (the
         * navigation effect, the poll, the retry button, and three post-mutation reloads) and asking each to classify
         * itself is how five get it right and one does not — the exact shape of the retention bug fixed in #632.
         *
         * Comparing the PATH is also the only correct rule: rows from the directory you are leaving must not be shown
         * under the name of the one you are entering, so a navigation is always a foreground load.
         */
        this.loadedPath = null;
        this.progressPoll = null;
        /**
         * The shared rule, exposed for this page's template.
         *
         * A template can only call a member, so the import needs a name on the class — but it is the SAME function
         * the preview uses, not a second copy of it. Extracting the preview and leaving four lines of arithmetic
         * behind in both places is precisely the shape this codebase keeps paying for.
         */
        this.formatSize = formatSize;
        /**
         * Live refresh while a file is processing.
         *
         * The shell already opens an SSE stream and bumps `liveRefreshTick` on a `file.*` event — that is how
         * every record tab stays current. This list never read it. The status pill and the processing stage
         * bar are both built from the DIRECTORY LISTING, so with no reload they sat at whatever they were
         * when the folder was first opened: a file could finish and still read "Embedding" until you clicked
         * away and back. Nothing errored, which is why it looked like a slow pipeline rather than a stale view.
         *
         * `untracked` around the reload so the effect depends on the tick ALONE — `loadDir` reads
         * `currentPath()`, and tracking that would reload the directory on every navigation as well.
         */
        let firstTick = true;
        effect(() => {
            this.store?.liveRefreshTick();
            if (firstTick) {
                firstTick = false;
                return;
            }
            untracked(() => this.reloadDir());
        });
    }
    /** desc -> asc -> unsorted, matching the record tabs' shared header primitive. */
    setSort(field) {
        const f = field;
        if (this.sortField() !== f) {
            this.sortField.set(f);
            this.sortDir.set('asc');
            return;
        }
        if (this.sortDir() === 'asc') {
            this.sortDir.set('desc');
            return;
        }
        this.sortField.set(''); // third click clears back to the server's own order
        this.sortDir.set('asc');
    }
    /**
     * Whether this file HAS an extract to show.
     *
     * Offered only for a file that went through the pipeline: chunks, a converted sidecar, or a media type
     * that produces either. A tab that is always present and always says "nothing here" teaches people to
     * ignore it, which is the same lesson as a health dot that is always red.
     */
    hasExtract() {
        const m = this.selectedMeta();
        if (!m)
            return false;
        return (m.chunkCount ?? 0) > 0 || !!m.convertedFileId || !!m.mediaType;
    }
    /** Switch to the Extract face, fetching the first time it is opened rather than on every file open. */
    showExtractMode() {
        this.detailMode.set('extract');
        const pf = this.previewFile();
        if (pf && !this.extract() && !this.extractLoading())
            this.loadExtract(pf);
    }
    loadExtract(entry, skip = 0) {
        this.extractLoading.set(true);
        this.extractError.set(null);
        this.filesApi.getFileExtract(this.activeSpaceId(), this.relPath(entry), 100, skip).subscribe({
            next: (x) => {
                // Appended, not replaced, when paging: "show more" on a diagnostic must not throw away what the
                // reader has already scrolled through.
                const prev = skip > 0 ? this.extract() : null;
                this.extract.set(prev ? { ...x, chunks: [...prev.chunks, ...x.chunks], skip: prev.skip } : x);
                this.extractLoading.set(false);
            },
            error: (e) => { this.extractError.set(httpErrorReason(e)); this.extractLoading.set(false); },
        });
    }
    /** Next page of chunks. `skip` counts what is already on screen, not the last response's own skip. */
    moreChunks(entry) {
        const shown = this.extract()?.chunks.length ?? 0;
        this.loadExtract(entry, shown);
    }
    ngOnInit() {
        if (this.embeddedSpaceId) {
            // Embedded in brain — use the provided space directly
            this.loadingSpaces.set(false);
            this.selectSpace(this.embeddedSpaceId);
            return;
        }
        this.loadSpaces();
    }
    /** Public so the error state's Retry re-runs the space list without a page reload. */
    retrySpaces() {
        this.loadSpaces();
    }
    loadSpaces() {
        const requestedSpace = this.route.snapshot.queryParamMap.get('space') ?? '';
        this.loadingSpaces.set(true);
        this.spacesError.set(null);
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces }) => {
                this.spaces.set(spaces);
                this.loadingSpaces.set(false);
                if (spaces.length > 0) {
                    const target = requestedSpace
                        ? (spaces.find(s => s.id === requestedSpace) ?? spaces[0])
                        : spaces[0];
                    this.selectSpace(target.id);
                }
            },
            error: (err) => { this.spacesError.set(httpErrorReason(err)); this.loadingSpaces.set(false); },
        });
    }
    selectSpace(id) {
        this.activeSpaceId.set(id);
        this.currentPath.set('/');
        this.updateBreadcrumbs('/');
        this.loadDir('/');
        this.loadTreeRoot();
    }
    navigate(path) {
        this.currentPath.set(path);
        this.updateBreadcrumbs(path);
        this.loadDir(path);
    }
    open(entry) {
        if (entry.isDirectory) {
            const next = this.join(this.currentPath(), entry.name);
            this.navigate(next);
        }
        else {
            this.openPreview(entry);
        }
    }
    loadDir(path) {
        // A refresh only when there is something on screen that this listing will replace in place.
        const isRefresh = this.loadedPath === path && this.entries().length > 0 && this.loadError() === null;
        if (isRefresh)
            this.refreshing.set(true);
        else {
            this.loading.set(true);
            this.loadError.set(null);
        }
        this.filesApi.listFiles(this.activeSpaceId(), path).subscribe({
            next: ({ entries }) => {
                this.entries.set(entries);
                this.loadedPath = path;
                this.loadError.set(null);
                this.refreshFailed.set(false);
                this.loading.set(false);
                this.refreshing.set(false);
                this.syncProgressPolling();
            },
            error: (e) => {
                if (isRefresh) {
                    // A failed POLL must not throw away good rows either — that is the same defect in another dress, and
                    // a transient failure during an ingest is exactly when it would happen. Keep the rows, mark them as
                    // not-current, and let the next tick clear it.
                    this.refreshFailed.set(true);
                    this.refreshing.set(false);
                    return;
                }
                // A failed first listing must not fall through to the "empty folder" state (U3).
                this.loadError.set(httpErrorReason(e));
                this.loading.set(false);
            },
        });
    }
    /** Re-load the current directory — bound to the error state's Retry button. */
    reloadDir() { this.loadDir(this.currentPath()); }
    // ── The processing stage bar has to ADVANCE (B.5) ──────────────────────────
    //
    // The live-refresh tick above covers status CHANGES: the shell's SSE stream fires on `file.*`, which is
    // a brain write, and a file finishing is one. Per-page progress is not. `touchJobProgress` writes a
    // heartbeat on the media job record as each page lands and publishes nothing — deliberately, since
    // fanning one event per page per file out to every open tab is not a trade worth making.
    //
    // So the stage bar was drawn once, from the listing that was current when the folder was opened, and sat
    // there: "page 12 of 40" for the whole conversion. Nothing errored, which is why it read as a wedged
    // pipeline rather than a stale view — the reporter took it for the former.
    //
    // A poll is the honest mechanism for a value with no event behind it, and this one is bounded on both
    // sides: it exists only while a row on screen is actually in flight, and it skips a tick when the tab is
    // hidden. An idle folder polls nothing.
    /** 4 s: progress moves a page at a time, so faster only costs requests. `progressAt` shows staleness. */
    static { this.PROGRESS_POLL_MS = 4_000; }
    /** True while any row on screen is still being processed — the only condition that justifies polling. */
    anyInFlight() {
        return this.entries().some(e => !!e.progress || e.embeddingStatus === 'pending' || e.embeddingStatus === 'processing');
    }
    /** Start or stop the poll to match what is on screen. Called after every listing load. */
    syncProgressPolling() {
        if (this.anyInFlight()) {
            if (this.progressPoll !== null)
                return; // already running — never stack timers
            this.progressPoll = setInterval(() => {
                // A background tab does not need a stage bar. Skipping the tick rather than stopping the timer
                // means it resumes the moment the tab is looked at again, with no visibility listener to leak.
                if (typeof document !== 'undefined' && document.hidden)
                    return;
                this.reloadDir();
                // The open file's own record goes stale in exactly the same way: the description a document gets
                // is written when its job finishes, so a detail pane opened during processing showed none until
                // the file was closed and reopened.
                const open = this.previewFile();
                if (open)
                    this.loadSelectedMeta(open);
            }, FileManagerComponent.PROGRESS_POLL_MS);
        }
        else {
            this.stopProgressPolling();
        }
    }
    stopProgressPolling() {
        if (this.progressPoll !== null) {
            clearInterval(this.progressPoll);
            this.progressPoll = null;
        }
    }
    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver.set(true);
    }
    onDragLeave(event) {
        // Only clear when leaving the component boundary
        if (!event.currentTarget.contains(event.relatedTarget)) {
            this.dragOver.set(false);
        }
    }
    onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver.set(false);
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0)
            return;
        void this.enqueueUploads(files);
    }
    onFileInput(event) {
        const input = event.target;
        const files = input.files;
        if (!files || files.length === 0)
            return;
        void this.enqueueUploads(files);
        input.value = '';
    }
    // ── Upload queue (U12) ──────────────────────────────────────────────────────
    /**
     * Add the picked/dropped files as queued rows and kick the processor.
     *
     * Uploading over an existing path is a REPLACE, and it takes the derived records with it: the
     * conversion chunks, the converted Markdown, the extracted images, and any description generated from
     * them are all dropped and rebuilt. That is the correct behaviour — stale chunks for a document that
     * no longer exists would be worse — but it happened silently, and a drag-and-drop onto the wrong
     * folder is an easy accident with no undo. Reported against 2.1.1.
     *
     * Asked once for the whole batch rather than once per file: a drop of twenty files where three
     * collide should be one question, not three.
     */
    async enqueueUploads(files) {
        const picked = Array.from(files);
        const existing = new Set(this.entries().filter(e => e.isFile).map(e => e.name));
        const clashes = picked.filter(f => existing.has(f.name)).map(f => f.name);
        if (clashes.length > 0) {
            const ok = await this.confirmDialog.confirm({
                title: this.transloco.translate('files.confirm.overwriteTitle'),
                message: this.transloco.translate(clashes.length === 1 ? 'files.confirm.overwriteOne' : 'files.confirm.overwriteMany', { name: clashes[0], count: clashes.length, names: clashes.slice(0, 5).join(', ') }),
                confirmLabel: this.transloco.translate('files.confirm.overwriteConfirm'),
                danger: true,
            });
            if (!ok)
                return;
        }
        const items = picked.map(file => ({
            id: ++this.uploadSeq,
            file,
            name: file.name,
            status: 'queued',
            percent: 0,
        }));
        this.uploads.update(u => [...u, ...items]);
        this.processQueue();
    }
    /** Immutably patch one upload row so the OnPush view re-renders. */
    patchUpload(id, patch) {
        this.uploads.update(list => list.map(u => (u.id === id ? { ...u, ...patch } : u)));
    }
    /** Start the next queued upload, unless one is already in flight. */
    processQueue() {
        if (this.processing)
            return;
        const next = this.uploads().find(u => u.status === 'queued');
        if (!next)
            return;
        this.processing = true;
        this.startUpload(next);
    }
    startUpload(item) {
        this.patchUpload(item.id, { status: 'uploading', percent: 0, error: undefined });
        const sub = this.filesApi
            .uploadFileChunked(this.activeSpaceId(), this.currentPath(), item.file)
            .subscribe({
            next: (progress) => this.patchUpload(item.id, { percent: progress.percent }),
            error: (err) => {
                this.uploadSubs.delete(item.id);
                this.patchUpload(item.id, { status: 'failed', error: httpErrorReason(err) || undefined });
                this.processing = false;
                this.processQueue();
            },
            complete: () => {
                this.uploadSubs.delete(item.id);
                this.patchUpload(item.id, { status: 'done', percent: 100 });
                this.processing = false;
                // Show the freshly uploaded file straight away, and let the host refresh its record counts.
                this.loadDir(this.currentPath());
                this.filesChanged.emit();
                this.processQueue();
            },
        });
        this.uploadSubs.set(item.id, sub);
    }
    /** Re-queue a failed upload. */
    retryUpload(item) {
        if (item.status !== 'failed')
            return;
        this.patchUpload(item.id, { status: 'queued', percent: 0, error: undefined });
        this.processQueue();
    }
    /**
     * Cancel a queued or in-flight upload. Unsubscribing tears down the cold
     * upload observable, which aborts the in-flight chunk request; the row is
     * removed and the queue advances.
     */
    cancelUpload(item) {
        const wasUploading = item.status === 'uploading';
        const sub = this.uploadSubs.get(item.id);
        if (sub) {
            sub.unsubscribe();
            this.uploadSubs.delete(item.id);
        }
        this.uploads.update(list => list.filter(u => u.id !== item.id));
        if (wasUploading) {
            this.processing = false;
            this.processQueue();
        }
    }
    /** Remove a finished (done/failed) row from the panel. */
    dismissUpload(item) {
        this.uploads.update(list => list.filter(u => u.id !== item.id));
    }
    hasFinishedUploads() {
        return this.uploads().some(u => u.status === 'done' || u.status === 'failed');
    }
    /** Clear all finished rows, leaving queued/in-flight ones. */
    clearFinishedUploads() {
        this.uploads.update(list => list.filter(u => u.status === 'queued' || u.status === 'uploading'));
    }
    createFolder() {
        if (!this.newFolderName.trim())
            return;
        const path = this.join(this.currentPath(), this.newFolderName.trim());
        this.filesApi.createDir(this.activeSpaceId(), path).subscribe({
            next: () => {
                this.newFolderName = '';
                this.showNewFolder.set(false);
                this.loadDir(this.currentPath());
                this.loadTreeRoot();
            },
            error: () => this.toast.error(this.transloco.translate('files.error.createFolderFailed')),
        });
    }
    startRename(entry) {
        this.renamingEntry.set(entry.name);
        this.renameValue = entry.name;
    }
    confirmRename(entry) {
        const from = this.join(this.currentPath(), entry.name);
        const parentDir = this.currentPath();
        const to = this.join(parentDir, this.renameValue.trim());
        this.filesApi.moveFile(this.activeSpaceId(), from, to).subscribe({
            next: () => {
                this.renamingEntry.set('');
                this.loadDir(this.currentPath());
            },
            error: () => this.toast.error(this.transloco.translate('files.error.renameFailed')),
        });
    }
    async deleteEntry(entry) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('files.confirm.deleteFileTitle'),
            message: this.transloco.translate('files.confirm.deleteFile', { name: entry.name }),
            confirmLabel: this.transloco.translate('common.delete'),
            danger: true,
        });
        if (!ok)
            return;
        const path = this.join(this.currentPath(), entry.name);
        this.filesApi.deleteFile(this.activeSpaceId(), path).subscribe({
            next: () => { this.loadDir(this.currentPath()); this.filesChanged.emit(); },
            error: () => this.toast.error(this.transloco.translate('files.error.deleteFailed')),
        });
    }
    /** The file GET URL (no token — auth goes in the fetch header, never the URL). */
    fileApiUrl(entry) {
        return this.filesApi.getFileDownloadUrl(this.activeSpaceId(), this.join(this.currentPath(), entry.name));
    }
    /**
     * Download a file. A plain `<a href download>` can't send the auth header, and
     * the file endpoint no longer honours a `?token=` query param (#134), so fetch
     * the bytes with the token and save them via a temporary blob URL.
     */
    async downloadFile(entry) {
        const token = this.auth.token();
        try {
            const res = await fetch(this.fileApiUrl(entry), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const objUrl = URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = objUrl;
            a.download = entry.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
        }
        catch (e) {
            this.toast.error(`${this.transloco.translate('files.downloadFailed')} ${httpErrorReason(e)}`.trim());
        }
    }
    join(base, name) {
        return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
    }
    updateBreadcrumbs(path) {
        const parts = path.split('/').filter(Boolean);
        const crumbs = [{ label: 'root', path: '/' }];
        let accumulated = '/';
        for (const p of parts) {
            accumulated = accumulated.endsWith('/') ? `${accumulated}${p}` : `${accumulated}/${p}`;
            crumbs.push({ label: p, path: accumulated });
        }
        this.breadcrumbs.set(crumbs);
    }
    // ── Tree sidebar ─────────────────────────────────────────────────────────
    toggleSidebar() {
        const open = !this.sidebarOpen();
        this.sidebarOpen.set(open);
        localStorage.setItem('ythril.sidebar', open ? 'open' : 'closed');
        if (open && this.treeRoot().length === 0)
            this.loadTreeRoot();
    }
    loadTreeRoot() {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        this.filesApi.listFiles(spaceId, '/').subscribe({
            next: ({ entries }) => {
                this.treeRoot.set(entries
                    .filter(e => e.isDirectory)
                    .map(e => ({ name: e.name, path: this.join('/', e.name), expanded: false, loading: false, children: null })));
            },
            error: () => { },
        });
    }
    onTreeClick(node) {
        this.navigate(node.path);
        if (!node.expanded) {
            this.expandTreeNode(node);
        }
        else {
            node.expanded = false;
            this.treeRoot.set([...this.treeRoot()]);
        }
    }
    expandTreeNode(node) {
        if (node.children !== null) {
            node.expanded = true;
            this.treeRoot.set([...this.treeRoot()]);
            return;
        }
        node.loading = true;
        this.treeRoot.set([...this.treeRoot()]);
        this.filesApi.listFiles(this.activeSpaceId(), node.path).subscribe({
            next: ({ entries }) => {
                node.children = entries
                    .filter(e => e.isDirectory)
                    .map(e => ({ name: e.name, path: this.join(node.path, e.name), expanded: false, loading: false, children: null }));
                node.loading = false;
                node.expanded = true;
                this.treeRoot.set([...this.treeRoot()]);
            },
            error: () => {
                node.loading = false;
                this.treeRoot.set([...this.treeRoot()]);
            },
        });
    }
    // ── Preview ──────────────────────────────────────────────────────────────
    openPreview(entry) {
        const kind = previewKind(entry.name);
        this.previewFile.set(entry);
        this.previewKind.set(kind);
        this.previewHtml.set('');
        this.previewError.set(null);
        this.revokePreviewUrl();
        this.previewMediaUrl.set('');
        this.previewSafeUrl.set('');
        this.previewTable.set(null);
        // Selecting a file always shows the preview face first; the meta record loads alongside so the
        // description shows here and the (embedded-only) edit form is ready when the toggle is used.
        this.detailMode.set('preview');
        this.previewFullscreen.set(false);
        // The previous file's extract must not survive into this one — it is fetched lazily, so a stale value
        // here would show one file's chunks under another file's name until the tab was opened again.
        this.extract.set(null);
        this.extractError.set(null);
        this.loadSelectedMeta(entry);
        // Every preview fetch must carry the auth header — the file endpoint requires it,
        // and a browser-native <img src>/<iframe src> can't send one (that regressed image
        // and PDF previews when the ?token= fallback was scoped to SSE-only, #134). So we
        // fetch with the token and hand the view a same-origin blob: object URL instead.
        const url = this.fileApiUrl(entry);
        const token = this.auth.token();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        if (kind === 'text' || kind === 'markdown') {
            this.previewLoading.set(true);
            fetch(url, { headers })
                .then(r => { if (!r.ok)
                throw new Error(`HTTP ${r.status}`); return r.text(); })
                .then(async (text) => {
                if (kind === 'markdown') {
                    // marked → HTML, with any ```mermaid fences rendered to inline SVG; the whole thing is
                    // sanitized with DOMPurify and marked trusted (Angular's own sanitizer would strip the SVG).
                    const html = await this.renderMarkdown(text);
                    // Guard against a fast arrow-key navigation having moved on while mermaid rendered async.
                    if (this.previewFile()?.name !== entry.name)
                        return;
                    this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
                }
                else {
                    const ext = extOf(entry.name);
                    const lang = EXT_LANG[ext] ?? 'plaintext';
                    this.previewHtml.set(hljs.highlight(text, { language: lang }).value);
                }
                this.previewLoading.set(false);
            })
                .catch((e) => { this.previewError.set(httpErrorReason(e)); this.previewLoading.set(false); });
        }
        else if (kind === 'image' || kind === 'pdf') {
            this.previewLoading.set(true);
            fetch(url, { headers })
                .then(r => { if (!r.ok)
                throw new Error(`HTTP ${r.status}`); return r.blob(); })
                .then(blob => {
                const objUrl = URL.createObjectURL(blob);
                this._previewObjectUrl = objUrl;
                if (kind === 'image')
                    this.previewMediaUrl.set(objUrl);
                else
                    this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objUrl));
                this.previewLoading.set(false);
            })
                .catch((e) => { this.previewError.set(httpErrorReason(e)); this.previewLoading.set(false); });
        }
        else if (kind === 'xlsx') {
            this.previewLoading.set(true);
            fetch(url, { headers })
                .then(r => { if (!r.ok)
                throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
                .then(async (buf) => {
                const table = await this.renderXlsx(buf);
                if (this.previewFile()?.name !== entry.name)
                    return; // fast arrow-nav moved on
                this.previewTable.set(table);
                this.previewLoading.set(false);
            })
                .catch((e) => { this.previewError.set(httpErrorReason(e)); this.previewLoading.set(false); });
        }
        document.addEventListener('keydown', this._keyHandler);
        setTimeout(() => this.detailPaneRef()?.nativeElement?.focus());
    }
    /** Space-relative path of an entry (matches the FileMeta `_id`/`path`; leading slashes stripped). */
    /** Public because the template compares it against `requeueingPath()` to disable one row's button. */
    relPath(entry) {
        return this.join(this.currentPath(), entry.name).replace(/^\/+/, '');
    }
    /** Fetch the file's metadata record so the pane can show its description and (embedded) edit its links. */
    loadSelectedMeta(entry) {
        this.selectedMeta.set(null);
        this.metaError.set(null);
        this.filesApi.getFileMeta(this.activeSpaceId(), this.relPath(entry)).subscribe({
            next: (fm) => { this.selectedMeta.set(fm); this.seedMetaModel(fm); },
            // A missing record just means no description/links yet — leave the model empty, not an error.
            error: () => { this.seedMetaModel(null); },
        });
    }
    /** Copy a FileMeta record into the editable form model (and prime chip labels when the picker is present). */
    seedMetaModel(fm) {
        this.metaEditModel = {
            description: fm?.description ?? '',
            tags: [...(fm?.tags ?? [])],
            entityIds: (fm?.entityIds ?? []).join(', '),
            memoryIds: [...(fm?.memoryIds ?? [])],
            chronoIds: [...(fm?.chronoIds ?? [])],
        };
        this.picker?.resolveEntityNamesFor(this.metaEditModel.entityIds);
        this.picker?.resolveMemoryTitles(this.metaEditModel.memoryIds);
        this.picker?.resolveChronoTitles(this.metaEditModel.chronoIds);
    }
    /** Switch the pane to the file-meta edit face, re-seeding the form from the loaded record. */
    showMetaMode() {
        this.seedMetaModel(this.selectedMeta());
        this.metaError.set(null);
        this.detailMode.set('meta');
    }
    /** Discard edits and return to the preview face. */
    cancelMeta() {
        this.seedMetaModel(this.selectedMeta());
        this.metaError.set(null);
        this.detailMode.set('preview');
    }
    /** Persist the edited metadata for the open file, then refresh the row (status/tags) via a dir reload. */
    saveMeta(entry) {
        const path = this.relPath(entry);
        this.metaSaving.set(true);
        this.metaError.set(null);
        this.filesApi.updateFileMeta(this.activeSpaceId(), path, {
            description: this.metaEditModel.description.trim(),
            tags: this.metaEditModel.tags,
            entityIds: this.metaEditModel.entityIds.split(',').map(s => s.trim()).filter(Boolean),
            memoryIds: this.metaEditModel.memoryIds,
            chronoIds: this.metaEditModel.chronoIds,
        }).subscribe({
            next: (fm) => {
                this.selectedMeta.set(fm);
                this.seedMetaModel(fm);
                this.metaSaving.set(false);
                this.detailMode.set('preview');
                this.toast.success(this.transloco.translate('files.detail.metaSaved'));
                this.reloadDir(); // reflect updated tags/status in the list row
            },
            error: (e) => { this.metaError.set(httpErrorReason(e)); this.metaSaving.set(false); },
        });
    }
    /**
     * Can this entry's embedding be re-queued from its row?
     *
     * Not while a job is `pending` or `processing`: the server answers those with a `409`, and an action whose
     * only outcome is a refusal is worse than one that is not offered. A file with no status at all has no job
     * to retry — an upload still in flight, or a type this instance does not embed.
     */
    canRequeue(entry) {
        if (!entry.isFile || !entry.embeddingStatus)
            return false;
        return entry.embeddingStatus !== 'pending' && entry.embeddingStatus !== 'processing';
    }
    /**
     * Re-queue embedding for one file, from its row or from the open detail pane.
     *
     * One method for both, because they are the same request with the same three outcomes; two copies is how
     * the row would end up with a different toast, or without the list refresh that makes the new status show.
     */
    requeueEmbedding(entry) {
        const path = this.relPath(entry);
        this.requeueingPath.set(path);
        this.filesApi.retryEmbedding(this.activeSpaceId(), path).subscribe({
            next: () => {
                this.requeueingPath.set('');
                this.toast.success(this.transloco.translate('files.detail.retryQueued'));
                this.reloadDir();
            },
            error: (e) => {
                this.requeueingPath.set('');
                this.toast.error(`${this.transloco.translate('files.detail.retryFailed')} ${httpErrorReason(e)}`.trim());
            },
        });
    }
    /**
     * Render markdown to sanitized HTML, replacing ```mermaid fences with inline SVG.
     *
     * The pipeline itself lives in `MarkdownRenderService` — the Help page renders the shipped docs
     * through the same one, and the sanitization rules are a security boundary that must not exist in two
     * places. This wrapper stays because the preview's tests drive `renderMarkdown` directly.
     */
    renderMarkdown(text) {
        return this.markdown.render(text);
    }
    /**
     * Parse an .xlsx/.xlsm buffer into a capped first-sheet grid. exceljs is heavy, so it's lazy-imported
     * only when a spreadsheet is actually opened. Rows/cols are capped (with a visible note) so a huge sheet
     * can't lock the tab — no silent truncation.
     */
    async renderXlsx(buf) {
        const mod = await import('exceljs');
        // exceljs ships a UMD browser build; the workbook factory is the module default (or the namespace).
        const ExcelJS = (mod.default ?? mod);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.worksheets[0];
        if (!ws)
            return { sheet: '', header: [], rows: [], note: this.transloco.translate('files.preview.xlsxEmpty') };
        const totalRows = ws.rowCount, totalCols = ws.columnCount;
        const capRows = Math.min(totalRows, XLSX_MAX_ROWS), capCols = Math.min(totalCols, XLSX_MAX_COLS);
        const grid = [];
        for (let r = 1; r <= capRows; r++) {
            const row = ws.getRow(r);
            const cells = [];
            for (let c = 1; c <= capCols; c++)
                cells.push(xlsxCellText(row.getCell(c).value));
            grid.push(cells);
        }
        const note = (totalRows > capRows || totalCols > capCols)
            ? this.transloco.translate('files.preview.xlsxTruncated', { rows: capRows, totalRows, cols: capCols, totalCols })
            : null;
        // First row as a header band — the near-universal spreadsheet convention for a quick-look preview.
        return { sheet: ws.name, header: grid[0] ?? [], rows: grid.slice(1), note };
    }
    /** Revoke the current preview blob URL (if any) to avoid leaking object URLs. */
    revokePreviewUrl() {
        if (this._previewObjectUrl) {
            URL.revokeObjectURL(this._previewObjectUrl);
            this._previewObjectUrl = null;
        }
    }
    closePreview() {
        this.previewFile.set(null);
        this.revokePreviewUrl();
        document.removeEventListener('keydown', this._keyHandler);
    }
    onPreviewKey(e) {
        if (e.key === 'Escape') {
            // Full-screen collapses back to the docked pane first; a second Escape closes the pane.
            if (this.previewFullscreen()) {
                this.previewFullscreen.set(false);
                return;
            }
            this.closePreview();
            return;
        }
        const files = this.entries().filter(f => f.isFile);
        const current = this.previewFile();
        if (!current || files.length === 0)
            return;
        const idx = files.findIndex(f => f.name === current.name);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            const next = files[(idx + 1) % files.length];
            this.openPreview(next);
        }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = files[(idx - 1 + files.length) % files.length];
            this.openPreview(prev);
        }
    }
    ngOnDestroy() {
        document.removeEventListener('keydown', this._keyHandler);
        this.revokePreviewUrl();
        // Abort any in-flight/queued uploads so their requests don't outlive the view.
        for (const sub of this.uploadSubs.values())
            sub.unsubscribe();
        this.uploadSubs.clear();
        // A poll left running would keep requesting a directory listing for a view nobody is looking at —
        // and, because it reloads through the component's own signals, on a destroyed component.
        this.stopProgressPolling();
    }
    static { this.ɵfac = function FileManagerComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || FileManagerComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: FileManagerComponent, selectors: [["app-file-manager"]], viewQuery: function FileManagerComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuerySignal(ctx.detailPaneRef, _c0, 5);
        } if (rf & 2) {
            i0.ɵɵqueryAdvance();
        } }, hostBindings: function FileManagerComponent_HostBindings(rf, ctx) { if (rf & 1) {
            i0.ɵɵlistener("dragover", function FileManagerComponent_dragover_HostBindingHandler($event) { return ctx.onDragOver($event); })("dragleave", function FileManagerComponent_dragleave_HostBindingHandler($event) { return ctx.onDragLeave($event); })("drop", function FileManagerComponent_drop_HostBindingHandler($event) { return ctx.onDrop($event); });
        } }, inputs: { embeddedSpaceId: "embeddedSpaceId" }, outputs: { filesChanged: "filesChanged" }, decls: 6, vars: 2, consts: [["treeTemplate", ""], ["detailPane", ""], [1, "loading-overlay"], [3, "message", "reason"], ["tabindex", "0", 1, "preview-fs-overlay", 3, "appModal"], [1, "spinner"], [3, "retry", "message", "reason"], [1, "space-selector"], [1, "btn", 3, "btn-primary", "btn-secondary"], [1, "btn", 3, "click"], [1, "toolbar"], [1, "breadcrumb"], [1, "btn-secondary", "btn", "btn-sm"], [1, "rename-form"], [1, "btn-secondary", "btn", "btn-sm", 2, "cursor", "pointer", "display", "inline-flex", "align-items", "center", "gap", "6px"], ["name", "upload", 3, "size"], ["type", "file", "multiple", "", "hidden", "", 3, "change"], [1, "sidebar-toggle", 3, "click"], [3, "uploads", "hasFinished"], [1, "fm-layout"], [1, "fm-sidebar"], [1, "fm-main"], ["tabindex", "0", 1, "fm-detail"], [1, "breadcrumb-item", 3, "click"], [1, "breadcrumb-sep"], [1, "btn-secondary", "btn", "btn-sm", 3, "click"], [1, "rename-form", 3, "ngSubmit"], ["type", "text", "name", "fn", 2, "width", "160px", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "submit", 1, "btn-primary", "btn", "btn-sm"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", 3, "click"], ["name", "caret-left", 3, "size"], ["name", "caret-right", 3, "size"], [3, "retry", "cancel", "dismiss", "clearFinished", "uploads", "hasFinished"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"], ["role", "status", 1, "fm-refreshing"], [1, "fm-stale"], [3, "renameValueChange", "sort", "open", "download", "requeue", "renameStart", "renameConfirm", "renameCancel", "remove", "retryLoad", "rows", "sortField", "sortDir", "error", "renameValue"], [1, "detail-header"], ["role", "tablist", 1, "seg-toggle"], [1, "file-title", 3, "title"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "detail-body"], [3, "extract", "loading", "error"], [3, "model", "spaceId", "error", "saving", "canRetryEmbedding", "retryPending"], ["type", "button", "role", "tab", 3, "click"], ["type", "button", "role", "tab", 3, "active"], [1, "preview-body"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", "preview-fs-btn"], [3, "preview"], [1, "detail-desc"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", "preview-fs-btn", 3, "click"], ["name", "corners-out", 3, "size"], [1, "desc-src"], [3, "more", "retry", "extract", "loading", "error"], [3, "save", "cancel", "retryEmbedding", "model", "spaceId", "error", "saving", "canRetryEmbedding", "retryPending"], [1, "tree-node", 3, "click"], [1, "tree-caret"], ["name", "folder", 3, "size"], [1, "tree-spinner"], [1, "tree-children"], [1, "preview-fs-bar"], [1, "preview-fs-body", "preview-body"]], template: function FileManagerComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, FileManagerComponent_Conditional_0_Template, 2, 0, "div", 2)(1, FileManagerComponent_Conditional_1_Template, 2, 4, "app-error-state", 3)(2, FileManagerComponent_Conditional_2_Template, 2, 2);
            i0.ɵɵtemplate(3, FileManagerComponent_ng_template_3_Template, 2, 0, "ng-template", null, 0, i0.ɵɵtemplateRefExtractor);
            i0.ɵɵconditionalCreate(5, FileManagerComponent_Conditional_5_Template, 10, 10, "div", 4);
        } if (rf & 2) {
            let tmp_2_0;
            i0.ɵɵconditional(ctx.loadingSpaces() ? 0 : ctx.spacesError() !== null ? 1 : 2);
            i0.ɵɵadvance(5);
            i0.ɵɵconditional((tmp_2_0 = ctx.previewFullscreen() && ctx.previewFile()) ? 5 : -1, tmp_2_0);
        } }, dependencies: [CommonModule, i1.NgTemplateOutlet, FormsModule, i2.ɵNgNoValidate, i2.DefaultValueAccessor, i2.NgControlStatus, i2.NgControlStatusGroup, i2.NgModel, i2.NgForm, PhIconComponent, ErrorStateComponent, ModalDirective, FilePreviewComponent, UploadQueueComponent, FileMetaEditorComponent, FileExtractViewComponent, FileListingComponent, TranslocoPipe], styles: ["\n\n\n\n\n    .fm-refreshing[_ngcontent-%COMP%] {\n      height: 2px;\n      margin-bottom: 6px;\n      border-radius: 2px;\n      overflow: hidden;\n      background: color-mix(in srgb, var(--accent) 14%, transparent);\n    }\n    .fm-refreshing[_ngcontent-%COMP%]::after {\n      content: '';\n      display: block;\n      width: 34%;\n      height: 100%;\n      border-radius: 2px;\n      background: var(--accent);\n      animation: _ngcontent-%COMP%_fm-slide 1.1s ease-in-out infinite;\n    }\n    @keyframes _ngcontent-%COMP%_fm-slide {\n      0%   { transform: translateX(-100%); }\n      100% { transform: translateX(300%); }\n    }\n    \n\n    .fm-stale[_ngcontent-%COMP%] {\n      font-size: 12px;\n      color: var(--warning, var(--text-muted));\n      margin-bottom: 6px;\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .fm-refreshing[_ngcontent-%COMP%]::after { animation: none; width: 100%; opacity: .5; }\n    }\n\n    .toolbar[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n\n    .breadcrumb[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 4px;\n      font-size: 13px;\n      flex: 1;\n      flex-wrap: wrap;\n    }\n\n    .breadcrumb-sep[_ngcontent-%COMP%] { color: var(--text-muted); }\n\n    .breadcrumb-item[_ngcontent-%COMP%] {\n      color: var(--accent);\n      cursor: pointer;\n      border: none;\n      background: none;\n      font-size: 13px;\n      font-family: var(--font);\n      padding: 0;\n    }\n    .breadcrumb-item[_ngcontent-%COMP%]:hover { text-decoration: underline; }\n    .breadcrumb-item.current[_ngcontent-%COMP%] { color: var(--text-primary); cursor: default; }\n    .breadcrumb-item.current[_ngcontent-%COMP%]:hover { text-decoration: none; }\n\n\n    .upload-zone[_ngcontent-%COMP%] {\n      border: 2px dashed var(--border);\n      border-radius: var(--radius-md);\n      padding: 24px;\n      text-align: center;\n      color: var(--text-muted);\n      margin-bottom: 16px;\n      transition: border-color var(--transition);\n      cursor: pointer;\n    }\n    .upload-zone[_ngcontent-%COMP%]:hover, .upload-zone.drag-over[_ngcontent-%COMP%] {\n      border-color: var(--accent);\n      color: var(--text-secondary);\n    }\n\n    \n\n\n    .space-selector[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 8px;\n      margin-bottom: 20px;\n      flex-wrap: wrap;\n    }\n\n    \n\n    \n\n    .fm-detail[_ngcontent-%COMP%] {\n      width: min(480px, 42vw);\n      flex-shrink: 0;\n      border-left: 1px solid var(--border);\n      display: flex;\n      flex-direction: column;\n      overflow: hidden;\n      max-height: calc(100vh - 180px);\n    }\n    .detail-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 10px 12px;\n      border-bottom: 1px solid var(--border);\n      flex-shrink: 0;\n    }\n    .detail-header[_ngcontent-%COMP%]   .file-title[_ngcontent-%COMP%] { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    \n\n    .seg-toggle[_ngcontent-%COMP%] { display: inline-flex; flex: 1; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }\n    .seg-toggle[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      flex: 1; background: none; border: none; padding: 5px 10px; cursor: pointer;\n      font-size: 0.82em; color: var(--text-muted); white-space: nowrap;\n    }\n    .seg-toggle[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] { background: var(--bg-muted); color: var(--text); font-weight: 600; }\n    .seg-toggle[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:not(.active):hover { background: var(--bg-hover); }\n    .detail-body[_ngcontent-%COMP%] { flex: 1; overflow: auto; padding: 14px; }\n    \n\n    .detail-desc[_ngcontent-%COMP%] { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }\n    .detail-desc[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] { margin: 0 0 6px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }\n    .detail-desc[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }\n    \n\n\n    .detail-desc[_ngcontent-%COMP%]   .desc-src[_ngcontent-%COMP%] { margin-left: 8px; padding: 1px 6px; border: 1px solid var(--border); border-radius: 10px;\n      font-size: 0.92em; text-transform: none; letter-spacing: 0; color: var(--text-muted); cursor: help; }\n    \n\n\n    .detail-extract[_ngcontent-%COMP%]   section[_ngcontent-%COMP%] { margin-bottom: 18px; }\n    .detail-extract[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] { margin: 0 0 8px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }\n    .detail-extract[_ngcontent-%COMP%]   .muted[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 0.9em; }\n    .chunk[_ngcontent-%COMP%] { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background: var(--bg-primary); }\n    .chunk-head[_ngcontent-%COMP%] { display: flex; gap: 8px; align-items: baseline; margin-bottom: 5px; font-size: 0.82em; }\n    .chunk-ix[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); color: var(--text-muted); flex: none; }\n    \n\n    .chunk-prov[_ngcontent-%COMP%] { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chunk-warn[_ngcontent-%COMP%] { color: var(--warning); flex: none; }\n    \n\n    .chunk-body[_ngcontent-%COMP%] { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.45; font-size: 0.92em; }\n    .xtr-image[_ngcontent-%COMP%] { border-top: 1px solid var(--border); padding: 8px 0; }\n    .xtr-image[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 4px 0 0; line-height: 1.45; font-size: 0.92em; }\n    .xtr-path[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 0.82em; color: var(--text-muted); word-break: break-all; }\n    .xtr-md[_ngcontent-%COMP%] { margin: 6px 0 0; padding: 10px; border: 1px solid var(--border); border-radius: 8px;\n      background: var(--bg-primary); max-height: 40vh; overflow: auto; white-space: pre-wrap;\n      word-break: break-word; font-size: 0.85em; line-height: 1.45; }\n    .detail-extract[_ngcontent-%COMP%]   .desc-src[_ngcontent-%COMP%] { margin-left: 6px; padding: 1px 6px; border: 1px solid var(--border);\n      border-radius: 10px; font-size: 0.86em; color: var(--text-muted); cursor: help; }\n    \n\n    .preview-body[_ngcontent-%COMP%] { position: relative; }\n    .preview-fs-btn[_ngcontent-%COMP%] { position: absolute; top: 4px; right: 4px; z-index: 1; opacity: 0.75; }\n    .preview-fs-btn[_ngcontent-%COMP%]:hover { opacity: 1; }\n    \n\n    .mermaid-diagram[_ngcontent-%COMP%] { display: flex; justify-content: center; margin: 0.8em 0; }\n    .mermaid-diagram[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] { max-width: 100%; height: auto; }\n    \n\n    .preview-fs-overlay[_ngcontent-%COMP%] {\n      position: fixed; inset: 0; z-index: 1200;\n      background: var(--bg-surface); display: flex; flex-direction: column;\n    }\n    .preview-fs-bar[_ngcontent-%COMP%] {\n      display: flex; align-items: center; gap: 10px;\n      padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;\n    }\n    .preview-fs-bar[_ngcontent-%COMP%]   .file-title[_ngcontent-%COMP%] { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .preview-fs-body[_ngcontent-%COMP%] { flex: 1; overflow: auto; padding: 20px; max-width: 1100px; width: 100%; margin: 0 auto; }\n    .preview-body[_ngcontent-%COMP%] {\n      flex: 1;\n      overflow: auto;\n      padding: 16px;\n    }\n\n    \n\n    .fm-layout[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 0;\n    }\n    .fm-sidebar[_ngcontent-%COMP%] {\n      width: 220px;\n      flex-shrink: 0;\n      border-right: 1px solid var(--border);\n      padding: 8px 0;\n      overflow-y: auto;\n      max-height: calc(100vh - 180px);\n    }\n    .fm-main[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n    .sidebar-toggle[_ngcontent-%COMP%] {\n      background: none;\n      border: 1px solid var(--border);\n      color: var(--text-muted);\n      padding: 2px 8px;\n      border-radius: 4px;\n      cursor: pointer;\n      font-size: 12px;\n      margin-left: auto;\n    }\n    .sidebar-toggle[_ngcontent-%COMP%]:hover { background: var(--bg-hover); }\n\n    .tree-node[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 4px;\n      padding: 3px 8px;\n      cursor: pointer;\n      font-size: 13px;\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      border-radius: 4px;\n      margin: 0 4px;\n    }\n    .tree-node[_ngcontent-%COMP%]:hover { background: var(--bg-hover); }\n    .tree-node.active[_ngcontent-%COMP%] { background: var(--accent-dim); color: var(--accent); font-weight: 500; }\n    .tree-caret[_ngcontent-%COMP%] {\n      width: 16px;\n      text-align: center;\n      flex-shrink: 0;\n      font-size: 10px;\n      color: var(--text-muted);\n      transition: transform 0.15s;\n    }\n    .tree-caret.expanded[_ngcontent-%COMP%] { transform: rotate(90deg); }\n    .tree-children[_ngcontent-%COMP%] { padding-left: 12px; }\n    .tree-spinner[_ngcontent-%COMP%] { font-size: 10px; color: var(--text-muted); padding: 2px 8px 2px 28px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(FileManagerComponent, [{
        type: Component,
        args: [{ selector: 'app-file-manager', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, PhIconComponent, TranslocoPipe, ErrorStateComponent, TagInputComponent, EntityRefFieldComponent, MemoryRefFieldComponent, ChronoRefFieldComponent, SortableHeaderComponent, StepProgressBarComponent, HscrollTopDirective, ModalDirective, TimestampComponent, FilePreviewComponent, UploadQueueComponent, FileMetaEditorComponent, FileExtractViewComponent, FileListingComponent], template: `
    @if (loadingSpaces()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (spacesError() !== null) {
      <!-- Reachable only when this component is routed standalone, which it currently is not: the sole call
           site passes embeddedSpaceId, so ngOnInit returns before loadSpaces(). Kept correct rather than
           deleted because the standalone /files route existed until recently and the branch is five lines;
           without it a failed space list renders an empty selector and NO body, which reads as a broken
           page rather than a failed request. -->
      <app-error-state [message]="'files.loadSpacesError' | transloco" [reason]="spacesError() ?? ''" (retry)="retrySpaces()" />
    } @else {

      <!-- Space selector (hidden when embedded) -->
      @if (!embeddedSpaceId) {
      <div class="space-selector">
        @for (s of spaces(); track s.id) {
          <button
            class="btn"
            [class.btn-primary]="activeSpaceId() === s.id"
            [class.btn-secondary]="activeSpaceId() !== s.id"
            (click)="selectSpace(s.id)"
          >{{ s.label }}</button>
        }
      </div>
      }

      @if (activeSpaceId()) {
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="breadcrumb">
            @for (seg of breadcrumbs(); track seg.path; let last = $last) {
              <button
                class="breadcrumb-item"
                [class.current]="last"
                (click)="navigate(seg.path)"
              >{{ seg.label }}</button>
              @if (!last) { <span class="breadcrumb-sep">/</span> }
            }
          </div>

          <!-- New folder -->
          @if (!showNewFolder()) {
            <button class="btn-secondary btn btn-sm" (click)="showNewFolder.set(true)">{{ 'files.newFolder' | transloco }}</button>
          } @else {
            <form class="rename-form" (ngSubmit)="createFolder()">
              <input type="text" [(ngModel)]="newFolderName" name="fn" [placeholder]="'files.newFolderPlaceholder' | transloco" [attr.aria-label]="'files.newFolderAriaLabel' | transloco" style="width:160px" />
              <button class="btn-primary btn btn-sm" type="submit">{{ 'files.createFolder' | transloco }}</button>
              <button class="btn-ghost btn btn-sm" type="button" (click)="showNewFolder.set(false)">{{ 'common.cancel' | transloco }}</button>
            </form>
          }

          <!-- Upload -->
          <label class="btn-secondary btn btn-sm" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <ph-icon name="upload" [size]="14"/> {{ 'files.upload' | transloco }}
            <input type="file" multiple hidden (change)="onFileInput($event)" />
          </label>

          <button class="sidebar-toggle" (click)="toggleSidebar()">
            @if (sidebarOpen()) { <ph-icon name="caret-left" [size]="12"/> {{ 'files.sidebar.hideTree' | transloco }} }
            @else { <ph-icon name="caret-right" [size]="12"/> {{ 'files.sidebar.showTree' | transloco }} }
          </button>
        </div>

        <!-- Upload queue — one row per file (U12) -->
        @if (uploads().length) {
          <app-upload-queue
            [uploads]="uploads()"
            [hasFinished]="hasFinishedUploads()"
            (retry)="retryUpload($event)"
            (cancel)="cancelUpload($event)"
            (dismiss)="dismissUpload($event)"
            (clearFinished)="clearFinishedUploads()" />
        }

        <div class="fm-layout">
          <!-- Directory tree sidebar -->
          @if (sidebarOpen()) {
            <div class="fm-sidebar">
              <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: treeRoot() }"></ng-container>
            </div>
          }

          <!-- Main file listing -->
          <div class="fm-main" [class.drag-over]="dragOver()">
            @if (loading()) {
              <div class="loading-overlay"><span class="spinner"></span></div>
            } @else {
          <!-- A background refresh is a HAIRLINE, not an unmount. The table below stays exactly where it is and
               its rows update in place, so the per-row progress bars advance instead of the screen blinking. -->
          @if (refreshing()) { <div class="fm-refreshing" role="status" [attr.aria-label]="'files.refreshing' | transloco"></div> }
          @if (refreshFailed()) {
            <div class="fm-stale">{{ 'files.refreshFailed' | transloco }}</div>
          }
          <app-file-listing
            [rows]="fileRows()"
            [sortField]="sortField()"
            [sortDir]="sortDir()"
            [error]="loadError()"
            [(renameValue)]="renameValue"
            (sort)="setSort($event)"
            (open)="open($event)"
            (download)="downloadFile($event)"
            (requeue)="requeueEmbedding($event)"
            (renameStart)="startRename($event)"
            (renameConfirm)="confirmRename($event)"
            (renameCancel)="renamingEntry.set('')"
            (remove)="deleteEntry($event)"
            (retryLoad)="reloadDir()" />
        }
          </div><!-- .fm-main -->

          <!-- Docked detail pane: preview + description ⇄ file-meta record (the merged File Meta view).
               The list runs full width until a file is opened; opening one adds this column. -->
          @if (previewFile(); as pf) {
            <div class="fm-detail" tabindex="0" #detailPane>
              <div class="detail-header">
                @if (embeddedSpaceId) {
                  <div class="seg-toggle" role="tablist" [attr.aria-label]="'files.detail.tabsAriaLabel' | transloco">
                    <button type="button" role="tab" [class.active]="detailMode() === 'preview'" [attr.aria-selected]="detailMode() === 'preview'" (click)="detailMode.set('preview')">{{ 'files.detail.previewTab' | transloco }}</button>
                    <button type="button" role="tab" [class.active]="detailMode() === 'meta'" [attr.aria-selected]="detailMode() === 'meta'" (click)="showMetaMode()">{{ 'files.detail.metaTab' | transloco }}</button>
                    <!-- Extract: what retrieval actually sees. Only for files that HAVE been through the
                         pipeline — offering it on a file with no chunks and no conversion would be a tab
                         that always says "nothing here". -->
                    @if (hasExtract()) {
                      <button type="button" role="tab" [class.active]="detailMode() === 'extract'" [attr.aria-selected]="detailMode() === 'extract'" (click)="showExtractMode()">{{ 'files.detail.extractTab' | transloco }}</button>
                    }
                  </div>
                } @else {
                  <span class="file-title" [title]="pf.name">{{ pf.name }}</span>
                }
                <button class="icon-btn" (click)="closePreview()" [attr.aria-label]="'files.closePreviewAriaLabel' | transloco"><ph-icon name="x" [size]="16"/></button>
              </div>

              <div class="detail-body">
                @if (detailMode() === 'preview' || !embeddedSpaceId) {
                  <div class="preview-body">
                    <!-- Full-screen toggle: shown once there's rendered content (not while loading / on error). -->
                    @if (!previewLoading() && previewError() === null && previewKind() !== 'unknown') {
                      <button class="btn-ghost btn btn-sm preview-fs-btn" type="button" (click)="previewFullscreen.set(true)" [attr.title]="'files.preview.fullscreen' | transloco" [attr.aria-label]="'files.preview.fullscreen' | transloco"><ph-icon name="corners-out" [size]="16"/></button>
                    }
                    <app-file-preview [preview]="previewModel()" />
                  </div>
                  @if (selectedMeta()?.description) {
                    <div class="detail-desc">
                      <h4>
                        {{ 'files.detail.description' | transloco }}
                        <!-- Whose words these are. The release note said "generated" while the value was
                             the head of the document's own text, and nothing on screen could tell them
                             apart; a description a person typed carries no badge at all. -->
                        @if (selectedMeta()!.descriptionSource; as src) {
                          <span class="desc-src" [attr.title]="'files.detail.descriptionSource.' + src + 'Hint' | transloco">{{ 'files.detail.descriptionSource.' + src | transloco }}</span>
                        }
                      </h4>
                      <p>{{ selectedMeta()!.description }}</p>
                    </div>
                  }
                } @else if (detailMode() === 'extract') {
                  <!-- Extract: what retrieval actually sees.
                       The _converted/ and _extracted/ folders are hidden from browsing, which is right and
                       which removed the only way to answer "what did the pipeline get out of this file?" —
                       the first question when a document answers queries badly. Hidden from browsing, not
                       from inspection. Nothing here is new data; these are records conversion already wrote. -->
                  <app-file-extract-view
                    [extract]="extract()"
                    [loading]="extractLoading()"
                    [error]="extractError()"
                    (more)="moreChunks(pf)"
                    (retry)="loadExtract(pf)" />
                } @else {
                  <!-- File-meta edit form (embedded only — reuses the Brain ref-field widgets). -->
                  <app-file-meta-editor
                    [model]="metaEditModel"
                    [spaceId]="activeSpaceId()"
                    [error]="metaError()"
                    [saving]="metaSaving()"
                    [canRetryEmbedding]="pf.embeddingStatus === 'failed' || pf.embeddingStatus === 'partial'"
                    [retryPending]="requeueingPath() === relPath(pf)"
                    (save)="saveMeta(pf)"
                    (cancel)="cancelMeta()"
                    (retryEmbedding)="requeueEmbedding(pf)" />
                }
              </div>
            </div>
          }
        </div><!-- .fm-layout -->
      }
    }

    <!-- Recursive tree template -->
    <ng-template #treeTemplate let-nodes>
      @for (node of nodes; track node.path) {
        <div class="tree-node"
             [class.active]="currentPath() === node.path"
             (click)="onTreeClick(node)">
          <span class="tree-caret" [class.expanded]="node.expanded"><ph-icon name="caret-right" [size]="10"/></span>
          <span><ph-icon name="folder" [size]="14"/> {{ node.name }}</span>
        </div>
        @if (node.loading) {
          <div class="tree-spinner">{{ 'files.tree.loading' | transloco }}</div>
        }
        @if (node.expanded && node.children) {
          <div class="tree-children">
            <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: node.children }"></ng-container>
          </div>
        }
      }
    </ng-template>

    <!-- Preview content, shared by the docked pane and the full-screen overlay. -->

    <!-- Full-screen preview overlay (the one intentional fixed overlay — for the full-screen button).
         NO BACKTICKS IN THIS TEMPLATE: one ends the string and the error points at @Component, never at the comment.
         appModal supplies role=dialog, aria-modal, a CDK focus trap and focus restore on close. Escape was already
         handled by this component's document keydown listener (full-screen collapses first, then the pane closes),
         but the TRAP was not: Tab walked out of a full-screen overlay into the page behind it, which is covered and
         invisible. The fsOverlay template ref that used to sit here was never referenced from TypeScript —
         evidence that focus had been thought about and never wired.
         No backdrop dismissal: this overlay IS the backdrop, and Escape or the close button already dismiss it. -->
    @if (previewFullscreen() && previewFile(); as pf) {
      <div class="preview-fs-overlay" tabindex="0" [appModal]="'files.preview.fullscreenDialog' | transloco">
        <div class="preview-fs-bar">
          <span class="file-title" [title]="pf.name">{{ pf.name }}</span>
          <button class="icon-btn" (click)="previewFullscreen.set(false)" [attr.aria-label]="'files.preview.exitFullscreen' | transloco"><ph-icon name="x" [size]="18"/></button>
        </div>
        <div class="preview-fs-body preview-body">
          <app-file-preview [preview]="previewModel()" />
        </div>
      </div>
    }
  `, styles: ["\n    /* A background refresh, as a 2px indeterminate hairline above the table. Deliberately NOT a spinner and\n       deliberately not an overlay: the whole point is that nothing on screen moves or disappears while a poll\n       is in flight. It reserves its own 2px so the table does not shift when it appears.\n       NO BACKTICKS anywhere in this block \u2014 it is one template string. */\n    .fm-refreshing {\n      height: 2px;\n      margin-bottom: 6px;\n      border-radius: 2px;\n      overflow: hidden;\n      background: color-mix(in srgb, var(--accent) 14%, transparent);\n    }\n    .fm-refreshing::after {\n      content: '';\n      display: block;\n      width: 34%;\n      height: 100%;\n      border-radius: 2px;\n      background: var(--accent);\n      animation: fm-slide 1.1s ease-in-out infinite;\n    }\n    @keyframes fm-slide {\n      0%   { transform: translateX(-100%); }\n      100% { transform: translateX(300%); }\n    }\n    /* Honesty when a poll fails: the rows stay, but they are no longer claimed to be current. */\n    .fm-stale {\n      font-size: 12px;\n      color: var(--warning, var(--text-muted));\n      margin-bottom: 6px;\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .fm-refreshing::after { animation: none; width: 100%; opacity: .5; }\n    }\n\n    .toolbar {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      margin-bottom: 16px;\n      flex-wrap: wrap;\n    }\n\n    .breadcrumb {\n      display: flex;\n      align-items: center;\n      gap: 4px;\n      font-size: 13px;\n      flex: 1;\n      flex-wrap: wrap;\n    }\n\n    .breadcrumb-sep { color: var(--text-muted); }\n\n    .breadcrumb-item {\n      color: var(--accent);\n      cursor: pointer;\n      border: none;\n      background: none;\n      font-size: 13px;\n      font-family: var(--font);\n      padding: 0;\n    }\n    .breadcrumb-item:hover { text-decoration: underline; }\n    .breadcrumb-item.current { color: var(--text-primary); cursor: default; }\n    .breadcrumb-item.current:hover { text-decoration: none; }\n\n\n    .upload-zone {\n      border: 2px dashed var(--border);\n      border-radius: var(--radius-md);\n      padding: 24px;\n      text-align: center;\n      color: var(--text-muted);\n      margin-bottom: 16px;\n      transition: border-color var(--transition);\n      cursor: pointer;\n    }\n    .upload-zone:hover, .upload-zone.drag-over {\n      border-color: var(--accent);\n      color: var(--text-secondary);\n    }\n\n    /* \u2500\u2500 Upload queue panel (U12) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n    .space-selector {\n      display: flex;\n      gap: 8px;\n      margin-bottom: 20px;\n      flex-wrap: wrap;\n    }\n\n    /* \u2500\u2500 Docked detail pane (preview + description \u21C4 file meta) \u2500\u2500\u2500 */\n    /* A third in-flow column of .fm-layout; the list (.fm-main) reflows to full width when it's absent. */\n    .fm-detail {\n      width: min(480px, 42vw);\n      flex-shrink: 0;\n      border-left: 1px solid var(--border);\n      display: flex;\n      flex-direction: column;\n      overflow: hidden;\n      max-height: calc(100vh - 180px);\n    }\n    .detail-header {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 10px 12px;\n      border-bottom: 1px solid var(--border);\n      flex-shrink: 0;\n    }\n    .detail-header .file-title { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    /* Segmented [Preview & description | File meta] toggle */\n    .seg-toggle { display: inline-flex; flex: 1; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }\n    .seg-toggle button {\n      flex: 1; background: none; border: none; padding: 5px 10px; cursor: pointer;\n      font-size: 0.82em; color: var(--text-muted); white-space: nowrap;\n    }\n    .seg-toggle button.active { background: var(--bg-muted); color: var(--text); font-weight: 600; }\n    .seg-toggle button:not(.active):hover { background: var(--bg-hover); }\n    .detail-body { flex: 1; overflow: auto; padding: 14px; }\n    /* Description shown beneath the preview */\n    .detail-desc { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }\n    .detail-desc h4 { margin: 0 0 6px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }\n    .detail-desc p { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }\n    /* Provenance sits inside the heading, quieter than it: it qualifies the description rather than\n       announcing itself. Lower-case against the upper-case heading so it reads as an aside. */\n    .detail-desc .desc-src { margin-left: 8px; padding: 1px 6px; border: 1px solid var(--border); border-radius: 10px;\n      font-size: 0.92em; text-transform: none; letter-spacing: 0; color: var(--text-muted); cursor: help; }\n    /* Extract face. A diagnostic, so it is dense and legible rather than pretty: the chunk bodies are the\n       thing being read, and everything else is a label on them. */\n    .detail-extract section { margin-bottom: 18px; }\n    .detail-extract h4 { margin: 0 0 8px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }\n    .detail-extract .muted { color: var(--text-muted); font-size: 0.9em; }\n    .chunk { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background: var(--bg-primary); }\n    .chunk-head { display: flex; gap: 8px; align-items: baseline; margin-bottom: 5px; font-size: 0.82em; }\n    .chunk-ix { font-family: var(--font-mono, monospace); color: var(--text-muted); flex: none; }\n    /* Provenance can be a long heading; it truncates rather than pushing the row. */\n    .chunk-prov { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chunk-warn { color: var(--warning); flex: none; }\n    /* pre-wrap, because a chunk's own line breaks are part of what retrieval sees. */\n    .chunk-body { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.45; font-size: 0.92em; }\n    .xtr-image { border-top: 1px solid var(--border); padding: 8px 0; }\n    .xtr-image p { margin: 4px 0 0; line-height: 1.45; font-size: 0.92em; }\n    .xtr-path { font-family: var(--font-mono, monospace); font-size: 0.82em; color: var(--text-muted); word-break: break-all; }\n    .xtr-md { margin: 6px 0 0; padding: 10px; border: 1px solid var(--border); border-radius: 8px;\n      background: var(--bg-primary); max-height: 40vh; overflow: auto; white-space: pre-wrap;\n      word-break: break-word; font-size: 0.85em; line-height: 1.45; }\n    .detail-extract .desc-src { margin-left: 6px; padding: 1px 6px; border: 1px solid var(--border);\n      border-radius: 10px; font-size: 0.86em; color: var(--text-muted); cursor: help; }\n    /* Full-screen toggle floats at the top-right of the preview body. */\n    .preview-body { position: relative; }\n    .preview-fs-btn { position: absolute; top: 4px; right: 4px; z-index: 1; opacity: 0.75; }\n    .preview-fs-btn:hover { opacity: 1; }\n    /* Formatted markdown */\n    .mermaid-diagram { display: flex; justify-content: center; margin: 0.8em 0; }\n    .mermaid-diagram svg { max-width: 100%; height: auto; }\n    /* Full-screen preview overlay */\n    .preview-fs-overlay {\n      position: fixed; inset: 0; z-index: 1200;\n      background: var(--bg-surface); display: flex; flex-direction: column;\n    }\n    .preview-fs-bar {\n      display: flex; align-items: center; gap: 10px;\n      padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;\n    }\n    .preview-fs-bar .file-title { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .preview-fs-body { flex: 1; overflow: auto; padding: 20px; max-width: 1100px; width: 100%; margin: 0 auto; }\n    .preview-body {\n      flex: 1;\n      overflow: auto;\n      padding: 16px;\n    }\n\n    /* \u2500\u2500 Sidebar + layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n    .fm-layout {\n      display: flex;\n      gap: 0;\n    }\n    .fm-sidebar {\n      width: 220px;\n      flex-shrink: 0;\n      border-right: 1px solid var(--border);\n      padding: 8px 0;\n      overflow-y: auto;\n      max-height: calc(100vh - 180px);\n    }\n    .fm-main { flex: 1; min-width: 0; }\n    .sidebar-toggle {\n      background: none;\n      border: 1px solid var(--border);\n      color: var(--text-muted);\n      padding: 2px 8px;\n      border-radius: 4px;\n      cursor: pointer;\n      font-size: 12px;\n      margin-left: auto;\n    }\n    .sidebar-toggle:hover { background: var(--bg-hover); }\n\n    .tree-node {\n      display: flex;\n      align-items: center;\n      gap: 4px;\n      padding: 3px 8px;\n      cursor: pointer;\n      font-size: 13px;\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      border-radius: 4px;\n      margin: 0 4px;\n    }\n    .tree-node:hover { background: var(--bg-hover); }\n    .tree-node.active { background: var(--accent-dim); color: var(--accent); font-weight: 500; }\n    .tree-caret {\n      width: 16px;\n      text-align: center;\n      flex-shrink: 0;\n      font-size: 10px;\n      color: var(--text-muted);\n      transition: transform 0.15s;\n    }\n    .tree-caret.expanded { transform: rotate(90deg); }\n    .tree-children { padding-left: 12px; }\n    .tree-spinner { font-size: 10px; color: var(--text-muted); padding: 2px 8px 2px 28px; }\n\n  "] }]
    }], () => [], { detailPaneRef: [{ type: i0.ViewChild, args: ['detailPane', { isSignal: true }] }], embeddedSpaceId: [{
            type: Input
        }], filesChanged: [{
            type: Output
        }], onDragOver: [{
            type: HostListener,
            args: ['dragover', ['$event']]
        }], onDragLeave: [{
            type: HostListener,
            args: ['dragleave', ['$event']]
        }], onDrop: [{
            type: HostListener,
            args: ['drop', ['$event']]
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(FileManagerComponent, { className: "FileManagerComponent", filePath: "app/pages/files/file-manager.component.ts", lineNumber: 601 }); })();
