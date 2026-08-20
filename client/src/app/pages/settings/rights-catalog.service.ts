import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Rung } from './rights-glyph.component';

export interface CatalogRoute {
  area: string;
  method: string;
  route: string;
  /** The LOWEST rung that reaches this route. */
  needs: Exclude<Rung, 'none'>;
}

/**
 * One area's rung entailing a rung in another, in the same space.
 *
 * Published by the server (`RUNG_IMPLICATIONS`) because it is the rule `effectiveRung` ENFORCES. The grid
 * reads it rather than describing it: a security rule with two descriptions drifts, and the copy people read
 * is the wrong one.
 */
export interface CatalogImplication {
  when: string;
  atLeast: Rung;
  grants: string;
  rung: Rung;
}

/**
 * A rung the matrix expresses without naming — today only `spaceAdmin`.
 *
 * The server has published this since #937 and the client never read it, which is most of why the Space Admin
 * column took five releases to appear: the definition, what it grants and what it deliberately excludes were all
 * already on the wire, computed from `SPACE_AREAS` rather than restated, and the UI had no idea.
 *
 * `grants` and `excludes` are PROSE on purpose, server-side: the routes a space admin governs are the ones NOT in
 * the area table, so enumerating them would be the second copy that table's own reasoning forbids.
 */
export interface CatalogDerivedRung {
  id: string;
  /** The area-to-rung combination that IS this rung, e.g. every area at `admin`. */
  requires: Record<string, Rung>;
  grants: string;
  excludes: string;
}

/**
 * A space-scoped route governed by NO area, with the server's reason.
 *
 * The gap this closes in the grid: four areas are shown, and a route absent from `routes` was
 * indistinguishable from one nobody had classified. Renaming a space, reading which tokens reach it, and
 * reading its usage counters are all deliberately outside the four DATA areas — a decision recorded in the
 * server's `NOT_AREA_SCOPED` with a reason each, and until now readable nowhere else.
 *
 * No `method`: an exemption is a claim about what the route IS, so it covers every verb on that path. That
 * asymmetry with `CatalogRoute` is deliberate and matches what the server enforces.
 */
export interface CatalogNotAreaScoped {
  route: string;
  /** The server's own words. Not reformatted here, for the same reason `grants` is not. */
  why: string;
}

export interface RightsCatalog {
  areas: readonly string[];
  rungs: readonly Rung[];
  /** Absent on a server older than this field — treated as "no implications", never as an error. */
  implications?: readonly CatalogImplication[];
  /** Absent on an older server too, and read the same way: no derived rungs, not an error. */
  derivedRungs?: readonly CatalogDerivedRung[];
  routes: readonly CatalogRoute[];
  /** Absent on an older server: the grid then shows no exemption list, which is how it looked before. */
  notAreaScoped?: readonly CatalogNotAreaScoped[];
}

/**
 * The implication rule, as a pure function of a catalog.
 *
 * Exported and free-standing so a test double cannot hold a SECOND version of it. A stubbed
 * `RightsCatalogService` that re-implemented this in the spec file would be a fake rule dressed as the real
 * one, and the grid's tests would then prove the fake — the failure mode where a measurement shares its
 * subject's blind spot. Stubs call this; the service calls this.
 *
 * `of` reads the GRANTED rung of another area — what an operator wrote, never another inference — matching
 * the server's `withImplications`. Returns the highest applicable rule, or `null` when the catalog is absent,
 * has no `implications` field (an older server), or nothing entails anything.
 */
export function impliedFrom(
  catalog: RightsCatalog | null,
  area: string,
  of: (a: string) => Rung,
): { rung: Rung; by: { area: string; rung: Rung } } | null {
  if (!catalog?.implications) return null;
  let best: { rung: Rung; by: { area: string; rung: Rung } } | null = null;
  for (const rule of catalog.implications) {
    if (rule.grants !== area) continue;
    if (catalog.rungs.indexOf(of(rule.when)) < catalog.rungs.indexOf(rule.atLeast)) continue;
    if (best && catalog.rungs.indexOf(best.rung) >= catalog.rungs.indexOf(rule.rung)) continue;
    best = { rung: rule.rung, by: { area: rule.when, rung: rule.atLeast } };
  }
  return best;
}

