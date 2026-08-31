/** A property key that is blank, or already taken, is not an edit — it is a typo. */
export function canAddProp(state) {
    const key = (state._newPropInput ?? '').trim();
    if (!key)
        return null;
    if (state.propertySchemas.some(e => e.key === key))
        return null;
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
export function addProp(state) {
    const key = canAddProp(state);
    // The input is cleared either way. Leaving a rejected duplicate sitting in the box reads as "the button
    // did nothing", which is the report we would get.
    state._newPropInput = '';
    if (!key)
        return null;
    state.propertySchemas = [...state.propertySchemas, { key, s: {}, _enumInput: '' }];
    return key;
}
export function removeProp(state, propKey) {
    state.propertySchemas = state.propertySchemas.filter(e => e.key !== propKey);
}
/**
 * Add the pending enum value to one property.
 *
 * Compared by `String(v)` rather than by value: the input is text, and a stored `4` and a typed `"4"` are
 * the same allowed value to anyone reading the list. Comparing strictly would let the list grow a visually
 * duplicated entry that no record could ever satisfy twice.
 */
export function addEnumVal(state, propKey) {
    const entry = state.propertySchemas.find(e => e.key === propKey);
    if (!entry)
        return;
    const val = (entry._enumInput ?? '').trim();
    if (!val)
        return;
    const curr = entry.s.enum ?? [];
    if (!curr.some(v => String(v) === val))
        entry.s = { ...entry.s, enum: [...curr, val] };
    entry._enumInput = '';
}
export function removeEnumVal(state, propKey, val) {
    const entry = state.propertySchemas.find(e => e.key === propKey);
    if (!entry)
        return;
    entry.s = { ...entry.s, enum: (entry.s.enum ?? []).filter(v => v !== val) };
}
