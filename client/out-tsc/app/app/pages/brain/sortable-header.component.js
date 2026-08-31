import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import * as i0 from "@angular/core";
const _c0 = ["app-sort-th", ""];
const _c1 = ["*"];
function SortableHeaderComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 4);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function SortableHeaderComponent_Conditional_1_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.sort.emit(ctx_r1.field())); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 5);
    i0.ɵɵelement(5, "ph-icon", 6);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 6, ctx_r1.label()));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 8, ctx_r1.label()), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.active());
    i0.ɵɵadvance();
    i0.ɵɵproperty("name", ctx_r1.active() && ctx_r1.dir() === "asc" ? "caret-up" : "caret-down")("size", 12);
} }
function SortableHeaderComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 2);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, ctx_r1.label()));
} }
/**
 * A Brain list-table column header, applied as an attribute on the `<th>` —
 * `<th app-sort-th field="name" label="brain.entities.table.name" …>` — so the table markup stays
 * valid `<thead><tr><th>`.
 *
 * It carries two optional affordances, either or both:
 *
 * - **Sort** (slice 2b-i): when `field` is set, the label becomes a click target that emits
 *   `sort(field)` and shows a caret + `aria-sort`. Omit `field` for a non-sortable column — the label
 *   renders as plain text with no caret.
 * - **Filter** (slice 2b-ii): anything projected into the component docks in a row UNDER the label,
 *   so a column's filter control sits directly beneath its heading (the owner's docked-row layout).
 *   The tab supplies the control (a type `<select>`, a tag `<input>`, …); this primitive only places
 *   it. Sort and filter are independent: clicking the label sorts, using the control below filters.
 *
 * Only columns backed by a server-whitelisted field (slice 2a) pass a `field`, so a header can never
 * ask the server to sort by a field it will 400 on.
 */
