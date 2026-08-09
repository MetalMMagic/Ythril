/**
 * Which space-scoped area each route belongs to, and HOW that route learns its space.
 *
 * ## Why an inventory and not a decorator
 *
 * The per-space rights matrix (owner-approved 2026-08-09) says a token holds a rung — none / read / write /
 * area-admin — per area per space. That is only true if every route that touches a space is assigned to
 * exactly one area. A route nobody classified is a route the grid does not govern, and it does not announce
 * itself: it simply keeps working at whatever access the old model gave it while the UI shows a column that
 * says otherwise.
 *
 * So the mapping is data, in one file, and a gate enumerates the real route surface and fails on anything
 * missing from it. That ordering matters — the list is derived from the surface, not the other way round.
 *
 * ## The part that was nearly missed, and is the reason `scope` exists
 *
 * There are TWO enforcement shapes, and the design assumed one:
 *
 *  - **`path`** — the space is in the URL (`:spaceId`, or `:id` on the spaces router). Gate by reading it.
 *  - **`iterates`** — the route takes NO space and walks every space the token can reach. All of Data
 *    quality is this shape: `duplicates`, `contradictions` and `conflicts` resolve the space from the
 *    RECORD, looping over the token's accessible spaces.
 *
 * A guard written only for `path` would leave the Data quality column decorative — those routes would keep
 * scanning every reachable space at any level while the grid claimed to restrict them. For `iterates`, the
 * enforcement point is the ITERATION SET, not the route: the loop must be narrowed to spaces where the token
 * holds the required rung, and `/scan` and `/bulk-resolve` narrowed identically or one call reaches spaces
 * the grid excludes.
 *
 * Three columns have now turned out not to mean what their name suggested — Governance was keyed by network,
 * Sync/peer by peer, and Data quality by nothing at all. Each was caught by enumerating rather than by
 * reasoning from the name.
 */

/** The four space-scoped areas. Instance-level capabilities are NOT here — they have no space to scope to. */
export type SpaceArea = 'knowledge' | 'files' | 'schema' | 'dataQuality';

/** Rungs, lowest first. Each CONTAINS the one below, so "write but not read" is unrepresentable. */
export const RUNGS = ['none', 'read', 'write', 'admin'] as const;
export type Rung = (typeof RUNGS)[number];

/** How a route learns which space it is acting on. See the note above — this is not cosmetic. */
export type ScopeShape = 'path' | 'iterates';

export interface RouteRight {
  /** Express path as registered, including the router's mount prefix. */
  route: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  area: SpaceArea;
  /** The LOWEST rung that may call it. A token at or above this passes. */
  needs: Exclude<Rung, 'none'>;
  scope: ScopeShape;
}

/**
 * Ordered by area, then by route, so a diff reads as "what changed about this area" rather than as churn.
 *
 * `needs` is the lowest sufficient rung, never the intended audience: `recall` needs `read` even though
 * most callers holding it also write, because the question at the gate is "may this call happen", not "who
 * usually makes it".
 */
