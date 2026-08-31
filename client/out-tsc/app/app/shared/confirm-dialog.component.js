/**
 * Confirm dialog — a themed replacement for native `confirm()`, opened through
 * the CDK `Dialog` service. Building on CDK gives focus-trap, `role="dialog"`,
 * `aria-modal`, Escape-to-close and focus restore **by construction** (U5), so
 * every confirmation is keyboard- and screen-reader-safe without per-site work.
 *
 * Two consequence tiers:
 *  - plain confirm (reversible actions): Cancel / Confirm.
 *  - type-to-confirm (irreversible actions — wipe/delete space, restore backup,
 *    migrate DB): the confirm button stays disabled until the operator types an
 *    exact challenge string (e.g. the space id), the GitHub-style ritual (C3).
 *
 * Open via ConfirmDialogService, not directly.
 */
import { Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = ["challenge"];
const _c1 = a0 => ({ text: a0 });
function ConfirmDialogComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "label", 7);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "input", 8, 0);
    i0.ɵɵtwoWayListener("ngModelChange", function ConfirmDialogComponent_Conditional_5_Template_input_ngModelChange_3_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.typed, $event) || (ctx_r1.typed = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keyup.enter", function ConfirmDialogComponent_Conditional_5_Template_input_keyup_enter_3_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onEnter()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", ctx_r1.data.requireTextLabel || i0.ɵɵpipeBind2(2, 2, "common.typeToConfirm", i0.ɵɵpureFunction1(5, _c1, ctx_r1.data.requireText)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.typed);
} }
export class ConfirmDialogComponent {
    constructor() {
        this.data = inject(DIALOG_DATA);
        this.ref = inject(DialogRef);
        this.challengeInput = viewChild('challenge', ...(ngDevMode ? [{ debugName: "challengeInput" }] : /* istanbul ignore next */ []));
        this.typed = signal('', ...(ngDevMode ? [{ debugName: "typed" }] : /* istanbul ignore next */ []));
    }
    ngAfterViewInit() {
        // Focus the challenge input for the type-to-confirm tier so the operator
        // lands where the action requires input; plain confirms keep CDK's default
        // focus (the first tabbable — the Cancel button, the safe default).
        this.challengeInput()?.nativeElement.focus();
    }
    canConfirm() {
        if (!this.data.requireText)
            return true;
        return this.typed().trim() === this.data.requireText;
    }
    onEnter() {
        if (this.canConfirm())
            this.confirm();
    }
    confirm() {
        if (this.canConfirm())
            this.ref.close(true);
    }
    cancel() {
        this.ref.close(false);
    }
    static { this.ɵfac = function ConfirmDialogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ConfirmDialogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ConfirmDialogComponent, selectors: [["app-confirm-dialog"]], viewQuery: function ConfirmDialogComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuerySignal(ctx.challengeInput, _c0, 5);
        } if (rf & 2) {
            i0.ɵɵqueryAdvance();
        } }, decls: 13, vars: 14, consts: [["challenge", ""], ["role", "document", 1, "dialog"], ["id", "confirm-title"], [1, "message"], [1, "actions"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"], ["type", "button", 1, "btn", "btn-sm", 3, "click", "disabled"], ["for", "confirm-challenge", 1, "confirm-label"], ["id", "confirm-challenge", "type", "text", "autocomplete", "off", "spellcheck", "false", 3, "ngModelChange", "keyup.enter", "ngModel"]], template: function ConfirmDialogComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 1)(1, "h2", 2);
            i0.ɵɵtext(2);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(3, "p", 3);
            i0.ɵɵtext(4);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(5, ConfirmDialogComponent_Conditional_5_Template, 5, 7);
            i0.ɵɵelementStart(6, "div", 4)(7, "button", 5);
            i0.ɵɵlistener("click", function ConfirmDialogComponent_Template_button_click_7_listener() { return ctx.cancel(); });
            i0.ɵɵtext(8);
            i0.ɵɵpipe(9, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(10, "button", 6);
            i0.ɵɵlistener("click", function ConfirmDialogComponent_Template_button_click_10_listener() { return ctx.confirm(); });
            i0.ɵɵtext(11);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵelementEnd()()();
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.data.title);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.data.message);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.data.requireText ? 5 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1(" ", ctx.data.cancelLabel || i0.ɵɵpipeBind1(9, 10, "common.cancel"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵclassProp("btn-danger", ctx.data.danger)("btn-primary", !ctx.data.danger);
            i0.ɵɵproperty("disabled", !ctx.canConfirm());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", ctx.data.confirmLabel || i0.ɵɵpipeBind1(12, 12, "common.confirm"), " ");
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgModel, TranslocoPipe], styles: [".dialog[_ngcontent-%COMP%] {\n      background: var(--bg-card);\n      border: 1px solid var(--border);\n      border-radius: 10px;\n      padding: 1.5rem;\n      width: 100%; max-width: 440px;\n      box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.25));\n    }\n    h2[_ngcontent-%COMP%] { margin: 0 0 0.6rem; font-size: 1.1rem; color: var(--text-primary); }\n    .message[_ngcontent-%COMP%] { margin: 0 0 1.1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; }\n    .confirm-label[_ngcontent-%COMP%] { display: block; margin: 0 0 0.4rem; font-size: 0.82rem; color: var(--text-muted); }\n    input[_ngcontent-%COMP%] {\n      width: 100%; padding: 0.55rem 0.75rem; margin-bottom: 1.1rem;\n      border: 1px solid var(--border); border-radius: 6px;\n      background: var(--bg-primary); color: var(--text-primary);\n      font-family: var(--font-mono, monospace); font-size: 0.9rem;\n      box-sizing: border-box;\n    }\n    input[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--accent); }\n    .actions[_ngcontent-%COMP%] { display: flex; gap: 10px; justify-content: flex-end; }\n    .btn-danger[_ngcontent-%COMP%] { background: var(--danger); color: #fff; border-color: var(--danger); }\n    .btn-danger[_ngcontent-%COMP%]:disabled { opacity: 0.5; cursor: not-allowed; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ConfirmDialogComponent, [{
        type: Component,
        args: [{ selector: 'app-confirm-dialog', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe], template: `
    <div class="dialog" role="document">
      <h2 id="confirm-title">{{ data.title }}</h2>
      <p class="message">{{ data.message }}</p>

      @if (data.requireText) {
        <label class="confirm-label" for="confirm-challenge">
          {{ data.requireTextLabel || ('common.typeToConfirm' | transloco: { text: data.requireText }) }}
        </label>
        <input
          #challenge
          id="confirm-challenge"
          type="text"
          autocomplete="off"
          spellcheck="false"
          [(ngModel)]="typed"
          (keyup.enter)="onEnter()"
        />
      }

      <div class="actions">
        <button type="button" class="btn btn-secondary btn-sm" (click)="cancel()">
          {{ data.cancelLabel || ('common.cancel' | transloco) }}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          [class.btn-danger]="data.danger"
          [class.btn-primary]="!data.danger"
          [disabled]="!canConfirm()"
          (click)="confirm()"
        >
          {{ data.confirmLabel || ('common.confirm' | transloco) }}
        </button>
      </div>
    </div>
  `, styles: ["\n    .dialog {\n      background: var(--bg-card);\n      border: 1px solid var(--border);\n      border-radius: 10px;\n      padding: 1.5rem;\n      width: 100%; max-width: 440px;\n      box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.25));\n    }\n    h2 { margin: 0 0 0.6rem; font-size: 1.1rem; color: var(--text-primary); }\n    .message { margin: 0 0 1.1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; }\n    .confirm-label { display: block; margin: 0 0 0.4rem; font-size: 0.82rem; color: var(--text-muted); }\n    input {\n      width: 100%; padding: 0.55rem 0.75rem; margin-bottom: 1.1rem;\n      border: 1px solid var(--border); border-radius: 6px;\n      background: var(--bg-primary); color: var(--text-primary);\n      font-family: var(--font-mono, monospace); font-size: 0.9rem;\n      box-sizing: border-box;\n    }\n    input:focus { outline: none; border-color: var(--accent); }\n    .actions { display: flex; gap: 10px; justify-content: flex-end; }\n    .btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }\n    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }\n  "] }]
    }], null, { challengeInput: [{ type: i0.ViewChild, args: ['challenge', { isSignal: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ConfirmDialogComponent, { className: "ConfirmDialogComponent", filePath: "app/shared/confirm-dialog.component.ts", lineNumber: 107 }); })();
