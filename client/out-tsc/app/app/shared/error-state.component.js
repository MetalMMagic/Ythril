/**
 * Error-state — the counterpart to the empty state, for when a list *failed to
 * load* rather than legitimately having no rows (UX U3).
 *
 * A failed request must never fall through to a friendly "No memories yet…"
 * empty state: that tells the user, in the app's own reassuring voice, that
 * their data does not exist — so they won't retry and may conclude the brain
 * was wiped. This renders a visually distinct state (warning icon, "Couldn't
 * load …", the failure reason, and a Retry button) that call sites show
 * *before* the empty state whenever their error signal is set.
 *
 * Usage:
 *   @if (loadError()) {
 *     <app-error-state [message]="'brain.error.loadMemories' | transloco"
 *                      [reason]="loadError()" (retry)="reload()" />
 *   } @else if (rows().length === 0) { ...empty state... }
 */
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
function ErrorStateComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.reason());
} }
export class ErrorStateComponent {
    constructor() {
        /** Headline, e.g. "Couldn't load memories". Falls back to a generic message. */
        this.message = input('', ...(ngDevMode ? [{ debugName: "message" }] : /* istanbul ignore next */ []));
        /** Optional failure detail (HTTP status text / server error message). */
        this.reason = input('', ...(ngDevMode ? [{ debugName: "reason" }] : /* istanbul ignore next */ []));
        /** Icon size (defaults to 48 to match the empty-state icons). */
        this.icon = input(48, ...(ngDevMode ? [{ debugName: "icon" }] : /* istanbul ignore next */ []));
        /** Emitted when the user clicks Retry — the call site re-runs its load. */
        this.retry = output();
    }
    static { this.ɵfac = function ErrorStateComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ErrorStateComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ErrorStateComponent, selectors: [["app-error-state"]], inputs: { message: [1, "message"], reason: [1, "reason"], icon: [1, "icon"] }, outputs: { retry: "retry" }, decls: 11, vars: 9, consts: [["role", "alert", 1, "error-state"], [1, "error-icon"], ["name", "warning", 3, "size"], [1, "error-title"], [1, "error-reason"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", "retry-btn", 3, "click"], ["name", "arrows-clockwise", 3, "size"]], template: function ErrorStateComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵelement(2, "ph-icon", 2);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(3, "p", 3);
            i0.ɵɵtext(4);
            i0.ɵɵpipe(5, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(6, ErrorStateComponent_Conditional_6_Template, 2, 1, "p", 4);
            i0.ɵɵelementStart(7, "button", 5);
            i0.ɵɵlistener("click", function ErrorStateComponent_Template_button_click_7_listener() { return ctx.retry.emit(); });
            i0.ɵɵelement(8, "ph-icon", 6);
            i0.ɵɵtext(9);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", ctx.icon());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.message() || i0.ɵɵpipeBind1(5, 5, "common.loadFailed"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.reason() ? 6 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(10, 7, "common.retry"), " ");
        } }, dependencies: [CommonModule, PhIconComponent, TranslocoPipe], styles: [".error-state[_ngcontent-%COMP%] {\n      display: flex; flex-direction: column; align-items: center; justify-content: center;\n      text-align: center;\n      padding: 40px 24px;\n      color: var(--text-secondary);\n    }\n    .error-icon[_ngcontent-%COMP%] { color: var(--error); margin-bottom: 12px; opacity: 0.85; }\n    .error-title[_ngcontent-%COMP%] { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }\n    .error-reason[_ngcontent-%COMP%] {\n      font-size: 12px; color: var(--text-muted); margin: 0 0 16px;\n      max-width: 420px; word-break: break-word;\n      font-family: var(--font-mono, monospace);\n    }\n    .retry-btn[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 6px; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ErrorStateComponent, [{
        type: Component,
        args: [{ selector: 'app-error-state', standalone: true, imports: [CommonModule, TranslocoPipe, PhIconComponent], template: `
    <div class="error-state" role="alert">
      <div class="error-icon"><ph-icon name="warning" [size]="icon()"/></div>
      <p class="error-title">{{ message() || ('common.loadFailed' | transloco) }}</p>
      @if (reason()) {
        <p class="error-reason">{{ reason() }}</p>
      }
      <button type="button" class="btn btn-secondary btn-sm retry-btn" (click)="retry.emit()">
        <ph-icon name="arrows-clockwise" [size]="14"/>{{ 'common.retry' | transloco }}
      </button>
    </div>
  `, styles: ["\n    .error-state {\n      display: flex; flex-direction: column; align-items: center; justify-content: center;\n      text-align: center;\n      padding: 40px 24px;\n      color: var(--text-secondary);\n    }\n    .error-icon { color: var(--error); margin-bottom: 12px; opacity: 0.85; }\n    .error-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }\n    .error-reason {\n      font-size: 12px; color: var(--text-muted); margin: 0 0 16px;\n      max-width: 420px; word-break: break-word;\n      font-family: var(--font-mono, monospace);\n    }\n    .retry-btn { display: inline-flex; align-items: center; gap: 6px; }\n  "] }]
    }], null, { message: [{ type: i0.Input, args: [{ isSignal: true, alias: "message", required: false }] }], reason: [{ type: i0.Input, args: [{ isSignal: true, alias: "reason", required: false }] }], icon: [{ type: i0.Input, args: [{ isSignal: true, alias: "icon", required: false }] }], retry: [{ type: i0.Output, args: ["retry"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ErrorStateComponent, { className: "ErrorStateComponent", filePath: "app/shared/error-state.component.ts", lineNumber: 56 }); })();
