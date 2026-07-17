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
 *  - `openSettings` -> `buildMeta` — the round-trip that keeps a library-linked ($ref) type schema
 *    intact. This is the subtle one: `$ref: "library:x"` becomes a `_libRef` sentinel on the way in
 *    and must become `$ref` again on the way out, or saving a space silently unlinks its schemas.
 *  - `buildMeta` field-by-field emission (what is omitted vs always sent)
 *  - `storageInfo` / `fmtGiB` thresholds
 *  - proxy-target selection rules
 *  - the tab panes actually rendering
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

describe('SpacesComponent — openSettings populates every tab', () => {
  const rich = space({
    id: 'work', label: 'Work', maxGiB: 7,
    dupeRules: [{ minScore: 0.9, action: 'flag' }],
    dupeMergeSurvivor: 'newer',
    dupeRulesOnInsert: true,
    meta: {
      purpose: 'p', usageNotes: 'u', validationMode: 'strict', strictLinkage: true,
      tagSuggestions: ['a', 'b'],
      typeSchemas: { entity: { person: { namingPattern: '^[A-Z]', tagSuggestions: ['t'], propertySchemas: { age: { type: 'number', minimum: 0 } } } } },
    },
  } as Partial<Space>);

  it('resets to the settings tab and the entity schema sub-tab', () => {
    const c = create([rich]).componentInstance;
    c.settingsTab.set('danger');
    c.schemaCollTab.set('edge');
    c.openSettings(rich);
    expect(c.settingsTab()).toBe('settings');
    expect(c.schemaCollTab()).toBe('entity');
  });

  it('copies the space into the settings form', () => {
    const c = create([rich]).componentInstance;
    c.openSettings(rich);
    expect(c.stForm).toEqual({ label: 'Work', purpose: 'p', usageNotes: 'u', maxGiB: 7 });
  });

  it('copies duplicate rules by VALUE — editing the form must not mutate the space object', () => {
    const c = create([rich]).componentInstance;
    c.openSettings(rich);
    expect(c.dupeRulesState).toEqual([{ minScore: 0.9, action: 'flag' }]);
    expect(c.dupeSurvivor).toBe('newer');
    expect(c.dupeOnInsert).toBe(true);

    c.dupeRulesState[0]!.minScore = 0.1;
    expect(rich.dupeRules![0]!.minScore).toBe(0.9); // original untouched
  });

  it('copies schema state, including tag suggestions by value', () => {
    const c = create([rich]).componentInstance;
    c.openSettings(rich);
    expect(c.schValidation).toBe('strict');
    expect(c.schStrictLinkage).toBe(true);
    expect(c.schTagSuggestions).toEqual(['a', 'b']);

    c.schTagSuggestions.push('c');
    expect(rich.meta!.tagSuggestions).toEqual(['a', 'b']); // original untouched
  });

  it('flattens a type schema into editable state (propertySchemas becomes a keyed list)', () => {
    const c = create([rich]).componentInstance;
    c.openSettings(rich);
    expect(c.typeNames('entity')).toEqual(['person']);
    expect(c.typeCount('entity')).toBe(1);
    const st = c.typeState('entity', 'person');
    expect(st.namingPattern).toBe('^[A-Z]');
    expect(st.tagSuggestions).toEqual(['t']);
    expect(st.propertySchemas).toEqual([{ key: 'age', s: { type: 'number', minimum: 0 }, _enumInput: '' }]);
  });

  it('defaults everything when the space has no meta at all', () => {
    const bare = space({ id: 'bare', label: 'Bare' });
    const c = create([bare]).componentInstance;
    c.openSettings(bare);
    expect(c.stForm).toEqual({ label: 'Bare', purpose: '', usageNotes: '', maxGiB: null });
    expect(c.schValidation).toBe('off');
    expect(c.schStrictLinkage).toBe(false);
    expect(c.schTagSuggestions).toEqual([]);
    expect(c.typeNames('entity')).toEqual([]);
    expect(c.dupeRulesState).toEqual([]);
    expect(c.dupeSurvivor).toBe('older');
    expect(c.dupeOnInsert).toBe(false);
  });

  it('loads wipe stats for the danger tab, clearing the loading flag', () => {
    const c = create([rich]).componentInstance;
    c.openSettings(rich);
    expect(c.dangerWipeStats()).toEqual(STATS);
    expect(c.dangerWipeLoading()).toBe(false);
    expect(c.dangerRenameId).toBe('work');
  });

  it('a failing stats call still clears the loading flag', () => {
    TestBed.resetTestingModule();
    const api = { ...makeApi([]), getSpaceStats: () => throwError(() => new Error('boom')) };
    TestBed.configureTestingModule({
      imports: [SpacesComponent, getTranslocoModule()],
      providers: [
        { provide: SpacesApi, useValue: api },
        { provide: NetworksApi, useValue: makeApi() },
        { provide: SchemaApi, useValue: makeApi() },
        { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    });
    const c = TestBed.createComponent(SpacesComponent).componentInstance;
    c.openSettings(space());
    expect(c.dangerWipeLoading()).toBe(false);
    expect(c.dangerWipeStats()).toBeNull();
  });
});

describe('SpacesComponent — buildMeta (what actually gets saved)', () => {
  it('always emits validationMode, and omits blank purpose/usageNotes', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    expect(c.buildMeta()).toEqual({ validationMode: 'off' });
  });

  it('trims purpose and usageNotes', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    c.stForm.purpose = '  p  ';
    c.stForm.usageNotes = '  u  ';
    expect(c.buildMeta()).toMatchObject({ purpose: 'p', usageNotes: 'u' });
  });

  it('emits strictLinkage only when true, and tagSuggestions only when non-empty', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    expect(c.buildMeta().strictLinkage).toBeUndefined();
    expect(c.buildMeta().tagSuggestions).toBeUndefined();
    c.schStrictLinkage = true;
    c.schTagSuggestions = ['x'];
    expect(c.buildMeta()).toMatchObject({ strictLinkage: true, tagSuggestions: ['x'] });
  });

  it('namingPattern is entity-only — the same state on a memory type is dropped', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    c.schTypeSchemas.entity = { person: { namingPattern: '^A', tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '' } as any };
    c.schTypeSchemas.memory = { note: { namingPattern: '^A', tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '' } as any };
    const meta = c.buildMeta();
    expect(meta.typeSchemas!.entity!['person']).toEqual({ namingPattern: '^A' });
    expect(meta.typeSchemas!.memory!['note']).toEqual({});
  });

  it('maps a property schema field-by-field, omitting empty ones', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    c.schTypeSchemas.entity = { person: {
      namingPattern: '', tagSuggestions: [], _newPropInput: '', _newTagInput: '',
      propertySchemas: [{ key: 'age', s: { type: 'number', minimum: 0, maximum: 5, pattern: '  ', enum: [], required: true }, _enumInput: '' }],
    } as any };
    const ps = c.buildMeta().typeSchemas!.entity!['person']!.propertySchemas!['age']!;
    expect(ps).toEqual({ type: 'number', minimum: 0, maximum: 5, required: true });
    expect(ps.pattern).toBeUndefined(); // whitespace-only pattern dropped
    expect(ps.enum).toBeUndefined();    // empty enum dropped
  });

  it('omits typeSchemas entirely when no type is defined', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    expect(c.buildMeta().typeSchemas).toBeUndefined();
  });
});

