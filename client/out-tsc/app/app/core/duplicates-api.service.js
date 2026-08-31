import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Near-duplicate brain-record candidates: list, dismiss, re-rate, merge, and rescan. */
export class DuplicatesApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    listDuplicates(status = 'open', space) {
        const params = new URLSearchParams({ status });
        if (space)
            params.set('space', space);
        return this.http.get(`/api/duplicates?${params.toString()}`);
    }
    dismissDuplicate(id) {
        return this.http.post(`/api/duplicates/${encodeURIComponent(id)}/dismiss`, {});
    }
    /** Re-rate a dismissed pair back onto the open review list (the counterpart to dismiss). */
    reopenDuplicate(id) {
        return this.http.post(`/api/duplicates/${encodeURIComponent(id)}/reopen`, {});
    }
    mergeDuplicate(id) {
        return this.http.post(`/api/duplicates/${encodeURIComponent(id)}/merge`, {});
    }
    scanDuplicates(space) {
        return this.http.post(`/api/duplicates/scan${space ? `?space=${encodeURIComponent(space)}` : ''}`, {});
    }
    static { this.ɵfac = function DuplicatesApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || DuplicatesApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: DuplicatesApi, factory: DuplicatesApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(DuplicatesApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
