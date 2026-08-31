import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { TimestampComponent } from '../../shared/timestamp.component';
import { StepProgressBarComponent } from '../../shared/step-progress-bar.component';
import { SortableHeaderComponent } from '../brain/sortable-header.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { formatSize } from './file-format';
import { FILE_LISTING_STYLES } from './file-manager.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.entry.name;
function FileListingComponent_For_17_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 7);
} if (rf & 2) {
    i0.ɵɵproperty("size", 16);
} }
function FileListingComponent_For_17_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 8);
} if (rf & 2) {
    i0.ɵɵproperty("size", 16);
} }
function FileListingComponent_For_17_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 23);
    i0.ɵɵlistener("ngSubmit", function FileListingComponent_For_17_Conditional_6_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r4); const row_r5 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.renameConfirm.emit(row_r5.entry)); });
    i0.ɵɵelementStart(1, "input", 24);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function FileListingComponent_For_17_Conditional_6_Template_input_ngModelChange_1_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.renameValue, $event) || (ctx_r1.renameValue = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 25);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "button", 26);
    i0.ɵɵlistener("click", function FileListingComponent_For_17_Conditional_6_Template_button_click_6_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.renameCancel.emit()); });
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.renameValue);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 4, "files.renameEntryAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 6, "common.save"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 8, "common.cancel"));
} }
function FileListingComponent_For_17_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 27);
    i0.ɵɵlistener("click", function FileListingComponent_For_17_Conditional_7_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r6); const row_r5 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.open.emit(row_r5.entry)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const row_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵclassProp("dir", row_r5.entry.isDirectory);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(row_r5.entry.name);
} }
function FileListingComponent_For_17_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-step-progress-bar", 11);
} if (rf & 2) {
    const row_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("progress", row_r5.entry.progress)("progressAt", row_r5.entry.progressAt);
} }
function FileListingComponent_For_17_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 28);
    i0.ɵɵelement(1, "span", 29);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const row_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵclassMap("emb-" + row_r5.entry.embeddingStatus);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 3, "files.embStatus." + row_r5.entry.embeddingStatus), " ");
} }
function FileListingComponent_For_17_Conditional_12_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 30);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r7 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r7);
} }
function FileListingComponent_For_17_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 13);
    i0.ɵɵrepeaterCreate(1, FileListingComponent_For_17_Conditional_12_For_2_Template, 2, 1, "span", 30, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const row_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(row_r5.entry.tags);
} }
function FileListingComponent_For_17_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 26);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function FileListingComponent_For_17_Conditional_18_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r8); const row_r5 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.download.emit(row_r5.entry)); });
    i0.ɵɵelement(2, "ph-icon", 31);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "files.downloadAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
} }
function FileListingComponent_For_17_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 32);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function FileListingComponent_For_17_Conditional_19_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r9); const row_r5 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.requeue.emit(row_r5.entry)); });
    i0.ɵɵelement(3, "ph-icon", 33);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const row_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("disabled", row_r5.requeueing);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 4, "brain.fileMeta.retryEmbedding"))("aria-label", i0.ɵɵpipeBind1(2, 6, "files.reembedAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
} }
function FileListingComponent_For_17_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td")(2, "span", 6);
    i0.ɵɵconditionalCreate(3, FileListingComponent_For_17_Conditional_3_Template, 1, 1, "ph-icon", 7)(4, FileListingComponent_For_17_Conditional_4_Template, 1, 1, "ph-icon", 8);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(5, "td");
    i0.ɵɵconditionalCreate(6, FileListingComponent_For_17_Conditional_6_Template, 9, 10, "form", 9)(7, FileListingComponent_For_17_Conditional_7_Template, 2, 3, "button", 10);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "td");
    i0.ɵɵconditionalCreate(9, FileListingComponent_For_17_Conditional_9_Template, 1, 2, "app-step-progress-bar", 11)(10, FileListingComponent_For_17_Conditional_10_Template, 4, 5, "span", 12);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "td");
    i0.ɵɵconditionalCreate(12, FileListingComponent_For_17_Conditional_12_Template, 3, 0, "span", 13);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "td", 14);
    i0.ɵɵtext(14);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "td");
    i0.ɵɵelement(16, "app-timestamp", 15);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "td", 16);
    i0.ɵɵconditionalCreate(18, FileListingComponent_For_17_Conditional_18_Template, 3, 4, "button", 17);
    i0.ɵɵconditionalCreate(19, FileListingComponent_For_17_Conditional_19_Template, 4, 8, "button", 18);
    i0.ɵɵelementStart(20, "button", 19);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵlistener("click", function FileListingComponent_For_17_Template_button_click_20_listener() { const row_r5 = i0.ɵɵrestoreView(_r3).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.renameStart.emit(row_r5.entry)); });
    i0.ɵɵelement(23, "ph-icon", 20);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "button", 21);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵlistener("click", function FileListingComponent_For_17_Template_button_click_24_listener() { const row_r5 = i0.ɵɵrestoreView(_r3).$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.remove.emit(row_r5.entry)); });
    i0.ɵɵelement(26, "ph-icon", 22);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const row_r5 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(row_r5.entry.isDirectory ? 3 : 4);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(row_r5.renaming ? 6 : 7);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(row_r5.entry.isFile && row_r5.entry.progress ? 9 : row_r5.entry.isFile && row_r5.entry.embeddingStatus ? 10 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional((row_r5.entry.tags == null ? null : row_r5.entry.tags.length) ? 12 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.formatSize(row_r5.entry.size), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("value", row_r5.entry.modified);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(row_r5.entry.isFile ? 18 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(row_r5.canRequeue ? 19 : -1);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(21, 13, "files.rename"))("aria-label", i0.ɵɵpipeBind1(22, 15, "files.renameEntryAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(25, 17, "files.deleteEntryAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
} }
function FileListingComponent_ForEmpty_18_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 37);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function FileListingComponent_ForEmpty_18_Conditional_2_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryLoad.emit()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "files.error.loadFiles"))("reason", ctx_r1.error() ?? "");
} }
function FileListingComponent_ForEmpty_18_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 36)(1, "div", 38);
    i0.ɵɵelement(2, "ph-icon", 39);
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
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "files.emptyFolder.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "files.emptyFolder.body"));
} }
function FileListingComponent_ForEmpty_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 34);
    i0.ɵɵconditionalCreate(2, FileListingComponent_ForEmpty_18_Conditional_2_Template, 2, 4, "app-error-state", 35)(3, FileListingComponent_ForEmpty_18_Conditional_3_Template, 9, 7, "div", 36);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.error() !== null ? 2 : 3);
} }
/**
 * The directory listing: one row per entry, with its status, tags, size, modified time and actions.
 *
 * ## The last cut of G-3, and the widest
 *
 * The other four pieces of the detail pane render one thing each. This is the page's core — the reason
 * somebody opens the Files tab — so its interface is inherently wider, and the honest way to keep it
 * legible was to answer the per-row questions before they arrive rather than to pass the machinery that
 * answers them.
 *
 * ## Actions are separate outputs, deliberately
 *
 * A single `action` output carrying a discriminated union would have been fewer bindings and worse to read:
 * the parent would gain a `switch` where it currently has seven one-line handlers, and a template is the one
 * place where naming each event is clearer than dispatching on a tag.
 *
 * ## Rename is two-way because the input lives here
 *
 * `renameValue` is a `model()`: the text box is in this component, and the page needs the value when the form
 * is submitted. Everything else is one-directional.
 */
