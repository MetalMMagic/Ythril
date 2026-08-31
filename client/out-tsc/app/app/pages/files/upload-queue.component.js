import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { UPLOAD_QUEUE_STYLES } from './file-manager.styles';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.id;
function UploadQueueComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 3);
    i0.ɵɵlistener("click", function UploadQueueComponent_Conditional_4_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.clearFinished.emit()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "files.upload.clearFinished"), " ");
} }
function UploadQueueComponent_For_6_Case_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "files.upload.status.queued"), " ");
} }
function UploadQueueComponent_For_6_Case_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
} if (rf & 2) {
    const u_r3 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵtextInterpolate1(" ", u_r3.percent, "% ");
} }
function UploadQueueComponent_For_6_Case_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "files.upload.status.done"), " ");
} }
function UploadQueueComponent_For_6_Case_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    const u_r3 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵtextInterpolate1(" ", u_r3.error || i0.ɵɵpipeBind1(1, 1, "files.upload.status.failed"), " ");
} }
function UploadQueueComponent_For_6_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵelement(1, "div", 13);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const u_r3 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵstyleProp("width", u_r3.percent, "%");
} }
function UploadQueueComponent_For_6_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 3);
    i0.ɵɵlistener("click", function UploadQueueComponent_For_6_Conditional_13_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r4); const u_r3 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.retry.emit(u_r3)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.retry"));
} }
function UploadQueueComponent_For_6_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 3);
    i0.ɵɵlistener("click", function UploadQueueComponent_For_6_Conditional_14_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r5); const u_r3 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.cancel.emit(u_r3)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.cancel"));
} }
function UploadQueueComponent_For_6_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 14);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function UploadQueueComponent_For_6_Conditional_15_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r6); const u_r3 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.dismiss.emit(u_r3)); });
    i0.ɵɵelement(2, "ph-icon", 15);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 2, "files.upload.dismiss"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function UploadQueueComponent_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵelement(1, "ph-icon", 5);
    i0.ɵɵelementStart(2, "div", 6)(3, "div", 7)(4, "span", 8);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span", 9);
    i0.ɵɵconditionalCreate(7, UploadQueueComponent_For_6_Case_7_Template, 2, 3)(8, UploadQueueComponent_For_6_Case_8_Template, 1, 1)(9, UploadQueueComponent_For_6_Case_9_Template, 2, 3)(10, UploadQueueComponent_For_6_Case_10_Template, 2, 3);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(11, UploadQueueComponent_For_6_Conditional_11_Template, 2, 2, "div", 10);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "div", 11);
    i0.ɵɵconditionalCreate(13, UploadQueueComponent_For_6_Conditional_13_Template, 3, 3, "button", 1);
    i0.ɵɵconditionalCreate(14, UploadQueueComponent_For_6_Conditional_14_Template, 3, 3, "button", 1);
    i0.ɵɵconditionalCreate(15, UploadQueueComponent_For_6_Conditional_15_Template, 3, 4, "button", 12);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_16_0;
    const u_r3 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("failed", u_r3.status === "failed")("done", u_r3.status === "done");
    i0.ɵɵadvance();
    i0.ɵɵproperty("name", ctx_r1.iconFor(u_r3.status))("size", 14);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("title", u_r3.name);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(u_r3.name);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_16_0 = u_r3.status) === "queued" ? 7 : tmp_16_0 === "uploading" ? 8 : tmp_16_0 === "done" ? 9 : tmp_16_0 === "failed" ? 10 : -1);
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(u_r3.status === "uploading" || u_r3.status === "queued" ? 11 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(u_r3.status === "failed" ? 13 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(u_r3.status === "queued" || u_r3.status === "uploading" ? 14 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(u_r3.status === "done" || u_r3.status === "failed" ? 15 : -1);
} }
/**
 * The upload panel: one row per file, with its progress and the actions its state allows.
 *
 * ## What stays behind, and why
 *
 * **The queue itself.** Ordering, the one-at-a-time rule, the HTTP subscriptions, retry and cancel semantics
 * — all of that is the page's, and it is what `file-manager.component.spec.ts`'s upload cases exercise. This
 * component reports which button was pressed and renders what it is given; it holds no state at all.
 *
 * That division is deliberate rather than minimal. An upload in flight owns a subscription, and a component
 * that owned it would abort on destroy — so navigating away from the tab, or any structural change that
 * remounted this panel, would silently cancel a running upload. The page outlives both.
 *
 * ## The actions are per-state, and that is the behaviour worth keeping in one place
 *
 * Retry belongs to a failed row, cancel to one that is queued or uploading, dismiss to one that is finished
 * either way. Written out three times in the old markup, and each `@if` was the only thing standing between a
 * user and a cancel button on a completed upload.
 */
export class UploadQueueComponent {
    constructor() {
        this.uploads = input([], ...(ngDevMode ? [{ debugName: "uploads" }] : /* istanbul ignore next */ []));
        /** Whether any row is finished — the page decides, because it is the page that knows the whole queue. */
        this.hasFinished = input(false, ...(ngDevMode ? [{ debugName: "hasFinished" }] : /* istanbul ignore next */ []));
        this.retry = output();
        this.cancel = output();
        this.dismiss = output();
        this.clearFinished = output();
    }
    /**
     * The icon for a status — a pure mapping, and it belongs here rather than on the page.
     *
     * It was `uploadIcon` on a 1 618-line component that also uploads files. Which glyph means "queued" is a
     * question about how a row LOOKS, and nothing else on that page needed the answer.
     */
    iconFor(status) {
        switch (status) {
            case 'done': return 'check-circle';
            case 'failed': return 'warning';
            case 'uploading': return 'arrow-up';
            default: return 'timer';
        }
    }
    static { this.ɵfac = function UploadQueueComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || UploadQueueComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: UploadQueueComponent, selectors: [["app-upload-queue"]], hostAttrs: [1, "upload-panel"], inputs: { uploads: [1, "uploads"], hasFinished: [1, "hasFinished"] }, outputs: { retry: "retry", cancel: "cancel", dismiss: "dismiss", clearFinished: "clearFinished" }, decls: 7, vars: 4, consts: [[1, "upload-panel-head"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm"], [1, "upload-row", 3, "failed", "done"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", 3, "click"], [1, "upload-row"], [1, "upload-row-icon", 3, "name", "size"], [1, "upload-row-body"], [1, "upload-row-top"], [1, "upload-name", 3, "title"], [1, "upload-state"], [1, "upload-bar"], [1, "upload-row-actions"], ["type", "button", 1, "icon-btn"], [1, "upload-bar-fill"], ["type", "button", 1, "icon-btn", 3, "click"], ["name", "x", 3, "size"]], template: function UploadQueueComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "span");
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(4, UploadQueueComponent_Conditional_4_Template, 3, 3, "button", 1);
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(5, UploadQueueComponent_For_6_Template, 16, 13, "div", 2, _forTrack0);
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "files.upload.queueTitle"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.hasFinished() ? 4 : -1);
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.uploads());
        } }, dependencies: [PhIconComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] {\n    border: 1px solid var(--border);\n    border-radius: var(--radius-md);\n    margin-bottom: 16px;\n    overflow: hidden;\n  }\n  .upload-panel-head[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    padding: 8px 12px;\n    font-size: 12px;\n    font-weight: 600;\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    color: var(--text-muted);\n    background: var(--bg-surface);\n    border-bottom: 1px solid var(--border);\n  }\n  .upload-row[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    padding: 8px 12px;\n  }\n  .upload-row[_ngcontent-%COMP%]    + .upload-row[_ngcontent-%COMP%] { border-top: 1px solid var(--border); }\n  .upload-row-icon[_ngcontent-%COMP%] { flex-shrink: 0; color: var(--text-secondary); }\n  .upload-row.done[_ngcontent-%COMP%]   .upload-row-icon[_ngcontent-%COMP%] { color: var(--success); }\n  .upload-row.failed[_ngcontent-%COMP%]   .upload-row-icon[_ngcontent-%COMP%] { color: var(--error); }\n  .upload-row-body[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n  .upload-row-top[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: baseline;\n    justify-content: space-between;\n    gap: 10px;\n  }\n  .upload-name[_ngcontent-%COMP%] {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    font-size: 13px;\n  }\n  .upload-state[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    font-size: 12px;\n    color: var(--text-muted);\n    font-variant-numeric: tabular-nums;\n  }\n  .upload-row.failed[_ngcontent-%COMP%]   .upload-state[_ngcontent-%COMP%] { color: var(--error); }\n  .upload-bar[_ngcontent-%COMP%] {\n    height: 4px;\n    background: var(--border);\n    border-radius: 2px;\n    overflow: hidden;\n    margin-top: 6px;\n  }\n  .upload-bar-fill[_ngcontent-%COMP%] {\n    height: 100%;\n    background: var(--accent);\n    transition: width 0.2s;\n  }\n  .upload-row-actions[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n    flex-shrink: 0;\n  }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(UploadQueueComponent, [{
        type: Component,
        args: [{ selector: 'app-upload-queue', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, PhIconComponent], host: { class: 'upload-panel' }, template: `
    <div class="upload-panel-head">
      <span>{{ 'files.upload.queueTitle' | transloco }}</span>
      @if (hasFinished()) {
        <button class="btn-ghost btn btn-sm" type="button" (click)="clearFinished.emit()">
          {{ 'files.upload.clearFinished' | transloco }}
        </button>
      }
    </div>
    @for (u of uploads(); track u.id) {
      <div class="upload-row" [class.failed]="u.status === 'failed'" [class.done]="u.status === 'done'">
        <ph-icon class="upload-row-icon" [name]="iconFor(u.status)" [size]="14"/>
        <div class="upload-row-body">
          <div class="upload-row-top">
            <span class="upload-name" [title]="u.name">{{ u.name }}</span>
            <span class="upload-state">
              @switch (u.status) {
                @case ('queued') { {{ 'files.upload.status.queued' | transloco }} }
                @case ('uploading') { {{ u.percent }}% }
                @case ('done') { {{ 'files.upload.status.done' | transloco }} }
                @case ('failed') { {{ u.error || ('files.upload.status.failed' | transloco) }} }
              }
            </span>
          </div>
          @if (u.status === 'uploading' || u.status === 'queued') {
            <div class="upload-bar">
              <div class="upload-bar-fill" [style.width.%]="u.percent"></div>
            </div>
          }
        </div>
        <div class="upload-row-actions">
          @if (u.status === 'failed') {
            <button class="btn-ghost btn btn-sm" type="button" (click)="retry.emit(u)">{{ 'common.retry' | transloco }}</button>
          }
          @if (u.status === 'queued' || u.status === 'uploading') {
            <button class="btn-ghost btn btn-sm" type="button" (click)="cancel.emit(u)">{{ 'common.cancel' | transloco }}</button>
          }
          @if (u.status === 'done' || u.status === 'failed') {
            <button class="icon-btn" type="button" [attr.aria-label]="'files.upload.dismiss' | transloco" (click)="dismiss.emit(u)">
              <ph-icon name="x" [size]="12"/>
            </button>
          }
        </div>
      </div>
    }
  `, styles: ["\n  :host {\n    border: 1px solid var(--border);\n    border-radius: var(--radius-md);\n    margin-bottom: 16px;\n    overflow: hidden;\n  }\n  .upload-panel-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    padding: 8px 12px;\n    font-size: 12px;\n    font-weight: 600;\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    color: var(--text-muted);\n    background: var(--bg-surface);\n    border-bottom: 1px solid var(--border);\n  }\n  .upload-row {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    padding: 8px 12px;\n  }\n  .upload-row + .upload-row { border-top: 1px solid var(--border); }\n  .upload-row-icon { flex-shrink: 0; color: var(--text-secondary); }\n  .upload-row.done .upload-row-icon { color: var(--success); }\n  .upload-row.failed .upload-row-icon { color: var(--error); }\n  .upload-row-body { flex: 1; min-width: 0; }\n  .upload-row-top {\n    display: flex;\n    align-items: baseline;\n    justify-content: space-between;\n    gap: 10px;\n  }\n  .upload-name {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    font-size: 13px;\n  }\n  .upload-state {\n    flex-shrink: 0;\n    font-size: 12px;\n    color: var(--text-muted);\n    font-variant-numeric: tabular-nums;\n  }\n  .upload-row.failed .upload-state { color: var(--error); }\n  .upload-bar {\n    height: 4px;\n    background: var(--border);\n    border-radius: 2px;\n    overflow: hidden;\n    margin-top: 6px;\n  }\n  .upload-bar-fill {\n    height: 100%;\n    background: var(--accent);\n    transition: width 0.2s;\n  }\n  .upload-row-actions {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n    flex-shrink: 0;\n  }\n\n"] }]
    }], null, { uploads: [{ type: i0.Input, args: [{ isSignal: true, alias: "uploads", required: false }] }], hasFinished: [{ type: i0.Input, args: [{ isSignal: true, alias: "hasFinished", required: false }] }], retry: [{ type: i0.Output, args: ["retry"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], dismiss: [{ type: i0.Output, args: ["dismiss"] }], clearFinished: [{ type: i0.Output, args: ["clearFinished"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(UploadQueueComponent, { className: "UploadQueueComponent", filePath: "app/pages/files/upload-queue.component.ts", lineNumber: 97 }); })();
