/**
 * What rung a request needs, from the route inventory.
 *
 * ## Why a lookup and not a decorator on each route
 *
 * The inventory in `space-rights.ts` is the single list a gate can check against the real route surface.
 * Scattering the requirement across the handlers would put it back where the gate cannot see it, and the
 * gate is the only reason an unclassified route fails the build rather than quietly ungoverned.
 *
 * ## Matching, and the one thing that must never happen
 *
 * Express gives the registered pattern (`/spaces/:spaceId/entities/:id`), not the concrete URL, so matching
 * is on the pattern and is exact. **A miss returns `null`, and a `null` must be treated by the caller as
 * REFUSE, never as allow.** That is the whole safety property: an unclassified route is one nobody decided
 * about, and defaulting it to permissive reproduces the situation this feature exists to end — access that
 * works because nothing said otherwise.
 *
 * The build-time gate makes a miss unreachable in practice. This function assumes it will happen anyway,
 * because "unreachable in practice" is how the last three silent failures in this codebase described
 * themselves.
 */
import { ROUTE_RIGHTS, type SpaceArea } from './space-rights.js';
import type { Rung } from '../config/rights-shape.js';

export interface RungRequirement {
  area: SpaceArea;
  needs: Rung;
  scope: 'path' | 'iterates';
}

/** Normalise a mount + route pair into the key the inventory stores. */
function key(method: string, routePath: string): string {
  return `${method.toUpperCase()} ${routePath.replace(/\/+$/, '') || '/'}`;
}

const BY_KEY: ReadonlyMap<string, RungRequirement> = new Map(
  ROUTE_RIGHTS.map(r => [key(r.method, r.route), { area: r.area, needs: r.needs, scope: r.scope }]),
);

/**
 * The requirement for a route, or `null` when the inventory does not classify it.
 *
 * `null` is not "no requirement". See the note above: the caller must refuse.
 */
export function requiredRung(method: string, fullPath: string): RungRequirement | null {
  return BY_KEY.get(key(method, fullPath)) ?? null;
}

/** Does a held rung satisfy a required one? Rungs contain the ones below them. */
export function satisfies(held: Rung, needs: Rung): boolean {
  const order: Rung[] = ['none', 'read', 'write', 'admin'];
  return order.indexOf(held) >= order.indexOf(needs);
}
