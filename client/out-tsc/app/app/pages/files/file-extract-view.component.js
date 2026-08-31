import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { FILE_EXTRACT_STYLES } from './file-manager.styles';
import { msRange } from './file-format';
import * as i0 from "@angular/core";
const _c0 = (a0, a1) => ({ shown: a0, total: a1 });
const _c1 = a0 => ({ count: a0 });
const _forTrack0 = ($index, $item) => $item.id;
const _forTrack1 = ($index, $item) => $item.path;
function FileExtractViewComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.extract.loading"));
} }
function FileExtractViewComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 3);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function FileExtractViewComponent_Conditional_2_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.retry.emit()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "files.extract.error"))("reason", ctx_r1.error() ?? "");
} }
function FileExtractViewComponent_Conditional_3_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const x_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(x_r3.conversionError);
} }
function FileExtractViewComponent_Conditional_3_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.extract.noChunks"));
} }
function FileExtractViewComponent_Conditional_3_For_7_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 9);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r4 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.msRange(c_r4.chunkOffsetMs, c_r4.chunkDurationMs));
} }
function FileExtractViewComponent_Conditional_3_For_7_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 9);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r4 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(c_r4.headingText);
} }
function FileExtractViewComponent_Conditional_3_For_7_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 10);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const c_r4 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(c_r4.embeddingStatus);
} }
function FileExtractViewComponent_Conditional_3_For_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5)(1, "div", 7)(2, "span", 8);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(4, FileExtractViewComponent_Conditional_3_For_7_Conditional_4_Template, 2, 1, "span", 9)(5, FileExtractViewComponent_Conditional_3_For_7_Conditional_5_Template, 2, 1, "span", 9);
    i0.ɵɵconditionalCreate(6, FileExtractViewComponent_Conditional_3_For_7_Conditional_6_Template, 2, 1, "span", 10);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "p", 11);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const c_r4 = ctx.$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("#", c_r4.index);
    i0.ɵɵadvance();
    i0.ɵɵconditional(c_r4.chunkOffsetMs !== null ? 4 : c_r4.headingText ? 5 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(c_r4.embeddingStatus && c_r4.embeddingStatus !== "complete" ? 6 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(c_r4.content);
} }
function FileExtractViewComponent_Conditional_3_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 12);
    i0.ɵɵlistener("click", function FileExtractViewComponent_Conditional_3_Conditional_8_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.more.emit()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.extract.more"));
} }
function FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Conditional_3_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const img_r6 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "files.detail.descriptionSource." + img_r6.descriptionSource + "Hint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "files.detail.descriptionSource." + img_r6.descriptionSource));
} }
function FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵconditionalCreate(2, FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Conditional_3_Conditional_2_Template, 4, 6, "span", 15);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const img_r6 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", img_r6.description, " ");
    i0.ɵɵadvance();
    i0.ɵɵconditional(img_r6.descriptionSource ? 2 : -1);
} }
function FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.extract.noCaption"));
} }
function FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13)(1, "span", 14);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Conditional_3_Template, 3, 2, "p")(4, FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Conditional_4_Template, 3, 3, "p", 1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const img_r6 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(img_r6.path);
    i0.ɵɵadvance();
    i0.ɵɵconditional(img_r6.description ? 3 : 4);
} }
function FileExtractViewComponent_Conditional_3_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section")(1, "h4");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(4, FileExtractViewComponent_Conditional_3_Conditional_9_For_5_Template, 5, 2, "div", 13, _forTrack1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const x_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(3, 1, "files.extract.images", i0.ɵɵpureFunction1(4, _c1, x_r3.images.length)));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(x_r3.images);
} }
function FileExtractViewComponent_Conditional_3_Conditional_10_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "files.extract.truncated"));
} }
function FileExtractViewComponent_Conditional_3_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "section")(1, "h4");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 16);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, FileExtractViewComponent_Conditional_3_Conditional_10_Conditional_6_Template, 3, 3, "div", 1);
    i0.ɵɵelementStart(7, "pre", 17);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const conv_r7 = ctx;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "files.extract.converted"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(conv_r7.path);
    i0.ɵɵadvance();
    i0.ɵɵconditional(conv_r7.truncated ? 6 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(conv_r7.markdown);
} }
function FileExtractViewComponent_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, FileExtractViewComponent_Conditional_3_Conditional_0_Template, 2, 1, "div", 4);
    i0.ɵɵelementStart(1, "section")(2, "h4");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(5, FileExtractViewComponent_Conditional_3_Conditional_5_Template, 3, 3, "p", 1);
    i0.ɵɵrepeaterCreate(6, FileExtractViewComponent_Conditional_3_For_7_Template, 9, 4, "div", 5, _forTrack0);
    i0.ɵɵconditionalCreate(8, FileExtractViewComponent_Conditional_3_Conditional_8_Template, 3, 3, "button", 6);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(9, FileExtractViewComponent_Conditional_3_Conditional_9_Template, 6, 6, "section");
    i0.ɵɵconditionalCreate(10, FileExtractViewComponent_Conditional_3_Conditional_10_Template, 9, 6, "section");
} if (rf & 2) {
    let tmp_8_0;
    const x_r3 = ctx;
    i0.ɵɵconditional(x_r3.conversionError ? 0 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 6, "files.extract.chunks", i0.ɵɵpureFunction2(9, _c0, x_r3.chunks.length, x_r3.chunkTotal)));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(x_r3.chunks.length === 0 ? 5 : -1);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(x_r3.chunks);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(x_r3.chunkTotal > x_r3.chunks.length + x_r3.skip ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(x_r3.images.length > 0 ? 9 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_8_0 = x_r3.converted) ? 10 : -1, tmp_8_0);
} }
/**
 * What retrieval actually sees for one file: its chunks, their provenance, and the converted markdown.
 *
 * ## Why this view exists at all
 *
 * `_converted/` and `_extracted/` are hidden from file browsing, which is right — they are machine output, not
 * documents anyone filed. Hiding them removed the only way to answer *"what did the pipeline get out of this
 * file?"*, which is the first question when a document answers queries badly. Hidden from browsing, not from
 * inspection: nothing here is new data, these are records conversion already wrote.
 *
 * ## What stayed on the page
 *
 * Fetching, paging and retry. `more` and `retry` are reported rather than performed, for the reason the upload
 * queue and the meta editor both record: the request is the page's, and a component that owned it would drop
 * an in-flight page load when the pane switched tabs.
 *
 * The largest single block of the file manager's template (G-3), and the last of its detail pane.
 */
