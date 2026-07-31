# Brain API

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Brain API

Base path: `/api/brain`

> **Proxy spaces:** Read operations aggregate across all member spaces. Write operations require `?targetSpace=<member>` in the query string.

### Route prefix

Every memory endpoint lives under the `/spaces/:spaceId/` prefix — the same prefix used by all other brain resource types (entities, edges, chrono, stats). For example:

```http
GET /api/brain/spaces/general/memories
```

> **Breaking change (2.0):** the old two-segment shape `/api/brain/:spaceId/memories` (e.g. `/api/brain/general/memories`) has been **removed**. It previously duplicated these handlers under a second URL; it now returns `404`. Update any client still using it to the `/spaces/:spaceId/` prefix.

### Write a Memory

```http
POST /api/brain/spaces/:spaceId/memories
```

```json
{
  "fact": "Kubernetes pods are ephemeral by design",
  "type": "note",
  "tags": ["k8s", "architecture"],
  "entityIds": [],
  "description": "This means pod-local storage is lost on restart.",
  "properties": { "source": "k8s-docs", "confidence": 0.95 }
}
```

**Response** `201`:

```json
{
  "_id": "a1b2c3d4-...",
  "spaceId": "general",
  "fact": "Kubernetes pods are ephemeral by design",
  "type": "note",
  "tags": ["k8s", "architecture"],
  "entityIds": [],
  "description": "This means pod-local storage is lost on restart.",
  "properties": { "source": "k8s-docs", "confidence": 0.95 },
  "seq": 42,
  "createdAt": "2026-03-25T14:00:00.000Z",
  "updatedAt": "2026-03-25T14:00:00.000Z",
  "author": { "instanceId": "c6ff5d55-...", "instanceLabel": "My Ythril" }
}
```

