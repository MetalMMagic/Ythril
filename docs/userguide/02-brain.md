# Brain and Graph

> Part of the [Ythril User Guide](../userguide.md).

## Brain and Graph

## Brain

The Brain is where all your knowledge lives. It has eight tabs: **Overview**, **Query**, **Graph**, **Files**, **Entities**, **Edges**, **Memories**, and **Chrono**.

**Overview** is the **default landing tab** — opening a space lands here first. It is a per-space dashboard assembled from what the Brain already knows: a **Storage** panel (storage used against the space's quota — and when the instance could not read part of that space's file directory the figure is prefixed **≥** with a **partly unreadable** warning beside it, because a number that is silently short reads as a quota nowhere near its limit), an **Indexing** panel (the vector index's state, plus a **Reindex** button — behind a confirmation — when embeddings have gone stale), an **Embedding queue** panel (pending / processing / failed background-embedding job counts, with the file + reason for any failures, and a **Retry all failed** button — behind a confirmation — that re-queues every failed job in the space at once), a **Networks** panel (the networks this space syncs with and its aggregate sync status, or a note when it belongs to none), a **Governance** panel (open votes in this space's networks — subject, deadline, and tally — shown only when there are any), a **Data model** panel (the space’s entity types drawn as a diagram, with each type’s declared properties, how many records it actually holds, and the relationships between types — inferred from the schema AND from the records, so a type that has records but was never declared shows up rather than being silently left out; a record count is a link that opens that type in the Entities tab, and admins get a pencil on each type that opens the schema editor without leaving the page. **Memories, chrono entries and files appear as boxes too** — one per kind, carrying that kind’s total, joined to each entity type they link to with the per-type count on the join. They are drawn dashed and unfilled because they have no schema of their own, and a kind with no links anywhere gets no box rather than an empty one; their counts open the matching tab; **the boxes are drawn at one of three heights and a row of them shares a top and bottom edge**, and **the types that participate in no relationship are laid out along the bottom across the full width of the card** rather than wrapping after four however much room there is — a height per property count meant no horizontal line anywhere in the picture, which is most of what made a diagram of twenty types hard to follow), a **Usage** panel (how often this space was called over the last seven days, how many of those calls were recall, and what share of them actually answered — demand without the answer rate is not usefulness; admins get a **Reset usage** button there, which deletes the recorded history for this space behind a confirmation and is irreversible), and — **for admins only** — a **Token access** panel (which API tokens can reach this space and at what level: admin, read/write, or read-only, with network-peer and all-spaces tokens flagged and any expiry shown).

At the top of the page a row of **space chips** lets you switch space; each chip shows the space's total record count. The tab buttons themselves carry small count badges for the collection they open.

At the **far right of the tab strip**, past Files, a **cog** opens the settings for the space you are already
looking at — the same editor as **Settings → Spaces**, with its Settings, Schema, Duplicates and Danger Zone
tabs. It is not a ninth tab: it opens a dialog over the page, so nothing you were reading is lost, and closing
it returns you to the tab you were on. The cog is greyed out until a space is selected.

The admin list at **Settings → Spaces** is unchanged and remains the place to create, reorder and compare
spaces; the cog is the shortcut for the one you are working in.

The same state is on both APIs as `needsReindex` on a space's meta, so an agent can check it without watching
the screen.

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

**Editing:** Click the **⊙ view-details** button on any row to open the full editable drawer — the same drawer
the entity and edge tabs use. Every field you can set when creating a memory can be changed there, including
tags, linked entities and properties.

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

Results are paginated — use **← Prev / Next →** to page through them. The list also reports the **total** number of matching records, not just the ones on screen, so "first page of 4,831" is visible rather than something you have to page to the end to discover.

---

### Edges

Edges connect two records and describe the relationship between them (e.g. *service-a* `depends_on` *service-b*).

Each edge has a **from** record, a **to** record, a **label** (the relationship name), and optional **type**, **weight**, **tags**, **description**, and **properties**.

