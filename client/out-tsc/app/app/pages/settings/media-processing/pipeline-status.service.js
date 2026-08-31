/**
 * One fetch of `GET /api/admin/pipeline-status` (#360), shared by the Pipelines and Tools tabs.
 *
 * Deliberately a service rather than a fetch per tab: the payload feeds a health dot on every step of
 * four pipelines plus the whole of the Tools tab, and the owner's spec is explicit that clicking
 * between tabs must not re-probe. The server caches for 20s and single-flights, so a second request
 * would be cheap — but it would still be a request per tab switch per admin, and the endpoints being
 * probed are the same processes doing the real work.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
export class PipelineStatusService {
    constructor() {
        this.http = inject(HttpClient);
        this.status = signal(null, ...(ngDevMode ? [{ debugName: "status" }] : /* istanbul ignore next */ []));
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal(null, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /** Indexed by stage key, so a step can ask for its own dot without scanning the array each pass. */
        this.byModelKey = computed(() => {
            const map = new Map();
            for (const m of this.status()?.models ?? [])
                map.set(m.key, m);
            return map;
        }, ...(ngDevMode ? [{ debugName: "byModelKey" }] : /* istanbul ignore next */ []));
        this.bySidecarKey = computed(() => {
            const map = new Map();
            for (const s of this.status()?.sidecars ?? [])
                map.set(s.key, s);
            return map;
        }, ...(ngDevMode ? [{ debugName: "bySidecarKey" }] : /* istanbul ignore next */ []));
        /** Spaces whose stored index status disagrees with the database — the reason this endpoint exists. */
        this.driftedSpaces = computed(() => (this.status()?.index.spaces ?? []).filter(s => s.drifted), ...(ngDevMode ? [{ debugName: "driftedSpaces" }] : /* istanbul ignore next */ []));
    }
    load() {
        this.loading.set(true);
        this.error.set(null);
        this.http.get('/api/admin/pipeline-status').subscribe({
            next: s => { this.status.set(s); this.loading.set(false); },
            // A failed status fetch must not read as "everything is off". The dots fall back to `unknown`
            // and the tab says why — reporting a probe failure as a component failure would be the same
            // dishonesty this screen exists to end.
            error: err => { this.error.set(err?.error?.error ?? err?.message ?? 'Could not read pipeline status'); this.loading.set(false); },
        });
    }
    /** The state for a model-backed step, or null when the status is not loaded (drawn as unknown). */
    modelState(key) { return this.byModelKey().get(key)?.state ?? null; }
    sidecarState(key) { return this.bySidecarKey().get(key)?.state ?? null; }
    static { this.ɵfac = function PipelineStatusService_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PipelineStatusService)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: PipelineStatusService, factory: PipelineStatusService.ɵfac }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PipelineStatusService, [{
        type: Injectable
    }], null, null); })();
