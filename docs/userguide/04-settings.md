# Settings — Spaces, Tokens, Networks and Media

> Part of the [Ythril User Guide](../userguide.md).

## Settings — Spaces, Tokens, Networks and Media

## Settings — Spaces

> **Editing one space you are already in?** The Brain has a **cog at the far right of its tab strip** that
> opens this same editor for the selected space, without leaving the page. Use the list below to create,
> reorder or compare spaces.

Open **Settings → Spaces** to manage all spaces on this instance. A summary above the list shows the total number of spaces, the storage in use across all of them, and how many are still building (or have failed to build) their search index. If a space's index is still preparing, its row is flagged so you know recall may be incomplete for it.

### Creating a space

Click **Create New Space**. Fill in:

- **Display Name** — the human-readable label shown everywhere in the UI.
- **ID** — optional. Short lowercase identifier (auto-generated from the name if left blank).
- **Max GiB** — optional storage quota. Leave blank for unlimited.
- **Purpose** — optional description of what this space is for. Visible to AI assistants.
- **Proxy for** — optionally mark this as a proxy space standing in for one or more other spaces (tick individual spaces or "all").
- **Validation mode** — the schema-validation posture for the new space: `off`, `warn`, or `strict`.

> **New spaces start strict.** A freshly created space now defaults to **`strict` validation** *and*
> **strict linkage** — it enforces its schema and referential integrity from day one. You can relax
> either from the space's **Schema tab** at any time. (Until you define per-type schemas there's nothing
> to violate, so a brand-new empty space still accepts anything.) Spaces created by joining a federation
> network are the exception — they stay lenient so incoming federated records are never rejected.

### Space settings

Click the gear icon on any space row to open its settings panel. Changes save and close automatically. An accidental click **outside** the panel won't close it (so you can't lose half-typed edits that way) — close it deliberately with **✕**, **Cancel**, or **Escape**; if you have unsaved changes you'll be asked to confirm.

> **A `Governed` badge in the panel header means Save opens a vote.** The space belongs to one or more
> networks (hover the badge to see which), so a change to its purpose, usage notes or schema is **submitted
> for a vote** in each network rather than applied immediately — you'll see *"saved as a proposal"* and the
> change takes effect when the vote passes. Local, operational settings (storage quota, auto-delete window,
> extraction and media-analysis overrides, duplicate rules) are never voted and apply at once. No badge
> means the space is in no network and everything applies immediately.

**Settings tab:** Update the display name, purpose, usage notes for AI assistants, storage quota, auto-delete window, document-extraction mode, and per-space **media-analysis** levels — grouped into **Identity**, **Purpose**, **Limits**, **Document extraction**, and **Media analysis** cards. The Media analysis card lets you override, per space, how **images**, **audio**, **video**, and **text** are analysed on upload (each defaulting to **Inherit instance default**). As with extraction, each picker only offers the levels **the instance ceiling allows** (set per class under **Settings → Media Processing**) — a space can never analyse more than the instance permits, so higher levels are hidden and a note names the ceiling. When a storage quota, auto-delete window, or extraction override is left blank, the field's own placeholder (**Unlimited** / **No expiry**) or the **Use instance default** / **Inherit** option shows what the default will be.

- **Delete records after (days)** — an optional space-wide expiry, **on the Danger tab** rather than here: it deletes data, so it sits with the other destructive settings. It is **one window per kind of record** — entities, memories, edges, chrono, files — because a space rarely holds one kind of thing. Leave a field blank or `0` to keep that kind forever. Deletion propagates over sync, so an expired record won't come back from a connected peer.

  It is the **least** specific of three tiers — most specific first, a single record's own TTL (set by the API on the write), then that record *type's* window on the **Schema** tab, then this space-wide number. A type with its own window ignores this one.