**Constraints**: `fact` max 50 000 chars. `type` optional string — stored on the document and validated against the space's `typeSchemas.memory` allowlist when set. `tags` must be an array of strings. `description` optional string. `properties` optional object; property values should be a string, number, or boolean (unlike the entity endpoint, the memory/edge/chrono write paths don't reject non-primitive values at the API layer — schema validation is the gate when the space defines the property). Every id in `entityIds` must be a UUID v4 **and** name an entity that exists — passing a name, a malformed id, or an id that resolves to nothing returns `400` and stores nothing. This is the default; a space can opt out with `meta.strictLinkage: false` (see [Reference integrity](12-admin-api.md#reference-integrity)). `ttlDays` optional — see [Record Expiry (TTL)](#record-expiry-ttl).

---

### Record Expiry (TTL)

Any record — memory, entity, edge, or chrono entry — can be given an expiry after which it is
**deleted automatically**. Deletion runs through the normal delete path, so it writes a tombstone that
propagates over sync: an expired record cannot resurrect from a peer (which a raw MongoDB TTL index,
deleting below the application, would allow).

Two ways to set it, both usable together:

- **Per-record** — send `ttlDays` on any write (create or update):
  - `ttlDays > 0` → the record expires that many days after the write (integer, max `36500` ≈ 100 years).
  - `ttlDays: 0` or `ttlDays: null` → the record **never** expires, overriding any space default.
  - `ttlDays` omitted → the space's auto-TTL default is applied **only if the record has no expiry yet**
    (an existing expiry is never silently re-slid by an unrelated edit).
  - A present-but-invalid `ttlDays` (negative, non-integer, out of range) is rejected with `400`.
- **Space-wide default** — set `recordTtlDays` on the space (`PATCH /api/spaces/:id`, or the Spaces
  settings tab). Every new or updated record in that space that doesn't specify its own `ttlDays` expires
  after that many days.

```json
{ "fact": "Temporary scratch note", "ttlDays": 7 }
```

The expiry surfaces as `_expireAt` (an ISO timestamp) on the record. The sweep runs periodically on every
instance; expiry is eventual (granularity is days), not to-the-second. A `ttlDays`-only update (no other
fields) is a valid write — use it to set, extend, or clear an existing record's expiry.

`ttlDays` is accepted on the **MCP** write tools as well (`remember`, `update_memory`, `upsert_entity`,
`update_entity`, `upsert_edge`, `update_edge`, `create_chrono`, `update_chrono`, `write_file`) and per item in
`bulk_write` / `POST /bulk`, with the same semantics — so agents can set an expiry directly.

**Files** carry TTL too: pass `ttlDays` as a **query parameter** on the upload — `POST /api/files/:spaceId?path=…&ttlDays=30`
(a query param so it works for raw-binary bodies) — or the `ttlDays` field on the MCP `write_file` tool. The
expiry is stamped on the file's metadata record; when it lapses, the sweep runs the **full file delete**
(the blob, its embedding chunks, conversion artifacts and any queued job — not just the record), the same as
`DELETE /api/files/:spaceId`. The space-wide `recordTtlDays` default applies to uploads that omit `ttlDays`.

---

### Get a Memory by ID

```http
GET /api/brain/spaces/:spaceId/memories/:id
```

**Response** `200`: Full `MemoryDoc` (same shape as write response).

---

### List Memories

```http
GET /api/brain/spaces/:spaceId/memories?limit=100&skip=0
```

Optional filters:

| Parameter | Description |
|-----------|-------------|
| `tag` | Filter by tag — case-insensitive **substring** match, so `arch` finds `architecture` |
| `description` | Filter by description — case-insensitive **substring**, this field ALONE (unlike `search`, which also spans the name/fact/title field) |
| `properties` | Filter by property **value** (not key) — case-insensitive substring across every value in the bag. Values are stringified first, so `12` finds a numeric `12`. **Cannot use an index** (the keys are user-defined), so it is a bounded collection scan |
| `entityName` | *(memories, chrono)* Filter by LINKED ENTITY name — case-insensitive substring. Resolved to ids server-side; a name matching nothing returns nothing |
| `fromName` / `toName` | *(edges)* Filter the From/To endpoint by entity name, same resolution |
| `entity` | Filter by linked entity ID |
| `limit` | Results per page (default 100, max 500) |
| `skip` | Offset for pagination |

Both `tag` and `entity` can be combined (AND logic). Results are sorted newest-first.

**Response** `200`:

```json
{
  "memories": [ ... ],
  "limit": 100,
  "skip": 0
}
```

Default limit: 100, max: 500. Use `skip` for offset pagination.

---

### Delete a Memory

```http
DELETE /api/brain/spaces/:spaceId/memories/:id
```

**Response** `204` (no body).

---

### Wipe All Memories

```http
DELETE /api/brain/spaces/:spaceId/memories
Content-Type: application/json

{ "confirm": true }
```

**Response** `200` `{ deleted: <count> }`. Rate-limited to 5 requests/minute.

Entities, edges, and chrono entries have the same bulk-wipe endpoint shape — `DELETE /api/brain/spaces/:spaceId/entities`, `.../edges`, and `.../chrono`, each requiring `{ "confirm": true }`, returning `{ deleted: <count> }`, and sharing the same 5/minute bulk-wipe limit. Bulk wipe is rejected on proxy spaces (`400`) — target member spaces individually.

---

### Live Change Stream (Server-Sent Events)

```http
GET /api/brain/spaces/:spaceId/events
```

A [Server-Sent Events](https://developer.mozilla.org/docs/Web/API/Server-sent_events) stream that emits
one message per brain mutation in the space, so a UI can refresh live instead of polling. Each message:

```text
data: {"event":"memory.created","id":"a1b2c3d4-..."}
```

`event` is the change type (`memory.created` / `entity.updated` / `edge.deleted` / `chrono.created` / …,
or `bulk.write` for a batch); `id` is the affected record's ID when applicable. Comments (`:\n\n`) are
sent on connect and every 30 s as a keep-alive.

- **Auth:** space-scoped; read-only tokens may subscribe. A browser `EventSource` cannot set an
  `Authorization` header, and a raw token in the URL leaks into logs/history — so authenticate with a
  **single-use ticket**: `POST /api/brain/spaces/:id/events/ticket` with the normal `Authorization`
  header returns `{ ticket, expiresInMs }`; open the stream with `?ticket=<ticket>`. The ticket is
  single-use (mint a fresh one per connect, including reconnects), expires in ~60 s, and is bound to this
  space's stream. A non-browser client that can set headers should just use `Authorization` directly.
- **Scope:** events fire for writes made through the REST and MCP APIs on this instance. Changes applied
  by the **sync engine** (pulled from a peer) are not emitted here — they appear on the next load.

```js
// Browser: mint a single-use ticket (token stays in the header), then open the stream with it.
const { ticket } = await fetch(`/api/brain/spaces/${space}/events/ticket`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
const es = new EventSource(`/api/brain/spaces/${space}/events?ticket=${encodeURIComponent(ticket)}`);
es.onmessage = (e) => { const { event, id } = JSON.parse(e.data); /* refresh the affected view */ };
// On es.onerror, mint a new ticket before reconnecting — the old one is already spent.
```

---

### Semantic Search (Recall)

Available as both:

- REST: `POST /api/brain/spaces/:spaceId/recall`
- MCP tool: `recall`

```json
{
  "query": "how does OAuth PKCE work?",
  "topK": 10,
  "types": ["memory", "entity"],
  "minScore": 0.65
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `query` | ✅ | — | Natural-language search text (non-empty string) |
| `topK` | — | `10` | Max returned results (1-100) |
| `types` | — | all types | Restrict result knowledge types |
| `minScore` | — | none | Filter out low-similarity matches |
| `filter` | — | none | Property equality/comparison filter (see below) |
| `tags` | — | none | Array of strings — restrict to records carrying these tags |
| `minPerType` | — | none | Object mapping knowledge type → minimum hits, e.g. `{ "entity": 2 }`. Guarantees at least that many results of the type; each value is clamped to `topK` |
| `traverse` | — | `0` | Graph-expansion depth (integer 0–5). `0` = classic recall; > 0 follows edges from each match (see [Graph-Augmented Recall](#graph-augmented-recall-traverse-parameter)) |

**Response** `200`:

```json
{
  "results": [
    { "_id": "...", "type": "memory", "fact": "...", "score": 0.91 }
  ],
  "count": 1
}
```

Searches **all knowledge types** (memories, entities, edges, chrono entries, and files) and includes a
`type` discriminator field on every result. No configuration needed — the defaults below are what a
fresh instance does.

#### How a result is ranked

Recall runs up to three stages. Each is independent, each degrades to the previous one if it is
unavailable, and **none of them can fail a search** — a stage that cannot answer simply has no opinion.

1. **Vector search** (always). The query is embedded with the same model and the same task prefix used at
   index time, and MongoDB `$vectorSearch` returns the nearest records per type. This produces `score`.

2. **Lexical search + rank fusion** (automatic). In parallel, a MongoDB `$text` (BM25-family) query ranks
   the same records lexically, producing `lexicalScore`; the two rankings are combined by **Reciprocal
   Rank Fusion** into `fusedScore`.

   This exists because vector search compares *meaning*, which is the wrong tool for the tokens a corpus
   is most precise about — article numbers, form ids, part codes, clause names, proper nouns. An opaque
   identifier has no useful semantic neighbourhood, so the right record could rank below plausible prose
   and fall outside `topK`. Nothing errored; the answer was just built from the wrong passages.

   Fusion uses **rank, never raw score**: `textScore` is unbounded and grows with term rarity, cosine is
   bounded, and any normalisation between them would need a calibration that drifts as a space grows. A
   record ranked well by *both* channels outranks one that wins a single channel — agreement between an
   exact-token match and a semantic match is the strongest signal either gives.

   The channel both **reorders** the candidate set and can **introduce** a record the vector search did
   not return at all — which matters most for exactly the queries it exists for, since an opaque
   identifier's embedding is nearly arbitrary and its record is therefore the most likely to sit outside
   the vector candidate pool.

   An introduced record is not given an invented score. Its embedding is read and compared against the
   query vector directly, so its `score` is measured on the same scale as every other result and
   `minScore` filters it exactly as it filters the rest. The mapping from raw similarity to the reported
   `score` is *verified on every query* rather than assumed: any record that appears in both channels
   already carries an engine-reported score, and its locally recomputed value must match. If they
   disagree — or if no record overlaps, leaving nothing to check against — **no record is introduced**
   and the channel falls back to reordering alone.

   Set `YTHRIL_HYBRID_SEARCH=off` to disable the whole channel.

3. **Cross-encoder reranking** (only when configured). If `mediaEmbedding.rerank` names an endpoint and a
   model, a cross-encoder reads the query and each candidate passage *together* and scores the actual
   match, producing `rerankScore`. A bi-encoder can only compare two independently-computed summaries of
   meaning; a cross-encoder reads the pair. That is what lifts precision in the top few results.

   It has no index, so it can only re-order what stages 1–2 found — hence `candidateMultiplier`, which
   widens the pool it gets to choose from. Unreachable or unconfigured means no opinion, and the fused
   order stands. See the `mediaEmbedding.rerank.*` rows in [Configuration](17-quotas-pagination-oidc.md#configuration) below.

**Ordering precedence is `rerankScore` → `fusedScore` → `score`** — the order of how much each signal
actually knows.

#### `minScore` always filters on `score`

This is deliberate and worth being explicit about: `minScore` is a **vector-similarity** floor and stays
one. The three scores are on unrelated scales, so reinterpreting a caller's fixed threshold against a
fused rank or a cross-encoder logit would change what that threshold returns without anyone touching it.
Ordering may use the better signal; filtering does not.

The extra scores are returned when they were produced, so a caller can see why a result placed where it
did:

```json
{
  "results": [
    {
      "_id": "...", "type": "file", "path": "specs/NMK-240C.md",
      "score": 0.71,
      "lexicalScore": 4.83,
      "fusedScore": 0.0325,
      "rerankScore": 0.94
    }
  ],
  "count": 1
}
```

`lexicalScore` is absent when the record did not match lexically; `fusedScore` when hybrid is off;
`rerankScore` when no reranker is configured or it did not answer.

**The MCP `recall` tool returns `score` only.** Every field it returns is multiplied by `topK` and paid
for in tokens by whoever called it, so the per-stage scores are deliberately omitted there and kept here,
where the caller is a program and the response is not a model's context window.

#### A request using every capability

Nothing here is required — this is one call exercising all eight parameters at once, to show how they
compose.

```json
POST /api/brain/spaces/dev-apps/recall
{
  "query": "PKCE failures on form NMK-SI-11 during the auth rewrite",
  "topK": 20,
  "types": ["memory", "entity", "chrono", "file"],
  "tags": ["auth", "postmortem"],
  "minPerType": { "entity": 2, "chrono": 1 },
  "minScore": 0.55,
  "traverse": 1,
  "filter": {
    "properties.severity": { "in": ["high", "critical"] },
    "properties.reviewCount": { "gte": 2 },
    "properties.supersededBy": { "exists": false },
    "status": { "ne": "cancelled" }
  }
}
```

Read in the order the server applies them:

| Parameter | What it does here |
|---|---|
| `query` | Ranked semantically **and** lexically. `NMK-SI-11` is the reason the lexical channel matters — its embedding carries almost no meaning. |
| `types` | Restricts which collections are searched at all. Edges are excluded. |
| `tags` | Hard filter, **AND** semantics — a record must carry *both* `auth` and `postmortem`. |
| `filter` | Hard filter. Keys must start with `properties.`, `tags`, `type`, `name`, `status` or `label`; any other key is rejected. Operators: `eq`, `ne`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`. All conditions must match. |
| `minPerType` | Guarantees a floor per type *if that many exist*, so a flood of file passages cannot crowd out every entity. Each value is clamped to `topK`. |
| `minScore` | Applied **last**, on the vector score, and it can drop a `minPerType`-guaranteed result — a floor is a request for coverage, not a licence to return matches you called too weak. |
| `topK` | The final cut. |
| `traverse` | After the cut, follows knowledge-graph edges outward from every match (both directions) and returns the connected entities alongside them. |

**`traverse > 0` changes the response shape** — this is the one thing worth knowing before using it. Each
item becomes a wrapper around the record:

```json
{
  "results": [
    {
      "source": "recall",
      "hops": 0,
      "path": [],
      "spaceId": "dev-apps",
      "type": "file",
      "score": 0.71,
      "record": {
        "_id": "…", "type": "file", "path": "runbooks/NMK-SI-11.md",
        "score": 0.71, "lexicalScore": 4.83, "fusedScore": 0.0325, "rerankScore": 0.94,
        "matchedText": "Form NMK-SI-11 must be filed within 6 hours…"
      }
    },
    {
      "source": "traverse",
      "hops": 1,
      "path": [{ "from": "runbooks/NMK-SI-11.md", "label": "owned-by", "to": "security-team" }],
      "spaceId": "dev-apps",
      "type": "entity",
      "score": null,
      "record": { "_id": "…", "type": "entity", "name": "security-team" }
    }
  ],
  "count": 2
}
```

`score` is `null` on a traversed neighbour on purpose: it was reached **structurally**, not matched. It
has no similarity to the query and inventing one would let `minScore` act on a number nobody measured.

The MCP `recall` tool takes the same parameters, plus `space` (omit it to search every accessible space):

```json
{
  "space": "dev-apps",
  "query": "PKCE failures on form NMK-SI-11 during the auth rewrite",
  "topK": 20,
  "types": ["memory", "entity", "chrono", "file"],
  "tags": ["auth", "postmortem"],
  "minPerType": { "entity": 2, "chrono": 1 },
  "minScore": 0.55,
  "traverse": 1,
  "filter": {
    "properties.severity": { "in": ["high", "critical"] },
    "properties.reviewCount": { "gte": 2 },
    "properties.supersededBy": { "exists": false },
    "status": { "ne": "cancelled" }
  }
}
```

**Performance note.** `tags`, `type`, `name`, `status`, `label` — and, on spaces whose schema declares
them, `properties.<key>` — are pushed into the vector index as native pre-filters. Undeclared
`properties.*` and `exists` are still correct but scan exhaustively, so prefer declared fields on large
spaces. `traverse` above 2 on a dense graph is slow; narrow the seed set with `tags`/`filter` first.

#### Graph-Augmented Recall (`traverse` parameter)

By default `recall` returns matches in isolation — the knowledge-graph edges between records are not consulted. Set `traverse` to an integer between `1` and `5` to follow the graph outward from every match: for each seed, the server walks edges (in **both** directions) up to `traverse` hops and returns the connected entities alongside the matches. This turns semantic search into context-aware retrieval — "recall the Vault service **and everything connected to it**" in one call, instead of a recall followed by manual `traverse`/`query` calls.

`traverse: 0` (the default) is behaviourally identical to classic recall and returns the classic response shape above. When `traverse > 0` the response shape changes: each result is annotated, and a `traverseDepth` field is added.

```json
{
  "query": "authentication token scoping",
  "types": ["entity"],
  "traverse": 2
}
```

**Response** `200` (when `traverse > 0`):

```json
{
  "results": [
    {
      "score": 0.91,
      "source": "recall",
      "hops": 0,
      "path": [],
      "spaceId": "adrs",
      "type": "entity",
      "record": { "_id": "adr-0042", "name": "Token Scoping", "type": "decision" }
    },
    {
      "score": null,
      "source": "traverse",
      "hops": 1,
      "path": [{ "from": "adr-0042", "label": "implements", "to": "adr-0079" }],
      "spaceId": "adrs",
      "type": "entity",
      "record": { "_id": "adr-0079", "name": "Vault Integration", "type": "decision" }
    }
  ],
  "count": 2,
  "traverseDepth": 2
}
```

Per-result annotations:

| Field | Meaning |
|-------|---------|
| `source` | `"recall"` for a direct semantic match (seed), `"traverse"` for a record reached via the graph |
| `hops` | Distance from the nearest seed — `0` for a seed, `1` for a direct neighbour, etc. |
| `path` | The edge chain connecting this record to its seed (`[]` for seeds). Each element is `{ from, label, to }` |
| `score` | Vector similarity for seeds; `null` for traversal-reached records (they were not ranked by the search) |
| `record` | Seed records carry the full recall result; traversal records carry the reached **entity** document |

**Guard rails:**

- **Depth cap:** `traverse` must be `0`–`5`. A value of `6` or higher (or a negative/non-integer value) returns `400` — it is rejected, not clamped.
- **Result cap:** the combined output (seeds + traversal) is capped at `topK × (traverse + 1) × 4`. On dense graphs the traversal is truncated to this budget, preferring lower-hop records.
- **Cycle-safe:** each record is visited once, so a circular graph (A→B→C→A) never loops or produces duplicates. A record reachable by multiple paths keeps its **shortest** path.
- **Space-scoped:** traversal stays within the spaces the calling token may access. An edge pointing at a record in a space the token cannot see (or at an id that is not an entity) is silently skipped — no data and no `403` leak.
- Only **entities** are returned by traversal (edges connect entities); memories, chrono entries, and files still appear as seeds when they match semantically.

**Performance:** traversal issues roughly two batched (`$in`) MongoDB queries per hop, not one query per node. Even so, `traverse > 2` on a densely-connected graph can fan out quickly — pair it with `filter`, `tags`, or a low `topK` to keep the seed set (and therefore the traversal frontier) tight.

#### Prefiltered Recall (`filter` parameter)

Use `filter` to restrict results to records where specific properties match a condition. All filter conditions are AND-ed together. Records not satisfying every condition are excluded.

```json
{
  "query": "authentication architecture decisions",
  "types": ["entity"],
  "filter": {
    "properties.status": { "eq": "accepted" },
    "properties.domain": { "eq": "security" }
  }
}
```

**Supported operators:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Exact equality | `{ "eq": "accepted" }` |
| `ne` | Not equal | `{ "ne": "draft" }` |
| `in` | Value is in array (any-of) | `{ "in": ["security", "auth"] }` |
| `exists` | Property is/isn't present | `{ "exists": true }` |
| `gt` | Greater than (numeric) | `{ "gt": 10 }` |
| `gte` | Greater than or equal | `{ "gte": 5 }` |
| `lt` | Less than (numeric) | `{ "lt": 100 }` |
| `lte` | Less than or equal | `{ "lte": 99 }` |

Multiple operators on the same key are AND-ed (range queries):

```json
{ "properties.score": { "gte": 50, "lt": 100 } }
```

**Allowed filter key prefixes:** `properties.`, `tags`, `type`, `name`, `status`, `label`. Any other key returns `400`. This prevents filter-key injection attacks.

**Examples:**

```json
// Only accepted ADRs
{ "filter": { "properties.status": { "eq": "accepted" } } }

// Records tagged with "security" OR "auth" (any-of)
{ "filter": { "tags": { "in": ["security", "auth"] } } }

// Entities of type "service" with a count property > 0
{ "filter": { "type": { "eq": "service" }, "properties.count": { "gt": 0 } } }

// Records where properties.domain exists
{ "filter": { "properties.domain": { "exists": true } } }
```

> **Performance note:** A filter that references only declared index fields — `tags`, `type`, `name`, `status`, `label`, and any schema-declared `properties.<key>` — using the operators `eq`, `in`, `gt`, `gte`, `lt`, or `lte` is pushed into a native `$vectorSearch` `filter` and runs as `exact:true` search restricted to the matching subset, so cost is proportional to the number of matching records rather than the whole collection. Only undeclared dynamic `properties.*` keys, `exists`, and `ne` fall back to the exhaustive ENN path, which scores every document in the space before applying the filter. To keep a heavily-filtered property on the fast path, declare it in the space schema rather than adding a standalone MongoDB index.

**What is vector-indexed:**

| Data type | Embedded? | Fields included in embedding text | Returned by `recall`? |
|-----------|:---------:|-----------------------------------|:---------------------:|
| `memory` | ✅ | `tags` + entity names + `fact` + `description` + `properties` | ✅ |
| `entity` | ✅ | `name` + `type` + `tags` + `description` + `properties` | ✅ |
| `edge` | ✅ | `tags` + `from` + `label` + `to` + `type` + `description` + `properties` | ✅ |
| `chrono` | ✅ | `type` + `status` + `title` + `tags` + `description` + `properties` | ✅ |
| `file` | ✅ | `path` + `tags` + `description` | ✅ |

> **Note — `properties` in the embedding text.** `properties` are embedded as `key value`
> pairs (both the key *and* the value), so a phrase living only in `properties.outcome` is
> findable via `recall`. `edge` and `chrono` did **not** embed `properties` in releases up to
> 1.4.4 — if you are upgrading, existing records keep their old embedding until they are
> re-embedded. Reindex a space to pick up the change:
> `POST /api/brain/spaces/:spaceId/reindex`.

---

### Find Similar (Vector Similarity by Entry ID)

```http
POST /api/brain/spaces/:spaceId/find-similar
```

Given an existing entry's `_id`, find other entries with high vector similarity. Unlike `recall` (which re-embeds a text query), `find_similar` uses the entry's **stored embedding vector** directly — no re-embedding step. Ideal for deduplication, "more like this", and merge detection.

> **Also available as MCP tool:** `find_similar` — note the MCP tool makes `space` optional (omit it to search all accessible spaces, like `recall`) and adds `traverse`; its `crossSpace` flag is deprecated in favour of omitting `space`. This REST endpoint keeps `spaceId` in the path and the `crossSpace` body flag.

**Request body:**

```json
{
  "entryId": "<UUID of the source entry>",
  "entryType": "memory",
  "targetTypes": ["memory", "entity"],
  "topK": 10,
  "minScore": 0.7,
  "crossSpace": false
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `entryId` | ✅ | — | UUID of the entry to use as the query vector |
| `entryType` | ✅ | — | Knowledge type of the source entry (`memory`, `entity`, `edge`, `chrono`, `file`) |
| `targetTypes` | — | all types | Which knowledge types to search in |
| `topK` | — | `10` | Maximum results (1–100) |
| `minScore` | — | `0.0` | Minimum cosine similarity threshold |
| `crossSpace` | — | `false` | If `true`, search across all spaces the token can access |

**Response** `200`:

```json
{
  "source": { "_id": "...", "type": "entity", "name": "auth-service", "score": 1.0 },
  "results": [
    { "_id": "...", "type": "entity", "name": "auth-gateway", "spaceId": "dev-apps", "score": 0.91 },
    { "_id": "...", "type": "memory", "fact": "Auth service uses PKCE...", "spaceId": "dev-apps", "score": 0.84 }
  ]
}
```

- `source` echoes the input entry with `score: 1.0` (self-match) — excluded from `results`
- Results sorted by `score` descending
- `spaceId` included on each result when `crossSpace: true`

**Common use cases:**

| Use case | Parameters |
|----------|-----------|
| Dedup scan | `entryType: "entity"`, `targetTypes: ["entity"]`, `minScore: 0.90` |
| "More like this" | `topK: 5`, all target types |
| Cross-space merge detection | `crossSpace: true`, `minScore: 0.85`, `targetTypes: ["entity"]` |
| Memory consolidation | `entryType: "memory"`, `targetTypes: ["memory"]`, `minScore: 0.88` |

---

### Upsert an Entity

```http
POST /api/brain/spaces/:spaceId/entities
```

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Kubernetes",
  "type": "technology",
  "tags": ["infra", "containers"],
  "description": "CNCF-graduated container orchestration platform.",
  "properties": { "cncf": true, "version": "1.32" }
}
```

**Response** `201`: Full entity doc.

**Identity model**: If `id` is supplied (must be a valid UUID v4), the entity with that `_id` is updated; if no entity with that ID exists, a new one is created with that ID. If `id` is omitted, a new entity is always inserted with a freshly generated UUID v4. Name is a non-unique searchable label, not a primary key. Multiple entities with the same name and type can coexist in a space (e.g. several "Lisa" entities of type "person").

**Duplicate warning**: When inserting without `id` and entities with the same `name` + `type` already exist, the response includes a `warning` field:

```json
{
  "_id": "...",
  "name": "Lisa",
  "type": "person",
  "warning": "2 existing entities with name 'Lisa' and type 'person' already exist in this space. A new entity was created because no id was supplied. To update an existing entity, provide its id."
}
```

Tags are merged (deduplicated union), properties are shallow-merged (new keys added, existing keys overwritten).

**Constraints**: `name` required string; `type` optional string (defaults to empty); `id` optional UUID v4 (400 if invalid); `tags` optional array of strings; `description` optional string (included in embedding text); `properties` optional object where each value must be a string, number, or boolean.

---

### Find Entities by Name

```http
GET /api/brain/spaces/:spaceId/entities/by-name?name=Kubernetes
```

**Response** `200`:

```json
{
  "entities": [ ... ]
}
```

Returns entities whose name matches the query as a **case-insensitive substring** (not an exact match), regardless of type, **capped at 20 results**. Multiple entities may share a name (name is not a unique key).

---

### Get Entities by IDs

```http
GET /api/brain/spaces/:spaceId/entities/by-ids?ids=id1,id2,id3
```

Batch-fetch entities by ID. `ids` is a comma-separated list (required — `400` if missing), deduplicated and capped at **100** IDs per call. Returns `{ "entities": [ ... ] }`; unknown IDs are simply absent from the result.

---

### Get an Entity by ID

```http
GET /api/brain/spaces/:spaceId/entities/:id
```

Returns the single entity, or `404` if no entity with that ID exists in the space. Edges and chrono entries have the same single-doc shape — `GET /api/brain/spaces/:spaceId/edges/:id` and `GET /api/brain/spaces/:spaceId/chrono/:id`.

---

### List Entities

```http
GET /api/brain/spaces/:spaceId/entities?limit=50&skip=0&sort=name&dir=asc
```

**Response** `200`:

```json
{
  "entities": [ ... ],
  "limit": 50,
  "skip": 0
}
```

Default limit: 50, max: 500.

#### Sorting (all brain list endpoints)

`GET` list endpoints — entities, edges, memories, chrono, and files — accept an optional
`?sort=<field>&dir=asc|desc`. The sort is applied server-side **before** pagination, so it orders the
entire result set across every page, not just the rows on the page you fetch. `dir` defaults to `desc`
(newest-first) when omitted.

The sortable field per collection is whitelisted; an unrecognized field is a `400`, never a silent
fall-back to the default order:

| Collection | Sortable fields |
|------------|-----------------|
| entities | `createdAt`, `name`, `type` |
| edges | `createdAt`, `label`, `from`, `to`, `type` |
| memories | `createdAt`, `type` |
| chrono | `createdAt`, `title`, `startsAt`, `type` |
| files | `createdAt`, `updatedAt`, `path` |

With no `sort` the endpoint keeps its existing default order (entities: insertion order; the others:
`createdAt` desc; files: `updatedAt` desc).

#### Freetext search (`?search=`)

The entities, edges, memories, chrono and file-meta list endpoints accept an optional `?search=<text>`
that matches a **case-insensitive substring** of the record's text fields, applied server-side before
pagination (so it spans the whole set, like sort). The value is treated as a **literal** — regex
metacharacters are escaped, so `a.b` matches the three characters `a.b`, not "a, any char, b".

| Collection | Searched fields |
|------------|-----------------|
| entities | `name`, `description` |
| edges | `label`, `description` |
| memories | `fact`, `description` |
| chrono | `title`, `description` |
| files | `path`, `description` |

(Files also keep their exact `?path=` filter — distinct from this substring `?search=`; entities keep
the exact `?name=` filter and the semantic `/entities/by-name` endpoint.)

---

### Delete an Entity

```http
DELETE /api/brain/spaces/:spaceId/entities/:id
```

**Response** `204` when no inbound references exist (or the space has opted out with `strictLinkage: false`).

**Response** `409 Conflict` when the entity still has inbound backlinks (the default; a space that opted out with `strictLinkage: false` deletes regardless) (edges, memories, or chrono entries that reference it). The caller must first delete or relink the backlinked items before the deletion is permitted. Response body:

```json
{
  "error": "Cannot delete: entity has inbound references",
  "backlinks": [
    { "type": "edge", "_id": "e1b2c3d4-..." },
    { "type": "memory", "_id": "m5f6a7b8-..." },
    { "type": "chrono", "_id": "c9d0e1f2-..." }
  ]
}
```

---

### Merge Two Entities

```http
POST /api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId
Content-Type: application/json
```

Merge two entities into one. The **survivor** keeps its identity (ID, name, type, description); the **absorbed** entity is deleted after all references are relinked.

**Request body** (optional):

```json
{
  "resolutions": [
    { "key": "score", "resolution": "fn:avg" },
    { "key": "label", "resolution": "survivor" },
    { "key": "category", "resolution": "custom", "customValue": "merged-category" }
  ]
}
```

**Behaviour:**

| Scenario | Status | Response |
|----------|--------|----------|
| No property conflicts, or all conflicts resolved | `200` | Merged entity + relinking info |
| Unresolved property conflicts remain | `409` | `MergePlan` with conflict details |
| Survivor or absorbed entity not found | `404` | Error |
| Invalid resolution | `400` | Error |

**Response `200`** (merge executed):

```json
{
  "merged": { "_id": "...", "name": "...", "properties": { ... }, ... },
  "absorbedId": "absorbed-entity-uuid",
  "relinked": true,
  "duplicateEdgeWarnings": [
    {
      "survivorEdgeId": "edge-1-uuid",
      "absorbedEdgeId": "edge-2-uuid",
      "from": "survivor-uuid",
      "to": "target-uuid",
      "label": "depends_on"
    }
  ]
}
```

**Response `409`** (unresolved conflicts — no mutation):

```json
{
  "survivorId": "...",
  "absorbedId": "...",
  "propertyConflicts": [
    {
      "key": "score",
      "type": "number",
      "survivorValue": 80,
      "absorbedValue": 100,
      "suggestedFn": "avg",
      "resolved": false
    }
  ],
  "absorbedOnlyProperties": [
    { "key": "extra", "value": "info" }
  ],
  "duplicateEdgeWarnings": []
}
```

**Per-property resolution options:**

| Property type | Valid resolutions |
|---------------|-------------------|
| `number` | `"survivor"`, `"absorbed"`, `"fn:avg"`, `"fn:min"`, `"fn:max"`, `"fn:sum"` |
| `boolean` | `"survivor"`, `"absorbed"`, `"fn:and"`, `"fn:or"`, `"fn:xor"` |
| `string` / other | `"survivor"`, `"absorbed"`, `"custom"` (with `customValue`) |

**Relinking:** All edges, memories, and chrono entries referencing the absorbed entity are unconditionally rewritten to reference the survivor. Edges where `(from, to, label)` become identical after relinking appear in `duplicateEdgeWarnings[]` — the agent resolves them via `DELETE /api/brain/spaces/:spaceId/edges/:id`.

**`suggestedFn`:** When `propertySchemas` includes a `mergeFn` for a conflicting property, it appears as `suggestedFn` in the conflict. The agent may accept or override it.

**Proxy spaces:** Not supported — target member spaces directly.

---

### Upsert an Edge

```http
POST /api/brain/spaces/:spaceId/edges
```

```json
{
  "from": "550e8400-e29b-41d4-a716-446655440000",
  "to": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "label": "depends_on",
  "weight": 0.9,
  "type": "causal",
  "tags": ["infra"],
  "description": "K8s uses Docker as its container runtime."
}
```

**Response** `201`: Full edge doc.

| Field | Required | Description |
|-------|----------|-------------|
| `from` | yes | Source entity UUID v4 (not a name when `strictLinkage` is enabled). Returns `400` if not a valid UUID and `strictLinkage` is on. |
| `to` | yes | Target entity UUID v4 (not a name when `strictLinkage` is enabled). Returns `400` if not a valid UUID and `strictLinkage` is on. |
| `label` | yes | Relationship label (e.g. `depends_on`, `related_to`) |
| `weight` | no | Numeric weight (0–1). Defaults to none. |
| `type` | no | Free-form edge type string (e.g. `causal`, `hierarchical`). |
| `tags` | no | Array of strings. Merged (union) with existing tags on upsert. Included in embedding text and filterable via `recall`. |
| `description` | no | Optional prose description of the relationship. Included in embedding text. |
| `properties` | no | Optional key-value metadata object. Values must be string, number, or boolean. Shallow-merged on upsert. |

Upserts on `(spaceId, from, to, label)`.

---

### List Edges

```http
GET /api/brain/spaces/:spaceId/edges?limit=50&skip=0
```

**Response** `200`:

```json
{
  "edges": [ ... ],
  "limit": 50,
  "skip": 0
}
```

---

### Delete an Edge

```http
DELETE /api/brain/spaces/:spaceId/edges/:id
```

**Response** `204`.

---

### Traverse Graph

BFS traversal from a starting entity, following edges up to `maxDepth` hops.

```http
POST /api/brain/spaces/:spaceId/traverse
```

**Body**:

```json
{
  "startId":    "entity-uuid",
  "direction":  "outbound",
  "edgeLabels": ["depends_on", "references"],
  "maxDepth":   2,
  "limit":      50
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `startId` | ✅ | — | UUID of the starting entity |
| `direction` | — | `"outbound"` | `"outbound"` follows edges from the node, `"inbound"` follows edges to it, `"both"` follows in either direction |
| `edgeLabels` | — | all labels | Filter traversal to specific edge labels only |
| `maxDepth` | — | `3` | Maximum hops from `startId`; hard-capped at `10` |
| `limit` | — | `100` | Maximum total nodes returned |

**Response** `200`:

```json
{
  "nodes": [
    { "_id": "...", "name": "auth-service", "type": "service", "depth": 1 },
    { "_id": "...", "name": "user-service",  "type": "service", "depth": 2 }
  ],
  "edges": [
    { "_id": "...", "from": "...", "to": "...", "label": "depends_on" }
  ],
  "truncated": false
}
```

- `nodes` — entities discovered during traversal, excluding the start entity itself; each node includes a `depth` field indicating the hop count from `startId`
- `edges` — only the edges actually traversed (not all edges of the returned nodes)
- `truncated: true` if `limit` was reached before exhausting the graph

Server-side cycle detection ensures each entity is visited at most once, so cyclic graphs are handled safely.

---

### Create a Chrono Entry

```http
POST /api/brain/spaces/:spaceId/chrono
```

**Body**:

```json
{
  "title": "Release v1.0",
  "type": "milestone",
  "startsAt": "2026-06-01T00:00:00Z",
  "description": "First public release",
  "status": "upcoming",
  "confidence": 0.9,
  "tags": ["release"],
  "entityIds": [],
  "memoryIds": []
}
```

- `type` — `event`, `deadline`, `plan`, `prediction`, `milestone`
- `status` — `upcoming` (default), `active`, `completed`, `overdue`, `cancelled`. You never need to set
  `overdue` yourself: it is **derived on read** — an entry whose due moment (`endsAt`, or `startsAt` if
  it has none) has passed and that is not `completed`/`cancelled` is returned as `overdue`.
- `confidence` — `0`–`1` (optional, useful for predictions)
- `entityIds` — array of UUID v4 entity IDs (not names); returns `400` if any value is not a valid UUID and `strictLinkage` is enabled
- `memoryIds` — array of UUID v4 memory IDs (not names); returns `400` if any value is not a valid UUID and `strictLinkage` is enabled

**Response** `201` — the created `ChronoEntry`.

---

### Update a Chrono Entry

```http
POST /api/brain/spaces/:spaceId/chrono/:id
```

**Body**: partial object with any updatable fields (`title`, `type`, `status`, `startsAt`, `endsAt`, `confidence`, `tags`, `entityIds`, `memoryIds`, `description`).

**Response** `200` — the updated `ChronoEntry`.

---

### List Chrono Entries

```http
GET /api/brain/spaces/:spaceId/chrono?limit=50&skip=0
```

#### Query parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `after` | ISO 8601 string | Return entries with `createdAt` > this timestamp |
| `before` | ISO 8601 string | Return entries with `createdAt` < this timestamp |
| `tags` | comma-separated strings | Return entries where `tags` contains **ALL** listed values (AND semantics) |
| `tagsAny` | comma-separated strings | Return entries where `tags` contains **ANY** listed value (OR semantics) |
| `search` | string | Case-insensitive substring match on `title` and `description` |
| `status` | string | Filter by status (`upcoming`, `active`, `completed`, `overdue`, `cancelled`). `overdue` is derived on read (past due + not completed/cancelled); filtering by `upcoming`/`active` excludes now-overdue entries |
| `type` | string | Filter by type (`event`, `deadline`, `plan`, `prediction`, `milestone`) |
| `limit` | number | Max entries to return (default 50, max 500) |
| `skip` | number | Pagination offset (default 0) |
| `sort` | string | Sort field: `createdAt`, `title`, `startsAt`, or `type` (see [Sorting](#sorting-all-brain-list-endpoints)). Unknown field → `400` |
| `dir` | string | `asc` or `desc` (default `desc`) |

#### Example queries

```http
GET /api/brain/spaces/:id/chrono?after=2026-04-04T00:00:00Z
GET /api/brain/spaces/:id/chrono?after=2026-01-01T00:00:00Z&before=2026-04-01T00:00:00Z&tags=incident
GET /api/brain/spaces/:id/chrono?tagsAny=deploy,auth-service
GET /api/brain/spaces/:id/chrono?search=migration
```

**Response** `200`:

```json
{
  "chrono": [ ... ],
  "limit": 50,
  "skip": 0
}
```

---

### Delete a Chrono Entry

```http
DELETE /api/brain/spaces/:spaceId/chrono/:id
```

**Response** `204`.

---

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
  "files": 31
}
```

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

Entity items in the `entities` array accept an optional `id` field (UUID v4). If `id` is supplied, the entity with that ID is updated (or created with that ID). If `id` is omitted, a new entity is always inserted. See [Upsert an Entity](#upsert-an-entity) for full identity semantics.

**Schema validation:** When the target space has `validationMode` set to `strict` or `warn`, each item is validated against the space schema before writing. In strict mode, violating items are skipped and recorded in `errors` (e.g. `"schema_violation: not in entityTypes allowlist: Person, Service"`). In warn mode, violations are recorded as warnings but the item is written. See [Schema Validation](06-spaces-api.md#schema-validation) for the full schema specification.

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

ation naming the missing capability — diagnostic, not display copy.

It is attached only to single-file fetches because deciding it probes the page renderer; a 50-row listing
would turn that into a burst of sidecar traffic for a column nobody is reading.

| Query param | Description |
|-------------|-------------|
| `limit` | Default `50`, max `200` |
| `skip` | Offset for pagination |
| `tag` | Tag filter — case-insensitive **substring** match. For an exact set use `tags` (AND) or `tagsAny` (OR), which are unchanged |
| `path` | Exact path filter |
| `sort` | Sort field: `createdAt`, `updatedAt`, or `path` (see [Sorting](#sorting-all-brain-list-endpoints)). Unknown field → `400` |
| `dir` | `asc` or `desc` (default `desc`) |

**Response** `200`:

```json
{
  "files": [ ... ],
  "limit": 50,
  "skip": 0
}
```

---

### Partial Update with deleteFields

All `PATCH` update endpoints — entities, edges, and memories — accept an optional `deleteFields` array of dot-notation paths. This allows callers to remove specific fields from a document in the same atomic operation as normal property/tag updates.

```http
PATCH /api/brain/spaces/:spaceId/entities/:id
PATCH /api/brain/spaces/:spaceId/edges/:id
PATCH /api/brain/spaces/:spaceId/memories/:id
```

**Example — delete a property key while adding a new one:**

```json
{
  "properties": { "newKey": "value" },
  "tags": ["current-tag"],
  "deleteFields": [
    "properties.oldKey",
    "properties.anotherStaleKey",
    "description"
  ]
}
```

**Path semantics:**

| Path | Effect |
|------|--------|
| `"properties.oldKey"` | Deletes that key from the `properties` map |
| `"description"` | Deletes the top-level `description` field |
| `"properties"` | Deletes the entire `properties` map (only if the space schema allows it) |
| `"weight"` | Deletes the `weight` field (edges only) |
| `"properties.items.*.stale"` | Wildcard: deletes `stale` from every object inside the `items` array |

**Rules:**

- `deleteFields` is applied **after** the normal merge — so you can add new properties and delete stale ones in the same request.
- Paths targeting non-existent keys are silently ignored (no error).
- System fields (`id`, `_id`, `name`, `type`, `spaceId`, `createdAt`, `updatedAt`) **cannot** be deleted. Attempting to do so returns `400`.
- Paths with empty segments (e.g. `"properties..key"`) are rejected with `400`.
- If the result after `deleteFields` + merge violates a `required: true` property schema in `typeSchemas` (with `validationMode: "strict"`), the request is rejected with `422` listing the missing required keys. No partial mutation occurs.
- `deleteFields` can be the **only** parameter in the request body (no other updates needed).
- Omitting `deleteFields` retains the existing merge behaviour — no breaking change for existing clients.
- **Re-embedding:** deleting any content field (`properties`, `description`, `tags`, `fact`, `entityIds`) triggers re-embedding of the affected document. Bulk `deleteFields` updates may incur embedding service latency.

**Response** — same shape as a normal `PATCH` update (`200` with the updated document).

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | `deleteFields` is not an array of strings, contains empty strings, or targets a system field |
| `422` | Post-deletion state violates a `required: true` property schema in strict validation mode |

> **⚠️ Warning:** Fields deleted via `deleteFields` are **permanently removed**. Recovery requires audit logs or a backup. The explicit path list design is intentional — accidental data loss requires consciously naming each field to remove.

**MCP tools:** `update_memory`, `update_entity`, and `update_edge` also accept a `deleteFields` array parameter with the same semantics.

---
