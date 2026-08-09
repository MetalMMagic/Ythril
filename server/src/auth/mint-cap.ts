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
import type { TokenRights, AreaRungs, Rung, SpaceArea } from '../config/rights-shape.js';

const ORDER: readonly Rung[] = ['none', 'read', 'write', 'admin'];
const AREAS: readonly SpaceArea[] = ['knowledge', 'files', 'schema', 'dataQuality'];

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
 * What the minter actually holds in a given space: the higher of its floor and its explicit row.
 *
 * Both, not either. A token with a `read` floor and a `write` row on `qa` holds write there, and a token
 * with a `write` floor and no row still holds write everywhere — reading only one of them under-reports the
 * minter and refuses grants it was entitled to make.
 */
export function effectiveRung(rights: TokenRights, space: string, area: SpaceArea): Rung {
  const floor = rights.floor?.[area] ?? 'none';
  const row = rights.perSpace[space]?.[area] ?? 'none';
  return rank(row) > rank(floor) ? row : floor;
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
      const have = minter.floor?.[area] ?? 'none';
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
