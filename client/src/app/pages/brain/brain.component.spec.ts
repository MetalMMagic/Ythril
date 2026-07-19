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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { FilesApi } from '../../core/files-api.service';
import { AuthService } from '../../core/auth.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { BrainComponent } from './brain.component';


/** Read-only stub: brain's init cascade is listSpaces → getSpaceStats/getReindexStatus/getSpaceMeta. */
function makeApi() {
  return {
    listSpaces: () => of({ spaces: [{ id: 'work', label: 'Work' }] }),
    getSpaceStats: () => of({ memories: 0, entities: 0, edges: 0, chrono: 0, files: 0 }),
    getReindexStatus: () => of({ needsReindex: false }),
    getSpaceMeta: () => of({ tagSuggestions: [], typeSchemas: {} }),
    listMemories: () => of({ memories: [] }),
    getEntitiesByIds: () => of({ entities: [] }),
    mintEventsTicket: () => of({ ticket: 't', expiresInMs: 60000 }),
  } as any;
}

describe('BrainComponent (OnPush)', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [BrainComponent, getTranslocoModule()],
      providers: [
        { provide: SpacesApi, useValue: makeApi() },
        { provide: BrainApi, useValue: makeApi() },
        { provide: FilesApi, useValue: makeApi() },
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

  // ── Regression: the mount⇄reload request storm (app-unusable P0) ─────────────
  // The five record tabs each WRITE `recordList.loading` during their own `load()`. They used to be
  // mounted inside the `@else` of `@if (recordList.loading())`, so a tab set loading=true on load,
  // which unmounted the tab (removing the @else branch); the response set loading=false, which
  // re-mounted it → a fresh `load()` → loading=true → … an infinite mount⇄reload loop that hammered
  // the API (~5 req/s, self-sustaining even once rate-limited to 429s) and froze the page. The fix:
  // tabs mount on `activeTab()` ALONE and the spinner floats on top, so the active tab instance is
  // never torn down by its own loading state. This test drives the shared loading signal the way a
  // real async load does and asserts the active tab is NOT re-created (its `load()` is not re-fired).
  it('does NOT re-create the active record tab when recordList.loading toggles (storm regression)', () => {
    const listEntities = vi.fn(() => of({ entities: [] }));
    TestBed.configureTestingModule({
      imports: [BrainComponent, getTranslocoModule()],
      providers: [
        { provide: SpacesApi, useValue: makeApi() },
        { provide: BrainApi, useValue: { ...makeApi(), listEntities } },
        { provide: FilesApi, useValue: makeApi() },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
      ],
    });
    const fixture = TestBed.createComponent(BrainComponent);
    fixture.detectChanges(); // ngOnInit → listSpaces → selectSpace('work')

    fixture.componentInstance.setTab('entities'); // mount the entities tab → it self-loads once
    fixture.detectChanges();
    const afterActivate = listEntities.mock.calls.length;
    expect(afterActivate).toBeGreaterThan(0);

    // Toggle the shared loading signal across change-detection cycles, exactly as an async load does.
    // On the buggy @else structure each false→true→false cycle unmounted+re-mounted the tab, adding a
    // fresh load() every time. On the fixed structure the tab persists, so the count must not grow.
    const recordList = fixture.componentInstance.recordList;
    for (let i = 0; i < 4; i++) {
      recordList.loading.set(true);
      fixture.detectChanges();
      recordList.loading.set(false);
      fixture.detectChanges();
    }
    expect(listEntities.mock.calls.length).toBe(afterActivate);
  });

  // The memories table rendering (row-per-memory, signal re-render) moved to
  // memories-tab.component.spec.ts when that tab became its own component (A17.9b-6d).

  // The detail-drawer rendering tests (open + plain-model, multiline description) moved to
  // record-drawer.component.spec.ts when the drawer became its own component (A17.9b-5).

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

  // The edge from/to endpoint pickers moved to edges-tab.component.spec.ts with the Edges tab (A17.9b-6f).
});
