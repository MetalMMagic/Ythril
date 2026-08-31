import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Auth, first-run setup, personal access tokens, and MFA. */
export class AuthApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    // ── Auth ──────────────────────────────────────────────────────────────────
    /**
     * Verify the supplied PAT is valid and return its metadata.
     *
     * `rights` is declared because the route has always RETURNED it — `/api/tokens/me` responds with the whole
     * record minus its hash. Typed as `{ id, name, spaces? }`, the matrix was discarded on arrival, so nothing
     * could show a caller the rights they hold. That is the same shape as three other gaps closed this week: the
     * capability exists on the API and the client's own type is what withholds it.
     */
    verifyToken() {
        return this.http.get('/api/tokens/me');
    }
    // ── Setup ─────────────────────────────────────────────────────────────────
    getSetupStatus() {
        return this.http.get('/api/setup/status');
    }
    completeSetup(body) {
        return this.http.post('/api/setup', body);
    }
    // ── Tokens ────────────────────────────────────────────────────────────────
    getMe() {
        return this.http.get('/api/tokens/me');
    }
    listTokens() {
        return this.http.get('/api/tokens');
    }
    createToken(body) {
        return this.http.post('/api/tokens', body);
    }
    regenerateToken(id) {
        return this.http.post(`/api/tokens/${id}/regenerate`, {});
    }
    /**
     * Replace a token's rights matrix.
     *
     * Separate call from `renameToken` rather than one method with two optional fields: the server guards them
     * differently — a rights edit is capped at the caller's own and refused outright if it would raise the
     * caller's floor — and a single method would let a caller believe it renamed while it changed permissions.
     */
    setTokenRights(id, rights) {
        return this.http.patch(`/api/tokens/${id}`, { rights });
    }
    /**
     * Edit a token's label and rights in ONE request.
     *
     * The route has always taken both; the UI sent them separately, and only ever sent `rights` — so a token's
     * name was write-once in practice. Two requests would also mean a rename that lands while the rights change
     * 403s on the mint cap, leaving the operator with half of what they asked for and one audit entry for it.
     */
    updateToken(id, patch, totpCode) {
        // Granting an MFA exemption costs a live TOTP code on this request, even from a token that is itself
        // exempt — otherwise one exemption grants the next. The header goes only when there is a code to send:
        // an empty one turns the server's "you need a code" into "your code is wrong".
        return this.http.patch(`/api/tokens/${id}`, patch, totpCode ? { headers: { 'x-totp-code': totpCode } } : {});
    }
    renameToken(id, name) {
        return this.http.patch(`/api/tokens/${id}`, { name });
    }
    revokeToken(id) {
        return this.http.delete(`/api/tokens/${id}`);
    }
    // ── MFA ───────────────────────────────────────────────────────────────────
    getMfaStatus() {
        return this.http.get('/api/mfa/status');
    }
    setupMfa() {
        return this.http.post('/api/mfa/setup', {});
    }
    verifyMfaCode(code) {
        return this.http.post('/api/mfa/verify', { code });
    }
    disableMfa() {
        return this.http.delete('/api/mfa');
    }
    static { this.ɵfac = function AuthApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || AuthApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: AuthApi, factory: AuthApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AuthApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