- **Extraction mode** — how thoroughly documents (PDF / DOCX / EPUB) uploaded to *this* space are read. Leave it on **Instance default** to follow the instance-wide setting (**Settings → Media Processing**), or choose one for this space: **Off**, **OCR** (fastest, text + layout), **VLM** (transcribe pages with a vision model, always falling back to OCR), **Repair** (adds a pass that reconciles the transcription against the OCR text), or **Auto** (as much as the instance can do). Useful when one space holds scanned archives that need the heavier path while the rest of the instance stays light. The dropdown only offers the modes **the instance ceiling allows** (set under **Settings → Media Processing**) — a space can never extract more than the instance permits, so higher modes are hidden with a note naming the ceiling.

  The instance setting is a **ceiling, not a default**: a space can ask for less than the instance allows, never more. If the instance is on **OCR**, a space set to **Repair** runs OCR — it keeps its choice and returns to it if the ceiling is raised again. Raising the instance level lifts only spaces on **Auto**.

  **Off means documents are stored but never read.** No text is extracted, so nothing inside them can be found by search — those uploads are marked *skipped* rather than sitting in the processing queue. This override is local to your instance — it is never synced to connected peers.

**Schema tab:** Define what data this space accepts. A **Schema validation** bar at the very top holds the space-wide **Validation mode** and **Strict linkage** controls — these govern *every* type in the space, not the collection you happen to be viewing. Below it, the entity / edge / memory / chrono collections each list their types on the left; click one to edit its rules in a stable panel on the right (you don't lose your place editing a type or property, and several property editors can be open at once).

- **Validation mode** — `off` means anything goes; `warn` lets writes through but flags violations; `strict` blocks invalid writes entirely.
  > **Editing is checked too, as of 2.2.** Previously only *creating* a record was validated; an edit
  > could save a value the same space would have rejected on create. Now the record **as it will be** —
  > yours plus the existing fields — is checked before it saves.
  >
  > This can refuse an edit for a field you did not touch, when the record was already invalid: written
  > before you tightened the schema, or imported, or synced from another brain. The message says which is
  > which — *"the change violates…"* versus *"this record was already non-compliant before your
  > change…"* — so you are not sent looking at the wrong field. To get unstuck, fix the named field in
  > the same save; validation is of the result, so the record repairs itself.
- **Strict linkage** — when on, references between items must be valid IDs and deletion of referenced items is blocked.
- **Type schemas** — define per-type rules under each knowledge type (entity, memory, edge, chrono). For each named type you can set:
  - **Naming pattern** — a regex the name must match.
  - **Retention** — how long records of *this type* are kept, overriding the space-wide window on the Danger tab. Leave **Delete records after** empty to inherit it; the hint names the number you would inherit. A type with a window carries a yellow **ttl** badge in the list, so what expires is visible without opening each type.
    - **Drop detail after (days)** appears for **chrono types only**. It removes the description, matched text and embedding at that point — the record stops competing in search — while its properties, title, type and dates stay queryable. Useful for telemetry that crowds out real answers but whose fields are still worth having. It must be **shorter** than the delete window, or it could never happen; the editor says so if it isn't.
    - A type **linked to the Schema Library** has no retention of its own: a library entry cannot carry a window (it would apply to every space using it). **Unlink** first, or set the window on the space-wide default instead. Saving a type *to* the library also leaves its window behind, and says so when it does.
  - **Property schemas** — rules for each property field (type, allowed values, min/max, pattern, required, default).
- **From Lib** — import a schema from the Schema Library. The type row shows a badge and stays in sync with the library automatically. While linked, the type's properties are shown **read-only** so you can see what it enforces; click **Unlink** to copy the library schema inline (breaking the link) and then customise it for this space.
- **From File** — import a schema from a previously exported JSON file.
- **Save to Lib** — save the current type schema to the Schema Library for reuse in other spaces.

The toolbar at the top of the tab has whole-space actions: **Export JSON** / **Import JSON** download or load the entire space's type schemas as one file, and **Export to library** copies the *whole* space schema into the Schema Library in one step — one reusable entry per type, grouped under a name you choose (defaulting to the space's), so you can later apply the whole set to another space. Types already linked to the library (`From Lib`) are skipped. Save any pending edits first — it exports the last saved version.

**Danger tab:** Set the space-wide retention window, rebuild search indexes, rename the space ID, wipe all data, or delete the space entirely.