**From 3.7 an endpoint does not have to be an entity.** Either end can be an entity, a memory, a chrono entry
or a file, and the edge records which kind it is. Think of a photo taken at a party: the photo can point at
the people in it (entities), at the party itself (a chrono event), and at what happened there (a memory) —
three different kinds of record, from one file.

> **The Edges tab still creates entity-to-entity edges only.** The pickers offer entities, and an edge you
> create here has no kind recorded, which means entity — exactly what it meant before 3.7. Edges with other
> kinds of endpoint are written through the API or by an agent. They **display** properly in this table: a
> memory endpoint shows its fact, a chrono endpoint its title, a file endpoint its path. Pickers for the other
> three kinds are not in this release.

**Searching:** The top search bar is **Semantic** (ranks edges by meaning), same as Memories. Plain-text matching (label / endpoint names) is the **freetext box under the Relation column**.

**Creating an edge:** Click **+ Add edge**. Use the entity pickers to select the source and target, choose or type a label, and click **Save**.

When a **label** is selected and the space has a schema defined for that label, the properties section is pre-populated with all fields from that label's schema — the same required/optional behaviour as entities applies.

**Editing / Deleting:** Same as entities — ⊙ view-details drawer or inline ✕ confirm.

---

### Chrono

Chrono stores time-anchored entries: events, deadlines, plans, predictions, and milestones.

**Creating an entry:** Click **+ Add entry**. Required fields are **title**, **type**, and **starts at** (date and time). You can also add a description, tags, status, linked **entities**, linked **memories**, and **properties** — the memory field is a searchable picker (type to find a memory by its fact and click to link it; linked memories show as chips), and the properties editor lets you fill in any fields the chrono type's schema defines (switching the type reseeds its property fields). The same pickers and properties editor are available when editing an entry in its detail drawer.

> **Clearing a property on a chrono entry works from 3.1.** Properties are *merged* when you save — the ones
> you do not touch are kept — so before 3.1 an API caller had no way to remove one at all and a stale key
> stayed for ever. Removing a property in the editor now removes it. The entry's **title**, **type** and
> **starts at** cannot be cleared, because an entry without them could not be shown; change them instead, or
> delete the entry.

**Searching:** The top search bar is **Semantic** (ranks entries by meaning). Plain-text matching (title / description) is the **freetext box under the Title column**.

**Filtering:** The filter bar above the table lets you narrow by tag text and status. Filters apply immediately.

> **"Overdue" is worked out from the clock.** An entry you left as *upcoming* whose date has passed shows as
> **overdue** on its own — nobody has to mark it. That also means filtering by *upcoming* or *active* leaves
> those entries out, because they are counted as overdue now. Set an entry to *completed* or *cancelled* to
> stop it being counted that way.
>
> The status dropdown does offer **overdue**, and filtering by it finds those entries too. You rarely want
> it: an entry marked overdue by hand stays overdue after you move its dates forward, where one left as
> *upcoming* corrects itself.

**Editing:** Click the **⊙ view-details** button on any row to open the editable drawer, as on the other record
tabs. Title, type, dates, status, tags, description and properties can all be changed there.

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

Click **Show advanced** for more control. Everything the API accepts is here, so a search you can describe is a
search you can run without writing a request by hand:

