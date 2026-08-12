# MCP (Model Context Protocol)

> Part of the [Ythril Integration Guide](../integration-guide.md).

## MCP (Model Context Protocol)

Ythril exposes a single global MCP server via SSE. Each tool accepts a `space` parameter — the connection is not scoped to a single space.

### Server Instructions

On connect, the server sends global instructions listing all available space IDs and noting that each tool requires a `space` parameter (except `recall`, `list_chrono`, and `find_similar`, where `space` is optional and enables cross-space results when omitted; and `list_peers`/`sync_now` which are global). Call `list_spaces` to get space IDs, purposes, and entry counts (memories, entities, edges, chrono) — useful for discovering which spaces are populated before querying. Call `get_space_meta` with a specific space to get its full schema, purpose, and usage notes.

> **A refused write is machine-readable.** When a tool refuses a write on schema grounds, the result carries
> `structuredContent` alongside the prose:
>
> ```json
> {
>   "error": "schema_violation",
>   "message": "introduced: status is required; pre-existing: owner is required",
>   "introduced":  [{ "field": "status", "reason": "required" }],
>   "preExisting": [{ "field": "owner",  "reason": "required" }],
>   "violations":  [{ "field": "status", "reason": "required" }, { "field": "owner", "reason": "required" }]
> }
> ```
>
> **`introduced` vs `preExisting` is the field worth branching on.** `introduced` means your patch caused it —
> fix the patch. `preExisting` means the stored record already violated the schema there and your write
> neither caused nor fixed it, which makes this write the moment to repair it. A write is only refused for
> what it introduces, so a pre-existing violation never blocks an unrelated patch. `content` still carries
> the same information as a sentence, so a client that reads only text loses nothing.
>
> **Tool inputs are self-describing — and enforced.** Every tool's complete input contract — each parameter, its allowed values (`enum`), numeric bounds (`minimum`/`maximum`/`default`), string limits, the filter-operator allowlist, and `additionalProperties: false` — is published in its `inputSchema` via `tools/list`. The dispatcher **validates every call against that schema before running the tool**, rejecting a non-conforming call with an `isError` result — so unknown properties, out-of-range numbers, out-of-enum values, and malformed ids are hard errors, not silently ignored or clamped. Treat `tools/list` as the authoritative, machine-readable reference and read a tool's schema before constructing arguments; the `help` tool points here too.

### Read-Only Tokens

When connecting with a `readOnly` token, mutating tools (`remember`, `update_memory`, `delete_memory`, `upsert_entity`, `update_entity`, `delete_entity`, `merge_entities`, `upsert_edge`, `update_edge`, `delete_edge`, `create_chrono`, `update_chrono`, `delete_chrono`, `bulk_write`, `write_file`, `delete_file`, `create_dir`, `move_file`, `retry_embedding`, `sync_now`, `update_space`, `update_space_schema`, `create_space`, `wipe_space`) are **hidden** from `tools/list` and rejected with an error if called directly. Read-only tools (`help`, `recall`, `find_similar`, `query`, `get_stats`, `get_space_meta`, `list_spaces`, `find_entities_by_name`, `list_chrono`, `read_file`, `list_dir`, `traverse`) work normally. `list_tokens` is read-only but **admin-gated**, like `list_peers`. `list_peers` is read-only but **admin-gated** — see the admin-only note below.

### Connecting

Ythril accepts MCP over two transports, and two ways to authenticate.

#### Transports

- **Streamable HTTP** (recommended) — a single stateless endpoint:

  ```http
  POST /mcp
  Authorization: Bearer <token>
  Content-Type: application/json
  Accept: application/json, text/event-stream
  ```

  Each request is self-contained; no persistent connection or `sessionId` is needed. Works through standard HTTP proxies.

- **SSE** (legacy) — open a stream, then post messages to it:

  ```http
  GET /mcp
  Authorization: Bearer <token>
  Accept: text/event-stream
  ```

  Returns an SSE stream with a `sessionId`. Send tool calls to `POST /mcp/messages?sessionId=<sessionId>`.

#### Authentication

- **Static bearer token** — clients that let you set an `Authorization` header (Claude Desktop, Cursor, VS Code, custom scripts) simply send a Ythril PAT: `Authorization: Bearer ythril_…`. Nothing else is required.