**Retention** is the space-wide default: **Delete records after (days)**, as **five fields** — Entities, Memories, Edges, Chrono, Files — each applying to records of that kind with no TTL of their own and no window on their type. Five, not one, because a `tickets` space keeps ticket entities for a year and their status-change chrono entries for a month; **Files** gets its own because uploads share this setting and have no type for the Schema tab to reach.

A space that set a single number before this split keeps working exactly as it did: it shows on all five fields, which is what it always meant.

Below the fields, any type that *does* have its own window is listed read-only — that list is where you see what actually overrides these numbers, and it is edited on the type, in the **Schema** tab.

**Rebuild search indexes** is the repair for *search returns nothing and nothing says why* — a space whose vector indexes are missing or were destroyed (restoring a backup used to do this). It re-creates them from your existing content; search stays empty until it finishes, and nothing is deleted. Reindexing is not a substitute: it re-embeds content against the current model and cannot recreate a missing index. Requires an admin token (and TOTP when MFA is on). The same rebuild is also available per space directly from the **vector-index table** under Settings → Media Processing → Tools — the one place the drift (recorded *ready* vs. a database with no index) is actually visible — behind the same confirmation.

The other three are guarded: because renaming changes the space ID (which breaks existing token and MCP references to it), **Rename** — like Wipe and Delete — now asks you to type the current space ID to confirm.

Each space row carries only a gear/configure (⚙) button — there is no pencil icon. Rebuilding indexes, renaming, wiping, and deleting all live inside the space's settings panel, on the **Danger** tab.

### Renaming a space

Open the space's settings panel and go to the **Danger** tab to rename its ID. All data, files, token scopes, and network sync mappings are updated automatically.

### Deleting a space

In the space's settings panel, open the **Danger** tab and click **Delete space**. You will be asked to type the space ID to confirm.

### Wiping a space

In the **Danger** tab, click **Wipe all data**. A confirmation dialog shows how many items are in each collection and asks you to type the space ID before you proceed. The space itself (its settings, label, schema) is kept — only the data inside it is removed.

---

## Settings — Tokens

All access to Ythril — from the web UI, REST API, or AI assistants — requires an access token.

**Token types:**

| Type | Access |
|------|--------|
| Admin | Everything, including token and space management |
| Standard | Brain, files, and MCP tools; cannot manage tokens, spaces, or networks |
| Read-only | Search and read only; all writes blocked |
| Library Access | Public schema library endpoints only (`/api/schema-library/public*`); no space data, no brain, no files |

Tokens can also be **space-scoped** — restricted to a specific list of spaces. Spaces outside that list are invisible to the token. Library Access tokens are always space-less.

### Creating a token

Click **Create Token**. The dialog asks for three things: a **label**, an optional **expiry date**, and the
**per-space rights matrix**. Click **Create** — the token value is shown **once**. Copy it immediately.

The matrix is the whole permission model. Earlier versions also offered a spaces checkbox list and a
three-way Read-only / Standard / Admin choice; those described the same access in an older vocabulary, and
the server refuses a request that uses both at once. The matrix says everything they said and things they
could not — such as **admin on Files in one space and nothing anywhere else**.

The tokens list shows each token’s scope at any time, with the permission pill **colour-coded by privilege**
so the riskiest tokens stand out: **admin is red**, **standard is green**, **read-only is yellow** (Library
Access tokens keep their own blue).

This dialog has no "Library Access" toggle. Library Access tokens (for sharing your schema library with other instances) are created separately, from the **Schema Library** page's own **Create token** dialog — see [Schema Library](03-files-and-schemas.md#schema-library).

**Editing a token.** Each row has a pencil button. It opens the token editor, where the **label** and the **rights matrix** are both editable and are saved together in one request — so a rename and a scope change are one audited edit, not two that can half-fail. The secret is untouched; use **Rotate** for that.

#### Some cells hold each other up

A cell will not always go as low as you click, and the greyed-out segments say why when you hover them. There
are two reasons a cell is held:

