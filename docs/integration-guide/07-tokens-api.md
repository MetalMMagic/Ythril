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
| `admin` | `true` for full admin scope. Mutually exclusive with `schemaLibrary`. |
| `readOnly` | Block all writes. Ignored when `schemaLibrary` is `true` (always read-only). |
| `spaces` | Array of space IDs to scope this token. Omit for all-spaces access. Must be empty or omitted when `schemaLibrary` is `true`. |
| `expiresAt` | ISO 8601 expiry timestamp. Omit for non-expiring. |
| `peerInstanceId` | Bind this token to a network peer (UUID). Required for tokens a peer will present on the `/api/sync/*` **data-write** endpoints in manually-configured networks — the invite handshake sets it automatically. Peer identity is server-issued and cannot be self-declared by the caller. |
| `schemaLibrary` | `true` to issue a **library access token**. See below. |

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
