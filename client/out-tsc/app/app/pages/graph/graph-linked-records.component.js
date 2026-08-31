import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GRAPH_LINKED_RECORDS_STYLES } from './graph.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
import * as i2 from "@angular/common";
const _forTrack0 = ($index, $item) => $item._id;
function GraphLinkedRecordsComponent_For_23_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵlistener("click", function GraphLinkedRecordsComponent_For_23_Template_div_click_0_listener() { const m_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.open.emit({ id: m_r3._id, kind: "memory" })); });
    i0.ɵɵelementStart(1, "span", 13);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 14);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const m_r3 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", m_r3.fact || m_r3.description);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(m_r3.fact || m_r3.description || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(5, 3, m_r3.createdAt, "dd.MM.yy"));
} }
function GraphLinkedRecordsComponent_ForEmpty_24_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, ctx_r0.emptyMemoriesKey()));
} }
function GraphLinkedRecordsComponent_For_33_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵlistener("click", function GraphLinkedRecordsComponent_For_33_Template_div_click_0_listener() { const c_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.open.emit({ id: c_r5._id, kind: "chrono" })); });
    i0.ɵɵelementStart(1, "span", 13);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 14);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const c_r5 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵproperty("title", c_r5.title || c_r5.description);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(c_r5.title || c_r5.description || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(5, 3, c_r5.startsAt, "dd.MM.yy"));
} }
function GraphLinkedRecordsComponent_ForEmpty_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, ctx_r0.emptyChronoKey()));
} }
/**
 * The "linked memories + chrono entries" lists shown beneath a selected node or edge.
 *
 * Extracted because the graph page rendered this block TWICE — once in the node side panel, once in
 * the edge side panel — byte-identical apart from the two empty-state translation keys. Two copies of
 * one list is the same mechanism that let the record drawer drift out of date before #503: a change
 * made to one copy silently misses the other, and the result presents as a list that looks fine but
 * behaves differently, never as an error.
 *
 * The empty-state keys stay INPUTS rather than being unified — "no memories" (a node has none) and
 * "no linked memories" (nothing links these two endpoints) are deliberately different sentences.
 *
 * The `.lists-pane` rules apply to `:host` here. That is load-bearing: the parent's styles are scoped
 * to the parent's own template, so markup moved into a child renders UNSTYLED unless its rules move
 * with it — a full-bleed, borderless list that no unit test can see.
 */
