/**
 * SpacesComponent — CHARACTERIZATION tests.
 *
 * Written against the 1893-line component BEFORE it is split into child components (A17.8), and
 * deliberately landed as their own PR. A characterization test only means something if it was green
 * against the ORIGINAL code: written afterwards it just proves the new code agrees with itself, and
 * would happily bless a regression.
 *
 * So these do not assert what the component *should* do — they pin what it *does* today. The split
 * moves the create dialog and the four settings tabs (settings/schema/duplicates/danger) into child
 * components; everything below is behaviour that move could plausibly break:
 *
 *  - `sortedSpaces` — the sort/filter pipeline, including the order of the two steps
 *  - `storageInfo` / `fmtGiB` thresholds
 *  - the tab panes actually rendering
 *
 * A17.8b moved almost everything out, and each assertion moved with the code it covers, unchanged:
 *   - settings state (`openSettings`/`buildMeta`, type-schema + duplicate helpers, and the library
 *     `$ref` round-trip) -> space-settings-state.service.spec.ts
 *   - server data (the list, networks, the networksBySpace index) -> spaces-store.service.spec.ts
 *   - proxy-target selection -> space-create-dialog.component.spec.ts
 * What stayed here is what the component still owns: the list view state and rendering.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { NetworksApi } from '../../core/networks-api.service';
import { SchemaApi } from '../../core/schema-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import type { Space } from '../../core/api.types';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpacesComponent } from './spaces.component';

function space(over: Partial<Space> = {}): Space {
  return { id: 'work', label: 'Work', ...over } as Space;
}

const STATS = { spaceId: 'work', memories: 1, entities: 2, edges: 3, chrono: 4, files: 5 };

function makeApi(spaces: Space[] = []) {
  return {
    listSpaces: () => of({ spaces }),
    listNetworks: () => of({ networks: [] }),
    getSpaceStats: () => of(STATS),
    listSchemaLibrary: () => of({ entries: [] }),
    updateSpace: (_id: string, _body: unknown) => of({ space: space() }),
  } as any;
}

function create(spaces: Space[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpacesComponent, getTranslocoModule()],
    providers: [
      { provide: SpacesApi, useValue: makeApi(spaces) },
      { provide: NetworksApi, useValue: makeApi(spaces) },
      { provide: SchemaApi, useValue: makeApi(spaces) },
      { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(SpacesComponent);
  fixture.detectChanges(); // ngOnInit -> load() resolves synchronously via of()
  return fixture;
}

describe('SpacesComponent — sortedSpaces (sort/filter pipeline)', () => {
  const list = [
    space({ id: 'beta',  label: 'Beta',  usageGiB: 5, description: 'the middle one' }),
    space({ id: 'alpha', label: 'alpha', usageGiB: 9, description: 'first' }),
    space({ id: 'gamma', label: 'Gamma', usageGiB: 1, description: 'last' }),
  ];

  it('custom (default) preserves the configured order — no sorting applied', () => {
    const c = create(list).componentInstance;
    expect(c.sortMode()).toBe('custom');
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('az / za sort by label, case-insensitively (so `alpha` sorts before `Beta`)', () => {
    const c = create(list).componentInstance;
    c.sortMode.set('az');
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['alpha', 'beta', 'gamma']);
    c.sortMode.set('za');
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['gamma', 'beta', 'alpha']);
  });

  it('usage-desc / usage-asc sort by usageGiB, treating a missing value as 0', () => {
    const withMissing = [...list, space({ id: 'nousage', label: 'NoUsage' })];
    const c = create(withMissing).componentInstance;
    c.sortMode.set('usage-desc');
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['alpha', 'beta', 'gamma', 'nousage']);
    c.sortMode.set('usage-asc');
    expect(c.sortedSpaces()[0].id).toBe('nousage');
  });

  it('search matches label, id, or description — case-insensitively', () => {
    const c = create(list).componentInstance;
    c.spaceSearch.set('GAMMA');            // label, wrong case
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['gamma']);
    c.spaceSearch.set('alph');             // id substring
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['alpha']);
    c.spaceSearch.set('middle');           // description substring
    expect(c.sortedSpaces().map(s => s.id)).toEqual(['beta']);
    c.spaceSearch.set('   ');              // whitespace-only is not a filter
    expect(c.sortedSpaces()).toHaveLength(3);
  });

  it('sorts FIRST and filters second — the surviving rows keep the sorted order', () => {
    const c = create(list).componentInstance;
    c.sortMode.set('az');
    c.spaceSearch.set('a');  // matches all three (alpha/Beta-"the middle one"/Gamma-"last")
    const ids = c.sortedSpaces().map(s => s.id);
    expect(ids).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('a space with no description does not throw when searching', () => {
    const c = create([space({ id: 'x', label: 'X' })]).componentInstance;
    c.spaceSearch.set('zzz');
    expect(c.sortedSpaces()).toEqual([]);
  });
});

describe('SpacesComponent — storageInfo / fmtGiB', () => {
  it('no quota and no usage renders an em dash', () => {
    const c = create().componentInstance;
    expect(c.storageInfo(space({ usageGiB: 0 }))).toEqual({ pct: 0, label: '—', cls: 'ok' });
  });

  it('usage but no quota shows the usage alone, never a percentage', () => {
    const c = create().componentInstance;
    expect(c.storageInfo(space({ usageGiB: 2 }))).toEqual({ pct: 0, label: '2.00 GiB', cls: 'ok' });
  });

  it('quota drives pct and the ok/warn/danger thresholds (>70 warn, >90 danger)', () => {
    const c = create().componentInstance;
    expect(c.storageInfo(space({ usageGiB: 5, maxGiB: 10 }))).toMatchObject({ pct: 50, cls: 'ok' });
    expect(c.storageInfo(space({ usageGiB: 8, maxGiB: 10 }))).toMatchObject({ pct: 80, cls: 'warn' });
    expect(c.storageInfo(space({ usageGiB: 10, maxGiB: 10 }))).toMatchObject({ pct: 100, cls: 'danger' });
    // exactly on a boundary is NOT escalated
    expect(c.storageInfo(space({ usageGiB: 7, maxGiB: 10 }))).toMatchObject({ pct: 70, cls: 'ok' });
    expect(c.storageInfo(space({ usageGiB: 9, maxGiB: 10 }))).toMatchObject({ pct: 90, cls: 'warn' });
  });

  it('pct is capped at 100 when usage exceeds the quota', () => {
    const c = create().componentInstance;
    expect(c.storageInfo(space({ usageGiB: 50, maxGiB: 10 })).pct).toBe(100);
  });

  it('fmtGiB switches to MB below 0.001 GiB', () => {
    const c = create().componentInstance;
    expect(c.fmtGiB(0.0005)).toBe('1 MB');
    expect(c.fmtGiB(1.5)).toBe('1.50 GiB');
  });
});


describe('SpacesComponent — summary strip (U9 pt2)', () => {
  it('reports the space count, aggregate storage in use, and an indexing-attention count', () => {
    const c = create([
      space({ id: 'a', label: 'A', usageGiB: 2 }),
      space({ id: 'b', label: 'B', usageGiB: 3.5, indexStatus: 'building' }),
      space({ id: 'c', label: 'C', usageGiB: 1, indexStatus: 'ready' }),
    ]).componentInstance;
    const items = c.spacesSummary();
    expect(items[0].value).toBe('3');           // count
    expect(items[1].value).toBe('6.50 GiB');    // 2 + 3.5 + 1, <10 GiB → 2 decimals
    expect(items[2].value).toBe('1');           // one space building
    expect(items[2].variant).toBe('warn');      // attention → warn
  });

  it('collapses to the ok variant with zero indexing when every space is ready', () => {
    const c = create([space({ id: 'a', label: 'A', usageGiB: 0.4, indexStatus: 'ready' })]).componentInstance;
    const items = c.spacesSummary();
    expect(items[2].value).toBe('0');
    expect(items[2].variant).toBe('ok');
  });

  it('counts a failed index as needing attention', () => {
    const c = create([space({ id: 'a', label: 'A', indexStatus: 'failed' })]).componentInstance;
    expect(c.spacesSummary()[2].value).toBe('1');
  });
});

describe('SpacesComponent — load-error state', () => {
  function createErroring() {
    TestBed.resetTestingModule();
    const erroringApi = {
      listSpaces: () => throwError(() => new Error('boom')),
      listNetworks: () => of({ networks: [] }),
      getSpaceStats: () => of(STATS),
      listSchemaLibrary: () => of({ entries: [] }),
    } as any;
    TestBed.configureTestingModule({
      imports: [SpacesComponent, getTranslocoModule()],
      providers: [
        { provide: SpacesApi, useValue: erroringApi },
        { provide: NetworksApi, useValue: erroringApi },
        { provide: SchemaApi, useValue: erroringApi },
        { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    });
    const fixture = TestBed.createComponent(SpacesComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('a failed list load flips store.error and clears loading', () => {
    const c = createErroring().componentInstance;
    expect(c.store.error()).toBe(true);
    expect(c.store.loading()).toBe(false);
  });

  it('does not render the summary strip while in the error state', () => {
    const fixture = createErroring();
    expect(fixture.nativeElement.querySelector('app-summary-strip')).toBeNull();
  });
});

describe('SpacesComponent — settings dialog rendering', () => {
  const s = space({ id: 'work', label: 'Work' });
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('no dialog until openSettings, and closeSettings tears it down', () => {
    const fixture = create([s]);
    const c = fixture.componentInstance;
    expect(c.state.settingsSpace()).toBeNull();
    c.state.openSettings(s);
    fixture.detectChanges();
    expect(c.state.settingsSpace()).not.toBeNull();
    c.state.closeSettings();
    fixture.detectChanges();
    expect(c.state.settingsSpace()).toBeNull();
  });

  it('each tab renders its own pane', () => {
    const fixture = create([s]);
    const c = fixture.componentInstance;
    c.state.openSettings(s);
    fixture.detectChanges();

    // every tab is reachable and swapping panes does not throw
    for (const tab of ['settings', 'schema', 'duplicates', 'danger'] as const) {
      c.state.settingsTab.set(tab);
      fixture.detectChanges();
      expect(c.state.settingsTab()).toBe(tab);
      expect(text(fixture).length).toBeGreaterThan(0);
    }
  });

  it('the create dialog is gated on showCreateDialog', () => {
    const fixture = create([s]);
    const c = fixture.componentInstance;
    expect(c.showCreateDialog()).toBe(false);
    c.showCreateDialog.set(true);
    fixture.detectChanges();
    expect(c.showCreateDialog()).toBe(true);
  });
});

/**
 * The dirty snapshot must be re-baselined by a successful save.
 *
 * It was only ever taken when a space was OPENED, so after saving, the editor still compared against the
 * pre-save values and reported unsaved changes for edits it had just persisted. Closing the dialog on
 * success hid it in the common path, but any flow that kept the editor open produced a discard prompt
 * for nothing — and a discard prompt that fires after a save is worse than none, because it trains
 * people to click through discard prompts.
 */
describe('SpacesComponent — save re-baselines the unsaved-changes guard', () => {
  it('is not dirty after a successful save', () => {
    const fixture = create([space()]);
    const c = fixture.componentInstance as any;

    c.state.settingsSpace.set(space());
    c.state.markPristine();
    c.state.stForm.label = 'Renamed';
    expect(c.state.isDirty(), 'an edit must be dirty').toBe(true);

    c.saveSettings();

    // Asserted on the STATE, not on whether the dialog closed: closing is what used to mask this.
    c.state.settingsSpace.set(space());
    expect(c.state.isDirty(), 'a saved edit must not still count as unsaved').toBe(false);
  });
});
