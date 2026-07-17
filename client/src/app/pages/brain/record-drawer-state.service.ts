import { Injectable, inject, signal } from '@angular/core';
import { ChronoType, ChronoStatus } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { toLocalDatetime, fmtApiError } from './brain-format';

/**
 * State for the record detail drawer — one drawer edits ONE record (memory/entity/edge/chrono),
 * opened from every record tab.
 *
 * Extracted from BrainComponent (A17.9b-5). Owns the drawer's own signals (`drawerRecord`/`Saving`/
 * `Error`), its four plain edit models, and the open/save/close cycle. It consumes the already-split
 * collaborators — `BrainStore` (record lists + schema helpers), `EntityRefPicker` (chip name
 * resolution), `BrainApi` (persistence) — and the pure `brain-format` utils.
 *
 * `spaceId` is fed by the shell (its `activeSpaceId` is nav state), mirroring `EntityRefPicker`.
 *
 * The plain edit models render under OnPush only because `open()` writes the `drawerRecord` SIGNAL in
 * the same turn — that coupling is load-bearing and pinned by the drawer component's spec.
 *
 * Provided by BrainComponent (not root): one instance per mounted page.
 */
@Injectable()
export class RecordDrawerState {
  private brainApi = inject(BrainApi);
  private store = inject(BrainStore);
  private picker = inject(EntityRefPicker);

  /** Active brain space. Kept in sync by the shell, whose `activeSpaceId` is nav state. */
  readonly spaceId = signal('');

  drawerRecord = signal<{ kind: 'memory' | 'entity' | 'edge' | 'chrono'; record: any } | null>(null);
  drawerSaving = signal(false);
  drawerError = signal('');

  drawerEditMemory = { fact: '', tags: [] as string[], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };
  drawerEditEntity = { name: '', type: '', tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };
  drawerEditEdge = { label: '', type: '', weight: null as number | null, tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };
  drawerEditChrono = { title: '', kind: 'event' as string, customKind: '', status: 'upcoming' as string, startsAt: '', endsAt: '', description: '', tags: [] as string[], entityIds: '', confidence: null as number | null, memoryIds: '' };

  /** Re-seed a drawer entity's properties when its type changes (mirrors the create/inline forms). */
  onEntityTypeChange(type: string): void {
    this.drawerEditEntity.properties = this.store.buildPropertiesObject('entity', this.drawerEditEntity.properties, type);
  }

  open(kind: 'memory' | 'entity' | 'edge' | 'chrono', record: any): void {
    this.drawerRecord.set({ kind, record });
    this.drawerError.set('');
    this.drawerSaving.set(false);
    const ids: string[] = record.entityIds ?? [];
    if (ids.length) this.picker.resolveEntityNames(ids);
    if (kind === 'memory') {
      this.drawerEditMemory = {
        fact: record.fact,
        tags: [...(record.tags ?? [])],
        entityIds: (record.entityIds ?? []).join(', '),
        description: record.description ?? '',
        properties: this.store.buildPropertiesObject('memory', record.properties ?? {}),
      };
    } else if (kind === 'entity') {
      this.drawerEditEntity = {
        name: record.name,
        type: record.type ?? '',
        tags: [...(record.tags ?? [])],
        description: record.description ?? '',
        properties: this.store.buildPropertiesObject('entity', record.properties ?? {}, record.type),
      };
    } else if (kind === 'edge') {
      this.drawerEditEdge = {
        label: record.label,
        type: record.type ?? '',
        weight: record.weight ?? null,
        tags: [...(record.tags ?? [])],
        description: record.description ?? '',
        properties: this.store.buildPropertiesObject('edge', record.properties ?? {}, record.label),
      };
    } else if (kind === 'chrono') {
      const isPredefined = this.store.chronoKinds.includes(record.type as ChronoType);
      this.drawerEditChrono = {
        title: record.title,
        kind: isPredefined ? record.type : '__custom__',
        customKind: isPredefined ? '' : record.type,
        status: record.status,
        startsAt: record.startsAt ? toLocalDatetime(record.startsAt) : '',
        endsAt: record.endsAt ? toLocalDatetime(record.endsAt) : '',
        description: record.description ?? '',
        tags: [...(record.tags ?? [])],
        entityIds: (record.entityIds ?? []).join(', '),
        confidence: record.confidence ?? null,
        memoryIds: (record.memoryIds ?? []).join(', '),
      };
    }
  }

  close(): void {
    this.drawerRecord.set(null);
    this.drawerError.set('');
    this.picker.closeFlyout();
  }

  save(): void {
    const dr = this.drawerRecord();
    if (!dr) return;
    this.drawerSaving.set(true);
    this.drawerError.set('');
    const id = dr.record._id;
    const spaceId = this.spaceId();
    if (dr.kind === 'memory') {
      const props = this.drawerEditMemory.properties;
      this.brainApi.updateMemory(spaceId, id, {
        fact: this.drawerEditMemory.fact.trim(),
        tags: this.drawerEditMemory.tags,
        entityIds: this.drawerEditMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean),
        description: this.drawerEditMemory.description.trim(),
        ...(Object.keys(props).length ? { properties: props } : {}),
      }).subscribe({
        next: (updated) => {
          this.drawerSaving.set(false);
          this.drawerRecord.set({ kind: 'memory', record: updated });
          this.store.memories.update(list => list.map(m => m._id === id ? updated : m));
        },
        error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
      });
    } else if (dr.kind === 'entity') {
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
        },
        error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
      });
    } else if (dr.kind === 'edge') {
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
        },
        error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
      });
    } else if (dr.kind === 'chrono') {
      const resolvedKind = this.drawerEditChrono.kind === '__custom__'
        ? (this.drawerEditChrono.customKind.trim() as ChronoType)
        : this.drawerEditChrono.kind as ChronoType;
      this.brainApi.updateChrono(spaceId, id, {
        title: this.drawerEditChrono.title.trim(),
        type: resolvedKind,
        status: this.drawerEditChrono.status as ChronoStatus,
        ...(this.drawerEditChrono.startsAt ? { startsAt: new Date(this.drawerEditChrono.startsAt).toISOString() } : {}),
        ...(this.drawerEditChrono.endsAt ? { endsAt: new Date(this.drawerEditChrono.endsAt).toISOString() } : {}),
        description: this.drawerEditChrono.description.trim(),
        tags: this.drawerEditChrono.tags,
        entityIds: this.drawerEditChrono.entityIds.split(',').map(s => s.trim()).filter(Boolean),
        ...(this.drawerEditChrono.memoryIds.trim() ? { memoryIds: this.drawerEditChrono.memoryIds.split(',').map(s => s.trim()).filter(Boolean) } : {}),
        ...(this.drawerEditChrono.confidence != null ? { confidence: this.drawerEditChrono.confidence } : {}),
      }).subscribe({
        next: (updated) => {
          this.drawerSaving.set(false);
          this.drawerRecord.set({ kind: 'chrono', record: updated });
          this.store.chrono.update(list => list.map(c => c._id === id ? updated : c));
        },
        error: (err) => { this.drawerSaving.set(false); this.drawerError.set(fmtApiError(err, 'Failed to save')); },
      });
    }
  }
}
