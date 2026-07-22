/**
 * SpaceSettingsState — characterization tests, RELOCATED from spaces.component.spec.ts (A17.8b).
 *
 * These assertions are unchanged from the ones written against the original 1893-line
 * SpacesComponent (PR #237) and proven green there. Only the OWNER moved: `openSettings`,
 * `buildMeta`, the type-schema helpers and the duplicate-rule helpers now live on this service, so
 * the tests follow them. Nothing here was rewritten to make the refactor pass — the same inputs are
 * asserted to produce the same outputs, which is the whole point of having landed them first.
 *
 * They test a plain service now rather than a rendered component, so they run without TestBed
 * component fixtures. That is a side benefit of the extraction, not a change in what is covered.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { SpacesApi } from '../../core/spaces-api.service';
import type { Space } from '../../core/api.types';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpaceSettingsState } from './space-settings-state.service';

function space(over: Partial<Space> = {}): Space {
  return { id: 'work', label: 'Work', ...over } as Space;
}

const STATS = { spaceId: 'work', memories: 1, entities: 2, edges: 3, chrono: 4, files: 5 };

function make(statsFails = false) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [getTranslocoModule()],
    providers: [
      SpaceSettingsState,
      { provide: SpacesApi, useValue: { getSpaceStats: () => statsFails ? throwError(() => new Error('boom')) : of(STATS) } },
    ],
  });
  return TestBed.inject(SpaceSettingsState);
}

describe('SpaceSettingsState — openSettings populates every tab', () => {
  const rich = space({
    id: 'work', label: 'Work', maxGiB: 7, recordTtlDays: 90,
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
    const c = make();
    c.settingsTab.set('danger');
    c.schemaCollTab.set('edge');
    c.openSettings(rich);
    expect(c.settingsTab()).toBe('settings');
    expect(c.schemaCollTab()).toBe('entity');
  });

  it('copies the space into the settings form', () => {
    const c = make();
    c.openSettings(rich);
    expect(c.stForm).toEqual({ label: 'Work', purpose: 'p', usageNotes: 'u', maxGiB: 7, recordTtlDays: 90, documentExtraction: '' });
  });

  it('copies duplicate rules by VALUE — editing the form must not mutate the space object', () => {
    const c = make();
    c.openSettings(rich);
    expect(c.dupeRulesState).toEqual([{ minScore: 0.9, action: 'flag' }]);
    expect(c.dupeSurvivor).toBe('newer');
    expect(c.dupeOnInsert).toBe(true);

    c.dupeRulesState[0]!.minScore = 0.1;
    expect(rich.dupeRules![0]!.minScore).toBe(0.9); // original untouched
  });

  it('copies schema state, including tag suggestions by value', () => {
    const c = make();
    c.openSettings(rich);
    expect(c.schValidation).toBe('strict');
    expect(c.schStrictLinkage).toBe(true);
    expect(c.schTagSuggestions).toEqual(['a', 'b']);

    c.schTagSuggestions.push('c');
    expect(rich.meta!.tagSuggestions).toEqual(['a', 'b']); // original untouched
  });

  it('flattens a type schema into editable state (propertySchemas becomes a keyed list)', () => {
    const c = make();
    c.openSettings(rich);
    expect(c.typeNames('entity')).toEqual(['person']);
    expect(c.typeCount('entity')).toBe(1);
    const st = c.typeState('entity', 'person');
    expect(st.namingPattern).toBe('^[A-Z]');
    expect(st.tagSuggestions).toEqual(['t']);
    expect(st.propertySchemas).toEqual([{ key: 'age', s: { type: 'number', minimum: 0 }, _enumInput: '' }]);
  });

  it('copies a per-space documentExtraction override into the form, and clears to "" when absent (F11-c)', () => {
    const c = make();
    c.openSettings(space({ id: 'ov', label: 'Ov', documentExtraction: 'repair' } as Partial<Space>));
    expect(c.stForm.documentExtraction).toBe('repair');
    // A space with no override maps to '' (inherit instance default).
    c.openSettings(space({ id: 'plain', label: 'Plain' } as Partial<Space>));
    expect(c.stForm.documentExtraction).toBe('');
  });

  it('defaults everything when the space has no meta at all', () => {
    const bare = space({ id: 'bare', label: 'Bare' });
    const c = make();
    c.openSettings(bare);
    expect(c.stForm).toEqual({ label: 'Bare', purpose: '', usageNotes: '', maxGiB: null, recordTtlDays: null, documentExtraction: '' });
    expect(c.schValidation).toBe('off');
    expect(c.schStrictLinkage).toBe(false);
    expect(c.schTagSuggestions).toEqual([]);
    expect(c.typeNames('entity')).toEqual([]);
    expect(c.dupeRulesState).toEqual([]);
    expect(c.dupeSurvivor).toBe('older');
    expect(c.dupeOnInsert).toBe(false);
  });

  it('loads wipe stats for the danger tab, clearing the loading flag', () => {
    const c = make();
    c.openSettings(rich);
    expect(c.dangerWipeStats()).toEqual(STATS);
    expect(c.dangerWipeLoading()).toBe(false);
    expect(c.dangerRenameId).toBe('work');
  });

  it('a failing stats call still clears the loading flag', () => {
    const c = make(true);
    c.openSettings(space());
    expect(c.dangerWipeLoading()).toBe(false);
    expect(c.dangerWipeStats()).toBeNull();
  });
});

describe('SpaceSettingsState — buildMeta (what actually gets saved)', () => {
  it('always emits validationMode, and omits blank purpose/usageNotes', () => {
    const c = make();
    c.openSettings(space());
    expect(c.buildMeta()).toEqual({ validationMode: 'off' });
  });

  it('trims purpose and usageNotes', () => {
    const c = make();
    c.openSettings(space());
    c.stForm.purpose = '  p  ';
    c.stForm.usageNotes = '  u  ';
    expect(c.buildMeta()).toMatchObject({ purpose: 'p', usageNotes: 'u' });
  });

  it('emits strictLinkage only when true, and tagSuggestions only when non-empty', () => {
    const c = make();
    c.openSettings(space());
    expect(c.buildMeta().strictLinkage).toBeUndefined();
    expect(c.buildMeta().tagSuggestions).toBeUndefined();
    c.schStrictLinkage = true;
    c.schTagSuggestions = ['x'];
    expect(c.buildMeta()).toMatchObject({ strictLinkage: true, tagSuggestions: ['x'] });
  });

  it('a stored per-type tagSuggestions list survives a load → save round-trip with no editor', () => {
    // The per-type tag-suggestion EDITOR was retired (it reached neither the Brain record forms nor
    // the MCP schema guidance), but the DATA was deliberately kept: the save path is a full replace,
    // so dropping the field from state would silently destroy an operator's stored list on their next
    // unrelated edit. This is the guard against someone later deleting `tagSuggestions` from the
    // state as apparently-dead code — it is not dead, it is load-bearing for preservation.
    const c = make();
    c.openSettings(space({
      meta: { typeSchemas: { entity: { person: { namingPattern: '^[A-Z]', tagSuggestions: ['t'] } } } },
    } as Partial<Space>));
    const st = c.typeState('entity', 'person');
    expect(st.tagSuggestions).toEqual(['t']);

    // Edit something else entirely, exactly as an operator would.
    st.namingPattern = '^[a-z]';

    const saved = c.buildMeta().typeSchemas!.entity!['person']!;
    expect(saved.tagSuggestions).toEqual(['t']);
    expect(saved.namingPattern).toBe('^[a-z]');
  });

  it('namingPattern is entity-only — the same state on a memory type is dropped', () => {
    const c = make();
    c.openSettings(space());
    c.schTypeSchemas.entity = { person: { namingPattern: '^A', tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '' } };
    c.schTypeSchemas.memory = { note: { namingPattern: '^A', tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '' } };
    const meta = c.buildMeta();
    expect(meta.typeSchemas!.entity!['person']).toEqual({ namingPattern: '^A' });
    expect(meta.typeSchemas!.memory!['note']).toEqual({});
  });

  it('maps a property schema field-by-field, omitting empty ones', () => {
    const c = make();
    c.openSettings(space());
    c.schTypeSchemas.entity = { person: {
      namingPattern: '', tagSuggestions: [], _newPropInput: '', _newTagInput: '',
      propertySchemas: [{ key: 'age', s: { type: 'number', minimum: 0, maximum: 5, pattern: '  ', enum: [], required: true }, _enumInput: '' }],
    } };
    const ps = c.buildMeta().typeSchemas!.entity!['person']!.propertySchemas!['age']!;
    expect(ps).toEqual({ type: 'number', minimum: 0, maximum: 5, required: true });
    expect(ps.pattern).toBeUndefined(); // whitespace-only pattern dropped
    expect(ps.enum).toBeUndefined();    // empty enum dropped
  });

  it('omits typeSchemas entirely when no type is defined', () => {
    const c = make();
    c.openSettings(space());
    expect(c.buildMeta().typeSchemas).toBeUndefined();
  });
});

describe('SpaceSettingsState — library $ref round-trip (openSettings -> buildMeta)', () => {
  // The one that matters most: a library-linked type schema arrives as `$ref: "library:<name>"`,
  // is held as a private `_libRef` sentinel while editing, and must be emitted as `$ref` again.
  // Lose the sentinel and saving a space silently converts a linked schema into an empty inline one.
  const linked = space({
    id: 'work', label: 'Work',
    meta: { typeSchemas: { entity: { person: { $ref: 'library:people-v1' } } } },
  } as Partial<Space>);

  it('a $ref type survives open -> save unchanged', () => {
    const c = make();
    c.openSettings(linked);
    expect(c.buildMeta().typeSchemas!.entity!['person']).toEqual({ $ref: 'library:people-v1' });
  });

  it('the $ref type is exposed to the UI as a named type carrying its library ref', () => {
    const c = make();
    c.openSettings(linked);
    expect(c.typeNames('entity')).toEqual(['person']);
    expect(c.typeLibRef('entity', 'person')).toBe('people-v1');
  });

  it('a $ref type emits ONLY $ref — never the empty inline fields it is stored with', () => {
    const c = make();
    c.openSettings(linked);
    const out = c.buildMeta().typeSchemas!.entity!['person']!;
    expect(Object.keys(out)).toEqual(['$ref']);
  });

  it('a non-library $ref is NOT treated as a library link', () => {
    const other = space({ id: 'w', label: 'W', meta: { typeSchemas: { entity: { person: { $ref: 'elsewhere:x' } } } } } as Partial<Space>);
    const c = make();
    c.openSettings(other);
    expect(c.typeLibRef('entity', 'person')).toBeNull();
  });
});

describe('SpaceSettingsState — duplicate rules', () => {
  it('addDupeRule appends and removeDupeRule deletes by index', () => {
    const c = make();
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
    const c = make();
    c.openSettings(space());
    c.addDupeRule();
    expect(c.hasAutomergeRule()).toBe(false);
    c.dupeRulesState[0]!.action = 'automerge';
    expect(c.hasAutomergeRule()).toBe(true);
  });

  // NEW (not a relocation): the extraction exposed that my hand-written copy of addDupeRule had
  // drifted — wrong minScore default, and the dupeSaved reset dropped. The original characterization
  // suite did not assert either, so it stayed silent. Pinning both now so it cannot drift again.
  it('a new rule defaults to minScore 0.95 / flag, and clears the saved indicator', () => {
    const c = make();
    c.openSettings(space());
    c.dupeSaved.set(true);
    c.addDupeRule();
    expect(c.dupeRulesState[0]).toEqual({ minScore: 0.95, action: 'flag' });
    expect(c.dupeSaved()).toBe(false);
  });

  it('removing a rule also clears the saved indicator', () => {
    const c = make();
    c.openSettings(space());
    c.addDupeRule();
    c.dupeSaved.set(true);
    c.removeDupeRule(0);
    expect(c.dupeSaved()).toBe(false);
  });
});