- **The all-spaces floor.** The top row is a *minimum*, not a bulk setting, so no space below it can sit lower.
- **Another area needs it.** Setting **Knowledge** to **write** holds **Schema** at **read** in the same
  space, because writing a record against a schema means reading that schema first. A token with write on
  Knowledge and none on Schema is not a narrower token — it is one that cannot do the thing it was granted.

The second is applied when access is checked, not written into the token. The matrix keeps saying what you
set, so lowering Knowledge back to **read** returns Schema to whatever you had chosen rather than leaving
behind a permission nobody picked. This is why the Schema cell can show **read** while the token you exported
shows `none` — both are correct, and the grid is showing you what the token can actually do.

> **A matrix stored in an obsolete shape is repaired when the instance starts.** If a token's stored rights
> name an area the server no longer knows, or leave one of the four out, the editor could open it and never
> save it — the server refused the very shape it had handed over. Startup now normalizes such a matrix and
> writes it down: an unknown area is dropped, a missing one comes back at **none**, and every rung the server
> can still read is kept exactly as it was. The repair only ever narrows, so re-check the token's matrix after
> upgrading if you see one change; it never restores access from the pre-3.0 `admin` / `read-only` / spaces
> fields.

**The second factor is not a token setting.** MFA is instance-wide and lives in **Settings → Preferences**;
there is nothing about it in the token dialogs, and there is no per-token exemption to grant here.

### Rotating a token

Click the ↺ icon on any token row. A new secret is generated; the old one stops working immediately. The new value is shown once.

### Revoking a token

Click the ✕ icon and confirm. The token is deleted and can never be used again.

Your current session token is marked **(current session)** in the list.

---

## Multi-factor authentication (MFA)

MFA adds a one-time code requirement for admin actions (creating tokens, managing spaces). Normal data operations are not affected. There is no separate "MFA" page — the MFA panel lives inside **Settings → Preferences**, under the **Security** heading (the language switcher sits above it).

**The switch is instance-wide, and that is the whole model.** It applies to admin actions, not to normal data
operations, so a script or scheduler doing ordinary reads and writes is unaffected by turning it on. There is
no per-token second-factor setting in the interface.

### Enrolling

1. Open **Settings → Preferences** and click **Enable MFA**.
2. Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password, Bitwarden, etc.).
3. Enter the 6-digit code shown in the app and click **Confirm**.

The TOTP secret is generated **on the server** and returned to your browser so it can be shown as the QR code / setup key. Your authenticator and the server then share that secret to verify future codes.

### Day-to-day use

When you perform an admin action, the UI prompts for a 6-digit code. After entering it, the code is cached for 15 minutes so you are not asked again on every click.

### Disabling

Click **Disable MFA**. This **requires a current 6-digit code** — you cannot turn MFA off without your authenticator, which is deliberate: a stolen admin token must not be able to silently remove the second factor.

**Lost your authenticator?** Because disabling needs a code, recovery is an operator action on the host: remove the `totpSecret` entry from `secrets.json` in the instance's config directory and restart. MFA is then disabled and you can re-enrol.

---

## Settings — Networks

Networks sync selected spaces between multiple Ythril instances over the internet.

### Network types

| Type | Who approves joins and leaves |
|------|-------------------------------|
| **Closed** | All members must agree unanimously |
| **Democratic** | Majority vote, any member can veto |
| **Club** | The person who invited decides alone |
| **Braintree** | All parent nodes up to the root must agree |
| **Pub/Sub** | No approval — any compatible brain can subscribe |

### Enabling networks

The first time you open **Settings → Networks**, networking is off. Click **Enable Networks** to run a short 3-step wizard (Step *N* of 3) that walks you through exposing your brain's connector and confirming the risk model before the Create / Join controls appear.

### Creating a network

Click **Create Network**. Enter a label, choose a type, enter the space IDs to include, and optionally set a sync schedule (cron expression).

### Inviting another brain

1. Expand the network card and click **Generate invite**.
2. Copy the invite bundle (a JSON blob).
3. Send it to the other admin out-of-band (email, chat, etc.).

