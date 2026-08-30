# Entities, Edges & Graph

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Entities, Edges & Graph

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

`sort` and `?search=` work the same way on every brain list endpoint — see [Sorting](04-brain-api.md#sorting-all-brain-list-endpoints) and [Freetext search](04-brain-api.md#freetext-search-search).

---

### Delete an Entity

```http
DELETE /api/brain/spaces/:spaceId/entities/:id
```

**Response** `204` when no inbound references exist (or the space has opted out with `strictLinkage: false`).

**Response** `409 Conflict` when the entity still has inbound backlinks (the default; a space that opted out with `strictLinkage: false` deletes regardless). The caller must first delete or relink the backlinked items before the deletion is permitted.

Everything that can reference an entity is checked: **edges** on either endpoint, and the `entityIds` of **memories**, **chrono entries** and **files**. Face labels (`file.faceEntityId`) are reported too, with `type: "face"` — but they are deliberately **not blocking**, because a face label is something the system inferred rather than a link somebody wrote. So a `409` body may contain `face` rows alongside the blocking ones, and a body containing *only* `face` rows is not a refusal.

Response body:

```json
{
  "error": "Cannot delete: entity has inbound references",
  "backlinks": [
    { "type": "edge", "_id": "e1b2c3d4-..." },
    { "type": "memory", "_id": "m5f6a7b8-..." },
    { "type": "chrono", "_id": "c9d0e1f2-..." },
    { "type": "file", "_id": "f3a4b5c6-..." }
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

> **Not to be confused with `recall`'s `traverse` parameter**, which shares the name and does a different
> job: it expands outward from whatever a *semantic query* matched, while this endpoint starts from an
> **entity id you already hold**. Use this one when you have the node; use
> [`recall` with `traverse`](04a-recall-api.md#graph-augmented-recall-traverse-parameter) when you can only describe it.

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
| `includeChrono` | — | `true` | Also reach chrono entries whose `entityIds` reference a traversed node. Set `false` for entity-only results. A non-boolean is a `400`, never coerced |
| `includeMemories` | — | `false` | Also reach memories whose `entityIds` reference a traversed node, marked `kind: "memory"`. **Opt-in, unlike `includeChrono`** — see the note below. A non-boolean is a `400` |
| `includeFiles` | — | `false` | Also reach files whose `entityIds` reference a traversed node, marked `kind: "file"` and carrying **file meta only**. Opt-in. A non-boolean is a `400` |
| `includeEdges` | — | `true` | Whether the response carries the `edges` list. **This does not change the walk** — edges are how the graph is traversed. A non-boolean is a `400` |

**Response** `200`:

```json
{
  "nodes": [
    { "_id": "...", "name": "auth-service", "type": "service", "depth": 1 },
    { "_id": "...", "name": "user-service",  "type": "service", "depth": 2 },
    { "_id": "...", "name": "Unit collected by carrier", "type": "event", "depth": 1, "kind": "chrono" }
  ],
  "edges": [
    { "_id": "...", "from": "...", "to": "...", "label": "depends_on" },
    { "_id": "...", "from": "...", "to": "...", "label": "chrono.entityIds" }
  ],
  "truncated": false
}
```

- `nodes` — records discovered during traversal, excluding the start entity itself; each node includes a `depth` field indicating the hop count from `startId`
- `edges` — only the edges actually traversed (not all edges of the returned nodes)
- `truncated: true` if `limit` was reached before exhausting the graph

Server-side cycle detection ensures each record is visited at most once, so cyclic graphs are handled safely.

#### Chrono entries are nodes

`chrono.entityIds` is the link between a timeline and the graph, and traversal follows it — a chrono entry
that references a traversed node is returned as though joined by an **inbound** edge, which is what that
field is. No schema change was needed; the link already existed and simply had no reader here.

- **A chrono node carries `kind: "chrono"`. An entity node carries no `kind` at all**, so every response you
  were already parsing is unchanged. Read `kind` before following an `_id`: the two live in different
  collections, and `type` cannot tell you which (a chrono's is `event`/`deadline`/…, an entity's is whatever
  the space calls it).
- **The synthetic edge is labelled `chrono.entityIds`** and carries its own id, shaped
  `<label>:<from>:<to>` — deliberately not a UUID, because there is no stored edge behind it and an id that
  looked like a real one would invite a lookup that cannot succeed. **Do not fetch a synthetic edge by id:**
  `GET /edges/:id` reads the edge collection only, so any id here answers `404`. Follow the NODE instead.
  Because the label is real, `edgeLabels` filters it like any other: an explicit filter that does not name it
  **excludes** chrono entries.

  > *Changed:* this id used to be the chrono's own `_id`, on the stated rationale that looking it up would
  > resolve to the chrono. It never did — the edge lookup is collection-scoped — and sharing an id between a
  > node and an edge made graph libraries drop the edge, since they keep one id namespace for both.
- **A chrono is a leaf.** Traversal does not expand outward from one — a chrono links to entities, not to
  other chrono entries, so expanding would only walk back to entities already visited.
- Set `includeChrono: false` for the previous entity-only behaviour.

#### Memories are nodes too, on request

`memory.entityIds` is the same kind of link, and `includeMemories: true` follows it. A memory node carries
`kind: "memory"`, its `name` is the memory's `fact`, and its `type` may be an empty string — a memory's type is
optional, unlike a chrono's. The synthetic label is `memory.entityIds`, and like the chrono label it is filtered
by an explicit `edgeLabels`. A memory is a leaf, for the same reason a chrono is.

**Why this one is opt-in when `includeChrono` is not.** Chrono entries are sparse — an incident has ten, not ten
thousand — and were invisible without traversal. Memories are usually the most numerous record type in a space,
and every node returned counts against `limit`. On by default, a memory-heavy space would fill the answer with
memories and truncate away the entities you traversed for. Turn it on deliberately, and raise `limit` with it.

#### Files are nodes too, and only their meta comes back

`includeFiles: true` follows `file.entityIds`, so a document about an entity is reachable from it. The node is
the **file**, not its passages: `_id` and `name` are the path, and `description` and `tags` ride along when set.

**No passage text, ever.** A file's body is its chunks — the largest thing this product stores, and what
`recall` returns when you search for content. A structural walk must not pay for them, so a file node carries
none: no `content`, no `matchedText`, no `chunkIndex`. Once you know which document you want, read it with the
file API.

This also means **one node per file, not one per chunk**. Chunks live in the same collection as the file they
belong to and are distinguished only by `parentFileId`; the traversal excludes them explicitly. A forty-passage
document is one node.

Opt-in for the same reason as memories, and the synthetic label is `file.entityIds`.

#### Suppressing the edge list

`includeEdges: false` returns the same `nodes` with `edges: []`. It is a **response** switch, not a traversal
one: the walk still follows every edge it would otherwise, so the node set is byte-for-byte what you would get
with the list included. Use it when you want what is reachable and the connecting relationships would only cost
tokens — a large traversal spends much of its payload on edges.

If you need fewer edges *followed*, that is `edgeLabels`, which genuinely narrows the walk.

This closes a gap an integrator measured: reconstructing a 33-day hardware-RMA timeline took four `query()`
calls plus two repository greps, and the first pass still missed the carrier ticket — it had to be found by a
name regex instead of by traversal from the incident.

---

### Data Model (inferred ER)

```http
GET /api/brain/spaces/:spaceId/er-model
```

The space's entity-relationship model, derived from the schema **and** from what is stored. Read-only,
nothing cached, every number a real count of records.

> **Also available as MCP tool:** `er_model` — same output, same proxy rule (members reported separately),
> and available to every token including read-only ones. It answers what a space *contains*, where
> `get_space_meta` answers what its schema *permits*; an agent deciding how to write into an unfamiliar
> space usually wants both.

```json
{
  "spaceId": "ops",
  "entityTypes": [
    {
      "type": "service",
      "count": 128,
      "declared": true,
      "namingPattern": "^[a-z-]+$",
      "properties": [
        { "name": "tier", "type": "string", "required": true, "enumValues": ["gold", "silver"] }
      ],
      "linkedFrom": { "memories": 412, "chrono": 0, "files": 89 }
    }
  ],
  "relationships": [
    { "from": "deployment", "to": "service", "label": "targets", "count": 1204 }
  ],
  "danglingEdges": 0,
  "truncated": null,
  "totals": { "entities": 1771, "edges": 1929 }
}
```

**Both sources, because they disagree and the disagreement is the point.** Three cases, and a caller should
handle all three:

| `declared` | `count` | what it means |
|---|---|---|
| `true` | `> 0` | the ordinary case |
| `true` | `0` | a type nobody writes — the schema is aspirational, or the writers do not know it exists |
| `false` | `> 0` | **records outside the declared vocabulary.** Under `validationMode: "strict"` these can no longer be written, so they are history; under `warn` they are still arriving |

A model built from `typeSchemas` alone would show the second case and silently omit the third — which is
backwards, because the third is the one nobody knows about.

Notes:

- **`relationships` are type-level.** An edge joins two entity *instances*; a relationship is the edge set
  grouped by `(from type, label, to type)`, with `count` being how many real edges back it.
- **`danglingEdges`** counts edges whose endpoint does not resolve to an entity. Normally `0`; a non-zero
  value on a space with `strictLinkage` on is worth investigating.
- **`truncated`** is `null` or `{ scan, limit }`. Both reads are capped, and a capped read says so rather
  than presenting a partial diagram as complete. `totals` is measured **before** the cap, so you can see
  what share of the space the model covers.
- **An entity with no `type` is bucketed as `(untyped)`** rather than dropped, so the per-type counts add up.
- **`properties` lists what the schema declares**, not what records happen to carry. An undeclared type
  reports `[]` — the model does not infer a schema from data it has not been asked to validate.
- **On a proxy space the members are reported separately**, as `{ spaceId, members: [ …model per member… ] }`.
  They are not merged: two spaces can use one type name for different things, and an edge cannot cross a
  space, so a merged model would show relationships that can never be joined.
