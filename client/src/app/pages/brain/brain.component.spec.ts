/**
 * BrainComponent — verifies the OnPush conversion (P5, slice 4).
 *
 * Brain is the heaviest page in the app (49 signals, five record tabs, a detail drawer). It is
 * OnPush-safe because every async path writes signals, which notify OnPush regardless of zone.
 *
 * The subtle part — and the reason the drawer test below exists — is that brain also renders plain,
 * NON-signal form models (`memoryForm`, `drawerEditMemory`, …) through ngModel. A plain-field write
 * does not mark an OnPush view dirty on its own; these render only because every write is
 * accompanied by a signal write in the same turn (`openDrawer` sets the `drawerRecord` signal; the
 * create callbacks set `creatingX`/`showXForm`) or happens inside a template event handler. That
 * coupling is load-bearing and invisible in the source, so it is pinned here: the drawer title binds
 * the plain `drawerEditMemory.fact`, and if the sibling signal write were ever dropped, the title
 * would render empty and this test would fail rather than the bug shipping silently.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiService, type Memory } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainComponent } from './brain.component';

function memory(fact: string, id = fact): Memory {
  return {
    _id: id,
    fact,
    tags: [],
    entityIds: [],
    properties: {},
    createdAt: '2026-07-14T10:00:00.000Z',
    seq: 1,
  } as unknown as Memory;
}

/** Read-only stub: brain's init cascade is listSpaces → getSpaceStats/getReindexStatus/getSpaceMeta. */
function makeApi() {
  return {
    listSpaces: () => of({ spaces: [{ id: 'work', label: 'Work' }] }),
    getSpaceStats: () => of({ memories: 0, entities: 0, edges: 0, chrono: 0, files: 0 }),
    getReindexStatus: () => of({ needsReindex: false }),
    getSpaceMeta: () => of({ tagSuggestions: [], typeSchemas: {} }),
    listMemories: () => of({ memories: [] }),
    getEntitiesByIds: () => of({ entities: [] }),
  } as unknown as ApiService;
}

