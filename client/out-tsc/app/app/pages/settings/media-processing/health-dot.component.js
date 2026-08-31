/**
 * The health dot on a pipeline step.
 *
 * Glassy per the owner's spec — lit from the top-left, tinted ring, soft bloom — with one exception
 * that is deliberate: the `off` state stays matte. An off component is not unhealthy, and giving it
 * the same glow as a live one would make "deliberately disabled" and "running" look alike at a glance,
 * which is the failure this screen exists to end.
 *
 * **Colour is never the only carrier.** Every dot has an accessible name and a `title`, because the
 * entire purpose of this component is reporting status and a status a screen-reader user cannot hear
 * is not reported. `unknown` (status not loaded, or the fetch failed) stays a distinct *state* — "we
 * could not tell" and "it is switched off" are different facts, and the accessible name/title still
 * says so. Its *visual* now matches `off`/`unconfigured` (a plain grey bead) rather than a dashed
 * hollow ring: per owner review the inactive dots must read as one uniform grey, not a grey-vs-empty
 * mix, so the distinction lives in the name a screen reader announces, not in a second dot shape.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
export class HealthDotComponent {
    constructor() {
        /** null = status not loaded yet, or the fetch failed. Drawn as `unknown`, never as `off`. */
        this.state = input(null, ...(ngDevMode ? [{ debugName: "state" }] : /* istanbul ignore next */ []));
        /** Prepended to the accessible name, so a dot says WHAT is healthy, not just that something is. */
        this.subject = input('', ...(ngDevMode ? [{ debugName: "subject" }] : /* istanbul ignore next */ []));
        this.cls = computed(() => this.state() ?? 'unknown', ...(ngDevMode ? [{ debugName: "cls" }] : /* istanbul ignore next */ []));
        // Built in the template via the pipe rather than in a computed, so the name re-translates when the
        // active language changes instead of freezing at whatever it was when the dot was first drawn.
        this.prefix = computed(() => this.subject() ? `${this.subject()}: ` : '', ...(ngDevMode ? [{ debugName: "prefix" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function HealthDotComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || HealthDotComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: HealthDotComponent, selectors: [["app-health-dot"]], inputs: { state: [1, "state"], subject: [1, "subject"] }, decls: 3, vars: 8, consts: [["role", "img", 1, "dot"]], template: function HealthDotComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElement(0, "span", 0);
            i0.ɵɵpipe(1, "transloco");
            i0.ɵɵpipe(2, "transloco");
        } if (rf & 2) {
            i0.ɵɵclassMap(ctx.cls());
            i0.ɵɵattribute("aria-label", ctx.prefix() + i0.ɵɵpipeBind1(1, 4, "mediaProcessing.health." + ctx.cls()))("title", ctx.prefix() + i0.ɵɵpipeBind1(2, 6, "mediaProcessing.health." + ctx.cls()));
        } }, dependencies: [TranslocoPipe], styles: ["[_nghost-%COMP%] { display: inline-flex; align-items: center; }\n    .dot[_ngcontent-%COMP%] {\n      width: 10px; height: 10px; border-radius: 50%; flex: none; position: relative;\n      background: radial-gradient(circle at 32% 28%, var(--hi), var(--base) 62%);\n      box-shadow: 0 0 0 2.5px var(--ring), 0 0 7px 1px var(--bloom), inset 0 -1px 1.5px rgba(0,0,0,.28);\n    }\n    \n\n    .dot[_ngcontent-%COMP%]::after {\n      content: ''; position: absolute; inset: 1px 1px auto 1.5px; height: 38%; border-radius: 50%;\n      background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,0));\n      pointer-events: none;\n    }\n    \n\n\n\n    .ok[_ngcontent-%COMP%]       { --base: var(--success); }\n    .degraded[_ngcontent-%COMP%] { --base: var(--warning); }\n    .down[_ngcontent-%COMP%]     { --base: var(--error); }\n    .blocked[_ngcontent-%COMP%]  { --base: var(--accent); }\n    .ok[_ngcontent-%COMP%], .degraded[_ngcontent-%COMP%], .down[_ngcontent-%COMP%], .blocked[_ngcontent-%COMP%] {\n      --hi:    color-mix(in srgb, var(--base) 45%, white);\n      --ring:  color-mix(in srgb, var(--base) 20%, transparent);\n      --bloom: color-mix(in srgb, var(--base) 42%, transparent);\n    }\n    \n\n\n\n    .off[_ngcontent-%COMP%], .unknown[_ngcontent-%COMP%], .unconfigured[_ngcontent-%COMP%] {\n      background: var(--bg-elevated); box-shadow: inset 0 0 0 1px var(--border);\n    }\n    .off[_ngcontent-%COMP%]::after, .unknown[_ngcontent-%COMP%]::after, .unconfigured[_ngcontent-%COMP%]::after { display: none; }\n    @media (prefers-reduced-motion: reduce) { .dot[_ngcontent-%COMP%] { box-shadow: 0 0 0 2.5px var(--ring); } }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(HealthDotComponent, [{
        type: Component,
        args: [{ selector: 'app-health-dot', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe], template: `
    <span class="dot" [class]="cls()" role="img"
      [attr.aria-label]="prefix() + ('mediaProcessing.health.' + cls() | transloco)"
      [attr.title]="prefix() + ('mediaProcessing.health.' + cls() | transloco)"></span>
  `, styles: ["\n    :host { display: inline-flex; align-items: center; }\n    .dot {\n      width: 10px; height: 10px; border-radius: 50%; flex: none; position: relative;\n      background: radial-gradient(circle at 32% 28%, var(--hi), var(--base) 62%);\n      box-shadow: 0 0 0 2.5px var(--ring), 0 0 7px 1px var(--bloom), inset 0 -1px 1.5px rgba(0,0,0,.28);\n    }\n    /* The specular highlight is what makes it read as a lit bead rather than a flat circle. */\n    .dot::after {\n      content: ''; position: absolute; inset: 1px 1px auto 1.5px; height: 38%; border-radius: 50%;\n      background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,0));\n      pointer-events: none;\n    }\n    /* Built from the semantic tokens rather than fixed hex, so an embedder overriding --success /\n       --warning / --error restyles the dots along with everything else. The highlight and bloom are\n       derived from the same base colour, which is also what keeps the four states consistent. */\n    .ok       { --base: var(--success); }\n    .degraded { --base: var(--warning); }\n    .down     { --base: var(--error); }\n    .blocked  { --base: var(--accent); }\n    .ok, .degraded, .down, .blocked {\n      --hi:    color-mix(in srgb, var(--base) 45%, white);\n      --ring:  color-mix(in srgb, var(--base) 20%, transparent);\n      --bloom: color-mix(in srgb, var(--base) 42%, transparent);\n    }\n    /* Matte: no bloom, no highlight, flat fill. Deliberately not a colour variant of the others.\n       off / unconfigured / unknown share one grey bead \u2014 inactive dots read as a single uniform grey\n       (owner review); the states stay distinct only in the accessible name, not a second dot shape. */\n    .off, .unknown, .unconfigured {\n      background: var(--bg-elevated); box-shadow: inset 0 0 0 1px var(--border);\n    }\n    .off::after, .unknown::after, .unconfigured::after { display: none; }\n    @media (prefers-reduced-motion: reduce) { .dot { box-shadow: 0 0 0 2.5px var(--ring); } }\n  "] }]
    }], null, { state: [{ type: i0.Input, args: [{ isSignal: true, alias: "state", required: false }] }], subject: [{ type: i0.Input, args: [{ isSignal: true, alias: "subject", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(HealthDotComponent, { className: "HealthDotComponent", filePath: "app/pages/settings/media-processing/health-dot.component.ts", lineNumber: 66 }); })();
