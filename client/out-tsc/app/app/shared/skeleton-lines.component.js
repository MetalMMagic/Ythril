/**
 * Shimmer placeholder lines, for a card whose data has not arrived yet.
 *
 * ## Why this is only the LINES
 *
 * The Brain Overview's cards each render once their own request lands, so the board assembled itself one card at
 * a time and every arrival pushed the ones below it down. A canary operator reported it as the milder half of a
 * flicker: *"they appear one by one as each request lands, rather than as a laid-out set that fills in."*
 *
 * **The point is the SIZE, not the shimmer** — what makes a page feel like it is building itself is the layout
 * moving. So the fix is to reserve the card's space, which means the card's FRAME has to be the real one.
 *
 * A first version of this component drew the frame too (`<section class="panel">`, header and all). It compiled,
 * it built, and it would have rendered an unstyled grey block: `.panel` and `.panel-h` belong to the Overview's
 * own style block, and view encapsulation does not let a child borrow them. Duplicating them here would have been
 * worse than the bug — the two copies drift, and the placeholder would stop matching the height it exists to
 * reserve.
 *
 * So the caller keeps its own frame and puts this inside its body. Reusable part reusable, sized part sized by
 * the thing being sized.
 */
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import * as i0 from "@angular/core";
function SkeletonLinesComponent_For_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElement(0, "p", 1);
} if (rf & 2) {
    const w_r1 = ctx.$implicit;
    i0.ɵɵstyleProp("width", w_r1, "%");
} }
export class SkeletonLinesComponent {
    constructor() {
        /** How many lines to reserve — match the card's settled height, or it moves the layout in the other direction. */
        this.rows = input(3, ...(ngDevMode ? [{ debugName: "rows" }] : /* istanbul ignore next */ []));
    }
    /**
     * Line widths as percentages, varied so the block does not read as one solid rectangle.
     *
     * Derived, never random: `Math.random()` would relayout on every change-detection pass — a flicker of its own,
     * and untestable.
     */
    rowList() {
        const widths = [92, 78, 85, 64, 88, 72];
        return Array.from({ length: Math.max(1, this.rows()) }, (_, i) => widths[i % widths.length]);
    }
    static { this.ɵfac = function SkeletonLinesComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SkeletonLinesComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SkeletonLinesComponent, selectors: [["app-skeleton-lines"]], inputs: { rows: [1, "rows"] }, decls: 2, vars: 0, consts: [[1, "sk-line", 3, "width"], [1, "sk-line"]], template: function SkeletonLinesComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵrepeaterCreate(0, SkeletonLinesComponent_For_1_Template, 1, 2, "p", 0, i0.ɵɵrepeaterTrackByIndex);
        } if (rf & 2) {
            i0.ɵɵrepeater(ctx.rowList());
        } }, styles: ["\n\n\n    [_nghost-%COMP%] { display: block; opacity: .6; }\n    .sk-line[_ngcontent-%COMP%] {\n      height: 13px;\n      margin: 0 0 11px;\n      border-radius: 6px;\n      background: var(--bg-elevated);\n      border: 1px solid var(--border-muted);\n      position: relative;\n      overflow: hidden;\n    }\n    .sk-line[_ngcontent-%COMP%]:last-child { margin-bottom: 0; }\n    \n\n    .sk-line[_ngcontent-%COMP%]::after {\n      content: '';\n      position: absolute;\n      inset: 0;\n      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-muted) 14%, transparent), transparent);\n      transform: translateX(-100%);\n      animation: _ngcontent-%COMP%_sk-sweep 1.6s ease-in-out infinite;\n    }\n    @keyframes _ngcontent-%COMP%_sk-sweep {\n      0%   { transform: translateX(-100%); }\n      100% { transform: translateX(100%); }\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .sk-line[_ngcontent-%COMP%]::after { animation: none; }\n    }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SkeletonLinesComponent, [{
        type: Component,
        args: [{ selector: 'app-skeleton-lines', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `
@for (w of rowList(); track $index) {
  <p class="sk-line" [style.width.%]="w"></p>
}
  `, styles: ["\n    /* Quiet on purpose: this is furniture, not content, and it must not read as a card with something in it.\n       NO BACKTICKS in this block \u2014 it is one template string. */\n    :host { display: block; opacity: .6; }\n    .sk-line {\n      height: 13px;\n      margin: 0 0 11px;\n      border-radius: 6px;\n      background: var(--bg-elevated);\n      border: 1px solid var(--border-muted);\n      position: relative;\n      overflow: hidden;\n    }\n    .sk-line:last-child { margin-bottom: 0; }\n    /* One slow sweep, so several placeholders on screen do not read as a light show. */\n    .sk-line::after {\n      content: '';\n      position: absolute;\n      inset: 0;\n      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-muted) 14%, transparent), transparent);\n      transform: translateX(-100%);\n      animation: sk-sweep 1.6s ease-in-out infinite;\n    }\n    @keyframes sk-sweep {\n      0%   { transform: translateX(-100%); }\n      100% { transform: translateX(100%); }\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .sk-line::after { animation: none; }\n    }\n  "] }]
    }], null, { rows: [{ type: i0.Input, args: [{ isSignal: true, alias: "rows", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SkeletonLinesComponent, { className: "SkeletonLinesComponent", filePath: "app/shared/skeleton-lines.component.ts", lineNumber: 65 }); })();
