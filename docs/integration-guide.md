# Ythril Integration Guide

> API and MCP reference for developers building on Ythril.

Audience: integrators building clients, automation, or multi-instance deployments on top of Ythril.

If you are here for web UI usage, read [User Guide](userguide.md). If you are contributing to source code, read [Contribution Guide](contribution-guide.md).

---

## Table of Contents

1. [Getting Ythril](#getting-ythril)
2. [Hosting](#hosting)
   - [TLS Termination](#tls-termination)
   - [Resource Requirements](#resource-requirements)
   - [Upgrading](#upgrading)
3. [Authentication](#authentication)
4. [Error Format](#error-format)
5. [Rate Limits](#rate-limits)
6. [Brain API](#brain-api) — memories, entities, edges, chrono, traverse, search, stats, bulk write
7. [Files API](#files-api) — upload, download, chunked upload, move, delete, media embedding
8. [Spaces API](#spaces-api) — create, list, delete, proxy spaces, schema validation, meta
9. [Tokens API](#tokens-api) — create, list, regenerate, revoke
10. [Networks API](#networks-api) — create, join, members, voting, sync history, fork
11. [Invite API](#invite-api) — RSA peer handshake
12. [Notify API](#notify-api) — peer events and sync triggers
13. [Sync API](#sync-api) — change-feed, batch upsert, Merkle
14. [MFA API](#mfa-api) — TOTP setup and verification
15. [Conflicts API](#conflicts-api) — view and resolve sync conflicts
16. [Setup API](#setup-api) — first-run setup
17. [Admin API](#admin-api) — config reload, export/import, space wipe
18. [Data Management API](#data-management-api) — maintenance mode, backup, restore, migration, backup config
19. [Audit Log API](#audit-log-api) — token and access audit trail
20. [Duplicate Scanner & Action Rules](#duplicate-scanner--action-rules) — dedupe scan and automated action rules
21. [Webhooks API](#webhooks-api) — event subscriptions for space write events
22. [About API](#about-api) — instance info and logs
23. [Theme API](#theme-api) — external CSS theming
24. [Embedded (chrome-less) Mode](#embedded-chrome-less-mode) — iframe-embeddable UI
25. [MCP (Model Context Protocol)](#mcp-model-context-protocol) — AI tool integration
26. [Storage Quotas](#storage-quotas)
27. [Pagination](#pagination)
28. [OIDC (OpenID Connect) Authentication](#oidc-openid-connect-authentication) — browser SSO via an external IdP

---

## Getting Ythril

### Container Images

Published images are available on two registries:

| Registry | Image | Pull command |
|----------|-------|-------------|
| GitHub Container Registry | `ghcr.io/ythril-network/ythril` | `docker pull ghcr.io/ythril-network/ythril:latest` |
| Docker Hub | `docker.io/ythril/ythril` | `docker pull ythril/ythril:latest` |

Tags follow semver: `:latest`, `:1.0.0`, `:1.0`, `:1`. All images are multi-arch (`linux/amd64`, `linux/arm64`).

### Quick Start

```bash
docker compose up -d
```

The included `docker-compose.yml` pulls the GHCR image and starts Ythril + MongoDB. On first run, open `http://localhost:3200` — you'll be redirected to the setup page.

### Local Host Port Override

By default, Docker Compose publishes Ythril on host port `3200`.

If you want your personal/local instance on a different host port (for example `3210`) without changing tracked project files, set `YTHRIL_PORT` in a local `.env` file:

```env
YTHRIL_PORT=3210
```

Then start as usual:

```bash
docker compose up -d
```

Now Ythril is reachable at `http://localhost:3210` while the container still listens on internal port `3200`.

Enter an instance label and complete setup:

```http
POST http://localhost:3200/api/setup/json
{ "label": "My Ythril" }
```

This returns your admin token. Store it — it is shown once.

### Health Check

```http
GET http://localhost:3200/health
→ { "status": "ok", "ts": "2026-03-26T10:00:00.000Z" }
```

### Base URL

All API paths in this guide are relative to `http://<host>:3200`. In production behind a reverse proxy, substitute your public URL.

---

## Hosting

### Containers

The Docker Compose stack runs two containers:

| Container | Role |
|-----------|------|
| `ythril` | Brain server — REST API, MCP endpoints, Angular web UI (port 3200) |
| `ythril-mongo` | MongoDB Atlas Local with `mongot` sidecar for `$vectorSearch` (default) |

On first start, MongoDB needs to elect a replica set primary (up to ~3 minutes). The server prints the startup banner when ready.

### MongoDB Flexibility

Ythril requires a MongoDB instance that supports the `$vectorSearch` aggregation stage for semantic recall.  Any of the following work:

| MongoDB flavour | `$vectorSearch` | Notes |
|---|---|---|
| `mongodb/mongodb-atlas-local` (default) | ✓ | Bundled in `docker-compose.yml`; zero-config for new deployments |
| Managed MongoDB Atlas (M10+) | ✓ | Set `MONGO_URI` to your Atlas connection string |
| MongoDB 8.2+ (community / enterprise) | ✓ | Native support — no `mongot` sidecar required |
| MongoDB < 8.2 (vanilla) | ✗ | `recall` tool disabled; all other features work |

**Using an existing MongoDB 8.2+ cluster** — remove the `ythril-mongo` service from `docker-compose.yml` and point `MONGO_URI` at your cluster. Include the database name in the URI path (recommended):

```yaml
environment:
  MONGO_URI: mongodb://mongodb-0.example.com:27017/ythril?directConnection=true
```

**Using managed Atlas** — provide the `mongodb+srv://` connection string with the database name:

```yaml
environment:
  MONGO_URI: mongodb+srv://user:pass@cluster0.example.mongodb.net/ythril?retryWrites=true
```

> **Database name:** Ythril reads the database name from the path component of `MONGO_URI`. If no database name is specified in the URI, it falls back to `"ythril"`. All operations — including dump/restore — use the resolved name.

On startup, Ythril probes for `$vectorSearch` support and logs the result:

```text
  ✓ $vectorSearch available (MongoDB 8.2.1)
```

or, if unavailable:

```text
  ✗ $vectorSearch not available (MongoDB 7.0.0) — semantic search (recall) will be disabled
    Upgrade to MongoDB 8.2+, use Atlas Local, or connect to managed Atlas
```

If `$vectorSearch` is unavailable, all non-search operations (storing memories, entities, edges, files, sync) continue to work normally.  Only the `recall` MCP tool returns an error until a supported MongoDB is connected.

### Startup Output

**First run:**

```text
  ythril  ·  first-run setup required

  Open http://localhost:3200 to get started
```

**Configured:**

```text
  ythril  ✓ ready  ·  http://localhost:3200
```

### Debug Logging

```bash
DEBUG=1 docker compose up
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIG_PATH` | `/config/config.json` | Path to config file inside container |
| `DATA_ROOT` | `/data` | Root directory for file storage |
| `MONGO_URI` | `mongodb://ythril-mongo:27017/ythril?directConnection=true` | MongoDB connection string — any `$vectorSearch`-capable MongoDB works. The database name in the URI is used for all operations. |
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3200` | HTTP listen port |
| `DEBUG` | (unset) | Set to `1` for verbose logging |
| `METRICS_TOKEN` | (unset) | When set, `GET /metrics` requires this exact value as a Bearer token — the recommended path for Prometheus scrape configs. If unset, the endpoint falls back to requiring a valid admin PAT. |
| `TRUST_PROXY` | `false` | Express `trust proxy` setting (overrides the `trustProxy` config key). Default `false` — `req.ip` comes from the socket. **Set this when running behind a reverse proxy**, to the exact number of proxy hops (e.g. `1`), *not* `true` (which trusts the whole `X-Forwarded-For` chain and is client-spoofable). Also accepts `loopback` or a comma-separated CIDR/IP list. Rate limiting and the audit log key on `req.ip`, so a wrong value here is a security setting. |
| `SYNC_ALLOW_PRIVATE_PEERS` | `false` | Allow sync **peer URLs** to resolve to private/reserved addresses (RFC-1918, CGNAT, IPv6 ULA) — for same-host or LAN networks (overrides the `allowPrivatePeers` config key). Default `false`: sync connects only to public peers, and any peer that tries to move its URL onto a private address is refused. Even when `true`, crown-jewel addresses (loopback, link-local / cloud IMDS `169.254.169.254`, unspecified) stay blocked. |
| `MCP_OAUTH_TOKEN_TTL_DAYS` | `90` | Lifetime (in days) of PATs minted by the MCP OAuth browser-connector flow. Tokens expire after this many days, so an abandoned connector leaves no permanent credential behind; the connector re-consents when its token lapses. Each connector holds **one** token that a fresh consent rotates (never accumulates), and the total connector-token count is capped. Set to `0` to disable expiry (tokens never expire) if you need long-lived connector credentials. |

### Data Persistence

All persistent data lives in named Docker volumes:

| Volume | Contents |
|--------|----------|
| `ythril-data` | File storage (`/data/files/{spaceId}/`), upload chunks, media/face-model files |
| `ythril-mongo-data` | Brain data: memories, entities, edges, tombstones |
| `ythril-mongo-configdb` | MongoDB replica set keyfile |

The `config/` directory is a host bind mount — `config.json`, `secrets.json`, and `schema-library.json` are plain files that survive any container lifecycle event.

> **Backup note:** All three files are required for a complete restore. `schema-library.json` holds the instance-level schema library; spaces using `$ref: "library:<name>"` will have broken validation if this file is missing after a restore.

### Config File Permissions

On startup, Ythril checks that `config.json` and `secrets.json` are owner-read/write only (`0600`). If the files have looser permissions (e.g. `0644`, `0666`), the server automatically tightens them to `0600` and logs a `SECURITY:` warning:

```text
SECURITY: config.json had mode 0644 — auto-fixed to 0600
```

If auto-fix fails (e.g. the process doesn't own the file), the server logs an error and exits. This is common with Docker bind mounts on WSL2, where host files appear world-writable inside the container — the auto-fix handles this case transparently.

```bash
docker compose down        # stops containers — data intact
docker compose up -d       # reattaches volumes — picks up where it left off
docker compose down -v     # ⚠ permanently deletes all named volumes
```

### Encryption at Rest

Ythril's state files — `config.json`, `secrets.json`, `schema-library.json`, `schema-catalogs.json` —
can be **encrypted at rest** so that a stolen file, or a co-tenant reading the volume on shared hardware,
is useless without the key. (This covers the app's own files; brain data in MongoDB is isolated per tenant
by running each instance against its own encrypted `mongod` — see [Running Multiple Brains on One Host](#running-multiple-brains-on-one-host).)

Provide a **master secret via the environment** (never written to disk) and encryption turns on
transparently:

| Variable | Meaning |
|---|---|
| `YTHRIL_MASTER_KEY` | 32 raw bytes as base64 or 64 hex chars — used directly. Generate: `openssl rand -base64 32`. |
| `YTHRIL_MASTER_PASSPHRASE` | Any passphrase; a per-file scrypt salt is stored in the encrypted file. Used only if `YTHRIL_MASTER_KEY` is unset. |
| `YTHRIL_REQUIRE_ENCRYPTED_AT_REST` (or config `requireEncryptedAtRest`) | Refuse to boot unless a master secret is configured. |

- Files use **AES-256-GCM** (authenticated); a wrong key or a tampered file fails to decrypt and the
  instance refuses to start rather than silently continue.
- **Automatic migration:** if a key is configured and a file is still plaintext (e.g. after upgrading),
  it is encrypted **in place** at the next boot — round-trip verified first, with no plaintext copy left
  behind. New installs write encrypted from the first save.
- **Back up the master secret.** Losing it makes the encrypted files unrecoverable — that is the point.
  Deliver it as a Docker/Kubernetes/systemd secret, not baked into an image.

```yaml
# docker compose — master key from a secret/env, kept out of the image
services:
  ythril:
    environment:
      YTHRIL_MASTER_KEY: "${YTHRIL_MASTER_KEY:?set a 32-byte base64 key}"
      YTHRIL_REQUIRE_ENCRYPTED_AT_REST: "true"
```

### Security Posture Check

At boot Ythril prints an aggregated **security posture** — one `✓`/`⚠`/`✗` line per check across transport
(TLS enforcement, peer scheme, `trustProxy`), encryption at rest, and MongoDB auth — so a weak setting is
visible in the logs instead of silently accepted. Admins can also fetch it live:

```http
GET /api/about/security      # admin token
→ { "checks": [ { "id": "transport.tls", "level": "warn", "message": "…" }, … ], "worst": "warn", "strict": false }
```

Levels are `pass` / `warn` / `fail` (`fail` = actively broken, e.g. `requireEncryptedTransport` on without
`trustProxy`, so requests would 403). Set **`security.strict`** (config) or **`YTHRIL_SECURITY_STRICT=true`**
to make any `fail` finding abort boot — the aggregate "don't start if misconfigured" switch, on top of the
individual `require*` flags.

### Running Multiple Brains on One Host

You can run any number of Ythril instances on a single server. Each is a fully
independent brain — they know nothing about each other until you explicitly connect
them into a sync network. This is a supported and common topology (e.g. one instance
per team, project, or tenant, all behind subdomains like `a.ythril.example.com` and
`b.ythril.example.com`).

The **only** requirement is that each instance gets its own copy of three pieces of
state. There is no instance ID baked into collection names or file paths, so isolation
comes entirely from pointing each instance at distinct storage:

| Axis | Env var | What collides if two instances share it |
|---|---|---|
| **Database** | `MONGO_URI` (database name in the path) | All knowledge collections. Spaces are stored as collections named `<spaceId>_memories`, `<spaceId>_entities`, etc. — there is **no** per-instance prefix, so two instances on the same database that both have a space called `default` read and write the *same* `default_memories`. |
| **Config directory** | `CONFIG_PATH` | `config.json`, `secrets.json`, `schema-library.json`, `schema-catalogs.json` all live in this directory. Sharing it means each instance's config writes overwrite the other's tokens, spaces, and networks. |
| **Data root** | `DATA_ROOT` | File **bytes** live on the filesystem under `<DATA_ROOT>/files/<spaceId>/` (plus upload chunks and media/face-model files) — **not** in MongoDB. Sharing this directory collides the file stores the same way a shared database collides collections. |

Plus a distinct published **port** per instance.

**Multi-tenant on shared hardware — isolate cryptographically, not just logically.** If the tenants on
one host don't trust each other (e.g. you resell Ythril), give **each instance its own `mongod` on its
own encrypted volume with its own key** (LUKS/dm-crypt, a cloud encrypted disk, or MongoDB Enterprise
at-rest encryption) — do **not** share one `mongod` across tenants. Then one tenant cannot decrypt
another's data even with full disk access, because it's a different key and a different process, and
semantic search stays fully intact (each instance queries its own plaintext-in-memory data). Combine
with [Encryption at Rest](#encryption-at-rest) for the app's own state files and
[`requireEncryptedTransport`](#transport-security-encryption-in-transit) for the wire. "Same host" is
not a trust boundary; a co-tenant on loopback is still untrusted. Application-level field encryption in
a *shared* `mongod` is deliberately **not** offered — it would break vector/text recall (you can't
cosine-compare or regex encrypted values), so isolation lives at the storage boundary instead.

> **Common pitfall — the silent `ythril` fallback.** Ythril takes the database name
> from the *path* of `MONGO_URI`. If the path is empty (e.g.
> `mongodb://mongo:27017/?directConnection=true`), it falls back to `"ythril"`. So if
> you point two instances at the same MongoDB server and neither URI names a database,
> **both silently land in the `ythril` database and corrupt each other's data** — with
> no error and no warning, because neither instance can see the other's collections
> until they clash. Always put an explicit, distinct database name in each
> `MONGO_URI`.

#### Option A — separate stacks (each with its own bundled MongoDB)

Simplest, fully isolated by construction. Each brain is its own Compose project with its
own `ythril-mongo` service and volumes:

```bash
# Brain A — default, port 3200
docker compose up -d

# Brain B — separate project + compose file, port 3201
docker compose -p ythril-b -f docker-compose.brain-b.yml up -d
```

Keep the `config/` bind mount and data volume separate per brain (the `-p` project name
namespaces the named volumes automatically; give each its own `config/` host directory).

#### Option B — one shared MongoDB, a database per instance

Run a single MongoDB server (or cluster) and give each Ythril instance its **own
database** on it. This is exactly as isolated as separate machines — the database
boundary is a hard wall — while sharing one `mongod` and its RAM/cache overhead.

```yaml
services:
  ythril-a:
    image: ghcr.io/ythril-network/ythril:latest
    environment:
      MONGO_URI: mongodb://shared-mongo:27017/brain-a?directConnection=true   # ← distinct DB
      CONFIG_PATH: /config/config.json
      DATA_ROOT: /data
    volumes:
      - ./config-a:/config      # ← distinct host directory
      - ythril-data-a:/data     # ← distinct named volume
    ports:
      - "3200:3200"

  ythril-b:
    image: ghcr.io/ythril-network/ythril:latest
    environment:
      MONGO_URI: mongodb://shared-mongo:27017/brain-b?directConnection=true   # ← distinct DB
      CONFIG_PATH: /config/config.json
      DATA_ROOT: /data
    volumes:
      - ./config-b:/config
      - ythril-data-b:/data
    ports:
      - "3201:3200"

volumes:
  ythril-data-a:
  ythril-data-b:
```

Note that the `CONFIG_PATH` and `DATA_ROOT` *values* can be identical (`/config`,
`/data`) — what makes them distinct is the volume or bind mount behind each, since every
container has its own filesystem. If you instead run instances as **bare processes** on
the host (no containers), give each a genuinely different `CONFIG_PATH` and `DATA_ROOT`
path.

The shared MongoDB must be `$vectorSearch`-capable (see [MongoDB Flexibility](#mongodb-flexibility));
one capable server backs every database.

#### Networking co-located instances together

Instances on the same host can still form a sync network with each other. Because peer
URLs are SSRF-validated, address peers by a **resolvable public hostname** (e.g.
`https://a.ythril.example.com`), not `localhost` or a private/loopback IP — those are
rejected at member-add time. See
[Join Troubleshooting: private or local URLs rejected](#join-troubleshooting-private-or-local-urls-rejected).

### Recovery After Downtime

Networked brains reconnect automatically. On the next sync cycle after coming back up, each brain requests everything after its last recorded watermark. Tombstones propagate deletions that happened during downtime. No manual reconnection step required.

### Security Headers

Ythril sets the following headers on every response:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Content-Security-Policy` | `frame-ancestors 'self'; object-src 'none'; base-uri 'self'` | Blocks cross-origin embedding, plugin injection, and base-tag hijacking. Cross-origin embedding is possible only by explicitly allowlisting origins under `embed.allowedOrigins` — see [Theme API](#enabling-cross-origin-embedding-opt-in) |
| `Referrer-Policy` | `no-referrer` | Strips referrer on outbound requests |
| `X-Request-Id` | UUID | Unique per-request ID for tracing (logged server-side) |

**HSTS**: Since Ythril does not terminate TLS itself, `Strict-Transport-Security` should be set on your reverse proxy (Traefik, Nginx, Caddy).

**CORS**: No `Access-Control-*` headers are set. The Angular SPA is served from the same origin, so cross-origin browser requests are blocked by default. If you need CORS for a custom frontend, configure it on your reverse proxy.

### TLS Termination

Ythril listens on plain HTTP. Place a reverse proxy in front to terminate TLS.

#### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name brain.example.com;

    ssl_certificate     /etc/letsencrypt/live/brain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brain.example.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE (MCP transport) — disable buffering
        proxy_buffering off;
        proxy_cache     off;
        proxy_read_timeout 86400s;
    }

    client_max_body_size 512M;
}
```

#### Caddy

```caddyfile
brain.example.com {
    reverse_proxy localhost:3200
    header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
}
```

Caddy provisions TLS certificates automatically via Let's Encrypt/ZeroSSL.

#### Traefik (Docker labels)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.ythril.rule=Host(`brain.example.com`)"
  - "traefik.http.routers.ythril.entrypoints=websecure"
  - "traefik.http.routers.ythril.tls.certresolver=letsencrypt"
  - "traefik.http.services.ythril.loadbalancer.server.port=3200"
  - "traefik.http.middlewares.ythril-hsts.headers.stsSeconds=63072000"
  - "traefik.http.middlewares.ythril-hsts.headers.stsIncludeSubdomains=true"
  - "traefik.http.routers.ythril.middlewares=ythril-hsts"
```

### Transport Security (encryption in transit)

Ythril is secure-by-default on the wire, and adds an instance-wide switch to make TLS mandatory.

**Sync peers must use HTTPS.** A network member / invite URL is rejected unless it is `https://`. This
is deliberately independent of address: a peer on loopback or a private range is still required to be
HTTPS, because on shared hardware "same host" is **not** a trust boundary — a co-tenant reachable over
loopback is still untrusted. (Address reachability is governed separately by `allowPrivatePeers`.)

- To permit plaintext `http://` peers on a network where every peer *and* co-tenant is trusted, set
  `allowInsecurePeers: true` (or env `SYNC_ALLOW_INSECURE_PEERS=true`). This is a clear, explicit opt-out;
  new peers are HTTPS-only without it. A peer added before this default that is still `http://` continues
  to sync but logs a one-time warning each boot until you fix its URL or opt in.

**`requireEncryptedTransport` — instance-wide "encrypted only".** Set `requireEncryptedTransport: true`
(or env `REQUIRE_ENCRYPTED_TRANSPORT=true`) to enforce TLS everywhere:

- every inbound request must have arrived over HTTPS — plaintext requests get `403` (the `/health`,
  `/ready`, and `/metrics` probes stay reachable so orchestration isn't broken);
- `http://` sync peers are hard-blocked at admission **and** connection time, overriding
  `allowInsecurePeers`.

> **Requires `trustProxy`.** When a reverse proxy terminates TLS, Ythril only knows a request was
> encrypted from the `X-Forwarded-Proto` header, which it trusts **only** once `trustProxy` is set to your
> proxy hop count. Enable `requireEncryptedTransport` together with a correct `trustProxy`, or every
> proxied request will look plaintext and be rejected.

**Multi-tenant on shared hardware.** Run each tenant as its own Ythril instance with its **own MongoDB on
its own encrypted volume/key** — do not share one `mongod` across tenants. That keeps cross-tenant data
cryptographically isolated (different key + process) while leaving semantic search fully intact, and it
pairs with `requireEncryptedTransport` for encryption in transit.

### Resource Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 4 GB (MongoDB uses available RAM for its WiredTiger cache) |
| Disk | 5 GB (OS + images) | Depends on data volume — plan for file storage + brain data + MongoDB journal |
| Network | Any | Low-latency link between syncing brains improves convergence time |

MongoDB Atlas Local runs a `mongot` sidecar for vector search. This adds ~300 MB RAM overhead on top of baseline `mongod` usage.

For multi-brain networks, each brain runs its own full stack. Scale vertically (more RAM/disk) rather than horizontally — each brain is an independent unit.

### Upgrading

1. Pull the latest image:

   ```bash
   docker compose pull        # if using a registry
   docker compose build       # if building from source
   ```

2. Restart the stack:

   ```bash
   docker compose up -d
   ```

Named volumes persist across upgrades. The server applies any pending MongoDB index changes on startup automatically. No manual migration scripts are needed.

**Breaking changes**, when they occur, will be listed in `CHANGELOG.md` with migration steps.

**Backup before upgrading:**

```bash
# Stop the stack to get a clean snapshot
docker compose stop

# Copy volumes
docker run --rm -v ythril-data:/src -v $(pwd)/backup:/dst alpine \
  sh -c "cp -a /src/. /dst/data/"
docker run --rm -v ythril-mongo-data:/src -v $(pwd)/backup:/dst alpine \
  sh -c "cp -a /src/. /dst/mongo/"

# Also back up config/ (bind mount — just copy)
# config.json, secrets.json, and schema-library.json (if present) are all required for a full restore.
cp -r config/ backup/config/

docker compose start
```

---

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

| Scope | Limit | Applies To |
|---|---|---|
| Auth | 10 / min | Token creation, setup, invite/apply |
| Global | 300 / min | All authenticated endpoints |
| Sync | 2 000 / min | Sync API endpoints |
| Notify | 60 / min | `GET /api/notify`, `POST /api/notify`, `POST /api/notify/trigger` |
| Bulk wipe | 5 / min | `DELETE /api/brain/spaces/:spaceId/{memories,entities,edges,chrono}` |

Rate limit headers follow the IETF draft-7 format: a single combined `RateLimit` header plus a `RateLimit-Policy` header (the legacy draft-6 `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` headers are not emitted):

```text
RateLimit: limit=300, remaining=297, reset=42
RateLimit-Policy: 300;w=60
Retry-After: 42
```

Every response includes an `X-Request-Id` header (UUID) for log correlation.

---

## Brain API

Base path: `/api/brain`

> **Proxy spaces:** Read operations aggregate across all member spaces. Write operations require `?targetSpace=<member>` in the query string.

### Route prefix

Every memory endpoint lives under the `/spaces/:spaceId/` prefix — the same prefix used by all other brain resource types (entities, edges, chrono, stats). For example:

```http
GET /api/brain/spaces/general/memories
```

> **Breaking change (2.0):** the old two-segment shape `/api/brain/:spaceId/memories` (e.g. `/api/brain/general/memories`) has been **removed**. It previously duplicated these handlers under a second URL; it now returns `404`. Update any client still using it to the `/spaces/:spaceId/` prefix.

### Write a Memory

```http
POST /api/brain/spaces/:spaceId/memories
```

```json
{
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

**Constraints**: `fact` max 50 000 chars. `type` optional string — stored on the document and validated against the space's `typeSchemas.memory` allowlist when set. `tags` must be an array of strings. `description` optional string. `properties` optional object; property values should be a string, number, or boolean (unlike the entity endpoint, the memory/edge/chrono write paths don't reject non-primitive values at the API layer — schema validation is the gate when the space defines the property). When the space has `strictLinkage` enabled, `entityIds` must contain valid UUID v4 values (entity IDs); passing names instead of IDs returns `400`. `ttlDays` optional — see [Record Expiry (TTL)](#record-expiry-ttl).

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
- **Space-wide default** — set `recordTtlDays` on the space (`PATCH /api/spaces/:id`, or the Spaces
  settings tab). Every new or updated record in that space that doesn't specify its own `ttlDays` expires
  after that many days.

```json
{ "fact": "Temporary scratch note", "ttlDays": 7 }
```

The expiry surfaces as `_expireAt` (an ISO timestamp) on the record. The sweep runs periodically on every
instance; expiry is eventual (granularity is days), not to-the-second. A `ttlDays`-only update (no other
fields) is a valid write — use it to set, extend, or clear an existing record's expiry.

`ttlDays` is accepted on the **MCP** write tools as well (`remember`, `update_memory`, `upsert_entity`,
`update_entity`, `upsert_edge`, `update_edge`, `create_chrono`, `update_chrono`) and per item in
`bulk_write` / `POST /bulk`, with the same semantics — so agents can set an expiry directly.

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
| `tag` | Filter by tag (case-insensitive) |
| `entity` | Filter by linked entity ID |
| `limit` | Results per page (default 100, max 500) |
| `skip` | Offset for pagination |

Both `tag` and `entity` can be combined (AND logic). Results are sorted newest-first.

**Response** `200`:

```json
{
  "memories": [ ... ],
  "limit": 100,
  "skip": 0
}
```

Default limit: 100, max: 500. Use `skip` for offset pagination.

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

### Semantic Search (Recall)

Available as both:

- REST: `POST /api/brain/spaces/:spaceId/recall`
- MCP tool: `recall`

```json
{
  "query": "how does OAuth PKCE work?",
  "topK": 10,
  "types": ["memory", "entity"],
  "minScore": 0.65
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `query` | ✅ | — | Natural-language search text (non-empty string) |
| `topK` | — | `10` | Max returned results (1-100) |
| `types` | — | all types | Restrict result knowledge types |
| `minScore` | — | none | Filter out low-similarity matches |
| `filter` | — | none | Property equality/comparison filter (see below) |
| `tags` | — | none | Array of strings — restrict to records carrying these tags |
| `minPerType` | — | none | Object mapping knowledge type → minimum hits, e.g. `{ "entity": 2 }`. Guarantees at least that many results of the type; each value is clamped to `topK` |
| `traverse` | — | `0` | Graph-expansion depth (integer 0–5). `0` = classic recall; > 0 follows edges from each match (see [Graph-Augmented Recall](#graph-augmented-recall-traverse-parameter)) |

**Response** `200`:

```json
{
  "results": [
    { "_id": "...", "type": "memory", "fact": "...", "score": 0.91 }
  ],
  "count": 1
}
```

Searches **all knowledge types** (memories, entities, edges, chrono entries, and files) using the built-in embedding model and MongoDB Atlas `$vectorSearch`. Results are ranked by vector similarity across all types and include a `type` discriminator field. No extra configuration needed.

#### Graph-Augmented Recall (`traverse` parameter)

By default `recall` returns matches in isolation — the knowledge-graph edges between records are not consulted. Set `traverse` to an integer between `1` and `5` to follow the graph outward from every match: for each seed, the server walks edges (in **both** directions) up to `traverse` hops and returns the connected entities alongside the matches. This turns semantic search into context-aware retrieval — "recall the Vault service **and everything connected to it**" in one call, instead of a recall followed by manual `traverse`/`query` calls.

`traverse: 0` (the default) is behaviourally identical to classic recall and returns the classic response shape above. When `traverse > 0` the response shape changes: each result is annotated, and a `traverseDepth` field is added.

```json
{
  "query": "authentication token scoping",
  "types": ["entity"],
  "traverse": 2
}
```

**Response** `200` (when `traverse > 0`):

```json
{
  "results": [
    {
      "score": 0.91,
      "source": "recall",
      "hops": 0,
      "path": [],
      "spaceId": "adrs",
      "type": "entity",
      "record": { "_id": "adr-0042", "name": "Token Scoping", "type": "decision" }
    },
    {
      "score": null,
      "source": "traverse",
      "hops": 1,
      "path": [{ "from": "adr-0042", "label": "implements", "to": "adr-0079" }],
      "spaceId": "adrs",
      "type": "entity",
      "record": { "_id": "adr-0079", "name": "Vault Integration", "type": "decision" }
    }
  ],
  "count": 2,
  "traverseDepth": 2
}
```

Per-result annotations:

| Field | Meaning |
|-------|---------|
| `source` | `"recall"` for a direct semantic match (seed), `"traverse"` for a record reached via the graph |
| `hops` | Distance from the nearest seed — `0` for a seed, `1` for a direct neighbour, etc. |
| `path` | The edge chain connecting this record to its seed (`[]` for seeds). Each element is `{ from, label, to }` |
| `score` | Vector similarity for seeds; `null` for traversal-reached records (they were not ranked by the search) |
| `record` | Seed records carry the full recall result; traversal records carry the reached **entity** document |

**Guard rails:**

- **Depth cap:** `traverse` must be `0`–`5`. A value of `6` or higher (or a negative/non-integer value) returns `400` — it is rejected, not clamped.
- **Result cap:** the combined output (seeds + traversal) is capped at `topK × (traverse + 1) × 4`. On dense graphs the traversal is truncated to this budget, preferring lower-hop records.
- **Cycle-safe:** each record is visited once, so a circular graph (A→B→C→A) never loops or produces duplicates. A record reachable by multiple paths keeps its **shortest** path.
- **Space-scoped:** traversal stays within the spaces the calling token may access. An edge pointing at a record in a space the token cannot see (or at an id that is not an entity) is silently skipped — no data and no `403` leak.
- Only **entities** are returned by traversal (edges connect entities); memories, chrono entries, and files still appear as seeds when they match semantically.

**Performance:** traversal issues roughly two batched (`$in`) MongoDB queries per hop, not one query per node. Even so, `traverse > 2` on a densely-connected graph can fan out quickly — pair it with `filter`, `tags`, or a low `topK` to keep the seed set (and therefore the traversal frontier) tight.

#### Prefiltered Recall (`filter` parameter)

Use `filter` to restrict results to records where specific properties match a condition. All filter conditions are AND-ed together. Records not satisfying every condition are excluded.

```json
{
  "query": "authentication architecture decisions",
  "types": ["entity"],
  "filter": {
    "properties.status": { "eq": "accepted" },
    "properties.domain": { "eq": "security" }
  }
}
```

**Supported operators:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Exact equality | `{ "eq": "accepted" }` |
| `ne` | Not equal | `{ "ne": "draft" }` |
| `in` | Value is in array (any-of) | `{ "in": ["security", "auth"] }` |
| `exists` | Property is/isn't present | `{ "exists": true }` |
| `gt` | Greater than (numeric) | `{ "gt": 10 }` |
| `gte` | Greater than or equal | `{ "gte": 5 }` |
| `lt` | Less than (numeric) | `{ "lt": 100 }` |
| `lte` | Less than or equal | `{ "lte": 99 }` |

Multiple operators on the same key are AND-ed (range queries):

```json
{ "properties.score": { "gte": 50, "lt": 100 } }
```

**Allowed filter key prefixes:** `properties.`, `tags`, `type`, `name`, `status`, `label`. Any other key returns `400`. This prevents filter-key injection attacks.

**Examples:**

```json
// Only accepted ADRs
{ "filter": { "properties.status": { "eq": "accepted" } } }

// Records tagged with "security" OR "auth" (any-of)
{ "filter": { "tags": { "in": ["security", "auth"] } } }

// Entities of type "service" with a count property > 0
{ "filter": { "type": { "eq": "service" }, "properties.count": { "gt": 0 } } }

// Records where properties.domain exists
{ "filter": { "properties.domain": { "exists": true } } }
```

> **Performance note:** A filter that references only declared index fields — `tags`, `type`, `name`, `status`, `label`, and any schema-declared `properties.<key>` — using the operators `eq`, `in`, `gt`, `gte`, `lt`, or `lte` is pushed into a native `$vectorSearch` `filter` and runs as `exact:true` search restricted to the matching subset, so cost is proportional to the number of matching records rather than the whole collection. Only undeclared dynamic `properties.*` keys, `exists`, and `ne` fall back to the exhaustive ENN path, which scores every document in the space before applying the filter. To keep a heavily-filtered property on the fast path, declare it in the space schema rather than adding a standalone MongoDB index.

**What is vector-indexed:**

| Data type | Embedded? | Fields included in embedding text | Returned by `recall`? |
|-----------|:---------:|-----------------------------------|:---------------------:|
| `memory` | ✅ | `tags` + entity names + `fact` + `description` + `properties` | ✅ |
| `entity` | ✅ | `name` + `type` + `tags` + `description` + `properties` | ✅ |
| `edge` | ✅ | `tags` + `from` + `label` + `to` + `type` + `description` + `properties` | ✅ |
| `chrono` | ✅ | `type` + `status` + `title` + `tags` + `description` + `properties` | ✅ |
| `file` | ✅ | `path` + `tags` + `description` | ✅ |

> **Note — `properties` in the embedding text.** `properties` are embedded as `key value`
> pairs (both the key *and* the value), so a phrase living only in `properties.outcome` is
> findable via `recall`. `edge` and `chrono` did **not** embed `properties` in releases up to
> 1.4.4 — if you are upgrading, existing records keep their old embedding until they are
> re-embedded. Reindex a space to pick up the change:
> `POST /api/brain/spaces/:spaceId/reindex`.

---

### Find Similar (Vector Similarity by Entry ID)

```http
POST /api/brain/spaces/:spaceId/find-similar
```

Given an existing entry's `_id`, find other entries with high vector similarity. Unlike `recall` (which re-embeds a text query), `find_similar` uses the entry's **stored embedding vector** directly — no re-embedding step. Ideal for deduplication, "more like this", and merge detection.

> **Also available as MCP tool:** `find_similar` — note the MCP tool makes `space` optional (omit it to search all accessible spaces, like `recall`) and adds `traverse`; its `crossSpace` flag is deprecated in favour of omitting `space`. This REST endpoint keeps `spaceId` in the path and the `crossSpace` body flag.

**Request body:**

```json
{
  "entryId": "<UUID of the source entry>",
  "entryType": "memory",
  "targetTypes": ["memory", "entity"],
  "topK": 10,
  "minScore": 0.7,
  "crossSpace": false
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `entryId` | ✅ | — | UUID of the entry to use as the query vector |
| `entryType` | ✅ | — | Knowledge type of the source entry (`memory`, `entity`, `edge`, `chrono`, `file`) |
| `targetTypes` | — | all types | Which knowledge types to search in |
| `topK` | — | `10` | Maximum results (1–100) |
| `minScore` | — | `0.0` | Minimum cosine similarity threshold |
| `crossSpace` | — | `false` | If `true`, search across all spaces the token can access |

**Response** `200`:

```json
{
  "source": { "_id": "...", "type": "entity", "name": "auth-service", "score": 1.0 },
  "results": [
    { "_id": "...", "type": "entity", "name": "auth-gateway", "spaceId": "dev-apps", "score": 0.91 },
    { "_id": "...", "type": "memory", "fact": "Auth service uses PKCE...", "spaceId": "dev-apps", "score": 0.84 }
  ]
}
```

- `source` echoes the input entry with `score: 1.0` (self-match) — excluded from `results`
- Results sorted by `score` descending
- `spaceId` included on each result when `crossSpace: true`

**Common use cases:**

| Use case | Parameters |
|----------|-----------|
| Dedup scan | `entryType: "entity"`, `targetTypes: ["entity"]`, `minScore: 0.90` |
| "More like this" | `topK: 5`, all target types |
| Cross-space merge detection | `crossSpace: true`, `minScore: 0.85`, `targetTypes: ["entity"]` |
| Memory consolidation | `entryType: "memory"`, `targetTypes: ["memory"]`, `minScore: 0.88` |

---

### Upsert an Entity

```http
POST /api/brain/spaces/:spaceId/entities
```

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Kubernetes",
  "type": "technology",
  "tags": ["infra", "containers"],
  "description": "CNCF-graduated container orchestration platform.",
  "properties": { "cncf": true, "version": "1.32" }
}
```

**Response** `201`: Full entity doc.

**Identity model**: If `id` is supplied (must be a valid UUID v4), the entity with that `_id` is updated; if no entity with that ID exists, a new one is created with that ID. If `id` is omitted, a new entity is always inserted with a freshly generated UUID v4. Name is a non-unique searchable label, not a primary key. Multiple entities with the same name and type can coexist in a space (e.g. several "Lisa" entities of type "person").

**Duplicate warning**: When inserting without `id` and entities with the same `name` + `type` already exist, the response includes a `warning` field:

```json
{
  "_id": "...",
  "name": "Lisa",
  "type": "person",
  "warning": "2 existing entities with name 'Lisa' and type 'person' already exist in this space. A new entity was created because no id was supplied. To update an existing entity, provide its id."
}
```

Tags are merged (deduplicated union), properties are shallow-merged (new keys added, existing keys overwritten).

**Constraints**: `name` required string; `type` optional string (defaults to empty); `id` optional UUID v4 (400 if invalid); `tags` optional array of strings; `description` optional string (included in embedding text); `properties` optional object where each value must be a string, number, or boolean.

---

### Find Entities by Name

```http
GET /api/brain/spaces/:spaceId/entities/by-name?name=Kubernetes
```

**Response** `200`:

```json
{
  "entities": [ ... ]
}
```

Returns entities whose name matches the query as a **case-insensitive substring** (not an exact match), regardless of type, **capped at 20 results**. Multiple entities may share a name (name is not a unique key).

---

### Get Entities by IDs

```http
GET /api/brain/spaces/:spaceId/entities/by-ids?ids=id1,id2,id3
```

Batch-fetch entities by ID. `ids` is a comma-separated list (required — `400` if missing), deduplicated and capped at **100** IDs per call. Returns `{ "entities": [ ... ] }`; unknown IDs are simply absent from the result.

---

### Get an Entity by ID

```http
GET /api/brain/spaces/:spaceId/entities/:id
```

Returns the single entity, or `404` if no entity with that ID exists in the space. Edges and chrono entries have the same single-doc shape — `GET /api/brain/spaces/:spaceId/edges/:id` and `GET /api/brain/spaces/:spaceId/chrono/:id`.

---

### List Entities

```http
GET /api/brain/spaces/:spaceId/entities?limit=50&skip=0
```

**Response** `200`:

```json
{
  "entities": [ ... ],
  "limit": 50,
  "skip": 0
}
```

Default limit: 50, max: 500.

---

### Delete an Entity

```http
DELETE /api/brain/spaces/:spaceId/entities/:id
```

**Response** `204` when no inbound references exist (or `strictLinkage` is not enabled).

**Response** `409 Conflict` when the space has `strictLinkage` enabled in its meta and the entity still has inbound backlinks (edges, memories, or chrono entries that reference it). The caller must first delete or relink the backlinked items before the deletion is permitted. Response body:

```json
{
  "error": "Cannot delete: entity has inbound references",
  "backlinks": [
    { "type": "edge", "_id": "e1b2c3d4-..." },
    { "type": "memory", "_id": "m5f6a7b8-..." },
    { "type": "chrono", "_id": "c9d0e1f2-..." }
  ]
}
```

---

### Merge Two Entities

```http
POST /api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId
Content-Type: application/json
```

Merge two entities into one. The **survivor** keeps its identity (ID, name, type, description); the **absorbed** entity is deleted after all references are relinked.

**Request body** (optional):

```json
{
  "resolutions": [
    { "key": "score", "resolution": "fn:avg" },
    { "key": "label", "resolution": "survivor" },
    { "key": "category", "resolution": "custom", "customValue": "merged-category" }
  ]
}
```

**Behaviour:**

| Scenario | Status | Response |
|----------|--------|----------|
| No property conflicts, or all conflicts resolved | `200` | Merged entity + relinking info |
| Unresolved property conflicts remain | `409` | `MergePlan` with conflict details |
| Survivor or absorbed entity not found | `404` | Error |
| Invalid resolution | `400` | Error |

**Response `200`** (merge executed):

```json
{
  "merged": { "_id": "...", "name": "...", "properties": { ... }, ... },
  "absorbedId": "absorbed-entity-uuid",
  "relinked": true,
  "duplicateEdgeWarnings": [
    {
      "survivorEdgeId": "edge-1-uuid",
      "absorbedEdgeId": "edge-2-uuid",
      "from": "survivor-uuid",
      "to": "target-uuid",
      "label": "depends_on"
    }
  ]
}
```

**Response `409`** (unresolved conflicts — no mutation):

```json
{
  "survivorId": "...",
  "absorbedId": "...",
  "propertyConflicts": [
    {
      "key": "score",
      "type": "number",
      "survivorValue": 80,
      "absorbedValue": 100,
      "suggestedFn": "avg",
      "resolved": false
    }
  ],
  "absorbedOnlyProperties": [
    { "key": "extra", "value": "info" }
  ],
  "duplicateEdgeWarnings": []
}
```

**Per-property resolution options:**

| Property type | Valid resolutions |
|---------------|-------------------|
| `number` | `"survivor"`, `"absorbed"`, `"fn:avg"`, `"fn:min"`, `"fn:max"`, `"fn:sum"` |
| `boolean` | `"survivor"`, `"absorbed"`, `"fn:and"`, `"fn:or"`, `"fn:xor"` |
| `string` / other | `"survivor"`, `"absorbed"`, `"custom"` (with `customValue`) |

**Relinking:** All edges, memories, and chrono entries referencing the absorbed entity are unconditionally rewritten to reference the survivor. Edges where `(from, to, label)` become identical after relinking appear in `duplicateEdgeWarnings[]` — the agent resolves them via `DELETE /api/brain/spaces/:spaceId/edges/:id`.

**`suggestedFn`:** When `propertySchemas` includes a `mergeFn` for a conflicting property, it appears as `suggestedFn` in the conflict. The agent may accept or override it.

**Proxy spaces:** Not supported — target member spaces directly.

---

### Upsert an Edge

```http
POST /api/brain/spaces/:spaceId/edges
```

```json
{
  "from": "550e8400-e29b-41d4-a716-446655440000",
  "to": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "label": "depends_on",
  "weight": 0.9,
  "type": "causal",
  "tags": ["infra"],
  "description": "K8s uses Docker as its container runtime."
}
```

**Response** `201`: Full edge doc.

| Field | Required | Description |
|-------|----------|-------------|
| `from` | yes | Source entity UUID v4 (not a name when `strictLinkage` is enabled). Returns `400` if not a valid UUID and `strictLinkage` is on. |
| `to` | yes | Target entity UUID v4 (not a name when `strictLinkage` is enabled). Returns `400` if not a valid UUID and `strictLinkage` is on. |
| `label` | yes | Relationship label (e.g. `depends_on`, `related_to`) |
| `weight` | no | Numeric weight (0–1). Defaults to none. |
| `type` | no | Free-form edge type string (e.g. `causal`, `hierarchical`). |
| `tags` | no | Array of strings. Merged (union) with existing tags on upsert. Included in embedding text and filterable via `recall`. |
| `description` | no | Optional prose description of the relationship. Included in embedding text. |
| `properties` | no | Optional key-value metadata object. Values must be string, number, or boolean. Shallow-merged on upsert. |

Upserts on `(spaceId, from, to, label)`.

---

### List Edges

```http
GET /api/brain/spaces/:spaceId/edges?limit=50&skip=0
```

**Response** `200`:

```json
{
  "edges": [ ... ],
  "limit": 50,
  "skip": 0
}
```

---

### Delete an Edge

```http
DELETE /api/brain/spaces/:spaceId/edges/:id
```

**Response** `204`.

---

### Traverse Graph

BFS traversal from a starting entity, following edges up to `maxDepth` hops.

```http
POST /api/brain/spaces/:spaceId/traverse
```

**Body**:

```json
{
  "startId":    "entity-uuid",
  "direction":  "outbound",
  "edgeLabels": ["depends_on", "references"],
  "maxDepth":   2,
  "limit":      50
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `startId` | ✅ | — | UUID of the starting entity |
| `direction` | — | `"outbound"` | `"outbound"` follows edges from the node, `"inbound"` follows edges to it, `"both"` follows in either direction |
| `edgeLabels` | — | all labels | Filter traversal to specific edge labels only |
| `maxDepth` | — | `3` | Maximum hops from `startId`; hard-capped at `10` |
| `limit` | — | `100` | Maximum total nodes returned |

**Response** `200`:

```json
{
  "nodes": [
    { "_id": "...", "name": "auth-service", "type": "service", "depth": 1 },
    { "_id": "...", "name": "user-service",  "type": "service", "depth": 2 }
  ],
  "edges": [
    { "_id": "...", "from": "...", "to": "...", "label": "depends_on" }
  ],
  "truncated": false
}
```

- `nodes` — entities discovered during traversal, excluding the start entity itself; each node includes a `depth` field indicating the hop count from `startId`
- `edges` — only the edges actually traversed (not all edges of the returned nodes)
- `truncated: true` if `limit` was reached before exhausting the graph

Server-side cycle detection ensures each entity is visited at most once, so cyclic graphs are handled safely.

---

### Create a Chrono Entry

```http
POST /api/brain/spaces/:spaceId/chrono
```

**Body**:

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

---

### Space Stats

```http
GET /api/brain/spaces/:spaceId/stats
```

**Response** `200`:

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

---

### Check Reindex Status

```http
GET /api/brain/spaces/:spaceId/reindex-status
```

**Response** `200`:

```json
{ "spaceId": "general", "needsReindex": false }
```

Returns `true` when the embedding model has changed and memories need re-embedding.

---

### Reindex Space

```http
POST /api/brain/spaces/:spaceId/reindex
```

Re-computes all embeddings with the current model. **Runs asynchronously** — the call returns immediately and the job proceeds in the background (it may take minutes for large spaces). Poll `GET /api/brain/spaces/:spaceId/reindex-status` for progress.

**Response** `200` — the job was *accepted*; `reindexed`/`errors` are always `0` here (the real counts land on the status endpoint), and `status` is `"started"`:

```json
{ "spaceId": "general", "reindexed": 0, "errors": 0, "status": "started" }
```

Returns `409 { "error": "Reindex already in progress" }` if one is already running for the space.

---

### Bulk Write

```http
POST /api/brain/spaces/:spaceId/bulk
Content-Type: application/json
```

Batch-upsert memories, entities, edges, and/or chrono entries in a single HTTP call. All four arrays are optional. Processing order: **memories → entities → edges → chrono** — so edges that reference entities inserted in the same batch will resolve correctly.

Each array is capped at 500 entries. Per-item validation failures are recorded in `errors` without aborting the remaining items.

**Request body:**

```json
{
  "memories":  [ { "fact": "Oceans cover 71% of the Earth's surface.", "tags": ["science"] } ],
  "entities":  [ { "name": "Earth", "type": "planet", "tags": ["science"] } ],
  "edges":     [ { "from": "<entity-id-A>", "to": "<entity-id-B>", "label": "orbits" } ],
  "chrono":    [ { "title": "Launch day", "type": "milestone", "startsAt": "2026-01-01T00:00:00Z" } ]
}
```

Each item accepts the same fields as its corresponding individual endpoint (`POST /memories`, `POST /entities`, `POST /edges`, `POST /chrono`), with one exception: **an entity's `type` is required in bulk** (an item missing it is skipped with `"missing required field: type"`), whereas the single `POST /entities` defaults `type` to empty.

**Response** `207`:

```json
{
  "inserted": { "memories": 1, "entities": 1, "edges": 0, "chrono": 1 },
  "updated":  { "memories": 0, "entities": 0, "edges": 1, "chrono": 0 },
  "errors":   [
    { "type": "edge", "index": 0, "reason": "missing required field: from" }
  ]
}
```

- `inserted` — count of new documents written per type.
- `updated` — count of existing documents merged per type (entities are upserted by `id` when supplied; edges are upserted by their natural key `(from, to, label)`).
- `errors` — per-item failures (`type`, zero-based `index`, human-readable `reason`). Valid items are still written even when errors are present.

Entity items in the `entities` array accept an optional `id` field (UUID v4). If `id` is supplied, the entity with that ID is updated (or created with that ID). If `id` is omitted, a new entity is always inserted. See [Upsert an Entity](#upsert-an-entity) for full identity semantics.

**Schema validation:** When the target space has `validationMode` set to `strict` or `warn`, each item is validated against the space schema before writing. In strict mode, violating items are skipped and recorded in `errors` (e.g. `"schema_violation: not in entityTypes allowlist: Person, Service"`). In warn mode, violations are recorded as warnings but the item is written. See [Schema Validation](#schema-validation) for the full schema specification.

**Proxy spaces:** add `?targetSpace=<member>` to route all writes to a specific member space.

---

### Structured Query (Read-Only)

```http
POST /api/brain/spaces/:spaceId/query
```

Run a constrained Mongo-style read query against one logical collection. Intended for advanced clients and MCP parity with the `query` tool.

```json
{
  "collection": "entities",
  "filter": { "type": "service", "tags": "backend" },
  "projection": { "name": 1, "type": 1, "tags": 1 },
  "limit": 20,
  "maxTimeMS": 5000
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `collection` | ✅ | One of: `memories`, `entities`, `edges`, `chrono`, `files` |
| `filter` | — | Query filter object (defaults to `{}`) |
| `projection` | — | Projection object (`1` include / `0` exclude) |
| `limit` | — | Max rows (default `20`) |
| `maxTimeMS` | — | Query timeout in milliseconds (default `5000`) |

**Response** `200`:

```json
{
  "results": [ ... ],
  "collection": "entities",
  "count": 12
}
```

---

### List File Metadata Records

```http
GET /api/brain/spaces/:spaceId/files?limit=50&skip=0&tag=design&path=docs/architecture.md
```

Returns metadata rows stored in the brain collection for files (`path`, tags, description, properties, size, author, timestamps).

| Query param | Description |
|-------------|-------------|
| `limit` | Default `50`, max `200` |
| `skip` | Offset for pagination |
| `tag` | Exact tag filter |
| `path` | Exact path filter |

**Response** `200`:

```json
{
  "files": [ ... ],
  "limit": 50,
  "skip": 0
}
```

---

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

## Files API

Base path: `/api/files`

> **Proxy spaces:** Read operations (GET) search across all member spaces. Write operations (POST, DELETE, PATCH, mkdir) require `?targetSpace=<member>` in the query string.

### Upload a File (raw bytes)

```http
POST /api/files/:spaceId?path=reports/q1.pdf
Content-Type: application/octet-stream

<raw bytes>
```

Any file type is supported — documents, images, binaries, archives, etc. The `Content-Type` header is informational; Ythril stores the raw bytes as-is.

**Response** `201` for opaque/non-document files (`{ path, sha256 }`). For a **document or media** format that triggers async conversion/embedding (PDF, DOCX, images, audio, …) the response is **`202 Accepted`** with an `embeddingStatus: "pending"` — the file is stored immediately and its searchable content is produced in the background (poll File Meta or retry-embedding for status):

```json
{ "path": "reports/q1.pdf", "sha256": "a1b2c3...", "embeddingStatus": "pending" }
```

### Upload a File (JSON / base64)

```http
POST /api/files/:spaceId?path=assets/diagram.svg
Content-Type: application/json

{
  "content": "PHN2ZyB4bWxucz0...",
  "encoding": "base64"
}
```

---

### Chunked Upload (Content-Range)

For files larger than 10 MB, split into chunks and send with `Content-Range`:

```http
POST /api/files/:spaceId?path=large-file.zip
Content-Type: application/octet-stream
Content-Range: bytes 0-5242879/15728640
Authorization: Bearer ythril_…

<5 MB of raw bytes>
```

Intermediate chunks return **202**:

```json
{ "path": "large-file.zip", "received": 5242880 }
```

The final chunk (where `end === total - 1`) returns **201** with the full file hash:

```json
{ "path": "large-file.zip", "sha256": "a1b2c3..." }
```

Duplicate ranges are silently accepted (idempotent). The `maxUploadBodyBytes` config limit applies per-chunk; the declared `Content-Range` total is bounded by `maxChunkedUploadBytes` (default 10 GiB → **413** when exceeded). Every chunk is also checked against the storage quota — the first chunk projects the full declared total — and returns **507** when the files hard limit would be exceeded. Bytes staged under `.chunks` count toward measured file usage.

### Check Upload Progress

```http
GET /api/files/:spaceId/upload-status?path=large-file.zip&total=15728640
```

**Response** `200`:

```json
{ "received": 5242880 }
```

Resume by sending the next chunk from the `received` offset. Stale chunk directories (older than 24 hours) are automatically cleaned up.

---

### Download a File

```http
GET /api/files/:spaceId?path=reports/q1.pdf
```

Returns raw file bytes. Works with any file type — PDFs, images, archives, source code, etc. If `path` is a directory, returns a JSON listing.

Active-content types that can execute script when rendered in the browser (`.html`, `.htm`, `.svg`, `.xml`, `.xhtml`) are served with `Content-Disposition: attachment` and a `sandbox` Content-Security-Policy (stored-XSS guard). Passive types — images, PDF, plain text — are served `inline` and preview normally.

---

### List Directory

```http
GET /api/files/:spaceId?path=reports/
```

**Response** `200`:

```json
{
  "path": "reports/",
  "type": "dir",
  "entries": [
    { "name": "q1.pdf", "type": "file", "size": 204800 },
    { "name": "q1-data.xlsx", "type": "file", "size": 51200 },
    { "name": "charts", "type": "dir" }
  ]
}
```

---

### Create Directory

```http
POST /api/files/:spaceId/mkdir?path=reports/charts
```

**Response** `201`:

```json
{ "created": "reports/charts" }
```

---

### Move / Rename

```http
PATCH /api/files/:spaceId?path=reports/draft.docx
Content-Type: application/json

{ "destination": "reports/final.docx" }
```

**Response** `200`:

```json
{ "from": "reports/draft.docx", "to": "reports/final.docx" }
```

---

### Delete a File

```http
DELETE /api/files/:spaceId?path=reports/q1.pdf
```

**Response** `204`.

To delete a directory, include `{ "confirm": true }` in the request body.

Deleting a file cascades: its metadata record, any queued embedding job, and all conversion
artifacts — chunk records plus the on-disk `_converted/<id>.md` and `_extracted/<id>/` sidecars —
are removed from the file store. Deleting a **directory** does the same for every file beneath it,
including the `_converted/<path>` and `_extracted/<path>` subtrees, and writes a sync **tombstone**
per removed file so peers delete their copies too (otherwise the next sync would push them back).

**Soft-delete (`softDeleteFileMeta`).** With this top-level config flag set to `true` (default
`false`), deleting a file **retains** its metadata record and flags it `deletedAt = <timestamp>`
instead of removing it. Flagged records stay listed and searchable but are shown as "deleted" in the
UI; re-uploading the same path clears the flag. Derived records (conversion chunks / `_converted` /
`_extracted`) are always hard-removed regardless of the setting.

**Metadata-only delete + guard.** `DELETE /api/brain/spaces/:spaceId/files?path=…` removes a metadata
record *without* touching disk — but only when doing so is safe. If the file **still exists on disk**
and the record is not flagged deleted, the request is refused with **`409`** (deleting the metadata
would silently orphan a live file — delete the file itself instead). A flagged or already-orphaned
record (its file gone) can be purged this way.

---

### Server-Side Conversion Pipeline

When a convertible file is uploaded, Ythril automatically:

1. Converts it to clean Markdown (via unstructured sidecar for PDF/DOCX/EPUB, or in-process for HTML/MD/TXT).
2. Normalises the Markdown (strips page numbers, collapses blank lines, levels headings).
3. Splits it into heading- or paragraph-delimited chunks.
4. Embeds each chunk independently for high-quality semantic recall.

#### Timing — conversion is asynchronous

**Every** write path enqueues the conversion for a background worker and returns immediately; the
chunks do not exist yet when the call returns. This is true for the REST upload **and** for the MCP
`write_file` tool — the two behave identically.

| Surface | Returns | How to know conversion finished |
|---------|---------|--------------------------------|
| `POST /api/files/:spaceId` (document formats) | `202 Accepted` with `embeddingStatus: "pending"` | poll the filemeta record |
| MCP `write_file` | the write confirmation (sha256) — it reports the **write**, not the conversion | poll the filemeta record |

Poll `GET /api/brain/spaces/:spaceId/files?path=<path>` and watch `embeddingStatus`: `pending` →
`processing` → `complete` (`partial` means some chunks failed and are retry-eligible; `failed` means
retries are exhausted). Once complete, the record carries `chunkCount` and (for binary formats)
`convertedFileId`, and the chunk records are recall-searchable. To see the chunks themselves, pass
`?includeChunks=true` — they are hidden by default (see below).

Media files (image/audio/video) are likewise queued and report `embeddingStatus` of `pending`,
`disabled` (media embedding turned off) or `skipped` (over `maxFileSizeBytes`). Only the `"text"`
bypass is fully synchronous: it stores a single flat embedding with no chunking and no job.

> Agents take note: writing a document and immediately recalling its contents will find nothing —
> the worker has not run yet. Poll `embeddingStatus`, or accept eventual consistency. (Before Ythril
> 1.4, MCP `write_file` converted documents inline and blocked until they were chunked; it now
> enqueues a job like REST, so it returns faster and inherits the worker's retry/backoff.)

#### `inputFormat` parameter

Pass `inputFormat` in the JSON body (or as a query parameter in raw uploads) to control conversion:

| Value | Behaviour |
|-------|-----------|
| `"auto"` | (default) Detect from MIME type or file extension |
| `"pdf"` / `"docx"` / `"epub"` | Use the unstructured sidecar (same-Pod, localhost:8000) |
| `"html"` | Extract article body with jsdom + @mozilla/readability + turndown, fully in-process |
| `"md"` | Normalise + split on H2/H3 headings, in-process — no sidecar, no `_converted/` copy |
| `"txt"` | Normalise + split on paragraph boundaries, in-process — `headingText` is null on all chunks |
| `"text"` | Legacy bypass: single flat embedding, no chunking, unchanged behaviour |

Example — upload and convert a PDF:

```http
POST /api/files/:spaceId?path=reports/q1.pdf
Content-Type: application/json

{
  "content": "<base64-encoded PDF bytes>",
  "encoding": "base64"
}
```

Or force the bypass (no conversion):

```json
{
  "content": "<base64-encoded PDF bytes>",
  "encoding": "base64",
  "inputFormat": "text"
}
```

#### Stored artefacts

Three things are stored for each converted file (conversion artefacts are **hidden** from the file manager UI and the `GET /api/brain/spaces/:spaceId/files` listing by default):

1. **Original file** — bytes on disk, accessible via the usual download URL. Unchanged.
2. **`_converted/<path>.md`** — full converted Markdown, stored in the space file store (binary formats only). The original file's filemeta record has a `convertedFileId` property pointing to it.
3. **Chunk records** — one filemeta record per heading/paragraph section. Each has:
   - `parentFileId` — `_id` of the original file's filemeta record
   - `chunkIndex` — 0-based position within the document
   - `headingText` — the H2/H3 heading that opened this chunk (`null` for `.txt` paragraph chunks)
   - `content` — the Markdown body of the chunk
   - An embedding derived from `headingText + " " + content`

Chunk records and `_converted/` records share the same vector space as memories, entities, and edges. A standard `recall` query therefore covers document chunks alongside all other content — **no separate query path is required**.

#### File manager and listing endpoints

Chunk records and `_converted/` file records carry a `parentFileId` field. The following surfaces **exclude** them by default, so users only see top-level files:

- **File manager UI** — shows only original, user-uploaded files.
- **`GET /api/brain/spaces/:spaceId/files`** — omits records where `parentFileId` is set. Pass `?includeChunks=true` to include all records.
- **`GET /api/brain/spaces/:spaceId/stats`** — the `files` count reflects only top-level files.

Recall results (`recall`, `find_similar`) **do** include chunk records by design. When a result has `parentFileId` set, the caller can follow it to retrieve the original file record.

#### Resilience

If the unstructured sidecar is unavailable, `write_file` still succeeds. The original file is stored as-is and `conversionError` is set on the filemeta record. No HTTP 5xx is returned to the caller.

Conversion input is size-bounded: documents over `maxDocumentConversionBytes` in `config.json` (default 100 MiB; HTML additionally capped at 25 MiB because jsdom parses it in-process) are stored as-is with `embeddingStatus: "skipped"` — the conversion job fails permanently rather than retrying. Images extracted during hi-res conversion are capped at 50 per document / 100 MiB aggregate.

Setting `CONVERSION_SIDECAR_URL=""` only disables the **sidecar-backed** formats: in-process formats (HTML/Markdown/plain text) still convert, but PDF/DOCX/EPUB uploads then fail with `conversionError: sidecar_down` (`embeddingStatus: failed`). There is no global "text bypass" — to skip conversion for a specific upload, send it with `inputFormat=text`.

#### Page-render sidecar (`doc-render`)

The bundled `doc-render` sidecar is a tiny PDFium (pypdfium2) service that renders PDF pages to images. It is
the rasterization step the **VLM document-extraction** path (`mediaEmbedding.documentProcessing.mode` of
`vlm` / `auto` / `max`) needs and is **not used by the default `ocr` mode** — you can leave it running (it is
lightweight and carries no model weights) or stop it with no effect on today's OCR conversion. Like the
`unstructured` sidecar it parses untrusted documents, so it runs isolated on the internal-only
`ythril-convert` network (no database, no internet egress), non-root and resource-limited. Ythril reaches
it via `RENDER_SIDECAR_URL` (default `http://localhost:8100`).

#### Office-render sidecar (`doc-office`) — optional

`doc-render` only opens PDFs, so **office** documents (DOCX, EPUB, PPTX, XLSX, ODT, RTF…) in a `vlm`/`auto`/
`max` mode fall back to OCR unless the optional **`doc-office`** sidecar is running. It uses **LibreOffice**
(headless) to convert the document to PDF, then rasterizes it exactly like `doc-render`. Because LibreOffice
is heavy (≈ +1 GB), it is **opt-in**: start it with

```bash
docker compose --profile office up -d
```

Everything stays **on-box** on the isolated `ythril-convert` network — no page images or text leave the
instance. Ythril reaches it via `RENDER_OFFICE_SIDECAR_URL` (default `http://doc-office:8100` in compose).
When it is absent, office docs simply use OCR, unchanged. LibreOffice is MPL-2.0 / LGPL-3.0 (not AGPL) and
runs as a separate process, so it does not affect Ythril's licensing.

#### Document Processing Configuration

The unstructured sidecar strategy and image extraction behaviour can be tuned under `mediaEmbedding.documentProcessing` in `config.json`. All settings are optional — the defaults are designed for maximum data extraction out of the box. The extraction `mode` and the render DPI / max-pages / timeout / concurrency knobs are also editable in the admin UI under **Settings → Models** (the `vlmModel` / `repairModel` / `verifyModel` endpoints stay environment-only and are shown read-only there).

**Infra-managed lock (F11).** On managed infrastructure you can set every media/model value in `config.json` (or the environment) and forbid changes through the admin UI/API — the same posture as `YTHRIL_MONGO_INFRA_MANAGED` for the database. Set `mediaEmbedding.infraManaged: true` in `config.json`, **or** `YTHRIL_MEDIA_INFRA_MANAGED=true` in the environment. When active, `PATCH /api/admin/media-config` returns **409** with `code: "INFRA_MANAGED"` and **Settings → Models** renders read-only (a "managed by infrastructure" banner is shown; *Test connection* still works). Individual fields can instead be pinned one at a time by setting their env var (e.g. `VISION_MODEL`, `DOC_ASSIST_URL`) — those appear in `lockedByInfra` and are locked individually. Use `infraManaged` when the whole block is owned by infrastructure.

**Test connection (F11).** `POST /api/admin/media-config/test-connection` (admin + MFA) probes a configured endpoint — `{ "target": "vision" | "stt" | "assist" }` — by listing its models (OpenAI-compatible `/v1/models`, falling back to Ollama `/api/tags`). It performs **no inference and sends no document content**, so it is safe to run before acknowledging egress. External endpoints go through the SSRF-guarded fetch; local (trusted) endpoints use a direct fetch. The response reports `{ reachable, modelPresent?, models, latencyMs, detail? }`. Settings → Models exposes a **Test connection** button per provider card.

**Per-space override (F11-c).** The `mode` above is the instance-wide default. A single space can override it — for example to run one archive of scanned PDFs under `max` while the rest of the instance stays on `ocr` — from the space's **Settings → Document extraction** picker, or via `PATCH /api/spaces/:id` with `{ "documentExtraction": "ocr" | "vlm" | "auto" | "max" }` (send `null` to clear the override and inherit the instance default again). Like dupe rules and record-TTL, this is a **local, per-instance** operational setting: it is never governed or synced across a network. When a space has no override, uploads to it use the instance-wide `mode` unchanged.

| Field | Default | Description |
|---|---|---|
| `strategy` | `"hi_res"` | Unstructured partition strategy. `"hi_res"`: full Tesseract OCR + layout detection — accurate on scanned PDFs, extracts embedded images and structured tables. `"auto"`: sidecar picks the fastest viable strategy. `"fast"`: pdfminer text-layer only — fastest but no OCR, no image extraction. `"ocr_only"`: force OCR on every page regardless of whether a text layer exists. |
| `extractImages` | `true` | When `true` and `strategy` is `"hi_res"`, embedded images found in document partitions are decoded and saved as `_extracted/{originalId}/image-{N}.{ext}` subfiles. Each is automatically enqueued for the full media pipeline (caption + face recognition). Has no effect when strategy is not `"hi_res"`. |
| `mode` | `"auto"` | Extraction path. `"auto"` (default) uses the VLM only when it is configured and available, else OCR — so with no `vlmModel` set it is byte-for-byte the OCR-only path. `"ocr"` forces OCR-only (the unstructured sidecar). `"vlm"` renders each page and transcribes it with a vision model, using OCR as grounding evidence and falling back to OCR if the result doesn't validate (so it is **never worse than OCR**). `"max"` adds a validation-driven **repair** pass (below) on top of `"vlm"`; consensus is a later phase. |
| `vlmModel` | `""` | Ollama vision model used for `vlm` / `auto` / `max` (e.g. a bundled `moondream`, or a larger model you wire in). Empty ⇒ the VLM path is unavailable and extraction stays on OCR. Env override: `DOC_VLM_MODEL`. |
| `vlmBaseUrl` | `""` | Endpoint for the VLM. Empty ⇒ falls back to the media vision provider's `baseUrl`, then `http://ollama:11434`. Env override: `DOC_VLM_URL`. |
| `repairModel` | `""` | **`max` mode only.** Model used for the repair pass when a page's VLM output fails OCR-evidence validation — it reconciles the draft against the OCR text in one extra text-only call. Empty ⇒ reuses `vlmModel`. Set this to wire in a stronger model you host. Env override: `DOC_REPAIR_MODEL`. |
| `repairBaseUrl` | `""` | Endpoint for the repair model. Empty ⇒ reuses `vlmBaseUrl`. Env override: `DOC_REPAIR_URL`. |
| `verifyModel` | `""` | **`max` mode only (F11-d consensus).** A *second* document VLM. When set, `max` runs it as an independent second transcription of each page, reconciles it with the primary draft against the OCR text, and keeps the highest-coverage result — **never worse** than the primary. Empty ⇒ no consensus pass. Best set to a *different* model than `vlmModel`. Env override: `DOC_VERIFY_MODEL`. |
| `verifyBaseUrl` | `""` | Endpoint for the verify model. Empty ⇒ reuses `vlmBaseUrl`. Env override: `DOC_VERIFY_URL`. |
| `renderDpi` | `150` | Page rasterization DPI for the render sidecar (VLM modes only). |
| `maxPages` | `50` | Cap on pages rendered/transcribed per document (VLM modes only). |
| `pageTimeoutMs` | `60000` | Per-page VLM transcription timeout (VLM modes only). |
| `concurrency` | `2` | How many pages are transcribed in parallel (VLM modes only). |
| `ocrTimeoutMs` | `120000` | Timeout (ms) for a single OCR-sidecar call. Applies to **all** modes — OCR is the engine in `ocr` mode and the grounding evidence + fallback floor in the VLM modes — so raise it when large/complex scanned documents need longer than the 2-min default (especially under `max`). Env override: `DOC_OCR_TIMEOUT_MS`. |

The VLM modes require both a running `doc-render` sidecar and a configured `vlmModel`. If either is missing,
Ythril transparently uses OCR — no upload fails because a model isn't wired in yet.

**Repair pass (`max` mode).** When a document's VLM transcription fails the OCR-evidence coverage check,
`max` mode runs one bounded repair pass before falling back to OCR: it sends the draft transcription and the
OCR text to `repairModel` (or `vlmModel` if unset) in a single text-only call, asks it to restore any dropped
content, and re-validates. If the repaired output passes it is accepted; if it errors or still doesn't pass,
the extractor falls back to OCR — so the result is still never worse than plain OCR. Exactly one repair pass
runs per document (bounded cost).

**Consensus pass (`max` mode, F11-d).** When a `verifyModel` is configured, `max` mode adds one bounded
**consensus** step on top of an already-accepted draft: the verify model independently transcribes the pages
(a second, ideally different, VLM), that draft is reconciled with the primary against the OCR text, and the
highest-OCR-coverage of the three candidates (primary, second draft, reconciled) is kept. Because the primary
is always a candidate and ties keep it, consensus **can only match or beat** the primary's coverage — never
regress it. It is failure-tolerant (any error keeps the primary) and bounded (one extra transcription set +
one reconcile call, subject to the same max-pages cap). Empty `verifyModel` ⇒ no consensus pass, unchanged
behaviour. Consensus arbitrates by OCR-evidence coverage; N-pass entropy voting is a possible future refinement.

**External assist model (F11-b) — hosted egress, opt-in and acknowledged.** By default every extraction path
is local (the bundled Ollama VLM / OCR sidecar): no document content leaves your instance. You can optionally
point a **bigger, external model** at specific tasks under `documentProcessing.assistModel`:

| Field | Description |
|---|---|
| `baseUrl` | External **OpenAI-compatible** endpoint (`POST {baseUrl}/v1/chat/completions`). Validated against SSRF on save (must be a public http(s) URL — no private/loopback/metadata addresses) and reached only through the SSRF-guarded fetch. Env: `DOC_ASSIST_URL`. |
| `model` | Model tag to request. Env: `DOC_ASSIST_MODEL`. |
| `apiKey` | Optional bearer token. Stored in `secrets.json` (never `config.json`), masked in the admin API. Env: `DOC_ASSIST_API_KEY`. |
| `uses` | Which tasks the external model powers — `["repair"]` today (the `max`-mode repair pass); more are planned. Empty ⇒ configured but inert (no egress). |
| `acknowledgedHost` | The endpoint host the operator acknowledged egress to. **Required to match `baseUrl`'s host whenever `uses` is non-empty** — the admin API rejects the save otherwise, and the extractor re-checks it at runtime, so document content never leaves the box without recorded consent. |

⚠️ **This is the only setting that sends document content off the instance.** When a task is assigned, the
external model receives OCR-extracted text and draft transcriptions (and, for future image-based tasks,
rendered page images). Settings → Models surfaces an **acknowledgment dialog** on save that states exactly
what egresses to which host; that acknowledgment sets `acknowledgedHost`. Pinning `DOC_ASSIST_URL` (etc.) via
env locks the whole block read-only in the UI. When no assist model is configured, or its `uses` is empty, the
repair pass stays entirely local exactly as before.

**Example `config.json` excerpt:**

```json
{
  "mediaEmbedding": {
    "documentProcessing": {
      "strategy": "hi_res",
      "extractImages": true
    }
  }
}
```

To revert to the old `auto` behaviour (text extraction only, no images):

```json
{
  "mediaEmbedding": {
    "documentProcessing": {
      "strategy": "auto",
      "extractImages": false
    }
  }
}
```

#### Extracted Image Subfiles

When `strategy: "hi_res"` and `extractImages: true`, Ythril creates one extra stored artefact per embedded image found in a document:

- **`_extracted/{originalId}/image-{N}.{ext}`** — decoded image bytes written to the space file store. `N` is a 0-based index within the document. The extension (`png`, `jpg`, etc.) is derived from the MIME type reported by the sidecar.
  - `parentFileId` is set to the original document's filemeta `_id`.
  - The record is hidden from the file manager UI and listing endpoints by default (same as chunks and `_converted/` files).
  - Immediately enqueued for the media embedding pipeline — the image will be captioned and face-searched automatically.

This means a PDF containing five embedded photographs will produce:

- The original PDF file record
- A `_converted/{id}.md` Markdown record
- One chunk record per heading/paragraph section
- Five `_extracted/{id}/image-{N}.jpg` records, each independently captioned and face-searched

---

### Media Embedding Pipeline (Images, Audio, Video)

Binary media files (images, audio, video) are automatically captioned or transcribed and embedded into the vector space for semantic recall. The pipeline is **enabled by default** — the bundled workstation `docker-compose.yml` and the Kubernetes manifests both ship with the required `ollama` (vision) and `whisper` (STT) services. To disable it (or point Ythril at external providers), use **Settings → Models** in the web UI or `PATCH /api/admin/media-config`.

#### Overview

| Media type | Processing |
|---|---|
| Images (PNG, JPEG, GIF, WebP, …) | Caption via Ollama-compatible vision model → embed caption |
| Audio (MP3, WAV, OGG, FLAC, …) | Silence-detect → STT chunks via Whisper-compatible API → embed each chunk |
| Video (MP4, MKV, MOV, WebM, …) | Extract audio → STT + keyframe captioning → embed combined segments |

All media ultimately produces text that passes through the same `nomic-embed-text-v1.5` embedding model used for documents — no separate CLIP or multimodal vector space is required.

#### Disabling or Switching Providers

Use **Settings → Models** in the web UI, or `PATCH /api/admin/media-config`, or set `MEDIA_EMBEDDING_ENABLED=false` in Ythril's environment to turn the pipeline off.

Required services (bundled by default; override only when you point at external providers):

- **Ollama** (image captioning): `OLLAMA_URL=http://ollama:11434` — deploy any vision-capable model (default: `moondream`).
- **faster-whisper-server** (audio/video STT): `WHISPER_URL=http://whisper:8000` — set model via `WHISPER_MODEL` (default: `base`).

Kubernetes manifests are provided in `kubernetes/manifests/ollama-deploy.yaml` and `kubernetes/manifests/whisper-deploy.yaml`. Dual `NetworkPolicy` + `CiliumNetworkPolicy` resources are in `media-netpol.yaml` and `media-cilium-netpol.yaml`.

When you point vision/STT at an **external** provider, its endpoint URL is validated against SSRF on save (must be a public http(s) URL) **and** reached only through the SSRF-guarded fetch at runtime (DNS-resolve + IP-pin + redirect re-validation) — so a DNS-rebind or redirect can't turn it into a request to an internal address. The bundled local Ollama/Whisper providers use a direct fetch (their addresses are private by design).

#### Upload Response

When a media file is uploaded, the response includes an `embeddingStatus` field:

| Value | Meaning |
|---|---|
| `"pending"` | Job enqueued; background worker will process soon |
| `"disabled"` | `MEDIA_EMBEDDING_ENABLED` is `false`; file stored but not embedded |
| `"skipped"` | File exceeds `MAX_FILE_SIZE_BYTES` limit |

While processing, the filemeta record on the file (accessible via `GET /api/brain/spaces/:spaceId/files`) reflects the current status:

| Status | Meaning |
|---|---|
| `"pending"` | Waiting in queue |
| `"processing"` | Currently being processed by the worker |
| `"complete"` | Embedding finished successfully |
| `"failed"` | All retry attempts exhausted; see `mediaJobError` field for details |

#### Recall Results

Recall queries (`recall`, `find_similar`) include embedded media chunks. Each media chunk result has additional fields:

```json
{
  "type": "file",
  "mediaType": "audio",
  "embeddingStatus": "complete",
  "chunkOffsetMs": 12000,
  "chunkDurationMs": 8000,
  "parentFile": {
    "path": "recordings/meeting-2025-01.mp3",
    "description": "Q1 strategy meeting"
  }
}
```

`chunkOffsetMs` and `chunkDurationMs` identify the segment within the original audio or video file. Image results have `chunkIndex: 0` with no time offset.

#### Retry Failed Embedding

To re-queue a failed job:

```http
POST /api/files/:spaceId/retry_embedding?path=uploads/photo.jpg
Authorization: Bearer ythril_…
```

**Response** `202` — job re-queued.

**Response** `404` — file does not exist or has no embedding job.

**Response** `409` — job is currently processing; retry is blocked until it completes.

#### Configuration

All settings can be managed at `GET/PATCH /api/admin/media-config` or via **Settings → Models** in the web UI. Fields set via environment variables are locked (the UI shows an `env` badge; PATCH returns `403` for those fields).

**Changes take effect without a restart.** Provider settings — `visionProvider`/`sttProvider`, the `vision.*`/`stt.*` endpoint, model, and API key, and `fallbackToExternal` — are applied by a dedicated refresh timer that re-reads the config every ~2 s, independent of the job loop. A provider or model switch is therefore picked up within a couple of seconds **even when the queue is empty or a job is stuck on a slow/unreachable provider** — which matters because you often change providers precisely because one is hanging. A job already in flight keeps the provider it started with, so a swap can never happen mid-job.

The worker-tuning fields — `workerConcurrency`, `workerPollIntervalMs`, `workerMaxPollIntervalMs`, `stalledJobTimeoutMs` — are re-read on the worker's poll tick instead. When the queue is idle the worker backs off its poll interval (up to `workerMaxPollIntervalMs`, default 30 s), so a change to one of these can take up to that long to be picked up while idle.

`GET /api/admin/media-config` returns a `providerReloadPending` boolean: `true` briefly after a provider change is saved and before the refresh timer has applied it, then `false`. Use it to show an "applying…" state in a UI.

| Field | Env var | Default | Description |
|---|---|---|---|
| `enabled` | `MEDIA_EMBEDDING_ENABLED` | `true` | Master on/off switch |
| `visionProvider` | `VISION_PROVIDER` | `local` | `local` (Ollama) or `external` (OpenAI-compatible) |
| `sttProvider` | `STT_PROVIDER` | `local` | `local` (Whisper) or `external` (OpenAI-compatible) |
| `vision.baseUrl` | `OLLAMA_URL` | `http://ollama:11434` | Vision service endpoint (short name resolves in both Docker Compose and the K8s `ythril` namespace) |
| `vision.model` | `VISION_MODEL` | `moondream` | Vision model name |
| `vision.apiKey` | `VISION_API_KEY` | — | API key for external vision provider (stored in `secrets.json`, never in `config.json`) |
| `stt.baseUrl` | `WHISPER_URL` | `http://whisper:8000` | STT service endpoint |
| `stt.model` | `WHISPER_MODEL` | `base` | Whisper model size/name |
| `stt.apiKey` | `STT_API_KEY` | — | API key for external STT provider (stored in `secrets.json`) |
| `embedding.provider` | `EMBEDDING_PROVIDER` | `local` | Text-embedding endpoint trust: `local` (bundled ONNX or an internal HTTP endpoint, plain fetch) or `external` (public endpoint, reached through the SSRF-guarded fetch). Config lives at top-level `config.embedding` but is edited on **Settings → Models**. |
| `embedding.baseUrl` | `EMBEDDING_URL` | — | Embedding HTTP endpoint (OpenAI-compatible `/v1/embeddings`). Blank = the bundled in-process ONNX model. |
| `embedding.model` | `EMBEDDING_MODEL` | `nomic-ai/nomic-embed-text-v1.5` | Embedding model. **Changing the model / `dimensions` / `similarity` re-indexes every vector** (the UI requires an explicit confirmation; `POST /api/brain/spaces/:id/reindex` runs it). |
| `embedding.apiKey` | `EMBEDDING_API_KEY` | — | API key for an external embedding endpoint (stored in `secrets.json`, masked in the API). |
| `workerConcurrency` | `WORKER_CONCURRENCY` | `2` | Max parallel jobs |
| `workerPollIntervalMs` | `WORKER_POLL_INTERVAL_MS` | `1000` | Base poll interval (ms) |
| `workerMaxPollIntervalMs` | `WORKER_MAX_POLL_INTERVAL_MS` | `30000` | Max poll interval when idle (ms) |
| `fallbackToExternal` | `MEDIA_EMBEDDING_FALLBACK_TO_EXTERNAL` | `false` | Use external provider if local fails |
| `maxFileSizeBytes` | `MAX_FILE_SIZE_BYTES` | `524288000` | Skip embedding for files above this size (500 MiB) |
| `stalledJobTimeoutMs` | `STALLED_JOB_TIMEOUT_MS` | `300000` | Re-queue jobs stuck in processing for > N ms |

#### ISO 27001 / Data Egress Note

When `visionProvider: external` or `sttProvider: external`, file bytes (image frames, audio segments) are transmitted to the configured external endpoint. Ensure the endpoint URL complies with your data residency and privacy requirements. Using `visionProvider: local` and `sttProvider: local` with on-premises Ollama and Whisper keeps all data within your infrastructure.

---

### Face Recognition Pipeline

The face recognition pipeline detects and embeds faces in uploaded images, builds a per-space face gallery, and automatically links images to person entities when a match exceeds a configurable confidence threshold. It runs **entirely in-process** on the CPU — no GPU, no sidecar, no Python — using `@vladmandic/human` (TF.js CPU backend).

**Opt-in** — disabled by default. Enable via `mediaEmbedding.faceRecognition.enabled: true` in `config.json`.

#### Prerequisites: Model Files

The model files are not bundled with Ythril. Download and place them in `DATA_ROOT/<modelPath>/` (default: `human-models/`):

| File | Size | Purpose |
|---|---|---|
| `blazeface-back.json` + `.bin` | ~0.5 MB | Face detector (BlazeFace Back) |
| `faceres.json` + `.bin` | ~6.7 MB | 128-dimensional face descriptor (FaceRes) |

Download from `https://vladmandic.github.io/human/models/` — use the exact filenames listed above.

Also create the Atlas vector index for face embeddings (per space, 128 dimensions, cosine similarity, field path `faceEmbedding`, index name `{spaceId}_files_faceEmbedding`) on the `{spaceId}_files` collection. This is done automatically when a space is initialised if face recognition is enabled.

#### How It Works

When a media-embedding job processes an image and `faceRecognition.enabled` is `true`:

1. **Decode** — image bytes decoded to raw RGBA via `sharp`.
2. **Detect** — `@vladmandic/human` runs BlazeFace Back detection. Faces below `minFaceSizeFraction` (default: 5% of the shorter image side) are skipped.
3. **Embed** — FaceRes produces a 128-dimensional descriptor per face.
4. **Gallery search** — each descriptor is searched against the space's face gallery (all face-chunk records that have a `faceEntityId`) using an exact `$vectorSearch`. The top-1 result is examined.
5. **Auto-label** — if the top match's cosine similarity score ≥ `confidenceThreshold` (default: `0.6`), the parent image is linked to that entity (`entityIds` updated). The first successful match wins.
6. **Persist face-chunks** — one `{fileId}#face-chunk{N}` filemeta record per detected face is written (or replaced on reprocess) with:
   - `faceEmbedding` — the 128d descriptor
   - `faceBbox` — normalised `[x, y, w, h]` bounding box
   - `faceEntityId` — populated if auto-labeled or manually labeled
   - `faceScore` — cosine similarity of the gallery match (when auto-labeled)
   - `parentFileId` — the original image's filemeta `_id`

#### Gallery Poisoning Guard

Only entities whose `type` is listed in `personEntityTypes` (default `["person"]`) are eligible for the face gallery. When a user manually links an image to an entity via `updateFileMeta`:

- If exactly one `personEntityTypes` entity is in `entityIds`, all face-chunks of that file are immediately updated with `faceEntityId` — the labeled face enters the gallery at once.
- If zero or more than one person-type entity is present, no gallery entry is made. This prevents a "group photo" from poisoning the gallery with an ambiguous identity.

#### Manual Label Propagation

When a user manually updates `entityIds` on an image (e.g. correcting a mis-label via the Files UI or REST API), Ythril calls `propagateFaceLabel` — which sets `faceEntityId` on every face-chunk record belonging to that file. This immediately improves future auto-labeling for that person's identity.

#### Synced Image Reprocessing

When `reprocessSyncedImages: true` (default), images received through a network sync are automatically enqueued for face processing if they have not yet been processed (`faceChunkCount` is `0`). This lets secondary instances build a full face gallery from synced images without requiring separate re-uploads.

Set `reprocessSyncedImages: false` to restrict gallery building to images uploaded directly to each instance.

#### MongoDB Atlas Vector Index

Face recognition requires a dedicated Atlas vector search index per space. Name: `{spaceId}_files_faceEmbedding`, field: `faceEmbedding`, dimensions: `128`, similarity: `cosine`. This is distinct from the text embedding index used by `recall`.

When the face recognition feature is first enabled, any existing `initSpace` call will create the required index. If you add the feature after spaces already exist, re-run `initSpace` for each space or create the index manually via the Atlas UI / MongoDB admin API.

#### Configuration Reference

All settings live under `mediaEmbedding.faceRecognition` in `config.json`. None are controllable via the `PATCH /api/admin/media-config` endpoint (face recognition is a local-only feature; no external service is involved).

| Field | Default | Description |
|---|---|---|
| `enabled` | `false` | Master switch. When false, face detection is completely skipped. |
| `confidenceThreshold` | `0.6` | Cosine similarity score (0–1) required for auto-labeling. Lower values label more aggressively; higher values require a closer match. Tune upward as your gallery grows. |
| `minFaceSizeFraction` | `0.05` | Minimum face bounding-box size as a fraction of the image's shorter side. Faces smaller than this are skipped (avoids noise from crowd shots or background faces). |
| `modelPath` | `"human-models"` | Path relative to `DATA_ROOT` where the BlazeFace and FaceRes model files are located. |
| `personEntityTypes` | `["person"]` | Entity type names that qualify as people. Only entities with a `type` in this list are eligible to enter the face gallery. Extend this list if you use custom type names like `"contact"` or `"employee"`. |
| `reprocessSyncedImages` | `true` | When true, images received via network sync are automatically re-enqueued for face processing if they haven't been processed yet. Set to false to keep gallery building local-origin only. |

**Example `config.json` excerpt:**

```json
{
  "mediaEmbedding": {
    "enabled": true,
    "faceRecognition": {
      "enabled": true,
      "confidenceThreshold": 0.65,
      "minFaceSizeFraction": 0.05,
      "modelPath": "human-models",
      "personEntityTypes": ["person", "contact"],
      "reprocessSyncedImages": true
    }
  }
}
```

#### ISO 27001 Note

Face embeddings (128d float vectors) are stored in MongoDB. They are not reversible to images; they cannot reconstruct a face. No face data is transmitted to any external service — all inference is in-process. If your data residency policy classifies biometric-derived data, ensure your MongoDB instance and backup destinations comply.

---

## Spaces API

Base path: `/api/spaces`

### List Spaces

```http
GET /api/spaces
GET /api/spaces?counts=true
```

Returns spaces accessible to the requesting token. Tokens with a `spaces`
scope restriction only receive spaces in their allowlist; full-access tokens
receive all spaces.

Add `?counts=true` to include per-space document counts (memories, entities,
edges, chrono). Useful for agents deciding which spaces are populated and
worth querying.

**Response** `200`:

```json
{
  "spaces": [
    {
      "id": "general",
      "label": "General",
      "builtIn": true,
      "description": "Default workspace space.",
      "counts": { "memories": 42, "entities": 10, "edges": 5, "chrono": 3 },
      "usageGiB": 0.05
    }
  ],
  "storage": {
    "usageGiB": { "files": 0.02, "brain": 0.03, "total": 0.05 },
    "limits": { "totalLimitGiB": 200, "warnAtPercent": 80 }
  }
}
```

> **Note:** `counts` fields are only present when `?counts=true` is passed. `storage.usageGiB` is the instance total (files + brain), and `storage.limits` echoes the configured quota (`totalLimitGiB`, `warnAtPercent`); each space object also carries its own `usageGiB` number.

---

### Create a Space

**Admin only** — `POST /api/spaces` requires an admin token (and a valid `X-TOTP-Code` when MFA is enabled); it is `requireAdminMfa`-gated. A non-admin token gets `403`.

```http
POST /api/spaces
Authorization: Bearer <admin-token>
```

```json
{
  "id": "research",
  "label": "Research Notes",
  "description": "Papers, notes, and findings from the AI research team.",
  "folders": ["papers", "notes"],
  "maxGiB": 2
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | no | Lowercase `^[a-z0-9-]+$`, max 40 chars. Auto-generated if omitted. |
| `label` | yes | Human-readable display name, max 200 chars. |
| `description` | no | Max 4000 chars. Surfaced to MCP clients as space-level instructions. |
| `folders` | no | Pre-create these directories on disk at space creation time. |
| `maxGiB` | no | Maximum storage quota for the space (positive number in GiB). |

**Response** `201`: the created space object, wrapped in a `space` field:

```json
{ "space": { "id": "research", "label": "Research Notes", "indexStatus": "building" } }
```

> **Async vector-index build:** creating a real space returns immediately with `indexStatus: "building"`. The space is writable straight away, but semantic `recall` returns no results until the Atlas vector indexes finish building and `indexStatus` flips to `"ready"` (this can take up to a few minutes; a failed build reports `"failed"`). Poll the space via `GET /api/spaces` if you need to gate recall on readiness. Proxy spaces and spaces created before this behaviour have no `indexStatus` and should be treated as ready.

---

### Create a Proxy Space

A proxy space is a virtual space that groups multiple real spaces into a single endpoint. Reads aggregate across all member spaces; writes require a `targetSpace` parameter to specify the destination.

```http
POST /api/spaces
```

```json
{
  "id": "all-research",
  "label": "All Research",
  "description": "Aggregated view of biology and physics research spaces.",
  "proxyFor": ["bio-research", "physics-research"]
}
```

**Rules:**

- All `proxyFor` members must be existing real spaces (not proxies — nesting is not allowed).
- Proxy spaces are virtual: no DB collections or file directories are created.
- Creating the proxy is admin-gated (like any space creation); the create call validates only that each member exists and is not itself a proxy — it does **not** separately check the caller's space allowlist. (Per-space access is enforced at read/write time on the proxy's member spaces.)
- The single-element wildcard `"proxyFor": ["*"]` creates an **all-spaces** proxy: it aggregates over every real space the caller can access (resolved dynamically), skipping per-member validation. The wildcard cannot be mixed with explicit member IDs.

**Read operations** (GET memories, entities, edges, files, recall, query) aggregate results across all member spaces transparently.

**Write operations** (POST memories, write_file, upsert_entity, etc.) require a `targetSpace` query parameter:

```http
POST /api/brain/spaces/all-research/memories?targetSpace=bio-research
```

```json
{ "fact": "CRISPR efficiency improved by 40% with new guide RNA design." }
```

The `targetSpace` must be one of the proxy's `proxyFor` members. Omitting it on a write returns `400`.

**MCP**: When connected via MCP to a proxy space, read tools (`recall`, `query`, `read_file`, `list_dir`) aggregate automatically. Write tools (`remember`, `upsert_entity`, `write_file`, etc.) accept an optional `targetSpace` argument — required when the MCP endpoint is a proxy space.

---

### Rename a Space

```http
PATCH /api/spaces/:id/rename
Content-Type: application/json
Authorization: Bearer <admin-token>

{ "newId": "new-space-name" }
```

`newId` must be lowercase alphanumeric + hyphens, 1-40 chars (`/^[a-z0-9-]+$/`).

The rename atomically:

- Moves all MongoDB collections (memories, entities, edges, chrono, tombstones, files, etc.) to the new prefix.
- Moves the file directory from `/data/files/{old}` to `/data/files/{new}`.
- Updates all network `spaces[]` arrays and adds a `spaceMap` entry so peers continue syncing.
- Updates all token `spaces[]` scopes that referenced the old ID.

**Response** `200`:

```json
{ "space": { "id": "new-space-name", "label": "My Space", ... } }
```

| Status | Meaning |
|--------|---------|
| `400`  | Invalid `newId` format, or trying to rename a built-in space (e.g. `general`) |
| `404`  | Source space does not exist |
| `409`  | `newId` already exists |
| `500`  | Partial rename failure (collections may be in an inconsistent state) |

---

### Update a Space

```http
PATCH /api/spaces/:id
```

Update space properties. Requires an admin token (+ TOTP if MFA is enabled). At least one of `label`, `description`, or `meta` must be provided.

```json
{
  "label": "Research Notes (Updated)",
  "description": "Updated description surfaced to MCP clients as space-level instructions.",
  "meta": {
    "purpose": "Team engineering knowledge base.",
    "validationMode": "strict",
    "typeSchemas": {
      "entity": {
        "service": {
          "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
          "tagSuggestions": ["backend", "frontend", "infra"],
          "propertySchemas": {
            "status": { "type": "string", "enum": ["active", "deprecated", "planned"], "required": true },
            "score":  { "type": "number", "minimum": 0, "maximum": 100, "mergeFn": "avg" }
          }
        },
        "team": {},
        "technology": {},
        "concept": {}
      },
      "edge": {
        "depends_on": {},
        "owns": {},
        "related_to": {}
      },
      "memory": {
        "default": {
          "propertySchemas": {
            "count": { "type": "number", "mergeFn": "sum" }
          }
        }
      }
    },
    "tagSuggestions": ["backend", "frontend", "infra"],
    "strictLinkage": true
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `label` | no | New display name, max 200 chars. |
| `description` | no | Space description, max 4000 chars. Included in `list_spaces` MCP tool responses and `GET /api/spaces`. |
| `meta` | no | Space schema definition (see [Schema Validation](#schema-validation) below). |

**Response** `200`: the updated space object.

If the space participates in a network and `meta` is included, the update triggers a governance vote and returns `202`:

```json
{ "status": "vote_pending", "rounds": [...], "message": "Meta change requires network vote" }
```

> **MCP tool:** `update_space` — accepts `label` and `description`. Requires `admin: true`.

---

### Get Space Meta

```http
GET /api/spaces/:id/meta
Authorization: Bearer <token>
```

Returns the full schema definition for a space along with derived stats.

**Response** `200`:

```json
{
  "spaceId": "eng-kb",
  "spaceName": "Engineering Knowledge Base",
  "purpose": "Team engineering knowledge base.",
  "usageNotes": "Markdown-formatted usage guidance for the web UI.",
  "validationMode": "strict",
  "typeSchemas": {
    "entity": {
      "service": {
        "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
        "tagSuggestions": ["backend", "frontend"],
        "propertySchemas": {
          "status": { "type": "string", "enum": ["active", "deprecated"], "required": true }
        }
      },
      "team": {}
    },
    "edge": {
      "depends_on": {},
      "owns": {}
    }
  },
  "tagSuggestions": ["backend", "frontend"],
  "stats": { "memories": 142, "entities": 53, "edges": 87, "chrono": 12, "files": 31 }
}
```

> **MCP tool:** `get_space_meta` — returns the same information. Available to all tokens (not admin-only).

---

### Get Single Type Definition

```http
GET /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
Authorization: Bearer <token>
```

Returns a single type definition from the space's `typeSchemas`. `:knowledgeType` must be one of `entity`, `memory`, `edge`, `chrono`.

**Response** `200`:

```json
{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": {
    "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
    "tagSuggestions": ["backend", "frontend"],
    "propertySchemas": {
      "status": { "type": "string", "enum": ["active", "deprecated"], "required": true }
    }
  }
}
```

Returns `404` when the space or the requested type name does not exist. Returns `400` for an invalid `:knowledgeType`.

---

### Replace Full Schema (Bulk Overwrite)

```http
PUT /api/spaces/:id/schema
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Full-replace semantics for the entire `meta.typeSchemas` map. Use this when you want to overwrite all type definitions across all knowledge types in a single call (for example, restoring an exported schema). For incremental updates, prefer `PUT /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName` (single type) or `PATCH /api/spaces/:id` (deep-merge).

Before the new schema is written, the previous `typeSchemas` is automatically backed up to `_schema-backup-<ISO-timestamp>.json` inside the space's file store, so a bad replacement can be recovered or re-imported. Backup write failures are logged but never block the replacement.

`$ref` values inside any property schema are validated against the instance's schema library — unknown refs return `422` with the list of missing entries.

**Request body**:

```json
{
  "typeSchemas": {
    "entity": {
      "service": { "namingPattern": "^[a-z][a-z0-9-]{1,60}$" },
      "person":  {}
    },
    "memory": { "decision": {} },
    "edge":   { "depends_on": {} },
    "chrono": { "release": {} }
  }
}
```

**Response** `200` — the updated space document.

**Errors:**

- `400` — body fails `TypeSchemas` Zod validation.
- `404` — space not found.
- `422` — one or more `$ref` values point at non-existent schema-library entries.

---

### Upsert Single Type Definition

```http
PUT /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Adds or updates a single type definition in the space's `typeSchemas`. All other type definitions (including those of other knowledge types) are left unchanged. The request body is a `TypeSchema` object.

**Request body**:

```json
{
  "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
  "tagSuggestions": ["backend", "frontend"],
  "propertySchemas": {
    "status": { "type": "string", "enum": ["active", "deprecated"], "required": true }
  }
}
```

An empty object `{}` is valid and registers the type name as allowed (no extra constraints).

**Response** `200`:

```json
{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { "..." : "..." }
}
```

**Constraints:**

- `:knowledgeType` must be one of `entity`, `memory`, `edge`, `chrono`.
- The body is validated with the same `TypeSchema` Zod rules as the full `PATCH /api/spaces/:id` endpoint (property schema `mergeFn`/`type` compatibility, field max lengths, etc.).
- At most 200 type definitions per knowledge type. Adding a 201st type returns `400`.
- The meta version counter is incremented and the previous version is pushed to history (same as full PATCH).

---

### Delete Single Type Definition

```http
DELETE /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
Authorization: Bearer <admin-token>
```

Removes a single type definition from the space's `typeSchemas`. All other types are left unchanged.

**Response** `204` (no body) on success.

Returns `404` when the space or type name does not exist. Returns `400` for an invalid `:knowledgeType`.

---

### Validate Schema (Dry Run)

```http
POST /api/spaces/:id/validate-schema
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Scans existing data against the current (or proposed) schema definition without writing anything. Pass a `meta` body to test a schema change before applying it, or omit to validate against the current schema.

**Request body** (optional):

```json
{
  "meta": {
    "validationMode": "strict",
    "typeSchemas": {
      "entity": { "service": {}, "person": {} }
    }
  }
}
```

**Response** `200`:

```json
{
  "spaceId": "eng-kb",
  "meta": { "validationMode": "strict", "typeSchemas": { "entity": { "service": {}, "person": {} } }, "..." : "..." },
  "totalViolations": 3,
  "violations": [
    {
      "collection": "entities",
      "_id": "550e8400-e29b-41d4-a716-446655440000",
      "violations": [
        { "field": "type", "value": "concept", "reason": "not in entityTypes allowlist: Person, Service" }
      ]
    }
  ]
}
```

Scans up to 10,000 documents per collection per member space. Response capped at 500 violations.

---

### Schema Validation

Each space can define a schema in its `meta` block that governs what data is accepted. The `validationMode` controls enforcement:

| Mode | Behaviour |
|------|-----------|
| `off` | No validation (default). All writes accepted. |
| `warn` | Violations are returned as `warnings` in the response but writes proceed. |
| `strict` | Violations cause a `400` with `{ "error": "schema_violation", "violations": [...] }`. |

**Schema structure — `typeSchemas`:**

The schema is expressed as a single `typeSchemas` object on the space `meta`. It groups configuration by knowledge type (`entity`, `edge`, `memory`, `chrono`) and then by type name (e.g. `"service"`, `"depends_on"`). Each entry is a `TypeSchema` object:

```typescript
interface TypeSchema {
  namingPattern?: string;                         // entity only — regex for name validation
  tagSuggestions?: string[];                      // non-enforced tag hints for this type
  propertySchemas?: Record<string, PropertySchema>;
}
interface PropertySchema {
  type?: 'string' | 'number' | 'boolean' | 'date';
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  pattern?: string;    // regex, ReDoS-protected
  mergeFn?: 'avg' | 'min' | 'max' | 'sum' | 'and' | 'or' | 'xor';  // entity merge hint
  required?: boolean;  // if true, property must be present on every write
  default?: string | number | boolean;  // value inserted when property is absent
}
```

**`typeSchemas` example:**

```json
{
  "typeSchemas": {
    "entity": {
      "service": {
        "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
        "tagSuggestions": ["backend", "frontend"],
        "propertySchemas": {
          "status": { "type": "string", "enum": ["active", "deprecated"], "required": true },
          "score":  { "type": "number", "minimum": 0, "maximum": 100, "mergeFn": "avg" }
        }
      },
      "team": {}
    },
    "edge": {
      "depends_on": {},
      "owns": {}
    },
    "memory": {
      "default": {
        "propertySchemas": {
          "confidence": { "type": "number", "minimum": 0, "maximum": 1, "default": 1 }
        }
      }
    },
    "chrono": {
      "milestone": {
        "tagSuggestions": ["release", "launch"]
      }
    }
  }
}
```

What the schema enforces:

- **Entity type allowlist** — the keys of `typeSchemas.entity` (e.g. `"service"`, `"team"`) define the allowed entity `type` values (max 200 per knowledge type).
- **Edge label allowlist** — the keys of `typeSchemas.edge` define the allowed edge `label` values.
- **Chrono type allowlist** — the keys of `typeSchemas.chrono` define the allowed `type` values.
- **Memory type allowlist** — the keys of `typeSchemas.memory` define the allowed `type` values.
- **Naming patterns** (`namingPattern`) — per entity type, a regex for validating `name` (max 500 chars, ReDoS-protected).
- **Property value constraints** (`propertySchemas`) — per type, define `type` (string/number/boolean/date), `enum`, `minimum`/`maximum`, `pattern` (regex, ReDoS-protected), `required`, `default`, and `mergeFn`.
- **Tag suggestions** (`tagSuggestions`) — non-enforced hints shown in the UI, per type or globally.

**Top-level `meta` fields:**

| Field | Description |
|-------|-------------|
| `typeSchemas` | Per-type schema definitions (see above). |
| `tagSuggestions` | Global non-enforced tag hints shown in the UI for all knowledge types (max 200). |
| `strictLinkage` | When `true`, all reference fields (`from`/`to`, `entityIds`, `memoryIds`) must be valid UUID v4 values, and entity deletion is blocked while inbound backlinks exist. Default: `false`. |
| `purpose` | Short description of the space (max 4000 chars). Returned by `get_space_meta`. |
| `usageNotes` | Extended Markdown-formatted guidance for LLM clients (max 50 000 chars). Returned by `get_space_meta`. |

Schema validation runs on:

- Individual writes: `POST /entities`, `POST /edges`, `POST /memories`, `POST /chrono`
- Bulk writes: `POST /bulk` (per-item; strict skips violating items, warn records warnings)
- MCP tools: `remember`, `upsert_entity`, `upsert_edge`, `create_chrono`, `bulk_write`

**Security:** Regex patterns in `namingPattern` and `propertySchemas.pattern` are protected against ReDoS: patterns are limited to 500 characters, test values to 10K characters, and structural analysis rejects nested quantifiers and alternation-with-quantifier patterns.

**`mergeFn` in `propertySchemas`:** Optional merge function for entity properties. Used as the default `suggestedFn` when merging entities via `POST /entities/:survivorId/merge/:absorbedId`. Valid values depend on the declared `type`:

| Type | Valid `mergeFn` values |
|------|----------------------|
| `number` | `avg`, `min`, `max`, `sum` |
| `boolean` | `and`, `or`, `xor` |
| `string` | *(not supported — merge resolution is always explicit)* |

Incompatible `mergeFn`/`type` combinations (e.g. `sum` on `boolean`) are rejected with `400` at schema save time.

---

### Schema Library

The Schema Library is an instance-level store of reusable `TypeSchema` definitions. Spaces can reference a library entry with `$ref` instead of duplicating the inline schema. Editing a library entry is reflected in every referencing space immediately — no space re-patch is needed.

Library entries are stored in `schema-library.json` (sibling to `config.json`). Max 500 entries per instance.

**Entry structure:**

```json
{
  "name": "service-v1",
  "knowledgeType": "entity",
  "typeName": "service",
  "description": "Standard service entity schema",
  "schema": {
    "namingPattern": "^[a-z][a-z0-9-]{1,60}$",
    "tagSuggestions": ["backend", "frontend"],
    "propertySchemas": {
      "owner": { "type": "string", "required": true },
      "status": { "type": "string", "enum": ["active", "deprecated"] }
    }
  },
  "createdAt": "2026-04-22T10:00:00.000Z",
  "updatedAt": "2026-04-22T10:00:00.000Z"
}
```

**Name format:** `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$` — alphanumeric (upper and lower), dots, dashes, and underscores. May not start with a dash, dot, or underscore. Max 200 characters.

#### List all entries

```http
GET /api/schema-library
Authorization: Bearer <token>
```

**Response** `200`:

```json
{ "entries": [ { "name": "...", ... } ] }
```

#### Get a single entry

```http
GET /api/schema-library/:name
Authorization: Bearer <token>
```

**Response** `200 { "entry": { ... } }` or `404`.

#### Get usages of an entry

Returns every space type definition that references this library entry via `$ref`.

```http
GET /api/schema-library/:name/usages
Authorization: Bearer <token>
```

**Response** `200`:

```json
{
  "usages": [
    {
      "spaceId": "my-space",
      "spaceLabel": "My Space",
      "knowledgeType": "entity",
      "typeName": "service"
    }
  ]
}
```

Returns an empty `usages` array if no space references the entry (including for names that do not exist in the library). Use this endpoint before deleting an entry to identify which spaces would lose their schema reference.

> **Library mutations require an admin token** — `POST`, `PUT`, and `DELETE` below are all admin-gated and MFA-protected (`requireAdminMfa`): send `Authorization: Bearer <admin-token>` and, when MFA is enabled, an `X-TOTP-Code: <code>` header, or the call returns `403`. The read endpoints (list, get, `…/usages`) accept any valid token.

#### Create an entry

```http
POST /api/schema-library
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "service-v1",
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { "propertySchemas": { "owner": { "type": "string", "required": true } } },
  "description": "optional"
}
```

**Response** `201 { "entry": { ... } }`. Returns `409` if the name already exists (use `PUT` to update). Returns `400` for invalid payloads.

#### Create or replace an entry

```http
PUT /api/schema-library/:name
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { ... },
  "description": "optional"
}
```

**Response** `201` (created) or `200` (replaced). Returns `400` for invalid name format or payload.

#### Delete an entry

```http
DELETE /api/schema-library/:name
Authorization: Bearer <admin-token>
```

**Response** `204`. Returns `404` if not found.

> **Safe deletion:** Before deleting an entry, call `GET /api/schema-library/:name/usages` to find all spaces that reference it. For each usage, `PUT /api/spaces/:spaceId/meta/typeSchemas/:kt/:typeName` with the inline schema (copied from the library entry) to replace the `$ref` with a standalone definition. Once all references are replaced, the `DELETE` can proceed without breaking any space's validation.
>
> The admin UI performs this sequence automatically — it shows a warning with the affected spaces and an **Unlink & Delete** button that handles the replacement before deleting.

#### Schema groups

Library entries can carry a `schemaGroup` tag, letting a related set of type schemas be exported from and applied to spaces as a unit.

```http
GET /api/schema-library/groups
Authorization: Bearer <token>
```

**Response** `200 { "groups": [ { "name", "count" } ] }` — every distinct `schemaGroup` with the number of entries in it, sorted by name.

```http
POST /api/schema-library/export-space
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "spaceId": "research", "groupName": "research-schemas", "namePrefix": "research" }
```

Creates or updates one library entry per **inline** type schema in the space's `meta.typeSchemas`, tagging them all with `groupName` (`$ref` entries are skipped — they are already library-backed). Entry names are derived as `<namePrefix|groupName>-<knowledgeType>-<typeName>`. **Response** `200 { "created", "updated", "entries": [ ... ] }`. Requires an admin token (and MFA when enabled).

```http
POST /api/schema-library/groups/:group/apply
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "spaceId": "research-2" }
```

Injects a `$ref` into the target space's `typeSchemas` for every library entry in `:group`, wiring the space to the shared definitions. **Response** `200` with the applied entries; `404` if the group has no entries or the space does not exist. Requires an admin token (and MFA when enabled).

#### Using `$ref` in space typeSchemas

A space type definition can reference a library entry instead of embedding the schema inline:

```json
{
  "meta": {
    "validationMode": "strict",
    "typeSchemas": {
      "entity": {
        "service": { "$ref": "library:service-v1" }
      }
    }
  }
}
```

`resolveMetaRefs()` resolves all `$ref` pointers from the library before validation runs. Unresolvable refs (entry not found, or unknown `$ref` format) silently degrade to an empty schema — no constraints are applied, which is identical to the behaviour for an undefined type.

`$ref` and inline fields are mutually exclusive: a `TypeSchema` that contains `$ref` must not also contain `namingPattern`, `propertySchemas`, etc.

#### Publish an entry (make publicly accessible)

An entry can be published so that unauthenticated callers on the open internet can fetch it and import it into their own instance.

```http
PATCH /api/schema-library/:name/publish
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "published": true }
```

To unpublish, send `{ "published": false }`.

**Response** `200 { "entry": { ... } }` (full updated entry). Returns `404` if the entry does not exist. Requires an **admin token**; returns `403` otherwise.

> **Security note:** Publishing only exposes the schema definition (field types, constraints, naming patterns, tag suggestions). It never exposes space data, memories, or any other tenant information.

#### Public listing

Returns all published entries. Rate-limited at 60 requests/minute per IP.

```http
GET /api/schema-library/public
```

No `Authorization` header is required for open instances. When the remote instance is behind an auth proxy (e.g. Cloudflare Access), pass a **library access token** as a Bearer credential:

```http
Authorization: Bearer <schemaLibrary-token>
```

An invalid or wrong-scope token returns `401`/`403`. A missing token on an open instance is accepted.

**Response** `200`:

```json
{
  "entries": [
    {
      "name": "service-v1",
      "knowledgeType": "entity",
      "typeName": "service",
      "description": "Standard service entity schema",
      "updatedAt": "2026-04-22T10:00:00.000Z"
    }
  ]
}
```

The listing exposes only metadata — the `schema` object is omitted. Fetch the individual entry to obtain the full schema.

#### Public single entry (unauthenticated)

```http
GET /api/schema-library/public/:name
```

**Response** `200 { "entry": { ... } }` — full entry including `schema`. Returns `404` if the entry does not exist or is not published.

---

#### Foreign catalogs

A **foreign catalog** is a link to another Ythril instance's public schema library. Linking a catalog lets you browse its published entries and import them into your own library. Imports are copied locally — they do not create live dependencies.

Catalog links are stored in `schema-catalogs.json` (sibling to `config.json`). Max 50 catalog links per instance.

##### List catalogs

```http
GET /api/schema-library/catalogs
Authorization: Bearer <token>
```

**Response** `200 { "catalogs": [ { "name", "url", "description", "createdAt", "hasAccessToken" } ] }`.

`hasAccessToken` is `true` when a library access token is stored for this catalog (used to authenticate against the remote). The plaintext token is never returned.

##### Add a catalog link

```http
POST /api/schema-library/catalogs
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "acme-schemas",
  "url": "https://brain.acme.example/api/schema-library",
  "description": "ACME Corp shared schema catalog",
  "accessToken": "ythril_xK9mPq..."
}
```

**Fields:**

| Field | Required | Notes |
|---|---|---|
| `name` | ✓ | Unique catalog ID: `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$` |
| `url` | ✓ | Base URL of the remote schema library. Must be HTTPS; private/loopback addresses are rejected (SSRF protection). |
| `description` | — | Free text, up to 500 characters. |
| `accessToken` | — | A library access token issued by the remote instance. Required only when the remote's `/public` endpoint is behind an auth proxy (e.g. Cloudflare Access). Write-only: it is never returned in list or get responses — only `hasAccessToken: true/false` is exposed. It is held in the instance config directory, which is created with owner-only (`0600`) permissions. |

**Responses:** `201 { "catalog": { ..., "hasAccessToken": true } }`, `400` (invalid URL/name), `409` (name already exists), `400` (SSRF-blocked URL).

> **SSRF protection:** Private-range IPs (`10.x`, `172.16–31.x`, `192.168.x`), CGNAT (`100.64–127.x`), loopback (`127.x`, `::1`), link-local/IMDS (`169.254.x`, `169.254.169.254`), IPv6 ULA (`fc00::/7`), and GCP metadata are rejected — in every host encoding, including decimal/hex/octal/short-form IPv4 (e.g. `2130706433`, `0x7f000001`, `127.1`) and IPv4-mapped IPv6 (`[::ffff:127.0.0.1]`). The target hostname is also resolved via DNS and every resolved address is validated, so a public name that points at an internal host is rejected too. Only the HTTPS scheme is accepted.

##### Remove a catalog link

```http
DELETE /api/schema-library/catalogs/:name
Authorization: Bearer <admin-token>
```

**Response** `204`. Returns `404` if not found. Removing a catalog link does not delete any entries that were already imported from it.

##### Browse a foreign catalog

Proxies a request to the remote catalog's public listing endpoint. Requires authentication on the local instance (the remote endpoint is public).

```http
GET /api/schema-library/catalogs/:name/entries
Authorization: Bearer <token>
```

**Response** `200 { "catalog": "acme-schemas", "entries": [ { name, knowledgeType, typeName, description, updatedAt } ] }`.

Returns `404` if the catalog link is unknown. Returns `502` if the remote endpoint returns a non-200 response **or the request times out** (8 s). (A `504` is only produced when the remote itself responds with `504`.)

##### Fetch a single entry from a foreign catalog

```http
GET /api/schema-library/catalogs/:name/entries/:entryName
Authorization: Bearer <token>
```

**Response** `200 { "catalog": "acme-schemas", "entry": { ... } }` — full entry including `schema`. Returns `404` or `502` as above.

Use this endpoint to obtain the full schema before importing. To import, call `PUT /api/schema-library/:name` on your local instance with the fetched schema. Pass `sourceCatalog` in the body to record the origin:

```json
{
  "knowledgeType": "entity",
  "typeName": "service",
  "schema": { "..." },
  "description": "Imported from acme-schemas",
  "sourceCatalog": "acme-schemas"
}
```

---

```http
DELETE /api/spaces/:id
Content-Type: application/json

{ "confirm": true }
```

**Response** `204`. If the space participates in a network, deletion requires a governance vote.

If cleanup partially fails (e.g. a collection drop or file deletion errors), the server returns `500` with error details. The space is **not** removed from config so the deletion can be retried. Check the response body for specifics:

```json
{ "error": "Space 'research' cleanup incomplete (2 error(s)). Space was NOT removed from config. ..." }
```

---

## Tokens API

Base path: `/api/tokens`.

- `GET /api/tokens/me` requires any valid token.
- The read-only list `GET /api/tokens` requires an **admin** token (but not MFA).
- All **mutating** token routes (create/delete/regenerate) require admin scope **and** MFA where enabled.

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

> **The `plaintext` field is shown once.** Store it immediately.

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

### Revoke a Token

```http
DELETE /api/tokens/:id
```

**Response** `204`.

---

## Networks API

Base path: `/api/networks` — requires `admin` token.

### List Networks

```http
GET /api/networks
```

**Response** `200`:

```json
{
  "networks": [
    {
      "id": "net-uuid",
      "label": "Team Sync",
      "type": "closed",
      "spaces": ["general"],
      "members": [
        {
          "instanceId": "peer-uuid",
          "label": "Peer Brain",
          "url": "https://peer.example.com",
          "direction": "both"
        }
      ]
    }
  ]
}
```

---

### Get Network

```http
GET /api/networks/:id
```

Returns one network object (same shape as entries in `GET /api/networks`).

**Response** `200` on success, `404` when the network does not exist.

---

### Create a Network

```http
POST /api/networks
```

```json
{
  "label": "Team Sync",
  "type": "closed",
  "spaces": ["general"],
  "votingDeadlineHours": 24,
  "syncSchedule": "*/5 * * * *",
  "requireSignedVotes": false
}
```

**Network types**: `closed` (unanimous vote), `democratic` (majority), `club` (proposer only), `braintree` (tree hierarchy), `pubsub` (auto-join publisher/subscriber, push-only).

**`requireSignedVotes`** (optional, default `false`): when `true`, governance vote casts must carry a valid Ed25519 signature from the voting member (strict mode). Leave it off until every member has synced at least once so their signing keys are published; then enable it (also settable via `PATCH`) to reject any unsigned or forged vote. See [Sync Protocol → Signed vote casts](sync-protocol.md).

**`syncSchedule`** (optional): how often this network syncs automatically. Give a standard **cron expression** (e.g. `"*/5 * * * *"` = every 5 minutes, `"0 * * * *"` = hourly) — the same node-cron engine the backup scheduler uses. Two legacy shorthands are also accepted and translated to cron: `"*/N minutes"` / `"every Nm"` (1–59) and `"*/N hours"` / `"every Nh"` (1–23). Omit it (or set it empty) for manual-sync only. An unrecognised value is ignored with a startup warning, leaving the network on manual sync.

**Response** `201`: the created network object.

---

### Delete a Network

```http
DELETE /api/networks/:id
```

Broadcasts `member_departed` to all peers. **Response** `204` on success, or `200` with `{ ok: true, warnings: [...] }` if some peer notifications failed.

---

### Update a Network

```http
PATCH /api/networks/:id
```

```json
{ "syncSchedule": "*/10 * * * *", "label": "Renamed", "requireSignedVotes": true }
```

---

### Add a Member (Manual)

```http
POST /api/networks/:id/members
```

```json
{
  "instanceId": "peer-instance-uuid",
  "label": "Remote Brain",
  "url": "https://remote.example.com",
  "token": "ythril_peerToken...",
  "direction": "both"
}
```

In `closed`/`democratic` networks this opens a voting round.
In `club` networks the member is added immediately.
In `braintree` networks all ancestors up to the root must approve.
In `pubsub` networks the subscriber is added immediately with `direction` forced to `push` (publisher pushes to subscriber) regardless of the request body value.

---

### Join via Invite Key

```http
POST /api/networks/:id/join
```

```json
{
  "inviteKey": "the-shared-key",
  "instanceId": "my-uuid",
  "label": "My Brain",
  "url": "https://me.example.com",
  "token": "ythril_myToken..."
}
```

**Response** — depends on the network's governance:

- `club` / `pubsub`: `200` `{ "status": "joined", "members": [...], "networkId": "..." }` — direct join, no vote.
- `closed` / `democratic` / `braintree`: `202` `{ "status": "vote_pending", "roundId": "..." }` — the member
  is **held in the vote round** (no sync possible) until the required voters approve (closed: all members;
  democratic: majority; braintree: every ancestor from the inviting node to the root). Exception: a join on a
  braintree **root** concludes immediately (the root is the only required voter) and returns `200 joined`.
- In a braintree the joiner always becomes a **child of the instance it joins through**; `parentInstanceId`
  and `direction` from the request body are ignored for braintree joins.

The invite key is consumed when the round opens (pubsub keys stay reusable). **Re-presenting the same key
with the same `instanceId` polls the outcome**: `202` while the vote is open, `200 joined` with the member
list once admitted, `403` if the round was vetoed or expired.

---

### Cast a Vote

```http
POST /api/networks/:id/votes/:roundId
```

```json
{ "vote": "yes" }
```

Accepted values: `yes`, `veto`.

---

### List Open Vote Rounds

```http
GET /api/networks/:id/votes
```

**Response** `200`:

```json
{
  "rounds": [
    {
      "roundId": "round-uuid",
      "type": "join",
      "subjectInstanceId": "peer-uuid",
      "deadline": "2026-04-12T12:00:00.000Z",
      "votes": []
    }
  ]
}
```

Only non-concluded rounds are returned.

---

### Generate an Invite Key

```http
POST /api/networks/:id/invite
```

**Response** `200`:

```json
{
  "inviteKey": "ythril_invite_...",
  "networkId": "net-uuid",
  "reusable": false,
  "note": "Store this key securely — it is single-use and will not be shown again"
}
```

For `pubsub` networks, `reusable` is `true` and the note explains the key can be shared publicly.

To rotate/revoke the current key, call this endpoint again — the newly generated key replaces the previous hash.

---

### Join Remote (RSA Handshake)

```http
POST /api/networks/join-remote
```

```json
{
  "handshakeId": "uuid",
  "inviteUrl": "https://remote.example.com/api/invite/apply",
  "rsaPublicKeyPem": "-----BEGIN PUBLIC KEY-----\n...",
  "networkId": "net-uuid",
  "myUrl": "https://me.example.com",
  "spaceMap": {
    "remote-space-id": "local-space-id"
  }
}
```

Executes the full 3-step RSA handshake server-side. No plaintext tokens cross the wire.

**`spaceMap`** (optional) — a `Record<string, string>` that maps remote space IDs to local space IDs. Use this when a remote space name collides with an existing local space and you want to alias it to a different local name instead of merging. If omitted, remote space IDs are used as-is (identity mapping). The map is persisted on the `NetworkConfig` and used by the sync engine to translate space IDs during pull and push.

### Join Troubleshooting: private or local URLs rejected

If join fails with a validation error like:

```json
[
  {
    "code": "custom",
    "path": ["instanceUrl"],
    "message": "Peer URL must use http(s) and must not target private IPs, loopback, ULA/link-local IPv6, cloud metadata endpoints, or include embedded credentials"
  }
]
```

the peer URL failed SSRF-safe validation.

Blocked examples:

- `http://localhost:3200`
- `http://127.0.0.1:3200`
- `http://192.168.1.50:3200`
- `http://10.0.0.20:3200`
- `http://[fd00::1]:3200`
- URLs with embedded credentials like `https://user:pass@host.example.com`

Allowed examples:

- `https://brain-a.example.com`
- `https://sync.mycompany.tld`

What to do:

1. Use a publicly reachable URL for the joining brain (`myUrl` / `instanceUrl`) and inviter `inviteUrl`.
2. Ensure both brains can reach each other over that URL.
3. Retry the join flow with updated URLs.

Notes:

- This validation is enforced for `Join via Invite Key`, `Join Remote`, and invite `apply` payloads.
- There is no runtime toggle to allow private or loopback peer URLs in these endpoints. `SYNC_ALLOW_PRIVATE_PEERS` (and the `allowPrivatePeers` config key) relaxes only the sync-time/gossip URL check used when connecting to and storing already-known peers; the join / member-add URL validation shown here always uses the strict SSRF check regardless of that setting.

---

### Sync History

```http
GET /api/networks/:id/sync-history?limit=20
```

**Response** `200`:

```json
{
  "history": [
    {
      "_id": "...",
      "networkId": "...",
      "triggeredAt": "2026-03-26T12:00:00.000Z",
      "completedAt": "2026-03-26T12:00:02.500Z",
      "status": "success",
      "pulled": { "memories": 5, "entities": 2, "edges": 1, "files": 0 },
      "pushed": { "memories": 3, "entities": 0, "edges": 0, "files": 1 },
      "errors": []
    }
  ]
}
```

`limit` defaults to 20, max 100. Ordered most-recent-first. The last 100 records per network are retained; older entries are pruned automatically.

---

### Fork a Network

```http
POST /api/networks/:id/fork
```

```json
{
  "label": "My fork",
  "type": "closed",
  "votingDeadlineHours": 24,
  "spaces": ["space-id-1"]
}
```

Creates a new independent network from your local copy of the data.

| Field | Required | Description |
|---|---|---|
| `label` | Yes | Name for the new network |
| `type` | No | `closed` (default) or `club` |
| `votingDeadlineHours` | No | Defaults to source value, or 24 |
| `spaces` | Conditional | Required if ejected; optional if still a member |

**Scenarios:**

- **Still a member** — spaces and deadline inherited from source; can be overridden.
- **Ejected** — source config is deleted on `member_removed`; `spaces` must be supplied explicitly.
- **Unknown ID** — `404`.

The fork gets a fresh UUID, no members, no pending rounds. You become the root.

---

### Remove a Member

```http
DELETE /api/networks/:id/members/:instanceId
```

In `closed`/`democratic` networks this opens a removal voting round (**202**). In `club` networks the member is removed immediately (**204**). In `braintree` networks the ancestor path must vote; if the subject is a direct child, the round auto-concludes.

**Response** `204` (immediate removal) or `202`:

```json
{ "status": "vote_pending", "roundId": "round-uuid" }
```

---

### Rotate the Instance Signing Key

```http
POST /api/admin/rotate-signing-key
```

Generates a new Ed25519 governance vote-signing keypair and a continuity proof signed by the old key. Peers that pinned the old key adopt the new one automatically on the next sync; the new public key is returned. Requires an **unrestricted** admin token (a space-restricted admin gets `403`), plus a TOTP code when MFA is enabled.

**Response** `200`: `{ "ok": true, "signingPublicKey": "-----BEGIN PUBLIC KEY-----…" }`

### Force-Pin a Member's Signing Key (break-glass)

```http
PUT /api/networks/:id/members/:instanceId/signing-key
```

```json
{ "signingPublicKey": "-----BEGIN PUBLIC KEY-----…" }
```

Force-sets a member's pinned signing key **without** a rotation proof — recovery for when a peer lost its old private key and cannot produce one. Admin only. **Response** `200`: `{ "ok": true, "instanceId": "…" }`.

---

### Reparent Self (Braintree)

Called by a braintree child node on itself after completing an RSA handshake with a grandparent. Records a temporary reparent so the node syncs through the grandparent while its original parent is offline.

```http
POST /api/networks/:id/reparent-self
```

```json
{
  "newParentInstanceId": "grandparent-uuid",
  "newParentLabel": "Grandparent Brain",
  "newParentUrl": "https://grandparent.example.com",
  "tokenForNewParent": "ythril_peerToken...",
  "originalParentInstanceId": "original-parent-uuid"
}
```

**Response** `200`:

```json
{
  "status": "reparented",
  "newParentInstanceId": "grandparent-uuid",
  "originalParentInstanceId": "original-parent-uuid"
}
```

Only valid for `braintree` networks. Returns `400` for other types.

---

### Adopt Member (Braintree)

Called on the grandparent to make a temporary reparent permanent. The member's parent is officially changed.

```http
POST /api/networks/:id/members/:instanceId/adopt
```

No request body.

**Response** `200`:

```json
{
  "status": "adopted",
  "instanceId": "child-uuid",
  "parentInstanceId": "grandparent-uuid"
}
```

Returns `409` if the member is not in a temporary reparent state.

---

### Revert Parent (Braintree)

Called on the grandparent when the original parent comes back online. Restores the member to its original parent and removes the direct grandparent link.

```http
POST /api/networks/:id/members/:instanceId/revert-parent
```

No request body.

**Response** `200`:

```json
{
  "status": "reverted",
  "instanceId": "child-uuid",
  "parentInstanceId": "original-parent-uuid"
}
```

Returns `409` if the member is not in a temporary reparent state.

---

## Invite API

Base path: `/api/invite` — unauthenticated endpoints (rate-limited).

### Generate Invite

```http
POST /api/invite/generate
Authorization: Bearer <admin-token>
```

```json
{ "networkId": "net-uuid" }
```

Optional fields:

| Field | Purpose |
|---|---|
| `expectedInstanceId` | Pin the invite to one `instanceId`. Only that instance may `apply` the bundle — a leaked or forwarded invite link cannot be redeemed by anyone else. |
| `reparentInstanceId` | Braintree reparent (not a new join): move this already-existing member under this instance. The invite is bound to that `instanceId` — applying it as any other instance is refused, so a reparent bundle cannot seize a different member's record. |

**Response** `201`:

```json
{
  "handshakeId": "uuid",
  "networkId": "net-uuid",
  "inviteUrl": "https://me.example.com/api/invite/apply",
  "rsaPublicKeyPem": "-----BEGIN PUBLIC KEY-----\n...",
  "expiresAt": "2026-03-25T15:00:00.000Z"
}
```

---

### Apply (Unauthenticated — called by joining brain)

```http
POST /api/invite/apply
```

```json
{
  "handshakeId": "uuid",
  "networkId": "net-uuid",
  "instanceId": "joiner-uuid",
  "instanceLabel": "Joiner Brain",
  "instanceUrl": "https://joiner.example.com",
  "rsaPublicKeyPem": "-----BEGIN PUBLIC KEY-----\n..."
}
```

**Response** `200`:

```json
{
  "encryptedTokenForB": "base64...",
  "rsaPublicKeyPem": "-----BEGIN PUBLIC KEY-----\n...",
  "instanceId": "inviter-uuid",
  "instanceLabel": "Inviter Brain",
  "networkId": "net-uuid",
  "networkLabel": "Team Sync",
  "networkType": "closed",
  "spaces": ["general"]
}
```

All tokens are RSA-OAEP-SHA256 encrypted — never plaintext over the wire.

---

### Finalize

```http
POST /api/invite/finalize
```

```json
{
  "handshakeId": "uuid",
  "encryptedTokenForA": "base64..."
}
```

**Response** `200`:

```json
{ "status": "joined", "instanceId": "joiner-uuid", "networkId": "net-uuid" }
```

On vote-governed networks (`closed`, `democratic`, `braintree`) the join is **held in a vote round**
instead of taking effect immediately — the response is then
`{ "status": "vote_pending", "roundId": "...", ... }`. The inviting instance's own yes vote is cast
implicitly (its admin generated the invite), so the common cases — first member of a closed network,
leaf under a braintree **root** — still conclude immediately and return `"joined"`. While the round is
open the joiner's provisioned peer token is refused on `/api/sync/*`; sync starts automatically once
the vote passes. If the round is vetoed or expires, the provisioned credentials are revoked.

---

### Check Invite Status

```http
GET /api/invite/status/:handshakeId
```

**Response** `200`:

```json
{ "status": "pending", "expiresAt": "2026-03-25T15:00:00.000Z" }
```

---

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

## MFA API

Base path: `/api/mfa` — requires admin token.

### Check MFA Status

```http
GET /api/mfa/status
```

**Response** `200`:

```json
{ "enabled": false }
```

---

### Setup MFA

```http
POST /api/mfa/setup
```

**Response** `201`:

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauth": "otpauth://totp/Ythril:My%20Brain?secret=JBSWY3DPEHPK3PXP&issuer=Ythril"
}
```

Scan the `otpauth` URI as a QR code in any TOTP app. The issuer is always `Ythril`, and the account label is the instance label (`instanceLabel`, falling back to `brain`).

> When MFA is **already enabled**, `POST /api/mfa/setup` (rotating the secret) and `DELETE /api/mfa`
> (disabling) require a current TOTP code in the `X-TOTP-Code` header — a stolen admin PAT alone
> cannot replace or remove the second factor. First-time enrolment (MFA off) needs no code. If the
> authenticator is lost, remove `totpSecret` from `secrets.json` on the host to recover.
>
> **Codes are single-use.** A TOTP code is accepted once; replaying it — including within the ±1-step
> (up to 90 s) clock-skew window it would otherwise still match — is refused. `POST /api/mfa/verify`
> consumes the code too, so a code you tested there cannot immediately be reused for a gated call:
> wait for your authenticator to roll to the next one.

---

### Verify OTP Code

```http
POST /api/mfa/verify
```

```json
{ "code": "123456" }
```

**Response** `200`:

```json
{ "valid": true }
```

---

### Disable MFA

```http
DELETE /api/mfa
```

**Response** `204`.

---

## Conflicts API

Base path: `/api/conflicts`

### List Conflicts

```http
GET /api/conflicts?spaceId=general
```

---

### Get Conflict

```http
GET /api/conflicts/:id
```

---

### Resolve a Conflict

```http
POST /api/conflicts/:id/resolve
```

```json
{
  "action": "keep-local",
  "rename": "report-v2.pdf",
  "targetSpaceId": "archive"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `action` | yes | One of: `keep-local`, `keep-incoming`, `keep-both`, `save-to-space` |
| `rename` | no | New filename for `keep-both`, or destination path for `save-to-space` |
| `targetSpaceId` | when `save-to-space` | Space to copy the incoming file into |

| Action | Result |
|--------|--------|
| `keep-local` | Deletes the conflict copy, keeps your file |
| `keep-incoming` | Replaces your file with the conflict copy |
| `keep-both` | Keeps both files; optionally renames the conflict copy |
| `save-to-space` | Copies the conflict file to another space, removes the conflict |

**Response** `200`:

```json
{ "status": "resolved" }
```

---

### Bulk Resolve Conflicts

```http
POST /api/conflicts/bulk-resolve
```

```json
{
  "ids": ["conflict-id-1", "conflict-id-2"],
  "action": "keep-local"
}
```

Accepts the same `action`, `rename`, and `targetSpaceId` fields as single resolve. Applies the action to all listed conflicts.

**Response** `200`:

```json
{
  "resolved": 2,
  "failed": []
}
```

---

### Dismiss a Conflict

```http
DELETE /api/conflicts/:id
```

Removes the conflict record without touching any files.

**Response** `204`.

---

### List Link Violations

```http
GET /api/conflicts/link-violations
```

Returns sync-ingested documents that violate strict linkage rules.

**Response** `200`:

```json
{
  "violations": [
    {
      "_id": "uuid",
      "spaceId": "general",
      "docId": "uuid",
      "docType": "edge",
      "field": "from",
      "reason": "from must be UUID v4 when strictLinkage is enabled",
      "peerInstanceId": "peer-uuid",
      "detectedAt": "2026-04-12T12:00:00.000Z"
    }
  ]
}
```

---

### Dismiss a Link Violation

```http
DELETE /api/conflicts/link-violations/:id
```

**Response** `204` when dismissed, `404` when not found.

---

### Dismiss All Link Violations

```http
DELETE /api/conflicts/link-violations
```

**Response** `200`:

```json
{ "dismissed": 12 }
```

---

### Seed a Conflict (Testing Utility)

```http
POST /api/conflicts/seed
Authorization: Bearer <admin-token>
```

Creates a synthetic conflict record for test scenarios. **Admin only** (`requireAdmin`) — a non-admin token, even one with access to the space, gets `403 "Admin token required"`.

```json
{
  "_id": "conflict-id",
  "spaceId": "general",
  "originalPath": "docs/file.md",
  "conflictPath": "docs/file.conflict.md",
  "peerInstanceId": "peer-uuid",
  "peerInstanceLabel": "Peer Brain",
  "detectedAt": "2026-04-15T10:00:00.000Z"
}
```

**Response** `201`:

```json
{ "id": "conflict-id" }
```

If the authenticated token has no access to `spaceId`, response is `403`.

---

## Setup API

### Health Check (unauthenticated)

```http
GET /health
```

**Response** `200`:

```json
{ "status": "ok", "ts": "2026-03-25T14:00:00.000Z" }
```

---

### Readiness Check (unauthenticated)

```http
GET /ready
```

Returns process readiness based on dependency checks (MongoDB + vector search availability).

**Response** `200` when ready, `503` when not ready.

Example:

```json
{
  "ready": true,
  "checks": {
    "mongodb": { "status": "ok" },
    "vectorSearch": { "status": "ok" }
  }
}
```

---

### Prometheus Metrics

```http
GET /metrics
```

Exposes a [Prometheus-compatible](https://prometheus.io/docs/instrumenting/exposition_formats/) metrics endpoint for production monitoring.

**Authentication**: Set the `METRICS_TOKEN` environment variable (recommended) — Prometheus scrapers must send `Authorization: Bearer <METRICS_TOKEN>` in their scrape config. If `METRICS_TOKEN` is unset the endpoint falls back to requiring a valid admin PAT. Returns `401` without valid credentials.

**Response** `200` — `text/plain; version=0.0.4; charset=utf-8`:

```text
# HELP ythril_http_requests_total Total HTTP requests by method, route pattern, and status code
# TYPE ythril_http_requests_total counter
ythril_http_requests_total{method="GET",route="/health",status_code="200"} 42
...
```

**Metrics exposed:**

| Metric | Type | Description |
|---|---|---|
| `ythril_http_requests_total` | counter | Total requests by method, route, status code |
| `ythril_http_request_duration_seconds` | histogram | Request latency by method and route |
| `ythril_http_request_size_bytes` | histogram | Request body size |
| `ythril_http_response_size_bytes` | histogram | Response body size |
| `ythril_memories_total` | gauge | Total memories by space |
| `ythril_entities_total` | gauge | Total entities by space |
| `ythril_edges_total` | gauge | Total edges by space |
| `ythril_chrono_entries_total` | gauge | Total chrono entries by space |
| `ythril_spaces_total` | gauge | Number of configured spaces |
| `ythril_embedding_duration_seconds` | histogram | Time to compute a single embedding |
| `ythril_embedding_queue_depth` | gauge | Pending embedding operations |
| `ythril_reindex_in_progress` | gauge | 1 if a reindex is running, 0 otherwise |
| `ythril_storage_used_bytes` | gauge | Storage used in bytes by area (brain, files, total) |
| `ythril_storage_limit_bytes` | gauge | Configured storage limits by area and tier (soft, hard) |
| `ythril_auth_attempts_total` | counter | Auth attempts by result (success, invalid) |
| `ythril_tokens_active` | gauge | Number of active (non-expired) tokens |
| `ythril_mcp_connections_active` | gauge | Current SSE connections |
| `ythril_mcp_tool_calls_total` | counter | Tool invocations by tool name and space |
| `ythril_sync_cycles_total` | counter | Sync cycles by network and status |
| `ythril_sync_items_pulled_total` | counter | Items received by type |
| `ythril_sync_items_pushed_total` | counter | Items sent by type |
| `ythril_sync_duration_seconds` | histogram | Time per sync cycle |

Default Node.js process metrics (`nodejs_*`, `process_*`) are also included via [prom-client](https://github.com/siimon/prom-client)'s `collectDefaultMetrics()`.

**Kubernetes example** (Prometheus Operator `ServiceMonitor`):

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ythril
spec:
  selector:
    matchLabels:
      app: ythril
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      authorization:
        credentials:
          name: ythril-metrics-token   # Secret containing METRICS_TOKEN value
          key: token
```

---

### Check Setup Status (unauthenticated)

```http
GET /api/setup/status
```

**Response** `200`:

```json
{ "configured": false }
```

---

### Legacy First-Run HTML Setup

These routes are primarily for non-SPA/manual first-run flows.

```http
GET /setup
POST /setup
```

Equivalent paths also exist under the API mount:

```http
GET /api/setup
POST /api/setup
```

Behaviour:

- `GET` returns an HTML setup form when instance configuration does not exist.
- `POST` accepts form data (`label`) and returns an HTML page containing the one-time initial admin token.
- If already configured, both return `404`.

For programmatic setup, prefer `POST /api/setup/json`.

---

### Complete Setup (JSON)

```http
POST /api/setup/json
```

```json
{
  "label": "My Ythril"
}
```

The `label` names this brain instance.

**Response** `201`:

```json
{
  "token": { "id": "...", "name": "Admin", "admin": true, ... },
  "plaintext": "ythril_initialAdminToken..."
}
```

---

## Admin API

### Reload Config

```http
POST /api/admin/reload-config
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
```

**Requires admin token** (and TOTP code when MFA is enabled). Re-reads `config.json` from disk. Useful after manual edits. Any spaces added to the config since the last load are automatically initialized (MongoDB collections, indexes, vector search index, and file directories created). The built-in `general` space is ensured to exist.

Reloading also flushes the token and OIDC caches, so a token revoked by a manual edit — or an updated OIDC block — takes effect immediately rather than after the cache expires. Legacy tokens that lack a `prefix` field are **not** removed: `findMatchingToken()` verifies them via a fallback scan and backfills the prefix on first use, so a reload never invalidates existing tokens.

**Response** `200`:

```json
{ "ok": true }
```

---

### Export Space

```http
GET /api/admin/spaces/:spaceId/export
Authorization: Bearer <admin-token>
```

Dumps the entire knowledge base of a space as a single JSON document. Requires admin token + TOTP when MFA is enabled.

**Response** `200`:

```json
{
  "exportedAt": "2026-04-11T10:00:00.000Z",
  "spaceId": "eng-kb",
  "spaceName": "Engineering Knowledge Base",
  "version": "1.0.0",
  "memories": [ { "_id": "...", "fact": "...", "tags": [], "...": "..." } ],
  "entities": [ { "_id": "...", "name": "...", "type": "...", "...": "..." } ],
  "edges":    [ { "_id": "...", "from": "...", "to": "...", "label": "...", "...": "..." } ],
  "chrono":   [ { "_id": "...", "title": "...", "type": "...", "...": "..." } ],
  "files":    [ { "_id": "...", "path": "...", "...": "..." } ]
}
```

- Embedding vectors are stripped (`embedding` field excluded) — exported data is model-independent.
- `embeddingModel` is retained on each doc so you can see what model last embedded it.
- Binary file content is **not** included — only file metadata. Use the Files API to download actual files.

---

### Import Space

```http
POST /api/admin/spaces/:spaceId/import
Content-Type: application/json
Authorization: Bearer <admin-token>
```

Upserts exported data into a space. Requires admin token + TOTP when MFA is enabled.

**Request body** — same shape as the export response. Each array is optional:

```json
{
  "memories": [ { "_id": "...", "fact": "...", "tags": [] } ],
  "entities": [ { "_id": "...", "name": "...", "type": "..." } ]
}
```

Each document must have a string `_id`. Documents with an existing `_id` in the space are replaced; new `_id`s are inserted.

**Response** `200`:

```json
{
  "spaceId": "eng-kb",
  "results": {
    "memories": { "inserted": 5, "updated": 2, "errors": 0 },
    "entities": { "inserted": 3, "updated": 1, "errors": 0 },
    "edges":    { "inserted": 0, "updated": 0, "errors": 0 },
    "chrono":   { "inserted": 0, "updated": 0, "errors": 0 },
    "files":    { "inserted": 0, "updated": 0, "errors": 0 }
  }
}
```

> After importing, run `POST /api/brain/spaces/:spaceId/reindex` to rebuild embedding vectors.

---

### Wipe Space

Clear all data — or a specific subset of collection types — from a space, while
preserving the space itself (label, description, config, OIDC mappings, and quota
settings).

```http
POST /api/admin/spaces/:spaceId/wipe
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
Content-Type: application/json
```

**Requires admin token** (and TOTP code when MFA is enabled).

#### Request body

| Field | Type | Description |
|-------|------|-------------|
| `types` | `string[]` *(optional)* | Subset of collection types to wipe: `"memories"`, `"entities"`, `"edges"`, `"chrono"`, `"files"`. Omit (or send `{}`) to wipe **all** collections. |

#### Full wipe (all collections)

```json
{}
```

or explicitly:

```json
{ "types": ["memories", "entities", "edges", "chrono", "files"] }
```

#### Partial wipe (specific types only)

```json
{ "types": ["memories"] }
```

```json
{ "types": ["entities", "edges"] }
```

#### Response `200`

```json
{
  "deleted": {
    "memories": 12,
    "entities": 8,
    "edges": 5,
    "chrono": 0,
    "files": 3
  }
}
```

Each field in `deleted` is the number of documents actually removed from that
collection.  On a partial wipe the unaffected fields will be `0`.

#### Behaviour notes

- **Idempotent** — wiping an already-empty space (or a type with no documents) returns `0` for that field; no error is raised.
- **Tombstones** — internal sync-tombstone records are cleared for the wiped types so peers do not re-sync deleted data. For full wipes all tombstones are cleared.  For partial wipes only the matching type tombstones are removed.
- **Files** — when `"files"` is included, both the MongoDB metadata collection and the physical files directory on disk are cleared. The directory is recreated empty so new uploads work immediately.
- **Space preserved** — the space itself is not deleted. Its label, description, configuration, OIDC mappings, and quota settings remain unchanged.

#### Error responses

| Status | Meaning |
|--------|---------|
| `400` | `types` array contains an unrecognised collection type |
| `401` | Missing or invalid Authorization header |
| `403` | Token is not admin-scoped (or MFA code wrong/missing) |
| `404` | Space not found |

#### Admin UI

In **Settings → Spaces**, every space row has a ⊘ **Wipe space** button.  Clicking it opens a confirmation dialog that shows the current per-collection document counts before proceeding.

#### MCP tool

```text
wipe_space(types?: string[])
```

Available in MCP-connected clients.  Requires an admin token on the MCP session.  When `types` is omitted all collections are wiped.  Returns a plain-text summary of deleted counts.

---

## Data Management API

Base path: `/api/admin/data` — **requires admin token** on all endpoints. Most mutating endpoints additionally require a TOTP code (`X-TOTP-Code` header) when MFA is enabled on the instance.

---

### GET /api/admin/data/config

Returns how the MongoDB URI is configured and a redacted version of the URI (credentials replaced with `[credentials]`).

```http
GET /api/admin/data/config
Authorization: Bearer <admin-token>
```

**Response `200`:**

```json
{
  "source": "config",
  "mongoUriRedacted": "mongodb://[credentials]@db:27017/ythril"
}
```

`source` indicates where the active connection string comes from, in priority order (highest first):

| Value | Meaning |
|---|---|
| `"env"` | `MONGO_URI` environment variable — set in deployment config (e.g. `docker-compose.yml`). Always takes precedence. Migration is not available when this is the source. |
| `"config"` | Connection string stored in `config.json` — set via database migration or manual edit. |
| `"default"` | Built-in default (`mongodb://ythril-mongo:27017/ythril`). No custom connection configured. |

---

### POST /api/admin/data/config/test

Test whether a MongoDB URI is reachable before committing to a migration or config change.

```http
POST /api/admin/data/config/test
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
Content-Type: application/json

{ "uri": "mongodb://user:pass@new-host:27017/ythril" }
```

**Response `200`:**

```json
{ "ok": true, "latencyMs": 12 }
```

Returns `400` for an invalid URI, `400` for URIs targeting private/loopback/cloud-metadata addresses (SSRF protection), and `500` if the connection attempt fails.

---

### GET /api/admin/data/maintenance

Return current maintenance mode state.

```http
GET /api/admin/data/maintenance
Authorization: Bearer <admin-token>
```

**Response `200`:** `{ "active": false }`

---

### POST /api/admin/data/maintenance

Enable or disable maintenance mode. While active, all write operations across the instance return `503`; reads continue normally.

```http
POST /api/admin/data/maintenance
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
Content-Type: application/json

{ "active": true }
```

**Response `200`:** `{ "active": true }`

---

### POST /api/admin/data/backup

Trigger an immediate point-in-time dump of the entire MongoDB database. The backup is written to `<data-root>/backups/<ISO-timestamp>/` and contains a `manifest.json` plus one NDJSON file per collection.

When `YTHRIL_DB_MIGRATION_ENABLED=true` and a `backup.json` config file is present, this endpoint also:

- Copies the backup (plus `<data-root>/files/`) to the configured `offsite.destPath`
- Applies local retention (`retention.keepLocal`) — deletes oldest local backups over the limit
- Applies offsite retention (`offsite.retention.keepCount`) — deletes oldest offsite sets over the limit

```http
POST /api/admin/data/backup
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
```

**Response `200` (local backup only):**

```json
{
  "backup": {
    "id": "2026-04-23T10-00-00-000Z",
    "dir": "/data/backups/2026-04-23T10-00-00-000Z",
    "manifest": { "createdAt": "2026-04-23T10:00:00.000Z", "collections": ["memories", "entities"] }
  }
}
```

**Response `200` (with offsite copy and retention):**

```json
{
  "backup": {
    "id": "2026-04-23T10-00-00-000Z",
    "dir": "/data/backups/2026-04-23T10-00-00-000Z",
    "manifest": { "createdAt": "2026-04-23T10:00:00.000Z", "collections": ["memories", "entities"] }
  },
  "localPruned": 2,
  "offsite": {
    "dir": "/mnt/offsite-backup/ythril/2026-04-23T10-00-00-000Z",
    "filesDir": "/mnt/offsite-backup/ythril/2026-04-23T10-00-00-000Z-files",
    "pruned": 1
  }
}
```

`localPruned` and `offsite.pruned` are only present when backups were actually deleted. `offsite.filesDir` is only present when a `files/` directory exists.

---

### GET /api/admin/data/backups

List all available backups, sorted newest first.

```http
GET /api/admin/data/backups
Authorization: Bearer <admin-token>
```

**Response `200`:**

```json
{
  "backups": [
    {
      "id": "2026-04-23T10-00-00-000Z",
      "dir": "/data/backups/2026-04-23T10-00-00-000Z",
      "createdAt": "2026-04-23T10:00:00.000Z",
      "collections": ["memories", "entities", "edges"]
    }
  ]
}
```

---

### POST /api/admin/data/restore

Restore the database from a previously created backup. The instance automatically enters maintenance mode for the duration of the restore, then returns to whatever state it was in before.

```http
POST /api/admin/data/restore
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
Content-Type: application/json

{ "backupId": "2026-04-23T10-00-00-000Z" }
```

`backupId` must match a directory name under `<data-root>/backups/`. Slashes and `..` are rejected.

**Response `200`:** `{ "ok": true }`

| Status | Meaning |
|--------|--------|
| `400` | Missing or invalid `backupId` |
| `404` | Backup not found |
| `500` | Restore operation failed |

> All data written after the backup was taken is lost on restore. This operation is not reversible.

---

### GET /api/admin/data/backup-config

> **Feature flag required.** Returns `403` unless the instance was started with `YTHRIL_DB_MIGRATION_ENABLED=true`.

Returns the current contents of `backup.json` — the file that configures scheduled and offsite backups. Can also be written via [PUT /api/admin/data/backup-config](#put-apiadmindatabackup-config) (also flag-gated).

```http
GET /api/admin/data/backup-config
Authorization: Bearer <admin-token>
```

**Response `200`:**

```json
{
  "config": {
    "schedule": "0 2 * * *",
    "retention": { "keepLocal": 7 },
    "offsite": {
      "destPath": "/backups",
      "retention": { "keepCount": 14 }
    }
  },
  "configPath": "/config/backup.json",
  "backupsPath": "/data/backups"
}
```

`config` is `null` when the file does not exist (feature is enabled but backup.json has not been created yet).

| Status | Meaning |
|--------|--------|
| `200` | Success |
| `403` | `YTHRIL_DB_MIGRATION_ENABLED` is not `true` (feature disabled) |

#### Configuring backup.json

Place `backup.json` alongside `config.json` on the container filesystem (typically `/config/backup.json`). All fields are optional — omit any field to disable that aspect.

| Field | Type | Description |
|---|---|---|
| `schedule` | string | Cron expression for automatic backups (`"0 2 * * *"` = daily at 02:00). Must be a valid 5-part cron expression. |
| `retention.keepLocal` | integer ≥ 1 | Max local backups to keep under `<data-root>/backups/`. Oldest are pruned automatically. |
| `offsite.destPath` | string | **Absolute path** on the container filesystem. Mount external drives, NFS shares, or any storage as a volume pointing here. |
| `offsite.retention.keepCount` | integer ≥ 1 | Max offsite backup sets to retain (default: 14). |

Each offsite backup set consists of a `<backupId>/` directory (MongoDB dump) and a `<backupId>-files/` directory (copy of `<data-root>/files/`), kept in sync when pruning.

**Example `backup.json`** — also at `config/backup.example.json` in the repository:

```json
{
  "schedule": "0 2 * * *",
  "retention": { "keepLocal": 7 },
  "offsite": {
    "destPath": "/mnt/offsite-backup/ythril",
    "retention": { "keepCount": 14 }
  }
}
```

**Docker Compose example** — mounting an external volume for offsite backups:

```yaml
services:
  ythril:
    environment:
      YTHRIL_DB_MIGRATION_ENABLED: "true"
    volumes:
      - ./config:/config
      - ythril-data:/data
      - /mnt/external-drive/ythril-backups:/backups

# config/backup.json  →  { "schedule": "0 2 * * *", "offsite": { "destPath": "/backups" } }
```

---

### PUT /api/admin/data/backup-config

> **Feature flag required.** Returns `403` unless the instance was started with `YTHRIL_DB_MIGRATION_ENABLED=true`.
>
> **Requires admin MFA** (same as other write operations).

Writes (replaces) `backup.json`. Use this to configure the backup schedule and offsite destination from the UI or programmatically. The backup settings UI in **Settings → Database** calls this endpoint.

```http
PUT /api/admin/data/backup-config
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request body** — the full `BackupConfig` object (all fields optional):

```json
{
  "schedule": "0 2 * * *",
  "retention": { "keepLocal": 7 },
  "offsite": {
    "destPath": "/backups",
    "retention": { "keepCount": 14 }
  }
}
```

`offsite.destPath` must be an absolute path — the request is rejected with `400` otherwise.

**Response `200`:**

```json
{ "ok": true, "config": { ... } }
```

| Status | Meaning |
|--------|--------|
| `200` | Config saved |
| `400` | Validation error (invalid cron, relative path, etc.) |
| `403` | Feature disabled or MFA not satisfied |

---

### POST /api/admin/data/migrate

> **Feature flag required.** This endpoint returns `403` unless the instance was started with `YTHRIL_DB_MIGRATION_ENABLED=true`. The flag is off by default so that a compromised admin token cannot be used to exfiltrate the entire database to an attacker-controlled server.
>
> **Not available when `MONGO_URI` is set.** If the database connection is managed via the `MONGO_URI` environment variable, this endpoint returns `409 INFRA_MANAGED`. Update the environment variable in your deployment configuration instead.

Migrates the entire database to a new MongoDB server. The sequence is:

1. Validate and test the new URI (SSRF-safe URIs only).
2. Enter maintenance mode.
3. Dump the current database to `<data-root>/migration-backup/`.
4. Write a migration marker (`migration-marker.json`) with the old URI, new URI, and backup path.
5. Persist the new URI to `config.json`.
6. Respond `200` to the caller.
7. Exit the process — Docker / Kubernetes restarts the container automatically.

On restart, the server detects the marker and calls `restoreDatabase()` against the new URI before establishing the normal MongoDB connection.

```http
POST /api/admin/data/migrate
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
Content-Type: application/json

{ "uri": "mongodb+srv://user:pass@cluster.mongodb.net/ythril" }
```

**Response `200`:**

```json
{
  "ok": true,
  "backupDir": "/data/migration-backup",
  "message": "Migration started. The server will restart and connect to the new database."
}
```

| Status | Code | Meaning |
|--------|------|---------|
| `400` | | Invalid or SSRF-unsafe URI |
| `403` | `FEATURE_DISABLED` | `YTHRIL_DB_MIGRATION_ENABLED` is not `true` |
| `409` | `INFRA_MANAGED` | `MONGO_URI` env var is set — connection is infra-managed, migration unavailable |
| `409` | | Maintenance mode already active — deactivate it first |
| `500` | | Dump failed or new URI unreachable |

#### Enabling migration on a deployment

Set the environment variable on the Ythril container:

```yaml
environment:
  YTHRIL_DB_MIGRATION_ENABLED: "true"
```

Omit this variable (or set it to any value other than `true`) on any instance where database migration should not be possible. This prevents a stolen admin token from being used as an exfiltration vector.

---

## Audit Log API

Base path: `/api/admin/audit-log` — **requires admin token** on all endpoints.

Ythril maintains an append-only, immutable audit log of every authenticated API operation. The log captures who performed what action, when, on which space, and the resulting HTTP status — providing a full access trail for compliance and security review.

### Configuration

Add an `audit` block to `config.json`:

```json
{
  "audit": {
    "logReads": false,
    "retentionDays": 90
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `logReads` | `boolean` | `false` | When `true`, read operations (recall, query, list, traverse, stats) are also logged. By default only write operations and auth failures are recorded. |
| `retentionDays` | `number` | `90` | Number of days before audit entries are automatically purged by MongoDB's TTL daemon. |

### Tracked operations

Audit entries are recorded for all write operations and (when `logReads` is enabled) read operations across the API surface:

| Category | Operations |
|----------|-----------|
| Memory | `memory.create`, `memory.update`, `memory.delete`, `memory.list` |
| Entity | `entity.create`, `entity.update`, `entity.delete`, `entity.list` |
| Edge | `edge.create`, `edge.update`, `edge.delete`, `edge.list` |
| Chrono | `chrono.create`, `chrono.update`, `chrono.delete`, `chrono.list` |
| File | `file.create`, `file.update`, `file.delete`, `file.read`, `file.list` |
| Space | `space.create`, `space.update`, `space.delete`, `space.wipe`, `space.list` |
| Token | `token.create`, `token.delete` |
| Webhook | `webhook.create`, `webhook.update`, `webhook.delete`, `webhook.test` |
| Brain | `brain.recall`, `brain.recall_global`, `brain.query`, `brain.find_similar`, `brain.stats`, `brain.bulk_write`, `brain.traverse` |
| Config | `config.reload` |
| Auth | `auth.failed` (invalid or expired tokens on any endpoint) |

### Query audit log

```http
GET /api/admin/audit-log
Authorization: Bearer <admin-token>
```

All query params are optional:

| Parameter | Type | Description |
|-----------|------|-------------|
| `after` | `string` | ISO-8601 timestamp — entries from this time onward |
| `before` | `string` | ISO-8601 timestamp — entries up to this time |
| `tokenId` | `string` | Filter by token ID |
| `oidcSubject` | `string` | Filter by OIDC subject claim |
| `spaceId` | `string` | Filter by space ID |
| `operation` | `string` | Comma-separated operation names (e.g. `memory.create,entity.delete`) |
| `status` | `number` | Filter by HTTP status code |
| `ip` | `string` | Filter by client IP address |
| `limit` | `number` | Results per page (1–1000, default 100) |
| `offset` | `number` | Pagination offset (default 0) |

**Response** `200`:

```json
{
  "entries": [
    {
      "_id": "a1b2c3d4-...",
      "timestamp": "2026-04-12T14:32:10.123Z",
      "tokenId": "tok_abc123",
      "tokenLabel": "mcp-bridge",
      "authMethod": "pat",
      "oidcSubject": null,
      "ip": "192.168.1.10",
      "method": "POST",
      "path": "/api/brain/spaces/eng-kb/memories",
      "spaceId": "eng-kb",
      "operation": "memory.create",
      "status": 201,
      "entryId": "f7e6d5c4-...",
      "durationMs": 12
    }
  ],
  "total": 1847,
  "hasMore": true
}
```

### Audit entry fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `string` | UUID v4 — unique entry identifier |
| `timestamp` | `string` | ISO-8601 timestamp |
| `tokenId` | `string \| null` | Token ID (null for auth failures) |
| `tokenLabel` | `string \| null` | Human-readable token label |
| `authMethod` | `"pat" \| "oidc" \| null` | Authentication method used |
| `oidcSubject` | `string \| null` | OIDC subject claim when auth method is OIDC |
| `ip` | `string` | Client IP address |
| `method` | `string` | HTTP method (GET, POST, PUT, PATCH, DELETE) |
| `path` | `string` | Request path |
| `spaceId` | `string \| null` | Target space (null for non-space operations) |
| `operation` | `string` | Structured event name (see tracked operations) |
| `status` | `number` | HTTP status code of the response |
| `entryId` | `string \| null` | Entry ID when the operation targets a specific document |
| `durationMs` | `number` | Request duration in milliseconds |

### Data retention

Entries expire automatically after `retentionDays` (default 90). MongoDB's TTL daemon handles the purge — no manual cleanup required.

### Admin UI

**Settings → Audit Log** provides a searchable, filterable view of the audit trail with:

- Date range, operation, space, status, and IP filters
- Paginated table with colour-coded status badges
- Click-to-detail modal for full entry JSON
- JSON and CSV export

---

## Duplicate Scanner & Action Rules

A background scanner can sweep a space for **semantically duplicate** records and act on them according to per-space rules. It complements the interactive insert-time check ([Duplicate Detection on Insert](#duplicate-detection-on-insert)) but is independent of it: the scanner finds duplicates among **all** records — including those inserted with `checkDuplicates` off — and re-evaluates a pair whenever either record changes.

**Off by default.** Enable it in `config.json`:

```jsonc
{
  "dupeScanner": {
    "enabled": true,
    "schedule": "0 3 * * *",   // cron — nightly at 03:00 (default)
    "threshold": 0.92,          // cosine score at/above which a pair is a candidate
    "batchSize": 200,           // records fetched per DB batch
    "maxPerRun": 5000,          // max records scanned per space per run
    "types": ["memory", "entity"]
  }
}
```

**How the sweep works.** Each run walks a space's records ordered by `seq` (the monotonic sequence number that advances on every create *and* update), resuming from a per-(space, type) cursor. For each record it runs a vector search using the record's **stored** embedding (no re-embedding) and, for every match at or above `threshold`, applies the space's rules. Because updates advance `seq`, an edited record is re-scanned automatically; because the cursor is `seq`-based (not time-based), a record inserted with insert-time checking disabled is still covered. `maxPerRun` bounds the work per run so the initial full pass spreads across nights rather than one heavy burst.

**Real-time evaluation (optional).** Set `dupeRulesOnInsert: true` on a space (Settings → Spaces → Duplicates, or `PATCH /api/spaces/:id`) to also apply the rules the moment a record is inserted, not only on the scheduled scan. Evaluation is fire-and-forget (it never blocks or fails the write) and applies to **all** inserts, including bulk — leave it off for scan-time-only. Default off. Note that with an `automerge` rule, real-time evaluation can absorb a just-inserted entity moments after the write returns.

### Action rules

Rules live on the space (local, not synced/governed) and are edited under **Settings → Spaces → (a space) → Duplicates**, or via `PATCH /api/spaces/:id`:

```jsonc
{
  "dupeRules": [
    { "minScore": 0.98, "action": "automerge" },
    { "minScore": 0.90, "action": "notify", "types": ["entity", "memory"] }
  ],
  "dupeMergeSurvivor": "older"   // which record survives an automerge (default: older = lower seq)
}
```

Rules are evaluated **highest `minScore` first**; the first match decides the action. No matching rule ⇒ `flag`.

| Action | Effect |
|--------|--------|
| `flag` | Record a reviewable candidate (default; non-destructive). |
| `automerge` | **Entities only.** Merge losslessly using the existing entity merge (unions edges, tags, and non-conflicting properties). If the two records set the same property to *different* values, the merge is not lossless — it is **not** performed and the pair falls back to `flag`. The survivor is the older record by default (`dupeMergeSurvivor`). |
| `notify` | Emit a `duplicate.detected` webhook with both full records + the score. By default this goes to your webhook **subscriptions** (subscribe your automation, e.g. an n8n workflow, to `duplicate.detected` for the space); set a rule-level `webhookUrl` to POST directly to a specific (SSRF-validated) endpoint instead. Your automation can then apply custom logic and call back the API (`merge_entities`, delete, etc.). |

An action runs once per pair; it re-runs only after one of the records changes (a dismissed pair likewise re-opens after an edit).

### Candidate review API

Base path: `/api/duplicates`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/duplicates?status=open&space=<id>` | any token (space-scoped) | List candidates. `status` = `open` (default), `dismissed`, or `all`. |
| `POST` | `/api/duplicates/:id/dismiss` | non-read-only | Mark a pair reviewed / not-a-duplicate. |
| `POST` | `/api/duplicates/:id/merge` | non-read-only | Merge an entity candidate losslessly. `409` with the merge plan if there is a value conflict. |
| `POST` | `/api/duplicates/scan?space=<id>` | admin + MFA | Trigger an on-demand full re-scan (all accessible spaces, or one). Requires `X-TOTP-Code` when MFA is enabled. |

A candidate is `{ id, spaceId, type, aId, aSummary, bId, bSummary, score, status, resolution?, detectedAt, updatedAt }`. The web UI (**Settings → Duplicates**) lists candidates with dismiss / merge actions and a "Scan now" button.

> **Cost note:** the initial full scan of a large existing space is O(N) vector searches — inherently the expensive part. It is bounded per run (`maxPerRun`) and runs off-hours; steady-state runs only touch new or edited records. Keep `notify` rules and automation idempotent, since an edited record re-fires its pair's action.

---

## Webhooks API

Base path: `/api/admin/webhooks` — **requires an admin token on all endpoints** (`requireAdminMfa`), including the read-only `GET`s (`/`, `/:id`, `/:id/deliveries`). When MFA is enabled, every request must also carry an `X-TOTP-Code: <code>` header, or it returns `403 MFA_REQUIRED`.

Webhooks allow external systems to receive real-time HTTP POST notifications when write events occur on Ythril spaces. This replaces the need to poll for changes.

> **Delivery & SSRF:** target URLs must be `https://` and are SSRF-validated at creation. At delivery the target is re-resolved, the connection is **pinned to the validated IP** (so a DNS rebind cannot redirect it to an internal host), and redirects are followed manually with each hop re-validated. The redirect-follow cap defaults to 3 and is configurable via `webhookMaxRedirects` in `config.json` (or the `WEBHOOK_MAX_REDIRECTS` env var), clamped to `[0, 20]`.

### Event Types

| Event | Fired when |
|-------|-----------|
| `memory.created` | A new memory is stored |
| `memory.updated` | An existing memory is updated |
| `memory.deleted` | A memory is deleted |
| `entity.created` | A new entity is created |
| `entity.updated` | An existing entity is updated (including upsert of existing) |
| `entity.deleted` | An entity is deleted |
| `entity.merged` | Two entities are merged (the survivor keeps its id). Payload `entry` = `{ survivor: {record}, absorbedId }` |
| `edge.created` | A new edge is created |
| `edge.updated` | An existing edge is updated |
| `edge.deleted` | An edge is deleted |
| `link_violation.created` | A strict-linkage reference violation is recorded |
| `chrono.created` | A new chrono entry is created |
| `chrono.updated` | A chrono entry is updated |
| `chrono.deleted` | A chrono entry is deleted |
| `file.created` | A file is written (new or overwrite) |
| `file.updated` | A file is moved/renamed |
| `file.deleted` | A file is deleted |
| `bulk.write` | A bulk write completed (`POST /bulk` or MCP `bulk_write`). Per-item events are **not** fired for bulk; this one summary carries `entry` = `{ inserted, updated, errorCount }` for a workflow to inspect. |
| `duplicate.detected` | The duplicate scanner found a near-duplicate pair under a `notify` rule (see [Duplicate Scanner](#duplicate-scanner--action-rules)). Payload `entry` = `{ type, score, a: {record}, b: {record} }` |
| `test.ping` | Synthetic test event sent via the test endpoint |

> Events fire for **both** REST API and MCP (agent) writes — emission lives in the shared
> brain/file functions, so an agent creating a memory or entity delivers the same events a REST
> client would. Internal writes (sync replication, space import) do not emit.

### Create Subscription

```http
POST /api/admin/webhooks
Authorization: Bearer <admin-token>
Content-Type: application/json
```

```json
{
  "url": "https://n8n.example.com/webhook/ythril-events",
  "secret": "whsec_your_shared_secret",
  "spaces": ["dev-lessons", "dev-infrastructure"],
  "events": ["memory.created", "entity.created"],
  "enabled": true
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `url` | ✅ | HTTPS endpoint to receive POST requests |
| `secret` | ✅ | Shared secret for HMAC-SHA256 signature (min 8 chars) |
| `spaces` | — | Space ID filter; omit or empty = all spaces |
| `events` | — | Event type filter; omit or empty = all events |
| `enabled` | — | Default `true`; set `false` to pause without deleting |

**Response** `201`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://n8n.example.com/webhook/ythril-events",
  "spaces": ["dev-lessons", "dev-infrastructure"],
  "events": ["memory.created", "entity.created"],
  "enabled": true,
  "status": "active",
  "consecutiveFailures": 0,
  "createdAt": "2026-04-11T14:30:00.000Z",
  "updatedAt": "2026-04-11T14:30:00.000Z"
}
```

> **Security:** The `secret` is stored server-side for HMAC signing but is **never returned** in any GET response after creation.

### List Subscriptions

```http
GET /api/admin/webhooks
Authorization: Bearer <admin-token>
```

**Response** `200`:

```json
{
  "webhooks": [
    {
      "id": "...",
      "url": "https://...",
      "spaces": [],
      "events": [],
      "enabled": true,
      "status": "active",
      "consecutiveFailures": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### Get Subscription

```http
GET /api/admin/webhooks/:id
Authorization: Bearer <admin-token>
```

### Update Subscription

```http
PATCH /api/admin/webhooks/:id
Authorization: Bearer <admin-token>
Content-Type: application/json
```

```json
{
  "url": "https://new-endpoint.example.com/hook",
  "enabled": false
}
```

All fields are optional. Only provided fields are updated.

### Delete Subscription

```http
DELETE /api/admin/webhooks/:id
Authorization: Bearer <admin-token>
```

**Response** `204` — subscription and delivery logs removed.

### Test Delivery

```http
POST /api/admin/webhooks/:id/test
Authorization: Bearer <admin-token>
```

Sends a synthetic `test.ping` event to the subscription's URL. Useful for verifying connectivity.

### Delivery Log

```http
GET /api/admin/webhooks/:id/deliveries
Authorization: Bearer <admin-token>
```

Returns the last 100 deliveries for the subscription:

```json
{
  "deliveries": [
    {
      "id": "...",
      "webhookId": "...",
      "event": "memory.created",
      "spaceId": "general",
      "timestamp": "2026-04-11T14:30:00.000Z",
      "responseStatus": 200,
      "latencyMs": 142,
      "success": true
    }
  ]
}
```

### Event Payload

When an event fires, Ythril sends an HTTP POST to the webhook URL:

```http
POST https://your-endpoint.example.com/hook
Content-Type: application/json
X-Ythril-Signature: sha256=<HMAC-SHA256 hex digest>
X-Ythril-Event: entity.created
X-Ythril-Delivery: <unique delivery UUID>
```

```json
{
  "event": "entity.created",
  "timestamp": "2026-04-11T14:30:00.000Z",
  "spaceId": "dev-infrastructure",
  "spaceName": "Dev Infrastructure",
  "entry": {
    "_id": "...",
    "name": "cilium",
    "type": "infra-component"
  },
  "tokenId": "...",
  "tokenLabel": "mcp-bridge"
}
```

- `entry` contains the full document for created/updated events (excluding embeddings), just `{ _id }` for deleted events.
- `tokenId` + `tokenLabel` identify which token performed the write.

### Signature Verification

Verify the `X-Ythril-Signature` header using your shared secret:

```js
const crypto = require('crypto');
const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const valid = signature === `sha256=${expected}`;
```

### Delivery Guarantees

- **At-least-once delivery.** On HTTP 2xx the delivery is marked successful. On timeout (10 s) or non-2xx, Ythril retries with exponential backoff: 10 s → 30 s → 1 m → 5 m → 30 m → 1 h.
- After all retries are exhausted, the subscription status changes to `failing`.
- Re-enabling a failing subscription (`PATCH` with `enabled: true`) resets the failure counter.

---

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

## MCP (Model Context Protocol)

Ythril exposes a single global MCP server via SSE. Each tool accepts a `space` parameter — the connection is not scoped to a single space.

### Server Instructions

On connect, the server sends global instructions listing all available space IDs and noting that each tool requires a `space` parameter (except `recall`, `list_chrono`, and `find_similar`, where `space` is optional and enables cross-space results when omitted; and `list_peers`/`sync_now` which are global). Call `list_spaces` to get space IDs, descriptions, and entry counts (memories, entities, edges, chrono) — useful for discovering which spaces are populated before querying. Call `get_space_meta` with a specific space to get its full schema, purpose, and usage notes.

> **Tool inputs are self-describing — and enforced.** Every tool's complete input contract — each parameter, its allowed values (`enum`), numeric bounds (`minimum`/`maximum`/`default`), string limits, the filter-operator allowlist, and `additionalProperties: false` — is published in its `inputSchema` via `tools/list`. The dispatcher **validates every call against that schema before running the tool**, rejecting a non-conforming call with an `isError` result — so unknown properties, out-of-range numbers, out-of-enum values, and malformed ids are hard errors, not silently ignored or clamped. Treat `tools/list` as the authoritative, machine-readable reference and read a tool's schema before constructing arguments; the `help` tool points here too.

### Read-Only Tokens

When connecting with a `readOnly` token, mutating tools (`remember`, `update_memory`, `delete_memory`, `upsert_entity`, `update_entity`, `merge_entities`, `upsert_edge`, `update_edge`, `create_chrono`, `update_chrono`, `bulk_write`, `write_file`, `delete_file`, `create_dir`, `move_file`, `sync_now`, `update_space`, `wipe_space`) are **hidden** from `tools/list` and rejected with an error if called directly. Read-only tools (`help`, `recall`, `find_similar`, `query`, `get_stats`, `get_space_meta`, `list_spaces`, `find_entities_by_name`, `list_chrono`, `read_file`, `list_dir`, `traverse`) work normally. `list_peers` is read-only but **admin-gated** — see the admin-only note below.

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
3. In claude.ai, go to **Settings → Connectors → Add custom connector** and enter the MCP URL: `https://brain.example.com/mcp`. Claude discovers the authorization server and opens Ythril's consent page.
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

### Available Tools

| Tool | Description |
|---|---|
| `help` | Self-documenting system guide — the knowledge model, how to choose between `query` / `recall` / filtered recall, schema authoring, and the tools available to the calling token. Read-only, no `space` needed; scoped to the token so it never lists tools the token can't call |
| `list_spaces` | List accessible space IDs with descriptions and entry counts (memories, entities, edges, chrono) |
| `remember` | Store a memory with optional tags and entity links |
| `update_memory` | Update an existing memory's fact, tags, entity links, or delete specific fields via `deleteFields` |
| `delete_memory` | Delete a memory by ID |
| `recall` | Semantic search across all knowledge types (memories, entities, edges, chrono entries, files). Searches the specified `space`; omit `space` to search across all accessible spaces |
| `query` | Structured MongoDB filter query (read-only) — supports `memories`, `entities`, `edges`, `chrono`, and `files` collections |
| `find_similar` | Find entries with high vector similarity to an existing entry by ID — no re-embedding step. Provide `space` to scope to one space, or omit it to search across all accessible spaces (like `recall`). Supports `traverse` (graph expansion). The legacy `crossSpace` flag is deprecated — omit `space` instead |
| `get_stats` | Return counts of memories, entities, edges, chrono entries, and files |
| `get_space_meta` | Return the full space schema definition, purpose, usage notes, and stats |
| `upsert_entity` | Create or update a named entity (with optional properties) |
| `update_entity` | Update an existing entity by ID (name, type, description, tags, properties); supports `deleteFields` for field removal |
| `merge_entities` | Merge two entities — relink all references and resolve per-property conflicts |
| `find_entities_by_name` | Find all entities with an exact name match (returns list regardless of type) |
| `upsert_edge` | Create or update a directed relationship |
| `update_edge` | Update an existing edge by ID (label, type, weight, description, tags, properties); supports `deleteFields` for field removal |
| `traverse` | BFS graph traversal — follow edges from a starting entity up to `maxDepth` hops |
| `create_chrono` | Create a chrono entry (event, deadline, plan, prediction, milestone) |
| `update_chrono` | Update an existing chrono entry |
| `list_chrono` | List chrono entries, optionally filtered by status, type, tags, date range, or text search |
| `bulk_write` | Batch-upsert memories, entities, edges, and/or chrono entries in a single call (schema-validated) |
| `read_file` | Read a text file from the space file store |
| `write_file` | Write a text file to the space file store (optional `description` and `tags` stored as metadata) |
| `list_dir` | List directory contents |
| `delete_file` | Delete a file |
| `create_dir` | Create a directory |
| `move_file` | Move or rename a file/directory |
| `update_space` | Update space label and/or description (admin only) |
| `wipe_space` | Wipe all or specific collection types from the space (admin only) |
| `list_peers` | List all configured peer instances (admin only) |
| `sync_now` | Trigger immediate sync (all networks or specific peer) (admin only) |

> **Admin-only tools.** `list_peers`, `sync_now`, `update_space`, and `wipe_space` require an `admin`
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

The `remember` and `upsert_entity` tools run a **semantic near-duplicate check** before storing, using the same embedding the new record is stored with — so it costs one extra ANN vector search, not a re-embed. When a highly similar record already exists, the tool's response flags it (id, a short summary, and the cosine score) so an agent can update or merge the existing record instead of accumulating redundant ones:

```text
Stored memory (seq 1284, ID 7f3c…).
⚠️ Possible duplicate — 1 existing memory is highly similar: "The Vault service stores secrets and rotates auth tokens" (ID 9a1b…, 0.97). This memory was still stored; pass checkDuplicates:false to skip this check, or update the existing one instead.
```

- **The write always succeeds** — the check is advisory, never blocking. It also never fails an insert: if vector search is unavailable or the space needs reindexing, the check is silently skipped.
- **Default on** for both tools. Pass `checkDuplicates: false` to skip it, or `dupeThreshold` (0–1, default ~0.92) to tune sensitivity — lower flags looser matches.
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

The tool returns a JSON object with a `results` array and a `count`. Each result has five top-level keys — search metadata and a quick-read text field cleanly separated from the stored document:

```json
{
  "results": [
    {
      "score": 0.91,
      "spaceId": "general",
      "type": "memory",
      "matchedText": "portal-backend Traefik routing configuration uses path-prefix matchers",
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
      "matchedText": "traefik-ingress ingress-controller portal-backend Handles HTTP routing for portal services.",
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
| `matchedText` | The full multi-field text that was fed to the embedding model for this document (e.g. for a memory: `tags + entity names + fact + description + properties`). Lets you scan results without knowing which fields to look at per type. Pre-computed at write time — not reconstructed on demand. |
| `record` | The full stored document with all user-visible fields. `_id` is always present and can be used directly in follow-up tool calls (`update_memory`, `upsert_entity`, `delete_memory`, etc.) without a second lookup. Embedding vector excluded. |

For cross-space recall (omit `space`), `spaceId` on each result identifies which space it came from.

**What is vector-indexed:**

| Data type | Embedded? | Fields included in embedding text (`matchedText`) | Returned by `recall`? |
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
| `minScore` | `number` | — | Minimum cosine similarity score (0.0–1.0). Results below this threshold are excluded. Applies before `topK` — so `topK=10, minScore=0.7` returns at most 10 results, all with score ≥ 0.7. |
| `filter` | `object` | — | Property equality/comparison filter applied to the vector-search results. Same shape and allowed key prefixes as the [recall filter](#prefiltered-recall-filter-parameter) (`properties.`, `tags`, `type`, `name`, `status`, `label`) with `eq`/`ne`/`in`/`exists`/`gt`/`gte`/`lt`/`lte` operators. Records not matching **all** conditions are excluded. |
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

## Storage Quotas

Configured in `config.json` under `storage`:

```json
{
  "storage": {
    "brain": { "softLimitGiB": 50, "hardLimitGiB": 100 },
    "files": { "softLimitGiB": 100, "hardLimitGiB": 200 },
    "total": { "softLimitGiB": 150, "hardLimitGiB": 200 }
  }
}
```

| Condition | Behaviour |
|---|---|
| Below soft limit | Normal operation |
| Above soft limit | Write succeeds, response includes `storageWarning: true` |
| Above hard limit | Write rejected with `507` and `storageExceeded: true` |

---

## Pagination

### Offset Pagination (Brain API)

All list endpoints accept `limit` and `skip`:

```http
GET /api/brain/spaces/general/memories?limit=100&skip=200
```

### Cursor Pagination (Sync API)

Sync endpoints return a `nextCursor` for efficient sequential reads:

```http
GET /api/sync/memories?spaceId=general&sinceSeq=0&limit=200
→ { "items": [...], "nextCursor": "eyJzZXEiOjIwMH0" }

GET /api/sync/memories?spaceId=general&cursor=eyJzZXEiOjIwMH0&limit=200
→ { "items": [...], "nextCursor": null }
```

When `nextCursor` is `null`, all data has been consumed.

---

## OIDC (OpenID Connect) Authentication

Ythril supports an optional OIDC provider as an **additional** authentication path alongside PATs. When enabled, browser users can sign in using their corporate identity (Keycloak, Entra ID, Okta, Auth0, …) without a separately managed PAT.

### Configuration

Add an `oidc` block to `config.json`:

```json
{
  "oidc": {
    "enabled": true,
    "issuerUrl": "https://keycloak.example.com/realms/my-realm",
    "clientId": "ythril",
    "audience": "ythril",
    "scopes": ["openid", "profile", "email"],
    "claimMapping": {
      "admin":    { "claim": "realm_access.roles", "value": "ythril-admin" },
      "readOnly": { "claim": "realm_access.roles", "value": "ythril-readonly" },
      "spaces":   { "claim": "ythril_spaces" }
    }
  }
}
```

| Field | Required | Description |
|---|---|---|
| `enabled` | Yes | Set `true` to activate OIDC. All other fields are ignored when `false`. |
| `issuerUrl` | Yes | IdP realm URL. The well-known discovery document is fetched from `{issuerUrl}/.well-known/openid-configuration`. |
| `clientId` | Yes | OAuth2 client ID registered at the IdP. |
| `audience` | No | Expected `aud` claim. Defaults to `clientId`. |
| `scopes` | No | Scopes to request. Defaults to `["openid", "profile", "email"]`. |
| `allowedAlgorithms` | No | JWS algorithms accepted when verifying ID tokens. Defaults to the asymmetric set `RS256/384/512`, `PS256/384/512`, `ES256/384/512`, `EdDSA`. Use it to **narrow** verification to what your IdP actually signs with (e.g. `["RS256"]`). |
| `claimMapping` | No | Maps IdP claims to Ythril permissions (see below). |
| `enforceForBrowser` | No | When `true`, the browser SPA rejects cached PAT sessions and always forces a fresh OIDC login. PATs continue to work for API / MCP bearer-header requests. Default: `false`. |
| `postLogoutRedirectUri` | No | URI the IdP should redirect to after `end_session`. Passed as `post_logout_redirect_uri`. Defaults to `{origin}/login`. |

### Claim Mapping

`claimMapping` controls how JWT claims are translated to Ythril permissions:

| Key | Description |
|---|---|
| `admin` | When the rule matches, the session has admin access. |
| `readOnly` | When the rule matches, the session has read-only access. |
| `spaces` | The claim value is used as the list of allowed space IDs (must be a JSON string array). |

Each rule has:

- `claim` — dot-notation path inside the JWT payload (e.g. `"realm_access.roles"`).
- `value` (optional) — the claim must equal this value, or be an array containing it. When omitted, the claim simply needs to be truthy.

**Fail-closed defaults.** A validly-signed JWT that matches **neither** the `admin` nor the `readOnly`
rule is accepted but granted **read-only access to no spaces** — grant access explicitly through the
rules above. (Previously such a token received read-write access to *all* spaces.) When a `spaces`
mapping is configured but the claim is missing or not a string array, the allow-list is empty (deny),
never "all spaces". Set `requireMatch: true` in `claimMapping` to reject unmatched tokens outright
with `401` instead of accepting them with no access.

### Bearer Token Dispatch

| Bearer value | Validation path |
|---|---|
| Starts with `ythril_` | PAT — bcrypt verification (unchanged) |
| Anything else | JWT — JWKS signature + `iss`/`aud`/`exp` verification, then claim mapping |

PATs continue to work without any changes when OIDC is enabled.

### OIDC Discovery Endpoint

```http
GET /api/auth/oidc-info
```

Used by the web client login flow to decide whether OIDC is enabled and which issuer/client settings to use.

**When OIDC is disabled:**

```json
{ "enabled": false }
```

**When OIDC is enabled:**

```json
{
  "enabled": true,
  "issuerUrl": "https://keycloak.example.com/realms/my-realm",
  "clientId": "ythril",
  "scopes": ["openid", "profile", "email"],
  "enforceForBrowser": false,
  "postLogoutRedirectUri": "https://brain.example.com/login"
}
```

`enforceForBrowser` is always present (boolean). `postLogoutRedirectUri` is included only when it is configured on the `oidc` block.

### Login Flow (Browser)

When OIDC is enabled, the login page **auto-redirects** to the IdP — no manual click required.

1. User navigates to `/login`. The SPA fetches `/api/auth/oidc-info` and detects OIDC is enabled.
2. Browser fetches the IdP discovery document and redirects to the authorization endpoint.
3. User authenticates at the IdP.
4. IdP redirects back to `/oidc-callback?code=…&state=…`.
5. The Angular app exchanges the authorization code for tokens directly at the IdP token endpoint (PKCE — no client secret in the browser).
6. The resulting access token (JWT) is stored in `localStorage` and used for all subsequent API calls.

To bypass SSO auto-redirect and use a PAT instead, navigate to `/login?local`.

### Keycloak Setup

1. Create a new client in your realm with **Client authentication: OFF** (public client).
2. Set **Valid redirect URIs** to `https://your-ythril-host/oidc-callback`.
3. Add a mapper for `ythril_spaces` (if using space scoping): **User attribute → Token claim** mapping.
4. Set `issuerUrl` to `https://keycloak.host/realms/<realm>`.

After saving, run `POST /api/admin/reload-config` to apply the OIDC settings without a restart.

### Entra ID (Azure AD) Setup

1. In the Azure portal, go to **App registrations → New registration**.
2. Set **Redirect URI** to `https://your-ythril-host/oidc-callback` (type: **SPA**).
3. Under **Authentication**, ensure **Access tokens** and **ID tokens** are checked under Implicit grant and hybrid flows. Leave the **SPA** redirect URI in place — PKCE is used automatically.
4. Note the **Application (client) ID** — this is your `clientId`.
5. The `issuerUrl` is `https://login.microsoftonline.com/<tenant-id>/v2.0`.
6. Set `audience` to the Application (client) ID (Entra sets `aud` to the client ID by default).
7. To map roles, create **App roles** and assign users/groups. Use `claimMapping.admin.claim: "roles"` and `claimMapping.admin.value: "ythril-admin"`.
8. For space scoping, add an optional claim or use directory extensions to emit a `ythril_spaces` claim.

```json
{
  "oidc": {
    "enabled": true,
    "issuerUrl": "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0",
    "clientId": "YOUR_CLIENT_ID",
    "scopes": ["openid", "profile", "email"],
    "claimMapping": {
      "admin": { "claim": "roles", "value": "ythril-admin" },
      "readOnly": { "claim": "roles", "value": "ythril-readonly" },
      "spaces": { "claim": "ythril_spaces" }
    }
  }
}
```

### Okta Setup

1. In the Okta admin console, go to **Applications → Create App Integration → OIDC → Single-Page Application**.
2. Set **Sign-in redirect URI** to `https://your-ythril-host/oidc-callback`.
3. Under **Assignments**, assign the users or groups who should have access.
4. Note the **Client ID** from the application's General tab.
5. The `issuerUrl` is `https://your-org.okta.com` (or `https://your-org.okta.com/oauth2/default` if using a custom authorization server).
6. To map admin/readOnly, create groups (e.g. `ythril-admin`, `ythril-readonly`) and configure a **Groups claim** in the authorization server: `claim name: groups`, `filter: Matches regex ythril-.*`.

```json
{
  "oidc": {
    "enabled": true,
    "issuerUrl": "https://your-org.okta.com/oauth2/default",
    "clientId": "YOUR_CLIENT_ID",
    "scopes": ["openid", "profile", "email", "groups"],
    "claimMapping": {
      "admin": { "claim": "groups", "value": "ythril-admin" },
      "readOnly": { "claim": "groups", "value": "ythril-readonly" },
      "spaces": { "claim": "ythril_spaces" }
    }
  }
}
```

### Auth0 Setup

1. In the Auth0 dashboard, go to **Applications → Create Application → Single Page Application**.
2. Set **Allowed Callback URLs** to `https://your-ythril-host/oidc-callback`.
3. Note the **Client ID** and **Domain** from the application settings.
4. The `issuerUrl` is `https://your-domain.auth0.com/`.
5. Set `audience` to your Auth0 API identifier if you have created a custom API; otherwise omit it.
6. To map roles, use **Auth0 Actions** (Login flow) to inject custom claims into the access token:

```js
// Auth0 Action — Login / Post Login
exports.onExecutePostLogin = async (event, api) => {
  const ns = 'https://ythril.example.com/';
  api.accessToken.setCustomClaim(ns + 'roles', event.authorization?.roles ?? []);
  api.accessToken.setCustomClaim(ns + 'spaces', event.user.app_metadata?.ythril_spaces ?? []);
};
```

```json
{
  "oidc": {
    "enabled": true,
    "issuerUrl": "https://your-domain.auth0.com/",
    "clientId": "YOUR_CLIENT_ID",
    "audience": "YOUR_API_IDENTIFIER",
    "scopes": ["openid", "profile", "email"],
    "claimMapping": {
      "admin": { "claim": "https://ythril.example.com/roles", "value": "ythril-admin" },
      "readOnly": { "claim": "https://ythril.example.com/roles", "value": "ythril-readonly" },
      "spaces": { "claim": "https://ythril.example.com/spaces" }
    }
  }
}
```

> **Note:** Auth0 requires namespaced custom claims (a URL prefix). Replace `https://ythril.example.com/` with your own namespace.

After saving any IdP configuration, run `POST /api/admin/reload-config` to apply the changes without a restart.

### Security Notes and Limitations

- **No server-side token revocation for OIDC.**  JWTs are validated statelessly (signature + `exp`).  Once issued by the IdP, a token is valid until it expires.  To revoke access, disable or remove the user at the IdP and set short token lifetimes (5–15 minutes recommended).
- **Silent token refresh.**  The SPA automatically schedules a background token refresh 60 seconds before the access token expires.  A hidden iframe is created with `prompt=none`; if the IdP session is still valid the user stays logged in with no interruption.  If the IdP session has also expired (or the IdP does not support `prompt=none`) the next API call returns 401 and the browser is redirected to the login page.  Configure your IdP's access token lifetime to balance UX vs security (5–15 minutes is a reasonable default).  This mechanism requires `Content-Security-Policy: frame-ancestors 'self'` (included in the default `frame-ancestors 'self'; object-src 'none'; base-uri 'self'` policy set by the server).
- **`admin` and `readOnly` cannot both match.**  If both claim rules match the same JWT, `admin: true` takes precedence and `readOnly` is ignored.  Design your IdP roles to be mutually exclusive.
- **Spaces claim controls visibility (fail-closed).**  When a `spaces` mapping is configured, the OIDC session can only see and modify the spaces named in that claim.  If the mapping is configured but the claim is missing or is not a string array, the allow-list is **empty (deny all)** — not "all spaces".  Users who cannot see expected spaces should check with their administrator that the IdP is emitting the correct claim values.
- **Config validation.**  When `oidc.enabled` is `true`, `issuerUrl` and `clientId` are required.  The server validates the OIDC config block at startup and on `reload-config` — a malformed block will prevent the server from starting.
- **Config reload required.**  Any change to the `oidc` block requires `POST /api/admin/reload-config` or a container restart to take effect.  The OIDC discovery document and JWKS key set are cached in memory and flushed on reload.
- **Enforcing OIDC for browser sessions.**  Set `enforceForBrowser: true` to prevent users who have a cached PAT in their browser from bypassing the IdP.  When this flag is set the SPA clears any PAT-based localStorage session on startup and forces a fresh OIDC login.  Programmatic callers (API, MCP) that supply an `Authorization: ****** header are not affected.
- **Sign-out clears all browser auth state.**  Clicking the sign-out button always removes every Ythril auth key from `localStorage` regardless of whether the session was established via OIDC or a PAT.  For OIDC sessions the browser is additionally redirected to the IdP's `end_session_endpoint` (from the discovery document) with an `id_token_hint` so the Keycloak / IdP server-side session is also destroyed.  Without this step, `prompt=none` silent refresh would immediately re-authenticate the user.  Use `postLogoutRedirectUri` to control where the IdP sends the user after sign-out.
