# Brain Stats, Maintenance & Bulk Operations

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Brain Stats, Maintenance & Bulk Operations

### Space Stats

```http
GET /api/brain/spaces/:spaceId/stats
```

**Response** `200`:

```json
{
  "spaceId": "general",
  "memories": 1042,
  "entities": 156,
  "edges": 89,
  "chrono": 23,
  "files": 31,
  "embedQueue": { "pending": 0, "processing": 0, "failed": 0 }
}
```

**`embedQueue` — how much of this space is not searchable yet.** Writes do not wait for the embedding
model; a background worker embeds each record moments later. Until it does, the record exists but is
**absent from recall** rather than ranked lower, because both retrieval channels need the vector.

| field | meaning |
|---|---|
| `pending` | queued, not started. Normally 0, briefly non-zero after a burst of writes or a sync pull |
| `processing` | in flight right now |
| `failed` | gave up after retrying with backoff. **A non-zero value that does not clear is the signal that something is wrong** — usually an unreachable or misconfigured embedding endpoint |

Use it to answer "is this space ready to search". A steady `pending` that never drains, or any lasting
`failed`, means recall is quietly returning less than the space contains. Rewriting a record requeues it,
which is the way back from `failed` without an operator touching the queue.

For a proxy space the numbers are its **members'**, summed — matching the record counts above.

---

### Space Activity

Is this space earning its keep? `stats` says how much is *in* a space; this says whether anyone is getting
anything *out* of it.

```http
GET /api/brain/spaces/:spaceId/activity?hours=24
```

`hours` defaults to 24 and is clamped to 1…2160 (90 days, the bucket retention). A proxy space reports its
members' rows.

**Response** `200`:

```json
{
  "spaceId": "reporting",
  "hours": 24,
  "spaces": [
    {
      "space": "reporting",
      "calls": 412,
      "recall": 380,
      "answered": 41,
      "writes": 12,
      "meanMs": 63,
      "maxMs": 1840,
      "over1s": 3,
      "meanTopScore": 0.31,
      "lastUsedAt": "2026-08-01T14:00:00.000Z"
    }
  ]
}
```

**Read `recall` and `answered` together — that is the point of the endpoint.** 380 queries and 41 answers is
not a popular space; it is a space people keep failing to get an answer out of, and a call count alone cannot
tell the two apart. `meanTopScore` is the mean best-hit score across **answered** recalls only, so it stays
inside 0…1 and is `null` when nothing was answered (rather than `0`, which would read as "answers are bad"
instead of "there were none").

`meanMs` is over all classes of call, `over1s` counts those slower than a second, and `maxMs` is a true
maximum. **There is no percentile**, deliberately: a mean stored per hour cannot be recombined into a p95, so
a p95 here would either be a fabrication or require keeping every sample.

| field | counts |
|---|---|
| `recall` | `recall`, `query` and `find_similar` — demand on the brain |
| `writes` | anything that changed a record or added a file, including curation (resolving a conflict, merging a duplicate) |
| `calls` | all four classes: recall, reads, writes and file traffic |

Operator work on the instance — creating a space, casting a network vote, rotating a token — is **not**
counted, even though those requests carry a space id. Counting them would credit a brand-new empty space with
activity it never had.

Buckets are hourly and in UTC, kept for 90 days. A window with no calls returns an empty `spaces` array.

---

### Space Activity — every space at once (admin)

```http
GET /api/admin/space-activity?hours=168
Authorization: Bearer ythril_…   # admin token
```

Same row shape as the per-space endpoint, for **all** spaces in one response, busiest first.

```json
{
  "hours": 168,
  "retentionDays": 90,
  "spaces": [
    { "space": "reporting", "calls": 412, "recall": 380, "answered": 41, "meanTopScore": 0.31, "…": "…" },
    { "space": "handbook",  "calls": 95,  "recall": 88,  "answered": 84, "meanTopScore": 0.72, "…": "…" }
  ]
}
```

**Two endpoints on purpose.** This one is admin-only because it is inherently cross-space — a space-scoped
token has no business learning how heavily every other space is used, and the per-space route above exists
for exactly that caller. And it is one request rather than N: calling the per-space endpoint once per row is
a front-end N+1, which on a sixty-five-space instance means sixty-five requests to draw one table.

**A space with no traffic in the window is absent, not zero-filled.** The caller already knows which spaces
exist; what it cannot know is which ones the window covers, so the absence carries the information. It also
keeps a never-asked space from being ranked as though it answered badly — those are different problems with
different fixes (find out why nothing queries it, versus fill the gap it cannot answer).

`hours` defaults to 168 (7 days) and is clamped to `retentionDays × 24`. A week rather than a day is the
useful default here: usefulness is a question about a habit, and a space queried every Monday looks dead in a
24-hour window.

---

### Check Reindex Status

```http
GET /api/brain/spaces/:spaceId/reindex-status
```

**Response** `200`:

```json
{ "spaceId": "general", "needsReindex": false }
```

Returns `true` when the embedding model has changed and memories need re-embedding.

---

### Reindex Space

```http
POST /api/brain/spaces/:spaceId/reindex
```

Re-computes all embeddings with the current model. **Runs asynchronously** — the call returns immediately and the job proceeds in the background (it may take minutes for large spaces). Poll `GET /api/brain/spaces/:spaceId/reindex-status` for progress.

**Response** `200` — the job was *accepted*; `reindexed`/`errors` are always `0` here (the real counts land on the status endpoint), and `status` is `"started"`:

```json
{ "spaceId": "general", "reindexed": 0, "errors": 0, "status": "started" }
```

Returns `409 { "error": "Reindex already in progress" }` if one is already running for the space.

