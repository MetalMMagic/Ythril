# Chrono

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Chrono

### Create a Chrono Entry

```http
POST /api/brain/spaces/:spaceId/chrono
```

**Body**:

`id` is optional here too — a **UUID v4** naming an **existing** entry to update, exactly as for a
memory. See [Retry Safety](04-brain-api.md#retry-safety).

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

- `type` — `event`, `deadline`, `plan`, `prediction`, `milestone` **unless the space declares its own chrono
  types**, in which case those **replace** this list rather than extending it. A space with
  `typeSchemas.chrono` set accepts its declared type names and **rejects all five built-ins**; a write with a
  type outside the space's list returns `400` naming the ones it will accept
  (`` `type` must be one of: … ``). Read the current list from `typeSchemas.chrono` in
  `GET /api/spaces/:id/meta` before offering a choice.
- `status` — `upcoming` (default), `active`, `completed`, `overdue`, `cancelled`. You never need to set
  `overdue` yourself: it is **derived on read** — an entry whose due moment (`endsAt`, or `startsAt` if
  it has none) has passed and that is not `completed`/`cancelled` is returned as `overdue`.
  **Storing `overdue` is accepted and `status=overdue` finds it** — that filter returns both kinds, the
  derivable ones and the ones somebody marked. It is still not worth setting: a stored `overdue` never
  reverts, so an entry marked by hand stays overdue after you move its dates forward, where a derived one
  corrects itself.
  The derivation applies to the chrono read paths only: `POST /query` reads documents as stored, so the
  same entry is `upcoming` there and `overdue` in `GET /chrono`.
- `endsAt` — optional ISO 8601. When present it **replaces `startsAt` as the due moment**, so an entry that
  began last month and ends next year is not overdue. **Nothing validates the order**: an `endsAt` earlier
  than `startsAt` is stored as sent, and the entry then reads as `overdue` immediately. Check it yourself if
  that matters.
- `confidence` — `0`–`1` (optional, useful for predictions)
- `entityIds` — array of UUID v4 entity IDs (not names); returns `400` if any value is not a valid UUID and `strictLinkage` is enabled
- `memoryIds` — array of UUID v4 memory IDs (not names); returns `400` if any value is not a valid UUID and `strictLinkage` is enabled

**Response** `201` — the created `ChronoEntry`.

---

### Update a Chrono Entry

```http
PATCH /api/brain/spaces/:spaceId/chrono/:id
```

> **`POST .../chrono/:id` was removed in 3.0** and now answers `404`. It was the only POST-that-updates in
> the brain API; it performed no property validation and wrote no audit snapshot. `PATCH` takes the same
> body and does both.

**Body**: partial object with any updatable fields (`title`, `type`, `status`, `startsAt`, `endsAt`, `confidence`, `tags`, `entityIds`, `memoryIds`, `description`, `properties`, `recurrence`, `excludeFromVectorSearch`, `ttlDays`), plus `deleteFields`.

> **`deleteFields` arrived in 3.1, and it is the only way to remove anything.** `properties` MERGE — patching
> one key keeps the others — and an omitted field means *leave it alone*, so before 3.1 there was no request
> that could unset a chrono field at all: a key written once was permanent. Send dot-notation paths, applied
> **after** the merge:
>
> ```json
> { "properties": { "venue": "Hall B" }, "deleteFields": ["properties.oldKey", "description"] }
> ```
>
> Chrono's **required** fields — `title`, `startsAt`, `status` — are refused by name, alongside the
> server-owned `id` / `type` / `spaceId` / `createdAt` / `updatedAt`. A path that cannot be honoured answers
> `400` naming it rather than being accepted and doing nothing. A *property* of the same name
> (`properties.title`) is an ordinary user key and stays deletable.
>
> Same parameter, same refusals, on the `update_chrono` MCP tool. See
> [Partial Update with deleteFields](04-brain-api.md#partial-update-with-deletefields) for the shared rules.

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
| `type` | string | Filter by type (the five built-ins, or the space's own declared chrono types — see above) |
| `limit` | number | Max entries to return (default 50, max 500) |
| `skip` | number | Pagination offset (default 0) |
| `sort` | string | Sort field: `createdAt`, `title`, `startsAt`, or `type` (see [Sorting](04-brain-api.md#sorting-all-brain-list-endpoints)). Unknown field → `400` |
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
