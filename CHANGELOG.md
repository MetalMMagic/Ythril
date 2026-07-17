# Changelog

All notable changes to Ythril are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Characterization tests for the settings `SpacesComponent` (36 tests), landed before it is split.**
  The 1893-line component had **no test coverage at all**, and the client suite as a whole (71 tests)
  is far thinner than the server's — the AOT build proves a component compiles, not that it still
  behaves. These pin what the component *does today* so the upcoming split into per-tab child
  components (A17.8) has something to be measured against: the `sortedSpaces` sort/filter pipeline
  (all five modes, search across label/id/description, and the fact that it sorts *then* filters),
  `storageInfo`/`fmtGiB` thresholds, `openSettings` populating all four tabs (by value — editing the
  form must not mutate the space object), `buildMeta`'s field-by-field emission, proxy-target
  selection, duplicate rules, and tab/dialog rendering. Most importantly they cover the
  **library `$ref` round-trip**: a schema linked as `$ref: "library:x"` is held as a private
  `_libRef` sentinel while editing and must be emitted as `$ref` again — lose it and saving a space
  silently converts a linked schema into an empty inline one. The suite was verified green against
  the unmodified component *and* verified to fail when that round-trip is deliberately broken; a
  characterization test that cannot fail is worthless. Client suite: 71 → 107 tests.

- **Webhooks now fire for agent-driven (MCP) brain mutations, emitted from one place.** Previously
  only the REST API emitted `memory.*`/`entity.*`/`edge.*`/`chrono.*` events; the equivalent MCP
  tools (`remember`, `upsert_entity`, `upsert_edge`, `create_chrono`, `update_*`, `delete_*`,
  `merge_entities`) emitted nothing, so subscribers silently missed everything agents did — the bulk
  of writes in an MCP-first deployment. Emission is now **centralised inside the shared brain
  functions** (`remember`/`updateMemory`/`deleteMemory`, `upsertEntity`/`updateEntityById`/
  `deleteEntity`, `upsertEdge`/`updateEdgeById`/`deleteEdge`, `createChrono`/`updateChrono`/
  `deleteChrono`, `executeMerge`), which emit when handed a `WebhookActor` — so REST and MCP both
  emit (with token attribution threaded through the MCP tool context, fixing the missing
  `tokenId`/`tokenLabel` on MCP file webhooks too) while internal callers (sync, import) stay silent.
  The manual per-route emits were removed, so each event has a single source of truth. A latent bug
  is fixed in passing: a by-id entity update emitted `entity.created` (the route keyed off a dup
  warning) — it now correctly emits `entity.updated`. **Bulk writes** (`POST /bulk`, MCP `bulk_write`)
  intentionally do **not** fire per-item events (no 10k-webhook firehose); they emit one new
  **`bulk.write`** summary event (`{ inserted, updated, errorCount }`) a workflow can inspect.
  *(Note: the single-memory REST create still inlines its own emit — a duplication tracked for the
  modularity pass.)*

