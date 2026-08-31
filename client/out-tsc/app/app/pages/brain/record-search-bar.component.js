import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
/**
 * The record tabs' search bar — a single styled search input.
 *
 * Unifies the four near-identical inline bars (A17.9c). Originally it also carried an A–Z / Semantic
 * mode pill, but slice 2b-iii docked plain-text (A–Z) search into the column headers as a server-side
 * freetext filter, which made the pill's A–Z half redundant. The pill was removed (2b-iii-c): the top
 * bar is now a single-purpose box. Memories/edges/chrono use it for SEMANTIC recall (the parent's
 * `onXSearch` issues a `recallBrain`); file-meta uses it for its client-side path/description/tag
 * filter. The component itself is agnostic — it is a DUMB presentational input: the parent owns the
 * state and passes `value` in, receiving `valueChange` out.
 *
 * NOT here: the entities tab's search, which uses `<app-entity-search>` (entity autocomplete — a
 * richer interaction, intentionally separate), and the semantic-search LOGIC (`onXSearch`/
 * `runSemanticXSearch`), which stays in the tabs because its recall-result mapping is per-collection.
 *
 * `:host { display: contents }` so the input remains a direct flex child of the parent's
 * `.content-header`, preserving the original layout exactly.
 */
export class RecordSearchBarComponent {
    constructor() {
        this.value = input.required(...(ngDevMode ? [{ debugName: "value" }] : /* istanbul ignore next */ []));
        this.placeholder = input.required(...(ngDevMode ? [{ debugName: "placeholder" }] : /* istanbul ignore next */ []));
        /** Optional distinct aria-label i18n key; falls back to `placeholder` when unset. */
        this.ariaLabel = input(null, ...(ngDevMode ? [{ debugName: "ariaLabel" }] : /* istanbul ignore next */ []));
        this.valueChange = output();
    }
    static { this.ɵfac = function RecordSearchBarComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RecordSearchBarComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: RecordSearchBarComponent, selectors: [["app-record-search-bar"]], inputs: { value: [1, "value"], placeholder: [1, "placeholder"], ariaLabel: [1, "ariaLabel"] }, outputs: { valueChange: "valueChange" }, decls: 3, vars: 7, consts: [["type", "search", 3, "input", "value", "placeholder"]], template: function RecordSearchBarComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "input", 0);
            i0.ɵɵpipe(1, "transloco");
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵdomListener("input", function RecordSearchBarComponent_Template_input_input_0_listener($event) { return ctx.valueChange.emit($event.target.value); });
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵdomProperty("value", ctx.value())("placeholder", i0.ɵɵpipeBind1(1, 3, ctx.placeholder()));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 5, ctx.ariaLabel() ?? ctx.placeholder()));
        } }, dependencies: [TranslocoPipe], styles: ["[_nghost-%COMP%] { display: contents; }\n    input[type=search][_ngcontent-%COMP%] {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px;\n      padding: 5px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RecordSearchBarComponent, [{
        type: Component,
        args: [{ selector: 'app-record-search-bar', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe], template: `
    <input type="search"
      [value]="value()"
      (input)="valueChange.emit($any($event.target).value)"
      [placeholder]="placeholder() | transloco"
      [attr.aria-label]="(ariaLabel() ?? placeholder()) | transloco" />
  `, styles: ["\n    :host { display: contents; }\n    input[type=search] {\n      flex: 1;\n      min-width: 180px;\n      max-width: 400px;\n      padding: 5px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-surface);\n      color: var(--text-primary);\n    }\n  "] }]
    }], null, { value: [{ type: i0.Input, args: [{ isSignal: true, alias: "value", required: true }] }], placeholder: [{ type: i0.Input, args: [{ isSignal: true, alias: "placeholder", required: true }] }], ariaLabel: [{ type: i0.Input, args: [{ isSignal: true, alias: "ariaLabel", required: false }] }], valueChange: [{ type: i0.Output, args: ["valueChange"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(RecordSearchBarComponent, { className: "RecordSearchBarComponent", filePath: "app/pages/brain/record-search-bar.component.ts", lineNumber: 49 }); })();
