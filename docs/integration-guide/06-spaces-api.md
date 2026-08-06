# Spaces API

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Spaces API

Base path: `/api/spaces`

### List Spaces

```http
GET /api/spaces
GET /api/spaces?counts=true
```

Returns spaces accessible to the requesting token. Tokens with a `spaces`
scope restriction only receive spaces in their allowlist; full-access tokens
receive all spaces.

Add `?counts=true` to include per-space document counts (memories, entities,
edges, chrono). Useful for agents deciding which spaces are populated and
worth querying.

**Response** `200`:

```json
{
  "spaces": [
    {
      "id": "general",
      "label": "General",
      "builtIn": true,
      "description": "Default workspace space.",
      "counts": { "memories": 42, "entities": 10, "edges": 5, "chrono": 3 },
      "usageGiB": 0.05
    }
  ],
  "docExtractionCeiling": "auto",
  "storage": {
    "usageGiB": { "files": 0.02, "brain": 0.03, "total": 0.05 },
    "limits": { "totalLimitGiB": 200, "warnAtPercent": 80 }
  }
}
```

> **Note:** `counts` fields are only present when `?counts=true` is passed. `storage.usageGiB` is the instance total (files + brain), and `storage.limits` echoes the configured quota (`totalLimitGiB`, `warnAtPercent`); each space object also carries its own `usageGiB` number. `docExtractionCeiling` is the instance document-extraction ceiling (`off` / `ocr` / `vlm` / `repair` / `auto`) — the highest mode any space may pick; the admin UI uses it to constrain each space's extraction dropdown.

---

### Create a Space

**Admin only** — `POST /api/spaces` requires an admin token (and a valid `X-TOTP-Code` when MFA is enabled); it is `requireAdminMfa`-gated. A non-admin token gets `403`.

```http
POST /api/spaces
Authorization: Bearer <admin-token>
```

```json
{
  "id": "research",
  "label": "Research Notes",
  "description": "Papers, notes, and findings from the AI research team.",
  "folders": ["papers", "notes"],
  "maxGiB": 2
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | no | Lowercase `^[a-z0-9-]+$`, max 40 chars. Auto-generated if omitted. |
| `label` | yes | Human-readable display name, max 200 chars. |
| `description` | no | **Deprecated** — writes `meta.purpose`. Max 4000 chars. Removal in 3.0. |
| `folders` | no | Pre-create these directories on disk at space creation time. |
| `maxGiB` | no | Maximum storage quota for the space (positive number in GiB). |

**Response** `201`: the created space object, wrapped in a `space` field:

```json
{ "space": { "id": "research", "label": "Research Notes", "indexStatus": "building" } }
```

> **Async vector-index build:** creating a real space returns immediately with `indexStatus: "building"`. The space is writable straight away, but semantic `recall` returns no results until the Atlas vector indexes finish building and `indexStatus` flips to `"ready"` (this can take up to a few minutes; a failed build reports `"failed"`). Poll the space via `GET /api/spaces` if you need to gate recall on readiness. Proxy spaces and spaces created before this behaviour have no `indexStatus` and should be treated as ready.

---

### Create a Proxy Space

A proxy space is a virtual space that groups multiple real spaces into a single endpoint. Reads aggregate across all member spaces; writes require a `targetSpace` parameter to specify the destination.

```http
POST /api/spaces
```

```json
{
  "id": "all-research",
  "label": "All Research",
  "description": "Aggregated view of biology and physics research spaces.",
  "proxyFor": ["bio-research", "physics-research"]
}
```

**Rules:**

- All `proxyFor` members must be existing real spaces (not proxies — nesting is not allowed).
- Proxy spaces are virtual: no DB collections or file directories are created.
- Creating the proxy is admin-gated (like any space creation); the create call validates only that each member exists and is not itself a proxy — it does **not** separately check the caller's space allowlist. (Per-space access is enforced at read/write time on the proxy's member spaces.)
- The single-element wildcard `"proxyFor": ["*"]` creates an **all-spaces** proxy: it aggregates over every real space the caller can access (resolved dynamically), skipping per-member validation. The wildcard cannot be mixed with explicit member IDs.

**Read operations** (GET memories, entities, edges, files, recall, query) aggregate results across all member spaces transparently.

**Write operations** (POST memories, write_file, upsert_entity, etc.) require a `targetSpace` query parameter:

```http
POST /api/brain/spaces/all-research/memories?targetSpace=bio-research
```

```json
{ "fact": "CRISPR efficiency improved by 40% with new guide RNA design." }
```

The `targetSpace` must be one of the proxy's `proxyFor` members. Omitting it on a write returns `400`.

**MCP**: When connected via MCP to a proxy space, read tools (`recall`, `query`, `read_file`, `list_dir`) aggregate automatically. Write tools (`remember`, `upsert_entity`, `write_file`, etc.) accept an optional `targetSpace` argument — required when the MCP endpoint is a proxy space.

---

### Rename a Space

```http
PATCH /api/spaces/:id/rename
Content-Type: application/json
Authorization: Bearer <admin-token>

