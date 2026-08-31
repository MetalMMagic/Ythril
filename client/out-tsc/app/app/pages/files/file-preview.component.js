import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { FILE_PREVIEW_STYLES } from './file-manager.styles';
import { formatSize } from './file-format';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
function FilePreviewComponent_Conditional_0_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 0);
    i0.ɵɵdomElement(1, "span", 2);
    i0.ɵɵdomElementEnd();
} }
function FilePreviewComponent_Conditional_0_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const p_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(2, 2, "files.preview.failed"), " ", p_r1.error);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElement(0, "div", 3);
} if (rf & 2) {
    const p_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵdomProperty("innerHTML", p_r1.html, i0.ɵɵsanitizeHtml);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "pre", 4);
    i0.ɵɵdomElement(1, "code", 8);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const p_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵdomProperty("innerHTML", p_r1.html, i0.ɵɵsanitizeHtml);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElement(0, "img", 5);
} if (rf & 2) {
    const p_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵdomProperty("src", p_r1.mediaUrl, i0.ɵɵsanitizeUrl)("alt", p_r1.file.name);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElement(0, "iframe", 6);
} if (rf & 2) {
    const p_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵdomProperty("src", p_r1.safeUrl, i0.ɵɵsanitizeResourceUrl);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "div", 9);
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const t_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r2.note);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Conditional_3_For_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "th");
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const h_r3 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(h_r3);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "thead")(1, "tr");
    i0.ɵɵrepeaterCreate(2, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Conditional_3_For_3_Template, 2, 1, "th", null, i0.ɵɵrepeaterTrackByIndex);
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const t_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(t_r2.header);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_For_6_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "td");
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const cell_r4 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(cell_r4);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "tr");
    i0.ɵɵrepeaterCreate(1, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_For_6_For_2_Template, 2, 1, "td", null, i0.ɵɵrepeaterTrackByIndex);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const row_r5 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵrepeater(row_r5);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Conditional_0_Template, 2, 1, "div", 9);
    i0.ɵɵdomElementStart(1, "div", 10)(2, "table", 11);
    i0.ɵɵconditionalCreate(3, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Conditional_3_Template, 4, 0, "thead");
    i0.ɵɵdomElementStart(4, "tbody");
    i0.ɵɵrepeaterCreate(5, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_For_6_Template, 3, 0, "tr", null, i0.ɵɵrepeaterTrackByIndex);
    i0.ɵɵdomElementEnd()()();
} if (rf & 2) {
    const t_r2 = ctx;
    i0.ɵɵconditional(t_r2.note ? 0 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(t_r2.header.length ? 3 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(t_r2.rows);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Conditional_0_Template, 7, 2);
} if (rf & 2) {
    let tmp_4_0;
    const p_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional((tmp_4_0 = p_r1.table) ? 0 : -1, tmp_4_0);
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Case_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "dl", 7)(1, "dt");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(4, "dd");
    i0.ɵɵtext(5);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(6, "dt");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(9, "dd");
    i0.ɵɵtext(10);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(11, "dt");
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(14, "dd");
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "date");
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const p_r1 = i0.ɵɵnextContext(2);
    const ctx_r5 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 6, "files.preview.name"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(p_r1.file.name);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 8, "files.preview.size"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r5.formatSize(p_r1.file.size));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 10, "files.preview.modified"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(16, 12, p_r1.file.modified, "dd.MM.yyyy HH:mm"));
} }
function FilePreviewComponent_Conditional_0_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, FilePreviewComponent_Conditional_0_Conditional_2_Case_0_Template, 1, 1, "div", 3)(1, FilePreviewComponent_Conditional_0_Conditional_2_Case_1_Template, 2, 1, "pre", 4)(2, FilePreviewComponent_Conditional_0_Conditional_2_Case_2_Template, 1, 2, "img", 5)(3, FilePreviewComponent_Conditional_0_Conditional_2_Case_3_Template, 1, 1, "iframe", 6)(4, FilePreviewComponent_Conditional_0_Conditional_2_Case_4_Template, 1, 1)(5, FilePreviewComponent_Conditional_0_Conditional_2_Case_5_Template, 17, 15, "dl", 7);
} if (rf & 2) {
    let tmp_3_0;
    const p_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional((tmp_3_0 = p_r1.kind) === "markdown" ? 0 : tmp_3_0 === "text" ? 1 : tmp_3_0 === "image" ? 2 : tmp_3_0 === "pdf" ? 3 : tmp_3_0 === "xlsx" ? 4 : 5);
} }
function FilePreviewComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, FilePreviewComponent_Conditional_0_Conditional_0_Template, 2, 0, "div", 0)(1, FilePreviewComponent_Conditional_0_Conditional_1_Template, 3, 4, "div", 1)(2, FilePreviewComponent_Conditional_0_Conditional_2_Template, 6, 1);
} if (rf & 2) {
    const p_r1 = ctx;
    i0.ɵɵconditional(p_r1.loading ? 0 : p_r1.error !== null ? 1 : 2);
} }
/**
 * The body of a file preview — markdown, text, an image, a PDF, a spreadsheet grid, or a metadata card.
 *
 * ## Why this is the first cut of G-3
 *
 * `file-manager.component.ts` is the largest file in the repo and its split has to start somewhere. This is
 * the seam with the clearest boundary: it renders and does nothing else. **It does not fetch, and it does not
 * own the object URL** — the page does both, because the page is what knows when a preview is replaced or
 * closed, and a component that revoked a URL on destroy would revoke it during the very re-render that
 * replaces it.
 *
 * ## It was already a template, used twice
 *
 * The markup lived in an `ng-template` rendered through `ngTemplateOutlet` from the docked pane and again
 * from the full-screen overlay. That is the same instinct as a component, one Angular version early: it kept
 * the two in step but left the whole thing inside a 1 618-line file, where its styles sat 500 lines away from
 * the markup they applied to.
 *
 * The `::ng-deep` rules for rendered markdown moved with it and have to stay `::ng-deep`: the HTML comes from
 * `[innerHTML]`, so those elements are not in this component's template and carry none of its scoping
 * attributes.
 */
