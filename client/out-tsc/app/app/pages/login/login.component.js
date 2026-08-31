import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = () => ({ local: true });
function LoginComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 5);
    i0.ɵɵelement(1, "span", 6);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "p", 7)(5, "a", 8);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 3, "login.ssoRedirecting"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("queryParams", i0.ɵɵpureFunction0(7, _c0));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 5, "login.useTokenInstead"));
} }
function LoginComponent_Conditional_5_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 9);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "login.sessionExpired"), " ");
} }
function LoginComponent_Conditional_5_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.error());
} }
function LoginComponent_Conditional_5_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 18);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "login.verifying"), " ");
} }
function LoginComponent_Conditional_5_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "login.signIn"), " ");
} }
function LoginComponent_Conditional_5_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 19)(1, "span");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(4, "button", 20);
    i0.ɵɵlistener("click", function LoginComponent_Conditional_5_Conditional_19_Template_button_click_4_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.loginWithOidc()); });
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 3, "login.orDivider"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.loading());
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(6, 5, "login.signInWithSso"), " ");
} }
function LoginComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "p", 5);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, LoginComponent_Conditional_5_Conditional_3_Template, 3, 3, "div", 9);
    i0.ɵɵconditionalCreate(4, LoginComponent_Conditional_5_Conditional_4_Template, 2, 1, "div", 10);
    i0.ɵɵelementStart(5, "form", 11, 0);
    i0.ɵɵlistener("ngSubmit", function LoginComponent_Conditional_5_Template_form_ngSubmit_5_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.login()); });
    i0.ɵɵelementStart(7, "div", 12)(8, "label", 13);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "input", 14);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function LoginComponent_Conditional_5_Template_input_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.tokenInput, $event) || (ctx_r1.tokenInput = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "span", 15);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(16, "button", 16);
    i0.ɵɵconditionalCreate(17, LoginComponent_Conditional_5_Conditional_17_Template, 3, 3)(18, LoginComponent_Conditional_5_Conditional_18_Template, 2, 3);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(19, LoginComponent_Conditional_5_Conditional_19_Template, 7, 7);
    i0.ɵɵelementStart(20, "p", 7);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementStart(23, "a", 17);
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_12_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 13, "login.subtitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.reason() === "session_expired" ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.error() ? 4 : -1);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 15, "login.tokenLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.tokenInput);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(12, 17, "login.tokenPlaceholder"))("disabled", ctx_r1.loading());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(15, 19, "login.tokenHint"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.loading() || !ctx_r1.tokenInput);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.loading() ? 17 : 18);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(((tmp_12_0 = ctx_r1.oidcInfo()) == null ? null : tmp_12_0.enabled) ? 19 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(22, 21, "login.noToken"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 23, "login.runSetup"));
} }
export class LoginComponent {
    constructor() {
        this.auth = inject(AuthService);
        this.router = inject(Router);
        this.route = inject(ActivatedRoute);
        this.http = inject(HttpClient);
        this.transloco = inject(TranslocoService);
        this.tokenInput = '';
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        this.reason = signal(this.route.snapshot.queryParamMap.get('reason') ?? '', ...(ngDevMode ? [{ debugName: "reason" }] : /* istanbul ignore next */ []));
        this.oidcInfo = signal(null, ...(ngDevMode ? [{ debugName: "oidcInfo" }] : /* istanbul ignore next */ []));
        this.ssoRedirecting = signal(false, ...(ngDevMode ? [{ debugName: "ssoRedirecting" }] : /* istanbul ignore next */ []));
        /** True when ?local is present — bypasses SSO auto-redirect. */
        this.localLogin = this.route.snapshot.queryParamMap.has('local');
    }
    ngOnInit() {
        this.auth.getOidcInfo().then(info => {
            this.oidcInfo.set(info);
            // Auto-redirect to SSO when OIDC is enabled and the user didn't
            // explicitly request the local token form (?local).
            if (info.enabled && !this.localLogin) {
                this.ssoRedirecting.set(true);
                void this.loginWithOidc();
            }
        });
    }
    login() {
        if (!this.tokenInput.trim())
            return;
        this.loading.set(true);
        this.error.set('');
        // Verify the supplied token by calling /api/tokens/me
        this.http
            .get('/api/tokens/me', {
            headers: { Authorization: `Bearer ${this.tokenInput.trim()}` },
        })
            .subscribe({
            next: () => {
                this.auth.login(this.tokenInput.trim());
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.loading.set(false);
                if (err.status === 401) {
                    this.error.set(this.transloco.translate('login.error.invalidToken'));
                }
                else {
                    this.error.set(this.transloco.translate('login.error.serverUnreachable'));
                }
            },
        });
    }
    async loginWithOidc() {
        const info = this.oidcInfo();
        if (!info?.enabled)
            return;
        this.loading.set(true);
        this.error.set('');
        try {
            await this.auth.startOidcLogin(info);
            // Browser will redirect to IdP — no further action needed here
        }
        catch (err) {
            this.loading.set(false);
            this.ssoRedirecting.set(false);
            this.error.set(err instanceof Error ? err.message : this.transloco.translate('login.error.ssoFailed'));
        }
    }
    static { this.ɵfac = function LoginComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || LoginComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: LoginComponent, selectors: [["app-login"]], decls: 6, vars: 2, consts: [["f", "ngForm"], [1, "auth-page"], [1, "auth-card"], [1, "auth-logo"], [3, "size"], [1, "auth-subtitle"], [1, "spinner", 2, "width", "14px", "height", "14px", "border-width", "2px", "display", "inline-block", "margin-right", "8px"], [2, "margin-top", "20px", "font-size", "12px", "color", "var(--text-muted)", "text-align", "center"], ["routerLink", "/login", 3, "queryParams"], [1, "alert", "alert-warning", 2, "margin-bottom", "20px"], [1, "alert", "alert-error"], [3, "ngSubmit"], [1, "field"], ["for", "token"], ["id", "token", "type", "password", "name", "token", "autocomplete", "current-password", "required", "", 3, "ngModelChange", "ngModel", "placeholder", "disabled"], [1, "field-hint"], ["type", "submit", 1, "btn-primary", "btn", 2, "width", "100%", "justify-content", "center", "margin-top", "4px", 3, "disabled"], ["routerLink", "/setup"], [1, "spinner", 2, "width", "14px", "height", "14px", "border-width", "2px"], [1, "auth-divider"], ["type", "button", 1, "btn", "btn-secondary", 2, "width", "100%", "justify-content", "center", 3, "click", "disabled"]], template: function LoginComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 1)(1, "div", 2)(2, "div", 3);
            i0.ɵɵelement(3, "app-brand-logo", 4);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(4, LoginComponent_Conditional_4_Template, 8, 8)(5, LoginComponent_Conditional_5_Template, 26, 25);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 30);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.ssoRedirecting() ? 4 : 5);
        } }, dependencies: [FormsModule, i1.ɵNgNoValidate, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.NgModel, i1.NgForm, CommonModule, RouterLink, BrandLogoComponent, TranslocoPipe], styles: [".auth-divider[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      text-align: center;\n      margin: 16px 0;\n      color: var(--text-muted);\n      font-size: 12px;\n    }\n    .auth-divider[_ngcontent-%COMP%]::before, \n   .auth-divider[_ngcontent-%COMP%]::after {\n      content: '';\n      flex: 1;\n      border-bottom: 1px solid var(--border);\n    }\n    .auth-divider[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n      padding: 0 8px;\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(LoginComponent, [{
        type: Component,
        args: [{ selector: 'app-login', standalone: true, imports: [FormsModule, CommonModule, RouterLink, TranslocoPipe, BrandLogoComponent], template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <app-brand-logo [size]="30" />
        </div>

        @if (ssoRedirecting()) {
          <p class="auth-subtitle">
            <span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-right:8px;"></span>
            {{ 'login.ssoRedirecting' | transloco }}
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: var(--text-muted); text-align: center;">
            <a routerLink="/login" [queryParams]="{ local: true }">{{ 'login.useTokenInstead' | transloco }}</a>
          </p>
        } @else {
          <p class="auth-subtitle">{{ 'login.subtitle' | transloco }}</p>

          @if (reason() === 'session_expired') {
            <div class="alert alert-warning" style="margin-bottom: 20px;">
              {{ 'login.sessionExpired' | transloco }}
            </div>
          }

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <form (ngSubmit)="login()" #f="ngForm">
            <div class="field">
              <label for="token">{{ 'login.tokenLabel' | transloco }}</label>
              <input
                id="token"
                type="password"
                name="token"
                [(ngModel)]="tokenInput"
                [placeholder]="'login.tokenPlaceholder' | transloco"
                autocomplete="current-password"
                required
                [disabled]="loading()"
              />
              <span class="field-hint">
                {{ 'login.tokenHint' | transloco }}
              </span>
            </div>

            <button
              type="submit"
              class="btn-primary btn"
              style="width: 100%; justify-content: center; margin-top: 4px;"
              [disabled]="loading() || !tokenInput"
            >
              @if (loading()) {
                <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                {{ 'login.verifying' | transloco }}
              } @else {
                {{ 'login.signIn' | transloco }}
              }
            </button>
          </form>

          @if (oidcInfo()?.enabled) {
            <div class="auth-divider">
              <span>{{ 'login.orDivider' | transloco }}</span>
            </div>

            <button
              type="button"
              class="btn btn-secondary"
              style="width: 100%; justify-content: center;"
              [disabled]="loading()"
              (click)="loginWithOidc()"
            >
              {{ 'login.signInWithSso' | transloco }}
            </button>
          }

          <p style="margin-top: 20px; font-size: 12px; color: var(--text-muted); text-align: center;">
            {{ 'login.noToken' | transloco }}
            <a routerLink="/setup">{{ 'login.runSetup' | transloco }}</a>
          </p>
        }
      </div>
    </div>
  `, styles: ["\n    .auth-divider {\n      display: flex;\n      align-items: center;\n      text-align: center;\n      margin: 16px 0;\n      color: var(--text-muted);\n      font-size: 12px;\n    }\n    .auth-divider::before,\n    .auth-divider::after {\n      content: '';\n      flex: 1;\n      border-bottom: 1px solid var(--border);\n    }\n    .auth-divider span {\n      padding: 0 8px;\n    }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(LoginComponent, { className: "LoginComponent", filePath: "app/pages/login/login.component.ts", lineNumber: 120 }); })();
