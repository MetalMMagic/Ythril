import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, OIDC_SILENT_STATE_PREFIX } from '../../core/auth.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
function OidcCallbackComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "p", 6)(3, "a", 7);
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.error());
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 2, "oidcCallback.backToLogin"));
} }
function OidcCallbackComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 4);
    i0.ɵɵelement(1, "span", 8);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 1, "oidcCallback.completingSignIn"), " ");
} }
/**
 * Handles the redirect back from the IdP after the user authenticates.
 *
 * The IdP redirects to `/oidc-callback?code=…&state=…`.  This component:
 *  1. Reads the `code` and `state` query parameters.
 *  2. Calls AuthService.exchangeOidcCode() to exchange the code for an
 *     access_token (PKCE — all server-side exchange happens at the IdP).
 *  3. Verifies the token is accepted by Ythril's own API (/api/tokens/me).
 *  4. Stores the token (via loginOidc to enable silent refresh) and navigates.
 *
 * When loaded inside a hidden iframe for silent refresh the component detects
 * the iframe context and posts the authorization code back to the parent window
 * instead of completing the full login flow.
 */
export class OidcCallbackComponent {
    constructor() {
        this.route = inject(ActivatedRoute);
        this.router = inject(Router);
        this.auth = inject(AuthService);
        this.http = inject(HttpClient);
        this.transloco = inject(TranslocoService);
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        void this.handleCallback();
    }
    async handleCallback() {
        const params = this.route.snapshot.queryParamMap;
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');
        // ── Silent refresh: running inside the hidden refresh iframe ────────────
        // AuthService.silentRefresh() creates a hidden iframe and marks its request
        // with OIDC_SILENT_STATE_PREFIX on the `state`. Recognise the silent flow by
        // that marker — NOT by merely being framed. Inferring it from framing broke
        // when the whole SPA is embedded in a portal iframe: the interactive redirect
        // callback is then also framed, but window.parent is the portal's origin, so
        // this postMessage (targeted at location.origin) is refused and sign-in hangs.
        if (state?.startsWith(OIDC_SILENT_STATE_PREFIX)) {
            window.parent.postMessage({ type: 'oidc_silent_callback', code, state, error: errorParam ?? null }, location.origin);
            return;
        }
        // ── Normal (top-level) callback ─────────────────────────────────────────
        if (errorParam) {
            this.error.set(errorDescription ?? errorParam);
            return;
        }
        if (!code || !state) {
            this.error.set(this.transloco.translate('oidcCallback.error.missingCode'));
            return;
        }
        try {
            const { accessToken, issuerUrl, clientId, scopes, idToken } = await this.auth.exchangeOidcCode(code, state);
            // Verify the token is accepted by Ythril before storing it
            await new Promise((resolve, reject) => {
                this.http
                    .get('/api/tokens/me', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                    .subscribe({ next: () => resolve(), error: reject });
            });
            // loginOidc persists the OIDC session params and schedules silent refresh
            this.auth.loginOidc(accessToken, issuerUrl, clientId, scopes, idToken);
            await this.router.navigate(['/']);
        }
        catch (err) {
            this.error.set(err instanceof Error ? err.message : 'SSO login failed. Please try again.');
        }
    }
    static { this.ɵfac = function OidcCallbackComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || OidcCallbackComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: OidcCallbackComponent, selectors: [["app-oidc-callback"]], decls: 6, vars: 2, consts: [[1, "auth-page"], [1, "auth-card"], [1, "auth-logo"], [3, "size"], [1, "auth-subtitle"], [1, "alert", "alert-error"], [2, "margin-top", "16px", "text-align", "center"], ["href", "/login?local"], [1, "spinner", 2, "width", "14px", "height", "14px", "border-width", "2px", "display", "inline-block", "margin-right", "8px"]], template: function OidcCallbackComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1)(2, "div", 2);
            i0.ɵɵelement(3, "app-brand-logo", 3);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(4, OidcCallbackComponent_Conditional_4_Template, 6, 4)(5, OidcCallbackComponent_Conditional_5_Template, 4, 3, "p", 4);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 30);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.error() ? 4 : 5);
        } }, dependencies: [CommonModule, BrandLogoComponent, TranslocoPipe], encapsulation: 2 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(OidcCallbackComponent, [{
        type: Component,
        args: [{
                selector: 'app-oidc-callback',
                standalone: true,
                imports: [CommonModule, TranslocoPipe, BrandLogoComponent],
                template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <app-brand-logo [size]="30" />
        </div>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
          <p style="margin-top: 16px; text-align: center;">
            <a href="/login?local">{{ 'oidcCallback.backToLogin' | transloco }}</a>
          </p>
        } @else {
          <p class="auth-subtitle">
            <span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-right:8px;"></span>
            {{ 'oidcCallback.completingSignIn' | transloco }}
          </p>
        }
      </div>
    </div>
  `,
            }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(OidcCallbackComponent, { className: "OidcCallbackComponent", filePath: "app/pages/oidc-callback/oidc-callback.component.ts", lineNumber: 49 }); })();