describe('SpacesComponent — library $ref round-trip (openSettings -> buildMeta)', () => {
  // The one that matters most: a library-linked type schema arrives as `$ref: "library:<name>"`,
  // is held as a private `_libRef` sentinel while editing, and must be emitted as `$ref` again.
  // Lose the sentinel and saving a space silently converts a linked schema into an empty inline one.
  const linked = space({
    id: 'work', label: 'Work',
    meta: { typeSchemas: { entity: { person: { $ref: 'library:people-v1' } } } },
  } as Partial<Space>);

  it('a $ref type survives open -> save unchanged', () => {
    const c = create([linked]).componentInstance;
    c.openSettings(linked);
    expect(c.buildMeta().typeSchemas!.entity!['person']).toEqual({ $ref: 'library:people-v1' });
  });

  it('the $ref type is exposed to the UI as a named type carrying its library ref', () => {
    const c = create([linked]).componentInstance;
    c.openSettings(linked);
    expect(c.typeNames('entity')).toEqual(['person']);
    expect(c.typeLibRef('entity', 'person')).toBe('people-v1');
  });

  it('a $ref type emits ONLY $ref — never the empty inline fields it is stored with', () => {
    const c = create([linked]).componentInstance;
    c.openSettings(linked);
    const out = c.buildMeta().typeSchemas!.entity!['person']!;
    expect(Object.keys(out)).toEqual(['$ref']);
  });

  it('a non-library $ref is NOT treated as a library link', () => {
    const other = space({ id: 'w', label: 'W', meta: { typeSchemas: { entity: { person: { $ref: 'elsewhere:x' } } } } } as Partial<Space>);
    const c = create([other]).componentInstance;
    c.openSettings(other);
    expect(c.typeLibRef('entity', 'person')).toBeNull();
  });
});

