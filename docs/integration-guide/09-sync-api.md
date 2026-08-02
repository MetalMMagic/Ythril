# Notify & Sync APIs

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Notify API

Base path: `/api/notify`

### Send Event (peer-to-peer)

```http
POST /api/notify
```

```json
{
  "networkId": "net-uuid",
  "instanceId": "sender-uuid",
  "event": "sync_available"
}
```

Events: `vote_pending`, `member_departed`, `member_removed`, `space_deletion_pending`, `sync_available`, `ping`.

**Response** `204`.

---

### List Events

```http
GET /api/notify?networkId=net-uuid&limit=50
```

---

### Trigger Sync

```http
POST /api/notify/trigger
```

```json
{ "networkId": "net-uuid" }
```

Triggers an immediate sync cycle for the given network. **Fire-and-forget by default** — it returns as
soon as the cycle is scheduled:

**Response** `200`:

```json
{ "status": "triggered", "networkId": "net-uuid" }
```

**Synchronous mode** — add `?wait=true` to run the cycle and get its outcome in the response. Bounded by
`?timeoutMs` (default `30000`, clamped to `1000`–`120000`) so a slow or stuck cycle can't hang the
request; on timeout the cycle keeps running in the background.

```http
POST /api/notify/trigger?wait=true&timeoutMs=15000
```

**Response** `200` (completed): `{ "status": "completed", "networkId": "…", "synced": 12, "errors": 0 }`
· `504` (timed out, still running): `{ "status": "timeout", "networkId": "…", "timeoutMs": 15000 }`
· `500` (the cycle failed): `{ "status": "error", "networkId": "…", "error": "…" }`

---

## Sync API

Base path: `/api/sync` — used by the sync engine between peers. All endpoints require auth + sync rate limit.

