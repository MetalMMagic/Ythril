/**
 * Does this token reach a space at all?
 *
 * ## Why this exists before the guard uses it
 *
 * `enforceSpaceScope` currently answers the question from the legacy `spaces` allowlist. The rights matrix
 * answers it from `floor` and `perSpace`. Switching the guard from one to the other is the single change in
 * this feature where a mistake is SILENT WIDENING — a token reaching a space it never could, with no error
 * and nothing in the response to say so.
 *
 * So the replacement lands first, as a pure function, next to a test that asserts it agrees with the legacy
 * rule for every token shape. Only once the two provably answer the same question does the guard move onto
 * it. Behaviour changes when the guard changes; nothing here changes anything.
 *
 * ## Space-level, not area-level, and deliberately so
 *
 * The guard's question is "may this token touch this space at all". Area granularity comes from the route
 * inventory (`space-rights.ts`) and is a LATER step: wiring both at once means a defect in either reads as a
 * defect in the other, and the failure mode of the pair is the one nobody sees.
 */
import type { TokenRights, SpaceArea } from '../config/rights-shape.js';

const AREAS: readonly SpaceArea[] = ['knowledge', 'files', 'schema', 'dataQuality'];

/**
 * True when the token holds ANY rung above `none` in this space — via its floor or its explicit row.
 *
 * Both are consulted. A floor reaches spaces with no row at all, which is exactly how an unscoped token is
 * represented, and a row can raise a space above the floor.
 */
export function reachesSpace(rights: TokenRights, spaceId: string): boolean {
  const row = rights.perSpace[spaceId];
  if (row && AREAS.some(a => row[a] !== 'none')) return true;
  const floor = rights.floor;
  return !!floor && AREAS.some(a => floor[a] !== 'none');
}
