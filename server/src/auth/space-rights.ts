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
/**
 * ## Why seven destructive rows ask for `write` rather than `admin`
 *
 * Owner ruling, 2026-08-13, after the difference was MEASURED rather than argued. A token carrying
 * `rights.perSpace.general.knowledge = 'write'` was refused `DELETE /memories/:id` with
 * `403 Token needs 'admin' on knowledge in space 'general'` — and deleted the same record through MCP
 * `delete_memory` seconds later, because `mcp/router.ts` gates on the token's `readOnly`/`admin` FLAGS and never
 * consults the rung. One rule, two implementations, and the weaker one silently in charge.
 *
 * The ruling was to level DOWN, not up: **`write` is the right rung for deleting a single record you could have
 * created.** The rows are `/memories/:id`, `/entities/:id`, `/edges/:id`, `/chrono/:id`, the entity merge, `/bulk`,
 * and `DELETE /api/files/:spaceId`.
 *
 * **What deliberately did NOT move:**
 * - The **collection wipes** (`DELETE /memories`, `/entities`, `/edges`, `/chrono`) stay `admin`. Their MCP
 *   counterpart `wipe_space` is `admin: true`, so those two doors already agree — and emptying a collection is not
 *   the same act as deleting a row.
 * - `DELETE /api/brain/spaces/:spaceId/files` (the file-META record) stays `admin`. No tool mirrors it, so
 *   lowering it would weaken a door for parity with nothing.
 * - `update_space_schema` remains the one known difference in the OTHER direction: REST asks `schema: write`,
 *   the tool is `admin: true`. MCP being stricter is safe, and levelling it down is a separate decision about
 *   schema authoring rather than about deletes. `surface-matrix.mjs` still reports it.
 *
 * A directory delete goes through the same `DELETE /api/files/:spaceId` row and therefore also becomes `write` —
 * it keeps its own `{confirm: true}` body requirement, which is the guard that made this acceptable.
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
  { route: '/api/brain/spaces/:spaceId/memories/:id', method: 'DELETE', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/by-ids', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/by-name', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities/:id', method: 'DELETE', area: 'knowledge', needs: 'write', scope: 'path' },
  // A merge DESTROYS one of the two records, so it is admin even though each half looks like an edit.
  { route: '/api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges/:id', method: 'DELETE', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'PATCH', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono/:id', method: 'DELETE', area: 'knowledge', needs: 'write', scope: 'path' },
  // `bulk` can create OR delete, so it takes the higher rung of what it can do rather than of what it is
  // usually used for. A bulk endpoint gated at `write` is a delete endpoint with a friendly name.
  { route: '/api/brain/spaces/:spaceId/bulk', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  // COLLECTION-level deletes. Every one of these empties a whole record type in the space, and not one was
  // in the first draft of this list — the gate found them. They are the single most destructive thing in the
  // area and would have been the least governed.
  { route: '/api/brain/spaces/:spaceId/memories', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/entities', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/edges', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/chrono', method: 'DELETE', area: 'knowledge', needs: 'admin', scope: 'path' },

  // ── Files ────────────────────────────────────────────────────────────────────────────────────────────
  { route: '/api/files/:spaceId', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/files/:spaceId', method: 'POST', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/files/:spaceId/upload-status', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files/extract', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/embedding-queue/media', method: 'GET', area: 'files', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/embedding-queue/media/retry-failed', method: 'POST', area: 'files', needs: 'write', scope: 'path' },
  // The RECORD half of the queue is `knowledge`, not `files`: it reports on memories, entities, edges and chrono.
  // A files-only token can read the media queue and must not read a listing of knowledge record ids.
  { route: '/api/brain/spaces/:spaceId/embedding-queue/records', method: 'GET', area: 'knowledge', needs: 'read', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/embedding-queue/records/retry', method: 'POST', area: 'knowledge', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files', method: 'PATCH', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/brain/spaces/:spaceId/files', method: 'DELETE', area: 'files', needs: 'admin', scope: 'path' },
  { route: '/api/files/:spaceId/mkdir', method: 'POST', area: 'files', needs: 'write', scope: 'path' },
  // These three were UNGOVERNED, and invisible to `every-space-route-has-an-area` because the gate strips block
  // comments before scanning and a region of `api/files.ts` was being swallowed with them — so the routes were
  // never discovered and never demanded a row. Editing that file elsewhere shifted the swallowed region and all
  // three appeared at once.
  //
  // `DELETE` is `admin` to match `DELETE /api/brain/spaces/:spaceId/files`: deleting a directory takes the tree
  // with it, and the metadata half of the same operation has always been the highest rung. `PATCH` (move/rename)
  // and `retry_embedding` (re-queues a file's embedding) are `write`.
  { route: '/api/files/:spaceId', method: 'DELETE', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/files/:spaceId', method: 'PATCH', area: 'files', needs: 'write', scope: 'path' },
  { route: '/api/files/:spaceId/retry_embedding', method: 'POST', area: 'files', needs: 'write', scope: 'path' },

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

/**
 * What an MCP tool needs, in the same vocabulary the routes use.
 *
 * ## Why this table exists at all
 *
 * MCP gated on two BOOLEANS — `readOnly` and `admin` — while REST enforced a per-space, per-area rung. Same
 * store, same policy, two enforcement models, and the weaker one was reachable: a token whose matrix said
 * `knowledge: write` was refused `DELETE /memories/:id` over REST with a 403 and allowed the identical
 * delete through `delete_memory`. That was measured against a running instance, not reasoned about.
 *
 * ## Why it is generated from ROUTE_RIGHTS rather than written
 *
 * A second hand-written copy of one rule is the defect this repo produces most. Every row below was DERIVED
 * from the `ROUTE_RIGHTS` entry of the route that tool mirrors, using the capability map in
 * `scripts/surface-matrix.mjs`, and `mcp-tool-rights.test.js` re-derives it and fails if the two disagree.
 * So a rung changed on a route moves its tool in the same commit, or the gate goes red.
 *
 * A tool ABSENT from this table is instance-level: it is governed by the `admin` flag on the tool and by
 * `instanceAdmin` on the token, not by a per-space rung, because the capability it maps to is not scoped to
 * a space at all (`list_spaces`, `create_space`, `update_space`, `list_tokens`, `list_peers`, `sync_now`,
 * `wipe_space`, `help`).
 */
