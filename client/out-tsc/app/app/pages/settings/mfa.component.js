import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthApi } from '../../core/auth-api.service';
import { renderSVG } from 'uqr';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function MfaComponent_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵproperty("variant", ctx_r0.enabled() ? "ok" : "off")("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.enabled() ? i0.ɵɵpipeBind1(2, 3, "mfa.status.enabled") : i0.ɵɵpipeBind1(3, 5, "mfa.status.disabled"));
} }
function MfaComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 2);
    i0.ɵɵelement(1, "span", 5);
    i0.ɵɵelementEnd();
} }
function MfaComponent_Conditional_5_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 8);
    i0.ɵɵlistener("click", function MfaComponent_Conditional_5_Conditional_1_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r2); const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.startDisable()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mfa.disableButton"));
} }
function MfaComponent_Conditional_5_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 9);
    i0.ɵɵlistener("click", function MfaComponent_Conditional_5_Conditional_2_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r3); const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.startEnroll()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mfa.enableButton"));
} }
function MfaComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 3);
    i0.ɵɵconditionalCreate(1, MfaComponent_Conditional_5_Conditional_1_Template, 3, 3, "button", 6)(2, MfaComponent_Conditional_5_Conditional_2_Template, 3, 3, "button", 7);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.enabled() ? 1 : 2);
} }
function MfaComponent_Conditional_6_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "img", 12);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("src", ctx_r0.qrUrl(), i0.ɵɵsanitizeUrl);
    i0.ɵɵattribute("alt", i0.ɵɵpipeBind1(1, 2, "mfa.enroll.qrAlt"));
} }
function MfaComponent_Conditional_6_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 19);
} }
function MfaComponent_Conditional_6_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 20);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.enrollError());
} }
function MfaComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "p", 10);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 11);
    i0.ɵɵconditionalCreate(4, MfaComponent_Conditional_6_Conditional_4_Template, 2, 4, "img", 12);
    i0.ɵɵelementStart(5, "div")(6, "div", 13);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "div", 14);
    i0.ɵɵtext(10);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "div")(12, "div", 15);
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "div", 16)(16, "input", 17);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function MfaComponent_Conditional_6_Template_input_ngModelChange_16_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.confirmCode, $event) || (ctx_r0.confirmCode = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keyup.enter", function MfaComponent_Conditional_6_Template_input_keyup_enter_16_listener() { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.confirmEnroll()); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "button", 18);
    i0.ɵɵlistener("click", function MfaComponent_Conditional_6_Template_button_click_19_listener() { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.confirmEnroll()); });
    i0.ɵɵconditionalCreate(20, MfaComponent_Conditional_6_Conditional_20_Template, 1, 0, "span", 19);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "button", 8);
    i0.ɵɵlistener("click", function MfaComponent_Conditional_6_Template_button_click_23_listener() { i0.ɵɵrestoreView(_r4); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.cancel()); });
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()()()();
    i0.ɵɵconditionalCreate(26, MfaComponent_Conditional_6_Conditional_26_Template, 2, 1, "div", 20);
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 13, "mfa.enroll.instructions"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r0.qrUrl() ? 4 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 15, "mfa.enroll.manualKey"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.secret());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 17, "mfa.enroll.enterCode"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(17, 19, "mfa.enroll.codePlaceholder"));
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.confirmCode);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(18, 21, "mfa.enroll.codeAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", ctx_r0.confirming() || ctx_r0.confirmCode.length < 6);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.confirming() ? 20 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(22, 23, "mfa.enroll.confirmButton"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 25, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r0.enrollError() ? 26 : -1);
} }
function MfaComponent_Conditional_7_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 19);
} }
function MfaComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 21);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 22)(4, "button", 8);
    i0.ɵɵlistener("click", function MfaComponent_Conditional_7_Template_button_click_4_listener() { i0.ɵɵrestoreView(_r5); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.cancel()); });
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 23);
    i0.ɵɵlistener("click", function MfaComponent_Conditional_7_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r5); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.confirmDisable()); });
    i0.ɵɵconditionalCreate(8, MfaComponent_Conditional_7_Conditional_8_Template, 1, 0, "span", 19);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, "mfa.disable.warning"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 7, "common.cancel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r0.disabling());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.disabling() ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(10, 9, "mfa.disable.confirmButton"), " ");
} }
function MfaComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.successMsg());
} }
export class MfaComponent {
    constructor() {
        this.authApi = inject(AuthApi);
        this.transloco = inject(TranslocoService);
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.enabled = signal(false, ...(ngDevMode ? [{ debugName: "enabled" }] : /* istanbul ignore next */ []));
        this.state = signal('idle', ...(ngDevMode ? [{ debugName: "state" }] : /* istanbul ignore next */ []));
        this.secret = signal('', ...(ngDevMode ? [{ debugName: "secret" }] : /* istanbul ignore next */ []));
        this.qrUrl = signal('', ...(ngDevMode ? [{ debugName: "qrUrl" }] : /* istanbul ignore next */ []));
        this.confirmCode = '';
        this.confirming = signal(false, ...(ngDevMode ? [{ debugName: "confirming" }] : /* istanbul ignore next */ []));
        this.enrollError = signal('', ...(ngDevMode ? [{ debugName: "enrollError" }] : /* istanbul ignore next */ []));
        this.disabling = signal(false, ...(ngDevMode ? [{ debugName: "disabling" }] : /* istanbul ignore next */ []));
        this.successMsg = signal('', ...(ngDevMode ? [{ debugName: "successMsg" }] : /* istanbul ignore next */ []));
        /** Cleared on destroy so a pending dismissal cannot fire into a torn-down component. */
        this.successTimer = null;
    }
    ngOnInit() { this.refresh(); }
    ngOnDestroy() { if (this.successTimer !== null)
        clearTimeout(this.successTimer); }
    /**
     * Show a success note and retire it on its own.
     *
     * It used to persist until the next action, so "MFA enabled" stayed on screen indefinitely and was
     * still there the next time you opened the page — reading as a live status rather than the receipt for
     * something you did a while ago. Six seconds is long enough to read twice.
     */
    flashSuccess(message) {
        if (this.successTimer !== null)
            clearTimeout(this.successTimer);
        this.successMsg.set(message);
        this.successTimer = setTimeout(() => { this.successMsg.set(''); this.successTimer = null; }, 6000);
    }
    refresh() {
        this.loading.set(true);
        this.authApi.getMfaStatus().subscribe({
            next: ({ enabled }) => { this.enabled.set(enabled); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }
    startEnroll() {
        this.successMsg.set('');
        this.authApi.setupMfa().subscribe({
            next: ({ secret, otpauth }) => {
                this.secret.set(secret);
                // Render the QR entirely client-side — the TOTP secret never leaves
                // the browser (avoids leaking it to external chart services). uqr is a
                // pure-ESM, zero-dependency renderer; the SVG scales to the <img> box.
                const svg = renderSVG(otpauth, { border: 1 });
                this.qrUrl.set('data:image/svg+xml;utf8,' + encodeURIComponent(svg));
                this.confirmCode = '';
                this.enrollError.set('');
                this.state.set('enrolling');
            },
            error: (err) => this.enrollError.set(err.error?.error ?? this.transloco.translate('mfa.error.setupFailed')),
        });
    }
    confirmEnroll() {
        if (this.confirmCode.length < 6)
            return;
        this.confirming.set(true);
        this.enrollError.set('');
        this.authApi.verifyMfaCode(this.confirmCode).subscribe({
            next: ({ valid }) => {
                this.confirming.set(false);
                if (valid) {
                    this.enabled.set(true);
                    this.state.set('idle');
                    this.flashSuccess(this.transloco.translate('mfa.success.enabled'));
                }
                else {
                    this.enrollError.set(this.transloco.translate('mfa.error.invalidCode'));
                }
            },
            error: () => {
                this.confirming.set(false);
                this.enrollError.set(this.transloco.translate('mfa.error.verifyFailed'));
            },
        });
    }
    startDisable() {
        this.successMsg.set('');
        this.state.set('disabling');
    }
    confirmDisable() {
        this.disabling.set(true);
        this.authApi.disableMfa().subscribe({
            next: () => {
                this.disabling.set(false);
                this.enabled.set(false);
                this.state.set('idle');
                this.flashSuccess(this.transloco.translate('mfa.success.disabled'));
            },
            error: () => this.disabling.set(false),
        });
    }
    cancel() { this.state.set('idle'); }
    static { this.ɵfac = function MfaComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || MfaComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: MfaComponent, selectors: [["app-mfa"]], decls: 9, vars: 9, consts: [["icon", "lock", 3, "heading", "purpose"], ["pill", "", 3, "variant", "dot"], [1, "loading-overlay"], [1, "status-row"], [1, "alert", "alert-success", "spaced-above"], [1, "spinner"], [1, "btn", "btn-secondary", "btn-sm"], [1, "btn", "btn-primary", "btn-sm"], [1, "btn", "btn-secondary", "btn-sm", 3, "click"], [1, "btn", "btn-primary", "btn-sm", 3, "click"], [1, "intro"], [1, "qr-wrap"], ["width", "200", "height", "200", 3, "src"], [1, "field-label"], [1, "secret-box"], [1, "field-label", "wide"], [1, "code-row"], ["type", "text", "inputmode", "numeric", "autocomplete", "one-time-code", "maxlength", "6", 1, "code-input", 3, "ngModelChange", "keyup.enter", "placeholder", "ngModel"], [1, "btn", "btn-primary", "btn-sm", 3, "click", "disabled"], [1, "spinner", "inline"], [1, "alert", "alert-error", "spaced-above"], [1, "alert", "alert-error", "spaced-below"], [1, "button-row"], [1, "btn", "btn-secondary", "btn-sm", "danger", 3, "click", "disabled"]], template: function MfaComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "app-settings-card", 0);
            i0.ɵɵpipe(1, "transloco");
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵconditionalCreate(3, MfaComponent_Conditional_3_Template, 4, 7, "app-status-pill", 1);
            i0.ɵɵconditionalCreate(4, MfaComponent_Conditional_4_Template, 2, 0, "div", 2)(5, MfaComponent_Conditional_5_Template, 3, 1, "div", 3)(6, MfaComponent_Conditional_6_Template, 27, 27)(7, MfaComponent_Conditional_7_Template, 11, 11);
            i0.ɵɵconditionalCreate(8, MfaComponent_Conditional_8_Template, 2, 1, "div", 4);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(1, 5, "mfa.title"))("purpose", i0.ɵɵpipeBind1(2, 7, "mfa.subtitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(!ctx.loading() && ctx.state() === "idle" ? 3 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.loading() ? 4 : ctx.state() === "idle" ? 5 : ctx.state() === "enrolling" ? 6 : ctx.state() === "disabling" ? 7 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵconditional(ctx.successMsg() ? 8 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.MaxLengthValidator, i1.NgModel, SettingsCardComponent, StatusPillComponent, TranslocoPipe], styles: [".qr-wrap[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }\n    .secret-box[_ngcontent-%COMP%] {\n      background: var(--bg-primary); border: 1px solid var(--border);\n      border-radius: var(--radius-sm); padding: 8px 12px;\n      font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.05em;\n      word-break: break-all;\n    }\n    .code-input[_ngcontent-%COMP%] {\n      width: 160px; padding: 0.55rem 0.75rem;\n      border: 1px solid var(--border); border-radius: 6px;\n      background: var(--bg-primary); color: var(--text);\n      font-size: 1.3rem; letter-spacing: 0.25em; text-align: center;\n      font-family: var(--font-mono);\n    }\n    .code-input[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--accent); }\n    .status-row[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 12px; }\n    img[_ngcontent-%COMP%] { border-radius: 8px; background: #fff; padding: 8px; }\n\n    \n\n\n\n    .intro[_ngcontent-%COMP%] { font-size: 0.88rem; color: var(--text-muted); margin: 0 0 1rem; }\n    .field-label[_ngcontent-%COMP%] { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }\n    .field-label.wide[_ngcontent-%COMP%] { margin-bottom: 6px; }\n    .code-row[_ngcontent-%COMP%] { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }\n    .button-row[_ngcontent-%COMP%] { display: flex; gap: 10px; }\n    .alert.spaced-above[_ngcontent-%COMP%] { margin-top: 12px; }\n    .alert.spaced-below[_ngcontent-%COMP%] { margin-bottom: 12px; }\n    \n\n    .spinner.inline[_ngcontent-%COMP%] { width: 12px; height: 12px; border-width: 2px; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MfaComponent, [{
        type: Component,
        args: [{ selector: 'app-mfa', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, SettingsCardComponent, StatusPillComponent], template: `
    <app-settings-card icon="lock" [heading]="'mfa.title' | transloco" [purpose]="'mfa.subtitle' | transloco">
      @if (!loading() && state() === 'idle') {
        <app-status-pill pill [variant]="enabled() ? 'ok' : 'off'" [dot]="true">{{ enabled() ? ('mfa.status.enabled' | transloco) : ('mfa.status.disabled' | transloco) }}</app-status-pill>
      }

      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (state() === 'idle') {

        <div class="status-row">
          @if (enabled()) {
            <button class="btn btn-secondary btn-sm" (click)="startDisable()">{{ 'mfa.disableButton' | transloco }}</button>
          } @else {
            <button class="btn btn-primary btn-sm" (click)="startEnroll()">{{ 'mfa.enableButton' | transloco }}</button>
          }
        </div>

      } @else if (state() === 'enrolling') {

        <p class="intro">
          {{ 'mfa.enroll.instructions' | transloco }}
        </p>
        <div class="qr-wrap">
          @if (qrUrl()) {
            <img [src]="qrUrl()" [attr.alt]="'mfa.enroll.qrAlt' | transloco" width="200" height="200" />
          }
          <div>
            <div class="field-label">{{ 'mfa.enroll.manualKey' | transloco }}</div>
            <div class="secret-box">{{ secret() }}</div>
          </div>
          <div>
            <div class="field-label wide">{{ 'mfa.enroll.enterCode' | transloco }}</div>
            <div class="code-row">
              <input class="code-input" type="text" inputmode="numeric"
                autocomplete="one-time-code" maxlength="6" [placeholder]="'mfa.enroll.codePlaceholder' | transloco"
                     [attr.aria-label]="'mfa.enroll.codeAriaLabel' | transloco"
                     [(ngModel)]="confirmCode" (keyup.enter)="confirmEnroll()" />
              <button class="btn btn-primary btn-sm" (click)="confirmEnroll()"
                      [disabled]="confirming() || confirmCode.length < 6">
                @if (confirming()) { <span class="spinner inline"></span> }
                {{ 'mfa.enroll.confirmButton' | transloco }}
              </button>
              <button class="btn btn-secondary btn-sm" (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
            </div>
          </div>
        </div>
        @if (enrollError()) {
          <div class="alert alert-error spaced-above">{{ enrollError() }}</div>
        }

      } @else if (state() === 'disabling') {

        <div class="alert alert-error spaced-below">
          {{ 'mfa.disable.warning' | transloco }}
        </div>
        <div class="button-row">
          <button class="btn btn-secondary btn-sm" (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
          <!-- btn-secondary, not btn-primary: the primary fill is the accent green and it was winning
               over the danger class, so the button that permanently deletes the TOTP secret rendered as
               the affirmative. Only visible in a screenshot; no test could see it. -->
          <button class="btn btn-secondary btn-sm danger" (click)="confirmDisable()" [disabled]="disabling()">
            @if (disabling()) { <span class="spinner inline"></span> }
            {{ 'mfa.disable.confirmButton' | transloco }}
          </button>
        </div>

      }

      @if (successMsg()) {
        <div class="alert alert-success spaced-above">{{ successMsg() }}</div>
      }
    </app-settings-card>
  `, styles: ["\n    .qr-wrap { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }\n    .secret-box {\n      background: var(--bg-primary); border: 1px solid var(--border);\n      border-radius: var(--radius-sm); padding: 8px 12px;\n      font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.05em;\n      word-break: break-all;\n    }\n    .code-input {\n      width: 160px; padding: 0.55rem 0.75rem;\n      border: 1px solid var(--border); border-radius: 6px;\n      background: var(--bg-primary); color: var(--text);\n      font-size: 1.3rem; letter-spacing: 0.25em; text-align: center;\n      font-family: var(--font-mono);\n    }\n    .code-input:focus { outline: none; border-color: var(--accent); }\n    .status-row { display: flex; align-items: center; gap: 12px; }\n    img { border-radius: 8px; background: #fff; padding: 8px; }\n\n    /* Lifted from ten inline style=\"\" attributes. The values are unchanged \u2014 this is a move, not a\n       redesign: the page is marked \"do NOT restructure\", and the point was to stop the next reader\n       diffing declarations out of the markup, not to alter what it looks like. */\n    .intro { font-size: 0.88rem; color: var(--text-muted); margin: 0 0 1rem; }\n    .field-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }\n    .field-label.wide { margin-bottom: 6px; }\n    .code-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }\n    .button-row { display: flex; gap: 10px; }\n    .alert.spaced-above { margin-top: 12px; }\n    .alert.spaced-below { margin-bottom: 12px; }\n    /* The in-button spinner: smaller than the standalone one so it fits the line box. */\n    .spinner.inline { width: 12px; height: 12px; border-width: 2px; }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(MfaComponent, { className: "MfaComponent", filePath: "app/pages/settings/mfa.component.ts", lineNumber: 124 }); })();
