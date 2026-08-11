/**
 * A token cannot raise its own floor.
 *
 * ## Why this rule and not "a token cannot edit itself"
 *
 * Editing your own token is ordinary — renaming it, narrowing it, setting an expiry. What must not happen is
 * a token WIDENING itself, and the floor is the only part of the matrix that can do so invisibly: it applies
 * to every space, including ones that do not exist yet, so raising it grants access to spaces nobody has
 * created and nobody will review.
 *
 * The mint cap already stops a token handing more than it holds to a NEW token. Without this, the same
 * escalation is available by a shorter route: edit yourself, then use yourself. Nothing about the result
 * looks unusual afterwards — the token's rights simply say what they say.
 *
 * ## Lowering is always allowed
 *
 * Narrowing your own floor cannot escalate anything, and refusing it would mean a token could not reduce its
 * own blast radius — the one self-modification worth encouraging.
 *
 * ## Per area, not "the floor as a whole"
 *
 * A floor is four independent levels. Comparing them as one unit would let a raise on `schema` pass because
 * `knowledge` went down in the same edit, which is a widening with a decoy attached.
 */
import { SPACE_AREAS } from '../config/rights-shape.js';
import type { TokenRights, AreaRungs, SpaceArea, Rung } from '../config/rights-shape.js';

const ORDER: readonly Rung[] = ['none', 'read', 'write', 'admin'];
// The one list, imported. Four hand-written copies of these names is how an unvalidated area name
// went unnoticed: nothing compared any copy to any other.
const AREAS: readonly SpaceArea[] = SPACE_AREAS;
const rank = (r: Rung): number => ORDER.indexOf(r);

/** Areas whose floor level would go UP. Empty means the edit raises nothing. */
export function floorRaises(current: AreaRungs | null, next: AreaRungs | null): SpaceArea[] {
  if (!next) return [];                                   // removing the floor cannot widen
  // A token with NO floor gaining one is a raise in every area the new floor grants — that is the widest
  // version of this move, not an exemption from it.
  const from = current ?? ({ knowledge: 'none', files: 'none', schema: 'none', dataQuality: 'none' } as AreaRungs);
  return AREAS.filter(a => rank(next[a]) > rank(from[a]));
}

/**
 * May `editor` apply `next` to the token identified by `targetId`?
 *
 * Returns the areas that would be raised, or an empty array when the edit is allowed. Self-edits are
 * identified by id: a token holding the same rights as another is still a different token, and the rule is
 * about acting on yourself rather than about equivalence.
 */
export function refuseSelfFloorRaise(
  editorId: string | undefined,
  editorRights: TokenRights | undefined,
  targetId: string,
  next: TokenRights,
): SpaceArea[] {
  if (!editorId || editorId !== targetId) return [];
  return floorRaises(editorRights?.floor ?? null, next.floor);
}
