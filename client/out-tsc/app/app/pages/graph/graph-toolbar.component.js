import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { GRAPH_TOOLBAR_STYLES } from './graph.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.value;
function GraphToolbarComponent_For_12_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 9);
    i0.ɵɵlistener("click", function GraphToolbarComponent_For_12_Template_button_click_0_listener() { const d_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.directionChange.emit(d_r2.value)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const d_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("active", ctx_r2.direction() === d_r2.value);
    i0.ɵɵattribute("aria-pressed", ctx_r2.direction() === d_r2.value);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 4, d_r2.key));
} }
function GraphToolbarComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "graph.stats.nodesEdges", ctx));
} }
/**
 * The graph page's toolbar: pick a root, choose the depth and direction, toggle labels, fit and reset.
 *
 * ## Why it is a component
 *
 * G-7: the page was 690 code lines against a 650 ceiling, and the ratchet's rule is that a raise is paid with
 * an extraction rather than argued down. This is the largest self-contained block left — every control in it
 * reads page state and reports a choice back, with no knowledge of cytoscape, the traversal cache, or the
 * side panels.
 *
 * ## Every control REPORTS; none of them sets
 *
 * The obvious shape is `model()` for depth, direction and labels, and it would have been wrong: each of those
 * choices does more than change a value. A new depth or direction re-runs the traversal from the current root,
 * and toggling labels adds a class to the cytoscape edges — work this component cannot see and must not own. A
 * two-way binding moves the value and drops the rest, which leaves a toolbar whose controls look like they
 * work and change nothing. So the page keeps its three handlers and this emits into them.
 *
 * Same reasoning for `fit` and `reset`, which are commands on a canvas this component has no handle to, and
 * for `rootSelected`: choosing a root starts a traversal, which is the page's job.
 *
 * `stats` is a plain input rather than two counts, so the page decides whether there is anything to show. The
 * old markup wrapped the counts in `@if (rootEntity())`, and moving that condition here would have required
 * this component to know what a root entity is.
 */