/**
 * What each area and rung actually grants, fetched from the server rather than described here.
 *
 * `GET /api/tokens/rights-catalog` returns the table the server ENFORCES against (`ROUTE_RIGHTS`). Writing that
 * list into the client instead would make it a second copy of a security control, and the copy people read is
 * the one that drifts. So this service holds no knowledge of which route belongs to which area — only the
 * containment rule, which is a property of the rungs and not of any route.
 *
 * Fetched once per app lifetime: it changes only when the server is redeployed, and every rights grid on the
 * page wants the same answer.
 */
@Injectable({ providedIn: 'root' })
export class RightsCatalogService {
  private http = inject(HttpClient);

  readonly catalog = signal<RightsCatalog | null>(null);
  readonly failed = signal(false);
  private started = false;

  /** Idempotent. Safe to call from every component that renders a grid. */
  load(): void {
    if (this.started) return;
    this.started = true;
    this.http.get<RightsCatalog>('/api/tokens/rights-catalog').subscribe({
      next: (c) => this.catalog.set(c),
      // A missing explanation must not break the grid it explains: the tooltip degrades to the
      // non-technical sentence alone, which is still the more useful half for most readers.
      error: () => this.failed.set(true),
    });
  }

  /**
   * Every route reachable at `rung` in `area`, lowest requirement first.
   *
   * Cumulative, because rungs CONTAIN the ones below: `write` reaches every `read` route as well. Listing only
   * the routes added AT a rung would understate what is being granted, and on a permissions screen the safe
   * direction to be wrong in is to overstate.
   */
  /**
   * The server's own description of a derived rung, or `null` on a server that does not publish it.
   *
   * Returned rather than reformatted: this is the one description that cannot be wrong, because the server
   * computes `requires` from its own `SPACE_AREAS`. A sentence written in the client would be a second copy of a
   * containment rule that has been red-teamed.
   */
  derived(id: string): CatalogDerivedRung | null {
    return this.catalog()?.derivedRungs?.find(d => d.id === id) ?? null;
  }

  /**
   * The space-scoped routes no area governs, or an empty list on a server that does not publish them.
   *
   * Empty and absent are the same answer here on purpose: both mean "nothing to show", and an older server is
   * not an error condition. The alternative — distinguishing them in the UI — would put a version check in a
   * template for no reader's benefit.
   */
  notAreaScoped(): readonly CatalogNotAreaScoped[] {
    return this.catalog()?.notAreaScoped ?? [];
  }

  routesFor(area: string, rung: Rung): CatalogRoute[] {
    const c = this.catalog();
    if (!c || rung === 'none') return [];
    const order = c.rungs.indexOf(rung);
    return c.routes
      .filter(r => r.area === area && c.rungs.indexOf(r.needs) <= order)
      .sort((a, b) => c.rungs.indexOf(a.needs) - c.rungs.indexOf(b.needs) || a.route.localeCompare(b.route));
  }

  /** How many routes an area has in total, for a header that says how much is behind it. */
  countFor(area: string): number {
    return (this.catalog()?.routes ?? []).filter(r => r.area === area).length;
  }

  /**
   * The minimum `area` is held at, given what the other areas in the same scope are set to.
   *
   * The rule itself is `impliedFrom` above — this is the signal-reading wrapper, so the grid asks the service
   * and the service holds no second copy of the rule.
   */
  impliedFor(area: string, of: (a: string) => Rung): { rung: Rung; by: { area: string; rung: Rung } } | null {
    return impliedFrom(this.catalog(), area, of);
  }
}
