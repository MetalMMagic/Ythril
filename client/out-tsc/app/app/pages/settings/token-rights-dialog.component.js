import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import { DIALOG_STYLES } from './dialog.styles';
import { FormsModule } from '@angular/forms';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function TokenRightsDialogComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 5);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.error());
} }
/**
 * Edit an existing token's rights.
 *
 * ## Why the server's refusals are surfaced verbatim
 *
 * Two guards can reject this save, and both are decisions the operator needs the reason for:
 *
 *  - **the cap** — a token may not grant rights it does not hold, and the 403 names every level that was
 *    over the line;
 *  - **the floor** — a token may not raise its OWN floor, and the 403 names the areas that would have gone
 *    up.
 *
 * Replacing either with a generic "could not save" would leave the operator guessing between "I asked for
 * too much" and "I am not allowed to do this to myself", which are different problems with different next
 * steps. So the message is shown as it arrives.
 *
 * ## Why the draft starts from what the token has
 *
 * Starting from an empty matrix would make every save a silent narrowing of everything the operator did not
 * happen to re-enter.
 */
export class TokenRightsDialogComponent {
    constructor() {
        this.authApi = inject(AuthApi);
        this.transloco = inject(TranslocoService);
        this.token = input.required(...(ngDevMode ? [{ debugName: "token" }] : /* istanbul ignore next */ []));
        this.availableSpaces = input([], ...(ngDevMode ? [{ debugName: "availableSpaces" }] : /* istanbul ignore next */ []));
        this.close = output();
        this.saved = output();
        /**
         * The danger actions, as requests rather than deeds.
         *
         * Neither is performed here. The host owns the confirm dialog, the failure toast, the list removal, and the
         * copy-once banner a rotated secret appears in — and it closes this dialog before acting, because that
         * banner renders behind the modal. Doing either here would mean a second confirmation flow and, for rotate,
         * a second place a credential is shown once.
         */
        this.rotate = output();
        this.revoke = output();
        this.saving = signal(false, ...(ngDevMode ? [{ debugName: "saving" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /** Starts from what the token HAS — an empty start would make every save narrow everything not re-entered. */
        this.draft = signal({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} }, ...(ngDevMode ? [{ debugName: "draft" }] : /* istanbul ignore next */ []));
        /** Same reasoning for the label: prefilled, so saving without touching it is not a rename to empty. */
        this.draftName = '';
        /**
         * Still sent, never shown. The second-factor controls were removed from token management on the owner's
         * instruction — the SERVER behaviour is untouched: `mfa` remains on the PATCH body and granting an
         * exemption still costs a live TOTP code. This dialog simply stops offering to change it, so the value
         * round-trips as whatever the token already had.
         */
        this.draftMfa = 'inherit';
        this.totpCode = '';
        /**
         * Ask for a code only when GRANTING an exemption — not when a token already has one and something else is
         * being edited, and not when moving away from one.
         *
         * Deliberately not conditioned on whether MFA is enabled instance-wide: this component would have to fetch
         * that, and a second source for "is MFA on" is a second answer that can disagree with the server's. When the
         * switch is off the server ignores the code, so offering the field costs nothing; when it is on, the code is
         * required and asking here beats a 403 the operator cannot connect to the field they changed.
         *
         * Save is NOT gated on it for the same reason — the server owns that decision, and gating locally would
         * refuse a save the instance would have accepted.
         */
        this.needsCode = () => this.draftMfa === 'exempt' && (this.token().mfa ?? 'inherit') !== 'exempt';
        this.spaceIds = () => this.availableSpaces().map(s => s.id);
    }
    /**
     * The two instance-level flags, which had no control at all until now.
     *
     * They are part of the matrix the server already stores and PATCH already accepts — `migrateToken` sets
     * `instanceAdmin` from the legacy admin flag — so tokens HELD them while the editor could neither grant
     * nor revoke one. An instance admin could not be demoted from the UI.
     *
     * In the danger zone because that is where the owner placed them: they are not a rung on a space, they are
     * the whole instance. The server refuses a space-restricted administrator who tries to grant either, so
     * this control offers what the caller may actually do and the server remains the authority.
     */
    setFlag(key, on) {
        this.draft.update(d => ({ ...d, [key]: on }));
    }
    ngOnInit() {
        const r = this.token().rights;
        if (r)
            this.draft.set({ ...r });
        this.draftName = this.token().name;
        this.draftMfa = this.token().mfa ?? 'inherit';
    }
    save() {
        this.saving.set(true);
        this.error.set('');
        // Each field goes only when it actually changed. Sending one unchanged would work — PATCH accepts it — but
        // it would write a `token.update` audit entry claiming an edit that did not happen, and for the second
        // factor that is the entry someone will one day read to find out when an exemption was granted.
        const trimmed = this.draftName.trim();
        const renamed = trimmed && trimmed !== this.token().name;
        const mfaChanged = this.draftMfa !== (this.token().mfa ?? 'inherit');
        this.authApi.updateToken(this.token().id, {
            rights: this.draft(),
            ...(renamed ? { name: trimmed } : {}),
            ...(mfaChanged ? { mfa: this.draftMfa } : {}),
        }, this.totpCode.trim() || undefined).subscribe({
            next: ({ token }) => { this.saving.set(false); this.saved.emit(token); },
            error: (err) => {
                this.saving.set(false);
                // The exemption refusal is a 403 whose `message` carries the actionable half; `error` is the code
                // `MFA_REQUIRED`, which on its own reads as "you are not allowed" rather than "type your code".
                this.error.set(err.error?.message ?? err.error?.error
                    ?? this.transloco.translate('tokens.error.rightsFailed'));
            },
        });
    }
    static { this.ɵfac = function TokenRightsDialogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TokenRightsDialogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TokenRightsDialogComponent, selectors: [["app-token-rights-dialog"]], inputs: { token: [1, "token"], availableSpaces: [1, "availableSpaces"] }, outputs: { close: "close", saved: "saved", rotate: "rotate", revoke: "revoke" }, decls: 72, vars: 67, consts: [[1, "dialog-backdrop"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], ["role", "alert", 1, "form-error", 2, "white-space", "pre-wrap"], [1, "field", 2, "margin-bottom", "14px"], ["for", "tokenLabel"], ["id", "tokenLabel", "type", "text", "name", "name", "maxlength", "200", 3, "ngModelChange", "ngModel", "placeholder"], [2, "display", "block", "margin-bottom", "6px"], [3, "changed", "rights", "spaces"], [1, "danger-zone"], [1, "danger-title"], [1, "permission-help", 2, "margin-top", "6px"], ["name", "info", 3, "size"], [2, "display", "flex", "align-items", "center", "gap", "8px", "margin-top", "10px"], ["type", "checkbox", 3, "change", "checked"], [2, "display", "flex", "align-items", "center", "gap", "8px", "margin-top", "8px"], [1, "danger-row"], [1, "danger-label"], [1, "danger-hint"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"], ["type", "button", 1, "btn", "btn-danger", "btn-sm", 3, "click"], [1, "form-grid-bottom", 2, "margin-top", "12px"], ["type", "button", 1, "btn-secondary", "btn", 3, "click"], ["type", "button", 1, "btn-primary", "btn", 2, "margin-left", "auto", 3, "click", "disabled"]], template: function TokenRightsDialogComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("dismiss", function TokenRightsDialogComponent_Template_div_dismiss_1_listener() { return ctx.close.emit(); })("click", function TokenRightsDialogComponent_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
            i0.ɵɵelementStart(3, "div", 2)(4, "h3");
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 3);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵlistener("click", function TokenRightsDialogComponent_Template_button_click_7_listener() { return ctx.close.emit(); });
            i0.ɵɵelement(9, "ph-icon", 4);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(10, TokenRightsDialogComponent_Conditional_10_Template, 2, 1, "p", 5);
            i0.ɵɵelementStart(11, "div", 6)(12, "label", 7);
            i0.ɵɵtext(13);
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(15, "input", 8);
            i0.ɵɵpipe(16, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function TokenRightsDialogComponent_Template_input_ngModelChange_15_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.draftName, $event) || (ctx.draftName = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(17, "label", 9);
            i0.ɵɵtext(18);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(20, "app-rights-matrix", 10);
            i0.ɵɵlistener("changed", function TokenRightsDialogComponent_Template_app_rights_matrix_changed_20_listener($event) { return ctx.draft.set($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(21, "div", 11)(22, "div", 12);
            i0.ɵɵtext(23);
            i0.ɵɵpipe(24, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(25, "div", 12);
            i0.ɵɵtext(26);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(28, "p", 13);
            i0.ɵɵelement(29, "ph-icon", 14);
            i0.ɵɵelementStart(30, "span");
            i0.ɵɵtext(31);
            i0.ɵɵpipe(32, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(33, "label", 15)(34, "input", 16);
            i0.ɵɵlistener("change", function TokenRightsDialogComponent_Template_input_change_34_listener($event) { return ctx.setFlag("instanceAdmin", $event.target.checked); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(35, "span");
            i0.ɵɵtext(36);
            i0.ɵɵpipe(37, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(38, "label", 17)(39, "input", 16);
            i0.ɵɵlistener("change", function TokenRightsDialogComponent_Template_input_change_39_listener($event) { return ctx.setFlag("createSpaces", $event.target.checked); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(40, "span");
            i0.ɵɵtext(41);
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(43, "div", 18)(44, "div")(45, "div", 19);
            i0.ɵɵtext(46);
            i0.ɵɵpipe(47, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(48, "div", 20);
            i0.ɵɵtext(49);
            i0.ɵɵpipe(50, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(51, "button", 21);
            i0.ɵɵlistener("click", function TokenRightsDialogComponent_Template_button_click_51_listener() { return ctx.rotate.emit(); });
            i0.ɵɵtext(52);
            i0.ɵɵpipe(53, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(54, "div", 18)(55, "div")(56, "div", 19);
            i0.ɵɵtext(57);
            i0.ɵɵpipe(58, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(59, "div", 20);
            i0.ɵɵtext(60);
            i0.ɵɵpipe(61, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(62, "button", 22);
            i0.ɵɵlistener("click", function TokenRightsDialogComponent_Template_button_click_62_listener() { return ctx.revoke.emit(); });
            i0.ɵɵtext(63);
            i0.ɵɵpipe(64, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(65, "div", 23)(66, "button", 24);
            i0.ɵɵlistener("click", function TokenRightsDialogComponent_Template_button_click_66_listener() { return ctx.close.emit(); });
            i0.ɵɵtext(67);
            i0.ɵɵpipe(68, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(69, "button", 25);
            i0.ɵɵlistener("click", function TokenRightsDialogComponent_Template_button_click_69_listener() { return ctx.save(); });
            i0.ɵɵtext(70);
            i0.ɵɵpipe(71, "transloco");
            i0.ɵɵelementEnd()()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 29, "tokens.rights.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(6, 31, "tokens.rights.title"), " \u2014 ", ctx.token().name);
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 33, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.error() ? 10 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 35, "tokens.create.label"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.draftName);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(16, 37, "tokens.create.labelPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 39, "tokens.create.permission"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("rights", ctx.draft())("spaces", ctx.spaceIds());
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 41, "tokens.danger.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 43, "tokens.rights.instanceLevel"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(32, 45, "tokens.rights.instanceLevelHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("checked", ctx.draft().instanceAdmin);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 47, "tokens.rights.instanceAdmin"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("checked", ctx.draft().createSpaces);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(42, 49, "tokens.rights.createSpaces"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(47, 51, "tokens.rotateButton"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 53, "tokens.danger.rotateHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(53, 55, "tokens.rotateButton"), " ");
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(58, 57, "common.revoke"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(61, 59, "tokens.danger.revokeHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(64, 61, "common.revoke"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(68, 63, "common.cancel"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.saving());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(71, 65, "common.save"), " ");
        } }, dependencies: [PhIconComponent, ModalDirective, RightsMatrixComponent, FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.MaxLengthValidator, i1.NgModel, TranslocoPipe], styles: [".dialog-backdrop[_ngcontent-%COMP%] {\n    position: fixed;\n    inset: 0;\n    background: var(--bg-scrim);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 100;\n    padding: 16px;\n  }\n  .dialog[_ngcontent-%COMP%] {\n    background: var(--bg-primary);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-lg);\n    padding: 24px;\n    width: 100%;\n    max-width: var(--dialog-max-width, 600px);\n    max-height: 90vh;\n    overflow-y: auto;\n  }\n  \n\n\n\n\n\n\n\n\n\n\n\n\n\n  [_ngcontent-%COMP%]:root.ythril-decorated   .dialog[_ngcontent-%COMP%] {\n    background: color-mix(in srgb, var(--bg-primary) 74%, transparent);\n    border-color: var(--tr-mid, var(--border));\n    box-shadow:\n      inset 0 1px 0 var(--tr-hot, transparent),\n      0 10px 30px rgb(0 0 0 / 28%);\n  }\n  .dialog-header[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 16px;\n  }\n\n  \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n  .danger-zone[_ngcontent-%COMP%] {\n    margin-top: 20px;\n    border: 1px solid var(--danger-border, var(--border));\n    border-radius: var(--radius-md);\n    padding: 12px 14px;\n  }\n  .danger-title[_ngcontent-%COMP%] {\n    font-size: 12px;\n    font-weight: 600;\n    text-transform: uppercase;\n    letter-spacing: .04em;\n    color: var(--danger, var(--text-secondary));\n    margin-bottom: 10px;\n  }\n  \n\n  .permission-help[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: flex-start;\n    gap: 6px;\n    font-size: 12px;\n    color: var(--text-muted);\n    margin: 0;\n  }", "\n\n\n\n    [_nghost-%COMP%] { --dialog-max-width: min(1400px, 94vw); }\n    \n\n\n\n\n    .danger-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 16px;\n    }\n    .danger-row[_ngcontent-%COMP%]    + .danger-row[_ngcontent-%COMP%] {\n      margin-top: 10px;\n      padding-top: 10px;\n      border-top: 1px solid var(--border);\n    }\n    .danger-label[_ngcontent-%COMP%] { font-size: 13px; font-weight: 500; }\n    .danger-hint[_ngcontent-%COMP%] { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TokenRightsDialogComponent, [{
        type: Component,
        args: [{ selector: 'app-token-rights-dialog', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, PhIconComponent, ModalDirective, RightsMatrixComponent, FormsModule], template: `
    <div class="dialog-backdrop">
      <div class="dialog" [appModal]="'tokens.rights.title' | transloco"
           (dismiss)="close.emit()" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ 'tokens.rights.title' | transloco }} — {{ token().name }}</h3>
          <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()">
            <ph-icon name="x" [size]="14"/>
          </button>
        </div>

        @if (error()) {
          <!-- Verbatim: the server names the areas or levels that were refused, and a generic message would
               leave the operator guessing which of the two guards fired. -->
          <p class="form-error" role="alert" style="white-space:pre-wrap;">{{ error() }}</p>
        }

        <!-- The label, editable here and nowhere else. This dialog used to edit the rights matrix ALONE, so a
             token's name was write-once: it could be set while minting and never corrected afterwards, even
             though PATCH has always accepted it. The two travel in one request, so a rename and a rights
             change are one audited edit rather than two that can half-fail. -->
        <div class="field" style="margin-bottom:14px;">
          <label for="tokenLabel">{{ 'tokens.create.label' | transloco }}</label>
          <input id="tokenLabel" type="text" [(ngModel)]="draftName" name="name"
                 [placeholder]="'tokens.create.labelPlaceholder' | transloco" maxlength="200" />
        </div>

        <label style="display:block;margin-bottom:6px;">{{ 'tokens.create.permission' | transloco }}</label>
        <app-rights-matrix [rights]="draft()" [spaces]="spaceIds()" (changed)="draft.set($event)"/>


        <!-- Danger zone. Present because this editor is where a token is managed, and rotate/revoke were
             reachable only as two small icons on the list row — so the whole token was managed in two places.
             Both EMIT rather than acting: the page owns the confirmation, the failure toast, the list removal,
             and the copy-once banner that a rotated secret appears in. It also closes this dialog first,
             because that banner renders behind it. -->
        <div class="danger-zone">
          <div class="danger-title">{{ 'tokens.danger.title' | transloco }}</div>
          <div class="danger-title">{{ 'tokens.rights.instanceLevel' | transloco }}</div>
          <p class="permission-help" style="margin-top:6px;">
            <ph-icon name="info" [size]="14" />
            <span>{{ 'tokens.rights.instanceLevelHint' | transloco }}</span>
          </p>
          <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
            <input type="checkbox" [checked]="draft().instanceAdmin"
                   (change)="setFlag('instanceAdmin', $any($event.target).checked)" />
            <span>{{ 'tokens.rights.instanceAdmin' | transloco }}</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input type="checkbox" [checked]="draft().createSpaces"
                   (change)="setFlag('createSpaces', $any($event.target).checked)" />
            <span>{{ 'tokens.rights.createSpaces' | transloco }}</span>
          </label>

          <div class="danger-row">
            <div>
              <div class="danger-label">{{ 'tokens.rotateButton' | transloco }}</div>
              <div class="danger-hint">{{ 'tokens.danger.rotateHint' | transloco }}</div>
            </div>
            <button class="btn btn-secondary btn-sm" type="button" (click)="rotate.emit()">
              {{ 'tokens.rotateButton' | transloco }}
            </button>
          </div>
          <div class="danger-row">
            <div>
              <div class="danger-label">{{ 'common.revoke' | transloco }}</div>
              <div class="danger-hint">{{ 'tokens.danger.revokeHint' | transloco }}</div>
            </div>
            <button class="btn btn-danger btn-sm" type="button" (click)="revoke.emit()">
              {{ 'common.revoke' | transloco }}
            </button>
          </div>
        </div>

        <div class="form-grid-bottom" style="margin-top:12px;">
          <button class="btn-secondary btn" type="button" (click)="close.emit()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button class="btn-primary btn" type="button" style="margin-left:auto;"
                  [disabled]="saving()" (click)="save()">
            {{ 'common.save' | transloco }}
          </button>
        </div>
      </div>
    </div>
  `, styles: ["\n  .dialog-backdrop {\n    position: fixed;\n    inset: 0;\n    background: var(--bg-scrim);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 100;\n    padding: 16px;\n  }\n  .dialog {\n    background: var(--bg-primary);\n    border: 1px solid var(--border);\n    border-radius: var(--radius-lg);\n    padding: 24px;\n    width: 100%;\n    max-width: var(--dialog-max-width, 600px);\n    max-height: 90vh;\n    overflow-y: auto;\n  }\n  /* The third card surface, decorated on the same terms as .card and .modal in styles.scss \u2014 see the comment\n     there for the whole argument.\n\n     It has to be repeated here rather than covered by that rule, and that is the point of this file existing:\n     these styles live in component style arrays, so Angular's emulated encapsulation scopes .dialog to the\n     components that import THIS constant. A rule in the global sheet would never match it. Writing it here is\n     what makes \"three places, all global, none per-view\" true of the decoration too.\n\n     --bg-primary, not --bg-surface: a dialog's own base differs from a card's, and mixing the wrong one would\n     make a decorated dialog a different shade from a decorated card.\n\n     NOTE: no backticks anywhere in this file, including comments. It is one template literal, so a backtick ends\n     the string and the error surfaces as \"Failed to resolve styles at position 0\", never here. */\n  :root.ythril-decorated .dialog {\n    background: color-mix(in srgb, var(--bg-primary) 74%, transparent);\n    border-color: var(--tr-mid, var(--border));\n    box-shadow:\n      inset 0 1px 0 var(--tr-hot, transparent),\n      0 10px 30px rgb(0 0 0 / 28%);\n  }\n  .dialog-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 16px;\n  }\n\n  /*\n   * THE SET-APART BLOCK, shared because two dialogs now need it and a copy would drift.\n   *\n   * It lived inline in token-rights-dialog alone. When the create dialog gained the same instance-level\n   * flags, its markup used these class names and rendered COMPLETELY UNSTYLED \u2014 the create dialog imports\n   * DIALOG_STYLES only, and Angular's per-component style encapsulation meant the other dialog's copy could\n   * not reach it. That is the same defect as the schema property editor's lost stylesheet (#915): markup that\n   * looks right in the diff and renders as unstyled text in the product.\n   *\n   * Only the CONTAINER and its heading move here. .danger-row/.danger-label/.danger-hint stay inline in\n   * the rights dialog, because rotate and revoke exist nowhere else \u2014 a create form has nothing to rotate.\n   *\n   * Visually separated, and last. A destructive control beside Save is a mis-click; the reader should have to\n   * travel to reach it. The border is the boundary, not decoration.\n   */\n  .danger-zone {\n    margin-top: 20px;\n    border: 1px solid var(--danger-border, var(--border));\n    border-radius: var(--radius-md);\n    padding: 12px 14px;\n  }\n  .danger-title {\n    font-size: 12px;\n    font-weight: 600;\n    text-transform: uppercase;\n    letter-spacing: .04em;\n    color: var(--danger, var(--text-secondary));\n    margin-bottom: 10px;\n  }\n  /* The inline hint beside a flag: an icon and a sentence on one line, muted. */\n  .permission-help {\n    display: flex;\n    align-items: flex-start;\n    gap: 6px;\n    font-size: 12px;\n    color: var(--text-muted);\n    margin: 0;\n  }\n", "\n    /* The matrix is areas x rungs, once per space. At the shared 600px default it renders as a column of\n       squeezed cells and the space rows wrap \u2014 reported as \"too narrow\". The --dialog-max-width variable exists\n       precisely so a host can say this; sizing was always the caller's decision. */\n    :host { --dialog-max-width: min(1400px, 94vw); }\n    /* .danger-zone, .danger-title and .permission-help moved to DIALOG_STYLES when the CREATE dialog\n       gained the same instance-level flags \u2014 its markup used these names and rendered unstyled, because\n       per-component encapsulation means this copy could not reach it. The rows below stay here: rotate and\n       revoke exist in this dialog only. */\n    .danger-row {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 16px;\n    }\n    .danger-row + .danger-row {\n      margin-top: 10px;\n      padding-top: 10px;\n      border-top: 1px solid var(--border);\n    }\n    .danger-label { font-size: 13px; font-weight: 500; }\n    .danger-hint { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }\n  "] }]
    }], null, { token: [{ type: i0.Input, args: [{ isSignal: true, alias: "token", required: true }] }], availableSpaces: [{ type: i0.Input, args: [{ isSignal: true, alias: "availableSpaces", required: false }] }], close: [{ type: i0.Output, args: ["close"] }], saved: [{ type: i0.Output, args: ["saved"] }], rotate: [{ type: i0.Output, args: ["rotate"] }], revoke: [{ type: i0.Output, args: ["revoke"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TokenRightsDialogComponent, { className: "TokenRightsDialogComponent", filePath: "app/pages/settings/token-rights-dialog.component.ts", lineNumber: 148 }); })();