- **OAuth 2.1** — browser-based connectors that cannot store a static header (e.g. the **claude.ai custom connector**) use the standard [MCP authorization flow](https://modelcontextprotocol.io/specification/basic/authorization) (OAuth 2.1 + PKCE + Dynamic Client Registration). Ythril is both the resource server and its own authorization server — **no external IdP is required**. See [MCP OAuth for browser connectors](#mcp-oauth-for-browser-connectors) below.

### MCP OAuth for browser connectors

When an OAuth client hits `/mcp` without a token, Ythril returns `401` with a `WWW-Authenticate: Bearer resource_metadata="…"` header that points at the RFC 9728 protected-resource metadata. The client then discovers the authorization server, registers itself (DCR), and drives the user through an authorization + consent step. On approval it receives a Ythril PAT as its OAuth access token.

**Configure the public URL.** OAuth metadata must advertise absolute, externally-reachable URLs. Set the instance's public base URL to your HTTPS address:

- `config.publicUrl` = `https://brain.example.com` (or the `PUBLIC_BASE_URL` env var, which takes precedence), then **restart** the server.
- The URL **must be HTTPS** for any non-loopback host (OAuth is refused otherwise, and only the static-bearer flow is offered — a warning is logged at startup). `http://localhost` / `http://127.0.0.1` are allowed for local testing.

Discovery + grant endpoints (mounted at the application root):

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728 protected-resource metadata |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 authorization-server metadata |
| `POST /register` | RFC 7591 Dynamic Client Registration |
| `GET /authorize` | Authorization endpoint — renders the consent page |
| `POST /mcp-oauth/consent` | Consent submission (internal; posted to by the consent page) |
| `POST /token` | Token endpoint — exchanges an auth code (+ PKCE) for an access token |

**The consent step.** The user is shown a page asking them to paste a Ythril access token to approve the connection. The connector is then issued a **new** PAT with **the same permissions** (admin / space scope / read-only) as the token that approved it. That connector token is named `MCP connector: <client>` and can be revoked independently under **Settings → Tokens** (or `DELETE /api/tokens/:id`). Only someone who already holds a valid Ythril token can approve a connection — there is no way to gain access without one.

Connector tokens **expire** after `MCP_OAUTH_TOKEN_TTL_DAYS` (default 90 days) so an abandoned connector never leaves a permanent credential behind — the exchange advertises `expires_in`, and the connector re-runs consent when its token lapses. Re-consenting **rotates** the single token held for that client rather than appending a new one, so `config.json` does not grow with every reconnect, and the total connector-token count is capped. Set `MCP_OAUTH_TOKEN_TTL_DAYS=0` to opt out of expiry.

No refresh-token flow is used: when a connector token expires (see above), the connector simply re-runs the authorization + consent flow to mint a new one.

**Connecting from claude.ai (or another browser connector).** End-to-end operator steps:

1. Set `config.publicUrl` (or the `PUBLIC_BASE_URL` env var) to your external HTTPS URL — e.g. `https://brain.example.com` — and **restart** the server. Confirm the startup log shows `MCP OAuth authorization server enabled (issuer https://…)` rather than the "OAuth disabled" warning.
2. Create (or copy) a Ythril access token with the scope you want the connector to have — an admin PAT for full access, or a space-scoped / read-only PAT to limit it. Get it from **Settings → Tokens**.
3. In claude.ai, go to **claude.ai → Settings → Connectors → Add custom connector** and enter the MCP URL: `https://brain.example.com/mcp`. Claude discovers the authorization server and opens Ythril's consent page.
4. On the consent page, paste the token from step 2 and click **Approve access**. Claude receives a new connector token and the connection goes live.
5. To disconnect later, revoke the `MCP connector: <client>` token under **Settings → Tokens** (revoking the token you pasted in step 2 does *not* disconnect it — the connector holds its own minted token).

> Clients that let you set a header directly (Claude Desktop, Cursor, VS Code) skip all of the above — just paste a `ythril_…` PAT into their MCP server config. No `publicUrl` or OAuth setup is required for them.

### Sending Tool Calls

For the SSE transport:

```http
POST /mcp/messages?sessionId=<sessionId>
Authorization: Bearer <token>
Content-Type: application/json
```

### Telling "absent" from "your token cannot see it"

Two different situations look identical from outside: a tool that was never built, and a tool hidden from your
`tools/list` because your token is read-only or non-admin. One is a gap in the product; the other is a
permission. You should not have to ask which.

**Hidden by scope:** a mutating tool is omitted for a `readOnly` token, and an admin tool for a non-admin. The
`help` tool's prose says outright when tools are being hidden from you and how many.

**Never built:** `help` returns a `structuredContent.restOnly` block listing every capability that exists over
REST and not yet over MCP — each with the route, the method, and *why* it is not a tool yet:

```json
{
  "restOnly": {
    "note": "These capabilities exist over REST and are NOT yet on MCP. Each row is a confirmed absence, not a permission you lack …",
    "capabilities": [
      {
        "capability": "Rebuild a space's vector indexes",
        "mcpTool": null,
        "restEndpoint": "/api/brain/spaces/:spaceId/reindex",
        "method": "POST",
        "why": "Not built. …"
      }
    ]
  }
}
```

`mcpTool` is `null` on every row by definition. A row disappearing means the tool now exists — a gate fails if a
row survives its own tool being built, so the list cannot keep advertising a gap that has closed.

### Available Tools

> **After an instance upgrade, reconnect before concluding a tool is missing.** MCP negotiates the tool list
> **once, at session start**, and clients cache it. A session held open across an upgrade keeps reporting the
> tool surface of the version it connected to — so tools added by the new version are absent from the client's
> view while the server offers them normally. Nothing is wrong and nothing needs fixing; the session is stale,
> not the server.
>
> This is easy to misread, because every piece of evidence in front of you points the other way: the tool is
> genuinely not in your client's list, and the instance is genuinely on the new version. An operator running
> five instances hit exactly this on a 2.4.0 → 2.5.0 upgrade and came close to reporting that three tools had
> not shipped.
>
> **`help()` is the check.** It is generated server-side, per token, at call time — so it always describes what
> the instance offers *right now*, scoped to what your token may call. If `help()` lists a tool your client
> does not, the answer is to reconnect.

| Tool | Description |
|---|---|
| `help` | Self-documenting system guide — the knowledge model, how to choose between `query` / `recall` / filtered recall, schema authoring, and the tools available to the calling token. Read-only, no `space` needed; scoped to the token so it never lists tools the token can't call |
| `list_spaces` | List accessible space IDs with purposes and entry counts (memories, entities, edges, chrono). `purpose` is the space-level directive; `description` is returned alongside as its deprecated alias, always the same text |
| `remember` | Store a memory with optional tags and entity links |
| `update_memory` | Update an existing memory's fact, tags, entity links, or delete specific fields via `deleteFields`; `excludeFromVectorSearch` retires it from semantic search |
| `delete_memory` | Delete a memory by ID |
| `recall` | Semantic search across all knowledge types (memories, entities, edges, chrono entries, files). Searches the specified `space`; omit `space` to search across all accessible spaces |
| `query` | Structured MongoDB filter query (read-only) — supports `memories`, `entities`, `edges`, `chrono`, and `files` collections |
| `find_similar` | Find entries with high vector similarity to an existing entry by ID — no re-embedding step. Provide `space` to scope to one space, or omit it to search across all accessible spaces (like `recall`). Supports `traverse` (graph expansion). The legacy `crossSpace` flag is deprecated — omit `space` instead |
| `get_stats` | Return counts of memories, entities, edges, chrono entries, and files |
| `get_space_meta` | Return the full space schema definition, purpose, usage notes, and stats |
| `upsert_entity` | Create or update a named entity (with optional properties) |
| `update_entity` | Update an existing entity by ID (name, type, description, tags, properties, `excludeFromVectorSearch`); supports `deleteFields` for field removal |
| `delete_entity` | Delete an entity by ID. Refused when the space has `strictLinkage` and another record still references it — the same rule the REST route enforces. Face labels are unlabelled rather than blocking |
| `merge_entities` | Merge two entities — relink all references and resolve per-property conflicts |
| `find_entities_by_name` | Find all entities with an exact name match (returns list regardless of type) |
| `upsert_edge` | Create or update a directed relationship |
| `update_edge` | Update an existing edge by ID (label, type, weight, description, tags, properties, `excludeFromVectorSearch`); supports `deleteFields` for field removal |
| `delete_edge` | Delete an edge by ID |
| `traverse` | BFS graph traversal — follow edges from a starting entity up to `maxDepth` hops. Chrono entries referencing a reached node come back too, marked `kind: "chrono"` (`includeChrono: false` for entity-only); `includeMemories: true` reaches memories the same way (opt-in — they are numerous and count against `limit`); `includeFiles: true` reaches files, returning **file meta only** — path, description, tags, never passage text, and one node per file rather than per chunk; `includeEdges: false` drops the edge list from the answer without changing the walk |
| `create_chrono` | Create a chrono entry (the five built-in types, or the space's own declared chrono types, which replace them) |
| `update_chrono` | Update an existing chrono entry, including `excludeFromVectorSearch`. Requires at least one field beyond `id` |
| `delete_chrono` | Delete a chrono entry by ID |
| `list_chrono` | List chrono entries, optionally filtered by status, type, tags, date range, or text search |
| `bulk_write` | Batch-upsert memories, entities, edges, and/or chrono entries in a single call (schema-validated) |
| `read_file` | Read a text file from the space file store |
| `write_file` | Write a text file to the space file store (optional `description` and `tags` stored as metadata) |
| `list_dir` | List directory contents |
| `delete_file` | Delete a file |
| `list_tokens` | List the instance API tokens — names, prefixes, expiry, rights. **Admin only.** Never includes a secret or its hash |
| `retry_embedding` | Re-queue a file whose media embedding failed or was skipped. Returns `processing` unchanged when the worker already holds it |
| `create_dir` | Create a directory |
| `move_file` | Move or rename a file/directory |
| `update_space` | Update space label and/or purpose (admin only). In a networked space a purpose change opens a meta vote rather than applying at once |
| `create_space` | Create a space (admin only). The id is derived from the label when omitted. A new space is seeded `validationMode: strict` + `strictLinkage: true` unless `meta` says otherwise; a `proxyFor` space is left un-seeded because it stores nothing of its own. **`faceDescriptorDims` is create-only and permanent** — 128 for MobileFaceNet-class models, 512 for ArcFace / AdaFace / FaceNet / EdgeFace. Same refusals as `POST /api/spaces`, including `422` for a missing schema-library `$ref` and `409` when the id is taken |
| `update_space_schema` | Write the space's type schemas and its other meta fields — `validationMode`, `strictLinkage`, `usageNotes`, `suppressEmbeddings` (admin only). **Merges** by default: types you do not name are preserved. `typeSchemasMode: "replace"` makes the payload authoritative, which is the only way to DELETE a type. Same refusals as `PATCH /api/spaces/:id`, including `422` for a `$ref` to a schema-library entry that does not exist. In a networked space it opens a meta vote rather than applying at once |
| `wipe_space` | Wipe all or specific collection types from the space (admin only) |
| `list_peers` | List all configured peer instances (admin only) |
| `sync_now` | Trigger immediate sync (all networks or specific peer) (admin only) |

> **Admin-only tools.** `list_peers`, `sync_now`, `update_space`, `update_space_schema`, `create_space`, and `wipe_space` require an `admin`
> token: the first two are instance-level (they expose the whole peer topology and drive outbound
> connections to every peer) and have no space scoping. They are hidden from `tools/list` for
> non-admin tokens and rejected if called directly.

### Example: remember

```json
{
  "method": "tools/call",
  "params": {
    "name": "remember",
    "arguments": {
      "space": "general",
      "fact": "Traefik v3 requires CRD patches for allowSlashesInPath",
      "tags": ["traefik", "gotcha"],
      "entities": ["Traefik"]
    }
  }
}
```

### Duplicate Detection on Insert

The `remember`, `upsert_entity` and `create_chrono` tools run a **semantic near-duplicate check** before storing, using the same embedding the new record is stored with — so it costs a vector search, not a re-embed. When a highly similar record already exists, the tool's response flags it (id, a short summary, and the cosine score) so an agent can update or merge the existing record instead of accumulating redundant ones:

```text
Stored memory (seq 1284, ID 7f3c…).
⚠️ Possible duplicate — 1 existing memory is highly similar: "The Vault service stores secrets and rotates auth tokens" (ID 9a1b…, 0.97). This memory was still stored; pass checkDuplicates:false to skip this check, or update the existing one instead.
```

#### It sees the batch you are writing

The check reads **two** places, and the second one matters if your agent writes several related records in
one turn. The vector index is eventually consistent — a record committed a second ago is not in it yet — so
a check that read only the index could never warn you about a sibling from the same batch. Every duplicate
warning named an older record, and none ever named the one you had just written, which is precisely when
duplicates get created.

So the check also scores the space's **most recently written records straight from the collection**. Two
bounds keep that off your latency budget, both settable if your write rate needs different ones:

| variable | default | what it bounds |
|---|---|---|
| `DUPE_FRESH_WINDOW_MS` | `180000` | how far back it reads. `0` disables this half — index only, the pre-2.5 behaviour |
| `DUPE_FRESH_SCAN_CAP` | `200` | the most records one check scores this way, whatever the window says |

The cost is proportional to how much the space is actually churning, not to how large it is: measured on
20,000 records at 768 dimensions, **~9 ms** when nothing was written recently and **~52 ms** when the window
is full. A space sustaining more writes than the cap covers logs a warning naming the cap, so a truncated
scan never quietly reads as a complete one.

#### Contradiction warning on insert

`checkContradictions` (default **off**) asks a different question of the same neighbours: not *"is this
redundant?"* but *"does this conflict with what we already believe?"*. When a near-neighbour sets the same
single-valued property to a different value, the response names the property and **both** values:

```text
Stored memory (seq 1290, ID 4c2e…).
⚠️ Contradiction — 1 existing memory disagrees with this one: "Vault runs in the eu-west cluster" (ID 9a1b…: region eu-west vs us-east). This memory was still stored. If you are correcting an outdated fact, update or supersede the record above instead of leaving both.
```

Three deliberate limits:

- **It is its own flag**, not a rider on `checkDuplicates` — a caller may well want the conflict check
  without the redundancy check. One neighbour search serves both when both are on.
- **Deterministic only.** The entailment (NLI) judge is a model call *per pair*; on the write path that
  would add latency to every insert and, with an external endpoint, send record text off the instance on
  every insert. The nightly scanner runs the NLI pass over the same pairs, so nothing is lost — this is a
  fast-path courtesy, not the safety net.
- **It never blocks the write.** An agent correcting an outdated fact *should* be able to contradict the
  record it supersedes; the point is to tell it, not to stop it.

Available on `remember`, `upsert_entity` and `create_chrono`. **Not** on edges or files: edge writes are the
bulk path (imports, peer sync, subgraph building) where a per-insert vector search would be felt most, and a
file record "disagreeing" with another is not a meaningful claim.

#### What counts as a claim

The check compares **single-valued claims**. For memories and entities those are the entries in
`properties`. A **chrono** entry additionally claims its **`status`** — one entry saying an event
`completed` and a near-identical one saying it was `cancelled` is a genuine conflict, and because status is
part of a chrono entry's embedded text, a pair similar enough to be flagged *while disagreeing about it* is
near-certainly the same event logged twice.

A chrono entry's **`startsAt`/`endsAt` are deliberately excluded.** The dates are not embedded, so two
hand-logged occurrences of a repeating event ("Team sync", every Monday) reach ~1.0 similarity with
different dates *every time*. Reporting those would fill the review queue with the one thing that is
certainly not a contradiction — and a pair that similar is already reported by the duplicate scanner, so it
would also be the same two records named twice under two different headings.

- **The write always succeeds** — the check is advisory, never blocking. It also never fails an insert: if vector search is unavailable or the space needs reindexing, the check is silently skipped.
- **Default on** for all three tools. Pass `checkDuplicates: false` to skip it, or `dupeThreshold` (0–1, default ~0.92) to tune sensitivity — lower flags looser matches.
- For `upsert_entity` the check fires only on a **new insert** (no `id`, or an `id` that does not yet exist), not on updates.
- Because `$vectorSearch` has indexing latency, a record inserted moments earlier may not yet be visible to the check — duplicates are detected against the already-indexed corpus.
- Not applied by `bulk_write` (it would add a search per item); use single-item `remember`/`upsert_entity` when you want duplicate feedback.

### Example: recall

```json
{
  "method": "tools/call",
  "params": {
    "name": "recall",
    "arguments": {
      "space": "general",
      "query": "Traefik routing configuration",
      "topK": 5,
      "tags": ["portal-backend"]
    }
  }
}
```

Omit `space` to search across all accessible spaces. `recall` searches all knowledge types — **memories**, **entities**, **edges**, **chrono entries**, and **files** — using vector similarity.

**Response format:**

The tool returns a JSON object with a `results` array and a `count`. Each result has four top-level keys — search metadata cleanly separated from the stored document:

```json
{
  "results": [
    {
      "score": 0.91,
      "spaceId": "general",
      "type": "memory",
      "record": {
        "_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
        "fact": "Traefik routing configuration uses path-prefix matchers",
        "tags": ["portal-backend", "traefik"],
        "description": "Configured via IngressRoute CRD.",
        "properties": { "version": "3.x" },
        "entityIds": [],
        "createdAt": "2026-03-25T14:00:00.000Z",
        "updatedAt": "2026-03-25T14:00:00.000Z"
      }
    },
    {
      "score": 0.87,
      "spaceId": "general",
      "type": "entity",
      "record": {
        "_id": "b2c3d4e5-f6a7-4890-bcde-f12345678901",
        "name": "traefik-ingress",
        "type": "ingress-controller",
        "tags": ["portal-backend"],
        "description": "Handles HTTP routing for portal services.",
        "properties": { "status": "active" },
        "createdAt": "2026-03-20T10:00:00.000Z",
        "updatedAt": "2026-04-01T08:00:00.000Z"
      }
    }
  ],
  "count": 2
}
```

| Field | Description |
|-------|-------------|
| `score` | Cosine similarity score (0.0–1.0). Higher is more relevant. |
| `spaceId` | Space this result came from. Critical for cross-space recall (no `space` arg). |
| `type` | Knowledge type discriminator: `memory`, `entity`, `edge`, `chrono`, or `file`. |
| `record` | The stored document with its user-visible fields. `_id` is always present and can be used directly in follow-up tool calls (`update_memory`, `upsert_entity`, `delete_memory`, etc.) without a second lookup. Embedding vector excluded. |

For cross-space recall (omit `space`), `spaceId` on each result identifies which space it came from.

> **The MCP response is deliberately smaller than the REST one.** Every field is multiplied by `topK` and
> paid for in the calling model's context, so three things REST returns are dropped here:
> `matchedText` (for a file chunk it is `headingText + ' ' + content` — the passage a second time; the
> passage is returned once, as `content`), `embeddingModel` (identical for every record in a space) and
> `seq` (the sync counter — not an input to any tool). The REST endpoint still returns all three.
> To drop the passage bodies as well and get locations only, pass `includeContent: false`.

**What is vector-indexed:**

| Data type | Embedded? | Fields included in the pre-embedding text (`matchedText`, REST only) | Returned by `recall`? |
|-----------|:---------:|---------------------------------------------------|:---------------------:|
| `memory` | ✅ | `tags` + entity names + `fact` + `description` + `properties` | ✅ |
| `entity` | ✅ | `name` + `type` + `tags` + `description` + `properties` | ✅ |
| `edge` | ✅ | `tags` + `from` + `label` + `to` + `type` + `description` + `properties` | ✅ |
| `chrono` | ✅ | `type` + `status` + `title` + `tags` + `description` + `properties` | ✅ |
| `file` | ✅ | `path` + `tags` + `description` | ✅ |

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `space` | `string` | — | Space ID to search in. Omit to search across all accessible spaces. |
| `query` | `string` | ✅ | Natural language search query |
| `topK` | `number` | — | Max results to return (default `10`) |
| `tags` | `string[]` | — | Optional tag filter — only results bearing **all** of these tags are returned (applies to all knowledge types). Useful for scoping a semantic search to a specific service or ADR (e.g. `["portal-backend"]`) |
| `types` | `string[]` | — | Optional knowledge-type filter — restrict results to one or more of `memory`, `entity`, `edge`, `chrono`, `file`. Omit to search all types. |
| `minPerType` | `object` | — | Optional minimum result count per type. Guarantees at least that many results of each specified type if available (e.g. `{"entity": 2, "edge": 1}`). Uses two-phase search: guaranteed slots filled first, remaining slots filled by score. Omit to use pure score ranking. |
| `maxPerType` | `object` | — | Optional **maximum** result count per type — the ceiling to `minPerType`'s floor (e.g. `{"file": 2, "memory": 4}`). A slot the cap frees goes to another type, so this is how you stop one long file passage from taking space several one-line records would have answered more cheaply. At least `1` per type (use `types` to exclude a type entirely) and clamped to `topK`; a value below `minPerType` for the same type is an error rather than a silent resolution. |
| `maxTimeMS` | `number` | the instance budget | Deadline for this recall in ms. Can only **lower** the instance's budget, never raise it, and is clamped up to a 250 ms floor. On expiry the answer is **partial** rather than an error or a hang: collections that finished are returned and the response carries `degraded: ["search_timeout"]`. `degraded` is absent when nothing degraded, and also reports `rerank_skipped_budget` / `rerank_unavailable`. |
| `minScore` | `number` | — | Minimum cosine similarity score (0.0–1.0). Results below this threshold are excluded. Applies before `topK` — so `topK=10, minScore=0.7` returns at most 10 results, all with score ≥ 0.7. |
| `includeContent` | `boolean` | — | Whether to return each file chunk's `content` — the passage body (default `true`). Set `false` for locations and metadata only (path, heading, chunk index, tags, properties), then read back only the chunk you decided you need. Passage bodies are by far the largest field in a response. |
| `filter` | `object` | — | Property equality/comparison filter applied to the vector-search results. Same shape and allowed key prefixes as the [recall filter](04a-recall-api.md#prefiltered-recall-filter-parameter) (`properties.`, `tags`, `type`, `name`, `status`, `label`) with `eq`/`ne`/`in`/`exists`/`gt`/`gte`/`lt`/`lte` operators. Records not matching **all** conditions are excluded. |
| `traverse` | `number` | — | Graph-expansion depth (integer `0`–`5`, default `0`). When `> 0`, each semantic match is expanded along knowledge-graph edges up to this many hops; connected entities are returned alongside the seeds, annotated with `source` (`recall`/`traverse`), `hops`, and `path`. |

When `space` is omitted, `recall` searches across all accessible spaces — the same as the former `recall_global` behaviour.

### Example: update_memory

```json
{
  "method": "tools/call",
  "params": {
    "name": "update_memory",
    "arguments": {
      "space": "general",
      "id": "a1b2c3d4-...",
      "fact": "Kubernetes pods are ephemeral by design (applies to all workload types)",
      "tags": ["k8s", "architecture", "workloads"]
    }
  }
}
```

All fields are optional — only provided fields are updated (partial update). If `fact` changes, re-embedding is triggered automatically. Requires a non-read-only token.

To delete specific fields from a memory, entity, or edge, include a `deleteFields` array of dot-notation paths in the same request:

```json
{
  "method": "tools/call",
  "params": {
    "name": "update_entity",
    "arguments": {
      "id": "550e8400-...",
      "properties": { "newKey": "value" },
      "deleteFields": ["properties.oldKey", "description"]
    }
  }
}
```

System fields (`id`, `name`, `type`, `spaceId`, `createdAt`, `updatedAt`) cannot be listed in `deleteFields`. Deletions are permanent — recovery requires audit logs or a backup.

### Example: delete_memory

```json
{
  "method": "tools/call",
  "params": {
    "name": "delete_memory",
    "arguments": {
      "space": "general",
      "id": "a1b2c3d4-..."
    }
  }
}
```

Returns confirmation with the deleted ID. Creates a tombstone for sync propagation. Requires a non-read-only token.

### Example: get_stats

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_stats",
    "arguments": {
      "space": "general"
    }
  }
}
```

Response:

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

Works with any valid token (including read-only). For proxy spaces, returns aggregated counts across all member spaces.

### Example: query

```json
{
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "space": "general",
      "collection": "memories",
      "filter": { "tags": "traefik" },
      "limit": 20
    }
  }
}
```

**Valid `collection` values:**

| Value | Contents |
|-------|----------|
| `memories` | Memory facts with tags, entity links, and embeddings |
| `entities` | Named entities in the knowledge graph |
| `edges` | Directed relationship edges between entities |
| `chrono` | Chronological entries (events, deadlines, plans, predictions, milestones) |
| `files` | File metadata records (path, tags, description, embedding status) |

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | `string` | ✅ | One of the five values above |
| `filter` | `object` | ✅ | MongoDB filter document |
| `projection` | `object` | — | Fields to include (`1`) or exclude (`0`) |
| `limit` | `number` | — | Max documents (default `20`, max `100`) |
| `maxTimeMS` | `number` | — | Query timeout in ms (max `30000`) |

**Security**: The `query` tool rejects `$where`, `$function`, and deeply nested filters (>8 levels). Only safe read-only operators are allowed.

### MCP Client Configuration

For AI agents (Claude, Cursor, etc.), add to your MCP config:

```json
{
  "mcpServers": {
    "ythril": {
      "url": "http://localhost:3200/mcp",
      "headers": {
        "Authorization": "Bearer ythril_yourTokenHere"
      }
    }
  }
}
```

---
