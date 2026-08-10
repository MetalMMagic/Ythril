/**
 * A proxy space, narrowed to the members a given token may actually see.
 *
 * ## The ask
 *
 * From aigents (2026-08-09), with probes: today a proxy space cannot be granted to a non-admin token at all.
 * Listing the proxy in `spaces` does nothing and every call `403`s, because `enforceSpaceScope` requires the token
 * to reach **every** member. They proved it was not specific to one proxy by building their own over 15 spaces and
 * getting the same refusal.
 *
 * What they asked for is the intersection: **expand the proxy through the TOKEN's scope, not through the proxy's
 * full member list.** A token holding `['qa','team']` used against an all-spaces proxy recalls across `qa` and
 * `team` and nothing else. The proxy becomes a lens over what you may already see.
 *
 * They can already build a filtered proxy by hand — the reason that is not the answer is that it is a SECOND list
 * to keep in step with the space set: every new project space must be added to it or silently drop out of
 * everyone's recall. One list beats two, and it is the list they already maintain.
 *
 * ## Why this is a module of its own, doing nothing yet
 *
 * **Nothing calls this.** Allowing a token onto a proxy is only half the change: the read paths fan out over
 * `resolveMemberSpaces` in 17 files, and letting a token through the guard **without** narrowing every one of those
 * would hand it records from spaces it cannot see. That is a data leak, not a partial feature.
 *
 * So the rule lands first, on its own, with the property that matters asserted independently — exactly the shape
 * the per-space rights series used: eight zero-behaviour PRs and an equivalence proof before any guard moved.
 *
 * ## The property that must never break
 *
 * The result is **always a subset** of `resolveMemberSpaces(proxyId)`, and always a subset of what the token
 * reaches. It can only ever narrow. A bug that widens it is the leak above, so `narrowsOnly()` exists to be
 * asserted directly rather than inferred from the implementation reading correctly.
 */

import { reachesSpace } from './space-reach.js';
import type { TokenRights } from '../config/rights-shape.js';

/**
 * The members of `proxyId` that this token reaches.
 *
 * `allMembers` is passed in rather than resolved here so this stays pure and testable without a loaded config —
 * the caller already has it, and taking it as an argument is what lets the subset property be checked against the
 * same list the read path will fan out over.
 *
 * **Legacy fallback matches `enforceSpaceScope` exactly.** A record with no `rights` is an OIDC-derived token,
 * built per request and never seen by the config backfill, so it is filtered by its `spaces` allowlist instead.
 * A record with neither is unrestricted and reaches everything — the same answer both other call sites give, and
 * the reason this is a `?? undefined` check rather than a truthiness one: `spaces: []` must not read as unscoped.
 */
export function memberSpacesForToken(
  rights: TokenRights | undefined,
  legacySpaces: string[] | undefined,
  allMembers: string[],
): string[] {
  if (rights) return allMembers.filter(id => reachesSpace(rights, id));
  if (legacySpaces === undefined) return [...allMembers];
  return allMembers.filter(id => legacySpaces.includes(id));
}

/**
 * Whether a narrowed set is a legitimate narrowing of the full member list.
 *
 * Asserted on its own rather than trusted from reading `memberSpacesForToken`, because the failure it guards
 * against is silent: a set containing one id the token cannot reach leaks that space's records through the proxy,
 * and every response still looks well-formed. A count is not enough either — the same size with a substituted id
 * would pass a length check.
 */
export function narrowsOnly(narrowed: string[], allMembers: string[]): boolean {
  const all = new Set(allMembers);
  return narrowed.every(id => all.has(id)) && new Set(narrowed).size === narrowed.length;
}

/**
 * Whether the token may use this proxy at all.
 *
 * Reaching **one** member is enough — that is the whole point of the change, and it is why this cannot be folded
 * into `memberSpacesForToken`: "may I use it" and "what do I see" are different questions, and a caller that
 * conflates them ends up treating an empty result as an error on a non-proxy space.
 *
 * An empty proxy — a `proxyFor` list whose members have all been deleted — reaches nothing and is refused. That is
 * the correct answer rather than an edge case to smooth over: a lens over nothing should not answer `200` with an
 * empty body, because the caller cannot tell that from a space they simply cannot see into.
 */
export function mayUseProxy(
  rights: TokenRights | undefined,
  legacySpaces: string[] | undefined,
  allMembers: string[],
): boolean {
  return memberSpacesForToken(rights, legacySpaces, allMembers).length > 0;
}