export const ROUTE_RIGHTS: readonly RouteRight[] = [
  // ── Knowledge ────────────────────────────────────────────────────────────────────────────────────────
  { route: '/api/brain/spaces/:spaceId/recall', method: 'POST', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/query', method: 'POST', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/traverse', method: 'POST', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/find-similar', method: 'POST', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/er-model', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/stats', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/events', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/events/ticket', method: 'POST', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/memories', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/memories', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/memories/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/memories/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/memories/:id', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/by-ids', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/by-name', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/:id', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  // A merge DESTROYS one of the two records, so it is admin even though each half looks like an edit.
  { route: '/api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId', method: 'POST', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges/:id', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  // `bulk` can create OR delete, so it takes the higher rung of what it can do rather than of what it is
  // usually used for. A bulk endpoint gated at `write` is a delete endpoint with a friendly name.
  { route: '/api/brain/spaces/:spaceId/bulk', method: 'POST', area: 'knowledge', needs: 'admin', scope: 'path' },
  // COLLECTION-level deletes. Every one of these empties a whole record type in the space, and not one was
  // in the first draft of this list — the gate found them. They are the single most destructive thing in the
  // area and would have been the least governed.
  { route: '/api/brain/spaces/:spaceId/memories', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  // POST-as-update on a chrono id: the only POST-that-updates in the brain API, and a documented
  // deprecation. Rung follows what it DOES, not what its verb suggests.
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },

  // ── Files ────────────────────────────────────────────────────────────────────────────────────────────
  { route: '/api/files/:spaceId', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/files/:spaceId', method: 'POST', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/files/:spaceId/upload-status', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files/extract', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/embedding-queue', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/embedding-queue/retry-failed', method: 'POST', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files', method: 'PATCH', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files', method: 'DELETE', area: 'files', needs: 'admin', scope: 'path' },
  { route: '/api/files/:spaceId/mkdir', method: 'POST', area: 'files', needs: 'write', scope: 'path' },

  // ── Schema ───────────────────────────────────────────────────────────────────────────────────────────
  { route: '/api/spaces/:id', method: 'GET', area: 'schema', needs: 'read', scope: 'path' },
  { route: '/api/spaces/:id/schema', method: 'GET', area: 'schema', needs: 'read', scope: 'path' },
  { route: '/api/spaces/:id/schema', method: 'PUT', area: 'schema', needs: 'write', scope: 'path' },
  { route: '/api/spaces/:id/meta', method: 'GET', area: 'schema', needs: 'read', scope: 'path' },
  { route: '/api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName', method: 'PUT', area: 'schema', needs: 'write', scope: 'path' },
  { route: '/api/spaces/:id/validate-schema', method: 'POST', area: 'schema', needs: 'read', scope: 'path' },
  { route: '/api/spaces/:id/completeness', method: 'GET', area: 'schema', needs: 'read', scope: 'path' },
  // Reindex and rebuild-indexes rewrite infrastructure the whole space depends on, and a rebuild makes
  // recall return nothing until it finishes. Structural, so admin.
  { route: '/api/spaces/:id/rebuild-indexes', method: 'POST', area: 'schema', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/reindex', method: 'POST', area: 'schema', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/reindex-status', method: 'GET', area: 'schema', needs: 'read', scope: 'path' },

  // ── Data quality — every one of these is `iterates` ───────────────────────────────────────────────────
  // These take no space. They walk the token's accessible spaces and resolve the space from the record, so
  // the gate is the ITERATION SET: narrow the loop to spaces holding `needs`, do not gate the call.
  { route: '/api/duplicates', method: 'GET', area: 'dataQuality', needs: 'read', scope: 'iterates' },
  { route: '/api/duplicates/scan', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/duplicates/:id/merge', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/duplicates/:id/dismiss', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/duplicates/:id/reopen', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/contradictions', method: 'GET', area: 'dataQuality', needs: 'read', scope: 'iterates' },
  { route: '/api/contradictions/scan', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/contradictions/:id/resolve', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/contradictions/:id/dismiss', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/contradictions/:id/reopen', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/conflicts', method: 'GET', area: 'dataQuality', needs: 'read', scope: 'iterates' },
  { route: '/api/conflicts/:id', method: 'GET', area: 'dataQuality', needs: 'read', scope: 'iterates' },
  { route: '/api/conflicts/:id/resolve', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/conflicts/bulk-resolve', method: 'POST', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/conflicts/link-violations', method: 'GET', area: 'dataQuality', needs: 'read', scope: 'iterates' },
  { route: '/api/conflicts/:id', method: 'DELETE', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/conflicts/link-violations', method: 'DELETE', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  { route: '/api/conflicts/link-violations/:id', method: 'DELETE', area: 'dataQuality', needs: 'write', scope: 'iterates' },
  // A seed route exists for tests. Classified rather than exempted: an unclassified route is exactly what
  // this inventory is for, and "it is only for tests" is the sentence that precedes finding it in production.
  { route: '/api/conflicts/seed', method: 'POST', area: 'dataQuality', needs: 'admin', scope: 'iterates' },
];

/**
 * Routes that carry a space but are governed by something OTHER than the four areas, listed so the gate can
 * tell "deliberately elsewhere" from "nobody looked at it".
 *
 * An empty exemption list would be the honest default; this one is not empty, so each entry says why.
 */
export const NOT_AREA_SCOPED: readonly { route: string; why: string }[] = [
  {
    route: '/api/spaces/:id/rename',
    why: 'Renaming a space is Space-admin, which is a column in the approved design but not one of the four '
       + 'DATA areas this inventory covers. It moves with the Space-admin work, not with these.',
  },
  {
    route: '/api/spaces/:id/token-access',
    why: 'Lists which tokens reach this space. Governed by the Space-admin column for the same reason, and '
       + 'it is a read of AUTH state rather than of the space\'s contents.',
  },
  {
    route: '/api/brain/spaces/:spaceId/token-access',
    why: 'Lists which tokens reach this space — the same AUTH read as the spaces-router copy above, and '
       + 'governed by Space-admin rather than by any of the four data areas.',
  },
  {
    route: '/api/brain/spaces/:spaceId/activity',
    why: 'Per-space usage counters, served from the admin activity surface. Instance-level observability '
       + 'that happens to be keyed by space, not a view of the space\'s data.',
  },
];
