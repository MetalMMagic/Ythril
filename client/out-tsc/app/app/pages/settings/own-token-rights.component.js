import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import { RightsGlyphComponent } from './rights-glyph.component';
import * as i0 from "@angular/core";
function OwnTokenRightsComponent_Conditional_0_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 2);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function OwnTokenRightsComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 1)(2, "h3");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(5, OwnTokenRightsComponent_Conditional_0_Conditional_5_Template, 2, 1, "span", 2);
    i0.ɵɵelement(6, "app-rights-glyph", 3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "p", 4);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(10, "app-rights-matrix", 5);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_3_0;
    const r_r1 = ctx;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 7, "tokens.own.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_3_0 = ctx_r1.name()) ? 5 : -1, tmp_3_0);
    i0.ɵɵadvance();
    i0.ɵɵproperty("rights", r_r1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 9, "tokens.own.readOnly"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("rights", r_r1)("spaces", ctx_r1.spaces())("readonlyView", true);
} }
function OwnTokenRightsComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 1)(2, "h3");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(5, "p", 6);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 2, "tokens.own.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 4, "tokens.own.legacy"));
} }
/**
 * Your OWN token's rights, read-only.
 *
 * ## The gap this closes
 *
 * Owner: *"everyone else at least view their own"*. `GET /api/tokens/me` has always returned the caller's whole
 * record, `rights` included — but the typed client declared the response as `{ id, name, spaces? }`, so the
 * matrix was discarded on arrival and nothing could render it. The tokens page lists through the admin-only
 * `GET /api/tokens`, so a non-admin opening Settings → Tokens saw an ERROR where their own access should be.
 *
 * Same shape as three other things fixed this week: the server returns it, the client's type does not admit it,
 * and no wrong behaviour is observable — only a person missing information they are entitled to.
 *
 * ## Read-only by REUSE, not by re-rendering
 *
 * It renders the same `app-rights-matrix` an admin edits, in `readonlyView` mode. A second renderer for a
 * permission grid would be two places the clamping and the colours could disagree, and the one a reader trusted
 * would be whichever they happened to open.
 *
 * A token with no `rights` object at all is a pre-2.6 record on the legacy path. It gets a sentence rather than
 * an empty grid, because an empty grid reads as "you have nothing".
 */
export class OwnTokenRightsComponent {
    constructor() {
        this.auth = inject(AuthApi);
        this.rights = signal(null, ...(ngDevMode ? [{ debugName: "rights" }] : /* istanbul ignore next */ []));
        this.name = signal(null, ...(ngDevMode ? [{ debugName: "name" }] : /* istanbul ignore next */ []));
        /** A pre-2.6 token: authenticated, but carrying no matrix to show. */
        this.legacy = signal(false, ...(ngDevMode ? [{ debugName: "legacy" }] : /* istanbul ignore next */ []));
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        this.auth.verifyToken().subscribe({
            next: (me) => {
                this.name.set(me.name ?? null);
                if (me.rights) {
                    this.rights.set(me.rights);
                    // The rows to draw are the spaces this token's own grid names. Not every space on the instance —
                    // listing those needs a right this caller may not hold, and a row per unreachable space would say
                    // the opposite of what it means.
                    this.spaces.set(Object.keys(me.rights.perSpace ?? {}).sort());
                }
                else {
                    this.legacy.set(true);
                }
            },
            // Silent: this panel is an extra on a page that has its own error surface, and a second error banner for
            // the same failed session is noise.
            error: () => { },
        });
    }
    static { this.ɵfac = function OwnTokenRightsComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || OwnTokenRightsComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: OwnTokenRightsComponent, selectors: [["app-own-token-rights"]], decls: 2, vars: 1, consts: [[1, "own"], [1, "head"], [1, "name"], [3, "rights"], [1, "why"], [3, "rights", "spaces", "readonlyView"], [1, "legacy"]], template: function OwnTokenRightsComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, OwnTokenRightsComponent_Conditional_0_Template, 11, 11, "div", 0)(1, OwnTokenRightsComponent_Conditional_1_Template, 8, 6, "div", 0);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.rights()) ? 0 : ctx.legacy() ? 1 : -1, tmp_0_0);
        } }, dependencies: [RightsMatrixComponent, RightsGlyphComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; margin-bottom: 20px; }\n    .own[_ngcontent-%COMP%] {\n      border: 1px solid var(--border); border-radius: var(--radius-md);\n      background: var(--bg-surface); padding: 14px 16px;\n    }\n    .head[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }\n    .head[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin: 0; font-size: 13.5px; }\n    .name[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 12px; color: var(--text-secondary); }\n    .why[_ngcontent-%COMP%] { margin: 0 0 10px; font-size: 12px; color: var(--text-muted); }\n    .legacy[_ngcontent-%COMP%] { margin: 0; font-size: 12.5px; color: var(--text-secondary); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(OwnTokenRightsComponent, [{
        type: Component,
        args: [{ selector: 'app-own-token-rights', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, RightsMatrixComponent, RightsGlyphComponent], template: `
    @if (rights(); as r) {
      <div class="own">
        <div class="head">
          <h3>{{ 'tokens.own.title' | transloco }}</h3>
          @if (name(); as n) { <span class="name">{{ n }}</span> }
          <app-rights-glyph [rights]="r"/>
        </div>
        <p class="why">{{ 'tokens.own.readOnly' | transloco }}</p>
        <app-rights-matrix [rights]="r" [spaces]="spaces()" [readonlyView]="true"/>
      </div>
    } @else if (legacy()) {
      <div class="own">
        <div class="head"><h3>{{ 'tokens.own.title' | transloco }}</h3></div>
        <p class="legacy">{{ 'tokens.own.legacy' | transloco }}</p>
      </div>
    }
  `, styles: ["\n    :host { display: block; margin-bottom: 20px; }\n    .own {\n      border: 1px solid var(--border); border-radius: var(--radius-md);\n      background: var(--bg-surface); padding: 14px 16px;\n    }\n    .head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }\n    .head h3 { margin: 0; font-size: 13.5px; }\n    .name { font-family: var(--font-mono, monospace); font-size: 12px; color: var(--text-secondary); }\n    .why { margin: 0 0 10px; font-size: 12px; color: var(--text-muted); }\n    .legacy { margin: 0; font-size: 12.5px; color: var(--text-secondary); }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(OwnTokenRightsComponent, { className: "OwnTokenRightsComponent", filePath: "app/pages/settings/own-token-rights.component.ts", lineNumber: 65 }); })();