export class GraphLinkedRecordsComponent {
    constructor() {
        this.memories = input.required(...(ngDevMode ? [{ debugName: "memories" }] : /* istanbul ignore next */ []));
        this.chrono = input.required(...(ngDevMode ? [{ debugName: "chrono" }] : /* istanbul ignore next */ []));
        /**
         * The filter bar lives HERE rather than at each call site.
         *
         * Both side panels need it, and inlining it twice would rebuild exactly the duplication this
         * component was extracted to remove. The state stays in the parent (only one panel is open at a
         * time, so one pair of signals serves both) and arrives through `model()` two-way bindings.
         *
         * Always rendered — both panels want it, so a `showFilters` toggle would be a knob with no caller.
         */
        this.typeFilter = model('all', ...(ngDevMode ? [{ debugName: "typeFilter" }] : /* istanbul ignore next */ []));
        this.descFilter = model('', ...(ngDevMode ? [{ debugName: "descFilter" }] : /* istanbul ignore next */ []));
        /** Translation key for "this node/edge has no memories". Differs per panel, on purpose. */
        this.emptyMemoriesKey = input.required(...(ngDevMode ? [{ debugName: "emptyMemoriesKey" }] : /* istanbul ignore next */ []));
        /** Translation key for "this node/edge has no chrono entries". Differs per panel, on purpose. */
        this.emptyChronoKey = input.required(...(ngDevMode ? [{ debugName: "emptyChronoKey" }] : /* istanbul ignore next */ []));
        /** A row was clicked. The parent fetches the full record and opens the shared drawer. */
        this.open = output();
    }
    static { this.ɵfac = function GraphLinkedRecordsComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || GraphLinkedRecordsComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: GraphLinkedRecordsComponent, selectors: [["app-graph-linked-records"]], inputs: { memories: [1, "memories"], chrono: [1, "chrono"], typeFilter: [1, "typeFilter"], descFilter: [1, "descFilter"], emptyMemoriesKey: [1, "emptyMemoriesKey"], emptyChronoKey: [1, "emptyChronoKey"] }, outputs: { typeFilter: "typeFilterChange", descFilter: "descFilterChange", open: "open" }, decls: 35, vars: 30, consts: [[1, "detail-filters"], ["name", "detailType", 3, "ngModelChange", "ngModel"], ["value", "all"], ["value", "memory"], ["value", "chrono"], ["type", "search", "name", "detailDesc", 3, "ngModelChange", "ngModel", "placeholder"], [1, "list-section"], [1, "list-section-header"], [1, "count-chip"], [1, "list-body"], [1, "list-row"], [1, "list-empty"], [1, "list-row", 3, "click"], [1, "list-row-text", 3, "title"], [1, "list-row-date"]], template: function GraphLinkedRecordsComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "select", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("ngModelChange", function GraphLinkedRecordsComponent_Template_select_ngModelChange_1_listener($event) { return ctx.typeFilter.set($event); });
            i0.ɵɵelementStart(3, "option", 2);
            i0.ɵɵtext(4);
            i0.ɵɵpipe(5, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(6, "option", 3);
            i0.ɵɵtext(7);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(9, "option", 4);
            i0.ɵɵtext(10);
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(12, "input", 5);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵlistener("ngModelChange", function GraphLinkedRecordsComponent_Template_input_ngModelChange_12_listener($event) { return ctx.descFilter.set($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(15, "div", 6)(16, "div", 7);
            i0.ɵɵtext(17);
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵelementStart(19, "span", 8);
            i0.ɵɵtext(20);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(21, "div", 9);
            i0.ɵɵrepeaterCreate(22, GraphLinkedRecordsComponent_For_23_Template, 6, 6, "div", 10, _forTrack0, false, GraphLinkedRecordsComponent_ForEmpty_24_Template, 3, 3, "div", 11);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(25, "div", 6)(26, "div", 7);
            i0.ɵɵtext(27);
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵelementStart(29, "span", 8);
            i0.ɵɵtext(30);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(31, "div", 9);
            i0.ɵɵrepeaterCreate(32, GraphLinkedRecordsComponent_For_33_Template, 6, 6, "div", 10, _forTrack0, false, GraphLinkedRecordsComponent_ForEmpty_34_Template, 3, 3, "div", 11);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("ngModel", ctx.typeFilter());
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 14, "graph.panel.filterTypeAriaLabel"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 16, "graph.panel.filterAll"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 18, "graph.panel.memories"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 20, "graph.panel.chrono"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("ngModel", ctx.descFilter())("placeholder", i0.ɵɵpipeBind1(13, 22, "graph.panel.filterPlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(14, 24, "graph.panel.filterPlaceholder"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(18, 26, "graph.panel.memories"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.memories().length);
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.memories());
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(28, 28, "graph.panel.chrono"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(ctx.chrono().length);
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.chrono());
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, i2.DatePipe, TranslocoPipe], styles: ["\n\n  [_nghost-%COMP%] {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    min-height: 0;\n    overflow: hidden;\n  }\n  .list-section[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    flex: 1;\n    min-height: 0;\n    overflow: hidden;\n    border-bottom: 1px solid var(--border);\n  }\n  .list-section[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n  .list-section-header[_ngcontent-%COMP%] {\n    font-size: 10px;\n    font-weight: 600;\n    color: var(--text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    padding: 8px 12px 6px;\n    border-bottom: 1px solid var(--border);\n    flex-shrink: 0;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n  }\n  .list-section-header[_ngcontent-%COMP%]   .count-chip[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    min-width: 16px;\n    height: 16px;\n    padding: 0 4px;\n    background: var(--bg-overlay);\n    border-radius: 8px;\n    font-size: 10px;\n    color: var(--text-muted);\n  }\n  .list-body[_ngcontent-%COMP%] { overflow-y: auto; flex: 1; }\n  .list-row[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 7px 12px;\n    border-bottom: 1px solid var(--border);\n    cursor: pointer;\n    transition: background var(--transition);\n  }\n  .list-row[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n  .list-row[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n  .list-row-text[_ngcontent-%COMP%] {\n    flex: 1;\n    font-size: 12px;\n    color: var(--text-primary);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .list-row-date[_ngcontent-%COMP%] {\n    font-size: 10px;\n    color: var(--text-muted);\n    font-family: var(--font-mono);\n    white-space: nowrap;\n    flex-shrink: 0;\n  }\n  .list-empty[_ngcontent-%COMP%] {\n    font-size: 12px;\n    color: var(--text-muted);\n    font-style: italic;\n    text-align: center;\n    padding: 16px 12px;\n  }\n\n  \n\n  .detail-filters[_ngcontent-%COMP%] {\n    display: flex;\n    gap: 6px;\n    padding: 6px 8px;\n    border-bottom: 1px solid var(--border);\n    flex-shrink: 0;\n  }\n  .detail-filters[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], \n   .detail-filters[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n    padding: 3px 6px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--bg-primary);\n    color: var(--text-primary);\n    font-family: var(--font);\n    font-size: 11px;\n    min-width: 0;\n  }\n  \n\n\n\n  .detail-filters[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { flex: 0 0 auto; width: auto; }\n  \n\n  .detail-filters[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { flex: 1 1 auto; }\n  .detail-filters[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus, \n   .detail-filters[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--accent); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(GraphLinkedRecordsComponent, [{
        type: Component,
        args: [{ selector: 'app-graph-linked-records', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe], template: `
    <div class="detail-filters">
      <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" name="detailType"
              [attr.aria-label]="'graph.panel.filterTypeAriaLabel' | transloco">
        <option value="all">{{ 'graph.panel.filterAll' | transloco }}</option>
        <option value="memory">{{ 'graph.panel.memories' | transloco }}</option>
        <option value="chrono">{{ 'graph.panel.chrono' | transloco }}</option>
      </select>
      <input type="search" [ngModel]="descFilter()" (ngModelChange)="descFilter.set($event)" name="detailDesc"
             [placeholder]="'graph.panel.filterPlaceholder' | transloco"
             [attr.aria-label]="'graph.panel.filterPlaceholder' | transloco" />
    </div>
    <div class="list-section">
      <div class="list-section-header">
        {{ 'graph.panel.memories' | transloco }} <span class="count-chip">{{ memories().length }}</span>
      </div>
      <div class="list-body">
        @for (m of memories(); track m._id) {
          <div class="list-row" (click)="open.emit({ id: m._id, kind: 'memory' })">
            <span class="list-row-text" [title]="m.fact || m.description">{{ m.fact || m.description || '—' }}</span>
            <span class="list-row-date">{{ m.createdAt | date:'dd.MM.yy' }}</span>
          </div>
        } @empty {
          <div class="list-empty">{{ emptyMemoriesKey() | transloco }}</div>
        }
      </div>
    </div>
    <div class="list-section">
      <div class="list-section-header">
        {{ 'graph.panel.chrono' | transloco }} <span class="count-chip">{{ chrono().length }}</span>
      </div>
      <div class="list-body">
        @for (c of chrono(); track c._id) {
          <div class="list-row" (click)="open.emit({ id: c._id, kind: 'chrono' })">
            <span class="list-row-text" [title]="c.title || c.description">{{ c.title || c.description || '—' }}</span>
            <span class="list-row-date">{{ c.startsAt | date:'dd.MM.yy' }}</span>
          </div>
        } @empty {
          <div class="list-empty">{{ emptyChronoKey() | transloco }}</div>
        }
      </div>
    </div>
  `, styles: ["\n  /* The pane itself \u2014 this component IS the right column of a side panel. */\n  :host {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    min-height: 0;\n    overflow: hidden;\n  }\n  .list-section {\n    display: flex;\n    flex-direction: column;\n    flex: 1;\n    min-height: 0;\n    overflow: hidden;\n    border-bottom: 1px solid var(--border);\n  }\n  .list-section:last-child { border-bottom: none; }\n  .list-section-header {\n    font-size: 10px;\n    font-weight: 600;\n    color: var(--text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    padding: 8px 12px 6px;\n    border-bottom: 1px solid var(--border);\n    flex-shrink: 0;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n  }\n  .list-section-header .count-chip {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    min-width: 16px;\n    height: 16px;\n    padding: 0 4px;\n    background: var(--bg-overlay);\n    border-radius: 8px;\n    font-size: 10px;\n    color: var(--text-muted);\n  }\n  .list-body { overflow-y: auto; flex: 1; }\n  .list-row {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 7px 12px;\n    border-bottom: 1px solid var(--border);\n    cursor: pointer;\n    transition: background var(--transition);\n  }\n  .list-row:last-child { border-bottom: none; }\n  .list-row:hover { background: var(--bg-elevated); }\n  .list-row-text {\n    flex: 1;\n    font-size: 12px;\n    color: var(--text-primary);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .list-row-date {\n    font-size: 10px;\n    color: var(--text-muted);\n    font-family: var(--font-mono);\n    white-space: nowrap;\n    flex-shrink: 0;\n  }\n  .list-empty {\n    font-size: 12px;\n    color: var(--text-muted);\n    font-style: italic;\n    text-align: center;\n    padding: 16px 12px;\n  }\n\n  /* Filter bar. flex-shrink:0 so it stays put while the lists below take the remaining height. */\n  .detail-filters {\n    display: flex;\n    gap: 6px;\n    padding: 6px 8px;\n    border-bottom: 1px solid var(--border);\n    flex-shrink: 0;\n  }\n  .detail-filters select,\n  .detail-filters input {\n    padding: 3px 6px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--bg-primary);\n    color: var(--text-primary);\n    font-family: var(--font);\n    font-size: 11px;\n    min-width: 0;\n  }\n  /* The select must state width:auto explicitly. A global select rule sets width:100%, which becomes a\n     100% flex-basis here: it ate the whole row and left the text box a 14px sliver. Declaring nothing\n     means inheriting whatever global rule exists, which is how that slipped past the unit tests. */\n  .detail-filters select { flex: 0 0 auto; width: auto; }\n  /* The text box takes the slack. */\n  .detail-filters input { flex: 1 1 auto; }\n  .detail-filters select:focus,\n  .detail-filters input:focus { outline: none; border-color: var(--accent); }\n"] }]
    }], null, { memories: [{ type: i0.Input, args: [{ isSignal: true, alias: "memories", required: true }] }], chrono: [{ type: i0.Input, args: [{ isSignal: true, alias: "chrono", required: true }] }], typeFilter: [{ type: i0.Input, args: [{ isSignal: true, alias: "typeFilter", required: false }] }, { type: i0.Output, args: ["typeFilterChange"] }], descFilter: [{ type: i0.Input, args: [{ isSignal: true, alias: "descFilter", required: false }] }, { type: i0.Output, args: ["descFilterChange"] }], emptyMemoriesKey: [{ type: i0.Input, args: [{ isSignal: true, alias: "emptyMemoriesKey", required: true }] }], emptyChronoKey: [{ type: i0.Input, args: [{ isSignal: true, alias: "emptyChronoKey", required: true }] }], open: [{ type: i0.Output, args: ["open"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(GraphLinkedRecordsComponent, { className: "GraphLinkedRecordsComponent", filePath: "app/pages/graph/graph-linked-records.component.ts", lineNumber: 75 }); })();
