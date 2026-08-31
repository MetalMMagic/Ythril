import { Injectable, signal } from '@angular/core';
import * as i0 from "@angular/core";
const TRUTHY = new Set(['1', 'true', 'yes']);
/** Read `?embedded=1` from the current URL. */
function readEmbeddedFlag() {
    try {
        const raw = new URLSearchParams(window.location.search).get('embedded');
        return raw !== null && TRUTHY.has(raw.toLowerCase());
    }
    catch {
        return false; // non-browser / malformed URL — default to the normal shell
    }
}
/**
 * EmbedService — "chrome-less" mode for portal-style embedding.
 *
 * When Ythril is embedded as an iframe inside a host portal, the shell topbar
 * (logo + Sign out) duplicates the host's own chrome, and the in-frame Sign out is
 * actively misleading: it ends only the Ythril session, not the portal's.
 *
 * Passing `?embedded=1` on the app URL hides the topbar. Navigation is unaffected —
 * it lives in the sidebar, not the topbar.
 *
 * The flag is read ONCE at construction and cached, because Angular's router drops
 * unknown query params on navigation; re-reading `location.search` later would flip
 * the app back out of embedded mode on the first route change.
 */
export class EmbedService {
    constructor() {
        this._embedded = signal(readEmbeddedFlag(), ...(ngDevMode ? [{ debugName: "_embedded" }] : /* istanbul ignore next */ []));
        /** True when the app was loaded with `?embedded=1` — host chrome should be hidden. */
        this.embedded = this._embedded.asReadonly();
    }
    static { this.ɵfac = function EmbedService_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || EmbedService)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: EmbedService, factory: EmbedService.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EmbedService, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
