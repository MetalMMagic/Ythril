import { Injectable, inject, signal, computed } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import * as i0 from "@angular/core";
/**
 * Owns the spaces page's SERVER DATA — the space list, the networks, and every mutation of them.
 *
 * Split from SpaceSettingsState on purpose (A17.8b): the two are different kinds of state with
 * different lifetimes. This is data fetched from the server and shared by the list and every dialog;
 * SpaceSettingsState is ephemeral form state that dies when the dialog closes. Tangling them is what
 * forced the old component to own both.
 *
 * Because it is a service, the dialogs and tabs mutate the list by calling it — no `@Output()`
 * plumbing back to a parent, and no component owning data that outlives it. Provided by
 * SpacesComponent (not root), so the lifetime matches the page.
 *
 * VIEW state (search text, sort mode) deliberately does NOT live here — that belongs to the
 * component rendering the list, not to the data.
 */
export class SpacesStore {
    constructor() {
        this.spacesApi = inject(SpacesApi);
        this.networksApi = inject(NetworksApi);
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.networks = signal([], ...(ngDevMode ? [{ debugName: "networks" }] : /* istanbul ignore next */ []));
        /** Instance document-extraction ceiling — the highest mode a space may pick. Drives the per-space
         *  extraction dropdown so it never offers a level the runtime would cap. 'auto' = no policy limit. */
        this.docExtractionCeiling = signal('auto', ...(ngDevMode ? [{ debugName: "docExtractionCeiling" }] : /* istanbul ignore next */ []));
        /** Instance per-class media-analysis ceilings — the highest level a space may pick for each class.
         *  Drives the per-space media pickers so they never offer a level the runtime would cap. 'auto' = no
         *  policy limit (the default when the server omits the field). */
        this.mediaCeilings = signal({
            image: 'auto', audio: 'auto', video: 'auto', text: 'auto',
        }, ...(ngDevMode ? [{ debugName: "mediaCeilings" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Set when the spaces list fails to load, so the page can show an error state rather than a bare empty list. */
        this.error = signal(false, ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /**
         * spaceId -> the networks that space belongs to.
         *
         * The list template needs this per row. It used to call `networks().filter(...)` inline — twice
         * per row (once for `.length`, once for the `@for`) — so rendering N rows did 2N full scans of the
         * network list on every change-detection pass, allocating a fresh array each time (which also
         * defeats `@for` tracking, since the identity changed on every pass). This computes the index once
         * per networks() change instead: O(1) lookup per row, and a stable array identity.
         */
        this.networksBySpace = computed(() => {
            const index = new Map();
            for (const n of this.networks()) {
                for (const spaceId of n.spaces) {
                    const list = index.get(spaceId);
                    if (list)
                        list.push(n);
                    else
                        index.set(spaceId, [n]);
                }
            }
            return index;
        }, ...(ngDevMode ? [{ debugName: "networksBySpace" }] : /* istanbul ignore next */ []));
    }
    /** Networks the given space belongs to. Empty array shared across misses — do not mutate it. */
    static { this.NO_NETWORKS = []; }
    networksForSpace(spaceId) {
        return this.networksBySpace().get(spaceId) ?? SpacesStore.NO_NETWORKS;
    }
    load() {
        this.loading.set(true);
        this.error.set(false);
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces, docExtractionCeiling, mediaCeilings }) => {
                this.spaces.set(spaces);
                if (docExtractionCeiling)
                    this.docExtractionCeiling.set(docExtractionCeiling);
                if (mediaCeilings)
                    this.mediaCeilings.set(mediaCeilings);
                this.loading.set(false);
            },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
        this.networksApi.listNetworks().subscribe({
            next: ({ networks }) => this.networks.set(networks),
            error: () => { },
        });
    }
    refreshNetworks() {
        this.networksApi.listNetworks().subscribe({
            next: ({ networks }) => this.networks.set(networks),
            error: () => { },
        });
    }
    /** Merge a server-returned space back into the list (after a settings save). */
    applySpace(space) {
        this.spaces.update(list => list.map(s => s.id === space.id ? { ...s, ...space } : s));
    }
    /** Reorder optimistically, then persist; on failure fall back to a full reload. */
    reorder(previousIndex, currentIndex) {
        if (previousIndex === currentIndex)
            return;
        const list = [...this.spaces()];
        moveItemInArray(list, previousIndex, currentIndex);
        this.spaces.set(list);
        this.spacesApi.reorderSpaces(list.map(s => s.id)).subscribe({
            next: ({ spaces }) => { this.spaces.set(spaces); },
            error: () => this.load(),
        });
    }
    /**
     * Poll until no space reports `indexStatus: 'building'`.
     *
     * A newly created space returns immediately with its Atlas vector indexes still building; recall
     * stays empty until they are ready. Capped at ~2 min.
     */
    pollIndexStatus(attempt = 0) {
        if (attempt > 40)
            return; // ~2 min cap
        setTimeout(() => {
            this.spacesApi.listSpaces().subscribe({
                next: ({ spaces }) => {
                    this.spaces.set(spaces);
                    if (spaces.some(s => s.indexStatus === 'building'))
                        this.pollIndexStatus(attempt + 1);
                },
                error: () => { },
            });
        }, 3000);
    }
    static { this.ɵfac = function SpacesStore_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpacesStore)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: SpacesStore, factory: SpacesStore.ɵfac }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpacesStore, [{
        type: Injectable
    }], null, null); })();
