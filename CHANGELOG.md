# Changelog

All notable changes to Ythril are documented here. This file covers the **current major series**;
earlier majors are archived under [`changelog/`](changelog/) and linked at the bottom.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Characterization tests for the file tree, and they found that clicking a folder lists that directory
  twice.** `onTreeClick` loads the directory for the main listing and then lists the same path again for the
  tree's children — same URL, same moment, on every open. Found by asserting one request and getting two.

  Pinned as it behaves rather than quietly asserted as one, and filed as `G-10`. The second request is
  avoidable, but it cannot simply go: `expandTreeNode`'s error branch shows nothing, so the duplicate is what
  accidentally supplies the error message a failed expand has. The tree needs its own failure state first.

  Nothing in the product changed. The tree was the last part of that page with no assertion anywhere — the
  existing pass covered sorting, paths, the preview object URL and the metadata model — and it is the largest
  block the shell still renders inline, so the split needs it pinned before anything moves. Ten cases: the
  directories-only filter, `children: null` meaning "not fetched" rather than "empty", paths built with the
  page's own `join`, and the one that matters most — every mutation replaces the ARRAY, because nodes are
  mutated in place and the page is OnPush, so an extraction that drops a spread leaves a tree correct in memory
  and frozen on screen.

### Changed

- **A vector never crosses the wire, and a peer embeds what it receives with its own model.** Owner's ruling,
  2026-09-01: *"dont transfer embeddings… It CAN break so it WILL break. on transfer the receiver applies its
  rules."* Memories were the last record type that shipped their `embedding` and `embeddingModel`; now no
  ingest schema declares either, so all four are alike. A peer on an older build can still send one — it is
  dropped rather than refused, and the record lands.

  The reason is not tidiness. A vector is derived from text by one particular model, and two instances running
  different models hold legitimately different vectors for identical content. Ranking one against the other
  does not fail, it returns plausible results in the wrong order, which is the kind of wrong nobody reports.

  Every arriving record is queued for embedding against the receiving instance's own model, at the moment it is
  written. That already happened; what changed is that it no longer skips a record that arrived carrying a
  vector, because a vector can no longer arrive.

### Fixed

- **A record marked "never embed this" lost that mark when it synced, so a peer put it back into semantic
  search.** Suppression resolves `record > schema > space`. The schema and space tiers are the receiver's own
  configuration and always were; the record tier is a field on the document, and no ingest schema declared it —
  so zod stripped it on every push. The effect was latent: the record also arrives without a vector, so it is
  unsearchable at first, and the divergence surfaced the next time anybody rebuilt that space's search indexes,
  at which point the receiver read the record, found no mark, and embedded it.

  Both spellings now replicate on all four types, and a suppressed record is not queued on arrival at all —
  rather than queued and discarded when the job runs, which would leave a queue full of work whose only purpose
  is to be thrown away.

  It also closes a second thing nobody was looking for: the deprecated `excludeFromVectorSearch` was being kept
  on the document, and its removal deferred, on the stated grounds that *"a peer on an older build must keep
  finding the key it knows"* — while the ingest schema stripped it. The guarantee that justified carrying it
  did not exist.

- **A memory's `type` was deleted whenever the memory arrived by push.** The field selects the memory's type
  schema, so a memory that crossed a push door was then validated against nothing on the receiver and missed
  every type filter. Kept on pull, deleted on push: same version of the code, same document, one direction, no
  error and a 200 on the way back.

- **A chrono entry lost the marks that say its description expired**, so a reader could no longer tell *"this
  entry never had a description"* from *"it had one and its retention window lapsed"* — which is the entire
  purpose of `contentRedacted` and `contentRedactedAt`. Same mechanism as above.

  Neither of these was reported. Both were found by deriving one rule from two mechanisms already in the code:
  **a field the divergence check hashes must replicate.** If it does not, the sender's copy has the key, the
  receiver's does not, and the two Merkle roots differ for ever — so the sync view reports a space as divergent
  when nothing is wrong with it, which trains an operator to ignore the one signal that means data really is
  missing. `a-replicated-field-reaches-its-incoming-schema.test.js` now derives its exemptions from
  `merkle.ts` rather than from a list kept by hand; the hand-kept version named none of these three and would
  not have.

- **The thirteen sync-ingest write sites are one function.** Each wrote the document and then queued its
  embedding as a separate following statement, which holds for as long as everyone writing the fourteenth
  remembers the second line — and a record written without the queue is stored, listed, traversable and absent
  from every meaning-ranked search on that peer, with nothing to grep for. `ingestBrainDoc` does both, and it is
  now the only thing in the ingest router permitted to write a brain document.

  The gate that covered this compared two counts, thirteen against thirteen. Equal counts are a weaker claim
  than they look — and they go VACUOUS: nought writes and nought enqueues are equal too, so extracting the
  write made that check pass by looking at nothing. Its floor caught it, and the rule is structural now.

### Added

- **An edge can now say what KIND of record each endpoint is, so a link is no longer entity-to-entity only.**
  `from` and `to` were bare entity ids, and every reader knew where to look them up because there was only one
  place. `fromKind` and `toKind` name one of `entity`, `memory`, `chrono` or `file`, on `POST /edges`,
  `PATCH /edges/:id`, `upsert_edge`, `update_edge`, and both bulk doors.

  The case it exists for is a photo taken at a party: its file meta wants to point at the people in it
  (entity), at the party (chrono) and at what happened there (memory). Three collections, and a bare `to` says
  nothing about which one to search — and trying each in turn is not a fix, because two records in different
  collections can share an id, so the answer would depend on the order the code happened to try them.

  **Omitting the field is correct for an entity and is not the same as sending `"entity"`.** An omitted kind is
  stored as nothing at all and read as entity everywhere, so every edge written before this release, and every
  ordinary entity-to-entity edge written after it, is byte-identical. Nothing was migrated, which is the
  standing rule for a collection that syncs: a data migration over replicated documents would ship a whole
  space's worth of edges to every peer as changes.

  A file endpoint is the space-relative PATH rather than a UUID — that is what a file's `_id` is — so the shape
  check branches on kind. It refuses a leading slash, a backslash and a `..` segment, because those can never
  match a stored `_id` and a traversal segment must not be storable. Under `strictLinkage` the endpoint is
  looked up in the collection its kind names, so a stated kind that is wrong is a `400` rather than a dead
  link. A kind that is not one of the four is a `400` in every space.

  **Both fields are declared on the sync ingest schema, in this same commit, and that is the load-bearing
  part.** `IncomingEdgeDoc` is a zod object, and zod strips what it does not declare — so a field added to a
  replicated document and not added there is kept when the record arrives by pull and deleted when the same
  record arrives by push. Same version, one direction, no error and no statistic. The rule now has a gate:
  every field on `EdgeDoc` is either declared by `IncomingEdgeDoc` or listed as deliberately not replicated
  with a reason.

  **What an edge embeds follows the kind.** Its vector is built from `from label to` with the endpoints
  resolved to names — an entity's `name`, a chrono entry's `title`, a memory's `fact`, a file's path — capped at
  200 characters so a long fact cannot crowd out the relationship itself. Four paths reach that resolver (the
  inline upsert, the queued embed job, the reindex job, the edge list route) and it was entity-only in all
  four; it is one function taking the kind now, which is the arrangement that stopped `reindex` embedding raw
  ids while the writer embedded names.

  The Edges table displays them: a memory endpoint shows its fact, a chrono endpoint its title, a file endpoint
  its path. The tab's **pickers still offer entities only** — edges with other endpoint kinds are written
  through the API, and `docs/userguide/02-brain.md` says so rather than leaving it to be discovered.

### Changed

- **`resolveEdgeEntityNames` is `resolveEdgeEndpointNames`, and lives in `brain/edge-endpoint-names.ts`.** The
  old name described the first kind of endpoint rather than the job, which is how four call sites each came to
  resolve both ends in the entities collection. `bulkDeleteEdges` moved to `brain/edge-bulk-delete.ts` in the
  same pass, because `edges.ts` is frozen for size and new behaviour goes beside it rather than inside it.

### Fixed

- **`find_similar`'s `traverse` description described a shape the tool stopped having in 3.6.** It accepted
  `includeChrono`, `includeMemories` and `includeFiles` — the capability went live in #1083, which built both
  tools' schemas from one field list — while its own reference still read *"identical to `recall`'s shape:
  `edge` is the whole edge document, `node` the reached entity"*. Both halves are false with a flag on: a
  linked node is a chrono, memory or file carrying `kind`, and its reaching edge is synthetic, with no
  `author`/`createdAt`/`seq`. Recall's description was qualified at the time; this one was not.

  A schema description is what a caller reads *while constructing arguments*, so the integration guide promised
  a capability the tool's own reference denied.

  **The gate that should have caught it could not, by construction.** It derived what the description
  *promised* from the description itself, so one naming no flags at all had nothing to be unmet and passed —
  while its own docblock already said both directions mattered: *"a schema key no description mentions is a
  capability nobody discovers."* True, and half-checked, which is the worst state for a stated rule because
  the prose reads as protection. Both directions are now asserted, and the vacuous case fails.


### Changed

- **A memory's and a file's embedding is built from its own content, not from the names of what it links to** —
  worth **+1.5 points of strict evidence recall**, measured on a 199-question benchmark: the same turn scored
  0.8528 without the names and 0.8369 with them. `chronoEmbedText` never did it, so chrono was the control that
  showed the difference was the names rather than the corpus.

  The reason is not subtle. A memory linked to five entities carried five names it does not say, so a query
  naming any of them matched a record that never mentioned them, and the record's own sentence was diluted by
  tokens its author did not write.

  **An edge is the opposite case and is unchanged**: `ServiceA depends_on ServiceB` is the whole of what an edge
  says, and without its endpoints it embeds a bare label. Links are also still how you REACH a record —
  `traverse`, and recall's expansion with `includeMemories` — what changed is that they no longer pretend to be
  its content.

  **OPERATORS: this changes the text every linked memory and file embeds, so their stored vectors are now built
  from a different string.** Existing records keep working and keep matching; they are simply still weighted the
  old way until re-embedded. Run a reindex when convenient — Settings → Spaces → rebuild search indexes, or
  `POST /api/spaces/:id/reembed` — and nothing needs doing urgently.

  Two Mongo round-trips per embedded record went with it: the writer and the reindex job both resolved a
  record's linked entities purely to build that prefix.

- **`npm run preflight` now says when a database suite did not run.** Thirty-one standalone suites need the test
  MongoDB and stand down with a message when it is absent — correctly, and in CI the harness throws rather than
  reporting a green no-op. What was missing is that preflight then printed *"PASSED"* in exactly the same words
  as a run that had executed all of them.

  It cost a 21-minute CI round trip on the change above: removing a positional parameter shifted the argument
  after it, and the only callers passing that many positionals are database suites. The seven failures arrived
  as behaviour (*"waitForEmbedding: true still fails loudly"*) rather than as a signature mismatch.

  Derived from imports plus one TCP probe rather than by parsing test output: a suite that needs the harness
  cannot have run if the port is closed, and that is knowable without reading a line of the report.

### Fixed

- **`direction` narrows stored edges only, and now every surface that offers it says so.** A link is an
  `entityIds` **array** today — the field a memory, chrono entry or file carries — and it holds one
  orientation: the record names the entity. So there is nothing for a direction to select between, and neither
  link scan even accepts one, which is why the standalone `traverse` tool and recall's expansion have always
  agreed.

  **This is true of the array representation, not of links in principle**, and the link-records migration
  (M-2, this cycle) revisits it: a link record has a `from` and a `to`, so from an entity an inbound one
  reaches the memory that named it and an outbound one reaches nothing. The gate asserts that separately — a
  link scan gaining a `direction` parameter is that migration arriving, and the answer will be to rewrite these
  sentences rather than to make the gate agree.

  **The defect was that nothing said it.** A caller sending
  `{depth: 1, direction: 'inbound', includeMemories: true}` gets the entities their matched memory *names* — an
  outbound step from the record — and neither door's description nor either guide mentioned the rule. An
  undocumented rule that surprises costs the same as a wrong one, because the caller designs around what they
  were told.

  Stated on the shared traverse schema both doors read, on `recall`, `find_similar` and the standalone
  `traverse` tool, in the recall and graph API guides, and in the userguide in an operator's terms. The
  consequence is spelled out beside the rule, because the rule alone reads as a technicality.

  **The alternative was honouring `direction` on links, and it would be worse**: `inbound` would then hide a
  memory's own links, which is not what anyone asks for by narrowing. A gate now fails if any surface drops the
  statement — or if a link scan gains a `direction` parameter, which is the only thing that could make it
  untrue.

### Internal

- **The client's spec project type-checks, and nothing had been checking it.** `vitest` transpiles without
  type-checking and the production build compiles `tsconfig.app.json` only, so `tsconfig.spec.json` — 102 files,
  1 284 tests — was unchecked. It had **122 errors**. It has none, and `npm run preflight` now runs both
  projects as a gate of their own.

  **Four of them were real defects rather than type noise:**

  - A vote-round fixture used `status: 'closed'`, which the API cannot return — the union is
    `open | passed | failed`. The test asserted that a non-open round is filtered out while feeding it a value
    no server sends, so it proved nothing about the statuses that do.
  - Six backup-destination fixtures omitted `encrypt`, so **neither side of the branch that reads it was ever
    covered**. That branch has a case now: ON writes `encrypt: true`, OFF removes the key rather than writing
    `false`, and the mutant that writes `false` fails.
  - An assertion message was passed to `toBeNull()`, which takes no arguments — so it was silently discarded
    and a failure there would have reported nothing but *"expected null"*.
  - **`Memory`, `Entity` and `Edge` did not declare `updatedAt`**, which the server sets on every write and
    declares required. `ChronoEntry` had it, so client code wanting it on the other three had to cast: one
    rule, two declarations, and the weaker one on the side that reads the response.

  The fixes are shared definitions rather than casts: `testing/onpush.ts` replaces 23 copies of an untyped
  Angular internal, `testing/records.ts` gives each record kind one factory with the server-assigned fields
  filled in, `noRecordFilter()` names the default that was written inline in a signal, and
  `SpecTranslocoOptions` makes real an option the test helper's own docblock had always promised.

  **Checking the root `tsconfig.json` is what hid all of it**: that config includes the specs without the
  vitest types, so it reported 297 errors of which 175 were `Cannot find name 'expect'` — noise a real error
  hides inside. The two real projects are the question worth asking.
- **`04-brain-api.md` is split; it was sitting exactly at the 900-line doc ceiling**, so any addition to it
  failed the gate and whoever next documented a brain-API change would have paid for a split they did not
  cause. It is 405 lines now.

  **Split by subject rather than by size.** What moved is a set of rules that were never about memories:
  expiry, stamp integrity, what a `PATCH` does to `tags` and `properties`, optimistic concurrency, what a read
  never sends, retiring a record from semantic search, and partial updates with `deleteFields`. Every one
  applies to entities, edges and chrono entries too — they were filed on the memory page because memories were
  documented first. They are **[Write & Read Semantics](docs/integration-guide/04f-write-semantics.md)**, with
  a pointer left in reading order rather than at the end.

  Moved by script, with every range asserting the heading it must start on and a **multiset** comparison of
  prose lines before and after: zero lost. A line count alone is conserved by a split that duplicates one line
  and drops another, which is how the last hand-split of this guide shipped `ation naming the missing
  capability` in the docs for months.

- **The 2.x releases moved to `changelog/CHANGELOG-2.x.md`, and a gate now holds the convention.**
  `CHANGELOG.md` was 17 082 lines while its own second sentence said it "covers the **current major series**".
  It covered two: all seventeen 2.x releases sat in it alongside 3.x.

  Nobody decided that. 0.x and 1.x were archived exactly as the header describes, each with a Frozen note and
  a link back — the split simply did not happen at the 3.0.0 cut, and every release after it made the file
  longer without making the claim any truer. A documented convention with no gate holds exactly as well as
  remembering it does.

  So the current file is 4 848 lines and holds 3.x only, and a check requires: one major in `CHANGELOG.md`, and
  **the one `package.json` is on** — so it fires at the major cut rather than a release later, which is the
  only moment the split is cheap. Each archive must be frozen, with no `[Unreleased]` and nothing outside its
  own major, and every archive must be linked from the current file, because an archive nobody links to is
  history that looks deleted rather than moved.

### Fixed

- **A bounded link scan could drop records while the answer said the graph was complete.** The commit that
  bounded those scans said hitting the bound *"is reported through the existing `graphTruncated` /
  `graphComplete` spill"*. Neither traversal could report it, which made the bound worse than the unbounded
  scan it replaced: an incomplete answer that says nothing is indistinguishable from a complete one.

  The bound is spent on documents that are then **discarded** — the limit runs before the already-visited
  check — so a hop can burn its whole budget on records emitted at an earlier hop and finish *below* the node
  cap. That cap was the only truncation signal either traversal had, so the walk answered "complete". The
  second scan had its own version: its budget counts links emitted while the limit counts records read, so a
  few link-dense seeds could return before a whole class was queried at all.

  Both scans now report that they **stopped reading**, which is a different fact from the result filling up
  and the only one knowable at the cursor — a cursor that came back full may have more behind it, whatever
  survives the visited filter. `traverse` reports it as `truncated`, and `recall` and `find_similar` as
  `graphTruncated`.

  **`graphTruncated` can now arrive without `graphComplete`**, and callers reading them as a pair should treat
  the second as optional. There is no complete copy to write in this case: the records missing from the graph
  are exactly the ones the scan never read, so a spill file would be the same short graph under a name that
  promises otherwise. Both API doors, both MCP tool descriptions, and both guides say so.

### Fixed

- **Four defects the file-manager split introduced, and the gates that now catch them.** An adversarial review
  of #1098–#1102 confirmed four — all of them silent, which is what the whole exercise was supposed to avoid.

  **The New-folder form lost its styling.** `.rename-form` has two consumers: the rename box inside the table
  and the New-folder box in the toolbar. Only the first moved, and the rule went with it into the listing's
  scoped styles, so the page's own form had no rule that could reach it. `shared-styles-reach-their-renderers`
  is written for exactly this failure and had never been asked about the module the split created — it names
  the class the moment it is.

  **The upload panel became an inline box.** `.upload-panel` was a `div`, which is block; a custom element is
  **inline**, so the border, radius, overflow and 16px margin moved onto its `:host` were being applied to a
  box that shrink-wraps its content and ignores vertical margin. It rendered, which is why nothing caught it.
  A new gate requires any `:host` carrying box geometry to state its display.

  **The extract face's CSS was copied, not moved** — 21 dead lines stayed on the page as a second copy,
  because the deletion used line numbers that had already shifted. Bounds are taken from content now.

  **`.upload-zone` matched no element at all**, and was left behind on the stated grounds that it is "the drop
  target on the page". It is not — that is `.fm-main` with a drag-over binding — and nothing in the client
  carries the class. Deleted.

  Eight entries in the page's `imports` array outlived the markup that used them, and `formatSize` survived on
  the page only because a spec reached through to it. Both are gone.

### Internal

- **The recall-augmenting traversal is its own module** — `brain/edges.ts` from 688 code lines to 487, under
  the 650 ceiling. A-4, and the raise that owed it is paid.

  It is a different subject from the traversal that stayed, which is why it was the right thing to move:
  `traverseGraph` answers *"walk out from one start node"*, while this answers *"walk out from the records a
  search matched"* — a different entry shape, a different budget, a pre-pass that follows a matched record's
  `entityIds` out to entities, and route bookkeeping the standalone walk has no use for.

  **`frontierEdgeQuery` went sideways rather than travelling with it**, into `frontier-query.ts`, because both
  traversals apply it. That helper exists *because* the rule was once written twice with the copies disagreeing
  — the standalone path honouring direction and labels while recall's did neither — so duplicating it during
  the extraction that separates its two callers would have been the same defect a second time.

  Six gates read `edges.ts` for something that moved. Which gate needed which file was derived from the moved
  symbols rather than guessed, because a gate left pointing at the old file fails several assertions at once
  and reads as broken production code rather than as one moved module.

- **The file-upload route is its own module** — `api/files.ts` from 647 code lines to 455, under the ceiling
  for the first time since it was frozen. The route is 196 of those lines and by far the file's largest body:
  raw bytes or JSON, chunked uploads with a `Content-Range`, a quota check, a proxy-space write target, a TTL,
  a media dispatch and a webhook. Nothing else in the file referenced it, which is what makes a route the
  easiest thing there to move.

  **The four request-shape helpers went sideways rather than travelling with it.** The routes that stayed use
  three of the four, so taking them along would have left a copy behind — one rule with two implementations is
  the defect this codebase produces most, and the module that holds them now says so, because the rest of the
  split should follow the same rule as each route leaves.

- **The file manager's directory listing is its own component** — 1 326 code lines to 1 216, and **1 618 to
  1 216 over five cuts**.

  This one is the page's core rather than one panel of it, so its interface is inherently the widest of the
  five: the shipped element carries **fourteen** bindings. What the row view model removed is the three
  per-row questions — whether a row is being renamed, whether a re-embed for it is already in flight, and
  whether re-embedding is offered at all — which were evaluated inside the table's loop, so the table needed
  the page's requeue policy, its rename state and its path helper just to decide which buttons to draw.

  *(The original entry said "nine bindings instead of sixteen". Nine was the input side counted alone, and
  sixteen was what a straight move would have needed; put together they described an element that does not
  exist. Corrected after review.)*

  The row actions stayed as **separate outputs** rather than one event carrying a tag. Fewer bindings would
  have been worse to read: the page would gain a `switch` where it now has seven one-line handlers, and a
  template is the one place where naming each event beats dispatching on a discriminator.

- **The file manager's extract view is its own component** — 1 397 code lines to 1 326, and 1 618 to 1 326
  over four cuts. That is the whole detail pane: preview, upload panel, meta editor and now the extract view,
  which is what retrieval actually sees for a file.

  Fetching, paging and retry stayed on the page, as with the other three: the request is the page's, and a
  component that owned it would drop an in-flight page load when the pane switched tabs.

  `msRange` — a chunk's clock range, for media provenance — joined `formatSize` as a shared function, and its
  three cases moved with it. They had been reaching through a 1 600-line component to exercise six lines of
  arithmetic, which is exactly how two sort helpers came to be tested after the control that called them had
  gone. Testing the function directly also made room for the rounding, padding and negative-offset cases that
  were awkward to assert from a component.

- **The file manager's metadata editor is its own component** — 1 422 code lines to 1 397, G-3's third cut.
  Saving stayed on the page: the request is the page's, it knows what to reload afterwards, and a component
  that owned it would cancel a save in flight when the pane closed.

  **The model is passed through, not copied**, and that is the one thing this cut could have broken silently.
  The entity, memory and chrono reference widgets take a target object and write their results straight into
  it, so a defensive copy — the instinct an extraction usually rewards — would leave the page holding the
  original and every reference edit would vanish on save. Nothing else would look wrong: the form renders
  identically, the save fires, and the description and tags arrive correctly, because those go through
  `ngModel`. Only a user who edited the references would notice.

  *(The original entry claimed "a spec now fails on exactly that mutation" and the spec did not: it asserted
  the input signal rather than what the template binds, so a copy introduced between the two passed all 84
  tests. It now reaches each reference widget and asserts the identity of the object it was handed.)*

- **The file manager's upload panel is its own component** — 1 545 code lines to 1 422, G-3's second cut.

  **The queue stayed on the page, deliberately.** Ordering, the one-at-a-time rule, the HTTP subscriptions,
  retry and cancel semantics: an upload in flight owns a subscription, and a component that owned it would
  abort on destroy — so navigating away, or any structural change that remounted the panel, would silently
  cancel a running upload. The panel now holds no state at all; it renders what it is given and reports which
  button was pressed.

  Which action a row offers stays in one place with it: retry belongs to a failed row, cancel to one queued or
  uploading, dismiss to one that is finished either way. Each of those conditions was the only thing standing
  between a user and a cancel button on a completed upload.

- **The file manager's preview is its own component now** — 1 618 code lines to 1 545, the first cut of the
  largest file in the repo. It renders and does nothing else: the page still fetches and still owns the
  preview's object URL, because a component that revoked on destroy would revoke it during the very re-render
  that replaces it.

  It takes **one view model** rather than eight inputs, which also makes the loading, error and rendered
  states mutually exclusive by construction instead of by hand in two places. The markup was already an
  `ng-template` rendered twice — the same instinct as a component, one Angular version early — but it left
  the whole thing inside a 1 618-line file with its styles 500 lines from the markup they applied to.

  **Two CSS rules changed shape on the way, and that is the load-bearing part.** `.preview-body img` and
  `.preview-body iframe` were written against the page's wrapper, which is now the *parent* of the component
  that renders the image; left qualified they would have matched nothing, giving an image with no width cap
  and a PDF frame with no height on a page that still looked fine until you opened one.

  `formatSize` became a shared function rather than the second copy the extraction was about to create.

- **The largest file in the repo has characterization tests before it is split.** `file-manager.component.ts`
  is 1 618 code lines and its spec never mentioned **69 of its 117 members** — one component doing the
  browser, the upload flow, the preview, the extract tab and the per-file metadata drawer, with each of those
  a seam where a lost binding could hide.

  Twenty-three cases, chosen for where a split would actually break something rather than for coverage:
  folders sort ahead of files whatever column is chosen and a third click *clears* the sort rather than
  cycling; breadcrumbs carry the accumulated path and not just a label; the preview's object URL is revoked
  exactly once and forgotten, which is invisible in both failure directions; and the metadata edit model
  copies the record's arrays while turning `entityIds` alone into a comma-joined string, an asymmetry a
  uniform rewrite would quietly lose.

  Every case is mutation-tested by exit code, and the first run found one of its own **fixtures** was worthless
  — the folder in it was also the largest file, so folders-first and size-descending wanted the same order and
  deleting the rule left the test green.

- **The graph page is under the size ceiling for the first time since it joined the ratchet** — 690 code
  lines to 641, against a limit of 650. Three things, and the third was the surprise.

  The two side-panel headers were one bar written twice, differing in a title, a badge and whether the view
  button showed at all; they are now one component. The toolbar — root search, depth, direction, labels, fit
  and reset — is another. Its controls **report** rather than set, which is load-bearing rather than stylistic:
  a new depth or direction re-runs the traversal and toggling labels repaints the canvas, so a two-way binding
  would have moved the value and dropped the rest, leaving a toolbar whose controls look like they work.

  **Six members were deleted because nothing read them**, and a new gate names them by asking whether anything
  in the client mentions each one. Two shapes: `panelTitle` was computed for exactly this extraction and never
  wired in, so the page had one right answer beside two hand-written copies of it; `toggleSort` and `sortArrow`
  were left behind when the detail table moved to a child component that filters but does not sort — and were
  still covered by four passing specs, which is the worse state, because green is read as "the behaviour is
  still there". Two of those cases moved down to the module that actually owns the sorting; two went with
  their subject.

- **The working order is a checklist now, and the checklist is a gate.** The order a change is supposed to be
  made in — plan, write the tests and watch them fail, implement, run them, run the full suite, do the
  documentation, then push — was written down in two places and enforced in none, so it held exactly as well
  as remembering it did.

  It is now seven boxes in a file the tracker gate reads, inside the preflight that stands in front of every
  push. **The reset needs nothing to fire:** the checklist names the branch it belongs to, and one naming a
  different branch counts as fully unticked — so pushing and branching for the next item blanks it, while two
  commits on one branch keep their ticks, because a CI fix is not a new plan. A pre-push hook would have been
  the obvious build and a second thing that can fail to fire, leaving a ticked list in front of the next job.

  **Four of the seven rows are checked against something outside the file**, because a checklist you tick
  yourself is advice with boxes on it: the plan row names an item the ordered queue must actually hold (or
  says `owner-directed`, or `closed by this change` — the convention, since a fix in the working tree already
  fails the verify-line rule, so an item is closed in the change that ships it and has left the queue by the
  time this runs), the tests row carries the failure the test gave *before* the implementation existed
  (or `NO NEW BEHAVIOUR:` naming the spec that already covers it, which must exist), the CHANGELOG row
  requires `CHANGELOG.md` to differ from `main`, and **the guides are an explicit checkpoint of their own** —
  `docs/integration-guide/` and `docs/userguide/` are two of the five places a capability lives and the two
  that fail silently, since each is somebody's authoritative source and the one that is wrong is invisible to
  whoever reads it, so a `docs/*guide*` path must have moved or the row must say `NO GUIDE READER AFFECTED`
  with a reason attached. The remaining rows are attested, and the gate removes *"I
  forgot the order existed"* rather than dishonesty.

- **The work queue can no longer be pushed stale.** Every rule in the tracker gate checked a claim an
  individual ROW made about the code, so a row that said nothing false stayed green while the queue as a whole
  drifted: a bug fixed with no row filed for it, a state header naming a pull request from twelve hours
  earlier, a remark quoting a line count three changes old. Nothing was lying; nothing was current either.

  `todo/` is gitignored, so git cannot answer *"was this updated with the change"* — but the file's write time
  can. If the newest commit is newer than the ordered queue, the queue predates the work and the check fails,
  inside the preflight that runs before every push.

  It is deliberately blunt and cannot tell a real update from a touch. It does not try to: satisfying it
  honestly costs one line in the state header, which is exactly what kept going stale. What it removes is the
  possibility of pushing without having looked.

- **A tracker item marked in progress was invisible to its own gate.** Every tracker's legend documents
  `- [~]` alongside `- [ ]`, and the item parser matched only the latter — so marking a row in progress, the
  honest thing to do while its change is in flight, silently removed it from *"every open item is indexed"*.
  Found the first time a row was actually marked that way.


### Fixed

- **The graph panel's "no record here" message could not reach the reader, three different ways.** An empty
  panel and an unfetchable record look identical, and only one of them is true — so a file node (addressed by
  path, not by id) and a synthetic edge (id derived at render time, no stored row) are supposed to get a
  sentence rather than a blank.

  The message and the record were two independent conditions, so a **file node rendered the explanation
  immediately above "Loading…"** and contradicted itself — with the second line the more believable of the
  two, because it is the one that usually means something.

  The message asked for a CSS class that **was declared nowhere**, so the one sentence explaining why a panel
  is empty rendered as ordinary body text. Correcting the spelling was only half of it: the correct name is
  defined in brain's stylesheet, which is scoped to brain's components and cannot reach a graph child, so the
  rule is now declared where the cards load it. `shared-styles-reach-their-renderers` watches that pair from
  here on — it is the gate that already existed for this exact failure, and it needed one line to see it.

  And the EDGE card had no such branch at all: its message was translated into three languages and was
  **unreachable on screen**, because the only place it rendered was inside the node card and selecting an edge
  clears the selected node first. A synthetic edge said "Loading" indefinitely — which is not merely
  unhelpful, it is the one message that promises something is coming.


- **A stale `?space=` still moved the Brain page to another space.** The fix above reached the *absent* case;
  a **present** one stayed authoritative on every emission, which is the other half of the same bug.

  The premise that hid it was written down in three places and was false: the page reads `?space=` and
  *nothing ever writes it*. The ER diagram's knowledge-type count links write it — the very control the
  original report was about. So it goes stale the moment a different space is picked by chip (the screen
  changes, and the URL deliberately does not), and a tab click merges the stale value forward and throws the
  page back. A reload after any chip switch landed somewhere else for the same reason.

  A present `?space=` is now honoured only when it has **changed** since the page last acted on it. Honouring
  it on the first pass only would have been the smaller change and would have broken those count links: they
  navigate to `/brain` from *inside* `/brain`, so there is no remount and no first pass. Still nothing is
  written to the URL — Ythril is frequently embedded in an iframe. The three copies of the false premise are
  corrected.

- **Clicking a knowledge-type tab in any space but the first jumped back to the first space.** Reported by an
  operator: entries in other spaces were only reachable by clicking the type, landing in the wrong space,
  picking the right space again, and only then clicking the type.

  The Brain page **reads** `?space=`, and the only thing that writes it is the ER diagram's knowledge-type
  count links. Selecting a tab navigates to record the tab,
  that navigation re-emits the query parameters, and an absent `?space=` was read as *"go to the first
  space"* rather than *"no preference"*. It also reset the tab, because a changed space counts as a switch and
  lands on the space's Overview.

  The workaround people found works for a reason: the second click writes the same `?tab=` value, so no
  query-parameter change is emitted and the handler never runs.

  Fixed in the reader — the fallback to the first space is now reached only on the first pass, when nothing is
  selected yet. **Deliberately not fixed by writing the space to the URL**, which would also have worked:
  Ythril is frequently embedded in an iframe, and a page that rewrites its own address inside somebody else's
  frame is doing something the host did not ask for. A test asserts the space stays out of the URL.

- **A per-token rate limit above 300/min could not take effect, and the API said it had.**
  `rateLimitPerMinute` is a real per-token field with an instance ceiling, and its limiter has always been
  mounted. What was never moved is `globalRateLimit`: a literal `max: 300` on 171 routes, keyed on a **hash of
  the presented credential** — so it gave every token its own 300 bucket, and the real limit was
  `min(300, whatever you set)`. Granting a token 1 000 changed nothing while `GET /api/tokens` reported
  `rateLimitEffective: 1000`. Three different numbers for one quota.

  **The global limiter now steps aside once a credential is presented**, leaving the per-token quota as the
  only limit on an authenticated request — which is what that quota was built to be. It cannot wait for the
  token to RESOLVE, because it runs before authentication and the limit is a property of a record that has not
  been read yet; so the test is the credential, and both outcomes are covered: it resolves and the per-token
  limiter governs, or it does not and auth answers 401.

  **Nothing is now unbounded that was bounded before.** The global limiter never restrained a flood of
  *invented* credentials either — it is keyed per credential, so each new string already minted a fresh
  bucket. The per-IP flood backstop is what closes that, and it does not step aside for anything.

  **And nothing moves for anyone who granted nothing:** `DEFAULT_PER_MINUTE` was deliberately kept equal to
  the global limiter's max, so a token with no value resolves to exactly the number it used to be capped at.
  The cap only lifts where somebody explicitly asked for more.

- **The graph side panel showed a blank name for a memory or a timeline entry.** A graph node is one of four
  kinds, and since 3.6 a chrono entry, memory or file reaches the canvas through its `entityIds` link. The
  record card had no branch on `kind` and read `name` unconditionally — a memory has a `fact` and no name, so
  the first row rendered EMPTY and the fact, the only thing the record says, appeared nowhere at all. A chrono
  entry lost its `title` the same way.

  Every other field happened to share a name and rendered normally, which is why the card looked populated and
  nobody reported it.

  It now asks `memoryText` and `chronoText` — the same functions the linked-records list in the SAME panel
  already used, including their fallback to `description`. The divergence was the defect: one rule with two
  implementations, and the weaker one on the more prominent surface.
- **The link scans were unbounded AND unindexed, and following links from `recall` multiplied them.**
  `linkedRecordsAtFrontier` and `entitiesLinkedFromRecords` issued `.find().toArray()` with no `.limit()` —
  once per link class, per member space, per hop. The node cap did not help: it counts records after they are
  hydrated, so the read had already returned everything a hub entity is mentioned by.

  And `entityIds` was indexed on **memories only**. Chrono and files, whose `entityIds` the same scans read,
  had none — so two thirds of every such scan was also a collection scan.

  Latent while only the standalone `traverse` tool followed links. Live since `recall`'s expansion learned to:
  a depth-N call with all three flags on made up to 3N of those reads, against exactly the two collections
  with no index.

  **Each scan is now bounded by the walk's own cap** — the number already derived from `topK` and the byte
  budget — rather than by a new constant. Owner's decision: a second cap would be one rule with two numbers,
  and nobody would tune it. The bound is applied to the CURSOR, so the database stops early rather than the
  server discarding a tail it has already paid to fetch.

  **Existing instances get the index too.** `initSpace` only ever runs for a space new to the config, so the
  boot-time backfill widened in the same commit — an index added to space creation alone would have reached
  nobody already running the product.


### Internal

- **The graph side panel's record cards are their own components.** `graph.component.ts` was at its size
  freeze and every behaviour change tripped it; this pays 793 → 688 code lines, and the cards become testable
  without a cytoscape mock.

  **Two components, not one with a mode.** It was two cards, not one, and ~115 lines rather than the ~87 the
  task estimated: the node card and its near-twin for edges, which carries `weight`, shows endpoint rows with
  a fallback, labels its first row `relation` rather than `name`, and has no unavailable branch. Unifying them
  would have changed behaviour rather than moved it. They live in one file so the divergence stays visible.

  **The style rules moved with the markup**, which is the half no test can see: a parent's styles are scoped
  to the parent's own template, so markup moved into a child renders unstyled — and `.record-card`'s
  `flex: 0 0 50%` is what makes the panel two columns. It applies to `:host` now, because the host is the
  element the parent lays out.

  Nothing about what the cards render changed: the characterization spec added just before this went through
  **unedited**, which is the only evidence a template move can offer.

- **The graph side panel's record cards are rendered by a test for the first time.** Preparation for splitting
  them out of `graph.component.ts`, which sits at its size freeze — and the repo rule is characterization
  tests first, proven against the original code, because a template move is exactly the change that silently
  loses a binding.

  An inventory of the two cards found **167 rendered things and DOM coverage of none of them**: the four
  assertions that touch the card at all are signal-level, and neither card's populated branch had ever been
  rendered. The new spec pins the field order, the per-row guards (an empty `properties` object hides its
  row; a `weight` of **zero** still shows), the tag chips, the untranslated `_id` label, the date format, and
  the edge card's endpoint fallback — which reads a different signal from the rest of the card. Five mutants
  covering the likeliest move-damage all die.

  **Three assertions pin a defect on purpose**, named as such so the extraction can neither quietly fix nor
  quietly keep them: a memory or chrono node renders a blank name row and never shows its `fact` or `title`;
  a file node renders the unavailable message and the loading row together; and a synthetic edge shows
  loading for ever, because only the node card reads `recordUnavailable()`. Filed as G-5 and G-6.


### Fixed

- **`recall`'s and `find_similar`'s three link flags were refused by MCP while REST accepted them.**
  `includeChrono` / `includeMemories` / `includeFiles` shipped inside the `traverse` object and worked over
  REST, but both MCP tools still declared `{depth, edgeLabels, direction}` with `additionalProperties: false`.
  The dispatcher validates `inputSchema` with Ajv **before** the handler runs, so an MCP call carrying any of
  them was refused outright — while the byte-identical REST body answered 200 with the expanded graph.

  The tools' own descriptions told callers to send exactly that object. A schema description is what a caller
  reads *while constructing arguments*, so the authoritative reference documented a call its own guard
  rejected — the worst form of this, because nobody reports a capability they were told they had and could
  not use.

  **The schema is now built from `TRAVERSE_OPTION_FIELDS`**, the same list `parseTraverseOption` refuses
  unknown keys against, by one `traverseOptionSchema(maxDepth)` shared by both tools. It was spelled out
  inline twice, which is how the two came to disagree with the parser and would have let a fix reach `recall`
  and leave `find_similar` behind. `additionalProperties: false` is kept: `limit` is still refused there, on
  purpose.

  **The gate that should have caught this asserted the flags appeared in the DESCRIPTION**, which they did.
  Prose about a schema decides nothing; the replacement exercises the compiled schema and derives what it
  expects from the parser's own field list, so a fourth key cannot reach one surface and not the other.

### Changed

- **An edge whose identity changes now takes the id that identity derives, so peers converge on it.**
  An edge's `_id` is `uuidv5` over `(from, to, label)` — two peers creating the same relationship arrive at the
  same id without talking, and the sync collision is an idempotent no-op instead of a duplicate key. Mongo's
  `_id` is immutable, though, and two paths change what an edge IS: an entity merge relinks an endpoint, and
  `PATCH /edges/:id` accepts a new `label`. Both wrote in place, leaving the edge under an id its own identity
  no longer derived — so the next peer to create that triplet derived the correct id, inserted, and hit the
  unique index. The defect the derivation removes, surviving on the two paths that matter most.

  **This changes a response.** A label patch answers with a **different `_id`**, and the id you sent 404s
  afterwards; the same happens to an edge whose endpoint moves in a merge. Read the id back from the response
  rather than reusing the one you sent. Every other field still patches in place. Both doors and the
  integration guide say so — a response shape that changes with no surface stating it is the quietest kind of
  breaking change, because the call succeeds and the caller's *next* request is the one that fails.

  Delete-and-insert on a synced collection needs two things, and `rekeyEdge` (`brain/edge-rekey.ts`) owns both: a real tombstone for
  the old id, and an insert `seq` taken **after** the tombstone's, so a peer that pulls the delete and stops
  picks the edge up on its next cycle instead of being left with neither id. `renameFileMeta` was named in the
  source as the model for this and is not one — it writes no tombstone and no new seq, on the stated grounds
  that file meta is best-effort and disk is the source of truth.

  An identity that is already taken is refused with `409 edge_identity_taken` on REST and the same message on
  MCP, rather than surfaced as an index violation. Entity merge resolves that case itself, and its duplicate
  detection now keys on the same derivation instead of a `from|to|label` string — which was ambiguous the
  moment a label contained the separator, and would have reported two genuinely distinct relationships as
  duplicates of each other.

  **One case deliberately does not move: an edge this instance did not author.** A peer only applies a
  tombstone issued by the document's own author — the rule that stops one instance deleting another's
  content — so a tombstone we issue for a peer-authored edge is silently dropped while the insert propagates,
  and the peer would hold both rows. Re-stamping the tombstone with the original author does not help either;
  it then fails the delivering-peer check as cross-instance delete forgery. So such an edge keeps its id and
  is relinked in place, exactly as before, and the documented limit is narrowed rather than removed. Lifting
  it needs a tombstone that names its successor and is applied as a move, which is a change to a sync contract
  two other parties consume and is not smuggled in behind a bug fix.

### Added

- **`recall`'s graph expansion can follow links, not only edges.** Two records can be related two ways: a
  stored **edge**, or the `entityIds` field a memory, chrono entry or file carries naming what it is about.
  The standalone `traverse` tool has followed both for two releases. `recall`'s expansion followed edges
  alone, so in a space whose relationships are mentions rather than edge records — which is most spaces,
  because mentions happen automatically and edges are written on purpose — `recall(traverse: n)` returned an
  empty graph. Not an error and not a warning: the graph simply looked empty, which reads as a statement
  about the data.

  Three flags, inside the `traverse` object, on both doors:

  ```json
  { "traverse": { "depth": 2, "includeChrono": true, "includeMemories": true, "includeFiles": true } }
  ```

  **All three default to false**, so no existing response changes. That is a decision rather than caution: a
  recall caller asked for semantic matches, expansion is decoration on them, and the answer is budgeted — a
  match is counted together with its whole `_graph` subtree, so every record admitted by default would be
  paid for in matches that no longer fit. The standalone tool defaults `includeChrono` on because its caller
  is explicitly exploring a graph rather than searching.

  A linked node arrives carrying `kind` (`chrono`, `memory` or `file`) and the fields that say what it is —
  never file chunk text, which is the largest thing the product stores and is not what a structural walk is
  for. The reaching edge is **synthetic**: id `<label>:<from>:<to>`, label `chrono.entityIds` /
  `memory.entityIds` / `file.entityIds`, and no `author`, `createdAt` or `seq`, because a derived edge has
  none and inventing them would put fabricated timestamps in a response. `edgeLabels` filters them exactly
  like any other label.

- **A non-entity recall match is no longer a dead end.** An edge's endpoints are entity ids, so a memory,
  chrono entry or file that matched semantically had nothing to follow and came back with an empty `_graph`
  at any depth. Both doors documented that and told the caller to lift the `entityIds` off the match and
  traverse from one of those by hand — which is a query, performed by the caller because the server declined
  to make it. With the matching flag on, the walk now starts from the entities the match names: they are hop
  1 and everything an edge reaches from there is hop 2.

  The docs that carried the limit, and the gate that pinned those sentences, are gone. That gate was written
  to fail the day the limit was lifted, and it is worth recording that it did not: its probe was the literal
  collection name inside `traverseFromSeeds`, and the scan had moved into a shared helper, so it passed while
  enforcing a warning that had become false.

- **A space can now restrict which memory TYPES it accepts.** Declaring one or more `typeSchemas.memory`
  entries makes those names the allowed set, exactly as it already did for entities, edges and chrono. A space
  that declares none is unchanged and still accepts any string, so this can only newly refuse a write in a
  space that explicitly declared memory types.

  Three places already said it worked this way — the interface docblock and two integration-guide pages — so
  nothing in the documentation changed; the code caught up with it.

  **It needed a ruling rather than a fix, and the reason is worth keeping.** The absence was pinned as
  deliberate by a test, and the CHANGELOG carried a rationale: the memories tab's `type` control is free text
  with suggestions *because* the server accepted any string, since a closed select would have been "stricter
  than the API". Two shipped promises pointing opposite ways is a product decision, not a defect. Ruled on
  2026-08-30 — the UI argument was a consequence of the gap rather than a reason for it, and it inverts now
  the server constrains the type.

  So both memory type controls — the create form and the record drawer — become a **select** where a space
  declares types, and stay free text where it does not. The column FILTER keeps offering declared types union
  the values actually present, so a record written before a schema change is still findable even though its
  type is no longer writable.

  The gate asks the question all four validators share rather than checking them one by one: a fifth record
  kind is covered on the commit that adds it, and a future removal has to remove all four together.

### Changed

- **What a "link" is now has one definition.** An edge is a record; a link is a *field* — a chrono entry,
  memory or file naming the entities it concerns in `entityIds`. Three readers scanned those collections to
  answer three different questions (what a graph walk reaches, what blocks a delete, what the ER diagram
  draws), each carrying its own copy of the collection name, the field, the projection, and the predicate that
  keeps file **chunks** out.

  Only the graph walk had that last one. Chunks share a collection with the file they came from and are told
  apart only by `parentFileId`, so a scan without it counts a forty-passage document forty times — and the
  delete guard and the ER diagram had no such predicate.

  **Latent, not live, and the distinction is the honest version:** the conversion pipeline never writes
  `entityIds` onto a chunk, so nothing was actually double-counted. But `updateFileMeta` sets `entityIds` on
  any filemeta record by id, chunk included, so it was reachable deliberately. One rule, three
  implementations, and the weakest of them deciding whether an entity can be deleted.

  `brain/link-adjacency.ts` declares the three classes and two query builders; all three readers go through
  them. No stored data, embedding or sync behaviour changes.

  The gate derives its subject from the declared collection names, so a fourth reader is covered on the commit
  that adds it. Two of its assertions had to be narrowed after over-reaching: reading `entityIds` in a
  *projection* is not re-deriving a link class, and `parentFileId: { $exists: false }` is a general
  "file, not chunk" test that four unrelated call sites are right to use.

- **All four schema validators took a `tags` parameter that none of them read.** `TypeSchema` carries
  `namingPattern`, `propertySchemas`, `retention` and `suppressEmbeddings` — nothing about tags — and the
  space-wide suggestion list was retired two releases ago. Seven files did work to fill the parameter anyway,
  building and merging tag arrays on write paths so they could be passed to functions that forwarded only
  `properties`.

  Removed, and the compiler is the check: it named all twelve call sites, and an object literal carrying
  `tags` will not typecheck again.

  **A gate was holding it in place on a rationale that had never been true** — it required the merge path to
  pass `mergedTags`, "because a type schema can constrain them". That assertion is now reversed, with the
  reason. A gate preserves a dead parameter exactly as well as it preserves a live rule, and its message is
  usually the only place the reason is written down; when the reason is wrong, the gate is what stops anyone
  noticing.

- **`validateMemory`'s docblock now says the type allowlist is disputed rather than silently disagreeing with
  three documents.** The interface docblock and two integration-guide pages state that the keys of
  `typeSchemas.memory` are the allowed type values; the code only ever uses `type` to look one up. That looked
  like a documented-but-unimplemented feature until the reason for the asymmetry turned up: the memories tab's
  type control is free text with suggestions *because* the server accepts any string, and a closed select would
  have been stricter than the API. Two shipped promises pointing opposite ways is a product decision, not a
  defect, so it is filed for a ruling and the code now says where.

### Changed

- **Raising a god-file's ceiling now owes a decomposition task.** Owner's rule, 2026-08-30. The ratchet in
  `no-new-god-files.test.js` already made growth visible; it did not make anybody answer for it, and a raise
  with a good reason and no follow-up is how a file reaches four figures one defensible increment at a time —
  every step justified, the total justified by nobody.

  Every `RAISED a -> b` now carries either `DECOMPOSE: <ID>`, naming a queued task, or
  `NO DECOMPOSITION: <reason>` for a file where splitting is not the answer — a type file grows with the
  domain it types, and a 343-line page is not a god file. The reason lands in a diff a person reads, next to
  the number it excuses.

  **The check is split across two gates deliberately.** The standalone one proves a marker exists; it cannot
  check the id, because `todo/` is gitignored and absent in CI. `todo:check` proves the named task is actually
  open. Neither is a weaker copy of the other — a `DECOMPOSE: G-9` naming nothing would satisfy the first on
  its own, which is exactly the shape of promise this repo keeps finding.

  Applying it to the six existing raises queued two real ones: the 1 999-line file manager, and the files
  router whose bodies are inline — the shape `api/spaces.ts` already paid down from 851 to 589 by moving two
  route bodies out and keeping their mount points.

### Fixed

- **Tapping a chrono, memory or file node in the graph no longer opens an empty panel.** Every node tap called
  `getEntity`, so any node that was not an entity issued a request that 404s. It is caught, so nothing broke
  visibly — the panel simply opened blank, with no indication that anything had been asked for or refused.
  The same for a synthetic edge: derived from a link at render time and stored nowhere, so `GET /edges/:id`
  could never answer.

  That was unreachable until the synthetic-edge id collision was fixed; before it, chrono/memory/file links
  never reached the canvas, so nobody could tap one.

  A node carries its own `kind`, and the dispatch to the right collection already existed —
  `BrainApi.getRecord`, whose docblock says it is there so the mapping is not *"re-derived by every view that
  meets a typed id"*. What the tap path did not do was pass the kind along.

  **What cannot be fetched now says so, in all three languages.** A file's record is addressed by path and a
  graph node carries an id; a synthetic edge has no record at all. Both are facts rather than failures, and a
  blank panel reads as "this record has nothing in it" — a statement about the data rather than about what
  could be fetched.


- **The last seven copies of the write-validation rule are gone; there is one.** Moving the check into the
  writers left the doors holding a redundant second implementation — the memories and edges REST routes and
  all four MCP update tools each still ran `classifyUpdateViolations` on a merge they rebuilt themselves, and
  the `remember` tool validated the raw payload rather than the merged record at all.

  They were not merely redundant. Each rebuilt the merged record with `mergePropertiesOrKeep` and a throwaway
  `applyDeleteFieldsPaths`, twenty lines from the writer that does the real merge — and a simulation is the
  copy that drifts. One of them validated the wrong `type` on a re-type for months while the entity route
  next door did it correctly.

  Every one also performed its own read of the record first, purely to feed that check. Those reads are gone
  too: a lookup per update that nothing used, which is the cost the `onValidation` callback exists to avoid.

  Nothing about the MCP failure shape changes — `assertUpdateAllowed` threw exactly the error the writers now
  throw, and the router already converts it, with a strictly larger body than the tools were assembling by
  hand.

  **Four gates asserted the old arrangement and are re-pointed rather than loosened.** Three had inverted:
  they required a door to CALL a classifier, which is now the defect. The fourth pinned the re-typing rule to
  the doors' hand-built comparison; its property — that the after-state is validated against the type the
  record will have, while the before-state stays on the stored one — is unchanged and now asserted at the two
  writers that own it.

  Two intermediate drafts of those gates accepted a door that merely mentions the refusal, which is true but
  insufficient: an MCP tool needs no translation at all, so the tidiest doors mention nothing and were
  reported as failures for it.

- **Read-modify-write against `/api/admin/media-config` now works.** The GET returns the resolved
  `documentProcessing` block and the PATCH schema is `.strict()`, so seven keys it emits and does not accept —
  `maxTotalPages`, `vlmModel`, `vlmBaseUrl`, `repairModel`, `repairBaseUrl`, `verifyModel`, `verifyBaseUrl` —
  made sending the block back a **400 on the whole body**. Reading a config block, changing one field and
  putting it back is the ordinary way to use an API like this, and it did not work for any caller.

  This needed no new mechanism. `SERVER_OWNED_MEDIA_PATHS` exists for exactly this shape and the route's own
  docblock says so; three `faceRecognition` fields were declared that way and the seven document ones never
  were. Declaring them gets both directions right at once: send back the value you were given and it is
  stripped, so the rest of the patch applies; send a **different** value and you are refused, with prose
  naming where that field actually is set. Quietly ignoring an attempted change would have been the
  silent-acceptance defect this API is trying to shed.

  The check derives its subject from the resolver rather than from a list of seven, so the next `DOC_*` model
  slot is covered on the commit that adds it. The declaration table moved into its own module — the route file
  was at its size ceiling, and a paths-and-prose table is a declaration rather than route logic.

- **A CI hook recorded as an intermittent flake for two days was a deterministic API round-trip defect.**
  `GET /api/admin/media-config` returns the RESOLVED `documentProcessing` block — seven keys more than the
  patch schema declares — and that schema is `.strict()`, so PATCHing the block back is a **400 on the whole
  body**. Two integration `after` hooks read the block and handed it back verbatim, so the restore never
  landed and the instance kept whatever the suite's last write left.

  It looked intermittent because the verify compares the read-back value against the one it wanted: when an
  earlier suite happened to leave the instance on that same value, a failed restore was invisible. It failed
  only when they differed, which depends on suite ordering rather than on time.

  The instrumentation added after the first occurrence is what closed it — the message went from *"verify
  still false after attempt 4"* to a re-read showing a `200` and an unchanged value, which is a different
  fault from a PATCH that never arrived.

  Both hooks now filter to the keys the schema accepts, and a gate derives that key set from the schema
  itself, so a key added there and not to the filter is caught as well. The API-side defect — that
  read-modify-write against this endpoint does not work for any caller — is filed separately.

- **Seven of the eight brain writers did not validate; now all eight do, inside the function that touches the
  collection.** The owner ruled on 2026-08-29 that every upsert, update and insert validates. `upsertEdge` had
  been fixed for a specific caller (#1046); the other seven — `upsertEntity`, `updateEntityById`, `remember`,
  `updateMemory`, `createChrono`, `updateChrono` and `updateEdgeById` — enforced nothing of their own. The rule
  lived in copies at the doors instead: the REST routes, the MCP tools and `bulk.ts`.

  **That is not a tidiness argument, and the copies had already diverged.** `bulk.ts` blocked on *any*
  violation with no `preExisting`/`introduced` split, so the same upsert was refused through `/bulk` and
  accepted through `/entities`. The two PATCH routes each *simulated* the merge — rebuilding the merged
  properties and re-applying `deleteFields` to a throwaway object — twenty lines from the function that does
  the real one, and the simulation could not see a `deleteFields` that removed a required property. And
  `updateEdgeById` accepts a new `label`, which selects a different type schema entirely, so an edge could be
  moved onto a label whose rules its stored properties break.

  **Memory had no classifier at all** — entities, edges and chrono each had one and memory never did, so both
  memory doors validated the incoming payload rather than the record the write would produce. A required
  property present on the stored record and absent from a converging write read as a violation the merge would
  have supplied.

  Each writer now validates the merged record *after* `deleteFields` is folded in, branches on the
  classification's `blocked` verdict rather than on the presence of violations, and hands the classification
  back through `onValidation` so a door never re-derives it for presentation — which would be a second lookup
  per write, and is how the rule came to be written six times.

  Removing the door copies left the three record-loading classifier wrappers with no callers, and deleting
  them broke a runtime import cycle that adding the checks had just created — `write-validation` had imported
  `getEntityById` back out of `entities`.

  **Sync is deliberately untouched.** It writes the collections directly and records violations rather than
  refusing them, because refusing a peer's document would wedge replication rather than fix it.

  The gate asserts the property over all eight writers rather than the fix over seven, so a fifth record kind
  is covered on the commit that adds it. It was written first and was red on 21 assertions.

### Changed

- **Everywhere the product promises whole records, it now also says what that costs.** A budgeted search
  counts one match *together with its entire `_graph` subtree* as the unit that has to fit, and refuses to emit
  a partial one — so a match with a large subtree can push later matches out of the answer entirely. They are
  absent, not shortened.

  The obvious alternative is to budget the bare matches first and attach subtrees to whichever survive. Ruled
  against on 2026-08-30: the guarantee is what the product promises in nine places, including the UI in
  English, German and Polish — *"never a record missing part of its graph"* — and a record arriving with half
  its relationships is a worse answer than a shorter list of complete ones.

  What was wrong was not the behaviour but the silence. All nine places stated the guarantee and none stated
  its price, so an operator whose hundred-match search returned eleven records had nothing connecting that to
  the expansion depth they had asked for. Each now says it, in the same paragraph as the promise rather than
  elsewhere on the page, and in the reader's own language.

  The gate derives its subject from the promise itself rather than from a list of nine paths — a hardcoded
  list is a tenth place waiting to happen, and the derivation immediately found three surfaces that were not
  in the original count (`api.types.ts`, `brain-api.service.ts` and the MCP tool description). It also caught
  that the `maxBytes` parameter row is duplicated verbatim in `04a-recall-api.md`, so only one of the two
  copies had been updated.

### Fixed

- **Turning suppression on now removes the vectors already stored, which is what the product said it did.**
  `docs/userguide/02-brain.md` states it in the present tense — *"What it does is remove the record's
  embedding, not hide the record"* — and it did not. The eleven write paths consult the flag, so a record
  written *after* it was set never gets a vector; nothing ever looked at records that already existed, and
  they kept competing on meaning indefinitely. A promise the product makes and the code does not keep is a
  defect rather than a missing feature, which is what settled the direction. The same page is precise about
  the other way round — *"Turning suppression off does not go back and embed what was written while it was
  on"* — so only turning it on changed.

  **The sweep is unconditional rather than a diff of what newly became suppressed**, and that distinction is
  the whole value. Because nothing ever swept, a type whose schema has carried `suppressEmbeddings: true` for
  months still holds vectors for every record written before the flag was set — the population the defect
  actually created. A before/after diff would skip exactly those and heal only spaces that happen to be edited
  twice. The rule is a state, not an event: after a meta write, nothing suppressed still holds a vector. It
  converges the backlog on the next meta write of any kind.

  **It is local and takes no seq.** The vector does not replicate — `api/sync/docs.ts` strips `embedding`
  before sending in all five places, because it is derived and a peer may run a different model. So each peer
  performs its own sweep when the meta reaches it, and bumping seq would replicate a no-op and re-send whole
  documents for a field the other side never receives. Any queued embed job for a swept record is cancelled in
  the same pass: the worker would otherwise write the vector straight back within seconds, and it would look
  as though the sweep had not run.

  The three tiers are `record > schema > space`, and the two `false`s do **not** mean the same thing: at the
  record tier `false` means "not stated" and falls through, while at the schema tier it overrides the space.
  Both directions are asserted, because conflating them would either spare every record anybody had ever
  explicitly un-suppressed or sweep a type whose schema deliberately opted out.

### Changed

- **Two peers that independently create the same relationship now agree on its id.** An edge's `_id` was
  random (`uuidv4`), while the collection carries a unique index on `(from, to, label)` — so the relationship
  itself could only ever be stored once, and what happened instead was that each peer stored it under a
  *different* id. Sync then exchanged them and the receiving insert violated that index: one relationship, two
  identities, and a duplicate key on every cycle. The id is now derived from the triplet, so both sides arrive
  at the same `_id` without talking and the collision becomes an idempotent no-op.

  **`spaceId` is deliberately not part of the key**, and this is the subtlety worth keeping. It is the obvious
  thing to include, and the plan document still spells it that way — but `sync/space-map.ts` lets the same
  logical space live under a different local id on each peer, so a key including it derives *differently* on
  the two sides. That reproduces the exact defect, and reproduces it precisely on the networks that configured
  aliasing, where it is hardest to see. The collection is per-space already: the space is in its name.

  The parts are length-prefixed rather than joined with a separator. A label is operator-supplied text, so
  `('a|b', 'c', 'd')` and `('a', 'b|c', 'd')` would otherwise produce one key for two genuinely different
  relationships — colliding under the unique index while being distinct.

  **Existing edges keep their ids and there is no migration**: a derived id only has to be agreed on by peers
  creating an edge from now on, and rewriting stored ids would mean a tombstone and a re-insert for every edge
  in every space to fix a collision that is already handled.

  **One stated limit, pinned by a test rather than left implicit.** Mongo's `_id` is immutable, and two paths
  mutate an edge's identity in place — a merge relinks by setting `from`/`to`, and a patch may change `label`.
  After either, the stored id no longer equals its derivation, and that edge behaves exactly as every edge did
  before this change: no worse, just not yet better. Re-keying it means delete-and-insert on a synced
  natural-key collection, which has to reason about the tombstone the delete leaves behind — its own work.

### Added

- **Every model slot's call budget is now operator-settable.** Only the document pipeline ever was: an
  operator could set `pageTimeoutMs`, `ocrTimeoutMs` and `describeTimeoutMs`, and nothing else. The other ten
  model calls each carried a literal — two exported constants in the media providers, one in the face
  detector, bare `AbortSignal.timeout(20_000)` in the NLI and rerank clients, `30_000` in the embedder, and
  `?? 60_000` repeated **five times** in the document VLM client. Ten slots, four mechanisms, none reachable
  without a rebuild. Reported by the canary operator, who asked why they could not configure the vision
  deadline.

  `modelSlots.<slot>.timeoutMs` sets it, for any of `vision`, `stt`, `embedding`, `rerank`, `nli`, `assist`,
  `docVlm`, `docRepair`, `docVerify`, `faceExternal` — the same ten names the per-slot egress permissions
  already use, reused rather than duplicated. Settable through `PATCH /api/admin/media-config` and pinnable
  per slot with `YTHRIL_PINNED_FIELDS=modelSlots.vision`. **Every default is unchanged**, so this ships no
  behaviour change on its own: a change that made budgets configurable *and* moved them would make any
  resulting regression impossible to attribute to either half.

  **Raising a budget raises the stall floor with it**, and that is the half that would have turned a feature
  into a defect if it had been missed. The media stall detector re-queues a job that reports no progress, and
  a single long call reports nothing while it runs — so it is fed the *configured* value. Fed the constant, it
  would have kept protecting the default while the operator's larger value ran unprotected, and a call longer
  than the stall timeout is re-queued mid-flight, abandons its work, and reaches the same call again. That is
  the loop the stall floor exists to prevent, re-armed by the control meant to help.

  **Deliberately no environment variable.** Every setting that had both an env var and an admin field turned
  out to have two different legal ranges, and the fix for that shipped the same day; adding ten more dual-door
  settings on top of it would be re-opening the hole. `YTHRIL_PINNED_FIELDS` already gives infrastructure what
  it needs — it can fix a slot at whatever the config resolves to, which is the actual requirement.

  One resolver, in a module that imports nothing: the budgets are read from the config loader, from two brain
  clients, from the media providers and from the document converter, several of which the loader itself
  imports, so anything it depended on would close a runtime import cycle.

### Fixed

- **A mistyped `MAX_FILE_SIZE_BYTES` removed the media file-size limit instead of raising it.** The media
  config's own reader coerced every numeric environment variable with a bare `Number(envRaw)` and checked
  nothing, so `1O24` became `NaN` — and `dispatch.ts` asks `input.bytes > maxBytes`, where every comparison
  against `NaN` is false. `??` cannot rescue it either, because `NaN` is not nullish. Five settings were read
  that way: `WORKER_CONCURRENCY`, `WORKER_POLL_INTERVAL_MS`, `WORKER_MAX_POLL_INTERVAL_MS`,
  `MAX_FILE_SIZE_BYTES` and `STALLED_JOB_TIMEOUT_MS`.

  **The gate that exists to prevent exactly this could not see them.** `numeric-env-is-validated.test.js`
  matches `Number(process.env[…])` as one expression; the reader assigns to a local first and coerces on the
  next line. One assignment between the two halves, and a registry documented as *"exhaustive by design"* was
  missing six settings. It now also checks the indirect spelling, scoped to the enclosing block so the four
  call sites that coerce and then guard with `Number.isFinite` are not reported — a gate that flagged those
  would push whoever fixed it toward deleting a real guard.

- **The same setting had two different legal ranges depending on which door it arrived through.** Nine are
  writable both by an environment variable and by `PATCH /api/admin/media-config`, and five pairs disagreed —
  in both directions:

  | setting | env door | admin door |
  |---|---|---|
  | `documentProcessing.ocrTimeoutMs` | 1 000 … 3 600 000 | 10 000 … 1 800 000 |
  | `documentProcessing.describeTimeoutMs` | 1 000 … 3 600 000 | 1 000 … 600 000 |
  | `embedding.dimensions` | 1 … 8 192 | 1 … 16 384 |
  | `embedding.embedConcurrency` | 1 … 256 | 1 … 32 |
  | `mediaEmbedding.rerank.candidateMultiplier` | unvalidated | 2 … 10 |

  `EMBEDDING_CONCURRENCY` shows why this is not merely untidy: **256 passed validation, was reported as
  accepted, and was then silently clamped to 32** by the code that uses it — the ceiling existing precisely so
  *"a typo cannot turn into hundreds of parallel requests"*. Validation that accepts a value the runtime will
  not honour answers the operator's question wrongly, which is worse than not answering it.

  **The documentation was already right on both counts** — the integration guide says *"Clamped to 1…32"* and
  *"2–10"* — so the env door disagreed with the API and with the page describing it, and only the door nobody
  compares was wrong. No documented range changes.

  Both doors now read one table, `config/setting-bounds.ts`. Whatever the runtime actually enforces wins;
  where nothing enforces it, the admin schema does, because that is the surface with the reasons written
  beside it. `embedding.dimensions` is recorded there as genuinely arbitrary rather than derived — nothing
  downstream constrains it and neither ceiling appears in the docs.

  `one-setting-one-range.test.js` derives the pairs from the two doors themselves rather than from the shared
  table, so a setting the table forgets is not invisible to the check of the table.

- **A record re-created after a peer deleted it could be refused for ever, silently.** The local seq counter is
  bumped past everything received from a peer — that is the stated reason it exists — but tombstones were left
  out of that bump on **both** ingest paths, while carrying the deleting instance's seq like any other record.

  ```text
  a busy peer  (counter 5001) deletes a record   →  tombstone, seq 5001
  a quiet peer (counter  300) receives it        →  counter stays 300
  the quiet peer re-creates it with the same id  →  local seq 301
  it pushes back                                 →  refused as `tombstoned`, with a 200
  ```

  The sender reads only whether the response was ok, so it advances past the record and never offers it again.
  One-directional, permanent, and invisible from either end.

  **Reachable today**, not a future risk: memories, entities and chrono all accept a caller-supplied id, which
  is exactly how a record comes back with the id it was deleted under.

  Both paths now bump — the pull folds the tombstone transfer's highest seq into the same `Math.max` as the
  four record families, and the receiving route bumps on what arrived. Over everything **received** rather
  than everything applied: a tombstone refused on authorship grounds still says where that peer's clock is,
  and the errors are not symmetric — advancing too far skips some numbers, not advancing far enough loses a
  record.

  The alternative was comparing the incoming `createdAt` against the tombstone's `deletedAt`. That would put a
  second clock beside the seq one; the counter is the clock the protocol already runs on, and it was simply
  not being wound forward by one of the five things that arrive each cycle.

- **A chrono create that converges onto an existing entry was validated against the wrong document.** Supplying
  an `_id` that already names an entry does not duplicate — it converges, and it stores
  `mergeProperties(existing, incoming)`. Both doors checked the incoming properties alone, so the document
  validated was not the document written, and it failed in **both directions at once**:

  - a required key present on the **stored** record and absent from the request read as a violation, and
    refused a converge with `400` that the merge would have satisfied;
  - a violating key already stored was never re-examined, so it survived a write that had every opportunity to
    notice it.

  Entities and edges have validated the merged form since their upserts were written, and both chrono *update*
  paths already did too. The rule existed three times and was missing from the fourth — this repo's most
  frequent defect in its quietest form: not a wrong implementation, an absent one.

  `classifyChronoUpsert` mirrors the entity and edge classifiers exactly, so a pre-existing violation is
  reported without freezing the record (the P-6 ruling) while anything the request introduces still blocks. On
  both doors the supplied id had to move above the check to be available to it.

  One mutant is the argument that matters: passing no id loads no existing record and degrades silently to the
  old behaviour — a call that reviews as correct and fixes nothing.

- **Neither door said that `recall`'s graph expansion cannot start from a memory, chrono entry or file.** Its
  traversal reads the edge collection only, and edge endpoints are entity ids — so a non-entity match comes
  back with an empty `_graph`, and raising `traverse` does not change it. A caller with a memory-heavy space
  asked for expansion, got empty subtrees, and had nothing to tell a correct answer from a broken one.

  The integration guide said *"only entities are returned by traversal … memories, chrono entries, and files
  still appear as seeds when they match semantically"* — which states what the walk RETURNS and then invites
  exactly the wrong inference from "seeds". The MCP schema said nothing at all.

  Both now state the limit, say **why** (those records hold their links in `entityIds`, a field rather than an
  edge), and name what does reach them: the standalone `traverse` and its `includeChrono` /
  `includeMemories` / `includeFiles` flags, which `recall` has no equivalent of.

  The gate checks the CODE as well as the words, so the warning cannot outlive the behaviour — if the seed
  traversal ever learns to read those collections, these sentences become false and the gate says so rather
  than continuing to enforce a stale caution.

- **Chrono, memory and file links were silently missing from the graph view.** A synthetic traverse edge
  carried the same `_id` as the node it points at. A graph library keeps ONE id namespace for nodes and edges,
  so cytoscape skipped the repeat — with a bare `continue`, before the path that would have thrown. Nodes are
  added before edges, so the node always won and the edge always lost. What an operator saw was a detached
  band of chrono bubbles floating above the graph, connected to nothing, with no console output and an edge
  count that overreported by exactly that many.

  **The rationale for sharing the id was the opposite of true.** It read: *"nothing has to invent an edge id
  that does not exist — a caller looking it up finds the chrono, not a 404."* `getEdgeById` queries the edge
  collection and nothing else, so that id `404`s on every edge-lookup path the product has; the one lookup
  that resolves needs an id the caller already has from the node. The affordance was never delivered — only
  the collision was.

  Synthetic edges now carry `<label>:<from>:<to>`, deliberately not a UUID: there is no stored edge behind one,
  and an id shaped like a real one invites the lookup that cannot work. Two seeds linking to the same target
  now produce two distinguishable edges, which is correct — they are two relationships, and they used to be
  one id twice.

  The integration guide stated the old promise verbatim to integrators and now states what is true, including
  that these ids are not fetchable. Two tests pinned the old id as contract and are reversed: the integration
  one now asserts the edge id collides with **no** node in the same response, and the standalone one checks
  each of the three loops separately — it matched anywhere in the file before, so a chrono-only fix would have
  kept it green.

  `Set` of node ids rather than inequality with one record, because the property that matters is uniqueness
  across the response.

- **`graphNodes` counted nodes the caller never received.** All four traverse-capable search endpoints —
  recall and `find_similar`, on both doors — reported the total the traversal *reached*, across every seed.
  But the byte budget then keeps only a prefix of the matches, and an evicted match takes its subtree with it,
  so the number always described a larger answer than the one sent.

  The integration guide already defined the field as *"how many traversed nodes came back"*, so the
  documentation was right and the code was wrong; nothing in the docs changed. Two integration tests already
  asserted the correct contract and passed only because their fixtures never truncate — true by luck of
  fixture size, and silent about it.

  Each site now counts its own emitted payload with `countGraphNodes`, which walks the structure and is
  therefore right for both doors' shapes by construction (REST puts `_graph` beside the match, MCP nests the
  match under `record`). It is the same function the spill file uses to describe itself, for the same reason:
  a count carried alongside a payload can describe a different set of records than the payload does.

  The gate pins that each endpoint counts *its own* envelope. Writing the fix, a blanket replace gave both
  endpoints on a door the same envelope name and one of them ended up reporting its sibling's count —
  TypeScript caught it only because the name happened to be undefined.

  The other half of this — that a large subtree can evict later *matches* — is not fixed here. The obvious
  remedy breaks a guarantee the product states in nine places, including the UI in three locales (*"never a
  record missing part of its graph"*), so it is a decision rather than a defect.

- **`suppressEmbeddings` was honoured on exactly one write path and ignored on ten others.** The flag is
  implemented *as the absence of a vector* — there is no read-time filter — so a stored vector is not an
  inconsistency, it is the feature not working.

  Only the embed QUEUE consulted it, and it carried a comment asserting that *"every writer of a vector reaches
  this function"*. It did not:

  | path | what it did |
  |---|---|
  | the four record creators | computed the vector inline for `waitForEmbedding` / `checkDuplicates` / `checkContradictions`, then skipped the enqueue — the only place the flag applied |
  | entity merge | re-embedded the survivor unconditionally and wrote it directly |
  | reindex, five collections | re-embedded every record in the space with no check at all |

  **It was the ordinary write, not an edge case.** `checkDuplicates` defaults to `true` on the MCP tools, so a
  plain `remember` or `upsert_entity` into a suppressed space stored a vector every time — and a reindex
  restored one for every record that had escaped.

  All eleven sites now resolve through one `embeddingSuppressedFor()`. The reindex projections were widened
  with it: they did not fetch `type` or either spelling of the record flag, so the check would have read
  `undefined` at every tier and suppressed nothing — a fix that looks right and does nothing. A reindex now
  reports `suppressed=N` beside `reindexed`, because zero re-embeds over a suppressed space otherwise reads as
  a fault rather than as a setting.

  The duplicate and contradiction checks do not run for a suppressed record. That is not a loss: every record
  of a suppressed type lacks a vector, so a neighbour search had nothing to find them with — it would have
  reported "no duplicates" over a space it could not see.

  The gate finds vector STORES from source rather than naming the creators — which is how the merge and
  reindex sites surfaced at all — and requires each file's checks to match its stores. It also requires a
  computed `suppressed` to be *read*: a mutant that left the check in place and ignored its result walked
  through the count, which is a check computed and discarded.

- **`propertySchemas` was documented as "RETIRED — consumed by nothing".** It is one of the most-read fields in
  the schema model and is consumed everywhere. An unclosed doc comment was the cause: the closing marker went
  out with the field it belonged to when `tagSuggestions` was removed, the opener stayed, and the next
  docblock down the file closed it — so the retirement notice landed on whichever field came after. It reached
  the emitted `.d.ts`, and an editor hover with it. A second, smaller instance sat above `strictLinkage`.

  **Every gate that reads these interfaces strips comments first**, correctly, because they are checking code —
  so a comment defect is invisible to the whole class of them by construction. And the file compiles, lints and
  parses; the only symptom is a reader believing the wrong sentence about the right field.

  A new gate reads comments on purpose and fails when a `/**` meets another before it closes. It looks for a
  **line-initial** opener specifically: block comments do not nest, so `/*` inside a comment body is prose, and
  the first version reported four correct files whose comments mention paths like `/api/sync/*`. A gate that
  fires on ordinary prose is one somebody switches off.

- **One duplicate relationship stopped a peer receiving any further edges, permanently.** An edge's identity is
  its `(from, to, label)` triplet, which is uniquely indexed, while its `_id` is random — so two instances
  creating the same relationship independently produce one relationship under two ids. The receiving upsert is
  keyed on the unknown `_id`, inserts, and the unique index rejects it.

  The **pull** side already absorbed that. The **push** side did not, and it is the worse half:

  ```text
  ingest lets E11000 reach the route          →  500
  sender breaks on !resp.ok BEFORE advancing  →  cursor held
  watermark caps at the last batch that landed
  next cycle re-sends the identical batch     →  identical failure
  ```

  That channel never advances again. In the batch case one duplicate anywhere in a 500-record page discarded
  the other 499 with it, every cycle.

  Both ingest paths now absorb a duplicate key and answer `200` — the local copy stands, the incoming one is
  not applied, and the caller is told which: `status: "duplicate"` on the single-record route and a
  `duplicateTriplets` counter in the batch stats, with the triplet logged. **Only duplicates are absorbed**;
  any other write fault still throws, because swallowing those would hide genuine corruption.

  The predicate handles both error shapes deliberately — a single `replaceOne` rejects with `code: 11000` while
  a `bulkWrite` collects them into `writeErrors` and the outer error carries no code at all, so a predicate
  knowing only one would re-throw the very thing it exists to absorb. A mixed batch, one duplicate and one real
  fault, still throws.

  This is the collision's *symptom*, not its cause: edges still get random ids, so duplicates are still
  produced. Making an edge's id derive from its triplet is a larger change with two open questions of its own
  and is filed separately.
- **Merging two people emptied the survivor's face gallery.** The merge relinked memories, chrono entries,
  edges and a file's `entityIds` — but not `faceEntityId`, the single-valued link on a face chunk. So after a
  merge those chunks still named the absorbed entity, which the merge then deleted; a label that does not
  resolve is silently absent from the gallery, so the faces simply stopped counting and **nothing anywhere said
  so**.

  The labels are now **moved to the survivor**, not cleared. That is the opposite of what a delete does, and
  deliberately: a delete means the person is gone so the labels are wrong, while a merge asserts the two
  records were always the same person — clearing them would look like a fix and discard correct biometric
  labels. `faceScore` travels with them for the same reason.

  **The gate could not have caught it.** It derived the record types it checks from the interfaces that
  *declare* `entityIds`, so a differently-named singular link was outside its scope by construction — and the
  one field fitting that description is the biometric one. Discovery is by shape now (any field ending in
  `entityId`/`entityIds`), and it asserts every such field per type rather than the plural one only.

  A behavioural test drives a real merge rather than reading the source, because a source read proves a
  decision was made and not that it is right. It also pins that an unlabelled face stays unlabelled, which is
  the failure mode of a too-broad filter.

  The face-recognition page now documents the label lifecycle for both paths; it described how labels are
  acquired and never what becomes of them.
- **Three of the four single-record sync routes stored a peer's record without checking it, while the batch
  path checked the same records.** `POST /api/sync/memories`, `/entities` and `/edges` answered `{ status: … }`
  with nothing computed; only `/chrono` reported. So whether a schema mismatch was noticed depended on **how
  many records the peer happened to send at once** — one rule, two implementations, the weaker one winning
  silently.

  This was a gap in the fix that introduced the check, not in the code it replaced, and it was invisible from
  three directions at once: the helper's own docblock claimed *"the single-record routes return them"* in the
  plural while one did; the gate windowed the `/chrono` route alone, so the other three sat outside every
  assertion; and `schemaViolations` appeared in no documentation at all, so no integrator could have reported
  the absence either.

  All four routes now attach violations through one `withSchemaViolations()` helper rather than four inline
  spreads — four copies of a rule written once is what produced the split. The gate **enumerates** the ingest
  routes from source instead of slicing to a named one, so a fifth is covered on the commit that adds it, and
  it fails if any route hand-rolls the attach-if-non-empty ternary again.

  `schemaViolations` is now documented on both shapes it takes: a per-type counter on `batch-upsert`, the
  violations themselves on a single-record ingest. It stays absent when empty, so a clean ingest's response is
  unchanged and a present field always means something to look at.
- **A long audio or video file could be re-queued while it was working, and then processed twice at once.**
  The media worker builds a heartbeat and a lease check and passed them **only** to the document pipeline. Two
  media steps are not one model call but N of them: audio transcribes one silence-delimited chunk at a time,
  and a keyframed video captions one frame per 30 s of footage with no cap. An hour of video is 120 captions —
  14 400 s inside a step reporting nothing, against a 270 s stall floor.

  **No timeout could have fixed this**: a hop budget bounds one call and the step is a loop of them. Both loops
  now report progress once per item, so a working job stops looking like a stalled one.

  **The second half is the one that corrupted rather than delayed.** Stall recovery clears the claim token and
  hands the file to another worker, and nothing in the media path polled the lease — so the first run carried
  on. Two runs transcribed the same audio into the same chunk ids, competing for the same model. Both loops now
  stop when their claim is withdrawn, and check *before* the call rather than after, so no run spends a full
  provider budget producing work another run is about to overwrite.

  Progress is reported in the `finally`, deliberately: a beat that fired only on success would go silent
  exactly when a provider starts failing — the moment the detector most needs to know the worker is alive, and
  the moment it would otherwise re-queue a job that is working correctly through a list of refusals.

  Audio and video consequently gain the file-manager stage bar they never had; the route is named by the
  caller, so a video's audio stage draws under the video's own segments instead of swapping the list halfway.

  The gate derives its subject — every `for` loop in the media path whose body awaits a provider call — rather
  than naming the embedders, and that is what found the audio loop: it was assumed to be local work and is not.

- **A provider fallback ran two model calls inside one step, and stall detection was told about only the
  longer one.** With `fallbackToExternal` on, the media worker calls the primary provider, catches, and calls
  the external one — in the same hop, with nothing reporting progress between them. `hopBudgets()` listed the
  two legs as separate entries and the stall floor takes the **maximum** of what it is given, so for audio:

  ```text
  real hop   300 000 + 300 000  =  600 000 ms
  floor      ceil(300 000 × 1.5) =  450 000 ms
  ```

  Two and a half minutes short. A long transcription reports no progress while it runs, so the sweep re-queued
  the job mid-call, the replacement reached the same call, and it was re-queued at the same point — the loop
  that never finishes, which the stall floor exists to prevent. Image captioning had the same shape and landed
  *exactly* on the floor, which is the indistinguishability the 1.5× head-room is there to buy.

  The budget is now composed by `providerHopMs()`, which reproduces the factory's own condition: a slot pointed
  straight at `external` builds no chain and is unaffected, so no floor rises for a hop that cannot happen.

  **The existing gate could not have caught this.** It enumerates timeout call sites and checks each budget is
  one the floor knows about — and every leg passed that individually. The blind spot was two *known* budgets in
  one step, which no list of names can express. The new gate asserts the composition rule instead, and fails if
  a third fallback wrapper is ever added without composing its chain.

  The integration guide's step table had the same error in prose, counting the legs as separate steps; it now
  carries the chained figures.
- **Seven routes answered `5xx` and threw away the exception that caused it.** The shape was always the same —
  `} catch (err) { res.status(500).json({ error: 'Internal error' }); }` — an error caught, named, and never
  read. The response body is generic on purpose, and the global handler in `app.ts` never sees an exception a
  route already caught, so **the failure existed only as a status code**: nothing in the caller's response and
  nothing in the server log. `POST /api/brain/spaces/:spaceId/entities` was among them, so an entity write could
  fail and leave no trace anywhere.

  Found from the outside. The canary operator got `HTTP 500` in 6 ms from `DELETE /api/tokens/:id`, asked for
  the cause twice over ten days, and when they finally captured the pod log for that exact second it held three
  unrelated OIDC warnings and nothing else. They built a hypothesis on the only evidence present — that an
  expired session answers 500 where 401 belongs — and it was wrong. **They were reasoning correctly from an
  empty log; producing the empty log was ours.**

  Each of those routes now reports the operation and the stack to the operator, while the response body stays
  byte-identical — a flat body is a leak-prevention property, not an oversight. The revoke route's own
  should-be-unreachable `500` reports too, and names the token id: a branch that cannot fire and fires anyway is
  the most valuable line a log can carry.

  A gate pins the class rather than the seven sites. Its rule is *reads its binding*, not *calls the logger*,
  because both discharges are legitimate — report it to the operator, or return it to the caller as
  `{ error: err.message, storageExceeded: true }` does — and a gate demanding a log call would push quota
  refusals into the error log. It also reads the enclosing **catch**, not the innermost block: a `504` written
  inside `catch (err) { if (err === SENTINEL) { … } }` would otherwise be reported as discarding an error it
  reads one line up.
- **The tracker gate reported "all open items indexed" while twenty-five were not.** Its own docstring has
  always said an item is *"a `### N. Title` heading or a `- [ ]` checkbox"* — and **only the checkbox half was
  ever implemented**. Two trackers written in heading style therefore contributed zero items, so the gate passed
  on files full of open work it could not see. A rule that is documented and unenforced is worse than one that
  is neither, because it is believed.

  It also matched references by **substring**, so `L-1` counted as indexed because that string appears inside
  `L-13`. In any series of ten or more, every single-digit id was covered by its own longer siblings — deleting
  L-1's row outright left the gate green. Matching is whole-token now.

  Both were found by asking whether a tracker was up to date, which the gate had been answering "yes" to for
  eleven days.
- **That fix landed on one of the two rules that needed it, and the other kept its old parser for a day.**
  Rule 3 — *"every open item says how to verify it is still open"* — split trackers on `- [ ]` only, six lines
  below the rule that had just learned about headings. So it covered **one item out of eleven**: its tick meant
  "the single checkbox item in `ARCHITECTURE-TODO.md` has a verify line", and the two heading-style trackers
  holding the other ten were exempt by formatting alone.

  That is the defect this codebase produces most — one rule, two implementations, the weaker winning silently —
  arriving inside the script whose job is to catch bookkeeping drift. Both rules now share one `openItems()`,
  which is the extraction the repo's own convention asks for the second time you write the same rule. Rule 3
  went from 1 item to 11 and immediately found four with no verify line at all.

  **A queue row can also point at nothing, and neither end was checking.** Rule 2 runs tracker → index; nothing
  ran index → tracker. `W-3` had sat in the ordered list naming a home file that never contained a W-3 — its
  section was destroyed by a 2026-08-13 cleanup whose backup went to a path that did not exist, and its id was
  later reused by an unrelated record, so grepping the folder found a hit and the row read as anchored. A
  phantom row can never drain, which matters because the release gate is *"cut the tag when the queue is
  empty"*. The new rule 2b resolves every row against the home it names.

  **What none of this fixes, and it is the bigger half.** Every "is this done" check in the gate reads the
  row's own status text — a vocabulary match on `SHIPPED|CLOSED|RESOLVED|DONE`, or an item that describes
  itself as a watch. That text is written by the same pass that would have had to notice the row was finished,
  so it can never be independent evidence. Five rows announcing completion as `✅ BUILT` and one as `- [~]`
  passed every check, and the fix history above is four rounds of widening the word list. A green
  `todo:check` means the folder is internally consistent — never that the statuses are true.
- **A `Verify:` line is now checked, not just required.** The rule demanding one has always said its evidence
  is *"mechanically checkable"*; nothing ever checked it. Each line now parses into `grep -c "<literal>"
  <one file>` returns `<N>`, and the gate evaluates it: a line that DISAGREES with the tree is reported, and so
  is one naming a file that no longer exists — never folded into "0 matches", which would let
  `grep -c foo deleted.ts returns 0` pass for ever from the moment the file was deleted.

  **Nothing is handed to a shell, and the pattern is refused rather than interpreted.** Preflight reaches this
  through node, and Windows has no `grep` on PATH; the same line tokenizes three ways in bash, cmd and
  PowerShell; and `todo/` is gitignored and reviewed by nobody, so executing a string out of it would make a
  working-notes file an execution surface in the gate that runs before every push. Matching the pattern
  literally instead has a quieter failure: measured on this tree, `grep -c "^export" server/src/brain/edges.ts`
  answers **24** in a shell and **0** as a literal, and the divergence runs toward 0 — which is what every
  clause in the corpus asserts. So a pattern containing `^ $ . * [ ] \` is REFUSED with the character named.
  `( ) { } | + ?` are accepted, because they are ordinary characters in a basic regular expression and
  rejecting them would push authors toward vaguer patterns that match their subject's neighbours. All nine
  live clauses were cross-checked against real Git Bash `grep` and agree.

  **The manual escape hatch is capped at three, dated, and lives in the tracked script** rather than beside the
  item — `todo/` is reviewed by nobody, so a reason written there costs nothing, while a row in the script
  lands in a diff. Entries expire on a date no more than 120 days out, and a stale one fails rather than warns.

  **The tick says "its stated evidence still holds", not "it is still open"** — and that is the honest bound.
  The two differ whenever a fix lands somewhere other than the file the row names, which here is the usual
  shape, because the convention is to extract. `L-4` named `api/contradictions.ts`; its fix went into
  `brain/edges.ts`, and that file is byte-identical from #1041 through HEAD, so every clause faithful to the
  row's own words would still have said "holds" four days after it shipped. Six of the eight stale rows were
  fix-in-place and would have been caught; two were extractions and would not.

  Also: rule 4 caught its own `git log` and left the result empty, so a git failure was indistinguishable from
  a pass — the gate's one independent check printing green having compared nothing. It fails now, and both git
  calls carry a timeout.
- **A property `default` did nothing at all.** It was declared in the schema interface, documented in the
  integration guide, and editable in the settings UI — and **read by nothing in the entire server**. An operator
  could set one, save it, and it silently never applied, with no hint that it had not taken.

  A declared default now fills a property the caller omitted, **before** validation — a property that is
  `required` *and* defaulted must not be a violation, since the default is what satisfies the requirement. It
  never overrides what the caller sent, including a falsy value, and `0` and `false` are applied like any other
  default rather than being dropped by a truthiness check.

  **On insert, not on update**, deliberately: on an update an absent property may be one `deleteFields` has just
  removed, and filling it from the default would silently undo a deliberate deletion.

  The defaulted document is also the one **stored**, not merely the one validated — filling defaults and then
  writing the caller's untouched input is the same shape as the memory-upsert defect, so a gate pins it.
- **Sync had one schema check across five ingest paths, and it was in the wrong place doing the wrong thing.**
  Records arriving from a peer went into `memories`, `entities` and `edges` with **no validation at all**, on
  either the single-record or the batch path. The only check anywhere was the chrono type allowlist, on the
  single-record route — so it covered one field of one record type, sat on the path a peer barely uses (a sync
  cycle ships records in batches), and **refused** with a `400`.

  Owner's ruling (P-21): import, restore and sync **validate, let everything in, and hand back a list**.
  Refusing is worst here, because a peer validated those records against ITS schema, which may differ from
  yours — discarding data the sender believes it delivered is not the receiver's call.

  **A schema mismatch and an unreadable record are different things**, and the first pass conflated them: the
  chrono vocabulary check went out with the property check, so a chrono whose `type` is outside both the
  product's own set and anything the space declared would have been stored — meaningless to every reader, and
  `IncomingChronoDoc` types that field as any non-empty string, so nothing else would have caught it. That check
  is a refusal and stays one, now on **both** paths rather than only the single-record one, which was the
  original disagreement.

  So all four types are now checked on both paths, a schema mismatch is never refused, and the count comes back
  in the response: `schemaViolations` on each per-type stat from `batch-upsert`, and beside the stored document on the
  single-record routes. **The count is the point** — the ruling's own stated cost was that a report nobody
  reads is the do-nothing option with extra steps.

  Relaxing the `400` is safe from the sender's side: a record that was rejected is now accepted, so no peer
  breaks and more data flows. A clean ingest's response is unchanged byte for byte, since the field is absent
  when there are no violations.


- **A space that declared an edge-label allowlist would have lost its contradiction machinery.** Now that
  `upsertEdge` validates, no caller reaches the collection around the schema — including `api/contradictions.ts`,
  which writes `supersedes` when a reviewer resolves a contradiction. A space whose allowlist did not happen to
  name that label would have started refusing, **punishing exactly the operators who took the schema seriously**.

  Owner's ruling: server-written labels are subject to the allowlist, and the allowlist is correct **by
  construction**. Shipped in the form that needs no migration — `SERVER_WRITTEN_EDGE_LABELS` is permitted
  without being named, rather than seeded into each new space, because seeding leaves every existing space wrong
  until a backfill runs.

  **Only the label is given, not the record.** A declared type schema for a server-written label is still
  enforced, and a gate refuses the version of this change that turns the exception into an exemption.
- **A `strict` space now refuses a merge whose survivor would violate its schema**, exactly as it refuses the
  equivalent direct write. Owner's ruling: a space set to strict has said it wants refusals, and this was the
  one write path that ignored it.

  It shipped as report-and-proceed first, deliberately, because the trade is real — `automerge` runs unattended,
  so refusing leaves the duplicates it exists to resolve. `warn` mode is unchanged and still reports without
  refusing; the space's own `validationMode` decides, so nothing changes for a space that asked only to be
  warned.

  **The refusal is typed, and the automerge caller distinguishes it from a fault.** A deliberate refusal
  reported as *"Auto-merge failed"* would turn the ruling into an error nobody investigates, so the log now
  names the rule that refused and the two records that remain separate. That was the stated cost of this option
  and it ships with it, not after it.

  Refusing is safe at this point because everything before it runs inside `session.withTransaction` — the
  relinked edges, the rewritten references and the survivor's update roll back together. A refusal that left
  half a merge applied would be worse than the violation it prevented.


- **The face pipeline wrote entity references that `strictLinkage` never checked.** `assertRefsResolve` sat
  only at the two API doors, so the promise that a stored reference resolves held for callers who remembered it
  and not otherwise. `files/media/face-embedder.ts` calls `updateFileMeta` directly to write an auto-labelled
  face's `entityIds`, and was never checked — the id comes from a live match so it resolves in practice, but the
  guarantee was structural in name only.

  `updateFileMeta` now validates `entityIds`, `memoryIds` and `chronoIds` itself, still gated on
  `isStrictLinkage` exactly as the doors were — the opt-out exists for staged imports where targets resolve in a
  later pass, and relocating a check is precisely when such a thing gets withdrawn by accident. The gate pins
  both the check and the gate on it.

  Third instance of one shape in this release, after `upsertEdge` and `brain/merge.ts`.


- **Changing a memory's type never validated against the new type, and one door could not change it at all.**
  `type` selects which `typeSchemas.memory[type]` applies, so re-typing a record changes the rules it must
  satisfy. Both doors validated the after-state against the type the memory ALREADY had, so the destination
  schema's allowlist, required properties and enums were never consulted and the write succeeded regardless.

  The entity route had it right the whole time, twenty files away — `const resultType = updates.type ??
  existing.type`. One rule, two implementations, and the weaker one silent, on a field whose entire job is to
  select the rules.

  The before-state deliberately still reads the stored type: that is what lets `classifyUpdateViolations` tell a
  violation this patch *introduced* from one it merely inherited, and the gate asserts it so it is not
  "corrected" later.

  **`update_memory` also did not declare `type` at all.** Under `additionalProperties: false` that is a hard
  refusal at the dispatcher, so the MCP door rejected a parameter the REST door accepted and applied — one
  capability, two doors, one offering less. It accepts it now, with the same empty-string-clears semantics.


- **`upsertEdge` validates the record it will produce, so no caller can reach the collection around the
  schema.** Owner's ruling, 2026-08-29: *"upsertEdge should validate of course."*

  The check used to sit in the two API routes, each calling `classifyEdgeUpsert` before calling the write
  function — one rule, written twice, enforced only if you remembered it. Two callers did not:
  `api/contradictions.ts` writes a `supersedes` edge straight through `upsertEdge`, so in a space whose
  `typeSchemas.edge` allowlist did not name `supersedes` the server wrote an edge that space forbids; and
  `brain/bulk.ts` carried a third copy.

  The write function now refuses, throwing `EdgeSchemaViolation` with the whole classification rather than a
  message — so **both doors keep their exact response shapes**, and an `onValidation` callback hands the same
  classification back for the `warn`-mode warnings without a second `findEdgeByTriplet`. Bulk keeps its own
  check for per-item error granularity, now as reporting rather than as the guarantee.

  Moving the check created a runtime import cycle (`brain/edges.ts` ↔ `brain/write-validation.ts`), which a
  gate refuses: in ESM that is legal until one side reads a binding during evaluation, at which point it is
  `undefined` and the failure lands far from its cause. `findEdgeByTriplet` — needed by both sides because
  `(from, to, label)` is an edge's identity — moved to `brain/edge-lookup.ts`, the same reasoning that produced
  `brain/spill-path.ts`.


- **An entity referenced only by a file deleted cleanly, leaving the file pointing at a tombstone.** Under
  `strictLinkage` an entity delete is supposed to `409` while inbound references exist, and
  `findEntityBacklinks` scanned four things: `_edges`, `memories.entityIds`, `chrono.entityIds` and
  `files.faceEntityId`. **`files.entityIds` was not among them.**

  The comment above the face scan is the tell — *"which is why the other three scans missed them"*. That same
  collection had already been patched once, for `faceEntityId`, and its sibling field was not added alongside.

  Files now block deletion like memories and chrono do, reported as `type: "file"`. Face labels stay
  **non-blocking**, because a face label is something the system inferred rather than a link somebody wrote —
  both doors already filtered on that distinction, so it keeps working by construction.

  The gate **derives** the collections to scan from every record type declaring `entityIds` in
  `config/types.ts`, the same way the merge path is already guarded: a new record type carrying an entity
  reference fails it on the day it is declared. The `409` documentation was stale in the same direction and now
  lists every type it can return.
- **A merge could write an entity its own space would have refused.** `mergeProperties` applies each
  property's `mergeFn`, so a survivor's properties are a value **neither input necessarily had** — a `sum` can
  exceed a `maximum`, a `concat` can break a `pattern`, a pick can land outside an `enum`. `brain/merge.ts`
  imported nothing from `spaces/schema-validation.ts`, so a background `automerge` that nobody invoked could
  write a survivor into a `strict` space that the same space refuses through `upsert_entity`.

  The precedent is one invariant over and in the same file: *"An entity merge left every FILE linked to the
  absorbed entity pointing at a record it had just deleted… The merge path broke the invariant the write path
  enforces."*

  The merged survivor is now validated before it is written, and any violation is reported with the rules it
  broke. **It reports and proceeds rather than refusing** — an automerge that stops leaves the duplicates it
  exists to resolve, and that trade is a decision rather than an omission, so it is parked. What was not in
  question is that the violation must be visible: this codebase has twice concluded that the fix is visibility
  rather than severity.


- **Every suppressed memory was silently deleted by sync, permanently.** `MemoryDoc.embedding` is optional —
  it has been since the embedding queue landed — and `embedStoredRecord` unsets both `embedding` and
  `embeddingModel` for any record whose type or space suppresses embeddings. `IncomingMemoryDoc` declared both
  **required**.

  So the sender put a perfectly valid stored document on the wire and the receiver's `safeParse` rejected it.
  The rejection was a `flatMap` returning `[]`: the document left the batch, was counted in no statistic, was
  logged nowhere, and the receiver answered **200**. The sender then advanced its watermark, and
  `embedStoredRecord` deliberately does not bump `seq` when the vector finally lands — so the record was never
  offered again. The same fate met any memory pushed before its embed job had run.

  Memories were the only type affected, and the reason is instructive: `IncomingEntityDoc`, `IncomingEdgeDoc`
  and `IncomingChronoDoc` never declared `embedding` at all, so zod stripped the vector and the document
  survived. One schema disagreed with the document it describes, and nothing compared them.

  **The silence is fixed separately from the schema**, because the next mismatch between a stored document and
  its `Incoming*` schema would lose records exactly as invisibly. A rejected document is now reported with the
  record's kind, id, space, peer and the failing issues — the same warning shape the implausible-seq drop
  beside it already used, whose comment had described the silent skip as harmless.


### Added

- **Tier 0-R ran on real infrastructure, and the graph arm is measurable for the first time.** Three model-free
  ingestion rungs over LoCoMo, 199 stratified questions, zero model calls:
  S0 (raw turns) **66.8%** strict evidence recall, S0+ (turns plus deterministic structure) 65.3%, S0G (the same
  turns modelled as entities so they can be edge endpoints) 66.3%.

  **The multi-hop cliff is the finding.** Strict recall runs 74.4% / 57.1% / 12.5% / 0.0% as a question's cited
  evidence goes from one turn to four, while *any*-evidence stays high — flat text finds some of a multi-hop
  question's evidence almost always and all of it almost never.

  Two mechanisms came out of it, both verified against source and neither specific to benchmarking. Linking a
  memory changes its **ranking**, because `memoryEmbedText` prepends the linked entities' names to the fact
  before embedding — the same turn scored 0.8528 unlinked and 0.8369 linked. And graph expansion **evicts the
  matches it decorates**: at `traverse: 2` the response reached 99,307 bytes of a 100,000 budget and the result
  list was truncated from 20 matches to 6, with every one of the 193 graph nodes an entity. Both are recorded in
  `benchmarks/results/2026-08-29-tier0r/FINDINGS.md`.

  New in the harness: the `s0g` rung, `report-tier0r.mjs`, a grid runner, per-rung `recallTypes`, `--rungs` so
  one rung can be re-run without redoing the others, and score capture for the `minScore` pin.


- **The benchmark harness runs, and the first tier needs no model at all.** `benchmarks/harness/` — the runnable
  half of the pre-registered protocol, in twelve modules with no third-party dependency: pinned dataset fetch
  with sha256 verification, the LoCoMo loader, two model-free ingestion rungs, the retrieval grid, lexical and
  judge grading, and the reporter.

  **Tier 0-R is the part worth knowing about.** It measures *evidence recall* — did the turns the gold answer is
  evidenced by come back? — which needs an embedder and nothing else. No answerer, no judge, no API key, no
  money. It exists because the alternative was reporting nothing until somebody bought credits, and a retrieval
  system's retrieval is the half a memory product is actually selling.

  What it deliberately cannot say is written down next to what it can (`PROTOCOL.md`, Amendment 4): recall is not
  accuracy, an unretrieved fact may still be answerable from another turn, and a rung that retrieves more is not
  thereby better if it retrieves more of everything.

- **`benchmarks/INGESTION.md` — how a conversation becomes records, written blind to the questions.**

  A product specification, not a benchmark entry: every element carries a justification a user with entirely
  different data would accept, and it was produced without the design phase seeing anything derived from the
  question set — not content, not counts, not category distribution.

  Its spine is one invariant — **one claim, one embedded record** — which is mechanism-driven rather than
  aesthetic: edges are independently embedded and compete with memories for `topK` slots, so a memory plus a
  mirroring edge is the same sentence twice in one ranked list. `suppressEmbeddings` is what makes structure
  affordable, because it decouples graph density from ranked-list pollution: a suppressed record is invisible to
  both the vector and lexical channels while `query`, `traverse` and recall's own expansion still reach it in
  full. Record type is decided by the SHAPE of a claim — attribute, event, relation — never by its topic, because
  shape is stable across domains and topic is a fact about one corpus.

  **The sceptic's case is in the specification rather than argued away**, including the prediction that the
  minimal design may win outright, and the experiment that would falsify the graph claim is written down with
  its four arms before any number exists.

### Changed

- **`recall`'s graph expansion is now the real traverse: it narrows by edge label and direction.** Owner's
  ruling, 2026-08-29 — *"recall's traverse must be the same as the real thing"*.

  `recall(traverse: n)` followed EVERY edge in BOTH directions with no way to say otherwise, while the standalone
  `traverse` tool — building the same Mongo query twenty lines away in the same file — applied an `edgeLabels`
  filter and honoured `direction`. One rule, two implementations, and the one reachable from a search had the
  weaker. On any graph where a few nodes hold most of the edges, an unnarrowed hop off one of them returns
  whichever neighbours the node cap happened to keep, and nothing distinguishes that from a deliberate answer.

  `traverse` now takes **a depth or an object** — `{depth, edgeLabels, direction}`, a traverse call without its
  start node, because in a recall the matches ARE the start nodes. The number still means exactly what it meant.
  On **both doors**, on **`recall` and `find_similar`**, through **one parser and one query builder** — a second
  copy is the whole defect, so `frontierEdgeQuery` is written once and both traversals call it.

  `limit` is deliberately refused inside the object, with the refusal saying why: in a recall the node cap comes
  from `topK` and the byte budget, and a `traverse.limit` would let one parameter overrule the budget governing
  the rest of the answer. The response echoes what was applied — a number when nothing was narrowed, so existing
  assertions still hold, the object when it was, because a narrowing the response does not mention is one the
  caller cannot confirm.

  Eight mutants, all killed. Two are worth naming: the pre-fix shape (recall building its own unnarrowed
  predicate), and one expansion call site left un-threaded — which looks identical to the others in review and
  silently ignores the caller's narrowing on exactly one path.

  Found while designing the benchmark's ingestion, and fixed BEFORE any measurement: repairing it after seeing
  "the graph does not help" would be indistinguishable from tuning to the benchmark.

### Fixed

- **One duplicate key stopped a member syncing permanently, and reported it as an unreachable peer.** `_edges`
  carries a unique index on `(from, to, label)`, new edges get a `uuidv4()` id, and sync ingest is keyed on `_id`
  alone — so two peers that independently create the same relationship hold two ids for one unique key, and the
  first to cross the wire raises `E11000`.

  `batchUpsertBySeq` called `bulkWrite` with **no `ordered: false` and no try/catch**, and the consequences were
  wildly out of proportion to the cause. Ordered meant every later document in the page was abandoned. Unguarded
  meant the error escaped `pullType` before `deliveredThrough` was written, escaped `pullFromPeer` before the
  watermark persisted, escaped the space loop — **taking every remaining space with it, including files** — and
  landed in the member-level catch, which increments the failure count and eventually prints `PEER UNREACHABLE`.
  `lastSyncAt` was never written, so the next cycle pulled the identical page and threw identically.

  Now the page is written unordered and duplicate-key rejections are reported as the records they are, naming
  the ids. **Only duplicate keys are absorbed** — any other write fault still throws, because swallowing those
  would turn real corruption into a warning nobody reads, which is the opposite defect.

- **Ten routes in the spaces router had no rights classification, and the gate that exists to catch that could
  not see them.** Found from a live instance's own stdout: `Space rights: no inventory entry for
  'DELETE /api/spaces/:id' — reach enforced, area not`, logged on every call while
  `every-space-route-has-an-area` reported the surface clean.

  The gate discovers routes from a list of routers, and `spaces.ts` was deliberately left off it because the
  router "is not wholly space-scoped" — three of its routes address the collection rather than one space. True,
  and the conclusion did not follow: those three needed **exempting**, not the other eleven left unasked. Nine
  space-scoped routes were ungoverned by area, including `DELETE /api/spaces/:id` and `PATCH /api/spaces/:id`.
  Two of the nine were registered onto the same router from `spaces-activity.ts` and `spaces-reembed.ts`, which
  a sweep of the one file cannot see — the same blind spot one level down.

  To compensate for the exclusion, `routeExists` had a second implementation for `/api/spaces/`: concatenate
  three files and ask `code.includes("'/:id'")` — **a substring search that discarded the method**. So the
  inventory's staleness check passed on `GET /api/spaces/:id` and `GET /api/spaces/:id/schema`, two rows for
  routes that have never existed. One rule, two implementations, the weaker one winning silently, inside the
  gate written to prevent exactly that.

  Now: the spaces routers are discovered like every other router (by pattern, so sibling files are included),
  the collection routes are exempt **with their reasons**, the nine are classified, the two dead rows are gone,
  and one `routeExists` answers for everything. Five mutants — the removed `DELETE` row, the sibling-file route,
  each dead row re-added, and the glob narrowed back to one file — each fail the gate by exit code.

## [3.4.0] — 2026-08-28

### Changed

- **A cleanup hook that gives up now says WHAT it re-read, not only that its check was false.**

  `restoreOrFail` restores instance-wide state between integration suites, and its failure read
  `verify still false after attempt 4` and nothing else. That cannot tell two different faults apart: a `200` on
  the write that left the value unchanged, and a write that never landed. On 2026-08-28 the VLM-extraction hook
  gave up in CI on a commit whose diff was prose, a re-run of the same commit passed, and the message left nothing
  to work from — so the flake is filed rather than dismissed, with the instrumentation to diagnose it next time.

  `verify` may now return `{ ok, saw }`, and `saw` is quoted in the failure. A bare boolean still works, because
  most call sites have nothing interesting to report and forcing an object on all of them would be noise — the
  ones restoring instance-wide state are the ones worth the extra word.

  The check is `verdict === true || verdict.ok === true`, deliberately, and that is pinned: an `if (verdict)` here
  would read a truthy `{ ok: false, saw: … }` as a PASS — reporting success on the exact shape added to report
  failure, with every call site looking correct.

### Added

- **`benchmarks/` — a pre-registered protocol for LoCoMo and LongMemEval, committed before any run.**

  Memory benchmarking has a credibility problem: published comparisons drop the category they do worst on, grade
  with an unpublished judge prompt, and run competitors on defaults while their own system is tuned. So the
  method is fixed first and the ordering is checkable —
  `git log --diff-filter=A -- benchmarks/PROTOCOL.md` predates every result file, each of which records the
  commit it was produced at.

  What it binds us to: every category reported including the ones we lose; two metrics side by side (the
  dataset's own lexical metric and a **blind** LLM judge whose prompt is in the repo and whose agreement with a
  human grader is measured); cost and latency in the same table as accuracy; and a **contamination-excluded**
  score beside the headline, since both datasets are public and part of any score is the answerer recognising
  the text rather than retrieving it.

  **Seven retrieval methods are scored separately** — vector only, lexical only, hybrid RRF, +rerank, +traverse,
  everything, and the deterministic `query` path — across a grid of `topK`, traverse depth, `minScore`, byte
  budget and rerank. **The whole grid is published, not its winner.** Reporting the best of forty cells measured
  on ten conversations is reporting noise; the head-to-head number against a competitor uses the shipped
  defaults, declared in the protocol before the first run, and any configuration chosen from the grid is chosen
  on named development conversations and reported on the untouched ones.

  **Five ingestion strategies are scored separately too** — raw turns, session summaries, atomic facts, facts +
  graph, facts + graph + chrono — because how a conversation becomes records is a bigger lever than any retrieval
  knob, and it is the half a results table normally hides. The rungs are the finding: facts → graph should move
  **multi-hop** specifically, graph → chrono should move **temporal**, and if they do not then the graph is not
  paying for itself on this workload and the results say so. Where a competitor's ingestion can be driven with
  facts we supply, the same fact set is written into both systems, so the storage model is compared rather than
  the extraction prompt.

  **The ingest stage is structurally prevented from seeing the questions**, not asked nicely: shaping extraction
  around the answer key is the strongest way to overfit a memory benchmark and is invisible from outside, so a
  gate refuses any ingest module that names the question set — proven in both directions, and it also fails if
  the protocol's commitment is deleted rather than satisfied.

  Separate from `testing/` deliberately: that folder holds gates that must pass before a change ships. A
  benchmark is a measurement that gets published, costs real money in model calls, and is allowed to produce a
  bad number without blocking anything. Mixing them makes one of them worse.

- **An audit entry carries the request id, so the audit log and the server log join on one value.**

  Every log line a request's own work produces already carried its `X-Request-Id`. The audit entry for the same
  request carried the actor, the operation, the status and the duration — and nothing that connected it to those
  lines. So *"show me everything about this request"* was two searches that could not be joined: the row says
  WHAT was done and by whom, the log lines say what happened on the way.

  **`requestId` is filterable**, on the paged endpoint and the NDJSON export both, matched exactly. Storing an id
  nobody can query by would leave an operator holding a bug report paging a filtered log looking for one row. The
  admin UI's detail panel shows the id with a **find this request** button that narrows the table to it, and the
  CSV export carries the column.

  **An absent value means "written before this field existed", never "no request"** — every audit entry has a
  request behind it. The key is omitted rather than stored as null, the same rule `changes` follows, and the UI
  says *not recorded* rather than rendering a blank that reads as an answer.

  Captured at middleware ENTRY rather than inside `res.on('finish')`, and that was measured rather than assumed:
  an EventEmitter listener is not bound to the async context it was registered in, so `currentRequestId()` called
  in the finish callback returns undefined and would have stored nothing on every entry **while looking exactly
  like the correct line**. The gate asserts WHERE the read happens for that reason. All three writers carry it —
  the request middleware, the auth-failure entry (where it matters most: a rejected credential is what an
  operator most wants to trace) and the MCP tool-call recorder.

  Five mutants, all killed by exit code, including the capture moved into the callback and the write storing null.

  **`AuditLogEntry` moved out of `config/types.ts` into `audit/entry.ts`.** The god-file ratchet refused the
  one-line addition with its own reason — *"every change lands in the same place because that is where the code
  already is"* — and it was right: an audit row is not configuration, and it was in the config types only
  because that file was where types went. Moving it took **34 lines out** of a frozen file rather than adding
  one to it, against a single importer and a single gate to repoint.
### Fixed

- **An instance joining a network left no audit entry, and neither did the admin who invited it.**

  `POST /api/invite/finalize` calls `saveConfig` — it is the moment another instance BECOMES A MEMBER of a
  network on this one, or is held for a join vote. `POST /api/invite/generate` is an instance admin producing the
  material that makes that possible. Both were exempt from auditing, under one entry covering the whole
  `/api/invite` prefix whose reason read *"network invite handshake — peer-facing"*.

  **That reason is true about who CALLS them and irrelevant to what they CHANGE** — and the carve-out that says
  so was already in the same file: `/api/notify/trigger` is audited despite being peer-triggered, because a sync
  cycle writes peer records locally. The same argument, not applied one entry along. They are
  `network.invite.generate` and `network.member.join` now, and the exemption is narrowed to
  `/api/invite/apply`, which registers an in-memory session and writes nothing.

- **Two audit exemptions whose stated reason was false or stale.** Found by reading the list line by line rather
  than trusting it, which is how the invite hole surfaced.

  `/api/oidc` read *"covered by auth events"* — the identical wording already disproved for `/api/mfa`, where the
  map holds exactly one auth event and so covered nothing. The exemption was right for a different reason: it is
  a GET of the IdP's discovery data that mutates nothing, and OIDC is bearer validation rather than a login
  route. **A false reason on a correct decision is worse than it sounds** — it is what the next person reads
  before exempting something real on the same basis, which is exactly how enabling and disabling MFA came to be
  silent.

  `/api/theme` is removed: it exposes one GET and no mutating verb, so the entry never matched the sweep and
  could only mislead a reader into thinking a theme WRITE existed and was exempt. Same stale-exemption shape as
  `/api/spaces/:id/token-access`, which named a deleted route.

### Changed

- **No customer's name appears in this repository any more. It is PUBLIC.** Owner's rule, 2026-08-28.

  Two party names had reached **231 occurrences across 106 tracked files** — 46 in this file, which is
  republished verbatim as the GitHub Release notes, six in the integration guide, which ships inside the Docker
  image, and the rest in source comments and test titles. All public.

  They got there honestly: this codebase records WHO reported a defect and WHAT they measured, because a finding
  with a source behind it is worth more than an assertion. **The evidence is kept and the identity is dropped** —
  each party is now the role that made the observation matter: the operator who runs the instances, the
  integrator who consumes the API. *"22.150 s, measured by the canary operator"* carries the weight it always
  did. Example domains became `example.com`.

  A **gate** refuses a new one, because a one-time sweep is undone by the next commit that says "reported by …"
  — and there is every reason to keep writing that sentence. The gate holds the names base64-encoded and decodes
  them at run time: a gate carrying the literal it forbids would be the last remaining leak.

  **What this cannot reach**, stated rather than implied: 66 commit messages and three published release-note
  bodies also carry the names. The release notes are editable and are being corrected; commit messages are not,
  short of a history rewrite that would invalidate every clone.

### Fixed

- **Re-arming a scheduler restarted it even when its schedule had not changed, resetting the phase.**

  The re-arm shipped in the previous entry is called on ANY save: a config reload triggered by an edit to an
  unrelated setting, a backup-config save that only changed a retention count. Restarting a `node-cron` task does
  not merely cost a stop and a start — **it resets the phase.** A network on a quarter-hour cron that was ninety
  seconds from its next sync goes back to a full fifteen minutes, and an operator adjusting three fields in a row
  pushes it three times.

  That is the same argument used to keep the interval-driven sweeps out of the re-arm helper entirely. Applying it
  to the sweeps and not to the cron schedulers would be the rule implemented once and skipped next door.

  All four now ask before restarting, through one `util/armed-schedule.ts` rather than four copies of the
  bookkeeping — because the half that fails CLOSED is the clear-on-stop, and four chances to forget it is four
  ways for a scheduler to go permanently silent.

### Changed

- **`sync/engine.ts` gives up its cron scheduling to `sync/scheduler.ts`.** The god-file ratchet refused the
  change with its own instruction — *"put the new behaviour beside it rather than inside it"* — and it was right:
  the guard would have been the fifth change to land in a 966-line file because that is where the code already
  was. Scheduling decides WHEN a sync runs; the engine decides what a sync DOES.

  Deliberately **not** re-exported from `engine.ts`, unlike `space-map.ts` when it was extracted: the scheduler
  calls `runSyncForNetwork`, so a re-export makes the two import each other. The runtime-cycle gate caught that
  within a minute of it being written, which is worth recording — a cycle there would have been load-order
  dependent and intermittent. Four importers name the new module directly instead.

### Fixed

- **The request id the caller was handed matched nothing in the log unless the failure was a crash.**

  `X-Request-Id` is returned on every response, and two doc pages described it as *"logged server-side"* *"for
  log correlation"*. It reached exactly ONE log line: the unhandled-error handler. So every failure that is
  HANDLED — which is most of them — logged with nothing to join on: the 4xx a route answered with, the 507 a
  quota refused with, the 503 a readiness check returned, a WARN a background step wrote mid-request. **Those
  are the lines an operator goes looking for**, and they were the ones with no id.

  Every line the request's own work produces carries the id now, via `AsyncLocalStorage` — so lines written by
  code that has never heard of requests are correlated too, rather than only the call sites somebody remembered
  to thread an id through. Lines outside a request (boot, the TTL sweep, the background storage walk) carry no
  id, deliberately: a placeholder there would make a search for a real one match them.

  **One limit, measured and written down rather than discovered later:** an EventEmitter listener is not bound to
  the async context it was registered in — `emit` runs it in the emitter's context — so a line logged from
  `res.on('finish')`, a socket `'error'` or a child-process `'close'` carries no id. Probed directly rather than
  assumed. Two such lines exist, both `log.debug` and neither a failure worth correlating, so they are left
  alone; the point is that the next person adding a log line inside a listener knows it will not be correlated,
  and that anything extending this cannot read `currentRequestId()` there.

  The leak direction is pinned as hard as the presence: a module-level variable would stamp the NEXT request's
  lines with the previous id, which sends a reader to the wrong request confidently, and that mutant survives a
  test that only ever runs one request. Two concurrent requests each seeing their own id is asserted directly.

  `req.requestId` is gone with it. Nothing read it — the response carries the header and the log carries the
  ambient value — and a property with one writer and no reader is what gets re-implemented by whoever needs it
  next, because a grep for it finds only its own assignment.

  Five mutants, all killed by exit code: no id at all, a module variable that leaks, stamping that bypasses
  redaction, a placeholder on non-request lines, and `next()` called outside the context.

### Changed

- **Three doc pages now say the same thing about `X-Request-Id`, and it is true of all of them.** Two overstated
  it (`02-hosting`, `03-auth-and-limits`), one described the old behaviour exactly (`11-setup-api`) — so the
  reader who happened to open the accurate page was the only one who knew the id was useless for a handled
  failure. `userguide/05-storage-data-and-audit` says what the Server Log tab now shows.
- **Turning scheduled backups on reported success and produced no backups until the instance was restarted.**

  `PUT /api/admin/data/backup-config` wrote `backup.json` and answered `{ "ok": true }`. `startBackupScheduler()`
  was called exactly once, from `bootstrap.ts`, and nothing called it again — so a changed schedule was ignored,
  a cleared one kept firing, and an operator **enabling** scheduled backups for the first time got a success
  response and nothing else. Believing you have backups is worse than knowing you do not.

  The same shape on the config-reload path: the sync engine, the duplicate scanner and the contradiction scanner
  fix their cron expression inside `start*`, and `applyConfigFromDisk` never re-armed them. Editing
  `dupeScanner.schedule` reloaded the config and left the scanner on its boot-time schedule; enabling a scanner
  that was off did nothing at all. **`POST /api/admin/reload-config` — an endpoint whose entire purpose is
  "apply what I just changed" — reported success without applying it.**

  The mechanism was already there. Every `start*` stops its own previous task first; `startBackupScheduler`
  carries the comment *"Stop any previously running task before (re-)scheduling"*; `scheduler-wiring.test.js`
  pairs each `start*` with a `stop*` and says why — *"so a config reload can restart it cleanly"*; and
  `api/networks/crud.ts` already re-armed a network's sync when its schedule changed. One rule, two
  implementations, and the weaker one was silent — this repo's signature defect, in the operational layer.

  The **interval-driven** sweeps are deliberately not re-armed: the TTL sweep, candidate prune, tombstone prune
  and audit-change retention read the config on every run, so a change reaches them on the next tick. Restarting
  them would reset the phase of a six-hour timer every time a setting is saved, pushing the next run up to six
  hours away — repeatedly, for an operator editing several settings. That over-correction is one of the five
  mutants, alongside both pre-fix shapes.

### Fixed

- **A space's usage bar could read 0% while its quota was being approached**, and MCP had no storage figures at
  all while `help()` told callers to look there for them.

  Two halves of one defect, both in the field a caller actually reads.

  `GET /api/spaces` measured each space's files inline, and its own comment said *"falls back to 0 on error"*.
  A space whose files directory the instance cannot list therefore reported **0 GiB used** — which is exactly
  what an empty space reports. The Brain overview's Storage panel drew that as 0%, so a quota being approached
  looked untouched, and nothing anywhere said the number was short. It now reports `usageIncomplete` beside the
  figure, and the panel prefixes it **≥** with a *partly unreadable* warning naming what could not be read.

  MCP's `list_spaces` returned counts and nothing else, while `help()` said *"Call list_spaces for storage/quota
  details"*. So a caller who read the authoritative reference and believed it found no storage on that door —
  and would never report it, because **nobody reports a capability they were told they did not have**. That is
  the same shape as the `recall` filter sentence the fleet integrator designed around. `list_spaces` now returns `maxGiB`,
  `usageGiB` and `usageIncomplete` from the same measurement REST reads, and `help()` names the three fields
  instead of pointing at data that was not there.

  Both doors now call one `measureSpaceUsage`, so neither can learn something the other does not — the extract-
  instead-of-duplicating rule, applied to the walk that was written twice and omitted once.

  Six mutants, all killed by exit code, two of them the exact pre-fix shapes: MCP reporting no storage, and MCP
  reporting the number without the qualifier.

### Fixed

- **A storage quota that could not tell an empty store from one it was not allowed to read.**

  Both halves of the usage measurement contributed zero on failure. A directory the process cannot list returned
  early, a file it cannot stat was skipped, and a `dbStats` the database user is not permitted to run returned 0
  bytes of brain data — all silently. So the usage came back LOWER than reality, and **a hard limit compared
  against a number that is only a floor never fires**: an operator who configured a quota sees a quota that
  simply never triggers, which from the outside is indistinguishable from being under it.

  `metrics/registry.ts` had already reasoned exactly this out one layer up, for the same quantity — the storage
  gauge emits NO series rather than a zero, because *"an absent series says 'not measured yet' where a zero
  would have claimed 'empty'"*. That rule was right and it stopped at the gauge; the measurement it reads from
  was still claiming empty. One rule, two implementations, and the weaker one was the one the quota consulted.

  Now every measurement reports what it could not read, per area, and says so in a `WARN` line naming the path
  and the error code. **It still fails OPEN** — a transient `EIO` on one subdirectory must not refuse writes on
  an otherwise healthy instance, which would trade a reporting gap for an outage — but the allow is loud instead
  of silent, and `checkQuota`'s result carries `measurementIncomplete` so a caller reporting "within quota" can
  qualify it.

  An ABSENT files directory is deliberately still a complete answer of zero: a space that has never held a file
  uses no files, and calling that unmeasurable would put every fresh instance permanently in the degraded state
  and get the alert switched off. Both directions are pinned.

### Added

- **`ythril_storage_usage_complete{area}`** — `1` when the last storage measurement read everything for that
  area, `0` when that area's `ythril_storage_used_bytes` is a lower bound. **Alert on `== 0`.** Nothing in the
  storage series could express this: 0.4 GiB reads identically whether it is the whole store or the readable
  part of it.

  Labelled by area rather than a single series for two reasons. The two halves fail for unrelated reasons an
  operator acts on differently — a filesystem permission versus a database grant. And an unlabelled prom-client
  gauge is initialised to `0` on construction, so it could never be ABSENT; since `0` is the alerting state, the
  unlabelled version would report "the figures are a floor" on every instance from the moment it booted. The
  reason is not a label, because a filesystem path is not a label value — it is in the WARN line.

## [3.3.0] — 2026-08-28

### Fixed

- **A regex literal was read as neither code nor a string, so a quote inside one opened a phantom string.**

  `_structural-window.mjs` is the shared bracket walk every structural bound is built on, and it skipped comments
  and strings but not patterns. `api/files.ts` writes `path.basename(normalised).replace(/[\r\n"\\]/g, '')`, and
  that `"` inside the character class opened a string that swallowed the next 350 characters and every bracket in
  them — so the route registration being read reported as never closed. It failed loudly there, which is luck
  rather than design: the same phantom string inside a `doesNotMatch` bound makes the window smaller and the
  absence hold. A regex is the third language in these files, after TypeScript and the markup inside template
  literals, and it had been read as neither. Division is still division, pinned in both directions.

### Changed

- **X-25c is done: no capped gap in this suite is a window any more.** Three left, and each was hiding work.

  `route-guard-coverage` found every route's middleware chain by matching from the path string across
  `[\s\S]{0,400}?` to the handler. **13 of the 209 route registrations in `server/src/api` put their handler
  further away than that** — `POST /api/data/backups` 1 105 characters in, `GET /api/tokens/rights-catalog` 6 429,
  four `schema-library` routes between 489 and 1 870. Those routes were not reported as unguarded; they were never
  in the analysis. Three more were skipped by the handler-SHAPE guess beside it, which required the chain to end at
  `async (` or `(req`. Both guesses are gone: the last argument is the handler because it is the last argument, and
  a new `argumentsOf` bound splits a call at its own commas. All 209 are analysed now, and all 209 are guarded.

  `no-boot-migration-on-synced-data` looked 80 characters past a collection open for a mutating call. The ordinary
  two-statement spelling — open it, bind it to a name, write through the name later — was **missed at 80 and would
  have been found at 200**, so the number decided rather than the shape. A boot migration written that way was
  invisible to the gate whose whole job is refusing one. It follows the variable now, and both spellings are pinned
  in the detector's own self-test.

  `reembed-backfill` bounded an audit table row at 80 characters, which reaches the NEXT row's `operation` — under
  which a route carrying no audit operation of its own would have borrowed its neighbour's.

  **And the frozen list is split in two, because it had bottomed out.** `[\s\S]{0,400}` and `[^.]{0,80}` are one
  syntax wearing two meanings: a guessed extent, which is the defect, and an adjacency claim, where the number IS
  the rule. Counted together, "may only shrink" could never reach zero — whatever it stopped at was
  indistinguishable from remaining debt, and a comment documenting a cap that had been REMOVED counted against the
  file that removed it. So `GRANDFATHERED_GAP` is now the debt and is **empty**, and `NOT_A_WINDOW` carries the
  twenty sites whose number is a rule, each with a reason a reader can check.

### Changed

- **Four more capped windows converted; the frozen list reaches 30 across 17 files, from 66/36.** X-25c.

  `mcp-tool-rights` held two windows in ONE pattern —
  `if (rightsRefusal) {[\s\S]{0,160}?return {[\s\S]{0,120}?text: rightsRefusal` — and the claim is that the
  refusal is RETURNED from inside the branch. Neither cap could tell "inside the branch" from "160 characters
  after it", and that is exactly the difference between *computed and dropped* and *computed and returned* —
  the defect the test's own comment names as this repo's signature, which happened on three routes at once.
  Both mutants killed: the branch neutered, and the returned object dropping the refusal text.

  `schema-derived-type-controls` bounded a `<select>` element at 2400 characters, and its comment justified the
  number as stopping "a runaway match" from swallowing the next select. **The lazy `?` already does that** — the
  first `</select>` wins. What the number actually did was the opposite of its stated purpose: a select LONGER
  than the cap matched nothing, so its options were never examined and the gate reported the file clean. It had
  already been raised once, 1600 to 2400 — the signature of a number nobody chooses, but raises until the test
  passes. Killed by pointing a real component's select at a bare property, which is the hardcoded-list
  regression the gate exists to refuse.
- **A gate that checked 4 of 10 outbound call sites and passed.** X-25c, seven more capped windows converted.

  `single-flight` asserts that every `ssrfSafeFetch` in the server carries a `signal`, so a sink that accepts a
  connection and never answers cannot hang a scheduled sweep forever. It found each call by matching
  `ssrfSafeFetch\(([\s\S]{0,700}?)\n\s*\}?\s*\)?;` — the call plus a guess at how its argument list ends. In
  scope that matched **4 of the 10 call sites**. The other six, including the webhook dispatcher and the external
  face endpoint — both of which leave the instance — were not reported as unguarded; they were never examined,
  because the check is an ABSENCE and a call the pattern misses passes by not existing. All ten do carry a signal,
  so this is a measurement lesson rather than an incident. Now each call's own closing paren is the bound.

  `oidc-carries-a-rights-matrix` was pointing at the wrong object. It asserted
  `admin: perms.admin, … readOnly: perms.readOnly ?? false` within 400 characters, and `admin: perms.admin` appears
  twice — once on the record and once inside the `migrateToken({ … })` call the assertion is actually about. So the
  match began on the outer field and reached the inner one: two objects satisfying one claim about a single object,
  which is precisely how the hand-rolled second mapping it exists to refuse would have passed.

  The other five: an unacknowledged assist host must fall THROUGH to the local document model rather than merely
  sit near it (`document-description`); an image caption must be labelled generated by the switch arm that produced
  it — bounded `case` to `break`, because a `case` label has no braces and the enclosing-block bound would have been
  the whole switch, looser than the number it replaced; the config response must be spread onto the form
  (`infra-managed-locks-every-field`); MCP's coarse visibility check must use the any-space predicate
  (`space-admin-reaches-its-own-space-settings`); and the guarded fetch must be the arm the locality test selects,
  not a call that merely follows one (`vlm-endpoint-egress`).

  The frozen list drops to 23 across 12 files, from 66/36. **Every remaining entry now carries its reason**, and
  they sort into nine that are not windows at all — adjacency claims, a regex quoted in a failure message, comments
  recording the caps that were removed — and three that are: the whole remaining debt.

### Added

- **`faceDescriptorDims` can be changed on a space that has never held a face descriptor.** It was create-only,
  refused categorically, and the reason given everywhere — schema, guide, code comment — is about STORED
  VECTORS: *"a populated gallery cannot be re-dimensioned: its stored vectors have not moved, so re-declaring
  the width would leave every existing descriptor unmatchable."* Every word of that is true of a gallery that
  holds descriptors, and none of it bites on one that never has.

  The canary operator asked the question nobody had, 2026-08-20, and framed it usefully: *"we are asking whether
  the guard is 'no stored faces may be invalidated' or 'no, categorically'."* **It was the first, and the API
  was enforcing the second.** `ensureVectorSearchIndex` refuses on `existing && !dimsMatch &&
  refuseWidthChange` — index-and-descriptor based. The absolute rule lived in the API surface, which was
  broader than the safety mechanism needed it to be. Their position: fourteen spaces, three images between
  them (two of which are page renders our own conversion pipeline extracted from a scanned invoice), not one
  descriptor at any width — and a remedy that meant re-creating every space, which for spaces holding real
  data is not a remedy.

  `PATCH /api/spaces/:id` and the `update_space` MCP tool now both accept it and answer **409** in exactly two
  states, each naming the number it found: the space holds descriptors, or its face index is already built at
  a different width. The second is refused too because an empty index at another width is still an index and
  rebuilding one is not the same act as creating one. Sending the width the space already has is always
  accepted and changes nothing, so a client re-sending its whole config can still save an unrelated edit. One
  implementation of the rule (`spaces/face-width-change.ts`), called from both doors — a second copy of those
  two queries is the defect this repo produces most.

  **Why this mattered more than one field becoming editable.** A space with no stored width builds its index at
  `FACE_DESCRIPTOR_DIMS`, which is **128**, a compile-time constant that nothing derives from the configured
  endpoint. So pointing `FACE_RECOGNITION_EXTERNAL_MODEL` at a 512-d recogniser without setting the width gives
  a 128-wide index that silently skips every descriptor it is handed — in their words, *"photographs that
  genuinely contain people being stored as containing none, permanently, until they are reprocessed."* Both
  MCP schema descriptions now say that outright, because omitting the field is not "decide later".

  Documented on all four surfaces that carried the old absolute claim: `05c-face-recognition.md`,
  `06-spaces-api.md`, both MCP tool schemas, and — new — a Settings-page section telling an operator to check
  the descriptor width FIRST when face recognition finds nobody, since that failure produces no error at all.
  Token rights needed nothing: no new route, and `PATCH /api/spaces/:id` is already classified.

  Eight mutants killed, and the eighth found a fault in the gate rather than in the code: the MCP bounds check
  used `assert.match` and survived narrowing `update_space`'s range, because the pattern found `create_space`'s
  field instead. Two tools declare that parameter, so a sample proves nothing about which one it matched — the
  assertion counts both now.

- **`notAreaScoped` on `GET /api/tokens/rights-catalog`, and in the Space admin panel.** The same defect one
  layer up: a route absent from `routes` was indistinguishable to a caller from one nobody had classified, so
  *"the matrix does not govern renaming a space"* was a fact only the server's source held, and a grid of four
  areas read as complete while three space-scoped routes sat outside all of them. Now published with the
  server's own reason per route, on the same argument the endpoint already makes for `routes` and
  `derivedRungs` — the list the server decides from is the only description of a right that cannot be wrong.
  No `method`, unlike `routes`: an exemption is a claim about what the route IS, so it covers every verb on
  that path, and `/api/spaces/:id/rename` is registered as `PATCH` where a method-keyed exemption written for
  `POST` would have silently missed it. It does not mean unauthenticated or ungoverned — reach is still
  enforced and each route keeps its own admin guard; it says only which mechanism decides.


- **A request quota an instance admin can set per TOKEN, under a ceiling infra sets instance-wide.** Owner
  request, 2026-08-20. `rateLimitPerMinute` on a token, settable at create and via `PATCH /api/tokens/:id`;
  `YTHRIL_RATE_LIMIT_PER_MINUTE` for the instance. Resolution is `token > instance > 300/minute`, the same
  `record > … > default` order `ttlDays` and `suppressEmbeddings` use, so **an instance that configures
  neither behaves exactly as it did before** and absence on a token means INHERIT rather than unlimited.
  The env value is a **ceiling, not just a default**: a per-token value above it is refused with a `403`
  naming the ceiling, never accepted and quietly reduced — a ceiling an admin can exceed is decorative, and
  storing a smaller number than was asked for is the accepted-but-discarded defect this codebase keeps
  finding. `GET /api/tokens` and the MCP `list_tokens` tool both report `rateLimitPerMinute` (what was set)
  beside `rateLimitEffective` (what is enforced), derived in `listTokens` so the two doors cannot disagree.
  **Enforced by a SECOND limiter, after authentication.** The existing one runs before auth deliberately —
  it is the only throttle in front of admin TOTP, so it must throttle requests carrying no valid credential
  and therefore cannot know which token a request holds without a bcrypt compare per request. It is
  unchanged and remains the outer bound. The new one is applied inside `attachToken`, the one function every
  auth entry point calls, and that function now consumes `next` so a new auth path cannot attach a token
  without metering it.

### Changed

- **Six more capped windows converted across three gates.** X-25c continues; the frozen list falls to **34
  across 19 files**.

  All six were the same shape underneath — a call's argument list, an object literal, or a function body — and
  two of them carried a second guess on top of the length:

  | Gate | The cap, and the extra guess in it |
  | --- | --- |
  | `rights-are-explained` | a route registration at 600, and `routesFor`'s body ended at the first two-space `}` — an assumption about INDENTATION as well as length |
  | `recall-params-reach-the-ui` | the submit call's body at 2000, terminated by a hard-coded four-space `
    })` — a prettier run would have failed it on unchanged behaviour |
  | `brain-read-bodies-are-strict` | `unknownBodyFields(`'s arguments at 200, whose own comment explains that the argument text must NOT be constrained — a length cap is that constraint, expressed differently |

  The route-registration one mattered most: its three assertions are `doesNotMatch`-shaped, so a window that
  stopped short of the handler asserted an ABSENCE over less text than intended and PASSED. Killed by
  admin-gating the catalog, which is exactly the regression it exists to refuse.

  Four mutants killed in total, all in the SOURCE the gates read rather than in the gates: the catalog
  admin-gated, `routesFor` narrowed to an equality that understates the grant, the recall panel dropping a
  parameter, and the traverse body type dropping one.


- **Three more capped windows converted, and one of them became a stronger claim than any window could be.**
  X-25c continues; `GRANDFATHERED_GAP` falls to **40 across 21 files**.

  The interesting one is `merge-relinks-every-entity-reference`. It had a 600-character gap tried in BOTH
  directions, which asks *"are these two strings near each other"*. The real question is *"is the query aimed at
  the collection that was opened"* — and the code answers it by name:

      const memoryColl = col<MemoryDoc>(`${spaceId}_memories`);
      const affected  = await memoryColl.find(asFilter({ spaceId, entityIds: absorbed._id }), …)

  So the gate now captures the variable the open declares and requires one of its later uses to be the
  reference search. That proves what the window only approximated: a `find` on some OTHER collection within
  600 characters satisfied the old check, and a legitimate one pushed past 600 by an added comment would have
  failed it. Mutation-tested by pointing the memories query at the entities collection — killed.

  **And the first attempt at it found a trap in the helper.** Anchoring on the `col<…>(` call and asking
  `statementAround` for its statement returns nonsense, because that index sits INSIDE a template literal and
  the walk skips template literals whole — it returned a span forty lines long and captured a variable declared
  far below. The failure said *"opens memories as `newFrom`"*, which is why it cost one run: a window failure
  would have said nothing at all. The declaration is matched whole now, with no gap of any size.

  The other two are objects bounded by their own brace — a returned description object where 80 characters
  could not tell "the excerpt is in this object" from "the word appears 80 characters later".


- **Two more capped windows converted, two documented as not being windows, and the ratchet falls to 43 across
  22 files.** Continuing X-25c.

  The two conversions are both objects bounded by their own brace rather than by a guessed extent. The `id`
  declaration one is the more interesting: it capped an object literal at 400 characters, so a schema that grew
  past the cap matched a TRUNCATED blob — and every judgement below then read a fragment, including whether the
  id was `required`. A constrained declaration could be reported as permissive, which is the negative-assertion
  half that fails silently rather than going red.

  The two exemptions are recorded with the reason the number is the rule rather than a guess: an adjacency claim
  on prose where `.` crosses no newline, so it asserts a flag and its disclaimer sit in ONE sentence; and a
  bounded repetition inside a regex QUOTED IN A FAILURE MESSAGE, where the digits are part of an IPv6 prefix and
  there is no subject to bound.

  **And documenting an exception by quoting the pattern counts as another one.** The ratchet counts on raw
  source so a hand grep matches — the right trade — but my first draft of that note repeated the regex and took
  the file from one gap to two, failing the gate on the comment explaining the exception. The note says so now,
  because it is the third time this session a gate has been fooled by prose ABOUT the thing it measures.


- **Two more capped windows converted, two documented as not being windows, and the ratchet falls to 43 across
  22 files.** Continuing X-25c.

  The two conversions are both objects bounded by their own brace rather than by a guessed extent. The `id`
  declaration one is the more interesting: it capped an object literal at 400 characters, so a schema that grew
  past the cap matched a TRUNCATED blob — and every judgement below then read a fragment, including whether the
  id was `required`. A constrained declaration could be reported as permissive, which is the negative-assertion
  half that fails silently rather than going red.

  The two exemptions are recorded with the reason the number is the rule rather than a guess: an adjacency claim
  on prose where `.` crosses no newline, so it asserts a flag and its disclaimer sit in ONE sentence; and a
  bounded repetition inside a regex QUOTED IN A FAILURE MESSAGE, where the digits are part of an IPv6 prefix and
  there is no subject to bound.

  **And documenting an exception by quoting the pattern counts as another one.** The ratchet counts on raw
  source so a hand grep matches — the right trade — but my first draft of that note repeated the regex and took
  the file from one gap to two, failing the gate on the comment explaining the exception. The note says so now,
  because it is the third time this session a gate has been fooled by prose ABOUT the thing it measures.

- **The ER diagram's unlinked shelf now spreads across the card's width, not the diagram's own.** The third of
  the canary operator's three rules, and the one where their diagnosis was a step off in a way worth recording:
  *"use the whole row for the unlinked listings"* — it wraps after four entries however wide the viewport is.

  The shelf already flowed to a width rather than to a fixed column count. That width was
  `colX[2] + BOX_W + PAD` — the joined picture's own, three columns plus their gaps — so it was never a
  four-column grid, just a width that happens to fit four, and widening the window could not help because
  nothing in the calculation read the window.

  `layoutErModel` takes an optional `availableWidth`, which makes it the one input to the layout that is not a
  fact about the model — hence optional, with absence meaning the previous behaviour exactly, so every existing
  caller and spec is unchanged. The panel measures its own `.stage` with a `ResizeObserver` rather than a window
  listener, because the stage narrows when the sidebar collapses or a neighbouring panel appears and neither
  resizes the window. Guarded for jsdom, which has no `ResizeObserver`: with none, the width stays 0 and the
  layout falls back, so the component specs assert the geometry they always did.

  **`Math.max`, not a swap.** A container NARROWER than the joined columns must not squeeze the shelf: the stage
  scrolls horizontally, so taking the minimum would reflow the shelf into a tall stack while the part of the
  diagram that has meaning stayed exactly as wide as before — which is the failure the shelf was introduced to
  fix. And the reported `width` now covers the widest row actually laid out, computed from the boxes rather than
  from the container: reporting the columns' width would clip the shelf at the right edge with nothing to say
  why, and reporting the container would leave empty canvas the stage offers to scroll.

  Seven property-based specs including monotonicity — more room never means fewer per row — and four mutants
  killed. My first attempt at the component used a `(window:resize)` binding, which never fires on first render;
  the stage lives behind three `@if` branches, so it needs a signal `viewChild`.


- **One more capped window converted** — `infra-managed-locks-every-field` bounded a control at 400 characters
  of whatever followed its tag, and that cap FAILED ON CORRECT CODE: two conditional blocks added above one
  control pushed its closing token out of range, the regex matched a truncated block, and the gate invented a
  defect. `openTagAt` reads to the tag's own `>`, which is where every binding lives. `GRANDFATHERED_GAP`
  falls to **45**.


- **An unacknowledged external endpoint is now STORED AND UNUSED instead of refusing every write to the media
  route.** The canary operator, 2026-08-20T1155Z, arguing a principle rather than reporting a bug:
  *"the acknowledgement should gate USE of the endpoint, not VALIDITY of the config."* Their owner met the
  consequence trying to raise an image level to "Caption + face recognition" and could not save; his summary of
  the flow was *"not even i understand it"*, having built the face service on the other end of it.

  Both egress gates keyed the refusal on the endpoint EXISTING, resolved from patch-or-stored. So one endpoint
  stored without an acknowledgement refused **every** subsequent patch to this route, whatever it touched.

  **Relaxing it was safe because the send site already enforced consent, and always had.**
  `detectFacesExternal` returns null unless `faceEndpointConsented` matches the host it would send to, and that
  function's own comment says why it is checked there too: *"a config edited on disk (bypassing the API) still
  cannot silently egress biometric data."* The write-time refusal protected nothing the use-time one does not.
  That is what turned their principle from defensible into obvious, and it is why the new gate asserts the send
  site FIRST — it is now the only thing between a stored endpoint and a crop on the wire.

  **But "gate the use" is not the whole answer, and the assist model's own comment is why.** It read: the
  trigger is the pipeline rung *"whether that happened by configuring the endpoint or by raising the extraction
  mode in the same or an EARLIER save"*. Those last three words are the defect; the rest is right. Consent is
  owed at ACTIVATION, so the question is not *is this endpoint configured* but **does this patch turn it on** —
  by pointing it somewhere, or by raising the rung that uses it. Which is also the owner's P-12 ruling (A + C):
  consent is accepted, and therefore demanded, from the pipeline entry point as well as the endpoint's control.

  **Activation turns out to be TWO conditions, and collapsing them into one broke a different contract.** The
  first attempt at this fix made "the caller touched the endpoint" sufficient, and three integration tests went
  red — one of them named after the behaviour it broke: *"configuring the endpoint BELOW the repair rung is
  allowed (not reachable yet) and round-trips"*. Setting an endpoint up while the rung that uses it is off has
  always been permitted, deliberately: nothing can be sent at that rung, so there is nothing to consent to yet,
  and demanding it asks the operator to approve a transfer that cannot happen.

  So the refusal requires both, and they answer different questions from different sources:

  | | read from | question |
  | --- | --- | --- |
  | **reachable after this patch** | the EFFECTIVE state (patch ?? stored) | is the endpoint set, behind a rung that is on? |
  | **caused by this patch** | the REQUEST only | did this caller point it somewhere, or raise the rung? |

  Reachable-but-not-caused is somebody else's earlier decision — refusing it is the original defect.
  Caused-but-not-reachable is a transfer that cannot occur — refusing it was the first attempt's defect. Both
  have now shipped as bugs, which is why the conjunction is asserted as one expression rather than as two
  facts about the file.

  `auto` counts as an active rung on both endpoints — it resolves to `recognition` for images and to `repair`
  for extraction, so a check for the explicit rung alone would let `auto` switch on a biometric pipeline
  unasked. The GET reports `faceEndpointAwaitingAcknowledgment` so a UI can say "configured, not in use"
  rather than leaving it to be discovered by a failure: quiet fallback is right for an *unreachable* endpoint,
  a runtime condition nobody chose, and wrong for an *unacknowledged* one, which is a decision waiting on a
  person.

  **The same defect was on the assist endpoint and is fixed with it** — same page, same failure, document
  content instead of face crops. One helper, called twice, rather than the two inline copies of a consent rule
  that were there before. The refusals keep naming the exact host and what would be sent there, because they
  asked us not to weaken that and it had already caught a real mistake of theirs within minutes.

  **The gate was the real failure here and is now a different kind of test.** Every assertion in it read
  `media-config.ts` and checked the SHAPE of the decision — and all of them passed on the version that broke
  three integration tests, because the shape was right and the rule was wrong. Preflight cannot run the Docker
  suites, so the rule itself is now exercised against the exported helper as a truth table, one row per
  scenario those tests cover plus the one this change exists for, with an anti-vacuity check that both truth
  values of both flags appear. Twelve mutants killed across both rounds, including the exact mutation that
  reached CI and two earlier ones that found the gate counting a variable NAME rather than checking what it
  meant.


- **The embedding guide's `postMessage` snippet derives its target origin from the iframe instead of offering a
  placeholder.** The canary operator found this in the console on 2026-08-20, embedding Ythril in a page on
  `www.example.com`:

      "postMessage" could not be executed on 'DOMWindow': the specified target origin
      ("https://ythril.www.example.com") does not match the recipient window's origin
      ("https://www.example.com").

  `ythril.www.example.com` is not a host anybody has. It is `"ythril." + location.hostname` — the shape you
  get from assuming Ythril lives at a `ythril.` subdomain of the embedding page's domain, which holds right up
  until that page is on `www`. Every such message is refused by the browser, so the theme silently never
  arrives and **nothing in Ythril reports a problem, because nothing in Ythril was reached.**

  **Not our code, and we said so before changing anything:** the shipped bundle contains exactly one
  window-targeted `postMessage` — the OIDC silent-refresh callback, targeting `location.origin` — which cannot
  produce that string. But the snippet we publish ended `}, 'https://your-ythril-host');`, and a placeholder in
  the one argument that must be exact reads as an invitation to construct it. The value is already in the
  embedder's hand: `new URL(iframe.src).origin`.

  Two further traps documented with it, both easy to misread: the "recipient window's origin" in that error is
  the PARENT's, not the frame's, so the same message also appears when the iframe has not navigated yet — and
  waiting for `load` is necessary but not sufficient, because the SPA registers its listener after its own
  theme fetch settles, so a token pushed in the same tick is lost with no queue and no error. For first paint,
  `cssUrl` on `/api/theme` is the path that cannot race.


- **The ER diagram's boxes now take one of three heights, and a row of them is a band.** The canary operator's
  owner, at a browser on a live 3.2.0 instance, 2026-08-20. His word for the diagram was *"salad"*, and two of
  his three complaints were heights: *"non-uniform height entities"*, and boxes side by side in a row having
  different heights so *"a row has no top line and no bottom line"*. Their post is a specification rather than
  a defect list, and the numbers in it are measured — `er_model` against their `infrastructure` space: 22
  entity types, property counts 0 to 10, eighteen of them between 4 and 8.

  **Rule 1 — at most three distinct heights**, bucketed once per diagram. A box's height was
  `HEAD_H + max(2, properties + 1) * ROW_H + 12`, so eight distinct property counts meant eight distinct
  heights and no horizontal line anywhere in the picture. The split is by **tercile of the types**, not by
  their proposed fixed `<=4 / 5-7 / >=8` — those three numbers are right for a 22-type model with that spread
  and wrong for four types that all have two properties, where two buckets would sit empty. On their own data
  the tercile lands within a property of their split. A bucket's height is what its **tallest** member needs,
  never an average: averaging would clip the fields of the tallest type in each bucket, and a diagram that
  hides a property to look tidy is worse than a ragged one.

  Measured against their distribution, this is what it does — eight heights become three, and no box shrinks:

  | properties | before | after |
  | --- | --- | --- |
  | 0 | 70 px | 134 px |
  | 3 | 102 px | 134 px |
  | 4 | 118 px | 134 px |
  | 5 | 134 px | 134 px |
  | 6 | 150 px | 150 px |
  | 7 | 166 px | 214 px |
  | 8 | 182 px | 214 px |
  | 10 | 214 px | 214 px |

  The one to look at is the top row: their single property-less type grows from 70 px to 134 px, because it
  shares a bucket with thirteen others. That is what three buckets means and it is what was asked for, but it
  is the number worth a second opinion from somebody with the diagram in front of them.

  **Rule 2 — never two heights in one row**, which they said matters most because rule 1 alone still permits a
  short box beside a tall one. The two columns no longer stack independently: row `i` takes the taller of its
  two boxes, both take that height, both start at the same `y`. Where one column runs out the row is just the
  remaining box. The unlinked shelf gets the same treatment — its row height was already the tallest box in
  the row, but each box kept its OWN height inside that slot, so a row of four had four bottom edges inside
  one band.

  Their prerequisite argument is why these went first and is worth recording: uniform row heights are what
  give an orthogonal router consistent horizontal channels, so *"fixing rules 1 and 2 will visibly reduce the
  salad on its own, before anyone touches the router."* **Rule 3 — the shelf flowing to the full width — is
  NOT in this change.** It needs the container's width, which a pure layout function does not have, so it
  needs a measured element and is its own PR. Their diagnosis of it was also one step off, and the correction
  matters: the shelf already flows to a width rather than to a fixed four columns, but that width is the
  DIAGRAM's own — three columns plus their gaps — so widening the window cannot help.

  Seven property-based specs, four mutants killed: per-type heights restored, bucket heights averaged instead
  of maxed, the columns stacked independently again, and the shelf boxes keeping their own height. The fixture
  is deliberately built to a spread that WOULD produce many heights, because one whose types all had the same
  property count would satisfy both rules with the code doing nothing.


- **The MCP door's default recall byte budget is now 25 000, against REST's 100 000 — the one place the two
  doors deliberately differ.** Reported by the canary operator, 2026-08-20, and the number in it is theirs: a
  recall answered `bytesReturned: 98356` against `budgetBytes: 100000`, correct, in budget, fully specified —
  and **their MCP client refused it outright and spilled it to a local file.** A caller reading over MCP got
  nothing usable from a call the server answered perfectly.

  They proposed the 100 KB figure themselves in the byte-budget design and did not ask us to change it. What
  they asked was narrower, and their own diagnosis is why the answer is yes: *"the old 25-record cap had been
  acting as the de facto size guard on the MCP door, and removing it removed that guard along with the cliff we
  were complaining about."* Neither side said that out loud when the budget was designed.

  **The parameter is unchanged; only the default differs.** Both doors accept `maxBytes` with the same floor,
  the same ceiling and the same refusal text — a gate asserts a caller who ASKS gets an identical answer on
  either door, and that a bad value is refused with identical wording. The divergence is the narrowing itself,
  which is what `CLAUDE.md` requires of a difference between the two surfaces: an MCP tool result meets a hard
  per-result ceiling inside the client that the caller cannot raise, while a REST body lands in a buffer its
  caller allocated. One default cannot be right for both.

  25 000 is about six whole records at their measured ~4 KB mean, roughly 7 000 tokens. It is **not** a
  measurement of any client's ceiling — the one data point is that 98 356 was refused, with no number for where
  the limit actually is — so it is chosen from the safe side of that refusal, and a caller who wants more passes
  `maxBytes` on either door. Their withdrawn clause 2b is honoured too: `maxTokens` with a `charsPerToken`
  divisor was already built, and nothing more is being added on its account.

  Stated on every surface a caller reads, because a default nobody can find reads as a product ceiling: both
  `maxBytes` descriptions in the MCP schema name this door's number AND the other's, the recall guide's
  parameter tables and prose carry both, and the Search page says the browser is on the larger side — so an
  operator who notices a search answering whole in the UI and shortened for an agent finds it documented as
  deliberate rather than filing it as an inconsistency.


- **Ten more guessed character windows in the gates became structural bounds, emptying five files.** Two of
  them changed what "structural" has to mean rather than just moving a number. A `NOTICE` entry read with a
  900-character window was **13 characters** from reading the *next* entry: `### jszip` sits at offset 18040
  and the following entry's licence election at 18953, so at 913 the neighbour would have answered a check
  whose whole stated purpose is refusing that. And the enclosing STATEMENT turned out to be the wrong bound
  for a ternary — `pass === 'structured' ? judgePair(a, b, { structuredOnly: true }) : judgePair(a, b)` is
  ONE statement holding both arms, so a statement-level bound stays green with the flag on the other branch,
  which is the opposite behaviour and a paid model call per pair. The bound that holds is the argument list
  of the call the branch makes. Structural is not automatically tighter than a character count; it is
  tighter only when the structure chosen is the subject. Every conversion was mutation-tested against the
  behaviour it claims. `GRANDFATHERED_GAP` falls to **46 across 24 files**, from 56/29.

- **`05c-face-recognition.md` no longer describes a migration path that was never built, and says what an
  unset width IS.** An operator quoted two of its paragraphs back to us, could not reconcile them, and asked
  rather than guessed — correctly, because neither covered the case they were in: gallery EMPTY, index never
  built. One paragraph said there is no admin call to change the width; the next said *"to move a populated
  gallery, re-embed its faces at the new width first"*, whose closing clause implies that having re-embedded
  the width can then move. It cannot; there was never a call to set it. That sentence is gone and replaced by
  what is true — re-create the space — and the create-only paragraph now opens by saying that every space has
  a width from the moment it exists, defaults to 128, and does not derive it from the endpoint you configure.
  Their own suggested wording, taken because it is better than what it replaces. The page also gains a section
  on reading the gallery's readiness log, including that the line meant nothing before the probe fix above.

### Fixed

- **The edge case in `embed-properties.test.js` no longer spends its own budget on other records' embeddings.**
  Second occurrence in CI, 2026-08-28, on a branch whose diff was client-only — so not caused by the change it
  failed on. The instrumentation left after the first occurrence (2026-08-08) is what named it:

      edge should have its embed text stored — after 118 polls over 30000ms:
        HTTP 200, record EXISTS, matchedText absent

  `record EXISTS` with `matchedText absent` distinguishes three causes that a bare `null` could not: the write
  failed, the read failed, or the queue never reached it. It was the third.

  **Structural rather than a flake.** That case is the only one in the file which must CREATE records before its
  own — an edge needs two entities — so two entity embed jobs sit ahead of it, plus whatever the three earlier
  cases left queued, and `workerConcurrency` defaults to 2. It is the last job behind the most work, every run,
  and both occurrences were this case alone with its three siblings green in ~0.5 s. A re-run passed, which is
  what confirmed timing rather than a stuck path; the enqueue call is symmetric with the entity one, so there
  was never anything edge-specific about the product.

  The two endpoint embeds are now awaited on their own budget, and asserted rather than ignored — if an ENTITY
  embed is what is broken, it says so there instead of surfacing as a mysterious edge timeout thirty seconds
  later. **Deliberately not a bigger timeout:** a larger number hides the same pile-up until the runner is
  slower still, and makes every future failure here ambiguous between "slow queue" and "broken edge embedding".


- **The per-pipeline Save on Media Processing now asks for egress consent instead of showing the refusal.**
  The canary operator's owner, 2026-08-20, in his own sequence: *"Settings → Media Processing → set images to
  'Caption + face recognition' → Save → nothing saves."* The Models card asked. The page-bar Save asked. The
  per-pipeline Save — the button beside the control he had just changed — sent the PATCH straight out and
  rendered whatever came back, which was a refusal naming a host, on a page that never mentions the endpoint.
  His summary of the whole flow was *"not even i understand it"*, and he built the face service on the other
  end of it.

  Raising the image ceiling to a recognition rung IS an act of switching faces on, so it is a place to GIVE
  consent rather than a place to be refused for lacking it — owner's ruling P-12 (C). The acknowledgement
  travels in the SAME request as the level: two patches would be two chances to fail between them, leaving
  either the level applied with consent lost or consent stored against a level that never landed. Only the
  host rides along, never the endpoint URL — this Save owns the image ceiling, not the Models card's
  credentialled endpoint.

  **The client asks in a WIDER window than the server refuses in, deliberately.** I first made the client
  mirror the server's rule exactly and three specs went red, correctly: the server refuses when consent is
  *required and missing*, while the client should ask when consent *can be recorded and is not*. The server
  stores an acknowledgement at any rung, so asking while the operator is configuring the endpoint front-loads
  the decision instead of interrupting them again later. What must never happen is asking more often than it
  can be recorded, which would train someone to click through a biometric dialog.

- **The face card no longer claims infra owns the whole of it.** It passed `faceLocked('enabled')` as its
  whole-card infra flag, so pinning `FACE_RECOGNITION_ENABLED` dimmed the entire card to 62% and labelled it
  "Set by infra" — while every control inside stayed operable and governed by a different variable. That is
  what the canary operator saw before reporting the endpoint as unconfigurable, and they were reading it
  correctly. Owner's ruling P-12 (A): *"may this instance use faces"* belongs to infra, *"may crops leave for
  this host"* belongs to the operator, so the two are now labelled separately and the dimming follows the
  endpoint lock. The assist card — the direct analogue — has never claimed whole-card ownership from a field
  it does not edit.

  The card also shows `faceEndpointAwaitingAcknowledgment` from the server: configured, stored, and NOT in
  use. Read from the server rather than re-derived, because a second derivation could disagree with the thing
  that actually decides whether a crop is sent.

- **`enclosingMarkupBlocksMatching` treated an apostrophe in a template COMMENT as a string delimiter.**
  Found by a false failure and worth recording as its own defect. Markup comments are prose, and prose is full
  of apostrophes — so each one opened a phantom string that swallowed the braces after it, and the walk
  depended on the PARITY of every apostrophe earlier in the template.

  Fragile in the worst direction: editing a comment anywhere above a control could silently change what the
  walk believed contained it. Measured — replacing `[infra]="s.faceLocked('enabled')"` with a call taking no
  string argument removed two apostrophes, re-paired every apostrophe after it, and
  `infra-managed-locks-every-field` lost both `@if` guards around a control it had always seen guarded, then
  reported that control as a defect. Nothing about the control had changed. Comments are stripped first now.

  Its spec needed correcting too, and mutation testing is what said so: the first fixtures used one and two
  apostrophes and stayed green with the fix removed, because an unpaired apostrophe that swallows no braces
  changes no depth. The reproducing shape is two apostrophes STRADDLING a brace, and that is what the spec
  uses.


- **RELEASE DEFECT: media settings could not be saved at all, on any instance.** Reported by
  the canary operator, 2026-08-20, from a browser on 3.2.0 and corroborated server-side by them — their pod had
  logged no `config.json changed on disk` since provisioning, so every save attempt had persisted nothing.

      {"error":"Invalid request body","details":[{"code":"unrecognized_keys","keys":["enabled"],
        "path":["faceRecognition"],"message":"Unrecognized key: \"enabled\""}]}

  Both Settings pages that PATCH `/api/admin/media-config` were dead — Models and Media Processing — because
  the whole body is refused at validation rather than the one field. Their owner spent an afternoon behind it,
  through two mistakes of their own that each hid the next, before reaching a bug that was never his to fix.

  **They asked the one thing they could not test and the answer is the worse branch.** They pin
  `FACE_RECOGNITION_ENABLED` on every instance they run and would not unpin a biometric switch to test a form,
  so they could not tell whether this only bit pinned deployments. It bites everyone: `GET` returns the
  RESOLVED config, `getFaceRecognitionConfig()` returns `Required<FaceRecognitionConfig>`, so `enabled` is on
  every response whatever the environment says, and the form echoed it straight back.

  **Three artefacts of one removed control, and the middle one broke the page.** The face enable switch was
  removed when the image ladder became the single gate. What stayed behind: the payload still sent `enabled`;
  a spec still asserted that it did; and a "turn off face recognition?" confirmation still guarded a
  transition no control on the page can make. The card's own template said *"No enable switch… deliberately
  not editable here"*, and the payload's own comment said *"only the PATCH-writable face fields"* — both
  correct, neither matching the list beneath it.

  Fixed at both ends, and the second is the one that matters for anyone who is not us:

  - **The client stops sending it.** One line, and the comment above that list was already right.
  - **The server strips the fields it owns BEFORE validating.** `strip-server-owned-then-be-strict`, the
    pattern `SERVER_OWNED_SPACE_FIELDS` already uses one module over. Read-the-config-and-send-it-back is the
    documented way to make a partial edit, so a 400 over a field we ourselves emitted is our bug at either
    end — a fixed client does not fix an integrator's script.

  **Strip on a match, refuse on a change.** A bare strip would let a genuine attempt to change an env-only
  field vanish into a 200, which is worse than any error. So an echoed value is stripped and a different value
  is refused with a **403** naming the field and how it actually is set — 403 rather than 400 because the body
  is well-formed and the field is real; what is wrong is that this route is not where it lives.

  **And a third thing they could not see:** on a pinned instance the design intends a 403 from the infra-lock
  check, naming the pinned path. The strict 400 fired first, so the refusal this route was built to give has
  never been reachable.

  Gated by deriving the CLASS rather than listing the fields — every field the response type emits must be
  either on the patch schema or on the strip list, so the next field added to the config cannot reopen this the
  way `enabled` did. Eight mutants killed, and one of them found a fault in the gate: the array-comparison test
  passed `personEntityTypes`, which is not on the strip list, so no stripped path held an array and the
  assertion proved nothing. It exercises the comparator through the real function now.

  Also corrected: `05c-face-recognition.md`'s Configuration Reference listed `enabled` as settable through this
  route, which was the third leg of the three-way disagreement they identified — the UI sent it, the API
  refused it, the docs promised it. All three are now the same answer. The round-trip contract is documented
  in `05a` and `05c`, and the userguide says plainly that a Save which appeared to work and changed nothing
  was this.
- **A revoke that removed nothing reported success.** `revokeToken` filters the stored tokens by id and returns
  false when the filter matched nothing; the route discarded that boolean and answered `204` unconditionally.
  So a caller could be told a credential was gone while it still authenticated — the
  "assert on the identity the operation returns" failure this codebase keeps paying for. It now answers `500`
  saying the token **is still valid** and that retrying will not help, because an operator told "something went
  wrong" assumes a blip and moves on.

  Found while investigating a failed revoke reported by the canary operator on 2026-08-20. **It is not their
  cause** — and that is itself worth recording: a handler that always answered `204` on a token it found cannot
  be the source of a failure toast, so whatever they hit came from the guard or from before the handler. They
  were careful to say they had not read the status code and would not guess it, so the investigation stops here
  rather than changing code to chase a symptom nobody can name yet.


- **`topK`'s MCP description still promised a record cap the byte budget replaced.** It said *"past roughly 25
  results the answer spills and `truncated` is set"* — true before 3.2.0 and wrong after it, on the surface
  `help()` tells callers is the authoritative reference. This is the failure `CLAUDE.md` records at cost:
  The fleet integrator read *"filter applied after vector search"* there, believed it, and built a skill that deliberately
  avoided filtered recall. Nobody reports a limit they were told they had.


- **A route deliberately outside the rights grid stopped being logged as an oversight — and the log can now
  actually become clean.** Reported by the canary operator, 2026-08-20, read off a live pod's stdout: two routes
  warned on **every request** that they had *"no inventory entry — reach enforced, area not. Add it to
  ROUTE_RIGHTS; misses become refusals once the log is clean."* Both are on `NOT_AREA_SCOPED`, the list that
  records — with a written reason each — that a route is not a view of a space's DATA. Renaming a space is
  space-admin; reading which tokens reach it is a read of AUTH state; per-space usage counters are instance
  observability keyed by space. The list was read by the build-time gate and by nothing at runtime, so
  `enforceAreaRung` could not tell a decision from an oversight and reported the decision as one. Two
  consequences, the second worse than the first: the advice was **wrong** for those routes, since following it
  would have area-scoped a route the design says is not area-scoped; and *"once the log is clean"* named a
  state four routes guaranteed could never be reached, so the promised flip from allow to refuse could never
  fire — and had anyone forced it, four routes that worked yesterday would answer `403`. This repo's signature
  defect exactly: one rule, two implementations, the weaker one winning in silence. `requiredRung` is now
  `rungFor` and answers with three kinds — `requires`, `not-area-scoped`, `unclassified` — so the two cannot be
  conflated at any call site, and the warning names both lists instead of only one.
- **A stale exemption for a route that does not exist.** `/api/spaces/:id/token-access` sat in
  `NOT_AREA_SCOPED` with a two-line reason; the server serves no such route, only the brain one, which has its
  own entry. Invisible because the coverage gate's staleness check read `ROUTE_RIGHTS` alone — an exemption
  could name anything at all. It now checks both lists through one shared existence helper. A stale exemption
  is the more dangerous of the two: a stale classification guards nothing, while a stale exemption is a
  **standing licence** — the day a route with that path is added it arrives pre-excused from the rights matrix
  and no gate objects, because the excuse was written before the route existed.


- **The face gallery's readiness probe asked about the wrong field, so its answer carried no information.**
  Reported indirectly by the canary operator, 2026-08-20 — they quoted the log line as evidence that no face
  index had ever been built on any of fourteen spaces, and stopped a configuration change on it:

      Vector search index infrastructure_files_faceEmbedding: gave up after 600s
        — probe did not serve: ... :: caused by :: embedding is not indexed as vector

  `indexServes` hardcoded `path: 'embedding'` and took its width from `getEmbeddingConfig().dimensions`. Both
  correct for the five text indexes; both wrong for the face gallery, which indexes `faceEmbedding` at 128. So
  the probe queried a field that index does not index, with a vector of the wrong width, and MongoDB answered
  exactly that string — every second, for the full 600 s window, on every space, whether or not the gallery
  was READY and serving. **The probe could not succeed, so it was never evidence of anything.**
  `pollVectorIndexReady` took no vector path, so the caller could not supply one — even though
  `ensureVectorSearchIndex` two levels up had built the definition WITH the path and the width and simply did
  not pass them on. The caller held the answer and the callee guessed.

  Two costs. A READY gallery reported as failed makes the one diagnostic this feature has always read red —
  the trap the same reporters named to us about space badges, that a red which is always red teaches an
  operator to stop reading red. And each miss burns the whole window: fourteen spaces at 600 s each is the
  boot-time starvation the `maxTimeMS` comment inside that very function warns about, arriving through the one
  path the comment did not cover.

  `pollVectorIndexReady` now takes a required `ProbeTarget` — the indexed path and the built width — with no
  default, deliberately: a default would let the next non-`embedding` index silently inherit `embedding`/768
  and fail to probe rather than fail to compile. The face caller resolves its width from the same two places
  `initSpace` builds the index from, so the two cannot drift.

  **Its own spec had passed for five releases.** `index-ready-poll.test.js` asserted the probe was a real
  `$vectorSearch`, against the named index, cheap. All three were true of a probe that could never answer. It
  now asserts the field and the width, per call site rather than in total, and refuses a caller that does not
  name its target — five mutants killed against the pre-fix shape.

### Security

- **A space-restricted administrator could revoke or rotate ANY token on the instance.**
  `requireAdminOrSpaceAdminMfa` admits a token holding `admin` on all four areas of one space. Three of the
  token routes then narrowed what it may touch — the list filters by `editorScopeFor`, the mint route refuses
  an out-of-scope grant, and `PATCH` runs `refusalsOutsideEditorScope`, whose own comment records that without
  it *"such a token could rename any token on the instance and write `rights.instanceAdmin` onto it"*.
  `DELETE` and `POST /:id/regenerate` resolved no scope at all.

  Revoking is strictly more destructive than renaming, and rotation is worse still: the old secret stops
  working instantly and the only party who learns the new one is the caller. So an administrator of one space
  could invalidate any credential on the instance — instance-admin tokens included — for spaces it cannot see,
  and walk away holding the replacement.

  One rule, four implementations, and the two missing ones on the most destructive verbs. Both now call the
  shared guard rather than reimplementing the comparison, and the scope refusal is answered **before** the
  last-admin check, because the other order tells a caller whether a token it may not touch is the instance's
  only administrator.

  **The rotation route was found by the gate, not by the report.** `token-routes-narrow-by-one-rule.test.js`
  asserts the PROPERTY — the set of routes a space admin can reach and the set that narrows are the same set,
  both derived from source — rather than naming the route somebody complained about. A test naming `DELETE`
  would have passed here for as long as rotation has existed.

## [3.2.0] — 2026-08-20

### Breaking

- **The three per-stage scores are the ORDERING, and they were hidden behind a flag whose purpose is removing
  cost.** `lexicalScore`, `fusedScore` and `rerankScore` now come back on **every** recall and find-similar
  result, on **both** doors, each present only when that stage ran. `includeDiagnostics` no longer governs
  them — it covers `matchedText`, `embeddingModel` and `seq`, which is what it was for.

  The canary operator 2026-08-17T1549Z, correcting their own 1540Z, and the argument is ours turned around
  correctly: we said the six bundled fields are not where a large response comes from — the bodies are. **Three
  floats per result are not a cost.** Bundling a passage-sized field with three numbers under one switch was
  the actual error.

  **And `score` is not the number that ranked the result.** Precedence in a fused recall is
  `rerankScore > fusedScore > score`, so on any instance with a cross-encoder the value in the response did not
  decide the position in the response, and the value that did was unavailable. Their reranker has been live
  since 2026-08-03. It compounds with our own documented behaviour: **`minScore` filters on `score` alone**,
  never on the fused or rerank ordering — so a caller could threshold on a number that did not order the
  results while being unable to see the one that did.

  **MCP had never sent them at all**, so that door gained them rather than merely un-gating them. An absent
  score still means the stage did not run; that contract is unchanged.

  `RECALL_DIAGNOSTIC_FIELDS` — the union of both groups — is DELETED rather than left unreferenced. It was the
  strip list for both doors, which is exactly what made the ordering conditional; with the ranking half
  unconditional, a name that reads like "the withheld set" and is not one would be worse than no name. The
  strip sites take `RECALL_RECORD_DIAGNOSTICS`, and `rankingFields` emits the scores with no flag to pass.

  Two assertions in `both-doors-same-recall-content.test.js` were rewritten rather than renumbered: one
  required all six fields absent by default, which is now requiring the defect. It splits into *record
  diagnostics absent* and *ranking scores present*, and the graph walk additionally asserts a traversed node
  carries **no** ranking score — it was never ranked, so a score there would be a number with nothing behind
  it.
- **A failure of the store answered `400`, telling every caller the fault was theirs. It is now `503` and says
  `retryable`.** Two parties reported the same defect from opposite sides within thirty hours, and the second
  report is what priced it.

  The canary operator 2026-08-17T1912Z, from the operator's side: after any restart mongot re-initialises
  hundreds of indexes, and for HOURS a recall can fail with `Executor error during aggregate command on
  namespace: … :: caused by ::` — nothing after `caused by ::`. The location, and not the reason.

  The fleet integrator 2026-08-18T2145Z, from the caller's side: the same error on **6 of 36 calls (17%)**, rate-sensitive.
  Every recall node in their fleet carries `onError: continueRegularOutput`, because a persona should not die
  when a context read fails. **A 4xx is not retried and not reported**, so the persona ran with no context and
  produced something plausible and uninformed — one call in six, silently, across fourteen personas.

  **That is what the wrong status cost: not a confusing message, but unmarked wrong output at scale**, because
  `4xx` means *do not try again, the fault is yours* and every HTTP client is built to believe it.

  `POST …/recall`, `POST …/find-similar` and `POST …/query` now answer a store-side failure with **`503`,
  `Retry-After`, and `retryable: true`** — and every failure body from those routes carries `retryable`,
  true or false, so a client branches on a boolean instead of matching our prose. The store's `code` and
  `codeName` come through when it supplied them. A message that ended at `caused by ::` is completed rather
  than passed on: with the driver's cause where there is one, and otherwise with **"the store reported no
  cause"**, which answers the question the canary operator opened with and could not answer from outside.

  **An ALLOWLIST, and everything unrecognised still answers `400` with an unchanged message.** The unsafe
  direction here is calling a caller's mistake retryable, so a failure becomes a `503` only when something
  positively identifies it as the store's: a network/topology error name, a `MongoServerError` with a
  shutdown/stepdown/deadline code, or MongoDB's own executor-error phrasing. Bad filters, bad parameters and
  unknown operators are untouched — they are refused before Mongo is reached, which is why the classifier
  rarely sees one.

  **MCP carries the identical classification** as `structuredContent` with `retryable` and
  `storeSideFailure`, attached in the dispatcher's single catch so a tool added tomorrow inherits it. That
  door answers `200` with `isError: true` and has no status to correct, so the parity is in the content —
  which is the rule: when the doors differ, the difference is the transport's envelope, never what a caller
  is told.

  **It does NOT retry internally**, which was one of the options offered. On 2026-08-19 the cause turned out
  to be a **dead mongot process** under a degraded RAID array — a retry loop would have turned that into slow
  successes and hidden a process death from the only two parties who could see it. Say what happened, say it
  can be retried, let the caller decide.

- **Every read stopped returning the embedding vector, and it had never stopped: the list routes sent it on
  every record.** `GET /api/brain/spaces/:spaceId/entities?limit=500` answered **11.19 MB** for one space where
  `POST /query` answered the same 100 records in **0.145 MB** — reported by the fleet integrator 2026-08-19 after it killed
  their n8n with an out-of-memory failure, took its database down with it for a stretch, and blocked deploys.
  They tried twelve parameter spellings looking for a switch; there was none, because the route accepted no
  projection at all.

  **The reason it went unnoticed for so long is that we published the opposite, absolutely, in four places.**
  `/query`'s parameter description (*"always excluded and cannot be re-included"*), `recall`'s and
  `update_memory`'s MCP descriptions (*"never returned by anything here"*), and the integration guide's own
  *"the list routes project it out before the documents leave the database"*. An integrator who believed those
  had no reason to look at a payload size — and none of them was true for a list route.

  **Fifteen reads and twelve write returns, not the one reported.** Five list/lookup readers plus three
  single-record getters had no projection; a shape-derived gate then found seven more, including three spelled
  through a local variable that the gate's own first version was blind to. On the write side, an inline embed
  put the freshly computed vector into the 201 — measured on entity, memory, chrono and edge creates with
  `waitForEmbedding: true`, **and any create with `checkDuplicates`, which defaults to TRUE**, so it was
  reachable with no flag at all. An ordinary edge or entity UPDATE leaked it with no flag either, from the
  unprojected read of the existing record.

  The rule now lives in one place (`brain/read-projection.ts`), is derived from `NEVER_RETURNED_FIELDS` so the
  two cannot disagree, and is enforced by a gate that derives its own scope from the shape of the code rather
  than from a list of known readers — because a list would pass the day somebody adds a sixteenth. Fourteen
  places already stripped the vector when emitting a **webhook**: the rule was known, applied at every
  webhook, and applied at zero returns.

  Verified against a running instance: sixteen paths, every one clean, including `POST /traverse` and
  `?includeDiagnostics=true` — no flag can ask for the vector back, which is what the four sentences promise.

- **The brain list routes withhold `matchedText` and `embeddingModel` by default; `seq` still comes back.**
  The canary operator asked for this by name, taking up an offer in the 3.1.0 notes: *"matchedText is the passage
  a second time, and a list route is the call most likely to be made in bulk."* `?includeDiagnostics=true`
  restores both, the same parameter name `recall` uses.

  **`seq` is deliberately NOT withheld here, unlike on recall** — it is the `If-Match` value, so dropping it
  would remove the conditional-write path. The two doors therefore withhold sets that differ by one field, on
  purpose. **This is a response-shape change** on `GET …/entities`, `…/memories`, `…/edges` and `…/chrono`.

  MCP needs no matching parameter: its list tools return a formatted summary that never carried either field,
  so there is nothing there to withhold or restore.

- **The 25-record spill cliff is replaced by a byte budget, and every returned record is whole.** Owner-commissioned;
  specified by the canary operator on request. Past 25 records a recall used to collapse to **three** inline
  results plus a download of the WHOLE set — including the three already sent. Their measurement: a real
  overflow dump of 209,339 bytes, ~51 records, so a caller got 3 records plus ~52k tokens of file where 25
  whole records would have been ~100 KB. **The collapse did not reduce the caller's cost, it roughly doubled
  it** — or the remainder was abandoned, which is the usual outcome.

  `maxBytes` (default 100 000) now bounds the response; `maxTokens` is a convenience converted at
  `charsPerToken` (default **3.5**, not the customary 4.0, which under-counts and is worst on graph-heavy
  answers). If both are sent the smaller wins. **Bytes are the only limit** — no record count and no node
  count, because bytes already price a dense subtree higher than a sparse one.

  `results` is a **PREFIX** of the ranked matches and every record in it is WHOLE: full body, full
  properties, complete `_graph`, byte-identical to that record from an unbudgeted call. Truncation is atomic
  at the match, so no answer has a gap in the middle and none carries a record with half its graph.

  `returned`, `count`, `truncated`, `budgetBytes` and `bytesReturned` are on **every** response whether it
  bit or not — the old shape's instinct was right, that silent truncation is worse than small, and this keeps
  it while removing the collapse. When truncation happens, `remainder` carries **only what did not fit**
  rather than the whole set again.

  All eight result paths go through one `budgetedEnvelope` — recall and find-similar, plain and traversing,
  on both doors. The previous cap reached four of the eight until an E2E caught it.

  **Two faults in the first cut of this change, both repaired before it shipped, both worth recording because
  they are the same defect class the change was removing:**

  1. **A truncated answer could carry no way to reach the rest.** `spillResultSet` still held the old
     `if (records <= 25) return null` guard, so a remainder of 25 records or fewer was silently dropped: the
     response said `truncated: true` and carried no `remainder`. The byte budget had become the second rule
     about size and the weaker one won. The guard is gone — the budget decides, and a spill that is asked for
     is a spill that is written. `SPILL_RECORD_THRESHOLD` and `SPILL_INLINE_RESULTS` are deleted rather than
     kept, so neither can quietly start deciding again.
  2. **`remainder.records` counted the wrong set.** The routes passed the WHOLE answer's traversed-node total
     into a file that now holds only the overflow, so a caller sizing the download could read a figure an
     order of magnitude too large. The parameter is removed; `countGraphNodes` derives it from the payload
     being written, at every depth and on both doors, so it cannot disagree with the file.

  `remainder` also drops `inline`, which described the three-record sample that no longer exists. The number
  of records returned is `returned`, on every response.

- **A truncated recall no longer writes a file nobody asked for — it tells you where to carry on instead.**
  `recall` and `find-similar` gain **`skip`** and **`remainderDump`** on both doors, and a truncated response
  gains **`nextSkip`**.

  Two changes, and they are one change:

  - **`skip`** — how many of the ranked matches to skip before filling the byte budget. A truncated response
    carries `nextSkip`; send it back as `skip` and you get the next prefix, no match repeated and none missed.
    Stated rather than derivable, because `skip + returned` is arithmetic a caller can get wrong on the second
    page where `skip` was already non-zero. `count` stays the FULL match total on every page rather than
    shrinking as you advance — the slice happens inside `budgetedEnvelope`, so no route can shorten its own
    array and quietly redefine it.
  - **`remainderDump`** — default **`false`**, and until now the dump was unconditional. Writing the remainder
    to `_tmp/` is a **write on a read path**: it counts against space storage, and on the canary operator's
    instance those land in a store whose `storage_used_bytes` collector already takes ~22 s to walk, so a read
    that overflowed made an operator's metrics slower. The common caller wants the next page, not an artifact.

  **They ship together and must not be separated.** An opt-in dump with no stated continuation would leave a
  truncated caller unable to reach the rest — the exact regression the byte budget shipped in its first cut and
  had to fix. `nextSkip` is emitted unconditionally whenever `truncated`, with no flag of its own, and
  `result-spill-suppresses-vectors.test.js` gates that dependency at the source because the failure mode is an
  omission that looks complete on its own.

  The paging clause is exercised rather than asserted-present: the E2E follows `nextSkip` to exhaustion under a
  budget that bites and checks the union of pages against the seeded ids, because an off-by-one would satisfy
  every presence assertion while dropping or duplicating a record on every page. `skip` and `remainderDump` are
  validated by one shared `resolvePaging` on both doors — a `skip` that 400s on one and floors to zero on the
  other is this codebase's most-produced defect, and `0` is valid so the check is not `posInt`.

  **That E2E immediately found a defect older than `skip`, and it had to be fixed for `skip` to mean anything.**
  A ranked recall had no deterministic order. Eleven ranking sorts were written by hand as
  `(a, b) => rankOf(b) - rankOf(a)` with no tie-break, and `Array.prototype.sort` is stable — so two results on
  the same score kept whatever order the DATABASE returned them in, and two identical recalls over an unchanged
  corpus could come back permuted. The E2E's second page turned out to be entirely contained in its first.

  Every one of the eleven now ends in a tie-break, `_id` ascending, through one shared `byRankThenId` — including
  the member-space merge on **both doors**, which is the last sort before the response and the one a sweep scoped
  to `brain/` would have missed. Three sorts keep ordering by RAW `score` rather than by `rankOf`, and that was
  already correct: the pre-fusion sort establishes the vector ranking RRF consumes, the vector channel handed to
  RRF must be the vector order by definition, and `find-similar` starts from a stored vector with no query text,
  so there is no lexical or cross-encoder signal to prefer. `hybrid-retrieval.test.js` counts those three and was
  right to; they gained the tie-break without changing which signal orders them.

  `_id` rather than `seq` or `createdAt`: it is on every result type, unique by construction, and the only one of
  the three that cannot tie in turn.

### Added

- **Who may embed this instance is now editable in the admin UI — Settings → Embedding.** `embed.allowedOrigins` has
  worked since embedding shipped and lived only in `config.json`, so granting a portal permission to frame a brain
  meant shell access to the server. Asked for by the canary operator on 2026-08-19T1046Z, and the reason is theirs:
  *someone runs a brain, someone else wants to use it inside a portal, and the person who must act has to be talked
  through editing a JSON file on a server* — which in practice means it does not happen and the brain stays in a
  browser tab. `GET`/`PATCH /api/admin/embed-config`, admin plus MFA on the write, because listing an origin grants
  framing **and** runtime restyling together and both are ways to impersonate this interface. The same validator as
  the config-file path, with one deliberate difference: the file DROPS an invalid entry with a warning, and the form
  **refuses** it and names it back — a form has somebody waiting on an answer, and accepting-then-discarding is how a
  caller gets told a change worked when it did not. `GET` also reports `invalid`, the stored entries the validator
  drops, which is the answer when a portal will not frame and the list looks right. No restart, by either route.
- **The embedded client wears the host portal's decoration, when the host supplies it.** Owner ruled **A** on
  2026-08-19 (was P-11), on the canary operator's ask of 2026-08-18T1806Z — which they framed as an ask and not a
  request: *"Nothing here is urgent, nothing is blocked on you, and 'not our aesthetic' is a complete answer that
  we will not raise again."*

  Their portal already declares eleven decoration custom properties on `:root`, under their own names and mapped
  onto nothing of ours — raw material, not a restyle. **Their absence is the signal**: no `--tr-hot` means render
  flat. So this needed no negotiation, no dependency and no `postMessage`; the values were already in our document.

  They cannot do it from their side, and not for want of trying: a parent stylesheet does not cross an iframe
  boundary, and our document paints its own background over anything behind the frame. They raised their own layer
  in FRONT of the frame, saw traces over the content someone was reading, reverted it, and left a note telling the
  next person not to retry it.

  **Three surfaces, which is the number the decision rested on.** They asked whether a card surface is defined in
  one place or forty and said forty would mean no; it is `.card`, `.modal` and the shared `.dialog` constant, all
  global, none per-view. Four declarations on each: a translucent fill so their backdrop shows through, ONE lit
  hairline along the top, a hairline outline in their mid ink, and one soft cast shadow.

  It is the PLAINER of the two treatments they built, and keeping it restrained is their own measurement: three
  background layers plus scanlines plus a four-shadow stack read as both slower AND less clear, because texture
  over text costs legibility and every layer is another composite. Two things they are explicitly NOT asking for
  are not built — a pointer-following light (their owner rejected the idea, twice implemented) and framing
  permission over `postMessage` (`embed.allowedOrigins` is empty and that is their decision, unmade).

  **An undecorated instance is not merely equivalent to before — it has none of these declarations at all.** CSS
  has no portable way to ask whether a custom property is set: `var(--tr-hot, fallback)` can substitute a value
  but cannot switch a rule off, and style container queries are not broadly available. So presence is resolved
  once at startup and published as a class, and everything else is ordinary CSS under `:root.ythril-decorated`.
  Nothing extra to compute, nothing extra to composite, and the spec asserts the flat path FIRST.

  Resolved before `bootstrapApplication`, so the first paint is already correct rather than flashing flat for a
  frame. A declared-but-empty ink reads as undecorated — the same trap the env pins have, and an empty value would
  otherwise turn every fallback into a colour of nothing.

- **The rights matrix has a `Space admin` column.** Owner-reported five times across five releases, most recently
  as a screenshot with the column drawn in: *"i miss space admin"*.

  A space administrator is a token holding admin on **all four areas** of that space. The server has enforced that
  since #937 and has published it as a derived rung on `GET /api/tokens/rights-shape` ever since — `requires`
  computed from `SPACE_AREAS` rather than restated, with its grants and its containment rules in prose. **Nothing
  in the client ever read it.** So the matrix showed four independent rungs and said nothing about the commonest
  grant, which meant setting four cells and hoping none was missed.

  Press **A** on a row and all four areas go to admin in ONE emit; press **–** and they clear. It is also a
  read-out: a row already at admin on all four reads as **A**, including when the floor put it there — the column
  is computed from what the cells DISPLAY, because one that disagreed with the four cells beside it would be worse
  than no column. Two positions and not four, because it is not a rung: `read` and `write` describe one area, and
  the four cells remain the way to say anything in between.

  **Why this took five releases, stated plainly: it was built once, it worked, and it was reverted** — because
  assertions in `rights-matrix.component.spec.ts` counted elements per row and broke. Those assertions were about
  the per-area model, which is the thing that must not be weakened, so they needed rewriting by hand rather than
  renumbering. That is a twenty-minute job. Reverting working UI to avoid it was the wrong trade.

  Exactly one assertion needed the rewrite this time, and it is rewritten with its subject intact: *every column
  header explains itself* now holds for five columns, requires the four area keys AND the derived one, and refuses
  a silent header — where bumping a 4 to a 5 would have allowed a fifth column with no tooltip at all. The new
  specs pin behaviour instead of element counts, so the same revert cannot be justified again: one emit not four,
  the floor row writing the floor, all-four-and-not-any, and **the four areas still independently settable**.

  The explain panel gets the server's own words for the new column — `grants` and `excludes` straight from
  `derivedRungs`, never a sentence written in the client, because those are red-teamed containment rules and a
  second copy of one is how they drift.

  Four mutations, four caught. A fifth was dropped as an equivalent mutant with the reason recorded: `cellOf`
  already folds in the floor and an implication can never lift a cell to admin, so it agrees with `cellShown` for
  this question today — `cellShown` stays because the column's contract is to track what the cells display.

  Six keys across `en`/`de`/`pl`.

- **`YTHRIL_PINNED_FIELDS` — fix a field at whatever it resolves to, including NOTHING.** Owner ruled this on
  2026-08-19 (was P-7); the canary operator asked for it twice, and their framing is the requirement: *"once the URL
  is infra-pinned to an in-cluster unauthenticated endpoint, an editable key field is a control with nothing behind
  it. Empty is the CORRECT value, and we would like to pin the correct value."*

  ```
  YTHRIL_PINNED_FIELDS=rerank.apiKey,nli.apiKey,faceRecognition.externalModel
  ```

  Each listed path joins `lockedByInfra`, so `PATCH /api/admin/media-config` answers **403** for it and the Settings
  control renders read-only — **without anyone having to put a value in the environment to achieve that**, which was
  the only way to lock a field before and is the opposite of what was wanted.

  **It has to be a separate list, and that was established by trying the obvious thing.** An empty env var
  deliberately does not pin: `docker compose` passes `${VAR:-}` and leaves a variable defined-but-empty when the
  operator set nothing, so reading "defined" as "pinned" locks every field on every Compose deployment. All twenty
  pins were converted to presence checks before `face-recognition-env.test.js` failed with exactly that reasoning,
  and it was reverted. A list no Compose default can produce has no such ambiguity, and `RERANK_API_KEY` keeps
  meaning only *the key*.

  **A path that names nothing is REPORTED, because a pin believed to be in force and not is worse than no pin.**
  Unrecognised entries come back as `pinnedUnknown` on the config response, show as a notice at the top of
  **Settings → Media Processing → Models**, and are warned at boot. Reporting only in the log would put the one
  thing an operator needs where they are not looking. It does not refuse to boot: a renamed field in a values file
  would take the instance down, and the pin-that-did-not-apply is visible either way — the same posture the storage
  pins already take with a malformed number. One bad entry does not discard the good ones, since those are what the
  operator was relying on.

  **A path must be a field the admin API can WRITE**, which is the rule that keeps the vocabulary honest: you can
  only pin what could otherwise be changed. So `faceRecognition.enabled`, `modelPath` and `reprocessSyncedImages`
  are not pinnable even though an env var locks them — the API never accepts them, so they are already unreachable
  and a pin would refuse nothing. The warn says "not pinnable" rather than "does not exist", because some of them
  do exist and telling an operator otherwise sends them hunting a typo they did not make.

  The vocabulary is a second copy of the patch schema's own shape — unavoidably, since deriving it at runtime would
  import `api/media-config.ts` back into the loader and evaluate a zod bound as `undefined` on one leg of the cycle.
  So it is **gated rather than trusted**: `pinnable-paths-match-the-writable-surface.test.js` compares it against
  the patch schema AND against the loader's own `locked.push` calls, in both directions, and it caught three
  overclaimed paths and twelve missing ones in the first draft of the list.

  Ten mutations, ten caught — including a snapshot of the environment at module load, a case-insensitive match, and
  both drift directions.


- **`recall` and `find-similar` take a `projection`, on both doors.** Asked for by the canary operator with a
  measurement rather than an estimate: a board sweep wanting fifteen names, a `from`, a `kind` and a `status`
  returned **100,547 characters** where the data was about 1.5 KB, and their client refused the response and
  spilled it to disk. `includeContent: false` reads like the answer and is not — it is scoped to file chunks,
  so on an entity search it changes nothing, and that gap between what the parameter sounds like and what it
  covers cost them a call to find out.

  It is `query`'s grammar, dotted paths included, so `{"name": 1, "properties.status": 1}` works. **It applies
  recursively**: a `traverse` answer's `_graph` nodes AND edges are projected at every depth, which is where a
  large answer's size actually comes from — the edge is the whole document, once per hop.

  Two rules it cannot break. The embedding **vector can never be projected back in**; an explicit
  `embedding: 1` is dropped rather than honoured, because a projection was the one parameter that could have
  falsified "the vector is never returned by anything". And on REST the ranking envelope — `score`,
  `spaceId`, `type`, `_graph` — survives every projection, so `{name: 1}` cannot cost you the score the search
  existed to produce. On MCP that needs no rule: the envelope already sits outside `record`.

  The reading of a caller's projection moved into `brain/projection.ts` and `query` now derives its Mongo
  projection from it, so the two appliers cannot disagree about inclusion-versus-exclusion, `_id`'s special
  case, or which fields are unprojectable. `mergeEmbeddingExclusion` keeps its name, its contract and its
  exact output.

### Changed

- **A sync batch-upsert now says what it did with each collection, at debug level.** The receiving half. `200` on a
  batch means it was ACCEPTED, not that a record was stored, and this handler has four ways to accept one and keep
  nothing: an existing tombstone at or above the record's seq, an already-current record, a fork chain at its cap,
  and the same per collection. Every one was already counted and none was logged, so the decision was computed and
  thrown away with the response. Now logged with the seq range, because a count cannot say which record it refers to
  and the question is always about one id at one seq. Reproduced under CPU contention on 2026-08-20 — the sender
  pushes a memory at seq 2, gets a `200`, advances its watermark, and the peer never serves that id, so the record
  is marked sent and is never offered again. The sender's half was already answered by the push logging below: it is
  not stalling.
- **A sync push cycle now says what it looked for and what it decided, at debug level.** Two lines: per collection,
  the cursor it queried from and how many documents it found — empty passes included; and per cycle, the watermark
  before and after beside the counts pushed. Both are `log.debug`, so they cost nothing unless `DEBUG` is set.
  Added for X-20, a propagation stall whose only recorded symptom is that the sender's cycles ran every 3 s in 19 ms
  each — the signature of a cycle finding NOTHING rather than of a slow sender. Nothing in the log could separate
  "found nothing because there is nothing" from "found nothing because the watermark is already past it", and those
  are a healthy cycle and a permanent data loss. `DEBUG` is enabled for the two test instances the pub/sub topology
  test uses, because a failure that only happens in CI cannot be diagnosed by instrumentation that is off there.
- **Gates may no longer bound their subject with a magic number.** `src.slice(at, at + 3000)` decides in advance
  how much of its subject a gate can see; grow the subject and the gate either fails on correct code or passes
  while checking less than it meant to. A character count also spans different LINES on CRLF than on LF, so a
  window that fits locally can fall short in CI.

  Three failed in one session, and the cost is not hypothetical:

  - `index-ready-poll.test.js` at `at + 3000` — a new branch pushed its subject out;
  - `rights-are-explained.test.js` capped a `<thead>` at 1 400 characters — a fifth column took it to 1 770;
  - `rights-matrix.component.spec.ts` asserted a header count `toBe(4)`.

  **The third is why the Space Admin column was reverted five releases earlier.** It had been built, it worked, and
  it was thrown away because a count broke — which reads as *"the feature broke the tests"* rather than as *"the
  test was written wrong"*. The owner had asked five times.

  `testing/standalone/_structural-window.mjs` now holds the three shapes that bound correctly — `bodyOf` (to the
  next top-level declaration), `between` (to the closing marker, with no cap, because the marker IS the bound), and
  `bodyOfEndingWith`, which additionally proves the window reached the end of its subject. Three files had
  hand-rolled the same body-finding loop within hours of each other, which is this codebase's most-produced defect
  arriving in the test suite instead of the product.

  **A ratchet, not a sweep.** 26 magic windows remain across 19 files, grandfathered in a list that only shrinks —
  the same shape `no-new-god-files` uses. Rewriting them blind is how a gate quietly starts checking less than it
  did, because only someone reading a window knows what its real bound is. Four converted here: the three in
  `result-spill-suppresses-vectors.test.js` and one in `startup-index-wait.test.js`, all four subjects I had just
  read. One of them was a `doesNotMatch`, where a short window is at its most dangerous — a `return null` past the
  old 1 800-character cap would have gone unseen, and that is the exact rule whose absence once shipped a truncated
  answer with nowhere to go.

  Two things are deliberately NOT banned, both because reading them showed they are a different thing wearing the
  same syntax: `slice(0, N)` truncating a value inside a failure MESSAGE (79 of those, and a 400-line JSON blob in
  an assertion message helps nobody), and `[\s\S]{0,N}` used as an ADJACENCY bound inside a pattern — *"these two
  must be near each other"* is a deliberate claim, not a guessed extent. A first draft banned the second and found
  30 sites; 30 unread sites is exactly the blind sweep this exists to prevent, so they are recorded as an unassessed
  population rather than a number someone can wave through.

  Six cases, six correct — including a broken pattern reporting "none left", the ratchet slipping upward, and both
  legitimate shapes staying green.

- **A propagation timeout in the sync tests now says WHICH SIDE lost the record.** `waitFor`'s diagnostic hook is
  awaited, so it can go and look rather than being limited to facts already in hand, and the pub/sub arrival wait
  supplies one that reads whether the sender still holds the record, at what `seq`, and where each member's
  watermarks sit.

  For a propagation timeout there are only two possibilities — the sender never sent it, or the receiver took it
  and did not store it — and `waitFor timed out after 25000ms — sync triggers to A all succeeded (8)` cannot tell
  them apart. That is why the intermittent pub/sub stall has survived four rounds of investigation.

  **Added only after the reproduction avenue was exhausted**, which is the order that matters: six attempts —
  three isolated, one inside the full sync suite, two against a freshly rebuilt cold stack — all passed at ~1.1 s
  against the 25 s budget. Four candidate explanations had already been killed by reading source. So the next CI
  occurrence has to be the one that answers it, and this makes it do that instead of restating the symptom.

  It reads `GET /api/networks/:id`, which already returns each member's `lastSeqPushed` and `lastSeqReceived` — no
  server change, and none should be introduced for a test diagnostic. A throwing diagnostic degrades to a note
  rather than replacing the timeout it describes, and it never runs on a wait that succeeded.

  Gated behaviourally against a stub server rather than by reading source: the first version of that gate asserted
  only that the three outcome strings appear, and mutation testing walked through it — replacing a condition with
  `if (false)` left every string in place and the gate green. A branch that is mentioned is not a branch that runs.
  Eight mutations across both rounds, eight caught.

### Fixed

- **After a wiped database, three of the four sync watermarks kept describing sequence numbers about to be
  reused.** `resetStaleWatermarksIfNeeded` exists for a state operators do reach — `docker compose down -v` wipes
  the MongoDB volume while `config.json` survives on a host bind-mount, so the sequence counter restarts at 1 while
  the config still records positions from the previous run. It cleared `lastSeqReceived` and left the rest, and each
  one fails differently: a stale **`lastSeqPushed`** means we push `seq > 47` and **never send our own new 1..47**;
  a stale `lastSeqServed` or `lastFileTombstoneAckedAt` means we believe a peer applied deletions it has not and
  prune the tombstones, so a deleted record comes back from that peer. The push case is the same defect as the one
  the function was written for, pointing the other way, and it is the harder one to notice: the sender's cycles
  complete normally, because `seq > 47` genuinely matches nothing. All four are now cleared from one declared list,
  the reset walks that list rather than naming fields, and the warning enumerates which maps it reset instead of
  claiming one field was the whole job.
  covers.** `PATCH /api/admin/media-config` refuses a write to a pinned field with `403` — but the guard only
  understood nested pins for `faceRecognition`, so a patch overwriting any other pinned `block.field` path
  answered **200** and was written to `config.json`:

  ```
  PATCH {"rerank": {"apiKey": "…"}}   with RERANK_API_KEY pinned   →  200, stored
  ```

  Every `rerank.*`, `nli.*`, `vision.*`, `stt.*`, `embedding.*` and `documentProcessing.assistModel` pin — twenty-one
  paths the loader emits — went unenforced. The effective value never changed, because the environment still wins
  at read time; what changed is that the API reported success for a write it could never honour and left the stored
  config disagreeing with the running one. An operator watching a setting refuse to stay changed was seeing this.

  **The cause was a comment asserting a fact the code around it disproved.** It read *"this is the only one whose
  locks are namespaced today"*, which was false when written, and it told every subsequent reader there was nothing
  else to handle. Its stated fear — that a generic walk *"would silently start applying to blocks that never opted
  in to being lockable"* — cannot happen: a path blocks only if it is IN `lockedByInfra`, which is built from env
  vars that were actually set. A walk cannot invent a lock, only stop missing one.

  Found while implementing the ruling on **P-7** (an explicit pin list), which pins `rerank.apiKey` and
  `nli.apiKey` — so the feature would have been built on a guard that ignored exactly those paths.

  The gate DERIVES the pin vocabulary by scraping `locked.push('…')` out of `config/loader.ts` rather than listing
  paths, so a new pin family is covered the day it lands and starts failing until the guard handles it. It checks
  the scrape found something before trusting it, and the over-blocking direction too — a guard that blocked every
  nested field would make the admin UI unusable on any instance with one pin.

  Six mutations, six caught, including the shipped defect, both wrong `typeof` guards, and over-blocking.
- **A deleted space's index-readiness pollers kept running for the whole window.** `finalizeSpaceIndexReady`
  already knew about a space vanishing mid-build and handled it at the WRITE — *"space was deleted while its
  indexes built"* — but the polling before the write did not. So a space deleted during its own build kept up to
  six pollers alive, each issuing a `listSearchIndexes` every second, until the window expired: 60 s off the boot
  path and **600 s on it**, three spaces at a time.

  Measured in CI on 2026-08-19: twelve consecutive 60-second give-ups for two `gov-…` spaces, every one reporting
  `index not present (saw: none)` — which is what an empty catalogue looks like once the collections are gone.

  This is also the case the terminal-absence guard added alongside it deliberately does NOT cover. That one
  requires the backend to have listed OTHER indexes on the collection, so it can distinguish "not there" from
  "not asked yet"; an empty listing stays ambiguous. A missing SPACE settles it outright.

  Two details are load-bearing. An unreadable config reads as **"the space still exists"** — `getConfig()` throws
  before the first successful load, and index builds run in that window, so the opposite default would have made
  the fix abandon healthy builds during early boot and do it at `debug` level. And the check `return`s rather than
  `continue`s, which would have turned a one-second poll into a spin.

  The gate additionally pins the ORDERING this depends on: `createSpace` builds a space's indexes before pushing
  it into config, which is only compatible with this check because that build passes `waitForVectorReady: false`
  and therefore never polls. It sweeps every `initSpace` caller across both files that have one — a sweep scoped
  to `spaces/lifecycle.ts` would have reported the set complete while missing `app.ts`.

  Five mutations, five caught, including both wrong defaults and both reorderings.
- **The search page showed a shortened answer as if it were the whole one.** The server has reported `truncated`
  since the result spill shipped and the client never read it — so a hundred-match search could render a handful
  of records with nothing anywhere on the page explaining why. Under the old record cap that was three records
  out of a hundred. Not a regression from the byte budget: the client had never read these fields, and typing
  them in that commit is what made the gap visible.

  A notice now appears **above** the results — ordering is the point, not a detail: below the list it would only
  be found by someone who had already read to the end and drawn the wrong conclusion. It says how many of how
  many came back and states both guarantees, because "shortened" on its own reads as "unreliable": every record
  is complete, and they are the top of the ranking with nothing skipped in the middle.

  **`Max response size` joins Show advanced**, which is `maxBytes`. That panel's stated principle is that
  everything the API accepts is reachable from it, and this was the one parameter deciding whether an answer was
  complete that could only be set by hand-writing a request. **One control, not two:** `maxTokens` is a
  convenience onto the same ceiling and the server applies whichever is smaller, so offering both would let an
  operator set two limits and then have to work out which one won.

  `budgetBytes` and `bytesReturned` are deliberately NOT surfaced. They are for a caller tuning a request
  programmatically; in an interface they are numbers nobody can act on, and showing them would make the notice
  read as diagnostics instead of as what happened and what to do.

  Six keys across `en`/`de`/`pl` — the reason this was not folded into the byte-budget PR, since a key added to
  `en` alone fails the client suite on the missing pair. The gate additionally checks that no locale shipped the
  English string by copying it, which passes a coverage check and reaches a reader in the wrong language.

  Four mutations, four caught — and a fifth surfaced a hole in the gate itself: the assertion that a new search
  clears the notice read from `runRecall` to the end of the file, so it also covered `clearRecall`'s reset and
  passed with the first one deleted. Both windows are now bounded at the next method.
- **A sync watermark could advance past a record the peer never received, and then nothing ever sent it again.**
  `lastSeqPushed` and `lastSeqReceived` are one number per member per space, and each cycle runs **five**
  independent transfers under it — tombstones plus memories, entities, edges and chrono. Any one can stop early:
  a non-`2xx` from the peer, or its 50-page cap.

  Both watermarks were set to the **maximum** across those transfers, which is only correct when all of them
  finished. A memories push that failed at seq 300, in a cycle where the entities push succeeded to seq 500,
  moved the watermark to 500 — and **the memory at seq 400 was behind it permanently.** Nothing errored at the
  cycle level, one warn was logged and then discarded, and every later cycle reported success while never
  sending that record again. The pull side had the same shape, and its tombstone fetch was worse: a non-`ok`
  response there had no `else` at all — nothing applied, nothing logged, and the watermark moved past the
  deletions anyway.

  **`docs/sync-protocol.md` already described the correct rule**, in three places: *"if a sync fails mid-way, the
  watermark is not advanced"*, *"a network drop mid-push persists nothing for that cycle"*, and the page-cap
  paragraph's *"nothing is lost"*. The engine did not implement it. All three statements were true per transfer
  and false for the number that actually gates the next cycle.

  The rule is now in one place, `sync/watermark.ts`: a transfer that ran to completion places no limit; one that
  stopped early limits the advance to the last position it actually delivered; the lowest limit wins; and the
  watermark never moves backwards.

  **"Never advance when something was truncated" would have been the wrong fix, and this is the part worth
  keeping.** It livelocks. A transfer that stopped at its page cap has more to give, so the next cycle would
  re-fetch the same pages and stop in the same place for ever, and a space more than one cap behind could never
  catch up — trading one lost record for a space that syncs nothing. A limit keeps both properties: nothing is
  skipped, and a capped transfer still advances by a full page-set per cycle.

  Two details that are load-bearing rather than incidental. The push limit is the last **accepted** seq, not the
  author-guarded maximum: on a `pubsub` or `braintree` network the push filter is empty and this instance relays
  every document it holds, so the author-guarded number would let the watermark pass a relayed document the peer
  never accepted and nothing else was going to send. And the pull records its position **after** the batch
  upsert, never before — vouching first would promise records that a throw between the two had lost.

  A cycle that held its watermark back now says so and names the transfers, because a watermark quietly staying
  put reads exactly like a cycle with nothing to do.

  **This is the collection axis of a hypothesis recorded as killed on the author axis.** Both existing author
  guards are correct and unchanged — they govern *whose* records may move a watermark, never *whether a transfer
  finished*. It is **not** established as the cause of the intermittent pub/sub propagation stall under
  investigation: that run's logs contain no truncated transfer at all. The two are tracked separately until one
  is measured to explain the other.

  Eight mutations, eight caught, including the pre-fix state and both wrong-fix directions.
- **An unconfigured optional feature was reporting fourteen working spaces as broken, permanently.** Enabling
  face recognition with nothing able to write a face vector — `FACE_RECOGNITION_ENABLED=true`, no
  `faceRecognition.externalModel`, no model files placed under `DATA_ROOT` — made every space report a red
  *"Index build failed"*, then `live: "missing"` on the admin health panel, the whole Tools tab `down`, and the
  drift flag this codebase calls the silent-loss signature. On an instance whose search worked normally.

  Reported by the canary operator 2026-08-17T1540Z §8 as three red badges and eleven *"Preparing indexes…"* on one
  screen. **The three and the eleven were one number:** `FINALIZE_CONCURRENCY` is 3, so those were the first
  batch to run out a 600 s window while the other eleven waited for a worker. Their argument is the one that
  matters — *"a red badge that is always red on a working system trains an operator to stop reading red
  badges."* Present in their 3.0.1 logs from 2026-08-14, so not a 3.1.0 regression.

  Three defects, one shape — an OPTIONAL index treated as required:

  - **`waitForSpaceIndexesReady` gave the face gallery a vote on `indexStatus`**, and that field is what paints
    the badge. Recall, traversal and hybrid text all work with the gallery absent, so it is polled and logged
    now but excluded from the verdict. Its rejection is swallowed too — `false` is not the only way an optional
    index can condemn a space.
  - **`pollVectorIndexReady` had no terminal state for an index that does not exist.** Nothing in that loop
    creates one, and `ensureVectorSearchIndex` has four paths that return without creating one — search
    unavailable, `listSearchIndexes` throwing, `createSearchIndex` throwing, a refused width change. Absence
    now ends the poll after 15 s **once the backend has listed other indexes on the same collection**, which is
    what separates "not there" from "not asked yet". This is the same argument the `probe.permanent` branch
    beside it already makes, and it was written for the same measured cost: 600 s per index, then working
    spaces marked failed.
  - **`deriveLiveIndexState` counted it too.** Expected indexes now carry `optional`, and the verdict reads the
    flag rather than knowing any index by name — so a second optional index needs no change there.

  `GET /api/admin/pipeline-status` therefore gains `optional: true` on the affected `collections[]` row. Nothing
  is hidden: an optional index that did not come ready is still reported, with its own status and a log line
  naming what to configure. It just no longer reports it as the space failing.

  Eleven mutations, eleven caught, including all three pre-fix states.

- **The create-token dialog could not grant the two instance-level rights, so an instance admin had to be
  created and then edited.** `draftRights` initialised `instanceAdmin` and `createSpaces` to `false` and no
  control could change them — while `CreateTokenBody` has accepted both throughout. The edit dialog grew these
  controls in #908 and nothing brought them to create; reported by the canary operator 2026-08-17 §9 as the two
  forms presenting different rights surfaces. It was one missing block, not a diverged surface: both forms
  already shared the same per-space matrix, and all four translation keys already existed in en/de/pl.

  Placed **outside** the spaces check, deliberately. That branch renders nothing when the instance has no
  spaces yet, and a fresh instance with no spaces is exactly when `createSpaces` is the right thing to grant.

- **And a THIRD defect, found only by screenshotting the dialog: two of the four rights areas were off-screen.**
  The create dialog rendered at the shared 600px default, so **DATA QUALITY was not visible at all and SCHEMA's
  rungs were clipped mid-cell** — a token could not be minted with a rung in either. The rights dialog sets
  `--dialog-max-width: min(1400px, 94vw)` for exactly this, with a comment recording that 600px was *"reported
  as too narrow"*; the create dialog never did.

  **It was invisible to every measurement.** All five column headers were in the DOM, all eight rung pickers
  were present and countable, `clientWidth` was 598 and `scrollWidth` was EQUAL to it — so nothing overflowed
  and nothing scrolled. The table was squeezed, not clipped in any way an assertion notices. Verified after the
  fix at a 1500px viewport: `clientWidth` 1398, and all four area headers inside the viewport bounds.

- **And a rendering defect found while doing it: `.permission-help` in that dialog had never been styled.**
  It was defined in `tokens.styles.ts`, which only `tokens.component.ts` imports, and Angular scopes component
  styles — so the create dialog's own use of the class had no CSS behind it. **`tokens.component.spec.ts`
  asserted the element was `not.toBeNull()` and passed the whole time**, which is the point: a DOM assertion
  cannot see an unstyled element.

  This is the third time this one file has lost a stylesheet to component scoping — its own header documents
  the first, when extracting the dialog left `.dialog-backdrop` behind and it rendered as a full-width block
  with no backdrop. So `.danger-zone`, `.danger-title` and `.permission-help` now live in `DIALOG_STYLES`,
  which both dialogs import and a move cannot leave behind. The row styles stay in the rights dialog: rotate
  and revoke exist nowhere else. A gate asserts each class is defined in the stylesheet the component actually
  imports, and was mutation-tested by renaming one away.

- **The space-admin rung was enforced everywhere and named nowhere, so nobody could find it, grant it, or
  check they had it.** A token with all four areas at `admin` for one space has administered that space since
  3.0 (`isSpaceAdminFor`), with both containment rules red-teamed. Measured 2026-08-19: that predicate appeared
  in **three server files and zero client files** — the matrix showed four independent rungs and nothing said
  the all-four state had a meaning. The canary operator asked twice, both times about the surface rather than the
  capability.

  Now named on the three surfaces that were blind:

  - **`GET /api/tokens/rights-catalog`** gains `derivedRungs` — `requires`, `grants` and `excludes`. **`requires`
    is COMPUTED from the area list, never written out**, for the same reason the catalog publishes `ROUTE_RIGHTS`
    instead of letting a client type one: a second statement of a security rule is free to disagree with the
    first, and a fifth area would break a hand-written copy silently.
  - **`help()`** names the rung and **marks which spaces the calling token administers**, from the same
    predicate the server enforces with. Naming answers *find it*; the mark answers *verify I hold it*, which
    prose cannot.
  - **The docs**: `07-tokens-api.md` for integrators and `04-settings.md` for operators, both leading with the
    containment — it is never instance-wide, cannot grant `instanceAdmin`/`createSpaces`, cannot set a floor,
    and cannot see or edit tokens for a space it does not administer.

  **No security change and no schema change.** Both constraints already held and are covered by named
  red-team tests; there is deliberately no `spaceAdmin: true` field, because the four rungs already express it.
  `space-admin-rung-is-named.test.js` runs `isSpaceAdminFor` over a matrix built from the PUBLISHED `requires`,
  so the description is proven against the enforcement rather than intended to match it — including that each
  of the four areas is individually necessary.

  Still open: naming it in the rights-matrix UI and granting it in one action, which needs three locale files.

- **The brain-ops guide still described the 25-record spill cliff that the byte budget replaced.** It told a
  caller the answer collapses to *three matches* past 25 records and documented a `complete: {matches, records,
  inline, path, download, expiresAt}` block — a shape that no longer exists. Rewritten to the budget: a whole-
  record prefix bounded by `maxBytes`, the five always-present accounting fields, and `remainder` carrying only
  what did not fit.

  **Found by a targeted staleness sweep rather than by a gate, and that is the point.** `release:gate` passes
  on this page — it checks that documented things exist and existing things are documented, and every noun in
  that paragraph existed. A sentence that is about a real feature and describes it WRONGLY is invisible to a
  coverage check, which is why the docs lens greps for the vocabulary a change made obsolete instead.
- **A sync push could drop a record permanently and report it in the same number as "nothing to do".**
  `POST /api/sync/batch-upsert` counted two outcomes in one `skipped` integer:

  | outcome | meaning | lossy? |
  |---|---|---|
  | `existing.seq >= incoming.seq` | the receiver is already current | **no** — ordinary conflict resolution, and the common case by far |
  | `depth >= MAX_FORK_DEPTH` (memories) | content diverged at an identical `seq` and the fork chain is at its cap, so the incoming version is discarded | **YES — the record is gone** |

  And `sync/engine.ts` checked only `resp.ok`, never the body — so the pusher advanced `lastSeqPushed` past the
  discarded record and **never offered it again**. A permanent loss, invisible from both sides: unlogged on the
  receiver, unread on the sender.

  `forkDepthRefused` is now its own counter, logged at **warn** by the receiver naming the record id and saying
  it will not be retried, and read and logged by the pusher as well — both ends, because either log may be the
  only one somebody has. A peer that omits the field reads as zero, and an unparseable body does not fail a push
  the peer accepted.

  **The watermark still advances, deliberately.** The receiver would refuse the identical record on every future
  cycle, so holding it back would stall the space's sync rather than deliver anything. **The fix is visibility,
  not delivery** — the same conclusion the media-worker swallow reached earlier in this cycle.

  **Found while investigating an intermittent sync test, and NOT yet shown to cause it.** The first version of
  this note called `skipped` a silent-loss path *by construction*; reading the conditions corrected that — most
  skips are correct and must stay silent, or the one that matters drowns. A gate now pins that asymmetry: the
  drop is logged, the already-current skip is not.
- **The MCP `recall` tool refused the raw-MongoDB filter its own description promised and REST delivers.**
  Its `inputSchema` declared the operator-object grammar only — `propertyNames` restricted to the key
  allowlist, and every value required to be an object of `eq`/`ne`/`in`/`exists`/`gt`/`gte`/`lt`/`lte` with
  `additionalProperties: false`. **The dispatcher validates arguments before the handler runs**, so that was a
  hard refusal the resolver never got to answer.

  Measured on one instance, one space, the same instant, with the canary operator's own filter from
  2026-08-17 §10:

  ```
  filter { type: 'message', 'properties.readBy': { $not: { $regex: 'ythril' } } }
    REST  POST /recall  ->  200, returns the record
    MCP   recall        ->  isError: /filter/type: must be object;
                                     /filter/properties.readBy: unexpected property '$not'
  ```

  **Two refusals in one filter, and both are the schema being narrower than the server**: a bare
  `type: 'message'` is valid raw-Mongo equality, and `$not` is on the allowlist `query` takes. The 3.0.0
  notice promised the raw grammar and the tool description repeated it, so a caller who read either was told
  they had something the schema refused.

  The schema is now `type: 'object'` plus its description, exactly as `query`'s filter has always been
  declared, and `resolveRecallFilter` is the only gate — it already accepts either grammar, refuses a MIXED
  one, and enforces the key allowlist RECURSIVELY so `$or` cannot smuggle a key past it. **Widening the
  grammar did not widen the keys:** an out-of-allowlist key and a mixed filter are still refused, now
  identically on both doors.

  `RECALL_FILTER_KEY_PATTERN` is DELETED rather than left unreferenced. Its own comment admitted it *"mirrors
  `ALLOWED_FILTER_KEY_PREFIXES` (brain/filter.ts)"* — one allowlist, two encodings, free to drift, and the
  schema-side copy is the one that drifted narrow.

  `recall-filter-parity-both-doors.test.js` sends nine filters to both doors and compares the verdicts,
  asserting the expected verdict as well as the agreement — two doors agreeing on the WRONG answer would
  satisfy an agreement-only test, and before this fix they agreed on refusing all four raw cases.

- **`help`'s `structuredContent` was an index with no guide in it, so a client that reads that field found the
  discovery tool empty.** It now carries `guide`, byte-identical to `content[0].text`.

  The canary operator reported this on 2026-08-17 as *"the section index plus `matched` and no bodies, in both
  modes"* and it was filed as `help()` returning no section bodies. **It never did that.** Measured on
  2026-08-19 against the same unchanged code: `content[0].text` is **76,754 characters** with all six section
  bodies, while `structuredContent` was **599**. Their own report identifies where they read — `matched`
  exists nowhere in the prose.

  **`query` had the identical defect and was fixed; `help` was overlooked, and the comment beside `query`'s
  repair is why.** It claimed *"the only tool with that shape — every other structuredContent in this layer
  carries its own payload"*, which was true of the eight it described and false of the ninth. A universal
  claim in a comment stops the next person checking, so it is replaced by
  `mcp-structured-content-carries-its-payload.test.js`, which sweeps every tool and refuses a
  `structuredContent` assembled from metadata keys alone.

  **This was the worst tool to get wrong.** A client that asks what exists, receives an index, and concludes
  the guide is unreachable does not then hunt for the parameter that would have corrected it — two further
  reported items were raised downstream of that belief. The tool description now names both fields, since it
  is what a caller reads while constructing arguments and it did not say.

  Nothing breaks: `content[0].text` was and remains complete, so a client reading the prose is unaffected.
- **The media worker discarded a paid model result and a terminal status, both without a word.** Two writes
  in `files/media/worker.ts` were `.catch(() => {})` with no log, no counter and no comment saying why.

  The first follows `describeDocument()` — a model call with its own timeout — and is the only place its
  description, excerpt and source land. A failed write meant the call was made and paid for, the result was
  gone, and the job went on to report success: a file with no description and nothing anywhere saying why,
  indistinguishable from a document there was nothing to describe.

  The second writes `embeddingStatus: 'skipped'` when a conversion fails permanently, and
  `mediaJobsFailedTotal` is incremented either way. A failed write left the METRIC saying "permanently
  failed" while the RECORD said `processing` for ever — a dashboard and a file page disagreeing, with the
  dashboard right.

  Both now log at warn, naming what was lost rather than that something failed. **Neither throws**, and that
  is deliberate: failing the job would retry a document whose analysis already succeeded and re-pay for the
  model. The fix is visibility, not severity.

  Found by a reliability sweep for the shape this release cycle produced four times — an operation that
  fails and reports success. That sweep finds 118 swallowed `catch` sites in `server/src` and the great
  majority are correct; narrowing to swallows on a WRITE, minus those whose own comment states a reason,
  left these two.



- **`includeContent` read as a general size lever and is file-chunks-only, and now says so.** Its own
  description made the right general argument — every field a result carries is multiplied by `topK` — while
  the parameter touches nothing but file-passage bodies, so on a search returning entities, memories, edges
  or chrono entries it changes nothing at all. The canary operator: *"that gap between what the parameter
  sounds like and what it covers cost us a call to find out."*

  Both tools and the REST reference now state the limit and point at `projection`, which is the lever that
  names fields on any type. Fixing the description was promised on the board when the projection was
  accepted; this is that promise rather than a tidy-up.



- **Publishing a tag pushed the images and never announced them, so six releases were invisible.**
  `publish.yml` triggers on `v*`, builds, and pushes to both registries — correctly, every time. It did not
  create a **GitHub Release**, and nothing else did, so `v2.6.0`, `v2.7.0`, `v2.8.0`, `v2.8.1`, `v3.0.0` and
  `v3.0.1` shipped as images with no entry on the Releases page. It showed **2.5.1 as Latest for five
  weeks**, which for anyone watching the repository read as a project that had stopped.

  Nothing noticed because nothing was watching for an ABSENCE: every check asked whether something that
  happened was correct, none asked whether it had happened at all.

  The workflow now creates the Release as its LAST step — after the image is pushed and after the licence
  checks pass against the published artefact, because announcing a build that then fails its own NOTICE
  verification is worse than announcing nothing. The notes are the CHANGELOG section for the tag, through
  the same extraction the release gate uses to check that section is dated and non-empty; a tag pushed
  without closing `[Unreleased]` now fails there instead of publishing a release that describes nothing.

  `--latest` is computed from whether the tag really is the highest rather than left to `gh`'s default, so
  backfilling an older release cannot announce a superseded version as newest. A re-run updates the notes
  instead of erroring after the images have already gone out.

## [3.1.0] — 2026-08-17

### Breaking

- **`find_similar` over MCP now returns JSON at every depth.** It answered plain TEXT at `traverse: 0` — a
  `Source:` line and one numbered summary per match — and JSON only above it, while `recall` on the same
  door has always been JSON throughout. A client that parsed one answer from this tool could not parse the
  other, and nothing said so. Owner ruled it after the 3.1.0 docs audit surfaced it: *"json at every depth
  of course"*, with the same per-result shape `recall` uses.

  Two things arrive with the change, and neither was reachable before:

  - **The default depth gains the size cap it never had.** The JSON answer spills past a size threshold and
    sets `truncated` with a download for the full set; the text answer was bounded by nothing but `topK`, so
    a large call returned everything inline. That is the second time a "plainest large call" went uncapped.
  - **`includeContent` and `includeDiagnostics` start doing something there.** A summary line carried
    neither passage bodies nor system fields, so both flags were accepted at `traverse: 0` and unobservable.

- **`recall` and `find-similar` over REST no longer return six system fields by default.** `matchedText`,
  `embeddingModel`, `seq` and the per-stage `lexicalScore`/`fusedScore`/`rerankScore` were returned
  unconditionally on REST and never on MCP, and neither door said so. Pass `includeDiagnostics: true` to get
  them back — the same parameter, the same default, on both doors.

  `matchedText` is the pre-embedding source string, which for a file chunk is the passage a SECOND time, so
  the old default sent the largest field twice per result, `topK` times, to callers who had not asked.

  **It applies recursively.** A `traverse` answer's `_graph` follows the flag at every depth, on the nodes
  and on the edges — an edge is a searchable record with a `matchedText` of its own, and a depth-2 walk off
  ten seeds could carry more diagnostic text than the matches it was expanding.

- **`_graph[].node` is now the same field set on both doors.** MCP mapped the entity through an allowlist
  while REST attached the stored document, so a REST caller received `_expireAt` and every other stored
  field. Both now use one shaper. The envelope still differs by transport — REST returns a flat result, MCP
  nests it under `record` — which is deliberate: the owner's rule is the same CONTENT in each transport's
  natural shape, and a gate compares the flattened key sets of both doors at the result level and at every
  depth of `_graph`.

### Changed

- **`npm run todo:check` now holds the owner's DECISIONS page to open decisions only.** It had reached 312 lines
  with SEVEN entries filed as open questions already decided — five of them shipped — because the file sat on the
  checker's exemption list. That exemption's stated reason, *"indexed by outcome rather than queued"*, described a
  version of the file that held outcomes; they moved to `_REFERENCE.md` and the exemption stayed. So one unchecked
  page accumulated resolved history for weeks while every checked page stayed clean.

  The damage is not the length. **One settled row makes every other row less believable**, so the reader has to
  re-check all of them to find out which still count.

  Two rules, in `scripts/parked-decisions-rules.mjs` so they are pure and fixture-testable — `todo/` is gitignored
  and absent in CI, so a rule that only read those files could never be shown to fail, which is the same reasoning
  that extracted `matchIndexReference`. A section heading may not announce a resolution, and no decision may be
  both filed as open and recorded as decided. The second is the one that bites: a coverage check can only see that
  something is mentioned, while drift needs the second copy compared.

  **Both false positives are part of the rule, not omissions.** `## P-10 — six tags shipped with no GitHub`
  `Release` is a real, open entry — "shipped" describes the tags, not the decision — and live entries say "fixed"
  and "reverted" in their prose. The first version fired on that heading. A gate that trips on a live item's
  wording teaches people to word entries around the gate instead of writing what they mean.

  **A third rule was needed within the hour, because the first cleanup still missed one.** P-10 had been ruled by
  the owner and said `CLOSED` in its own text, and it stayed on the page. Neither rule could see it: the heading
  scan skips `P-N` titles and never reads bodies, and the cross-check needs a reference row nobody had written.
  **The ruling was in the body — the one place nothing looked.** And the manual pass missed it for a worse reason:
  each entry was verified by asking whether the code had shipped, and this ruling was *do nothing*, so the six
  absent GitHub Releases were the IMPLEMENTED OUTCOME and read as evidence the question was open. **An absence
  cannot tell "not done" from "deliberately not done"; only the ruling can.**

  So `rulingsLeftOnThePage` matches SHOUTED markers — `RULED`, `CLOSED`, `OVERRIDDEN`, or "Owner ruled" —
  case-sensitively, because that is how this repo writes a ruling and not how it writes prose. It attributes each
  marker to the entry it sits under, reports an entry once however many markers it carries, and ignores the page
  preamble, which legitimately says that decided items live elsewhere.

  Eleven mutations across the three rules, eleven caught. A twelfth was dropped as an equivalent
  mutant with the reason recorded rather than chased: on CRLF text `split('
')` and `split(/
?
/)` yield arrays
  of the same length, and the call reads `.length`.

- **`excludeFromVectorSearch` is now `suppressEmbeddings`, which is what the two tiers below it were already
  called.** One switch had two names: the per-record flag said `excludeFromVectorSearch` while a type schema
  and the space both said `suppressEmbeddings`, and `record > schema > space` resolved between them. Nothing
  in the record-level name hinted the other two existed, so a record with no vector and no flag of its own
  read as a bug. Worse, the old name described the wrong thing — *"excluded from vector search"* reads as
  *removed from search*, which would include traversal, and it never did. It is the absence of a vector, so
  `query`, `list`, `get`, the `traverse` tool and recall's own `traverse` expansion all still reach the
  record in full.

  **Existing callers keep working.** `excludeFromVectorSearch` is still accepted on the REST `PATCH` routes
  and the MCP `update_*` tools for all four record types; if a request carries both, `suppressEmbeddings`
  wins. It is no longer offered anywhere — not in a tool schema, not in the integration guide — because a
  description is what a caller constructs arguments from, and naming both would rebuild the problem. The
  alias is listed for removal in 4.0.

  **A mixed-version network stays correct in both directions.** These collections replicate by whole-document
  replace rather than field merge, so a write stores both spellings: a peer on an older build keeps finding
  the key it knows, and this build prefers the new key and falls back to the old one. Without that, an older
  peer rewriting a record would drop a flag it does not understand and re-embed a record its owner had asked
  to keep unembedded.

  Along the way the record tier stopped being four separate implementations — two readers spelling the rule
  out inline, and two Mongo filters — and both API doors stopped disagreeing about a bad value: MCP accepted
  a non-boolean by silently dropping it while REST answered `400`. Both now refuse it with the same message.

### Fixed

- **A graph traversal returned raw embedding VECTORS.** The edge lookup inside `traverseFromSeeds` was the
  one query in the codebase fetching documents with no projection, and the edge document is returned
  verbatim as `_graph[].edge` — so every `recall(traverse: n)` and every `traverse` call shipped a float
  array per hop, on both doors, while the documentation said the vector is never returned by anything.

  The query now projects it out, and the result shaping strips it a second time on a path
  `includeDiagnostics` cannot reach. Nothing consumed it, so this is pure subtraction.


- **`recall`'s MCP description listed two fields it does not return, so callers budgeted for them and went
  looking for the flag to switch them off.** It said each result carries `seq` and `matchedText`;
  `toRecallRecord` is an allowlist and has never emitted either. `matchedText` is the pre-embedding source
  string — for a file chunk, the passage a second time — so the sentence described a response roughly twice
  the size of the real one. `docs/integration-guide/16-mcp.md` had it right, in a blockquote partway down
  the page: two surfaces describing one behaviour, and the wrong one was the one read while constructing
  arguments.

  The description now lists what the door withholds and why, rather than only what it sends. **And the thing
  nobody had written down anywhere: the embedding vector is never returned, by anything, on either door, and
  there is no parameter that asks for it** — `query` strips an explicit `embedding: 1` out of a caller's own
  projection, so it cannot be opted back in. An absent statement is indistinguishable from an undiscovered
  feature, which is how this was raised.

  `help()`'s retrieval section, the `query` tool description and the brain-API reference now all name the
  two levers that do exist — `projection` on `query`, `includeContent: false` on `recall` — from where
  somebody would look for them rather than only from inside the tool that carries them. The REST list routes
  still have no field selection; that is now stated instead of being silent.

- **`excludeFromVectorSearch: false` was documented as "do embed" and does not mean that.** It is the top of
  three tiers of one mechanism — a type schema and the space both carry `suppressEmbeddings`, resolving
  `record > schema > space` — and a stored `false` arrives at the resolver as *not stated*, so it falls
  through rather than overriding. Sending `false` on a record whose type or space suppresses embedding
  therefore succeeds and changes nothing, while the MCP schema said in as many words "or return it to it
  (false)".

  Both doors now say what `false` does, and both name the other two tiers. Nothing in the record-level name
  suggested they existed, so a record with no vector and no flag set read as a bug rather than as the space
  setting doing its job. The record-side reference now states the tiers the schema-side page already
  described; one direction is not parity, because a reader who starts at the record flag never opens the
  schema page.

  The traversal answer the owner asked for is unchanged and still stated: recall's `traverse` expansion walks
  edges and never consults a vector, so an excluded record is reached exactly as before.

- **Listing chrono entries by `status=overdue` hid the entries somebody had marked overdue.** `overdue` is
  worked out from the clock rather than stored — an entry left `upcoming` past its due moment is returned as
  overdue — so the filter was translated to look for exactly that: stored `upcoming`/`active`, past due.

  But `overdue` is also a value you are allowed to store. Every write door accepts it, including the Brain's
  own status dropdown, and it is passed through unchanged on read. So the filter returned the entries nobody
  had touched and left out the ones somebody had deliberately marked — backwards from what the name promises.
  It now matches both.

- **Combining a chrono filter with a search could silently drop one of them.** Three separate filters wanted
  the same two MongoDB keys and each assigned rather than accumulated: the tag pair took `$and`, the substring
  search took `$or`, and the fix above needed an `$or` of its own. Two of those in one request and the later
  assignment erased the earlier constraint — no error, just more rows than asked for. Compound clauses now
  accumulate, so the mistake is no longer expressible, and the query builder is a pure exported function with
  its combinations asserted directly.

  The scan budget for those clock-comparing filters follows the decision rather than the shape of the query.
  It was chosen by looking for a top-level `$expr`, which the fix above moves inside an `$or` — so the one
  filter that got more expensive would have quietly gone back to the long timeout.

- **`remember` said "there is no id to update" while accepting an `id` to update.** The parameter sat in the
  same schema, describing itself as *"UUID v4 of an EXISTING record to update"*, and the code has the branch to
  match: a supplied id that already names a record **converges** rather than duplicating, unioning tags and
  shallow-merging properties exactly as `upsert_entity` does.

  That branch is the retry-safety contract — it is what makes repeating a timed-out write safe. A caller who
  believed the prose would instead issue a fresh insert and end up with two records, which is the one outcome
  the feature exists to prevent. The description now says what an id does, and a gate holds it to the code
  rather than to a sentence.

### Changed

- **Every MCP parameter description now says the trap rather than the type, and a gate holds the line.** 62
  were under forty characters — `"Source path."`, `"Entity name."`, `"Collection to query."` — which passes a
  has-a-description check and tells a caller nothing they could not read off the key. `help()` names the tool
  schema as the authoritative reference, so a parameter described that way is a capability nobody can use
  properly.

  Also corrected: `update_chrono` promised that **"`endsAt` before `startsAt` is refused"**, and nothing
  anywhere performs that check. Such an entry is stored as sent — and because `endsAt` becomes the due
  moment, it reads back as `overdue` immediately. Both the tool and the gate now say so, and the gate asserts
  the *absence* of the check rather than the wording, so it flips the day somebody adds the validation.

  What the new text adds is what the source says and the name does not: `upsert_entity.name` deduplicates
  nothing, so omitting `id` inserts a second entity of the same name; `update_edge.label` is part of the
  identity `upsert_edge` matches on, so renaming it makes a later upsert create a second edge; `move_file.dst`
  replaces an existing file with no refusal; `update_file_meta.properties` replaces the whole object where the
  brain tools merge key by key; `create_space.label` is not the identity, the derived `id` is.

  The five file tools' path arguments became one shared `filePathSchema` instead of the same 37-character
  sentence copied four times. It now states the three facts that decide whether a call works, all from
  `files/sandbox.ts`: a leading slash is **stripped** rather than refused, so `/a/b.md` and `a/b.md` are the
  same file; paths are Unicode-normalised, so two spellings of one accented name resolve together; and a `..`
  that would leave the space is refused.

### Removed

- **`spaces` is no longer stored on a token — the last of the three, and the pre-3.0 triple is gone.** Every
  scoping decision has read the rights matrix for some time; this release closed three separate holes where
  one had not, each a check shaped `if (token.spaces)` that meant *unrestricted* on a token whose scope lived
  only in the matrix. With nothing consulting the allowlist first, the field itself could go.

  **Creating a scoped token is unchanged.** Send `spaces: ["research"]` and you get a matrix row for that
  space, exactly as before; responses still carry `spaces`, derived. Tokens created earlier keep their
  scope — the load-time migration reads the stored value to build their matrix, and OIDC sessions keep their
  own copy because they are built per request from a claim mapping and have no matrix.

  Removing it surfaced two more places reading the allowlist alone, both now on the matrix: which peer tokens
  a sync watermark is computed for, and which tokens a space-restricted administrator can see in the token
  list. Both would have treated every modern token as unrestricted.

- **`admin` is no longer stored on a token either — the second of the three pre-3.0 fields.** Every check had
  already moved to the rights matrix in this release, and the seven places that each asked *"is this an
  instance admin"* their own way became one predicate first, against evidence that the two answers were
  identical for every storable token shape. With one reader instead of seven, removing the field was
  mechanical.

  **Creating an admin token is unchanged**, and so is every existing token's access. Send `admin: true` and
  you get `instanceAdmin` plus `createSpaces` plus the admin rung everywhere, exactly as before; the result
  lives only in the matrix now. Tokens created earlier keep their scope — the load-time migration still reads
  the stored flag to derive their rights.

  **OIDC sessions keep their own flag**, because they are built per request from a claim mapping and carry no
  matrix; the predicate falls back to it for exactly that case.

  **If you read `admin` off a token record, read `rights.instanceAdmin` instead.** Note it is *not* the same
  as holding the admin rung in every space — that grants those spaces, and says nothing about spaces created
  tomorrow or about instance-shaped routes.

  Three MCP handlers also stopped re-checking it. Each sits inside a tool the dispatcher already refuses
  without instance-admin rights, so the check was a second copy of a rule enforced above it — the same shape
  that once made a tool refuse a space administrator its own guard had just admitted.

- **`readOnly` is no longer stored on a token — the first of the three pre-3.0 fields to go.** Nothing had
  decided on it since 3.0: every write check reads the rights matrix, and the copy threaded from the token
  record through the MCP server into every tool's call context turned out to be read by **no tool at all** —
  four layers of plumbing carrying a value nobody consulted. Keeping it meant two spellings of one fact, with
  the older one free to drift from the newer.

  **Creating a read-only token is unchanged.** Send `readOnly: true` and you get `read` in every area of
  every space it reaches, exactly as before; the result is now expressed only in the matrix. **Tokens created
  earlier keep their scope** — the load-time migration still reads the stored flag to derive their rights.

  **The token API still returns `readOnly`, so no client breaks.** It is derived from the matrix now rather
  than read from the record: a token is read-only precisely when its rights grant no write rung anywhere.
  That is also right for a token nobody ever set the boolean on but which holds only `read` — a case the
  stored flag could not express and answered `false` for. Dropping the field from a published response is a
  separate, breaking change and is not part of this one.

  `admin` and `spaces` follow separately: deleting a field is all-or-nothing, so they are measured and
  scheduled on their own rather than half-done together.

- **The legacy `/setup` HTML form, so the app's own first-run page is finally the one you see.** The
  server-rendered form had been mounted at `/setup` since before the single-page app existed, and a server
  route wins over an app route — so the app's setup page had never actually served a first run, on any
  instance. The two were not the same flow either: the old form asked only for an instance label, while the
  app's page also sets the **settings password** used for admin access later. Removing the mount is what makes
  that page reachable. Because this is the path a brand-new instance starts on, the change was proven end to
  end against a real first run rather than argued from the code: `/setup` now serves the app, setup completes,
  the access token appears, and it works on the API. Nothing changes for an instance that is already
  configured — the old form returned `404` there anyway — and `/api/setup` is untouched.

### Fixed

- **The chrono tools said the opposite of what the code does about `status`, on four tools.** A capitalised
  warning on `list_chrono`, repeated on `create_chrono`, `update_chrono` and `delete_chrono`, read *"NOTHING
  RECOMPUTES `status` FROM THE CLOCK … `status: "overdue"` only finds entries somebody marked overdue. Filter
  on the dates if you want the truth about time."*

  Every clause was false. `overdue` is **derived on read** and always has been: an entry whose due moment has
  passed and that is still `upcoming`/`active` reads back as `overdue` from `list_chrono`, `recall` and a
  single-entry get, and the list filter is translated to match — so `status: "overdue"` finds exactly those,
  and `status: "upcoming"` *excludes* them. The paragraph steered a caller away from the one filter that
  answers the question, toward a date predicate they did not need.

  The REST reference described it correctly the whole time. One behaviour, two contradictory descriptions,
  and the wrong one was the one an agent reads while constructing arguments. All four now say it is derived,
  name the one path that does **not** derive (`query`, which reads documents as stored), and warn against
  storing `overdue` by hand — a stored `overdue` is missed by the `status=overdue` filter, which looks for
  the derivable ones. That last point is a defect rather than a design and is now written down as one.

  A gate exercises `deriveChronoStatus` and holds the sentences to what it returns, rather than checking the
  spelling of the old paragraph.

- **Four source-reading gates could pass on one machine and fail on another, for a reason invisible in the
  diff.** Each bounded the source it examined by a character count — `slice(anchor, anchor + 400)`. A count
  bounds *distance*, and a Windows working copy stores CRLF where CI checks out LF, so the same number spans a
  different number of lines on each. One of them examined a statement locally and its neighbour in CI. Where
  the assertion was a negative one, the failure mode is the dangerous direction: a window that quietly shrinks
  makes a gate pass by looking at less.

  All four are bounded by structure now — an interface's own braces, a route handler's closing `});`, a
  statement's own semicolon — and a sweep of all 409 gates confirms none of the class is left. Two of them got
  stronger in the process: bounded by the whole `TokenRecord` interface rather than forward from a member, they
  now catch a deleted field re-added *above* the old anchor, which the character window could never see.

### Changed

- **Every MCP tool parameter now carries a description — including the nested ones.** 26 had none at all, so
  a caller constructing arguments from `tools/list` — which `help()` names as the authoritative reference —
  had nothing to read. 18 of the 26 were inside `bulk_write`'s per-item schemas, which a top-level sweep
  reports as clean.

  The new text says the trap rather than the type. `bulk_write`'s per-item schemas are for discovery only, so
  `edges[].weight` is **not** bounded to 0–1 there while `upsert_edge` bounds it, and a `chrono[].status`
  outside the enum is discarded silently without appearing in `errors` — a third silent loss on a tool that
  already documented two. `upsert_entity.tags` merges rather than replaces, so no value sent there removes a
  tag. The chrono `recurrence` block became one shared schema instead of two near-identical copies whose one
  required field, `freq`, was undescribed in both; it now states that the rule describes an entry and
  generates nothing.

  A gate walks every schema to full depth and refuses a parameter with no description, or one that merely
  restates its own key.

- **`wipe_space` now describes what it actually does to a space, beyond removing the records.** Omitting
  `types` wipes **all five** collections rather than none — an absent filter is not a safe default. The
  duplicate and contradiction queues are cleared along with the records they point at, because a finding is a
  claim about two records and once those are gone it is not stale but *unopenable*. Wiping an already-empty
  space succeeds with zeroes rather than erroring. And on a networked space it now opens a vote — see
  **Breaking** below, which is the behaviour this description originally only warned about.

- **Every instance-admin check now reads the rights matrix.** `enforceAdmin` — the one function behind every
  admin route — gated on the deprecated `admin` boolean, and six other places asked the same question their
  own way: the space-admin guard, the scoped guard, the peer-relay check, the trusted-relay check, the
  `maxGiB` carve-out, and the last-admin lockout guard. Seven copies of one authorization question, where a
  copy that drifts means a token reaching a route it never could, with no error to show for it. They all ask
  one predicate now, which reads `rights.instanceAdmin` and falls back to the old flag only for a record
  carrying no matrix — an OIDC session, which is built per request and legitimately has none. **No token's
  access changes**: the two were proven to answer identically across every storable token shape before the
  switch was made, in its own change, and the mint route refuses `admin` as an input so a divergent pair
  cannot be created.

- **`bulk_write` now says where it loses data quietly.** Anything past **500 entries per collection is
  discarded before validation** — it appears in neither the inserted counts nor the error list, so a 600-item
  import stores 500 and the reply says nothing about the other 100. The cap was previously mentioned only
  inside one parameter's own text, where a caller reading the tool summary would never meet it, and nothing
  said the loss went unreported. The description now leads with it, and with the related trap: because this
  tool reports bad items rather than failing, **a call that returns normally may have written nothing**, so
  the inserted counts and the error list both have to be read. It also states an asymmetry with the
  single-record tools — bulk checks that a reference is a well-formed id but never that it exists, so it can
  store a dangling link that `remember` or `update_memory` would have refused under strict linkage. That is
  deliberate, since a batch may legitimately reference an entity created later in the same payload, and the
  description now says so, so nobody "fixes" it into rejecting valid forward references.

- **The four delete tools now say what they do *not* delete, and which of them can refuse.** Three of them
  read *"Delete an X by ID. Creates a tombstone for sync propagation"* and nothing else, which left a caller
  to discover the interesting parts by doing it. Deleting an **entity** is refused while something still
  points at it, on a space with strict linkage — that guard exists only for entities, so deleting a memory,
  edge or chrono entry is never refused and can leave a reference dangling on a space configured to forbid
  exactly that. Each description now says which side it is on. They also say that deleting an edge leaves both
  entities and every other edge between them untouched; that a chrono entry's links are references rather than
  contents; that a recurrence rule creates no series, so there is no "and all future occurrences" to worry
  about; and that the tombstone is why re-creating a record with the same id does **not** undo the delete. Each
  one now points at `excludeFromVectorSearch` first, because "stop this appearing in search" is a different
  request from "destroy this" and only one of them is reversible.

- **The file move, delete and mkdir tools now describe what they do besides the obvious.** Deleting a file is
  a **cascade**, not an unlink: it also writes a sync tombstone, removes the metadata record, **cancels any
  queued media or text job** so it cannot outlive the file and retry for ever, removes extracted text and
  thumbnails, and fires a webhook. It is also **idempotent** — deleting a path that is not there succeeds,
  which is the opposite of all four brain deletes, so a success is not proof the file existed. Moving
  tombstones the old path because sync has no rename detection and would otherwise push the original back
  from a peer, leaving you holding both; a directory move re-roots every child's tags and description; and
  nothing checks the destination first, so a move onto an existing path is not refused. Creating a directory
  is mostly unnecessary — writing and moving create their own parents — and an empty directory never reaches
  a peer, because only files sync. Each claim is pinned to the function that makes it true, so a behaviour
  that changes fails the description instead of quietly outdating it.

- **The four record-editing tools now say whether a list you send is added to what is stored or replaces it —
  and they do not all do the same thing.** Editing an entity or an edge MERGES tags; editing a memory or a
  chrono entry REPLACES them. So sending one tag adds it in two cases and destroys every other tag in the
  other two, with no error either way, and nothing in the tool descriptions said which you were doing. The
  split is deliberate and long-standing, so it is now stated in capitals on the tools that replace, rather than
  quietly unified. Properties merge on all four, as they always should have. Each description also answers a
  question that had no written answer anywhere: excluding a record from vector search removes its **ranking**,
  not the record — traversal, listing and direct reads all still reach it, and an excluded record linked to an
  embedded one still appears in that neighbour's graph. A build check pins each claim against the store it
  describes, so unifying the behaviour later fails the prose instead of silently outdating it.

  This surfaced one real gap, filed rather than fixed here because it is a capability change: **a property
  written to a chrono entry cannot be removed at all.** Chrono is the one record type with no `deleteFields`,
  its properties merge, and an absence never means "delete" — so there is no expression that unsets a key. The
  description now says so where a caller looks for the parameter, and names the two workarounds.

- **The embedding-queue tools now say which queue they act on — one of them is not the queue its name
  suggests.** `retry_failed_embeddings` sits directly beside the tool that lists pending and failed record
  embeddings, and re-queues the **media** pipeline instead: image captioning, transcription, document
  extraction. So the obvious sequence — list the failures, then retry them — quietly acted on a different
  queue and reported a count unrelated to what was listed. Both references now say which queue is which and
  name the right tool for a single record, and a build check pins that description against the code it calls
  so the two cannot drift. Renaming it properly is a breaking change and is filed separately. The job listing
  also now explains its two counters, one of which is new in this release: attempts spent on failures a retry
  cannot fix, versus times the embedder simply did not answer. A job with many of the second and none of the
  first is an outage waiting itself out and needs nothing from an operator; a failed job that used up the
  first is a record whose content needs fixing. It also notes that failed jobs are retried once automatically
  after a version upgrade, so there is no need to sweep them by hand.

- **Listing spaces and reading their counts now orient an assistant that has just connected.** Listing spaces
  is the first call anything makes in an unfamiliar instance — every other tool needs a space id, and the ids
  are not guessable from the labels — and the reference never said so. It also now says that a space's stated
  **purpose** is the owner telling the assistant what belongs there and how to behave in it, rather than one
  more descriptive string: a purpose exists because somebody needed it followed. The counts are framed as a
  planning aid, since an empty space is not worth searching and a very large one needs a filter rather than a
  broad question. Record counts now say what they do **not** mean: they are totals, and they include records
  retired from search and records whose indexing has not finished, so a count larger than a search result is
  normal rather than a sign of a broken index — with the tool that answers the indexing question named. Both
  also now say that a space grouping other spaces reports their totals combined, so four spaces are not
  mistaken for one large one.

- **Punctuation mangled into `â€"` is repaired across the server sources.** Seven files carried text that had
  been read as one character encoding and written back as another, turning every dash and curly quote into
  three garbled characters. Six were long-standing; one was introduced earlier in this same release and
  affected the token API's own reference text, which is read by agents. It compiled and every test passed,
  because the damage only ever lands inside comments and human-readable strings — which is exactly where it
  matters, since some of those strings are what an assistant reads to decide how to call the API. A build
  gate now scans every tracked source file for the signature, so it cannot happen quietly a third time.

- **The two destructive entity tools now say they cannot be undone, and name the gentler thing you may have
  meant.** An agent deciding whether to call a tool has no undo and no confirmation dialog, so the reference
  is the only place that warning can live. Deleting a record now points at retiring it from search instead —
  which keeps it readable and reachable through its links — because a reference that does not name the
  alternative makes the destructive option the only one anybody finds. It also explains that a refusal to
  delete a record other things still point at is usually **correct**: it means the deletion would orphan
  something, and merging is the way to resolve it. Merging now says that its first call is *expected* to come
  back asking for decisions rather than failing — a client treating that as an error reports a working merge
  as broken — that leaving any conflict unresolved merges nothing at all, and that properties the two records
  agree on are carried across without appearing in the list, so a short list is complete rather than partial.

- **Reading and writing files now say what a call costs and what an empty answer means.** Reading returns the
  whole file with no windowing, and a document is the largest thing stored — so the reference now points at
  the cheaper route it never mentioned: search with passage bodies switched off to find *which* file and
  *which* passage, then read only if the rest is needed. It also separates the three things that all look
  like a blank document: a file still being extracted, a file whose type yields no text, and one that really
  is empty — the first of those is a wait, not a fact. Writing now says plainly that it **replaces** the whole
  file: there is no append and no patch, and writing over an existing path is silent. It also explains that a
  file is stored as chunks embedded separately, which is why a search returns a passage rather than a
  document, and that structuring text with headings is what makes a hit locatable — and that indexing is
  asynchronous here too, so a search moments later may not see it.

- **Storing a relationship now says that the two endpoints and the label ARE its identity.** There is no id
  anywhere in the call, so repeating the same from/to/label pair updates the existing relationship rather
  than adding a second one — and nothing in the arguments hints at that. Direction is part of the meaning
  too: *depends on* reversed is a different claim, and a walk follows the two directions separately, so a
  backwards relationship is not merely untidy, it is unreachable from the side that should have found it.
  It also now says that relationships are searchable records in their own right and compete for slots in a
  search, which is why searching has a type filter.

- **Storing a dated entry now says what belongs there rather than in a plain fact.** Anything with a date —
  an event, a deadline, a plan — carries start and end times and a status, so it can be listed by date and
  *closed*, where the same thing written as a fact can only ever be contradicted later. It also warns that a
  space defining its own dated-entry types **replaces** the built-in list rather than adding to it, so a
  space with a custom schema will refuse `event`; and that linking the entry to the entities it concerns is
  what makes it reachable from them, since those links are not relationships in the graph sense.

- **The two most-used write tools now explain what a validation refusal means, and what the write does to a
  record that already exists.** A refusal is the only response a caller has to branch on, and it has two
  halves: what *this* write broke, and what was already broken before it. Only the first refuses — that
  changed in this release — so a caller treating any reported violation as failure would now report a
  successful write as an error. The reference says which field to branch on. Storing an entity also now says
  that supplying no id always creates a **new** record, that two entities may share a name, and that an
  update **merges** into what is stored and is checked in its merged form — which is why setting one field of
  a valid record is accepted even though that one field alone would not be. Storing a fact says it is always
  an insert and nothing deduplicates, so the same fact written twice competes with itself in search; that it
  should be written as a self-contained sentence, because a fact retrieved months later arrives without the
  conversation it was written in; and that **indexing is asynchronous**, so a search issued seconds later can
  miss it unless you ask that search to include fresh writes.

- **The `traverse` tool now says how it differs from the graph expansion built into `recall`.** Two things are
  called traversal and they answer different questions: recall's expansion walks out from whatever a *search*
  matched, while this walks out from a record you already name. More decisively, chrono entries, memories and
  files that *reference* an entity are not relationships in the graph sense, so recall's expansion cannot
  reach them at any depth — this tool can, and that is what its include options are for. A caller who did not
  know that would conclude the data was missing rather than that they had used the wrong walk. The reference
  also now describes the result: each node carries the depth it was found at, the starting record comes back
  at depth zero so a lone record is not an empty answer, and a walk cut short by the limit is flagged as a
  **partial** graph — an impact assessment run on one is answering a smaller question than it was asked.

- **`find_similar` now names the two ways it can come back empty for a reason that is not "nothing is
  similar".** It compares against a record's **stored** embedding rather than working from a query, which has
  two consequences that were nowhere in its reference: a source record that has been retired from semantic
  ranking has no embedding at all, so there is nothing to compare from and the answer is empty; and a record
  written moments ago may not be indexed yet, with no way to ask for it anyway, because the source's own
  embedding has to exist before the search can start. Both used to look like a finding. The minimum-score
  setting also now says that it means something **different** here than on `recall` — similarity is the only
  ranking in this tool, so raising it narrows the answer honestly, and near-duplicates sit well above 0.9. And
  the type of the source record is distinguished from the types you want back: a memory can legitimately be
  most similar to an entity.

- **`query` now says what it is *for*, and what a page of results means.** Its whole description was one
  line — what it does, never when to choose it. It is the exact counterpart to `recall`: a predicate and
  every row that satisfies it, with no embedding, no ranking and no score, and it reaches records `recall`
  cannot, since a record retired from semantic ranking has no vector to rank. The reference now says that,
  and explains the pair of numbers that come back: `count` is this page, `total` is everything matching the
  filter, and the gap between them is the only signal that there is more to page through — a full page is not
  evidence of being the last one. It also warns that a positive count with no rows means an instance older
  than this release, so an agent recognises the shape instead of concluding a space is empty.

- **`recall` now documents what it gives back, not only what it takes.** Its tool reference described every
  parameter and nothing about the response, so the one thing that fails silently was invisible: the inline
  answer is capped by **size**, and it is a cliff rather than a gentle limit — around 25 results come back in
  full, 30 can come back as three. A caller asking for eighty and reading only the results list is working
  from a handful of records with no error anywhere. The reference now names `truncated` and `complete`, says
  `count` excludes anything reached by a graph walk, and warns that a result with no edges carries no `_graph`
  at all — so reading the first result and concluding the feature is missing is the mistake to avoid. Three
  parameters also gained the trap that makes their behaviour readable: relationships are searchable records
  and compete for your result slots; the query is tokenised as well as embedded, which is why an exact
  reference number survives a question written as a sentence; and the minimum-score filter gates on the
  vector score alone, before the reranker sees anything. First of the tools to be brought to this standard.

- **Retiring a record from semantic search says plainly that it is still reachable through its links.** The
  setting removes a record's embedding, so it stops competing in recall's ranked results — but everything
  that does not rank still reaches it, including recall's own graph expansion, which follows edges out of a
  match and never looks at an embedding. The wording listed *traverse* among the readers that still see it,
  which is true of both the traverse tool **and** recall's expansion and reads as neither: you had to already
  know there were two before the word told you anything. Both the tool reference an agent reads while
  building a call and the integration guide now name them separately and say the consequence outright — a
  retired record stops competing on meaning, it does not disappear from the graph. **No behaviour changed**;
  this is what it always did.

- **The six shortest tool descriptions now say where their answer is narrower than it looks.** Each was
  accurate as far as it went, and each left out the same shape of thing. `list_chrono`'s `after` and `before`
  filter **when an entry was written, not when it happens** — so "what is scheduled next quarter" was quietly
  answering "what did we write down last quarter", on a tool whose whole subject is dates; it also now says
  that nothing recomputes `status` from the clock, so `upcoming` means "nobody has updated this" rather than
  "still in the future". `list_dir` merges a proxy's members **by filename**, so two members holding the same
  name collapse to one entry with nothing saying which won; it is also not recursive and returns names rather
  than paths. `find_entities_by_name` is exact and case-sensitive, several results usually means a duplicate
  worth merging rather than a fact about the world, and an empty list does **not** mean the thing is absent.
  `list_peers` returns one row per peer **per network**, not per machine. `sync_now` returns when the cycle
  *starts*, and a peer that is unreachable does not make it fail — that surfaces as a climbing failure count
  on the peer. `list_tokens` still lists **expired** tokens, because expiry is enforced when a token is used,
  so appearing there is not proof of access.

- **`help` now says that the tool list it returns is filtered to your token — which was the one thing it most
  needed to say.** A read-only token is shown no mutating tools and a token without instance-admin rights is
  shown no admin tools, correctly and deliberately. What nobody was told is the consequence: a tool missing
  from that reply means *this token cannot invoke it*, never that the instance lacks the capability. The
  unsupportable conclusion — "there is no way to do X here" — is exactly the one that gets reported outward as
  a missing feature, and it had to be written into three individual tool descriptions this release because the
  one place it belonged did not carry it. `help` also now states that each tool's own schema description is
  the authoritative reference, and that adding words to `query` narrows the answer rather than broadening it.

- **`get_space_meta` now distinguishes what a space DECLARES from what it actually holds.** It returns the
  types somebody defined; `er_model` returns the types that have records. A space can declare twenty types and
  hold three, so a declaration read as an inventory produces plans against empty types. It also explains what
  each validation mode does to a write, pre-empts the reasonable "strict validation on a space that accepts
  everything must be a bug" (a space with no type schemas has nothing to violate), notes that strict refuses
  what your change *breaks* rather than what was already broken, and describes `needsReindex` as what it is —
  a quality signal where recall keeps answering while comparing new queries against vectors made by a
  different model, so results degrade quietly instead of erroring.

- **Editing a file's `properties` no longer destroys the ones you did not send.** It replaced the whole
  object, so patching a single key left the record holding only that key — the same defect that had already
  been found and fixed on entities, edges, memories and chrono entries, in a sweep that never reached the
  file path. Five surfaces taking the same-looking arguments, one behaving differently and no error either
  way. **They now merge**, on the REST route and the `update_file_meta` tool.

  **`deleteFields` arrives with it**, because merging alone would have removed the only way to clear a file
  property — resending the whole object was it. So removal is now expressed the same way as on the other four:
  dot-notation paths, applied after the merge, permanent, with server-owned fields refused by name rather
  than accepted and ignored.

  **A caller that resends the whole object is unaffected**; until now that was the only thing that worked. A
  caller that patches a single key keeps what it did not name. **The lists still replace** — `tags`,
  `entityIds`, `memoryIds` and `chronoIds` are overwritten by what you send, on every record type.

- **The mojibake check now covers the shipped documentation, which it never did.** It scanned TypeScript
  only, so the integration guide and the user guide — the two things read by people outside the project —
  were never checked. They are clean; this keeps them that way.

### Added

- **A chrono entry's fields can be removed. Until now none of them could.** `deleteFields` — the dot-notation
  removal that entities, edges and memories have always had — now works on chrono entries too, on **both**
  the REST route and the `update_chrono` tool. It was the one record type without it, and because its
  `properties` merge and an omitted field means *leave alone*, there was no request of any shape that could
  unset something: a key written once was permanent. Paths are applied **after** the merge, so a single call
  can add one property and drop another. Chrono's **required** fields — `title`, `startsAt`, `status` — are
  refused **by name** rather than accepted and ignored, alongside the server-owned ones; a path that cannot
  be honoured tells you, because "nothing happened and nobody said so" is the failure this feature exists to
  remove. A *property* of the same name (`properties.title`) is an ordinary user key and stays deletable.

- **The mojibake check now detects the corruption structurally instead of matching known signatures.** It
  looked for `â€`, then `â”`/`â•` after a tree with thousands of mis-decoded box-drawing dividers passed it,
  and it was *still* reporting clean while one merged file carried `Ã—` — two characters, starting with a
  letter none of the three patterns named. Each addition fixed the instance and not the class. It now asks
  whether a run of non-ASCII, encoded back to the codepage the damage comes from, decodes as valid UTF-8 into
  something **shorter** — which is true of mis-decoded text and of nothing else, so no new shape can hide
  from it. Failures also name what the text should have been, instead of leaving the repair to guesswork.
  One residual `×` was repaired.

- **A space administrator can now manage that space's tokens.** Until now "administers this space" was only
  sayable through the pre-3.0 pair — an `admin` token plus a list of spaces — and the rights matrix could not
  express it: giving someone `admin` on every area of a space granted them those areas and nothing about
  tokens, because the admin routes still consulted the old flag. **`admin` on all four areas of a space now
  means being that space's administrator**, and that reaches the token pages: listing, minting, editing and
  rotating tokens for their own space. All four areas, deliberately — `admin` on Files alone must not let
  somebody mint tokens, because a token is not a file. Nothing instance-shaped opens up: creating spaces,
  joining networks and instance settings stay with instance administrators, since there is no space to scope
  them to. And being admitted is not being unbounded — a space administrator still cannot grant
  instance-administrator rights, the create-spaces flag, an all-spaces floor, or any rights on a space they do
  not themselves hold. The second factor is unchanged: if MFA is on, it is on for them too.

- **And that space's own settings, not only its tokens.** The same four-area `admin` rung now opens the
  space's name, its schema and single types, its schema dry-run, and a rebuild of its own search indexes. The
  admission is checked against the space in the **URL** — administering Research grants nothing in Finance —
  which is a stricter question than the token routes ask, and it has to be: a token route's body names its own
  subject and is filtered afterwards, while a space route's subject is the id being edited, so admitting on
  "administers something" would have handed over every other space with nothing left to catch it.
  **`maxGiB` stays with the instance** and answers `403` naming who can change it: it is that space's share of
  the host's disk rather than a setting of the space. Creating, reordering and **deleting** spaces stay
  instance-only too — delete is reachable through the same `:id` as everything widened here, and destroying a
  space is not one of its settings.

  **Both doors, same commit.** `update_space` and `update_space_schema` are the MCP counterparts of those two
  routes and would otherwise have kept refusing the space administrator that REST now admits — the exact
  shape of defect the parity rule exists to stop, and it was nearly missed because "no MCP tool mutates space
  settings" was plausible and wrong. Tools now carry a `spaceAdmin` flag distinct from `admin`, checked at two
  widths: `tools/list` admits anyone administering *a* space, because no space has been named at listing time,
  and `tools/call` requires administering *the* space in the call. The stale `if (!isAdmin)` inside each
  handler is gone — it read the legacy boolean and would have refused, one layer down, exactly the caller the
  dispatcher had just let in. `create_space`, `wipe_space` and `reindex` stay instance-admin.

### Breaking

- **Wiping a space that belongs to a network now opens a VOTE instead of emptying it immediately.** Emptying
  a space the network shares is a governed act, like deleting one: a round opens in every network holding the
  space, this instance votes yes, and the wipe happens on **every member** when a round passes. A single veto
  stops it there.

  **A space in no network is completely unaffected** — it wipes immediately and finally, exactly as before.

  **What changes for a caller on a networked space:** `POST /api/admin/spaces/:spaceId/wipe` answers `202`
  with `{ "status": "vote_pending", "rounds": [...] }` rather than `200` with `deleted` counts, and the
  `wipe_space` tool says the same. That is the success case — retrying it opens a second round, and reading
  the absent counts as a failure is the mistake to avoid.

  **Why voting rather than propagating.** A wipe writes no tombstones and deletes the existing ones, and
  tombstones are the only thing that tells a peer a record is gone. So a local wipe on a shared space was
  quietly **undone by the next sync**: the peers offered everything back to an instance that had no record of
  any deletion. Voting does not fix that — it removes it, because the peers are wiping too. The round also
  carries which collections it covers, so a wipe approved for `files` cannot conclude by emptying the
  knowledge graph.

- **The media half of the embedding queue is named, on both doors. No alias — update both paths.** The
  namespace always had two halves: `/embedding-queue/records` for brain records, and the **bare**
  `/embedding-queue` for media. Only one of them said which it was, so *"no qualifier means files"* was true
  and knowable only from a paragraph in the integration guide. On MCP it was worse, because a tool name has
  no namespace to sit in: `retry_failed_embeddings` sat directly beside `list_embed_jobs`, read as its
  remedy, and acted on a different queue — so the obvious sequence *list the failed embed jobs, then retry
  the failed embeddings* quietly did something else and returned a count unrelated to what was listed.

  | was | is |
  | --- | --- |
  | `GET /api/brain/spaces/:spaceId/embedding-queue` | `GET …/embedding-queue/media` |
  | `POST /api/brain/spaces/:spaceId/embedding-queue/retry-failed` | `POST …/embedding-queue/media/retry-failed` |
  | MCP `retry_failed_embeddings` | MCP `retry_failed_media_embeddings` |

  Responses, parameters and rights are unchanged — only the names. `/embedding-queue/records` and the two
  record tools are untouched. **No alias, deliberately:** an alias on one door and a rename on the other is
  the two-surfaces drift this project pays most for, and keeping both names would mean documenting both
  until 4.0.

- **A space request body with a key we do not recognise is now refused instead of silently ignored.** Four of
  the ten schemas already refused one and six did not, and the split fell across a nesting level, so the same
  misspelling got two answers: `PATCH {"meta":{"validationMdoe":"strict"}}` returned 400, while
  `PATCH {"label":"x","validaitonMode":"strict"}` returned 200 with the label applied and the typo gone. A
  misspelt `faceDescriptorDims` created a space at the default descriptor width and reported success — the
  caller's notes say 512, the gallery is 128, and nothing distinguished them afterwards. All ten bodies now
  refuse, naming the key.

  **What this breaks:** a request sending a field we ignore starts returning 400 where it returned 200. The
  shape of the request has not changed, so the failure is immediate and names the offending key rather than
  appearing later as a setting that never took effect.

  **What it deliberately does not break:** reading a space and writing the whole object back. The fields a
  `GET` emits but a `PATCH` does not accept — `id`, `builtIn`, `folders`, `usageGiB`, `indexStatus`,
  `proxyFor`, `networks` — are stripped before validation, exactly as the nested `meta` housekeeping fields
  already were. Only fields we ourselves emit are dropped, so a typo is still a typo.

### Security

- **Two more scope checks were reading the pre-3.0 allowlist, and so answered "unrestricted" for every token
  minted since the rights matrix.** Same cause as the sync-route entry below: `spaces` is `undefined` on a
  modern token, so any check shaped `if (token.spaces)` or `!tokenSpaces` silently means *no restriction*.

  **A cross-space `recall` searched the whole instance.** With `space` omitted, the set of spaces to search
  was filtered by the allowlist, which matched nothing to filter — so a token scoped to one space ranked
  records from every space on the instance. It now builds that set from the matrix, at `knowledge: read`, so
  a token holding files-only in a space does not have that space's records ranked either.

  **Signing-key rotation accepted a space-restricted administrator.** The route means to require an
  unrestricted admin token and tested the allowlist for truthiness; a matrix-scoped administrator passed. The
  instance signing key is the credential every peer pins, and continuity proofs are signed with it. It now
  asks the matrix whether the token is genuinely unrestricted.

  Both use helpers that already existed and already made the distinction the hand-written checks lost: an
  **absent** allowlist is every space, an **empty** one is none, and reading empty as absent turns the
  narrowest token into the widest.

- **The sync read routes enforced space scope only for tokens that still carried the pre-3.0 allowlist —
  which no token minted today does.** The check that confined a caller to its own spaces was written
  `if (tokenSpaces && ...)`, and `tokenSpaces` was the deprecated `spaces` array. The rights editor writes the
  matrix and nothing writes that array any more, so on a current token the condition short-circuited and the
  check simply did not run. Nothing downstream caught it: without a network id in the request the function
  ended at *"does this space exist?"* and answered yes. Every `/api/sync/*` read is behind ordinary
  authentication, so **any valid token could read any space's records** as long as its own scope was expressed
  in the matrix. Writes were never exposed — those have always required a peer token or an instance admin — so
  this was a read exposure, on an instance where more than one token exists with different reach.

  The scope check now reads the matrix first and falls back to the old allowlist only for a token that has
  none, so pre-matrix tokens keep working and a token carrying both is held to the matrix. The same guard was
  written out **19 times** across the sync routes, which is why one wrong condition survived review; it is one
  shared call now, and the parameter that made the mistake expressible is gone from the signature.

- **A space-restricted administrator's scope is now read from its rights matrix, not from the deprecated
  space allowlist.** Three places decided what an administrator may reach — the token list, the mint guard and
  the edit guard — and all three read the pre-3.0 `spaces` array. The rights matrix has been the permission
  model since 2.6, so a token minted through the rights editor carries its scope there and has no allowlist at
  all; that reads as *absent*, and absent is exactly what these guards treat as "unrestricted instance
  administrator, skip every check". The widest possible reading was being applied to the token whose scope was
  written down somewhere else. Scope now comes from one function that reads the matrix and falls back to the
  allowlist only when there is no matrix — an OIDC session, or a record predating the migration. A token
  counts as unrestricted only through a floor that grants something, because a floor is the one construct
  that reaches spaces which do not exist yet and therefore cannot be listed. Being an instance administrator
  does **not** make it unrestricted: that is a capability, not a reach, and a pre-3.0 administrator that was
  scoped to a list of spaces migrates carrying both. A per-space row of all `none` is not scope either, so
  emptying a row removes access rather than leaving it behind. **Nothing new is permitted by this change** —
  the admin routes still gate on the legacy `admin` flag, so it narrows who the existing guards refuse and
  opens no door.

### Changed

- **A schema violation the record already had no longer refuses an unrelated edit.** Reported by
  the canary operator as *"freezes records"*, and reproduced exactly: write a record whose `status` the enum
  allows, remove that value from the enum, then patch the record's **description** — `422`, naming a field the
  edit never touched. The record stayed uneditable until `status` was repaired in the same request, and any
  schema tightening did that retroactively to every record that no longer fitted. In `strict` mode a write is
  now refused for what it **introduces**; a violation that was already stored is reported and does not block.
  Refusing it never improved the data — the bad value is already saved — it only stopped the record being
  maintained. Nothing is hidden: `preExisting` is in every response exactly as before, so a client that wants
  to insist on full compliance still can, and a patch that introduces a violation is refused exactly as
  before, including when the record also has an older one. The MCP guide had promised this behaviour before
  the code was found to disagree; both now say the same thing.
- **Hovering a rung in the rights grid now says what it grants.** The tooltip read *"Set write"* — a
  description of what the click does, which is not what anyone hovering a permissions cell is asking. The
  answer was already written and already translated: the plain-language sentence the column header shows
  ("Your agent can add, edit and delete single records"), in all three languages. The control could not reach
  it for one reason — it did not know which area it belonged to. It does now, so the tooltip leads with the
  capability and keeps the click description after it. On a cell held at a minimum, the explanation of *why*
  is appended rather than substituted: what it would grant and why it cannot go lower are both live questions
  in that state.
- **`knowledge: write` now carries `schema: read` with it.** Writing a record against a schema requires
  reading that schema, so a token granted write on Knowledge and nothing on Schema was not a narrower token —
  it was one that could not do what it had just been granted, and the failure arrived as a 403 on a route
  nobody called deliberately. The pair is no longer an operator's to get wrong. It resolves in one place
  (`effectiveRung`), which is where REST, MCP, space reachability and the minting cap all ask what a token
  holds, so both doors gained it in the same commit and neither can drift from the other. A minter holding
  `knowledge: write` may now also delegate `schema: read` — without that, enforcement would grant a rung that
  minting refused to hand on. The implication is a floor and never an assignment: a Schema rung granted
  outright is not lowered by it, and it never runs backwards. **Nothing is written to the stored matrix** —
  `GET /api/tokens` still returns exactly what was set, so lowering Knowledge back to `read` returns Schema to
  the value that was chosen instead of leaving a permission nobody picked. The rights matrix shows the Schema
  cell held at `read` with a tooltip naming Knowledge as the reason, rather than showing `none` while the
  server grants read; `GET /api/tokens/rights-catalog` publishes the rule as `implications` so no client needs
  a second copy of it.

### Fixed

- **Renaming a space no longer strips every token's access to it.** The rename updated each token's pre-3.0
  `spaces` allowlist and nothing at all updated the rights matrix — so a token's `perSpace` row stayed under
  the OLD id, which now named nothing, and the token silently lost the space it had rights in. That is
  **every token created since 2.9**, because the rights editor writes the matrix and nothing writes the
  allowlist: the half being maintained was the half nobody has.

  It failed quietly at both ends — no error when renaming, and later a `403` that reads as though the rights
  were never granted. Both halves are carried now, with the rung unchanged, because a rename is not a
  re-grant. A token that somehow already holds rights under the new id keeps them rather than being
  overwritten.

- **Join labels in the data-model diagram no longer run across the next column.** Reported with a screenshot:
  `implements · 113` and `refines · 53` ended on top of the neighbouring card, and `conflicts` was clipped.
  Each join gets its own vertical lane and its label sits beside that lane, growing rightward — and the gap
  between columns had been sized for the number of lanes since joins started piling up, but never for the
  width of the text those lanes carry. Sixteen characters is about 100px against a gap that could have twenty
  left. The gap now reserves room for the widest label as well as for the lanes. Labels that converge on one
  box no longer crowd each other either: they used to step through only three heights before repeating, and
  every join arriving at the same box starts counting from that box, so several landed 13px apart with a
  connector drawn between them. They now step down the span they share, far enough apart to read.

- **An embedder outage no longer spends a record's retry budget.** The retry policy allows five attempts over
  about twelve and a half minutes, which is sized for one record failing on its own content. Applied to an
  embedder that is simply unreachable — during an upgrade, say — it took every queued job in every space
  terminal at once, and a terminal job is never picked up again. This release already gave those jobs one
  clean retry per server version; this stops them being spent in the first place. A failure that means *the
  embedder did not answer* — connection refused or reset, DNS, a timeout, a 429, a 502/503/504 — now costs
  waiting instead of an attempt, backing off to half-hourly and recovering by itself the moment the embedder
  returns. A failure that means *this record cannot be embedded* — a 400, a 422, no embeddable text — still
  spends an attempt and still gives up, because that is what the budget is for. Rewriting a record, retrying
  it, or a new server version all clear the wait as well as the budget.

- **The Docker build no longer downloads a CUDA runtime it never loads.** `onnxruntime-node` fetches its GPU
  execution-provider binaries from a GitHub release during install, and on a machine without `nvcc` it logs
  *"nvcc not found. Assuming CUDA 12"* and downloads them anyway. CI was told to skip this after two runs
  failed 35 minutes apart on that download alone; the image build was not, so every image build still
  depended on github.com being reachable and fast — in the build most likely to run somewhere that neither is
  true. All three install steps in the Dockerfile now skip it, and a build gate keeps them that way, checking
  each stage separately because the setting does not carry across a stage boundary. **A GPU deployment loses
  the CUDA execution provider** and would need its own image variant; nothing in the published image used it,
  as the bundled embedder runs on CPU.
- **The property editor offered merge functions the API refuses.** Reported by the owner on 2026-08-15, whose
  words were *"i dont understand what i did wrong"* — and nothing they did was wrong. The merge-function
  dropdown listed all seven functions for every property type, so a `date` property could be given `min`, and
  the save came back as a wall of validation JSON about a rule the screen had never mentioned: numeric
  functions need type `number`, boolean ones need `boolean`, and `string` and `date` accept none at all. The
  dropdown now offers only what the declared type can hold, is disabled with a short explanation for types
  that accept none, and clears a function the type can no longer hold when the type is changed — the schema
  tab's editor had no type-change handler at all, and the other editor's cleared only two of the four cases.
  A gate compares the client's list against the server's rule on every push, so the two cannot drift apart
  again.
- **The schema property editor rendered unstyled in Space Settings.** Reported by the owner with a
  screenshot: the *Required* control was a bare browser checkbox with its label wrapped underneath it, and an
  expanded property's detail card had lost both its column layout and its padding, so Type, Default, Merge
  function and Enum values each ran the full width of the dialog with the label pressed against the border.
  Nothing was broken — every control worked — it simply had no styling. Angular scopes component styles, and
  when this editor was split out of the Schema tab so the Brain overview could reuse it, twelve classes it
  renders were left behind in the stylesheet it no longer carried. The same extraction lost the enum chip
  styles, which were restored earlier; these went unnoticed for longer. The rules now live in one module that
  all three renderers share, instead of the two hand-kept copies they were before, and a build gate fails if
  a component renders a shared class without carrying its stylesheet. Two things were improved rather than
  restored while they were being moved: the detail card wraps to two columns in a narrow dialog instead of
  squeezing three, and *Required* is a single pill whose dot fills in, rather than a pill and a native
  checkbox saying the same thing twice.

- **`query` over MCP returned no rows to a client that reads `structuredContent`.** The tool put the rows in
  `content` and the paging facts — `count`, `total`, `limit`, `skip` — in `structuredContent`, on the
  reasoning that a client ignoring the structured block loses nothing because `content` is complete. The
  opposite client is the one that breaks: one that SURFACES `structuredContent` in preference to `content`
  saw `{"count": 25, "total": 32, …}` and not a single row. Observed against Claude Code, four calls in a
  row, while a tool returning no `structuredContent` rendered its whole body in the same session. It is the
  worst shape a result can have — the answer absent while the metadata reports how many rows were returned,
  so it reads as an empty page rather than as a dropped payload. `structuredContent` now carries `results`
  as well, identical to `content`, and `count` describes it. Nothing changes for a client built on
  `content`, which was and remains complete.

- **A rights matrix stored in an obsolete shape is repaired at startup, instead of being uneditable for
  ever.** Reported from a live instance: saving a token's matrix was refused with ~40 validation errors —
  `unrecognized_keys ["admin"]` and an invalid `dataQuality`, repeated for the floor and for every space.
  Each stored rungs object was `{ knowledge, files, schema, admin }`: three areas plus a key that is not an
  area, with the fourth area missing. The editor round-trips what it read, so the token could be opened and
  never saved. The boot migration skipped it every time because it tested only that a matrix was PRESENT,
  never that it was well-formed — so it ran, looked, and moved on, which is why it read as *"the migration
  didn't work"*. Startup now normalizes a malformed matrix and writes it down: a key that is not an area is
  dropped, a missing area comes back at `none`, an unreadable rung becomes `none`. It is a narrowing by
  construction and never re-derives from the legacy `admin`/`readOnly`/`spaces` fields, which would have
  silently restored access an operator had removed. The repair is logged with a count.
- **The user guide no longer describes a per-token second factor.** The token editor's MFA controls were
  removed in 3.0.1 and the guide still told operators to set *Follow the instance setting / Exempt /
  Required* there, and to expect an authenticator prompt. MFA is instance-wide, under Settings →
  Preferences, and nothing about it appears in the token dialogs.
- **An embedding outage no longer stops indexing permanently.** Reported from a live instance: *"after
  updating all space indexing failed and since has not been retried automatically."* The retry policy is
  sized for a per-record failure — five attempts at 5s / 30s / 120s / 600s, about twelve and a half minutes
  — and a job that spends that budget goes terminally `failed`, which the claim query never picks up again.
  Applied to a SYSTEMIC failure, an embedder unreachable for a quarter of an hour during an upgrade takes
  every queued job in every space terminal at once, and the instance stops indexing without reporting a
  fault: each job did exactly what it was told. Startup now gives every terminally-failed job **one clean
  attempt per server version** — attempts reset, backoff cleared, `lastError` kept so it is still visible
  what it died of, and the count logged. A restart on the SAME version revives nothing, so a record that
  genuinely cannot be embedded is not re-run for ever. Classifying transient errors so they do not spend the
  budget at all is tracked separately.
- **One reader for the server version.** `api/about.ts` and `app.ts` each resolved their own path to
  `server/package.json`; the revive above needed it too, and three copies of "which manifest do we mean" is
  the kind of duplication that is right until the release where it is not.
- **Reindex said "Reindexed 0 documents" in green at the moment it started.** Reported from a live instance.
  `POST /reindex` never awaits the job — it schedules the work and answers immediately with zeroed counters,
  deliberately, because a whole-space re-embed is far too long to hold a request open. The client summed
  those zeros and printed a document count, so the acknowledgement of a job that had just begun was rendered
  as its result. There is no count to print at that point and there never was; progress lives in
  `reindex-status`. It now says the job started, in all three locales — the two strings were hardcoded
  English — and says it through the app's toast channel rather than an inline banner that had no dismiss and
  was cleared only by switching space. A failure repeats the SERVER's own reason when it sends one, so a
  proxy refusal names the member spaces instead of pointing at the logs. The stale-index banner is no longer
  cleared optimistically either: the index really is still stale until the job finishes.
- **The Reindex button is gone from proxy spaces.** A proxy holds no records of its own, so it has no index
  to rebuild, and the server has refused the call with a 400 since the double-embed fix. The button could
  only ever produce that refusal. The Indexing panel now says to reindex the member spaces instead, rather
  than showing an empty card.

- **The rights editor can grant and revoke the two instance-level flags.** `instanceAdmin` and `createSpaces`
  are part of the matrix the server stores and `PATCH /api/tokens/:id` already accepted — `migrateToken` sets
  `instanceAdmin` from the legacy admin flag — but the editor had no control for either, so tokens HELD them
  and no one could change them. An instance administrator could not be demoted from the UI. They sit in the
  danger zone, where they belong: they are not a rung on a space, they are the whole instance. The server
  still refuses a space-restricted administrator who tries to grant either.
- **The `?` buttons on the rights matrix headers are centred.** A 15px round button was centring a bare `?`
  by text metrics, and a question mark has left side bearing — so it sat visibly left. It is laid out now
  rather than measured.

## [3.0.1] — 2026-08-14

### Fixed

- **A token with no rights matrix could be seen and not fixed.** The rights glyph AND the pen that opens the
  editor were both inside `@if (t.rights)`, so a token without a matrix showed neither — no way to grant it
  one from the UI. The pen is now unconditional; the glyph still needs a matrix to draw, because it draws a
  matrix. The editor already tolerated a rightless token: it starts from an empty one.
- **Such a token was also labelled "read-only", which is a different thing.** It holds nothing, and calling
  that read-only is what made the state read as *"all my tokens went read-only"* when the real state was
  *"these tokens have no matrix"*. Two different problems, and only one is about permission levels. The pill
  now says so, in all three locales.
- **The permission pill is gone from the token list.** It said admin / standard / read-only /
  schema-library; the glyph beside it says what the token can actually reach, per area and per space.
  "Standard" only ever meant "none of the other four", which is nothing once the glyph is there.
- **The second-factor controls are removed from token management.** UI only — the server is untouched: `mfa`
  is still accepted on the PATCH body and granting an exemption still costs a live TOTP code.
- **The rights editor is no longer 600px wide.** It renders areas x rungs once per space; at the shared
  default that is a column of squeezed cells. It now takes `min(1400px, 94vw)`.
- **`created`, `last used` and `expires` are a date and time, not "3 days ago".** Relative text answers how
  long when the question is WHEN — which log line, which incident. It also rounds: 23 hours and 47 hours both
  read "tomorrow". Shown in the viewer's own locale and timezone.

## [3.0.0] — 2026-08-14

> **A major, and the deprecation checklist is what makes it one.** Nine surfaces were removed, each of
> which had been announced or was reachable only through a spelling we had replaced. Four rows on that
> checklist were deliberately reclassified as PERMANENT rather than removed — every one of them because
> dropping it would silently re-enable something an operator had switched off, or silently narrow a
> capability we had told an integrator we would keep.
>
> The other half of this release is the S-1 fix: one authorization policy was being enforced by three
> different mechanisms depending on which door a caller used. It is one mechanism now, on REST, on MCP and
> for OIDC identities, and two privilege defects surfaced in the OAuth mint path while closing it.

### Removed

*The 3.0 deprecation checklist. Each entry names its replacement; `todo/_DEPRECATIONS.md` carries the row.*

- **BREAKING — `description` on a space is gone from every surface. Say `meta.purpose`.** It was announced
  as *"Removal in 3.0"* in `docs/integration-guide/06-spaces-api.md` since 2.3, and it is the one
  deprecation whose removal version was published rather than merely tracked. Removed from: the create and
  update REST bodies, every REST response that carried the derived alias, `update_space`'s MCP input schema,
  and `list_spaces`' output. The `spaceDescriptionAlias` / `spaceResponse` shapers are deleted with it.
  **A request still sending `description` now gets a `400` naming `meta.purpose` — it is not silently
  dropped.** That refusal is the point: these top-level bodies are not `.strict()`, so without it a caller
  would have received a `200` with no directive written, while the same request over MCP already 400'd on
  `additionalProperties: false` — one rule with two behaviours, and the quiet one is the one that loses
  data. The refusal lives in the shared planners, so both doors answer identically.
  The boot migration **stays**: a `config.json` written by an older build still carries a stored
  `description`, and dropping the migration alongside the alias would discard the operator's directive on
  upgrade. It goes once the version floor 3.0 supports upgrading from is fixed.

- **`ChronoKind` is removed. Say `ChronoType`.** A type alias with zero consumers on either side, which is
  exactly how a dead alias survives a major: nothing breaks, so nothing notices, and the next person to
  reach for a chrono type finds two names for one thing. Removed from the server types and the client
  mirror. Type-only — no request or response is affected.

- **BREAKING — `max` is no longer accepted as a document-extraction mode. Say `repair`.** It was the legacy
  spelling of the same level, and it left the API accepting six values where the type meant five — a
  one-element difference between two lists that nobody could explain a year later. A request sending `max`
  is now refused by the enum rather than quietly folded. **A `max` already STORED in `config.json` or on a
  space still reads as `repair`**, and that normaliser is deliberately kept: it is a self-healing read, not
  a one-time upgrade path, and dropping it would move an instance to a different extraction level on load —
  the quietest possible way to change what a document search can find.

- **BREAKING — `tagSuggestions` is removed, per-type and space-wide. There is no replacement, and none is
  needed.** It was retired in #365 when its editor was taken out, and kept because it was still accepted and
  stored — which is how a field ends up retired-but-immortal: no editor, no consumer, and nothing saying to
  remove it. Nothing ever read either list. Record forms suggest from the tags already in use in each
  collection, which is self-maintaining, and the MCP schema guidance never consulted it.
  Gone from: `SpaceMetaBody`, the per-type `TypeSchemaZ`, the schema-library entry schema, the
  `deleteFields` path that could delete it, the meta merge, both type declarations and every client mirror.
  Both accepting schemas are `.strict()`, so a request still sending it gets a `400`.
  **What happens to a value already stored, precisely** — the two halves differ and it matters: a
  **space-wide** `meta.tagSuggestions` is left alone, because the meta merge reads an absent field as "not
  stated" and never rewrites it. A **per-type** list is dropped the next time that type is saved, because
  the merge replaces a type's whole schema object rather than merging its fields. Neither is read by
  anything in either case.

- **BREAKING — a provider API key is no longer read from `config.json`. It is moved to `secrets.json` at
  boot.** `secrets.json` is written `0o600`; `config.json` is not, and it is the file operators copy between
  machines, paste into issues and mount as a ConfigMap. Any key still sitting in
  `mediaEmbedding.<vision|stt|nli|rerank>.apiKey` is lifted into `secrets.json` on the first 3.0 boot and
  **deleted** from the config; the read fallback is then gone, so the world-readable copy cannot come back.
  Nothing to do: the Settings → Models page has written keys to `secrets.json` and deleted them from the
  config for some time, so this only fires for an instance that has not saved that page since. An env var
  (`VISION_API_KEY` and friends) still takes precedence over both. Rolling back is documented — the key is
  not lost, it is in `secrets.json`. **Found by the deprecation sweep; it was not on the checklist.**

- **BREAKING — the legacy `mediaEmbedding` URL/model spellings are gone from `config.json`. They are lifted
  onto `vision.*` / `stt.*` at boot.** `ollamaUrl`, `visionModel`, `whisperUrl` and `whisperModel` were read
  as fallbacks behind the modern fields; on the first 3.0 boot each is moved onto its modern home and
  deleted. **Lifted rather than dropped, because dropping them would not have errored — it would have
  silently resolved to the built-in defaults** (`http://ollama:11434`, `http://whisper:8000`), so an
  instance would caption and transcribe against whatever answered there while its config file still plainly
  named the endpoint its operator chose. The modern field wins if both are present. **The env-var half is
  untouched and permanent**: `VISION_BASE_URL` (legacy `OLLAMA_URL`), `STT_BASE_URL` (legacy `WHISPER_URL`)
  and `STT_MODEL` (legacy `WHISPER_MODEL`) all still resolve — breaking a documented env var to improve its
  spelling would turn an upgrade into an outage.

- **BREAKING — `POST /api/brain/spaces/:spaceId/chrono/:id` is removed. Send `PATCH` instead.** It was the
  only POST-that-updates in the brain API, it predated the retry-safety design and duplicated it, and it has
  been documented as legacy and listed for removal at the next major since 2026-08-05. The `PATCH` body is
  the same shape. **A flow moved across gains two things it never had:** the legacy verb ran no property
  validation — so under strict validation it could write records the space rejects at create time — and
  stored no audit snapshot. If a record it used to write is now refused, that record was always outside the
  space's schema; the legacy verb simply never checked. Making a create idempotent is unchanged and was
  never this route's job: a client-supplied UUID v4 in the COLLECTION post converges on the same record, for
  every type.

### Changed
- **The Tokens page badge and the graph editor's edit permission read the rights matrix, not the legacy
  flags.** The pill branched on `admin` and `readOnly`; neither can express a per-space grant, so it labelled a
  token that can write in one space **"read-only"**, and one whose matrix reaches nothing **"standard"**. A
  token carrying no matrix now reads as read-only — the predicate failing closed, which is the right way
  round for a label about permission. The client's copy of the ladder is deliberate and bounded: it picks a
  badge and greys out an editor, both cosmetic, and every action it enables is re-checked by the server per
  space and per area.
- **MCP tool visibility and its two dispatcher gates read the rights matrix, from ONE predicate.** The
  expression `!(readOnly && t.mutating) && !(!isAdmin && t.admin)` was written out four times: the
  `tools/list` filter, the two call-time refusals, and `help`'s own listing — the last of those under a
  comment reading *"the exact predicate tools/list uses — one source of truth, so this text can never
  advertise a tool the dispatcher would deny."* It was four copies claiming to be one, inside the mechanism
  built to stop a listing promising what the dispatcher refuses. They are now literally the same function,
  and the gate asserts the SHARING rather than matching two regexes that could both pass while having
  drifted. It also closes a narrower gap: a token holding a write rung in one space used to be shown every
  mutating tool, because `readOnly` was false instance-wide, and the per-space check then refused the call.
  The connection scope signature is keyed on the matrix too — it used to hash the legacy triple, so a token
  edited through the rights editor kept serving its previous scope for the life of an SSE stream.
- **An OIDC identity is now governed by the rights matrix too, not just `readOnly` and `admin`.** The S-1
  fix made MCP enforce the per-space, per-area rung — and that guard skips a token with no matrix, which
  every OIDC record was. So the fix covered PATs and left OIDC on the old booleans: one policy with two
  implementations, on the surface nobody had checked, which is the same shape as the defect it was fixing one
  authentication method over. An OIDC record now derives its matrix from the same `migrateToken` the boot
  migration uses, so a claim-mapped identity and a PAT with the same grants are priced identically. Nothing
  is stored and nothing migrates — the record was always built per request. **An OIDC identity whose claims
  do not cover a tool will now be refused it over MCP**, which is the point.

- **No authorization decision on REST reads the legacy `admin`/`readOnly`/`spaces` token flags any more.** The two
  places that still did are on the matrix now. `denyReadOnly` — the only write guard on **seventeen** mutating
  routes across conflicts, contradictions and duplicates, none of which is space-scoped, so the per-space rung
  check never saw them — derives its answer from the rights matrix, using the same `satisfies` ladder the
  per-space guard uses rather than a second one. It stays **area-agnostic**, because the flag it replaces
  was: it asks only whether the token can mutate at all, and the per-area question belongs to the
  space-scoped guard that already runs on every route naming a space.
  The equivalence is pinned per legacy token shape rather than
  assumed. Two shapes deliberately answer differently, both of them the matrix settling an argument the old
  code was already losing: a token with an **empty** space allowlist is now refused here rather than one layer
  down, and a token flagged **both** `admin` and `readOnly` is allowed — `migrateToken` has always resolved
  that pair as `admin`, so such a token could already write on every space-scoped route while this one guard
  refused it. The space token-access listing also stopped keeping its own fourth opinion about which tokens
  reach a space and now calls `reachesSpace`, like the HTTP guard and the MCP space filter; its `level` and
  `allSpaces` fields keep their shape and are derived from the matrix.
- **BREAKING — MCP now enforces the per-space rights matrix, not just `readOnly` and `admin`.** This is the
  S-1 fix. MCP gated on two booleans while REST enforced a per-space, per-area rung, so one policy had two
  implementations and the weaker one was reachable — measured, not inferred: a token whose matrix said
  `perSpace.general.knowledge = 'write'` was refused `DELETE /api/brain/spaces/general/memories/:id` with a
  **403** and the identical delete through `delete_memory` answered *"Memory deleted"*. A tool call now
  resolves the token's rung for the space it named and refuses with a message naming what was needed and
  what the token holds. **A token that has been reaching a tool its matrix does not cover will start being
  refused** — that is the point, and it is worth checking your token rungs before upgrading. The tool→rung
  table is DERIVED from the route table, and a gate re-derives it and fails if the two disagree, so a
  capability can no longer be priced differently depending on which door you use. Unchanged: tokens with no
  matrix (the OIDC path builds a record per request) and instance-level tools, which are still governed by
  `instanceAdmin` and the tool's `admin` flag.
- **Re-uploading identical bytes no longer re-runs vision or speech-to-text.** `enqueueMediaJob` resets a
  terminal job on purpose, so the same file sent twice paid for a second full analysis to reproduce the caption
  it already had — the most expensive work this instance does. File records now carry the SHA-256 the writer
  already computed (for the response body and the webhook, then threw away), and the media dispatcher skips the
  pipeline when the caller's hash, the stored hash and an `embeddingStatus` of `complete` all agree. That
  conjunction is an identity, not a heuristic: same bytes, same pipeline, same answer. Every other case still
  processes — different bytes, no hash from the writer, no hash on the record (everything written before this
  release), and any status other than `complete`, so **re-uploading is still how a failed analysis is retried**.
  The field is optional and self-healing rather than migrated, because file records sync.
- **A record whose embedded text did not change is no longer re-embedded.** Every successful update enqueues an
  embed job unconditionally — correct, because the enqueue is also how `excludeFromVectorSearch` takes effect and
  it replaced four inline embeds built from stale reads. But most updates change something the vector does not
  depend on: a tag, a property, a link, a status. Each of those paid for a model call that could only reproduce
  the vector already stored.
  - **Lossless by identity, not by heuristic.** A vector is a pure function of (text, model), and every embed
    already writes `matchedText` — the exact text it embedded — beside the vector. When the newly built text
    equals it, a vector is present, and the configured model is the one that produced it, the call cannot
    produce anything different.
  - **No new field and no migration**: the fingerprint was already there, which matters because these are synced
    records.
  - The conjunction is asserted three ways — a changed text, a missing vector, and a vector from another model
    each re-embed. The model-change case is the reindex path, where skipping would leave a space half-migrated.
- **A `type` filter no longer scans the collection.** Every brain list endpoint exposes one, and since `total`
  shipped each of those requests runs a `countDocuments` with the same filter — so the cost doubled on a path that
  was already a scan. `explain()` against a live instance returned **COLLSCAN** for `{type: …}` on memories,
  entities, edges and chrono.
  - Entities are the instructive case: they carry `{ name: 1, type: 1 }`, which reads like coverage and is not —
    `type` is not a prefix of that index. A control assertion pins that, so if MongoDB ever changes its mind the
    new index can be dropped rather than kept out of habit.
  - **Quality-neutral by construction:** the same documents, the same order, the same counts, a different plan.
  - **It reaches existing spaces, not only new ones.** `initSpace` runs for spaces new to the config, so an index
    added there would have landed in this changelog and never in an operator's database. A separate idempotent
    boot pass ensures it for every non-proxy space.
  - Gated by the query PLAN rather than the index catalogue: an index MongoDB declines to use would satisfy a
    `getIndexes()` check and change nothing.
- **The result spill covered graph recalls only.** `topK: 30` with no traversal returned all thirty — the spill
  lived in the `traverse > 0` branch, so the plainest large call was the one that returned everything. Both
  branches spill now, on all three recall paths. Found by writing the end-to-end test rather than by reading the
  code: the standalone gate asserted the rules and passed, because every rule it checked was true in the branch it
  looked at.
- **A large read result comes back as a sample and a download, not just a trimmed graph.** Correction to the
  spill shipped hours earlier, which wrote out only the traversed nodes: the owner's intent was the WHOLE result
  set — *"when someone recalls with topK=100 and traverse=2 he gets a real big file to download but only 3 full
  results back in the response."* A recall cannot be paged, so a large answer had nowhere to go.
  - Past **25 records** (matches plus traversed nodes) the complete set is written to the space's `_tmp/` and the
    response carries **three matches** plus `truncated: true` and `complete: {matches, records, inline, path,
    download, expiresAt}`. `count` still reports the real total — a caller reading `count: 3` would conclude the
    space holds three matching records.
  - **No embedding vectors are written, at any depth.** Stripped at serialisation rather than by projection,
    because a spill is the one place a whole result set is serialised verbatim into a file an operator opens, and
    a rule at the write cannot be forgotten by a caller who never knew it.
  - One-day TTL through the record machinery, as before, and the same authenticated download.
  - All four sites: REST `recall` and `find-similar`, MCP `recall` and `find_similar`.

### Added
- **A "Choosing a Search" guide.** `docs/integration-guide/04e-choosing-a-search.md`: which of `recall`, `query`,
  `find_similar` and `traverse` answers which question, the two-call patterns that beat one clever call, and what
  to tune first when a search is slow or nearly right. Written because the most common reason a search "does not
  work" is that it succeeded and answered a different question.
- **The rights matrix says what a right means for an agent, not only which endpoints it reaches.** The token
  glyph's tooltip now carries both halves — `Knowledge — up to write, read everywhere. Your agent can add, edit
  and delete single records — what normal MCP use needs.` — and the rung sentences name what an agent can do at
  each level. Sixteen new strings in all three locales, plus the three rung descriptions rewritten.
- **Seven destructive REST routes now ask for the `write` rung instead of `admin`, and every token carries a
  rights matrix.** Owner rulings, 2026-08-13, after the difference was **measured** rather than argued: a token
  holding `rights.perSpace.general.knowledge = 'write'` was refused `DELETE /memories/:id` with
  `403 Token needs 'admin' on knowledge in space 'general'` — and deleted the same record through MCP
  `delete_memory` seconds later, because `mcp/router.ts` gates on the token's `readOnly`/`admin` flags and never
  consults the rung. One rule, two implementations, the weaker one silently in charge.
  - **Levelled DOWN, not up:** `write` is the right rung for deleting a single record you could have created. The
    rows are `/memories/:id`, `/entities/:id`, `/edges/:id`, `/chrono/:id`, the entity merge, `/bulk` and
    `DELETE /api/files/:spaceId`.
  - **The collection wipes stay `admin`**, matching `wipe_space` — emptying a collection is not the same act as
    deleting a row. `DELETE /api/brain/spaces/:spaceId/files` stays `admin` too: no tool mirrors it, so lowering
    it would weaken a door for parity with nothing.
  - **`update_space_schema` remains the one known difference**, in the safe direction: REST asks `schema: write`,
    the tool is admin-gated. `scripts/surface-matrix.mjs` reports it every run.
- **Every token now carries a rights matrix, written to disk.** *"Translate old tokens into matrix rights and
  overwrite on update. Only matrix from now on."*
  - `createToken` **always** stores one, deriving it from the legacy fields when the caller did not supply it. It
    used to omit the field and rely on a load-time backfill — which runs once, over the tokens already in the
    config, so a token minted afterwards had **no matrix until the next boot**, and `enforceAreaRung` passes when
    rights are absent. That is why a plain token deleted over REST with a `204` in the same probe.
  - The boot backfill is **persisted** rather than in-memory, so the matrix becomes the record of record and "no
    matrix" means something is wrong rather than something is old. A failed write retries next boot.
  - `updateTokenSpaces` is **deleted**. It had no callers and its only job was editing the legacy allowlist —
    exactly what a future caller would reach for to put the two descriptions of access out of step.
  - The legacy `admin`/`readOnly`/`spaces` fields are **left in place**, so an older build rolls back unaffected.
    Recorded in the hosting guide's rollback table for the shape change alone.
- **The capability map is published.** `docs/integration-guide/16-mcp.md` now carries every capability with its
  MCP tool, its REST route and the token level it needs — generated from the code and checked against the running
  routers. The doc-coverage columns stay internal: an integrator cannot act on which of our files mentions a
  thing, and a `—` there means our name-matcher missed it rather than that a gap exists.
- **The capability matrix is generated and audited from running code.** `scripts/surface-matrix-audit.mjs`
  imports every mounted `Router`, walks its stack including sub-routers, and compares both ways against the
  static extraction: **208 = 208**, plus 41 of 41 tools mapped and each pair sharing an implementation module.
  - Its own first version reported **5 routes out of 202** — Express 5 changed the layer shape, and recovering
    mount paths from `layer.regexp` no longer works. The audit needed auditing.
  - Two routes were also being missed because they are registered by a helper that takes the router as a
    parameter (`registerReembedRoute(spacesRouter)`); attribution is by router identifier now, with mounts
    followed transitively through `use()`.

- **BREAKING — graph-augmented recall nests what it reached under the match that reached it.** The fleet integrator
  2026-08-13T1035Z §3 and 1100Z. `traverse > 0` used to append every traversed record beside the matches with
  `score: null`, and three things followed from that flat list:
  - **With more than one match, nothing said WHICH match reached a node.** It was recoverable from the old
    `path` — by intersecting the first edge's ends against the match ids.
  - **`count` mixed matches with neighbours.** They asked for `topK: 1` and were told `count: 6`, so the number
    a caller pages on described something they had not asked for.
  - **The edge was reduced to `{from, label, to}`**, dropping its `description` — which, on the board this was
    reported from, is where the REASON for a link lives — along with its `tags` and `createdAt`.

  Each match now carries `_graph: [{edge, node, paths}]`, and a nested node carries its own `_graph`, so depth
  is a tree rather than a flag. `edge` is the whole document. `paths` is **every** route to the node, ids only,
  match first — `paths[0]` is the route it is nested under, so the hop count is `paths[0].length - 1` and the
  direction is implicit rather than something to work out from edge ends. `count` is the number of matches
  again, and a new `graphNodes` reports how much graph came back.

  A node reachable several ways appears **once**, with every route in `paths` (owner ruling: no stubs, no
  `{ref: id}` placeholders — a node is complete wherever it appears). Previously the second relationship was
  invisible: a single global visited set attributed the node to whichever edge won the race.

  Off the ranked list, a traversed node has no score competing with a real one and no cut to fall off. That is
  the whole value of traversal: a node reached because the graph relates it to a match is usually **not**
  textually similar to the query.
  - **Every surface in the same commit** — REST `/recall` and `/find-similar`, MCP `recall` and `find_similar`,
    and the Brain → Query tab, which walks the tree depth-first so a neighbour renders directly beneath the
    match it belongs to. `find_similar`'s traverse had shipped hours earlier in the flat shape; leaving it
    there would have created the asymmetry that PR existed to remove.
  - **`traverse: 0` is untouched.** The classic response is byte-for-byte what it was.
  - **What their proposal got wrong about us, in our favour:** §4 argues against reranking *after* traversal.
    We already rerank before it — `recall()` returns reranked matches and the route expands them afterwards —
    so the cost blow-up they warn about (`topK × branching^depth` cross-encoder calls) was never happening
    here. The old `path` was also the full accumulated chain, not just the last edge.

### Added
- **`update_file_meta` — a file's metadata can be changed without resending the file.** `write_file` accepts
  `description`, `tags` and `properties`, but only alongside `content`, so correcting a tag on a 40 MB PDF meant
  re-uploading it — and correcting one on a file whose bytes you do not have was impossible. Every knowledge type
  has an `update_*` tool for exactly this reason; files were the one that did not.
  - Fourth finding from the capability matrix.
  - Runs the route's own rules rather than a second copy: `updateFileMeta` performs the write, and under strict
    linkage every id in `entityIds`/`memoryIds`/`chronoIds` must resolve first — a file carries three reference
    fields and storing an unresolvable one was the widest silent hole this record type had.
  - Maps to `file.meta.update`, the route's own audit operation.
  - Verified that the BYTES are untouched and that a field the patch did not mention survives — a metadata editor
    that silently clears what it was not asked about is the failure mode here.
- **`retry_failed_embeddings` — bulk retry reaches MCP.** `POST /embedding-queue/retry-failed` was REST-only, so
  an agent recovering a space after an embedder outage had to list the failures and call `retry_embedding` once
  per file. That is the shape of the reindex-by-curl-loop that motivated the `reindex` tool, where a customer did
  fourteen spaces by hand because the agent planning their work could not do it.
  - Third finding from the capability matrix, after the `reindex` description and `er_model`.
  - Sums across a proxy's members, narrowing with `memberSpacesWithin` — the MCP half of the rule the route
    states with `memberSpacesForRequest`. Conserved fan-out total 39 → 40.
  - Maps to the route's own audit operation (`file.retry_embedding_all`): one capability, one audit name.
  - `mutating: true`, so a read-only token cannot see or call it. A bulk re-queue creates no records and is still
    a write, and getting that flag wrong is how a read-only token gains a side effect.

- **`er_model` — the entity-relationship model reaches MCP.** `GET /api/brain/spaces/:spaceId/er-model` was
  REST-only, and it answers the question an agent asks first: which entity types actually exist here, which edge
  labels connect which of them, and how many of each. `get_space_meta` answers a different question — the
  DECLARED schema, what may exist — so an MCP-only client could learn what a space permits and not what it
  contains.
  - **Found by the capability matrix**, which listed `GET /er-model` in the REST-only column. Second finding
    from that generator, after the `reindex` description pointing at a route MCP cannot reach.
  - A proxy space reports its members **separately**, exactly as the REST route does: merging counts for two
    types that share a name across spaces would invent relationships that cannot exist, because an edge cannot
    cross a space. The narrowing is `memberSpacesWithin`, the MCP half of the rule REST states with
    `memberSpacesForRequest`.
  - **The REST route is audited now too.** `brain.stats` was recorded and `er-model` was not, which was an
    asymmetry rather than a decision — both report what a space contains. New operation: `brain.er_model`,
    classified as a `read` for the per-space usage counters.
  - Five gates had something to say and each was answered rather than adjusted: the audit map, the tool-count
    tripwire, the read-only classification, the proxy fan-out conserved total (38 → 39), and the
    activity classifier.
  - Verified through both doors on one fixture — two entity types and an edge between them — asserting the two
    responses are `deepEqual`, not merely both plausible.

- **A gate on what a tool description may tell a caller to do.** `tool-descriptions-name-reachable-things.test.js`
  fails when any of the 41 tool descriptions *directs* the reader to a REST route or a `curl`.
  - It distinguishes **directing** from **describing**: `create_space` says *"Refusals match POST /api/spaces
    exactly"*, which is a true parity statement useful to anyone holding both doors. `reindex` said *"poll … the
    REST reindex-status route"*, which is an instruction half its callers cannot carry out. The check is
    per-sentence, and a sentence about equivalence is allowed.
  - Two false positives shaped it before it was right: the parity statement above, and `help` describing its own
    contents (*"how to choose between query / recall … and the REST API map"*) — where a verb list containing
    `query` swallowed a tool name. A gate that fires on correct prose gets deleted rather than obeyed.
  - **Mutation-tested against the sentence that shipped**: restoring it turns the gate red and names `reindex`.

- **`MAX_ALT_PATHS_PER_NODE`** — a dense graph can reach one node dozens of ways, so alternate routes are
  capped at 8 per node and the node says so with `pathsTruncated: true`. A cap a caller cannot see is how
  "these are all the routes" becomes a false conclusion.

- **`recall`'s filter accepts the same grammar `query`'s does.** The fleet integrator, 2026-08-13T1035Z §2: recall took one operator
  object per key, ANDed — no `$or`, no nesting — while `query` took the full allowlisted MongoDB grammar to depth 8. Same
  store, same policy, **two grammars**, so a caller wanting meaning-ranking *and* a real predicate ran `query` first and fed
  ids into something else. Their case is the mailbox filter in their own board's usage notes, which was not expressible in
  recall at any length.
  - **Both grammars, detected by shape.** `{"properties.status": {"eq": "x"}}` is not valid raw MongoDB, so a parser swap
    would have broken every existing caller including our own client. A `$`-prefixed key anywhere means raw MongoDB.
  - **A filter that MIXES them is refused**, naming the offending keys — a caller who believes one thing would otherwise get
    another. One round trip beats a wrong answer.
  - **The key allowlist survives, recursively — including inside `$or`.** Widening the grammar is not widening the keys: a
    recall filter that could name any field would be a way to filter a vector search on fields the index cannot serve, which
    is a performance cliff wearing a feature's clothes.
  - **One parser, not two.** `sanitizeFilter` is exported and reused, so the operator allowlist, the depth cap and the
    regex-safety rules are the ones `query` already gates — and a rejected operator gives the same message on both.
  - **The operator-object form is passed through untouched**, so it keeps the native `$vectorSearch` pre-filter path.
    Translating it centrally would have moved every existing caller onto the exhaustive path — a performance regression
    delivered as a refactor. A raw filter does take the exhaustive path, which the schema and the guides now say.
  - On both surfaces, with the schema description, the integration guide and the userguide's Brain → Search bullet updated
    in the same commit. Verified end to end: an `$or` over two fixtures with identical descriptions reaches both, and an
    `$or` naming one excludes the other — accepting a grammar and then ignoring it would have been the same defect in a new
    place.

- **A gate that compares every declared surface against the one enforcement set.** `client-bodies-match-server.test.js`
  takes the four strict brain read routes and checks the Angular client's request bodies, the MCP tool schemas and the
  integration guide's table against `QUERY_BODY_FIELDS`, `RECALL_BODY_FIELDS`, `TRAVERSE_BODY_FIELDS` and
  `FIND_SIMILAR_BODY_FIELDS`.
  - Strictness moved the failure rather than removing it: an unknown key used to be a wrong answer with a `200`, and is
    now a `400` in whatever is asking. The client's bodies were verified by hand and were correct — which is exactly when
    to write the gate, because a hand-check does not survive the next edit to either side.
  - The client call sites are DISCOVERED by sweeping the tracked sources for a POST to one of the four, so a component
    posting directly instead of through `BrainApi` is covered the day it is written. A hand-maintained file list would
    have shared the blind spot with the code it audits.
  - It refuses to pass vacuously: an opaque body type (`Record<string, unknown>`, an index signature, a named interface
    it cannot read) is a failure naming the file, and the routes are asserted BY NAME rather than by count.

### Fixed
- **An MCP OAuth connector token now stores a rights matrix, and inherits the authorising token's rather
  than re-deriving one.** Two defects, one line apart. `createToken` was given an unconditional matrix
  because a token minted after boot had none until the next restart — and that fix was applied to one of the
  **two** minting paths. `createOAuthToken` stored none at all, which was invisible while a missing matrix
  meant "fall back to the legacy flags" and became a **regression the moment tool visibility began failing
  closed**: a freshly minted connector could not call a single mutating tool. Second, the grant is now carried
  across verbatim instead of being routed through `admin`/`readOnly`/`spaces`, which cannot express a
  per-area grant — a token holding `knowledge: write` beside `files: read` on a space came back as **write in
  both**, so the connector could write files its authorising token could only read. A gate derives the minting
  paths from source and fails if any of them stores a token without a matrix, so a third path is covered
  without anyone remembering the gate exists.
- **`crossSpace` on `find_similar` is NOT deprecated after all, and its schema description said otherwise.**
  It was slated for removal — omitting `space` on MCP says the same thing — until removing it turned the
  MCP/REST parity gate red: the REST route takes the space in its **path**, so "omit the space" cannot be
  expressed there and `crossSpace: true` is its only route to the same capability. The flag stays on both
  doors, and the MCP tool schema now says why it exists instead of telling callers to avoid it. If you
  designed around `crossSpace` disappearing, it is not going to.
- **60 gates stripped block comments before line comments, so a `/*` inside a `//` comment blinded them.**
  `server/src/api/data.ts:281` reads `// Follow the symlink — useful for /mnt/* or volume-mount points`, and
  removing block comments first treats that `/*` as an opener: it deletes **5,907 characters** through the next
  `*/`, taking three route registrations with it.
  - **It had already cost something.** `every-space-route-has-an-area` could not see
    `DELETE /api/files/:spaceId`, `PATCH /api/files/:spaceId` or `POST /api/files/:spaceId/retry_embedding`, so
    none of the three carried a rights row for as long as they were invisible. They were added an hour earlier,
    when an unrelated edit happened to shift the swallowed region.
  - **Blast radius measured, not assumed:** two source files lose real code to the wrong order — `api/data.ts`
    (5,907 chars) and `files/converters/pipeline.ts` (355). The other 506 are unaffected.
  - 60 sites across 58 files now put line comments first. `_strip-comments.mjs` holds the correct pair for new
    code, and `comment-strippers-are-ordered.test.js` fails on the other order anywhere in the suite.
  - **The gate needed three attempts and a mutation test caught two of them.** A single regex spanning both
    `.replace()` calls matched nothing — inside a `.js` file the line-comment pattern is written with escaped
    slashes. Comparing first-occurrence positions file-wide then flagged eight innocent files, including one
    that strips block comments and never strips line comments at all. It compares positions within a window
    around each block-strip now, and reintroducing the original defect turns it red.

- **The `reindex` tool told MCP callers to poll something MCP could not reach.** Its own description said the
  job *"runs in the background and may take minutes, so poll `get_space_meta` or the REST reindex-status route
  rather than waiting on this call"* — and `get_space_meta` did not carry the reindex state. `needsReindex` was
  read by one route and by **no tool at all**, so a client with no HTTP door (Claude Desktop, any pure-MCP
  agent) could start a multi-minute job and never learn it had finished.

  Worse than a missing capability: a schema description is what a caller reads *while constructing arguments*,
  and one that names a door the reader does not have is the same shape as `recall`'s filter description claiming
  a post-filter — the wrong sentence was the one being read.
  - `get_space_meta` and `GET /api/spaces/:id/meta` both report **`needsReindex`** now, `.some()` over the
    member spaces exactly as `GET /reindex-status` computes it, so a proxy is `true` when any member is.
  - The `reindex` description names that field instead of a route. The smaller of the two available fixes, and
    the one that makes the existing sentence true rather than adding a second one.
  - `GET /api/brain/spaces/:spaceId/reindex-status` is unchanged — this adds a field, it does not move a route.
  - **The new field had to join `SERVER_OWNED_META_FIELDS`, and CI is what said so.** A caller who `GET`s a
    space, edits one field and `PATCH`es it back would otherwise get `unrecognized_keys` for a field they
    never wrote — the exact report that strip exists to answer. `type-schema-crud.test.js` round-trips a real
    response rather than a hand-built body, so it went red the moment the response grew.
  - `meta-response-round-trips.test.js` now holds the agreement in seconds rather than in a four-minute
    Docker suite: every field the meta response emits must be an envelope field or a stripped one.
  - **Found by the capability × surface matrix**, not by a report: the generator put `reindex-status` in the
    REST-only column, and reading why turned up the description pointing at it.

- **A truncated graph traversal was indistinguishable from a complete one.** `traverseRecallSeeds` ended with
  `collected.slice(0, limit)` and nothing in the response said the slice had happened, so `graphNodes: 7` at
  `topK: 1, traverse: 1` might be the whole neighbourhood or the first 7 of 40. `degraded` does not cover it —
  that reports a member that failed or timed out, not the traversal cap.

  Worse here than on a list: a caller paging a list can compare against `total`, there is no total for a
  neighbourhood, and a short graph reads as *"this record has few relationships"* — a wrong conclusion about the
  **data** rather than about the request. The cap formula is not something a caller can predict from the
  parameters they set either.

  **A flag was rejected as the answer** (owner ruling): it tells a caller their graph was cut and leaves them no
  way to get the rest, which on a neighbourhood is the same dead end the paging cap was on a list. So the cap is
  now a **spill point**, not a truncation point:
  - Past it, the **complete** graph is written to the space's `_tmp/` as JSON and the response carries
    `graphTruncated: true` with `graphComplete: {nodes, path, download, expiresAt}`.
  - The download is the ordinary **authenticated** `GET /api/files/:spaceId?path=…`. A URL that worked without
    the caller's token would be a way to read a space's records with no auth.
  - The file is written to the space a **seed** came from, never to the space the call was addressed to. A
    proxy space is a lens rather than a store — `resolveWriteTarget` refuses a write to one without an
    explicit `targetSpace` — so addressing the spill at the request's space would have created a file tree
    and a `{proxy}_files` record for a space meant to have neither. Caught auditing the spill against the
    proxy rules before it merged.
  - A token with brain read but **no files read** gets a link it cannot fetch. It still learns the graph was
    short, which is the part that was invisible; the alternative — suppressing the spill for such a token —
    would hide the size as well as the file.
  - **One day**, stamped through the record TTL machinery that already exists — the sweep's `files` handler runs
    the full `deleteFileCascade`, so the blob goes with the record and there is no second sweeper to forget.
  - **Hidden from browsing** (`DERIVED_TREES`, beside `_converted/` and `_extracted/`) and **never embedded**:
    embedding a read's own output would spend model time making recall results recall-searchable, so a later
    recall could match the JSON dump of an earlier one.
  - **The spill walk is itself bounded**, at 20× the inline cap, and hitting that bound is reported as
    `ceilingHit` in the response *and inside the file*. A second silent truncation inside the fix for the first
    one would be the same defect wearing the fix's clothes.

- **Three mutating file routes were ungoverned by the rights matrix.** `DELETE /api/files/:spaceId`,
  `PATCH /api/files/:spaceId` and `POST /api/files/:spaceId/retry_embedding` had no `ROUTE_RIGHTS` row, so the
  per-space area/rung matrix did not describe them.
  - **They were invisible to the gate that exists to catch exactly this.** `every-space-route-has-an-area`
    strips block comments before scanning, and a region of `api/files.ts` was being swallowed with them — so the
    three registrations were never discovered and never demanded a row. Editing that file elsewhere shifted the
    swallowed region and all three appeared at once.
  - `DELETE` is `admin`, matching `DELETE /api/brain/spaces/:spaceId/files`: deleting a directory takes the tree
    with it, and the metadata half of that operation has always been the highest rung. The other two are `write`.

  All four traverse sites — REST `/recall` and `/find-similar`, MCP `recall` and `find_similar` — go through one
  builder, and a gate asserts that count so a fifth cannot opt out.

  **Verified above the cap, deliberately.** The fixture is a 30-leaf hub with an inline cap of 8: a fixture
  inside the cap cannot see this defect at all, which is exactly how the 2.8.0 deep-skip shipped behind tests
  that paged 12 and 25 rows.

- **`find_similar` accepted `traverse` and `includeContent` on MCP and refused them over REST.** The tool schema
  advertised both and its handler implemented both; the REST route read neither, and the integration guide described the
  gap as intended behaviour (*"the MCP tool ... adds `traverse`"*). A caller who read the tool schema and switched door
  got a `400` for a documented parameter — and before the read bodies were made strict, got a `200` with an unexpanded
  answer, which is why it survived this long.
  - REST `/find-similar` now implements both, using recall's item shape, cap formula and `stripContentIfAsked` helper
    rather than a second copy of them, so the two graph-augmented responses cannot drift.
  - Bad values are refused rather than coerced, in recall's exact words: `traverse` must be an integer 0–5,
    `includeContent` must be a boolean.
  - **Found by a gate, not by a report.** The measurement that found it was wrong on its first run — `inputSchema` is a
    function of the token-scoped schemas, and read as a literal it reports every REST field as missing from MCP, the
    opposite of the truth. The gate now asserts the schema is materialised before comparing anything.
- **The integration guide's accepted-fields table had drifted from what the routes enforce.** It still said *"there is no
  `sort` on `/query`. It is refused rather than ignored"* after `sort` and `dir` had been added, so the authoritative
  reference told integrators a working parameter would be rejected. The table is now compared against the enforced sets
  by the same gate.

- **The brain LIST endpoints report a `total`, refuse `offset`, and page a proxy space correctly.** The fleet integrator, 2026-08-13T1020Z
  (corrected 1036Z): they paged `/memories?limit=300&offset=N` in a loop and it never came back short. `offset` is not a
  parameter we have — the routes read `skip` — so it was accepted and ignored, every page was the same newest-300, and **67
  identical pages summed to 10,184 matching records in a space holding 300 with 152 matches**. They were about to delete
  records on that number; what caught it was `get_stats` disagreeing, not anything the paging response said.
  - **`total` in the envelope** — their ranked #1, *"the one we would take if you only do one"*: the caller compares its
    running sum against what the server counted and stops. Plus `truncated`, their #3, so a partial page says so rather
    than being derived.
  - **An unsupported pagination name is a `400` naming the one to use** — their #2, in their words: *"accepting a parameter
    and ignoring it is worse than rejecting it, because the caller writes a loop around it."* `offset`, `page`, `per_page`,
    `pageSize`, `sortBy`, `orderBy`, `order`, `direction`. Deliberately a short list of plausible-but-wrong names rather
    than a strict allowlist over the whole query string, which would refuse the cache-busters and analytics params a GET
    picks up in the wild.
  - **All five list endpoints now page through `pageAcrossMembers`** — memories, entities, edges, chrono, file-meta — so a
    proxy space's page is the page of the merged set instead of `skip` rows dropped from each member. That was a second,
    quieter instance of the same defect.
  - Documented in all five places the parity rule now names: both APIs, the integration guide, the userguide's Brain →
    Search page, and the rights rows (unchanged — same routes, same rights).

- **A derived file description could overwrite one a person had written.** The media worker read the stored description,
  computed `operatorWrote` from it, and then wrote its derived text on that decision — a read-modify-write, which cannot
  win the race it exists to win. An operator `PATCH` landing between the read and the write was silently replaced: no field
  missing, no status wrong, the description simply somebody else's. Same shape as the 2.5.1 defect that computed a vector
  from the record *as the write had read it*.
  - The condition now lives in the **update filter**, so MongoDB arbitrates in one operation:
    `setDerivedDescriptionIfUnset` matches only while the stored description is absent, null or whitespace-only. If it
    became non-empty in the meantime, the update matches nothing and the operator's text stands.
  - The `excerpt` half keeps writing unconditionally, which the original comment was right about: it is the document's own
    text rather than a competing summary, and it is what makes a remembered phrase find the record.
  - `descriptionSource` keeps its old semantics exactly — a derived description with no known provenance UNSETS it rather
    than inheriting the previous label. Ported deliberately: mislabelling where text came from would be a worse bug than
    the race.
  - **Found chasing a CI failure**, and the mechanism came from source rather than from a reproduction — the race does not
    reproduce on an idle machine, which is stated in the test rather than implied. The assertions force the interleaving
    instead of hoping to lose a race, and are mutation-tested by neutralising the filter.
  - The whitespace case earned its keep immediately: the first version of the filter used `'^\s*$'` as a **string**, which
    in JavaScript is `^s*$` — it matched "sss" and not whitespace. It is a `RegExp` literal now, which cannot lose the
    escape.

- **The embed-job listing takes `skip`, so a reported failure is always reachable.** `getEmbedJobCounts` aggregates every
  job while the listing returned one capped page, so a space reporting `failed: 500` had no way to reach failure #201 — an
  accurate total beside an unreachable tail, on the one surface whose justification is that its failures are actionable.
  - Same asymmetry that cost the fleet integrator a fabricated number on `/query`, found by auditing the surface in the same pass that
    found the deep-skip defect.
  - **Both listings now page through ONE function**, `spaces/page-across-members.ts`, rather than the same shape written
    twice: a single space pushes `skip` to MongoDB, and only a multi-member proxy merges, bounded, with an explicit refusal
    instead of an empty page. `/query` had that logic inline, which is how it shipped a window that truncated deep pages.
  - Tested with a **250-job** fixture, because the cap is 200 and a fixture inside the cap cannot see this — exactly how the
    same defect shipped on `/query` behind tests that paged 12 and 25 rows. Mutation-tested by removing the `skip`.

- **`recall`'s filter description said the filter was applied AFTER vector search. It is not, and a customer designed
  around the wrong sentence.** The fleet integrator, 2026-08-13T1035Z: they read it, believed it, and built a skill that deliberately
  avoided filtered recall — on the sound reasoning that a record which does not rank inside `topK` would never reach a
  post-filter, so an inbox built on recall could silently miss a message.
  - **`help()` described the behaviour correctly at the same time.** Two of our surfaces stated opposite semantics, and the
    wrong one was the one a caller reads *while constructing arguments* — which `help()` itself calls the authoritative
    machine-readable reference. Their words: *"a stale sentence in a schema is invisible: nobody reports a capability they
    were told they did not have."*
  - The description now leads with the guarantee rather than the mechanism: **`topK` is filled from records that satisfy
    the filter**, so nothing is dropped by `topK` — and names both paths, because they differ in mechanism and not in
    outcome. Declared fields with `eq`/`in`/`gt`/`gte`/`lt`/`lte` become a native index pre-filter; an undeclared
    `properties.*`, `exists` or `ne` scores the whole space and filters after.
  - **My first correction was also wrong**, and only checking the REST guide caught it: *"selects the candidate set before
    ranking"* is true of the indexed path and false of the exhaustive one. Replacing one inaccuracy with another, on the
    sentence whose inaccuracy is the defect, would have been the worst available outcome.
  - New gate `schema-descriptions-agree-with-help.test.js` refuses the specific claims we have been corrected on as literal
    banned phrases, each naming the report that put it there, and asserts the schema and `help()` still agree on which
    paths are indexed. Mutation-tested with the exact sentence they read.

---

---

## Earlier releases

- [2.x](changelog/CHANGELOG-2.x.md) — 17 releases
- [1.x](changelog/CHANGELOG-1.x.md) — 10 releases
- [0.x](changelog/CHANGELOG-0.x.md) — 18 releases