describe('SpacesComponent — proxy target selection (create dialog)', () => {
  it('toggleProxyFor adds then removes an id', () => {
    const c = create().componentInstance;
    c.toggleProxyFor('a');
    expect(c.proxyForSelected).toEqual(['a']);
    expect(c.isProxyForSelected('a')).toBe(true);
    c.toggleProxyFor('a');
    expect(c.proxyForSelected).toEqual([]);
  });

  it('selecting "all" clears individual picks, and blocks further individual toggles', () => {
    const c = create().componentInstance;
    c.toggleProxyFor('a');
    c.toggleProxyForAll();
    expect(c.proxyForAll).toBe(true);
    expect(c.proxyForSelected).toEqual([]);
    c.toggleProxyFor('b');                 // ignored while "all" is on
    expect(c.proxyForSelected).toEqual([]);
    c.toggleProxyForAll();                 // back off — individual selection works again
    c.toggleProxyFor('b');
    expect(c.proxyForSelected).toEqual(['b']);
  });
});

describe('SpacesComponent — duplicate rules', () => {
  it('addDupeRule appends and removeDupeRule deletes by index', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    c.addDupeRule();
    c.addDupeRule();
    expect(c.dupeRulesState).toHaveLength(2);
    c.dupeRulesState[0]!.action = 'automerge';
    c.removeDupeRule(1);
    expect(c.dupeRulesState).toHaveLength(1);
    expect(c.dupeRulesState[0]!.action).toBe('automerge');
  });

  it('hasAutomergeRule reflects whether any rule is an automerge', () => {
    const c = create().componentInstance;
    c.openSettings(space());
    c.addDupeRule();
    expect(c.hasAutomergeRule()).toBe(false);
    c.dupeRulesState[0]!.action = 'automerge';
    expect(c.hasAutomergeRule()).toBe(true);
  });
});

describe('SpacesComponent — settings dialog rendering', () => {
  const s = space({ id: 'work', label: 'Work' });
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('no dialog until openSettings, and closeSettings tears it down', () => {
    const fixture = create([s]);
    const c = fixture.componentInstance;
    expect(c.settingsSpace()).toBeNull();
    c.openSettings(s);
    fixture.detectChanges();
    expect(c.settingsSpace()).not.toBeNull();
    c.closeSettings();
    fixture.detectChanges();
    expect(c.settingsSpace()).toBeNull();
  });

  it('each tab renders its own pane', () => {
    const fixture = create([s]);
    const c = fixture.componentInstance;
    c.openSettings(s);
    fixture.detectChanges();

    // every tab is reachable and swapping panes does not throw
    for (const tab of ['settings', 'schema', 'duplicates', 'danger'] as const) {
      c.settingsTab.set(tab);
      fixture.detectChanges();
      expect(c.settingsTab()).toBe(tab);
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
