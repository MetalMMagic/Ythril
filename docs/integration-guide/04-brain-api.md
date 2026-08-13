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

## Retry Safety

**A request that times out has not necessarily failed.** If you retry a create, whether you get one record or
two depends on the record type — so this is the first thing to read if anything you write is retried, and
anything an agent writes is retried.

| type | retried create | how |
|---|---|---|
| **edge** | **idempotent** | the natural key `(from, to, label)` — a retry lands on the same edge |
| **memory** | **not idempotent** | see below; a blind retry can produce a second record |
| **chrono** | **not idempotent** | same |
| **entity** | **not idempotent** | same; reconcile by `name` if your space treats names as unique |

### Identity is server-generated

**You cannot choose a record's id.** `id` on a create names an **existing** record to update; an id that matches
nothing is ignored and the record is created with a fresh, server-minted UUID.

This changed deliberately. Adopting a caller's id made the caller a co-author of the primary key, and that has a
sharp edge across a network: the natural way to produce a stable id is to derive it from a stable key, so two
instances following the same convention collide **by design** — and sync resolves a collision by `seq` alone,
so one version silently replaces the other with every reference still resolving to the survivor. Nothing dangles,
so nothing reports it.

If you need to carry your own reference into Ythril, put it in **`name`**, **`description`**, or a property. Those
fields are for describing a record. `id` identifies one.

### How to make a create retry-safe

Use the duplicate check, which is on by default:

```js
// checkDuplicates is TRUE by default: the response carries `similar` when the write matched
// something already stored, so a retry that landed twice is detectable rather than silent.
const res = await post('/api/brain/spaces/general/memories', { fact });
if (res.similar?.length) {
  // The first attempt probably succeeded and its response was lost. Reconcile instead of retrying:
  // read the match, and delete this one if it is a duplicate of it.
}
```

Two things follow from that:

- **A duplicate check costs a vector.** `checkDuplicates: true` computes the embedding before the insert, so the
  write waits on the embedder and fails if it is unreachable. That is the trade: an answerable "is this already
  here?" in exchange for a synchronous dependency. Pass `checkDuplicates: false` to opt out, and accept that a
  retry after an ambiguous failure may duplicate.
- **For an edge, just retry.** `(from, to, label)` is the natural key and a second write converges.

### What happens on a genuine update

When `id` names a record that exists, the write lands on it:

- `seq` and `updatedAt` advance, so it is a real write and appears in the audit log and in
  `ythril_brain_write_seq_total`;
- **tags union and properties shallow-merge**, they do not replace;
- the webhook event is `memory.updated` / `chrono.updated` / `entity.updated`, **not** the created event.

### Rules

- `id` must be a **UUID v4**. Anything else is a `400` — it becomes the record's identity across
  every peer in every network the space belongs to, so it is held to a shape.
- **Omitting `id` is unchanged**: every call creates a new record. Existing clients are unaffected.
- An id that names nothing yet simply becomes the new record's id, so your *first* attempt does not need to know
  whether it is the first.
- The MCP tools `remember` and `create_chrono` take the same optional `id`, with the same
  meaning.

---

### Write a Memory

```http
POST /api/brain/spaces/:spaceId/memories
```

```json
{
  "id": "3f2b1c9e-7d84-4a51-9e60-1b2c3d4e5f60",
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

**Constraints**: `id` optional — a **UUID v4** naming an **existing** record to update. It is not a way to choose an id: identity is server-generated, so an id that matches nothing is ignored rather than adopted, and the record is created with a fresh one. Anything that is not a UUID v4 is a `400`. To carry your own reference, put it in `name` or `description`. See [Retry Safety](#retry-safety). **Constraints**: `fact` max 50 000 chars. `type` optional string — stored on the document and validated against the space's `typeSchemas.memory` allowlist when set. `tags` must be an array of strings. `description` optional string. `properties` optional object; property values should be a string, number, or boolean (unlike the entity endpoint, the memory/edge/chrono write paths don't reject non-primitive values at the API layer — schema validation is the gate when the space defines the property). Every id in `entityIds` must be a UUID v4 **and** name an entity that exists — passing a name, a malformed id, or an id that resolves to nothing returns `400` and stores nothing. This is the default; a space can opt out with `meta.strictLinkage: false` (see [Reference integrity](12-admin-api.md#reference-integrity)). `ttlDays` optional — see [Record Expiry (TTL)](#record-expiry-ttl). `waitForEmbedding` optional boolean — see below.

#### Catching a near-duplicate at write time (`checkDuplicates`, `checkContradictions`)

A write can tell you it looks like something you already have, before you have two of them:

```json
{ "fact": "Deploys are frozen on Fridays after 14:00 UTC", "checkDuplicates": true }
```

```json
{ "_id": "…", "fact": "…",
  "similar": [ { "_id": "…", "type": "memory", "score": 0.94, "summary": "Deploys freeze Friday 14:00 UTC" } ] }
