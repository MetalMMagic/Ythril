import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
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
export function impliedFrom(catalog, area, of) {
    if (!catalog?.implications)
        return null;
    let best = null;
    for (const rule of catalog.implications) {
        if (rule.grants !== area)
            continue;
        if (catalog.rungs.indexOf(of(rule.when)) < catalog.rungs.indexOf(rule.atLeast))
            continue;
        if (best && catalog.rungs.indexOf(best.rung) >= catalog.rungs.indexOf(rule.rung))
            continue;
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
export class RightsCatalogService {
    constructor() {
        this.http = inject(HttpClient);
        this.catalog = signal(null, ...(ngDevMode ? [{ debugName: "catalog" }] : /* istanbul ignore next */ []));
        this.failed = signal(false, ...(ngDevMode ? [{ debugName: "failed" }] : /* istanbul ignore next */ []));
        this.started = false;
    }
    /** Idempotent. Safe to call from every component that renders a grid. */
    load() {
        if (this.started)
            return;
        this.started = true;
        this.http.get('/api/tokens/rights-catalog').subscribe({
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
    derived(id) {
        return this.catalog()?.derivedRungs?.find(d => d.id === id) ?? null;
    }
    /**
     * The space-scoped routes no area governs, or an empty list on a server that does not publish them.
     *
     * Empty and absent are the same answer here on purpose: both mean "nothing to show", and an older server is
     * not an error condition. The alternative — distinguishing them in the UI — would put a version check in a
     * template for no reader's benefit.
     */
    notAreaScoped() {
        return this.catalog()?.notAreaScoped ?? [];
    }
    routesFor(area, rung) {
        const c = this.catalog();
        if (!c || rung === 'none')
            return [];
        const order = c.rungs.indexOf(rung);
        return c.routes
            .filter(r => r.area === area && c.rungs.indexOf(r.needs) <= order)
            .sort((a, b) => c.rungs.indexOf(a.needs) - c.rungs.indexOf(b.needs) || a.route.localeCompare(b.route));
    }
    /** How many routes an area has in total, for a header that says how much is behind it. */
    countFor(area) {
        return (this.catalog()?.routes ?? []).filter(r => r.area === area).length;
    }
    /**
     * The minimum `area` is held at, given what the other areas in the same scope are set to.
     *
     * The rule itself is `impliedFrom` above — this is the signal-reading wrapper, so the grid asks the service
     * and the service holds no second copy of the rule.
     */
    impliedFor(area, of) {
        return impliedFrom(this.catalog(), area, of);
    }
    static { this.ɵfac = function RightsCatalogService_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RightsCatalogService)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: RightsCatalogService, factory: RightsCatalogService.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RightsCatalogService, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