> **Reindexing does NOT repair "search returns nothing".** It re-computes the embeddings *stored on*
> your records. Recall queries those vectors through a separate `$vectorSearch` index, and that index
> can be missing while every record still holds a perfectly good embedding — after restoring a backup,
> or if the database search process was not ready when the instance started. Reindexing every record
> in the space will not create it. Use the rebuild endpoint below.

### Rebuild search indexes

```http
POST /api/spaces/:spaceId/rebuild-indexes
```

Recreates the space's `$vectorSearch` indexes. Requires **admin + MFA** and is recorded in the audit
log as `space.indexes.rebuild`. Also available in the UI at **Settings → Space → Danger Zone →
Rebuild search indexes**.

**Runs asynchronously** — the call returns as soon as the build is submitted. **Recall returns empty
for that space until the build completes**, which is why it sits in the danger zone; no records are
modified.

```json
{ "ok": true, "spaceId": "general", "status": "rebuilding" }
```

Returns `404` when the space does not exist.

You should rarely need this: indexes are built when a space is created, retried on startup if the
database search process is slow to come up, and rebuilt automatically after a restore. It exists
because an index going missing is otherwise **silent** — an empty result set is indistinguishable from
"no matches", and `/ready` reports `vectorSearch: ok` regardless, since it probes the capability
rather than each space's indexes.

---

### Bulk Write

```http
POST /api/brain/spaces/:spaceId/bulk
Content-Type: application/json
```

Batch-upsert memories, entities, edges, and/or chrono entries in a single HTTP call. All four arrays are optional. Processing order: **memories → entities → edges → chrono** — so edges that reference entities inserted in the same batch will resolve correctly.

Each array is capped at 500 entries. Per-item validation failures are recorded in `errors` without aborting the remaining items.

**Request body:**

```json
{
  "memories":  [ { "fact": "Oceans cover 71% of the Earth's surface.", "tags": ["science"] } ],
  "entities":  [ { "name": "Earth", "type": "planet", "tags": ["science"] } ],
  "edges":     [ { "from": "<entity-id-A>", "to": "<entity-id-B>", "label": "orbits" } ],
  "chrono":    [ { "title": "Launch day", "type": "milestone", "startsAt": "2026-01-01T00:00:00Z" } ]
}
```

Each item accepts the same fields as its corresponding individual endpoint (`POST /memories`, `POST /entities`, `POST /edges`, `POST /chrono`), with one exception: **an entity's `type` is required in bulk** (an item missing it is skipped with `"missing required field: type"`), whereas the single `POST /entities` defaults `type` to empty.

**Response** `207`:

```json
{
  "inserted": { "memories": 1, "entities": 1, "edges": 0, "chrono": 1 },
  "updated":  { "memories": 0, "entities": 0, "edges": 1, "chrono": 0 },
  "errors":   [
    { "type": "edge", "index": 0, "reason": "missing required field: from" }
  ]
}
```

- `inserted` — count of new documents written per type.
- `updated` — count of existing documents merged per type (entities are upserted by `id` when supplied; edges are upserted by their natural key `(from, to, label)`).
- `errors` — per-item failures (`type`, zero-based `index`, human-readable `reason`). Valid items are still written even when errors are present.

Entity items in the `entities` array accept an optional `id` field (UUID v4). If `id` is supplied, the entity with that ID is updated (or created with that ID). If `id` is omitted, a new entity is always inserted. See [Upsert an Entity](04b-graph-api.md#upsert-an-entity) for full identity semantics.

**Schema validation:** When the target space has `validationMode` set to `strict` or `warn`, each item is validated against the space schema before writing. In strict mode, violating items are skipped and recorded in `errors` (e.g. `"schema_violation: not in entityTypes allowlist: Person, Service"`). In warn mode, violations are recorded as warnings but the item is written. See [Schema Validation](06a-schema-api.md#schema-validation) for the full schema specification.

**Proxy spaces:** add `?targetSpace=<member>` to route all writes to a specific member space.

---

### Structured Query (Read-Only)

```http
POST /api/brain/spaces/:spaceId/query
```

Run a constrained Mongo-style read query against one logical collection. Intended for advanced clients and MCP parity with the `query` tool.

```json
{
  "collection": "entities",
  "filter": { "type": "service", "tags": "backend" },
  "projection": { "name": 1, "type": 1, "tags": 1 },
  "limit": 20,
  "maxTimeMS": 5000
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `collection` | ✅ | One of: `memories`, `entities`, `edges`, `chrono`, `files` |
| `filter` | — | Query filter object (defaults to `{}`) |
| `projection` | — | Projection object (`1` include / `0` exclude) |
| `limit` | — | Max rows (default `20`) |
| `maxTimeMS` | — | Query timeout in milliseconds (default `5000`) |

**Response** `200`:

```json
{
  "results": [ ... ],
  "collection": "entities",
  "count": 12
}
```

---

### List File Metadata Records

```http
GET /api/brain/spaces/:spaceId/files?limit=50&skip=0&tag=design&path=docs/architecture.md
```

Returns metadata rows stored in the brain collection for files (`path`, tags, description, properties, size, author, timestamps).

| Query param | Description |
|-------------|-------------|
| `limit` | Default `50`, max `200` |
| `skip` | Offset for pagination |
| `tag` | Tag filter — case-insensitive **substring** match. For an exact set use `tags` (AND) or `tagsAny` (OR), which are unchanged |
| `path` | Exact path filter |
| `sort` | Sort field: `createdAt`, `updatedAt`, or `path` (see [Sorting](04-brain-api.md#sorting-all-brain-list-endpoints)). Unknown field → `400` |
| `dir` | `asc` or `desc` (default `desc`) |

**Response** `200`:

```json
{
  "files": [ ... ],
  "limit": 50,
  "skip": 0
}
```
