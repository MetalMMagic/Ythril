# Ythril User Guide

> A practical guide to the Ythril web interface for everyday users.

For deployment and API reference see [integration-guide.md](integration-guide.md).
For setting up a workstation quickly see [workstation-mode-guide.md](workstation-mode-guide.md).

---

## Table of Contents

1. [Logging in](#logging-in)
2. [Navigation](#navigation)
3. [Spaces — what they are](#spaces--what-they-are)
4. [Brain](#brain) — tabs: Overview (default landing), [Query](#query), [Graph](#graph), [Files](#files), Entities, Edges, Memories, Chrono
   - [Memories](#memories)
   - [Entities](#entities)
   - [Edges](#edges)
   - [Chrono](#chrono)
   - [Query](#query)
5. [Graph](#graph)
6. [Files](#files)
7. [Conflict resolution](#conflict-resolution)
8. [Schema Library](#schema-library)
9. [Settings — Spaces](#settings--spaces)
10. [Settings — Tokens](#settings--tokens)
11. [Multi-factor authentication (MFA)](#multi-factor-authentication-mfa)
12. [Settings — Networks](#settings--networks)
13. [Settings — Media Processing](#settings--media-processing)
    - [Face Recognition](#face-recognition)
    - [Document Processing (OCR & Image Extraction)](#document-processing-ocr--image-extraction)
14. [Settings — Storage](#settings--storage)
15. [Settings — Data](#settings--data)
16. [Settings — Audit Log](#settings--audit-log)
17. [Brain — Review tab](#brain--review-tab)
18. [Settings — Webhooks](#settings--webhooks)
19. [Settings — About](#settings--about)
20. [Connecting an AI assistant (MCP)](#connecting-an-ai-assistant-mcp)

---

## Logging in

Open your instance URL in a browser (e.g. `http://localhost:3200`). Enter your access token — the one you received during setup — and click **Sign in**.

If your organisation uses single sign-on (SSO), you will be redirected to your identity provider automatically. After authenticating there you land back in Ythril already logged in.

To sign in with a token when SSO is active, go to `/login?local`.

**First run:** on a brand-new instance the login page shows a **Run first-time setup** link (`/setup`) that walks you through creating the admin account and your first access token.

Clicking **Sign out** in the topbar clears the session. (In embedded mode — see below — the topbar and its Sign out button are hidden.)

---

## Navigation

The left sidebar is the main navigation. It is divided into two sections:

### Workspace

- **Brain** — store, browse, and search everything you know. Graph and Files are *tabs inside Brain*, not separate pages — there are no `/graph` or `/files` routes (those URLs just redirect to Brain).
- **Schema Library** — reusable data definitions shared across spaces
- **Conflicts** — appears only when file conflicts are waiting to be resolved, with a red count badge showing how many.

### Admin (admin tokens only)

- **Settings** → Tokens, Spaces, Storage, Networks, Preferences, Audit Log, Data, Models, Duplicates,
  Help, About

Most pages carry a small **Help** link in their top-right corner. It opens the guide at the *section*
that documents that page — not the top of it. Pages with no section yet show no link, so an empty-handed
control never pretends to be an answer.

**Settings → Help** is this documentation, readable *inside* the instance. Every guide that ships with
Ythril — this user guide, the integration guide, the use-case examples, workstation mode, network types,
the sync protocol, dependencies and licences, contributing — is bundled with the application and rendered
in place. It needs no internet connection, which is the point: the installs that most need the
documentation are often the ones with no route to the outside. Each guide has its own link
(`/settings/help?doc=userguide`), so a page can point at the guide that explains it.

There is no global space selector in the sidebar. Space switching happens per page — the Brain page shows a row of space chips, and the Graph tab has its own space picker in the toolbar. Everything you see is scoped to the space you pick there.

**Embedded mode:** loading the app with `?embedded=1` on the URL hides the topbar (logo and **Sign out**) so Ythril can sit cleanly inside a host portal's own chrome. Navigation is unaffected — it lives in the sidebar. Trusted host origins that may iframe Ythril and push theme tokens are listed in `embed.allowedOrigins` in the config; empty or absent means same-origin only.

---

## Spaces — what they are

A **space** is a completely separate container of data — memories, entities, edges, chrono entries, and files. Think of it as a project folder or a context boundary.

The `general` space is created automatically on first run. Admins can create additional spaces in **Settings → Spaces**. Your access token determines which spaces you can see; if a space is not in your token's scope it is invisible to you.

---

## Brain

The Brain is where all your knowledge lives. It has eight tabs: **Overview**, **Query**, **Graph**, **Files**, **Entities**, **Edges**, **Memories**, and **Chrono**.

**Overview** is the **default landing tab** — opening a space lands here first. It is a per-space dashboard assembled from what the Brain already knows: a **Statistics** panel (record counts per collection, a total, and storage used against the space's quota), an **Indexing** panel (the vector index's state, plus a **Reindex** button — behind a confirmation — when embeddings have gone stale), an **Embedding queue** panel (pending / processing / failed background-embedding job counts, with the file + reason for any failures, and a **Retry all failed** button — behind a confirmation — that re-queues every failed job in the space at once), a **Networks** panel (the networks this space syncs with and its aggregate sync status, or a note when it belongs to none), a **Governance** panel (open votes in this space's networks — subject, deadline, and tally — shown only when there are any), an **Instance** panel (this instance's label, version, ID, uptime, and MongoDB version), and — **for admins only** — a **Token access** panel (which API tokens can reach this space and at what level: admin, read/write, or read-only, with network-peer and all-spaces tokens flagged and any expiry shown).

At the top of the page a row of **space chips** lets you switch space; each chip shows the space's total record count. The tab buttons themselves carry small count badges for the collection they open.

If the search index needs rebuilding (for example after the embedding model changes), a banner appears reading *"Embeddings are stale — the embedding model has changed and this space needs reindexing."* Click **Reindex now** to rebuild it.

> **Reindex and rebuild are different repairs.** *Reindex* re-embeds your content against the current model. It does **not** help when the search index itself is missing or broken — the symptom there is search quietly returning nothing at all, with no error. That one needs **Rebuild search indexes** on the space's **Danger** tab (see below).

### Memories

Memories are the core knowledge unit — plain-language statements you want to remember.

**Creating a memory:** Click **+ Add memory**. Fill in:

| Field | Notes |
|-------|-------|
| **Fact** | The statement to store. Required. |
| **Description** | Optional context or rationale. Same size as Fact. |
| **Tags** | Comma-separated keywords for filtering. |
| **Entities** | Type in the inline entity search to find one (name or semantic) and click a result to link it — add several in a row. Linked items appear as chips above the search; click a chip's × to unlink. |
| **Properties** | Click to open the JSON editor. Enter any key-value pairs you want to attach. |

Click **Save**. The memory is indexed immediately and available for search.

**Searching:** The top search bar is **Semantic** (meaning-based) — type and it returns a ranked, non-paginated set. Plain-text (substring) search moved into the column headers: use the **freetext box under the Fact column** (see Filtering). Clearing the top bar restores the normal paginated list.

**Filtering:** Each column that can be filtered has its control docked directly under the column header — a **freetext box** under the main text column (Name / Relation / Fact) that matches a substring of the row's text, a type/kind dropdown under the **Type**/**Kind** column, and a tag box under the **Tags** column. Clicking a tag or entity badge on a row still fills the matching filter (the active entity filter shows as a chip above the table, with **×** to clear). Filtering happens on the server across the whole list, and clears back to everything when you empty the control.

**Sorting:** Click a column header with a caret (▾) to sort the list by that column — click again to flip the direction, and a third time to return to the default order. The caret fills in and points up or down to show the active sort. Sorting happens on the server, so it orders the **whole** list across every page, not just the rows currently on screen. Sortable columns vary by tab: **Entities** — Name, Type, Created · **Edges** — From, Relation, To, Weight, Created · **Memories** — Created · **Chrono** — Title, Kind, Status, Starts, Ends, Created.

**Deleting:** Each row has a **✕** button. A small inline confirmation appears — click **Yes** to confirm, **No** to cancel.

**Wiping everything:** There is no "Wipe all" button on the Brain toolbar. To clear a space's data, go to **Settings → Spaces → (space) → Danger tab** and use **Wipe all data**. You will be asked to type the space ID to confirm.

---

### Entities

Entities are named concepts — people, services, projects, tools, anything you want to connect knowledge around.

Each entity has a **name**, optional **type** (e.g. `person`, `service`), optional **tags**, an optional **description**, and optional **properties** (key-value pairs like `{ "version": "3.0", "active": true }`).

**Creating an entity:** Click **+ Add entity**, fill in the fields, and click **Save**.

When a **type** is selected and the space has a schema defined for that type, the properties section is automatically pre-populated with all property fields from that type's schema:

- **Required properties** — shown with a `*` badge; must be filled in before the record can be saved (strict mode) or will generate a warning (warn mode).
- **Optional properties** — shown with a remove (×) button; any field left blank when you click Save is silently omitted from the stored record.
- Switching the type dropdown **immediately rebuilds** the properties form for the newly selected type; values you have already filled in are preserved where the field name matches.

**Searching:** The top search bar is a **semantic entity finder** — type to see meaning-ranked matches in a dropdown, then click one to narrow the list to it (it fills the Name column filter). For an **exact / partial name** lookup (e.g. a specific ID like `ADR002`), use the **freetext box under the Name column** — semantic recall is poor at exact IDs, so the column filter is the reliable path. Column filters and sorting work as on Memories.

**Editing:** Click the ⊙ view-details button on any row to open the full editable drawer.

**Deleting:** Each row has an inline **✕ → confirm** flow.

Results are paginated — use **← Prev / Next →** to page through them.

---

### Edges

Edges connect two entities and describe the relationship between them (e.g. *service-a* `depends_on` *service-b*).

Each edge has a **from** entity, a **to** entity, a **label** (the relationship name), and optional **type**, **weight**, **tags**, **description**, and **properties**.

**Searching:** The top search bar is **Semantic** (ranks edges by meaning), same as Memories. Plain-text matching (label / endpoint names) is the **freetext box under the Relation column**.

**Creating an edge:** Click **+ Add edge**. Use the entity pickers to select the source and target, choose or type a label, and click **Save**.

When a **label** is selected and the space has a schema defined for that label, the properties section is pre-populated with all fields from that label's schema — the same required/optional behaviour as entities applies.

**Editing / Deleting:** Same as entities — ⊙ view-details drawer or inline ✕ confirm.

---

### Chrono

Chrono stores time-anchored entries: events, deadlines, plans, predictions, and milestones.

**Creating an entry:** Click **+ Add entry**. Required fields are **title**, **type**, and **starts at** (date and time). You can also add a description, tags, status, linked **entities**, linked **memories**, and **properties** — the memory field is a searchable picker (type to find a memory by its fact and click to link it; linked memories show as chips), and the properties editor lets you fill in any fields the chrono type's schema defines (switching the type reseeds its property fields). The same pickers and properties editor are available when editing an entry in its detail drawer.

**Searching:** The top search bar is **Semantic** (ranks entries by meaning). Plain-text matching (title / description) is the **freetext box under the Title column**.

**Filtering:** The filter bar above the table lets you narrow by tag text and status. Filters apply immediately.

**Deleting:** Inline ✕ confirmation per row.

---

### Query

The Query tab has two modes, switched with the buttons at the top: **Semantic Search** and **Advanced Query**.

#### Semantic Search

Type a natural-language query and press Enter (or click **Search**) to find the most relevant records
across the space.

**It matches meaning *and* exact wording.** Two rankings run and are combined: one by meaning (so
"how do we handle a data breach" finds a passage titled "incident reporting"), and one by the words
themselves (so a part number, form id or clause name is found even though such a string carries almost no
meaning for a language model). A record that scores on both ranks highest. If your administrator has
configured a reranking model, the top candidates are then re-scored by a model that reads your question
and each passage together.

None of that needs setting up, and none of it can make a search fail — a stage that is unavailable is
simply skipped.

Two options sit next to the query box:

- **topK** — how many results to return (1–100).
- **minScore** — drop results below this similarity score (0–1). This is always the **meaning** score, even when word-matching or reranking has changed the order — so a threshold you set once keeps meaning the same thing.

Click **Show advanced** for more control:

- **Types** — restrict the search to specific record types (memory, entity, edge, chrono). For each ticked type you can also set a per-type **minimum** number of results to guarantee.
- **Tags** — a tag filter applied to results.
- **Filter** — a JSON object of extra field constraints, validated before the search runs. The recall filter accepts fields such as `status` and `label`, which are applied as native `$vectorSearch` pre-filters (they narrow the candidate set inside the vector index rather than filtering afterwards).

**File results are grouped by document.** Searching over files matches *passages*, not whole documents, so a
long paper that is relevant in five places would otherwise fill the list with five near-identical rows. Each
document instead appears once — named, with a badge saying how many passages matched, and each passage listed
under the heading it sits beneath with its text.

Because several rows collapse into one, the header states both counts: *"1 result from 6 matching passages"*.
So a **topK** of 10 can legitimately show fewer than ten rows — the passage count tells you nothing was lost.

#### Advanced Query

Runs a structured MongoDB-style query against one collection. Select a collection (`memories`, `entities`, `edges`, `chrono`, or `files`), optionally set a **limit** and **max time (ms)**, enter a filter as JSON, and click **Run**. Results appear below.

Example — find all entities of type `service`:

```json
{ "type": "service" }
```

Example — find memories tagged `infra`:

```json
{ "tags": "infra" }
```

---

### File metadata (merged into Files)

There is no longer a separate **File Meta** tab. The metadata Ythril keeps for each uploaded file — the searchable side of a file (its caption/extracted text, tags, and links to entities, memories, and chrono entries) as distinct from the raw bytes — lives in the **[Files](#files)** tab, so files and their metadata are one explorer-style view. Each file row shows its **embedding status** (or a live stage bar while it is being processed) and its **tags** inline, and opening a file docks a detail pane beside the preview with the full metadata record — description, tags, entity/memory/chrono links. See [Files](#files).

---

## Graph

> Graph is a **tab inside Brain**, not a separate page. Open Brain and click the **Graph** tab.

The Graph view lets you explore how entities relate to each other visually.

**Getting started:**

1. Open the **Graph** tab in Brain.
2. Select a space from the tab's toolbar.
3. Type an entity name in the search bar and click the result to load its graph.

**Toolbar controls:**

| Control | What it does |
|---------|-------------|
| **Search** | Find and load an entity as the root node |
| **Depth** | How many hops out from the root to show (1–10) |
| **Direction** | Show outbound edges, inbound edges, or both |
| **Hide labels** | Toggle edge label text on dense graphs |
| **Fit** | Zoom to fit the whole graph in view |
| **Reset** | Clear the graph |

**Interacting with the graph:**

- **Single-click** a node to select it and open the detail panel below.
- **Double-click** a node to make it the new root.
- **Click** an edge to see its details in a popup.
- The **👁** icon on nodes and edges opens a full detail popup.

The detail panel below the canvas shows all memories and chrono entries linked to the selected entity. Use the type filter and description filter to narrow what you see.

**Editing from the graph:** click any memory or chrono row in that panel to open the same editable detail drawer used on the Brain tabs — including tag suggestions, the entity and memory pickers, and the property fields defined by the record type's schema. Saving updates the row in the panel behind it.

---

## Files

> Files is a **tab inside Brain**, not a separate page. Open Brain and click the **Files** tab.

The file manager lets you upload, download, organise, and preview files within each space.

**Uploading:** Click **↑ Upload** in the toolbar, or drag and drop files directly onto the file list. Large files are uploaded in chunks automatically.

**Uploading over a file that already exists asks first.** *New in 2.2.* A file with the same name in the
same folder is **replaced**, and everything derived from the old one is removed and rebuilt: conversion
chunks, extracted images, and any description generated from them. The dialog names all of that, because
what you need to weigh is that the derived records disappear — not that some bytes change.

You are asked **once for a whole batch**, not once per file: a drop of twenty files where three collide is
one question. **Cancel is the default**, and Replace is styled as destructive. There is no undo.

**Actions per row:**

| Action | How |
|--------|-----|
| Preview | Click the file name or the 👁 icon |
| Download | Click the ↓ icon |
| Rename | Click **Rename** |
| Delete | Click ✕ and confirm |

**New folder:** Click **New folder** in the toolbar.

**Navigation:** A breadcrumb bar (`root / docs / guides`) at the top lets you jump to any parent directory. The **tree sidebar** (toggle with **Show tree** / **Hide tree**) provides a full directory view.

**Folder sizes:** the Size column shows a folder's **total content size** — the sum of every file inside it (recursively), not just files. An empty folder shows `0 B`.

**Status & tags:** each file row also shows its **embedding status** (a pill: *Embedded*, *Embedding*, *Partial*, *Failed*, *Skipped*…) and its **tags**, pulled from the file's metadata — so a space's file-processing state is visible right in the list. (This is the file manager and the *File Meta* tab coming together into one view.)

**While a file is being processed**, the Status column shows a **stage bar** instead of the pill: a segment
per stage of *that file's own route* — a PDF might run render → VLM → repair, an image caption → embed — with
the current stage filling as its pages land and a `12 / 40` count where the work is countable. It replaces a
generic "Embedding" that looked the same for every file and every stage. If the worker stops reporting for
longer than the stall timeout the bar turns amber and says **stalled**, so a wedged job no longer looks like
a working one. The moment the file finishes, the row goes back to its status pill.

If **nothing** will run, it says so and why: the file's type is switched off for this space, or the file is
larger than the processing size limit. If a stage isn't available (for example a vision level with no page
renderer configured), it says that it falls back to plain text extraction. That is the answer to *"why did
nothing happen to my scan?"* — previously only findable by cross-checking Settings → Media Processing
against the space's own overrides.

**Sorting:** click the **Name**, **Status**, **Size** or **Modified** header to sort the current folder. Clicking cycles ascending → descending → back to the folder's own order. **Folders always stay at the top** — a file explorer where directories interleave with files by size or date is hard to navigate. Sorting applies to the folder you are looking at, which is the whole set the view holds.

### Detail pane (preview + description ⇄ file meta)

Clicking a file opens a **docked detail pane** to the right of the list (the list runs full width until then, and reclaims it when you close the pane). The pane has two faces, switched with the segmented toggle in its header:

- **Preview & description** — the file preview, with the file's metadata **description** shown beneath it:

  | Type | How it renders |
  |------|---------------|
  | Markdown (.md, .markdown) | **Formatted** — headings, lists, links, code blocks, tables, and `mermaid` diagrams |
  | Text, code, JSON, YAML… | Syntax-highlighted source |
  | Images (.png, .jpg, .gif, .webp, .svg…) | Inline image |
  | PDF | Embedded viewer |
  | Spreadsheets (.xlsx, .xlsm) | First sheet as a table (capped at 200 rows × 40 columns, with a note when truncated) |
  | Everything else | File info + download button |

  A **full-screen** button (top-right of the preview) expands the preview to fill the window; **Escape** or its close button collapses it back to the docked pane.

  **Where the description came from.** For an uploaded document Ythril writes one itself, and labels it so
  you know whose words you are reading:

  - **generated** — the model configured for documents answered *what is this file?* from the file's own
    text. Nobody has checked it, which is what the label is for.
  - **from the document** — the opening of the document's own text, taken verbatim. This is what an
    instance with no document model configured produces.
  - **no label** — a person wrote it. Editing the description on the **File meta** side removes any label,
    because the words become yours.

  The document's own opening text is kept either way and is searchable, so a phrase you remember from
  inside a file still finds it — even when the description is a generated summary that does not contain
  that phrase.

- **File meta** *(in the Brain)* — the editable metadata record: **description**, **tags**, and links to **entities**, **memories** and **chrono** entries, plus a **Retry** action to re-queue embedding for a failed or partial file. This is where the former *File Meta* tab's editing now lives. (On the standalone Files page, outside the Brain, the pane shows preview + description only.)

- **Extract** *(in the Brain, and only for files that have been processed)* — **what retrieval actually
  sees.** This is the tab to open when a document is in the system and still answers questions badly:

  | Section | What it tells you |
  |---|---|
  | **Chunks** | The pieces search actually matches on, in order. Each shows where it came from — the **heading** it opened for a document, or its **position in the recording** (`1:05-1:35`) for audio and video. If a chunk is missing text you expected, the conversion is where to look, not the search. |
  | **Extracted images** | The images pulled out of the document, each with its caption and whether that caption was **generated** or written by a person. |
  | **Converted markdown** | Exactly what the converter produced from the file — the input everything else is derived from. Long documents are shown up to 256 KB. |

  Nothing here is new: these are the records the pipeline already wrote. They were only visible before by
  browsing the internal `_converted/` and `_extracted/` folders, which are now hidden — hidden from
  browsing, not from inspection.

  A file with no chunks is worth noticing on its own: it means **nothing from that file is searchable yet**.

Press **Escape** or the close button to dismiss the pane. Use arrow keys to move to the previous or next file in the directory.

---

## Conflict resolution

When two connected brains modify the same file before syncing, a conflict is created. A dedicated **Conflicts** item then appears in the sidebar's Workspace section, carrying a red count badge of how many are waiting.

Open **Conflicts** from the sidebar to see them. For each conflict choose what to do:

| Option | Result |
|--------|--------|
| **Keep local** | Your version wins, the incoming version is discarded |
| **Keep incoming** | The incoming version replaces yours |
| **Keep both** | Both versions are kept (you can rename the incoming copy) |
| **Save to space** | The incoming version is copied to a different space, then the conflict is removed |

**Dismiss** (✕) removes the conflict record without changing any files.

---

## Schema Library

The Schema Library is an instance-wide store of reusable data definitions. Instead of copying the same schema into every space, define it once here and reference it from any space.

Open **Schema Library** from the sidebar (under Workspace).

### My Library tab

This tab lists all schema definitions on this instance.

**Browsing:** Use the search bar to filter by name or description. Use the type filter pills (entity / memory / edge / chrono) to narrow by knowledge type.

**Creating an entry:** Click **+ New entry**. Fill in:

- **Name** — the display name (e.g. `Service`). A unique identifier is derived from it automatically.
- **Knowledge Type** — which kind of data this schema applies to.
- **Description** — optional, surfaced to AI assistants.
- **Naming pattern** — an optional regular expression that entity names must match.
- **Property schemas** — click **+ Add property** to define properties with optional type, constraints, and whether they are required.

Click anywhere on a card to open and edit it. Changes save and close automatically.

**Importing from a file:** Use **Import from file** to load a `.json` file. It accepts either a single library entry (or an array of them) *or* a whole space's exported schema (a `{ typeSchemas: … }` file from a space's Schema tab **Export JSON**) — in the latter case every type is auto-grouped into the library under a group named after the file's space, mirroring **Export to library**. Types linked to the library are skipped.

**Publishing:** Click the globe icon on a card to make the entry visible to other Ythril instances. The icon turns accented when published. Click again to unpublish. No space data is ever exposed — only the schema definition.

**Sharing your library:** The **Share This Library** panel shows your instance's **Public endpoint** URL. Click **Copy URL** to copy it. Other instances can paste this URL when adding a catalog link.

To protect your library endpoint with a token (e.g. when your instance sits behind Cloudflare Access), click **Create access token**. Give the token a name and click **Create** — the value is shown once. Paste it into the **Library Access Token** field when the consuming instance adds a catalog link pointing to you.

**Deleting:** Click the trash icon. If spaces currently reference the entry, a dialog shows which ones and offers to unlink them automatically before deleting.

### Foreign Catalogs tab

This tab lets you link to other Ythril instances' public schema libraries and import their definitions.

**Adding a catalog:** Click **Add Catalog**. Enter a short ID (e.g. `acme`), the base URL of the remote instance (e.g. `https://brain.acme.example`), and an optional description. If the remote instance requires authentication on its public library endpoint (indicated by a lock icon or communicated by the owner), also enter the **Library Access Token** they issued you.

**Browsing:** Click **Browse** on a catalog card to see all published entries on that remote instance.

**Importing:** Click **Import** next to any entry. It is copied into your local library tagged with the source catalog for traceability.

**Removing a catalog link:** Click the trash icon on the catalog card. Previously imported entries stay in your library.

---

## Settings — Spaces

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

Click **Create Token**. Enter a name, choose a permission level, optionally set an expiry date, and optionally restrict it to specific spaces. A help line under the permission choices spells out exactly what the selected level can and cannot do (Read-only reads only; Standard reads and writes data; Admin adds token/space/config management). Click **Create** — the token value is shown **once**. Copy it immediately. The tokens list shows each token's permission level and space scope at any time, with the permission pill **colour-coded by privilege** so the riskiest tokens stand out at a glance: **admin is red**, **standard is green**, and **read-only is yellow** (Library Access tokens keep their own blue).

This dialog has no "Library Access" toggle. Library Access tokens (for sharing your schema library with other instances) are created separately, from the **Schema Library** page's own **Create token** dialog — see [Schema Library](#schema-library).

**Renaming a token.** Each row in the tokens list has a pencil button — click it to rename the token inline (Enter saves, Esc cancels). Only the label changes; the token's secret, permission level and space scope stay exactly as they were.

### Rotating a token

Click the ↺ icon on any token row. A new secret is generated; the old one stops working immediately. The new value is shown once.

### Revoking a token

Click the ✕ icon and confirm. The token is deleted and can never be used again.

Your current session token is marked **(current session)** in the list.

---

## Multi-factor authentication (MFA)

MFA adds a one-time code requirement for admin actions (creating tokens, managing spaces). Normal data operations are not affected. There is no separate "MFA" page — the MFA panel lives inside **Settings → Preferences**, under the **Security** heading (the language switcher sits above it).

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
  [Diagnosing a Misconfiguration](integration-guide/02-hosting.md#diagnosing-a-misconfiguration). The message names
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

**This feature is opt-in and disabled by default.** It requires local model files to be placed on disk (not bundled). See the [integration guide](integration-guide.md) for download links and setup.

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

## Settings — Storage

**Settings → Storage** shows how much disk space your Brain data and files are using against the configured quota. A usage bar with a **Healthy / Warning / Full** indicator shows how close total usage is to the limit; **Refresh** re-checks the current figures.

When usage approaches the quota limit, writes will first return warnings and eventually be rejected. Contact your administrator to raise the quota.

---

## Settings — Data

**Settings → Data** (admin only) gives you control over the underlying MongoDB database: maintenance mode, manual backups, point-in-time restore, and — when enabled by the infrastructure administrator — live database migration. An **overview strip** at the top summarises the database source, whether maintenance mode is on, how many backups exist, and the active backup schedule. The disruptive and irreversible operations — **maintenance mode** and **database migration** — are grouped in a red **Danger Zone** at the bottom of the page, separated from the routine backup controls.

### MongoDB connection

The **Database** card shows which MongoDB server this instance is connected to. The **source badge** indicates how the connection was configured:

| Badge | Meaning |
|---|---|
| **default** | Using the bundled `ythril-mongo` container. No custom connection has been configured. |
| **config file** | Connection string is stored in `config.json`, either saved here via migration or set manually. |
| **env var** | Connection is managed by the infrastructure via the `MONGO_URI` environment variable. The variable always takes precedence over `config.json`. |

### Maintenance mode

Maintenance mode suspends all write operations across the entire instance. All write requests return `503 Service Unavailable` while active. Read operations continue normally.

Use it before a restore or any manual database operation where you want to prevent concurrent writes.

Toggle the **Maintenance mode** button to enable or disable it. A banner appears across the top of the UI on all pages while maintenance is active.

### Backups

Click **Back Up Now** to trigger an immediate point-in-time dump of the entire MongoDB database. The backup is stored inside the instance's data directory (`<data-root>/backups/<timestamp>/`). Each backup contains a `manifest.json` with metadata and one NDJSON file per collection.

The **Backups** table lists all available backups with their timestamp and the collections they contain.

### Scheduled and offsite backups

> **This feature must be explicitly enabled by your infrastructure administrator** (`YTHRIL_DB_MIGRATION_ENABLED=true`). It is disabled by default.

Configure automatic backups and an optional offsite destination from **Settings → Data** using the **Backup Destination** and **Scheduled Backups** cards. Settings are saved to `backup.json` (alongside `config.json`, typically `/config/backup.json`). You can also create or edit this file directly — see `config/backup.example.json` in the repository for the full schema.

**Example `backup.json`:**

```json
{
  "schedule": "0 2 * * *",
  "retention": {
    "keepLocal": 7
  },
  "offsite": {
    "destPath": "/backups",
    "retention": {
      "keepCount": 14
    }
  }
}
```

| Field | Description |
|---|---|
| `schedule` | Cron expression for automatic backups (e.g. `"0 2 * * *"` = daily at 02:00). |
| `retention.keepLocal` | Maximum number of local backups to retain. Oldest are deleted after each run. **Default: unlimited** — local backups are never pruned unless you set this. |
| `offsite.destPath` | Absolute path **on the server's filesystem** to copy each backup to. See [Configuring the offsite path](#configuring-the-offsite-path) below. |
| `offsite.retention.keepCount` | Maximum number of offsite backup sets to retain. **Default: 14** — offsite sets older than the 14 most recent are deleted after each run. Set this explicitly if you are keeping long-term archives. |

> **The two retention settings default in opposite directions.** Local backups are kept forever until you set `keepLocal`; offsite sets are pruned to the 14 most recent unless you set `keepCount`. If you rely on the offsite copy as a long-term archive, set `keepCount` to the number of sets you actually want — otherwise older ones are removed on the next run.

Each backup set at the offsite destination contains:

- `<backupId>/` — MongoDB NDJSON dump (same format as local backups)
- `<backupId>-files/` — copy of `<data-root>/files/` (user-uploaded files), if present

All fields are optional. Omit `offsite` to disable offsite copying; omit `schedule` to disable automatic scheduling.

#### Configuring the offsite path

`offsite.destPath` is an absolute path on the **filesystem visible to the Ythril server process** — not a path on your workstation or host machine. How you make external storage appear at that path depends on how you run Ythril.

---

##### Docker Desktop on Windows

Docker Desktop runs containers inside a lightweight Linux VM. Windows paths (`C:\…`) are not directly visible inside the container. You must add a volume mount so that a Windows folder appears at a Linux path inside the container.

Add (or create) `docker-compose.override.yml` in the project root:

```yaml
services:
  ythril:
    volumes:
      - C:/Users/YourName/Backups/Ythril:/backups
```

Then set **Backup location** to `/backups` in the UI. Docker Desktop translates the Windows path automatically — no further configuration needed.

> `docker-compose.override.yml` is already listed in `.gitignore`, so your local paths will never be accidentally committed.

---

##### Docker on Linux / macOS

Mount any local directory, USB drive, or network share as a volume:

```yaml
services:
  ythril:
    volumes:
      - /mnt/usb/ythril-backups:/backups
      # SMB/NFS pre-mounted on the host work the same way
```

Set **Backup location** to `/backups` (or whatever container-side mount path you choose).

---

##### Kubernetes

Mount a PersistentVolumeClaim, NFS export, or `hostPath` into the Ythril pod at a chosen mount path, then set `offsite.destPath` to that mount path:

```yaml
# In the Ythril Deployment spec:
volumeMounts:
  - name: offsite-backup
    mountPath: /backups
volumes:
  - name: offsite-backup
    nfs:
      server: nas.local
      path: /exports/ythril-backups
```

---

##### Workstation mode (no Docker)

Ythril runs directly on your OS. Set **Backup location** to any absolute path your OS user can write to:

- Linux / macOS: `/mnt/usb/ythril-backups` or `/home/user/backups`
- Windows: `D:\Backups\Ythril`

> Ythril does **not** create the directory automatically — ensure the path exists and is writable before saving the destination.

### Restore

To restore a backup, click **Restore** on any backup row. The instance will:

1. Enter maintenance mode automatically.
2. Replace all data in MongoDB with the backup snapshot.
3. Exit maintenance mode.

Restore is irreversible — all data written after the backup timestamp will be lost. You will be asked to confirm before the operation begins.

### Database migration

> **This feature must be explicitly enabled by your infrastructure administrator** (`YTHRIL_DB_MIGRATION_ENABLED=true`). It is disabled by default on all instances.
>
> **Infrastructure-managed connections are locked.** When `MONGO_URI` comes from the environment, the UI shows an informational note that the connection is externally managed. The *hard* server-side block on changing database settings, however, is the separate `YTHRIL_MONGO_INFRA_MANAGED=true` environment variable: with it set, the **Migrate Database** card is disabled entirely. To change the database in a managed deployment, update your deployment configuration (the `MONGO_URI` your orchestrator injects) and restart.

Database migration moves the entire database to a different MongoDB server — for example, from the bundled container to Atlas, or between clusters.

Enter the target MongoDB URI and click **Test Connection** to verify reachability before committing. Once you click **Migrate**:

1. Maintenance mode is activated.
2. The current database is dumped to `<data-root>/migration-backup/`.
3. A migration marker is written and the new URI is saved to `config.json`.
4. The server process exits. When Docker or Kubernetes restarts the container, the server detects the marker and restores the dump into the new MongoDB before starting normally.

Migration is a one-way operation. Keep your old database available until you have confirmed the migrated instance is healthy.

---

## Settings — Audit Log

**Settings → Audit Log** (admin only) shows a searchable log of every API operation on this instance. The page has two sub-tabs, toggled at the top: **Audit Log** (the operation table below) and **Server Log** (the live server log described at the end).

**Filtering:** Filter by date range, operation type, space, HTTP status, or client IP.

**Table:** Each row shows the timestamp, which token or user made the request, the operation, the space, the HTTP status, and the response time. Click the **Detail** button on a row to open a structured panel with every field (timestamp, token/user, operation, method + path, status, IP, duration, space, entry ID) plus the full raw entry in a collapsible **Raw JSON** section.

**What changed:** for some operations the detail panel also lists the field values the request altered —
field, from, to. Two things are worth reading carefully:

- *not set* in the **From** column means the field did not exist before, which is different from a value of
  `null` (it existed and was cleared). Both are shown as written, never as a dash.
- Some operations show **"field-level changes are not recorded for this operation"**. That is not the same
  as *nothing changed*. Only explicitly listed fields are ever recorded, so that operations handling
  credentials — creating or regenerating a token, configuring a webhook or a model endpoint — cannot write
  a secret into a log that admins can read and that is retained for months. When you need to know exactly
  what a request contained, the resource's own history or your reverse proxy's logs are the place to look;
  the audit log deliberately does not keep it.

**Exporting:** Download the current filtered view as JSON or CSV.

**Live server log:** the **Server Log** sub-tab streams the instance's log in real time over Server-Sent Events (SSE). It loads the recent lines and then appends new ones as they happen, colour-coded by level.

---

## Brain — Review tab

The **Review** tab inside a space's Brain is that space's record-QA queue, split into sub-tabs:
**Duplicates**, **Contradictions** and **Suggestions**. (Contradictions needs an NLI model configured
under **Settings → Media Processing**; until the scanner has run, the tab explains what it needs.)

**Suggestions** is the space's completeness report, worked as a queue. A space is "set up" long before
it is *usable* — schemas declare types nothing instantiates and properties nothing fills, entities pile
up with no edges between them, files land that recall cannot see. None of that produces an error, so
none of it was visible anywhere. Overview shows the score and its three heaviest deductions; this is
where you fix them.

Each failing check is a card: what it found ("6 of 12 entities have no edges"), **why it costs points**,
a sample of the offenders, how much of that check's weight the space kept, and a button that jumps
straight to the tab holding those records. Entity samples are shown by **name**, not by id. The sample
is capped at five, and a card whose finding is bigger than its sample says so rather than letting five
entries read as the whole story.

Checks that already pass are listed too, collapsed under a count — on a healthy space they are the whole
answer, and a blank page would read as *we checked nothing* rather than *nothing is wrong*. Three states
are kept firmly apart: **nothing to suggest** (every applicable check passes), **nothing to measure**
(the space declares no schemas and holds no records, so there is nothing to check it against), and a
**report that failed to load** — which never renders as a clean space.

A check that cannot be asked is simply absent. A space that declares no schemas has opted out of schema
governance on purpose; it is not scored down for that. The record-type dropdown does not apply here
either — suggestions are findings about the schema and the space, not about individual records.

**Contradictions** lists records in this space that *disagree*. Each card says **why**: a **Field conflict**
names the property and shows both values (deterministic — the two records simply set the same single-valued
property differently), while a **Model verdict** shows an entailment model's judgement and its confidence.
That distinction is the point — "these disagree on `port`" is a fact, "a model thinks these disagree" is an
opinion. Contradictions are never merged: both records are real and which one is wrong is your call, so you
either **dismiss** it (sticky, like a duplicate dismissal), mark it **resolved by edit** after correcting a
record, or **link** the two as a contradiction instead.

Memories, entities and **chrono entries** are reviewed. For a chrono pair, a field conflict includes its
**status** — the same event logged twice, once as *completed* and once as *cancelled*, is exactly the kind of
disagreement worth your attention. The **dates** are deliberately left out: two hand-logged occurrences of a
repeating event ("Team sync", every Monday) would otherwise be reported as contradicting each other every
single week, which is the fastest way to make a review queue not worth reading.

**Filtering by record type:** a **Record type** dropdown under the sub-tabs narrows *both* views to one kind
of record — handy once a space's queue mixes memories, entities and chrono entries. It lists only the types
actually present, and disappears when everything is the same type. If a filter empties the list, the page
says *no findings of this type* rather than pretending the queue is clear.

Both lists return at most **500 findings per space**. When that cap is reached the filter says so, because a
filter applied to a capped list can only mean "among the first 500" — clear the filter or resolve some
findings to see the rest.

**Duplicates** surfaces near-duplicate records found by the background semantic-duplicate scanner, **for that space**. It used to be a global page at Settings → Duplicates; a duplicate pair only ever means something *inside* one space, so it now lives beside that space's data. (The old `/settings/duplicates` link still works — it redirects to the Brain.)

A summary row at the top shows how many pairs are **open**, the **average match confidence**, and how many are **shown**, alongside a **search box**, a status filter (**open / dismissed / all**) and a **Scan now** button. The search box narrows the list by record summary, type, or space — handy once a **dismissed** pile has grown. Each duplicate pair is a **comparison card**: the space and record type, a **confidence meter** (the similarity as a coloured percentage), when it was detected, and record **A** shown side-by-side with record **B**. For an entity pair you can **Merge** the two records (the older one is kept); any open pair can be **Dismiss**ed — dismissing asks for confirmation first, since it removes the pair from the open list.

**Dismissed pairs stay dismissed** — a routine re-embed, a peer re-sync, or an index rebuild no longer drags them back onto the list the way they used to. A dismissed pair **only resurfaces on its own when its content materially changes** (a real edit to one of the records); a re-write that leaves the content the same keeps it dismissed. To bring one back for review sooner, switch the filter to **dismissed** (or **all**) and use **Re-rate** on the card.

The scanner sweeps **memories, entities and chrono entries** by default — logging the same event twice is one of the commonest ways a knowledge base goes redundant.

**Per-space rules:** how the scanner reacts is configured per space on the **Settings → Spaces → (space) → Duplicates** tab. Each rule pairs a **minimum-confidence slider** with an action — `flag` a pair for review, `automerge` it (asks for confirmation, since it's destructive and unattended), or `notify` a webhook. With no rules, pairs are simply flagged for review. You also choose which record survives a merge (older or newer). The scanner is opt-in and off by default.

---

## Settings — Webhooks

Webhooks send signed HTTP notifications to external systems when events occur. Manage them from **Settings → Webhooks** (admin token + MFA required).

The page lists every webhook with its endpoint, event/space filters, and a status badge (**active**, **failing**, or auto-**disabled** after repeated failures). From there you can:

- **Add / Edit** — set the HTTPS endpoint URL and a signing secret (at least 8 characters), choose which events and spaces to subscribe to (leave "all" selected for everything), and enable or disable it. The secret is write-only: it is never shown again, so on edit you leave the field blank to keep the current one.
- **Test** — send a `test.ping` event to confirm the endpoint is reachable.
- **Deliveries** — view recent delivery attempts with their HTTP status, latency, and any error.
- **Delete** — stop and remove a webhook.

All endpoints must be HTTPS and are SSRF-checked (private/reserved addresses are rejected). Everything the page does is also available directly through the admin API at `/api/admin/webhooks`:

### Listing and creating

- **List:** `GET /api/admin/webhooks`
- **Create:** `POST /api/admin/webhooks` with a JSON body of:
  - **`url`** — the HTTPS endpoint to notify.
  - **`secret`** — at least 8 characters; used to HMAC-sign each payload so your endpoint can verify it came from Ythril.
  - **`spaces`** — optional array of space IDs to restrict to (omit/empty = all spaces).
  - **`events`** — optional array of event types to restrict to (omit/empty = all events).
- **Delete:** `DELETE /api/admin/webhooks/:id`
- **Update:** `PATCH /api/admin/webhooks/:id`

### Testing

`POST /api/admin/webhooks/:id/test` delivers a `test.ping` event to that webhook so you can confirm the endpoint is reachable. Recent delivery attempts are available at `GET /api/admin/webhooks/:id/deliveries`.

### Event types

Beyond the per-collection write events (`memory.created`, `entity.updated`, `file.deleted`, … across memory, entity, edge, chrono, and file), the following are also emitted: `entity.merged`, `link_violation.created`, `duplicate.detected`, and `test.ping`.

---

## Settings — About

The About page loads once (no auto-refresh) and shows instance information in two cards: an **Instance** card (instance label, instance ID, version, and public URL when set) and a **System** card (MongoDB version, uptime, and disk figures). The disk section shows **Ythril data** — the actual size of Ythril's data directory (cached, refreshed periodically) — separately from **Disk (whole volume)**, the total/used capacity of the filesystem that directory sits on, with a usage bar + health pill (Healthy / High / Critical) tracking how full that volume is. (Previously only the whole-volume figure was shown, which read misleadingly as Ythril's own usage.) If the info fails to load, the page shows the reason and a **Retry** button. It does **not** show the server log — the live server log lives on the [Audit Log](#settings--audit-log) page.

---

## Connecting an AI assistant (MCP)

Ythril speaks the Model Context Protocol (MCP), which lets AI assistants like Claude, Cursor, or Windsurf read and write to your knowledge base using natural language.

### Setup

Add the following to your MCP client's config file:

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

Replace `localhost:3200` with your instance URL and `ythril_yourTokenHere` with a valid token.

One connection entry is all you need — every space the token can access is available. On connect, the AI receives instructions naming the spaces it can reach and is told to call **`list_spaces`** (and `get_space_meta`) to learn the schema, purpose, and record counts of each — so it can orient itself before reading or writing. It can also call the **`help`** tool for a guided overview of the whole system (the knowledge model, when to use `query` vs. `recall`, and the tools available to its token).

### Browser connectors (OAuth)

Static-token clients like Claude Desktop, Cursor, and VS Code just send the `Authorization: Bearer ythril_…` header shown above. Browser-based connectors that use the claude.ai-style OAuth flow instead — connect Ythril's `/mcp` URL and you'll be sent through an OAuth **consent** screen where you paste a valid Ythril token to approve. On approval Ythril mints a fresh PAT with the same privileges as the approving token; it appears under **Settings → Tokens** named **`MCP connector: <client>`**. This flow requires the instance to know its own public HTTPS URL (`publicUrl` / `PUBLIC_BASE_URL`).

### Example: connect Ythril to Claude

Claude's web app (and Claude Code on the web) can add Ythril as a **custom connector** over MCP. A full walkthrough:

1. **Give your instance a public HTTPS address.** Claude's web app runs in the cloud, so it cannot reach `localhost` or a private IP — it needs a public URL over HTTPS with a valid certificate. The simplest route is Ythril's built-in **Settings → Networks → local connector** (a Cloudflare tunnel), which publishes your instance at a `https://…` address. Make sure the instance's **public URL** is set (so the OAuth details it generates point at the right host).
2. **Create a scoped token first** (**Settings → Tokens**). The connector inherits *exactly* this token's permissions, so decide up front: read-only vs. read-write, admin or not, and which spaces. For example, a **read-only token scoped to a single space** gives Claude search access to just that space and nothing else. Name it something recognisable like `Claude web — read-only`.
3. **Add the connector in Claude.** Open **Settings → Connectors → Add custom connector** and enter your instance's MCP URL: `https://<your-instance>/mcp`. (On Team/Enterprise plans an admin adds it once under **Admin settings → Connectors**; members then authenticate individually.)
4. **Approve the connection.** Claude sends you to Ythril's **consent screen** — paste the token you created in step 2 and approve. Ythril issues the connector a fresh token with the same permissions, which appears under **Settings → Tokens** as `MCP connector: <client>` (so you can see and revoke it at any time).
5. **Enable it in a conversation.** Turn the connector on with the **+** in the chat. Claude first calls `list_spaces` and `help` to orient itself, then it can recall, remember, query, and manage your knowledge graph — limited to whatever the token allows (a read-only token, for instance, won't even see the write tools).

**To change what Claude can do,** issue a differently-scoped token (read-only, or a different set of spaces) and reconnect. **To cut it off,** revoke its `MCP connector` token under **Settings → Tokens**. If you'd rather skip the OAuth flow entirely, connectors that accept custom headers can instead send an `Authorization: Bearer ythril_…` header directly — same scoping (the header token's permissions), no consent step.

### What the AI can do

Once connected, your AI assistant can:

- **Remember** things — store facts, notes, decisions, and links to entities.
- **Recall** — semantically search everything you have stored.
- **Manage entities** — create, update, merge, and traverse the knowledge graph.
- **Track time** — create and update events, deadlines, plans, and milestones in the chrono log.
- **Work with files** — read, write, list, and move files in any accessible space.
- **Query directly** — run structured MongoDB-style queries against any collection.

Use a **read-only token** to give an assistant search access without the ability to write or delete anything.

Use a **space-scoped token** to restrict the assistant to specific spaces only.