- **Types** — restrict the search to specific record types (memory, entity, edge, chrono). For each ticked type you can also set a per-type **minimum** number of results to guarantee.
- **Max per type** — the ceiling to that floor. This is how you stop one long file passage from crowding out several one-line records that would answer the question more cheaply; a slot freed by the cap goes to another type.
- **Tags** — a tag filter applied to results.
- **Filter** — a JSON object of extra field constraints, validated before the search runs. The recall filter accepts fields such as `status` and `label`, which are applied as native `$vectorSearch` pre-filters (they narrow the candidate set inside the vector index rather than filtering afterwards). It also accepts **raw MongoDB** — `$or`, `$and`, `$in`, `$regex` and the comparisons — for conditions the simple form cannot express, such as *"status is open OR kind is ask"*. A raw filter is slower (the whole space is scored, then filtered) and returns the same records.
- **Graph hops** — follow the knowledge graph outward from each match, 0–5 hops. Connected entities come back **grouped under the match that reached them**, each carrying the relationship that connects it and every route back to the match, so you can ask "what surrounds this answer" in one search and still see which answer it surrounds. The result count stays the number of matches. Leave it at 0 for an ordinary search; deep values on a densely connected space are slow, so narrow the matches with a filter or tags first.

  **The API can narrow the walk itself** — which relationship types to follow, and whether to go outward, inward or both — by sending `traverse` as an object rather than a number. The UI control sets the depth only. It matters on a space where a few records are connected to almost everything: an unnarrowed hop off one of those returns whichever neighbours fitted, and nothing distinguishes that from a deliberate answer. See the integration guide's recall page.

  **The walk follows edges only, unless the API asks for more.** A memory, timeline entry or file that names an entity is related to it — but that link is a field on the record, not an edge, so the hops above do not follow it. The API turns each kind on with `includeChrono`, `includeMemories` or `includeFiles` inside the same `traverse` object; the UI control has no equivalent. They are off by default because a search answer has a size budget and each match is counted together with everything hanging off it, so records nobody asked for are paid for in answers that no longer fit. With one on, a match that is itself a memory also stops coming back with an empty neighbourhood — the walk starts from the entities that memory names.
- **When the surroundings do not fit** — a search that reaches more connected records than it can show returns
  the ones nearest your matches and writes the *whole* neighbourhood to a downloadable file in the space, valid
  for a day. The result says both: how many it showed, and where the complete set is. A short graph would
  otherwise read as "this record has few relationships", which is a statement about your data rather than about
  the search.

  **Sometimes there is no complete set to offer, and the result says that too.** Following the records that
  merely *name* an entity is bounded per hop, so a dense space can use up a hop's budget on records it has
  already shown. The neighbourhood is then genuinely partial — the rest was never read, so there is nothing to
  write to a file — and the result is marked short with no download beside it. Narrowing the search, or asking
  for fewer hops, is what makes it whole.
- **When the answer itself does not fit** — a search result is also bounded by SIZE, not only by `topK`. Ask
  for a hundred matches with their surroundings and the answer can be larger than anything that should arrive
  in one piece, so what fits comes back in full and the answer says where to carry on from. Two things are
  guaranteed and they are the ones that matter: **every record you get is whole** — never half a passage, never
  a record missing part of its graph — and the results you get are the **top of the ranking**, in order, with
  nothing skipped in the middle. So a shortened answer is still the best answers, and the next request picks up
  exactly where this one stopped.

  **What that guarantee costs, and it is the thing to know before blaming the search.** A match is counted
  together with its whole graph, so asking for deeper or wider relationships means **fewer matches fit** — and
  the ones that do not fit are absent, not shortened. A search for a hundred matches that comes back with
  eleven has usually not found eleven things: it has found a hundred and spent the room on the relationships
  around the first eleven. Turn the expansion down, or raise **Max response size**, and the rest appear. And **the page tells you when it happened** — a notice above the results says
  how many of how many came back, states both guarantees, and says what to do about it. Until 3.2.0 it did not:
  a shortened answer looked exactly like a complete one, so a hundred-match search could show a handful of
  records with nothing anywhere explaining why.
  - **Max response size**, under **Show advanced**, is the ceiling itself — the API calls it `maxBytes`. Raise it
    to get more of a shortened answer in one go; leave it empty for the default. **The default here is the
    larger one.** An agent talking to this instance over MCP gets a smaller default than this page does, because an
    agent's tool result has to fit inside its own client and a browser's does not — so a search that comes back
    whole here can come back shortened for an agent asking the same question, and that is deliberate rather
    than a discrepancy. There is deliberately
    one control and not two: the API also accepts the same ceiling expressed in tokens, and the smaller of the
    two always wins, so offering both would only let you set two limits and then wonder which applied.
  - Narrowing the search — fewer results, fewer graph hops, a tighter filter — does the same job from the other
    end, and a search that comes back shortened is usually a sign the question was broader than intended.
  - **Getting the whole tail as one file is a request you make, not something that happens to you.** An API
    caller can add `remainderDump` to have everything that did not fit written to a downloadable file in the
    space, valid for a day. Until 3.2.0 that file was written on *every* shortened search whether anyone wanted
    it or not, which quietly grew the space's storage and slowed the usage figures an operator reads. Now
    nothing is written unless it was asked for.
