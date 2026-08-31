/**
 * The ONE provider-card shape, used seven times on the Models tab.
 *
 * The owner's complaint about this page — "very wild, no logic structure or consistent layout" — was
 * mostly this component not existing. Four provider cards written inline in one 656-line file each
 * invented their own field order, their own way of showing "env-locked", and their own footer. Seven
 * call sites of one component is what stops that happening again.
 *
 * The approved layout, and the reason for each rule:
 *
 *   - **Uniform height and width.** The grid stretches, the body flexes, the footer is pinned — so
 *     every "Test connection" sits on one baseline instead of wherever its card's last row happened
 *     to end. Ragged heights were never the goal; consistent shape was.
 *   - **Rows that do not apply are omitted, not dashed** (owner's option B). A dash row is noise
 *     claiming to be information.
 *   - **Pills sit on their own row under the title**, including "Egress acknowledged" — which used to
 *     hide in the footer, the one place nobody reads.
 *   - **Infra-set cards are dashed and dimmed and name the env var that owns them.** No "change this
 *     in the environment" footer sentence: the pill already says it, and saying it twice is how the
 *     old card ran out of vertical room.
 *   - **A stable `id`** (`embedding`, `vision`, `stt`, `assist`, `doc-render`, `unstructured`,
 *     `face`) so a pipeline step can deep-link to it.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { HealthDotComponent } from './health-dot.component';
import * as i0 from "@angular/core";
const _c0 = [[["", "pill", ""]], "*", [["", "footer", ""]]];
const _c1 = ["[pill]", "*", "[footer]"];
const _c2 = a0 => ({ envVar: a0 });
function ModelProviderCardComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-health-dot", 5);
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("state", ctx_r0.health() ?? null)("subject", ctx_r0.heading());
} }
function ModelProviderCardComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.purpose());
} }
function ModelProviderCardComponent_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 7);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "mediaProcessing.card.infraTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(3, 4, "mediaProcessing.card.infraPill", i0.ɵɵpureFunction1(7, _c2, ctx_r0.envVar())), " ");
} }
export class ModelProviderCardComponent {
    constructor() {
        /** Stable, and part of the DOM id — a pipeline step deep-links to `#model-card-<id>`. */
        this.id = input.required(...(ngDevMode ? [{ debugName: "id" }] : /* istanbul ignore next */ []));
        this.icon = input('cube', ...(ngDevMode ? [{ debugName: "icon" }] : /* istanbul ignore next */ []));
        this.heading = input.required(...(ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []));
        this.purpose = input('', ...(ngDevMode ? [{ debugName: "purpose" }] : /* istanbul ignore next */ []));
        /** undefined = this card has no health to report (as opposed to `null`, meaning "not known yet"). */
        this.health = input(undefined, ...(ngDevMode ? [{ debugName: "health" }] : /* istanbul ignore next */ []));
        /** True when the value is owned by infrastructure and cannot be set here. */
        this.infra = input(false, ...(ngDevMode ? [{ debugName: "infra" }] : /* istanbul ignore next */ []));
        /** The env var that owns it, named on the pill. Only meaningful when `infra` is true. */
        this.envVar = input('', ...(ngDevMode ? [{ debugName: "envVar" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function ModelProviderCardComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ModelProviderCardComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ModelProviderCardComponent, selectors: [["app-model-provider-card"]], inputs: { id: [1, "id"], icon: [1, "icon"], heading: [1, "heading"], purpose: [1, "purpose"], health: [1, "health"], infra: [1, "infra"], envVar: [1, "envVar"] }, ngContentSelectors: _c1, decls: 16, vars: 9, consts: [[1, "card"], [1, "card-h"], [1, "ic"], [3, "name", "size"], [1, "t"], [3, "state", "subject"], [1, "pills"], [1, "pill", "env"], [1, "card-b"], [1, "card-f"]], template: function ModelProviderCardComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵprojectionDef(_c0);
            i0.ɵɵelementStart(0, "section", 0)(1, "header", 1)(2, "span", 2);
            i0.ɵɵelement(3, "ph-icon", 3);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "div", 4)(5, "h3");
            i0.ɵɵtext(6);
            i0.ɵɵconditionalCreate(7, ModelProviderCardComponent_Conditional_7_Template, 1, 2, "app-health-dot", 5);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(8, ModelProviderCardComponent_Conditional_8_Template, 2, 1, "p");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(9, "div", 6);
            i0.ɵɵprojection(10);
            i0.ɵɵconditionalCreate(11, ModelProviderCardComponent_Conditional_11_Template, 4, 9, "span", 7);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(12, "div", 8);
            i0.ɵɵprojection(13, 1);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(14, "div", 9);
            i0.ɵɵprojection(15, 2);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵclassProp("infra", ctx.infra());
            i0.ɵɵattribute("id", "model-card-" + ctx.id());
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("name", ctx.icon())("size", 18);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1(" ", ctx.heading(), " ");
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.health() !== undefined ? 7 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.purpose() ? 8 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.infra() ? 11 : -1);
        } }, dependencies: [PhIconComponent, HealthDotComponent, TranslocoPipe], styles: ["\n\n    [_nghost-%COMP%] { display: flex; }\n    .card[_ngcontent-%COMP%] { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;\n      display: flex; flex-direction: column; width: 100%; overflow: hidden; }\n    \n\n    .card.infra[_ngcontent-%COMP%] { border-style: dashed; background: transparent; }\n    .card.infra[_ngcontent-%COMP%]   .card-b[_ngcontent-%COMP%] { opacity: .62; }\n\n    .card-h[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 12px; padding: 15px 18px 0; }\n    .ic[_ngcontent-%COMP%] { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .card.infra[_ngcontent-%COMP%]   .ic[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .t[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n    .t[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin: 0; font-size: 15px; font-weight: 620; display: flex; align-items: center; gap: 8px; }\n    .t[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 3px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n\n    \n\n    .pills[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 6px; padding: 9px 18px 0; }\n    .pills[_ngcontent-%COMP%]     .pill, .pills[_ngcontent-%COMP%]     app-status-pill { font-size: 9.5px; }\n\n    .card-b[_ngcontent-%COMP%] { flex: 1; padding: 14px 18px 4px; }\n    .card-f[_ngcontent-%COMP%] { padding: 12px 18px 16px; margin-top: auto; }\n    .card-f[_ngcontent-%COMP%]:empty { display: none; }\n\n    \n\n\n    .card.flash[_ngcontent-%COMP%] { animation: _ngcontent-%COMP%_cardFlash 1.4s ease-out; }\n    @keyframes _ngcontent-%COMP%_cardFlash {\n      0%   { box-shadow: 0 0 0 2px var(--accent); }\n      70%  { box-shadow: 0 0 0 2px var(--accent); }\n      100% { box-shadow: 0 0 0 2px transparent; }\n    }\n    @media (prefers-reduced-motion: reduce) { .card.flash[_ngcontent-%COMP%] { animation: none; } }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ModelProviderCardComponent, [{
        type: Component,
        args: [{ selector: 'app-model-provider-card', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, PhIconComponent, HealthDotComponent], template: `
    <section class="card" [class.infra]="infra()" [attr.id]="'model-card-' + id()">
      <header class="card-h">
        <span class="ic"><ph-icon [name]="icon()" [size]="18"/></span>
        <div class="t">
          <h3>
            {{ heading() }}
            @if (health() !== undefined) {
              <!-- The nullish fallback only satisfies the compiler; the guard above rules out undefined. -->
              <app-health-dot [state]="health() ?? null" [subject]="heading()"/>
            }
          </h3>
          @if (purpose()) { <p>{{ purpose() }}</p> }
        </div>
      </header>

      <div class="pills">
        <ng-content select="[pill]"/>
        @if (infra()) {
          <!-- Names the variable that owns the value. Without it "managed by infra" tells an operator
               they cannot change it here but not where they can. -->
          <span class="pill env" [attr.title]="'mediaProcessing.card.infraTitle' | transloco">
            {{ 'mediaProcessing.card.infraPill' | transloco: { envVar: envVar() } }}
          </span>
        }
      </div>

      <div class="card-b"><ng-content/></div>
      <div class="card-f"><ng-content select="[footer]"/></div>
    </section>
  `, styles: ["\n    /* Stretch to the grid row's height so the pinned footer actually lands on a shared baseline. */\n    :host { display: flex; }\n    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;\n      display: flex; flex-direction: column; width: 100%; overflow: hidden; }\n    /* Infra-owned: dashed and dimmed, so \"you cannot change this here\" is legible before reading. */\n    .card.infra { border-style: dashed; background: transparent; }\n    .card.infra .card-b { opacity: .62; }\n\n    .card-h { display: flex; align-items: flex-start; gap: 12px; padding: 15px 18px 0; }\n    .ic { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .card.infra .ic { color: var(--text-muted); }\n    .t { flex: 1; min-width: 0; }\n    .t h3 { margin: 0; font-size: 15px; font-weight: 620; display: flex; align-items: center; gap: 8px; }\n    .t p { margin: 3px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n\n    /* Pills on their own row under the title, at the size the owner specified. */\n    .pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 9px 18px 0; }\n    .pills ::ng-deep .pill, .pills ::ng-deep app-status-pill { font-size: 9.5px; }\n\n    .card-b { flex: 1; padding: 14px 18px 4px; }\n    .card-f { padding: 12px 18px 16px; margin-top: auto; }\n    .card-f:empty { display: none; }\n\n    /* Brief highlight when the operator arrives here by clicking the model in the Pipelines viz, so the\n       card they landed on is obvious after the scroll. */\n    .card.flash { animation: cardFlash 1.4s ease-out; }\n    @keyframes cardFlash {\n      0%   { box-shadow: 0 0 0 2px var(--accent); }\n      70%  { box-shadow: 0 0 0 2px var(--accent); }\n      100% { box-shadow: 0 0 0 2px transparent; }\n    }\n    @media (prefers-reduced-motion: reduce) { .card.flash { animation: none; } }\n  "] }]
    }], null, { id: [{ type: i0.Input, args: [{ isSignal: true, alias: "id", required: true }] }], icon: [{ type: i0.Input, args: [{ isSignal: true, alias: "icon", required: false }] }], heading: [{ type: i0.Input, args: [{ isSignal: true, alias: "heading", required: true }] }], purpose: [{ type: i0.Input, args: [{ isSignal: true, alias: "purpose", required: false }] }], health: [{ type: i0.Input, args: [{ isSignal: true, alias: "health", required: false }] }], infra: [{ type: i0.Input, args: [{ isSignal: true, alias: "infra", required: false }] }], envVar: [{ type: i0.Input, args: [{ isSignal: true, alias: "envVar", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ModelProviderCardComponent, { className: "ModelProviderCardComponent", filePath: "app/pages/settings/media-processing/model-provider-card.component.ts", lineNumber: 102 }); })();
