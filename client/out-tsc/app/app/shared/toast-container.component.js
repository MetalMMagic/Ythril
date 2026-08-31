/**
 * Toast container — renders the ToastService stack in a fixed, theme-aware
 * region. Mount once in the app shell (<app-toast-container />).
 *
 * Accessibility: the region is an aria-live polite log so screen readers
 * announce new messages without stealing focus; each toast has a labelled
 * dismiss button.
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastService } from '../core/toast.service';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.id;
function ToastContainerComponent_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵdomElementStart(0, "div", 2)(1, "span", 3);
    i0.ɵɵtext(2);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(3, "span", 4);
    i0.ɵɵtext(4);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(5, "button", 5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵdomListener("click", function ToastContainerComponent_For_2_Template_button_click_5_listener() { const t_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.toastService.dismiss(t_r2.id)); });
    i0.ɵɵtext(7, "\u00D7");
    i0.ɵɵdomElementEnd()();
} if (rf & 2) {
    const t_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵclassMap("toast " + t_r2.kind);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r2.icon(t_r2.kind));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(t_r2.message);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(6, 5, "common.close"));
} }
export class ToastContainerComponent {
    constructor() {
        this.toastService = inject(ToastService);
        this.toasts = this.toastService.toasts;
    }
    icon(kind) {
        return kind === 'success' ? '✓' : kind === 'error' ? '⚠' : 'ℹ';
    }
    static { this.ɵfac = function ToastContainerComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ToastContainerComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ToastContainerComponent, selectors: [["app-toast-container"]], decls: 3, vars: 0, consts: [["aria-live", "polite", "aria-relevant", "additions", "role", "log", 1, "toast-region"], [1, "toast", 3, "class"], [1, "toast"], ["aria-hidden", "true", 1, "icon"], [1, "message"], ["type", "button", 1, "dismiss", 3, "click"]], template: function ToastContainerComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "div", 0);
            i0.ɵɵrepeaterCreate(1, ToastContainerComponent_For_2_Template, 8, 7, "div", 1, _forTrack0);
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.toasts());
        } }, dependencies: [CommonModule, TranslocoPipe], styles: [".toast-region[_ngcontent-%COMP%] {\n      position: fixed;\n      bottom: 1.25rem; right: 1.25rem;\n      display: flex; flex-direction: column; gap: 0.6rem;\n      z-index: 10001;            \n\n      max-width: min(92vw, 420px);\n      pointer-events: none;      \n\n    }\n    .toast[_ngcontent-%COMP%] {\n      pointer-events: auto;\n      display: flex; align-items: flex-start; gap: 0.6rem;\n      padding: 0.7rem 0.85rem;\n      border-radius: 8px;\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.25));\n      color: var(--text-primary);\n      font-size: 0.86rem; line-height: 1.35;\n      border-left-width: 3px;\n    }\n    .toast.success[_ngcontent-%COMP%] { border-left-color: var(--success); }\n    .toast.error[_ngcontent-%COMP%]   { border-left-color: var(--error); }\n    .toast.info[_ngcontent-%COMP%]    { border-left-color: var(--info); }\n    .icon[_ngcontent-%COMP%] { flex: 0 0 auto; font-weight: 700; line-height: 1.35; }\n    .toast.success[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] { color: var(--success); }\n    .toast.error[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] { color: var(--error); }\n    .toast.info[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] { color: var(--info); }\n    .message[_ngcontent-%COMP%] { flex: 1 1 auto; word-break: break-word; }\n    .dismiss[_ngcontent-%COMP%] {\n      flex: 0 0 auto;\n      background: none; border: none; cursor: pointer;\n      color: var(--text-muted); font-size: 1rem; line-height: 1;\n      padding: 0 0.15rem;\n    }\n    .dismiss[_ngcontent-%COMP%]:hover { color: var(--text-primary); }\n    @media (prefers-reduced-motion: no-preference) {\n      .toast[_ngcontent-%COMP%] { animation: _ngcontent-%COMP%_toast-in 140ms ease-out; }\n    }\n    @keyframes _ngcontent-%COMP%_toast-in {\n      from { opacity: 0; transform: translateY(6px); }\n      to   { opacity: 1; transform: translateY(0); }\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ToastContainerComponent, [{
        type: Component,
        args: [{ selector: 'app-toast-container', standalone: true, imports: [CommonModule, TranslocoPipe], template: `
    <div class="toast-region" aria-live="polite" aria-relevant="additions" role="log">
      @for (t of toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.kind">
          <span class="icon" aria-hidden="true">{{ icon(t.kind) }}</span>
          <span class="message">{{ t.message }}</span>
          <button
            type="button"
            class="dismiss"
            [attr.aria-label]="'common.close' | transloco"
            (click)="toastService.dismiss(t.id)"
          >&times;</button>
        </div>
      }
    </div>
  `, styles: ["\n    .toast-region {\n      position: fixed;\n      bottom: 1.25rem; right: 1.25rem;\n      display: flex; flex-direction: column; gap: 0.6rem;\n      z-index: 10001;            /* above the CDK overlay backdrop */\n      max-width: min(92vw, 420px);\n      pointer-events: none;      /* let clicks through the gaps */\n    }\n    .toast {\n      pointer-events: auto;\n      display: flex; align-items: flex-start; gap: 0.6rem;\n      padding: 0.7rem 0.85rem;\n      border-radius: 8px;\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.25));\n      color: var(--text-primary);\n      font-size: 0.86rem; line-height: 1.35;\n      border-left-width: 3px;\n    }\n    .toast.success { border-left-color: var(--success); }\n    .toast.error   { border-left-color: var(--error); }\n    .toast.info    { border-left-color: var(--info); }\n    .icon { flex: 0 0 auto; font-weight: 700; line-height: 1.35; }\n    .toast.success .icon { color: var(--success); }\n    .toast.error   .icon { color: var(--error); }\n    .toast.info    .icon { color: var(--info); }\n    .message { flex: 1 1 auto; word-break: break-word; }\n    .dismiss {\n      flex: 0 0 auto;\n      background: none; border: none; cursor: pointer;\n      color: var(--text-muted); font-size: 1rem; line-height: 1;\n      padding: 0 0.15rem;\n    }\n    .dismiss:hover { color: var(--text-primary); }\n    @media (prefers-reduced-motion: no-preference) {\n      .toast { animation: toast-in 140ms ease-out; }\n    }\n    @keyframes toast-in {\n      from { opacity: 0; transform: translateY(6px); }\n      to   { opacity: 1; transform: translateY(0); }\n    }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ToastContainerComponent, { className: "ToastContainerComponent", filePath: "app/shared/toast-container.component.ts", lineNumber: 79 }); })();