export class FileExtractViewComponent {
    constructor() {
        this.extract = input(null, ...(ngDevMode ? [{ debugName: "extract" }] : /* istanbul ignore next */ []));
        this.loading = input(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = input(null, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /** Load the next page of chunks. The page owns the cursor, so this only says the button was pressed. */
        this.more = output();
        this.retry = output();
        /**
         * A chunk's clock range, for media provenance.
         *
         * It came off the page with this markup: an audio or video file is chunked by TIME, so "where did this text
         * come from" is a clock range — and the page had no other use for it. It lives in `file-format.ts` beside
         * `formatSize` rather than here, so there is one definition and its three test cases exercise the function
         * instead of reaching through a 1 400-line component for it.
         */
        this.msRange = msRange;
    }
    static { this.ɵfac = function FileExtractViewComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || FileExtractViewComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: FileExtractViewComponent, selectors: [["app-file-extract-view"]], inputs: { extract: [1, "extract"], loading: [1, "loading"], error: [1, "error"] }, outputs: { more: "more", retry: "retry" }, decls: 4, vars: 1, consts: [[1, "detail-extract"], [1, "muted"], [3, "message", "reason"], [3, "retry", "message", "reason"], ["role", "alert", 1, "alert", "alert-error"], [1, "chunk"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary"], [1, "chunk-head"], [1, "chunk-ix"], [1, "chunk-prov"], [1, "chunk-warn"], [1, "chunk-body"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click"], [1, "xtr-image"], [1, "xtr-path"], [1, "desc-src"], [1, "muted", "xtr-path"], [1, "xtr-md"]], template: function FileExtractViewComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0);
            i0.ɵɵconditionalCreate(1, FileExtractViewComponent_Conditional_1_Template, 3, 3, "div", 1)(2, FileExtractViewComponent_Conditional_2_Template, 2, 4, "app-error-state", 2)(3, FileExtractViewComponent_Conditional_3_Template, 11, 12);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.loading() ? 1 : ctx.error() ? 2 : (tmp_0_0 = ctx.extract()) ? 3 : -1, tmp_0_0);
        } }, dependencies: [ErrorStateComponent, TranslocoPipe], styles: ["\n\n\n  .detail-extract[_ngcontent-%COMP%]   section[_ngcontent-%COMP%] { margin-bottom: 18px; }\n  .detail-extract[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] { margin: 0 0 8px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }\n  .detail-extract[_ngcontent-%COMP%]   .muted[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 0.9em; }\n  .chunk[_ngcontent-%COMP%] { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background: var(--bg-primary); }\n  .chunk-head[_ngcontent-%COMP%] { display: flex; gap: 8px; align-items: baseline; margin-bottom: 5px; font-size: 0.82em; }\n  .chunk-ix[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); color: var(--text-muted); flex: none; }\n  \n\n  .chunk-prov[_ngcontent-%COMP%] { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n  .chunk-warn[_ngcontent-%COMP%] { color: var(--warning); flex: none; }\n  \n\n  .chunk-body[_ngcontent-%COMP%] { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.45; font-size: 0.92em; }\n  .xtr-image[_ngcontent-%COMP%] { border-top: 1px solid var(--border); padding: 8px 0; }\n  .xtr-image[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 4px 0 0; line-height: 1.45; font-size: 0.92em; }\n  .xtr-path[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 0.82em; color: var(--text-muted); word-break: break-all; }\n  .xtr-md[_ngcontent-%COMP%] { margin: 6px 0 0; padding: 10px; border: 1px solid var(--border); border-radius: 8px;\n    background: var(--bg-primary); max-height: 40vh; overflow: auto; white-space: pre-wrap;\n    word-break: break-word; font-size: 0.85em; line-height: 1.45; }\n  .detail-extract[_ngcontent-%COMP%]   .desc-src[_ngcontent-%COMP%] { margin-left: 6px; padding: 1px 6px; border: 1px solid var(--border);\n    border-radius: 10px; font-size: 0.86em; color: var(--text-muted); cursor: help; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(FileExtractViewComponent, [{
        type: Component,
        args: [{ selector: 'app-file-extract-view', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, ErrorStateComponent], template: `
  <div class="detail-extract">
    @if (loading()) {
      <div class="muted">{{ 'files.extract.loading' | transloco }}</div>
    } @else if (error()) {
      <app-error-state [message]="'files.extract.error' | transloco" [reason]="error() ?? ''" (retry)="retry.emit()" />
    } @else if (extract(); as x) {
      @if (x.conversionError) {
        <div class="alert alert-error" role="alert">{{ x.conversionError }}</div>
      }

      <!-- Chunks first, deliberately: they ARE what retrieval matches on. The converted
           Markdown is the input to chunking, and the images are a side product. -->
      <section>
        <h4>{{ 'files.extract.chunks' | transloco: { shown: x.chunks.length, total: x.chunkTotal } }}</h4>
        @if (x.chunks.length === 0) {
          <p class="muted">{{ 'files.extract.noChunks' | transloco }}</p>
        }
        @for (c of x.chunks; track c.id) {
          <div class="chunk">
            <div class="chunk-head">
              <span class="chunk-ix">#{{ c.index }}</span>
              <!-- One provenance line, whichever kind of provenance this chunk has: a
                   timestamp for audio, the heading it opened for a document. -->
              @if (c.chunkOffsetMs !== null) {
                <span class="chunk-prov">{{ msRange(c.chunkOffsetMs, c.chunkDurationMs) }}</span>
              } @else if (c.headingText) {
                <span class="chunk-prov">{{ c.headingText }}</span>
              }
              @if (c.embeddingStatus && c.embeddingStatus !== 'complete') {
                <span class="chunk-warn">{{ c.embeddingStatus }}</span>
              }
            </div>
            <p class="chunk-body">{{ c.content }}</p>
          </div>
        }
        @if (x.chunkTotal > x.chunks.length + x.skip) {
          <button class="btn btn-sm btn-secondary" type="button" (click)="more.emit()">{{ 'files.extract.more' | transloco }}</button>
        }
      </section>

      @if (x.images.length > 0) {
        <section>
          <h4>{{ 'files.extract.images' | transloco: { count: x.images.length } }}</h4>
          @for (img of x.images; track img.path) {
            <div class="xtr-image">
              <span class="xtr-path">{{ img.path }}</span>
              @if (img.description) {
                <p>
                  {{ img.description }}
                  @if (img.descriptionSource) {
                    <span class="desc-src" [attr.title]="'files.detail.descriptionSource.' + img.descriptionSource + 'Hint' | transloco">{{ 'files.detail.descriptionSource.' + img.descriptionSource | transloco }}</span>
                  }
                </p>
              } @else {
                <p class="muted">{{ 'files.extract.noCaption' | transloco }}</p>
              }
            </div>
          }
        </section>
      }

      @if (x.converted; as conv) {
        <section>
          <h4>{{ 'files.extract.converted' | transloco }}</h4>
          <div class="muted xtr-path">{{ conv.path }}</div>
          @if (conv.truncated) {
            <div class="muted">{{ 'files.extract.truncated' | transloco }}</div>
          }
          <pre class="xtr-md">{{ conv.markdown }}</pre>
        </section>
      }
    }
  </div>
  `, styles: ["\n  /* Extract face. A diagnostic, so it is dense and legible rather than pretty: the chunk bodies are the\n     thing being read, and everything else is a label on them. */\n  .detail-extract section { margin-bottom: 18px; }\n  .detail-extract h4 { margin: 0 0 8px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }\n  .detail-extract .muted { color: var(--text-muted); font-size: 0.9em; }\n  .chunk { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background: var(--bg-primary); }\n  .chunk-head { display: flex; gap: 8px; align-items: baseline; margin-bottom: 5px; font-size: 0.82em; }\n  .chunk-ix { font-family: var(--font-mono, monospace); color: var(--text-muted); flex: none; }\n  /* Provenance can be a long heading; it truncates rather than pushing the row. */\n  .chunk-prov { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n  .chunk-warn { color: var(--warning); flex: none; }\n  /* pre-wrap, because a chunk's own line breaks are part of what retrieval sees. */\n  .chunk-body { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.45; font-size: 0.92em; }\n  .xtr-image { border-top: 1px solid var(--border); padding: 8px 0; }\n  .xtr-image p { margin: 4px 0 0; line-height: 1.45; font-size: 0.92em; }\n  .xtr-path { font-family: var(--font-mono, monospace); font-size: 0.82em; color: var(--text-muted); word-break: break-all; }\n  .xtr-md { margin: 6px 0 0; padding: 10px; border: 1px solid var(--border); border-radius: 8px;\n    background: var(--bg-primary); max-height: 40vh; overflow: auto; white-space: pre-wrap;\n    word-break: break-word; font-size: 0.85em; line-height: 1.45; }\n  .detail-extract .desc-src { margin-left: 6px; padding: 1px 6px; border: 1px solid var(--border);\n    border-radius: 10px; font-size: 0.86em; color: var(--text-muted); cursor: help; }\n"] }]
    }], null, { extract: [{ type: i0.Input, args: [{ isSignal: true, alias: "extract", required: false }] }], loading: [{ type: i0.Input, args: [{ isSignal: true, alias: "loading", required: false }] }], error: [{ type: i0.Input, args: [{ isSignal: true, alias: "error", required: false }] }], more: [{ type: i0.Output, args: ["more"] }], retry: [{ type: i0.Output, args: ["retry"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(FileExtractViewComponent, { className: "FileExtractViewComponent", filePath: "app/pages/files/file-extract-view.component.ts", lineNumber: 108 }); })();
