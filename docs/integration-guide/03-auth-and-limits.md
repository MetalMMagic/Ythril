# Authentication, Errors & Rate Limits

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Authentication

Every API request requires a Bearer token, except a handful of public routes: `/health`, `/ready`, `/api/theme`, `/api/setup/status`, `/setup`, `/api/invite/apply`, and `/api/auth/oidc-info`:

```http
Authorization: Bearer ythril_<base62-encoded-token>
```

Tokens are created during first-run setup or via `POST /api/tokens`. The plaintext token is shown **once** — store it securely.

> **The token must travel in the header.** A `?token=…` query parameter is ignored on every route → `401`, with one exception: the `GET /mcp` transport (an external-agent protocol whose clients may be unable to set headers). Query strings end up in access logs, proxy logs, browser history, and `Referer` headers, so a long-lived token must never ride in a URL. The **browser** SSE streams — `GET /api/brain/spaces/:id/events` and `GET /api/about/logs/stream` — instead use a **single-use ticket**: `POST` the paired `…/ticket` endpoint with the normal `Authorization` header to get a short-lived opaque ticket, then open the stream with `?ticket=<ticket>` (see the live-events section below).

### Token Scoping

| Token Type | Access |
|---|---|
| Full-access | All spaces, read + write |
| Space-scoped | Only endpoints for listed spaces; admin routes blocked |
| Read-only | Read/search only — all mutations (create, update, delete) blocked |
| Admin | Full-access + admin-only routes (networks, tokens, config) |

> A token **cannot** be both `admin` and `readOnly`.

### Auth Middleware Levels

| Middleware | Required |
|---|---|
| `requireAuth` | Any valid token |
| `requireAdmin` | Token with `admin: true` |
| `requireAdminMfa` | Admin token + MFA verified (if MFA enabled) |
| `requireSpaceAuth` | Token with access to the `:spaceId` in the URL |
| `denyReadOnly` | Applied on mutating routes — blocks `readOnly` tokens |

---

## Error Format

All errors return JSON:

```json
{ "error": "Human-readable message" }
```

Extended errors may include:

```json
{ "error": "Storage limit exceeded", "storageExceeded": true }
```

### Common Status Codes

| Code | Meaning |
|---|---|
| 400 | Bad request / validation failure |
| 401 | Missing or invalid token |
| 403 | Token lacks access to this resource |
| 404 | Resource not found |
| 409 | Conflict (duplicate ID) |
| 413 | Payload too large (Express body limit: 10 MB for JSON) |
| 429 | Rate limited — check `Retry-After` header |
| 507 | Storage quota hard limit exceeded |

---

## Rate Limits

| Scope | Limit | Keyed by | Applies To |
|---|---|---|---|
| Auth | 10 / min | source IP | Token creation, setup, invite/apply |
| Global | 300 / min | client | All authenticated endpoints |
| Sync | 2 000 / min | client (peer) | Sync API endpoints |
| Notify | 60 / min | client | `GET /api/notify`, `POST /api/notify`, `POST /api/notify/trigger` |
| Bulk wipe | 5 / min | client | `DELETE /api/brain/spaces/:spaceId/{memories,entities,edges,chrono}` |
| Flood backstop | 3 000 / min | source IP | Everything except `/health`, `/ready`, `/metrics` |

**"Keyed by client" means your budget is your own.** The limiter buckets on the credential you present —
the `Authorization: Bearer` token, or the MCP `?token=` parameter — so one busy integration cannot spend
another's allowance. This matters most in the default Docker deployment: with no reverse proxy in front,
every request reaches Ythril from the same Docker gateway address, so an IP-keyed limit would be a single
shared bucket for the whole instance. The credential is hashed before it is used as a key; it never
appears in a key, a log line, or a header.

Requests with **no** credential (login, setup, an anonymous probe) key on the source IP — that is the only
identity they have — and IPv6 addresses are normalised to their `/64` so a client cannot rotate through
addresses it already owns.

The **flood backstop** is a per-IP ceiling in front of every route, set far above any legitimate single
client. It exists because per-client keying alone would let a flood of random bearer strings mint an
unbounded number of buckets. You should never see it in normal operation.

> **Behind a reverse proxy, set `TRUST_PROXY`** (see the environment table above) to the exact number of
> proxy hops. Without it `req.ip` is the proxy's address, so the auth limiter and the flood backstop
> collapse to one bucket for all traffic through that proxy. Do not use `true`: it trusts the entire
> client-supplied `X-Forwarded-For` chain, which lets a caller spoof the address those limits key on.

Rate limit headers follow the IETF draft-7 format: a single combined `RateLimit` header plus a `RateLimit-Policy` header (the legacy draft-6 `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` headers are not emitted):

```text
RateLimit: limit=300, remaining=297, reset=42
RateLimit-Policy: 300;w=60
Retry-After: 42
```

Every response includes an `X-Request-Id` header (UUID) for log correlation.

---
