import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@jsverse/transloco";
function TokenQuotaCellComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 0);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", ctx_r0.perToken(), "", i0.ɵɵpipeBind1(2, 2, "tokens.table.perMin"));
} }
function TokenQuotaCellComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵdomElementStart(3, "span", 2);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", ctx_r0.effective(), "", i0.ɵɵpipeBind1(2, 3, "tokens.table.perMin"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 5, "tokens.table.quotaInherited"));
} }
function TokenQuotaCellComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 1);
    i0.ɵɵtext(1, "\u2014");
    i0.ɵɵdomElementEnd();
} }
/**
 * One token's request quota, as a table cell.
 *
 * ## Why this is its own component
 *
 * `no-new-god-files.test.js` refused it inside `tokens.component.ts`, which is already among the largest files
 * and frozen at its size. Its reasoning is the right one here: *"the failure mode of a god-file is not its size
 * on any given day — it is that every change lands in the same place because that is where the code already
 * is."* The quota cell is also the third thing in that table with a real display RULE rather than a value, so it
 * benefits from being somewhere it can be read on its own.
 *
 * ## The rule, which is the whole reason this is not a `{{ }}`
 *
 * Two numbers arrive and they answer different questions:
 *
 *   `perToken`   what an admin SET on this token. Absent on most tokens.
 *   `effective`  what is actually enforced, resolved by the server from token, then instance, then default.
 *
 * **Showing only the first would make "inherits 300" and "inherits 50 because infra capped it" identical** —
 * both blank — which is the absent-versus-not-checked ambiguity this product keeps having to fix. So the
 * effective number is always shown, and an explicitly-set one is badged, because "somebody chose this" and
 * "this is what the instance gives you" are different facts and an operator acts on them differently.
 *
 * NOTE: no backticks anywhere below. A backtick inside an inline template terminates the string and Angular
 * reports `NG1001: Decorator argument must be literal`, pointing at the decorator rather than at the line.
 */
export class TokenQuotaCellComponent {
    constructor() {
        /** What an admin set on this token. Absent means inherit — never unlimited. */
        this.perToken = input(undefined, ...(ngDevMode ? [{ debugName: "perToken" }] : /* istanbul ignore next */ []));
        /** What the server says is actually enforced. */
        this.effective = input(undefined, ...(ngDevMode ? [{ debugName: "effective" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function TokenQuotaCellComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TokenQuotaCellComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TokenQuotaCellComponent, selectors: [["app-token-quota-cell"]], inputs: { perToken: [1, "perToken"], effective: [1, "effective"] }, decls: 3, vars: 1, consts: [[1, "badge", "badge-gray"], [1, "inherited"], [1, "note"]], template: function TokenQuotaCellComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, TokenQuotaCellComponent_Conditional_0_Template, 3, 4, "span", 0)(1, TokenQuotaCellComponent_Conditional_1_Template, 6, 7, "span", 1)(2, TokenQuotaCellComponent_Conditional_2_Template, 2, 0, "span", 1);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.perToken() ? 0 : ctx.effective() ? 1 : 2);
        } }, dependencies: [TranslocoModule, i1.TranslocoPipe], styles: [".inherited[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .note[_ngcontent-%COMP%] { font-style: italic; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TokenQuotaCellComponent, [{
        type: Component,
        args: [{ selector: 'app-token-quota-cell', standalone: true, imports: [TranslocoModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    @if (perToken()) {
      <span class="badge badge-gray">{{ perToken() }}{{ 'tokens.table.perMin' | transloco }}</span>
    } @else if (effective()) {
      <span class="inherited">{{ effective() }}{{ 'tokens.table.perMin' | transloco }}
        <span class="note">{{ 'tokens.table.quotaInherited' | transloco }}</span></span>
    } @else {
      <!-- Neither number known: an OIDC-derived record carries no stored quota, and an older server does not
           send the derived one. A dash is honest; inventing 300 here would be this component asserting a
           default the server may not be using. -->
      <span class="inherited">&mdash;</span>
    }
  `, styles: ["\n    .inherited { color: var(--text-muted); }\n    .note { font-style: italic; }\n  "] }]
    }], null, { perToken: [{ type: i0.Input, args: [{ isSignal: true, alias: "perToken", required: false }] }], effective: [{ type: i0.Input, args: [{ isSignal: true, alias: "effective", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TokenQuotaCellComponent, { className: "TokenQuotaCellComponent", filePath: "app/pages/settings/token-quota-cell.component.ts", lineNumber: 53 }); })();
