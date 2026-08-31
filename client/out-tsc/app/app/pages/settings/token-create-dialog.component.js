import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import { DIALOG_STYLES } from './dialog.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function TokenCreateDialogComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.createError());
} }
function TokenCreateDialogComponent_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 18);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.create.spacesLoadFailed"));
} }
function TokenCreateDialogComponent_Conditional_44_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 19);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.create.loadingSpaces"));
} }
function TokenCreateDialogComponent_Conditional_45_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-rights-matrix", 31);
    i0.ɵɵlistener("changed", function TokenCreateDialogComponent_Conditional_45_Template_app_rights_matrix_changed_0_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.draftRights.set($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("rights", ctx_r1.draftRights())("spaces", ctx_r1.spaceIds());
} }
function TokenCreateDialogComponent_Conditional_70_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 30);
} }
/**
 * The create-token dialog: a label, an optional expiry, and the rights matrix.
 *
 * ## Why it is its own component
 *
 * It was over a quarter of `tokens.component.ts` and pushed that file past the god-file ceiling.
 *
 * That extraction also produced the bug this file's styles now fix. `.dialog-backdrop` and `.dialog` were
 * defined in `tokens.component.ts`, and Angular scopes component styles — so moving the markup out left the
 * CSS behind and the "dialog" rendered as a plain full-width block at the top of the page, no backdrop, no
 * centring, pushing the token list down. Nothing failed: it compiled, it rendered, the tests passed, and it
 * was simply wrong to look at. The shell now comes from `DIALOG_STYLES`, which a move cannot leave behind.
 *
 * ## Why three controls became one
 *
 * The form used to carry a spaces checkbox list, a three-way permission radio (read-only / standard / admin)
 * AND the matrix behind a "Use the per-space matrix" button. Those are two vocabularies for one decision, and
 * the server treats them as **mutually exclusive** — so the form could compose a body the API refuses, and
 * the operator would read that 400 as a bug rather than as a choice they had made.
 *
 * The matrix expresses everything the radio and the checkbox list expressed, and things they could not
 * (admin on Files in one space and nothing anywhere else). So they are gone, not kept beside it.
 *
 * The second-factor selector is gone from CREATE for a different reason: MFA is a property of the token, set
 * on the token, not a decision folded into minting it.
 *
 * ## The contract this must not change
 *
 * The REQUEST BODY. It is what the server's mint cap and the audit log see, and `tokens.component.spec.ts`
 * characterizes it. Those tests were rewritten with this change rather than around it: the body is now always
 * `{ name, rights }` plus an optional `expiresAt`, and never the legacy trio.
 */
