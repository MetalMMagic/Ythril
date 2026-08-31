/**
 * StatusPill — the ONE status-badge vocabulary for the app (settings design system, PR-U1).
 *
 * Before this, three divergent badge dialects existed (`badge-red/green/gray`, `badge-active/failing`,
 * `badge-2xx/4xx`). Every "what state is this in?" signal now goes through one component with one
 * colour map, so a pill reads the same on tokens, webhooks, networks, storage, etc.
 *
 * Usage:  <app-status-pill variant="warn" [dot]="true">Expiring</app-status-pill>
 *         <app-status-pill variant="error" icon="warning">Failing</app-status-pill>
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
const _c0 = ["*"];
function StatusPillComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 0);
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("name", ctx_r0.icon())("size", 12);
} }
function StatusPillComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 1);
} }
export class StatusPillComponent {
    constructor() {
        this.variant = input('off', ...(ngDevMode ? [{ debugName: "variant" }] : /* istanbul ignore next */ []));
        /** Optional leading ph-icon name; takes precedence over the dot. */
        this.icon = input('', ...(ngDevMode ? [{ debugName: "icon" }] : /* istanbul ignore next */ []));
        /** Show a leading status dot (ignored when an icon is set). */
        this.dot = input(false, ...(ngDevMode ? [{ debugName: "dot" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function StatusPillComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || StatusPillComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: StatusPillComponent, selectors: [["app-status-pill"]], inputs: { variant: [1, "variant"], icon: [1, "icon"], dot: [1, "dot"] }, ngContentSelectors: _c0, decls: 4, vars: 3, consts: [[3, "name", "size"], [1, "dot"]], template: function StatusPillComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵprojectionDef();
            i0.ɵɵelementStart(0, "span");
            i0.ɵɵconditionalCreate(1, StatusPillComponent_Conditional_1_Template, 1, 2, "ph-icon", 0)(2, StatusPillComponent_Conditional_2_Template, 1, 0, "span", 1);
            i0.ɵɵprojection(3);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵclassMap("pill " + ctx.variant());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.icon() ? 1 : ctx.dot() ? 2 : -1);
        } }, dependencies: [PhIconComponent], styles: [".pill[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 5px;\n      font-size: 11.5px; font-weight: 600; letter-spacing: .01em; line-height: 1.5;\n      padding: 2px 9px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap;\n    }\n    \n\n\n\n\n\n    .pill.active[_ngcontent-%COMP%]  { color: var(--state-active);\n                    background: color-mix(in srgb, var(--state-active) 12%, transparent);\n                    border-color: color-mix(in srgb, var(--state-active) 28%, transparent); }\n    .pill.ok[_ngcontent-%COMP%]      { color: var(--success); background: rgba(63,185,80,.13);   border-color: rgba(63,185,80,.30); }\n    .pill.warn[_ngcontent-%COMP%]    { color: var(--warning); background: rgba(210,153,34,.14);  border-color: rgba(210,153,34,.32); }\n    .pill.error[_ngcontent-%COMP%]   { color: var(--error);   background: rgba(248,81,73,.10);   border-color: rgba(248,81,73,.30); }\n    .pill.pending[_ngcontent-%COMP%] { color: var(--info);    background: rgba(88,166,255,.13);  border-color: rgba(88,166,255,.30); }\n    .pill.off[_ngcontent-%COMP%], .pill.env[_ngcontent-%COMP%] { color: var(--text-muted); background: var(--bg-elevated); border-color: var(--border); }\n    .dot[_ngcontent-%COMP%] { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(StatusPillComponent, [{
        type: Component,
        args: [{ selector: 'app-status-pill', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [PhIconComponent], template: `
    <span [class]="'pill ' + variant()">
      @if (icon()) { <ph-icon [name]="icon()" [size]="12"/> }
      @else if (dot()) { <span class="dot"></span> }
      <ng-content/>
    </span>
  `, styles: ["\n    .pill {\n      display: inline-flex; align-items: center; gap: 5px;\n      font-size: 11.5px; font-weight: 600; letter-spacing: .01em; line-height: 1.5;\n      padding: 2px 9px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap;\n    }\n    /* --state-active, NOT --accent. A pill reports a fact, and a theme owns identity, not facts: a red brand\n       colour turned \"Active\" and \"Online\" red while \"Healthy\" and \"Reachable\" stayed green. The background is\n       mixed from the same token so the two cannot drift \u2014 it used to be a hardcoded rgba of the default accent,\n       which is how a themed instance ended up with red text on a green pill.\n       NO BACKTICKS in this block \u2014 it is one template string, and one backtick ends it. */\n    .pill.active  { color: var(--state-active);\n                    background: color-mix(in srgb, var(--state-active) 12%, transparent);\n                    border-color: color-mix(in srgb, var(--state-active) 28%, transparent); }\n    .pill.ok      { color: var(--success); background: rgba(63,185,80,.13);   border-color: rgba(63,185,80,.30); }\n    .pill.warn    { color: var(--warning); background: rgba(210,153,34,.14);  border-color: rgba(210,153,34,.32); }\n    .pill.error   { color: var(--error);   background: rgba(248,81,73,.10);   border-color: rgba(248,81,73,.30); }\n    .pill.pending { color: var(--info);    background: rgba(88,166,255,.13);  border-color: rgba(88,166,255,.30); }\n    .pill.off, .pill.env { color: var(--text-muted); background: var(--bg-elevated); border-color: var(--border); }\n    .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }\n  "] }]
    }], null, { variant: [{ type: i0.Input, args: [{ isSignal: true, alias: "variant", required: false }] }], icon: [{ type: i0.Input, args: [{ isSignal: true, alias: "icon", required: false }] }], dot: [{ type: i0.Input, args: [{ isSignal: true, alias: "dot", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(StatusPillComponent, { className: "StatusPillComponent", filePath: "app/shared/status-pill.component.ts", lineNumber: 51 }); })();