export class SortableHeaderComponent {
    constructor() {
        /** Server sort field this column maps to. Omit for a non-sortable column (label only, no caret). */
        this.field = input('', ...(ngDevMode ? [{ debugName: "field" }] : /* istanbul ignore next */ []));
        /** i18n key for the column label. */
        this.label = input.required(...(ngDevMode ? [{ debugName: "label" }] : /* istanbul ignore next */ []));
        /** The currently-sorted field across the table (`''` when nothing is sorted). */
        this.activeField = input('', ...(ngDevMode ? [{ debugName: "activeField" }] : /* istanbul ignore next */ []));
        /** Direction of the active sort. */
        this.dir = input('desc', ...(ngDevMode ? [{ debugName: "dir" }] : /* istanbul ignore next */ []));
        this.sort = output();
        this.active = computed(() => !!this.field() && this.activeField() === this.field(), ...(ngDevMode ? [{ debugName: "active" }] : /* istanbul ignore next */ []));
        this.ariaSort = computed(() => this.active() ? (this.dir() === 'asc' ? 'ascending' : 'descending') : 'none', ...(ngDevMode ? [{ debugName: "ariaSort" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function SortableHeaderComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SortableHeaderComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SortableHeaderComponent, selectors: [["th", "app-sort-th", ""]], hostAttrs: [1, "sort-th"], hostVars: 1, hostBindings: function SortableHeaderComponent_HostBindings(rf, ctx) { if (rf & 2) {
            i0.ɵɵattribute("aria-sort", ctx.ariaSort());
        } }, inputs: { field: [1, "field"], label: [1, "label"], activeField: [1, "activeField"], dir: [1, "dir"] }, outputs: { sort: "sort" }, attrs: _c0, ngContentSelectors: _c1, decls: 5, vars: 1, consts: [[1, "col-stack"], ["type", "button", 1, "sort-btn"], [1, "col-label"], [1, "col-filter"], ["type", "button", 1, "sort-btn", 3, "click"], [1, "sort-caret"], [3, "name", "size"]], template: function SortableHeaderComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵprojectionDef();
            i0.ɵɵelementStart(0, "div", 0);
            i0.ɵɵconditionalCreate(1, SortableHeaderComponent_Conditional_1_Template, 6, 10, "button", 1)(2, SortableHeaderComponent_Conditional_2_Template, 3, 3, "span", 2);
            i0.ɵɵelementStart(3, "div", 3);
            i0.ɵɵprojection(4);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.field() ? 1 : 2);
        } }, dependencies: [PhIconComponent, TranslocoPipe], styles: [".col-stack[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }\n    .sort-btn[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 4px;\n      background: none;\n      border: none;\n      padding: 0;\n      margin: 0;\n      font: inherit;\n      color: inherit;\n      cursor: pointer;\n      text-align: left;\n      white-space: nowrap;\n    }\n    .sort-btn[_ngcontent-%COMP%]:hover { color: var(--text-primary); }\n    .sort-caret[_ngcontent-%COMP%] { display: inline-flex; opacity: 0.3; transition: opacity 0.1s; }\n    .sort-btn[_ngcontent-%COMP%]:hover   .sort-caret[_ngcontent-%COMP%] { opacity: 0.6; }\n    .sort-caret.active[_ngcontent-%COMP%] { opacity: 1; color: var(--accent); }\n    .col-label[_ngcontent-%COMP%] { font: inherit; white-space: nowrap; }\n    \n\n    .col-filter[_ngcontent-%COMP%] { font-weight: 400; text-transform: none; letter-spacing: normal; width: 100%; }\n    .col-filter[_ngcontent-%COMP%]:empty { display: none; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SortableHeaderComponent, [{
        type: Component,
        args: [{ selector: 'th[app-sort-th]', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, PhIconComponent], host: {
                    '[attr.aria-sort]': 'ariaSort()',
                    'class': 'sort-th',
                }, template: `
    <div class="col-stack">
      @if (field()) {
        <button type="button" class="sort-btn"
          (click)="sort.emit(field())"
          [attr.aria-label]="(label() | transloco)">
          {{ label() | transloco }}
          <span class="sort-caret" [class.active]="active()">
            <ph-icon [name]="active() && dir() === 'asc' ? 'caret-up' : 'caret-down'" [size]="12" />
          </span>
        </button>
      } @else {
        <span class="col-label">{{ label() | transloco }}</span>
      }
      <div class="col-filter"><ng-content /></div>
    </div>
  `, styles: ["\n    .col-stack { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }\n    .sort-btn {\n      display: inline-flex;\n      align-items: center;\n      gap: 4px;\n      background: none;\n      border: none;\n      padding: 0;\n      margin: 0;\n      font: inherit;\n      color: inherit;\n      cursor: pointer;\n      text-align: left;\n      white-space: nowrap;\n    }\n    .sort-btn:hover { color: var(--text-primary); }\n    .sort-caret { display: inline-flex; opacity: 0.3; transition: opacity 0.1s; }\n    .sort-btn:hover .sort-caret { opacity: 0.6; }\n    .sort-caret.active { opacity: 1; color: var(--accent); }\n    .col-label { font: inherit; white-space: nowrap; }\n    /* The docked filter row: normal-weight, so it reads as a control, not part of the heading. */\n    .col-filter { font-weight: 400; text-transform: none; letter-spacing: normal; width: 100%; }\n    .col-filter:empty { display: none; }\n  "] }]
    }], null, { field: [{ type: i0.Input, args: [{ isSignal: true, alias: "field", required: false }] }], label: [{ type: i0.Input, args: [{ isSignal: true, alias: "label", required: true }] }], activeField: [{ type: i0.Input, args: [{ isSignal: true, alias: "activeField", required: false }] }], dir: [{ type: i0.Input, args: [{ isSignal: true, alias: "dir", required: false }] }], sort: [{ type: i0.Output, args: ["sort"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SortableHeaderComponent, { className: "SortableHeaderComponent", filePath: "app/pages/brain/sortable-header.component.ts", lineNumber: 75 }); })();
