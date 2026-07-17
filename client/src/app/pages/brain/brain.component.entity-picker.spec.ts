/**
 * BrainComponent — CHARACTERIZATION tests for the shared entity-reference picker + flyout.
 *
 * Written against the unmodified component BEFORE the picker is extracted, and landed as their own
 * PR. A characterization test only means anything if it was green against the ORIGINAL code; written
 * during a refactor it just proves the new code agrees with itself.
 *
 * ONE flyout and ONE entity-name cache are shared by every form on this page — the four create
 * forms, the inline edit forms, the file-meta editors, AND the detail drawer. Today they are wired
 * together by a string-keyed god-switch: `pickEntity(ent, mode, field)` and
 * `resolveEntityNamesForFlyout(key)` branch on a field key like `'drawer-memory-entityIds'` and reach
 * directly into the matching form object. That single seam is what blocks splitting the drawer and
 * the tab views into their own components, so the split will replace the god-switch with a
 * target-based API. These tests pin the exact behaviour the new API must reproduce:
 *
 *   - every `pickEntity` branch: which form's `entityIds` the id lands in, that the name-cache is
 *     updated for entity fields, and that the edge from/to fields set id + display WITHOUT touching
 *     the cache
 *   - `pickEntity`'s `mode` argument is inert today — the switch ignores it (single vs multi is a
 *     template concern), an asymmetry easy to "tidy away" wrongly during the split
 *   - `appendEntityId` dedups and re-joins with ', '; `removeEntityId` drops one id and re-joins
 *   - `entityChips` maps a comma id-string to {id,name}, resolving names from the cache and falling
 *     back to the raw id, trimming and dropping blanks
 *   - `openFlyout` sets the active field and, for an *entityIds* key, resolves the *uncached* ids of
 *     the matching form via the API and patches the cache; a non-entityIds key resolves nothing
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { type Entity } from '../../core/api.types';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { FilesApi } from '../../core/files-api.service';
import { AuthService } from '../../core/auth.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainComponent } from './brain.component';

function entity(id: string, name = id): Entity {
  return { _id: id, name, tags: [], properties: {}, createdAt: '' } as unknown as Entity;
}

describe('BrainComponent — entity-reference picker + flyout (characterization)', () => {
  // getEntitiesByIds is configurable per test so the flyout name-resolution can be observed.
  const getEntitiesByIds = vi.fn((_spaceId: string, _ids: string[]) => of({ entities: [] as Entity[] }));

  function makeApi() {
    return {
      listSpaces: () => of({ spaces: [{ id: 'work', label: 'Work' }] }),
      getSpaceStats: () => of({ memories: 0, entities: 0, edges: 0, chrono: 0, files: 0 }),
      getReindexStatus: () => of({ needsReindex: false }),
      getSpaceMeta: () => of({ tagSuggestions: [], typeSchemas: {} }),
      listMemories: () => of({ memories: [] }),
      getEntitiesByIds,
    } as any;
  }

  function create() {
    TestBed.configureTestingModule({
      imports: [BrainComponent, getTranslocoModule()],
      providers: [
        { provide: SpacesApi, useValue: makeApi() },
        { provide: BrainApi, useValue: makeApi() },
        { provide: FilesApi, useValue: makeApi() },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
      ],
    });
    const fixture = TestBed.createComponent(BrainComponent);
    fixture.detectChanges(); // ngOnInit → listSpaces resolves synchronously; activeSpaceId() === 'work'
    return fixture.componentInstance;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    getEntitiesByIds.mockReset();
    getEntitiesByIds.mockImplementation(() => of({ entities: [] as Entity[] }));
  });

  // ── pickEntity: the god-switch, one assertion per branch ──────────────────

  // Each entity field appends the picked id to its OWN form's entityIds and records the name.
  const ENTITY_FIELDS: Array<[string, (c: BrainComponent) => string]> = [
    ['create-memory-entityIds', (c) => c.memoryForm.entityIds],
    ['edit-memory-entityIds', (c) => c.editMemory.entityIds],
    ['drawer-memory-entityIds', (c) => c.drawerEditMemory.entityIds],
    ['create-chrono-entityIds', (c) => c.chronoForm.entityIds],
    ['edit-chrono-entityIds', (c) => c.editChrono.entityIds],
    ['drawer-chrono-entityIds', (c) => c.drawerEditChrono.entityIds],
    ['edit-filemeta-entityIds', (c) => c.editFileMeta.entityIds],
    ['drawer-filemeta-entityIds', (c) => c.drawerEditFileMeta.entityIds],
  ];

  for (const [field, read] of ENTITY_FIELDS) {
    it(`pickEntity('${field}') appends the id to that form and caches the name`, () => {
      const c = create();
      c.pickEntity(entity('e1', 'Alice'), 'multi', field);
      expect(read(c)).toBe('e1');
      expect(c.entityNameCache()['e1']).toBe('Alice');
    });
  }

  it("pickEntity('create-edge-from') sets from + fromDisplay and does NOT touch the name cache", () => {
    const c = create();
    c.pickEntity(entity('e1', 'Alice'), 'single', 'create-edge-from');
    expect(c.edgeForm.from).toBe('e1');
    expect(c.edgeForm.fromDisplay).toBe('Alice');
    expect(c.entityNameCache()['e1']).toBeUndefined();
  });

  it("pickEntity('create-edge-to') sets to + toDisplay and does NOT touch the name cache", () => {
    const c = create();
    c.pickEntity(entity('e2', 'Bob'), 'single', 'create-edge-to');
    expect(c.edgeForm.to).toBe('e2');
    expect(c.edgeForm.toDisplay).toBe('Bob');
    expect(c.entityNameCache()['e2']).toBeUndefined();
  });

  it('pickEntity ignores its mode argument (single vs multi yields the same append)', () => {
    const a = create();
    a.pickEntity(entity('e1'), 'multi', 'create-memory-entityIds');
    const withMulti = a.memoryForm.entityIds;

    TestBed.resetTestingModule();
    const b = create();
    b.pickEntity(entity('e1'), 'single', 'create-memory-entityIds');
    expect(b.memoryForm.entityIds).toBe(withMulti);
  });

  it('appendEntityId (via pickEntity) joins with ", " and de-duplicates', () => {
    const c = create();
    c.memoryForm.entityIds = 'x';
    c.pickEntity(entity('y'), 'multi', 'create-memory-entityIds');
    expect(c.memoryForm.entityIds).toBe('x, y');
    c.pickEntity(entity('y'), 'multi', 'create-memory-entityIds'); // already present
    expect(c.memoryForm.entityIds).toBe('x, y');
  });

  // ── removeEntityId / entityChips: target-agnostic helpers ──────────────────

  it('removeEntityId drops the id and re-joins the remaining with ", "', () => {
    const c = create();
    const target = { entityIds: 'a, b, c' };
    c.removeEntityId(target, 'b');
    expect(target.entityIds).toBe('a, c');
  });

  it('entityChips resolves names from the cache, falls back to the id, trims and drops blanks', () => {
    const c = create();
    c.entityNameCache.set({ e1: 'Alice' });
    const chips = c.entityChips('e1, , e2 ,');
    expect(chips).toEqual([
      { id: 'e1', name: 'Alice' },
      { id: 'e2', name: 'e2' },
    ]);
  });

  // ── openFlyout / closeFlyout + name resolution ─────────────────────────────

  it('openFlyout sets the active field; closeFlyout clears it', () => {
    const c = create();
    c.openFlyout('create-memory-entityIds');
    expect(c.flyoutField()).toBe('create-memory-entityIds');
    c.closeFlyout();
    expect(c.flyoutField()).toBe('');
  });

  it('openFlyout on an entityIds key resolves the matching form\'s UNCACHED ids and patches the cache', () => {
    const c = create();
    c.memoryForm.entityIds = 'e1, e2';
    c.entityNameCache.set({ e1: 'Alice' }); // e1 already known → only e2 should be requested
    getEntitiesByIds.mockReturnValue(of({ entities: [entity('e2', 'Bob')] }));

    c.openFlyout('create-memory-entityIds');

    expect(getEntitiesByIds).toHaveBeenCalledTimes(1);
    expect(getEntitiesByIds).toHaveBeenCalledWith('work', ['e2']);
    expect(c.entityNameCache()['e2']).toBe('Bob');
    expect(c.entityNameCache()['e1']).toBe('Alice'); // preserved
  });

  it('openFlyout does not call the API when every id is already cached', () => {
    const c = create();
    c.chronoForm.entityIds = 'e1';
    c.entityNameCache.set({ e1: 'Alice' });
    c.openFlyout('create-chrono-entityIds');
    expect(getEntitiesByIds).not.toHaveBeenCalled();
  });

  it('openFlyout on a non-entityIds key resolves nothing (only entity-id fields are name-resolved)', () => {
    const c = create();
    c.openFlyout('create-edge-from');
    expect(c.flyoutField()).toBe('create-edge-from');
    expect(getEntitiesByIds).not.toHaveBeenCalled();
  });
});