export class TokenCreateDialogComponent {
    constructor() {
        this.authApi = inject(AuthApi);
        this.transloco = inject(TranslocoService);
        this.availableSpaces = input([], ...(ngDevMode ? [{ debugName: "availableSpaces" }] : /* istanbul ignore next */ []));
        this.spacesLoadFailed = input(false, ...(ngDevMode ? [{ debugName: "spacesLoadFailed" }] : /* istanbul ignore next */ []));
        this.close = output();
        this.created = output();
        this.creating = signal(false, ...(ngDevMode ? [{ debugName: "creating" }] : /* istanbul ignore next */ []));
        this.createError = signal('', ...(ngDevMode ? [{ debugName: "createError" }] : /* istanbul ignore next */ []));
        /** Just the ids: the matrix keys rows by id and does not need the rest of a space. */
        this.spaceIds = computed(() => this.availableSpaces().map(s => s.id), ...(ngDevMode ? [{ debugName: "spaceIds" }] : /* istanbul ignore next */ []));
        this.draftRights = signal({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} }, ...(ngDevMode ? [{ debugName: "draftRights" }] : /* istanbul ignore next */ []));
        this.newName = '';
        this.newExpiry = '';
        /*
         * Empty means INHERIT the instance value, which is what most tokens should carry — so the field is left
         * blank by default and an empty string is never sent as a number. Sending a resolved default instead would
         * freeze today's instance value onto every token minted through this dialog.
         */
        this.newRateLimit = null;
    }
    /**
     * The two instance-level flags, settable at MINT time — which they were not.
     *
     * `draftRights` initialised both to `false` and nothing could change them, so a token that should hold
     * either had to be created and then edited. The create API accepted both throughout (`CreateTokenBody`),
     * and the edit dialog grew the controls in #908; only this form was left behind.
     *
     * Same signature and same one-line body as the edit dialog's `setFlag`, on purpose: two spellings of one
     * update is how the two forms drift apart again, and this defect IS that drift.
     */
    setFlag(key, on) {
        this.draftRights.update(d => ({ ...d, [key]: on }));
    }
    createToken() {
        if (!this.newName.trim())
            return;
        this.creating.set(true);
        this.createError.set('');
        // ONE description of access, always the matrix. The legacy `spaces`/`admin`/`readOnly` trio is mutually
        // exclusive with `rights` on the server, so a form offering both could compose a body the API refuses —
        // and the operator would read that 400 as a bug rather than as a choice they had made.
        const body = {
            name: this.newName.trim(),
            rights: this.draftRights(),
        };
        if (this.newExpiry)
            body.expiresAt = new Date(this.newExpiry).toISOString();
        // Only when actually given. A blank field means inherit, and `0` is not a legal quota — the server
        // refuses it — so a falsy check is the right test rather than a null check.
        if (this.newRateLimit)
            body.rateLimitPerMinute = Number(this.newRateLimit);
        this.authApi.createToken(body).subscribe({
            next: ({ token, plaintext }) => {
                this.creating.set(false);
                this.close.emit();
                this.created.emit({ token, plaintext });
                this.newName = '';
                this.newExpiry = '';
                this.newRateLimit = null;
            },
            error: (err) => {
                this.creating.set(false);
                this.createError.set(err.error?.error ?? this.transloco.translate('tokens.error.createFailed'));
            },
        });
    }
    static { this.ɵfac = function TokenCreateDialogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TokenCreateDialogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TokenCreateDialogComponent, selectors: [["app-token-create-dialog"]], inputs: { availableSpaces: [1, "availableSpaces"], spacesLoadFailed: [1, "spacesLoadFailed"] }, outputs: { close: "close", created: "created" }, decls: 73, vars: 63, consts: [["f", "ngForm"], [1, "dialog-backdrop"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "card-title"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "alert", "alert-error", 2, "margin-bottom", "16px"], [3, "ngSubmit"], [1, "form-grid"], [1, "field", 2, "margin-bottom", "0"], ["type", "text", "name", "name", "maxlength", "200", "required", "", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "date", "name", "expiry", 1, "styled-input", 3, "ngModelChange", "ngModel"], ["type", "number", "name", "rateLimit", "min", "1", "step", "1", 1, "styled-input", 3, "ngModelChange", "ngModel", "placeholder"], [1, "hint"], [1, "field", 2, "margin-top", "14px", "margin-bottom", "0"], [1, "permission-help"], ["name", "info", 3, "size"], [1, "alert", "alert-error", 2, "margin-top", "6px", "font-size", "12px"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin-top", "4px"], [3, "rights", "spaces"], [1, "danger-zone", 2, "margin-top", "14px"], [1, "danger-title"], [1, "permission-help", 2, "margin-top", "6px"], [2, "display", "flex", "align-items", "center", "gap", "8px", "margin-top", "10px"], ["type", "checkbox", 3, "change", "checked"], [2, "display", "flex", "align-items", "center", "gap", "8px", "margin-top", "8px"], [1, "form-grid-bottom", 2, "margin-top", "12px"], ["type", "button", 1, "btn-secondary", "btn", 3, "click"], ["type", "submit", 1, "btn-primary", "btn", 2, "margin-left", "auto", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [3, "changed", "rights", "spaces"]], template: function TokenCreateDialogComponent_Template(rf, ctx) { if (rf & 1) {
            const _r1 = i0.ɵɵgetCurrentView();
            i0.ɵɵelementStart(0, "div", 1)(1, "div", 2);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("dismiss", function TokenCreateDialogComponent_Template_div_dismiss_1_listener() { return ctx.close.emit(); })("click", function TokenCreateDialogComponent_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
            i0.ɵɵelementStart(3, "div", 3)(4, "div", 4);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 5);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵlistener("click", function TokenCreateDialogComponent_Template_button_click_7_listener() { return ctx.close.emit(); });
            i0.ɵɵelement(9, "ph-icon", 6);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(10, TokenCreateDialogComponent_Conditional_10_Template, 2, 1, "div", 7);
            i0.ɵɵelementStart(11, "form", 8, 0);
            i0.ɵɵlistener("ngSubmit", function TokenCreateDialogComponent_Template_form_ngSubmit_11_listener() { return ctx.createToken(); });
            i0.ɵɵelementStart(13, "div", 9)(14, "div", 10)(15, "label");
            i0.ɵɵtext(16);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(18, "input", 11);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function TokenCreateDialogComponent_Template_input_ngModelChange_18_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.newName, $event) || (ctx.newName = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(20, "div", 10)(21, "label");
            i0.ɵɵtext(22);
            i0.ɵɵpipe(23, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(24, "input", 12);
            i0.ɵɵtwoWayListener("ngModelChange", function TokenCreateDialogComponent_Template_input_ngModelChange_24_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.newExpiry, $event) || (ctx.newExpiry = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(25, "div", 10)(26, "label");
            i0.ɵɵtext(27);
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(29, "input", 13);
            i0.ɵɵpipe(30, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function TokenCreateDialogComponent_Template_input_ngModelChange_29_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.newRateLimit, $event) || (ctx.newRateLimit = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(31, "div", 14);
            i0.ɵɵtext(32);
            i0.ɵɵpipe(33, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(34, "div", 15)(35, "label");
            i0.ɵɵtext(36);
            i0.ɵɵpipe(37, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(38, "p", 16);
            i0.ɵɵelement(39, "ph-icon", 17);
            i0.ɵɵelementStart(40, "span");
            i0.ɵɵtext(41);
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(43, TokenCreateDialogComponent_Conditional_43_Template, 3, 3, "div", 18)(44, TokenCreateDialogComponent_Conditional_44_Template, 3, 3, "div", 19)(45, TokenCreateDialogComponent_Conditional_45_Template, 1, 2, "app-rights-matrix", 20);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(46, "div", 21)(47, "div", 22);
            i0.ɵɵtext(48);
            i0.ɵɵpipe(49, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(50, "p", 23);
            i0.ɵɵelement(51, "ph-icon", 17);
            i0.ɵɵelementStart(52, "span");
            i0.ɵɵtext(53);
            i0.ɵɵpipe(54, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(55, "label", 24)(56, "input", 25);
            i0.ɵɵlistener("change", function TokenCreateDialogComponent_Template_input_change_56_listener($event) { return ctx.setFlag("instanceAdmin", $event.target.checked); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(57, "span");
            i0.ɵɵtext(58);
            i0.ɵɵpipe(59, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(60, "label", 26)(61, "input", 25);
            i0.ɵɵlistener("change", function TokenCreateDialogComponent_Template_input_change_61_listener($event) { return ctx.setFlag("createSpaces", $event.target.checked); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(62, "span");
            i0.ɵɵtext(63);
            i0.ɵɵpipe(64, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(65, "div", 27)(66, "button", 28);
            i0.ɵɵlistener("click", function TokenCreateDialogComponent_Template_button_click_66_listener() { return ctx.close.emit(); });
            i0.ɵɵtext(67);
            i0.ɵɵpipe(68, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(69, "button", 29);
            i0.ɵɵconditionalCreate(70, TokenCreateDialogComponent_Conditional_70_Template, 1, 0, "span", 30);
            i0.ɵɵtext(71);
            i0.ɵɵpipe(72, "transloco");
            i0.ɵɵelementEnd()()()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 29, "tokens.create.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 31, "tokens.create.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 33, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createError() ? 10 : -1);
            i0.ɵɵadvance(6);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 35, "tokens.create.label"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.newName);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(19, 37, "tokens.create.labelPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 39, "tokens.create.expires"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.newExpiry);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 41, "tokens.create.rateLimit"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.newRateLimit);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(30, 43, "tokens.create.rateLimitInherit"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 45, "tokens.create.rateLimitHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 47, "tokens.create.permission"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 49, "tokens.matrix.help"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.spacesLoadFailed() ? 43 : ctx.availableSpaces().length === 0 ? 44 : 45);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(49, 51, "tokens.rights.instanceLevel"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(54, 53, "tokens.rights.instanceLevelHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("checked", ctx.draftRights().instanceAdmin);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(59, 55, "tokens.rights.instanceAdmin"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("checked", ctx.draftRights().createSpaces);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(64, 57, "tokens.rights.createSpaces"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(68, 59, "common.cancel"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.creating() || !ctx.newName.trim());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.creating() ? 70 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(72, 61, "tokens.create.submitButton"), " ");
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MaxLengthValidator, i1.MinValidator, i1.NgModel, i1.NgForm, PhIconComponent, ModalDirective, RightsMatrixComponent, TranslocoPipe], styles: [".dialog-backdrop[_ngcontent-%COMP%] {\n    position: fixed;\n    inset: 0;\n    background: var(--bg-scrim);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 100;\n    padding: 16px;\n  }\n  .dialog[_ngcontent-%COMP%] {\n    background: var(--bg-primary);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-lg);\n    padding: 24px;\n    width: 100%;\n    max-width: var(--dialog-max-width, 600px);\n    max-height: 90vh;\n    overflow-y: auto;\n  }\n  \n\n\n\n\n\n\n\n\n\n\n\n\n\n  [_ngcontent-%COMP%]:root.ythril-decorated   .dialog[_ngcontent-%COMP%] {\n    background: color-mix(in srgb, var(--bg-primary) 74%, transparent);\n    border-color: var(--tr-mid, var(--border));\n    box-shadow:\n      inset 0 1px 0 var(--tr-hot, transparent),\n      0 10px 30px rgb(0 0 0 / 28%);\n  }\n  .dialog-header[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 16px;\n  }\n\n  \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n  .danger-zone[_ngcontent-%COMP%] {\n    margin-top: 20px;\n    border: 1px solid var(--danger-border, var(--border));\n    border-radius: var(--radius-md);\n    padding: 12px 14px;\n  }\n  .danger-title[_ngcontent-%COMP%] {\n    font-size: 12px;\n    font-weight: 600;\n    text-transform: uppercase;\n    letter-spacing: .04em;\n    color: var(--danger, var(--text-secondary));\n    margin-bottom: 10px;\n  }\n  \n\n  .permission-help[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: flex-start;\n    gap: 6px;\n    font-size: 12px;\n    color: var(--text-muted);\n    margin: 0;\n  }", "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n    [_nghost-%COMP%] { --dialog-max-width: min(1400px, 94vw); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TokenCreateDialogComponent, [{
        type: Component,
        args: [{ selector: 'app-token-create-dialog', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, RightsMatrixComponent], template: `
      <div class="dialog-backdrop">
        <div class="dialog" [appModal]="'tokens.create.title' | transloco" (dismiss)="close.emit()" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div class="card-title">{{ 'tokens.create.title' | transloco }}</div>
            <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()"><ph-icon name="x" [size]="14"/></button>
          </div>

          @if (createError()) {
            <div class="alert alert-error" style="margin-bottom:16px;">{{ createError() }}</div>
          }

          <form (ngSubmit)="createToken()" #f="ngForm">
            <div class="form-grid">
              <div class="field" style="margin-bottom:0;">
                <label>{{ 'tokens.create.label' | transloco }}</label>
                <input type="text" [(ngModel)]="newName" name="name" [placeholder]="'tokens.create.labelPlaceholder' | transloco" maxlength="200" required />
              </div>
              <div class="field" style="margin-bottom:0;">
                <label>{{ 'tokens.create.expires' | transloco }}</label>
                <input type="date" class="styled-input" [(ngModel)]="newExpiry" name="expiry" />
              </div>
              <div class="field" style="margin-bottom:0;">
                <label>{{ 'tokens.create.rateLimit' | transloco }}</label>
                <input type="number" class="styled-input" [(ngModel)]="newRateLimit" name="rateLimit"
                  min="1" step="1" [placeholder]="'tokens.create.rateLimitInherit' | transloco" />
                <div class="hint">{{ 'tokens.create.rateLimitHint' | transloco }}</div>
              </div>
            </div>

            <!-- The per-space matrix, and it is the whole permission model now.
                 It used to sit behind a "Use the per-space matrix" button, below a spaces checkbox list and a
                 three-way permission radio that described the SAME access in the pre-2.6.0 vocabulary. Three
                 controls for one decision, two of which the server treats as mutually exclusive with the
                 third — so the form could express bodies the API refuses. The matrix says everything they
                 said and things they could not (admin on Files in one space and nothing anywhere else), so
                 they are gone rather than kept beside it. -->
            <div class="field" style="margin-top:14px; margin-bottom:0;">
              <label>{{ 'tokens.create.permission' | transloco }}</label>
              <p class="permission-help">
                <ph-icon name="info" [size]="14" />
                <span>{{ 'tokens.matrix.help' | transloco }}</span>
              </p>
              @if (spacesLoadFailed()) {
                <div class="alert alert-error" style="margin-top:6px; font-size:12px;">{{ 'tokens.create.spacesLoadFailed' | transloco }}</div>
              } @else if (availableSpaces().length === 0) {
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">{{ 'tokens.create.loadingSpaces' | transloco }}</div>
              } @else {
                <app-rights-matrix
                  [rights]="draftRights()"
                  [spaces]="spaceIds()"
                  (changed)="draftRights.set($event)"/>
              }
            </div>

            <!-- INSTANCE-LEVEL RIGHTS, and this dialog had none of them.
                 draftRights hardcoded instanceAdmin and createSpaces to false with no control, so a token
                 that should hold either had to be created and then EDITED — while the create API has always
                 accepted both (CreateTokenBody declares them). The edit dialog grew these controls in #908
                 and nothing brought them here. Reported by the canary operator 2026-08-17 §9 as the two forms
                 presenting different rights surfaces; it is one missing block, not a diverged surface.

                 OUTSIDE the spaces check above, deliberately. That branch renders nothing when the instance
                 has no spaces yet — and a fresh instance with no spaces is exactly when createSpaces is the
                 right thing to grant. Nesting these inside it would leave the one case they matter most
                 unreachable.

                 Shown rather than hidden from a scoped editor, matching the edit dialog and its stated reason:
                 the server refuses a space-restricted administrator who tries to grant either, so the control
                 offers what the caller may attempt and the server stays the authority. -->
            <div class="danger-zone" style="margin-top:14px;">
              <div class="danger-title">{{ 'tokens.rights.instanceLevel' | transloco }}</div>
              <p class="permission-help" style="margin-top:6px;">
                <ph-icon name="info" [size]="14" />
                <span>{{ 'tokens.rights.instanceLevelHint' | transloco }}</span>
              </p>
              <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
                <input type="checkbox" [checked]="draftRights().instanceAdmin"
                       (change)="setFlag('instanceAdmin', $any($event.target).checked)" />
                <span>{{ 'tokens.rights.instanceAdmin' | transloco }}</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
                <input type="checkbox" [checked]="draftRights().createSpaces"
                       (change)="setFlag('createSpaces', $any($event.target).checked)" />
                <span>{{ 'tokens.rights.createSpaces' | transloco }}</span>
              </label>
            </div>

            <div class="form-grid-bottom" style="margin-top:12px;">
              <button class="btn-secondary btn" type="button" (click)="close.emit()">{{ 'common.cancel' | transloco }}</button>
              <button class="btn-primary btn" type="submit" style="margin-left:auto;" [disabled]="creating() || !newName.trim()">
                @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'tokens.create.submitButton' | transloco }}
              </button>
            </div>
          </form>
        </div>
      </div>
  `, styles: ["\n  .dialog-backdrop {\n    position: fixed;\n    inset: 0;\n    background: var(--bg-scrim);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 100;\n    padding: 16px;\n  }\n  .dialog {\n    background: var(--bg-primary);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-lg);\n    padding: 24px;\n    width: 100%;\n    max-width: var(--dialog-max-width, 600px);\n    max-height: 90vh;\n    overflow-y: auto;\n  }\n  /* The third card surface, decorated on the same terms as .card and .modal in styles.scss \u2014 see the comment\n     there for the whole argument.\n\n     It has to be repeated here rather than covered by that rule, and that is the point of this file existing:\n     these styles live in component style arrays, so Angular's emulated encapsulation scopes .dialog to the\n     components that import THIS constant. A rule in the global sheet would never match it. Writing it here is\n     what makes \"three places, all global, none per-view\" true of the decoration too.\n\n     --bg-primary, not --bg-surface: a dialog's own base differs from a card's, and mixing the wrong one would\n     make a decorated dialog a different shade from a decorated card.\n\n     NOTE: no backticks anywhere in this file, including comments. It is one template literal, so a backtick ends\n     the string and the error surfaces as \"Failed to resolve styles at position 0\", never here. */\n  :root.ythril-decorated .dialog {\n    background: color-mix(in srgb, var(--bg-primary) 74%, transparent);\n    border-color: var(--tr-mid, var(--border));\n    box-shadow:\n      inset 0 1px 0 var(--tr-hot, transparent),\n      0 10px 30px rgb(0 0 0 / 28%);\n  }\n  .dialog-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 16px;\n  }\n\n  /*\n   * THE SET-APART BLOCK, shared because two dialogs now need it and a copy would drift.\n   *\n   * It lived inline in token-rights-dialog alone. When the create dialog gained the same instance-level\n   * flags, its markup used these class names and rendered COMPLETELY UNSTYLED \u2014 the create dialog imports\n   * DIALOG_STYLES only, and Angular's per-component style encapsulation meant the other dialog's copy could\n   * not reach it. That is the same defect as the schema property editor's lost stylesheet (#915): markup that\n   * looks right in the diff and renders as unstyled text in the product.\n   *\n   * Only the CONTAINER and its heading move here. .danger-row/.danger-label/.danger-hint stay inline in\n   * the rights dialog, because rotate and revoke exist nowhere else \u2014 a create form has nothing to rotate.\n   *\n   * Visually separated, and last. A destructive control beside Save is a mis-click; the reader should have to\n   * travel to reach it. The border is the boundary, not decoration.\n   */\n  .danger-zone {\n    margin-top: 20px;\n    border: 1px solid var(--danger-border, var(--border));\n    border-radius: var(--radius-md);\n    padding: 12px 14px;\n  }\n  .danger-title {\n    font-size: 12px;\n    font-weight: 600;\n    text-transform: uppercase;\n    letter-spacing: .04em;\n    color: var(--danger, var(--text-secondary));\n    margin-bottom: 10px;\n  }\n  /* The inline hint beside a flag: an icon and a sentence on one line, muted. */\n  .permission-help {\n    display: flex;\n    align-items: flex-start;\n    gap: 6px;\n    font-size: 12px;\n    color: var(--text-muted);\n    margin: 0;\n  }\n", "\n    /*\n     * WIDEN FOR THE MATRIX \u2014 the edit dialog does this and this one did not, so two of the four areas were\n     * unreachable when MINTING a token.\n     *\n     * Found by screenshotting the dialog, and it could not have been found any other way: all five columns\n     * are in the DOM and countable (5 headers, 8 rung pickers), and Data quality was simply not on screen\n     * while Schema's rungs were clipped mid-cell. Measured at the shared 600px default: clientWidth 598,\n     * maxWidth 600px, and scrollWidth EQUAL to clientWidth \u2014 so nothing scrolled and nothing overflowed in a\n     * way any assertion would notice. The table was squeezed, not scrollable.\n     *\n     * The same value as the rights dialog, which carries the reason: at 600px the matrix renders as a column\n     * of squeezed cells and the space rows wrap, reported as 'too narrow'. Same table, same need, same\n     * number \u2014 a different one here would be a second answer to one question.\n     */\n    :host { --dialog-max-width: min(1400px, 94vw); }\n  "] }]
    }], null, { availableSpaces: [{ type: i0.Input, args: [{ isSignal: true, alias: "availableSpaces", required: false }] }], spacesLoadFailed: [{ type: i0.Input, args: [{ isSignal: true, alias: "spacesLoadFailed", required: false }] }], close: [{ type: i0.Output, args: ["close"] }], created: [{ type: i0.Output, args: ["created"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TokenCreateDialogComponent, { className: "TokenCreateDialogComponent", filePath: "app/pages/settings/token-create-dialog.component.ts", lineNumber: 167 }); })();
