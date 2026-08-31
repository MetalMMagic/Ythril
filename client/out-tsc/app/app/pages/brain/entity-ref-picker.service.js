import { Injectable, inject, signal } from '@angular/core';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import * as i0 from "@angular/core";
/**
 * The brain page's shared entity/memory/chrono reference picker.
 *
 * Extracted from BrainComponent (A17.9b). Shared name/title caches plus the inline entity / memory /
 * chrono pickers serve every form on the page. Previously they were wired by a string-keyed god-switch
 * — `pickEntity(ent, mode, field)` branched on a field key like `'drawer-memory-entityIds'` and reached
 * directly into the matching form object. This service replaces that switch with a target-based API:
 * the caller passes its OWN form ref, exactly as `removeEntityId(target, id)` already did. That is the
 * seam that lets the drawer and the tab views become their own components (A17.9b-4/5), each holding
 * its own edit models and calling this picker. (The old click-to-open flyout that once fronted these
 * pickers was retired in slice 4d, when file-meta — its last user — moved to the inline ref-fields.)
 *
 * Behaviour preserved verbatim (pinned by the A17.9b-2 characterization tests): picking an entity
 * updates the name cache and appends the id to the target's `entityIds`; edge endpoints (from/to) are
 * NOT handled here — they set display fields without touching the cache, and stay on the shell with
 * `edgeForm`. Name resolution only runs for the *uncached* ids of a field.
 *
 * `spaceId` is fed by the shell (its `activeSpaceId` is navigation state); the picker never owns it.
 *
 * Provided by BrainComponent (not root): one instance per mounted page.
 */
