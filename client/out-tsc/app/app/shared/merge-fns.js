/**
 * Which merge functions a property may declare, given its type.
 *
 * ## Why the control needs this at all
 *
 * The server refuses an incompatible pair outright: `PropertySchemaZ` in `server/src/spaces/body-schemas.ts`
 * has a `.refine` that rejects a numeric function on anything but `number`, a boolean function on anything
 * but `boolean`, and ANY merge function on `string` or `date`.
 *
 * The editor offered all seven for every type. So an operator could pick `date` + `min` — a combination the
 * dropdown presented as available — and the save came back as a wall of zod JSON naming `path: [meta,
 * typeSchemas, entity, Task, propertySchemas, deadline]`. Reported by the owner on 2026-08-15, whose words
 * were *"i dont understand what i did wrong"*, which is the correct reaction: nothing they did was wrong. A
 * control that offers a value its own API rejects has moved a validation rule into the user's head.
 *
 * A refusal reached only by choosing something the UI offered is the UI's defect, not the validator's.
 *
 * ## Why the list is here and not fetched
 *
 * There is no catalog endpoint for property-schema rules the way there is for token rights, and inventing one
 * for seven strings is a bigger change than the defect. So this is a second copy of a server rule, which this
 * repo treats as a liability rather than a convenience — and it is pinned: `merge-fns-match-the-server.test.js`
 * reads the `.refine` in `body-schemas.ts` and fails if the two disagree. A copy nobody compares is the one
 * that drifts; a copy compared on every push is a cache.
 *
 * `undefined` type means NOT STATED, and the server allows any of the seven there — narrowing it in the UI
 * would refuse a combination the API accepts, which is the same defect pointing the other way.
 */
export const NUMERIC_MERGE_FNS = ['avg', 'min', 'max', 'sum'];
export const BOOLEAN_MERGE_FNS = ['and', 'or', 'xor'];
/** Every function, for an undeclared type. Order is numeric-then-boolean, as the server lists them. */
export const ALL_MERGE_FNS = [...NUMERIC_MERGE_FNS, ...BOOLEAN_MERGE_FNS];
export function mergeFnsFor(type) {
    if (type === 'number')
        return NUMERIC_MERGE_FNS;
    if (type === 'boolean')
        return BOOLEAN_MERGE_FNS;
    if (type === 'string' || type === 'date')
        return [];
    return ALL_MERGE_FNS;
}
/**
 * The merge function a property should hold after its type changes.
 *
 * Cleared rather than kept-and-refused: the operator changed the TYPE, so the stale function is a leftover
 * from a decision they have just replaced, and carrying it forward only surfaces at save time as a refusal
 * about a field they were not editing.
 */
export function mergeFnAfterTypeChange(type, current) {
    if (!current)
        return undefined;
    const allowed = mergeFnsFor(type);
    return allowed.includes(current) ? current : undefined;
}