describe('BrainComponent (OnPush)', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [BrainComponent, getTranslocoModule()],
      providers: [
        { provide: ApiService, useValue: makeApi() },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
      ],
    });
    const fixture = TestBed.createComponent(BrainComponent);
    fixture.detectChanges(); // ngOnInit → listSpaces resolves synchronously via of()
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(BrainComponent.ɵcmp?.onPush).toBe(true);
  });

  it('renders a row per memory on the memories tab (signal-driven view updates under OnPush)', () => {
    const fixture = create();
    const c = fixture.componentInstance;

    c.activeTab.set('memories');
    c.memories.set([memory('the sky is blue'), memory('water is wet')]);
    fixture.detectChanges();

    const body = (fixture.nativeElement.querySelector('table tbody') as HTMLElement).textContent ?? '';
    expect(body).toContain('the sky is blue');
    expect(body).toContain('water is wet');
  });

  it('re-renders the list when the memories signal is replaced', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    const body = () => (fixture.nativeElement.querySelector('table tbody') as HTMLElement).textContent ?? '';

    c.activeTab.set('memories');
    c.memories.set([memory('first fact')]);
    fixture.detectChanges();
    expect(body()).toContain('first fact');

    c.memories.set([memory('second fact')]);
    fixture.detectChanges();
    expect(body()).toContain('second fact');
    expect(body()).not.toContain('first fact');
  });

  it('opens the detail drawer AND renders its plain (non-signal) form model', async () => {
    // The load-bearing case. `openDrawer` writes the `drawerRecord` SIGNAL (which marks the OnPush
    // view dirty) and the plain `drawerEditMemory` field in the same turn. The drawer title binds
    // that plain field — so this asserts the plain-field write is actually picked up by the CD pass
    // the signal write scheduled. Drop the sibling signal write and this goes blank.
    const fixture = create();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    c.openDrawer('memory', { _id: 'm1', fact: 'a load-bearing fact', tags: [], entityIds: [], properties: {} });
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('.drawer');
    expect(drawer, 'the drawer should be open').toBeTruthy();
    const title = fixture.nativeElement.querySelector('.drawer-title') as HTMLElement;
    expect(title.textContent).toContain('a load-bearing fact');

    // And the ngModel-bound textarea reflects the same plain field. ngModel writes its DOM value in
    // a microtask, so let that settle before reading it.
    await fixture.whenStable();
    const textarea = drawer.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('a load-bearing fact');
  });

  it('edits the description in a multiline <textarea> (F7), preserving newlines', async () => {
    // F7 swapped the single-line description <input> for a <textarea rows=3>. A record whose
    // description spans several lines must round-trip those newlines into the editor.
    const fixture = create();
    const c = fixture.componentInstance;
    const multiline = 'line one\nline two\nline three';

    c.openDrawer('memory', {
      _id: 'm1', fact: 'f', description: multiline, tags: [], entityIds: [], properties: {},
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const descField = fixture.nativeElement.querySelector(
      '.drawer textarea[name="drwMemDesc"]',
    ) as HTMLTextAreaElement | null;
    // It must be a textarea (not the old input), and it must keep the newlines.
    expect(descField, 'description should be a <textarea>').toBeTruthy();
    expect(descField!.tagName).toBe('TEXTAREA');
    expect(descField!.value).toBe(multiline);
  });

  it('clamps the memories description cell with the multiline-friendly .desc-cell class (F7)', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.activeTab.set('memories');
    c.memories.set([{ ...memory('a fact'), description: 'x\ny' } as Memory]);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('table tbody .desc-cell') as HTMLElement | null;
    expect(cell, 'the description cell should use .desc-cell').toBeTruthy();
    // pre-wrap (via the class) is what lets the newline render instead of collapsing.
    expect(getComputedStyle(cell!).whiteSpace).toBe('pre-wrap');
  });

  // ── F8: network-membership indicator on space chips ────────────────────────
  const setSpaces = (fixture: ReturnType<typeof create>, spaceView: Record<string, unknown>) => {
    fixture.componentInstance.spaces.set([spaceView as never]);
    fixture.detectChanges();
  };
  const netIcon = (fixture: ReturnType<typeof create>) =>
    fixture.nativeElement.querySelector('.space-chip .space-chip-net') as HTMLElement | null;

  it('shows NO network indicator for a space in no network (F8)', () => {
    const fixture = create();
    setSpaces(fixture, { space: { id: 'work', label: 'Work' } });
    expect(netIcon(fixture)).toBeNull();
  });

  it('renders the network indicator with a status-specific class per state (F8)', () => {
    const fixture = create();
    for (const status of ['idle', 'syncing', 'degraded', 'vote'] as const) {
      setSpaces(fixture, {
        space: { id: 'work', label: 'Work', networkStatus: status, networks: [{ id: 'n1', label: 'Braintree', type: 'braintree' }] },
      });
      const icon = netIcon(fixture);
      expect(icon, `indicator should render for status=${status}`).toBeTruthy();
      expect(icon!.classList.contains(`net-${status}`)).toBe(true);
      // Uses the same glyph as the Networks nav item (ph-icon name="link").
      expect(icon!.querySelector('ph-icon')).toBeTruthy();
    }
  });

  it('the indicator tooltip names the network and the status (F8, a11y — colour is not the only signal)', () => {
    const fixture = create();
    setSpaces(fixture, {
      space: { id: 'work', label: 'Work', networkStatus: 'vote', networks: [{ id: 'n1', label: 'Braintree', type: 'braintree' }] },
    });
    const title = netIcon(fixture)!.getAttribute('title') ?? '';
    expect(title).toContain('Braintree');
    // Test transloco renders raw keys, so the status word resolves to its key.
    expect(title).toContain('brain.spaceChip.network.vote');
  });
});
