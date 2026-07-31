# Changelog — 1.x

Frozen. Releases in the 1.x series, newest first. The current series is in
[CHANGELOG.md](../CHANGELOG.md).

Split out when the single file passed 7,000 lines — nobody scrolls that far, and GitHub stops
rendering it. Nothing here has been edited; the sections are byte-identical to what they were.

---

## [1.4.4] — 2026-07-07

### Added

- **MCP Streamable HTTP transport (`POST /mcp`)** — adds a second MCP transport alongside the
  existing SSE transport.  `POST /mcp` accepts a JSON-RPC 2.0 request (`Content-Type:
  application/json`) and returns the result synchronously as `Content-Type: application/json`
  (when `Accept: application/json`) or upgrades to an SSE stream (when `Accept:
  text/event-stream`), per the [2025-03-26 MCP spec](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/).
  The new transport is stateless and works through standard HTTP proxies (HTTPS CONNECT, CDN,
  serverless, etc.) where a persistent SSE stream is not possible.  Both transports share the same
  authentication middleware and tool registry:
  - `GET /mcp` — existing SSE transport (unchanged, backward-compatible)
  - `POST /mcp` — new Streamable HTTP transport (stateless, per-request)
  3 new integration tests and 1 new security test validate the new endpoint. (#122)

### Fixed

- **Entity/edge type schema auto-population now uses selected type** — `buildPropertiesObject` previously always used the first defined type's property schemas regardless of which type was selected in the form. The function now accepts the selected type name and looks up the correct per-type schema, so switching entity type or edge label rebuilds properties from the chosen type's schema instead of always using the first. (#125)
- **Empty optional properties stripped on save** — When saving a new or edited entity or edge, property fields that are empty strings and not marked `required` in the type schema are now omitted from the stored document. Required fields with empty values are still forwarded to the server so that schema validation can surface a clear error. (#125)
- **Space default purpose corrected and made exhaustive** — The pre-filled MCP purpose template shown when creating a space previously listed a non-existent `recall_global` tool, used stale `kind` parameter names for chrono tools (renamed to `type` in v1.0.0), and omitted `list_spaces`, `update_space`, `wipe_space`, and the `space` parameter from all tool signatures. The template now reflects the actual global-mode MCP API exactly.

---

## [1.4.3] — 2026-07-06

### Added

- **OIDC `claimMapping.requireMatch`** — new boolean field; when `true`, any OIDC JWT that matches
  neither the `admin` nor the `readOnly` claim rule is rejected with 401.  This closes the access
  gap where KC-authenticated users who obtain a valid audience-matched token via SSO from a shared
  realm could read or write data without any mapped Ythril role.  PAT tokens are entirely
  unaffected.  4 new standalone tests validate all branches of the guard. (#120)

---

## [1.4.2] — 2026-07-06

### Added

- **OIDC `enforceForBrowser` gate** — new `enforceForBrowser` config field evicts PAT-based sessions when an OIDC provider is active, ensuring browser users always authenticate through the IdP. Cached per-page-load to avoid repeated server calls; race condition guarded by re-checking token type inside the resolved promise.
- **OIDC `postLogoutRedirectUri`** — new config field; passed as `post_logout_redirect_uri` to the IdP's `end_session_endpoint` on sign-out.
- **`end_session_endpoint` sign-out** — `logout()` now unconditionally clears all auth localStorage keys (PAT + OIDC); `logoutOidc()` redirects to the IdP's end-session endpoint with `id_token_hint` when the discovery document provides one.
- **`id_token` stored on login** — OIDC `id_token` persisted in localStorage (`oidc_id_token`) so it is available as `id_token_hint` on subsequent sign-out.
- **5 new standalone tests** covering `enforceForBrowser`, `postLogoutRedirectUri`, and `end_session_endpoint` surfacing via `getDiscoveryDoc()`.

### Fixed

- **Stale `id_token_hint` on re-login** — `loginOidc()` now explicitly removes the stored `oidc_id_token` when no `idToken` is supplied, preventing a prior session's token from leaking into a new sign-out flow.

---

## [1.4.1] — 2026-07-05

### Fixed

- **Custom chrono types now respected** — `typeSchemas.chrono` entries were previously ignored at
  validation time because the global built-in enum (`event`, `deadline`, `plan`, `prediction`,
  `milestone`) was enforced unconditionally. `getAllowedChronoTypes()` now returns the keys of
  `typeSchemas.chrono` when any are defined, falling back to the five built-ins only when no
  custom types are configured. Validation is also applied consistently during sync ingest so
  type constraints are honoured on replicated entries. (#114)

- **Database name derived from `MONGO_URI`** — all MongoDB operations previously used a hardcoded
  `"ythril"` database name regardless of what was specified in the connection string. The database
  component is now parsed from `MONGO_URI` at startup (via `dbNameFromUri()`), with `"ythril"` as
  a fallback for URIs that do not include an explicit database path segment. Dump and restore
  operations use the same resolved name. The default built-in URI is
  `mongodb://ythril-mongo:27017/ythril` so existing bundled deployments are unaffected. (#116)

---

## [1.4.0] — 2026-05-02

### Added

- **Face recognition pipeline** — automatically detect, embed, and label faces in uploaded images.
  Powered by `@vladmandic/human` (BlazeFace Back detector + FaceRes 128-dimensional descriptor)
  running entirely in-process on the CPU via TF.js — no GPU, no Python, no sidecar required.
  - **Auto-labeling:** when a detected face matches a labeled gallery entry above the configurable
    cosine similarity threshold (`confidenceThreshold`, default `0.6`), the parent image is
    automatically linked to the matching entity (`entityIds`).
  - **Face gallery:** each detected face is stored as a `{fileId}#face-chunk{N}` record with a
    128d `faceEmbedding`, `faceBbox` (normalised bounding box), and `faceEntityId` when
    auto-labeled or manually confirmed. Gallery lookups use exact-mode `$vectorSearch` on a
    dedicated per-space `{spaceId}_files_faceEmbedding` Atlas vector index.
  - **Gallery poisoning guard:** only entities whose `type` is in `personEntityTypes` (default
    `["person"]`) are eligible to enter the gallery. Linking a "building" or "product" entity
    to a photo cannot corrupt future auto-labeling regardless of how many faces the image contains.
    Exactly-one-person criterion must be met (single matching entity in `entityIds`).
  - **Manual label propagation:** when a user manually links an image to a person entity via
    `updateFileMeta` (or the Files UI), all existing face-chunk records for that file are
    immediately updated with the new `faceEntityId` so they enter the gallery at once.
  - **`reprocessSyncedImages`** — when `true` (default), images received through a network sync
    are automatically re-enqueued for face processing. This lets secondary instances build their
    own face gallery from synced images without requiring a separate re-upload.
  - Model files are **not bundled** — place them at `DATA_ROOT/<modelPath>/` (default
    `human-models/`). Download links:
    - `blazeface-back.json` + `.bin` (~0.5 MB) — face detector
    - `faceres.json` + `.bin` (~6.7 MB) — 128d face descriptor
    from `https://vladmandic.github.io/human/models/`
  - Configuration under `mediaEmbedding.faceRecognition` in `config.json` — see
    [integration guide](docs/integration-guide.md) for the full reference.
  - **Opt-in** (`enabled: false` by default). Enabled per-instance in `config.json`.

- **Document processing: `hi_res` strategy + embedded image extraction** — the unstructured
  sidecar now defaults to `strategy=hi_res` (full Tesseract OCR + layout detection) instead of
  `strategy=auto`. Two new `mediaEmbedding.documentProcessing` settings control this:
  - **`strategy`** (`"hi_res"` default | `"auto"` | `"fast"` | `"ocr_only"`) — passed directly
    to the unstructured-api-full sidecar. `hi_res` enables accurate OCR on scanned documents,
    correct table structure extraction, and embedded image extraction. `fast` uses pdfminer
    text-layer only (fastest, no OCR, no images). `auto` lets the sidecar decide.
  - **`extractImages`** (`true` default) — when strategy is `hi_res`, base64-encoded images
    returned by the sidecar in `Image` partition metadata are decoded and written to disk as
    `_extracted/{originalId}/image-{N}.{ext}` subfiles. Each subfile gets a filemeta record
    with `parentFileId` pointing to the source document, and is automatically enqueued for the
    full media pipeline (caption generation + face recognition). Only effective when
    `strategy: "hi_res"`.
  - **Table improvement** — `Table` partitions now use `metadata.text_as_html` (the sidecar's
    structured HTML representation) when available, preserving row/column structure in the
    Markdown output. Previously only raw text was used.

- **Binary media embedding pipeline** — image / audio / video uploads now convert to text and produce
  searchable chunks in the same vector space (`nomic-embed-text-v1.5`) as memories, entities and
  documents. Pluggable provider model: vision via Ollama-compatible API (default `moondream2`) or any
  OpenAI vision API; STT via faster-whisper-server (`/v1/audio/transcriptions`) or OpenAI Whisper.
  **Enabled by default** — both the K8s manifests and the workstation `docker-compose.yml` ship with
  bundled `ollama` and `whisper` services, so binary embedding works out of the box. Disable via
  `mediaEmbedding.enabled: false` in `config.json` or `MEDIA_EMBEDDING_ENABLED=false`.
  - Persistent per-space `<spaceId>_media_jobs` queue with atomic `findOneAndUpdate` claim, exponential
    idle backoff, and crash-recovery sweep (per-document, race-safe; runs at startup and periodically).
  - Per-job retry up to `maxAttempts` (default 3) with sanitised error surface; `POST /api/files/:spaceId/retry_embedding`
    re-triggers manually. Failed attempts schedule the next retry with exponential backoff
    (`claimableAfter` field; 30 s after attempt 1, 2 min after attempt 2) so a fast-failing job
    cannot starve siblings in the queue.
  - Audio chunked on natural silence boundaries (`ffmpeg silencedetect`) with overlap window;
    video keyframes sampled per-second (`fps=1/intervalS`) and combined with audio transcript chunks.
  - Recall responses (`brain.recall_files`) now hydrate parent file context for chunk hits.
- **`GET / PATCH /api/admin/media-config`** — admin API to inspect and update the media embedding
  pipeline configuration. PATCH requires MFA. API keys are stored in `secrets.json` (mode 0o600),
  never in `config.json`. Fields supplied by env vars are read-only (returned in `lockedByInfra`).
  External provider URLs validated by the existing SSRF guard (no private IPs / loopback / cloud metadata).
- **Settings → Models page** — UI for switching between local (cluster Ollama / Whisper) and external
  providers, model names, base URLs and API keys, with infra-locked indicator.
- **Kubernetes manifests** — `ollama-deploy.yaml`, `whisper-deploy.yaml`, `media-netpol.yaml`,
  `media-cilium-netpol.yaml`. Both NetworkPolicy and CiliumNetworkPolicy required (Cilium policy
  alone does not unblock traffic when a default-deny policy exists). Pods run as non-root with
  read-only root filesystem, dropped capabilities, RuntimeDefault seccomp, and explicit memory limits.
  Internet egress restricted by FQDN to `registry.ollama.ai` (Ollama) and `huggingface.co` (Whisper),
  with explicit kube-dns egress.
- **Prometheus media metrics** — `ythril_media_jobs_completed_total`, `_failed_total`, `_retried_total`
  (counters by space + media_type), `ythril_media_job_duration_seconds` (histogram), and
  `ythril_media_jobs_pending` / `_processing` / `_failed` (gauges by space, scrape-time).
- **Audit route** — `PATCH /api/admin/media-config` recorded as `config.media.update`.
- **Dockerfile** — `ffmpeg` added (required by audio/video pipelines).
- **Workstation media stack** — `docker-compose.yml` now ships `ollama` (auto-pulls
  `moondream2` on first start) and `whisper` (`fedirz/faster-whisper-server:latest-cpu`,
  Whisper `base` model auto-downloaded on first request) so binary embedding works
  out of the box on workstation deployments, mirroring the K8s manifests. Defaults
  for `vision.baseUrl` / `stt.baseUrl` use short service names (`ollama:11434`,
  `whisper:8000`) which resolve in both Docker Compose bridge DNS and the K8s
  `ythril` namespace.

- **`PUT /api/spaces/:id/schema`** — New endpoint for *full* typeSchemas replacement
  (PUT semantics).  Before overwriting, the previous schema is written to a timestamped
  JSON backup file (`_schema-backup-<timestamp>.json`) inside the space's file store so it
  can be recovered or re-imported.  Use this endpoint when an intentional full replacement is
  required instead of an incremental update.  Returns the updated space on success.

---

### Fixed

- **`PATCH /api/spaces/:id` now uses true merge semantics for `meta`** — Previously,
  supplying a `meta.typeSchemas` payload silently replaced the *entire* schema, dropping
  every entity/edge/memory/chrono type not present in the request body.  PATCH now deep-merges:
  scalar meta fields (`purpose`, `usageNotes`, `validationMode`, `tagSuggestions`,
  `strictLinkage`) overwrite the stored value only when explicitly supplied; `typeSchemas` is
  merged per-knowledge-type and per-type-name, so types absent from the request body are
  preserved.  This also means existing meta fields are no longer lost when only `typeSchemas`
  is patched.

## [1.2.0] — 2026-04-24

### Added

- **Database backup scheduling** — cron-based automatic backups configurable from the Settings → Database page. Frequency options: never, hourly, daily, weekly, monthly. Time-of-day, weekday, and day-of-month pickers for non-hourly schedules. Human-readable schedule summary.
- **Backup destination settings** — backups can stay in Ythril’s internal data folder (default) or be copied to any path accessible from the server (mounted volume, network share). Configurable per-destination retention count (how many backups to keep). Settings persisted in `backup.json`.
- **`GET /api/data/browse-dirs`** — authenticated server-side directory listing used to display the internal backup path placeholder.
- **`config/backup.example.json`** — documented example of the backup configuration schema.
- **Integration test: `db-backup-offsite.test.js`** — covers backup trigger, offsite copy, and retention enforcement.
- **i18n** — all backup destination and schedule strings localised in en / de / pl, including new hourly frequency option.

### Changed

- **MCP `recall` output format** — The `recall` tool (and cross-space recall when `space` is omitted) now returns structured JSON instead of human-readable prose. Each result is a wrapper object with five top-level keys: `score`, `spaceId`, `type`, `matchedText`, and `record`. `record` is the full stored document including `_id`, making follow-up tool calls (`update_memory`, `upsert_entity`, `delete_memory`, etc.) possible without a second lookup. `matchedText` is the pre-embedding source text (the exact string fed to the embedding model for that document) — stored at write time for all knowledge types. Old entries without a stored `matchedText` fall back to a summary derived from the same algorithm. `record` also gains `updatedAt` and (for edges/chrono) the native `type` field correctly restored. Integration guide updated with response format, field descriptions, and an example response. Full test suite passes on fresh test instances (issue #91).

---

## [1.1.2] — 2026-04-23

### Fixed

- **Schema Library catalog URLs** — `POST /api/schema-library/catalogs` now rejects non-HTTPS URLs with 400. Previously the SSRF guard allowed `http://` despite the documented requirement for HTTPS.
- **Catalog proxy error handling** — `GET /catalogs/:name/entries` and `GET /catalogs/:name/entries/:entryName` now normalize all non-2xx upstream responses to `502 Bad Gateway` instead of forwarding the upstream status code directly.

---

## [1.1.1] — 2026-04-23

### Fixed

- **Schema Library route ordering** — `GET /public`, `GET /public/:name`, and `GET /catalogs` were registered after `GET /:name` in the Express router, causing those literal paths to be matched as library entry name lookups (returning 401 or 404). Routes are now registered in correct specificity order.
- **`.gitignore`** — added `config/schema-catalogs.json` and `testing/sync/configs/*/schema-catalogs.json` (and test-instance `schema-library.json`) to prevent accidental commits of runtime data files.

---

## [1.1.0] — 2026-04-22

### Added

- **Instance-level Schema Library** — a dedicated first-class store of reusable `TypeSchema` definitions, persisted in `schema-library.json` (sibling to `config.json`).
  - Full CRUD REST API: `GET/POST/PUT/DELETE /api/schema-library/:name`. Max 500 entries. Entry names must match `^[a-z0-9][a-z0-9_-]{0,199}$`.
  - `TypeSchema` now accepts `{ "$ref": "library:<name>" }` in place of an inline definition. `resolveMetaRefs()` in `schema-validation.ts` resolves all refs before validation runs. Unresolvable refs silently degrade to an empty schema (no constraints).
  - Editing a library entry takes effect immediately for all referencing spaces — no per-space re-patch needed.
  - **Schema Library** UI is a top-level page (`/schema-library`) accessible from the Workspace section of the main navigation. Editor reuses the same TypeSchemaState-based form as the per-space schema editor (naming pattern, tag suggestions, full property table).
  - Per-type export/import buttons in the spaces schema editor: **→ Lib** (save to library) and **← Lib** (import inline or as `$ref`). Types using `$ref` display a blue badge in the type list.
  - File export (↓) and bulk import from file (↑ Import from file) in the library page.
  - Integration tests: `testing/integration/schema-library.test.js` covering CRUD, `$ref` resolution, live library-update propagation, unresolvable-ref fallback, 409 duplicate, 400 invalid payloads, and name-format validation.
  - i18n: en / de / pl.
- **Schema Library — search** — live filter bar on the library page searches by entry name, type name, and description.
- **Schema Library — type filter toggles** — pill buttons to filter the library list by knowledge type (entity / memory / edge / chrono).
- **Schema Library — foreign catalog support** — catalogs tab lets admins link external Ythril instances by base URL; entries from those catalogs can be browsed and imported directly. URL validation includes SSRF protection.
- **Schema Library — publish toggle** — entries can be marked published/unpublished, controlling visibility on the `/api/schema-library/public` feed. Published entries display a globe icon in the card.
- **Schema Library — public API** — unauthenticated `GET /api/schema-library/public` and `/api/schema-library/public/:name` endpoints expose published entries; rate-limited at 60 req/min per IP.
- **Schema Library — `GET /:name/usages`** — returns the list of spaces and type names that reference a library entry via `$ref`, used to drive the safe-delete confirmation flow.
- **Schema Library — "Import from Library" in add-type footer** — the add-type row in the space schema editor now includes a **← Lib** button directly, so a type can be imported from the library without first creating an empty type manually.
- **Space schema — "From File" footer button** — the add-type row now also includes a **From File** button that imports a previously exported type-schema JSON file as a new type, with the type name derived from the file's `typeName` field.
- **`ph-icon`: `bookmarks`, `gear`, and `globe` icons** — added Phosphor Icons SVG paths; the Schema Library nav item, Settings nav item, and publish toggle now render their icons correctly.
- **`PropSchemaTableComponent`** — shared reusable standalone Angular component encapsulating the property schema editor table (expand/collapse rows, type / mergeFn / pattern / min / max / enum / required editing). Used in both the Schema Library editor and the space schema editor.

### Changed

- **Schema Library — click to edit** — clicking anywhere on a library entry card opens the edit dialog; the separate Edit button has been removed.
- **Schema Library — card layout** — knowledge-type badge appears before the entry name; type name and last-updated timestamp are shown in the card footer.
- **Schema Library — identifier auto-derived** — the "Name (identifier)" field in the create/edit dialog is no longer a separate editable input. The slug identifier is automatically derived from "Default Type Name" as the user types, and displayed read-only beneath it.
- **Schema Library — edit/delete icons** — the text-character edit (`✎`) and delete (`✕`) buttons in the entry card have been replaced with `ph-icon` `pencil-simple` and `trash` icons for visual consistency.
- **Schema Library — delete button is icon-only** — the delete confirmation button now shows a `ph-icon trash` icon instead of a text label.
- **Schema Library — ref-hint removed** — the static `$ref` reference hint paragraph below the page header has been removed.
- **Schema editor — file arrow directions corrected** — per-type export button now shows ↑ (send to file) and import button shows ↓ (load from file), matching the established convention used elsewhere in the UI.
- **Space schema — "From Lib" / "From File" buttons unified style** — both footer import buttons now use `btn-secondary` (same as `+ Add Type`), with ph-icons.
- **Space schema — "From Library" always imports as `$ref`** — the picker dialog no longer offers an "Import inline" option. All library imports create a linked `$ref` schema.
- **Space schema — "Save to Lib" no longer uses browser dialogs** — `prompt()` and `alert()` calls removed. The entry name is auto-derived from the type name. On success the type is automatically converted to a linked `$ref` in-place.
- **Property schema editor — required toggle in row header** — the required checkbox is now always visible inline in the property name cell; expanding the row no longer shows a redundant header banner.
- **Property schema editor — click row to toggle expand/collapse** — clicking anywhere on a property row expands or collapses it; the separate triangle button has been removed.
- **Schema Library / Spaces settings — dialogs close on save** — all save operations (schema library entry, catalog, space settings) close the dialog automatically on success. Redundant Cancel buttons removed from dialogs that already have an X button and backdrop click.
- **Entity search — A-Z / Semantic toggle in picker mode** — the search-mode pill toggle was previously only rendered in `bar` mode; it now appears in `picker` mode as well.
- **Entity search — default mode changed to `name`** — `defaultMode` on `EntitySearchComponent` defaults to `'name'` (A-Z) instead of `'semantic'`.

### Fixed

- `config/schema-library.json` added to `.gitignore` — the instance-level library file is runtime data and must not be committed alongside `config.json` and `secrets.json`.

## [1.0.0] — 2026-04-20

### ⚠ Breaking Changes

Two breaking API changes are present in this release. Clients, tests, and scripts that were written against the 0.9.x/0.10.x schema API or the chrono API must be updated before upgrading.

---

#### 1. `ChronoEntry.kind` renamed to `type`

The `kind` field on chrono entries has been renamed to `type` to be consistent with all other knowledge types in the API (`memory.type`, `entity.type`, `edge.type`).

**Affected endpoints:**

- `POST /api/brain/spaces/:spaceId/chrono` — request body
- `POST /api/brain/spaces/:spaceId/bulk` — `chrono[]` items in the bulk body
- `GET /api/brain/spaces/:spaceId/chrono` — response documents
- MCP tools: `create_chrono`, `bulk_write` (chrono items), `list_chrono` (filter param and response)

**Migration — before:**

```json
{ "title": "Sprint review", "kind": "event", "startsAt": "2026-05-01T10:00:00Z" }
```

**Migration — after:**

```json
{ "title": "Sprint review", "type": "event", "startsAt": "2026-05-01T10:00:00Z" }
```

Valid values are unchanged: `event`, `deadline`, `plan`, `prediction`, `milestone`.

The TypeScript type alias `ChronoKind` remains exported as a deprecated alias for `ChronoType` to ease library migration, but will be removed in a future release.

---

#### 2. Space schema meta format replaced by `typeSchemas`

The flat schema fields on `SpaceMeta` (`entityTypes`, `edgeLabels`, `namingPatterns`, `requiredProperties`, `propertySchemas`) have been replaced by a single nested `typeSchemas` object. The old flat fields are no longer accepted — `PATCH /api/spaces/:id` uses a strict Zod schema and will return 400 `unrecognized_key` for any old field names.

**Affected endpoints:**

- `PATCH /api/spaces/:id` — `meta` field in request body
- `GET /api/spaces/:id/meta` — response shape (no `entityTypes` array in response)
- `POST /api/spaces/:id/validate-schema` — schema in `meta` payload
- MCP tools: `update_space` (meta argument), `get_space_meta` (response)

**Migration — before (flat format):**

```json
{
  "validationMode": "strict",
  "entityTypes": ["service", "person"],
  "edgeLabels": ["depends_on", "owns"],
  "namingPatterns": { "service": "^[A-Z]" },
  "requiredProperties": {
    "entity": ["team"],
    "memory": ["source"],
    "edge": ["confidence"],
    "chrono": ["priority"]
  },
  "propertySchemas": {
    "entity": { "team": { "type": "string", "enum": ["alpha", "beta"] } },
    "memory": { "source": { "type": "string" } },
    "edge": { "confidence": { "type": "number", "minimum": 0, "maximum": 1 } },
    "chrono": { "priority": { "type": "string", "enum": ["low", "medium", "high"] } }
  }
}
```

**Migration — after (`typeSchemas` format):**

```json
{
  "validationMode": "strict",
  "typeSchemas": {
    "entity": {
      "service": {
        "namingPattern": "^[A-Z]",
        "propertySchemas": {
          "team": { "type": "string", "enum": ["alpha", "beta"], "required": true }
        }
      },
      "person": {
        "propertySchemas": {
          "team": { "type": "string", "enum": ["alpha", "beta"], "required": true }
        }
      }
    },
    "edge": {
      "depends_on": {
        "propertySchemas": {
          "confidence": { "type": "number", "minimum": 0, "maximum": 1, "required": true }
        }
      },
      "owns": {}
    },
    "memory": {
      "note": {
        "propertySchemas": {
          "source": { "type": "string", "required": true }
        }
      }
    },
    "chrono": {
      "event": {
        "propertySchemas": {
          "priority": { "type": "string", "enum": ["low", "medium", "high"], "required": true }
        }
      }
    }
  }
}
```

Key differences:

- `entityTypes` and `edgeLabels` are gone — allowed types/labels are now inferred from the keys of `typeSchemas.entity` and `typeSchemas.edge`
- `namingPatterns` (global map) → `typeSchemas.entity.<typeName>.namingPattern` (per-type inline string)
- `requiredProperties` (list per knowledge-type) → `required: true` flag inline on each `propertySchemas` entry
- `propertySchemas` (nested `entity/memory/edge/chrono`) → `typeSchemas.<knowledgeType>.<typeName>.propertySchemas`
- To clear a schema entirely, send `{ "typeSchemas": {} }` — the old empty-list pattern (`"entityTypes": []`) is no longer accepted
- `GET /api/spaces/:id/meta` no longer returns `entityTypes` — check `typeSchemas` instead

**Memory and chrono schema validation now require `type` field:**
Schema validation for memories and chrono entries is only triggered when the document carries a `type` field matching a key in `typeSchemas.memory` / `typeSchemas.chrono` respectively. Documents without a `type` are not validated (allowing untyped legacy data to coexist). To enforce validation, define the types you care about in `typeSchemas` and always include `type` in write payloads.

---

### Security

- **Sync write routes require non-read-only tokens**: All `POST` routes under `/api/sync/` now enforce `denyReadOnly`, matching the same constraint on the brain and admin APIs. Previously a read-only token could push gossip, bulk-upsert documents, and trigger reindexes. Any sync client using a scoped read-only token for writes must be issued a full-access token.
- **Sync member URL hijacking fixed**: `POST /api/sync/networks/:networkId/members` now verifies that the requesting `peerInstanceId` matches the member record being submitted. A peer could previously register a URL pointing to any host on behalf of any other member.
- **Sync vote forgery fixed**: `POST /api/sync/networks/:networkId/votes/:roundId` now verifies that `instanceId` in the vote payload matches the authenticated `peerInstanceId`. A peer could previously cast votes on behalf of other members in a vote round.
- **CSP hardened**: Content-Security-Policy response header now includes `object-src 'none'; base-uri 'self'` in addition to the existing directives, blocking plugin/embed injection and base-tag hijacking.

### Fixed

- **Memory `type` field now stored and validated**: `POST /api/brain/:spaceId/memories` and `POST /api/brain/spaces/:spaceId/memories` previously ignored the `type` field in the request body — it was neither stored nor passed to schema validation. `type` is now extracted, stored on the document, and forwarded to `validateMemory` so `typeSchemas.memory` rules are enforced correctly.
- **Bulk write memory `type` not passed to validator**: In `POST /api/brain/spaces/:spaceId/bulk`, each memory item's `type` was extracted but not forwarded to `validateMemory`, meaning required-property rules defined under `typeSchemas.memory.<typeName>` were silently skipped. All three memory items would be inserted regardless of schema violations. Now `type` is passed to both the validator and the `remember()` call.
