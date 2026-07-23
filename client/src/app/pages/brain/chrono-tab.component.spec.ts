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

  it('createChrono resolves a __custom__ kind to the free-text customKind and ISO-encodes startsAt', () => {
    const c = make().componentInstance;
    c.chronoForm = { title: 'T', kind: '__custom__', customKind: ' launch ', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '' };
    c.createChrono();
    const [, body] = api.createChrono.mock.calls[0];
    expect(body.title).toBe('T');
    expect(body.type).toBe('launch');
    expect(body.startsAt).toBe(new Date('2026-03-04T09:07').toISOString());
    expect('endsAt' in body).toBe(false);
  });

  it('createChrono is a no-op without a title or startsAt', () => {
    const c = make().componentInstance;
    c.chronoForm = { title: '', kind: 'event', customKind: '', startsAt: '2026-03-04T09:07', endsAt: '', description: '', tags: [], entityIds: '' };
    c.createChrono();
    expect(api.createChrono).not.toHaveBeenCalled();
  });

  it('saveEditChrono uses editChrono.kind directly as type (NO __custom__ resolution) and clears editingId', () => {
    const c = make().componentInstance;
    c.store.chrono.set([{ _id: 'c1' } as ChronoEntry]);
    c.recordList.editingId.set('c1');
    c.editChrono = { title: 'T', kind: '__custom__', status: 'active', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '' };
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
