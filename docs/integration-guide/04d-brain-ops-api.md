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

Returns `409 { "error": "Reindex already in progress" }` if one is already running — **instance-wide, not
per space.** One reindex runs at a time across the whole instance, and a second request is *refused rather
than queued*. An operator who fired thirteen at once got one `200` and twelve `409`s; a loop that counts only
non-200s as failures would report thirteen dispatched having dispatched one. **Retry on 409** is the correct
client, and it self-paces.

Returns `400` with the member spaces named if `:spaceId` is a **proxy**:

```json
{ "error": "'team' is a proxy space and has no index of its own. Reindex its members instead: qa, research.",
  "proxyFor": ["qa", "research"] }
```

A proxy has no index of its own — its members do. This used to answer `200` and re-embed those members, which
the caller was usually reindexing individually as well, so everything under the proxy was embedded twice.
`GET /api/spaces` carries `proxyFor` on any space that has one, so a client can skip proxies without
discovering this by trying.

> **Reindexing does NOT repair "search returns nothing".** It re-computes the embeddings *stored on*
> your records. Recall queries those vectors through a separate `$vectorSearch` index, and that index
> can be missing while every record still holds a perfectly good embedding — after restoring a backup,
> or if the database search process was not ready when the instance started. Reindexing every record
> in the space will not create it. Use the rebuild endpoint below.

### Reorder spaces

```http
POST /api/spaces/reorder
```

```json
{ "ids": ["general", "research", "photos"] }
```

Admin + MFA. Sets the display order of spaces in the UI's sidebar and space pickers. `ids` must name **every** space you
want ordered — a space whose id is absent keeps its existing position relative to the ones you did name.

| Field | Required | Description |
|-------|----------|-------------|
| `ids` | ✅ | Space ids in the desired order, 1–40 characters each, at least one entry |

**Response** `200`: the reordered spaces as `{ id, label, builtIn, folders, … }`. `400` if any id names no space — the
whole call is rejected rather than partially applied, so a typo cannot silently reorder a subset.

---

### Which tokens can reach a space

```http
GET /api/brain/spaces/:spaceId/token-access
```

