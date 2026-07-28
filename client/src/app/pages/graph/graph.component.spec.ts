/**
 * GraphComponent — verifies the OnPush conversion (P5, final slice).
 *
 * Graph is the highest-value and highest-risk P5 target: a cytoscape canvas whose event handlers
 * fire OUTSIDE Angular. The conversion is safe because the handlers that touch Angular state write
 * signals (`selectedNode`/`selectedEdge`/…), and signal writes notify OnPush regardless of zone. The
 * tests below drive those signals directly — simulating what a node/edge tap does — and assert the
 * side panels render, which is the property that would break if a handler wrote a plain field
 * instead. The drawer test additionally pins the plain-field/signal coupling (same shape as brain).
 *
 * cytoscape is mocked: it renders to a real canvas, which jsdom does not provide. The mock is a
 * chainable no-op so `ngAfterViewInit → initCytoscape()` runs without a DOM canvas; the OnPush
 * behaviour under test lives entirely in Angular's signal → change-detection path, not in cytoscape.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

vi.mock('cytoscape', () => {
  const chain: any = new Proxy(() => chain, { get: () => () => chain });
  return { default: () => chain };
});

import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { AuthApi } from '../../core/auth-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { RecordDrawerState } from '../brain/record-drawer-state.service';
import { GraphComponent } from './graph.component';

function makeApi() {
  return {
    getMe: () => of({ readOnly: false }),
    listSpaces: () => of({ spaces: [] }),
    // The page feeds `BrainStore.spaceMeta` so the shared drawer's property editors get their schema.
    getSpaceMeta: () => of({ typeSchemas: {} }),
  } as any;
}

describe('GraphComponent (OnPush)', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [GraphComponent, getTranslocoModule()],
      providers: [
        { provide: SpacesApi, useValue: makeApi() },
        { provide: BrainApi, useValue: makeApi() },
        { provide: AuthApi, useValue: makeApi() },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    });
    const fixture = TestBed.createComponent(GraphComponent);
    fixture.componentRef.setInput('embeddedSpaceId', 'work'); // embedded path: skip listSpaces
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit (cytoscape mocked)
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(GraphComponent.ɵcmp?.onPush).toBe(true);
  });

  it('renders the node side panel when selectedNode is set (the signal a cytoscape tap writes)', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.side-panel')).toBeNull();

    // This is exactly what the `cy.on('tap','node')` handler does — write the signal.
    c.selectedNode.set({ _id: 'n1', name: 'Ada Lovelace', type: 'person', depth: 1 } as any);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.side-panel');
    expect(panel, 'the side panel should open on selectedNode').toBeTruthy();
    expect(panel.querySelector('h3').textContent).toContain('Ada Lovelace');
  });

  it('closes the side panel when selectedNode is cleared (background-tap path)', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.selectedNode.set({ _id: 'n1', name: 'Node', type: 'x', depth: 1 } as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.side-panel')).toBeTruthy();

    c.selectedNode.set(null); // what the background-tap handler does
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.side-panel')).toBeNull();
  });

  it('opens the SHARED record drawer, whose plain form model renders under this page\'s OnPush', () => {
    // The page no longer forks the drawer — `openBrainDrawer` delegates to `RecordDrawerState.open()`.
    // The coupling under test is unchanged and still load-bearing: `open()` writes the `drawerRecord`
    // SIGNAL (which guards the drawer's @if) and the plain `drawerEditMemory` field in the same turn,
    // and the title binds the PLAIN field. Drop the sibling signal write and this renders empty.
    //
    // Asserting through the shared drawer's own markup (`.drawer`/`.drawer-title`) is the point: it is
    // what proves the reuse is real rather than a renamed copy.
    const fixture = create();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    c.openBrainDrawer('memory', { _id: 'm1', fact: 'a graph-drawer fact', tags: [], entityIds: [], properties: {} });
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('.drawer');
    expect(drawer, 'the drawer should be open').toBeTruthy();
    expect((fixture.nativeElement.querySelector('.drawer-title') as HTMLElement).textContent)
      .toContain('a graph-drawer fact');
  });

  it('patches the node panel list when the shared drawer saves (the store it patches is not this page\'s)', () => {
    // The drawer updates `BrainStore.memories`, which this page never renders — it keeps its own
    // per-node arrays. Without the `lastSaved` bridge a save would succeed and leave the pre-save row
    // on screen: a silent staleness that no error and no drawer-side test can see.
    const fixture = create();
    const c = fixture.componentInstance;
    c.nodeMemories.set([{ _id: 'm1', fact: 'before' } as any]);

    // From the COMPONENT's injector, not TestBed's — the page provides its own drawer collaborators.
    const drawerState = fixture.debugElement.injector.get(RecordDrawerState);
    drawerState.lastSaved.set({ kind: 'memory', record: { _id: 'm1', fact: 'after' } });
    fixture.detectChanges();

    expect(c.nodeMemories()[0].fact).toBe('after');
  });
});
