/**
 * Which spaces may a token act on, for a given area and level?
 *
 * ## Why the iterating routes need their own answer
 *
 * Most routes name a space in the path, and the guard checks it. The data-quality routes — duplicates,
 * contradictions, conflicts — name none: they walk every space the token can reach and resolve the space
 * from the record. For those, the enforcement point is the ITERATION SET rather than the call, so refusing
 * the request would be wrong (a token legitimately reaches some of the spaces behind it) and letting the
 * loop run unfiltered leaves the Data quality column decorative.
 *
 * ## The conflation this replaces
 *
 * The previous filter read `!tokenSpaces || tokenSpaces.length === 0` as "unrestricted". An ABSENT allowlist
 * does mean every space; an EMPTY one means none, and the two are opposite. Anything holding `spaces: []` —
 * a schema-library token stores exactly that — was handed every space on the instance by the widest possible
 * reading of the narrowest possible token.
 *
 * That is the same trap `rights-migration.ts` documents and `migrateToken` avoids by checking `undefined`
 * rather than length. Routing this through the rights matrix removes the second copy of the mistake rather
 * than fixing it twice.
 */
import { getConfig } from '../config/loader.js';
import { effectiveRung } from './mint-cap.js';
import { satisfies } from './required-rung.js';
import type { TokenRights, SpaceArea, Rung } from '../config/rights-shape.js';

/**
 * Every space in which this token holds at least `needs` on `area`.
 *
 * `rights` absent means the record never passed the config backfill — an OIDC session — so the legacy
 * allowlist answers instead, with the absent/empty distinction made explicitly rather than by truthiness.
 */
export function spacesWhereTokenMay(
  rights: TokenRights | undefined,
  legacySpaces: string[] | undefined,
  area: SpaceArea,
  needs: Rung,
): string[] {
  const all = getConfig().spaces.map(s => s.id);
  if (rights) return all.filter(id => satisfies(effectiveRung(rights, id, area), needs));
  // No matrix: an ABSENT allowlist is every space, an EMPTY one is none. Never length-as-truthiness.
  if (legacySpaces === undefined) return all;
  return all.filter(id => legacySpaces.includes(id));
}
