/**
 * ChronoTabComponent — chrono create/edit/delete/load behaviour, relocated from
 * brain.component.records.spec.ts (A17.9b-6b) when the tab became its own component (A17.9b-6g), plus
 * self-load. Chrono deltas: create resolves a `__custom__` kind while inline-edit sends the kind
 * verbatim; it has NO `mutated` output (chrono create/delete never refreshed the space stats).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import type { ChronoEntry } from '../../core/api.types';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordListState } from './record-list-state.service';
import { ChronoTabComponent } from './chrono-tab.component';

const api = {
  listChrono: vi.fn(() => of({ chrono: [] as ChronoEntry[] })),
  getEntitiesByIds: vi.fn(() => of({ entities: [] })),
  createChrono: vi.fn(() => of({ _id: 'new' } as ChronoEntry)),
  updateChrono: vi.fn((_s: string, id: string) => of({ _id: id, title: 'UPDATED' } as ChronoEntry)),
  deleteChrono: vi.fn(() => of({})),
  recallBrain: vi.fn(() => of({ results: [], count: 0 })),
};

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ChronoTabComponent, getTranslocoModule()],
    providers: [
      RecordListState, BrainStore, EntityRefPicker, RecordDrawerState,
      { provide: BrainApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(ChronoTabComponent);
  fixture.componentRef.setInput('spaceId', 'work');
  fixture.detectChanges();
  return fixture;
}

beforeEach(() => { for (const fn of Object.values(api)) (fn as any).mockClear(); });

describe('ChronoTabComponent', () => {
  it('is compiled as OnPush', () => {
    expect(ChronoTabComponent.ɵcmp?.onPush).toBe(true);
  });

  it('self-loads on the spaceId input', () => {
    make();
    expect(api.listChrono).toHaveBeenCalledWith('work', 20, 0, {}, undefined);
  });

  // CHARACTERIZATION (pins semantic recall through the 2b-iii-c demotion — the top bar is now
  // semantic-only): typing in the bar must issue recallBrain({types:['chrono']}) after the debounce,
  // never the plain list. If a later change routes the top bar through the list endpoint, this fails.
  it('the semantic top bar issues a recall (not a plain list) for chrono', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listChrono.mockClear();
    api.recallBrain.mockClear();
    vi.useFakeTimers();
    c.onChronoSearch('launch');
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    expect(api.recallBrain).toHaveBeenCalledWith('work', { query: 'launch', types: ['chrono'], topK: 20 });
    expect(api.listChrono).not.toHaveBeenCalled();
  });

  // Clearing the semantic bar restores the normal paginated list (a plain list call, no recall).
  it('clearing the semantic bar reloads the plain list', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listChrono.mockClear();
    api.recallBrain.mockClear();
    c.onChronoSearch('');
    expect(api.listChrono).toHaveBeenCalledWith('work', 20, 0, {}, undefined);
    expect(api.recallBrain).not.toHaveBeenCalled();
  });

  // 2b-iii-c gave chrono the docked Title column freetext filter (like memories/edges): a debounced
  // server-side substring via the list endpoint's `search`, NOT the top-bar (which is semantic now).
  it('the Title column freetext filter feeds the list endpoint search (debounced)', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listChrono.mockClear();
    vi.useFakeTimers();
    c.setSearchFilter('launch');
    vi.advanceTimersByTime(250);
    vi.useRealTimers();
    expect(api.listChrono).toHaveBeenCalledWith('work', 20, 0, { search: 'launch' }, undefined);
  });

  it('createChrono resolves a __custom__ kind to the free-text customKind and ISO-encodes startsAt', () => {
    const c = make().componentInstance;
    c.chronoForm = { title: 'T', kind: '__custom__', customKind: ' launch ', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
    c.createChrono();
    const [, body] = api.createChrono.mock.calls[0];
    expect(body.title).toBe('T');
    expect(body.type).toBe('launch');
    expect(body.startsAt).toBe(new Date('2026-03-04T09:07').toISOString());
    expect('endsAt' in body).toBe(false);
  });

  // Slice 3c: linked memoryIds (from the inline memory picker) ride the create payload; omitted when empty.
  it('createChrono includes memoryIds when the memory picker has linked some (omitted when empty)', () => {
    const c = make().componentInstance;
    c.chronoForm = { title: 'T', kind: 'event', customKind: '', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: ['m1', 'm2'], properties: {} };
    c.createChrono();
    expect(api.createChrono.mock.calls[0][1].memoryIds).toEqual(['m1', 'm2']);
    api.createChrono.mockClear();
    c.chronoForm = { title: 'T', kind: 'event', customKind: '', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
    c.createChrono();
    expect('memoryIds' in api.createChrono.mock.calls[0][1]).toBe(false);
  });

  // Chrono properties editor (client-only gap fix): schema-defined properties ride the create payload,
  // stripped of empty optionals, and are omitted entirely when nothing is set.
  it('createChrono includes non-empty properties (omitted when empty)', () => {
    const c = make().componentInstance;
    c.chronoForm = { title: 'T', kind: 'event', customKind: '', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: { severity: 'high', note: '' } };
    c.createChrono();
    // No schema loaded → stripEmptyOptionalProps passes values through; '' optionals stay only if no schema.
    expect(api.createChrono.mock.calls[0][1].properties).toEqual({ severity: 'high', note: '' });
    api.createChrono.mockClear();
    c.chronoForm = { title: 'T', kind: 'event', customKind: '', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
    c.createChrono();
    expect('properties' in api.createChrono.mock.calls[0][1]).toBe(false);
  });

  it('saveEditChrono sends properties from the inline editor', () => {
    const c = make().componentInstance;
    c.store.chrono.set([{ _id: 'c1' } as ChronoEntry]);
    c.recordList.editingId.set('c1');
    c.editChrono = { title: 'T', kind: 'event', status: 'active', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: { owner: 'ada' } };
    c.saveEditChrono('c1');
    expect(api.updateChrono.mock.calls[0][2].properties).toEqual({ owner: 'ada' });
  });

  it('changing the create-form kind reseeds properties from the new kind schema', () => {
    const c = make().componentInstance;
    // With a schema for 'deadline', switching kind seeds its keys with typed defaults.
    c.store.spaceMeta.set({ typeSchemas: { chrono: { deadline: { propertySchemas: { dueBy: { type: 'string' } } } } } } as never);
    c.chronoForm = { title: '', kind: 'deadline', customKind: '', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
    c.onChronoFormKindChange();
    expect(c.chronoForm.properties).toEqual({ dueBy: '' });
  });

  it('createChrono is a no-op without a title or startsAt', () => {
    const c = make().componentInstance;
    c.chronoForm = { title: '', kind: 'event', customKind: '', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
    c.createChrono();
    expect(api.createChrono).not.toHaveBeenCalled();
  });

  it('saveEditChrono uses editChrono.kind directly as type (NO __custom__ resolution) and clears editingId', () => {
    const c = make().componentInstance;
    c.store.chrono.set([{ _id: 'c1' } as ChronoEntry]);
    c.recordList.editingId.set('c1');
    c.editChrono = { title: 'T', kind: '__custom__', status: 'active', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '', memoryIds: [], properties: {} };
    c.saveEditChrono('c1');
    const [, , body] = api.updateChrono.mock.calls[0];
    expect(body.type).toBe('__custom__'); // sent verbatim, unlike createChrono
    expect(c.recordList.editingId()).toBe('');
    expect(c.store.chrono()[0].title).toBe('UPDATED');
  });

  it('deleteChrono removes from the store and clears confirmDeleteId', () => {
    const c = make().componentInstance;
    c.store.chrono.set([{ _id: 'c1' } as ChronoEntry, { _id: 'c2' } as ChronoEntry]);
    c.recordList.confirmDeleteId.set('c1');
    c.deleteChrono('c1');
    expect(c.store.chrono().map(x => x._id)).toEqual(['c2']);
    expect(c.recordList.confirmDeleteId()).toBe('');
  });
});