{ "newId": "new-space-name" }
```

`newId` must be lowercase alphanumeric + hyphens, 1-40 chars (`/^[a-z0-9-]+$/`).

The rename atomically:

- Moves all MongoDB collections (memories, entities, edges, chrono, tombstones, files, etc.) to the new prefix.
- Moves the file directory from `/data/files/{old}` to `/data/files/{new}`.
- Updates all network `spaces[]` arrays and adds a `spaceMap` entry so peers continue syncing.
- Updates all token `spaces[]` scopes that referenced the old ID.

**Response** `200`:

```json
{ "space": { "id": "new-space-name", "label": "My Space", ... } }
```

| Status | Meaning |
|--------|---------|
| `400`  | Invalid `newId` format, or trying to rename a built-in space (e.g. `general`) |
| `404`  | Source space does not exist |
| `409`  | `newId` already exists |
| `500`  | Partial rename failure (collections may be in an inconsistent state) |

---

### Update a Space

```http
PATCH /api/spaces/:id
```

Update space properties. Requires an admin token (+ TOTP if MFA is enabled). At least one of `label`, `description`, or `meta` must be provided.

**Optimistic concurrency (`If-Match`).** Meta writes are last-write-wins by default: if two clients read a space, both edit it, and both save, the second save replaces the first in full. To make your write conditional, send the `meta.version` you read as an `If-Match` header:

```http
PATCH /api/spaces/research
If-Match: 7
```

If the space's `meta.version` is no longer 7, the request is rejected with **412 Precondition Failed** and a body naming both versions — re-read the space, re-apply your change, and retry:

```json
{
  "error": "Space meta has changed since you read it (you expected version 7, it is now 9). Re-read the space and re-apply your change.",
  "expectedVersion": 7,
  "currentVersion": 9
}
```

Notes:

- **The header is optional.** Omit it and the write proceeds unconditionally, exactly as before — existing clients are unaffected.
- `meta.version` is returned by `GET /api/spaces`. A space that has never had meta written is version `0`, so `If-Match: 0` means "only if nobody has configured this yet".
- Bare (`7`), quoted (`"7"`) and weak (`W/"7"`) forms are all accepted, as is `*` (matches any existing space).
- A value that is not a version — `If-Match: abc` — is rejected with **400**, never ignored. Silently ignoring an unparseable precondition would give you the false impression that your write was protected.
- The same header is honoured by **every route that writes space meta**: `PUT /api/spaces/:id/schema` (checked before that route writes its schema backup file), and the single-type `PUT` and `DELETE` on `/api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName`.

**Read-modify-write needs no stripping step.** `GET /api/spaces/:id/meta` returns the meta fields alongside
`version` and `updatedAt`, which the server owns and you cannot set. `PATCH` **ignores** those (and
`previousVersions`) rather than rejecting the request, so you can send back what you read:

```http
GET  /api/spaces/research/meta      →  { "spaceId": "research", "spaceName": "Research",
                                          "purpose": "...", "typeSchemas": { ... },
                                          "version": 7, "updatedAt": "...", "stats": { ... } }

PATCH /api/spaces/research          →  { "meta": { "purpose": "...", "typeSchemas": { ... },
                                                   "version": 7, "updatedAt": "..." } }   ✅ accepted