**Admin only** (on top of the space's own read right), because it enumerates the instance's tokens. Powers the Overview
tab's token-access matrix.

**Response** `200`:

```json
{
  "tokens": [
    { "name": "ci-writer", "level": "full", "allSpaces": false, "peer": false, "expiresAt": null }
  ]
}
```

| Field | Meaning |
|---|---|
| `level` | `admin`, `readOnly`, or `full` |
| `allSpaces` | `true` when the token has no space allow-list, so it reaches every space |
| `peer` | `true` for a token belonging to a peer instance rather than a person or client |

It returns the **minimum** the matrix needs and **never** a hash, a prefix, or any other secret material. A token reaches
this space when it has no allow-list or lists this space; `schemaLibrary` tokens have no space access at all and never
appear.

---

### Media embedding queue for a space

```http
GET /api/brain/spaces/:spaceId/embedding-queue
```

The **media** half of the queue — file chunks produced by the conversion pipeline. For brain records (memories, entities,
edges, chrono) see [Vectorless records](#vectorless-records--the-embed-queue-for-brain-records), which is a separate
collection with a separate worker.

**Response** `200`:

```json
{
  "pending": 3, "processing": 1, "complete": 412, "failed": 2,
  "failedSample": [ … ], "failedByReason": [ { "reason": "ffmpeg exited 1", "count": 2 } ]
}
```

Summed across member spaces for a proxy space. `failedByReason` is grouped across the whole fleet before truncation, so a
proxy's grouping describes its members rather than whichever one was read first.

---

### Retry every failed media job in a space

```http
POST /api/brain/spaces/:spaceId/embedding-queue/retry-failed
```

Re-queues **all** failed media jobs in the space (and across members for a proxy). Requires `files: write`.

**Response** `202`: `{ "retried": 7 }`.

Retry-all is offered here and deliberately **not** for brain records: a media failure is usually about the worker, where a
brain record's failure is usually about that record. See the per-record retry above.

---

### Vectorless records — the embed queue for brain records

A brain record is written and its vector is computed **after** the response. If the embedder is unreachable or the text
chokes it, the record is **stored** and a job records the failure — it is not dropped. But a record without a vector is
**invisible to `recall` and to `query`'s semantic path**: the vector search cannot return it, and the lexical fallback
needs an embedding to score. These two endpoints are how you find those records and get them embedded.

This is the **record** half of the queue. `GET /embedding-queue` (without `/records`) is the **media** half — file chunks
from the conversion pipeline. They are separate collections with separate workers.

```http
GET /api/brain/spaces/:spaceId/embedding-queue/records
```

| Query param | Description |
|-------------|-------------|
| `status` | `pending`, `processing`, or `failed`. Omit for all three. An unknown value is a `400`, never a silently ignored filter |
| `limit` | Default `50`, max `200`. `0`, a negative, or a non-integer is a `400` |
| `skip` | Rows to discard before the page (default `0`). A negative or non-integer is a `400` |

**Response** `200`:

```json
{
  "counts": { "pending": 2, "processing": 0, "failed": 1 },
  "jobs": [
    {
      "recordType": "memory",
      "recordId": "3f2c…",
      "spaceId": "general",
      "status": "failed",
      "attempts": 5,
      "maxAttempts": 5,
      "lastError": "embedding model unreachable",
      "createdAt": "2026-08-13T09:12:04.311Z",
      "updatedAt": "2026-08-13T09:18:47.902Z"
    }
  ]
}
```

`counts` aggregates **every** job in the space; `jobs` is one page of them. Page with `skip` — without it a space reporting
`failed: 500` would have no way to reach failure #201, and the point of this endpoint is that its failures are actionable.
`limit` and `skip` are echoed so a draining loop can tell what was applied, and a `skip` past the end returns an empty
`jobs` array with the counts intact, which is how the loop terminates.

Newest-first by `updatedAt`, with the record id breaking ties so the order is **total** and pages cannot overlap. `attempts === maxAttempts` with `status: "failed"` means the queue has **given up** — it
will not retry on its own, and the record stays unfindable until you retry it or rewrite it. Each row carries its own
`spaceId`, which for a **proxy space** is the member space the record actually lives in — that is the space to retry it
in. `counts` is returned whether or not you filtered, so a caller can filter to `failed` and still see the whole picture.

Requires `knowledge: read`. Deliberately readable by a token that cannot write: an operator who cannot fix the queue
still needs to be able to see it.

---

### Retry one record's embedding

```http
POST /api/brain/spaces/:spaceId/embedding-queue/records/retry
```

```json
{ "recordType": "memory", "recordId": "3f2c…" }
```

| Field | Description |
|-------|-------------|
| `recordType` | `memory`, `entity`, `edge`, `chrono`, or `file`. Anything else is a `400` |
| `recordId` | The record's `_id`, as the listing reports it. Required |
| `targetSpace` | Required when `:spaceId` is a **proxy** space: the member space holding the record |

Resets the job to `pending`, clears `attempts` and `lastError`, and wakes the worker. The record's stored text is
untouched — this re-embeds what is already there rather than re-writing it.

**Response** `202`:

```json
{ "result": "ok", "recordType": "memory", "recordId": "3f2c…", "spaceId": "general" }
```

| `result` | Status | Meaning |
|---|---|---|
| `ok` | `202` | Re-queued. The worker will pick it up; it has not embedded yet |
| `processing` | `200` | A worker already holds this job. **Left alone** rather than reset, so the run in progress is not interrupted. Not an error |
| `not_found` | `404` | No job for that record — either it embedded successfully, or the record is gone |

Per record rather than "retry all failed": a brain record's failure is usually about *that record* (an oversized fact, a
property the embedder choked on), where a media failure is usually about the worker. Retrying a thousand records that
will each fail again hides the problem. If a whole space needs re-embedding — after changing the embedding model, for
instance — use [Reindex Space](#reindex-space) instead.

Requires `knowledge: write`. Audited as `brain.retry_embedding`, with the failure it was retried from in the snapshot: a
successful retry clears `lastError`, so the audit entry is the only place the original reason survives.

Both endpoints are also MCP tools — `list_embed_jobs` and `retry_record_embedding`. See [MCP](16-mcp.md).

---

### Reset a space's recorded usage

```http
POST /api/spaces/:spaceId/activity/reset
```

Deletes the hourly usage buckets behind the Overview **usage** panel for this space. Admin + MFA, scoped to the
space — clearing a usage record changes no memory, entity, edge or file, so it is an administrative act on the
space's own bookkeeping rather than a knowledge write, and it sits with the other destructive space operations.

**Response** `200`:

```json
{ "ok": true, "spaceId": "general", "cleared": 412 }
```

`cleared` is how many hourly buckets were removed. It is in the response because afterwards the panel reads zero
either way, and nothing on screen distinguishes a reset from a space that was genuinely idle. Audited as
`space.activity.reset` for the same reason — so that answer survives the request.

In-memory counters are flushed first. Without that, up to a minute of already-counted traffic would land in
Mongo moments later and the panel would appear to un-reset itself.

**Irreversible.** The buckets are deleted, not hidden. Note that usage is *already* transient — buckets carry a
90-day TTL — so this brings forward a deletion the store would have done anyway rather than destroying a
permanent record.

Returns `404` if no space has that id.

---

### Rebuild search indexes

```http
POST /api/spaces/:spaceId/rebuild-indexes
```

Recreates the space's `$vectorSearch` indexes. Requires **admin + MFA** and is recorded in the audit
log as `space.indexes.rebuild`. Also available in the UI at **Settings → Spaces → Danger Zone →
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
| `limit` | — | Max rows (default `20`, capped at `100`) |
| `skip` | — | Rows to discard before the page (default `0`) — see below |
| `sort` | — | Field to order by. Per-collection allowlist; an unlisted field is a `400` naming the allowed ones. Omit for newest-first |
| `dir` | — | `asc` or `desc` (default `desc`). Only meaningful with `sort` |
| `maxTimeMS` | — | Query timeout in milliseconds (default `5000`) |

Any other field is a `400`. See **Unknown body fields are refused** below.

**Response** `200`:

```json
{
  "results": [ ... ],
  "collection": "entities",
  "count": 12,
  "total": 4831,
  "limit": 20,
  "skip": 0
}
```

`count` is **this page**. `total` is **every document the filter matches**, ignoring `limit` and `skip` — that is the
number you need to know whether a sweep is finished, and without it a short last page is indistinguishable from a
truncated one. On a proxy space it is the sum across member spaces. It costs one count per member per call, bounded by
`maxTimeMS`, and it is always returned: a caller who does not know to ask for it is exactly the caller who ends up
guessing.

When you pass `sort`, the applied `sort` and `dir` are echoed back too.

#### Sortable fields, per collection

| Collection | Fields |
|---|---|
| `entities` | `createdAt`, `name`, `type` |
| `edges` | `createdAt`, `label`, `from`, `to`, `type`, `weight` |
| `memories` | `createdAt`, `type` |
| `chrono` | `createdAt`, `title`, `startsAt`, `endsAt`, `status`, `type` |
| `files` | `createdAt`, `updatedAt`, `path` |

The same allowlist, parser and error text as [Sorting](04-brain-api.md#sorting-all-brain-list-endpoints) on the list
endpoints. **`_id` is appended to every order**, including one you choose — that is what keeps the order *total*, so
`skip` pages through it without a row drifting between pages and being seen twice or missed.

#### Paging with `skip`

| Field | Default | Meaning |
|---|---|---|
| `limit` | `20` | Max documents, clamped to 100 |
| `skip` | `0` | Rows to discard before the page. Must be a **non-negative integer** — a negative or fractional value is a `400`, not a silent `0` |

The result order is **total** — `seq`, then `updatedAt`, `createdAt`, `_id` — so no row can drift between pages and be
seen twice or missed. Concatenating `skip=0,5,10,…` gives you the collection exactly once, in order.

```json
{ "results": [ … ], "collection": "memories", "count": 3, "limit": 3, "skip": 4 }
```

`limit` and `skip` are echoed back, so a paging loop can distinguish *the page you asked for* from *what the server
capped it to*. A `skip` past the end returns an empty `results` — it does **not** return the last page, so a loop that
stops on an empty page terminates.

On a **proxy space** the page is computed over the **merged** set of all member spaces, not per member: the server takes
the first `skip + limit` rows from each member, merges them into the documented order, and returns the window. A deep
page therefore costs more on a proxy space than on a plain one, but it is the same page.

#### Unknown body fields are refused

These four read routes accept a fixed set of body fields and **reject anything else with a `400`** naming the offending
keys:

| Route | Accepted fields |
|---|---|
| `POST /query` | `collection`, `filter`, `projection`, `limit`, `skip`, `sort`, `dir`, `maxTimeMS` |
| `POST /recall` | `query`, `topK`, `types`, `minScore`, `filter`, `traverse`, `tags`, `minPerType`, `maxPerType`, `maxTimeMS`, `includeFreshWrites`, `includeContent` |
| `POST /traverse` | `startId`, `direction`, `edgeLabels`, `maxDepth`, `limit`, `includeChrono`, `includeMemories`, `includeFiles`, `includeEdges` |
| `POST /find-similar` | `entryId`, `entryType`, `topK`, `minScore`, `targetTypes`, `traverse`, `includeContent`, `crossSpace` *(deprecated, still accepted)* |

```json
{
  "error": "Unknown field(s): orderBy. Allowed: collection, filter, projection, limit, skip, sort, dir, maxTimeMS",
  "unrecognized_keys": ["orderBy"]
}
```

**This is a deliberate break with the previous behaviour, and it is the point.** These bodies used to accept any key and
honour the ones they recognised. aigents paged a sweep with `skip` before it was implemented, got `200` every time, and
counted page one repeatedly as if it had advanced — *"it cost us a fabricated number"*. A parameter the server cannot
honour is now an error rather than a wrong answer that looks right.

`sort` and `dir` **are** accepted on `/query` — they were added after this refusal shipped, and this table is the
authoritative list rather than a summary of it. `client-bodies-match-server.test.js` compares every row here against the
sets the routes enforce, so a parameter cannot be added to a route and left undocumented, or documented as refused while
being accepted.

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