The invite expires after 1 hour.

### Joining a network

1. Click **Join Network**.
2. Paste the invite bundle.
3. Enter your brain's publicly reachable URL (e.g. `https://brain.example.com`).
4. If any space IDs overlap with existing local spaces, a dialog lets you choose to merge into the existing space or map the remote space to a new local ID.
5. Click **Join network**.

### Sync schedule

Enter a cron expression on the network card (e.g. `*/5 * * * *` for every 5 minutes). Click **Sync now** to trigger an immediate sync without waiting.

### Sync history

Expand a network card and click **Sync History** to see a log of every sync cycle — timestamp, status, items pulled and pushed, and any errors.

Each member row in the expanded card also shows its **last successful sync** (or *Never synced*) and, when a peer's recent sync attempts have been failing, a red **Failing (N)** badge counting the consecutive failures since the last success — so you can spot a stuck peer without opening the full history.

### Voting

When a vote is open (e.g. a member wants to leave), expand the network card and scroll to **Open votes**. Each open vote shows its **Deadline** and a running tally (`N yes · M veto`). Click **✓ Yes** to approve, or **✗ Veto** to block the round — a veto asks you to confirm ("A veto blocks this pending round for the whole network. This cannot be undone.") before it is cast.

**Signed votes:** a network can set `requireSignedVotes` so every vote cast must carry a valid Ed25519 signature from the voting member (verified against its pinned signing key). Enable it once all members have published a signing key; if a member rotates its signing key, the new key is accepted with a rotation proof that references the previous one.

### Leaving a network

Click **Leave network** at the bottom of the network card. Your local data in the network's spaces is kept.

---

## Settings — Media Processing

**Settings → Media Processing** (the page is titled **Models & Media**; admin only, MFA-protected) controls how Ythril turns image, audio, video, and document uploads into searchable content.

By default, Ythril ships with a bundled vision service (Ollama running `moondream`) and a bundled speech-to-text service (faster-whisper-server). When you upload a picture, Ythril writes a short caption of what's in it; when you upload audio or video, it transcribes the words. The result is added to the same search index as your memories, so you can find an attachment by what's *inside* it, not just its filename.

### When to change this

- **Turn a class off.** There is no single on/off switch — each media class (images, audio, video) has its own **level**. Set a class to **Off** if you don't upload that kind of media or your machine is tight on memory; its provider card then reads **off** and new uploads of that class are stored as-is (existing files keep their captions). Setting all three to Off turns media embedding off entirely.
- **Use an external provider.** Switch the **Provider** on the **Vision** or **Speech** card to *External* if you'd rather call OpenAI, Azure, or any other OpenAI-compatible service. Fill in the **Endpoint**, **Model**, and **API key (external only)** for that provider. API keys are stored in the encrypted secrets file, never alongside the rest of the configuration.
- **Use a different local model.** Keep the provider on *Local* but change the **Model** field — for example, switch the vision model from `moondream` to `llava` if you've pulled it into Ollama.

### Locked fields

Fields shown with an **env** badge cannot be changed from the UI — they are pinned by an environment variable set by your infrastructure administrator. This is normal in managed deployments where credentials are injected by Kubernetes secrets or similar.

### When a provider won't connect

*New in 2.1.*

**Test connection** reports what the server actually gets back, and the failure text names the reason
rather than just saying it failed. Two cases account for almost all of them:

