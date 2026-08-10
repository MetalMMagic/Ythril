# Chrono

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Chrono

### Create a Chrono Entry

```http
POST /api/brain/spaces/:spaceId/chrono
```

**Body**:

`id` is optional here too — a **UUID v4** you supply to make the create idempotent, exactly as for a
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
