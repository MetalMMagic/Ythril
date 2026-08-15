/**
 * A minted token can never exceed the token that minted it.
 *
 * ## Why this is the rule that has to live in the API
 *
 * The rights matrix delegates minting: a space admin may issue tokens for their own spaces. Without a cap
 * that is an escalation ladder — mint a token with more rights than you hold, then authenticate as it. The
 * UI can grey out the controls, and that is worth doing, but the grid is one API call away from being
 * bypassed and the API is exactly where a token would be used to widen itself.
 *
 * ## Refuse, do not silently trim
 *
 * `capRights` reports what it would have cut rather than quietly returning a narrowed object. Silently
 * trimming produces a token that works, looks configured, and is not what the operator asked for — and they
 * find out when something they granted does not work, at which point the grid says one thing and the
 * behaviour says another. A refusal naming the excess costs one call to fix.
 *
 * ## Two rules, and only one of them is about the matrix
 *
 *  - **Never above the minter**, per area per space, including the floor.
 *  - **Never the instance-administrator switch**, and never `createSpaces`, from a non-administrator. Those
 *    are not areas and do not cap — they are held or they are not.
 */
import { SPACE_AREAS, RUNG_IMPLICATIONS } from '../config/rights-shape.js';
import type { TokenRights, AreaRungs, Rung, SpaceArea } from '../config/rights-shape.js';

const ORDER: readonly Rung[] = ['none', 'read', 'write', 'admin'];
// The one list, imported. Four hand-written copies of these names is how an unvalidated area name
// went unnoticed: nothing compared any copy to any other.
const AREAS: readonly SpaceArea[] = SPACE_AREAS;

const rank = (r: Rung): number => ORDER.indexOf(r);

/** One excess grant, named precisely enough to fix without a second request. */
export interface Excess {
  /** `'*'` for the floor, otherwise the space id. */
  space: string;
  area: SpaceArea | 'instanceAdmin' | 'createSpaces';
  requested: string;
  allowed: string;
}

/**
 * What was WRITTEN for an area in a space: the higher of the floor and the explicit row.
 *
 * Both, not either. A token with a `read` floor and a `write` row on `qa` holds write there, and a token
 * with a `write` floor and no row still holds write everywhere — reading only one of them under-reports the
 * minter and refuses grants it was entitled to make.
 *
 * Granted, not held: implications are applied on top of this by `effectiveRung`. Kept separate so an
 * implication is always evaluated against what an operator actually wrote, never against another inference.
 */
function grantedRung(rights: TokenRights, space: string, area: SpaceArea): Rung {
  const floor = rights.floor?.[area] ?? 'none';
  const row = rights.perSpace[space]?.[area] ?? 'none';
  return rank(row) > rank(floor) ? row : floor;
}

/**
 * Raise a rung by whatever the other areas in the same space entail.
 *
 * `held` is what was written for `area`; `of` reads what was written for any OTHER area, in the same scope.
 * Split this way so one implementation serves both the per-space resolution and the floor, which have
 * different sources but the identical rule — the defect this repo produces most is one rule with two
 * implementations, and the weaker one winning silently.
 */
function withImplications(area: SpaceArea, held: Rung, of: (a: SpaceArea) => Rung): Rung {
  let out = held;
  for (const rule of RUNG_IMPLICATIONS) {
    if (rule.grants !== area) continue;
    if (rank(of(rule.when)) >= rank(rule.atLeast) && rank(rule.rung) > rank(out)) out = rule.rung;
  }
  return out;
}

/**
 * What this token actually holds for an area in a space — the single resolution, for the whole server.
 *
 * REST (`middleware.ts`), MCP (`mcp/tool-rights-guard.ts`), `reachable-spaces.ts` and `capRights` below all
 * read this, which is what makes it the one place an implication can live without becoming two rules. See
 * `RUNG_IMPLICATIONS` for why `knowledge: write` entails `schema: read`.
 */
export function effectiveRung(rights: TokenRights, space: string, area: SpaceArea): Rung {
  return withImplications(area, grantedRung(rights, space, area), a => grantedRung(rights, space, a));
}

/**
 * What a FLOOR holds for an area, implications included.
 *
 * The floor is its own scope: it reaches every space including ones created later, so it is compared against
 * the minter's floor alone and never against an effective rung somewhere. The implication still applies —
 * a `knowledge: write` floor means schema is readable everywhere, so granting a `schema: read` floor takes
 * away nothing the minter did not already have. Omitting it here would have been the classic asymmetry:
 * enforcement grants the implied rung, minting refuses to delegate it.
 */
export function floorRung(rights: TokenRights, area: SpaceArea): Rung {
  return withImplications(area, rights.floor?.[area] ?? 'none', a => rights.floor?.[a] ?? 'none');
}

/**
 * Check a requested rights object against the minter's.
 *
 * Returns every excess rather than the first, so one refusal can name everything wrong with the request.
 * Stopping at the first turns a five-line fix into five round trips.
 */
export function capRights(minter: TokenRights, requested: TokenRights): Excess[] {
  const excess: Excess[] = [];

  if (requested.instanceAdmin && !minter.instanceAdmin) {
    excess.push({ space: '*', area: 'instanceAdmin', requested: 'true', allowed: 'false' });
  }
  if (requested.createSpaces && !minter.createSpaces) {
    excess.push({ space: '*', area: 'createSpaces', requested: 'true', allowed: 'false' });
  }

  // The floor is compared against the minter's FLOOR alone, not its effective rung anywhere.
  // A minter with no floor and a `write` row on one space may grant that row — it may not grant a floor,
  // because a floor reaches every space including ones created later, which the minter cannot do.
  if (requested.floor) {
    for (const area of AREAS) {
      const want = requested.floor[area];
      const have = floorRung(minter, area);
      if (rank(want) > rank(have)) {
        excess.push({ space: '*', area, requested: want, allowed: have });
      }
    }
  }

  for (const [space, rungs] of Object.entries(requested.perSpace)) {
    for (const area of AREAS) {
      const want = (rungs as AreaRungs)[area];
      const have = effectiveRung(minter, space, area);
      if (rank(want) > rank(have)) {
        excess.push({ space, area, requested: want, allowed: have });
      }
    }
  }

  return excess;
}

/** A refusal message that names every excess, in a stable order, short enough to read in a response body. */
export function describeExcess(excess: Excess[]): string {
  return excess
    .map(e => `${e.space === '*' ? 'floor' : e.space}.${e.area}: asked ${e.requested}, you hold ${e.allowed}`)
    .sort()
    .join('; ');
}