export class FilePreviewComponent {
    constructor() {
        this.preview = input(null, ...(ngDevMode ? [{ debugName: "preview" }] : /* istanbul ignore next */ []));
        /** The page's own rule, imported rather than copied — see `file-format.ts` for why that matters here. */
        this.formatSize = formatSize;
    }
    static { this.ɵfac = function FilePreviewComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || FilePreviewComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: FilePreviewComponent, selectors: [["app-file-preview"]], inputs: { preview: [1, "preview"] }, decls: 1, vars: 1, consts: [[1, "loading-overlay"], ["role", "alert", 1, "alert", "alert-error"], [1, "spinner"], [1, "md-rendered", 3, "innerHTML"], [1, "preview-code"], [3, "src", "alt"], [3, "src"], [1, "preview-meta"], [3, "innerHTML"], [1, "xlsx-note"], [1, "xlsx-wrap"], [1, "xlsx-grid"]], template: function FilePreviewComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, FilePreviewComponent_Conditional_0_Template, 3, 1);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.preview()) ? 0 : -1, tmp_0_0);
        } }, dependencies: [CommonModule, i1.DatePipe, TranslocoPipe], styles: [".md-rendered[_ngcontent-%COMP%] { line-height: 1.6; word-break: break-word; }\n  .md-rendered[_ngcontent-%COMP%]     h1, .md-rendered[_ngcontent-%COMP%]     h2, .md-rendered[_ngcontent-%COMP%]     h3 { margin: 0.8em 0 0.4em; line-height: 1.25; }\n  .md-rendered[_ngcontent-%COMP%]     h1 { font-size: 1.5em; } .md-rendered[_ngcontent-%COMP%]     h2 { font-size: 1.3em; } .md-rendered[_ngcontent-%COMP%]     h3 { font-size: 1.12em; }\n  .md-rendered[_ngcontent-%COMP%]     p { margin: 0.5em 0; }\n  .md-rendered[_ngcontent-%COMP%]     ul, .md-rendered[_ngcontent-%COMP%]     ol { margin: 0.5em 0; padding-left: 1.5em; }\n  .md-rendered[_ngcontent-%COMP%]     code { background: var(--bg-muted); padding: 0.1em 0.35em; border-radius: 4px; font-family: var(--font-mono, monospace); font-size: 0.9em; }\n  .md-rendered[_ngcontent-%COMP%]     pre { background: var(--bg-muted); padding: 12px; border-radius: 6px; overflow: auto; margin: 0.6em 0; }\n  .md-rendered[_ngcontent-%COMP%]     pre code { background: none; padding: 0; }\n  .md-rendered[_ngcontent-%COMP%]     a { color: var(--accent, #6ea8fe); }\n  .md-rendered[_ngcontent-%COMP%]     blockquote { margin: 0.5em 0; padding-left: 12px; border-left: 3px solid var(--border); color: var(--text-muted); }\n  .md-rendered[_ngcontent-%COMP%]     table { border-collapse: collapse; margin: 0.5em 0; }\n  .md-rendered[_ngcontent-%COMP%]     th, .md-rendered[_ngcontent-%COMP%]     td { border: 1px solid var(--border); padding: 4px 8px; }\n  .md-rendered[_ngcontent-%COMP%]     img { max-width: 100%; }\n\n  \n\n  .xlsx-note[_ngcontent-%COMP%] { font-size: 0.8em; color: var(--text-muted); margin-bottom: 8px; }\n  .xlsx-wrap[_ngcontent-%COMP%] { overflow: auto; max-width: 100%; }\n  .xlsx-grid[_ngcontent-%COMP%] { border-collapse: collapse; font-size: 0.82em; font-variant-numeric: tabular-nums; }\n  .xlsx-grid[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], .xlsx-grid[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { border: 1px solid var(--border); padding: 3px 8px; text-align: left; white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }\n  .xlsx-grid[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { background: var(--bg-muted); font-weight: 600; position: sticky; top: 0; }\n  .xlsx-grid[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:nth-child(even) { background: color-mix(in srgb, var(--bg-muted) 40%, transparent); }\n\n  img[_ngcontent-%COMP%] {\n    max-width: 100%;\n    max-height: 80vh;\n    object-fit: contain;\n  }\n  iframe[_ngcontent-%COMP%] {\n    width: 100%;\n    height: 100%;\n    border: none;\n  }\n\n  .preview-code[_ngcontent-%COMP%] {\n    background: var(--bg-muted);\n    border-radius: 6px;\n    padding: 16px;\n    overflow: auto;\n    font-family: var(--font-mono, monospace);\n    font-size: 0.85em;\n    line-height: 1.6;\n    white-space: pre-wrap;\n    word-break: break-all;\n  }\n  .preview-code[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] { background: none; }\n  .preview-meta[_ngcontent-%COMP%] { display: grid; grid-template-columns: 100px 1fr; gap: 6px 12px; }\n  .preview-meta[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%] { color: var(--text-muted); font-weight: 500; }\n  .preview-meta[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%] { margin: 0; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(FilePreviewComponent, [{
        type: Component,
        args: [{ selector: 'app-file-preview', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, TranslocoPipe], template: `
    @if (preview(); as p) {
      @if (p.loading) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (p.error !== null) {
        <div class="alert alert-error" role="alert">{{ 'files.preview.failed' | transloco }} {{ p.error }}</div>
      } @else {
        @switch (p.kind) {
          @case ('markdown') { <div class="md-rendered" [innerHTML]="p.html"></div> }
          @case ('text') { <pre class="preview-code"><code [innerHTML]="p.html"></code></pre> }
          @case ('image') { <img [src]="p.mediaUrl" [alt]="p.file.name" /> }
          @case ('pdf') { <iframe [src]="p.safeUrl"></iframe> }
          @case ('xlsx') {
            @if (p.table; as t) {
              @if (t.note) { <div class="xlsx-note">{{ t.note }}</div> }
              <div class="xlsx-wrap">
                <table class="xlsx-grid">
                  @if (t.header.length) {
                    <thead><tr>@for (h of t.header; track $index) { <th>{{ h }}</th> }</tr></thead>
                  }
                  <tbody>
                    @for (row of t.rows; track $index) {
                      <tr>@for (cell of row; track $index) { <td>{{ cell }}</td> }</tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @default {
            <dl class="preview-meta">
              <dt>{{ 'files.preview.name' | transloco }}</dt><dd>{{ p.file.name }}</dd>
              <dt>{{ 'files.preview.size' | transloco }}</dt><dd>{{ formatSize(p.file.size) }}</dd>
              <dt>{{ 'files.preview.modified' | transloco }}</dt><dd>{{ p.file.modified | date:'dd.MM.yyyy HH:mm' }}</dd>
            </dl>
          }
        }
      }
    }
  `, styles: ["\n  .md-rendered { line-height: 1.6; word-break: break-word; }\n  .md-rendered ::ng-deep h1, .md-rendered ::ng-deep h2, .md-rendered ::ng-deep h3 { margin: 0.8em 0 0.4em; line-height: 1.25; }\n  .md-rendered ::ng-deep h1 { font-size: 1.5em; } .md-rendered ::ng-deep h2 { font-size: 1.3em; } .md-rendered ::ng-deep h3 { font-size: 1.12em; }\n  .md-rendered ::ng-deep p { margin: 0.5em 0; }\n  .md-rendered ::ng-deep ul, .md-rendered ::ng-deep ol { margin: 0.5em 0; padding-left: 1.5em; }\n  .md-rendered ::ng-deep code { background: var(--bg-muted); padding: 0.1em 0.35em; border-radius: 4px; font-family: var(--font-mono, monospace); font-size: 0.9em; }\n  .md-rendered ::ng-deep pre { background: var(--bg-muted); padding: 12px; border-radius: 6px; overflow: auto; margin: 0.6em 0; }\n  .md-rendered ::ng-deep pre code { background: none; padding: 0; }\n  .md-rendered ::ng-deep a { color: var(--accent, #6ea8fe); }\n  .md-rendered ::ng-deep blockquote { margin: 0.5em 0; padding-left: 12px; border-left: 3px solid var(--border); color: var(--text-muted); }\n  .md-rendered ::ng-deep table { border-collapse: collapse; margin: 0.5em 0; }\n  .md-rendered ::ng-deep th, .md-rendered ::ng-deep td { border: 1px solid var(--border); padding: 4px 8px; }\n  .md-rendered ::ng-deep img { max-width: 100%; }\n\n  /* xlsx grid preview */\n  .xlsx-note { font-size: 0.8em; color: var(--text-muted); margin-bottom: 8px; }\n  .xlsx-wrap { overflow: auto; max-width: 100%; }\n  .xlsx-grid { border-collapse: collapse; font-size: 0.82em; font-variant-numeric: tabular-nums; }\n  .xlsx-grid th, .xlsx-grid td { border: 1px solid var(--border); padding: 3px 8px; text-align: left; white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }\n  .xlsx-grid th { background: var(--bg-muted); font-weight: 600; position: sticky; top: 0; }\n  .xlsx-grid tbody tr:nth-child(even) { background: color-mix(in srgb, var(--bg-muted) 40%, transparent); }\n\n  img {\n    max-width: 100%;\n    max-height: 80vh;\n    object-fit: contain;\n  }\n  iframe {\n    width: 100%;\n    height: 100%;\n    border: none;\n  }\n\n  .preview-code {\n    background: var(--bg-muted);\n    border-radius: 6px;\n    padding: 16px;\n    overflow: auto;\n    font-family: var(--font-mono, monospace);\n    font-size: 0.85em;\n    line-height: 1.6;\n    white-space: pre-wrap;\n    word-break: break-all;\n  }\n  .preview-code code { background: none; }\n  .preview-meta { display: grid; grid-template-columns: 100px 1fr; gap: 6px 12px; }\n  .preview-meta dt { color: var(--text-muted); font-weight: 500; }\n  .preview-meta dd { margin: 0; }\n"] }]
    }], null, { preview: [{ type: i0.Input, args: [{ isSignal: true, alias: "preview", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(FilePreviewComponent, { className: "FilePreviewComponent", filePath: "app/pages/files/file-preview.component.ts", lineNumber: 109 }); })();
