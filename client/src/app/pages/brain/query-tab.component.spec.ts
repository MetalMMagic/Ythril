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
