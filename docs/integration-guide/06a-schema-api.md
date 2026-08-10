# Space Schemas & Validation

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Space Schemas & Validation

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
  $ref?: string;                                  // "library:<name>" — use a schema-library entry instead
                                                  //   of the inline fields. When set, inline fields on the
                                                  //   same object are IGNORED, not merged.
  namingPattern?: string;                         // entity only — regex for name validation
  retention?: { days?: number; contentDays?: number };  // per-type retention, the middle tier of
                                                  //   record > schema > space. `contentDays` is chrono-only
                                                  //   and is rejected elsewhere. See 04-brain-api.md.
  tagSuggestions?: string[];                      // RETIRED — accepted and stored, consumed by nothing
  propertySchemas?: Record<string, PropertySchema>;
  suppressEmbeddings?: boolean;                   // skip embedding this type. Absent = NOT STATED, falls
                                                  //   through to the space setting — it does not mean false.
                                                  //   Does NOT backfill when switched off (see below).
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
| `suppressEmbeddings` | When `true`, records in this space are **not embedded**, so they never appear in semantic recall. **Default: `false`** — suppression is opt-in. This is the LOWEST of three tiers: a per-record `excludeFromVectorSearch` wins, then a type's own `suppressEmbeddings`, then this. A type schema that says nothing falls through to this value rather than overriding it with `false`. Intended for records that are **state rather than prose** — a row whose text never changes but whose numbers are patched constantly, which would otherwise re-embed identical text on every write. **Switching it off does not backfill on its own** — records written while it was on have no vector and nothing revisits them. Run [`POST /api/spaces/:id/reembed`](06-spaces-api.md#re-embed-backfill) afterwards to queue the missing ones. |
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
