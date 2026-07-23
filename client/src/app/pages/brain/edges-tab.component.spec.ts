/**
 * EdgesTabComponent — edge create/edit/delete/load behaviour, relocated from
 * brain.component.records.spec.ts (A17.9b-6b) when the tab became its own component (A17.9b-6f), plus
 * the self-loading wiring. Edge deltas: create/edit strip empty optional props; delete does NOT refresh
 * stats, so it does NOT emit `mutated` (asymmetry with memory/entity).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import type { Edge } from '../../core/api.types';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordListState } from './record-list-state.service';
import { EdgesTabComponent } from './edges-tab.component';

const api = {
  listEdges: vi.fn(() => of({ edges: [] as Edge[] })),
  getEntitiesByIds: vi.fn(() => of({ entities: [] })),
  createEdge: vi.fn(() => of({ _id: 'new' } as Edge)),
  updateEdge: vi.fn((_s: string, id: string) => of({ _id: id, label: 'UPDATED' } as Edge)),
  deleteEdge: vi.fn(() => of({})),
  recallBrain: vi.fn(() => of({ results: [], count: 0 })),
};

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EdgesTabComponent, getTranslocoModule()],
    providers: [
      RecordListState, BrainStore, EntityRefPicker, RecordDrawerState,
      { provide: BrainApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(EdgesTabComponent);
  fixture.componentRef.setInput('spaceId', 'work');
  fixture.detectChanges();
  return fixture;
}

beforeEach(() => { for (const fn of Object.values(api)) (fn as any).mockClear(); });

describe('EdgesTabComponent', () => {
  it('is compiled as OnPush', () => {
    expect(EdgesTabComponent.ɵcmp?.onPush).toBe(true);
  });

  it('self-loads on the spaceId input', () => {
    make();
    expect(api.listEdges).toHaveBeenCalledWith('work', 20, 0, {}, undefined);
  });

  // CHARACTERIZATION (pins semantic recall before slice 2b-iii-b touches the search bars): switching
  // to Semantic mode with a query must hit recallBrain({types:['edge']}), NOT the plain list. If a
  // later freetext-filter change routes semantic through the list endpoint, this fails loudly.
  it('Semantic search mode issues a recall (not a plain list) for edges', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    api.listEdges.mockClear();
    api.recallBrain.mockClear();
    c.store.edgeSearch.set('mentor');
    c.setEdgeSearchMode('semantic');
    expect(api.recallBrain).toHaveBeenCalledWith('work', { query: 'mentor', types: ['edge'], topK: 20 });
    expect(api.listEdges).not.toHaveBeenCalled();
  });

  it('createEdge requires from+to+label, spreads weight only when set, and emits mutated', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    const mutated = vi.fn();
    c.mutated.subscribe(mutated);
    c.edgeForm = { from: 'a', fromDisplay: '', to: 'b', toDisplay: '', label: 'knows', weight: null, tags: [], description: '', properties: {} };
    c.createEdge();
    expect(api.createEdge).toHaveBeenCalledWith('work', { from: 'a', to: 'b', label: 'knows' });
    expect(mutated).toHaveBeenCalled();
  });

  it('createEdge is a no-op when from/to/label are incomplete', () => {
    const c = make().componentInstance;
    c.edgeForm = { from: 'a', fromDisplay: '', to: '', toDisplay: '', label: 'knows', weight: null, tags: [], description: '', properties: {} };
    c.createEdge();
    expect(api.createEdge).not.toHaveBeenCalled();
  });

  it('saveEditEdge sends label/tags/description (+weight when set), clears editingId, patches store', () => {
    const c = make().componentInstance;
    c.store.edges.set([{ _id: 'x1', label: 'old' } as Edge]);
    c.recordList.editingId.set('x1');
    c.editEdge = { from: 'a', to: 'b', fromName: undefined, toName: undefined, label: ' knows ', weight: 0.5, tags: ['t'], description: ' d ', properties: {} };
    c.saveEditEdge('x1');
    expect(api.updateEdge).toHaveBeenCalledWith('work', 'x1', { label: 'knows', tags: ['t'], description: 'd', weight: 0.5 });
    expect(c.recordList.editingId()).toBe('');
    expect(c.store.edges()[0].label).toBe('UPDATED');
  });

  it('deleteEdge removes from the store and clears confirmDeleteId but does NOT emit mutated (no stats refresh)', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    const mutated = vi.fn();
    c.mutated.subscribe(mutated);
    c.store.edges.set([{ _id: 'x1' } as Edge, { _id: 'x2' } as Edge]);
    c.recordList.confirmDeleteId.set('x1');
    c.deleteEdge('x1');
    expect(c.store.edges().map(e => e._id)).toEqual(['x2']);
    expect(c.recordList.confirmDeleteId()).toBe('');
    expect(mutated).not.toHaveBeenCalled(); // the asymmetry
  });

  it('pickEdgeFrom / pickEdgeTo set the endpoint id + display without touching the name cache', () => {
    const c = make().componentInstance;
    c.pickEdgeFrom({ _id: 'e1', name: 'Alice' } as any);
    c.pickEdgeTo({ _id: 'e2', name: 'Bob' } as any);
    expect(c.edgeForm.from).toBe('e1');
    expect(c.edgeForm.fromDisplay).toBe('Alice');
    expect(c.edgeForm.to).toBe('e2');
    expect(c.edgeForm.toDisplay).toBe('Bob');
    expect(c.picker.entityNameCache()['e1']).toBeUndefined();
  });
});
