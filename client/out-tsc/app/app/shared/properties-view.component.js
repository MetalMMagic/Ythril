import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.key;
function PropertiesViewComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 0);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵdomElementEnd();
} }
function PropertiesViewComponent_Conditional_1_Conditional_8_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "tr")(1, "td", 6);
    i0.ɵɵtext(2);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(3, "td", 7);
    i0.ɵɵtext(4);
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const kv_r3 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(kv_r3.key);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.formatValue(kv_r3.key, kv_r3.value));
} }
function PropertiesViewComponent_Conditional_1_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "table", 4);
    i0.ɵɵrepeaterCreate(1, PropertiesViewComponent_Conditional_1_Conditional_8_For_2_Template, 5, 2, "tr", null, _forTrack0);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.entries());
} }
function PropertiesViewComponent_Conditional_1_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "pre", 5);
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.jsonStr());
} }
function PropertiesViewComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵdomElementStart(0, "div", 1)(1, "div", 2)(2, "button", 3);
    i0.ɵɵdomListener("click", function PropertiesViewComponent_Conditional_1_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.mode.set("table")); });
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(5, "button", 3);
    i0.ɵɵdomListener("click", function PropertiesViewComponent_Conditional_1_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.mode.set("json")); });
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵdomElementEnd()();
    i0.ɵɵconditionalCreate(8, PropertiesViewComponent_Conditional_1_Conditional_8_Template, 3, 0, "table", 4)(9, PropertiesViewComponent_Conditional_1_Conditional_9_Template, 2, 1, "pre", 5);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.mode() === "table");
    i0.ɵɵattribute("aria-pressed", ctx_r1.mode() === "table");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 9, "propertiesView.tableButton"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.mode() === "json");
    i0.ɵɵattribute("aria-pressed", ctx_r1.mode() === "json");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 11, "propertiesView.jsonButton"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.mode() === "table" ? 8 : 9);
} }
export class PropertiesViewComponent {
    constructor() {
        this.mode = signal('table', ...(ngDevMode ? [{ debugName: "mode" }] : /* istanbul ignore next */ []));
    }
    isEmpty() {
        return !this.properties || Object.keys(this.properties).length === 0;
    }
    entries() {
        if (!this.properties)
            return [];
        return Object.entries(this.properties).map(([key, value]) => ({ key, value }));
    }
    formatValue(key, val) {
        if (this.schema?.[key]?.type === 'date' && typeof val === 'string' && val) {
            const d = new Date(val.length === 10 ? val + 'T12:00:00Z' : val);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                return `${day}.${month}.${d.getFullYear()}`;
            }
        }
        return String(val ?? '');
    }
    jsonStr() {
        return JSON.stringify(this.properties, null, 2);
    }
    static { this.ɵfac = function PropertiesViewComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PropertiesViewComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: PropertiesViewComponent, selectors: [["app-properties-view"]], inputs: { properties: "properties", schema: "schema" }, decls: 2, vars: 1, consts: [[1, "props-none"], [1, "props-wrap"], [1, "props-toggle"], [3, "click"], [1, "props-table"], [1, "props-pre"], [1, "props-key"], [1, "props-val"]], template: function PropertiesViewComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, PropertiesViewComponent_Conditional_0_Template, 2, 0, "span", 0)(1, PropertiesViewComponent_Conditional_1_Template, 10, 13, "div", 1);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.isEmpty() ? 0 : 1);
        } }, dependencies: [CommonModule, TranslocoPipe], styles: [".props-none[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 12px; }\n    .props-wrap[_ngcontent-%COMP%] { font-size: 11px; }\n    .props-toggle[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 3px;\n      margin-bottom: 5px;\n    }\n    .props-toggle[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      font-size: 10px;\n      padding: 1px 7px;\n      border-radius: 3px;\n      border: 1px solid var(--border);\n      background: transparent;\n      color: var(--text-muted);\n      cursor: pointer;\n      line-height: 1.7;\n    }\n    .props-toggle[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n      background: var(--accent-dim);\n      border-color: var(--accent);\n      color: var(--accent);\n    }\n    .props-toggle[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) {\n      border-color: var(--text-muted);\n      color: var(--text-primary);\n    }\n    .props-table[_ngcontent-%COMP%] { border-collapse: collapse; width: 100%; }\n    .props-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:not(:last-child)   td[_ngcontent-%COMP%] { padding-bottom: 2px; }\n    .props-key[_ngcontent-%COMP%] {\n      color: var(--text-muted);\n      font-weight: 500;\n      white-space: nowrap;\n      padding-right: 10px;\n      vertical-align: top;\n      font-size: 11px;\n      \n\n\n      max-width: 45%;\n      overflow: hidden;\n      text-overflow: ellipsis;\n    }\n    .props-val[_ngcontent-%COMP%] {\n      color: var(--text-primary);\n      \n\n\n\n\n\n\n\n\n\n      overflow-wrap: anywhere;\n      font-size: 11px;\n      vertical-align: top;\n      \n\n      min-width: 5em;\n    }\n    .props-pre[_ngcontent-%COMP%] {\n      font-family: var(--font-mono, 'Consolas', 'Monaco', monospace);\n      font-size: 10px;\n      white-space: pre-wrap;\n      word-break: break-all;\n      color: var(--text-primary);\n      background: var(--bg-secondary);\n      border-radius: var(--radius-sm, 4px);\n      padding: 4px 6px;\n      margin: 0;\n      max-height: 140px;\n      overflow-y: auto;\n    }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PropertiesViewComponent, [{
        type: Component,
        args: [{ selector: 'app-properties-view', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, TranslocoPipe], template: `
    @if (isEmpty()) {
      <span class="props-none">—</span>
    } @else {
      <div class="props-wrap">
        <div class="props-toggle">
          <button [class.active]="mode() === 'table'" [attr.aria-pressed]="mode() === 'table'" (click)="mode.set('table')">{{ 'propertiesView.tableButton' | transloco }}</button>
          <button [class.active]="mode() === 'json'" [attr.aria-pressed]="mode() === 'json'" (click)="mode.set('json')">{{ 'propertiesView.jsonButton' | transloco }}</button>
        </div>
        @if (mode() === 'table') {
          <table class="props-table">
            @for (kv of entries(); track kv.key) {
              <tr>
                <td class="props-key">{{ kv.key }}</td>
                <td class="props-val">{{ formatValue(kv.key, kv.value) }}</td>
              </tr>
            }
          </table>
        } @else {
          <pre class="props-pre">{{ jsonStr() }}</pre>
        }
      </div>
    }
  `, styles: ["\n    .props-none { color: var(--text-muted); font-size: 12px; }\n    .props-wrap { font-size: 11px; }\n    .props-toggle {\n      display: flex;\n      gap: 3px;\n      margin-bottom: 5px;\n    }\n    .props-toggle button {\n      font-size: 10px;\n      padding: 1px 7px;\n      border-radius: 3px;\n      border: 1px solid var(--border);\n      background: transparent;\n      color: var(--text-muted);\n      cursor: pointer;\n      line-height: 1.7;\n    }\n    .props-toggle button.active {\n      background: var(--accent-dim);\n      border-color: var(--accent);\n      color: var(--accent);\n    }\n    .props-toggle button:hover:not(.active) {\n      border-color: var(--text-muted);\n      color: var(--text-primary);\n    }\n    .props-table { border-collapse: collapse; width: 100%; }\n    .props-table tr:not(:last-child) td { padding-bottom: 2px; }\n    .props-key {\n      color: var(--text-muted);\n      font-weight: 500;\n      white-space: nowrap;\n      padding-right: 10px;\n      vertical-align: top;\n      font-size: 11px;\n      /* The key is nowrap, so in a squeezed column it claims its full width and leaves the value with\n         whatever is left \u2014 which was ~10px, enough for one character. Cap it so the two share. */\n      max-width: 45%;\n      overflow: hidden;\n      text-overflow: ellipsis;\n    }\n    .props-val {\n      color: var(--text-primary);\n      /* overflow-wrap:anywhere, NOT word-break:break-all.\n         Both break long unbroken tokens (a URL, a hash, an id), which is why the rule exists. The\n         difference is what they do to the element's MIN-CONTENT width: break-all makes it one character\n         wide, so a table column containing this cell can be squeezed to nothing \u2014 and it was. In a\n         narrow window the Entities table collapsed every column to ~118px and rendered the property\n         value \"Germany\" one letter per line, at which point each row was 274px tall, the table was\n         3388px tall, and the horizontal scrollbar it needed sat 2800px below the fold.\n         anywhere breaks only when a word genuinely does not fit, so min-content stays the width of the\n         longest word and the column keeps a sane floor. */\n      overflow-wrap: anywhere;\n      font-size: 11px;\n      vertical-align: top;\n      /* A floor, so the value column cannot be reduced to a single character of vertical text. */\n      min-width: 5em;\n    }\n    .props-pre {\n      font-family: var(--font-mono, 'Consolas', 'Monaco', monospace);\n      font-size: 10px;\n      white-space: pre-wrap;\n      word-break: break-all;\n      color: var(--text-primary);\n      background: var(--bg-secondary);\n      border-radius: var(--radius-sm, 4px);\n      padding: 4px 6px;\n      margin: 0;\n      max-height: 140px;\n      overflow-y: auto;\n    }\n  "] }]
    }], null, { properties: [{
            type: Input
        }], schema: [{
            type: Input
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(PropertiesViewComponent, { className: "PropertiesViewComponent", filePath: "app/shared/properties-view.component.ts", lineNumber: 112 }); })();
