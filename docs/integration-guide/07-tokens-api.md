# Tokens API

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Tokens API

Base path: `/api/tokens`.

- `GET /api/tokens/me` requires any valid token.
- The read-only list `GET /api/tokens` requires an **admin** token (but not MFA).
- All **mutating** token routes (create/rename/delete/regenerate) require admin scope **and** MFA where enabled.

### Current Token Context

```http
GET /api/tokens/me
```

Returns the effective identity and permissions of the caller token.

**Response** `200`:

```json
{
  "id": "tok_abc123",
  "name": "MCP Agent",
  "prefix": "abc123",
  "admin": false,
  "readOnly": false,
  "spaces": ["general", "research"],
  "createdAt": "2026-01-15T10:00:00.000Z",
  "lastUsed": "2026-07-20T09:30:00.000Z",
  "expiresAt": null
}
```

Returns the full stored token record minus its `hash`. Besides the fields above it also includes `peerInstanceId`, `schemaLibrary`, and `oauthClientId` when those apply to the token.

---

### What a right grants

```http
GET /api/tokens/rights-catalog
Authorization: Bearer <token>
```

**Authenticated, not admin** — the caller who most needs this is one reading the rights they themselves hold.

```json
{
  "areas": ["knowledge", "files", "schema", "dataQuality"],
  "rungs": ["none", "read", "write", "admin"],
  "implications": [
    { "when": "knowledge", "atLeast": "write", "grants": "schema", "rung": "read" }
  ],
  "routes": [
    { "area": "knowledge", "method": "POST", "route": "/api/brain/spaces/:spaceId/recall", "needs": "read" },
    { "area": "files", "method": "DELETE", "route": "/api/files/:spaceId", "needs": "write" }
  ]
}
```

This is the table the server **enforces** against, not a description of it, so it cannot disagree with the gate.
Use it instead of maintaining your own map of rights to endpoints.

**`needs` is the lowest sufficient rung, and rungs contain the ones below.** So the endpoints reachable at
`write` are every route in that area whose `needs` is `read` *or* `write` — filter with
`rungs.indexOf(needs) <= rungs.indexOf(yourRung)`. A list of only the routes whose `needs` equals your rung
would understate what you hold.

`none` reaches nothing, and no route is ever listed with `needs: "none"`.

#### `implications` — a rung one area gives another

One area's rung can entail a rung in another, **in the same space**. Today there is exactly one rule: a token
holding `knowledge: write` also holds `schema: read`, because writing a record against a schema requires
reading that schema, so the pair is not an operator's to get wrong.

Read the rule as: *when `when` is at `atLeast` or higher, `grants` is held at no less than `rung`.*

Three properties worth building against:

- **It is a floor, never an assignment.** A `schema` rung granted outright is never lowered by it.
- **It does not chain.** Each rule is evaluated against what was *granted*, never against another rule's
  inference, so the order of the array is not load-bearing.
- **It is scoped to one space**, and applies to the all-spaces floor within the floor's own scope.

The stored matrix is *not* rewritten — `GET /api/tokens` returns what was set. Resolve the effective rung by
applying this table on read; do not persist the result, or a rung that exists only while `knowledge` is
`write` will outlive it being lowered.

The same resolution governs both doors. A capability refused over REST is refused over MCP for the identical
reason, because `effectiveRung` is the single place either surface asks what a token holds.

---

### List Tokens

```http
GET /api/tokens
```

**Response** `200`:

```json
{
  "tokens": [
    {
      "id": "tok_abc123",
      "name": "Admin",
      "prefix": "ythril_b",
      "createdAt": "2026-03-25T14:00:00.000Z",
      "lastUsed": "2026-03-25T15:30:00.000Z",
      "expiresAt": null,
      "spaces": null,
      "admin": true
    }
  ]
}
```

Note: `hash` is never exposed.

---

### Create a Token

```http
POST /api/tokens
```

