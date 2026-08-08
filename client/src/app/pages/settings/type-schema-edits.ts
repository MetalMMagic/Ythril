/**
 * The per-type schema edits, as pure operations over one `TypeSchemaState`.
 *
 * ## Why they left the service
 *
 * These lived on `SpaceSettingsState` and reached into its own `schTypeSchemas` map to find the type they
 * were editing. That made them unusable anywhere else — and "anywhere else" is now a real requirement: the
 * Brain Overview's data-model panel opens the SAME per-type editor in place, rather than sending an operator
 * off to Space Settings to make a one-field change.
 *
 * `SpaceSettingsState` is `@Injectable()` with no `providedIn`, so it is provided by the settings page and
 * the Brain page cannot inject it. Making it root-provided would turn per-space editing state into a
 * cross-page singleton, which is a worse problem than the one being solved.
 *
 * So the editing logic operates on a state object it is handed. The service keeps its map and delegates;
 * the dialog keeps a draft and delegates to the same functions. One implementation, two callers, and no
 * service dragged across the app.
 *
 * ## What is deliberately NOT here
 *
 * **Persistence.** The two callers save differently and must keep doing so: Space Settings is STAGED — edit
 * several types, then Save — while the Overview panel is IMMEDIATE, editing one type and writing it now.
 * Pushing a save into these functions would force one of those hosts to adopt the other's model.
 *
 * **Expansion state.** Which property rows are open is a property of a VIEW, not of the schema, and the two
 * hosts disagree about it: the settings tab keeps a set across every type it has open, and a modal editing
 * one type does not need one at all. The service keeps its own set and calls these for the data half.
 */
import type { PropertySchema } from '../../core/api.types';
import type { TypeSchemaState } from './space-settings-state.service';

/** A property key that is blank, or already taken, is not an edit — it is a typo. */
export function canAddProp(state: TypeSchemaState): string | null {
  const key = (state._newPropInput ?? '').trim();
  if (!key) return null;
  if (state.propertySchemas.some(e => e.key === key)) return null;
  return key;
}

/**
 * Append the pending property.
 *
 * Returns the key that was added, or `null` when nothing was — the caller needs to know, because the
 * settings tab also expands the new row and cannot do that for a key that was never created.
 *
 * Mutates in place because the callers hold this object directly and Angular's change detection here is
 * driven by the containing signal, not by identity of this leaf.
 */
export function addProp(state: TypeSchemaState): string | null {
  const key = canAddProp(state);
  // The input is cleared either way. Leaving a rejected duplicate sitting in the box reads as "the button
  // did nothing", which is the report we would get.
  state._newPropInput = '';
  if (!key) return null;
  state.propertySchemas = [...state.propertySchemas, { key, s: {}, _enumInput: '' }];
  return key;
}

export function removeProp(state: TypeSchemaState, propKey: string): void {
  state.propertySchemas = state.propertySchemas.filter(e => e.key !== propKey);
}

/**
 * Add the pending enum value to one property.
 *
 * Compared by `String(v)` rather than by value: the input is text, and a stored `4` and a typed `"4"` are
 * the same allowed value to anyone reading the list. Comparing strictly would let the list grow a visually
 * duplicated entry that no record could ever satisfy twice.
 */
export function addEnumVal(state: TypeSchemaState, propKey: string): void {
  const entry = state.propertySchemas.find(e => e.key === propKey);
  if (!entry) return;
  const val = (entry._enumInput ?? '').trim();
  if (!val) return;
  const curr: NonNullable<PropertySchema['enum']> = entry.s.enum ?? [];
  if (!curr.some(v => String(v) === val)) entry.s = { ...entry.s, enum: [...curr, val] };
  entry._enumInput = '';
}

export function removeEnumVal(state: TypeSchemaState, propKey: string, val: string | number | boolean): void {
  const entry = state.propertySchemas.find(e => e.key === propKey);
  if (!entry) return;
  entry.s = { ...entry.s, enum: (entry.s.enum ?? []).filter(v => v !== val) };
}
