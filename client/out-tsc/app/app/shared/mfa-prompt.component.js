/**
 * MFA prompt modal — shown by the mfaInterceptor when a request returns
 * 403 MFA_REQUIRED or MFA_INVALID.
 *
 * Add <app-mfa-prompt /> once at the top-level layout (app shell).
 * It is invisible until the MfaService emits a challenge.
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalDirective } from './modal.directive';
import { MfaService } from '../core/mfa.service';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function MfaPromptComponent_Conditional_0_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.error());
} }
function MfaPromptComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 1)(1, "div", 2);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("dismiss", function MfaPromptComponent_Conditional_0_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.cancel()); })("click", function MfaPromptComponent_Conditional_0_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(3, "h2");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "input", 3, 0);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function MfaPromptComponent_Conditional_0_Template_input_ngModelChange_9_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.code, $event) || (ctx_r1.code = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keyup.enter", function MfaPromptComponent_Conditional_0_Template_input_keyup_enter_9_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.submit()); });
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(12, MfaPromptComponent_Conditional_0_Conditional_12_Template, 2, 1, "p", 4);
    i0.ɵɵelementStart(13, "div", 5)(14, "button", 6);
    i0.ɵɵlistener("click", function MfaPromptComponent_Conditional_0_Template_button_click_14_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.cancel()); });
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "button", 7);
    i0.ɵɵlistener("click", function MfaPromptComponent_Conditional_0_Template_button_click_17_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.submit()); });
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 9, "mfaPrompt.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 11, "mfaPrompt.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 13, "mfaPrompt.body"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(11, 15, "mfaPrompt.codePlaceholder"));
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.code);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.error() ? 12 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 17, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.code.length < 6);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 19, "mfaPrompt.verifyButton"));
} }
export class MfaPromptComponent {
    constructor() {
        this.mfa = inject(MfaService);
        this.active = signal(false, ...(ngDevMode ? [{ debugName: "active" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.code = '';
        this._resolve = null;
    }
    ngOnInit() {
        this._sub = this.mfa.challenge$.subscribe((challenge) => {
            this._resolve = challenge.resolve;
            this.code = '';
            this.error.set('');
            this.active.set(true);
        });
    }
    ngOnDestroy() { this._sub.unsubscribe(); }
    submit() {
        if (this.code.length < 6)
            return;
        this.active.set(false);
        this._resolve?.(this.code);
        this._resolve = null;
    }
    cancel() {
        this.active.set(false);
        this._resolve?.(null);
        this._resolve = null;
    }
    static { this.ɵfac = function MfaPromptComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || MfaPromptComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: MfaPromptComponent, selectors: [["app-mfa-prompt"]], decls: 1, vars: 1, consts: [["codeInput", ""], [1, "overlay"], [1, "dialog", 3, "dismiss", "click", "appModal"], ["type", "text", "inputmode", "numeric", "autocomplete", "one-time-code", "maxlength", "6", "autofocus", "", 3, "ngModelChange", "keyup.enter", "placeholder", "ngModel"], [1, "error"], [1, "actions"], [1, "btn", "btn-secondary", "btn-sm", 3, "click"], [1, "btn", "btn-primary", "btn-sm", 3, "click", "disabled"]], template: function MfaPromptComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, MfaPromptComponent_Conditional_0_Template, 20, 21, "div", 1);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.active() ? 0 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.MaxLengthValidator, i1.NgModel, ModalDirective, TranslocoPipe], styles: [".overlay[_ngcontent-%COMP%] {\n      position: fixed; inset: 0;\n      background: var(--bg-scrim);\n      display: flex; align-items: center; justify-content: center;\n      z-index: 9999;\n    }\n    .dialog[_ngcontent-%COMP%] {\n      background: var(--bg-card);\n      border: 1px solid var(--border);\n      border-radius: 10px;\n      padding: 2rem;\n      width: 100%; max-width: 360px;\n    }\n    h2[_ngcontent-%COMP%] { margin: 0 0 0.4rem; font-size: 1.1rem; }\n    p[_ngcontent-%COMP%]  { margin: 0 0 1.25rem; color: var(--text-muted); font-size: 0.88rem; }\n    input[_ngcontent-%COMP%] {\n      width: 100%; padding: 0.55rem 0.75rem;\n      border: 1px solid var(--border); border-radius: 6px;\n      background: var(--bg-primary); color: var(--text-primary);\n      font-size: 1.3rem; letter-spacing: 0.25em; text-align: center;\n      font-family: var(--font-mono, monospace);\n      margin-bottom: 1rem;\n    }\n    input[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--accent); }\n    .actions[_ngcontent-%COMP%] { display: flex; gap: 10px; }\n    .actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] { flex: 1; }\n    .error[_ngcontent-%COMP%] { color: var(--error); font-size: 0.82rem; margin: -0.5rem 0 0.75rem; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MfaPromptComponent, [{
        type: Component,
        args: [{ selector: 'app-mfa-prompt', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, ModalDirective], template: `
    @if (active()) {
      <div class="overlay">
        <div class="dialog" [appModal]="'mfaPrompt.title' | transloco" (dismiss)="cancel()" (click)="$event.stopPropagation()">
          <h2>{{ 'mfaPrompt.title' | transloco }}</h2>
          <p>{{ 'mfaPrompt.body' | transloco }}</p>
          <input
            #codeInput
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            [placeholder]="'mfaPrompt.codePlaceholder' | transloco"
            [(ngModel)]="code"
            (keyup.enter)="submit()"
            autofocus
          />
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <div class="actions">
            <button class="btn btn-secondary btn-sm" (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
            <button class="btn btn-primary btn-sm" (click)="submit()" [disabled]="code.length < 6">{{ 'mfaPrompt.verifyButton' | transloco }}</button>
          </div>
        </div>
      </div>
    }
  `, styles: ["\n    .overlay {\n      position: fixed; inset: 0;\n      background: var(--bg-scrim);\n      display: flex; align-items: center; justify-content: center;\n      z-index: 9999;\n    }\n    .dialog {\n      background: var(--bg-card);\n      border: 1px solid var(--border);\n      border-radius: 10px;\n      padding: 2rem;\n      width: 100%; max-width: 360px;\n    }\n    h2 { margin: 0 0 0.4rem; font-size: 1.1rem; }\n    p  { margin: 0 0 1.25rem; color: var(--text-muted); font-size: 0.88rem; }\n    input {\n      width: 100%; padding: 0.55rem 0.75rem;\n      border: 1px solid var(--border); border-radius: 6px;\n      background: var(--bg-primary); color: var(--text-primary);\n      font-size: 1.3rem; letter-spacing: 0.25em; text-align: center;\n      font-family: var(--font-mono, monospace);\n      margin-bottom: 1rem;\n    }\n    input:focus { outline: none; border-color: var(--accent); }\n    .actions { display: flex; gap: 10px; }\n    .actions button { flex: 1; }\n    .error { color: var(--error); font-size: 0.82rem; margin: -0.5rem 0 0.75rem; }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(MfaPromptComponent, { className: "MfaPromptComponent", filePath: "app/shared/mfa-prompt.component.ts", lineNumber: 78 }); })();
