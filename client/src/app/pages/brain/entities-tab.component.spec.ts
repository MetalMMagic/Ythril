/**
 * EntitiesTabComponent — entity create/edit/delete/load behaviour, relocated from
 * brain.component.records.spec.ts (A17.9b-6b) when the tab became its own component (A17.9b-6e), plus
 * the self-loading + `mutated` wiring the split introduced. Entity delta from memories: create AND
 * inline-edit strip empty optional properties via the entity schema.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import type { Entity, SpaceMetaResponse } from '../../core/api.types';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordListState } from './record-list-state.service';
import { EntitiesTabComponent } from './entities-tab.component';

const api = {
  listEntities: vi.fn(() => of({ entities: [] as Entity[] })),
  getEntitiesByIds: vi.fn(() => of({ entities: [] })),
  createEntity: vi.fn(() => of({ _id: 'new' } as Entity)),
  updateEntity: vi.fn((_s: string, id: string) => of({ _id: id, name: 'UPDATED' } as Entity)),
  deleteEntity: vi.fn(() => of({})),
};

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EntitiesTabComponent, getTranslocoModule()],
    providers: [
      RecordListState, BrainStore, EntityRefPicker, RecordDrawerState,
      { provide: BrainApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(EntitiesTabComponent);
  fixture.componentRef.setInput('spaceId', 'work');
  fixture.detectChanges(); // effect → load()
  return fixture;
}

beforeEach(() => { for (const fn of Object.values(api)) (fn as any).mockClear(); });

describe('EntitiesTabComponent', () => {
  it('is compiled as OnPush', () => {
    expect(EntitiesTabComponent.ɵcmp?.onPush).toBe(true);
  });

  it('self-loads on the spaceId input (page size + skip 0 + no filter)', () => {
    make();
    expect(api.listEntities).toHaveBeenCalledWith('work', 20, 0, {}, undefined, undefined);
  });

  it('self-load effect depends on spaceId ONLY — no reload on plain change detection', () => {
    // Scoping guard for the untracked() self-load effect: it must react to `spaceId` alone. It resets
    // `recordFilter` to a NEW object each run and reads it via load(), so without the untracked() wrapper
    // it would re-dirty itself. NOTE: this does NOT reproduce the app-freezing request storm — that was a
    // structural mount⇄reload loop at the brain.component level (tabs gated by @if(recordList.loading()),
    // which the tab itself writes); it is pinned in brain.component.spec.ts. With spaceId unchanged,
    // further change detection must trigger no reload.
    const fixture = make();
    api.listEntities.mockClear();
    fixture.detectChanges();
    fixture.detectChanges();
    fixture.detectChanges();
    expect(api.listEntities).not.toHaveBeenCalled();
  });

  it('renders the create form when opened', () => {
    const fixture = make();
    fixture.componentInstance.openEntityForm();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form.create-form')).toBeTruthy();
  });

  it('createEntity strips empty optional props via the schema (unlike memory) and emits mutated', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    const mutated = vi.fn();
    c.mutated.subscribe(mutated);
    c.store.spaceMeta.set({ typeSchemas: { entity: { Person: { propertySchemas: { note: { required: false } } } } } } as unknown as SpaceMetaResponse);
    c.entityForm = { name: ' Ann ', type: 'Person', tags: [], description: '', properties: { note: '' } };
    c.createEntity();
    expect(api.createEntity).toHaveBeenCalledWith('work', { name: 'Ann', type: 'Person' });
    expect(mutated).toHaveBeenCalled();
  });

  it('createEntity is a no-op when name is blank', () => {
    const c = make().componentInstance;
    c.entityForm = { name: '  ', type: '', tags: [], description: '', properties: {} };
    c.createEntity();
    expect(api.createEntity).not.toHaveBeenCalled();
  });

  it('saveEditEntity strips props, clears editingId, and patches the store list', () => {
    const c = make().componentInstance;
    c.store.spaceMeta.set({ typeSchemas: { entity: { Person: { propertySchemas: { note: { required: false } } } } } } as unknown as SpaceMetaResponse);
    c.store.entities.set([{ _id: 'e1', name: 'old' } as Entity]);
    c.recordList.editingId.set('e1');
    c.editEntity = { name: ' Ann ', type: 'Person', tags: [], description: '', properties: { note: '' } };
    c.saveEditEntity('e1');
    expect(api.updateEntity).toHaveBeenCalledWith('work', 'e1', { name: 'Ann', type: 'Person', tags: [], description: '' });
    expect(c.recordList.editingId()).toBe('');
    expect(c.store.entities()[0].name).toBe('UPDATED');
  });

  it('deleteEntity removes from the store, clears confirmDeleteId, and emits mutated', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    const mutated = vi.fn();
    c.mutated.subscribe(mutated);
    c.store.entities.set([{ _id: 'e1' } as Entity, { _id: 'e2' } as Entity]);
    c.recordList.confirmDeleteId.set('e1');
    c.deleteEntity('e1');
    expect(c.store.entities().map(e => e._id)).toEqual(['e2']);
    expect(c.recordList.confirmDeleteId()).toBe('');
    expect(mutated).toHaveBeenCalled();
  });

  // 2b-iii-d: the semantic finder no longer runs an exact-`?name=` list filter. PICKING an entity
  // feeds its name into the Name COLUMN filter — the server's substring `?search=` (6th arg), NOT
  // `filters.search`/`?name=`. This is what keeps exact lookups (e.g. "ADR002") working without a
  // redundant second name filter.
  it('picking an entity sets the Name column filter (server ?search=, not ?name=); nextPage carries it', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listEntities.mockClear();
    vi.useFakeTimers();
    c.onEntitySearchPick({ name: 'ADR002' } as Entity);
    vi.advanceTimersByTime(250); // setSearchFilter debounce
    vi.useRealTimers();
    expect(c.search()).toBe('ADR002');
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, 'ADR002');
    c.nextPage();
    expect(c.skip()).toBe(20);
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 20, {}, undefined, 'ADR002');
  });

  it('clearing the finder clears the Name column filter', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    vi.useFakeTimers();
    c.onEntitySearchPick({ name: 'ADR002' } as Entity);
    vi.advanceTimersByTime(250);
    api.listEntities.mockClear();
    c.onEntitySearchClear();
    vi.advanceTimersByTime(250);
    vi.useRealTimers();
    expect(c.search()).toBe('');
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, undefined);
  });

  it('setSort cycles a column desc → asc → back to default, passing the sort to the API each time', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listEntities.mockClear();

    c.setSort('name');
    expect(c.sortState('name')).toBe('desc');
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, { field: 'name', dir: 'desc' }, undefined);

    c.setSort('name');
    expect(c.sortState('name')).toBe('asc');
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, { field: 'name', dir: 'asc' }, undefined);

    c.setSort('name');
    expect(c.sortState('name')).toBeNull();
    // Back to the endpoint's default order — no sort param.
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, undefined);
  });

  it('sorting a different column starts it at desc and drops the previous column', () => {
    const c = make().componentInstance;
    c.setSort('name');
    c.setSort('createdAt');
    expect(c.sortState('name')).toBeNull();
    expect(c.sortState('createdAt')).toBe('desc');
  });

  it('changing the sort resets paging to the first page', () => {
    const c = make().componentInstance;
    c.nextPage();
    expect(c.skip()).toBe(20);
    c.setSort('name');
    expect(c.skip()).toBe(0);
  });

  it('the docked Type header filter narrows the list from page 1 (server type param)', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    c.nextPage();
    api.listEntities.mockClear();
    c.setTypeFilter('person');
    expect(c.recordFilter().type).toBe('person');
    expect(c.skip()).toBe(0);
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, { type: 'person' }, undefined, undefined);
  });

  it('the docked Tags header filter trims and narrows the list from page 1 (server tag param)', () => {
    const c = make().componentInstance;
    api.listEntities.mockClear();
    c.setTagFilter('  urgent  ');
    expect(c.recordFilter().tag).toBe('urgent');
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, { tag: 'urgent' }, undefined, undefined);
  });

  it('clearing the docked Type filter drops the param (empty string = no filter)', () => {
    const c = make().componentInstance;
    c.setTypeFilter('person');
    api.listEntities.mockClear();
    c.setTypeFilter('');
    expect(c.recordFilter().type).toBe('');
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, undefined);
  });

  it('the docked freetext filter updates immediately but DEBOUNCES the reload, then sends ?search= from page 1', () => {
    vi.useFakeTimers();
    try {
      const c = make().componentInstance;
      c.nextPage();
      api.listEntities.mockClear();
      c.setSearchFilter('kuber');
      expect(c.search()).toBe('kuber');                 // value is immediate
      expect(api.listEntities).not.toHaveBeenCalled();  // reload is debounced
      vi.advanceTimersByTime(250);
      expect(c.skip()).toBe(0);                          // paging reset
      expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, 'kuber');
    } finally { vi.useRealTimers(); }
  });

  it('rapid typing collapses to a single reload with the final term (debounce)', () => {
    vi.useFakeTimers();
    try {
      const c = make().componentInstance;
      api.listEntities.mockClear();
      c.setSearchFilter('k'); vi.advanceTimersByTime(100);
      c.setSearchFilter('ku'); vi.advanceTimersByTime(100);
      c.setSearchFilter('kub'); vi.advanceTimersByTime(250);
      expect(api.listEntities).toHaveBeenCalledTimes(1);
      expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, 'kub');
    } finally { vi.useRealTimers(); }
  });

  it('a blank/whitespace freetext filter sends no ?search= param', () => {
    vi.useFakeTimers();
    try {
      const c = make().componentInstance;
      api.listEntities.mockClear();
      c.setSearchFilter('   ');
      vi.advanceTimersByTime(250);
      expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 0, {}, undefined, undefined);
    } finally { vi.useRealTimers(); }
  });
});
