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

import { ApiService } from '../../core/api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { GraphComponent } from './graph.component';

function makeApi() {
  return {
    getMe: () => of({ readOnly: false }),
    listSpaces: () => of({ spaces: [] }),
  } as unknown as ApiService;
}

describe('GraphComponent (OnPush)', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [GraphComponent, getTranslocoModule()],
      providers: [
        { provide: ApiService, useValue: makeApi() },
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

  it('opens the brain drawer and renders its plain (non-signal) form model', () => {
    // Same load-bearing coupling as brain: openBrainDrawer writes the drawerRecord SIGNAL (guards the
    // drawer @if) and the plain drawerEditMemory field in the same turn. The title binds the plain
    // field, so if the sibling signal write were dropped this would render empty rather than ship stale.
    const fixture = create();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    c.openBrainDrawer('memory', { _id: 'm1', fact: 'a graph-drawer fact', tags: [], entityIds: [], properties: {} });
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('.bdrawer-modal');
    expect(drawer, 'the drawer should be open').toBeTruthy();
    expect((fixture.nativeElement.querySelector('.bdrawer-title') as HTMLElement).textContent)
      .toContain('a graph-drawer fact');
  });
});