```

Ignoring is not accepting: the version the `If-Match` check reads cannot be written from a request body, and
the server still bumps it.

**Two things `meta` still rejects with a `400`, both deliberately:**

- **The response envelope.** `spaceId`, `spaceName` and `stats` are the shape of the `GET`, not part of `meta`.
  Posting the whole response body as `meta` is a real mistake and you should hear about it.
- **Any other unknown key.** A typo like `validationMdoe` must not be silently ignored — you would come away
  believing you had turned validation on. The tolerance covers only the fields that genuinely belong to `meta`
  and that we ourselves emit.

**Removing a type schema.** `PATCH` deep-merges, so omitting a type does not delete it — a merge that could delete would make every PATCH potentially destructive, and a client that round-trips a space would silently drop schemas whenever its serialiser emitted `null` for an unset field. Deletion is explicit instead: `DELETE /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName` for one type (404 if it does not exist), or `PUT /api/spaces/:id/schema` to replace the whole map.

```json
{
  "label": "Research Notes (Updated)",
  "description": "Updated description surfaced to MCP clients as space-level instructions.",
  "meta": {
    "purpose": "Team engineering knowledge base.",
    "validationMode": "strict",
    "typeSchemas": {
      "entity": {
        "service": {
          "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
          "tagSuggestions": ["backend", "frontend", "infra"],
          "propertySchemas": {
            "status": { "type": "string", "enum": ["active", "deprecated", "planned"], "required": true },
            "score":  { "type": "number", "minimum": 0, "maximum": 100, "mergeFn": "avg" }
          }
        },
        "team": {},
        "technology": {},
        "concept": {}
      },
      "edge": {
        "depends_on": {},
        "owns": {},
        "related_to": {}
      },
      "memory": {
        "default": {
          "propertySchemas": {
            "count": { "type": "number", "mergeFn": "sum" }
          }
        }
      }
    },
    "tagSuggestions": ["backend", "frontend", "infra"],
    "strictLinkage": true
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `label` | no | New display name, max 200 chars. |
| `description` | no | **Deprecated alias of `meta.purpose`**, max 4000 chars — it writes that one field, and both names read back the same text. Because purpose is meta, a description change to a **networked** space follows the meta-vote path (`202 vote_pending`) rather than applying at once. Removal in 3.0. |
| `meta` | no | Space schema definition (see [Schema Validation](#schema-validation) below). |

**Response** `200`: the updated space object.

If the space participates in a network and `meta` is included, the update triggers a governance vote and returns `202`:

```json
{ "status": "vote_pending", "rounds": [...], "message": "Meta change requires network vote" }
```

**Two meta votes can be open at once, and they no longer overwrite each other.** A round records the
fields it proposes and the `meta.version` it was computed against; when it passes, only those fields are
applied, re-merged into whatever the meta says at that moment. Rounds stay open for
`votingDeadlineHours`, so a second proposal landing before the first concludes is ordinary — previously
the later round wrote back a full snapshot taken when it opened, silently reverting the earlier one's
edit with a correctly-recorded carried vote to hide it.

When two rounds change the **same** field the later one to conclude wins: the network voted for that
value, and refusing to apply a carried motion would relocate the silent loss rather than remove it. The
overwrite is written to the server log naming the field, the round's base version and the current one, so
the superseded operator can find out.

A round proposed by a peer running an older build carries neither field and is applied wholesale, exactly
as before — its proposer computed the snapshot as the complete intended result, so field-merging an
unknown changed-set would apply nothing at all.

> **MCP tool:** `update_space` — accepts `label` and `purpose` (and `description` as the deprecated
> spelling of `purpose`). Requires `admin: true`.

---

### Get Space Meta

```http
GET /api/spaces/:id/meta
Authorization: Bearer <token>
```

Returns the full schema definition for a space along with derived stats.

**Response** `200`:

```json
{
  "spaceId": "eng-kb",
  "spaceName": "Engineering Knowledge Base",
  "purpose": "Team engineering knowledge base.",
  "usageNotes": "Markdown-formatted usage guidance for the web UI.",
  "validationMode": "strict",
  "typeSchemas": {
    "entity": {
      "service": {
        "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
        "tagSuggestions": ["backend", "frontend"],
        "propertySchemas": {
          "status": { "type": "string", "enum": ["active", "deprecated"], "required": true }
        }
      },
      "team": {}
    },
    "edge": {
      "depends_on": {},
      "owns": {}
    }
  },
  "tagSuggestions": ["backend", "frontend"],
  "stats": { "memories": 142, "entities": 53, "edges": 87, "chrono": 12, "files": 31 }
}
```

> **MCP tool:** `get_space_meta` — returns the same information. Available to all tokens (not admin-only).

---

### Get Space Completeness

*New in 2.1.*

```http
GET /api/spaces/:id/completeness
Authorization: Bearer <token>
```

How much of what the space *declared* it would hold, it actually holds. A space is "set up" long before
it is usable: schemas declare types nothing instantiates and properties nothing fills, entities pile up
with no edges between them, files land that recall cannot see. None of that errors.

Separate from `/meta` on purpose — that endpoint is read on every schema edit and stays cheap, while this
one walks the collections. Read-only; the Brain's Overview panel is its main consumer.

**Response** `200`:

```json
{
  "spaceId": "eng-kb",
  "score": 74,
  "truncated": false,
  "checks": [
    {
      "id": "file-not-recallable",
      "severity": "warn",
      "scope": "file",
      "affected": 3,
      "total": 31,
      "weight": 3,
      "earned": 2.7096774193548385,
      "sample": ["contracts/2024-addendum.pdf", "scans/plan-b.tiff"],
      "targetTab": "files"
    },
    {
      "id": "declared-type-unused",
      "severity": "info",
      "scope": "edge",
      "affected": 1,
      "total": 2,
      "weight": 1,
      "earned": 0.5,
      "sample": ["owns"],
      "targetTab": "edges"
    }
  ]
}
```

**The checks are the primitive; `score` is their weighted roll-up.** A percentage nobody can decompose is
a number nobody can act on, so every point lost belongs to a named check with a sample and a destination.

| Field | Meaning |
|---|---|
| `score` | `0`–`100`, the weighted roll-up of `earned / weight` across `checks`. `null` only when no check applied at all. |
| `checks` | **Only checks that applied.** A check with no denominator is absent, not present with `total: 0` — a question this space cannot be asked is not one it failed. |
| `id` | Which check. A check id appears **once per knowledge kind** — an unused entity type and an unused edge label are different findings. |
| `severity` | `warn` = records are already wrong or invisible. `info` = the space is thinner than it declared. |
| `scope` | `entity` / `memory` / `edge` / `chrono` / `file`, or `space` for a finding about the space itself. |
| `affected` / `total` | How many of the checked things are wrong, out of how many were checked. |
| `weight` / `earned` | The check's contribution to the score, and how much of it this space kept. Credit is proportional: 1 unlinked entity in 40 does not score like 40 in 40. |
| `sample` | At most 5 identifiers — type names, `type.property` keys, or record ids/paths. |
| `targetTab` | The Brain tab holding the affected records, or `null` for a `space`-scoped finding. |
| `truncated` | `true` when a type declared more than 50 properties and the tail was not examined. Surfaced rather than silently dropped. |

**The checks:**

| `id` | What it finds |
|---|---|
| `declared-type-unused` | A key in `typeSchemas.<kind>` with no matching records — the schema describes an intention, not the contents. |
| `undeclared-type-in-use` | Records whose `type` (or edge `label`) is absent from a **non-empty** allowlist — exactly what `validationMode: "strict"` would now reject. An empty allowlist accepts everything, so it is not checked at all. Untyped records are out of scope: validation only fires on a value that is present and unknown. |
| `declared-property-never-filled` | A `propertySchemas` key no record of that type carries. Presence on *any* record clears it — this is not a fill-rate measure. |
| `entity-without-edges` | Entities with no inbound or outbound edge. An entity graph with no edges is a list. |
| `file-not-recallable` | File records that are neither embedded themselves nor chunked by the conversion pipeline — recall cannot reach them in any form. |
| `meta-purpose-missing` | `meta.purpose` is unset, so MCP clients get no directive at handshake. |
| `schemas-declared-but-unenforced` | `typeSchemas` is non-empty while `validationMode` is `off`. |

For a proxy space, the checks aggregate across every member space, the same as `/meta`'s counts.

---

### Get Single Type Definition

```http
GET /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
Authorization: Bearer <token>
```

Returns a single type definition from the space's `typeSchemas`. `:knowledgeType` must be one of `entity`, `memory`, `edge`, `chrono`.

**Response** `200`:

```json
{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": {
    "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
    "tagSuggestions": ["backend", "frontend"],
    "propertySchemas": {
      "status": { "type": "string", "enum": ["active", "deprecated"], "required": true }
    }
  }
}
```

Returns `404` when the space or the requested type name does not exist. Returns `400` for an invalid `:knowledgeType`.

---

### Replace Full Schema (Bulk Overwrite)

```http
PUT /api/spaces/:id/schema
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Full-replace semantics for the entire `meta.typeSchemas` map. Use this when you want to overwrite all type definitions across all knowledge types in a single call (for example, restoring an exported schema). For incremental updates, prefer `PUT /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName` (single type) or `PATCH /api/spaces/:id` (deep-merge).

Before the new schema is written, the previous `typeSchemas` is automatically backed up to `_schema-backup-<ISO-timestamp>.json` inside the space's file store, so a bad replacement can be recovered or re-imported. Backup write failures are logged but never block the replacement.

`$ref` values inside any property schema are validated against the instance's schema library — unknown refs return `422` with the list of missing entries.

**Request body**:

```json
{
  "typeSchemas": {
    "entity": {
      "service": { "namingPattern": "^[a-z][a-z0-9-]{1,60}$" },
      "person":  {}
    },
    "memory": { "decision": {} },
    "edge":   { "depends_on": {} },
    "chrono": { "release": {} }
  }
}
```

**Response** `200` — the updated space document.

**Errors:**

- `400` — body fails `TypeSchemas` Zod validation.
- `404` — space not found.
- `422` — one or more `$ref` values point at non-existent schema-library entries.

---

### Upsert Single Type Definition

```http
PUT /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Adds or updates a single type definition in the space's `typeSchemas`. All other type definitions (including those of other knowledge types) are left unchanged. The request body is a `TypeSchema` object.

**Request body**:

```json
{
  "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
  "tagSuggestions": ["backend", "frontend"],
  "propertySchemas": {
    "status": { "type": "string", "enum": ["active", "deprecated"], "required": true }
  }
}
```

An empty object `{}` is valid and registers the type name as allowed (no extra constraints).

**Response** `200`:

```json
{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { "..." : "..." }
}
```

**Constraints:**

- `:knowledgeType` must be one of `entity`, `memory`, `edge`, `chrono`.
- The body is validated with the same `TypeSchema` Zod rules as the full `PATCH /api/spaces/:id` endpoint (property schema `mergeFn`/`type` compatibility, field max lengths, etc.).
- At most 200 type definitions per knowledge type. Adding a 201st type returns `400`.
- The meta version counter is incremented and the previous version is pushed to history (same as full PATCH).

---

### Delete Single Type Definition

```http
DELETE /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
Authorization: Bearer <admin-token>
```

Removes a single type definition from the space's `typeSchemas`. All other types are left unchanged.

**Response** `204` (no body) on success.

Returns `404` when the space or type name does not exist. Returns `400` for an invalid `:knowledgeType`.

---

### Validate Schema (Dry Run)

```http
POST /api/spaces/:id/validate-schema
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Scans existing data against the current (or proposed) schema definition without writing anything. Pass a `meta` body to test a schema change before applying it, or omit to validate against the current schema.

**Request body** (optional):

```json
{
  "meta": {
    "validationMode": "strict",
    "typeSchemas": {
      "entity": { "service": {}, "person": {} }
    }
  }
}
```

**Response** `200`:

```json
{
  "spaceId": "eng-kb",
  "meta": { "validationMode": "strict", "typeSchemas": { "entity": { "service": {}, "person": {} } }, "..." : "..." },
  "totalViolations": 3,
  "violations": [
    {
      "collection": "entities",
      "_id": "550e8400-e29b-41d4-a716-446655440000",
      "violations": [
        { "field": "type", "value": "concept", "reason": "not in entityTypes allowlist: Person, Service" }
      ]
    }
  ]
}
```

Scans up to 10,000 documents per collection per member space. Response capped at 500 violations.

---

### Schema Validation

Each space can define a schema in its `meta` block that governs what data is accepted. The `validationMode` controls enforcement:

| Mode | Behaviour |
|------|-----------|
| `off` | No validation. All writes accepted. This is what an **absent** `validationMode` resolves to. |
| `warn` | Violations are returned as `warnings` in the response but writes proceed. |
| `strict` | Violations cause a `400` with `{ "error": "schema_violation", "violations": [...] }`. |

> **A space you create is `strict`, not `off`.** New spaces are seeded with `validationMode: "strict"`
> and `strictLinkage: true`. Only a space whose meta never had the field — one created before those
> defaults, or through a path that does not seed meta — falls back to `off`. With no `typeSchemas`
> defined yet, `strict` still accepts every type and label, so it never blocks a brand-new empty space;
> it starts mattering the moment you define a schema.

**Every write validates the record as it will be.** A `PATCH` (and the matching `update_*` MCP tool)
validates the **merged** result — the stored record with your patch applied — not the patch on its own.
Validating the fragment would fail every partial update that does not restate every required property, so
the answer would be meaningless. In `strict` mode a violating update is refused with `422`:

```json
{
  "error": "schema_violation",
  "message": "The change violates this space's schema: status.",
  "violations": [ { "field": "status", "value": "nonsense", "reason": "not in enum: open, closed" } ],
  "introduced": [ { "field": "status", "…": "…" } ],
  "preExisting": []
}
```

`introduced` and `preExisting` are the same violations, split by **whose fault they are**:

| Field | Meaning |
|-------|---------|
| `introduced` | Not present before this patch. Your change caused it. |
| `preExisting` | Present before and still present. Your change neither caused nor fixed it. |

A record can be non-compliant before you touch it — written before the schema tightened, imported, or
synced from a peer with different meta. Both kinds block, because the merged record is what gets stored
and storing a known-invalid record is how a space drifts permanently out of conformance. The record is
**not** trapped: validation is of the merged result, so including the offending field in the same request
repairs it and the write succeeds. The `message` says which of the two situations applies, so you are not
sent after a field you did not touch.

In `warn` mode the write proceeds and the same three lists are reported.

**An upsert onto an existing record is an update, and is validated the same way.** `POST .../entities`
with an `id` that already exists merges into the stored record, so it is the merged form that is checked —
you can set one property without restating the rest. For edges the identity is `(from, to, label)` with no
id involved at all, so **every** repeat `POST .../edges` merges. An upsert that lands on nothing is an
insert, and there the payload *is* the record: required properties must be present.

*New in 2.2.* Previously an update was validated only when the request used `deleteFields`; every other
patch could write a value the same space rejects at create time. *New in 2.3.* An upsert was validated
against the incoming payload rather than the merged record, so a partial upsert onto a complete record was
refused for properties that record already had.

**Schema structure — `typeSchemas`:**

The schema is expressed as a single `typeSchemas` object on the space `meta`. It groups configuration by knowledge type (`entity`, `edge`, `memory`, `chrono`) and then by type name (e.g. `"service"`, `"depends_on"`). Each entry is a `TypeSchema` object:

```typescript
interface TypeSchema {
  namingPattern?: string;                         // entity only — regex for name validation
  tagSuggestions?: string[];                      // RETIRED — accepted and stored, consumed by nothing
  propertySchemas?: Record<string, PropertySchema>;
}
interface PropertySchema {
  type?: 'string' | 'number' | 'boolean' | 'date';
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  pattern?: string;    // regex, ReDoS-protected
  mergeFn?: 'avg' | 'min' | 'max' | 'sum' | 'and' | 'or' | 'xor';  // entity merge hint
  required?: boolean;  // if true, property must be present on every write
  default?: string | number | boolean;  // value inserted when property is absent
}
```

**`typeSchemas` example:**

```json
{
  "typeSchemas": {
    "entity": {
      "service": {
        "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
        "tagSuggestions": ["backend", "frontend"],
        "propertySchemas": {
          "status": { "type": "string", "enum": ["active", "deprecated"], "required": true },
          "score":  { "type": "number", "minimum": 0, "maximum": 100, "mergeFn": "avg" }
        }
      },
      "team": {}
    },
    "edge": {
      "depends_on": {},
      "owns": {}
    },
    "memory": {
      "default": {
        "propertySchemas": {
          "confidence": { "type": "number", "minimum": 0, "maximum": 1, "default": 1 }
        }
      }
    },
    "chrono": {
      "milestone": {
        "tagSuggestions": ["release", "launch"]
      }
    }
  }
}
```

What the schema enforces:

- **Entity type allowlist** — the keys of `typeSchemas.entity` (e.g. `"service"`, `"team"`) define the allowed entity `type` values (max 200 per knowledge type).
- **Edge label allowlist** — the keys of `typeSchemas.edge` define the allowed edge `label` values.
- **Chrono type allowlist** — the keys of `typeSchemas.chrono` define the allowed `type` values.
- **Memory type allowlist** — the keys of `typeSchemas.memory` define the allowed `type` values.
- **Naming patterns** (`namingPattern`) — per entity type, a regex for validating `name` (max 500 chars, ReDoS-protected).
- **Property value constraints** (`propertySchemas`) — per type, define `type` (string/number/boolean/date), `enum`, `minimum`/`maximum`, `pattern` (regex, ReDoS-protected), `required`, `default`, and `mergeFn`.
- **Tag suggestions** (`tagSuggestions`) — **retired.** Both the per-type and the space-wide list are
  still accepted, stored and returned unchanged, but nothing consumes them: the Brain record forms
  suggest from the tags already in use in each collection, and the schema guidance sent to MCP clients
  no longer summarises them. There is no longer an editor for either on the Schema tab or in the
  Schema Library. Existing values are left in place rather than deleted, so the retirement is
  reversible and no operator's list is destroyed on their next save — but do not expect writing one to
  have any effect.

**Top-level `meta` fields:**

| Field | Description |
|-------|-------------|
| `typeSchemas` | Per-type schema definitions (see above). **The PATCH merge is exactly two levels deep, and the second one REPLACES.** A knowledge type you do not mention is preserved; a *type name* you do not mention inside one is preserved; but a type name you **do** mention has its definition object **replaced wholesale**, not merged. So `PATCH {"meta":{"typeSchemas":{"chrono":{"event":{"retention":{"days":90}}}}}}` leaves `entity` and every other chrono type untouched — and wipes `event`'s own `propertySchemas`, `namingPattern` and `tagSuggestions`. **Read the type first and send it back complete.** Deleting a type needs `PUT /:id/schema` (full replace), because under merge semantics an absent type is indistinguishable from a removed one. |
| `tagSuggestions` | **Retired.** A space-wide list of non-enforced tag hints. It is still accepted and stored (so an existing list is preserved untouched, and the change is reversible) but nothing reads it: it no longer feeds tag autocomplete in the Brain record forms, and no longer appears in the schema guidance returned to MCP clients. It was one list, editable in a single place, applied to every type and every form in the space — easy to set once and forget while quietly steering what got tagged. Autocomplete now comes from the tags actually in use, which maintains itself. **The per-type `typeSchemas.<kind>.<type>.tagSuggestions` is retired on exactly the same terms** — stored, returned, read by nothing, no editor. An earlier revision of this line said it was "unaffected", which contradicted the `typeSchemas` section above and left an integrator unable to tell which sentence was current; both lists are dead, and clearing either is safe. `null` is **rejected** with a 400 on a meta write; `[]` empties the list and is the way to clear one. There is no route that removes a top-level `meta` key, so the field itself stays present and empty — which is what makes the retirement reversible. |
| `strictLinkage` | When `true`, all reference fields (`from`/`to`, `entityIds`, `memoryIds`) must be valid UUID v4 values, and entity deletion is blocked while inbound backlinks exist. **Default: `true`** — and an absent value also resolves to `true`. Turning it off is a deliberate per-space choice to accept dangling references (the case it exists for is bulk import, where targets are resolved in a later pass); you do not get that by saying nothing. |
| `purpose` | Short description of the space (max 4000 chars). Returned by `get_space_meta`. |
| `usageNotes` | Extended Markdown-formatted guidance for LLM clients (max 50 000 chars — the settings form shows a live count and accepts the same limit). Returned by `get_space_meta`. |

Schema validation runs on:

- Individual writes: `POST /entities`, `POST /edges`, `POST /memories`, `POST /chrono`
- Bulk writes: `POST /bulk` (per-item; strict skips violating items, warn records warnings)
- MCP tools: `remember`, `upsert_entity`, `upsert_edge`, `create_chrono`, `bulk_write`

**Security:** Regex patterns in `namingPattern` and `propertySchemas.pattern` are protected against ReDoS: patterns are limited to 500 characters, test values to 10K characters, and structural analysis rejects nested quantifiers and alternation-with-quantifier patterns.

**`mergeFn` in `propertySchemas`:** Optional merge function for entity properties. Used as the default `suggestedFn` when merging entities via `POST /entities/:survivorId/merge/:absorbedId`. Valid values depend on the declared `type`:

| Type | Valid `mergeFn` values |
|------|----------------------|
| `number` | `avg`, `min`, `max`, `sum` |
| `boolean` | `and`, `or`, `xor` |
| `string` | *(not supported — merge resolution is always explicit)* |

Incompatible `mergeFn`/`type` combinations (e.g. `sum` on `boolean`) are rejected with `400` at schema save time.

---

### Schema Library

The Schema Library is an instance-level store of reusable `TypeSchema` definitions. Spaces can reference a library entry with `$ref` instead of duplicating the inline schema. Editing a library entry is reflected in every referencing space immediately — no space re-patch is needed.

Library entries are stored in `schema-library.json` (sibling to `config.json`). Max 500 entries per instance.

**Entry structure:**

```json
{
  "name": "service-v1",
  "knowledgeType": "entity",
  "typeName": "service",
  "description": "Standard service entity schema",
  "schema": {
    "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
    "tagSuggestions": ["backend", "frontend"],
    "propertySchemas": {
      "owner": { "type": "string", "required": true },
      "status": { "type": "string", "enum": ["active", "deprecated"] }
    }
  },
  "createdAt": "2026-04-22T10:00:00.000Z",
  "updatedAt": "2026-04-22T10:00:00.000Z"
}
```

**Name format:** `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$` — alphanumeric (upper and lower), dots, dashes, and underscores. May not start with a dash, dot, or underscore. Max 200 characters.

#### List all entries

```http
GET /api/schema-library
Authorization: Bearer <token>
```

**Response** `200`:

```json
{ "entries": [ { "name": "...", ... } ] }
```

#### Get a single entry

```http
GET /api/schema-library/:name
Authorization: Bearer <token>
```

**Response** `200 { "entry": { ... } }` or `404`.

#### Get usages of an entry

Returns every space type definition that references this library entry via `$ref`.

```http
GET /api/schema-library/:name/usages
Authorization: Bearer <token>
```

**Response** `200`:

```json
{
  "usages": [
    {
      "spaceId": "my-space",
      "spaceLabel": "My Space",
      "knowledgeType": "entity",
      "typeName": "service"
    }
  ]
}
```

Returns an empty `usages` array if no space references the entry (including for names that do not exist in the library). Use this endpoint before deleting an entry to identify which spaces would lose their schema reference.

> **Library mutations require an admin token** — `POST`, `PUT`, and `DELETE` below are all admin-gated and MFA-protected (`requireAdminMfa`): send `Authorization: Bearer <admin-token>` and, when MFA is enabled, an `X-TOTP-Code: <code>` header, or the call returns `403`. The read endpoints (list, get, `…/usages`) accept any valid token.

#### Create an entry

```http
POST /api/schema-library
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "service-v1",
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { "propertySchemas": { "owner": { "type": "string", "required": true } } },
  "description": "optional"
}
```

**Response** `201 { "entry": { ... } }`. Returns `409` if the name already exists (use `PUT` to update). Returns `400` for invalid payloads.

#### Create or replace an entry

```http
PUT /api/schema-library/:name
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { ... },
  "description": "optional"
}
```

**Response** `201` (created) or `200` (replaced). Returns `400` for invalid name format or payload.

**`PUT` replaces the `schema` wholesale**, and requires `knowledgeType`, `typeName` and `schema` every time.
That is the right verb when you are holding the whole entry — and the wrong one for changing a single
property, because it means resending every pre-existing property, which is how one gets dropped by accident.
Use `PATCH` for that.

#### Change part of an entry (merge)

```http
PATCH /api/schema-library/:name
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "schema": { "propertySchemas": { "region": { "type": "string" } } }
}
```

Every field is optional and **`schema.propertySchemas` merges by key**: the properties you name are added or
replaced, and the ones you do not name survive untouched. So the request above adds `region` without
restating `tier`, `owner`, the `namingPattern`, the description or the type name.

| field | behaviour |
|---|---|
| `schema.propertySchemas` | **merged per key.** A named property is REPLACED as a whole definition — naming it is how you change it, and deep-merging into it would make removing a constraint impossible |
| `schema.namingPattern`, `schema.tagSuggestions` | replaced when present, preserved when absent. One value and one whole list; merging a list would leave no way to remove a single tag |
| `knowledgeType`, `typeName`, `published` | replaced when present |
| `description`, `schemaGroup`, `sourceUrl`, `sourceCatalog` | `null` clears, a value sets, absent preserves — the same three-way contract `PUT` honours |
| `deleteFields` | dot paths to remove: `propertySchemas.<key>`, `propertySchemas`, `namingPattern`, `tagSuggestions`. Applied **after** the merge, so one request can replace one property and drop another |

**Response** `200 { "entry": { ... } }`.

- `404` if the entry does not exist — **`PATCH` does not create**; use `PUT` for that. (Before this endpoint
  existed, a `PATCH` here returned a `404` from the router itself, which read as "not supported" because it
  was.)
- `400` if the body names no field at all, so a no-op cannot be mistaken for an applied change.
- `400` for an unrecognised `deleteFields` path, rather than ignoring it — a silently dropped typo would leave
  you believing a property was removed while it is still validating records.

Editing a library entry changes what **every space that `$ref`s it** validates against; use
`GET /api/schema-library/:name/usages` first if you need to know who that is.

#### Delete an entry

```http
DELETE /api/schema-library/:name
Authorization: Bearer <admin-token>
```

**Response** `204`. Returns `404` if not found.

> **Safe deletion:** Before deleting an entry, call `GET /api/schema-library/:name/usages` to find all spaces that reference it. For each usage, `PUT /api/spaces/:spaceId/meta/typeSchemas/:kt/:typeName` with the inline schema (copied from the library entry) to replace the `$ref` with a standalone definition. Once all references are replaced, the `DELETE` can proceed without breaking any space's validation.
>
> The admin UI performs this sequence automatically — it shows a warning with the affected spaces and an **Unlink & Delete** button that handles the replacement before deleting.

#### Schema groups

Library entries can carry a `schemaGroup` tag, letting a related set of type schemas be exported from and applied to spaces as a unit.

```http
GET /api/schema-library/groups
Authorization: Bearer <token>
```

**Response** `200 { "groups": [ { "name", "count" } ] }` — every distinct `schemaGroup` with the number of entries in it, sorted by name.

```http
POST /api/schema-library/export-space
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "spaceId": "research", "groupName": "research-schemas", "namePrefix": "research" }
```

Creates or updates one library entry per **inline** type schema in the space's `meta.typeSchemas`, tagging them all with `groupName` (`$ref` entries are skipped — they are already library-backed). Entry names are derived as `<namePrefix|groupName>-<knowledgeType>-<typeName>`. **Response** `200 { "created", "updated", "entries": [ ... ] }`. Requires an admin token (and MFA when enabled).

```http
POST /api/schema-library/groups/:group/apply
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "spaceId": "research-2" }
```

Injects a `$ref` into the target space's `typeSchemas` for every library entry in `:group`, wiring the space to the shared definitions. **Response** `200` with the applied entries; `404` if the group has no entries or the space does not exist. Requires an admin token (and MFA when enabled).

#### Using `$ref` in space typeSchemas

A space type definition can reference a library entry instead of embedding the schema inline:

```json
{
  "meta": {
    "validationMode": "strict",
    "typeSchemas": {
      "entity": {
        "service": { "$ref": "library:service-v1" }
      }
    }
  }
}
```

`resolveMetaRefs()` resolves all `$ref` pointers from the library before validation runs.

**You cannot store an unresolvable ref.** Every route that accepts `typeSchemas` — `POST /api/spaces`,
`PATCH /api/spaces/:id`, `PUT /api/spaces/:id/schema`, and the single-type
`PUT /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName` — answers **422** naming the missing library
entry, before anything is written. Creation used to be the one exception, which meant the identical mistake
was loud on every path except the one where a space and its schema arrive together.

If a ref does become unresolvable later — the library entry is deleted out from under a space that referenced
it — resolution degrades to an empty schema: no constraints are applied, identical to the behaviour for an
undefined type. That is a deliberate degrade rather than a hard failure, because a deleted library entry must
not make an existing space unwritable. In a `strict` space it does mean that type accepts anything, so treat
deleting a referenced library entry as a change to every space that points at it.

`$ref` and inline fields are mutually exclusive: a `TypeSchema` that contains `$ref` must not also contain `namingPattern`, `propertySchemas`, etc.

#### Publish an entry (make publicly accessible)

An entry can be published so that unauthenticated callers on the open internet can fetch it and import it into their own instance.

```http
PATCH /api/schema-library/:name/publish
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "published": true }
```

To unpublish, send `{ "published": false }`.

**Response** `200 { "entry": { ... } }` (full updated entry). Returns `404` if the entry does not exist. Requires an **admin token**; returns `403` otherwise.

> **Security note:** Publishing only exposes the schema definition (field types, constraints, naming patterns, tag suggestions). It never exposes space data, memories, or any other tenant information.

#### Public listing

Returns all published entries. Rate-limited at 60 requests/minute per IP.

```http
GET /api/schema-library/public
```

No `Authorization` header is required for open instances. When the remote instance is behind an auth proxy (e.g. Cloudflare Access), pass a **library access token** as a Bearer credential:

```http
Authorization: Bearer <schemaLibrary-token>
```

An invalid or wrong-scope token returns `401`/`403`. A missing token on an open instance is accepted.

**Response** `200`:

```json
{
  "entries": [
    {
      "name": "service-v1",
      "knowledgeType": "entity",
      "typeName": "service",
      "description": "Standard service entity schema",
      "updatedAt": "2026-04-22T10:00:00.000Z"
    }
  ]
}
```

The listing exposes only metadata — the `schema` object is omitted. Fetch the individual entry to obtain the full schema.

#### Public single entry (unauthenticated)

```http
GET /api/schema-library/public/:name
```

**Response** `200 { "entry": { ... } }` — full entry including `schema`. Returns `404` if the entry does not exist or is not published.

---

#### Foreign catalogs

A **foreign catalog** is a link to another Ythril instance's public schema library. Linking a catalog lets you browse its published entries and import them into your own library. Imports are copied locally — they do not create live dependencies.

Catalog links are stored in `schema-catalogs.json` (sibling to `config.json`). Max 50 catalog links per instance.

##### List catalogs

```http
GET /api/schema-library/catalogs
Authorization: Bearer <token>
```

**Response** `200 { "catalogs": [ { "name", "url", "description", "createdAt", "hasAccessToken" } ] }`.

`hasAccessToken` is `true` when a library access token is stored for this catalog (used to authenticate against the remote). The plaintext token is never returned.

##### Add a catalog link

```http
POST /api/schema-library/catalogs
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "acme-schemas",
  "url": "https://brain.acme.example/api/schema-library",
  "description": "ACME Corp shared schema catalog",
  "accessToken": "ythril_xK9mPq..."
}
```

**Fields:**

| Field | Required | Notes |
|---|---|---|
| `name` | ✓ | Unique catalog ID: `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$` |
| `url` | ✓ | Base URL of the remote schema library. Must be HTTPS; private/loopback addresses are rejected (SSRF protection). |
| `description` | — | Free text, up to 500 characters. |
| `accessToken` | — | A library access token issued by the remote instance. Required only when the remote's `/public` endpoint is behind an auth proxy (e.g. Cloudflare Access). Write-only: it is never returned in list or get responses — only `hasAccessToken: true/false` is exposed. It is held in the instance config directory, which is created with owner-only (`0600`) permissions. |

**Responses:** `201 { "catalog": { ..., "hasAccessToken": true } }`, `400` (invalid URL/name), `409` (name already exists), `400` (SSRF-blocked URL).

> **SSRF protection:** Private-range IPs (`10.x`, `172.16–31.x`, `192.168.x`), CGNAT (`100.64–127.x`), loopback (`127.x`, `::1`), link-local/IMDS (`169.254.x`, `169.254.169.254`), IPv6 ULA (`fc00::/7`), and GCP metadata are rejected — in every host encoding, including decimal/hex/octal/short-form IPv4 (e.g. `2130706433`, `0x7f000001`, `127.1`) and IPv4-mapped IPv6 (`[::ffff:127.0.0.1]`). The target hostname is also resolved via DNS and every resolved address is validated, so a public name that points at an internal host is rejected too. Only the HTTPS scheme is accepted.

##### Remove a catalog link

```http
DELETE /api/schema-library/catalogs/:name
Authorization: Bearer <admin-token>
```

**Response** `204`. Returns `404` if not found. Removing a catalog link does not delete any entries that were already imported from it.

##### Browse a foreign catalog

Proxies a request to the remote catalog's public listing endpoint. Requires authentication on the local instance (the remote endpoint is public).

```http
GET /api/schema-library/catalogs/:name/entries
Authorization: Bearer <token>
```

**Response** `200 { "catalog": "acme-schemas", "entries": [ { name, knowledgeType, typeName, description, updatedAt } ] }`.

Returns `404` if the catalog link is unknown. Returns `502` if the remote endpoint returns a non-200 response **or the request times out** (8 s). (A `504` is only produced when the remote itself responds with `504`.)

##### Fetch a single entry from a foreign catalog

```http
GET /api/schema-library/catalogs/:name/entries/:entryName
Authorization: Bearer <token>
```

**Response** `200 { "catalog": "acme-schemas", "entry": { ... } }` — full entry including `schema`. Returns `404` or `502` as above.

Use this endpoint to obtain the full schema before importing. To import, call `PUT /api/schema-library/:name` on your local instance with the fetched schema. Pass `sourceCatalog` in the body to record the origin:

```json
{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { "..." },
  "description": "Imported from acme-schemas",
  "sourceCatalog": "acme-schemas"
}
```

---

```http
DELETE /api/spaces/:id
Content-Type: application/json

{ "confirm": true }
```

**Response** `204`. If the space participates in a network, deletion requires a governance vote.

If cleanup partially fails (e.g. a collection drop or file deletion errors), the server returns `500` with error details. The space is **not** removed from config so the deletion can be retried. Check the response body for specifics:

```json
{ "error": "Space 'research' cleanup incomplete (2 error(s)). Space was NOT removed from config. ..." }
```

---