export class FileListingComponent {
    constructor() {
        this.rows = input([], ...(ngDevMode ? [{ debugName: "rows" }] : /* istanbul ignore next */ []));
        this.sortField = input('', ...(ngDevMode ? [{ debugName: "sortField" }] : /* istanbul ignore next */ []));
        this.sortDir = input('asc', ...(ngDevMode ? [{ debugName: "sortDir" }] : /* istanbul ignore next */ []));
        /** The directory load's failure, shown in place of the empty state — an empty folder is not an error. */
        this.error = input(null, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /** Two-way: the text box is here, and the page reads the value when the form is submitted. */
        this.renameValue = model('', ...(ngDevMode ? [{ debugName: "renameValue" }] : /* istanbul ignore next */ []));
        this.sort = output();
        this.open = output();
        this.download = output();
        this.requeue = output();
        this.renameStart = output();
        this.renameConfirm = output();
        this.renameCancel = output();
        /** `remove`, not `delete` — the latter is a reserved word and cannot be a member name. */
        this.remove = output();
        this.retryLoad = output();
        this.formatSize = formatSize;
    }
    static { this.ɵfac = function FileListingComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || FileListingComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: FileListingComponent, selectors: [["app-file-listing"]], inputs: { rows: [1, "rows"], sortField: [1, "sortField"], sortDir: [1, "sortDir"], error: [1, "error"], renameValue: [1, "renameValue"] }, outputs: { renameValue: "renameValueChange", sort: "sort", open: "open", download: "download", requeue: "requeue", renameStart: "renameStart", renameConfirm: "renameConfirm", renameCancel: "renameCancel", remove: "remove", retryLoad: "retryLoad" }, decls: 19, vars: 15, consts: [["hscrollTop", "", 1, "table-wrapper"], [2, "width", "24px"], ["app-sort-th", "", "field", "name", "label", "files.table.name", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "status", "label", "files.table.status", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "size", "label", "files.table.size", 3, "sort", "activeField", "dir"], ["app-sort-th", "", "field", "modified", "label", "files.table.modified", 3, "sort", "activeField", "dir"], [1, "file-icon"], ["name", "folder", 3, "size"], ["name", "file", 3, "size"], [1, "rename-form"], [1, "file-name-btn", 3, "dir"], [3, "progress", "progressAt"], [1, "emb-pill", 3, "class"], [1, "tag-list"], [2, "color", "var(--text-muted)"], [3, "value"], [2, "display", "flex", "gap", "6px", "align-items", "center"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", 3, "disabled"], [1, "btn-ghost", "btn", "btn-sm", 3, "click"], ["name", "pencil-simple", 3, "size"], [1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [1, "rename-form", 3, "ngSubmit"], ["type", "text", "name", "rn", 2, "width", "200px", 3, "ngModelChange", "ngModel"], ["type", "submit", 1, "btn-primary", "btn", "btn-sm"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", 3, "click"], [1, "file-name-btn", 3, "click"], [1, "emb-pill"], [1, "emb-dot"], [1, "tag-chip"], ["name", "download-simple", 3, "size"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", 3, "click", "disabled"], ["name", "arrows-clockwise", 3, "size"], ["colspan", "5"], [3, "message", "reason"], [1, "empty-state", 2, "padding", "32px"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "folder-open", 3, "size"]], template: function FileListingComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "table")(2, "thead")(3, "tr");
            i0.ɵɵelement(4, "th", 1);
            i0.ɵɵelementStart(5, "th", 2);
            i0.ɵɵlistener("sort", function FileListingComponent_Template_th_sort_5_listener($event) { return ctx.sort.emit($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(6, "th", 3);
            i0.ɵɵlistener("sort", function FileListingComponent_Template_th_sort_6_listener($event) { return ctx.sort.emit($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "th");
            i0.ɵɵtext(8);
            i0.ɵɵpipe(9, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(10, "th", 4);
            i0.ɵɵlistener("sort", function FileListingComponent_Template_th_sort_10_listener($event) { return ctx.sort.emit($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(11, "th", 5);
            i0.ɵɵlistener("sort", function FileListingComponent_Template_th_sort_11_listener($event) { return ctx.sort.emit($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(12, "th");
            i0.ɵɵtext(13);
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(15, "tbody");
            i0.ɵɵrepeaterCreate(16, FileListingComponent_For_17_Template, 27, 19, "tr", null, _forTrack0, false, FileListingComponent_ForEmpty_18_Template, 4, 1, "tr");
            i0.ɵɵelementEnd()()();
        } if (rf & 2) {
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 11, "files.table.tags"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance();
            i0.ɵɵproperty("activeField", ctx.sortField())("dir", ctx.sortDir());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 13, "files.table.actions"));
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.rows());
        } }, dependencies: [FormsModule, i1.ɵNgNoValidate, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.NgModel, i1.NgForm, PhIconComponent, ErrorStateComponent, TimestampComponent,
            StepProgressBarComponent, SortableHeaderComponent, HscrollTopDirective,
            TranslocoPipe], styles: [".file-icon[_ngcontent-%COMP%] { width: 20px; text-align: center; flex-shrink: 0; }\n\n  .file-name-btn[_ngcontent-%COMP%] {\n    background: none;\n    border: none;\n    color: var(--text-primary);\n    cursor: pointer;\n    font-size: 13px;\n    font-family: var(--font);\n    text-align: left;\n    padding: 0;\n  }\n  .file-name-btn.dir[_ngcontent-%COMP%] { color: var(--info); font-weight: 500; }\n  .file-name-btn[_ngcontent-%COMP%]:hover { text-decoration: underline; }\n\n  \n\n  .emb-pill[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500;\n    padding: 1px 8px; border-radius: 20px; white-space: nowrap; border: 1px solid transparent; }\n  .emb-pill[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%] { width: 6px; height: 6px; border-radius: 50%; flex: none; }\n  .emb-complete[_ngcontent-%COMP%] { color: var(--success); background: color-mix(in srgb, var(--success) 14%, transparent); border-color: color-mix(in srgb, var(--success) 30%, transparent); }\n  .emb-complete[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%] { background: var(--success); }\n  .emb-pending[_ngcontent-%COMP%], .emb-processing[_ngcontent-%COMP%] { color: var(--info); background: color-mix(in srgb, var(--info) 14%, transparent); border-color: color-mix(in srgb, var(--info) 30%, transparent); }\n  .emb-pending[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%], .emb-processing[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%] { background: var(--info); }\n  .emb-partial[_ngcontent-%COMP%] { color: var(--warning); background: color-mix(in srgb, var(--warning) 15%, transparent); border-color: color-mix(in srgb, var(--warning) 32%, transparent); }\n  .emb-partial[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%] { background: var(--warning); }\n  .emb-failed[_ngcontent-%COMP%] { color: var(--error); background: color-mix(in srgb, var(--error) 14%, transparent); border-color: color-mix(in srgb, var(--error) 30%, transparent); }\n  .emb-failed[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%] { background: var(--error); }\n  .emb-skipped[_ngcontent-%COMP%], .emb-disabled[_ngcontent-%COMP%] { color: var(--text-muted); background: var(--bg-elevated); border-color: var(--border); }\n  .emb-skipped[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%], .emb-disabled[_ngcontent-%COMP%]   .emb-dot[_ngcontent-%COMP%] { background: var(--text-muted); }\n  .tag-list[_ngcontent-%COMP%] { display: inline-flex; gap: 4px; flex-wrap: wrap; }\n  .tag-chip[_ngcontent-%COMP%] { font-size: 10.5px; padding: 1px 7px; border-radius: 20px; background: var(--bg-elevated);\n    border: 1px solid var(--border); color: var(--text-secondary); white-space: nowrap; }\n  .rename-form[_ngcontent-%COMP%] { display: flex; gap: 6px; align-items: center; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(FileListingComponent, [{
        type: Component,
        args: [{ selector: 'app-file-listing', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule, TranslocoPipe, PhIconComponent, ErrorStateComponent, TimestampComponent,
                    StepProgressBarComponent, SortableHeaderComponent, HscrollTopDirective], template: `
    <div class="table-wrapper" hscrollTop>
      <table>
        <thead>
          <tr>
            <th style="width:24px"></th>
            <th app-sort-th field="name" label="files.table.name" [activeField]="sortField()" [dir]="sortDir()" (sort)="sort.emit($event)"></th>
            <th app-sort-th field="status" label="files.table.status" [activeField]="sortField()" [dir]="sortDir()" (sort)="sort.emit($event)"></th>
            <th>{{ 'files.table.tags' | transloco }}</th>
            <th app-sort-th field="size" label="files.table.size" [activeField]="sortField()" [dir]="sortDir()" (sort)="sort.emit($event)"></th>
            <th app-sort-th field="modified" label="files.table.modified" [activeField]="sortField()" [dir]="sortDir()" (sort)="sort.emit($event)"></th>
            <th>{{ 'files.table.actions' | transloco }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.entry.name) {
            <tr>
              <td><span class="file-icon">@if (row.entry.isDirectory) { <ph-icon name="folder" [size]="16"/> } @else { <ph-icon name="file" [size]="16"/> }</span></td>
              <td>
                @if (row.renaming) {
                  <form class="rename-form" (ngSubmit)="renameConfirm.emit(row.entry)">
                    <input type="text" [(ngModel)]="renameValue" name="rn" [attr.aria-label]="'files.renameEntryAriaLabel' | transloco" style="width:200px" />
                    <button class="btn-primary btn btn-sm" type="submit">{{ 'common.save' | transloco }}</button>
                    <button class="btn-ghost btn btn-sm" type="button" (click)="renameCancel.emit()">{{ 'common.cancel' | transloco }}</button>
                  </form>
                } @else {
                  <button
                    class="file-name-btn"
                    [class.dir]="row.entry.isDirectory"
                    (click)="open.emit(row.entry)"
                  >{{ row.entry.name }}</button>
                }
              </td>
              <td>
                @if (row.entry.isFile && row.entry.progress) {
                  <!-- In flight AND the worker has reported a stage: show WHICH stage of this
                       file's own route is running, rather than a generic "embedding" + spinner
                       that looks identical whether the job is working or wedged. Falls back to
                       the pill below the moment the job finishes or before it reports. -->
                  <app-step-progress-bar
                    [progress]="row.entry.progress"
                    [progressAt]="row.entry.progressAt" />
                } @else if (row.entry.isFile && row.entry.embeddingStatus) {
                  <span class="emb-pill" [class]="'emb-' + row.entry.embeddingStatus">
                    <span class="emb-dot"></span>{{ 'files.embStatus.' + row.entry.embeddingStatus | transloco }}
                  </span>
                }
              </td>
              <td>
                @if (row.entry.tags?.length) {
                  <span class="tag-list">@for (t of row.entry.tags; track t) { <span class="tag-chip">{{ t }}</span> }</span>
                }
              </td>
              <td style="color:var(--text-muted)">
                {{ formatSize(row.entry.size) }}
              </td>
              <td><app-timestamp [value]="row.entry.modified"/></td>
              <td style="display:flex; gap:6px; align-items:center;">
                @if (row.entry.isFile) {
                  <button
                    type="button"
                    class="btn-ghost btn btn-sm"
                    (click)="download.emit(row.entry)"
                    [attr.aria-label]="'files.downloadAriaLabel' | transloco"
                  ><ph-icon name="download-simple" [size]="16"/></button>
                }
                @if (row.canRequeue) {
                  <!-- Re-embedding was reachable only from the detail pane, so fixing a file whose
                       embedding failed meant OPENING it first — and the row already tells you it
                       failed. The action belongs where the diagnosis is. Hidden while a job is
                       pending or processing: the server refuses that with a 409, and an action that
                       exists only to be refused is worse than one that is absent. -->
                  <button
                    type="button"
                    class="btn-ghost btn btn-sm"
                    [disabled]="row.requeueing"
                    (click)="requeue.emit(row.entry)"
                    [attr.title]="'brain.fileMeta.retryEmbedding' | transloco"
                    [attr.aria-label]="'files.reembedAriaLabel' | transloco"
                  ><ph-icon name="arrows-clockwise" [size]="16"/></button>
                }
                <!-- Rename is a pencil, not the word: it sat as the one text button among icons, so it
                     set the width of the actions column on every row and pushed delete off the edge on
                     a narrow window. Same label, on hover and for assistive tech. -->
                <button class="btn-ghost btn btn-sm" (click)="renameStart.emit(row.entry)"
                  [attr.title]="'files.rename' | transloco"
                  [attr.aria-label]="'files.renameEntryAriaLabel' | transloco"
                ><ph-icon name="pencil-simple" [size]="16"/></button>
                <button class="icon-btn danger" (click)="remove.emit(row.entry)" [attr.aria-label]="'files.deleteEntryAriaLabel' | transloco"><ph-icon name="x" [size]="16"/></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">
              @if (error() !== null) {
                <app-error-state [message]="'files.error.loadFiles' | transloco" [reason]="error() ?? ''" (retry)="retryLoad.emit()" />
              } @else {
              <div class="empty-state" style="padding:32px">
                <div class="empty-state-icon"><ph-icon name="folder-open" [size]="48"/></div>
                <h3>{{ 'files.emptyFolder.title' | transloco }}</h3>
                <p>{{ 'files.emptyFolder.body' | transloco }}</p>
              </div>
              }
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `, styles: ["\n  .file-icon { width: 20px; text-align: center; flex-shrink: 0; }\n\n  .file-name-btn {\n    background: none;\n    border: none;\n    color: var(--text-primary);\n    cursor: pointer;\n    font-size: 13px;\n    font-family: var(--font);\n    text-align: left;\n    padding: 0;\n  }\n  .file-name-btn.dir { color: var(--info); font-weight: 500; }\n  .file-name-btn:hover { text-decoration: underline; }\n\n  /* Merged metadata columns: embedding-status pill + tag chips (joined from the file's FileMeta). */\n  .emb-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500;\n    padding: 1px 8px; border-radius: 20px; white-space: nowrap; border: 1px solid transparent; }\n  .emb-pill .emb-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }\n  .emb-complete { color: var(--success); background: color-mix(in srgb, var(--success) 14%, transparent); border-color: color-mix(in srgb, var(--success) 30%, transparent); }\n  .emb-complete .emb-dot { background: var(--success); }\n  .emb-pending, .emb-processing { color: var(--info); background: color-mix(in srgb, var(--info) 14%, transparent); border-color: color-mix(in srgb, var(--info) 30%, transparent); }\n  .emb-pending .emb-dot, .emb-processing .emb-dot { background: var(--info); }\n  .emb-partial { color: var(--warning); background: color-mix(in srgb, var(--warning) 15%, transparent); border-color: color-mix(in srgb, var(--warning) 32%, transparent); }\n  .emb-partial .emb-dot { background: var(--warning); }\n  .emb-failed { color: var(--error); background: color-mix(in srgb, var(--error) 14%, transparent); border-color: color-mix(in srgb, var(--error) 30%, transparent); }\n  .emb-failed .emb-dot { background: var(--error); }\n  .emb-skipped, .emb-disabled { color: var(--text-muted); background: var(--bg-elevated); border-color: var(--border); }\n  .emb-skipped .emb-dot, .emb-disabled .emb-dot { background: var(--text-muted); }\n  .tag-list { display: inline-flex; gap: 4px; flex-wrap: wrap; }\n  .tag-chip { font-size: 10.5px; padding: 1px 7px; border-radius: 20px; background: var(--bg-elevated);\n    border: 1px solid var(--border); color: var(--text-secondary); white-space: nowrap; }\n  .rename-form { display: flex; gap: 6px; align-items: center; }\n"] }]
    }], null, { rows: [{ type: i0.Input, args: [{ isSignal: true, alias: "rows", required: false }] }], sortField: [{ type: i0.Input, args: [{ isSignal: true, alias: "sortField", required: false }] }], sortDir: [{ type: i0.Input, args: [{ isSignal: true, alias: "sortDir", required: false }] }], error: [{ type: i0.Input, args: [{ isSignal: true, alias: "error", required: false }] }], renameValue: [{ type: i0.Input, args: [{ isSignal: true, alias: "renameValue", required: false }] }, { type: i0.Output, args: ["renameValueChange"] }], sort: [{ type: i0.Output, args: ["sort"] }], open: [{ type: i0.Output, args: ["open"] }], download: [{ type: i0.Output, args: ["download"] }], requeue: [{ type: i0.Output, args: ["requeue"] }], renameStart: [{ type: i0.Output, args: ["renameStart"] }], renameConfirm: [{ type: i0.Output, args: ["renameConfirm"] }], renameCancel: [{ type: i0.Output, args: ["renameCancel"] }], remove: [{ type: i0.Output, args: ["remove"] }], retryLoad: [{ type: i0.Output, args: ["retryLoad"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(FileListingComponent, { className: "FileListingComponent", filePath: "app/pages/files/file-listing.component.ts", lineNumber: 169 }); })();
