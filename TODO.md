# Ythril TODO

## ✅ Done — Semantic Parity (v0.3.1 → v0.3.2)

Gaps identified in full-project audit (v0.3.1). All resolved:

- [x] **EdgeDoc `updatedAt`** — already present in `EdgeDoc` type and populated
  by `upsertEdge()` on both create and update paths.
- [x] **Bulk delete for entity/edge/chrono** — `bulkDeleteEntities()`,
  `bulkDeleteEdges()`, `bulkDeleteChrono()` with API routes, tombstone writes,
  confirm guard, and `bulkWipeRateLimit`.
- [x] **Filtering for entity/edge/chrono** — entity `?name=`/`?type=`/`?tag=`,
  edge `?from=`/`?to=`/`?label=`, chrono `?status=`/`?kind=`/`?tag=`.
- [x] **GET-by-ID for entity, edge, and chrono** — `GET .../entities/:id`,
  `GET .../edges/:id`, `GET .../chrono/:id`.
- [x] **Client `Memory` interface** — `content` field already removed;
  interface uses `fact: string` (required), matching server `MemoryDoc`.

---

## ✅ Done — Chrono Collection (v0.3.0)

Temporal data layer added alongside brain's entities/edges/memories.

**Collection:** `{spaceId}_chrono` (one per space, like memories/entities/edges).

**Document type:** `ChronoEntry` — `kind` (event/deadline/plan/prediction/milestone), `status` (upcoming/active/completed/overdue/cancelled), `confidence` (0–1), tags, entityIds, memoryIds, recurrence.

**Indexes:** `{ spaceId, startsAt }`, `{ spaceId, status }`, `{ spaceId, seq }`.

**MCP tools:** `create_chrono`, `update_chrono`, `list_chrono` + `query` collection support.

**API routes:** `POST/GET/DELETE /api/brain/spaces/:spaceId/chrono`, `POST .../chrono/:id`.

**Sync:** Last-writer-wins `seq`-based rule. Individual `GET/POST /api/sync/chrono` + batch-upsert support. Tombstone type `'chrono'`.
