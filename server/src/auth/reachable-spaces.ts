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
 * ## An absent matrix reaches NOTHING, and it used to reach everything
 *
 * This took a `legacySpaces` allowlist as a second argument and consulted it when `rights` was absent —
 * for a record that had never passed the config backfill. That arm's own rule was carefully right: an
 * ABSENT allowlist is every space, an EMPTY one is none, never length-as-truthiness.
 *
 * Composed, though, the two made the answer FAIL-OPEN. No matrix and no allowlist returned every space in
 * the instance, which is defensible as "a legacy token is unrestricted" and not defensible as the answer to
 * "this record carries no scope information at all" — which is what the case had become.
 *
 * And it had become unreachable, which is why it could go rather than merely being reordered. There is one
 * place a record is attached to a request and one place a bearer resolves into one, with two branches:
 * `createToken` always writes a matrix and `migrateTokenRightsOnBoot` derives one IN MEMORY for anything
 * stored without one, and the OIDC path derives one per request through the same `migrateToken`. So no
 * record without a matrix reaches a handler. `a-token-without-a-matrix-reaches-nothing.test.js` asserts each
 * of those, because "cannot happen" is worth exactly what the thing preventing it is worth.
 *
 * The legacy fields themselves are NOT removed — they are still on the record type, still written, still
 * returned by the tokens API. What is gone is their last use as a SCOPING INPUT, which was the second
 * implementation of this rule.
 */
export function spacesWhereTokenMay(
  rights: TokenRights | undefined,
  area: SpaceArea,
  needs: Rung,
): string[] {
  // Fail closed, explicitly. A record with no matrix cannot reach a handler; if one ever does, the honest
  // answer to "which spaces may it see" is none.
  if (!rights) return [];
  return getConfig().spaces.map(s => s.id).filter(id => satisfies(effectiveRung(rights, id, area), needs));
}
