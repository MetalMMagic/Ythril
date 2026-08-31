import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function SetupComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "strong");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "div", 7)(7, "span", 8);
    i0.ɵɵtext(8);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "button", 9);
    i0.ɵɵlistener("click", function SetupComponent_Conditional_7_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.copyToken()); });
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(13, "button", 10);
    i0.ɵɵlistener("click", function SetupComponent_Conditional_7_Template_button_click_13_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.proceed()); });
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 5, "setup.done.message"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 7, "setup.done.warning"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(ctx_r1.firstToken());
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.copied() ? i0.ɵɵpipeBind1(11, 9, "common.copied") : i0.ɵɵpipeBind1(12, 11, "common.copy"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(15, 13, "setup.done.continue"), " ");
} }
function SetupComponent_Conditional_8_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.error());
} }
function SetupComponent_Conditional_8_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 21);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "setup.form.passwordMismatch"));
} }
function SetupComponent_Conditional_8_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 23);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "setup.submitting"), " ");
} }
function SetupComponent_Conditional_8_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "setup.submit"), " ");
} }
function SetupComponent_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, SetupComponent_Conditional_8_Conditional_0_Template, 2, 1, "div", 11);
    i0.ɵɵelementStart(1, "form", 12, 0);
    i0.ɵɵlistener("ngSubmit", function SetupComponent_Conditional_8_Template_form_ngSubmit_1_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.submit()); });
    i0.ɵɵelementStart(3, "div", 13)(4, "label", 14);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "input", 15);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SetupComponent_Conditional_8_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.form.label, $event) || (ctx_r1.form.label = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(9, "div", 13)(10, "label", 16);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "input", 17);
    i0.ɵɵtwoWayListener("ngModelChange", function SetupComponent_Conditional_8_Template_input_ngModelChange_13_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.form.settingsPassword, $event) || (ctx_r1.form.settingsPassword = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "span", 18);
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(17, "div", 13)(18, "label", 19);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(21, "input", 20);
    i0.ɵɵtwoWayListener("ngModelChange", function SetupComponent_Conditional_8_Template_input_ngModelChange_21_listener($event) { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.form.confirm, $event) || (ctx_r1.form.confirm = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(22, SetupComponent_Conditional_8_Conditional_22_Template, 3, 3, "span", 21);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "button", 22);
    i0.ɵɵconditionalCreate(24, SetupComponent_Conditional_8_Conditional_24_Template, 3, 3)(25, SetupComponent_Conditional_8_Conditional_25_Template, 2, 3);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.error() ? 0 : -1);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 15, "setup.form.instanceLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.label);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(8, 17, "setup.form.instanceLabelPlaceholder"))("disabled", ctx_r1.loading());
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 19, "setup.form.settingsPassword"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.settingsPassword);
    i0.ɵɵproperty("disabled", ctx_r1.loading());
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 21, "setup.form.settingsPasswordHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 23, "setup.form.confirmPassword"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.form.confirm);
    i0.ɵɵproperty("disabled", ctx_r1.loading());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.form.confirm && ctx_r1.form.confirm !== ctx_r1.form.settingsPassword ? 22 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r1.loading() || !ctx_r1.canSubmit());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.loading() ? 24 : 25);
} }
export class SetupComponent {
    constructor() {
        this.http = inject(HttpClient);
        this.router = inject(Router);
        this.auth = inject(AuthService);
        this.transloco = inject(TranslocoService);
        this.form = { label: '', settingsPassword: '', confirm: '' };
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.done = signal(false, ...(ngDevMode ? [{ debugName: "done" }] : /* istanbul ignore next */ []));
        this.firstToken = signal('', ...(ngDevMode ? [{ debugName: "firstToken" }] : /* istanbul ignore next */ []));
        this.copied = signal(false, ...(ngDevMode ? [{ debugName: "copied" }] : /* istanbul ignore next */ []));
    }
    canSubmit() {
        return !!(this.form.label.trim() &&
            this.form.settingsPassword.length >= 8 &&
            this.form.settingsPassword === this.form.confirm);
    }
    submit() {
        if (!this.canSubmit())
            return;
        this.loading.set(true);
        this.error.set('');
        this.http
            .post('/api/setup/json', {
            label: this.form.label.trim(),
            settingsPassword: this.form.settingsPassword,
        })
            .subscribe({
            next: (res) => {
                this.loading.set(false);
                this.firstToken.set(res.plaintext);
                this.done.set(true);
            },
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.error ?? this.transloco.translate('setup.error.failed'));
            },
        });
    }
    copyToken() {
        navigator.clipboard.writeText(this.firstToken()).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }
    proceed() {
        this.auth.login(this.firstToken());
        this.router.navigate(['/']);
    }
    static { this.ɵfac = function SetupComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SetupComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SetupComponent, selectors: [["app-setup"]], decls: 9, vars: 5, consts: [["f", "ngForm"], [1, "auth-page"], [1, "auth-card", 2, "max-width", "460px"], [1, "auth-logo"], [3, "size"], [1, "auth-subtitle"], [1, "alert", "alert-success"], [1, "code-block", 2, "margin-bottom", "16px", "display", "flex", "align-items", "center", "gap", "8px"], [2, "flex", "1", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], ["type", "button", 1, "btn-ghost", "btn", "btn-sm", 3, "click"], [1, "btn-primary", "btn", 2, "width", "100%", "justify-content", "center", 3, "click"], [1, "alert", "alert-error"], [3, "ngSubmit"], [1, "field"], ["for", "label"], ["id", "label", "type", "text", "name", "label", "maxlength", "100", "required", "", 3, "ngModelChange", "ngModel", "placeholder", "disabled"], ["for", "pw"], ["id", "pw", "type", "password", "name", "pw", "autocomplete", "new-password", "minlength", "8", "required", "", 3, "ngModelChange", "ngModel", "disabled"], [1, "field-hint"], ["for", "pw2"], ["id", "pw2", "type", "password", "name", "pw2", "autocomplete", "new-password", "minlength", "8", "required", "", 3, "ngModelChange", "ngModel", "disabled"], [1, "field-hint", "error"], ["type", "submit", 1, "btn-primary", "btn", 2, "width", "100%", "justify-content", "center", 3, "disabled"], [1, "spinner", 2, "width", "14px", "height", "14px", "border-width", "2px"]], template: function SetupComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 1)(1, "div", 2)(2, "div", 3);
            i0.ɵɵelement(3, "app-brand-logo", 4);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "p", 5);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(7, SetupComponent_Conditional_7_Template, 16, 15)(8, SetupComponent_Conditional_8_Template, 26, 25);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 30);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 3, "setup.subtitle"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.done() ? 7 : 8);
        } }, dependencies: [FormsModule, i1.ɵNgNoValidate, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.NgModel, i1.NgForm, CommonModule, BrandLogoComponent, TranslocoPipe], encapsulation: 2 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SetupComponent, [{
        type: Component,
        args: [{
                selector: 'app-setup',
                standalone: true,
                imports: [FormsModule, CommonModule, TranslocoPipe, BrandLogoComponent],
                template: `
    <div class="auth-page">
      <div class="auth-card" style="max-width: 460px;">
        <div class="auth-logo">
          <app-brand-logo [size]="30" />
        </div>
        <p class="auth-subtitle">{{ 'setup.subtitle' | transloco }}</p>

        @if (done()) {
          <div class="alert alert-success">
            {{ 'setup.done.message' | transloco }}
            <strong>{{ 'setup.done.warning' | transloco }}</strong>
          </div>
          <div class="code-block" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ firstToken() }}</span>
            <button class="btn-ghost btn btn-sm" type="button" (click)="copyToken()">
              {{ copied() ? ('common.copied' | transloco) : ('common.copy' | transloco) }}
            </button>
          </div>
          <button class="btn-primary btn" style="width:100%; justify-content:center;" (click)="proceed()">
            {{ 'setup.done.continue' | transloco }}
          </button>
        } @else {

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <form (ngSubmit)="submit()" #f="ngForm">
            <div class="field">
              <label for="label">{{ 'setup.form.instanceLabel' | transloco }}</label>
              <input
                id="label"
                type="text"
                name="label"
                [(ngModel)]="form.label"
                [placeholder]="'setup.form.instanceLabelPlaceholder' | transloco"
                maxlength="100"
                required
                [disabled]="loading()"
              />
            </div>

            <div class="field">
              <label for="pw">{{ 'setup.form.settingsPassword' | transloco }}</label>
              <input
                id="pw"
                type="password"
                name="pw"
                [(ngModel)]="form.settingsPassword"
                autocomplete="new-password"
                minlength="8"
                required
                [disabled]="loading()"
              />
              <span class="field-hint">{{ 'setup.form.settingsPasswordHint' | transloco }}</span>
            </div>

            <div class="field">
              <label for="pw2">{{ 'setup.form.confirmPassword' | transloco }}</label>
              <input
                id="pw2"
                type="password"
                name="pw2"
                [(ngModel)]="form.confirm"
                autocomplete="new-password"
                minlength="8"
                required
                [disabled]="loading()"
              />
              @if (form.confirm && form.confirm !== form.settingsPassword) {
                <span class="field-hint error">{{ 'setup.form.passwordMismatch' | transloco }}</span>
              }
            </div>

            <button
              type="submit"
              class="btn-primary btn"
              style="width:100%; justify-content:center;"
              [disabled]="loading() || !canSubmit()"
            >
              @if (loading()) {
                <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                {{ 'setup.submitting' | transloco }}
              } @else {
                {{ 'setup.submit' | transloco }}
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
            }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SetupComponent, { className: "SetupComponent", filePath: "app/pages/setup/setup.component.ts", lineNumber: 108 }); })();
