import { Injectable, signal } from '@angular/core';
import * as i0 from "@angular/core";
/**
 * Singleton interaction state shared by every record tab (memories/entities/edges/chrono/filemeta).
 *
 * Extracted from BrainComponent (A17.9b-6c) as the keystone before the tabs become their own
 * components. These signals are singleton by nature — only one record is being loaded, inline-edited,
 * or delete-confirmed at a time — so a single shared instance is faithful to today's behaviour and
 * lets the shell's unified loading overlay and each future tab component read the same state without
 * duplication. The per-tab FILTERS and pagination (`recordFilter`, `filterEntity`, `skip*`) are NOT
 * here — those are genuinely per-tab and move to each tab component as it is extracted.
 *
 * Provided by BrainComponent (not root): one instance per mounted page.
 */
export class RecordListState {
    constructor() {
        /** True while the active tab's list is loading (drives the shell's content overlay). */
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Failure reason for the active tab's last load; null when it succeeded (or hasn't run). */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        /** The `_id` of the row being inline-edited (empty = none). */
        this.editingId = signal('', ...(ngDevMode ? [{ debugName: "editingId" }] : /* istanbul ignore next */ []));
        this.editSaving = signal(false, ...(ngDevMode ? [{ debugName: "editSaving" }] : /* istanbul ignore next */ []));
        this.editError = signal('', ...(ngDevMode ? [{ debugName: "editError" }] : /* istanbul ignore next */ []));
        /** The `_id` of the row whose delete is awaiting confirmation (empty = none). */
        this.confirmDeleteId = signal('', ...(ngDevMode ? [{ debugName: "confirmDeleteId" }] : /* istanbul ignore next */ []));
    }
    cancelEdit() {
        this.editingId.set('');
        this.editError.set('');
    }
    static { this.ɵfac = function RecordListState_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RecordListState)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: RecordListState, factory: RecordListState.ɵfac }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RecordListState, [{
        type: Injectable
    }], null, null); })();