```

Available on `POST …/memories`, `POST …/entities` and `POST …/chrono`, with the same meaning the MCP tools
have always had.

| field | default on REST | effect |
|---|---|---|
| `checkDuplicates` | `false` | Report existing records that are semantically near-identical, as `similar` (`_id`, `type`, `score`, `summary`). |
| `checkContradictions` | `false` | Report near-neighbours that set the same single-valued property to a DIFFERENT value, as `contradicts`. A different question from redundancy, so it is a separate flag. |
| `dupeThreshold` | `0.92` | Score at or above which a neighbour is reported. Must be between 0 and 1. |

- **It never blocks the write.** The record is stored either way and the warning rides on the `201`. An agent
  correcting an outdated fact must be able to contradict the record it supersedes — the point is that it is
  told, not that it is stopped.
- **The flags are opt-in here, and default ON over MCP.** That asymmetry is deliberate: the check implies
  `waitForEmbedding`, because it needs the vector before the insert so the new record cannot match itself. On
  REST — which is also how a fleet imports thousands of records — defaulting it on would make every existing
  integration pay the embedding model synchronously without asking. A REST write that sends none of these
  behaves exactly as it did before.
- **`recall` is not a substitute**, and an integrator measured why: the same pair scores **0.94** on this
  check and **0.896** on recall, while unrelated topical neighbours sit at 0.845. No recall threshold
  separates the true near-duplicate from the coincidences, and the two scales are not interchangeable.
- `GET /api/duplicates` is the background scanner's review queue, not an on-demand similarity search — it
  lists what a scheduled sweep has already found.

A non-boolean flag (or a `dupeThreshold` outside 0–1) is a `400`, never a coercion: `"false"` is truthy, and
a hygiene check that silently turns itself off is worse than one that was never asked for.

#### When does a memory become searchable? (`waitForEmbedding`)

**By default, a moment after the write returns.** The write stores the record and hands the embedding to a
background queue, so it no longer pays the model's latency. A worker embeds it immediately afterwards, and a
failure retries with backoff rather than being final.

Until that lands, the record **is not returned by `recall`** — not ranked lower, absent. Both retrieval
channels need the vector: the semantic one obviously, and the lexical one because it computes a real
similarity for the records it introduces rather than inventing a score. The gap is normally milliseconds.

Send `"waitForEmbedding": true` when that gap matters:

```json
{ "fact": "Kubernetes pods are ephemeral by design", "waitForEmbedding": true }
```

| | `waitForEmbedding: false` (default) | `waitForEmbedding: true` |
|---|---|---|
| write latency | does not include the model | includes the model |
| searchable when the call returns | not yet | yes |
| embedder unavailable | write **succeeds**; the queue retries | write **fails** |

Use it when you will search for what you just wrote in the same flow, or when a record that cannot be embedded
should be a visible error rather than a background repair. `checkDuplicates` and `checkContradictions` imply
it — a duplicate check needs the vector before the insert so the new record cannot match itself.

**A `PATCH` re-embeds through the same queue**, and always — you do not have to work out whether the fields
you sent were the ones the vector is built from. The record keeps its previous vector until the worker
catches up, which is a moment later; unlike a create, an updated record is never *absent* from `recall` in
the meantime, it is briefly ranked on its previous text.

That is deliberate and it is the correctness argument, not a convenience: the worker rebuilds the text from
the record **as stored**, so it sees every concurrent edit. An update that computed the vector itself could
only build it from the record as that request read it — so two clients editing different fields would both
succeed, lose nothing, and still leave the stored vector describing a record that exists nowhere. `PATCH`
does not take `waitForEmbedding`; if you need the new vector before you search, poll the record or re-read it.

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
- **Space-wide default** — set `recordTtlDays` on the space (`PATCH /api/spaces/:id`, or the Danger Zone in the
  space's settings). Every new or updated record in that space that doesn't specify its own `ttlDays` expires
  after that many days. It takes **one window per kind of record** — see
  [The space tier is five windows](#the-space-tier-is-five-windows).

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

#### Per-type retention — `record > schema > space`

A space-wide TTL is the wrong axis for a space that mixes telemetry with knowledge. Deploy `event`s are
content-free by design, so they cluster tightly and **displace real answers in recall**; `health-snapshot` and
`metrics-snapshot` records exist to be trended, and a 90-day cap is one quarter with no year-over-year. One
number cannot serve both.

Retention therefore resolves in three tiers:

| tier | where | reaches |
|---|---|---|
| **record** | `ttlDays` on the write | that one record. Wins outright; `0`/`null` means never expire |
| **schema** | `typeSchemas.<collection>.<type>.retention` | every record of that type, in any of the four typed collections |
| **space** | `recordTtlDays` | everything else of that KIND, including records with no type at all — one window per kind, see below |

The middle tier lives **on the type**, beside `namingPattern` and `propertySchemas`, because retention is a
per-type rule and that is where the per-type rules already are:

```json
{
  "meta": {
    "typeSchemas": {
      "chrono": {
        "event":            { "retention": { "days": 90, "contentDays": 14 } },
        "health-snapshot":  { "retention": { "days": 3650 } }
      },
      "entity": {
        "ticket":  { "retention": { "days": 365 } },
        "roadmap": { "retention": { "days": 3650 } }
      }
    }
  }
}
```

> **A previous release documented a `chronoRetention` map on the space object.** That shape was replaced before
> it was ever in a tagged release, and it no longer exists — a per-type window on the space object would have
> been a second place to configure one rule. Use `typeSchemas.<collection>.<type>.retention`.

#### The space tier is five windows

`recordTtlDays` takes **one window per kind of record**, because a space does not hold one kind of thing. A
`tickets` space holds ticket *entities* that must outlive their status-change *chronos*; an `alerts` space holds
durable `alert-rule` entities beside `episode` chronos that are pure telemetry. The schema tier cannot express
either — it keys on a type *name*, and this is about a whole collection.

```json
{ "recordTtlDays": { "entity": null, "memory": null, "edge": null, "chrono": 90, "file": 30 } }
```

| | |
|---|---|
| buckets | `entity`, `memory`, `edge`, `chrono`, `file` — **five**, because files share this tier: they have no type, so the schema tier cannot reach them, and they are the largest and most obviously disposable of the five |
| a bucket set to `0` or `null` | no window for that kind. Same as absent — there is no tier above the space for a bucket to inherit from |
| **a partial object MERGES** | `{"chrono":90}` sets chrono and leaves the other four alone. **This is the opposite of the `typeSchemas` rule**, where a named type is replaced wholesale — there the value is a whole definition you are holding, here each bucket is one independent number |
| a bare number | the **legacy shape**, accepted forever, and it means all five. It also *replaces* a stored object: someone sending `90` means all five, and merging that would invent an intent they did not express |
| all five cleared | stored as no retention at all, so `{}`-vs-absent is never a distinction you have to reason about. An object mentioning **no** bucket is rejected with `400` — it would make "clear everything" and "change nothing" the same request |

No migration is needed for a space that set the scalar: it is read as all five buckets, permanently.

Two tiers per type, the same shape the audit log uses for its change payloads:

| field | effect |
|---|---|
| `contentDays` | **Chrono only.** The recallable part goes — `description`, `matchedText`, the embedding and `embeddingModel` — and `contentRedacted: true` is set with `contentRedactedAt`. The record stays and **so does `properties`**: it goes semantically silent while remaining queryable by field. Rejected on other collections rather than silently ignored. |
| `days` | The record is deleted, through the normal delete path, so it tombstones and propagates to peers. |

**Why `properties` survives redaction:** the thing that displaces knowledge in recall is the *vector*, plus the
free text that produced it. `properties` is structured, small, and reachable only by an explicit field query, and
for a telemetry record it is often the entire value — an alert episode's `alertname` / `fingerprint` /
`notifyCount` / `outcome` is what the record is *for*. Removing it bought nothing this feature exists to buy. If
you want the structured data gone too, that is what `days` is.

Rules worth knowing before you configure it:

- **A per-record `ttlDays` still wins**, including `0`/`null` for "never expire". Someone said what they wanted
  for that record.
- **A type with only `contentDays`** still deletes on that collection's `recordTtlDays` window. Setting a content
  window means "redact sooner", not "exempt from deletion".
- **A `contentDays` at or past the delete window is ignored**, because it could never fire, and a policy that
  silently does nothing is worse than a rejected one.
- **It applies to records you already have.** A background pass stamps existing records from **their own
  `createdAt`**, not from when you enabled the policy — so switching it on prunes the backlog rather than
  granting everything a fresh full window. It never re-slides an expiry a record already has, so a deliberate
  per-record `ttlDays` is safe from it, and the first time it reaches a space+type it logs one `info` line
  naming the window: a dormant policy that starts deleting records should say so.
  - **This is the schema tier only.** Changing the space-wide `recordTtlDays` does *not* reach back over records
    written before the change — that would start deleting history on every space that has ever set one.
- The schema lives in space meta, so this tier is **governed and replicated**: in a network the policy is agreed
  and each instance then expires its own copy locally, and the tombstones converge.
- **A type defined by `$ref` has no window.** A schema-library entry cannot carry `retention` — its schema
  rejects the field, because one entry is referenced by any number of spaces and a delete policy is not a
  property of the shape. Resolve the `$ref` to an inline definition first, or use the space-wide default.
- Set the space-wide number in **Settings → Spaces → Danger Zone**; set a type's window on the type, in the
  **Schema** tab, beside its naming pattern and property rules. Both are editable in the UI — the delete window
  on any type, and the content window on chrono types, where the editor also refuses a content window that
  could never fire.

---

### Stamp integrity — when a record's own timestamp disagrees with the server's

A record may carry its own idea of when it happened, as a property: `stampedAt`, `postedAt`, or whatever your convention
is. That value comes from the author, and **an estimated timestamp looks exactly like a measured one once it is written
down**. The server holds a number the author did not supply — `createdAt` — so it can compare the two, and you cannot.

On create, if the record carries one of the configured stamp properties and it disagrees with `createdAt` beyond the
space's threshold, the record gets a `stampSkew` field:

```json
{
  "property": "postedAt",
  "stamp": "2026-08-09T0942Z",
  "skewMs": -28800000,
  "thresholdMs": 2400000
}
```

`skewMs` is **signed**: negative means the author's stamp is *earlier* than the write. `stamp` is quoted back exactly as
sent, because the point is that it looked right. `thresholdMs` is what it was judged against, so a record read years later
still says what the rule was at the time.

**It is a warning, never a refusal.** The record is stored exactly as sent. A legitimately backdated record is a normal
thing — a historical import, a backfilled document — and what is being reported is a wrong number, not a corrupt record.

**The field is set only when the threshold is exceeded.** Absence means agreed, or unstamped, or not checked. That makes
presence the signal, and this the whole integrity check:

```http
POST /api/brain/spaces/:spaceId/query
{ "collection": "memories", "filter": { "stampSkew": { "$exists": true } } }
```

The compact form `2026-08-09T0942Z` — no colon, no seconds — is parsed, as are ordinary ISO 8601, an explicit offset, and
epoch seconds or milliseconds. A property that is not a timestamp at all is **not checked** rather than reported as skew.

#### Configuring it, per space

In the space's `meta`, so `PATCH /api/spaces/:id` and `update_space_schema` already write it:

```json
{ "meta": { "stampSkew": { "warnMinutes": 40, "properties": ["stampedAt", "postedAt"] } } }
```

| Field | Default | Meaning |
|---|---|---|
| `warnMinutes` | `40` | Warn beyond this much disagreement. **`0` disables the check** — it does *not* mean "warn on any difference", because a caller's stamp and the server's clock never agree to the millisecond |
| `properties` | `["stampedAt", "postedAt"]` | Which properties to check, in order. The **first one that parses** decides; naming your own **replaces** the defaults rather than adding to them |

The 40-minute default is not arbitrary: it is the clock tolerance the board protocol that prompted this already assumed
between two parties.

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
| `skip` | Rows to discard before the page. **The parameter is `skip`** — `offset`, `page`, `per_page`, `pageSize`, `sortBy`, `orderBy`, `order` and `direction` are refused with a `400` naming the one to use, rather than accepted and ignored |

Both `tag` and `entity` can be combined (AND logic). Results are sorted newest-first.

**Response** `200`:

```json
{
  "memories": [ ... ],
  "limit": 100,
  "skip": 0,
  "total": 4831,
  "truncated": true
}
```

| Field | Meaning |
|---|---|
| `limit` / `skip` | The values actually applied, echoed so a loop can tell what it got from what it asked for |
| `total` | Every record the filter matches, ignoring `limit` and `skip`. Summed across members on a proxy space |
| `truncated` | `true` when this page is not the end of the match set — i.e. `skip + returned < total` |

**Compare your running sum against `total` and stop.** That is what `total` is for. aigents paged this endpoint with
`offset`, which was not a parameter we had: it was accepted and ignored, every page was the same newest-300, and 67
identical pages summed to 10,184 matching records in a space holding 300 with 152 matches. They were about to delete
records on that number, and what caught it was a *different* endpoint disagreeing — not anything the paging response said.
Both halves of that are fixed here: the total is in the envelope, and an unsupported pagination name is a `400`.

On a **proxy space** the page is computed over the merged set of member spaces, not per member, so `skip` means the same
thing it does on a plain space. `skip + limit` is bounded there — a deep page needs that many rows from every member — and
exceeding the bound is a `400` naming the ceiling.

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

### Sorting (all brain list endpoints)

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

### Freetext search (`?search=`)

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

### What a `PATCH` does to `tags` and `properties`

**`properties` MERGE on every record type.** A patch that names one key keeps the others — the stored map with
your keys laid over it, one level deep. This is the same rule as an upsert and the same rule a converged retry
follows, so there is one thing to know across memories, entities, edges and chrono entries.

**`tags` differ by type, deliberately:**

| Endpoint / tool | `properties` | `tags` |
|---|---|---|
| `PATCH .../entities/:id`, `update_entity` | merge | **union** with the stored tags |
| `PATCH .../edges/:id`, `update_edge` | merge | **union** with the stored tags |
| `PATCH .../memories/:id`, `update_memory` | merge | **replaces** the stored tags |
| `PATCH .../chrono/:id`, `update_chrono` | merge | **replaces** the stored tags |

**Removing a key is `deleteFields`' job, never an absence.** Omitting a property does not delete it, and sending
an empty `properties: {}` is a no-op rather than a wipe. If you need a key gone, name it:
`deleteFields: ["properties.oldKey"]`.

> **Changed in 2.4.1.** `PATCH .../memories/:id` and chrono updates previously **replaced** the whole
> `properties` map, so a patch naming one key silently dropped the rest — while `update_memory`'s own schema
> described the field as "properties to merge". If you were relying on the replace to clear keys, switch to
> `deleteFields`.

### Updating by id: use PATCH

`PATCH` is the update verb for every brain record type. There is **one exception, and it is a legacy one**:
a POST to a chrono **id** also updates (`.../chrono/:id`). No other type has an equivalent: posting
to a memory id is a **404**, not an update.

| type | update by id | POST-as-update |
|---|---|---|
| memory | `PATCH .../memories/:id` | **no** (404) |
| entity | `PATCH .../entities/:id` | no — but a collection POST with a matching `id` upserts |
| edge | `PATCH .../edges/:id` | no — a collection POST upserts on `(from, to, label)` |
| chrono | `PATCH .../chrono/:id` | **yes**, legacy |

**Do not build on the chrono form.** It predates the retry-safety design and duplicates it: the supported way
to make a create idempotent is a client-supplied UUID v4 in the **collection** POST body, which converges on
the same record for every type (see [Retry Safety](#retry-safety)). The chrono route is kept for existing
callers and is listed for removal in a future major.

**It is not only a scheduling concern — the legacy verb behaves differently today.** "Deprecated" is easy to
plan around; these two consequences are not, and an integrator with nine flows on this route asked us to say
so here rather than leave it to be read off the handlers:

| | legacy `POST .../chrono/:id` | `PATCH .../chrono/:id` |
|---|---|---|
| property validation | **none** — the `type` allowlist is the whole of it, so under strict validation this verb can write a record the same space would **reject at create time** | validates the record **as it will be**, merging the patch onto stored properties first |
| audit snapshot | **none** | stores before **and** after, so the change appears in the audit trail |
| `excludeFromVectorSearch` | **refused** with `400` — a field that reaches the writer only where validation and the audit trail exist | accepted |

If you are on the legacy form, the migration is the verb alone: both reach the same writer, `properties`
merges on both, and no other field changes meaning. A `PATCH` that names no recognised field is a `400`
(`At least one field must be provided`) where the legacy verb answered `200` with an unchanged record.

### Optimistic concurrency (`If-Match`)

Brain-record `PATCH`es are last-write-wins by default. Two clients that read the same record, edit the
**same field**, and both save produce one silent loser: their value disappears with a `200` and no trace.
(Editing *different* fields is safe — a `PATCH` only writes the fields you send, and the record's search
vector is rebuilt from the record as **stored**, so a concurrent edit to another field cannot leave the two
disagreeing.)

To make your write conditional, send back the `seq` you read as an `If-Match` header:

```http
PATCH /api/brain/spaces/research/entities/8f2c…
If-Match: 41
```

If that record's `seq` has moved, nothing is written and you get **412 Precondition Failed**:

```json
{
  "error": "This entity has changed since you read it. Re-read it and re-apply your change.",
  "currentSeq": 46
}
```

`currentSeq` is read at the moment of the failure, so it is the value to retry with. If it is **absent**,
the record was deleted rather than changed — the message says so.

Notes:

- **The header is optional.** Omit it and the write proceeds unconditionally, exactly as before. Every
  existing client and script is unaffected.
- **All four record types**, on the `PATCH` route: `memories`, `entities`, `edges`, `chrono`.
- **`seq` is on every record** and is returned by every read. Treat it as an **opaque token**: it is a
  per-space counter, not a per-record version, so consecutive writes to one record will not give you
  `1, 2, 3`. Echo back what you read and do not reason about the gaps.
- Bare (`41`), quoted (`"41"`) and weak (`W/"41"`) forms are all accepted, as is `*`, which asks only that
  the record still exist.
- **A value that is not a `seq` — `If-Match: abc` — is a `400`, never ignored.** Silently dropping an
  unparseable precondition would leave you believing your write was protected when it was not.
- **The check is part of the write**, not a read before it. There is no window between the two in which
  another writer can land.
- **The legacy `POST .../chrono/:id` refuses the header with a `400`** rather than ignoring it, for the same
  reason it refuses `excludeFromVectorSearch` — see the table above. Use `PATCH`.
- **MCP has no equivalent**, and this is a property of the transport rather than an oversight: MCP tools
  take arguments, not headers, so there is nothing for an `If-Match` to travel in. Agents that need a
  conditional write should use the REST route.
- **File-metadata records are not covered**, and say so: they carry no `seq` to condition a write on, so
  `PATCH /api/brain/spaces/:spaceId/files` **refuses** an `If-Match` with a `400` rather than accepting and
  dropping it. Its search vector is still rebuilt from the record as stored, through the same background
  queue as everything else, so a concurrent edit cannot leave the record and its vector disagreeing — you
  simply cannot make *this* write conditional.

The same header, in the same spellings, is honoured on space-meta writes against `meta.version` — see the
[Spaces API](06-spaces-api.md).

### Retiring a record from semantic search

`excludeFromVectorSearch` is a boolean on **all four** record types (`memories`, `entities`, `edges`,
`chrono`), settable on the `PATCH` route and on the matching MCP `update_*` tool:

```http
PATCH /api/brain/spaces/:spaceId/chrono/:id
{ "excludeFromVectorSearch": true }
```

It **may be the only field in the request** — retiring a record is a complete edit, not a modifier on some
other change.

**It is implemented as the absence of a vector, not as a query-time filter.** Setting it enqueues an embed
job that unsets the embedding; clearing it enqueues one that computes a fresh embedding. The job handles both
directions, so the flag is enforced once in the store rather than remembered at every call site.

The consequence is worth stating plainly, because it is the reason to choose this over a filter of your own:

| reader | sees an excluded record? |
|---|---|
| `recall`, `find_similar`, duplicate/contradiction scans | **no**, and there is no parameter that asks for it back |
| `GET`/`PATCH` by id, `query`, `list`, `traverse`, exports | **yes**, unchanged and complete |

So an audit that must include retired records has to be a **structured read**, not a recall. If you point a
semantic search at retired records today by applying a filter you control, the flag will not reproduce that
behaviour — it removes the vector the search ranks on, and the result is a quietly shorter answer with no
error. Nothing in the record's own data is lost.

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
- **Naming the same field in both halves is allowed, and the deletion wins.** `{"tags": ["a"], "deleteFields": ["tags"]}` stores no tags, because the delete is the later instruction. This follows from the rule above rather than being a separate one, but it is the case worth stating: it used to be rejected.
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