export class GraphToolbarComponent {
    constructor() {
        /**
         * The three direction pills, as data.
         *
         * They were three hand-written buttons differing in one word each, which is how the middle one ended up
         * with different whitespace from its neighbours. A list makes adding a fourth a data change.
         */
        this.DIRECTIONS = [
            { value: 'outbound', key: 'graph.toolbar.direction.out' },
            { value: 'inbound', key: 'graph.toolbar.direction.in' },
            { value: 'both', key: 'graph.toolbar.direction.both' },
        ];
        this.spaceId = input('', ...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
        /** Node and edge counts, or null when there is nothing traversed to count. */
        this.stats = input(null, ...(ngDevMode ? [{ debugName: "stats" }] : /* istanbul ignore next */ []));
        /*
         * Reported, never set here — and that distinction is load-bearing rather than stylistic. Each of these
         * choices does more than change a value on the page: a new depth or direction re-runs the traversal, and
         * toggling labels adds a class to the cytoscape edges. A two-way binding would have moved the value and
         * silently dropped all three of those, leaving a toolbar whose controls appear to work.
         */
        this.depth = input(2, ...(ngDevMode ? [{ debugName: "depth" }] : /* istanbul ignore next */ []));
        this.direction = input('both', ...(ngDevMode ? [{ debugName: "direction" }] : /* istanbul ignore next */ []));
        this.hideLabels = input(false, ...(ngDevMode ? [{ debugName: "hideLabels" }] : /* istanbul ignore next */ []));
        this.depthChange = output();
        this.directionChange = output();
        this.hideLabelsChange = output();
        this.rootSelected = output();
        this.queryChange = output();
        this.fit = output();
        this.reset = output();
    }
    static { this.ɵfac = function GraphToolbarComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || GraphToolbarComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: GraphToolbarComponent, selectors: [["app-graph-toolbar"]], hostAttrs: [1, "graph-toolbar"], inputs: { spaceId: [1, "spaceId"], stats: [1, "stats"], depth: [1, "depth"], direction: [1, "direction"], hideLabels: [1, "hideLabels"] }, outputs: { depthChange: "depthChange", directionChange: "directionChange", hideLabelsChange: "hideLabelsChange", rootSelected: "rootSelected", queryChange: "queryChange", fit: "fit", reset: "reset" }, decls: 26, vars: 24, consts: [[1, "search-wrapper"], ["mode", "bar", "placeholder", "entitySearch.defaultPlaceholder", "defaultMode", "semantic", 3, "selected", "queryChange", "spaceId"], [1, "toolbar-divider"], [1, "depth-control"], [1, "toolbar-label"], ["type", "range", "min", "1", "max", "10", 3, "ngModelChange", "ngModel"], [1, "depth-value"], [1, "pill-group"], ["type", "button", 3, "active"], ["type", "button", 3, "click"], [1, "toolbar-spacer"], [1, "graph-stats"], [1, "toolbar-btn", 3, "click"], ["name", "corners-out", 3, "size"], ["name", "arrows-clockwise", 3, "size"]], template: function GraphToolbarComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-entity-search", 1);
            i0.ɵɵlistener("selected", function GraphToolbarComponent_Template_app_entity_search_selected_1_listener($event) { return ctx.rootSelected.emit($event); })("queryChange", function GraphToolbarComponent_Template_app_entity_search_queryChange_1_listener($event) { return ctx.queryChange.emit($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelement(2, "div", 2);
            i0.ɵɵelementStart(3, "div", 3)(4, "span", 4);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "input", 5);
            i0.ɵɵlistener("ngModelChange", function GraphToolbarComponent_Template_input_ngModelChange_7_listener($event) { return ctx.depthChange.emit(+$event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(8, "span", 6);
            i0.ɵɵtext(9);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(10, "div", 7);
            i0.ɵɵrepeaterCreate(11, GraphToolbarComponent_For_12_Template, 3, 6, "button", 8, _forTrack0);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(13, "div", 7)(14, "button", 9);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵlistener("click", function GraphToolbarComponent_Template_button_click_14_listener() { return ctx.hideLabelsChange.emit(!ctx.hideLabels()); });
            i0.ɵɵtext(16);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelement(18, "div", 10);
            i0.ɵɵconditionalCreate(19, GraphToolbarComponent_Conditional_19_Template, 3, 4, "span", 11);
            i0.ɵɵelementStart(20, "button", 12);
            i0.ɵɵpipe(21, "transloco");
            i0.ɵɵlistener("click", function GraphToolbarComponent_Template_button_click_20_listener() { return ctx.fit.emit(); });
            i0.ɵɵelement(22, "ph-icon", 13);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(23, "button", 12);
            i0.ɵɵpipe(24, "transloco");
            i0.ɵɵlistener("click", function GraphToolbarComponent_Template_button_click_23_listener() { return ctx.reset.emit(); });
            i0.ɵɵelement(25, "ph-icon", 14);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            let tmp_9_0;
            i0.ɵɵadvance();
            i0.ɵɵproperty("spaceId", ctx.spaceId());
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 14, "graph.toolbar.depth"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("ngModel", ctx.depth());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.depth());
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.DIRECTIONS);
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("active", !ctx.hideLabels());
            i0.ɵɵattribute("aria-pressed", !ctx.hideLabels())("title", i0.ɵɵpipeBind1(15, 16, "graph.toolbar.toggleLabels"));
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 18, "graph.toolbar.labels"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional((tmp_9_0 = ctx.stats()) ? 19 : -1, tmp_9_0);
            i0.ɵɵadvance();
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(21, 20, "graph.toolbar.fitViewport"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(24, 22, "graph.toolbar.resetGraph"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 16);
        } }, dependencies: [FormsModule, i1.DefaultValueAccessor, i1.RangeValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, EntitySearchComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 12px;\n    padding: 12px 16px;\n    background: var(--bg-surface);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-md);\n    margin-bottom: 8px;\n    flex-shrink: 0;\n  }\n\n  select[_ngcontent-%COMP%], \n   input[type=\"search\"][_ngcontent-%COMP%], \n   input[type=\"text\"][_ngcontent-%COMP%] {\n    background: var(--bg-elevated);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    color: var(--text-primary);\n    font-family: var(--font);\n    font-size: 13px;\n    padding: 6px 10px;\n    outline: none;\n    transition: border-color var(--transition);\n  }\n  select[_ngcontent-%COMP%]:focus, \n   input[_ngcontent-%COMP%]:focus {\n    border-color: var(--accent);\n  }\n\n  select[_ngcontent-%COMP%] { min-width: 140px; }\n\n  .search-wrapper[_ngcontent-%COMP%] {\n    position: relative;\n    flex: 1;\n    min-width: 200px;\n    max-width: 360px;\n  }\n\n  .toolbar-divider[_ngcontent-%COMP%] {\n    width: 1px;\n    height: 22px;\n    background: var(--border);\n    flex-shrink: 0;\n  }\n  .toolbar-spacer[_ngcontent-%COMP%] { flex: 1; }\n  .toolbar-label[_ngcontent-%COMP%] {\n    font-size: 12px;\n    color: var(--text-muted);\n    white-space: nowrap;\n  }\n\n  .depth-control[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n  }\n  .depth-control[_ngcontent-%COMP%]   input[type=\"range\"][_ngcontent-%COMP%] {\n    accent-color: var(--accent);\n    width: 80px;\n    cursor: pointer;\n  }\n  .depth-value[_ngcontent-%COMP%] {\n    font-family: var(--font-mono);\n    font-size: 12px;\n    color: var(--text-primary);\n    min-width: 14px;\n    text-align: center;\n  }\n\n  .pill-group[_ngcontent-%COMP%] {\n    display: flex;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    overflow: hidden;\n    flex-shrink: 0;\n  }\n  .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n    padding: 5px 12px;\n    font-size: 12px;\n    background: var(--bg-elevated);\n    color: var(--text-secondary);\n    border: none;\n    cursor: pointer;\n    transition: background var(--transition), color var(--transition);\n    white-space: nowrap;\n  }\n  .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]    + button[_ngcontent-%COMP%] { border-left: 1px solid var(--border); }\n  .pill-group[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n    background: var(--accent-dim);\n    color: var(--accent);\n  }\n  .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) {\n    background: var(--bg-overlay);\n    color: var(--text-primary);\n  }\n\n  .toolbar-toggle[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 5px;\n    color: var(--text-secondary);\n    font-size: 12px;\n    cursor: pointer;\n    white-space: nowrap;\n  }\n  .toolbar-toggle[_ngcontent-%COMP%]   input[type=\"checkbox\"][_ngcontent-%COMP%] { accent-color: var(--accent); }\n\n  .toolbar-btn[_ngcontent-%COMP%] {\n    padding: 5px 10px;\n    background: var(--bg-elevated);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    color: var(--text-secondary);\n    font-size: 14px;\n    cursor: pointer;\n    line-height: 1;\n    transition: border-color var(--transition), color var(--transition), background var(--transition);\n  }\n  .toolbar-btn[_ngcontent-%COMP%]:hover {\n    border-color: var(--accent);\n    color: var(--text-primary);\n    background: var(--accent-dim);\n  }\n  .graph-stats[_ngcontent-%COMP%] {\n    font-size: 12px;\n    color: var(--text-muted);\n    white-space: nowrap;\n    font-family: var(--font-mono);\n  }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(GraphToolbarComponent, [{
        type: Component,
        args: [{ selector: 'app-graph-toolbar', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule, TranslocoPipe, PhIconComponent, EntitySearchComponent], host: { class: 'graph-toolbar' }, template: `
    <div class="search-wrapper">
      <app-entity-search
        mode="bar"
        [spaceId]="spaceId()"
        placeholder="entitySearch.defaultPlaceholder"
        defaultMode="semantic"
        (selected)="rootSelected.emit($event)"
        (queryChange)="queryChange.emit($event)"
      />
    </div>

    <div class="toolbar-divider"></div>

    <div class="depth-control">
      <span class="toolbar-label">{{ 'graph.toolbar.depth' | transloco }}</span>
      <input type="range" min="1" max="10" [ngModel]="depth()" (ngModelChange)="depthChange.emit(+$event)" />
      <span class="depth-value">{{ depth() }}</span>
    </div>

    <div class="pill-group">
      @for (d of DIRECTIONS; track d.value) {
        <button type="button" [class.active]="direction() === d.value" [attr.aria-pressed]="direction() === d.value"
                (click)="directionChange.emit(d.value)">{{ d.key | transloco }}</button>
      }
    </div>

    <div class="pill-group">
      <button type="button" [class.active]="!hideLabels()" [attr.aria-pressed]="!hideLabels()"
              (click)="hideLabelsChange.emit(!hideLabels())"
              [attr.title]="'graph.toolbar.toggleLabels' | transloco">{{ 'graph.toolbar.labels' | transloco }}</button>
    </div>

    <div class="toolbar-spacer"></div>

    @if (stats(); as s) {
      <span class="graph-stats">{{ 'graph.stats.nodesEdges' | transloco: s }}</span>
    }
    <button class="toolbar-btn" [attr.title]="'graph.toolbar.fitViewport' | transloco" (click)="fit.emit()">
      <ph-icon name="corners-out" [size]="16"/>
    </button>
    <button class="toolbar-btn" [attr.title]="'graph.toolbar.resetGraph' | transloco" (click)="reset.emit()">
      <ph-icon name="arrows-clockwise" [size]="16"/>
    </button>
  `, styles: ["\n  :host {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 12px;\n    padding: 12px 16px;\n    background: var(--bg-surface);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-md);\n    margin-bottom: 8px;\n    flex-shrink: 0;\n  }\n\n  select,\n  input[type=\"search\"],\n  input[type=\"text\"] {\n    background: var(--bg-elevated);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    color: var(--text-primary);\n    font-family: var(--font);\n    font-size: 13px;\n    padding: 6px 10px;\n    outline: none;\n    transition: border-color var(--transition);\n  }\n  select:focus,\n  input:focus {\n    border-color: var(--accent);\n  }\n\n  select { min-width: 140px; }\n\n  .search-wrapper {\n    position: relative;\n    flex: 1;\n    min-width: 200px;\n    max-width: 360px;\n  }\n\n  .toolbar-divider {\n    width: 1px;\n    height: 22px;\n    background: var(--border);\n    flex-shrink: 0;\n  }\n  .toolbar-spacer { flex: 1; }\n  .toolbar-label {\n    font-size: 12px;\n    color: var(--text-muted);\n    white-space: nowrap;\n  }\n\n  .depth-control {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n  }\n  .depth-control input[type=\"range\"] {\n    accent-color: var(--accent);\n    width: 80px;\n    cursor: pointer;\n  }\n  .depth-value {\n    font-family: var(--font-mono);\n    font-size: 12px;\n    color: var(--text-primary);\n    min-width: 14px;\n    text-align: center;\n  }\n\n  .pill-group {\n    display: flex;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    overflow: hidden;\n    flex-shrink: 0;\n  }\n  .pill-group button {\n    padding: 5px 12px;\n    font-size: 12px;\n    background: var(--bg-elevated);\n    color: var(--text-secondary);\n    border: none;\n    cursor: pointer;\n    transition: background var(--transition), color var(--transition);\n    white-space: nowrap;\n  }\n  .pill-group button + button { border-left: 1px solid var(--border); }\n  .pill-group button.active {\n    background: var(--accent-dim);\n    color: var(--accent);\n  }\n  .pill-group button:hover:not(.active) {\n    background: var(--bg-overlay);\n    color: var(--text-primary);\n  }\n\n  .toolbar-toggle {\n    display: flex;\n    align-items: center;\n    gap: 5px;\n    color: var(--text-secondary);\n    font-size: 12px;\n    cursor: pointer;\n    white-space: nowrap;\n  }\n  .toolbar-toggle input[type=\"checkbox\"] { accent-color: var(--accent); }\n\n  .toolbar-btn {\n    padding: 5px 10px;\n    background: var(--bg-elevated);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    color: var(--text-secondary);\n    font-size: 14px;\n    cursor: pointer;\n    line-height: 1;\n    transition: border-color var(--transition), color var(--transition), background var(--transition);\n  }\n  .toolbar-btn:hover {\n    border-color: var(--accent);\n    color: var(--text-primary);\n    background: var(--accent-dim);\n  }\n  .graph-stats {\n    font-size: 12px;\n    color: var(--text-muted);\n    white-space: nowrap;\n    font-family: var(--font-mono);\n  }\n"] }]
    }], null, { spaceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaceId", required: false }] }], stats: [{ type: i0.Input, args: [{ isSignal: true, alias: "stats", required: false }] }], depth: [{ type: i0.Input, args: [{ isSignal: true, alias: "depth", required: false }] }], direction: [{ type: i0.Input, args: [{ isSignal: true, alias: "direction", required: false }] }], hideLabels: [{ type: i0.Input, args: [{ isSignal: true, alias: "hideLabels", required: false }] }], depthChange: [{ type: i0.Output, args: ["depthChange"] }], directionChange: [{ type: i0.Output, args: ["directionChange"] }], hideLabelsChange: [{ type: i0.Output, args: ["hideLabelsChange"] }], rootSelected: [{ type: i0.Output, args: ["rootSelected"] }], queryChange: [{ type: i0.Output, args: ["queryChange"] }], fit: [{ type: i0.Output, args: ["fit"] }], reset: [{ type: i0.Output, args: ["reset"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(GraphToolbarComponent, { className: "GraphToolbarComponent", filePath: "app/pages/graph/graph-toolbar.component.ts", lineNumber: 87 }); })();
