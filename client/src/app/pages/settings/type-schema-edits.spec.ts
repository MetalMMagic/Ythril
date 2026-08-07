/**
 * The per-type schema edits, tested directly now that they are pure.
 *
 * These operations used to live on `SpaceSettingsState` and reach into its own map, so the only way to
 * exercise them was through the service — which meant the settings page's `TestBed` had to be stood up to
 * assert that a duplicate property key is refused. They are plain functions over a state object now, and
 * this file is what that buys.
 *
 * `space-schema-tab.component.spec.ts` still covers the service's own behaviour end to end. That is the
 * characterization net proving this extraction changed nothing; this file pins the rules themselves.
 */
import { describe, it, expect } from 'vitest';
import { emptyTypeSchemaState, type TypeSchemaState } from './space-settings-state.service';
import { addProp, removeProp, addEnumVal, removeEnumVal, canAddProp } from './type-schema-edits';

const state = (over: Partial<TypeSchemaState> = {}): TypeSchemaState => emptyTypeSchemaState(over);
const prop = (key: string, s = {}) => ({ key, s, _enumInput: '' });

describe('adding a property', () => {
  it('adds the pending key and returns it', () => {
    const s = state({ _newPropInput: 'tier' });
    expect(addProp(s)).toBe('tier');
    expect(s.propertySchemas.map(p => p.key)).toEqual(['tier']);
  });

  it('clears the input even when the key is refused', () => {
    // A rejected duplicate left sitting in the box reads as "the button did nothing", which is the bug
    // report we would get instead of the duplicate we prevented.
    const s = state({ _newPropInput: 'tier', propertySchemas: [prop('tier')] });
    expect(addProp(s)).toBeNull();
    expect(s._newPropInput).toBe('');
    expect(s.propertySchemas).toHaveLength(1);
  });

  it('refuses blank and whitespace-only keys', () => {
    for (const input of ['', '   ', '\t']) {
      const s = state({ _newPropInput: input });
      expect(addProp(s)).toBeNull();
      expect(s.propertySchemas).toHaveLength(0);
    }
  });

  it('trims the key it stores', () => {
    const s = state({ _newPropInput: '  tier  ' });
    expect(addProp(s)).toBe('tier');
    expect(s.propertySchemas[0]!.key).toBe('tier');
  });

  it('canAddProp answers without mutating, so a template can disable the button', () => {
    const s = state({ _newPropInput: 'tier', propertySchemas: [prop('tier')] });
    expect(canAddProp(s)).toBeNull();
    expect(s._newPropInput).toBe('tier');
  });

  it('returning the key is what lets a caller expand the new row', () => {
    // The settings tab expands the row it just created. It cannot do that for a key that was never added,
    // which is why this returns the key rather than a boolean.
    const s = state({ _newPropInput: 'repo' });
    const key = addProp(s);
    expect(key).not.toBeNull();
    expect(s.propertySchemas.some(p => p.key === key)).toBe(true);
  });
});

describe('removing a property', () => {
  it('removes only the named key', () => {
    const s = state({ propertySchemas: [prop('a'), prop('b')] });
    removeProp(s, 'a');
    expect(s.propertySchemas.map(p => p.key)).toEqual(['b']);
  });

  it('removing a key that is not there is a no-op, not a throw', () => {
    const s = state({ propertySchemas: [prop('a')] });
    expect(() => removeProp(s, 'nope')).not.toThrow();
    expect(s.propertySchemas).toHaveLength(1);
  });
});

describe('enum values', () => {
  it('adds the pending value and clears the input', () => {
    const s = state({ propertySchemas: [{ key: 'tier', s: {}, _enumInput: 'gold' }] });
    addEnumVal(s, 'tier');
    expect(s.propertySchemas[0]!.s.enum).toEqual(['gold']);
    expect(s.propertySchemas[0]!._enumInput).toBe('');
  });

  it('a typed "4" does not duplicate a stored 4', () => {
    // The input is text and the stored value may be a number. Comparing strictly would grow a list with two
    // entries that LOOK identical and that no record could satisfy twice.
    const s = state({ propertySchemas: [{ key: 'n', s: { enum: [4] }, _enumInput: '4' }] });
    addEnumVal(s, 'n');
    expect(s.propertySchemas[0]!.s.enum).toEqual([4]);
  });

  it('ignores a blank value rather than storing an empty option', () => {
    const s = state({ propertySchemas: [{ key: 'tier', s: {}, _enumInput: '   ' }] });
    addEnumVal(s, 'tier');
    expect(s.propertySchemas[0]!.s.enum).toBeUndefined();
  });

  it('does nothing for a property that does not exist', () => {
    const s = state({ propertySchemas: [prop('a')] });
    expect(() => addEnumVal(s, 'nope')).not.toThrow();
  });

  it('removes a value, leaving the rest', () => {
    const s = state({ propertySchemas: [{ key: 'tier', s: { enum: ['gold', 'silver'] }, _enumInput: '' }] });
    removeEnumVal(s, 'tier', 'gold');
    expect(s.propertySchemas[0]!.s.enum).toEqual(['silver']);
  });

  it('replaces the schema object rather than mutating it in place', () => {
    // The entry's `s` is handed to a template. Replacing it is what makes the change visible; mutating the
    // same object would leave an OnPush view showing the old list.
    const original = { enum: ['gold', 'silver'] };
    const s = state({ propertySchemas: [{ key: 'tier', s: original, _enumInput: '' }] });
    removeEnumVal(s, 'tier', 'gold');
    expect(s.propertySchemas[0]!.s).not.toBe(original);
    expect(original.enum).toEqual(['gold', 'silver']);
  });
});
