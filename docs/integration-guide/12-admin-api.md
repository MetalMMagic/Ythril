# Admin & Data Management APIs

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Admin API

## Reference integrity

Every link between brain records — a memory's `entityIds`, an edge's `from`/`to`, a chrono entry's
`entityIds`/`memoryIds`, a file's `entityIds`/`chronoIds`/`memoryIds` — names the target by its **id**,
which is a **UUID v4**. A name is not a reference.

**A reference that cannot resolve is refused.** The write returns `400` (or an MCP `isError`) naming the
field and the offending value, and **nothing is stored**. Both halves are checked:

- the value is a UUID v4, and
- a record with that id exists in the target space.

Format alone was never sufficient — a syntactically perfect id pointing at nothing dangles exactly as
silently as a name did, and the only symptom is a later traversal that quietly returns nothing.

### Opting out

A space may set `meta.strictLinkage: false` to accept unresolved references. This exists for **staged
imports**, where records legitimately reference targets that are created later in the run. It is a
deliberate per-space choice to accept dangling links, and it is **off by default** — you do not get lax
linkage by saying nothing.

Bulk writes (`POST /bulk`, `bulk_write`) check reference **format** but not existence even when strict,
because a payload may reference a record created earlier in the same payload; rejecting those would
break valid forward references within a batch.

Restoring a space export is unaffected: import writes records directly rather than through these
routes, so an export whose records reference each other round-trips regardless of the setting.

### Reload Config

```http
POST /api/admin/reload-config
Authorization: Bearer <admin-token>
X-TOTP-Code: <code>   # required when MFA is enabled
```

**Requires admin token** (and TOTP code when MFA is enabled). Re-reads `config.json` from disk. Useful after manual edits. Any spaces added to the config since the last load are automatically initialized (MongoDB collections, indexes, vector search index, and file directories created). The built-in `general` space is ensured to exist.

> **Manual edits are picked up automatically.** The server watches `config.json` and reloads within about two seconds of the file changing, running the same work this endpoint does — including initialising any space you added by hand. You do not have to call it after an edit; it remains available for scripts that want the reload to be synchronous, and for reloading `secrets.json` at a moment of your choosing.
>
> **One caveat:** the server holds the config in memory and writes the whole file back whenever anything changes it. An edit made in the ~2-second window *before* the watcher notices can still be overwritten by a config write that lands in between (creating a space, saving settings). If you are editing by hand on a busy instance, call this endpoint straight after saving to close that window, or stop the server, edit, and start it again — which is always safe.

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

> **A backup is an unencrypted copy of everything, and `requireEncryptedAtRest` does not cover it.**
>
> The dump is written by reading *through* `mongod`, so it comes out **decrypted**: every memory, entity, edge,
> chrono entry, file-meta record and audit entry, as plaintext NDJSON on the data volume. If you followed
> [Encryption at Rest](02-hosting.md#encryption-at-rest) and gave the instance a master key, that covers the app's
> four state files — `config.json`, `secrets.json`, `schema-library.json`, `schema-catalogs.json`. It does not
> cover this, and neither does running against an encrypted `mongod`.
>
> Ythril writes the dump directory `0700` and each NDJSON file `0600`, so it is not readable by other users on the
> host. Beyond that the protection is yours to arrange:
>
> - treat `<data-root>/backups/` as sensitive as the database itself — it *is* the database;
> - the **offsite** copy is usually a mounted share, and `<destRoot>/<backupId>-files/` additionally contains every
>   uploaded file verbatim. Ythril creates those directories `0700` too, but a network filesystem may not honour
>   POSIX modes at all — encrypt the volume or the transport;
> - a dump you download is plaintext from the moment it leaves the instance.
>
> This is stated rather than fixed because whether Ythril should *encrypt* dumps with the master key is a real
> trade-off: it would make a backup unrestorable without that key, which is either the point or a foot-gun
> depending on why you are taking it. Until that is decided, the honest thing is to say what the current behaviour
> is.

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
