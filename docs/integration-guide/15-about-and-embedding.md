# About, Theme & Embedded Mode

> Part of the [Ythril Integration Guide](../integration-guide.md).

## About API

Base path: `/api/about` — requires a valid Bearer token.

### Instance Info

```http
GET /api/about
Authorization: Bearer <token>   # any valid token
```

**Response** `200`:

```json
{
  "instanceId": "a1b2c3d4-...",
  "instanceLabel": "My Brain",
  "version": "1.0.0",
  "uptime": "3d 14h 22m",
  "mongoVersion": "7.0.15",
  "diskInfo": { "total": 107374182400, "used": 53687091200, "available": 53687091200 }
}
```

### Server Logs

```http
GET /api/about/logs?lines=200
Authorization: Bearer <admin-token>   # admin required
```

Returns recent log lines from the in-memory ring buffer. **Requires an admin token** — logs may contain space IDs, peer URLs, and internal error details.

**Response** `200`:

```json
{
  "lines": [
    "[2026-03-26T08:00:00.000Z] [INFO ] Server started on port 3200",
    "..."
  ]
}
```

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `lines` | 200 | 1000 | Number of recent log lines (from in-memory ring buffer) |

---

### Server Log Stream (SSE)

```http
GET /api/about/logs/stream
Authorization: Bearer <admin-token>
Accept: text/event-stream
```

Real-time stream of log lines as Server-Sent Events.

- Admin token required
- Sends heartbeat comments periodically to keep the connection alive
- Each event payload is a single escaped log line (`data: ...`)
- **Browser clients** (which can't set headers on `EventSource`) authenticate with a single-use ticket:
  `POST /api/about/logs/ticket` with the `Authorization` header returns `{ ticket, expiresInMs }`; open the
  stream with `?ticket=<ticket>`. A raw `?token=` in the URL is rejected (it would leak into logs/history).

Close the HTTP connection to stop streaming.

---

## Theme API

Base path: `/api/theme` — unauthenticated (public).

The theme endpoint supports portal-style embedding where an outer shell injects branding into Ythril.

### Get Theme

```http
GET /api/theme
```

**Response** `200`:

```json
{ "cssUrl": null }
```

Or, when a theme is configured:

```json
{ "cssUrl": "https://cdn.example.com/brand.css" }
```

### Configuration

Add a `theme` block to `config.json`:

```json
{
  "theme": {
    "cssUrl": "https://cdn.example.com/brand.css"
  }
}
```

The `cssUrl` must be a valid HTTPS URL (HTTP is allowed only for `localhost` during development). The URL is validated at runtime — invalid or non-HTTPS URLs are silently rejected.

### How It Works

1. **Static CSS** — on startup, the Angular SPA fetches `/api/theme`. If `cssUrl` is non-null, a `<link rel="stylesheet">` is injected into `<head>` before the app renders.
2. **Runtime tokens via `postMessage`** — the embedding page can send CSS custom property overrides to the Ythril iframe:

```js
iframe.contentWindow.postMessage({
  type: 'ythril:theme',
  tokens: {
    '--primary': '#0066cc',
    '--background': '#f5f5f5'
  }
}, 'https://your-ythril-host');
```

Only `--`-prefixed CSS custom properties are accepted. Standard CSS properties (e.g. `color`, `background`) are silently filtered out to prevent injection.

The `postMessage` handler validates `event.origin`. **Same-origin messages are always accepted. A cross-origin embedder — which is what portal-style embedding actually is — is accepted only if the operator has explicitly allowlisted its origin** (see below). Without that opt-in, a cross-origin `postMessage` is ignored *and* the browser will refuse to frame Ythril at all.

### Enabling cross-origin embedding (opt-in)

By default Ythril may only be framed and themed by its own origin. To embed it in a portal on a **different** origin, list that origin in `config.json`:

```json
{
  "embed": {
    "allowedOrigins": ["https://portal.example.com"]
  }
}
```

A listed origin is granted **both** rights together, because they are the same trust decision:

1. it may **iframe** Ythril — the origin is added to the CSP `frame-ancestors` directive; and
2. it may **push theme tokens** via `ythril:theme` `postMessage`.

**You are accepting responsibility for every origin you list.** Framing a page is a clickjacking primitive, and restyling it can be used to spoof the UI — only list hosts you control. Entries are validated strictly and fail closed:

- exact, scheme-qualified origins only — `https://portal.example.com`, never a path/query/fragment
- `https:` required (except `http://localhost` / `http://127.0.0.1` for development)
- **wildcards (`*`) are never accepted** — there is no "allow everything" mode
- an invalid entry is dropped with a warning rather than coerced

The resolved allowlist is logged at startup, and is served to the SPA on `/api/theme` as `allowedOrigins` so the client knows which senders to trust.

### Security

- `cssUrl` is restricted to HTTPS (except `localhost` for development).
- `postMessage` origin must be `self` **or** an operator-allowlisted origin.
- Only CSS custom properties (`--*`) are applied from runtime tokens.
- `Content-Security-Policy: frame-ancestors 'self' <allowlisted origins…>; object-src 'none'; base-uri 'self'` — with no allowlist this is `'self'` only, blocking cross-origin embedding, plugin injection, and base-tag hijacking.

---

## Embedded (chrome-less) Mode

When Ythril is embedded in a host portal, its own topbar (logo + **Sign out**) duplicates the host's chrome, and the in-frame Sign out is misleading — it ends only the Ythril session, not the portal's.

Load the app with `?embedded=1` to hide the shell topbar:

```html
<iframe src="https://your-ythril-host/brain?embedded=1"></iframe>
```

Navigation is unaffected — it lives in the sidebar, not the topbar. The flag is read once at startup and persists across in-app navigation (Angular drops unknown query params on route changes, so it is cached rather than re-read).

Accepted values: `1`, `true`, `yes`. Anything else (or an absent param) renders the normal shell.

---
