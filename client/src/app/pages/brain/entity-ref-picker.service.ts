import { Injectable, inject, signal } from '@angular/core';
import { ChronoEntry, Entity, Memory } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';

/**
 * A form slice that carries a comma-separated entity-id string. Every entity-chip field on the brain
 * page exposes this exact shape — the memory/chrono/file-meta create forms, their inline-edit forms,
 * and the detail drawer's edit models all have an `entityIds: string`. That shared shape is what lets
 * the picker append to any of them without knowing which one it is.
 */
export interface EntityIdTarget {
  entityIds: string;
}

/**
 * The brain page's shared entity/memory/chrono reference picker.
 *
 * Extracted from BrainComponent (A17.9b). One flyout and one entity-name cache serve every form on
 * the page. Previously they were wired by a string-keyed god-switch — `pickEntity(ent, mode, field)`
 * and `resolveEntityNamesForFlyout(key)` branched on a field key like `'drawer-memory-entityIds'` and
 * reached directly into the matching form object, so the flyout could not leave the shell. This
 * service replaces that switch with a target-based API: the caller passes its OWN form ref, exactly
 * as `removeEntityId(target, id)` already did. That is the seam that lets the drawer and the tab views
 * become their own components (A17.9b-4/5), each holding its own edit models and calling this picker.
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
@Injectable()
export class EntityRefPicker {
  private brainApi = inject(BrainApi);
  private store = inject(BrainStore);

  /** Active brain space. Kept in sync by the shell, whose `activeSpaceId` is nav state. */
  readonly spaceId = signal('');

  // ── Entity picker & flyouts ─────────────────────────────────────────────

  flyoutField = signal('');
  entityNameCache = signal<Record<string, string>>({});

  // ── File-meta memory/chrono pickers ──────────────────────────────────────

  fmMemPickerQuery = signal('');
  fmMemPickerResults = signal<Memory[]>([]);
  fmChronoPickerQuery = signal('');
  fmChronoPickerResults = signal<ChronoEntry[]>([]);
  fmDrawerMemPickerQuery = signal('');
  fmDrawerMemPickerResults = signal<Memory[]>([]);
  fmDrawerChronoPickerQuery = signal('');
  fmDrawerChronoPickerResults = signal<ChronoEntry[]>([]);
  private _fmMemTimer: ReturnType<typeof setTimeout> | null = null;
  private _fmChronoTimer: ReturnType<typeof setTimeout> | null = null;
  private _fmDrawerMemTimer: ReturnType<typeof setTimeout> | null = null;
  private _fmDrawerChronoTimer: ReturnType<typeof setTimeout> | null = null;

  /** Open the flyout for `key`; when a target is given, pre-resolve its uncached entity names. */
  openFlyout(key: string, target?: EntityIdTarget): void {
    this.flyoutField.set(key);
    if (target) this.resolveEntityNamesFor(target.entityIds);
  }

  closeFlyout(): void {
    this.flyoutField.set('');
  }

  removeEntityId(target: { entityIds: string }, id: string): void {
    const parts = target.entityIds.split(',').map(s => s.trim()).filter(s => s && s !== id);
    target.entityIds = parts.join(', ');
  }

  entityChips(ids: string): Array<{ id: string; name: string }> {
    const cache = this.entityNameCache();
    return ids.split(',').map(s => s.trim()).filter(Boolean)
      .map(id => ({ id, name: cache[id] ?? id }));
  }

  /** Append the picked entity to a chip field and remember its name for display. */
  pickEntity(ent: Entity, target: EntityIdTarget): void {
    this.entityNameCache.update(c => ({ ...c, [ent._id]: ent.name }));
    target.entityIds = this.appendEntityId(target.entityIds, ent._id);
  }

  /** Bulk-resolve entity names into the cache (used when opening a record for editing). */
  resolveEntityNames(ids: string[]): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    const unknown = ids.filter(id => !this.entityNameCache()[id]);
    if (!unknown.length) return;
    this.brainApi.getEntitiesByIds(spaceId, unknown).subscribe({
      next: ({ entities }) => {
        const patch: Record<string, string> = {};
        for (const e of entities) patch[e._id] = e.name;
        this.entityNameCache.update(c => ({ ...c, ...patch }));
      },
      error: () => {},
    });
  }

  /** Resolve the uncached ids of a comma-separated field (chip display). */
  resolveEntityNamesFor(idsCsv: string): void {
    this.resolveEntityNames(idsCsv.split(',').map(s => s.trim()).filter(Boolean));
  }

  private appendEntityId(current: string, id: string): string {
    const parts = current.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.includes(id)) parts.push(id);
    return parts.join(', ');
  }

  onFmMemPickerInput(q: string, isDrawer = false): void {
    if (isDrawer) {
      this.fmDrawerMemPickerQuery.set(q);
      if (this._fmDrawerMemTimer) clearTimeout(this._fmDrawerMemTimer);
      if (!q.trim()) { this.fmDrawerMemPickerResults.set([]); return; }
      this._fmDrawerMemTimer = setTimeout(() => {
        this.brainApi.listMemories(this.spaceId(), 8, 0, {}).subscribe({
          next: ({ memories }) => this.fmDrawerMemPickerResults.set(
            memories.filter(m => m.fact.toLowerCase().includes(q.toLowerCase())).slice(0, 6),
          ),
          error: () => {},
        });
      }, 300);
    } else {
      this.fmMemPickerQuery.set(q);
      if (this._fmMemTimer) clearTimeout(this._fmMemTimer);
      if (!q.trim()) { this.fmMemPickerResults.set([]); return; }
      this._fmMemTimer = setTimeout(() => {
        this.brainApi.listMemories(this.spaceId(), 8, 0, {}).subscribe({
          next: ({ memories }) => this.fmMemPickerResults.set(
            memories.filter(m => m.fact.toLowerCase().includes(q.toLowerCase())).slice(0, 6),
          ),
          error: () => {},
        });
      }, 300);
    }
  }

  onFmChronoPickerInput(q: string, isDrawer = false): void {
    if (isDrawer) {
      this.fmDrawerChronoPickerQuery.set(q);
      if (this._fmDrawerChronoTimer) clearTimeout(this._fmDrawerChronoTimer);
      if (!q.trim()) { this.fmDrawerChronoPickerResults.set([]); return; }
      this._fmDrawerChronoTimer = setTimeout(() => {
        this.brainApi.listChrono(this.spaceId(), 8, 0, { search: q }).subscribe({
          next: ({ chrono }) => this.fmDrawerChronoPickerResults.set(chrono.slice(0, 6)),
          error: () => {},
        });
      }, 300);
    } else {
      this.fmChronoPickerQuery.set(q);
      if (this._fmChronoTimer) clearTimeout(this._fmChronoTimer);
      if (!q.trim()) { this.fmChronoPickerResults.set([]); return; }
      this._fmChronoTimer = setTimeout(() => {
        this.brainApi.listChrono(this.spaceId(), 8, 0, { search: q }).subscribe({
          next: ({ chrono }) => this.fmChronoPickerResults.set(chrono.slice(0, 6)),
          error: () => {},
        });
      }, 300);
    }
  }

  addFmMemoryId(form: { memoryIds: string[] }, id: string): void {
    if (!form.memoryIds.includes(id)) form.memoryIds.push(id);
    this.fmMemPickerQuery.set('');
    this.fmMemPickerResults.set([]);
    this.fmDrawerMemPickerQuery.set('');
    this.fmDrawerMemPickerResults.set([]);
  }

  removeFmMemoryId(form: { memoryIds: string[] }, id: string): void {
    form.memoryIds = form.memoryIds.filter(m => m !== id);
  }

  addFmChronoId(form: { chronoIds: string[] }, id: string): void {
    if (!form.chronoIds.includes(id)) form.chronoIds.push(id);
    this.fmChronoPickerQuery.set('');
    this.fmChronoPickerResults.set([]);
    this.fmDrawerChronoPickerQuery.set('');
    this.fmDrawerChronoPickerResults.set([]);
  }

  removeFmChronoId(form: { chronoIds: string[] }, id: string): void {
    form.chronoIds = form.chronoIds.filter(c => c !== id);
  }

  fmMemoryTitle(id: string): string {
    const mem = this.store.memories().find(m => m._id === id);
    return mem ? mem.fact.slice(0, 40) + (mem.fact.length > 40 ? '…' : '') : id.slice(0, 8) + '…';
  }

  fmChronoTitle(id: string): string {
    const c = this.store.chrono().find(c => c._id === id);
    return c ? c.title.slice(0, 40) + (c.title.length > 40 ? '…' : '') : id.slice(0, 8) + '…';
  }
}