- **maxTimeMS** — a time limit for this one search. It can only make the search stricter than the instance's own budget, never looser. When the limit is reached you get a **partial** answer rather than an error or a hang: whatever finished is returned, and the result says it was cut short.
- **Include fresh writes** — also scan the newest records directly, so something written seconds ago is findable before the index has caught up. It costs an extra scan per record type, so turn it on when you are looking for something you just wrote.
- **Include content** — on by default. Turn it off to get passage *locations* without their text: useful when you want to find which document holds something and read only that part, since passage bodies are the largest thing a result carries.
- **Include diagnostic fields** — off by default, and off is right for ordinary searching. Turn it on to see *why* a result ranked where it did: the exact text that was embedded, the embedding model, the sync counter, and the score from each ranking stage separately. It follows graph hops too, at every depth, so a search with **Graph hops** set shows the same detail on the connected records. The embedding vector itself is never returned and there is no option that asks for it.

**If a search fails, read whether it says it can be retried.** Some failures are the question — a filter the
system cannot parse, a value out of range — and those will fail the same way however many times you try. But a
search can also fail because the part of the database that does meaning-matching was momentarily unavailable:
most often for a while after the server restarts, while it rebuilds its search indexes. **That kind of failure
is not your search and is not your data, and the message now says so in as many words.** Try it again; it
clears on its own, in seconds after a blip and in longer after a big rebuild. Nothing is lost while it lasts,
and word-matching searches and the structured Query tab keep working throughout, because they do not use the
same index.
**Results that exist in the graph carry a graph button.** An entity result opens the Graph tab focused on that
entity; an edge result opens it on the entity the relationship starts from — the same jump the Entities and Edges
tabs offer. Memories, chrono entries and file passages have no node in the graph, so they show no button rather
than one that lands nowhere.

**File results are grouped by document.** Searching over files matches *passages*, not whole documents, so a
long paper that is relevant in five places would otherwise fill the list with five near-identical rows. Each
document instead appears once — named, with a badge saying how many passages matched, and each passage listed
under the heading it sits beneath with its text.

Because several rows collapse into one, the header states both counts: *"1 result from 6 matching passages"*.
So a **topK** of 10 can legitimately show fewer than ten rows — the passage count tells you nothing was lost.

**A record can be deliberately kept out of semantic search, and then no search option brings it back.** The
setting is called **`suppressEmbeddings`** and it exists at three levels, all under that one name: on a single
record, on a record *type* (**Settings → Spaces → Schema**, where it reads *"Suppress for this type"*), and on
the whole space (**Settings → Spaces → Danger Zone**). The most specific one wins — record, then type, then
space. It is meant for records that are **state rather than prose**: a row whose text never changes while its
numbers are updated constantly, which would otherwise be re-embedded on every write for no gain.

What it does is remove the record's embedding, not hide the record. So a suppressed record is still returned by
**Advanced Query**, still opens from its tab, still exports, and is still reached by **Graph hops** from a match
next to it — it simply stops competing on meaning. If a record you know exists never appears in a search, check
these three levels before treating it as a fault.

> Turning suppression off does not go back and embed what was written while it was on. Use the space's
> **Reindex** control on the Overview tab, or re-save an individual record.
>
> The per-record setting is API-only today — there is no checkbox for it in the UI. It was called
> `excludeFromVectorSearch` before version 3.1.0.

