import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntityRefFieldComponent } from '../brain/entity-ref-field.component';
import { MemoryRefFieldComponent } from '../brain/memory-ref-field.component';
import { ChronoRefFieldComponent } from '../brain/chrono-ref-field.component';
import { FILE_META_EDITOR_STYLES } from './file-manager.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function FileMetaEditorComponent_Conditional_0_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.error());
} }
function FileMetaEditorComponent_Conditional_0_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 12);
    i0.ɵɵlistener("click", function FileMetaEditorComponent_Conditional_0_Conditional_34_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.retryEmbedding.emit()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("disabled", ctx_r1.retryPending());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "brain.fileMeta.retryEmbedding"));
} }
function FileMetaEditorComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "form", 1);
    i0.ɵɵlistener("ngSubmit", function FileMetaEditorComponent_Conditional_0_Template_form_ngSubmit_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.save.emit()); });
    i0.ɵɵelementStart(1, "div", 2)(2, "label");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "textarea", 3);
    i0.ɵɵtwoWayListener("ngModelChange", function FileMetaEditorComponent_Conditional_0_Template_textarea_ngModelChange_5_listener($event) { const m_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(m_r3.description, $event) || (m_r3.description = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "div", 2)(7, "label");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "app-tag-input", 4);
    i0.ɵɵtwoWayListener("valueChange", function FileMetaEditorComponent_Conditional_0_Template_app_tag_input_valueChange_10_listener($event) { const m_r3 = i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(m_r3.tags, $event) || (m_r3.tags = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "div", 2)(12, "label");
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(15, "app-entity-ref-field", 5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "div", 2)(17, "label");
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(20, "app-memory-ref-field", 6);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(21, "div", 2)(22, "label");
    i0.ɵɵtext(23);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(25, "app-chrono-ref-field", 6);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(26, FileMetaEditorComponent_Conditional_0_Conditional_26_Template, 2, 1, "div", 7);
    i0.ɵɵelementStart(27, "div", 8)(28, "button", 9);
    i0.ɵɵtext(29);
    i0.ɵɵpipe(30, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(31, "button", 10);
    i0.ɵɵlistener("click", function FileMetaEditorComponent_Conditional_0_Template_button_click_31_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.cancel.emit()); });
    i0.ɵɵtext(32);
    i0.ɵɵpipe(33, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(34, FileMetaEditorComponent_Conditional_0_Conditional_34_Template, 3, 4, "button", 11);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const m_r3 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 16, "brain.fileMeta.table.description"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", m_r3.description);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 18, "brain.fileMeta.table.tags"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("value", m_r3.tags);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 20, "brain.fileMeta.table.entities"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", m_r3)("spaceId", ctx_r1.spaceId());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 22, "brain.fileMeta.table.memories"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", m_r3);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 24, "brain.fileMeta.table.chrono"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("target", m_r3);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.error() ? 26 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.saving());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(30, 26, "common.save"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 28, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.canRetryEmbedding() ? 34 : -1);
} }
/**
 * The file-meta edit face of the docked detail pane — description, tags, and the three reference fields.
 *
 * ## The model is MUTATED IN PLACE, and that is the existing contract
 *
 * `app-entity-ref-field` and its two siblings take a `[target]` object and write their results straight into
 * it. So this component passes the object it was given, unchanged and unwrapped: copying it defensively — the
 * instinct an extraction usually rewards — would make every reference edit vanish on save, because the page
 * would still be holding the original.
 *
 * The page replaces the whole object when it re-seeds (opening the face, or cancelling), which is a new input
 * value and re-renders this component. Mutation for the fields, replacement for the reset: both already true
 * before the split, and both easy to get wrong while moving them.
 *
 * ## Saving stays on the page
 *
 * Same reasoning as the upload queue's. The request is the page's — it knows the space, the path, and what to
 * reload afterwards — and a component that owned it would cancel a save in flight if the pane closed. This
 * one reports that Save was pressed.
 */