### Route Overview

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/sync/memories` | GET | Page memory changes (`items`, `nextCursor`) |
| `/api/sync/memories/:id` | GET | Fetch one full memory doc |
| `/api/sync/memories` | POST | Upsert one remote memory |
| `/api/sync/entities` | GET | Page entity changes |
| `/api/sync/entities/:id` | GET | Fetch one full entity doc |
| `/api/sync/entities` | POST | Upsert one remote entity |
| `/api/sync/edges` | GET | Page edge changes |
| `/api/sync/edges/:id` | GET | Fetch one full edge doc |
| `/api/sync/edges` | POST | Upsert one remote edge |
| `/api/sync/chrono` | GET | Page chrono changes |
| `/api/sync/chrono/:id` | GET | Fetch one full chrono doc |
| `/api/sync/chrono` | POST | Upsert one remote chrono doc |
| `/api/sync/batch-upsert` | POST | Bulk upsert memories/entities/edges/chrono |
| `/api/sync/tombstones` | GET | List tombstones by seq |
| `/api/sync/tombstones` | POST | Apply remote tombstones |
| `/api/sync/manifest` | GET | File manifest diff |
| `/api/sync/file-tombstones` | GET | List file deletion tombstones |
| `/api/sync/file-tombstones` | POST | Apply file deletion tombstones |
| `/api/sync/merkle` | GET | Compute Merkle root |
| `/api/sync/networks/:networkId/members` | GET | Pull gossip member view |
| `/api/sync/networks/:networkId/members` | POST | Push gossip member updates |
| `/api/sync/networks/:networkId/votes` | GET | Pull open governance rounds |
| `/api/sync/networks/:networkId/votes/:roundId` | POST | Relay a yes/veto vote |
| `/api/sync/warm` | POST | Pre-sync warm-up (auth/embedding/DB) |

### Common Query Parameters

| Parameter | Description |
|---|---|
| `spaceId` | Required on space-scoped sync routes |
| `networkId` | Optional on many pulls, used for policy checks and directional sync |
| `sinceSeq` | Start sequence for incremental pulls |
| `cursor` | Encoded continuation cursor for paged pulls |
| `limit` | Page size (typically max 500; endpoint-specific caps apply) |
| `full=true` | Return full docs instead of `_id`/`seq` stubs on list routes |

### Incremental Collection Pull Example

```http
GET /api/sync/memories?spaceId=general&sinceSeq=0&limit=200&full=true
```

Returns `{ items, nextCursor }`. Use `nextCursor` as `cursor` on the next request until `nextCursor` is `null`.

### Single-Document Pull Example

```http
GET /api/sync/entities/:id?spaceId=general
```

Returns `404` when missing.

### Bulk Push Example

```http
POST /api/sync/batch-upsert?spaceId=general&networkId=net-uuid
```

```json
{
  "memories": [ ... ],
  "entities": [ ... ],
  "edges": [ ... ],
  "chrono": [ ... ]
}
```

Each array is capped at 500 items. Response includes per-type counters.

### Tombstones

- `GET /api/sync/tombstones?spaceId=general&sinceSeq=0` returns grouped `{ memories, entities, edges, chrono }` tombstones.
- `POST /api/sync/tombstones` accepts `{ tombstones: [...] }` and applies deletions.

**The `sinceSeq` you send is recorded.** The serving instance stores it as `lastSeqServed` for your peer identity and prunes tombstones that every member has pulled past — that is the only retention bound on the collection, because an age-based one would let a long-absent peer resurrect a deleted record. Two consequences for an integrator:

- **Send your real watermark, and never a value higher than what you have applied.** Claiming a position you have not reached lets the other side drop tombstones you still need.
- **A peer that never pulls tombstones blocks pruning for its spaces** — deliberately, since "has not pulled" and "has caught up" must not look alike.

### File Sync Artifacts

- `GET /api/sync/manifest?spaceId=general` returns file digest metadata for delta detection.
- `GET /api/sync/file-tombstones?spaceId=general&since=<ISO>` returns file delete tombstones.
- `POST /api/sync/file-tombstones` applies file delete tombstones (`{ spaceId, tombstones: [...] }`).

### Merkle Consistency Check

```http
GET /api/sync/merkle?spaceId=general&networkId=net-uuid
```

**Response** `200`:

```json
{
  "spaceId": "general",
  "root": "sha256-hex-string",
  "leafCount": 123,
  "computedAt": "2026-04-15T10:00:00.000Z",
  "networkId": "net-uuid"
}
```

Each brain-document leaf hashes the document's **content** (canonical JSON, keys sorted, embedding vectors excluded so peers running different embedding models don't diverge), not just its `_id`/`seq` — so a mismatch detects tampered content, not only missing or version-skewed documents. File leaves hash the file's SHA-256. The check is advisory: a root mismatch is reported as `MERKLE_DIVERGENCE`, it does not block sync.

### Gossip Endpoints

- `GET /api/sync/networks/:networkId/members` returns current member view (sensitive fields stripped).
- `POST /api/sync/networks/:networkId/members` accepts member updates for gossip propagation. The `self` record carries the sender's `signingPublicKey`, which the receiver pins trust-on-first-use for verifying that member's signed votes.
- `GET /api/sync/networks/:networkId/votes` returns open rounds.
- `POST /api/sync/networks/:networkId/votes/:roundId` relays `{ vote: "yes" | "veto", instanceId, sig?, castAt? }`. A cast bearing a valid `sig` (Ed25519 over `ythril-vote:v1|network|round|subject|voter|vote`) is accepted from any relaying peer; an unsigned cast is accepted only directly from its own voter. Returns `403` if the cast is rejected. See [Sync Protocol → Signed vote casts](sync-protocol.md).

If this instance has been ejected from a network, `/api/sync/networks/:networkId/*` returns `401` with `{ "error": "ejected" }`.

### Warm-Up Endpoint

```http
POST /api/sync/warm
```

```json
{ "networkId": "net-uuid", "spaces": ["general"] }
```

Preloads embedding model and collection handles before a full sync cycle.

**Response** `200`:

```json
{ "status": "ready" }
```

---
