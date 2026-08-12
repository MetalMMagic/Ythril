/**
 * QueryTabComponent — pins the query tab's OnPush contract and the pure result formatting, as it
 * moved out of BrainComponent (A17.9b-6a).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainApi } from '../../core/brain-api.service';
import { BrainStore } from './brain-store.service';
import { QueryTabComponent } from './query-tab.component';

function makeApi() {
  return {
    queryBrain: () => of({ results: [], count: 0 }),
    recallBrain: () => of({ results: [] }),
  } as any;
}

describe('QueryTabComponent', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [QueryTabComponent, getTranslocoModule()],
      providers: [
        BrainStore,
        { provide: BrainApi, useValue: makeApi() },
      ],
    });
    const fixture = TestBed.createComponent(QueryTabComponent);
    fixture.componentRef.setInput('spaceId', 'work');
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(QueryTabComponent.ɵcmp?.onPush).toBe(true);
  });

  it('formatQueryDoc pretty-prints a document as 2-space JSON', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    expect(c.formatQueryDoc({ a: 1, b: 'x' })).toBe('{\n  "a": 1,\n  "b": "x"\n}');
  });

  it('renders the query/recall panel', () => {
    const fixture = create();
    const panel = fixture.nativeElement.querySelector('.query-panel');
    expect(panel, 'the query panel should render').toBeTruthy();
  });

  it('runRecall is a no-op for a blank query (no API call)', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.recallForm.query = '   ';
    c.runRecall();
    expect(c.recallRunning()).toBe(false);
    expect(c.recallResults()).toEqual([]);
  });

  it('runQuery surfaces an invalid-JSON filter as a form error rather than calling the API', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.queryForm.filter = '{ not valid json ';
    c.runQuery();
    expect(c.queryFilterError()).toContain('Invalid JSON');
    expect(c.queryRunning()).toBe(false);
  });
});

/**
 * The recall panel is the only surface that exposes what MCP's `recall` accepts, and two of its parameters
 * were reachable through the REST route and declared nowhere on the client: `traverse` (graph expansion) and
 * `maxTimeMS` (the partial-answer deadline). A third gap was the jump the entities and edges tabs already
 * offer — a recall hit for an entity had no way into the graph.
 */
describe('QueryTabComponent — recall parameter coverage', () => {
  let sent: Record<string, unknown> | null;

  function create() {
    sent = null;
    TestBed.configureTestingModule({
      imports: [QueryTabComponent, getTranslocoModule()],
      providers: [
        BrainStore,
        { provide: BrainApi, useValue: {
          queryBrain: () => of({ results: [], count: 0 }),
          recallBrain: (_s: string, body: Record<string, unknown>) => { sent = body; return of({ results: [] }); },
        } as any },
      ],
    });
    const fixture = TestBed.createComponent(QueryTabComponent);
    fixture.componentRef.setInput('spaceId', 'work');
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('sends traverse and maxTimeMS when set', () => {
    const c = create().componentInstance;
    c.recallForm.query = 'auth token scoping';
    c.recallForm.traverse = 2;
    c.recallForm.maxTimeMS = 1500;
    c.runRecall();
    expect(sent!['traverse']).toBe(2);
    expect(sent!['maxTimeMS']).toBe(1500);
  });

  it('omits both at 0 — a zero deadline is not a legal value and traverse 0 is the server default', () => {
    const c = create().componentInstance;
    c.recallForm.query = 'q';
    c.runRecall();
    expect('traverse' in sent!).toBe(false);
    expect('maxTimeMS' in sent!).toBe(false);
  });

  it('graphTargetOf gives entities their own id and edges the entity they start from', () => {
    const c = create().componentInstance;
    expect(c.graphTargetOf({ type: 'entity', _id: 'e1' } as never)).toBe('e1');
    expect(c.graphTargetOf({ type: 'edge', from: 'e2', _id: 'edge1' } as never)).toBe('e2');
  });

  it('graphTargetOf refuses a hit with no node, so no button is offered', () => {
    const c = create().componentInstance;
    expect(c.graphTargetOf({ type: 'memory', _id: 'm1' } as never)).toBe(null);
    expect(c.graphTargetOf({ type: 'chrono', _id: 'c1' } as never)).toBe(null);
    expect(c.graphTargetOf({ type: 'file', _id: 'f1' } as never)).toBe(null);
    expect(c.graphTargetOf({ type: 'entity' } as never)).toBe(null);      // no id at all
    expect(c.graphTargetOf({ type: 'entity', _id: '' } as never)).toBe(null);
  });

  it('an entity hit renders the view-in-graph button and emits the id', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    let emitted: string | null = null;
    c.viewInGraph.subscribe((id: string) => { emitted = id; });
    c.recallResults.set([{ type: 'entity', score: 0.9, _id: 'e1', name: 'Ada' } as never]);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[aria-label="common.viewInGraph"]');
    expect(btn, 'an entity recall hit should offer the graph jump').toBeTruthy();
    btn.click();
    expect(emitted).toBe('e1');
  });

  it('a memory hit renders NO view-in-graph button', () => {
    const fixture = create();
    fixture.componentInstance.recallResults.set([{ type: 'memory', score: 0.9, _id: 'm1', fact: 'f' } as never]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[aria-label="common.viewInGraph"]')).toBeNull();
  });
});
