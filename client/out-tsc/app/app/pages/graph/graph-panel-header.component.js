import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { GRAPH_PANEL_HEADER_STYLES } from './graph.styles';
import * as i0 from "@angular/core";
function GraphPanelHeaderComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 7);
    i0.ɵɵlistener("click", function GraphPanelHeaderComponent_Conditional_7_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.view.emit()); });
    i0.ɵɵelement(1, "ph-icon", 8);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 14);
} }
/**
 * The bar across the top of a graph side panel: a colour dot, a title, a kind badge, and two actions.
 *
 * ## Why one component for two panels
 *
 * The node panel and the edge panel had this markup twice, differing only in what the title read, what the
 * badge said, and whether the eye button was shown at all. Two copies of one bar is how they drift: the node
 * copy grew an inline `display:inline-flex` on its view button and the edge copy grew the same string
 * separately, which is the second time this page has produced the same rule in two places.
 *
 * ## The title comes from the parent, and now has one source
 *
 * `panelTitle` — node name, else edge label, else empty — was computed on the page and read by nothing, while
 * both headers hand-wrote the same expression inline. That is the state this extraction was waiting for: one
 * right answer already existed and neither renderer used it.
 *
 * ## `canView` rather than hiding it in the parent
 *
 * The edge panel shows its eye button only when the edge has a stored record behind it — a synthetic edge has
 * none, so there is nothing to open. Expressed as an input rather than by wrapping the component in an `@if`,
 * because a header without its actions is still a header and the parent should not have to know the shape of
 * this bar to omit one button.
 */
export class GraphPanelHeaderComponent {
    constructor() {
        /** The dot beside the title — the selected record's type colour, already resolved by the page. */
        this.color = input('', ...(ngDevMode ? [{ debugName: "color" }] : /* istanbul ignore next */ []));
        this.title = input('', ...(ngDevMode ? [{ debugName: "title" }] : /* istanbul ignore next */ []));
        /** Already translated where it needs to be: the node panel passes a type, the edge panel a translated word. */
        this.badge = input('', ...(ngDevMode ? [{ debugName: "badge" }] : /* istanbul ignore next */ []));
        /** Whether the record behind this panel can be opened. False for a synthetic edge, which has no record. */
        this.canView = input(true, ...(ngDevMode ? [{ debugName: "canView" }] : /* istanbul ignore next */ []));
        this.view = output();
        this.close = output();
    }
    static { this.ɵfac = function GraphPanelHeaderComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || GraphPanelHeaderComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: GraphPanelHeaderComponent, selectors: [["app-graph-panel-header"]], hostAttrs: [1, "side-panel-header"], inputs: { color: [1, "color"], title: [1, "title"], badge: [1, "badge"], canView: [1, "canView"] }, outputs: { view: "view", close: "close" }, decls: 11, vars: 9, consts: [[1, "side-panel-title"], [1, "side-dot"], [1, "badge"], [1, "side-panel-header-actions"], [1, "btn", "btn-sm", "btn-ghost", "view-btn"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "btn", "btn-sm", "btn-ghost", "view-btn", 3, "click"], ["name", "eye", 3, "size"]], template: function GraphPanelHeaderComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0);
            i0.ɵɵelement(1, "span", 1);
            i0.ɵɵelementStart(2, "h3");
            i0.ɵɵtext(3);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "span", 2);
            i0.ɵɵtext(5);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(6, "div", 3);
            i0.ɵɵconditionalCreate(7, GraphPanelHeaderComponent_Conditional_7_Template, 2, 1, "button", 4);
            i0.ɵɵelementStart(8, "button", 5);
            i0.ɵɵpipe(9, "transloco");
            i0.ɵɵlistener("click", function GraphPanelHeaderComponent_Template_button_click_8_listener() { return ctx.close.emit(); });
            i0.ɵɵelement(10, "ph-icon", 6);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵstyleProp("background", ctx.color());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.title());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.badge());
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.canView() ? 7 : -1);
            i0.ɵɵadvance();
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(9, 7, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 16);
        } }, dependencies: [PhIconComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 10px 14px;\n    border-bottom: 1px solid var(--border);\n    flex-shrink: 0;\n    gap: 8px;\n  }\n  .side-panel-title[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    min-width: 0;\n  }\n  .side-dot[_ngcontent-%COMP%] {\n    width: 10px;\n    height: 10px;\n    border-radius: 50%;\n    flex-shrink: 0;\n  }\n  .side-panel-title[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n    margin: 0;\n    font-size: 14px;\n    font-weight: 600;\n    color: var(--text-primary);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .side-panel-header-actions[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    flex-shrink: 0;\n  }\n\n  \n\n  .view-btn[_ngcontent-%COMP%] { display: inline-flex; align-items: center; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(GraphPanelHeaderComponent, [{
        type: Component,
        args: [{ selector: 'app-graph-panel-header', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, PhIconComponent], host: { class: 'side-panel-header' }, template: `
    <div class="side-panel-title">
      <span class="side-dot" [style.background]="color()"></span>
      <h3>{{ title() }}</h3>
      <span class="badge">{{ badge() }}</span>
    </div>
    <div class="side-panel-header-actions">
      @if (canView()) {
        <button class="btn btn-sm btn-ghost view-btn" (click)="view.emit()">
          <ph-icon name="eye" [size]="14"/>
        </button>
      }
      <button class="icon-btn" [attr.title]="'common.close' | transloco" (click)="close.emit()">
        <ph-icon name="x" [size]="16"/>
      </button>
    </div>
  `, styles: ["\n  :host {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 10px 14px;\n    border-bottom: 1px solid var(--border);\n    flex-shrink: 0;\n    gap: 8px;\n  }\n  .side-panel-title {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    min-width: 0;\n  }\n  .side-dot {\n    width: 10px;\n    height: 10px;\n    border-radius: 50%;\n    flex-shrink: 0;\n  }\n  .side-panel-title h3 {\n    margin: 0;\n    font-size: 14px;\n    font-weight: 600;\n    color: var(--text-primary);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .side-panel-header-actions {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    flex-shrink: 0;\n  }\n\n  /* The view button was two identical inline styles, one per copy of this bar. */\n  .view-btn { display: inline-flex; align-items: center; }\n"] }]
    }], null, { color: [{ type: i0.Input, args: [{ isSignal: true, alias: "color", required: false }] }], title: [{ type: i0.Input, args: [{ isSignal: true, alias: "title", required: false }] }], badge: [{ type: i0.Input, args: [{ isSignal: true, alias: "badge", required: false }] }], canView: [{ type: i0.Input, args: [{ isSignal: true, alias: "canView", required: false }] }], view: [{ type: i0.Output, args: ["view"] }], close: [{ type: i0.Output, args: ["close"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(GraphPanelHeaderComponent, { className: "GraphPanelHeaderComponent", filePath: "app/pages/graph/graph-panel-header.component.ts", lineNumber: 54 }); })();