```json
{
  "name": "MCP Agent",
  "spaces": ["general", "research"],
  "admin": false,
  "readOnly": false,
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

**Fields:**

| Field | Notes |
|---|---|
| `name` | Required. Human-readable label. |
| `admin` | `true` for full admin scope. Mutually exclusive with `schemaLibrary`. Still accepted and still returned; **no longer stored** — see below. |
| `readOnly` | Block all writes. Ignored when `schemaLibrary` is `true` (always read-only). Still accepted and still returned; **no longer stored** — see below. |
| `spaces` | Array of space IDs to scope this token. Omit for all-spaces access. Must be empty or omitted when `schemaLibrary` is `true`. |
| `expiresAt` | ISO 8601 expiry timestamp. Omit for non-expiring. |
| `peerInstanceId` | Bind this token to a network peer (UUID). Required for tokens a peer will present on the `/api/sync/*` **data-write** endpoints in manually-configured networks — the invite handshake sets it automatically. Peer identity is server-issued and cannot be self-declared by the caller. |
| `schemaLibrary` | `true` to issue a **library access token**. See below. |

> **`readOnly` is no longer STORED on a token — 3.1. Nothing you send or read changes.** Sending it still
> does exactly what it always did: the token is created with `read` in every area of every space it reaches.
> The token responses still carry it. What changed is where the answer comes from — the rights matrix rather
> than a separate boolean on the record.
>
> Nothing had decided on that boolean since 3.0, because every write check reads the matrix. Keeping it
> stored alongside meant two spellings of one fact, with the older one free to drift.
>
> **The returned value is now derived**: a token is read-only exactly when its matrix grants no write rung
> anywhere. That is also correct for a token nobody ever set the flag on but which holds only `read` — a case
> the stored boolean could not express and answered `false` for. Tokens created before 3.1 keep their scope:
> the load-time migration still reads the stored flag to derive their matrix.
>
> `spaces` is unchanged for now and follows separately.

<!-- markdownlint-disable-next-line MD028 -->

> **`admin` is no longer STORED either — 3.1, and again nothing you send or read changes.** Sending it still
> does what it always did: the token gets `instanceAdmin`, `createSpaces`, and the admin rung in every space
> it reaches. Responses still carry it, derived from `rights.instanceAdmin`.
>
> **If you branch on it, read `rights.instanceAdmin`.** And note what it is *not*: holding the `admin` rung
> in every space is a different thing. That grants those spaces, and says nothing about spaces created
> tomorrow or about instance-shaped routes like creating a space or joining a network — only `instanceAdmin`
> or an all-spaces floor does.
>
> **OIDC sessions are unaffected.** They are built per request from a claim mapping and carry no matrix, so
> the flag is where their answer legitimately lives; every admin check falls back to it for exactly that case.

**Response** `201`:

```json
{
  "token": { "id": "...", "name": "MCP Agent", "prefix": "ythril_x", ... },
  "plaintext": "ythril_xK9mPq..."
}
```

> **Two keys, and only one of them is a credential.**
>
> | key | what it is |
> |---|---|
> | `token` | **The record**, not the secret — id, name, prefix, flags, scoping. Safe to log, store and display. It carries no credential. |
> | `plaintext` | **The secret.** Shown once, never retrievable again. Treat it as you would a password. |
>
> The names invite the opposite reading, and an integrator made it: they took the field called `token`,
> wrote it into a handover file, and rendered the actual secret to a terminal — then revoked and re-minted
> rather than reason about the exposure. The mistake is silent, so nothing tells you it happened.
>
> `prefix` on the record is the first characters of the secret, kept so a token can be identified in a list.
> It is not enough to authenticate with, and it is the only part of the secret the record contains.
>
> Every other route reinforces the misleading reading: `PATCH /api/tokens/:id` returns `{ "token": … }` and
> `GET /api/tokens` lists records under the same word — all metadata, never a credential.
> `POST /api/tokens/:id/regenerate` is the one that cannot be misread: it returns `{ "plaintext": … }` alone.

#### Library Access Tokens

A **library access token** (`schemaLibrary: true`) grants read-only access to the public schema library endpoints (`GET /api/schema-library/public*`) only. It cannot access brain data, files, MCP tools, or any space.

```json
{ "name": "Remote Catalog Reader", "schemaLibrary": true }
```

Use cases:

- The remote instance's `/public` endpoint is behind an auth proxy (Cloudflare Access, nginx auth, etc.) that requires a Bearer token.
- A consumer instance adds a foreign catalog and stores this token as the catalog's `accessToken`. It is forwarded as `Authorization: Bearer` on every catalog browse request.

Constraints: `admin` must be `false`/omitted; `spaces` must be empty/omitted. The token is always `readOnly: true` — this cannot be overridden. Multiple library access tokens may coexist.

---

### Regenerate a Token

```http
POST /api/tokens/:id/regenerate
```

Issues a new plaintext credential for an existing token record. The old value is invalidated.

**Response** `200`:

```json
{ "plaintext": "ythril_newValue..." }
```

---

### Edit a Token

```http
PATCH /api/tokens/:id
{ "name": "new label" }
```

Three fields are editable: **`name`** (1–200 chars, same bound as create), **`rights`** (the per-space matrix
— see [Create a Token](#create-a-token) for the shape and the capping rules), and **`mfa`**
(`inherit` | `exempt` | `required`). Send any combination. The secret and the expiry are untouched; use
regenerate to rotate the secret. Audited as `token.update`, with the second factor recorded on both sides of
the diff.

> **A SPACE-RESTRICTED administrator may edit only its own spaces' rows.** An admin token that carries a `spaces`
> allowlist is admitted here, and then held to a narrower rule than an unrestricted admin:
>
> - it may set `rights.perSpace[X]` only for spaces X in its own allowlist;
> - it may **never** set `instanceAdmin` or `createSpaces`;
> - it may **never** set `floor` — a floor applies to every space *including ones that do not exist yet*, so however
>   modest its rungs look, it is instance-wide in effect. It is refused rather than capped, because there is no
>   per-space version of it to cap to;
> - it may only edit a token whose own `spaces` are all inside its allowlist. Editing an **unrestricted** token is
>   refused, because such a token reaches every space by definition.
>
> Each refusal answers `403` with a `refusals` array naming what was rejected, so a client can report the specific
> reason rather than "forbidden". This mirrors the rule `POST /api/tokens` already applies to a space-restricted
> creator. An unrestricted admin is unaffected.
>
> **`GET /api/tokens` is scoped the same way**: a space-restricted caller sees only the tokens it could edit.

<!-- markdownlint-disable-next-line MD028 -->

> **The SPACE ADMINISTRATOR, and how it differs from the legacy pair above.** The paragraph above describes an
> `admin: true` token carrying a `spaces` allowlist. The matrix expresses the same role without the legacy
> flag: a token holding the `admin` rung on **all four areas** (`knowledge`, `files`, `schema`, `dataQuality`)
> of space X is X's administrator.
>
> All four, not any one — `admin` on Files alone would otherwise mint tokens, which is an escalation rather
> than a role.
>
> Such a token reaches the token routes and is then held to exactly the rules above, scoped to the spaces it
> administers. It also reaches **its own space's settings** — see
> [Update a Space](06-spaces-api.md#update-a-space) for which routes and which single field is refused.
>
> What it never reaches is anything instance-shaped: creating a space, joining a network, instance settings,
> the database page. There is no space to scope those to, which is what makes them the instance's.

<!-- markdownlint-disable-next-line MD028 -->

> **Granting `mfa: "exempt"` costs a live TOTP code on the request** whenever MFA is enabled instance-wide —
> the same rule create has, and for the same reason. Admin authentication here is satisfied by an admin token
> that is itself exempt, so without it one exemption could grant the next until the instance-wide switch
> protected nothing. Send the code as `x-totp-code`; without it the answer is `403 MFA_REQUIRED`. The check
> runs before anything is written, so a refused exemption never leaves a half-applied edit.

**Response** `200`: the updated token record (hash excluded).

```json
{ "token": { "id": "…", "name": "new label", "admin": false, "...": "…" } }
```

#### Sending a token you read back

The response carries the whole record. You can PATCH that record straight back — the fields this route does
not edit are accepted **as long as they are unchanged**, so read-modify-write works without stripping
anything first:

```http
GET  /api/tokens          →  { "tokens": [ { "id": "t_1", "name": "old", "spaces": ["qa"], … } ] }
PATCH /api/tokens/t_1        { "id": "t_1", "name": "new", "spaces": ["qa"], … }   →  200
```

Changing one of those fields is a `400` that names what to write instead, rather than being silently
dropped:

```json
{ "error": "Cannot change `spaces` on this route. For `spaces`, set `rights.perSpace` (or `rights.floor` for every space). Sending these fields UNCHANGED is fine — a token you read back round-trips." }
```

`spaces`, `admin` and `readOnly` are the pre-2.6.0 scope model; their replacement is `rights`. The rest
(`createdAt`, `lastUsed`, `expiresAt`, `peerInstanceId`, `schemaLibrary`, `oauthClientId`) are set
when the token is minted and are not editable on any route.

A field name this route has never heard of is still a `400` — a mis-spelled `spaceIds` must not be accepted
and dropped.

Returns `404` if no token has that id, `400` for an empty/oversized name or a body that changes nothing.

---

### Revoke a Token

```http
DELETE /api/tokens/:id
```

**Response** `204`.

---