export class EntityRefPicker {
    constructor() {
        this.brainApi = inject(BrainApi);
        this.store = inject(BrainStore);
        /** Active brain space. Kept in sync by the shell, whose `activeSpaceId` is nav state. */
        this.spaceId = signal('', ...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
        // ── Entity picker ────────────────────────────────────────────────────────
        this.entityNameCache = signal({}, ...(ngDevMode ? [{ debugName: "entityNameCache" }] : /* istanbul ignore next */ []));
        // ── Inline memory picker (slice 3c "memoryIds searchable like entity") ───────────────────────
        //
        // Backs app-memory-ref-field: an INLINE search + a title cache so chips show the memory's fact, not a
        // truncated id. Server-searched via listMemories(?search=). Used by the chrono create form, the
        // drawer's chrono edit, and (since slice 4d) the file-meta edit form — only ever one open at a time.
        this.memPickQuery = signal('', ...(ngDevMode ? [{ debugName: "memPickQuery" }] : /* istanbul ignore next */ []));
        this.memPickResults = signal([], ...(ngDevMode ? [{ debugName: "memPickResults" }] : /* istanbul ignore next */ []));
        this._memPickTimer = null;
        /** Memory id → full fact, for chip display (fed on pick and by `resolveMemoryTitles`). */
        this.memoryTitleCache = signal({}, ...(ngDevMode ? [{ debugName: "memoryTitleCache" }] : /* istanbul ignore next */ []));
        // ── Inline chrono picker (file-meta; slice 4d "chronoIds searchable like memories") ──────────
        //
        // Sibling of the memory picker above, backing app-chrono-ref-field. Replaces the old file-meta `fm*`
        // chrono flyout; a title cache lets chips show the entry's title (not a truncated id) and search is
        // server-side via listChrono(?search=), matching the memory picker rather than the old client filter.
        this.chronoPickQuery = signal('', ...(ngDevMode ? [{ debugName: "chronoPickQuery" }] : /* istanbul ignore next */ []));
        this.chronoPickResults = signal([], ...(ngDevMode ? [{ debugName: "chronoPickResults" }] : /* istanbul ignore next */ []));
        this._chronoPickTimer = null;
        /** Chrono id → title, for chip display (fed on pick and by `resolveChronoTitles`). */
        this.chronoTitleCache = signal({}, ...(ngDevMode ? [{ debugName: "chronoTitleCache" }] : /* istanbul ignore next */ []));
    }
    removeEntityId(target, id) {
        const parts = target.entityIds.split(',').map(s => s.trim()).filter(s => s && s !== id);
        target.entityIds = parts.join(', ');
    }
    entityChips(ids) {
        const cache = this.entityNameCache();
        return ids.split(',').map(s => s.trim()).filter(Boolean)
            .map(id => ({ id, name: cache[id] ?? id }));
    }
    /** Append the picked entity to a chip field and remember its name for display. */
    pickEntity(ent, target) {
        this.entityNameCache.update(c => ({ ...c, [ent._id]: ent.name }));
        target.entityIds = this.appendEntityId(target.entityIds, ent._id);
    }
    /** Bulk-resolve entity names into the cache (used when opening a record for editing). */
    resolveEntityNames(ids) {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        const unknown = ids.filter(id => !this.entityNameCache()[id]);
        if (!unknown.length)
            return;
        this.brainApi.getEntitiesByIds(spaceId, unknown).subscribe({
            next: ({ entities }) => {
                const patch = {};
                for (const e of entities)
                    patch[e._id] = e.name;
                this.entityNameCache.update(c => ({ ...c, ...patch }));
            },
            error: () => { },
        });
    }
    /** Resolve the uncached ids of a comma-separated field (chip display). */
    resolveEntityNamesFor(idsCsv) {
        this.resolveEntityNames(idsCsv.split(',').map(s => s.trim()).filter(Boolean));
    }
    appendEntityId(current, id) {
        const parts = current.split(',').map(s => s.trim()).filter(Boolean);
        if (!parts.includes(id))
            parts.push(id);
        return parts.join(', ');
    }
    onMemPickInput(q) {
        this.memPickQuery.set(q);
        if (this._memPickTimer)
            clearTimeout(this._memPickTimer);
        if (!q.trim()) {
            this.memPickResults.set([]);
            return;
        }
        this._memPickTimer = setTimeout(() => {
            this.brainApi.listMemories(this.spaceId(), 8, 0, {}, undefined, q).subscribe({
                next: ({ memories }) => this.memPickResults.set(memories.slice(0, 6)),
                error: () => { },
            });
        }, 300);
    }
    /** Cache the picked memory's fact for chip display, append its id to the form, and clear the search. */
    addMemoryRef(form, mem) {
        this.memoryTitleCache.update(c => ({ ...c, [mem._id]: mem.fact }));
        if (!form.memoryIds.includes(mem._id))
            form.memoryIds.push(mem._id);
        this.memPickQuery.set('');
        this.memPickResults.set([]);
    }
    removeMemoryRef(form, id) {
        form.memoryIds = form.memoryIds.filter(m => m !== id);
    }
    /** Chip label for a linked memory: cached fact → loaded list → truncated id, trimmed for display. */
    memoryRefTitle(id) {
        const full = this.memoryTitleCache()[id] ?? this.store.memories().find(m => m._id === id)?.fact;
        return full ? full.slice(0, 40) + (full.length > 40 ? '…' : '') : id.slice(0, 8) + '…';
    }
    /** Resolve the uncached facts of a memoryIds list (opening a record for editing). Small N → per-id. */
    resolveMemoryTitles(ids) {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        for (const id of ids.filter(i => !this.memoryTitleCache()[i])) {
            this.brainApi.getMemory(spaceId, id).subscribe({
                next: (m) => this.memoryTitleCache.update(c => ({ ...c, [m._id]: m.fact })),
                error: () => { },
            });
        }
    }
    onChronoPickInput(q) {
        this.chronoPickQuery.set(q);
        if (this._chronoPickTimer)
            clearTimeout(this._chronoPickTimer);
        if (!q.trim()) {
            this.chronoPickResults.set([]);
            return;
        }
        this._chronoPickTimer = setTimeout(() => {
            this.brainApi.listChrono(this.spaceId(), 8, 0, { search: q }).subscribe({
                next: ({ chrono }) => this.chronoPickResults.set(chrono.slice(0, 6)),
                error: () => { },
            });
        }, 300);
    }
    /** Cache the picked entry's title for chip display, append its id to the form, and clear the search. */
    addChronoRef(form, c) {
        this.chronoTitleCache.update(t => ({ ...t, [c._id]: c.title }));
        if (!form.chronoIds.includes(c._id))
            form.chronoIds.push(c._id);
        this.chronoPickQuery.set('');
        this.chronoPickResults.set([]);
    }
    removeChronoRef(form, id) {
        form.chronoIds = form.chronoIds.filter(c => c !== id);
    }
    /** Chip label for a linked chrono entry: cached title → loaded list → truncated id, trimmed. */
    chronoRefTitle(id) {
        const full = this.chronoTitleCache()[id] ?? this.store.chrono().find(c => c._id === id)?.title;
        return full ? full.slice(0, 40) + (full.length > 40 ? '…' : '') : id.slice(0, 8) + '…';
    }
    /** Resolve the uncached titles of a chronoIds list (opening a record for editing). Small N → per-id. */
    resolveChronoTitles(ids) {
        const spaceId = this.spaceId();
        if (!spaceId)
            return;
        for (const id of ids.filter(i => !this.chronoTitleCache()[i])) {
            this.brainApi.getChrono(spaceId, id).subscribe({
                next: (c) => this.chronoTitleCache.update(t => ({ ...t, [c._id]: c.title })),
                error: () => { },
            });
        }
    }
    static { this.ɵfac = function EntityRefPicker_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || EntityRefPicker)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: EntityRefPicker, factory: EntityRefPicker.ɵfac }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EntityRefPicker, [{
        type: Injectable
    }], null, null); })();
