/**
 * BrainComponent — CHARACTERIZATION tests for the five record tabs' CRUD payload shaping and side
 * effects, written against the unmodified shell BEFORE the tabs are split into their own components
 * (A17.9b-6c..g). A characterization test only means anything if it was green against the ORIGINAL
 * code; written during the refactor it just proves the new code agrees with itself.
 *
 * These pin what each create/edit/delete actually SENDS and does — the trim/split/omit-empty rules and
 * a set of asymmetries that are precisely what a per-tab split could quietly "tidy away":
 *
 *   - create strips empty optional props for ENTITY and EDGE (schema-aware) but memory sends its
 *     properties raw; chrono resolves a `__custom__` kind to the free-text `customKind`
 *   - inline-edit chrono uses `editChrono.kind` directly as the type — it does NOT do the create
 *     form's `__custom__` resolution
 *   - delete refreshes the space stats for MEMORY and ENTITY but not for edge/chrono; file-meta
 *     deletes by PATH (not id) via the files API and removes only the metadata record
 *   - every successful edit clears `editingId` and patches the store list in place; every delete
 *     clears `confirmDeleteId` and filters the store list
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import type { Memory, Entity, Edge, ChronoEntry, FileMeta } from '../../core/api.types';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { FilesApi } from '../../core/files-api.service';
import { AuthService } from '../../core/auth.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainComponent } from './brain.component';

const api = {
  // reads (init + loaders)
  listSpaces: vi.fn(() => of({ spaces: [{ id: 'work', label: 'Work' }] })),
  getSpaceStats: vi.fn(() => of({ memories: 0, entities: 0, edges: 0, chrono: 0, files: 0 })),
  getReindexStatus: vi.fn(() => of({ needsReindex: false })),
  getSpaceMeta: vi.fn(() => of({ tagSuggestions: [], typeSchemas: {} })),
  listMemories: vi.fn(() => of({ memories: [] })),
  listEntities: vi.fn(() => of({ entities: [] })),
  listEdges: vi.fn(() => of({ edges: [] })),
  listChrono: vi.fn(() => of({ chrono: [] })),
  listFileMetas: vi.fn(() => of({ fileMetas: [] })),
  getEntitiesByIds: vi.fn(() => of({ entities: [] })),
  // writes
  createMemory: vi.fn(() => of({ _id: 'new' } as Memory)),
  createEntity: vi.fn(() => of({ _id: 'new' } as Entity)),
  createEdge: vi.fn(() => of({ _id: 'new' } as Edge)),
  createChrono: vi.fn(() => of({ _id: 'new' } as ChronoEntry)),
  updateMemory: vi.fn((_s: string, id: string) => of({ _id: id, fact: 'UPDATED' } as Memory)),
  updateEntity: vi.fn((_s: string, id: string) => of({ _id: id, name: 'UPDATED' } as Entity)),
  updateEdge: vi.fn((_s: string, id: string) => of({ _id: id, label: 'UPDATED' } as Edge)),
  updateChrono: vi.fn((_s: string, id: string) => of({ _id: id, title: 'UPDATED' } as ChronoEntry)),
  deleteMemory: vi.fn(() => of({})),
  deleteEntity: vi.fn(() => of({})),
  deleteEdge: vi.fn(() => of({})),
  deleteChrono: vi.fn(() => of({})),
};
const filesApi = {
  updateFileMeta: vi.fn((_s: string, id: string) => of({ _id: id, description: 'UPDATED' } as FileMeta)),
  deleteFileMeta: vi.fn(() => of({})),
};

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [BrainComponent, getTranslocoModule()],
    providers: [
      { provide: SpacesApi, useValue: api },
      { provide: BrainApi, useValue: api },
      { provide: FilesApi, useValue: filesApi },
      { provide: AuthService, useValue: { token: () => '' } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
    ],
  });
  const fixture = TestBed.createComponent(BrainComponent);
  fixture.detectChanges(); // ngOnInit → listSpaces → selectSpace('work')
  return fixture.componentInstance;
}

beforeEach(() => { for (const fn of [...Object.values(api), ...Object.values(filesApi)]) (fn as any).mockClear(); });

describe('BrainComponent — create payloads', () => {
  it('createMemory sends fact + only the non-empty optional fields (properties raw, not stripped)', () => {
    const c = make();
    c.memoryForm = { fact: '  a fact  ', tags: ['t'], entityIds: 'e1, , e2', description: ' d ', properties: { k: 'v' } };
    c.createMemory();
    expect(api.createMemory).toHaveBeenCalledWith('work', {
      fact: 'a fact', tags: ['t'], entityIds: ['e1', 'e2'], description: 'd', properties: { k: 'v' },
    });
  });

  it('createMemory omits empty optionals and is a no-op when fact is blank', () => {
    const c = make();
    c.memoryForm = { fact: 'x', tags: [], entityIds: '', description: '', properties: {} };
    c.createMemory();
    expect(api.createMemory).toHaveBeenCalledWith('work', { fact: 'x' });

    api.createMemory.mockClear();
    c.memoryForm = { fact: '   ', tags: [], entityIds: '', description: '', properties: {} };
    c.createMemory();
    expect(api.createMemory).not.toHaveBeenCalled();
  });

  it('createEntity strips empty optional props via the schema (unlike memory)', () => {
    const c = make();
    c.store.spaceMeta.set({ typeSchemas: { entity: { Person: { propertySchemas: { note: { required: false } } } } } } as any);
    c.entityForm = { name: ' Ann ', type: 'Person', tags: [], description: '', properties: { note: '' } };
    c.createEntity();
    // note is empty + optional → stripped → no properties key at all
    expect(api.createEntity).toHaveBeenCalledWith('work', { name: 'Ann', type: 'Person' });
  });

  it('createChrono resolves a __custom__ kind to the free-text customKind and ISO-encodes startsAt', () => {
    const c = make();
    c.chronoForm = { title: 'T', kind: '__custom__', customKind: ' launch ', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '' };
    c.createChrono();
    const [, body] = api.createChrono.mock.calls[0];
    expect(body.title).toBe('T');
    expect(body.type).toBe('launch');
    expect(body.startsAt).toBe(new Date('2026-03-04T09:07').toISOString());
    expect('endsAt' in body).toBe(false);
  });

  it('createEdge requires from+to+label and spreads weight only when set', () => {
    const c = make();
    c.edgeForm = { from: 'a', fromDisplay: '', to: 'b', toDisplay: '', label: 'knows', weight: null, tags: [], description: '', properties: {} };
    c.createEdge();
    expect(api.createEdge).toHaveBeenCalledWith('work', { from: 'a', to: 'b', label: 'knows' });
  });
});

describe('BrainComponent — inline edit', () => {
  it('saveEditMemory sends the full shape, clears editingId, and patches the store list in place', () => {
    const c = make();
    c.store.memories.set([{ _id: 'm1', fact: 'old' } as Memory]);
    c.editingId.set('m1');
    c.editMemory = { fact: ' new ', tags: ['t'], entityIds: 'e1', description: ' d ', properties: {} };
    c.saveEditMemory('m1');
    expect(api.updateMemory).toHaveBeenCalledWith('work', 'm1', {
      fact: 'new', tags: ['t'], entityIds: ['e1'], description: 'd',
    });
    expect(c.editingId()).toBe('');
    expect(c.store.memories()[0].fact).toBe('UPDATED');
  });

  it('saveEditChrono uses editChrono.kind directly as type (NO __custom__ resolution)', () => {
    const c = make();
    c.store.chrono.set([{ _id: 'c1' } as ChronoEntry]);
    c.editChrono = { title: 'T', kind: '__custom__', status: 'active', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '' };
    c.saveEditChrono('c1');
    const [, , body] = api.updateChrono.mock.calls[0];
    expect(body.type).toBe('__custom__'); // sent verbatim, unlike createChrono
  });
});

describe('BrainComponent — delete', () => {
  it('deleteMemory removes from the store, clears confirmDeleteId, and refreshes stats', () => {
    const c = make();
    c.store.memories.set([{ _id: 'm1' } as Memory, { _id: 'm2' } as Memory]);
    c.confirmDeleteId.set('m1');
    api.getSpaceStats.mockClear();
    c.deleteMemory('m1');
    expect(api.deleteMemory).toHaveBeenCalledWith('work', 'm1');
    expect(c.store.memories().map(m => m._id)).toEqual(['m2']);
    expect(c.confirmDeleteId()).toBe('');
    expect(api.getSpaceStats).toHaveBeenCalled(); // stats refresh
  });

  it('deleteEdge removes from the store but does NOT refresh stats (asymmetry with memory/entity)', () => {
    const c = make();
    c.store.edges.set([{ _id: 'x1' } as Edge]);
    api.getSpaceStats.mockClear();
    c.deleteEdge('x1');
    expect(api.deleteEdge).toHaveBeenCalledWith('work', 'x1');
    expect(c.store.edges()).toEqual([]);
    expect(api.getSpaceStats).not.toHaveBeenCalled();
  });

  it('deleteFileMeta deletes by PATH via the files API and removes the metadata record', () => {
    const c = make();
    c.store.fileMetas.set([{ _id: 'f1', path: '/docs/a.md' } as FileMeta]);
    c.confirmDeleteId.set('f1');
    c.deleteFileMeta('f1');
    expect(filesApi.deleteFileMeta).toHaveBeenCalledWith('work', '/docs/a.md');
    expect(c.store.fileMetas()).toEqual([]);
    expect(c.confirmDeleteId()).toBe('');
  });
});

describe('BrainComponent — load, filter, pagination (memories tab)', () => {
  it('the memories load sends page size + skip + the active tag/type/entity filter', () => {
    const c = make();
    c.activeTab.set('memories');
    c.recordFilter.set({ type: 'note', tag: 'urgent' });
    c.filterEntity.set('e9');
    api.listMemories.mockClear();
    c.prevPage(); // skip is already 0 → Math.max(0, -pageSize) === 0, reloads
    expect(api.listMemories).toHaveBeenCalledWith('work', c.pageSize, 0, { tag: 'urgent', entity: 'e9', type: 'note' });
  });

  it('nextPage advances skip by pageSize and reloads; prevPage clamps at 0', () => {
    const c = make();
    c.activeTab.set('memories');
    c.nextPage();
    expect(c.skip()).toBe(c.pageSize);
    c.nextPage();
    expect(c.skip()).toBe(2 * c.pageSize);
    c.prevPage();
    expect(c.skip()).toBe(c.pageSize);
    // clamp: from 0 it never goes negative
    c.prevPage(); c.prevPage();
    expect(c.skip()).toBe(0);
  });
});
