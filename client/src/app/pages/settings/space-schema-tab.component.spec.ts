/**
 * SpaceSchemaTabComponent + SpaceSettingsState (schema slice) characterization tests.
 *
 * Written BEFORE the PR-U4 master/detail redesign and proven green against the ORIGINAL code, so the
 * redesign has a safety net. Two groups:
 *
 *  (A) Accordion state on SpaceSettingsState — the CURRENT single-expand behaviour the redesign will
 *      deliberately change (to "more than one type open at once"). Pinning it makes that behaviour
 *      change explicit and reviewable rather than accidental.
 *  (B) The component's import-conflict + schema-library logic, which must survive the redesign
 *      UNCHANGED (only the conflict dialog's hardcoded English strings get translated).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpaceSchemaTabComponent } from './space-schema-tab.component';
import { SpaceSettingsState, type TypeSchemaState } from './space-settings-state.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { SchemaApi } from '../../core/schema-api.service';
import { ToastService } from '../../core/toast.service';

const mkType = (over: Partial<TypeSchemaState> = {}): TypeSchemaState => ({
  namingPattern: '', tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '', ...over,
});

function setup(schemaApi: Partial<SchemaApi> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceSchemaTabComponent, getTranslocoModule()],
    providers: [
      SpaceSettingsState,
      { provide: SpacesApi, useValue: {} },
      { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
      { provide: SchemaApi, useValue: { listSchemaLibrary: () => of({ entries: [] }), upsertSchemaLibraryEntry: () => of({ entry: {} }), ...schemaApi } },
    ],
  });
  const fixture = TestBed.createComponent(SpaceSchemaTabComponent);
  const c = fixture.componentInstance;
  const state = TestBed.inject(SpaceSettingsState);
  return { c, state };
}

describe('SpaceSettingsState — schema master/detail selection + multi-open properties (U4)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('addType inserts the type and auto-selects it (shown in the detail pane)', () => {
    const { state } = setup();
    state.schNewTypeInputs = { ...state.schNewTypeInputs, entity: 'Service' };
    state.addType('entity');
    expect(state.typeNames('entity')).toContain('Service');
    expect(state.isTypeSelected('entity', 'Service')).toBe(true);
  });

  it('selectType is single-select: selecting a second type deselects the first (one detail pane)', () => {
    const { state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { A: mkType(), B: mkType() } };
    state.selectType('entity', 'A');
    expect(state.isTypeSelected('entity', 'A')).toBe(true);
    state.selectType('entity', 'B');
    expect(state.isTypeSelected('entity', 'B')).toBe(true);
    expect(state.isTypeSelected('entity', 'A')).toBe(false); // master/detail shows one type at a time
  });

  it('removeType clears the selection when the removed type was selected', () => {
    const { state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { A: mkType() } };
    state.selectType('entity', 'A');
    state.removeType('entity', 'A');
    expect(state.typeNames('entity')).not.toContain('A');
    expect(state.isTypeSelected('entity', 'A')).toBe(false);
  });

  it('addProp auto-expands the new property; removeProp clears it', () => {
    const { state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { A: mkType({ _newPropInput: 'cost' }) } };
    state.addProp('entity', 'A');
    expect(state.typeState('entity', 'A').propertySchemas.map(p => p.key)).toContain('cost');
    expect(state.isPropExpanded('entity', 'A', 'cost')).toBe(true);
    state.removeProp('entity', 'A', 'cost');
    expect(state.isPropExpanded('entity', 'A', 'cost')).toBe(false);
  });

  it('property editors are multi-open: expanding a second property keeps the first open', () => {
    const { state } = setup();
    state.schTypeSchemas = {
      ...state.schTypeSchemas,
      entity: { A: mkType({ propertySchemas: [{ key: 'a', s: {}, _enumInput: '' }, { key: 'b', s: {}, _enumInput: '' }] }) },
    };
    state.togglePropExpand('entity', 'A', 'a');
    state.togglePropExpand('entity', 'A', 'b');
    expect(state.isPropExpanded('entity', 'A', 'a')).toBe(true); // ← stays open (was single-expand before U4)
    expect(state.isPropExpanded('entity', 'A', 'b')).toBe(true);
    state.togglePropExpand('entity', 'A', 'a'); // toggle closes just this one
    expect(state.isPropExpanded('entity', 'A', 'a')).toBe(false);
    expect(state.isPropExpanded('entity', 'A', 'b')).toBe(true);
  });
});

describe('SpaceSchemaTabComponent — import-conflict resolution (must survive the redesign)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('resolveImportConflictOverride replaces the existing type and dismisses the dialog', () => {
    const { c, state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { Svc: mkType({ namingPattern: 'old' }) } };
    const incoming = mkType({ namingPattern: 'new' });
    c.importConflict.set({ kt: 'entity', name: 'Svc', state: incoming, allowAddAs: true });
    c.resolveImportConflictOverride();
    expect(state.typeState('entity', 'Svc').namingPattern).toBe('new');
    expect(c.importConflict()).toBeNull();
  });

  it('resolveImportConflictAddAs stores under the new name', () => {
    const { c, state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { Svc: mkType() } };
    c.importConflict.set({ kt: 'entity', name: 'Svc', state: mkType({ namingPattern: 'copy' }), allowAddAs: true });
    c.importConflictAddAsName.set('Svc-2');
    c.resolveImportConflictAddAs();
    expect(state.typeNames('entity')).toEqual(expect.arrayContaining(['Svc', 'Svc-2']));
    expect(state.typeState('entity', 'Svc-2').namingPattern).toBe('copy');
    expect(c.importConflict()).toBeNull();
  });

  it('resolveImportConflictAddAs refuses a name that also collides (keeps the dialog open)', () => {
    const { c, state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { Svc: mkType(), Other: mkType() } };
    c.importConflict.set({ kt: 'entity', name: 'Svc', state: mkType(), allowAddAs: true });
    c.importConflictAddAsName.set('Other'); // already exists
    c.resolveImportConflictAddAs();
    expect(c.importConflict()).not.toBeNull(); // still open, nothing added under a 3rd name
    expect(state.typeCount('entity')).toBe(2);
  });

  it('dismissImportConflict clears the conflict and the add-as name', () => {
    const { c } = setup();
    c.importConflict.set({ kt: 'entity', name: 'Svc', state: mkType(), allowAddAs: true });
    c.importConflictAddAsName.set('Svc-2');
    c.dismissImportConflict();
    expect(c.importConflict()).toBeNull();
    expect(c.importConflictAddAsName()).toBe('');
  });
});

describe('SpaceSchemaTabComponent — schema-library link (must survive the redesign)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('saveTypeToLibrary posts the derived slug + schema, then converts the type to a $ref', () => {
    const upsert = vi.fn().mockReturnValue(of({ entry: { name: 'service' } }));
    const { c, state } = setup({ upsertSchemaLibraryEntry: upsert as never });
    state.schTypeSchemas = {
      ...state.schTypeSchemas,
      entity: { Service: mkType({ namingPattern: '^S', propertySchemas: [{ key: 'cost', s: { type: 'number', required: true }, _enumInput: '' }] }) },
    };
    c.saveTypeToLibrary('entity', 'Service');
    expect(upsert).toHaveBeenCalledTimes(1);
    const [entryName, body] = upsert.mock.calls[0];
    expect(entryName).toBe('service'); // lower-cased slug
    expect(body).toMatchObject({ knowledgeType: 'entity', typeName: 'Service' });
    expect(body.schema.propertySchemas.cost).toMatchObject({ type: 'number', required: true });
    // type is now a library reference
    expect(state.typeLibRef('entity', 'Service')).toBe('service');
  });

  it('importFromLibraryRef links an existing type as a $ref', () => {
    const { c, state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { Svc: mkType() } };
    (c as unknown as { _libPickerTarget: unknown })._libPickerTarget = { kt: 'entity', name: 'Svc' };
    c.importFromLibraryRef({ name: 'shared-svc', knowledgeType: 'entity', typeName: 'Svc' } as never);
    expect(state.typeLibRef('entity', 'Svc')).toBe('shared-svc');
  });

  it('importFromLibraryRef as a NEW type whose name collides opens the conflict dialog (no add-as)', () => {
    const { c, state } = setup();
    state.schTypeSchemas = { ...state.schTypeSchemas, entity: { Svc: mkType() } };
    (c as unknown as { _libPickerTarget: unknown })._libPickerTarget = { kt: 'entity', name: '' }; // new-type flow
    c.importFromLibraryRef({ name: 'shared', knowledgeType: 'entity', typeName: 'Svc' } as never);
    expect(c.importConflict()).toMatchObject({ kt: 'entity', name: 'Svc', allowAddAs: false });
  });
});
