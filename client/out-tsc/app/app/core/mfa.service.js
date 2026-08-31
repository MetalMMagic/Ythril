import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
/**
 * Service that mediates between the MFA HTTP interceptor (which needs to
 * ask the user for a TOTP code) and the MFA prompt modal (which renders the
 * dialog).
 *
 * The interceptor calls `prompt()` and awaits the Promise.
 * The modal calls `respond()` when the user submits or cancels.
 *
 * Session cache: after a successful MFA check the code + timestamp are cached
 * for MFA_WINDOW_MS.  Within that window the interceptor re-uses the cached
 * code, so the user is only prompted once per session window.
 */
export class MfaService {
    constructor() {
        /** Emits whenever the interceptor needs a TOTP code */
        this.challenge$ = new Subject();
        /** True while a prompt dialog is open */
        this.prompting = signal(false, ...(ngDevMode ? [{ debugName: "prompting" }] : /* istanbul ignore next */ []));
        this._cachedCode = null;
        this._cachedAt = 0;
        this.MFA_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    }
    /** Returns a cached code if it is still within the session window */
    getCached() {
        if (this._cachedCode && Date.now() - this._cachedAt < this.MFA_WINDOW_MS) {
            return this._cachedCode;
        }
        this._cachedCode = null;
        return null;
    }
    /** Store a verified code */
    cacheCode(code) {
        this._cachedCode = code;
        this._cachedAt = Date.now();
    }
    /** Invalidate the session cache (e.g. on MFA_INVALID) */
    invalidate() {
        this._cachedCode = null;
        this._cachedAt = 0;
    }
    /**
     * Ask the user for a TOTP code.
     * Returns the entered code, or null if the user cancelled.
     */
    prompt() {
        return new Promise((resolve) => {
            this.prompting.set(true);
            this.challenge$.next({ resolve });
        });
    }
    /** Called by the prompt component when the user submits or cancels */
    respond(code) {
        this.prompting.set(false);
        // The Subject already delivered the resolve fn to the interceptor;
        // that fn is called directly by MfaPromptComponent — nothing to do here.
    }
    static { this.ɵfac = function MfaService_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || MfaService)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: MfaService, factory: MfaService.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MfaService, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
