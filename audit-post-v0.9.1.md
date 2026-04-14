# Audit Report — Ythril Post-v0.9.1 Changes

**Date:** 2026-04-14
**Scope:** 5 features (#72, #70, #68, #66, #64) — ~4,900 insertions across 40+ files

---

## 1. Entity Merge (#68) — `server/src/brain/merge.ts`

**Verdict: Strong design, one atomicity gap**

### Positives
- Clean two-phase pattern: `computeMergePlan` (preview/409) → `executeMerge` (commit). Callers can inspect and re-submit with resolutions.
- Schema-aware merge functions (`avg`, `min`, `max`, `sum`, `and`, `or`, `xor`) with type validation — `fn:avg` on a boolean is rejected.
- Edge relinking covers `from`, `to`, memories `entityIds`, and chrono `entityIds` with deduplication.
- Duplicate edge detection warns upfront (same `from|to|label` triplet post-relink).
- Both REST and MCP tool use identical merge logic — no divergence.
- Comprehensive standalone tests (~420 lines): conflict detection, resolution validation, all merge functions, edge cases.

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **HIGH** | **Non-atomic multi-document merge** | `executeMerge` performs ~N individual updates (edges, memories, chronos, survivor, delete absorbed) without a MongoDB transaction. A crash mid-merge leaves the graph in a partial state: some edges relinked, others still pointing to the now-deleted absorbed entity. Consider wrapping in a `session.withTransaction()` or at minimum deleting the absorbed entity **last** (which it does — good) and documenting the partial-state risk. |
| **MEDIUM** | **Self-loop edges not handled** | If entity A has an edge `A→A` (self-referencing), and A is the absorbed entity being merged into B, the relink sets `from=B` in one pass and `to=B` in another. This works but makes two separate updates + two seq increments for the same edge. The `detectDuplicateEdges` also wouldn't flag `B→B` if the survivor already has a self-loop. Minor data integrity smell. |
| **MEDIUM** | **Duplicate edges warned but not cleaned** | After merge, duplicate edges persist. The response warns the caller, and MCP says "resolve via delete_edge" — but an automated cleanup option (e.g., `autoDeleteDuplicates: true`) would prevent orphaned duplicates in LLM-driven workflows. |
| **LOW** | **No integration test** | Only standalone pure-logic tests exist. No test exercises the full REST → MongoDB → edge relink → tombstone path. |

---

## 2. deleteFields (#70) — `server/src/brain/delete-fields.ts`

**Verdict: Production-ready, excellent security posture**

### Positives
- Protected fields (`_id`, `name`, `type`, `spaceId`, `createdAt`, `updatedAt`) blocked at validation time.
- Prototype pollution vectors (`__proto__`, `constructor`, `prototype`) blocked in both validation and traversal.
- Consistent across all three knowledge types (entities, edges, memories).
- Merge order is correct: merge new properties → apply deleteFields → validate schema.
- Schema validation runs on post-deletion state in strict mode — can't use deleteFields to sneak past required properties.
- 300-line standalone test covering all security vectors.
- MCP tools properly integrated with consistent parameter descriptions.

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **LOW** | **Empty path segments** | `"properties..oldKey"` (double dots) passes validation and creates empty string segments. Harmless (no-op on empty key), but input should be rejected for cleanliness. |
| **LOW** | **Re-embedding cost undocumented** | Docs don't mention that deleteFields triggers re-embedding, which has latency implications for batch operations. |

---

## 3. Strict Link Enforcement (#66) — `strictLinkage` setting

**Verdict: Clean, well-gated, but sync bypass exists**

### Positives
- Per-space opt-in via `meta.strictLinkage` — doesn't break existing spaces.
- UUID v4 regex validation on `from`/`to` (edges) and `entityIds`/`memoryIds` (memories, chronos).
- Delete protection: `findEntityBacklinks()` queries edges, memories, and chrono collections before allowing delete.
- 409 response with full backlink list (type + ID) — actionable error response.
- Enforced in both REST API routes (`brain.ts`) and MCP tools (`router.ts`).
- Covers bulk_write operations too.
- 286-line standalone test.

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **MEDIUM** | **Sync ingest bypasses strictLinkage** | The sync API (`POST /api/sync/memories`, `/entities`, `/edges`) does NOT enforce `strictLinkage` — peers can push name-based references or create edges pointing to non-existent entities. This is somewhat expected (peers have their own schema), but it means strictLinkage gives a *local authoring* guarantee only, not an absolute data integrity guarantee. Should be documented explicitly. |

Note: `deleteEntity` in `entities.ts` is a direct DB delete + tombstone — it does NOT go through the API backlink check. So the merge absorbed-delete path is safe.

---

## 4. Entity Graph View (#72) — `client/src/app/pages/graph/graph.component.ts`

**Verdict: Impressive feature, solid Angular patterns**

### Positives
- Modern Angular 21: signals, computed, standalone components, lazy-loaded route.
- `traverseGraph` BFS in `edges.ts` is well-bounded: `maxDepth` capped, `limit` enforced, `visited` set prevents cycles.
- No `innerHTML` or `bypassSecurityTrust*` — XSS-safe.
- Proper cleanup: subscriptions tracked, Cytoscape destroyed, RAF cancelled.
- Truncation warning UI when node limit hit.
- Search debounced at 300ms, overlays use RAF.
- Full userguide documentation (83 lines of additions).

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **HIGH** | **`EntryPopupComponent.getUpdateCall()` missing default case** | If an unknown record type is passed, the method returns `undefined` → calling `.subscribe()` on `undefined` throws. Add `default: throw new Error(...)`. |
| **MEDIUM** | **setTimeout(500ms) for layout completion** | Hardcoded timing instead of Cytoscape's `layoutstop` event. Brittle on slow devices. |
| **MEDIUM** | **Component size ~900 lines** | Approaching refactor territory. The popup was correctly extracted; the detail panel could be next. |
| **LOW** | **selectedNode not cleared on traverse** | Detail panel can show stale data for a node no longer in the graph. |

---

## 5. UI Feedback Batch (#64)

**Verdict: Good polish, solid server-side additions**

### Positives
- **Server log streaming** via SSE (`about.ts`): proper SSE headers, newline escaping, clean unsubscribe on `req.close`. Admin-only gated.
- **Ring buffer logger** (`log.ts`): 1000-line cap, `Bearer` token redaction in all output, subscriber pattern with try-catch on emit.
- **Audit middleware fix**: uses `req.originalUrl` for logging (not `req.url` which is rewritten by routers).
- **`minGiB` → `maxGiB` rename**: corrects confusing field name in SpaceConfig.
- **Dialog conversions**: Networks and Tokens components converted from inline forms to proper dialog patterns.
- **Brain Settings tab**: new UI for schema/meta management inline with brain view.

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **MEDIUM** | **SSE no heartbeat/keepalive** | The `/logs/stream` endpoint sends an initial comment `:\n\n` but no periodic keepalive. Long-idle connections may be dropped by proxies (Traefik, nginx). Consider a 30s heartbeat comment. |
| **LOW** | **Log ring buffer unbounded subscriber growth possible** | If SSE connections fail to trigger `close` event (e.g. half-open TCP), subscribers leak. The Set grows but dead callbacks silently no-op (try-catch). Consider a WeakRef-based approach or periodic purge. |

---

## Cross-Cutting Assessment

### Security — STRONG
- No XSS vectors (no `innerHTML`, no `bypassSecurity*` anywhere in new code).
- No eval/Function/exec in new code.
- All user input validated with Zod or manual checks before reaching MongoDB.
- UUID v4 validation on all entity reference fields (when strictLinkage on).
- Prototype pollution blocked in deleteFields.
- Log streaming is admin-only with token redaction.
- Merge endpoint validates proxy space, self-merge, and resolution compatibility.

### Integration — EXCELLENT
- Every server feature has matching MCP tool support.
- REST API and MCP codepaths share the same underlying functions (merge, deleteFields, strictLinkage).
- Webhook events emitted for merge operations (entity.updated + entity.deleted).
- Schema validation applied consistently across all write paths.

### Cleverness — HIGH
- The merge plan pattern (409 for unresolved → re-submit with resolutions) is genuinely clever — it enables both human review and LLM-driven workflows.
- Schema-declared `mergeFn` on property definitions means the merge plan can suggest resolutions automatically.
- `deleteFields` being applied after merge (not before) allows atomic add+remove in a single request.
- Graph traversal BFS with visited-set and limit is the right algorithm — no over-engineering with force-directed layout on the server.

### Documentation — GOOD
- Integration guide updated for all new features.
- Usecase examples added for entity merge.
- Userguide updated for graph view.
- Minor gap: strictLinkage sync bypass behavior undocumented.

### Testing — GOOD with gaps
- Standalone tests comprehensive for pure logic (merge, deleteFields, strict linkage).
- No integration tests for merge (full REST → DB round-trip).
- No test for the SSE log stream endpoint.

---

## Priority Action Items

| # | Severity | Feature | Action |
|---|----------|---------|--------|
| 1 | **HIGH** | #68 merge | Wrap `executeMerge` in a MongoDB transaction (`session.withTransaction()`) or document partial-state risk prominently |
| 2 | **HIGH** | #72 graph | Add default case to `getUpdateCall()` in EntryPopupComponent |
| 3 | **MEDIUM** | #64 SSE | Add 30s heartbeat comment to `/logs/stream` to survive proxy timeouts |
| 4 | **MEDIUM** | #66 linkage | Document that sync ingest bypasses `strictLinkage` (local authoring guarantee only) |
| 5 | **MEDIUM** | #72 graph | Replace `setTimeout(500ms)` with Cytoscape `layoutstop` event |
| 6 | **LOW** | #70 deleteFields | Reject empty path segments in validation |
| 7 | **LOW** | #68 merge | Add integration test for full merge lifecycle |

---

**Overall: This is serious, well-engineered work. Security posture is strong, features are complete with MCP parity, and the code quality is consistently high. The atomicity gap in merge is the only item flagged as must-fix before production use.**
