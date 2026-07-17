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
    expect(api.listEntities).toHaveBeenCalledWith('work', 20, 0, {});
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

  it('the search bar reloads silently with the search term; nextPage advances skip', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listEntities.mockClear();
    c.onEntitySearchChange('ali');
    expect(api.listEntities).toHaveBeenCalledWith('work', 20, 0, { search: 'ali' });
    c.nextPage();
    expect(c.skip()).toBe(20);
    expect(api.listEntities).toHaveBeenLastCalledWith('work', 20, 20, { search: 'ali' });
  });
});
