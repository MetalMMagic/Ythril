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

Events: `vote_pending`, `member_departed`, `member_removed`, `space_deletion_pending`, `space_wipe_pending`, `sync_available`, `ping`.

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

Each array is capped at 500 items. Response includes per-type counters:

```json
{ "status": "ok",
  "memories": { "inserted": 3, "updated": 1, "forked": 0, "skipped": 12, "forkDepthRefused": 0, "tombstoned": 0 },
  "entities": { "upserted": 5, "skipped": 2, "tombstoned": 0 },
  "edges":    { "upserted": 0, "skipped": 0, "tombstoned": 0 },
  "chrono":   { "upserted": 0, "skipped": 0, "tombstoned": 0 } }
```

**`skipped` is benign and `forkDepthRefused` is not — read the second one.** They were one counter until now,
which is the whole reason this paragraph exists.

| counter | what happened | did the record land? |
|---|---|---|
| `skipped` | the receiver already holds that record at the same `seq` or newer | **nothing was lost** — this is ordinary conflict resolution and is by far the common case |
| `forkDepthRefused` | memories only: content diverged at an identical `seq` and the record's fork chain is already at its cap, so the incoming version was **discarded** | **no — the record is gone** |

**A `200` therefore does not mean every record was applied.** If you push, read `forkDepthRefused`: a non-zero
value means those records did not land, and our own sync engine will **not** offer them again — it advances its
watermark regardless, because the receiver would refuse the identical record on every future cycle and holding
the watermark back would stall the space instead. Both ends log it; the receiver's log names the record ids.

A peer on an older build omits `forkDepthRefused` entirely, so treat a missing field as zero rather than as an
error.

### A duplicate relationship is reported, not an error

An edge's identity is its `(from, to, label)` triplet — that combination is uniquely indexed — while its `_id`
is random. So when two instances create the same relationship independently there is **one relationship under
two ids**, and the receiver cannot store the second without breaking that index.

It answers `200` and says so, rather than failing:

```json
// single-record POST /api/sync/edges
{ "status": "duplicate" }
```

```json
// batch-upsert
{ "edges": { "upserted": 12, "skipped": 3, "tombstoned": 0, "duplicateTriplets": 1 } }
```

**The local copy stands and the incoming one is not applied** — the same rule the pull side uses, so both
directions resolve it identically. The receiver logs the triplet.

**Why this is a 200 and not a 409.** A push that gets a non-2xx stops that collection's transfer and does not
advance its watermark, so the next cycle re-sends the identical batch and hits the identical duplicate. An
error here would not retry — it would stop that channel making progress for as long as the duplicate exists.
Reporting inside a `200` is what lets the rest of the batch land and the cursor move on.

Treat a missing `duplicateTriplets` as zero: a peer on an older build omits it.

### Schema mismatches are reported, never refused

Two instances in one network may declare **different schemas for the same space**. A record the sender
validated against its own rules can therefore break the receiver's — and discarding it is not the receiver's
call, because the sender believes it delivered.

So an ingest **stores the record and hands back what broke the rules.** Both doors report, in the shape each
already uses:

```json
// batch-upsert — a per-type counter, beside inserted/updated/skipped
{ "status": "ok",
  "entities": { "upserted": 5, "skipped": 2, "tombstoned": 0, "schemaViolations": 2 } }
```

```json
// any single-record route — the violations themselves, beside the status
{ "status": "inserted",
  "schemaViolations": [
    { "field": "properties.severity", "value": "catastrophic", "reason": "must be one of: low, medium, high" }
  ] }
```

**`schemaViolations` is absent when there are none**, so a clean ingest returns exactly what it always did and
a present field always means something to look at. A peer on an older build omits it entirely; treat missing
as none.

**The record landed either way.** This is a report, not a refusal — reconcile the two schemas, or accept the
divergence deliberately.

| the check | what happens |
|---|---|
| a property, tag or type that breaks the space's declared schema | **stored**, and counted or listed |
| a chrono `type` outside both the product's vocabulary and anything the space declares | **`400`, refused** |

The second row is the one exception, and it is not about disagreement: such a record is meaningless to every
reader rather than merely non-conforming, and nothing else in the pipeline would catch it.

### Tombstones

- `GET /api/sync/tombstones?spaceId=general&sinceSeq=0` returns grouped `{ memories, entities, edges, chrono }` tombstones.
- `POST /api/sync/tombstones` accepts `{ tombstones: [...] }` and applies deletions.

**The `sinceSeq` you send is recorded.** The serving instance stores it as `lastSeqServed` for your peer identity and prunes tombstones that every member has pulled past — that is the only retention bound on the collection, because an age-based one would let a long-absent peer resurrect a deleted record. Two consequences for an integrator:

- **Send your real watermark, and never a value higher than what you have applied.** Claiming a position you have not reached lets the other side drop tombstones you still need.
  - **And a watermark shared across several transfers may only reach where ALL of them are complete.** A cycle that fetches tombstones plus four collections under one `sinceSeq` must limit its next `sinceSeq` to the lowest position among the transfers that stopped early — a non-`2xx`, or a page cap. Taking the maximum instead claims a position the stopped transfer never reached, and its unserved records then sit behind your watermark permanently while every later cycle looks successful. Our own engine had this defect until 3.2.0.
- **A peer that never pulls tombstones blocks pruning for its spaces** — deliberately, since "has not pulled" and "has caught up" must not look alike.

### File Sync Artifacts

- `GET /api/sync/manifest?spaceId=general` returns file digest metadata for delta detection.
- `GET /api/sync/file-tombstones?spaceId=general&since=<ISO>` returns file delete tombstones. **The sync engine
  deliberately omits `since`**: a file tombstone carries its original `deletedAt` and can be relayed onward long
  afterwards, so filtering by it would skip an older deletion arriving late and the file would stay. Use it only
  if you can tolerate that.
- `POST /api/sync/file-tombstones` applies file delete tombstones (`{ spaceId, tombstones: [...] }`).
  **Your `200` is an acknowledgement.** The sender records the newest `deletedAt` in the batch as your confirmed
  position and eventually drops its own copies below the minimum across all members — so answer `200` only once
  the tombstones are durably recorded. `{ applied: 0 }` is a valid acknowledgement (the upsert is idempotent);
  a non-2xx or a timeout means the sender keeps its copies, which is the safe direction.

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
- `POST /api/sync/networks/:networkId/votes/:roundId` relays `{ vote: "yes" | "veto", instanceId, sig?, castAt? }`. A cast bearing a valid `sig` (Ed25519 over `ythril-vote:v1|network|round|subject|voter|vote`) is accepted from any relaying peer; an unsigned cast is accepted only directly from its own voter. Returns `403` if the cast is rejected. See [Sync Protocol → Signed vote casts](../sync-protocol.md).

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
