import { Injectable, inject, signal } from '@angular/core';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { toLocalDatetime, fmtApiError } from './brain-format';
import * as i0 from "@angular/core";
export class RecordDrawerState {
    constructor() {
        this.brainApi = inject(BrainApi);
        this.store = inject(BrainStore);
        this.picker = inject(EntityRefPicker);
        /** Active brain space. Kept in sync by the shell, whose `activeSpaceId` is nav state. */
        this.spaceId = signal('', ...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
        this.drawerRecord = signal(null, ...(ngDevMode ? [{ debugName: "drawerRecord" }] : /* istanbul ignore next */ []));
        this.drawerSaving = signal(false, ...(ngDevMode ? [{ debugName: "drawerSaving" }] : /* istanbul ignore next */ []));
        this.drawerError = signal('', ...(ngDevMode ? [{ debugName: "drawerError" }] : /* istanbul ignore next */ []));
        /**
         * The last record a `save()` persisted, for hosts that keep their OWN copies of records.
         *
         * `save()` already patches the `BrainStore` lists, which is all the brain page needs. The graph
         * page holds per-node `nodeMemories`/`nodeChrono` arrays the store never sees, so without this it
         * would save successfully and still show the stale row underneath — the silent-staleness shape.
         * Deliberately a signal rather than a callback so a host reacts declaratively and one host cannot
         * overwrite another's handler.
         */
        this.lastSaved = signal(null, ...(ngDevMode ? [{ debugName: "lastSaved" }] : /* istanbul ignore next */ []));
        this.drawerEditMemory = { fact: '', type: '', tags: [], entityIds: '', description: '', properties: {} };
        this.drawerEditEntity = { name: '', type: '', tags: [], description: '', properties: {} };
        this.drawerEditEdge = { label: '', type: '', weight: null, tags: [], description: '', properties: {} };
        this.drawerEditChrono = { title: '', kind: 'event', status: 'upcoming', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', confidence: null, memoryIds: [], properties: {} };
    }
    /** Re-seed a drawer entity's properties when its type changes (mirrors the create/inline forms). */
    onEntityTypeChange(type) {
        this.drawerEditEntity.properties = this.store.buildPropertiesObject('entity', this.drawerEditEntity.properties, type);
    }
    /** Effective chrono type for schema lookup. */
    drawerChronoKind() {
        return this.drawerEditChrono.kind;
    }
    /** Re-seed the drawer chrono's properties when its kind changes (mirrors the create/inline forms). */
    onDrawerChronoKindChange() {
        this.drawerEditChrono.properties = this.store.buildPropertiesObject('chrono', this.drawerEditChrono.properties, this.drawerChronoKind());
    }
    open(kind, record) {
        // The one assertion in this method, and the overloads above are what make it sound: every caller
        // has already been checked against a single legal (kind, record) pairing.
        const target = { kind, record };
        this.drawerRecord.set(target);
        this.drawerError.set('');
        this.drawerSaving.set(false);
        // Only memories and chrono entries carry entity references — the other two kinds have no such field.
        const ids = 'entityIds' in record ? (record.entityIds ?? []) : [];
        if (ids.length)
            this.picker.resolveEntityNames(ids);
        if (target.kind === 'memory') {
            const r = target.record;
            this.drawerEditMemory = {
                fact: r.fact,
                type: r.type ?? '',
                tags: [...(r.tags ?? [])],
                entityIds: (r.entityIds ?? []).join(', '),
                description: r.description ?? '',
                properties: this.store.buildPropertiesObject('memory', r.properties ?? {}),
            };
        }
        else if (target.kind === 'entity') {
            const r = target.record;
            this.drawerEditEntity = {
                name: r.name,
                type: r.type ?? '',
                tags: [...(r.tags ?? [])],
                description: r.description ?? '',
                properties: this.store.buildPropertiesObject('entity', r.properties ?? {}, r.type),
            };
        }
        else if (target.kind === 'edge') {
            const r = target.record;
            this.drawerEditEdge = {
                label: r.label,
                type: r.type ?? '',
                weight: r.weight ?? null,
                tags: [...(r.tags ?? [])],
                description: r.description ?? '',
                properties: this.store.buildPropertiesObject('edge', r.properties ?? {}, r.label),
            };
        }
        else {
            const r = target.record;
            this.drawerEditChrono = {
                title: r.title,
                // Verbatim. The old split routed anything outside the five built-ins into a free-text box —
                // which is where a space's own declared types landed, and the box could only ever save a 400.
                kind: r.type,
                status: r.status,
                startsAt: r.startsAt ? toLocalDatetime(r.startsAt) : '',
                endsAt: r.endsAt ? toLocalDatetime(r.endsAt) : '',
                description: r.description ?? '',
                tags: [...(r.tags ?? [])],
                entityIds: (r.entityIds ?? []).join(', '),
                confidence: r.confidence ?? null,
                memoryIds: [...(r.memoryIds ?? [])],
                properties: this.store.buildPropertiesObject('chrono', r.properties ?? {}, r.type),
            };
            this.picker.resolveMemoryTitles(r.memoryIds ?? []);
        }
    }
    close() {
        this.drawerRecord.set(null);
        this.drawerError.set('');
    }
    save() {
        const dr = this.drawerRecord();
        if (!dr)
            return;
        this.drawerSaving.set(true);
        this.drawerError.set('');
        const id = dr.record._id;
        const spaceId = this.spaceId();
        if (dr.kind === 'memory') {
            const props = this.drawerEditMemory.properties;
            this.brainApi.updateMemory(spaceId, id, {
                fact: this.drawerEditMemory.fact.trim(),
                // Trimmed, and sent even when empty: on an UPDATE an absent field means "leave it alone", so clearing the
                // box has to reach the API as an explicit empty value or the type could be set and never unset.
                type: this.drawerEditMemory.type.trim(),
                tags: this.drawerEditMemory.tags,
                entityIds: this.drawerEditMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean),
                description: this.drawerEditMemory.description.trim(),
                ...(Object.keys(props).length ? { properties: props } : {}),
            }).subscribe({
                next: (updated) => {
                    this.drawerSaving.set(false);
                    this.drawerRecord.set({ kind: 'memory', record: updated });
                    this.store.memories.update(list => list.map(m => m._id === id ? updated : m));
                    this.lastSaved.set({ kind: 'memory', record: updated });
                },
                error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
            });
        }
        else if (dr.kind === 'entity') {
            const props = this.store.stripEmptyOptionalProps(this.drawerEditEntity.properties, this.store.entitySchema(this.drawerEditEntity.type));
            this.brainApi.updateEntity(spaceId, id, {
                name: this.drawerEditEntity.name.trim(),
                type: this.drawerEditEntity.type.trim(),
                tags: this.drawerEditEntity.tags,
                description: this.drawerEditEntity.description.trim(),
                ...(Object.keys(props).length ? { properties: props } : {}),
            }).subscribe({
                next: (updated) => {
                    this.drawerSaving.set(false);
                    this.drawerRecord.set({ kind: 'entity', record: updated });
                    this.store.entities.update(list => list.map(e => e._id === id ? updated : e));
                    this.lastSaved.set({ kind: 'entity', record: updated });
                },
                error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
            });
        }
        else if (dr.kind === 'edge') {
            const props = this.store.stripEmptyOptionalProps(this.drawerEditEdge.properties, this.store.edgeSchema(this.drawerEditEdge.label));
            this.brainApi.updateEdge(spaceId, id, {
                label: this.drawerEditEdge.label.trim(),
                ...(this.drawerEditEdge.type.trim() ? { type: this.drawerEditEdge.type.trim() } : {}),
                ...(this.drawerEditEdge.weight != null ? { weight: this.drawerEditEdge.weight } : {}),
                tags: this.drawerEditEdge.tags,
                description: this.drawerEditEdge.description.trim(),
                ...(Object.keys(props).length ? { properties: props } : {}),
            }).subscribe({
                next: (updated) => {
                    this.drawerSaving.set(false);
                    this.drawerRecord.set({ kind: 'edge', record: updated });
                    this.store.edges.update(list => list.map(e => e._id === id ? updated : e));
                    this.lastSaved.set({ kind: 'edge', record: updated });
                },
                error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
            });
        }
        else if (dr.kind === 'chrono') {
            const resolvedKind = this.drawerEditChrono.kind;
            const chronoProps = this.store.stripEmptyOptionalProps(this.drawerEditChrono.properties, this.store.chronoSchema(resolvedKind));
            this.brainApi.updateChrono(spaceId, id, {
                title: this.drawerEditChrono.title.trim(),
                type: resolvedKind,
                status: this.drawerEditChrono.status,
                ...(this.drawerEditChrono.startsAt ? { startsAt: new Date(this.drawerEditChrono.startsAt).toISOString() } : {}),
                ...(this.drawerEditChrono.endsAt ? { endsAt: new Date(this.drawerEditChrono.endsAt).toISOString() } : {}),
                description: this.drawerEditChrono.description.trim(),
                tags: this.drawerEditChrono.tags,
                entityIds: this.drawerEditChrono.entityIds.split(',').map(s => s.trim()).filter(Boolean),
                ...(this.drawerEditChrono.memoryIds.length ? { memoryIds: this.drawerEditChrono.memoryIds } : {}),
                ...(this.drawerEditChrono.confidence != null ? { confidence: this.drawerEditChrono.confidence } : {}),
                ...(Object.keys(chronoProps).length ? { properties: chronoProps } : {}),
            }).subscribe({
                next: (updated) => {
                    this.drawerSaving.set(false);
                    this.drawerRecord.set({ kind: 'chrono', record: updated });
                    this.store.chrono.update(list => list.map(c => c._id === id ? updated : c));
                    this.lastSaved.set({ kind: 'chrono', record: updated });
                },
                error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
            });
        }
    }
    static { this.ɵfac = function RecordDrawerState_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RecordDrawerState)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: RecordDrawerState, factory: RecordDrawerState.ɵfac }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RecordDrawerState, [{
        type: Injectable
    }], null, null); })();