export class FileMetaEditorComponent {
    constructor() {
        /** Passed through unwrapped — the reference widgets write into this object. See the class docblock. */
        this.model = input(null, ...(ngDevMode ? [{ debugName: "model" }] : /* istanbul ignore next */ []));
        this.spaceId = input('', ...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
        this.error = input(null, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.saving = input(false, ...(ngDevMode ? [{ debugName: "saving" }] : /* istanbul ignore next */ []));
        /**
         * Whether a re-embed is worth offering, decided by the page.
         *
         * It is a question about the FILE's embedding status, not about this form, and answering it here would mean
         * teaching the editor what a partial embedding is.
         */
        this.canRetryEmbedding = input(false, ...(ngDevMode ? [{ debugName: "canRetryEmbedding" }] : /* istanbul ignore next */ []));
        this.retryPending = input(false, ...(ngDevMode ? [{ debugName: "retryPending" }] : /* istanbul ignore next */ []));
        this.save = output();
        this.cancel = output();
        this.retryEmbedding = output();
    }
    static { this.ɵfac = function FileMetaEditorComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || FileMetaEditorComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: FileMetaEditorComponent, selectors: [["app-file-meta-editor"]], inputs: { model: [1, "model"], spaceId: [1, "spaceId"], error: [1, "error"], saving: [1, "saving"], canRetryEmbedding: [1, "canRetryEmbedding"], retryPending: [1, "retryPending"] }, outputs: { save: "save", cancel: "cancel", retryEmbedding: "retryEmbedding" }, decls: 1, vars: 1, consts: [[1, "detail-meta-form"], [1, "detail-meta-form", 3, "ngSubmit"], [1, "field"], ["name", "detailDesc", "rows", "3", 3, "ngModelChange", "ngModel"], ["inputName", "detailTags", 3, "valueChange", "value"], [3, "target", "spaceId"], [3, "target"], ["role", "alert", 1, "alert", "alert-error"], [1, "detail-meta-actions"], ["type", "submit", 1, "btn", "btn-sm", "btn-primary", 3, "disabled"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click"], ["type", "button", 1, "btn", "btn-sm", "btn-ghost", 3, "disabled"], ["type", "button", 1, "btn", "btn-sm", "btn-ghost", 3, "click", "disabled"]], template: function FileMetaEditorComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, FileMetaEditorComponent_Conditional_0_Template, 35, 30, "form", 0);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.model()) ? 0 : -1, tmp_0_0);
        } }, dependencies: [FormsModule, i1.ɵNgNoValidate, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.NgModel, i1.NgForm, TagInputComponent, EntityRefFieldComponent,
            MemoryRefFieldComponent, ChronoRefFieldComponent,
            TranslocoPipe], styles: [".detail-meta-form[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin-bottom: 12px; }\n  .detail-meta-form[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display: block; margin-bottom: 4px; font-size: 0.8em; color: var(--text-muted); }\n  .detail-meta-form[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] { width: 100%; resize: vertical; }\n  .detail-meta-actions[_ngcontent-%COMP%] { display: flex; gap: 8px; align-items: center; margin-top: 6px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(FileMetaEditorComponent, [{
        type: Component,
        args: [{ selector: 'app-file-meta-editor', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule, TranslocoPipe, TagInputComponent, EntityRefFieldComponent,
                    MemoryRefFieldComponent, ChronoRefFieldComponent], template: `
    @if (model(); as m) {
      <form class="detail-meta-form" (ngSubmit)="save.emit()">
        <div class="field">
          <label>{{ 'brain.fileMeta.table.description' | transloco }}</label>
          <textarea [(ngModel)]="m.description" name="detailDesc" rows="3"></textarea>
        </div>
        <div class="field">
          <label>{{ 'brain.fileMeta.table.tags' | transloco }}</label>
          <app-tag-input [(value)]="m.tags" inputName="detailTags" />
        </div>
        <div class="field">
          <label>{{ 'brain.fileMeta.table.entities' | transloco }}</label>
          <app-entity-ref-field [target]="m" [spaceId]="spaceId()" />
        </div>
        <div class="field">
          <label>{{ 'brain.fileMeta.table.memories' | transloco }}</label>
          <app-memory-ref-field [target]="m" />
        </div>
        <div class="field">
          <label>{{ 'brain.fileMeta.table.chrono' | transloco }}</label>
          <app-chrono-ref-field [target]="m" />
        </div>
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <div class="detail-meta-actions">
          <button class="btn btn-sm btn-primary" type="submit" [disabled]="saving()">{{ 'common.save' | transloco }}</button>
          <button class="btn btn-sm btn-secondary" type="button" (click)="cancel.emit()">{{ 'common.cancel' | transloco }}</button>
          @if (canRetryEmbedding()) {
            <button class="btn btn-sm btn-ghost" type="button" [disabled]="retryPending()"
              (click)="retryEmbedding.emit()">{{ 'brain.fileMeta.retryEmbedding' | transloco }}</button>
          }
        </div>
      </form>
    }
  `, styles: ["\n  .detail-meta-form .field { margin-bottom: 12px; }\n  .detail-meta-form label { display: block; margin-bottom: 4px; font-size: 0.8em; color: var(--text-muted); }\n  .detail-meta-form textarea { width: 100%; resize: vertical; }\n  .detail-meta-actions { display: flex; gap: 8px; align-items: center; margin-top: 6px; }\n"] }]
    }], null, { model: [{ type: i0.Input, args: [{ isSignal: true, alias: "model", required: false }] }], spaceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaceId", required: false }] }], error: [{ type: i0.Input, args: [{ isSignal: true, alias: "error", required: false }] }], saving: [{ type: i0.Input, args: [{ isSignal: true, alias: "saving", required: false }] }], canRetryEmbedding: [{ type: i0.Input, args: [{ isSignal: true, alias: "canRetryEmbedding", required: false }] }], retryPending: [{ type: i0.Input, args: [{ isSignal: true, alias: "retryPending", required: false }] }], save: [{ type: i0.Output, args: ["save"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], retryEmbedding: [{ type: i0.Output, args: ["retryEmbedding"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(FileMetaEditorComponent, { className: "FileMetaEditorComponent", filePath: "app/pages/files/file-meta-editor.component.ts", lineNumber: 89 }); })();