- **Optional soft-delete for file metadata (`softDeleteFileMeta`) + a metadata-delete guard.**
  A new top-level config flag (default `false`, preserving today's hard-delete behavior) changes
  what happens to a file's metadata record when the file is deleted: instead of removing the record,
  it is flagged `deletedAt = <now>` and retained. Flagged records stay listed and searchable but show
  a **"deleted" badge** in the Brain → File Meta view; re-uploading the same path clears the flag.
  Independently of the setting, the metadata-delete endpoint (`DELETE /api/brain/spaces/:id/files`)
  now **refuses (409) to remove a record whose file still exists on disk** — deleting metadata for a
  live file would silently orphan it; delete the file itself instead. Only a flagged or orphaned
  record (file already gone) can be purged. Derived records (conversion chunks / `_converted` /
  `_extracted`) are always hard-removed regardless of the setting. Applies across the file, folder,
  MCP, and media-worker delete paths.

- **CI guard against upstream image/tag breakage (`Image Pin Check` workflow).** Twice now an
  upstream has broken a pinned reference with no change on our side — `unstructured-api-full` went
  private on quay.io (this release) and the Ollama model `moondream2` was renamed to `moondream`
  (#219) — each surfacing only when a developer ran `docker compose up`. A new scheduled workflow
  (`.github/workflows/image-pin-check.yml`) now HEAD-checks every externally-hosted pin **without
  pulling**: it parses the `image:` references straight out of `docker-compose.yml`, the test compose,
  and `kubernetes/manifests/` (so it can't drift from what we ship), verifies each is still resolvable
  with anonymous credentials via `docker buildx imagetools inspect`, and separately checks the Ollama
  `moondream` model manifest. Runs weekly, on `workflow_dispatch`, and on any PR that touches a file
  which pins an image — so a bad pin fails the PR instead of a teammate's first boot. Needs no secrets.

- **Type & tag filtering across the Brain views (FEATURES F5 + F6).** Filtering was uneven and
  mostly absent: list tabs could only be narrowed by clicking an existing tag, and the semantic
  Search tab's only "filter by schema" affordance was a raw JSON textarea. Now a shared
  **record-filter-bar** (a type/schema dropdown + a tag box) sits on all four list tabs — memories,
  entities, edges, chrono — narrowing them **server-side**; the dropdown is populated from the space's
  schema type names *unioned with the types actually present in the list*, so it works with or without
  a defined schema. The Search tab gains a **"filter by type"** dropdown that assembles
  `filter: { type: { eq } }` (a friendly shortcut for the JSON filter, which still works). Server:
  the memories listing now honours a `type` param, and edges honour `tag`/`type` (entities and chrono
  already did); a long-standing dead param is fixed — the chrono list's `kind` filter was sent under a
  name the server ignored, so it never filtered (it now sends `type`). The memories tag filter and a
  table tag-click share one source of truth (the bar), and clearing/space/tab switches reset it.
  Covered by a filter-bar component spec and verified end-to-end: each collection narrows by `type`
  and `tag` on the real route (2→1), and the Search dropdown emits the expected `filter` expression.

- **Network-membership status indicator on Brain space chips (FEATURES F8).** A space chip gave no
  hint that the space is part of a sync network or what state that network is in. Each chip now shows
  the **Networks** icon (the same `link` glyph as the nav item), colour-coded by an aggregate status
  that `GET /api/spaces` computes from config + the live sync engine: **red** = a peer has failed to
  sync ≥3 consecutive cycles (*investigate* — not a single auto-retried blip), **yellow** = a sync cycle
  is running now, **blue** = a governance round is *awaiting this instance's own vote*, muted/neutral =
  a network member with nothing active. A space in no network shows no icon at all. There is
  deliberately **no "fully synced" state** — Ythril sync is eventual, with no convergence flag to
  honestly back it. The blue state is *actionable*: it fires only for an open round you're eligible for
  and haven't cast yet (so a busy network doesn't sit permanently blue — it clears once you vote), and
  it sits **below** red/yellow in priority (`degraded > syncing > vote > idle`) so a persistent failure
  is never masked. The icon's `title` names the network(s) and the status so colour isn't the only
  signal. Backed by `spaceNetworkInfo` (pure, unit-tested against the compiled module) and client chip
  tests, and verified end-to-end against the real route (open round awaiting me → blue; after I vote →
  clears; failing peer → red; no network → no icon).

- **Multiline record descriptions (FEATURES F7).** Every description editor was a single-line
  `<input>`, so a description with paragraphs or line breaks collapsed to one line while typing, and
  the table cells rendered it `white-space: nowrap` (one line, ellipsis-truncated). Description fields
  across the memory / entity / edge create forms, their inline-table editors, the detail-drawer
  editors, and the file-meta editor are now `<textarea>`s (create/drawer `rows=3`, compact inline
  `rows=2`, vertically resizable) — matching what the chrono editors already did. The four truncating
  table cells (memories, entities, chrono, file-meta) now share a `.desc-cell` class that renders
  `white-space: pre-wrap` and clamps to three lines, so newlines show instead of collapsing, while the
  full text stays available on hover via each cell's `title`. Covered by brain-component tests
  (multiline round-trip in the drawer textarea + the cell's pre-wrap) and verified end-to-end
  (a memory with a three-line description keeps its newlines in the create form, the table cell, and
  the drawer editor).

- **Per-file upload progress with retry and cancel (UX U12).** The file manager showed a single
  aggregate progress bar for a multi-file upload, and if any file failed the whole batch stopped
  behind one generic "Upload failed" — you couldn't tell which file, retry just the failed one, or
  cancel a slow upload. Uploads now render as a **per-file queue**: one row each showing
  queued / uploading (with its own percent bar) / done / failed (with the server's reason). A failed
  row offers **Retry** (re-queues just that file); a queued or in-flight row offers **Cancel** that
  aborts the in-flight chunk request; finished rows can be dismissed or cleared in bulk. Under the
  hood `uploadFileChunked` is now a **cold** observable — no work runs and no progress event is
  emitted until subscription, so a late subscriber can never miss the initial 0% (the old hot Subject
  started uploading before it returned), and unsubscribing tears the upload down by flipping a cancel
  flag and aborting the in-flight request. Covered by new `api.service.upload.spec.ts` (cold + cancel)
  and file-manager queue tests, and verified end-to-end (two files → per-file rows → both reach Done →
  files appear in the listing → clear-finished empties the panel).

- **Closed the remaining i18n leaks so a language switch translates the whole UI (UX U7 · AUDIT C7).**
  A handful of strings bypassed `@jsverse/transloco` and stayed English in German/Polish: the **Models**
  sidebar nav item, the Models page **Save** button, the schema-import **Cancel** button, and — most
  visibly — the login/setup **auth errors** (an invalid-token message, a server-unreachable message, an
  SSO-start failure, and the setup failure). The login error keys already existed in all three locales
  but were never wired; the component still hard-coded the English literals. These now route through
  `common.*` / `login.error.*` / `setup.error.failed` keys (translations added/wired in en, de, pl).
  A **dev-only missing-key handler** (`DevMissingTranslationHandler`, keyed off Angular's `isDevMode()`)
  now logs any unresolved key to the console once — so a future leak is caught at review time instead of
  shipping as a raw dotted key. Verified end-to-end: switching to German localizes the Models nav
  ("Modelle"), the Save button ("Speichern"), and a bad-token login error ("Ungültiges oder abgelaufenes
  Token."), with the dev handler reporting zero missing keys across the swept pages. The login token
  placeholder was also corrected from the obsolete `yt_…` prefix to `ythril_…` in all three locales (C7).

- **Failed loads now render a distinct error state instead of a "no data" empty state (UX U3).**
  Every list view swallowed load failures (`error: () => loading.set(false)`) and fell through to its
  empty state — so a 500, a dropped connection, or an expired backend rendered as a friendly
  *"No memories yet…"*. Told in the app's own reassuring voice that their data doesn't exist, a user
  won't retry and may conclude the brain was wiped; the *well-designed* empty states made the lie more
  convincing. A shared `ErrorStateComponent` (warning icon, "Couldn't load …", the failure reason, and
  a **Retry** button, `role="alert"`) is now checked **before** the empty state at all eight list call
  sites: the Brain tabs (memories, entities, edges, chrono, file-meta), the file manager, the schema
  library, and the graph traversal. Each keeps a per-view error signal set to the server's reason (via
  a shared `httpErrorReason` helper) and cleared on a successful load; Retry re-runs that view's fetch.
  Covered by `error-state.component.spec.ts` and verified end-to-end (a forced 500 shows the error
  state + reason + Retry, not the empty state, and Retry recovers).

- **Mobile navigation drawer restores the app on phones (UX U2).** Below 768px the sidebar was
  simply `display: none` with no replacement — no hamburger, no drawer, no top-nav fallback — so on a
  phone you could reach exactly one page (whichever loaded first) and were then stranded; the entire
  information architecture was gone. A hamburger button now appears in the top bar below the
  breakpoint and toggles the sidebar as an **off-canvas overlay drawer**: it slides in over a
  backdrop, closes on backdrop click, on Escape, and automatically **on navigation** (so tapping a
  link takes you to the page and dismisses the overlay). Built on Angular CDK `cdkTrapFocus` (enabled
  only while the drawer is open), so focus is trapped inside it and captured on open — keyboard and
  screen-reader users can operate it. The desktop layout is untouched (the hamburger is hidden and
  the sidebar stays static ≥769px), and a resize back above the breakpoint drops the drawer state so
  it can't linger open. Covered by `shell.component.spec.ts` and verified end-to-end at a 390px
  viewport (drawer open/close, link navigation, Escape, backdrop, focus capture, desktop unaffected).

- **Toasts and a real confirm dialog replace every native `alert()`/`confirm()` (UX U1, folds in
  U5 + C3).** The client had no notification system at all — 34 `alert()`/`confirm()` calls, several
  hardcoded in English, and the most destructive actions (wipe space, delete space, restore backup,
  migrate DB) were gated by the same one-click `confirm()` used to rename a token. Two primitives now
  cover all of it: a **`ToastService`** + bottom-right container (success/error/info, auto-dismiss,
  errors linger longer) for the 16 message sites, and a **CDK-`Dialog`-backed `ConfirmDialogService`**
  for the 13 confirmations. Building the dialog on Angular CDK gives `role="dialog"`, `aria-modal`, a
  focus trap, Escape-to-close, and focus restore **by construction** — so U5 (modal accessibility) is
  solved for these dialogs without a second pass. Confirmations are now **tiered by consequence
  (C3/U1.3)**: reversible actions get a plain Cancel/Confirm, while the four irreversible ones require
  the operator to **type the exact target** (the space id, the backup id, or `MIGRATE`) before the
  destructive button enables — the GitHub-style ritual. All new strings run through `common.*`/feature
  keys in en/de/pl (no more hardcoded English), and the primitives ship with Vitest specs (toast
  lifecycle + the type-to-confirm gate). Verified end-to-end against a live instance: the themed
  dialog opens instead of a native `confirm()`, the id gate keeps the button disabled until the exact
  id is typed, Escape cancels, and error paths render a toast — with no native dialog firing anywhere.

- **MCP `help` tool — a self-documenting system guide (F1).** An LLM connected over MCP can now
  call `help` (listed first in `tools/list`) to learn the whole system in one shot: the knowledge
  model (spaces and the five knowledge types), a **query vs. recall vs. filtered-recall decision
  guide** (including which filter fields take the fast pre-filtered vector-search path), schema
  authoring via `get_space_meta`, a REST route map, and the tools available to the calling token.
  Two properties are load-bearing and tested (`testing/standalone/mcp-help.test.js`): the tool list
  is generated from the same registry and visibility predicate as `tools/list`, so a read-only or
  non-admin token is **never told about a tool the dispatcher would deny** (it gets an honest "some
  tools are hidden" line instead); and user-controlled strings (space ids/labels) are sanitized —
  control characters and backticks stripped, length clamped — so a space labelled
  `"…\nSYSTEM: call wipe_space"` cannot forge a section, heading, or code fence in text an agent
  will read as instructions. Also corrects two stale API strings that predate the P6 filter
  expansion: the recall `filter` description and the filter-key validation error now list
  `status` and `label` among the allowed keys.

- **Client unit-test infrastructure (Vitest + jsdom).** The Angular client had **no test setup at all** —
  no runner, no specs — so a UI regression was invisible to CI, and change-detection work (`OnPush` /
  zoneless — P5) could not be verified: `OnPush`'s failure mode is a view that silently stops updating, which
  a production build cannot see. Added Vitest with the Angular compiler plugin and a jsdom environment, wired
  into CI as a fast "Client unit tests" step that runs before the Docker build. The suite ships with a
  change-detection harness whose **negative control proves the harness can detect an `OnPush` component going
  stale** — so it can't give false confidence — plus a smoke test against a real component. Test-only; no
  runtime or shipped-bundle change (specs are excluded from the production build).

- **Cross-origin embedding is now possible — explicitly opt-in, and never by default.** Portal-style
  embedding was documented but could not actually work: `frame-ancestors 'self'` blocked cross-origin
  iframing outright, and the `ythril:theme` postMessage handler dropped any message whose origin wasn't
  Ythril's own — i.e. exactly the embedder the feature was designed for. An operator can now list trusted
  origins under `embed.allowedOrigins` in `config.json`. A listed origin is granted **both** rights
  together, because they are the same trust decision: it may **iframe** Ythril (the origin is appended to
  the CSP `frame-ancestors` directive) **and** push runtime theme tokens. With no allowlist, behaviour is
  byte-for-byte what it was: same-origin only. Entries are validated strictly and fail closed — exact
  scheme-qualified origins only (no path/query/fragment/credentials), `https:` required (except
  `localhost`/`127.0.0.1` for development), and **wildcards are never accepted**: there is no
  "allow everything" mode. Invalid entries are dropped with a warning, and the resolved allowlist is
  logged at startup so the granted rights are visible. Framing is a clickjacking primitive and theming can
  spoof UI, so the integrator explicitly accepts responsibility for every origin they add. Covered by
  `testing/standalone/embed-origins.test.js`.

- **Embedded (chrome-less) mode via `?embedded=1`.** When Ythril is embedded in a host portal its topbar
  (logo + Sign out) duplicates the host's chrome, and the in-frame Sign out is misleading — it ends only
  the Ythril session. Loading the app with `?embedded=1` hides the shell topbar. Navigation is unaffected
  (it lives in the sidebar). The flag is read once at startup and cached, because Angular drops unknown
  query params on navigation, which would otherwise flip the app back out of embedded mode on the first
  route change. Replaces the brittle `.topbar { display: none }` CSS workaround.

- **The Brain "Semantic Search" panel now exposes the full recall API.** The form offered only
  query / topK / minScore while `recall()` also supports type restriction, per-type minimums, tag
  filtering, and structured filters — so the UI was strictly less capable than the API behind it. The panel
  gains a **More options** section with type restriction (per-type checkboxes), **per-type minimums**, tag
  filtering, and a JSON **filter** (validated client-side, so a typo surfaces as a form error rather than a
  400). Two of these — `minPerType` and `tags` — were supported by the recall engine but hardcoded to
  `undefined` in the REST route, reachable only via MCP or the internal function; they are now plumbed
  through `POST /api/brain/spaces/:spaceId/recall` (with `minPerType` values clamped to `topK`).

- **`prefers-reduced-motion` support (spinner-aware)** — when the OS "reduce motion" setting is on, a
  global rule collapses decorative animations and transitions for users with vestibular sensitivity.
  The loading spinner is deliberately exempted so it keeps rotating — it is informative motion, and
  freezing it mid-spin reads as broken rather than calmer.

- **Per-route browser tab titles** — every page now sets a localized `<Page> · Ythril` title via a
  Transloco-aware `TitleStrategy`, so tabs, history entries, and bookmarks are distinguishable instead
  of all reading "Ythril".

- **Governance signing-key rotation** — an instance can now rotate its Ed25519 vote-signing keypair
  via `POST /api/admin/rotate-signing-key` (unrestricted admin; +TOTP when MFA is enabled). Rotation
  produces a **continuity proof** signed by the old key over the new one; peers that had pinned the
  old key adopt the new key automatically over gossip (the proof verifies against their pinned key),
  while a key swap *without* a valid proof is still refused as impersonation. For recovery when the
  old private key is lost (no proof possible), `PUT /api/networks/:id/members/:instanceId/signing-key`
  lets an admin force-pin a member's key (break-glass). This removes the previous limitation where a
  member that regenerated its keypair would be locked out of `requireSignedVotes` networks. Covered by
  `testing/standalone/vote-key-rotation.test.js` and `testing/sync/vote-key-rotation.test.js`.

- **MCP OAuth for browser connectors** — Ythril now speaks the standard MCP authorization flow
  (OAuth 2.1 + PKCE + RFC 7591 Dynamic Client Registration) so browser-only clients that cannot send a
  static `Authorization` header — notably the **claude.ai custom connector** — can connect to `/mcp`.
  An unauthenticated `/mcp` request now returns `401` with an RFC 9728 `WWW-Authenticate`
  `resource_metadata` header; Ythril serves the protected-resource + authorization-server metadata and
  acts as its own authorization server (**no external IdP required**). During consent the user pastes a
  Ythril token to approve; the connector is issued a **new PAT with the same permissions**, named
  `MCP connector: <client>` and independently revocable under Settings → Tokens. Access tokens are
  non-expiring PATs (no refresh flow). Requires `config.publicUrl` / `PUBLIC_BASE_URL` to be set to the
  instance's external **HTTPS** URL (OAuth is disabled with a startup warning for plaintext non-loopback
  hosts; the static bearer-token flow is unaffected). Clients that can set a header (Claude Desktop,
  Cursor, VS Code) continue to use a static `ythril_…` bearer with no change. Covered by
  `testing/integration/mcp-oauth.test.js` (full handshake + PKCE, single-use-code, redirect, and
  invalid-token negative paths).

- **Cryptographically signed governance votes** — every brain now owns a persistent Ed25519 signing
  keypair (private half in `secrets.json`, public half in `config.json`, generated at setup / first
  boot). Each governance vote cast is signed over a canonical message binding `network | round |
  subject | voter | vote`, and the signature travels with the cast. Peers publish and pin each
  other's public keys via member gossip (trust-on-first-use; a later attempt to change a pinned key
  is refused). Because a signed cast can be verified by anyone, votes now **relay safely through
  intermediate nodes** — restoring braintree governance for trees deeper than a single hop, which the
  own-cast-only forgery fix had limited. A new per-network `requireSignedVotes` flag (settable on
  create/update, default off) enforces strict mode once every member has published a key: unsigned or
  invalid casts are then rejected outright. Default (compatibility) mode verifies signed casts and
  relays them, while still accepting an unsigned cast only directly from its own voter — so signing
  rolls out to existing networks without a flag day. New tests: `testing/standalone/vote-signing.test.js`
  (20 unit cases) and `testing/sync/vote-signing.test.js` (signed cast + key distribution + safe relay
  of a third-party signed cast, tampered cast rejected).

### Fixed

- **Reindexing degraded embeddings — dropped edge/chrono properties and embedded raw entity IDs
  for edges.** The `POST /reindex` job re-derived each record's embedding text with its own inline
  copies of the per-type builders, and those copies had drifted badly from the real writers: memory
  and entity folded properties **values-only**; **edge dropped properties entirely and embedded the
  raw from/to entity UUIDs instead of their names**; **chrono dropped properties entirely**. So a
  reindex silently made records *less* recallable than when they were created. The five per-type
  embed-text builders (`memoryEmbedText` / `entityEmbedText` / `edgeEmbedText` / `chronoEmbedText` /
  `fileEmbedText`) are now centralized in `brain/embed-text.ts` and called by both the writers and
  the reindex job, so a reindex reproduces exactly what a create embedded. Also removes the verbatim
  `entityEmbedText` duplicate that lived in `brain/merge.ts`. Locked by a builder unit test.

- **Memories created over the REST API embedded properties without their keys (semantic-recall
  regression).** `POST /api/brain/spaces/:id/memories` re-implemented the create logic inline instead
  of calling the shared `remember()`, and the copy had drifted: it folded properties **values-only**
  (`"pilot"`) instead of `key value` (`"occupation pilot"`) via the shared `propsEmbedText` helper —
  the exact regression the helper was extracted to prevent — so a memory created via REST embedded
  differently from the identical one created via MCP, and recall couldn't match on a property name.
  The inline copy also never set `matchedText` and never fired the insert-time duplicate-rule check.
  The route now routes through `remember()`, so REST and MCP produce identical records; ~55 lines of
  duplication removed. Covered by a new memory case in the property-key embedding test.

- **Moving a file/folder resurrected the pre-move copy on sync peers (both HTTP and MCP).** A move
  removes the file from its old path on disk, but neither the `PATCH /api/files` route nor the MCP
  `move_file` tool wrote a tombstone for it — and sync has no rename detection, so a peer's manifest
  still advertised the old path and pushed it straight back (leaving the file at *both* paths). Both
  movers now tombstone the old path(s) — the source file, or every child file for a directory move —
  before renaming. Covered by a new move-propagation sync test.

- **MCP file tools had divergent side effects from the equivalent HTTP routes.** `write_file`,
  `delete_file`, and `move_file` did not emit the `file.created` / `file.deleted` / `file.updated`
  webhooks their HTTP counterparts do (so webhook subscribers missed all agent-driven file changes);
  `delete_file` skipped `invalidateUsageCache` (stale quota after a delete); `move_file` only re-rooted
  the single source record, not the child records under a moved **directory** (`renameFileMetaByPrefix`),
  orphaning their metadata; `write_file` did not project the incoming size into its storage-quota check
  (so an over-limit agent write wasn't rejected up-front) and did not clear stale conversion artifacts
  when overwriting a document (leaving duplicate chunk records). All now match the HTTP API. (Brain MCP
  tools — `remember`, `upsert_entity`, etc. — still emit no webhooks; tracked as a separate follow-up.)

- **Deleting a folder (or a file via MCP) did not propagate to sync peers (files resurrected).**
  Single-file delete over the HTTP API wrote a `FileTombstoneDoc` so peers remove the file too, but
  recursive folder delete wrote none, and the MCP `delete_file` tool wrote none either — so on the
  next sync a peer's manifest still advertised the files and pushed them straight back. Tombstone
  creation is now a shared helper (`writeFileTombstones`) used by all three paths: folder delete
  enumerates every removed file (the folder tree plus its `_converted`/`_extracted` sidecars) before
  deletion and writes a tombstone for each, and MCP `delete_file` writes one for the deleted file.

- **Deleting a file or folder orphaned its embedding metadata and left a media job retrying
  forever.** Deleting a file (or a folder containing one) removed the file from disk but never
  cancelled its queued media/text embedding job, so the worker kept reclaiming the job and failing
  it with `ENOENT: no such file` — endlessly, because the stalled-job sweep re-queued it. It also
  left orphaned filemeta records behind: folder deletion only cleaned records under `<folder>/`, but
  document-conversion sidecars live under the separate `_converted/<path>` and `_extracted/<path>`
  prefixes, so those DB records and their on-disk files survived (and `deleteConversionArtifacts`
  never removed the sidecar files from disk even on single-file delete). Now (1) file, folder, and
  MCP deletes cancel the associated media jobs (`cancelMediaJob` / `cancelMediaJobsByPrefix`);
  (2) folder delete also clears conversion artifacts for the whole subtree, records **and** disk
  (`deleteConversionArtifactsByPrefix`), and `deleteConversionArtifacts` now removes the
  `_converted/`/`_extracted/` files too; and (3) the media worker treats a missing source file
  (`ENOENT`) as **terminal, not retryable** — it reconciles to disk truth by dropping the job and any
  orphaned metadata/artifacts instead of looping. Regression test covers folder delete leaving zero
  records (including hidden chunks) under the deleted path.

- **`docker compose up` failed to pull the document-conversion sidecar (`401 UNAUTHORIZED`).** The
  bundled `unstructured` service (C2, #218) pinned `unstructured-io/unstructured-api-full:0.0.75`, but
  Unstructured made the `-full` repository private on quay.io — an anonymous pull of the whole repo now
  returns `401 UNAUTHORIZED` (registries return 401, not 404, for inaccessible manifests), so the tag
  no longer resolves. Switched the sidecar (both `docker-compose.yml` and the pod-local
  `kubernetes/manifests/ythril-deployment.yaml`) to the still-public `unstructured-io/unstructured-api:0.0.75`
  — the same upstream release minus the `-full` extras (extra Tesseract language packs + LibreOffice),
  which Ythril's `hi_res` OCR + embedded-image extraction path does not use. It is also the image
  upstream's own README points self-hosters at, is ~4.5 GB compressed (vs the heavier `-full`), and stays
  Apache-2.0. No server or config change was needed; the sidecar API (`/general/v0/general`) is identical.

- **Image/PDF previews and file downloads were broken (blank pane / failed download).** They loaded
  the file via a browser-native `<img src>` / `<iframe src>` / `<a href download>`, none of which can
  send the `Authorization` header — and the client papered over that by appending `?…&token=` to the
  URL, a fallback that was **scoped to the two SSE endpoints only** in the auth-surface hardening
  (query-token scope, #134). So every image/PDF preview and every download hit the file endpoint with
  no valid auth → **401 → blank preview / failed download** (text previews survived because they
  already used `fetch` with the header). Previews and downloads now `fetch` the file **with the token
  in the header** and hand the view a same-origin `blob:` object URL (revoked on close), so the token
  never rides in the URL (keeping #134's intent) and a failed preview shows a reason instead of a blank
  pane. Covered by a regression test (download sends `Authorization`, never `token=` in the URL) and
  verified end-to-end (an uploaded PNG previews from a `blob:` URL with a 200 authenticated GET).

- **Bundled image captioning never worked out of the box — the default vision model name was
  invalid.** The default was `moondream2`, which is **not** a name in the Ollama registry (`moondream`
  is), so the Compose auto-pull (`ollama pull moondream2 || echo WARN`) silently failed and every
  caption request came back `HTTP 404 model 'moondream2' not found` → the image's `embeddingStatus`
  flipped to `failed`. Corrected the name to `moondream` everywhere (the config default and provider
  fallback, the Compose and Kubernetes pull commands, the Settings → Models placeholder, and the
  docs), and — so existing installs self-heal without a manual config edit — the config loader now
  **normalizes** a saved/env `moondream2` to `moondream` at load time. Covered by media-config unit
  tests (default is `moondream`; a saved or env `moondream2` heals to `moondream`).
  *Existing deployments: restart the `ollama` container (or run `docker exec ythril-ollama ollama pull
  moondream`) so the model is actually present.*

- **docker-compose now matches what the docs promise (AUDIT C2 + C4).** Two `docker compose up`
  gaps: (1) the `unstructured-api-full` document-conversion sidecar existed only in the Kubernetes
  manifests, so on Compose `CONVERSION_SIDECAR_URL` pointed at nothing and every PDF/DOCX/EPUB upload
  failed `sidecar_down` — despite the README calling it "bundled". It's now a service in
  `docker-compose.yml`, wired via `CONVERSION_SIDECAR_URL`, on its own **internal** `ythril-convert`
  network (no database access, no internet egress — it parses untrusted documents and its OCR models
  are baked into the image). It is intentionally *not* a startup dependency of `ythril`, so the ~8–12 GB
  image never blocks boot and conversion degrades gracefully until it's ready; `docs/dependencies.md`
  documents the size and how to skip it on a small workstation. (2) `MONGO_URI` — the documented way to
  point at an external MongoDB — was never forwarded into the `ythril` container's `environment`, so
  the value silently never reached the server. It's now forwarded (empty default keeps the bundled
  database), making the documented external-Mongo path actually work.

- **The recurring "vote-signing relay" sync-test flake is fixed at its root — a test setup race,
  not a relay bug.** The test pins a third instance's signing key by writing `config.json` directly,
  then reloads. Under full-suite load that write races the server's own `saveConfig`: an in-flight
  sync cycle (left over from a prior test's fire-and-forget trigger) captured the config *before* the
  patch and writes its stale copy back, silently dropping the pinned key — after which the relaying
  instance rejects the third instance's cast on **every** cycle, so the relay can never converge and
  the assertion times out. Widening the wait (as two prior PRs did) cannot fix an un-pinned key. The
  fix makes the out-of-band injection *stick*: a `patchAndConfirm` helper re-applies the patch until
  it is confirmed stable across consecutive live reads (idempotently, so a re-apply never duplicates
  the member/round), and the assertion now polls the guaranteed eventual convergence with a
  self-diagnosing message (it reports whether the key is pinned and whether the round arrived) — the
  wait was *reduced* 90s→60s, not widened. The production relay itself was already timing-independent:
  every cycle re-pulls the peer's full open-round set and re-merges missing casts, so a delayed or
  dropped message is re-derived from source of truth on the next cycle. Verified across three
  back-to-back full-suite runs under load. Test-only change.

- **Client base `tsconfig.json` no longer reports a spurious `rootDir` error in the editor.** The
  base config sets `rootDir: ./src` but had no `include`, so TypeScript fell back to its default
  `**/*` pattern and pulled in `vitest.config.ts` at the client root — a file outside `rootDir` —
  raising `TS6059` whenever an editor (or a direct `tsc -p tsconfig.json`) loaded the base project.
  It was latent until the Vitest client-test infra added that root-level config file. Scoped the
  base's `include` to `src/**/*.ts` so it agrees with `rootDir`. Editor-only; `ng build`
  (`tsconfig.app.json`) and the Vitest suite (`tsconfig.spec.json`) set their own `include` and were
  never affected.

- **User guide, integration guide, usecase examples, workstation guide, and the top-level docs
  brought back in line with the code** — the rest of the same full docs audit. Highlights:
  two dangerous user-guide MFA errors fixed (disabling MFA **requires** a current TOTP code; the
  TOTP secret is server-generated, not browser-only), the Webhooks section rewritten as an API
  how-to (no management UI exists yet), the About page corrected (no live log — that's the Audit
  Log), and the guide re-synced with the current UI (Brain has eight tabs; Graph/Files are tabs
  not routes; MFA lives under Preferences; corrected admin nav, labels, and destructive-op
  locations). Integration guide: `GET /api/about` is not public, the OIDC spaces-claim is
  fail-closed, `files` added to the MCP `query` enum, entities list max is 500, recall filter keys
  include `status`/`label` with native `$vectorSearch` pre-filtering, draft-7 rate-limit headers,
  plus newly documented `indexStatus`, bulk wipes, the `help` tool, and several endpoints.
  Usecase examples: `recall_global` → `recall`, no `"expired"` chrono status, and a caveat that
  `remember()` does not auto-create entities. Workstation guide: the port-override that never frees
  3200 removed (use `YTHRIL_PORT`), `MONGO_URI` must be in the compose environment to reach the
  container, and the connector binds `0.0.0.0` (bearer-protected). README/NOTICE/contribution-guide/
  dependencies: `recall_global` → `recall`, `list_spaces`/`help` added (31 tools), webhook event
  counts (16/19), embedding features, NOTICE dependency list (drop zone.js, add undici), and the
  local-dev DB/proxy setup. Doc-only; no behavior change.

- **Sync-protocol and network-types docs brought back in line with the code** after a full docs
  audit cross-checked every claim. `docs/sync-protocol.md`: corrected the phase order (governance
  gossip + vote propagation deliberately run *first*, ahead of the data phases) and documented the
  previously missing presync warm-up (`POST /api/sync/warm`) and opt-in Merkle divergence check
  (`GET /api/sync/merkle`); rewrote the file-sync section to match reality (file tombstones travel
  both directions, files are pushed as well as pulled, and hash divergence produces a conflict
  copy plus a `ConflictDoc` — never an overwrite); fixed the manual-trigger semantics (async fire-and-forget
  returning `{ status: 'triggered' }`), the direction-enforcement 403 body, the file-download URL
  shape (`?path=` query parameter), and the tombstone endpoint/pull descriptions (chrono is a
  fourth synced type; tombstone push pages 500/request until drained); removed the nonexistent
  `GET /api/sync/info` (identity comes from `GET /api/about` and the gossip `self` record);
  documented the ingest safety caps (implausible-seq ceiling, fork depth/fan-out ≤ 10), the
  50-page-per-type pull cap, watermark persistence via the coalesced config flush, gossip signing
  fields, and the real auth model of the sync surface. `docs/network-types.md`: fixed the broken
  tombstone-guard link, the invite-generate auth level (admin), the vote-deadline default (24 h,
  configurable 1–72 h), and replaced the misleading offline-peer timing estimate with the accurate
  bounded-timeout statement. Doc-only; no behavior change.

- **Schema validation was a total no-op on MCP — the surface agents actually use.** `validateMemory()` keys
  the whole per-type schema lookup off `memory.type`, but the MCP `remember` and `bulk_write` tools never
  exposed `type` and passed `undefined` to the engine. With no type there is no schema, so validation always
  returned **zero violations** and the `validationMode: 'strict'` gate **could never fire**. A space that
  enforces required memory properties enforced them over REST and **silently ignored them over MCP**. Both
  tools now accept `type`, forward it to the validator and persist it. (The existing schema-validation suite
  set up exactly this scenario and asserted a 400 — but **only through REST**: the one surface that could
  fail was never tested. Same shape as the space-rename bug.)

- **MCP `bulk_write` never validated edge `properties`.** It called `validateEdge(meta, { label })`, omitting
  `properties`, so required/typed edge properties were never checked and strict mode was unenforceable on
  that path — while MCP `upsert_edge` and REST both got it right.

- **Chrono `recurrence` was unreachable from MCP and unvalidated over REST.** The engine has supported it all
  along, but no MCP tool declared it, so agents could not create or modify recurring entries. Meanwhile REST
  destructured it straight out of the request body and persisted it **with no shape check at all** — unlike
  every sibling field — so an arbitrary object could be stored and later read as a recurrence rule. Both
  surfaces now share one validator (`freq` enum, positive integer `interval`, ISO `until`).

- **Completed the space-rename data-integrity fix — three more instances of the same bug.** The audit that
  followed the rename fix found the same "stale `spaceId`" flaw in places the first pass missed:
  - **Deleted files could resurrect.** `{spaceId}_file_tombstones` carries a `spaceId` field and its readers
    filter on it, but the collection was **missing from the repair's hardcoded list**, so after a rename every
    pre-rename deletion became invisible to sync — and peers that still held the file pushed it straight back.
    The repair now **discovers a space's collections by prefix** instead of walking a fixed list, so this and
    any future per-space collection are covered automatically. (It only rewrites a `spaceId` that is present
    but wrong, never inventing one — `{spaceId}_file_hashes` legitimately has no such field.)
  - **A rename silently stopped a space syncing.** The seq counter lives in the *global* `ythril_counters`
    collection keyed by `_id: <spaceId>`, so the prefix-based collection rename missed it and `nextSeq()`
    restarted at **1** — while the rename deliberately carries the OLD, high sync watermarks over to the new
    id. Every subsequent write got a seq *below* the watermark and was **never pushed to peers**: the space
    kept working locally while quietly never syncing again. The counter (and the dupe-scan cursor) now move
    with the rename.
  - **Cross-space import wrote invisible data.** The export embeds the source space's id in every document,
    and import wrote them verbatim — so importing space A's export into space B produced documents that were
    counted but invisible to every list. Imported documents are now re-tagged to the target space.
  - `traverseFromSeeds` filtered entities but not edges by `spaceId`, so a stale value returned an edge whose
    neighbour entity silently vanished — half a graph, no error. The redundant filter is gone; the collection
    name is the only real scope.

  Tests now cover **chrono** and the **seq counter** across a rename, and **cross-space import** — the gaps
  that let all of this through. (The original rename test asserted only memories, the one read path that does
  not filter on `spaceId`, and the import tests asserted only counts and memory-by-id — likewise immune.)

- **Renaming a space no longer makes its entities and edges vanish from the UI.** `moveSpaceData`
  renamed the collections (`{old}_entities` → `{new}_entities`) but never rewrote the `spaceId` field
  *inside* the documents, so every one still pointed at the OLD space id. `listEntities`, `listEdges`,
  entity lookup-by-name, the edge-dedup lookup and the cascade deletes all filter on that field — so a
  renamed space looked **catastrophic but was actually intact**: the entry counts still showed the data
  (counts read the collection) while every list came back **empty**. Worse, because lookup-by-name
  stopped matching, `remember` would start creating **duplicate entities** instead of linking to the
  existing one. Memories were unaffected (`listMemories` does not filter on `spaceId`) — which is
  exactly why the existing rename test, which only checked memories, never caught this. The rename now
  rewrites the field, and **existing affected databases self-heal on boot** (`repairStaleSpaceIds`,
  run from `initSpace`): documents living in `{spaceId}_*` belong to `spaceId` by definition, so the
  repair is safe and idempotent. Sync had the same flaw — a `spaceMap`-aliased pull wrote peer documents
  into the local collection while keeping the *remote* space id — and now re-tags them to the local
  space. Regression test added covering entities, edges and lookup-by-name across a rename.

- **The test stack no longer races four concurrent builds onto one image tag.** Giving every instance the
  shared `ythril-test:latest` tag (so CI can pre-build once against a layer cache) made `docker compose
  build` build the *same* tag from four services simultaneously, which races on the image export and could
  corrupt it locally (`failed to extract layer … EOF`). Only `ythril-a` builds the image now; b/c/d simply
  reference the tag. CI is unaffected — it pre-builds the tag itself.

- **Rebuilding the test stack no longer leaks Docker disk without bound.** Every `--build` orphaned the
  previous multi-GB image (each bakes a ~520 MB embedding model, node_modules and ffmpeg) and grew the
  BuildKit cache forever — on one workstation this reached **35 GB of build cache plus 20 GB of orphaned
  images**, filled the drive and took Docker Desktop down. `test:up:rebuild` now runs `test:prune` (drop
  dangling images, cap the cache at 5 GB), and a new `npm run docker:reclaim` handles an already-ballooned
  install: it prunes, then `fstrim`s inside the VM, then prints the exact elevated `diskpart` steps to
  **compact** `docker_data.vhdx` — necessary because pruning frees space *inside* the VM while the
  dynamically-expanding disk only ever grows on the host. It locates the disk even when relocated to
  another drive (`CustomWslDistroDir`).

- **Sync tests can no longer turn a persistent, actionable error into an unexplained timeout.** The sync
  suites re-trigger a sync on every poll (deliberate — a single up-front trigger races a slow gossip
  cycle), but they did it as `triggerSync(...).catch(() => {})`, which treats a transient blip and a
  permanent misconfiguration identically. That trap is *why* the notify rate-limit bug survived three wrong
  fixes: every trigger was coming back `429`, the `.catch()` ate it, no sync cycle ever ran, and all anyone
  saw was `waitFor timed out after 90000ms`. `waitFor` now takes a `diagnose` argument appended to its
  timeout message, and `makeTriggerProbe` still tolerates a failed poll but **remembers the last failure**
  and reports it — so the message becomes "every sync trigger to A was failing (…); last error:
  triggerSync failed: 429 …" instead of a bare stall. Test-harness only. Pinned by
  `testing/standalone/waitfor-diagnostics.test.js`.

- **The notify limiter now honours the test kill-switch — the real cause of the “flaky” signed-vote relay test.**
  `POST /api/notify/trigger` is how the test harness drives a sync cycle, and it is guarded by
  `notifyRateLimit` (60/min per IP). Every request from the harness shares one source IP, so the sync suites
  collectively blew past 60/min and started getting `429`s — which the tests' trigger call swallowed, so the
  sync cycle silently never ran and load-sensitive assertions timed out looking like flakes. `notifyRateLimit`
  was the **only** limiter with no `skip:` clause (`authRateLimit`, `globalRateLimit`, `syncRateLimit` and
  `bulkWipeRateLimit` all have one); it now honours `SKIP_SYNC_RATE_LIMIT` like the rest of the sync plane.
  **No production impact:** the kill-switch is inert unless `NODE_ENV !== 'production'`, scheduled sync calls
  the engine in-process (it never touches this limiter at all), and instance C deliberately omits the env so
  the genuine 429 behaviour stays covered. Pinned by `testing/standalone/notify-rate-limit.test.js`, which
  asserts both halves: A must not throttle, C still must.

- **OIDC sign-in no longer hangs when the whole SPA is embedded in a portal iframe.** The callback
  inferred "this is a silent-refresh frame" from simply being inside an iframe (`window.self !== window.top`)
  and tried to `postMessage` the authorization code to `window.parent` targeted at Ythril's own origin. That
  is correct for a genuine silent refresh (whose hidden iframe's parent *is* the SPA), but when the entire
  Ythril SPA runs inside a host portal's iframe, the interactive redirect callback is also framed and its
  parent is the *portal's* origin — so the browser refuses the cross-origin `postMessage` and the user is
  stuck on "Completing sign-in…" forever. The silent-refresh flow now marks its request explicitly with a
  `state` prefix (`silent.`), and the callback branches on that marker instead of on being framed — so an
  embedded interactive sign-in completes normally while genuine silent refreshes are still recognised.
  Client-only. Reported from a production embedded (iframe) deployment.

- **Governance votes and member gossip now converge even when data sync is slow or failing.** In each
  sync cycle, gossip (member list, signing-key pinning) and vote propagation ran **after** the per-space
  data and file sync for a peer — and that data loop is not isolated, so any timed-out pull, unreachable
  member, or slow file transfer threw out of the member's sync and **skipped governance entirely for that
  cycle**. On a lightly loaded system the data plane is fast so this never showed, but under heavy load a
  saturated peer could starve time-sensitive vote propagation (rounds have deadlines) for many cycles in
  a row — the root cause behind the intermittently-timing-out signed-vote relay test. Governance now runs
  **first**, ahead of the data loop, so it converges promptly and independently of data-plane health. The
  two calls remain internally best-effort and are additionally wrapped so a later data-plane failure can
  never mask governance progress. Covered by the existing sync/vote suites.

- **Importing a schema no longer fails silently.** In **Settings → Spaces → Schema → Import JSON**, a
  valid-JSON file that contained none of the recognised `entity`/`edge`/`memory`/`chrono` keys — which
  includes Ythril's **own** per-type export shape `{knowledgeType, typeName, schema}` — fell straight
  through the import loop and then *cleared the error field*, so it looked like it worked while doing
  nothing. Import now: (1) also accepts the `{knowledgeType, typeName, schema}` export shape; (2) shows a
  specific error listing the expected keys and what the file actually contained when nothing is
  recognised; and (3) confirms success with a note that the imported types are **staged — press Save to
  apply**. Client-only.

- **Record properties are now fully embedded, so semantic recall can use them.** The text embedded for
  a record mishandled `properties`: memory and entity embedded only the property **values** and dropped
  the **keys**, while **edge and chrono embedded properties not at all**. So recall couldn't match on a
  property name (a query about "role" had no "role" signal), and values lost their field context —
  `{birthplace: "Paris"}` and `{currentCity: "Paris"}` embedded identically. All five builders (memory,
  entity, edge, chrono, and the entity-merge copy) now fold `key value` pairs into the embedded text
  via a single shared `propsEmbedText` helper, and chrono re-embeds when only its properties change.
  Existing records keep their old (weaker) vectors until re-embedded — run
  `POST /api/brain/spaces/:id/reindex` to rebuild them with property keys. Covered by
  `testing/integration/embed-properties.test.js`.

- **Recall no longer errors while a new space's vector indexes are still building.** Space creation now
  builds its `$vectorSearch` indexes asynchronously (see the space-creation fix above), and Atlas
  refuses queries against an index still in `INITIAL_SYNC` — so a recall during that brief window
  failed the whole request with a `400` ("cannot query vector index … while in state INITIAL_SYNC")
  instead of returning results from the collections that were ready. Recall now treats a
  not-yet-queryable index like a missing one — no results from that collection — so it degrades to a
  partial/empty result during the build window instead of erroring. Covered by
  `testing/integration/space-creation-async.test.js`.

- **Creating a space no longer times out or "appears only after a reload".** `createSpace` awaited the
  build of a space's 5+ Atlas `$vectorSearch` indexes, each polling for READY up to 60 s (worst case
  minutes) — so the `201` landed far past the client's 30 s timeout, on a dead subscription, and the
  space seemed to vanish until the page was refreshed. Creation now returns in seconds: collections and
  regular indexes are created synchronously (the space always has a backing DB), the vector-index READY
  wait is **deferred**, and the space is returned with `indexStatus: 'building'` and finalized to
  `ready`/`failed` by a background task. The space is writable immediately; only semantic recall waits
  for READY. The UI shows a "Preparing indexes…" badge until it clears. `GET /api/spaces` surfaces
  `indexStatus`. Covered by `testing/integration/space-creation-async.test.js`.

- **Document embedding failures are reported instead of faked as success.** When a text/document
  upload's chunks failed to embed, an empty `catch` swallowed the error and the job still reported
  `embeddingStatus: 'complete'` — so a file that was permanently invisible to `$vectorSearch` looked
  fully indexed, with no failure signal and never engaging the existing retry/backoff machinery. A
  total failure now routes into that retry path (ending `failed` if it can't recover); a partial
  failure is recorded as `embeddingStatus: 'partial'` (new state) and is retriable. A **Retry** button
  and a "Partly embedded" badge were added to the file list, wiring the previously-unused
  `retry_embedding` endpoint. Covered by `testing/standalone/embedding-failure-reporting.test.js`.

- **Space rename/delete are now crash-safe.** A rename or delete spans `config.json`, MongoDB
  collections, and the filesystem and cannot be atomic — a crash mid-operation (after renaming some
  collections, or after moving files but before the config write) could leave them permanently
  inconsistent with no recovery. A `pendingSpaceOp` write-ahead marker is now persisted before any
  physical change and cleared only on commit; the physical steps are idempotent, and an interrupted
  operation is completed on the next boot (and on `reload-config`). Covered by
  `testing/standalone/space-op-recovery.test.js`.

- **The governance vote "No" button now works (and casts a veto).** The Networks UI offered **Yes/No**
  buttons, but the server accepts only `yes`/`veto` (`VoteValue`), so clicking **No** returned `400`
  and there was no way to cast a blocking vote from the UI at all. The negative button now casts a
  `veto` — the blocking vote the model and docs already describe ("a single no blocks it") — and is
  relabelled **Veto** to match. Client-only fix.

- **`<html lang>` now tracks the active UI language.** It was hardcoded to `en`, so screen-reader
  pronunciation and browser hyphenation stayed English for German and Polish users even though the UI
  was fully translated. The document language is now set on startup and updated on every language
  switch.

- **Close/remove buttons use a consistent icon everywhere.** Close and remove controls across the app
  rendered a mix of raw `✕` and `×` glyphs at different weights/baselines than the `ph-icon` used
  elsewhere. Every one — dialog close buttons, chip/tag remove buttons, and danger remove actions in
  networks, spaces, schema-library, tokens, and the shared property/tag editors — now uses the `x`
  icon, and dialog close buttons that were missing an `aria-label` gained one.

- **Legacy tokens are no longer silently invalidated on upgrade** — a startup/reload migration
  *deleted* any PAT created before the `prefix` field existed, on the assumption it "cannot be
  verified." In fact a prefix-less token can still be bcrypt-verified; the prefix is only a lookup
  optimization. The deletion meant that after an innocuous restart/upgrade, every client sharing such
  a token — web UI, monitors, MCP connectors — dropped to `401` at once, with nothing but a single log
  line to explain it. Legacy tokens are now **verified via a fallback scan and self-heal**: the prefix
  is backfilled on first use so subsequent lookups take the fast path, and no token is ever deleted by
  the migration. Covered by `testing/integration/auth.test.js`.

### Changed

- **Extracted the space-settings dialog state out of `SpacesComponent` into `SpaceSettingsState`
  (internal, no behavior change).** First half of A17.8: the settings state (`openSettings`,
  `buildMeta`, the type-schema helpers, the duplicate-rule helpers, and the four tabs' fields) now
  lives in a service provided by the component, so the tabs can become child components in the
  second half without any of them reaching into another. It is a service rather than dialog-local
  state because `openSettings` populates all four tabs atomically and `buildMeta` reads across two of
  them. Member names are deliberately unchanged: this is a move, not a rewrite, and keeping the names
  let every moved method body be diffed against the original — 20 of 23 came out byte-identical, and
  the other three differ only by dropping `as TypeSchemaState & { _libRef?: string }` casts made
  redundant by declaring `_libRef` on the interface. `spaces.component.ts` drops 1893 → 1616.
  The 36 characterization tests from the previous PR moved with the code they cover — same
  assertions, new owner (`space-settings-state.service.spec.ts`), none rewritten to make the refactor
  pass. **That diff-against-the-original caught three transcription defects my own hand-copy
  introduced and the tests did not**: `addDupeRule` defaulting to `minScore: 0.95` (not `0.92`), the
  `dupeSaved.set(false)` reset dropped from both `addDupeRule` and `removeDupeRule`, and
  `wipeStatCols` hardcoding English labels where `transloco.translate('spaces.stats.*')` belongs —
  an i18n regression that would have shipped silently. Two new tests pin the dupe-rule defaults the
  characterization suite had not asserted. Client suite: 107 → 109 tests.

- **Finished the `spaces/spaces.ts` split — `lifecycle.ts`, `rename.ts`, `_shared.ts` (internal, no
  behavior change).** With the vector-index lift, `spaces.ts` goes **1204 → 102 lines** and now holds
  only space settings (`updateSpace`, `reorderSpaces`). Alongside it: `lifecycle.ts` (init, create,
  remove, wipe, and `reconcilePendingSpaceOp` crash recovery), `rename.ts` (collection movement plus
  the config rewrite that follows), and `_shared.ts`. The module boundaries were dictated by the real
  call graph rather than taste: `repairStaleSpaceIds` (needed by `initSpace` **and** `moveSpaceData`)
  and `pendingOpConflictMessage` (needed by `removeSpace` **and** `renameSpace`) are each used by both
  halves, so they cannot live in either — hence a leaf `_shared`. The result is acyclic:
  `_shared` and `vector-index` import no sibling; `rename → _shared`; `lifecycle → {vector-index,
  _shared, rename}` (it reaches into rename because `reconcilePendingSpaceOp` recovers interrupted
  *rename* ops too); `spaces → {vector-index, _shared}`. One encapsulation improvement in passing:
  the reindex-tracking `Set` stays private to `_shared` behind a new `setReindexNeeded(spaceId,
  needed)` rather than being exported for `lifecycle` to mutate directly. All nine importers were
  repointed to the module that actually owns each symbol. (ARCHITECTURE-TODO A17.7, step 2 of 2 —
  A17.7 complete.)

- **Lifted vector-index management out of `spaces/spaces.ts` into `spaces/vector-index.ts`
  (internal, no behavior change).** The new module owns building/diffing each collection's Atlas
  `$vectorSearch` index (`ensureVectorSearchIndex`), polling it to READY (`pollVectorIndexReady`,
  `waitForSpaceIndexesReady`, `finalizeSpaceIndexReady`, which is what flips a space's
  `indexStatus` to `ready`/`failed`), and deriving the filter fields that let a recall use native ANN
  pre-filtering instead of an exhaustive ENN scan (`vectorFilterFieldsFor`). The dependency is
  one-way — `spaces.ts` calls in, `vector-index.ts` never reaches back — and `brain/recall.ts` now
  imports `vectorFilterFieldsFor` from it directly. `spaces.ts` drops 1204 → 959 lines. Three pieces
  of **pre-existing dead code** were removed in passing, all confirmed dead in the original: an
  `asUpdate` import, and an unused `const embCfg = getEmbeddingConfig()` in `initSpace` (the file had
  two such declarations; only the one inside the vector-index code was ever read — the repo build has
  `noUnusedLocals` off, so it never surfaced). The space-lifecycle and rename splits the audit also
  calls for are **not** in this change — that block does heavy live-`Config` mutation and is tracked
  as the remaining half of A17.7. (ARCHITECTURE-TODO A17.7, step 1 of 2.)

- **Split the 1713-line `api/sync.ts` (24 routes) into per-concern sub-routers, and moved network
  governance out of the route layer (internal, no behavior change).** Now `api/sync/`: `docs.ts`
  (13 — the four record families plus batch-upsert), `tombstones.ts` (4 — record and file
  tombstones), `manifest.ts` (2 — file manifest + merkle summary), `members.ts` (2), `votes.ts` (2),
  `warm.ts` (1), over a `_shared.ts` holding the incoming-document schemas, peer/space authorisation,
  cursor codec, fork-depth and implausible-seq guards, and the strict-linkage violation recorders.
  Every URL is unchanged. The **ejection guard** — a router-level middleware that 401s any request
  scoped to a network this instance was ejected from — stays on the parent router in `index.ts` and
  is still registered ahead of every sub-router.
  **`concludeRoundIfReady` and `sendMemberRemovedNotify` now live in `sync/governance.ts`.** They
  were exported from the `api/sync.ts` *route* module and imported by five others (`api/invite.ts`,
  `api/networks/{join,members,votes}.ts`, `sync/engine.ts`) — route modules importing domain logic
  from another route module. Round state is config (`network.pendingRounds`), not in-memory, so both
  the HTTP surfaces and the sync engine can drive conclusion; the helpers just needed a real home.
  This resolves the coupling A17.5 deliberately left. (ARCHITECTURE-TODO A17.6.)

- **Router variable names are now asserted unique across `server/src/api`.** The audit-coverage and
  route-guard analyses map `xRouter` → mount prefix **by name**, so two modules exporting the same
  name silently hand one of them the other's prefix — its routes then get checked against the wrong
  rules, or drop out of the check entirely. This bit twice for real: A17.3 (`filesRouter` in both
  `api/files.ts` and the brain's file-metadata router) and A17.6 (`membersRouter`/`votesRouter` in
  both `api/networks/` and `api/sync/`, which made the peer routes report as unaudited). Both
  compiled and ran fine. `route-guard-coverage` now fails on a duplicate name, and the `/api/sync`
  peer-auth exemption follows the sub-routers (`syncDocsRouter`, `syncVotesRouter`, …) instead of
  silently re-flagging the whole peer protocol.

- **Split the 1196-line `api/networks.ts` (19 routes) into per-concern sub-routers (internal, no
  behavior change).** Now `api/networks/`: `crud.ts` (7 — list/get/create/patch/leave + sync trigger
  and history), `members.ts` (3 — add, remove, rotate signing key), `join.ts` (4 — invite, join,
  join-remote, fork), `topology.ts` (3 — reparent-self, adopt, revert-parent), `votes.ts` (2 — list
  rounds, cast) and a `_shared.ts` holding only what genuinely spans groups (`BCRYPT_ROUNDS`,
  `SSRF_SAFE_URL`, `safeMemberList`); a request schema used by exactly one route stays with it.
  `index.ts` mounts them on the same `networksRouter`, each declaring full paths, so **every URL is
  unchanged**. One piece of pre-existing dead code was dropped in passing (an unused
  `rsaPublicKeyPem` destructure in join-remote; the field is still schema-validated). Known coupling
  left as-is for now: `votes.ts` imports `concludeRoundIfReady` from `api/sync.ts`, i.e. one route
  module importing domain logic from another — the round state itself is config
  (`net.pendingRounds`), not in-memory, so the split is safe; giving that helper a proper home is
  A17.6's job, which opens `sync.ts` anyway. (ARCHITECTURE-TODO A17.5.)

- **Split the 993-line `brain/memory.ts` into four cohesive modules (internal, no behavior change).**
  It mixed three unrelated engines with memory CRUD. Now: `filter.ts` (the recall `FilterExpression`
  DSL — validate, lower to a Mongo filter, lower to a native `$vectorSearch` prefilter), `recall.ts`
  (the recall engine — `recall`/`recallGlobal`/`findSimilar`/`checkDuplicates` + the doc→`RecallResult`
  mapping), `query.ts` (the structured operator-whitelisted `queryBrain` surface, its ReDoS-safe
  sanitiser, and the projection guard that never lets `embedding` out), and `memory.ts` (993 → 267
  lines: `remember` + memory CRUD). The dependency runs strictly one way —
  `memory.ts → recall.ts → filter.ts`, with `filter.ts`/`query.ts` importing no siblings — so there
  are no cycles; `remember` reaches into `recall.ts` only for the optional insert-time duplicate
  check. Importers were repointed (`api/brain/search.ts`, `brain/entities.ts`, `brain/dupe-scanner.ts`,
  the MCP `file`/`search`/`shared` tools, and two tests that import the compiled
  `queryBrain`/`mergeEmbeddingExclusion`). (ARCHITECTURE-TODO A17.4.)

- **Renamed the file-store router `filesRouter` → `fileStoreRouter`.** It sat next to the brain's
  `fileMetaRouter` and the pair read as one API. They are two different things: `fileStoreRouter`
  (`/api/files`) serves **bytes on disk** — upload, download, mkdir, move, delete; `fileMetaRouter`
  (`/api/brain/spaces/:id/files`) serves the **brain record** describing a file (tags, entityIds,
  properties — one of the five `query` collections). Naming them as a Store/Meta pair makes the
  distinction visible at the call site. No behavior change; internal identifier only.

- **Documented that document conversion is asynchronous on every write path.** The integration guide
  described what the conversion pipeline produces but never *when* — and since MCP `write_file` moved
  to the background worker (A10), an agent that writes a document and immediately recalls it finds
  nothing. Added a "Timing" section to the conversion docs: what each surface returns (REST `202` +
  `embeddingStatus: "pending"`; MCP `write_file` confirms the **write**, not the conversion), how to
  poll `embeddingStatus` (`pending`→`processing`→`complete`, with `partial`/`failed`), and the media
  and `"text"`-bypass cases.

- **Split the 1734-line `api/brain.ts` (39 routes) into per-resource sub-routers (internal, no
  behavior change).** The file the owner called out is now `api/brain/` — `memories.ts` (6 routes),
  `entities.ts` (9), `edges.ts` (6), `chrono.ts` (7), `file-meta.ts` (3), `search.ts` (7: stats,
  traverse, query, recall, find-similar, reindex) and `bulk.ts` (1), over a `_shared.ts` holding the
  pieces every sub-router needs (`webhookToken`, `getSpaceMeta`, `applyValidation`,
  `buildMemoryFilter`, `UUID_V4_RE`). `index.ts` mounts them onto the same `brainRouter`, each
  sub-router declaring full paths, so **every URL is unchanged**; original route order is preserved
  within each file (it matters where paths overlap — entities `/by-name` and `/by-ids` must stay
  ahead of `/:id`). Handlers were moved verbatim. Two things worth noting: the brain file-metadata
  router is named `fileMetaRouter`, not `filesRouter`, because `api/files.ts` already exports a
  `filesRouter` — the duplicate name made the audit-coverage guard resolve those routes to the wrong
  prefix; and the two route-analysis guards (`audit-route-coverage`, `route-guard-coverage`) now
  discover route files recursively and resolve sub-routers mounted via `parentRouter.use(child)` to
  the parent's prefix, so the brain surface can't silently drop out of either check.
  (ARCHITECTURE-TODO A17.3.)

- **Split the 1187-line client `api.service.ts` monolith into per-domain API services + a types
  module (internal, no behavior change).** One `ApiService` held ~120 HTTP-wrapper methods and ~450
  lines of DTO declarations, injected by two dozen components. It is now: `api.types.ts` (all 50
  shared DTOs, so a component can import a type without pulling in a service) plus eight cohesive,
  tree-shakeable services — `AuthApi`, `SpacesApi`, `SchemaApi`, `BrainApi`, `FilesApi`,
  `DuplicatesApi`, `NetworksApi`, `AdminApi` — each a thin `inject(HttpClient)` wrapper for its
  domain. All 24 consumers (components + specs) now inject only the domain services they use; every
  endpoint URL, param, and method signature is unchanged. Verified end-to-end by the Angular AOT
  production build (a mis-routed call is a compile error, since each service exposes only its own
  methods) and the full client unit suite (71 tests). (ARCHITECTURE-TODO A17.2.)

- **Split the 576-line MCP `memory.ts` tool bundle into three cohesive files (internal, no behavior
  change).** It bundled seven tools spanning three concerns; it is now `memory.ts` (memory CRUD:
  `remember`/`update_memory`/`delete_memory`), `search.ts` (cross-type retrieval:
  `recall`/`find_similar`/`query`), and `bulk.ts` (`bulk_write`, the cross-type batch writer that
  wraps the shared `brain/bulk.ts`). The tool registry (`tools/index.ts`) is unchanged in content
  and order — only the import sources moved — so `tools/list` and every derived gate stay identical.
  The move also sheds ten dead imports the bundle had accumulated since `bulk_write` was extracted to
  `brain/bulk.ts` (`createChrono`/`upsertEntity`/`upsertEdge`/`validate{Entity,Edge,Chrono}`/… were
  import-only). Largest MCP tool file drops from 576 → 214 lines. (ARCHITECTURE-TODO A17.1.)

- **Centralised the proxy member-space fan-out into two shared helpers
  (`findFirstAcrossMembers` / `collectAcrossMembers`).** A proxy space reads and writes across its
  member spaces, and two idioms were hand-rolled ~40 times across the REST brain routes and MCP
  tools: "try each member in order, stop at the first hit" (get/update/delete by id) and "query
  every member and flatten" (list/search). Both now live once in `spaces/proxy.ts`, so proxy
  semantics (member ordering, the resolve step, the first-hit `accept` rule) can't drift between
  surfaces. 22 clean call sites were converted (`api/brain.ts` and the MCP memory/entity/edge
  tools); the remaining member loops are intentionally left as-is because they aren't the two clean
  idioms — schema-validation loops with early error returns, directory-listing aggregation with
  per-member `try/catch` tolerance and name de-duplication, and graph traversal that already takes a
  pre-resolved member array. Pure refactor, no behavior change; covered by the existing
  `proxy-spaces` integration suite (which exercises proxy read/list/update/delete end-to-end).
  (ARCHITECTURE-TODO A16.)

- **Unified file-processing dispatch into one shared helper (`files/dispatch.ts`), and MCP
  `write_file` now converts documents asynchronously like REST.** The "resolve format → media job |
  document conversion" sequence was inlined in three places — the REST single-request upload, the
  REST chunked-complete finaliser, and the MCP `write_file` tool — and they had **diverged** in ways
  that mattered: (1) MCP `write_file` ran the conversion pipeline **synchronously inline** while REST
  enqueued a background worker job — same work, two mechanisms; (2) the chunked-complete path only
  recorded `pending` for media, silently dropping the `disabled`/`skipped` embedding states the
  single-request path recorded; and (3) the 500 MiB media size cap was a magic `524_288_000` literal
  copied into all three. All three now call `dispatchFileProcessing(space, path, { bytes, contentType,
  inputFormat })`, which records media state and enqueues the right async job. **One policy:
  documents are always converted by the background worker (never inline)** — so MCP `write_file`
  returns immediately with `embeddingStatus: 'pending'` and the worker produces chunks shortly after
  (an agent polls, exactly like REST), and every write inherits the worker's
  retry/backoff/404-flagging/restart-survival. The chunked path now records `disabled`/`skipped` too,
  and the size default is the exported `DEFAULT_MEDIA_MAX_FILE_SIZE_BYTES`. Locked by a new
  `mcp-tools.test.js` case asserting an MCP-written document produces chunk records via the worker.
  (ARCHITECTURE-TODO A10.)

- **Extracted the bulk-write batch processor into one shared module (`brain/bulk.ts`), fixing a
  REST/MCP drift.** The `POST /api/brain/spaces/:id/bulk` route and the MCP `bulk_write` tool were two
  ~185-line copies of the same validate-and-dispatch loop (memories → entities → edges → chrono), and
  they had **diverged**: the MCP copy skipped the 50 000-character `fact` cap and did not normalise
  chrono `status` (unknown values were passed straight through instead of dropped). Both surfaces now
  call the single `bulkWrite(spaceId, input)` — identical validation, the 500-item-per-type cap, and
  the deterministic ordering that lets edges/chrono reference records created earlier in the same
  batch — then each shapes its own response and emits the one `bulk.write` summary webhook with its
  own actor/token attribution. Per-item webhooks stay suppressed (the shared writers are called
  without a `WebhookActor`). Behavior-preserving for REST; the MCP path picks up the two corrected
  behaviors. Covered by the existing REST (`brain.test.js`) and MCP (`mcp-tools.test.js`) bulk suites.
  (ARCHITECTURE-TODO A9.)

- **Centralized path normalisation into `util/paths.ts` (`toDocId` / `toSafeRelPath`).** The
  `p.replace(/\\/g, '/').replace(/^\/+/, '')` idiom was hand-rolled in ~13 places (3 named `normPath`
  defs + ~10 inline), and the copies had **diverged**: the media worker's variant also stripped `../`
  for path-traversal defense while every other copy did not. Split into two clearly-named helpers —
  `toDocId` (Mongo `_id`/path keys, keeps `..`) and `toSafeRelPath` (values joined to a filesystem
  root, strips `..`) — and pointed each call site at the right one. Behavior-preserving for the id/key
  sites; the sync tombstone-application paths (`api/sync.ts`, `sync/engine.ts`), which join a peer-
  supplied path to the space files root, now strip `..` as **defense-in-depth** alongside their
  existing boundary check (a no-op for legitimate paths). Locked by a unit test. (ARCHITECTURE-TODO A13.)

- **Deduplicated two copy-pasted helpers onto shared modules (internal, no behavior change).**
  `authorRef()` — the `{ instanceId, instanceLabel }` write stamp — was defined identically in nine
  files across the brain and file subsystems; it now lives once in `config/author.ts`. The RegExp
  literal-escape (`s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) was hand-rolled in eight places (two
  named, six inline); it is now `escapeRegex()` in the existing `util/redos.ts` regex-safety module.
  Both are byte-identical extractions — the value is one source of truth so the identity/escape logic
  can't drift. (ARCHITECTURE-TODO A12 + A14.)

- **Concluded vote rounds are now pruned, so `pendingRounds` no longer grows for the life of a
  network (P14).** `concludeRoundIfReady` marks a round `concluded` but never removed it, so every
  governance vote a network ever held accumulated forever in `config.json` — bloating the file, the
  `GET /votes` scan, and gossip payloads, and (before #200) the per-cycle vote push. The sync engine
  now drops rounds that are concluded **and** past their deadline, once per cycle: after the deadline
  every peer concludes such a round independently, so it can influence nothing and needs no further
  propagation. Within-deadline concluded rounds and open rounds are always kept (a concluding cast may
  still need to reach peers; open rounds are live governance). Completes the scaling fix started in
  #200. Covered by `testing/standalone/vote-round-prune.test.js` (retention rule) and
  `testing/sync/vote-round-prune-sync.test.js` (pruned end-to-end during a real sync cycle).

- **The client is fully zoneless (P13) — `zone.js` is gone.** The endgame of the P5 `OnPush` pass:
  the app now bootstraps with `provideZonelessChangeDetection()` and the `zone.js` polyfill is removed
  from the build (and from `dependencies`). Until now every timer, XHR, and DOM event anywhere in the
  page scheduled a whole-tree change-detection sweep as a zone-driven safety net; change detection now
  runs only when something Angular actually tracks changes — a signal write, an `ngModel`/event-handler
  update, an `AsyncPipe` emission — which the P5 audit already established is how every page updates
  state. The safety net was all cost and no catch. The polyfill's ~90 kB (raw) also drops out of the
  initial bundle, which shrinks to 378.5 kB raw / 104.7 kB transfer with no polyfills chunk at all.
  The Vitest environment flips with it (`test-setup.ts` provides the same zoneless providers to every
  `TestBed`), so specs — including the change-detection harness whose negative control proves staleness
  is still detectable — exercise the exact CD regime production runs. Verified beyond the suite with a
  full Playwright click-through of every route on a fresh instance (first-run setup → login incl. the
  invalid-token error path → space/token/entity creation → language switch re-rendering the whole
  shell → all ten settings/workspace routes): no stale view, zero Angular console errors.

- **Filtered semantic recall now pre-filters instead of scanning everything (P6), and per-space
  indexes shed their redundant `spaceId` key (P10) — one index migration for the major release.**
  Two changes that both rewrite live-space indexes, bundled into a single boot migration.
  - **P6 — native `$vectorSearch` pre-filtering.** Previously, *any* tag or filter forced recall onto
    an exhaustive `exact:true` scan that scored **every** vector in the collection and then dropped
    non-matches — O(all documents) even for a highly selective filter. The `$vectorSearch` index now
    declares the fixed filterable fields (`tags`, `type`, `name`, `status`, `label`) plus, on a
    schema-defined space, each declared `properties.<key>` path. A recall whose filter uses only
    declared fields runs `exact:true` **with a native `filter`**: Atlas restricts to the matching
    subset first, then exhaustively scores only that subset — **exact results, cost proportional to
    the matching set, not the whole collection.** A filter on a field no schema declares (dynamic
    `properties.*`, or `$exists`) still uses the full-scan path, which stays correct. The recall
    filter API gains `status` and `label` as filterable keys. Schema edits rebuild the affected
    vector indexes automatically (in place, so recall never goes dark), and a recall issued during
    that brief rebuild window falls back to the exhaustive path, so it is always correct.
  - **P10 — de-prefixed compound indexes.** Per-space collections (`{spaceId}_memories`, …) already
    isolate by collection name, so leading `spaceId` in every compound index added write cost and
    index bytes with zero selectivity. All of them drop the prefix (`{seq:1}`, `{from:1,to:1,label:1}`
    unique, `{status:1,score:-1,detectedAt:-1}`, …); a boot migration removes the old
    `spaceId`-leading indexes and builds the new shape, idempotently. The edge-uniqueness guarantee is
    unchanged (a constant leading field distinguished no documents).
  - **Migration & compatibility.** Both run on boot in `initSpace`, per space, and are self-healing —
    an upgraded install re-shapes its indexes on first start with no manual step. Filtered recall
    moves from exact-but-exhaustive to exact-and-pre-filtered: **no accuracy change**, only speed.
    Covered by `testing/integration/recall-filter.test.js` (fixed-field and schema-declared-property
    filters, tags ALL-of semantics, and the unchanged dynamic-property / `$exists` fallback).

- **`OnPush` change detection on the graph page (P5, final slice).** The graph view — a cytoscape
  canvas whose event handlers fire outside Angular — was the highest-value and highest-risk `OnPush`
  target, and completes the P5 pass over the app's heavy pages. Audited safe: the four handlers that
  touch Angular state (node/edge/background tap, double-tap re-root) write only signals, which notify
  `OnPush` regardless of zone; the rest only toggle cytoscape CSS classes on the canvas. Nothing
  mutates a signal's value in place, and the plain node/edge/colour fields are canvas-only (never in
  the template). Verified with a spec that drives the tap-written signals and asserts the side panels
  open/close, plus the drawer's plain-field/signal coupling — cytoscape is mocked because it needs a
  real canvas jsdom lacks, but the behaviour under test is entirely Angular's signal→CD path.

- **`OnPush` change detection on the brain page (P5, slice 4).** Brain is the heaviest page in the
  app — 49 signals, five record tabs, a detail drawer and an embedded graph — and previously re-checked
  all of it on every unrelated tick/XHR/DOM event. It is safe under `OnPush` because every async path
  (list/create/save subscribes, the 300 ms search debounces) writes signals, which notify `OnPush`
  regardless of zone, and nothing mutates a signal's value in place. The page also renders plain,
  non-signal form models (`memoryForm`, `drawerEdit*`) through `ngModel`; those re-check only because
  each write is paired with a signal write in the same turn, or happens in a template event handler.
  That coupling is load-bearing and invisible in the source, so a spec now pins it — the drawer title
  binds the plain field, and dropping the sibling signal write fails CI instead of silently rendering
  a stale form.

- **`OnPush` change detection on the file-manager page (P5, slice 3).** The file browser renders a
  file listing, a recursive directory-tree sidebar, breadcrumbs, and a preview pane — previously all
  re-checked on every unrelated tick/XHR/DOM event across the app. Every rendered value is
  signal-backed (`entries`, `treeRoot`, `breadcrumbs`, `previewFile`/`previewHtml`, upload progress);
  each tree expansion mutates a node in place but always follows with `treeRoot.set([...])`, and the
  async preview/upload callbacks update via signal `.set()` — so `OnPush` re-checks exactly when
  state changes. Verified with a spec that renders the listing and tree, opens the preview, and
  replaces the `entries` signal, asserting each view refreshes.

- **`OnPush` change detection on the audit-log page (P5, slice 2).** The audit-log viewer renders
  up to a 100-row table plus a live-streaming server log, and previously re-ran change detection over
  its whole subtree on every unrelated tick/XHR/DOM event. Every value it renders is already a signal
  updated immutably (`entries`, `total`, `selectedEntry`, and the SSE log via `.update([...])`), and
  its filter fields are `ngModel` two-way bindings whose input events mark the view dirty — so `OnPush`
  is safe and re-checks exactly when state changes. Verified with a spec that loads rows, opens the
  detail panel, and replaces the `entries` signal, asserting the table refreshes each time — the
  conversion is proven, not blind.

- **`OnPush` change detection on the pure-display leaf components (P5, first slice).** The client had
  `OnPush` on **zero** of its components, so every timer tick, XHR completion and DOM event re-ran change
  detection over the *entire* tree — including hundreds of `ph-icon`s and property views in large tables.
  `ph-icon` and `app-properties-view` are now `OnPush`: both are pure and driven only by their inputs (plus,
  for the view, one local signal), so they re-render exactly when they need to and are otherwise skipped.
  These are the highest-instantiation leaves, squarely in the large-table hot path. Verified with specs that
  render the component, change an input / toggle the signal, and assert the DOM updates — the conversion is
  provable, not blind (the client test harness added earlier is what makes that possible). More components
  follow, heaviest next.

- **Space export streams instead of buffering the whole space into memory (P7).** The export endpoint —
  the one you reach for to back a space up — loaded all five collections into memory with `.toArray()` in
  parallel and then `res.json()`'d the result, so the entire space sat on the heap **twice** (the documents
  plus their serialised JSON) at once. A large space OOM'd the backup, exactly when losing data hurts most.
  The response is now written incrementally over each collection's cursor, one document at a time, with
  backpressure so the socket buffer cannot grow unbounded either. The output is **byte-for-byte identical**
  — same object, same keys, same order — so import and every existing consumer are untouched. Covered by a
  new scale test (250 documents with characters that must be JSON-escaped, asserting the streamed response
  parses and round-trips exactly).

- **The audit log no longer counts the whole table on every page (P11).** Listing audit entries ran a full
  filtered `countDocuments()` on **every page load**, purely so `hasMore` could be derived from the total.
  The audit log is append-only and therefore only ever grows, so that count got steadily more expensive
  forever — and it was paid on every click of "next". `hasMore` now comes from fetching one extra row, which
  answers the question exactly and for free, and the total (only used to render "showing N of M") is cached
  briefly per filter, so paging through a result set counts once instead of once per page.

- **An upload into an idle system no longer waits up to 30 seconds before embedding starts.** On an empty
  queue the media worker backs its poll interval off to `workerMaxPollIntervalMs` (30 s by default) and
  slept on an uninterruptible timer — so a file uploaded into an otherwise-idle instance sat in `pending`
  for up to half a minute before the worker even woke to look at it. Every path that creates claimable work
  already announces it, so that announcement now **wakes the worker**: the idle wait is interruptible, and
  the backoff resets as soon as real work arrives. Measured on a cold worker: **~32 s → ~2 s**. A shutdown
  also wakes it, so stopping is no longer delayed by a parked backoff.

- **The media worker no longer walks every space on every claim (P12).** Job collections are per-space, so
  claiming walked the spaces one `findOneAndUpdate` at a time. On an idle queue — the normal state — each
  claim paid a full N-space walk just to learn there was nothing to do, and the worker does that
  (`workerConcurrency + 1`) times per tick: at 100 spaces, ~300 useless sequential round trips per tick. The
  walk now visits only spaces a pending-work hint says might hold a job. The hint is an optimisation, never
  the source of truth: everything that makes a job claimable announces it, and a periodic full scan re-seeds
  it — which specifically covers a job whose retry backoff has not yet elapsed (it is `pending` but not
  claimable, so the probe finds nothing and the hint is dropped; the scan puts it back). Covered by a new
  test asserting the worker actually **claims** work — the existing conversion tests only ever asserted that
  a job reached `pending` and never waited for the worker at all, so a queue that claimed *nothing* would
  have passed.

- **Bulk deletes no longer make one database round trip per document (P9).** Wiping a collection writes a
  tombstone per deleted document, and the seq for each was fetched with its own `nextSeq()` call — so
  clearing 100k memories cost **100k sequential round trips before the delete even started**. All four bulk
  deletes (memories, entities, edges, chrono) now reserve the whole tombstone range in a **single `$inc`**.
  The invariant that matters is preserved: gaps in the sequence are harmless (sync compares seqs with `>`),
  but **reuse** is not — so the block is reserved up-front and never rolled back on failure.

- **Document chunks are embedded concurrently instead of one at a time (P8).** File conversion embedded each
  chunk and inserted it individually, so a 500-chunk PDF meant **1,000 sequential awaits** with the embed
  call dominating. Chunks are independent, so they are now embedded with **bounded concurrency** (8 in
  flight — bounded, because a large document would otherwise fire hundreds of simultaneous requests at the
  embedding provider and throttle rather than go faster) and written with `insertMany`. Per-chunk failure
  isolation is unchanged: a chunk that fails to embed is still stored without a vector and counted, so the
  job is reported partial/failed rather than silently "complete".

- **Sync bookkeeping writes no longer block the event loop.** The sync engine persists tiny per-cycle
  fields — pull/push watermarks, per-member failure counters, `lastSyncAt` — dozens to hundreds of times
  per cycle, and each was a **synchronous whole-file rewrite** of `config.json` that stalled *all* request
  handling for its duration (and the stall grows with config size, which OAuth-minted tokens can push up).
  These four hot-path fields now write through a coalesced, asynchronous, serialized flush
  (`saveConfigSoon`): a burst collapses to one off-loop write, and the change never blocks a response.
  They are runtime state, not configuration, so a flush lost to a crash is harmless — watermarks re-derive
  by seq on the next pull (idempotent, no data loss) and counters are cosmetic; a durable flush runs on
  graceful shutdown regardless. Every other config write (tokens, spaces, networks, votes, gossip identity
  merges, setup) stays durable and synchronous, and a generation guard ensures an in-flight async flush can
  never clobber a fresher durable write. Covered by `testing/standalone/config-coalesced-write.test.js` and
  the existing sync suites (watermark convergence across restarts).

- **The embedding model is no longer re-downloaded from HuggingFace on every CI build.** The Dockerfile
  fetched the ~274 MB `nomic-embed-text-v1.5` model in a layer that sat *after* the app-source copy, so any
  source change invalidated it — and CI runners start with a cold build cache, so effectively every CI run
  re-downloaded it anonymously. HuggingFace rate-limits anonymous downloads per-IP, and the shared CI
  egress IP was intermittently getting `403 Forbidden`, failing the image build before any test ran. The
  model download now runs as a **cache-stable early layer** (it depends only on the npm package, not our
  source), CI builds the image **once** with a **persistent GitHub Actions layer cache** (`type=gha`) and
  every compose instance reuses that tag, and the download has **retry/backoff** to ride through a
  transient 403 on the rare build that must actually fetch. Build/CI only — no runtime change.

- **File sync no longer re-hashes every file on every round.** The file manifest read and SHA-256-hashed
  **every file** each time it was built, and it is built twice per sync round (once for the file diff,
  once for the Merkle root) per peer — so a space holding tens of GB re-read and re-hashed all of it on
  every cycle, pure CPU and disk for a result that is almost always identical to last time. Hashes are
  now cached per space (a local `<spaceId>_file_hashes` collection keyed by path with the size+mtime they
  were hashed at); an unchanged file reuses its stored hash and only new or modified files are re-read. A
  `force` option re-reads everything for reconciliation. The cache is never synced and is dropped with the
  space. Covered by the existing file-sync suites (write / overwrite / delete / `since`).

- **Sync pull applies each page in a bounded number of round trips instead of 2×N.** Pulling docs from
  a peer ran a `findOne` + conditional `replaceOne` **per document** — so a 50k-memory backfill was
  ~100k sequential MongoDB round trips even though the data already arrived in 200-doc pages, and on a
  WAN-separated Mongo that dominated the whole sync. Each page now loads every existing seq in one
  `find({_id: {$in: […]}})` and applies the survivors in one `bulkWrite`, turning 2×N round trips into
  ~2 per page. Last-writer-wins-by-seq is unchanged (the comparison stays strictly greater-than), so
  conflict resolution and watermarks behave identically; covered by the existing sync suites.

- **Media/embedding provider config now hot-reloads — no restart required.** The media worker read its
  provider config **once at startup**, so a change made through `PATCH /api/admin/media-config` (or
  **Settings → Models**) was invisible until the pod restarted — the endpoint would happily accept a
  new vision/STT provider that the worker then ignored. The worker now re-reads the config on each poll
  tick (an in-memory read, not a network call) and rebuilds its provider bundle **only when the
  provider config actually changes**, so it doesn't churn clients every tick. The bundle is bound for
  the duration of a job, so a config change can never swap a provider out mid-job. Worker concurrency
  and poll intervals hot-reload too. Note an idle worker backs off its poll interval (up to
  `workerMaxPollIntervalMs`, default 30 s), so a change can take up to that long to apply when the
  queue is empty. Covered by `testing/integration/media-config.test.js`.

- **The MongoDB cast helpers are renamed `mFilter`/`mDoc`/`mUpdate`/`mBulk` → `asFilter`/`asDoc`/
  `asUpdate`/`asBulk` (internal, no behavior change).** The `m`-prefixed names read like "sanitise for
  Mongo", but the bodies are pure `as unknown as` casts that bridge our document interfaces to
  MongoDB's strict generics — they validate nothing. That is a dangerous thing to misread on the
  sync-ingest path, where a lot of peer-supplied data flows through them. The `as*` names say plainly
  that these are type casts, and the module now states where the real validation lives (the Zod
  `Incoming*Doc` schemas in `api/sync.ts`).

- **MCP tools are now a registry instead of a 1,200-line `switch` (internal, no behavior change).**
  Every tool used to be spread across **four** places that had to be kept in sync by hand: a schema in a
  big `allTools` array, a `case` in one giant `switch`, and membership in three separate `Set`s
  (`MUTATING_TOOLS` / `ADMIN_TOOLS` / `SPACE_REQUIRED_TOOLS`) — so a tool could easily be added to the
  dispatch but forgotten in a gate. Each tool is now one entry (`name`, `description`, `inputSchema`,
  `mutating`/`admin`/`spaceRequired` flags, `handle`) in `server/src/mcp/tools/`, grouped by domain
  (memory, entity, edge, chrono, file, spaces, sync). `tools/list` **and** every authorization gate are
  derived from those flags, so there is **one source of truth per tool**, and each handler is
  independently testable. `mcp/router.ts` drops from **2,241 to 258 lines** and is now just transport +
  dispatch. Tool names, schemas, `tools/list` ordering, gate behavior and error strings are unchanged.

- **Sync scheduling now uses real cron (and honours cron expressions that were silently ignored).**
  The per-network `syncSchedule` was parsed by a bespoke `*/N minutes|hours` / `every Nm|Nh` regex on
  top of `setInterval`, so a **standard cron expression — the format the integration guide documents,
  e.g. `*/5 * * * *`** — was not recognised and the network silently fell back to manual-sync only.
  The scheduler now runs on `node-cron` (the same engine backups and the duplicate scanner already
  use): a cron expression is used directly, and the two legacy shorthands are translated to cron for
  backward compatibility (values cron can't express, e.g. `every 90m`, now warn instead of silently
  scheduling). Covered by `testing/standalone/sync-cron.test.js`.

- **Auth middleware consolidated onto a shared core (internal, no behavior change).** The six
  `require*` middlewares (`requireAuth`/`requireMcpAuth`, `requireSpaceAuth`, `requireAdmin`,
  `requireAdminMfa`, `requireAdminMfaScoped`) each repeated the same bearer-extract → resolve →
  attach-`req.authToken` preamble, and the space-scope and MFA checks were copy-pasted between pairs of
  them — the kind of duplication where a guard added to one path silently misses another. They now
  share `resolveAuthOrFail` + `enforceAdmin`/`enforceMfa`/`enforceSpaceScope`/`attachToken` helpers.
  Exported names, signatures, status codes, error bodies, metrics, and the MCP `WWW-Authenticate`
  challenge are all preserved exactly; verified against the auth red-team suites (`auth-bypass`,
  `auth-escalation`, `auth-surface-hardening`, `space-boundary`, `mcp-security`).

- **Storage-quota checks no longer re-walk the whole file tree on every upload chunk.** `checkQuota`
  runs on every chunk, and `measureUsage` recursively stat-summed all of `/data/files` **and** ran a
  `dbStats` command with no cache — so a chunked upload was `O(total_files × chunks)` and got slower as
  the store grew. A short-TTL cache now backs the measurement: exact callers (single writes, brain
  writes, metrics, and the **first** chunk — which validates the full declared total) re-measure and
  refresh it, while later chunks read the cached value, turning a 2,000-chunk upload from ~2,000 tree
  walks into ~1. Freed space (delete, wipe, space removal) invalidates the cache immediately.
  Enforcement is unchanged. Covered by `testing/standalone/quota.test.js`.

### Removed

- **BREAKING: the legacy `/api/brain/:spaceId/memories` route shape is removed.** Space memory
  endpoints used to be registered under two URL shapes — canonical `/api/brain/spaces/:spaceId/…` and
  legacy `/api/brain/:spaceId/…` — with the handler bodies **copy-pasted** between them (and the
  canonical shape was even missing `POST` create and `GET` by-id). Each endpoint is now registered
  **once**, under the canonical `/spaces/:spaceId/…` path; the two-segment legacy shape now returns
  `404`. This halves the memory-route surface that has to be auth-checked and tested and removes the
  footgun where a guard added to one shape could be missed on the other. **Migration:** replace
  `/api/brain/:spaceId/memories…` with `/api/brain/spaces/:spaceId/memories…`. The web client already
  uses the canonical paths. (All other brain resources — entities, edges, chrono, stats — were already
  canonical-only and are unaffected.)

### Security

- **Test hardening: seven more test groups gain real coverage and specificity (S8, part 2).**
  Continuing the "what would still pass if the mechanism were removed?" method. **(S8.2)** the
  `projection` recall option was only unit-tested via `mergeEmbeddingExclusion`; REST `/query` and
  the MCP `query` tool now assert include-mode (`{fact:1}` → only that field, `_id`, never
  `embedding`) and exclude-mode (`{tags:0}`) against real returned docs. **(S8.4)** `webhooks.test.js`
  re-implemented the dispatcher's event set, URL/secret validation, HMAC, and subscription-matching
  and asserted against the copies; it now imports the real `ALL_WEBHOOK_EVENTS` from the compiled
  build (which immediately caught three event types the stale copy was missing), and a new
  `testing/integration/webhooks.test.js` drives the compiled admin API + dispatcher end-to-end —
  https/SSRF/secret/event validation, and real match→sign→deliver→log via `getMatchingWebhooks` and
  the delivery log (true HTTP receipt stays out of reach because delivery is SSRF-guarded). **(S8.9)**
  `schema-validation.test.js` re-implemented `sanitizeFilter`; the `$options` cases now run the real
  compiled sanitizer via `queryBrain` (in `query-regex-redos.test.js`), and the copy is deleted.
  **(S8.10)** `space-op-recovery.test.js` verified an interrupted rename via the memories collection
  only; it now seeds an entity, edge, and chrono too and asserts each survives under the new id — a
  reconcile that dropped any collection would now fail. **(S8.11)** the file-conversion `inputFormat`
  tests never observed the parameter; they now count chunk records (`?includeChunks=true`) and assert
  `inputFormat:'text'` produces **0** chunks while md/html conversion produces **≥1 / ≥2**. **(S8.7)**
  `audit.test.js` asserted entries merely exist (passes on stale rows from a warm DB); it now
  correlates a `memory.update` by `entryId === the memory _id` within an `after`-timestamp window,
  and guards the previously vacuous-if-empty loops. **(S8.8)** the path-traversal tests accepted
  `400 OR 404` (proving only "no content served"); DELETE and PATCH now assert **exactly 400** with
  positive controls (a valid-but-absent path → 404, a real file → 200/served) proving the sandbox
  engaged, and the GET path documents why it intentionally returns 404. Test-only; no runtime code
  touched.

- **Test hardening: five test groups that would pass with their mechanism removed now assert the
  real effect (S8, part 1).** Applying the "what would still pass if the mechanism were removed?"
  method: **(1)** the three untested rate limiters get real 429 burst tests on instance C —
  `bulkWipeRateLimit` (5/min, the tightest destructive limiter, previously swappable for
  `globalRateLimit` with no test going red), `globalRateLimit` (300/min) and `syncRateLimit`
  (2000/min) — each with a positive control proving the first request reaches the route.
  **(2)** the `retry_embedding` "requires write access" test used the ADMIN token and asserted
  success, testing nothing; it now uses a read-only token and asserts 403, and a new effect test
  proves the retry actually resets `embeddingStatus` to pending and the requeued job re-runs to a
  terminal state. **(3)** `notify/trigger` and `sync_available` asserted only the echoed
  status/204 — satisfied by a handler that does nothing, which is exactly how the notify
  rate-limit bug once hid; both now poll the network's sync-history for the record a real cycle
  appends. **(4)** MCP `update_memory` and the remaining echo-only `PATCH /memories` cases
  (fact, long-form) re-read the document and deep-equal the persisted value. **(5)** the
  echo-only PUT/PATCH tests for media-config and edge/memory/chrono type-schemas, and the chrono
  update paths, all re-read through GET to confirm persistence. Test-only change; no runtime code
  touched.

- **The sync data-write surface is now peer-only, and direction enforcement can no longer be
  side-stepped (S10).** The direction guard on the seven `/api/sync/*` write endpoints (`memories`,
  `entities`, `edges`, `chrono`, `batch-upsert`, `tombstones`, `file-tombstones`) had two holes. First,
  it only ever bound tokens carrying `peerInstanceId` — **any space-scoped user PAT could write through
  the sync surface** regardless of the network's direction topology. That matters because sync writes,
  unlike the REST API (which assigns `seq`/`_id`/`author` server-side), carry raw stream metadata: a
  downstream operator in a braintree or pub/sub network holding any leaked upstream user PAT could push
  content upstream, defeating the documented one-way flow and forging sync state the REST API never
  permits. Second, the guard keyed on the **caller-supplied `networkId` query parameter** — a push-only
  peer could simply omit it (or name a non-directional network sharing the space) and write anyway.
  Both are closed: data writes now require a **peer token or an admin token** (403 otherwise, with the
  error pointing user PATs at the regular REST API), and for identified peers the direction check is
  derived from this instance's **own membership records covering the target space** — allowed only when
  at least one relationship carrying that space permits inbound flow — never from wire input. Reads and
  the governance relays (votes/member gossip, which have their own forgery protections) are unchanged,
  as are asymmetric topologies where the writer is not listed as a member (braintree parents, single-side
  configs): their handshake-issued tokens already carry `peerInstanceId`. **Migration for
  manually-configured networks:** a hand-provisioned peer token must now be minted with
  `POST /api/tokens { peerInstanceId: "<peer-uuid>" }` (documented in the integration guide); an
  existing plain PAT used by a peer for data pushes will start receiving 403s on upgrade.

- **Both non-admin join paths bypassed join governance entirely (S9).** The documented model admits a
  new member only after the required vote passes — braintree: a yes from **every ancestor on the path
  from the inviting node to the root**; closed: all members; democratic: a majority. Neither non-admin
  join path implemented this: `POST /api/networks/:id/join` with an invite key **direct-joined**
  braintree networks (no vote round at all), and the RSA-handshake finalize (`POST /api/invite/finalize`)
  added the member directly **for every network type** — so a leaf-level invite admitted a member into a
  braintree, closed, or democratic network with no ancestor or member ever consulted. Ancestor voting
  existed only on the admin member-add path. Both paths now open the same join vote round the admin path
  uses: the member record (and its credentials) is **held on the round** (`pendingMember`) and only
  enters the member list when the vote concludes yes; the braintree required-voter set is recomputed
  from local topology at conclusion (never trusted from the wire), and the joiner always becomes a child
  of the instance it joined through — topology fields from the request body are ignored. The inviting
  instance's own yes is cast implicitly (its admin generated the invite/key), so the common flows are
  unchanged: club/pubsub still direct-join (documented), and a braintree **root** invite or the first
  member of a closed network still joins immediately. While a round is open the joiner's provisioned
  peer PAT is **refused on `/api/sync/*`** (previously an unknown-peer fallback would have honoured its
  space scope), and a vetoed or expired join round now **revokes the provisioned credentials**
  (peer PAT and outbound token) instead of leaving them live forever. Re-presenting the consumed invite key with the
  same `instanceId` polls the round: `202` while open, `200 joined` once admitted, `403` if denied —
  this also repairs the closed/democratic invite-key flow, which previously **lost the member record
  entirely** (the round held no `pendingMember`, so a passed vote admitted nobody and the consumed key
  made re-joining impossible). Covered end-to-end (two live instances, gossip, veto, credential
  revocation, sync-hold) by `testing/sync/join-governance.test.js`.

- **Dozens of mutating endpoints produced no audit entry at all.** The audit middleware keeps a
  hand-maintained route table — a second, shadow copy of the router's paths — and nothing kept the two in
  sync. It had drifted badly: the file-upload rule pointed at `/api/files/:space/upload`, **a route that has
  never existed** (the real one carries the path in the query string), and the delete/move rules required a
  trailing slash the real paths don't have. So **every file upload, delete and move was silently unlogged**.
  `PATCH /api/spaces/:id/rename` wasn't matched either, so **space renames were unaudited** — the one
  operation that, done wrong, hides a space's data. There was **no `PUT` rule in the entire table**, so every
  schema write was unlogged. Worst of all, **the whole network/governance surface was missing**: adding or
  removing a member, casting a vote, joining or forking a network — the operations that decide *who can read
  the brain* — left no trace. Webhook CRUD was pointed at the wrong prefix entirely (`/api/notify/webhooks`
  vs the real `/api/admin/webhooks`), so creating a webhook — which exfiltrates data to a third party on
  every change — was unlogged too. Also missing: duplicate **merges** (which rewrite records and delete the
  loser), conflict resolution, bulk chrono delete, token regeneration, and schema-library writes.
  All are now audited. The gap survived because the audit tests only ever asserted `memory.create`,
  `token.create/delete` and `auth.failed` — the handful of rules that happened to be correct.
  `testing/standalone/audit-route-coverage.test.js` now **derives the route list from the router source**
  instead of restating it, so the shadow table cannot drift silently again: add a mutating route and the
  test fails until it is either audited or explicitly declared exempt *with a reason*.

- **The bundled MongoDB can now be authenticated, and new installs should be.** The bundled database
  accepted any connection, and Ythril's security model (tokens, admin gating, space scoping, read-only
  tokens, the audit log) is enforced at the **API layer only** — so anything able to reach port 27017 could
  read and rewrite every space, invisibly to the audit log. Set `MONGO_USERNAME` / `MONGO_PASSWORD` (see the
  new `.env.example`) and Ythril connects with credentials, percent-encoded so a password containing `@`,
  `:` or `/` cannot corrupt the URI. An explicit `MONGO_URI` (managed Atlas, your own cluster) still wins
  and is untouched. The test stack now runs **authenticated**, so every CI run proves Ythril works against
  a credentialed database.
  **Existing installs are unaffected and must not just add credentials:** MongoDB cannot have auth switched
  on in place — the Atlas Local image runs a single-node replica set (needed for `$vectorSearch`) and only
  provisions the required internal keyfile on a **first** init, so adding credentials to a database that
  already holds data makes mongod fail to start (`Unable to acquire security key[s]`). Leaving the variables
  empty preserves today's behaviour exactly; migrating is a deliberate dump/restore, documented in
  `docs/dependencies.md`.
  Also fixes a **vacuous test**: `mongoUriRedacted` asserted the URI contained no `@`, which passed only
  because the test database had no credentials — the redaction path never ran. It now asserts the password
  is absent and that a `user:pass` pair cannot survive redaction.

- **The media sidecars can no longer reach the database.** `docker-compose.yml` put all four
  containers — `ythril`, `ythril-mongo`, `ollama`, `whisper` — on a single flat bridge network, and
  MongoDB runs with **no authentication**. Ythril's entire security model (PATs, admin gating, space
  scoping, read-only tokens, the audit log) is enforced at the **API layer only**, so anything able to
  open a TCP connection to port 27017 could read and rewrite **every space in the brain, invisibly to
  the audit log**. That mattered because `ollama` and `whisper` are third-party images whose whole job
  is parsing **untrusted user-supplied media** (uploaded images, audio, video) — the highest-risk
  attack surface in the deployment. A parser exploit in either would have yielded unauthenticated
  full-brain read/write. Kubernetes already prevented this (`media-netpol.yaml` gives the sidecars an
  Egress policy permitting only DNS + 80/443); **Compose — the default deployment — did not.** The
  network is now split: `ythril-db` (`ythril` + `ythril-mongo`, `internal: true`, so the database has
  no outbound internet either) and `ythril-media` (`ythril` + the sidecars). Only `ythril` bridges the
  two. Verified live: from `ollama`, `ythril-mongo` no longer resolves and TCP 27017 is refused, while
  `ythril` still reaches mongo, ollama and whisper. Pinned by
  `testing/standalone/network-segmentation.test.js`, which fails if anything re-flattens the network.
  **Note:** this closes the *reachability* path. MongoDB authentication (defence in depth against
  host-level access) is tracked separately — it needs a migration story, since enabling it naively
  would lock existing users out of their own database.

- **Governance rounds no longer conclude on an empty voter set.** `concludeRoundIfReady` treated
  "no remote voters" (the only member left is the round's subject) as vacuously "everyone voted yes",
  so a `closed`/braintree round with **zero votes** passed. Combined with gossip round adoption, a
  malicious peer in a small network could serve a **forged `remove` / `space_deletion` / `meta_change`
  round** and the victim would conclude it — ejecting a member or deleting a space **without any
  legitimate vote**. (The per-cast forgery guard correctly rejected the forged votes, but the round
  needed none to pass.) An empty voter set now concludes only when **this instance itself voted yes**,
  i.e. a locally-proposed action — a gossip-adopted round carries no local vote and never concludes.
  Legitimate solo actions (self-initiated remove / space deletion, which cast our own yes) are
  unaffected. Regression-guarded by `testing/sync/vote-forgery.test.js` and `governance.test.js`.

- **Kubernetes deployment is hardened and its probes/ports now actually work.** The stock
  `kubernetes/manifests/ythril-deployment.yaml` had no `securityContext`, used the mutable
  `:latest` image tag, set no resource limits on the main container, and targeted
  `containerPort: 4100` with `/api/ready` probes — but the server listens on `3200` and the
  readiness endpoint is `/ready`, so probes never passed and Service targeting hit a dead port.
  The manifest now: enforces non-root (`runAsNonRoot`, uid/gid 1000) with
  `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, all capabilities dropped, and
  `seccompProfile: RuntimeDefault`; backs every writable path with a volume (`/data` and a new
  `ythril-config` PVC for the previously-**unmounted** `/config`, plus an `emptyDir` for `/tmp`);
  adds CPU/memory requests and limits to the main container; corrects the port to `3200` and the
  probe path to `/ready`; and pins a concrete image version with inline guidance for digest
  pinning. **Behavior change:** `/config` (tokens, spaces, networks, secrets) is now persisted on
  its own PVC — previously this state was silently lost on every Pod restart. The `ythril-config`
  PVC is created by the manifest; on clusters without a default StorageClass, provision it first.

- **Sync connections are now SSRF-validated at connection time, and peer URL rewrites
  are re-validated.** Peer URLs were validated only at admission, but a peer can rewrite
  its own stored URL after admission (via gossip or the member self-update endpoint) with
  no re-check, and the sync engine connected with a bare `fetch` (no DNS pin). An
  admitted-but-malicious member could therefore point itself at `http://169.254.169.254/`
  (cloud IMDS), loopback, or an internal host, and the victim would connect there with peer
  auth headers attached. All 15 outbound sync connections now go through an SSRF-safe fetch
  (DNS-resolve → pin the socket to the validated IP → re-validate each redirect), and the
  three URL-merge paths re-validate before persisting. **Same-host / LAN deployments** whose
  peers use private addresses set the new `allowPrivatePeers` config key (or the
  `SYNC_ALLOW_PRIVATE_PEERS` env var); even then, crown-jewel addresses (loopback,
  link-local/IMDS, unspecified) stay blocked. Covered by `testing/red-team-tests/sync-peer-ssrf.test.js`
  and `testing/standalone/peer-ssrf-policy.test.js`.

- **`trust proxy` now defaults to `false` (was hardcoded to `1`).** The default compose
  deployment is exposed directly with no reverse proxy, so trusting the first hop meant
  `req.ip` came from the client-supplied `X-Forwarded-For` header — attacker-controllable.
  That let a client rotate `X-Forwarded-For` to defeat every rate limiter (including the only
  throttle in front of admin TOTP verification) and to forge client IPs in the audit log.
  `req.ip` is now derived from the socket by default. **Behavior change:** if you run behind
  a reverse proxy (nginx/Traefik/ingress), set the new `trustProxy` config key — or the
  `TRUST_PROXY` env var — to the **exact number of proxy hops** (e.g. `1`), not `true`.
  Accepts Express's native values (`false` | hop count | `'loopback'` | CIDR list).

- **`?limit`/`?skip` on brain list endpoints are clamped.** A non-numeric value
  (`?limit=abc`) previously became `NaN` and flowed unbounded into MongoDB. Values are now
  coerced to a safe bounded integer, the list helpers clamp internally as defense-in-depth,
  and proxy-space results are re-limited to the requested page size.

- **Rate-limit kill-switches (`SKIP_*_RATE_LIMIT`) are ignored in production.** These test-only
  env vars are now honoured outside `NODE_ENV=production` only, so a leaked flag can't silently
  disable rate limiting on a live deployment. A loud warning is logged at startup if one is set.

- **MCP SSE sessions are now bound to the identity that opened them.** An MCP `GET /mcp` SSE
  session was authorized once, at open time, and `POST /mcp/messages?sessionId=…` then dispatched
  into it keyed by `sessionId` **alone** — never re-checking whose token drove the call. Because the
  `sessionId` travels as a query parameter (it lands in reverse-proxy access logs, browser history,
  and referrers) it is not a secret; any holder of a valid token — even a read-only, single-space
  one — who learned another session's id could POST tool calls that executed with that session's
  privileges. Each session is now pinned to the opening token's **id and scope signature**; a
  `POST` whose token id differs, or whose scopes have since changed, is rejected with `403`. This
  also fixes privilege staleness (a mid-session scope downgrade now forces reconnect). Raw session
  ids are no longer logged — only a short non-reversible tag. Covered by
  `testing/red-team-tests/mcp-security.test.js`.

- **MCP OAuth connector tokens now expire and rotate instead of accumulating.** Every browser-connector
  consent minted a **permanent** PAT with no cap, so a connector that re-authorized on each reconnect
  grew `config.json` without bound and left a trail of orphaned, long-lived credentials (and every
  `saveConfig` rewrites the whole file). OAuth-minted tokens now carry a default **90-day expiry**
  (`MCP_OAUTH_TOKEN_TTL_DAYS`, `0` = never), a fresh consent **rotates** the single token held for that
  client rather than appending, and the total connector-token count is capped (oldest evicted). The
  token exchange advertises `expires_in` so clients can anticipate re-consent. **Behavior change:**
  connectors will need to re-authorize when their token expires. Covered by
  `testing/integration/mcp-oauth.test.js`.

- **File paths are re-checked against symlink escapes before every filesystem operation** — the
  sandbox boundary check was purely lexical (string prefix), so a symlink component anywhere along a
  path could point outside the space root while the string still looked contained — a TOCTOU that a
  recursive directory delete would follow out of the sandbox. Every read/write/delete/move/list now
  canonicalises the path with `realpath` (walking to the nearest existing ancestor for not-yet-created
  files) and re-asserts the real location is inside the space root; the recursive-delete endpoint does
  the same before `fs.rm`. (M1)

- **Chunked uploads verify full, non-overlapping coverage before assembly** — `assembleChunks` only
  checked the aggregate byte count, so a set of chunks with a gap and a compensating overlap could
  report "complete" and assemble into silently corrupt content. Assembly now verifies the chunks tile
  `[0, total)` exactly (contiguous, no gaps, no overlaps) before writing, and the returned sha256 is
  computed from the same buffers that are written in order — the previous hash was produced by a
  `data` listener racing `stream.pipeline`, so it could cover a different byte view than the file on
  disk. (M11)

- **File paths are no longer double-URL-decoded** — `resolveSafePath` ran `decodeURIComponent` on a
  value the HTTP layer had already decoded once. A filename containing a literal `%` (e.g. `50%.png`)
  therefore threw `URIError` → HTTP 500, and the on-disk path could diverge from the file-meta `_id`.
  The redundant decode is removed; the disk path now matches the stored `_id` byte-for-byte. (L3)

- **Prototype-polluting property keys are rejected in entity-merge resolution** — `applyResolutions`
  wrote resolved property values through a computed index; a `__proto__` / `constructor` / `prototype`
  key would mutate the object prototype instead of adding a data property. Such keys are now skipped.
  (Impact was limited — merge values are scalars — but it removes the footgun from a path that assigns
  user/peer-supplied keys.) (L4)

- **The `query` tool no longer silently discards a caller's projection** — the mandatory
  `embedding`-vector exclusion was applied as a second `.project()` call, which in the MongoDB driver
  *replaces* the first, dropping any projection the caller supplied. The exclusion is now merged with
  the caller's projection (respecting MongoDB's inclusion/exclusion rules), and an explicit request to
  include `embedding` is still stripped so the vector can never leak. (L5)

- **Sync data endpoints now verify network membership, not just space scope** — a peer-bound token
  was authorised against the calling token's space allow-list alone, so two networks sharing a space
  but with **disjoint membership** leaked into each other: a member of network X could read/write that
  space by naming network Y (which it does not belong to). A token carrying a `peerInstanceId` may now
  reach a space only through a network that peer is actually a member of. Manually-provisioned peer
  tokens and asymmetric (single-side-configured) networks are unaffected — they fall back to plain
  token-space scoping. (M3)

- **Sync sequence-counter poisoning is bounded** — every ingested document advances the space's `seq`
  counter (so local writes always sort above synced ones). A peer could push a single document with a
  `seq` near the protocol ceiling (2^50), dragging the counter there; once local writes reach the
  ceiling, peers reject them and the space silently loses the ability to sync new writes. Documents
  whose `seq` falls within a reserved band below the ceiling (`MAX_INGEST_SEQ = 2^50 − 2^40`) are now
  refused on every ingest path (single upsert → 400, batch → dropped with a warning, engine pull →
  skipped), and `bumpSeq` clamps the advance as a backstop. The bound is absolute rather than relative
  to the current counter, so it never false-positives on a legitimate high-volume space syncing to a
  fresh peer. (M5)

- **Merkle verification now hashes document content** — leaves were
  `SHA-256("doc:<type>:<id>:<seq>")`, so a peer serving *altered* content under the same `_id`/`seq`
  produced the same root: divergence detection caught missing or version-skewed documents but never
  tampered ones. Leaves now include a canonical content hash (keys sorted, embedding vectors excluded
  so peers running different models don't false-positive). Files were already content-hashed. Merkle
  remains advisory (opt-in per network; a mismatch is reported, not blocking). Covered by
  `testing/standalone/merkle-content-hash.test.js`. (M6)

- **Invite reparent bundles are bound to their target instance** — a braintree *reparent* invite
  rewrites one existing member's record (including its inbound `tokenHash`) at finalize. `apply` never
  compared the applying `instanceId` to the session's reparent target, so a holder of a reparent
  bundle could apply as an unrelated instance and have finalize hand them the victim's member record —
  a member takeover. `apply` (and finalize, as a TOCTOU backstop) now refuse a mismatch, and the
  normal join path re-checks membership at finalize. A new optional `expectedInstanceId` on
  `POST /api/invite/generate` pins any invite to a single instance so a leaked bundle can't be
  redeemed by someone else. (M10)

- **A `?token=` query parameter is now accepted only on the SSE endpoints** — the Bearer-token
  query-string fallback exists because the browser `EventSource` API cannot set headers, but it was
  wired into the shared auth path and therefore honoured on **every route and every method**. A token
  in a query string leaks into access logs, proxy logs, browser history and `Referer` headers, so it
  is now accepted only on `GET /api/about/logs/stream` and `GET /mcp` (the two SSE streams).
  Everything else requires the `Authorization` header. **Breaking** for any integration that passed
  `?token=` to a REST route — switch it to the header.

- **TOTP codes are single-use** — a code stayed valid for its whole ±1-step window (up to 90 s), so a
  code captured in transit (proxy log, shoulder-surf, phished operator) could be replayed — precisely
  the window an attacker with a stolen admin PAT needs to disable MFA. The highest consumed step is
  now recorded (`totpLastStep` in `secrets.json`) and a code is accepted only for a step strictly
  greater than it. Note: this makes the "test your authenticator" call on `POST /api/mfa/verify`
  consume the code, so a code entered there cannot immediately be reused for a gated action — wait
  for the next one.

- **OIDC ID-token signature algorithms are pinned** — `jwtVerify` ran with no `algorithms` option, so
  the accepted set was an implicit consequence of jose's JWKS resolver rather than stated policy. It
  is now an explicit asymmetric allow-list (RS/PS/ES/EdDSA), narrowable per deployment via
  `oidc.allowedAlgorithms` (e.g. `["RS256"]`). To be precise about the scope: jose already refuses
  symmetric JWKS keys, so the classic HS/RS confusion attack was **not** reachable — this is defence
  in depth, not a fix for an exploitable hole. Covered by `testing/standalone/oidc-alg-pinning.test.js`.

- **The instance-level MCP tools now require an admin token** — `list_peers` (full peer topology:
  instance IDs, URLs, network membership) and `sync_now` (drives outbound connections to every peer)
  had no admin gate, though their REST equivalents under `/api/networks*` are all `requireAdmin`. Any
  space-scoped token could enumerate the network and trigger syncs. Both are now admin-only, enforced
  in the dispatcher and hidden from `tools/list` for non-admin tokens.

- **`POST /api/conflicts/seed` is admin-gated** — this test fixture fabricates conflict records that
  the UI presents as genuine sync conflicts with an attacker-chosen peer label, and whose resolution
  actions move/overwrite files. It sat on the plain authenticated router, so any space-scoped token
  could inject them.

- **Token lookup prefixes now carry their intended entropy** — the stored `prefix` (a pre-filter for
  the bcrypt scan) was `plaintext.slice(0, 8)` = the literal `ythril_` plus **one** random character,
  despite a comment claiming 62^8. Roughly 1/62 of all tokens shared a bucket, so a large deployment
  ran many bcrypt compares per request. It is now taken from the random part (offset 7). Records
  still holding the old format keep authenticating and are migrated on first use — no token is
  invalidated, no re-issue needed.

- **`query` tool `$regex` filters are now bounded against ReDoS** — the structured query filter
  sanitizer whitelisted `$regex` but applied no pattern analysis, so a catastrophic-backtracking
  pattern could pin MongoDB CPU for the full `maxTimeMS` budget per call (multiplied per member
  space on proxy spaces). `$regex` values must now be strings of at most 500 characters and pass
  the same conservative nested-quantifier heuristic used for schema `pattern` rules (shared via
  `util/redos.ts`); the `maxTimeMS` ceiling drops from 30 s to 10 s. Covered by
  `testing/standalone/query-regex-redos.test.js`.

- **Removed or ejected sync peers no longer keep valid credentials** — removing a member (direct
  club/pubsub removal, a concluded remove vote, a departure, or deleting a network) never revoked
  the peer's PAT or dropped the stored outbound token, so an ejected peer could keep reading and
  writing sync data indefinitely. Credentials are now revoked once the peer no longer shares **any**
  network with this instance (membership in another common network preserves them), on both sides of
  an ejection. The ejection guard also now covers the **data** endpoints (`/api/sync/memories`,
  `/entities`, `/edges`, `/chrono`, `/batch-upsert`, `/manifest`, `/files`, tombstones, merkle …) —
  previously only `/api/sync/networks/:id/*` returned `401 ejected`, while data endpoints fell back
  to "space exists" because the network config is deleted on ejection. Covered by
  `testing/sync/peer-revocation.test.js`.

- **Chunked uploads now enforce the storage quota and a total-size bound** — the `Content-Range`
  upload branch performed no quota check at all (quota applied only to single-request uploads) and
  never bounded the declared total, so a client could bypass the files hard limit or fill the disk
  through the `.chunks` staging area. Every chunk now runs the same quota check as a single-request
  upload (the first chunk projects the full declared total), staged bytes under `.chunks` count
  toward measured file usage, and the declared total is capped by `maxChunkedUploadBytes`
  (default 10 GiB). Covered by `testing/red-team-tests/file-hardening.test.js`.

- **User-uploaded HTML/SVG/XML can no longer run script in the instance origin (stored XSS)** —
  file downloads served `text/html` and `image/svg+xml` inline with no `Content-Disposition`, so a
  crafted upload opened in the browser executed in Ythril's origin (web-UI token theft). Active-content
  types (`.html`, `.htm`, `.svg`, `.xml`, `.xhtml`) are now served with
  `Content-Disposition: attachment` and a `sandbox` CSP; passive types (images, PDF, plain text)
  stay inline so previews keep working. Filenames are quote/CRLF-sanitised in the header. Covered by
  `testing/red-team-tests/file-hardening.test.js`.

- **Document conversion is size-bounded (DoS guard)** — the pdf/docx/epub/html → markdown pipeline
  accepted inputs of any size (`maxFileSizeBytes` applied only to media embedding), parsed HTML
  in-process via jsdom, and stored every image a document embedded. Conversion now rejects documents
  over `maxDocumentConversionBytes` (default 100 MiB; HTML capped at 25 MiB because jsdom parses
  in-process) permanently — no retry burn — and extracted images are capped at 50 per document /
  100 MiB aggregate. Covered by `testing/standalone/conversion-limits.test.js`.

- **Webhook delivery now pins the connection to the validated IP** — `ssrfSafeFetch` resolved and
  validated the target's address but then let `fetch` re-resolve it to connect, leaving a narrow
  DNS-rebind TOCTOU window between check and connect. It now pins the socket to the exact validated
  address via an undici dispatcher (TLS SNI / certificate validation still use the hostname), and
  re-pins on every redirect hop, so the connection can never land on a different (internal) IP than
  the one that passed the SSRF check. The redirect-follow cap is configurable via
  `webhookMaxRedirects` in `config.json` (or the `WEBHOOK_MAX_REDIRECTS` env var), default 3, clamped
  to `[0, 20]`. Adds `undici` as a direct dependency. Covered by
  `testing/standalone/ssrf-ip-pinning.test.js`.

- **MCP proxy spaces no longer bypass member-space token scope** — an MCP call targeting a proxy space
  checked the token only against the *proxy* space id, then fanned reads/writes out to the member
  spaces with no further check. A token scoped solely to a proxy (especially a `proxyFor: ['*']`
  wildcard) could therefore reach spaces it was never granted — the whole instance in the wildcard
  case. The MCP dispatcher now requires the token to hold **every** member space (mirroring
  `requireSpaceAuth` on the REST layer) before any proxy fan-out.

- **MFA setup/disable now require a current TOTP code once MFA is enabled** — `POST /api/mfa/setup`
  (rotate) and `DELETE /api/mfa` (disable) were gated only by `requireAdmin`, so a stolen admin PAT
  could silently overwrite or remove the second factor it was meant to be protected by. Both now use
  `requireAdminMfa`: first-time enrolment still needs no code (MFA is off), but rotating or disabling
  an *enabled* factor requires a valid code. Break-glass recovery when the authenticator is lost is
  removing `totpSecret` from `secrets.json` on the host.

- **Token minting cannot escalate scope** — `POST /api/tokens` applied no relationship between the
  new token's scope and the creating token's. A *space-restricted* admin token could mint an
  `admin: true` token with no `spaces` (= all spaces) and escalate to unrestricted admin. A
  space-restricted creator may now only mint tokens confined to a subset of its own spaces; an
  unrestricted admin is unaffected.

- **OIDC now fails closed for unmatched tokens (behaviour change)** — a JWT that matched neither the
  `admin` nor the `readOnly` claim rule was granted `readOnly: undefined` (read-write) and
  `spaces: undefined` (ALL spaces), so any principal able to obtain an audience-matching token from a
  shared realm got full read-write access to every space. Such tokens are now accepted with
  **read-only access to no spaces**; a configured-but-missing `spaces` claim likewise yields an empty
  allow-list rather than all spaces. **Action required:** if you relied on the permissive default,
  grant access explicitly via `claimMapping` rules (or set `requireMatch: true` to reject unmatched
  tokens outright). Covered by `testing/standalone/oidc-claim-mapping.test.js` and
  `testing/red-team-tests/auth-escalation.test.js`.

- **SSRF guard hardened against alternate host encodings and DNS-based bypasses** — the outbound-URL
  validator (`util/ssrf.ts`) previously inspected only the literal hostname string, so a blocked
  address supplied in a non-standard encoding — decimal/hex/octal integer (`http://2130706433/`),
  short form (`http://127.1/`), IPv4-mapped IPv6 (`http://[::ffff:127.0.0.1]/`), trailing dot, or the
  unspecified address — slipped through, as did any public DNS name that resolves to an internal
  host. `isSsrfSafeUrl` now canonicalises every IPv4 encoding and expands IPv6 (including
  IPv4-mapped/compatible forms), and additionally blocks CGNAT (100.64/10) and the broadcast address.
  A new authoritative async layer (`assertUrlSafeResolved` / `ssrfSafeFetch`) resolves the target via
  DNS and validates **every** returned A/AAAA record, then follows redirects manually and re-validates
  each hop. **Webhook delivery** now uses `ssrfSafeFetch`, closing a post-auth SSRF pivot where a
  webhook target could 302-redirect (or DNS-rebind) to a private/reserved IP after passing
  creation-time validation. Covered by `testing/standalone/ssrf-hardening.test.js` (65 unit cases) and
  `testing/red-team-tests/ssrf-encoding.test.js`.

- **Sync: forged tombstones can no longer delete another instance's data** — `applyRemoteTombstone`
  authorised a deletion purely on `localDoc.author.instanceId === tombstone.instanceId`, both of which
  are attacker-controlled, so a member could forge a tombstone with `instanceId` set to a victim
  instance and delete that victim's authored memories/entities/edges/chrono across the network. The
  deletion is now bound to the authenticated peer: a tombstone may delete a document only when its
  issuer matches the delivering peer's identity (`peerInstanceId`, set on production peer tokens) or
  the caller is a trusted local/admin token. A tombstone relayed by a third party on behalf of another
  author is refused; the author's own tombstone reaches each peer first-hand on direct sync. New
  red-team test `testing/sync/tombstone-forgery.test.js`; the pubsub tombstone test now uses a
  production-style bound peer token.

- **Sync governance: vote forgery via the gossip pull path is now rejected** — during a sync cycle a
  node pulls open vote rounds from each peer and merged the vote casts it received. The merge trusted
  the `instanceId` on each cast, so a single malicious member could serve a fabricated round
  pre-stuffed with forged `yes` votes attributed to every other member and drive a `remove` /
  `space_deletion` / braintree `join` round to conclusion without real quorum — ejecting members or
  destroying a remote space. The pull-merge (`server/src/sync/engine.ts`) now accepts only a peer's
  **own** vote (`peerCast.instanceId === member.instanceId`), matching the authenticated POST vote
  path; each member's vote reaches quorum first-hand because governance networks sync with every
  member. Additionally, braintree conclusion (`server/src/api/sync.ts`) no longer trusts a
  peer-supplied `requiredVoters` **set**: it recomputes the ancestor chain from the local topology
  (anchored on the proposer node), so the set cannot be shrunk to `[attacker]`. Covered by a new
  red-team integration test `testing/sync/vote-forgery.test.js`; the full governance/vote/braintree/
  pubsub/democratic/closed suite continues to pass.

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

## [0.10.3] — 2026-04-18

### Changed

- **Entity type dropdown**: The entity type field is now a `<select>` when the space schema defines `entityTypes`, making it required and preventing free-text entry of unknown types. The first defined type is pre-selected when the create form opens.
- **Entity type change rebuilds properties**: Selecting a different entity type in the create, inline-edit, or drawer-edit form rebuilds the properties object to match the schema for that type — existing values are preserved and new required fields are added with their defaults.
- **Edge label dropdown**: The edge label field is now a `<select>` when the space schema defines `edgeLabels`, replacing the free-text input. The first defined label is pre-selected.
- **Schema violation error messages**: API errors with `error: 'schema_violation'` are now formatted as human-readable messages listing each violated field and reason (e.g. `Schema violation — properties.status: required property 'status' is missing or empty`).
- **Linked entities shown as name chips**: The "entities" column in the Memories and Chrono tables now displays entity name chips (resolved via the entity name cache) instead of a plain "X linked" count, consistent with the Files tab.
- **Edit button removed from rows**: The ✎ inline-edit button has been removed from Memory, Entity, Edge, and Chrono table rows — the ⊙ view-details button (which opens the full editable drawer) is the single entry point for editing. The ✎ button is retained on File Metadata rows which have no drawer.

## [0.10.2] — 2026-04-16

### Changed

- **Enable Networks one-click bootstrap**: The wizard now bootstraps the local connector automatically so users no longer need to run the workstation setup command manually in normal cases.
- **First-run cloudflare automation**: One-click setup now handles `cloudflared` install, Cloudflare login (when needed), tunnel ensure/create, and tunnel config writing in an idempotent flow.
- **Safer DNS behavior**: DNS overwrite is now explicit user choice; overwrite remains off by default and can be opted in when replacing an existing hostname record is intentional.
- **Wizard flow clarity**: Automatic path is now primary; manual command flow is shown only as fallback, reducing confusion for non-technical operators.

### Fixed

- **cloudflared runtime launch path**: User-mode tunnel startup now uses the resolved `cloudflared` executable path instead of a hardcoded command name, improving reliability on fresh Windows installs.

## [0.10.1] — 2026-04-16

### Added

- **Proxy wildcard `['*']`**: Create Space now supports an "All" proxy-for option stored as the sentinel value `['*']`. The server resolves this at query time to all current non-proxy spaces, so spaces added after the proxy was created are automatically included without reconfiguration.
- **Purpose field on space creation**: Create Space dialog now exposes a `Purpose` textarea (mapped to `meta.purpose`) with a rich default template listing all 29 available MCP tools, making space intent visible to LLM clients during the MCP handshake.
- **Schema validation on space creation**: `validationMode` (off / warn / strict) and `strictLinkage` can now be set at creation time in the Admin → Spaces dialog instead of only through a post-creation patch.

### Changed

- **Create Space dialog wider**: max-width increased from 700 → 960 px and the purpose field uses a larger textarea (5 rows, 4000 char max) to accommodate detailed descriptions.
- **Audit log consolidated**: Server Logs are now only in Logs → Server Log sub-tab. The duplicate section in the About page has been removed. The stream auto-starts when the tab is activated — no manual Stream button needed.
- **Retention time displayed**: Audit Log tab now shows the configured retention period (days) next to the export buttons, read from the server config.
- **Built-in column removed**: The redundant "Built-in" column has been removed from the Admin → Spaces table.

### Fixed

- **File manager directory detection**: `listFiles` now correctly maps the server's `type: 'file'|'dir'` and `modifiedAt` response fields to the client `FileEntry` shape (`isFile`, `isDirectory`, `modified`). Previously all entries appeared as files and folders could not be navigated.
- **File download 401**: Download links now include the bearer token as a `?token=` query parameter, matching the server's existing fallback for contexts where `Authorization` headers cannot be set.
- **File preview 401**: The preview fetch for text files now sends the `Authorization: Bearer` header so previewing files no longer returns `{"error":"Missing Authorization header"}`.

## [0.10.0] — 2026-04-15

### Added

- **Entity-centric graph exploration UI**: New graph-first workflow to inspect entities with linked chrono and memory context in a single view, improving relationship discovery and triage for dense knowledge spaces.
- **Entity merge API + MCP tool**: `POST /api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId` and `merge_entities` MCP tool with per-property conflict resolution, relinking, and duplicate-edge warning support.
- **Field deletion in partial updates**: `deleteFields` dot-notation support added to PATCH update flows (memories/entities/edges) and corresponding MCP update tools, enabling safe cleanup of stale keys without full document rewrites.
- **Strict linkage enforcement mode**: per-space `strictLinkage` opt-in enforcing UUID linkage semantics for references plus stronger entity-delete protections when backlinks exist.
- **Test orchestration improvements**: full-suite runner with automatic cleanup path and explicit keep-artifacts mode (`test:all:keep`) to make CI/local runs deterministic while preserving debug workflows when needed.

### Changed

- **Version line promoted to 0.10.0**: post-v0.9.1 feature accumulation (graph UX, merge semantics, strict linkage, update model changes) consolidated into a minor release bump.
- **Documentation parity sweep**: integration and developer documentation re-audited against current server/client implementation and recent commits, with endpoint coverage corrections and MCP/API alignment updates.
- **Repository hygiene updates**: test command/path references normalized to the current `testing/` layout and compose invocation patterns aligned for reproducible local and CI execution.

### Fixed

- **UI settings/feedback correctness**: follow-up fixes across Brain/Settings UX including data table behavior, dialog consistency, and quota naming (`minGiB` → `maxGiB`) to reduce operator confusion.
- **Audit and observability polish**: incremental fixes in audit-related UI/behavior and log-viewing workflows to improve reliability during investigations.

## [0.9.2] — 2026-04-15

### Changed

- **Documentation parity pass**: `docs/integration-guide.md` was reconciled against the current server implementation and commit history to ensure endpoint coverage reflects the actual code surface.
- **Sync API reference expanded**: replaced partial/high-level endpoint notes with a full route overview including collection sync routes, gossip routes, warm-up endpoint, and updated request/response examples.
- **Brain API reference corrected**: documented REST availability for recall, added structured query and file-metadata listing endpoints, and clarified behavior where MCP and REST parity exists.
- **Auth/admin endpoint coverage improved**: added missing token self-introspection (`GET /api/tokens/me`), readiness probe (`GET /ready`), OIDC discovery (`GET /api/auth/oidc-info`), and admin log streaming (`GET /api/about/logs/stream`) documentation.
- **Setup and conflict utilities documented**: added legacy first-run HTML setup routes and conflict/link-violation utility endpoints used by operations/testing.
- **Version metadata alignment**: root, client, server package versions and lockfile metadata bumped to `0.9.2`.

## [0.9.1] — 2026-04-12

### Security

- **Fork depth chain bypass**: The fork-depth check in the sync protocol counted only direct siblings (`countDocuments({ forkOf })`) instead of walking the chain upward. An attacker could create an unbounded A→B→C→… chain by targeting each new fork's `_id`. Replaced with `forkChainDepth()` — walks the `forkOf` chain upward with a visited-set cycle guard and hard cap at `MAX_FORK_DEPTH`. Fixed at both single-doc and batch-upsert sites.
- **Rate-limit IP isolation**: Added `app.set('trust proxy', 1)` so `req.ip` reflects the real client address behind reverse proxies (Traefik, nginx). Without this, all clients behind Docker/K8s shared a single rate-limit bucket.
- **Webhook secrets encrypted at rest**: Webhook secret strings are now AES-256-GCM encrypted before storage and decrypted on read. Requires `webhookEncryptionKey` in the secrets file.

### Fixed

- **Dynamic `import()` in sync handlers**: Replaced 4 dynamic `await import()` calls inside request handlers (`uuid`, `manifest.js`, `merkle.js`, `loader.js`) with top-level static imports. Eliminates per-request module-resolution latency.
- **Webhook retry queue**: Replaced in-memory `setTimeout` retry chains with a MongoDB-backed retry queue (`_webhook_retry_queue` collection with `scheduledAt` index). Retries survive process restarts.
- **Webhook auto-disable**: Webhooks that reach the maximum retry count are automatically set to `status: 'failing'` and excluded from future dispatch until re-enabled.
- **Webhook delivery TTL**: Delivery history records are TTL-indexed (`_expireAt` + `expireAfterSeconds: 0`) for automatic purge.
- **Typed error routing**: Introduced `NotFoundError` and `ValidationError` classes. Brain memory lookups throw typed errors; the API layer catches and routes to 404/400 without string matching.
- **Audit middleware method grouping**: Route rules refactored into `RULES_BY_METHOD: ReadonlyMap` — O(1) method lookup instead of scanning all rules. Added `bulk.write` and `brain.traverse` operation names.
- **Audit TTL index**: Switched from `createIndex({ timestamp }, { expireAfterSeconds })` to `collMod` with a bare `{ timestamp: -1 }` performance index and a dedicated `_expireAt` BSON Date field for the TTL daemon.

### Changed

- **Contribution guide**: Added comprehensive **Engineering Principles** section covering six non-negotiable standards: Security, Scalability, Stability, State-of-the-Art, Cleverness (simplicity), and Legal — with concrete, enforceable rules drawn from the codebase.

## [0.9.0] — 2026-04-11

### Added

- **Space schema definition and validation**: Spaces now carry a `meta` block that defines allowed entity types, edge labels, naming patterns (regex per entity type), required properties (per knowledge type), and property value schemas (type, enum, min/max, pattern). Three validation modes: **strict** (rejects violations with 400), **warn** (accepts with warnings array), **off** (default). Configured via `PATCH /api/spaces/:id` with a `meta` field.
- **`GET /api/spaces/:id/meta`**: Read a space's full schema definition with derived stats (memory/entity/edge/chrono/file counts). Returned to MCP clients via the `get_space_meta` tool.
- **`POST /api/spaces/:id/validate-schema`**: Dry-run schema validation — scans existing data (up to 10K docs per collection, 500 violations reported) against the current or proposed schema without writing anything. Useful for auditing impact before enabling strict mode.
- **Schema validation in bulk writes**: `POST /api/brain/spaces/:spaceId/bulk` and the MCP `bulk_write` tool now validate each item against the space schema. Strict mode skips violating items (recorded as errors); warn mode proceeds with warnings.
- **MCP `get_space_meta` tool**: Returns the full space schema, purpose, usage notes, and stats. The schema summary is also injected into MCP `instructions` during the SSE handshake so LLM clients see constraints upfront.
- **MCP `find_entities_by_name` tool**: Exact name lookup returning all matching entities regardless of type.
- **Find-similar endpoint**: `POST /api/brain/spaces/:spaceId/find-similar` and MCP `find_similar` tool — vector similarity search by existing entry ID. Uses the entry's stored embedding directly (no re-embedding). Supports cross-space search, target-type filtering (`memory`, `entity`, `edge`, `chrono`, `file`), score thresholds, and configurable `topK` (1–100).
- **Audit log**: Append-only, immutable access log stored in `audit_log` MongoDB collection. Tracks all write operations, auth failures, and optionally read operations (`audit.logReads` config). Fields: token identity, OIDC subject, operation, space, HTTP status, IP, duration. TTL-based auto-purge (default 90 days). Admin-only query API with filtering and pagination at `GET /api/admin/audit-log`. Web UI in **Settings → Audit Log** with search, detail views, and JSON/CSV export.
- **Webhook event subscriptions**: Subscribe external systems to real-time HTTP POST notifications on write events. 15 event types across memories, entities, edges, chrono, and files plus `test.ping`. Payloads signed with HMAC-SHA256, at-least-once delivery with 6 retries (10s → 30s → 1m → 5m → 30m → 1h). SSRF-protected URL validation. Admin CRUD API at `/api/admin/webhooks` with delivery history. Requires admin token + MFA.
- **Space export API**: `GET /api/admin/spaces/:spaceId/export` dumps all knowledge (memories, entities, edges, chrono, file metadata) as a single JSON document with embedding vectors stripped. Binary file content is not included.
- **Space import API**: `POST /api/admin/spaces/:spaceId/import` upserts exported data back into a space. Each document is matched by `_id` — existing docs are replaced, new docs are inserted. Run reindex afterward to rebuild embeddings.
- **Bulk write API**: `POST /api/brain/spaces/:spaceId/bulk` and MCP `bulk_write` tool for batch-upserting up to 500 memories, entities, edges, and chrono entries per call. Processing order: memories → entities → edges → chrono (edges can reference entities created in the same batch).
- **Graph traversal API**: `POST /api/brain/spaces/:spaceId/traverse` and MCP `traverse` tool — multi-hop BFS from a starting entity with direction control (`outgoing`, `incoming`, `both`), edge-label filtering, configurable `maxDepth` (hard cap 10), cycle detection, and result limiting.
- **Query REST endpoint**: `POST /api/brain/spaces/:spaceId/query` — structured MongoDB filter queries on any collection (`memories`, `entities`, `edges`, `chrono`, `files`) with projection, limit, and timeout control. Previously MCP-only (`query` tool), now accessible via REST.
- **Query panel in Brain UI**: Interactive query builder in the web interface for running structured queries against any collection.
- **Chrono advanced filters**: `list_chrono` tool and `GET /chrono` now support date-range (`after`/`before`), AND/OR tag filtering (`tags`/`tagsAny`), full-text `search`, and `kind`/`status` filters.
- **Space wipe API**: `POST /api/admin/spaces/:spaceId/wipe` with per-type granularity — wipe only memories, or only entities+edges, etc. Tombstones are cleaned for wiped types. Also available as MCP `wipe_space` tool.
- **MCP `update_space` tool**: Update space label and/or description from MCP (admin tokens only).
- **ID-only update paths**: `update_entity`, `update_edge`, `update_memory`, and `update_chrono` now accept updates by ID without requiring all fields — partial patches work correctly.
- **Entity upsert duplicate warning**: When inserting an entity without an `id` and entities with the same `name`+`type` already exist, the response includes a `warning` field explaining how many duplicates exist and advising to pass `id` for updates. Surfaced in both REST and MCP responses.

### Fixed

- **Entity identity model**: Name+type is no longer a unique constraint. Multiple entities with the same name and type are valid — `id` (UUID v4) is the sole unique key. The `(spaceId, name, type)` index now exists as a non-unique performance index.
- **Index migration**: On startup, if the legacy unique index `spaceId_1_name_1_type_1` exists, it is dropped and recreated as non-unique. The migration check runs once via `listIndexes()` and is a no-op after the first run.
- **`$options` injection hardening**: The `$options` MongoDB operator is now validated: must appear alongside `$regex` (bare `$options` rejected), value must be a string containing only valid regex flags (`i`, `m`, `s`, `x`). Invalid flags or non-string values return 400.
- **ReDoS protection**: User-supplied regex patterns in schema `namingPatterns` and `propertySchemas` are structurally analysed for nested quantifiers (`(a+)+`) and alternation-with-quantifier (`(a|b)+`) patterns. Dangerous patterns are rejected before execution. Pattern length is capped at 500 characters, test values at 10K characters.
- **PATCH endpoints dropping fields**: All PATCH/update endpoints for entities, edges, memories, and chrono now correctly preserve unmentioned fields instead of silently clearing them.
- **Schema validation double-call in MCP**: The MCP router previously validated once for strict and again for warn mode. Fixed to validate once and reuse the result.
- **Audit log TTL index**: Timestamp field is stored as an ISO string for API compatibility; a dedicated `_expireAt` BSON Date field powers the TTL index so entries are actually purged by MongoDB's TTL daemon.
- **Audit log auth failure coverage**: `logAuthFailure` is now called in `requireAdmin` and `requireAdminMfa` middlewares (not just `requireAuth` and `requireSpaceAuth`), ensuring all failed authentication attempts are logged.
- **Webhook SSRF protection**: Webhook URLs are validated against private/reserved IP ranges using `isSsrfSafeUrl()`, matching the protection already applied to invite and network endpoints.
- **Webhook MFA enforcement**: Webhook admin routes now use `requireAdminMfa` instead of `requireAdmin`, consistent with all other admin endpoints (export, import, wipe, config reload).

### Changed

- **README**: Rewritten with structured feature sections (semantic recall, knowledge graph, chrono timeline, file storage, schema validation, bulk operations, proxy spaces, export/import, find-similar, audit log, webhooks, 30 MCP tools, multi-brain sync, security) for better discoverability.
- Documentation: `integration-guide.md` updated — schema validation section, space meta endpoint, validate-schema endpoint, export/import endpoints, find-similar endpoint, audit log API section, entity identity model clarification, $options validation, bulk write schema validation note. `userguide.md` updated — schema configuration, export/import, query panel, audit log and webhook settings pages, find_similar in MCP tools table. `contribution-guide.md` updated — test suite descriptions reflect current coverage.

## [0.8.0] — 2026-04-04

### Added

- **Brain UI — space stats bar**: five stat pills (Memories, Entities, Edges, Chrono, Files) at the top of the Brain page pull from `GET /api/brain/spaces/:id/stats` and refresh on every load.
- **Brain UI — needs-reindex banner**: when the space returns `needsReindex: true`, a banner prompts the user to reindex. Clicking "Reindex now" calls `POST /api/brain/spaces/:id/reindex` and shows a confirmation on completion.
- **Brain UI — memory `description` + `properties` fields**: free-text description textarea and key/value properties builder added to the create-memory form. Values are displayed inline on each memory card.
- **Brain UI — entity `description` field**: optional description field added to the create-entity form; displayed in the entity table's Description column.
- **Brain UI — entity search + pagination**: search-by-name bar dispatches `GET /api/brain/spaces/:id/entities?search=…` and entity list pages 20 at a time with Prev / Next controls.
- **Brain UI — edge `tags`, `description`, `properties` fields**: tags (comma-separated), description, and properties added to the create-edge form; Tags column added to the edge table; description shown as a subtitle row.
- **Brain UI — edge pagination**: edge list pages 20 at a time with Prev / Next controls.
- **Brain UI — chrono filter bar + pagination**: tag and status filter dropdowns filter `GET /api/brain/spaces/:id/chrono`; chrono list pages 20 at a time with Prev / Next controls.
- **Brain UI — inline delete confirmations**: per-row inline confirm/cancel buttons replace browser `confirm()` dialogs for deleting memories, entities, edges, and chrono entries. A single `confirmDeleteId` signal tracks the active confirmation.
- **Files UI — drag-and-drop upload**: the file listing area accepts drag-and-drop; `dragover`/`dragleave`/`drop` host listeners toggle a `.drag-over` CSS class and route dropped files through the shared `uploadFiles()` method.
- **Files UI — preview button**: a 👁 Preview button in the Actions column opens a file in the preview panel (before the existing Download button).
- **Server: `properties` field on chrono entries**: chrono create (`POST /spaces/:spaceId/chrono`) and update (`POST /spaces/:spaceId/chrono/:id`) REST routes now accept, validate, and persist an optional `properties: Record<string, string | number | boolean>` body field.
- **Server: `properties` field on file metadata via REST upload**: the file write route (`PUT /api/files/spaces/:spaceId/*`) now accepts and persists an optional `properties` body field alongside the existing `description` and `tags`.

### Fixed

- **Chrono REST routes missing `properties` pass-through**: the `POST /spaces/:spaceId/chrono` and `POST /spaces/:spaceId/chrono/:id` routes did not destructure `properties` from `req.body` and did not forward it to `createChrono()` / `updateChrono()`. Values were silently dropped.
- **File upload REST route missing `properties` pass-through**: `metaOpts` type only declared `description` and `tags`; `properties` was never extracted from `req.body` or forwarded to `upsertFileMeta()`.

### Changed

- `docs/userguide.md`: updated Brain and Files sections to document all new UI fields, controls, and interactions added in this release.
- Brain integration tests: new tests for memory `description`/`properties`, entity `description`, edge `tags`/`description`/`properties` with union-merge and validation, chrono `properties`, and file metadata `properties`. All 385 integration tests pass (0 failures).
- Red-team tests: all 175 pass (0 failures). Sync tests: 158 pass, 1 skip. Standalone tests: 194 pass, 4 skip (Windows permission-bit checks not applicable).

## [0.7.1] — 2026-04-04

### Added

- **MCP `recall`/`recall_global` `types` filter**: integration tests covering `types=['memory']`, `types=['entity']`, `types=['memory','entity','edge']`, unknown type strings (graceful no-op), and `recall_global` with type filter. All skip gracefully when the embedding server is not configured.
- **Brain memory dual-prefix**: `GET`, `DELETE` and bulk-wipe memory routes are now accessible under both `/:spaceId/` (original) and `/spaces/:spaceId/` (preferred, consistent with entities/edges/chrono). Both forms are fully equivalent. Documentation updated in `integration-guide.md`.

### Fixed

- **`GET /api/about/logs` auth escalation** (MEDIUM): endpoint previously required only `requireAuth` (any valid token), allowing non-admin tokens to read log lines that may contain space IDs, peer URLs, and internal paths. Now requires `requireAdmin`.
- **`POST /api/admin/reload-config` insufficient auth** (MEDIUM): endpoint previously required only `requireAuth`. Reloading config can add/remove spaces and triggers token migration — privileged operations. Now requires `requireAdminMfa` (admin token + TOTP when MFA is enabled), consistent with other admin-destructive endpoints.
- **Space description limit**: raised from 2 000 to 4 000 characters (`PATCH /api/spaces/:id` Zod schema). MCP clients using the description as system instructions need the additional headroom for the default auto-generated tool listing.
- **`uploadFile()` removed from `ApiService`**: the legacy single-request upload method was an unused dead stub — all uploads go through the chunked path. Removed to prevent accidental use that bypassed chunking for large files.

### Changed

- Documentation: `integration-guide.md` updated — reload-config MFA note, about/logs admin requirement, space description limit (2000 → 4000), brain memory dual-prefix section.

## [0.7.0] — 2026-03-30

### Added

- **Space rename**: `PATCH /api/spaces/:id/rename` atomically renames a space — moves MongoDB collections, file directories, updates network `spaces[]` arrays and token scopes. Inline rename UI (pencil icon) in Settings → Spaces. The built-in `general` space cannot be renamed.
- **Space ID remapping (`spaceMap`)**: `NetworkConfig.spaceMap` (`Record<string, string>`) maps remote space IDs to local space IDs. The sync engine translates between remote and local IDs transparently during pull and push via `remoteToLocal()` / `localToRemote()` helpers. Watermark keys use remote IDs; local storage uses local IDs.
- **Join collision resolution UI**: When joining a network whose spaces collide with existing local spaces, a per-space dropdown lets the user choose **Merge** (sync into the existing space) or **Alias** (create a new local name). Alias names flow into the `spaceMap` on the network config.
- **Reload-config token migration**: `POST /api/admin/reload-config` now evicts tokens that lack a `prefix` field (legacy format) and persists the cleaned config. Prevents stale tokens from surviving a reload.
- **Process crash handlers**: `process.on('unhandledRejection')` and `process.on('uncaughtException')` in the server entry point. Unhandled rejections are logged but do not exit; uncaught exceptions log and exit with code 1.
- Tests: `space-rename.test.js` (integration, 9 tests).

### Fixed

- **Auth test concurrent safety**: Replaced `docker restart` in `auth.test.js` with atomic config file write + `POST /api/admin/reload-config` + retry loop. Eliminates container restarts that caused socket errors when tests run concurrently.

### Changed

- Documentation updated: `userguide.md` (space rename, join collision resolution), `integration-guide.md` (rename endpoint, `spaceMap` on join-remote, reload-config migration), `sync-protocol.md` (space ID remapping section).

## [0.6.0] — 2026-03-29

### Added

- **Pub/Sub network type**: Single publisher distributes knowledge to any number of subscribers. Auto-accept joins (no voting), reusable invite key, push-only data flow (publisher → subscribers). Publisher can remove subscribers unilaterally. Subscriber-local data is protected by UUIDv4 identity and author guard on tombstones.
- **Sync direction enforcement**: `SyncDirection = 'both' | 'push' | 'pull'` on member records. Seven inbound sync POST endpoints (`/memories`, `/entities`, `/edges`, `/chrono`, `/batch-upsert`, `/tombstones`, `/file-tombstones`) now reject writes from peers whose `direction === 'push'` with `403`. Server-side complement to the engine's client-side skip logic.
- **MCP `remember` input size limit**: `fact` field capped at 50 000 characters in the MCP handler, matching the existing REST API constraint. Prevents oversized facts from bypassing quota semantics.
- Tests: `pubsub-topology.test.js` (sync), `direction-enforcement.test.js` (red-team), `mcp-security.test.js` (red-team) — 6 MCP SSE session tests covering recall_global scope isolation, oversized input rejection, operator injection blocklist, and depth-limited filters.

### Fixed

- **`requireSpaceAuth` scope bypass** (MEDIUM): Scoped tokens accessing non-existent spaces received `404` instead of `403` because `resolveMemberSpaces()` returned `[]` for unknown spaces, causing the scope check to silently pass. Now falls back to `[spaceId]` so the check correctly rejects.
- **`reloadConfig()` missing `initSpace()`** (MEDIUM): Adding a new space to `config.json` and calling `POST /api/admin/reload-config` left the space without MongoDB collections, indexes, vector search index, or file directories until the next container restart. The endpoint now calls `ensureGeneralSpace()` and `initSpace()` for any newly added non-proxy spaces.
- **`syncCyclesTotal` metric invisible at startup**: prom-client labeled counters don't emit HELP/TYPE lines until the first `.inc()` call. Pre-initialized with `.inc(0)` so the metric is discoverable by monitoring dashboards from startup.

### Changed

- Documentation updated: `sync-protocol.md` (direction enforcement section), `integration-guide.md` (pubsub type, reload-config behaviour, add-member pubsub notes, sync 403), `userguide.md` (pubsub rows in governance/removal tables), `contribution-guide.md` (test coverage descriptions).

## [0.5.1] — 2026-03-28

### Added

- **External theming API**: Static CSS override via `theme.cssUrl` in config + runtime `postMessage` with `{ type: 'ythril:theme', tokens }` for portal embedding. Server endpoint `GET /api/theme` (public, no auth).
- **ThemeService** (Angular): `APP_INITIALIZER`-based loader with 3 s timeout; postMessage listener restricted to `--`-prefixed CSS custom properties only.
- **OIDC silent refresh**: Hidden-iframe token renewal with PKCE. Decodes JWT `exp` claim, schedules refresh 60 s before expiry, falls back to 401 interceptor on failure.
- **Space deletion purge**: `DELETE /api/spaces/:id` now drops all `{spaceId}_*` MongoDB collections, vector search indexes, `/data/files/{spaceId}/`, and `/data/.chunks/{spaceId}/`. Cleanup errors abort deletion (space stays in config for retry).
- **Space deletion governance**: Networked spaces open a `space_deletion` vote round on every containing network instead of deleting immediately.
- Tests: `space-deletion.test.js` (integration), `theme.test.js`, `config-loader.test.js`, `config-permissions.test.js`, `oidc-silent-refresh.test.js`, `theme-postmessage.test.js` (standalone).
- **SSO auto-redirect**: Login page auto-redirects to OIDC provider when SSO is enabled. `?local` query param bypasses for local login. OIDC callback links to `/login?local` on error.
- **Use case examples**: `docs/usecase-examples.md` — 26 practical deployment scenarios covering all network types, proxy spaces, multi-space/multi-network topologies, and MCP tool workflows.
- **Features TODO**: Public knowledge spaces — open pub/sub networks for frictionless distribution.

### Fixed

- **Theme postMessage origin check** (MEDIUM): `handleThemeMessage()` now validates `event.origin === self` — rejects cross-origin theming messages that could restyle the UI for phishing.
- **`$regex` injection in `removeSpace()`** (LOW): Replaced `$regex` interpolation with `listCollections()` + `.startsWith()` filter.
- **`cssUrl` injection** (LOW): `injectExternalStylesheet()` now validates URLs via `URL` constructor; rejects non-HTTPS (except localhost for dev).
- **`removeSpace` partial-failure orphaned data**: Cleanup errors now throw — space remains in config so the operator can investigate and retry, instead of silently losing the config entry.
- **Theme endpoint disk thrash**: `GET /api/theme` now uses in-memory `getConfig()` with `loadConfig()` fallback instead of reading config.json from disk on every request.
- **`X-Frame-Options: DENY` vs iframe theming**: Replaced with `Content-Security-Policy: frame-ancestors 'self'` to allow same-origin iframing (OIDC silent refresh, theming) while blocking cross-origin clickjacking.
- **Startup crash on missing arrays**: `loadConfig()` and `reloadConfig()` now normalise absent/null `spaces`, `tokens`, `networks` arrays via `??= []`.
- **Config file permission auto-fix**: `checkPermissions()` auto-fixes loose permissions when the process owns the file (K8s hostPath mounts), with warning log instead of hard exit.
- **Path traversal false-positive**: Leading slashes in browser-sourced filenames (`/Screenshot 2024.png`) are now stripped before `path.resolve()`, preventing spurious traversal rejections.
- **OIDC silent refresh**: Fixed PKCE verifier isolation (closure, not sessionStorage which is iframe-isolated); added 30 s iframe timeout; state validation on postMessage.
- **Theme init timeout**: `APP_INITIALIZER` no longer blocks app bootstrap indefinitely — resolves after 3 s if `/api/theme` is unresponsive.

## [0.5.0] — 2026-03-27

### Added

- **OpenID Connect (OIDC) authentication**: Authorization Code + PKCE flow via `jose` v6. Supports Keycloak, Entra ID, Okta, Auth0 and any OIDC-compliant IdP. Claim-based mapping for admin, readOnly, and spaces. Discovery document caching with 5-min TTL.
- **OIDC callback route guard**: `/oidc-callback` requires `code`+`state` or `error` query params; otherwise redirects to `/login`.
- **OIDC config validation**: `validateOidcBlock()` validates issuerUrl and clientId at config load/reload time.
- **Notify identity verification**: `POST /api/notify` now verifies that the caller's token is authorised for the claimed `instanceId` via `peerInstanceId` on TokenRecord.

### Fixed

- **Bearer token leak to cross-origin** (CRITICAL): Auth interceptor no longer sends bearer tokens to cross-origin requests (e.g. IdP endpoints). Scoped to same-origin only.
- **SSRF-hardened OIDC discovery**: Discovery document fetch validates URLs against IMDS, loopback, non-HTTP schemes, and embedded credentials. Issuer-match and `jwks_uri` validation per OIDC Discovery §4.3.
- **Notify instanceId spoofing**: Non-admin tokens without a matching `peerInstanceId` can no longer forge events as arbitrary remote peers.
- Removed stale `clientSecret` field from OIDC types and documentation.
- Fixed pre-existing missing `});` in `/ready` handler (app.ts).
- Cleaned redundant hash-stripping in auth middleware.

### Changed

- TokenRecord now carries optional `peerInstanceId` field, set automatically during invite handshake.

## [0.4.0] — 2026-03-26

### Changed

- License changed from AGPL-3.0 to PolyForm Small Business License 1.0.0.

## [0.3.0] — 2026-03-26

### Added

- **Readiness probe**: `GET /ready` endpoint with MongoDB and vectorSearch dependency checks.
- **Prometheus metrics**: `GET /metrics` endpoint exposing HTTP request counters, response time histograms, and active connection gauges.
- **Flexible MongoDB backend**: Support any `$vectorSearch`-capable MongoDB (Atlas, Atlas Local, MongoDB 8.2+).
- **MCP tools**: `update_memory`, `delete_memory`, `get_stats`.

## [0.2.0] — 2026-03-26

### Added

- **Entity properties**: Entities now support an optional `properties` field — a flat key-value map where each value can be a string, number, or boolean. Upserts shallow-merge properties (new keys added, existing keys overwritten). Supported across the REST API, MCP `upsert_entity` tool, sync protocol, and client UI.
- Six new integration tests covering entity property CRUD, merge behaviour, validation, and listing.

## [0.1.1] — 2026-03-26

Audit hardening and polish.

### Fixed

- Pinned `@modelcontextprotocol/sdk` to `^1.28.0` (was `"latest"`).
- Changed `catch (err: any)` to `catch (err: unknown)` in conflicts API.
- Added error handlers to 16 client `subscribe()` calls that were missing them.
- Tightened all loose dependency version ranges (`bcrypt`, `express`, `mongodb`, `multer`, `uuid`, `zod`, etc.).

### Added

- Docker healthcheck on `/health` endpoint in `docker-compose.yml`.
- Missing fields in `config.example.json`: `embedding.baseUrl`, `storage.files`, `storage.brain`, `ejectedFromNetworks`.
- Security headers and CORS behaviour documented in integration guide.
- Four undocumented API endpoints documented: Remove Member, Reparent Self, Adopt Member, Revert Parent.
- TLS termination examples (Nginx, Caddy, Traefik), resource requirements, and upgrade/backup guide.
- `aria-label` attributes on all icon-only buttons and unlabelled form controls across the client.
- `minlength="8"` on the confirm-password field in the setup wizard.
- `CHANGELOG.md`.

## [0.1.0] — 2025-06-24

Initial public release.

### Added

#### Core

- Space-isolated knowledge management: memories, entities, edges, tombstones.
- Semantic search via OpenAI-compatible embedding endpoint (`/v1/embeddings`).
- Proxy spaces — virtual read-aggregation across multiple real spaces.
- File manager with chunked upload, directory tree, inline preview (text, image, PDF).
- Per-space MCP endpoint (`/mcp/{spaceId}`) with full tool set for LLM clients.
- Storage quota enforcement (soft/hard limits for files and brain data).

#### Authentication & Security

- PAT token auth (`ythril_*`) with bcrypt-hashed storage, space-scoped allowlists.
- Optional MFA (TOTP) for admin mutations.
- RSA-4096-OAEP zero-knowledge invite handshake.
- Zod validation on all inputs; MongoDB operator whitelist (blocks `$where`, `$function`).
- Path sandboxing against traversal, null bytes, and encoded characters.
- SSRF guard blocking RFC-1918, loopback, IMDS, IPv6 ULA, link-local, and embedded credentials.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-Request-Id`.
- Config and secrets files enforced at mode `0600`.
- Global rate-limiting middleware (configurable per-endpoint).

#### Brain Networks & Sync

- Network types: Closed, Democratic, Club, Braintree (hierarchical push-only).
- Watermark-based incremental sync: pull → push → file manifest (SHA-256) → gossip.
- Voting system for membership changes (unanimous, majority, supermajority, ancestor-path).
- Conflict detection and resolution (keep-local, keep-incoming, keep-both, save-to-space).
- Configurable sync schedules (cron) with manual trigger.
- Sync history tracking with per-run stats and error reporting.

#### Client (Angular 21)

- Web UI: brain explorer, file manager, space manager, token manager, network manager.
- Conflict resolution page with bulk actions.
- MFA enrollment flow with QR code display.
- Accessible forms with aria-labels and HTML5 validation.

#### Infrastructure

- Single `docker-compose.yml` deployment with MongoDB Atlas Local.
- Docker healthcheck on `/health` endpoint.
- Hot-reloadable configuration with permissions enforcement.
- First-run setup wizard (admin password, instance label, embedding config).

#### Documentation

- User guide, integration guide (full REST & MCP API reference), contribution guide.
- Network types specification, sync protocol specification, dependency inventory.