**In a network, each instance searches with its own model, and from 3.7 that is explicit.** A record that
arrives from another instance is prepared for search **here**, using this instance's own model — the sending
instance's version is never used, because two instances configured with different models produce numbers that
cannot be compared, and the result would be a search that looks fine and ranks wrongly.

The three levels above are read **here** as well, so this instance decides what its own search contains. The
one part that travels with the record is the per-record setting: if the author of a record marked it *"keep this
out of semantic search"*, that mark arrives with it and is respected. Before 3.7 the mark was silently dropped
in one direction — so a record its author had deliberately retired from search would quietly re-enter it on
every other instance, the next time anybody rebuilt that space's search index.

#### Advanced Query

Runs a structured MongoDB-style query against one collection. Select a collection (`memories`, `entities`, `edges`, `chrono`, or `files`), optionally set a **limit** and **max time (ms)**, enter a filter as JSON, and click **Run**. Results appear below.

The API behind this tab also takes **`skip`** (page through the results), **`sort`** and **`dir`** (order by a field), and returns a **`total`** — every record the filter matches, not just the page. Those are useful when you are driving it from a script rather than this form; see [Structured Query](../integration-guide/04d-brain-ops-api.md#structured-query-read-only) for the parameters and the sortable fields per collection.

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

There is no longer a separate **File Meta** tab. The metadata Ythril keeps for each uploaded file — the searchable side of a file (its caption/extracted text, tags, and links to entities, memories, and chrono entries) as distinct from the raw bytes — lives in the **[Files](03-files-and-schemas.md#files)** tab, so files and their metadata are one explorer-style view. Each file row shows its **embedding status** (or a live stage bar while it is being processed) and its **tags** inline, and opening a file docks a detail pane beside the preview with the full metadata record — description, tags, entity/memory/chrono links. See [Files](03-files-and-schemas.md#files).

---

## Graph

> Graph is a **tab inside Brain**, not a separate page. Open Brain and click the **Graph** tab.

The Graph view lets you explore how entities relate to each other visually.

**Getting started:**

1. Open the **Graph** tab in Brain.
2. Select a space from the tab's toolbar.
3. Type an entity name in the search bar and click the result to load its graph.

**Or jump straight there from a table.** The **Entities** and **Edges** tables carry a graph button beside
each row's *View details* eye. It opens this tab rooted at that node with **both directions at depth 2**, so
you land on the neighbourhood rather than on a lone node — then adjust with the toolbar as usual. From the
Edges table the view is centred on the edge's **from** endpoint; the `to` endpoint is one hop away, so the
edge itself is always on the canvas.

The Memories, Chrono and Files tables have no such button, because those records are not nodes in this graph:
a memory reaches it only through the entities it links, and a chrono entry is not reachable by traversal at
all. Use the **Entities** column in those tables to find the entity you want, then open the graph from there.

**Toolbar controls:**

| Control | What it does |
|---------|-------------|
| **Search** | Find and load an entity as the root node |
| **Depth** | How many hops out from the root to show (1–10) |
| **Direction** | Show outbound edges, inbound edges, or both. It applies to the edges you drew between entities — not to the memories, timeline entries and files that merely MENTION an entity. A mention runs one way, from the record to the entity, so there is no second direction to choose and those are always reached the same way |
| **Hide labels** | Hide edge labels entirely. By default a label is shown only on the edges of the node you have selected, and on an edge you hover — labelling every edge at once is unreadable on a dense graph, because the labels overlap each other and the nodes |
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

---

## Brain — Review tab

> **A failed embedding job is retried once per upgrade, automatically.** A job that fails is retried five
> times with a growing pause — about twelve minutes in total — and then marked failed and left alone, which
> is right for one bad record and wrong for an outage. If the embedding model is unreachable for longer than
> that (during an upgrade, say), every queued job in every space is marked failed at once and nothing runs
> again until somebody presses **Retry all failed**. So starting a **new version** now re-queues everything
> that failed under the old one, once, and says how many in the log. Restarting the same version re-queues
> nothing — a record that genuinely cannot be embedded must not be retried on every boot for ever.
> **Reindex tells you it STARTED, not what it found.** The button schedules the work and returns at once —
> a whole-space re-embed is far too long to hold a request open — so there is no count to report yet, and
> the notification says the job is running in the background. The **Indexing** panel is where progress and
> completion show up. It used to print *"Reindexed 0 documents"* in green at the moment the job began, which
> was the acknowledgement being read as the result.
>
> **A proxy space has no Reindex button at all.** It holds no records of its own — its members do — so it has
> no index to rebuild, and the panel says to reindex the member spaces instead.

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
record, **link** the two as a contradiction, or pick a winner with **Keep A** / **Keep B**.

**Keep A / Keep B** is usually what you actually mean: *this one is right, that one is stale*. It records who
decided, marks the other record as superseded, and — for two entities — draws the `supersedes` edge for you.
**Nothing is deleted.** The superseded record stays exactly where it was, now labelled, because it was true
once and that history is often the reason you were looking. For a memory or chrono pair the decision is still
recorded, but no edge is drawn (edges connect entities) and the app tells you so rather than letting you
assume the graph changed.

Before deciding, use **Show both in full** on the card: the two lines you see are summaries, which is enough
to triage a pair and rarely enough to judge one.

The view carries the same controls as Duplicates: a **search box** (which matches the disagreeing field
values as well as the record summaries, so "the one about `port`" finds it), a **status filter**, and a
**Scan now** button. The status filter matters more here than on Duplicates, because there are three piles
rather than two — **open**, **dismissed** and **resolved** — and dismissing or resolving a pair moves it out
of the default view. Switch the filter to find it again. If a scan finishes while the entailment model is
unreachable, it says so: nothing was judged, which is not the same answer as nothing disagreeing.

An empty list tells you *which* empty it is. With no entailment model configured it says so and names what
still ran — the deterministic field check runs regardless, so contradiction detection is never simply off.

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

**Duplicates** surfaces near-duplicate records found by the background semantic-duplicate scanner, **for that space**. It used to be a global page at `/settings/duplicates`; a duplicate pair only ever means something *inside* one space, so it now lives beside that space's data. (The old `/settings/duplicates` link still works — it redirects to the Brain.)

A summary row at the top shows how many pairs are **open**, the **average match confidence**, and how many are **shown**, alongside a **search box**, a status filter (**open / dismissed / all**) and a **Scan now** button. The search box narrows the list by record summary, type, or space — handy once a **dismissed** pile has grown. Each duplicate pair is a **comparison card**: the space and record type, a **confidence meter** (the similarity as a coloured percentage), when it was detected, and record **A** shown side-by-side with record **B**. For an entity pair you can **Merge** the two records (the older one is kept); any open pair can be **Dismiss**ed — dismissing asks for confirmation first, since it removes the pair from the open list.

**Dismissed pairs stay dismissed** — a routine re-embed, a peer re-sync, or an index rebuild no longer drags them back onto the list the way they used to. A dismissed pair **only resurfaces on its own when its content materially changes** (a real edit to one of the records); a re-write that leaves the content the same keeps it dismissed. To bring one back for review sooner, switch the filter to **dismissed** (or **all**) and use **Re-rate** on the card.

The scanner sweeps **memories, entities and chrono entries** by default — logging the same event twice is one of the commonest ways a knowledge base goes redundant.

**Per-space rules:** how the scanner reacts is configured per space on the **Settings → Spaces → (space) → Duplicates** tab. Each rule pairs a **minimum-confidence slider** with an action — `flag` a pair for review, `automerge` it (asks for confirmation, since it's destructive and unattended), or `notify` a webhook. With no rules, pairs are simply flagged for review. You also choose which record survives a merge (older or newer). The scanner is opt-in and off by default.

---
