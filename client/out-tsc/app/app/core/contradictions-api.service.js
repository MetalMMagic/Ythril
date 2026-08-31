import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Contradiction candidates: list, dismiss, re-open, resolve, and rescan. Mirrors DuplicatesApi. */
export class ContradictionsApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    /**
     * `nliConfigured` comes back with the list because an empty list has more than one meaning, and the
     * view cannot tell them apart on its own — see the note on the server route.
     */
    listContradictions(status = 'open', space) {
        const params = new URLSearchParams({ status });
        if (space)
            params.set('space', space);
        return this.http.get(`/api/contradictions?${params.toString()}`);
    }
    dismissContradiction(id) {
        return this.http.post(`/api/contradictions/${encodeURIComponent(id)}/dismiss`, {});
    }
    reopenContradiction(id) {
        return this.http.post(`/api/contradictions/${encodeURIComponent(id)}/reopen`, {});
    }
    /** Contradictions are never merged — this records HOW a human settled it. */
    resolveContradiction(id, resolution) {
        return this.http.post(`/api/contradictions/${encodeURIComponent(id)}/resolve`, { resolution });
    }
    /**
     * The reviewer picked a winner: the other record is marked superseded, and for an entity pair the server
     * draws the `supersedes` edge.
     *
     * Separate from `resolveContradiction` on purpose. The two calls hit one endpoint, but they are different
     * decisions — this one names a loser and can change the graph, and folding it into a `resolution` argument
     * would let a caller omit the winner and get a 400 that reads like a bug in the button.
     */
    keepSide(id, winner) {
        return this.http.post(`/api/contradictions/${encodeURIComponent(id)}/resolve`, { resolution: 'superseded', winner });
    }
    scanContradictions(space) {
        return this.http.post(`/api/contradictions/scan${space ? `?space=${encodeURIComponent(space)}` : ''}`, {});
    }
    static { this.ɵfac = function ContradictionsApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ContradictionsApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: ContradictionsApi, factory: ContradictionsApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ContradictionsApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