export interface ToolRight {
  tool: string;
  area: SpaceArea;
  needs: Rung;
}

export const TOOL_RIGHTS: readonly ToolRight[] = [
  { tool: 'remember', area: 'knowledge', needs: 'write' },
  { tool: 'update_memory', area: 'knowledge', needs: 'write' },
  { tool: 'delete_memory', area: 'knowledge', needs: 'write' },
  { tool: 'upsert_entity', area: 'knowledge', needs: 'write' },
  { tool: 'update_entity', area: 'knowledge', needs: 'write' },
  { tool: 'delete_entity', area: 'knowledge', needs: 'write' },
  { tool: 'merge_entities', area: 'knowledge', needs: 'write' },
  { tool: 'find_entities_by_name', area: 'knowledge', needs: 'read' },
  { tool: 'upsert_edge', area: 'knowledge', needs: 'write' },
  { tool: 'update_edge', area: 'knowledge', needs: 'write' },
  { tool: 'delete_edge', area: 'knowledge', needs: 'write' },
  { tool: 'create_chrono', area: 'knowledge', needs: 'write' },
  { tool: 'update_chrono', area: 'knowledge', needs: 'write' },
  { tool: 'delete_chrono', area: 'knowledge', needs: 'write' },
  { tool: 'list_chrono', area: 'knowledge', needs: 'read' },
  { tool: 'recall', area: 'knowledge', needs: 'read' },
  { tool: 'query', area: 'knowledge', needs: 'read' },
  { tool: 'find_similar', area: 'knowledge', needs: 'read' },
  { tool: 'traverse', area: 'knowledge', needs: 'read' },
  { tool: 'bulk_write', area: 'knowledge', needs: 'write' },
  { tool: 'get_stats', area: 'knowledge', needs: 'read' },
  { tool: 'er_model', area: 'knowledge', needs: 'read' },
  { tool: 'reindex', area: 'schema', needs: 'admin' },
  { tool: 'list_embed_jobs', area: 'knowledge', needs: 'read' },
  { tool: 'retry_record_embedding', area: 'knowledge', needs: 'write' },
  { tool: 'retry_failed_media_embeddings', area: 'files', needs: 'write' },
  { tool: 'read_file', area: 'files', needs: 'read' },
  { tool: 'write_file', area: 'files', needs: 'write' },
  { tool: 'delete_file', area: 'files', needs: 'write' },
  { tool: 'move_file', area: 'files', needs: 'write' },
  { tool: 'list_dir', area: 'files', needs: 'read' },
  { tool: 'create_dir', area: 'files', needs: 'write' },
  { tool: 'retry_embedding', area: 'files', needs: 'write' },
  { tool: 'update_file_meta', area: 'files', needs: 'write' },
  { tool: 'get_space_meta', area: 'schema', needs: 'read' },
  { tool: 'update_space_schema', area: 'schema', needs: 'write' },
  // Governed by a rung from the moment it stopped being an instance-admin tool. `admin: true` exempts a tool
  // from this inventory because an instance-level capability has no space to scope to; `spaceAdmin: true` is
  // the opposite claim — the space IS the subject — so the area check applies like any other space-scoped
  // tool, on top of the four-area administrator check the dispatcher makes.
  //
  // `schema: write` to match `update_space_schema` beside it and the meta half of `PATCH /api/spaces/:id`:
  // label and purpose are space meta, and meta is the schema area throughout this inventory.
  { tool: 'update_space', area: 'schema', needs: 'write' },
];

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