- **"Blocked SSRF target … resolves to blocked address 10.x / 192.168.x / 172.16-31.x"** — the endpoint
  is on a private network address. Ythril refuses those by default, because an admin-settable URL that
  the server will call is the classic way to make a server fetch things it should not. If the endpoint is
  a model server you run yourself, that refusal is wrong for your case and an administrator can permit it
  — for that one endpoint alone, or instance-wide — see
  [Diagnosing a Misconfiguration](../integration-guide/02-hosting.md#diagnosing-a-misconfiguration). The message names
  the exact setting for the endpoint you were testing. It cannot be enabled from this page, on purpose.
- **"Blocked SSRF target … 169.254.x" or a loopback address** — these stay blocked whatever the setting.
  Point the endpoint at a real service address.

And one result that looks like a problem and is not:

- **"Reachable · no model list"** — the endpoint answered, and it has no page listing its models. That is
  the normal shape of a single-purpose inference server: a Whisper service serves only its transcription
  route, so asking it for a model list can only ever come back "not found". Test connection says what it
  found and leaves the card green, because a missing *list* is not a missing *service*. Use **Verify** to
  confirm the model itself answers — it sends a real request down the real path. If Verify fails too,
  hover the result: the detail names the exact URL that was tried, which is usually a base URL with a
  wrong path.

Every refusal is also written to the server log with the same detail, so an administrator can find it
without you having to reproduce the click.

### Verify — does the model actually answer?

*New in 2.2.*

**Test connection** asks "is something there". It cannot answer *does my model work* — an endpoint can be
reachable, list your model, and still fail on every real request. **Verify** sends one real request and
tells you what came back. There is a button on the **Vision**, **Speech-to-text**, **Embedding** and
**Assist** cards.

**It never sends your data.** The payload is always generated: a 1×1 transparent image, a few
milliseconds of synthesised silence, or the word `ping`. It goes through the same code path the worker
uses, so a transport problem shows up here instead of on someone's first upload.

Four outcomes:

| Result | Meaning |
|---|---|
| **OK** | The model answered. A short sample of what it returned is shown. |
| **Still loading** | It did not answer within 3 minutes. Not a failure — a backend that swaps models onto a shared GPU can legitimately take 30 seconds or more on the first call. Try again. |
| **Failed** | It answered, but wrongly — or the call errored. The detail names what happened. |
| **Not configured** | No model is set for that card. |

Silence transcribing to no text is a **pass** for speech-to-text: the payload is silent, so reaching a
proper response *is* the result.

Verify costs a real request, so on a metered endpoint it costs money. It is recorded in the audit log for
that reason; Test connection, which only lists models, is not.

### Privacy note

When both providers are set to *Local*, no file content ever leaves your instance. Switching to *External* sends image frames or audio segments to the configured endpoint — review your data residency policy before doing so.

### External assist model (documents)

The **External assist model** card lets you point a bigger, hosted model at the **document repair pass** — the one used by the `repair` extraction level (and by `auto` when a repair model is configured). There is no separate "used for" tick: repair is the only thing it does, so the **extraction level is the switch**. Fill in an **Endpoint** + **Model**, then raise **Document extraction** to **Repair** (or **Auto**) to route repairs through it. At that point you are asked to **acknowledge the egress** — document content (OCR text, and page images) is sent to that host. The acknowledgement is recorded against the host and re-checked at run time, so an endpoint you have not acknowledged is never contacted: repairs fall back to the local model instead.

This is the one document setting that sends content off your instance: the model receives OCR-extracted text and draft transcriptions (and, for future image tasks, rendered page images). Because of that, configuring a host pops an **acknowledgment dialog** naming exactly what data goes where — you must confirm before it is used, and Ythril records that consent against the host and re-checks it at run time, so content is never sent somewhere you did not acknowledge. Endpoints are checked to be public addresses, and the API key is stored in the encrypted secrets file. Leave it unconfigured — or keep **Document extraction** below **Repair** — to keep document processing fully local.

---

### Face Recognition

Face recognition lets Ythril automatically detect faces in uploaded images and link them to person entities in your space. Once you label a few photos, new uploads containing the same person are tagged automatically.

**This feature is opt-in and disabled by default.** It requires local model files to be placed on disk (not bundled). See the [integration guide](../integration-guide.md) for download links and setup.

#### How to use it

1. **Place the model files** — Download `blazeface-back.json`, `blazeface-back.bin`, `faceres.json`, and `faceres.bin` from `https://vladmandic.github.io/human/models/` and place them in the `human-models/` folder inside your data directory.
2. **Raise the Images pipeline to `recognition`** — face recognition has no switch of its own: it is the top rung of the **Images** pipeline. Set the instance ceiling under **Settings → Media Processing → Images** to **Caption + face recognition** (or `auto`), then, if you want it only in certain spaces, leave the others on **Caption**. Images deliberately default to **Caption** — face embeddings are biometric data, so an instance never acquires them just by being installed. `FACE_RECOGNITION_ENABLED=false` in the environment remains available as an infra-level hard-off that overrides every ladder.
3. **Upload images** — Any image that goes through the media pipeline is automatically processed. Faces are detected, embedded, and stored. If no gallery exists yet, faces are stored unlabeled.
4. **Label a face** — Open the file in the Files view and link it to a person entity (via the entity tag in the file metadata panel). The face embedding is immediately added to the gallery.
5. **Auto-labeling kicks in** — From this point on, new images containing that person's face are automatically linked to their entity, as long as the match score exceeds the confidence threshold.

#### Deleting a person

Deleting a person entity **removes their label from every face linked to it**, and stops those faces from auto-labeling anyone in future. This happens on every path a person can disappear by: deleting them from the Brain, wiping all entities in the space, or the entity expiring through its TTL.

The face records themselves are kept, with their label cleared. That is deliberate: the face belongs to the *photo*, which you did not delete — after removing the person, Ythril simply no longer claims to know whose face it is. If you want the face data itself gone, delete the image; that removes its face records along with every other derived artifact.

> Under `strictLinkage`, face labels do **not** block deleting a person. Other references (edges, memories, chrono entries) still do. Faces are written automatically by the recogniser rather than created by you, and they are cleared safely by the deletion itself — so blocking on them would only make the person impossible to remove.

#### Settings

These are set in `config.json` under `mediaEmbedding.faceRecognition`, or pinned by your infrastructure through the matching environment variable (`FACE_RECOGNITION_ENABLED`, `_CONFIDENCE_THRESHOLD`, `_MIN_FACE_SIZE_FRACTION`, `_MODEL_PATH`, `_PERSON_ENTITY_TYPES`, `_REPROCESS_SYNCED_IMAGES`). An environment value wins over `config.json`, so `FACE_RECOGNITION_ENABLED=false` guarantees no faces are processed on that instance — including after restoring a backup taken where it was on. Neither is editable from the UI:

| Setting | Default | What it does |
|---|---|---|
| `enabled` | `false` | Master switch — must be set to `true` to activate the feature |
| `confidenceThreshold` | `0.6` | How similar a face must be to a gallery entry to be auto-labeled (0–1). Start conservative; increase as your gallery grows. |
| `minFaceSizeFraction` | `0.05` | Minimum face size (as a fraction of the image's shorter side). Smaller faces in crowd shots are ignored. |
| `personEntityTypes` | `["person"]` | Entity types considered as people. Only entities of these types can enter the face gallery. In the admin UI (**Settings → Media Processing → Face recognition**) these are **picked from your Schema Library's entity types**, shown as removable chips; any value already stored stays selectable even if it's no longer in the library. |
| `reprocessSyncedImages` | `true` | When true, images received from other instances via sync are queued for face recognition automatically. |

---

### Document Processing (OCR & Image Extraction)

When you upload a PDF, DOCX, or EPUB, Ythril converts it to text using the `unstructured-api` sidecar, which includes Tesseract OCR. The conversion strategy controls the trade-off between speed and quality.

These settings live in `config.json` under `mediaEmbedding.documentProcessing`:

| Setting | Default | What it does |
|---|---|---|
| `strategy` | `"hi_res"` | `"hi_res"`: full OCR + layout analysis — accurate on scanned documents, extracts embedded images and tables. `"auto"`: sidecar decides. `"fast"`: text layer only, no OCR, fastest. `"ocr_only"`: forces OCR even on born-digital PDFs. |
| `extractImages` | `true` | When using `hi_res`, images embedded in the document are extracted, saved, and queued for the media pipeline (captioning + face recognition). |

**Default behaviour (no configuration needed):** every uploaded PDF is OCR'd with full layout detection, embedded images are extracted and independently captioned, and tables are converted to structured HTML. For text-heavy documents without scanned content or images, `"fast"` is significantly quicker.

---
