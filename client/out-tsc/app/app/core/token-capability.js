const AREAS = ['knowledge', 'files', 'schema', 'dataQuality'];
const RUNGS = ['none', 'read', 'write', 'admin'];
/** Is `held` at least `needs` on the four-rung ladder? Mirrors the server's `satisfies`. */
function satisfies(held, needs) {
    const h = RUNGS.indexOf((held ?? 'none'));
    return h >= 0 && h >= RUNGS.indexOf(needs);
}
/**
 * Can this token write at all — any area, any space?
 *
 * ## Why the UI needs this rather than a `readOnly` flag
 *
 * The badge on the Tokens page and the graph editor's `canEdit` both asked `!token.readOnly`. That flag is
 * being removed: it cannot express a per-space, per-area grant, and every guard on the server now reads the
 * matrix instead. A UI still branching on the flag would show "read-only" for a token that can write in one
 * space, and "standard" for one whose matrix reaches nothing.
 *
 * ## It mirrors the server deliberately, and only this far
 *
 * The server's `auth/write-anywhere.ts` answers the same question for the coarse mutation guard, and this is
 * the same predicate — instance admin, or a write rung in some area of the floor or of any space. Keeping the
 * ladder here is a duplication, and the alternative is worse: the UI would have to ask the server whether to
 * draw a badge.
 *
 * What it must NOT be used for is deciding whether a specific action is allowed. That is the server's answer,
 * per space and per area, and the UI's job is to render the outcome — not to pre-empt it. This exists to pick
 * a LABEL and to grey out an editor, both of which are cosmetic and both of which the server re-checks.
 */
export function canWriteAnywhere(rights) {
    if (!rights)
        return false;
    if (rights.instanceAdmin)
        return true;
    const floor = rights.floor;
    if (floor && AREAS.some(a => satisfies(floor[a], 'write')))
        return true;
    return Object.values(rights.perSpace ?? {}).some(areas => AREAS.some(a => satisfies(areas[a], 'write')));
}
