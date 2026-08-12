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

export interface RightsCatalog {
  areas: readonly string[];
  rungs: readonly Rung[];
  routes: readonly CatalogRoute[];
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
}
