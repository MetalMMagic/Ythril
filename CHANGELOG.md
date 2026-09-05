# Changelog

All notable changes to Ythril are documented here. This file covers the **current major series**;
earlier majors are archived under [`changelog/`](changelog/) and linked at the bottom.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.0.0] — 2026-09-05

### Added

- **The divergence check hashes a file's metadata too, and only the authored half.** Both halves of that
  sentence are load-bearing, and they fail in opposite directions.

  Hash nothing and two instances holding different descriptions compute the same root and report
  themselves **identical** — a permanent false negative on the one signal that says data really is missing.
  Hash the derived fields as well and two instances that agree about everything anybody WROTE diverge for
  ever over a size in bytes, which teaches an operator to ignore the warning.

  The check is advisory and blocks nothing, so nothing else would ever have contradicted either reading.

- **Deleting an entity can take its edges with it — behind a preview and a token** (owner's ruling
  `P-29`). A `DELETE` on an entity is refused while edges still connect it to something. There is a second
  way out now, and **the refusal itself names it**.

  Call `GET .../entities/:id/cascade-preview`, read exactly what would go, and repeat the `DELETE` with
  the `cascadeToken` it returns. The `entity_cascade_preview` tool is the same capability for an agent.

  **Not a flag, and the reason is not caution.** An entity is a hub: the records a cascade removes are not
  visible in the call, there is no undo, and a flag saying *"I checked"* cannot be checked. A token quoted
  back from a preview can be — it is derived from the exact list you were shown, so **a record created
  after you looked cannot be deleted by a decision taken before it existed**. Add an edge between the two
  calls and the delete is refused, with the current list attached so your next call is one and not two.

  **The refusal used to say nothing about any of this.** It has listed the blocking ids since 3.x, and the
  integrator who asked for this spent four attempts — `?cascade=true`, `?force=true`, `?deleteEdges=true`,
  `?withEdges=true` — before writing clear-then-delete by hand. The `409` now carries the preview route
  and the parameter name, so the next step is discoverable from the error rather than from the guide.

  **What it removes:** the edges, and the entity. **Not** what is at the other end of them — a cascade
  takes the relationships, not the records they join. Not a face label either: the photo survives and is
  unlabelled, which an ordinary delete already does. And not a memory, timeline entry or file that names
  the entity: those are records of their own, they still block, and the refusal names them.

  The token never expires and is not a secret, both deliberately. A token that still matches means the
  list has not moved, which is exactly when your decision is still good — an expiry would refuse a correct
  decision and accept a stale one whenever the clock happened to agree. And anyone who can compute it
  already knows the list, because the refusal prints it.

- **The token list sorts on every column but the buttons, and searches on Label and Spaces.** Owner-requested,
  2026-09-01, with the Brain tables as the reference — so it reuses their header primitive: click a heading to
  sort, click again to reverse, and two search boxes dock under the two headings that have them.

  Sorting is client-side, and that is written down rather than left to be discovered: the token list arrives in
  one response and never pages, so there is nothing to ask the server for. Adding `sort`/`dir` to the auth API
  would owe all five places a capability lives, for a list that has no pages to span.

  **Two orderings are decisions rather than defaults**, each with a case naming it. **Spaces sorts by reach** —
  library-access, then fewest spaces, then unrestricted last — because sorting badge text alphabetically answers
  no question anybody has, and because `spaces: []` means ALL spaces, so ordering by length would file the
  broadest token as the narrowest. **Blanks stay at the bottom in both directions**: *never used* and *no
  expiry* are absences, and sorted as values they would head an ascending list as though least-recently-used,
  or bury the tokens expiring soonest under the permanent ones.

  Filtering to nothing now says so and offers to clear the search, instead of showing the "you have no tokens
  yet" state — which would tell an operator their tokens had been revoked.

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

- **A file's METADATA now replicates — its description, tags, properties and the records attached to it**
  (owner's ruling `P-32`).
  The bytes have always travelled. What somebody wrote about a file did not.

  **That was consistent until link records started replicating.** From then on, a file linked to an entity
  on one instance sent the LINK and not the list it came from: the graph on a peer showed the connection
  and the peer's own file list showed none. Two answers to one question, differing by which one you asked.

  **Only the authored half crosses the wire, and the write MERGES rather than replaces.** Each instance
  keeps what it worked out from its own copy of the bytes — the size, the checksum, the extracted text and
  the search vector. A whole-document replace would leave the file reporting the SENDER's size and hash
  with no vector at all, findable by neither its own text nor its own name, with nothing having failed.

  A field the sender omits is **left alone rather than cleared**: a peer on an older build sends fewer
  fields, and reading absence as deletion would let it erase a description it has never heard of.

  **A file CHUNK is refused rather than stripped.** A chunk is derived from the blob and each instance
  makes its own, with its own chunker and its own model. Stripped of the field that marks it, it would land
  as a FILE under an id ending in `#0`, carrying another instance's passage text.

- **A file metadata record has a `seq`, which it never had.** It is the ordering primitive replication runs
  on — the page cursor, the watermark, and last-writer-wins are all seq-based.

  **Its absence was also a live defect with nothing to do with sync**: two writers appending to a file's
  entity list read, modified and wrote with nothing to order them, so one append could silently drop the
  other. It was the only lost-update race among the brain collections, and the only one whose record type
  had no seq.

  Metadata written before 4.0 has none, so it does not reach a peer until the record is next written.
  `npm run links:convert` stamps what is already stored — the same one-off that converts the link records,
  idempotent, and safe to run twice.

- **A brain now says what version it runs, and one that is too old is refused rather than trusted**
  (`N-1`, from the owner’s ruling on `P-33`). Every instance reports its version over member gossip, in
  both directions of the exchange, and a peer below the required minimum is sent no data and accepted from
  for none. The refusal names both numbers — what the peer runs and what is required — because the person
  who has to act on it is the operator of the OTHER instance, reading it in their own log.

  **The product could not express this at all before.** There was no minimum-version setting anywhere in
  the server, nothing that refused a peer on version grounds, and a member record had no field to hold a
  version. `/health` reported one and no sync path read it, so an instance had no way to know what its
  peers were running.

  **A brain that ANSWERED and named no version is below the floor.** Only 4.0.0 onward reports itself, so
  for a brain you have exchanged with, "said nothing" and "older than 4.0.0" are the same statement.
  Read the other way — unknown, so probably fine — every brain the check exists to stop walks through it,
  which is a shape this codebase has shipped three times as an empty allowlist read as unrestricted.

  **But a brain you have never exchanged with is NOT refused, and getting that wrong was an outage.**
  The first version treated any missing version as too old. A member can be legitimately versionless for
  ever: a peer added by hand, or a network where only one side holds the configuration, may never
  complete the exchange that reports a version — and every brand-new network is in that state until its
  first exchange finishes. So the safe-looking reading stopped the data plane permanently, with nothing
  on screen to say why. There are three outcomes now rather than two, and the third is silence:
  unreachability was already counted and shown as **Failing (N)**, and the floor does not answer a
  question it has no evidence for.

  **The floor is 3.1.0, deliberately not 4.0.0.** 3.1.0 is the release that started writing the current
  spelling of the never-embed mark, so at this floor no peer can be one that strips it — which is exactly
  what the ruling needed. A 4.0.0 floor would also have worked and would have been worse: it forces a
  whole network to upgrade in lockstep, because the moment one instance reaches 4.0 every 3.x peer stops
  syncing. Raising it later is a single line.

  **A refused brain recovers by itself.** Upgrade it and it reports its new version on the next round;
  the badge clears and data resumes with no button and no restart. Two separate mistakes were in the way
  of that and both are worth recording, because they are the same mistake at different distances: the
  check first ran ahead of the exchange that learns a version, and then it read a copy of the member
  captured before that exchange. Either one refuses a brain for a version it no longer runs.

  **Governance is deliberately not gated.** A vote round expires on a deadline, and refusing an ejection
  vote about a stale peer because the peer is stale is how a network loses the ability to remove it. Only
  the data plane is refused.

  **What it is not: a defence against a brain that lies.** A version is self-reported and nothing checks
  the claim, so this stops an OLD brain from mishandling data — a compatibility control, not a security
  one. Trust between brains is what the voting and signing settings are for, and those authenticate.

  On the Networks page a refused member shows a red **Version too old** badge whose tooltip carries both
  numbers — distinct from **Failing (N)**, which means the peer was called and did not answer. A refused
  peer is never called, so it has no failure streak and no timestamp, which is also what a brand-new
  member looks like. Both API doors carry the same three fields per member — `version`,
  `belowFloor` (the refusal sentence, or `null`) and `minPeerVersion`. Per member rather than on an
  envelope because `list_peers` returns a bare JSON array by contract, and wrapping it would break every
  caller that indexes the result — so one spelling of the fact through both doors, not two.

- **Every reader of "what is next to this?" answers from one definition.** Five of them each followed a
  different subset of the six fields: the standalone traverse, the walk inside `recall`, the scan that
  refuses a delete, the ER diagram, and the check sync runs on arriving records. The last one had never
  adopted the shared module at all — it hardcoded one field name, one target collection and the UUID shape.

  It now derives its classes like everything else, so a memory or timeline entry arriving from a peer has
  every one of its link arrays checked instead of one. **It still only RECORDS** — sync ingest is
  "validated, counted, and let in", and a refusal there would hold the watermark and stop the channel.

- **Deleting a memory or a timeline entry can now be REFUSED, and this is the change most likely to reach
  a running script.** In a space with `strictLinkage` on, a timeline entry listing a memory — or a file
  listing either — blocks the delete with a `409` that names what is referring to it.

  **It always succeeded before, and that was not a policy.** Three of the six link fields had no reader
  anywhere in the server, so the reference was stored, replicated and invisible: the referring record was
  quietly left pointing at something that no longer existed, which is the exact outcome `strictLinkage`
  is bought to prevent. With it off, the delete still always succeeds.

  `delete_edge` is unchanged and now says why rather than citing the old asymmetry: links run FROM a
  memory, timeline entry or file TO what it is about, so **nothing can point at an edge**.

- **A converted space refuses an array write, and points at the link door instead.** Once
  `npm run links:convert` has finished a space, sending `entityIds`, `memoryIds` or `chronoIds` to any of
  the seven write doors answers `400` naming `POST .../links`. Left open, the arrays are a second write
  surface for the same fact, and on a converted space the two can then disagree — which is the defect the
  whole migration exists to remove, reintroduced by its own compatibility.

  **The fields are still READ, still stored and still replicated.** Nothing you have is lost, and a space
  you have not converted is untouched.

  **Three things it deliberately never does**, each of which would break something that works:

  - it is not hung off `validationMode: strict` — that governs schema rules and is already on live spaces,
    so every one of them would start refusing the moment it upgraded, before anybody ran anything.
  - it never applies to a record arriving from a peer. Sync ingest is validated, counted and let in, and a
    refusal there would hold the watermark: the channel stops and the space silently falls behind.
  - it never applies to a write that does not MENTION an array. Editing a memory's text on a record that
    still carries a legacy array succeeds, or every unconverted record would become uneditable.

- **Three link fields that have never been read now work — `chrono.memoryIds`, `file.memoryIds` and
  `file.chronoIds`.** They have been accepted, checked for resolvability, stored, replicated and documented
  since 3.x. Nothing walked them. A traverse from a memory did not reach the timeline entry that named it;
  a traverse from a timeline entry did not reach the file about it.

  **That was never a decision.** It was three fields nobody had written a reader for, and it was invisible
  from the outside precisely because the data was all there — you could see the ids on the record and get
  nothing back from the graph.

  A link class is a `(fromKind, toKind)` PAIR now rather than a record kind. Keyed on the from kind alone,
  a caller asking about a chrono entry's MEMORY links was silently handed the class for its ENTITY links
  and scanned the wrong column — no error, and a plausible empty answer.

- **The scan that refuses a delete can see references to a memory, a timeline entry or a file, not just to
  an entity.** Nothing blocked deleting a memory that a timeline entry named, even under the strictest
  linkage setting on offer, because that link had no reader. The scan sees it now; the refusal itself
  arrives with the deprecation notice for the six fields, so it is announced rather than sprung.

  The edge half of that scan also compares the endpoint KIND. An edge endpoint has carried its own kind
  since 3.7, so matching on the id alone could block a delete because of an edge pointing at a different
  record that happened to share it.

- **A converted space answers adjacency from link records, and an unconverted one keeps the array walk.**
  One selector decides, for every reader — a reader choosing for itself is how five of them came to follow
  five different subsets. Reading records alone would answer about whatever was written since the upgrade
  and silently drop the rest; the arrays are complete on every space, always, which is what makes them the
  safe side of the branch.

  **Both shapes answer all six classes**, so the three fields above start working on every space
  immediately. Running `npm run links:convert` is a speed and consistency upgrade — one indexed lookup in
  place of a collection scan per class — and never a correctness prerequisite.

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

- **A request with no authenticated token can no longer be read as an unrestricted legacy one.** Two
  places in the tokens API check what the caller holds before deciding what a new token may be granted,
  and both fell back to an EMPTY legacy record when there was no token at all.

  An empty legacy record is the widest thing this codebase can express: in the pre-3.0 model absence
  meant unrestricted, so it derives a write floor on every area of every space, **including spaces created
  later**. As the caller's own ceiling, that would have let a request with no token mint an instance-wide
  write token.

  **Not reachable — both routes sit behind authentication — which is exactly why it was easy to write and
  would have stayed until something moved.** A default that fails open behind a guard is a hole waiting
  for the guard to change.

  **The migration itself is unchanged, deliberately.** Reading an empty record as unrestricted is correct
  for what it is for: a genuine pre-3.0 token on disk relies on that reading, and changing it would have
  locked out somebody's working token to close a hole nothing reaches. The gate that compares the rights
  matrix against the old allowlist is what said so — it failed on the first attempt at this fix, and it
  was right to.

- **The token list table is its own component** (`token-table.component.ts`), with its ordering and matching
  rules in `token-table.ts` beside a spec that names each one. The page was at its frozen size ceiling, so the
  feature could not be added to it — and the gate's message is the argument rather than the rule: every change
  lands in the same place because that is where the code already is. What stays behind is the page's requests,
  its create dialog and its rights editor.

  The two expiry predicates moved to the shared module in the same pass, because the table's badges and the
  page's active/expiring/expired rollup are two consumers of one rule.

- **The four sync read routes were one rule written four times, and are now one function.** `GET` of a
  page by `seq`, and `GET` of one document by id, for each of memories, entities, edges and chrono —
  byte-identical apart from three names. This is the replication contract (what a page is, where the cursor
  comes from, which tombstones ride in it), so a copy that drifted would make replication depend on which
  record family a peer happened to ask for.

  **One of the eight reported its failures more weakly than the other seven**, and the stronger one is what
  shipped: `GET /api/sync/memories/:id` logged only the exception message, where its three siblings
  logged the stack. An operator reading "Cannot read properties of undefined" has nowhere to go.

- **A plaintext peer URL is refused where it is ADDED, on every door.** `allowInsecurePeers` is documented
  as *"peer URLs must be `https://`, regardless of address"* — and one route did not enforce it.
  `POST /api/networks/join-remote` declared its own URL validator: parse plus SSRF check, no SCHEME check.
  So an instance with the flag off would still open a plaintext handshake to an `http://` inviter.

  **Not a credential leak, and saying so precisely is the point.** The sync token comes back RSA-wrapped and
  the sync engine logs its once-per-host plaintext warning. What crossed in the clear were instance ids,
  labels, the network id and a public key — and the operator learned about it from a log line after the fact
  rather than a refusal before it. A transport policy that does not cover the one URL a join reaches out to
  is not the policy the setting describes.

  The same route's `myUrl` was a bare `.url()`: no SSRF check either, so a loopback or plaintext value came
  back as a `400` from the *other* instance, where a local refusal belonged.

  **One rule, four implementations, two of them weaker.** `SSRF_SAFE_URL` is the rule; `api/invite.ts` held a
  byte-identical copy under its own name, and `join.ts` held the two that had diverged. Identical copies are
  the ones that get missed — the next change fixes whichever name you searched for. All four sites now
  resolve to the single declaration, and a new gate finds every zod `.url()` on the network and invite
  surface and requires it to do the same, so a route added later cannot bring its own chain.

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

- **One space wipe instead of four.** `bulkDeleteEntities`, `bulkDeleteMemories`, `bulkDeleteEdges` and
  `bulkDeleteChrono` were the same thirty lines in four of the largest files in the server (`R-4`). They are now
  one function in `brain/bulk-wipe.ts` with three-line callers: `entities` 372 → 349 code lines, `memory`
  291 → 264, `chrono` 410 → 386, `edge-bulk-delete` 33 → 3, against 38 for the shared helper.

  The subtle part is why it mattered. A wipe reserves its whole tombstone seq range in ONE round trip — it used
  to call `nextSeq()` per document, so a 100k-document wipe paid 100k awaited round trips before the delete
  began. Gaps in the range are harmless because sync compares with `>`; reuse would not be, so the block is
  taken up front and never rolled back. That is precisely the kind of reasoning that gets fixed in one copy of
  four and left alone in the other three.

  **What legitimately differs is kept, as options.** The entity wipe clears every face label in the space —
  wholesale rather than by id list, because on a 100k-entity wipe an `$in` would build a 100k-element query for
  a filter meaning "all of them" — and the memory wipe orders its tombstone range newest-first. Two
  characterization cases were added for that ordering, because nothing covered it and the extraction was exactly
  what could have dropped it in silence.

  Seven mutants died, including the two the extraction newly made possible: a caller losing its cascade, and
  that cascade being wired to every caller instead of one. Three dead imports came out with the old bodies —
  `asBulk` and `reserveSeqBlock` were left naming nothing in three files, and the build never said a word.

- **A graph hop is ONE query over the link records, not one per class — a 3.8× slowdown caught before
  release and removed.** The first implementation asked the links collection once per link class and then
  fetched the records it named once per class: twelve round trips per hop, where the array walk it
  replaced does three collection reads.

  Measured on a corpus of 8 380 links, a traverse at depth 2 took **37.3 ms against the array walk's
  6.9 ms**. Same answer — 107 nodes either way — on the change whose whole argument was that one indexed
  lookup beats three scans over arrays. **The lookup was never the cost. The round trips were.** One query
  on the `{to, toKind}` index returns the whole hop and the classes are separated in memory; one document
  read per COLLECTION rather than per class also stops a file being fetched three times, once for each
  class it holds. Twelve became four, and depth 2 went to 8.5 ms.

  The scan that refuses a delete had the same shape for a single record — six queries plus six reads for
  one id — and went from 10.7 ms to 5.1 ms.

  **Nothing but a measured PAIR could have found this.** Every functional test passed throughout, because
  the answers were identical. `benchmarks/LINK-READERS.md` publishes all three columns and the script that
  produced them, and a gate now holds the batching so it cannot quietly come back.

  **What is still slower, stated rather than buried:** a traverse on the link path costs 1.3× to 1.7× of
  what 3.x cost, and the reason is the feature. 3.x followed three link classes and 4.0 follows six —
  `includeChrono` used to reach the entities a timeline entry names and now also reaches the memories it
  names. On a corpus where those reach nothing new, that time buys nothing; on one where a file names a
  memory nothing else points at, it is what finds it. The edge walk with every link class off did not move
  (1.05 → 1.02 ms), which is what says the difference is links rather than the release.

- **The schema for a space's per-type schemas builds its own shape from the one list of record kinds.**
  It wrote `entity`, `memory`, `edge` and `chrono` out as object keys — and being `.strict()` made it the
  only thing in the product that can REFUSE one of those names. So the authority on which kinds hold a
  type schema was a hand-written copy of the answer, and a fifth kind would have been rejected there while
  every other site accepted it, with the refusal naming a request that was correct everywhere else.

  The gate that holds this list to one definition could not see it: it matches the four names as quoted
  strings, and here they were property names. It reads object keys too now, and its own self-test
  reproduces the exact shape that hid.

  **A `Record<…>` map is deliberately exempt**, which is the rule and not a hole in it: the four names
  being present there is the compiler forcing them, so a fifth kind stops those objects building, by name.
  What the check is for is the case where nothing requires the list to stay complete.

- **An update now refuses what its create refuses.** Eight measured defects, all the same shape: the same
  field, two doors, two rules, and whichever one you happened to use decided what got stored.

  The worst was a timeline entry. Its `PATCH` validated **nothing** it accepted, so one request stored
  `{"title": 42, "startsAt": {"$gte": "…"}, "tags": "urgent"}` and answered `200` — a database query
  operator sitting in a date field, in a record whose create door refuses all three and which you are not
  even allowed to DELETE those fields from, because they are required.

  The one that damaged READS was quieter: a non-array `entityIds` skipped the id check entirely and broke
  every graph lookup over that field, on a record that looked fine.

  **Also closed:** a memory's 50 000-character limit was enforced on all four create doors and neither
  update door; a blank name or label got in through whichever door tested it before trimming, and since an
  edge's identity is DERIVED from its label, the blank one re-keyed the record; an edge `weight` was held
  to 0–1 by both agent-facing doors and by neither HTTP door, so `47` was a valid weight over one and an
  error over the other.

- **A create no longer discards a malformed field in silence.** `{"fact": "x", "description": {"note":
  "hi"}, "properties": "not-an-object"}` used to answer `201` with both fields dropped and nothing said —
  the warnings list reports keys the server does not KNOW, never known keys whose value was wrong. The
  same body on the update door was two refusals. It is refused on both now.

- **A memory update checks that an entity EXISTS, not just that its id is well-formed.** Every other
  memory door resolved the reference; this one tested the shape and stored it. Its sibling's own comment
  is the argument: *"a syntactically perfect id pointing at nothing stores exactly as silently as a name
  did, and the dangling link only shows up later as a traversal that comes back empty."*

- **Changing an edge endpoint's KIND re-resolves that endpoint.** `PATCH {"fromKind": "file"}` on an
  entity-to-entity edge answered `200`, and the edge then claimed its `from` was a file path while holding
  an entity id — **invisible to every graph read**, because name lookup and traversal both search the
  collection the kind names and find nothing there.

- **A batch write stopped dropping four things its own documentation promises.** A recurring event created
  in a batch had no recurrence and no error — the field was never read at all. A caller-supplied id, which
  makes a retried write land on the same record instead of a second one, was read for entities and ignored
  for memories and timeline entries, so a batch resent after a timeout duplicated every one of them. And a
  malformed element inside a list was filtered out silently where the single-record door refuses the list.

  **One table, read by every door.** `brain/write-shape.ts` states what a value must look like, per record
  type, and both doors read it — so the disagreement is now impossible rather than merely fixed. What a
  create and an update may still differ about is whether a field is REQUIRED, which is the only difference
  between them that was ever legitimate.

- **BREAKING: an entity must have a type** (owner's ruling `P-31`). `POST /api/brain/spaces/:spaceId/entities` used to default it
  to the empty string. It now answers `400` without one, and the Create Entity form has a required field.

  **It was the only door that allowed it.** The `upsert_entity` tool, the batch importer and `bulk_write`
  have all demanded a non-empty type for as long as they have existed — so an agent could not make a
  typeless entity and a person using the web UI could. The type is what selects the per-type property
  rules, which means the most-used door was the one producing records none of the space's own rules could
  check.

  **A script that creates entities without a type will start failing**, which is why this is at the top of
  the notes rather than in a list of field changes. In a space that has declared no entity types the form
  field is free text rather than a picker: there is no vocabulary to offer, so you name the kind of thing
  it is.

- **`direction` still narrows stored edges only, and the REASON it gives is now a different one.** Every
  surface said *"a link is an entityIds array, carrying one orientation only"*. That stopped being true the
  moment a link became a record with a `from` and a `to`.

  The rule survives on a better argument: which way a link runs is fixed by the KINDS at its ends, not by
  the data. A memory names entities and an entity names nothing. Honouring `direction` on links would
  therefore empty the DEFAULT traverse — `outbound` from an entity would reach no linked records at all —
  which is a large silent change to the commonest call for a parameter that would still have nothing useful
  to select between.

- **A link has a door of its own, on both surfaces — `POST /api/brain/spaces/:spaceId/links` and
  `upsert_link`, with a delete for each.** `M-2` slice 2a, part two. Slice 2a made every path that
  writes one of the six array fields maintain the link records; this is how you write one directly.

  **The door writes the ARRAY, and that is the design rather than an implementation detail.** A door that
  inserted a link record and stopped would look completely correct — right derived id, replicates, shows up
  in `/query` — and the record would be deleted by the next ordinary edit of whatever it hangs off,
  because the reconcile makes the stored rows equal what the arrays say. An hour later, a `PATCH` of a
  memory's text by somebody who has never heard of the link, and it is gone. No error, no warning, and the
  two callers cannot see each other. So the array is written first and the row is derived from it, by the
  same function the six writers use.

  **Six classes and no seventh** — `memory.entityIds`, `chrono.entityIds`/`memoryIds`,
  `file.entityIds`/`memoryIds`/`chronoIds`. A pair outside them is refused with the list of the ones that
  are allowed. An entity is only ever the TO end: nothing hangs off an entity, which is what an edge is
  for.

  **`POST` answers 200, not 201.** A link's id is derived from the two records and the class, so creating
  one that exists succeeds and changes nothing. 201 would claim a record was created when none was, which
  matters to a client retrying a request whose answer it never saw.

  No `GET`: links are a queryable collection like any other, and a list endpoint here would be a second,
  weaker copy of the filter grammar `/query` already has.

- **A conversion script turns an existing space's arrays into link records — `npm run links:convert`.**
  Run it once after upgrading, or run it five times: a link's id is a UUIDv5 over the two records and the
  class, so a second pass recomputes the same ids, finds them stored, and writes nothing. **An interrupted
  run is fixed by running it again**, which is also why nothing has to record whether it has run — that
  would be a piece of state that can be wrong.

  **It never deletes an array.** These documents replicate by whole-document replace, so an array it
  removed would be restored by any peer on an older build, and a space where the two disagree lets
  whichever reader wins decide what is true. Creating is safe at any time; removing is gated on a version
  floor and is not this script's job.

  A boot migration was the obvious shape and is the wrong one: link records SYNC, so every instance in a
  network would independently decide to create the same records at whatever moment it happened to
  restart. On demand means the operator picks it.

- **`completeLinkage` on a space says its links are all records — a LOCAL setting, never voted.**
  Set by the conversion script when a space finishes with no failures, and withheld when anything did
  fail. It arms nothing yet; the refusal it gates lands with the readers.

  **Where it lives is the behaviour, not a filing decision.** The flag one word away, `strictLinkage`,
  is on the space META because it states what the space MEANS and a network should agree on it — so
  changing it opens a `meta_change` vote and applies on every peer. This one states what has happened on
  ONE disk. Voted, the first instance to run the script would arm it everywhere, and the refusal it will
  gate would then reject array writes on peers holding no link records at all: writes refused, reads
  empty, and a correctly-passed vote in every log. It sits with `dupeRules` and `recordTtlDays` instead.

- **The space update body's "you asked for nothing" guard and the sentence it fails with are one list.**
  They were two hand-written copies of twelve field names, and a field added to the schema but missed in
  either one parses fine and is then refused as empty — with a message naming every field the caller could
  have sent except the one they did.

- **Link records are now WRITTEN — every path that writes one of the six array fields maintains them.**
  `M-2` slice 2a. Slice 1 gave a link record a collection, a content hash, replication and a query door;
  nothing created one. Now writing `memory.entityIds`, `chrono.entityIds`/`memoryIds` or
  `file.entityIds`/`memoryIds`/`chronoIds` also creates, updates and removes the matching link records.

  **NOTHING READS THEM YET, and that is the slice.** Every existing answer is unchanged — the 3.x
  behaviour baseline stays green with no edits, which is the property this slice was scoped around. The
  readers switch in 2b.

  **ONE function does it, called from every writer.** `brain/links.ts` reconciles: it takes the desired
  end state and makes the stored rows equal it. A caller never says what CHANGED — the arrays are
  replaced wholesale on every write — so the end state is the only honest input, and a per-writer copy of
  "work out what moved" is the defect shape this codebase produces most.

  **The id is DERIVED and a removal writes a TOMBSTONE.** Both are load-bearing. The id is a UUIDv5 over
  the two records and the class, so one connection has one id for ever — a re-write is a no-op instead of
  a duplicate, which is what will let a conversion script run twice over a space without recording that
  it has. And a link deleted without a tombstone comes back on the next pull from any peer that still
  holds it: the delete would undo itself within minutes and nothing would report it.

  **Four paths bypass all three writer functions by replacing the whole document, and each is hooked:**

  - a record PUSHED by a peer, and the admin importer — both reach `ingestBrainDoc`, which is the ingest
    router's only write door by design, so one hook covers both.
  - a record PULLED from a peer, which lands in a separate `bulkWrite` in the sync engine. **The copy
    that would have been forgotten**, because push is the direction people picture — and left out, a
    space that only ever pulls would hold arrays with no link records at all.
  - a file RENAME, which deletes and re-inserts under a new `_id`. A file's id is its path, so a rename
    moves the identity every `file.*` link hangs off — and the three arrays ride across by object spread,
    so **their field names never appear in that function**. A sweep for `entityIds` reports it clean in
    both spellings while every link still names a path that no longer exists.

  A new gate holds the coverage, and it matches on the reconcile CALL rather than on the field names for
  exactly that reason.

- **The 3.x link baseline is written down, from a real database, before the migration replaces it.**
  Slice 2 of the link migration switches every adjacency reader from array fields to link records, and
  the moment it does, *"what did 3.x answer?"* is unrecoverable from the code. So it is captured now:
  `the-link-baseline-3x-answered-db.test.js`, one corpus exercising all six link classes, through the
  real queries.

  **It pins two DIFFERENT things, and the distinction is the owner's.** His first instruction was that
  4.0 must not break or be slower than 3.x; his correction an hour later is what shaped the file:
  *"must not be different is not correct — its getting better by design."* A gate asserting "same answer"
  across all six classes would have pinned the poorer behaviour and failed on the improvement. So:

  - **What must not change** — the three classes with a reader today. Exact sets, exact labels, the
    default on/off shape of each toggle, and the fact that a walk does not report the node it started
    from.
  - **What must GET BETTER** — the three classes no walk has ever read. Recorded as a DEFICIT, with each
    assertion saying out loud that slice 2 is expected to invert it. Each asserts both that the data says
    the records are connected AND that the walk cannot see it, so nobody can satisfy it by removing the
    seed.

  **Three things the writing of it found, which is the argument for writing it against a database rather
  than from the signatures:**

  1. **A traverse does not include its own start node.** Assumed otherwise and wrong three assertions in
     a row. Pinned on its own now — a reader that included the origin would make every count in every
     client one larger, silently.
  2. **The backlink assertion was checking a LABEL, not what was found.** Pointing the file half of the
     scan at the memory class survived it: the query read the wrong collection while the surrounding
     block still stamped `type: 'file'` on the result. It asserts identities now.
  3. **The corpus had no CHUNK record, so the file class's chunk-exclusion scope was untested.** That
     scope is what stops a forty-passage document being counted forty times, and a mutation survived
     precisely because there was nothing for it to exclude. A chunk is in the seed now and the mutant
     dies.

- **A link between two records is a record now, in a collection of its own — `M-2`, slice 1.** When a
  memory, a chrono entry or a file names other records, each of those mentions is also stored as a small
  record in a new `links` collection. Six array fields become records: `memory.entityIds`,
  `chrono.entityIds`/`memoryIds` and `file.entityIds`/`memoryIds`/`chronoIds`. The owner's design,
  2026-08-29: *"make all edges on 'index cards' and make everyone look there from now on"* — five different
  parts of the product each followed a different subset of those six fields, and this is the first step
  towards one place to look.

  **This slice is the substrate, and nothing writes a link yet.** The arrays are untouched and still the
  way you write a connection. What lands is everything a record needs before it can exist safely: the
  collection with its indexes, the content hash, replication in both directions, a query door, and the
  rights that already govern that door. New: `links` is accepted by `POST /query` and the `query` MCP
  tool, so you can list and count them.

  **A link is deliberately the smallest record in the product.** Two endpoints, their kinds, and the
  bookkeeping — no label, no type, no weight, no properties, and no embedding. The two kinds already say
  which of the six connections it is, so the label a traverse shows stays derived rather than stored: two
  spellings of one fact is the defect this codebase produces most. And a link never gets a vector index,
  because a record with no content in a meaning-ranked list is a content-free competitor at one row per
  connection.

  **A link is not a knowledge type and not a "record type" either, and the compiler priced both.** Making
  it a fifth `KnowledgeType` would hand it a type schema, a schema tier and a retention tier that cannot
  apply; putting it in `RECORD_TYPES` would hand it an embed-text builder, a lexical field and a recall
  projection. It is a collection, and only that.

- **Four more copies of one collection map, and two of them were silently broken.** `A-10` removed five
  copies of the record-kind-to-collection mapping last week. Four more turned up on the paths this change
  touches, and they are the ones that matter:

  - **A tombstone found its collection through a `Record<string, string>`** — a map with no keys. A record
    kind absent from it read as `undefined`, and the delete then stored the tombstone and removed nothing:
    a 200 to the peer that asked, the record still there, and every later cycle agreeing there is nothing
    to do. Live for links the moment one could be deleted.
  - **`GET /api/sync/tombstones` served four hand-listed kinds.** A kind not listed is never offered to a
    peer, so the deleting instance holds a tombstone nobody else ever sees.
  - **A space wipe carried two more copies in one function** — one for the tombstones and one for the
    review findings. Both derive now.

  All four are derived from one keyed vocabulary, so a new record kind is a compiler error rather than a
  quiet omission.

- **An edge label can say which entity types it may connect, and how many, from the Schema tab.** Both rules
  have been accepted by the API since 3.7 and reported by the space validator, and there was no way to set
  either one without writing the request by hand.

  Selecting an edge type now shows **Permitted ends**: the types allowed at the **From** end, the types
  allowed at the **To** end, and **At most one edge with this label per source entity**. A list you leave
  untouched means *any entity type*, and unticking the last box returns that end to *any* rather than
  forbidding every link of the label — the two are different rules and the tab keeps them apart.

  **The two lists are not paired, and the tab says so in as many words.** Every From type combines with every
  To type, so two on the left and three on the right permits six kinds of link, not two. The number is stated
  and the combinations are listed underneath, because a pair of lists side by side reads like pairing to
  almost everybody.

  **"no type at all" is a choice in both lists**, for entities that genuinely carry no type — the absence of a
  tick means "any type", so that had to be a row rather than a gap.

- **`/query` answers within a size budget, like every other read path.** It had `limit` (max 100 rows) and
  `projection` and nothing else — and `limit` caps ROWS while saying nothing about how big one is, so a page of
  file records or of long-described entities had no ceiling at all, on the read route a fleet is most likely to
  page through.

  It takes `maxChars`, `maxBytes`, `maxTokens` and `charsPerToken` on both doors, and reports `budgetChars`,
  `budgetBytes`, `charsReturned`, `bytesReturned`, `truncated` and — when the budget bit — `nextSkip`.

  **`count` becomes the number actually returned**, so it still matches `results.length` when a page was cut. A
  caller reading either one is right; one who read `count` and then iterated `results` would otherwise have been
  told a number that did not match what they were holding. `total` is unchanged and still the whole match, so
  anything that sized a sweep from it is unaffected.

  **`nextSkip` is absolute.** `/query` already has a real `skip`, so a continuation computed from the page alone
  would send a caller back to the start of page two for ever — a paging loop that never advances, which is the
  exact defect this route was reported for in the first place.

  **No `remainderDump`, deliberately.** On `recall` that flag writes the tail to a file because a ranked answer
  has no other continuation; `/query` pages for real, so `nextSkip` is the whole answer and the file would be a
  write on a read path nobody needs. It is REFUSED rather than accepted-and-ignored, which the strict body makes
  automatic.

- **A write that breaks an edge label's endpoint or cardinality rule is now refused, not merely reported later.**
  Both edge writers enforce it, so all three doors do: the two REST routes, `upsert_edge`, `update_edge`, and per
  item through `/bulk`. The violation names `fromType`, `toType` or `functional`, and the reason says which types
  the label admits — a refusal that only named the field would tell a caller their write was wrong without
  telling them what right looks like.

  Reporting alone was an audit an operator had to go and ask for. Between two asks, nothing stopped the next
  write creating exactly the violation the audit would find, which is a schema that describes the data rather
  than governing it.

  **The rules need facts that are not in the payload** — the entity type at each end, and how many other edges
  carry the label from the same subject — so the writer looks them up and hands over what it FOUND. The validator
  stays pure and synchronous, which is what lets two source gates call it with plain objects. An absent fact is
  never a violation, deliberately: an endpoint that resolves to nothing is a dangling reference, which
  `strictLinkage: false` makes a documented state with its own report, and reporting it here would let one
  setting's escape hatch read as another setting's breach.

  **A rule declared later does not freeze the edges it describes.** The refusal is on what a write INTRODUCES, so
  an edit that leaves the ends alone still goes through — the same `preExisting`/`introduced` split that already
  keeps a tightened property schema from making its own records unmaintainable. Re-writing the same
  `(from, to, label)` is likewise not a cardinality breach: the count excludes the edge being written, without
  which a `functional` label could be written once and never touched again.

  **The bulk importer's own per-item check is fed the same facts.** It keeps its copy because its contract is to
  name the index that failed and carry on rather than let a throw end the batch — but fed nothing it would have
  reported the property violations, stayed silent on the endpoint ones, and let the write underneath throw a
  summary that the catch flattens. The caller would have learnt which field was wrong and not what was allowed.

  Two gates hold it. A database suite proves the write path actually looks — a source read cannot tell a
  resolution that happens from one that is written and never reached — and the writer sweep now asserts each edge
  writer resolves BEFORE it classifies and passes what it resolved. Without the second, a writer that validates,
  branches correctly and never resolves satisfies every other case while every endpoint rule in every space
  silently passes.

- **An edge label can declare what kind of entity sits at each end, and whether a subject may have more than
  one.** `endpoints` and `functional` on an edge type schema, on both API doors and on a schema-library entry,
  refused on the other three collections rather than silently ignored.

  The gap was measurable: `benchmarks/INGESTION.md` declares `"from"` and `"to"` for all fourteen of its labels
  — twenty-eight endpoint declarations with nowhere to put them — and nothing could express that `reports_to`
  goes person to person, so a `reports_to` from a document to a deadline stored silently. `functional` is the
  same gap for cardinality: one manager versus many colleagues, with no way to say which.

  **Two arrays mean the CROSS PRODUCT** (owner ruling, 2026-08-31), and a test asserts it is ALLOWED rather than
  leaving the shape to imply pairing. A caller who needs exactly one pair declares a label per pair.

  **`UNTYPED` is a member of the vocabulary**, because an entity with no type is ordinary and refusing it by
  silence would make the feature unusable in the spaces least finished with their typing. An untyped entity at an
  end that names a type IS a violation, which needed `null` and `undefined` to mean different things: resolved
  and untyped, versus the caller did not look. The first draft collapsed them and every untyped entity slipped
  past every rule.

  **Shipped with a consumer.** `POST /validate-schema` reports each stored edge that breaks either rule, with
  `fromType`, `toType` or `functional` as the field. A declaration nothing reads is the inert-feature failure, so
  the field was deliberately held back from an earlier commit until it had one. Write-time refusal followed in
  the same release, below. A dangling endpoint is NOT reported as a type violation — `strictLinkage: false` makes that a
  deliberate state with its own row, and folding it in would make one setting's escape hatch look like another
  setting's breach.

  **The editor carries both through a save even though it cannot set them.** It rebuilds a type object from
  state, so a field the state does not hold is deleted — an operator who declared endpoint types through the API
  and later renamed a property in the UI would have lost the declaration with no message. The two are declared in
  the editor gate's `NO_CONTROL` with reasons, and the control is filed as `G-12`: two lists side by side imply
  pairing to most people, so that UI has to say what it does.

- **Five surfaces told a caller a bulk payload could reference a record the same payload creates. It could
  not, and had not been able to for three weeks.** The claim was on the integrator's reference, the REST
  route's docblock, the writer's own docblock, the `bulk_write` tool description, and — separately — the
  per-field description on `memories.entityIds`. All five hung it on the processing order, memories → entities
  → edges → chrono, as the reason it worked.

  The **ID-IS-ID** ruling of 2026-08-12 made it false: the identity is minted on insert, always, because a
  supplied id would make the caller a co-author of the primary key and let two instances deriving ids from one
  key collide across a sync. A supplied id ADDRESSES an existing record; it never becomes a new one's. So an
  entity inserted by a batch is stored under a fresh UUID and an edge in the same payload naming the id the
  caller chose points at nothing.

  **And nothing objected.** References on this door are checked for shape and never for existence — correct
  behaviour, and a space may permit dangling references — so the edge was accepted, counted in `inserted`, and
  reported with an empty `errors`. An agent that followed the sentence built a broken graph and was told the
  import succeeded.

  The sentences moved, not the behaviour: ID-IS-ID is an explicit ruling with a stated reason. All five now say
  a graph takes two calls, with the ids coming from the first one's response, and keep the processing order for
  what it is still good for — a record the batch UPDATES is written before an edge below reads it. The
  `memories.entityIds` copy was never even order-plausible, because memories are written first of all.

  **A gate, in two directions, because one alone goes vacuous.** From the database, that a supplied id is not
  adopted; from the source, that no surface offers the forward reference and each still says where a new
  record's id comes from. A coverage check could not have caught this — every surface MENTIONED forward
  references and they all agreed with each other. The fifth copy was found only because a tracker's verify line
  counted the phrase and got two where the row said one.

  The gate reads each file as one flattened line, which the first draft did not: a docblock wraps a sentence
  across ` * ` leaders and a tool description is a chain of concatenated literals, so *"reference records
  created earlier"* and *"in the same batch"* sat on different lines and one of the five copies was missed.

- **The refusal that blocks an entity delete named a direction it never checked, and each door worded it
  differently.** `DELETE /entities/:id` answered *"Cannot delete: entity has inbound references"* while the
  check has always matched both ends of every edge. The fleet integrator's queue rows carried only OUTBOUND
  edges, were refused, and could not be cleared: they filtered on `to`, found nothing, and kept 409ing.

  **The guard is right and has not changed.** An edge left pointing FROM a deleted entity dangles exactly as
  much as one pointing at it. What was wrong was every sentence describing it — the message, the function's
  name (`findEntityBacklinks`), its docblock, and the integration guide, all saying inbound. A reader who
  checked our source to resolve the message's ambiguity was told the same wrong thing a second time.

  So the message states no direction, and **each row carries the end that matched** — `from`, `to`, or `both`
  for a self-loop. That is the field the reporter actually needed, because it names the query that clears the
  block. Only an edge has ends: a memory, chrono entry or file HOLDS a reference in a list, so `end` is absent
  there rather than guessed at. The function is `findEntityReferences`; the response field stays `backlinks`,
  which is a published contract.

  **And the two doors no longer word one rule twice.** REST returned structured rows; the MCP tool threw
  different prose with no rows in it at all, so an agent could not see what to clear and which client you
  picked decided what you were told. Both now call `entityDeleteBlockers`, which owns the whole decision: the
  `strictLinkage` check, the blocking set, the face exemption and the sentence. Each door had its own copy of
  all four.

  A `409` also gains `references` alongside `backlinks` — everything found, face rows included — so a UI can
  warn *"this will unlabel N faces"* while showing why the delete was refused. And the refusal now says a
  cascade is not available: `?cascade`, `?force`, `?deleteEdges` and `?withEdges` were all silently ignored, so
  four probes were spent discovering an absence. Whether entities should gain a cascade is a separate question
  and is not being answered here.

  **One test had been asserting the wrong message and could not have failed.** `strict-link-enforcement.test.js`
  built the 409 body itself, including the sentence, and then asserted on its own literal — the *"a mock that
  would pass even if the real code is broken"* shape. It was green for the whole time the message was wrong. The
  real body is now asserted against a real database, and the parity gate asserts one shared guard rather than
  two doors making identical calls, which is what it checked before and is satisfiable by two copies.

- **A working `ttlDays` was measured as broken, because the field to read back is not the one it looks like.**
  A record's expiry surfaces as `_expireAt`; `expiresAt` is a different field on a token, on a recall graph
  download, and on file meta, and is never present on a brain record. Reading the wrong one returns nothing
  whether the expiry was set or not — so 120 records with a one-day window were reported as never expiring.
  The write-semantics page now says which name and why the neighbour is not it.

- **A chrono-only retention setting was accepted on every other collection and silently ignored.** Three places
  said it was rejected — `TypeSchema.retention`'s docblock, `chrono-retention.ts`, and
  `docs/integration-guide/04f-write-semantics.md`, which is an integrator's reference — and one more assumed it:
  the client sends `contentDays` only for chrono *"because the API refuses it elsewhere and a control that cannot
  work is worse than none"*.

  Nothing refused anything. `CONTENT_TIER_COLLECTIONS` was read in exactly one place — the resolver, which
  returns `undefined` for a non-chrono collection long after the write was accepted. So an operator could set a
  content window on an entity type, get a `200`, see it in their own config, and watch it do nothing for ever.

  The code moved rather than the sentence: a behaviour the product already promises to a user is not a decision
  to re-open. Four claims became true and none needed editing.

  It is refused at `TypeSchemasZ`, the only layer that sees BOTH the field and the collection it was filed under
  — a type object cannot know whether it arrived under `entity` or `edge`, and the resolver knows the collection
  but runs after the write is accepted. The refusal names the field, the collection it belongs to, why, and
  `retention.days` as the setting that works everywhere; it reports at the path the operator wrote, so an editor
  can show it beside the field rather than at the top of the object.

  Written as a LIST with one row, because the next collection-scoped fields are already specified (`S-1`'s
  edge-only `endpoints` and `functional`) and an inline `if` is how the second one gets forgotten — which is
  exactly how the first came to be documented and absent.

- **The collections were enumerated twenty times under nine names, and they are THREE different sets —
  `A-10`.** A space's documents live in collections, and that list had copies in the TTL sweep, the admin
  importer, `/query`'s allowlist, the search route, two MCP tool schemas, a space wipe, the sync counters,
  the vector-index builder, the Brain's tabs and three inline unions. The record-to-collection MAP had five
  more copies beside the shared one — in `dupe-scanner`, `contradiction-scanner`, `lexical-search`,
  `candidate-prune` and `structured-claims`, all byte-identical.

  **The finding is that they are not one set, and a gate saying they were got deleted the same hour.** Eight
  of the nine names looked like one list only because it has had four members:

  - **every collection a space OWNS** — `SPACE_COLLECTIONS`, machinery included. It is what creates them.
  - **the knowledge-bearing ones** — now `BRAIN_COLLECTIONS`, derived from the record-to-collection map.
  - **the ones with a VECTOR INDEX** — the knowledge-bearing set minus anything never embedded.

  The third is why the first version of the check was wrong: it required all twenty sites to read one tuple,
  which would have given a vector index to a collection that must never have one. That is a defect
  introduced by a test, and the same mistake one level up as a check that could not tell `RefKind` from the
  knowledge types. The rule shipped instead is **derive, or declare** — a site may write the names out if it
  says in its own comment that it is a deliberate subset and why, and the two that are say so.

  **Two of the five duplicated maps had lost their key check**, typed `Record<string, string>`: a map with no
  keys, where a typo for a record kind reads as `undefined` and builds a collection name ending in
  "undefined". Replacing them with the shared map surfaced one caller that genuinely takes an unvalidated
  type, and its widening is now one visible line rather than a keyless declaration.

  Groundwork for `M-2`: a link record is stored in a collection of its own, so it joins the first two sets
  and must stay out of the third.

- **The RECORD types are one tuple too, where they were sixteen copies under five names — `A-9`.** The four
  knowledge kinds plus `file`: every record type that can be embedded, recalled or retained. It had five
  aliases for one set — `RecallKnowledgeType`, `BrainEmbedRecordType`, `DupeScanType`, `TtlBucket` and
  `EMBED_RECORD_TYPES` — and only the last was already derived. All five now resolve to `RECORD_TYPES`,
  which is itself `[...KNOWLEDGE_TYPES, 'file']`, so a fifth knowledge kind reaches both lists at once.

  **The order changed, and each surface it touches was CHECKED rather than argued.** Most sites wrote
  `memory` first; the retention buckets wrote `entity` first and said their order was the one the UI shows.
  Deriving makes every site entity-first:

  - **recall's default type list does not affect its results.** The fan-out maps over the types and flattens,
    every consumer then sorts by score with a deterministic id tiebreak, and the lexical introduction caps
    PER TYPE against a pool a record can only belong to one type of. Established by reading the fan-out, the
    sorts and the cap.
  - **an MCP tool schema's `enum` is a set.** The published text changes; nothing a caller does with it can.
  - **the Brain query tab's type chips are genuinely visible, and they now read
    `entity memory edge chrono file`** — the order every other list in the product already used. Read on a
    screenshot, not inferred: the chips still render as chips, still all start unticked, and `file` still
    wraps to the second line.

  One of the three turned out not to be a surface at all. `recallKnowledgeTypes` in the query tab was
  declared, never read, and absent from the template — deleted rather than converted, because a copy of an
  enumeration that nothing reads is the cheapest kind to keep and the easiest to start believing in.

- **The four knowledge types are enumerated ONCE per side of the wire, where they were written out 27
  times.** A space holds four kinds of record — entity, memory, edge, chrono — and that list decides more
  than a type union: which kinds a space can hold a type schema for, which the schema library accepts, which
  appear in an audit summary, which have a retention bucket, and which collections a redaction sweep walks.

  `KNOWLEDGE_TYPES` is now a tuple in `config/types-knowledge.ts` with the union derived from it, mirrored
  once in the client's `api.types.ts`. A tuple rather than a union because a union cannot be iterated —
  `z.enum`, a `Set`, a `for` loop and a JSON-schema `enum` all need the values, and that is exactly why
  every one of those sites had its own copy.

  **This is groundwork for `M-2`, which adds a fifth kind.** With the list written out per site, adding one
  means finding them all, and each one missed fails differently and silently: a schema library that refuses
  the new kind, an audit summary with a kind absent, a retention bucket that never expires anything because
  nothing maps the kind to a collection. `one-definition-of-the-knowledge-types.test.js` refuses the next
  copy.

  **One existing gate got stronger rather than being re-anchored.** `retention-reaches-every-collection`
  asserted that the retention sweep's collection list reads `['entity', 'memory', 'edge', 'chrono']` — which
  could only check the list somebody had already typed, so a fifth kind would have left it green while that
  kind's records were never stamped. It now asserts the sweep list IS the knowledge types, which cannot be
  four-of-five by construction.

  Two frozen files gained one line each and both raises are recorded: in both cases a local copy of the
  vocabulary became a reference to it, which is the opposite of the growth that list exists to catch.

- **BREAKING — `maxBytes` on `recall` and `find_similar` now means bytes.** It bounded characters before, while
  its name and every surface describing it said bytes. A caller who set it asked for a byte ceiling and now
  gets one: up to ~35% tighter on emoji-heavy content and ~26% on German or Polish, and unchanged for ASCII.
  **To keep the old behaviour exactly, send the same number as `maxChars`.**

  The REST character default also drops from 100 000 to 50 000 (owner, 2026-08-30). MCP's 25 000 is unchanged.

- **`resolveEdgeEntityNames` is `resolveEdgeEndpointNames`, and lives in `brain/edge-endpoint-names.ts`.** The
  old name described the first kind of endpoint rather than the job, which is how four call sites each came to
  resolve both ends in the entities collection. `bulkDeleteEdges` moved to `brain/edge-bulk-delete.ts` in the
  same pass, because `edges.ts` is frozen for size and new behaviour goes beside it rather than inside it.

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

- **The Search panel shows the request it would send, live, with a Copy button.** The last of the owner's
  `U-1` instruction: *"basically should be like the full json request visible on the side — so it can be
  copied and sent directly to the recall mcp endpoint."* It updates as you type, and pasting it into a
  `recall` call over MCP or REST gives the same answer.

  **It does not describe the request — it IS the request.** The panel and the preview call the same builder,
  so there is no second reader of the same rules to drift from the first. That mattered enough to shape the
  change: a preview assembled separately would be BELIEVED, and the failure would be silent in the worst
  way — somebody pastes the JSON, gets a different answer from the one on screen, and nothing anywhere is
  wrong. A test asserts the two are the same object rather than trusting the convention.

  When one of the two JSON boxes is not a valid object it says so and shows nothing, rather than leaving the
  last good request on screen — and a blank question reads as "type a question" rather than as an error,
  because those are different situations.

- **The Search panel can now do everything a `recall` call can.** Owner-directed: *"one input field for EACH
  AND EVERY available option a recall has. I want to be able to do everything there that a mcp call can do.
  FULL CAPABILITIES."* Eleven parameters were reachable only by writing the request by hand; all eleven have
  a control, and the gate that measures this is now EMPTY apart from one permanent row.

  **The traversal is six controls, not one.** It was a single depth number, which is why five of these were
  unreachable however the rest of the request was written: **Follow edges** (outward, inward, both), **Only
  these edge labels**, and three checkboxes for returning the chrono entries, memories and files a walk
  reached. Direction is not a detail — outward from a person reaches what they own, inward reaches who named
  them, and a walk that ignores the difference answers another question and looks identical.

  **The size ceiling is one number in four currencies, and all four are on the form.** Bytes, characters,
  tokens, and characters-per-token for converting the last one. This page used to say there was deliberately
  ONE control, because two overlapping numbers would leave an operator working out which won — the server
  applies whichever is smallest, so the honest answer was to say that once rather than to hide three
  quarters of the parameter. Characters and bytes are also not the same thing outside plain English, which
  was a real bug earlier in this release.

  **Also new:** **Fields returned** (a projection, refused with a form error rather than a 400 when it is not
  a JSON object), **Skip results** for continuing a shortened answer, and **Save what did not fit** — the one
  control on the form that WRITES, which says so on its face rather than in a tooltip.

  Two groups reveal their own detail: the five traversal qualifiers appear once the hops are above 0, and
  characters-per-token once there is a token ceiling. That is not a disclosure — the operator opened it by
  asking for hops or a budget, and a control that cannot affect the request yet does not exist yet.

- **The semantic-search form shows every control it has, laid out across the width.** Six of its parameters
  were behind a **Show advanced** button, which is the wrong arrangement for the same reason a hidden setting
  always is: a control an operator cannot see is a capability they do not know they have.

  The disclosure is gone and the fields are grouped by what they DO — **the question**, **ranking**, **the
  graph**, **the answer** — three of those side by side, each field filling its column so they line up
  instead of each sizing to its own placeholder. The whole form is visible at once, and it reflows by
  available width rather than at a fixed breakpoint, because the panel is sometimes beside a detail pane.

  **And the time limit had a raw identifier for a label**: the field read `maxTimeMS` while every other label
  on the page is prose. It says **Time limit (ms)** now.

  Nothing about what a search DOES changed — the request is built exactly as before, and the 19 cases that
  pin it were not touched. This is the room the remaining recall parameters will go into.

- **The Query panel's recall request is pinned by tests before U-1 rebuilds the panel around it.** Eighteen
  rules live in one method and none of them had an assertion: three flags are sent only when ON, one only
  when OFF, three numbers treat zero as "say nothing" for three different reasons, and the type dropdown
  merges into a hand-written filter while overriding one key of it.

  **A rebuild that carried seventeen of them across would look finished.** The one it dropped would send a
  plausible request and get a plausible answer — a cap of zero returns nothing, and an inverted content flag
  stops passages — so the failure would arrive as a support question rather than as an error.

  Nothing an operator can see changes. Nineteen cases, and eighteen mutants killed by exit code, including
  the one that only shows while a search is in flight: the "answer was shortened" banner has to go on the
  CLICK, or it sits over results nobody has received yet.

- **A gate now holds the Query panel to what a `recall` call can actually do.** The panel binds a subset of the
  parameters the API accepts, which means an operator cannot do from the screen what an agent can do through
  MCP — and the size of that gap was measured by hand. A hand count is the wrong instrument: three traversal
  flags shipped inside the `traverse` object and nothing noticed, because the existing check compares top-level
  request keys only.

  The parameter list is read out of `recall`'s own schema now, nested options included, and the check fails while
  the panel has no way to send one. Each one still missing is listed with the reason, so what is left to build
  is written where a machine reads it rather than in a tracker.

  **Nothing an operator can see changes yet.** The controls come next, with the layout that makes room for
  them. What changes today is that the gap can no longer widen quietly — and the hand count turned out to
  name four parameters `recall` does not even have.

- **The text-embedding API key no longer stays in `config.json`, and it was the fifth provider nobody
  checked.** `secrets.json` is `0o600`; `config.json` is not, and it is the file operators copy between
  machines, paste into issues, and mount as a ConfigMap. Since 3.0 the vision, speech-to-text, NLI and
  reranker keys have been lifted out of it at boot and their config read-path deleted — because a fallback
  keeps a credential working from a world-readable file, so nobody ever notices it is there.

  `embedding` was not one of those four names. Its key lives at the TOP level of both files rather than under
  `mediaEmbedding`, so the migration walked past it and `getEmbeddingConfig` kept resolving
  `env > secrets.json > config.json`. A modern save writes the new key to `secrets.json` and never deleted
  the inline one, and the secrets value wins — so a stale copy could sit in `config.json` indefinitely,
  doing nothing, visible to anyone who read the file and to nobody who ran the product. Two comments three
  lines apart said otherwise; one of them contradicted itself in a single sentence.

  It is lifted now, with the same rule as the other four (an existing secret wins, the config copy goes
  either way), and the config read-path is deleted. **Deleting it is safe for a reason worth stating,
  because the same release ruled four other config migrations PERMANENT:** those are only load-bearing when
  the disk write FAILS, whereas this migration puts the key into the in-memory secrets object and runs
  before any resolver is called — so the value is already where the resolver looks, whether or not either
  file was written.

  The gate that asserted "no provider resolves its key from the stored config" checked four names. It
  derives the rule from the SHAPE now — any `apiKey` resolved with a `?? base…` or `?? cfg…` arm — because a
  name list is what let the fifth provider through, and would not see a sixth.

- **A completeness check can no longer be told to point at a collection with no screen.** The
  "go and fix these" button on the Overview and Review tabs takes a Brain TAB, and the field feeding it was
  typed as a collection. The two were the same five values until this release; the type now excludes the
  one that has no tab, on both sides of the API, so a check that tried it is a compiler error where it is
  written rather than a button that opens nothing.

- **The README said 31 MCP tools. There are 44 — and it did not mention nine capabilities the product has.**
  A count written once and never checked drifts in one direction only: downward, as the product grows. It is
  DERIVED from `ALL_TOOLS` now, by a gate, in both directions — over-claiming is the worse failure and it is
  the same check.

  Every addition was verified in the source before it was written: the **four lookup primitives** and the
  blind-spots section each read tool carries; **recall's tuning surface** (a filter that runs inside the
  vector index, per-type quotas, a time budget that degrades instead of hanging, `includeFreshWrites`,
  recursive projection, and the lexical/fused/rerank scores on request); **contradiction review** — flagged
  rather than silently resolved, with the deterministic `structured-field` kind kept apart from an `nli`
  model opinion and its confidence; **duplicate review** including the per-space rules that act at insert
  time; **referential integrity** (a `409` that names the blockers and which END matched); **schema
  validation's** introduced-versus-pre-existing distinction, so tightening a schema does not make every
  later edit to an old record impossible; **per-type retention windows**; **`er_model`**, which reports the
  shape a space has actually taken rather than the schema it declares; and that a refused write comes back
  as `structuredContent` rather than prose.

  **Two claims were NARROWED rather than added, which is the half worth saying.** A first draft said a build
  fails if one door accepts a parameter the other does not; it does not — the parity gate covers the
  capability half, and parameters are checked per change by hand. And "no telemetry, no call home" went in
  only once a gate could assert it, as the absence of any Ythril-owned host in the shipped source.

  The new gate pairs every evaluative claim with the mechanism it rests on, in both directions: the phrase
  without the mechanism is a lie, and the mechanism without the phrase is the undersell this started from. It
  also asserts the README does NOT claim reasoning machinery Ythril has no part of — forward chaining, Rete,
  Datalog, SPARQL, PROV-O — because overselling was the other failure available.

- **The detail pane is its own component, and `file-manager.component.ts` is no longer a god file — `G-3`
  is CLOSED.** 1 618 → 591 code lines over thirteen cuts, and the file has come off the frozen list in
  `no-new-god-files.test.js` rather than being kept there at a low number.

  `file-detail-pane.component.ts` takes the header and its tab strip, the preview body with its
  full-screen toggle, the description block, and the three faces — preview, the Extract view and the
  file-meta editor.

  **It READS three stores, and every other child on this page takes inputs.** That is a deliberate
  exception: rendering from three stores at once as a dumb component means about fifteen inputs, and
  `file-preview.component.ts` argues against exactly that shape in its own docblock — *"eight inputs on a
  presentational component is a class definition wearing a template's clothes."* Fifteen bindings is also
  fifteen places one can be silently dropped. The stores are `providers` on the page, so the child gets the
  same instances; nothing is shared more widely and nothing is duplicated.

  **What it does not do is decide.** Every gesture is an output, because what a click MEANS belongs to the
  page: switching to Meta re-seeds the edit model, switching to Extract fetches on the FIRST open and not on
  every switch back, closing releases a blob URL and unhooks a key listener, and saving reloads a listing
  that belongs to a fourth store.

  `.preview-body` is DUPLICATED rather than moved, for the reason `.rename-form` already carries: two
  elements wear the class, and the full-screen overlay's body is still on the page. Moving it to one of them
  leaves the other an unstyled block — no error, just a preview that no longer scrolls.

  **What the last four cuts actually say.** Chasing "how many API calls does this page still make" moved 65
  lines. A THIRD of the file was its inline template and stylesheet, which no store extraction could reach,
  and taking those out as two components is what ended it.

- **The upload queue is its own store — `G-3.1`.** `file-upload.store.ts` owns the rows, the ordering, the
  one-at-a-time rule, the subscriptions and the page's LAST `filesApi` request: 1 004 → 939 code lines, and
  the file manager shell now makes no HTTP request of its own at all.

  **A store rather than a component, and that is not a style choice.** An upload in flight owns a
  subscription, so a component owning it would abort on destroy — navigating away from the tab, or any
  structural change that remounted the panel, would silently cancel a running upload. Provided by the page,
  it survives every remount inside the page and still cannot outlive the page itself.

  **Two things stayed, and the store publishes what each follows from.** Asking about an overwrite is the
  page's twice over: the set of existing names is the LISTING store's data, and the wording is a translation,
  which this file holds none of. And a finished upload has to refresh the listing (another store's) and emit
  `filesChanged` so the host's record counts move (an `@Output`) — so the store says only that one landed.

- **The file-metadata group is its own store — `G-3`'s tenth cut, and the last of its four.** Nothing
  user-visible changes. The record, the edit model and all three requests moved to `file-meta.store.ts`:
  1 036 → 1 004 code lines, with the frozen ceiling lowered to match.

  **The edit model stays a PLAIN OBJECT beside the signals**, which is the one piece of state on that page a
  signal-based rewrite would silently change the semantics of — it is re-seeded wholesale on open, on cancel
  and after a save, and the form binds into its fields. A characterization case has stood over it since the
  fifth cut for exactly that reason.

  **Three things deliberately stayed on the page**, and the store publishes what each of them follows from:
  priming the picker's chip labels reads a `ViewChild`, so a store reaching for one would couple it to the
  template; the toast wording is the page's, because this file holds no translations; and the directory
  reload belongs to a different store, since tags and embedding status are shown on the list ROW.

  One thing was tightened rather than moved: a failed SAVE no longer toasts. Its reason is already shown
  inside the edit form, which is where the reader is looking, and a toast as well said the same thing twice.
  A failed re-queue still toasts, because it has no form to show it in.

- **Saving file metadata had no test at all, and now has four.** Nothing user-visible changes; this is the
  last `filesApi` group in `G-3` being pinned before it moves. The rules: `entityIds` splits back out of the
  comma-joined string with blanks dropped (a trailing comma would otherwise post an empty id), the
  description is trimmed, a successful save re-seeds from the RESPONSE rather than from what was typed, it
  leaves the edit face and reloads the DIRECTORY — tags and embedding status are shown on the list row, so a
  save that skipped the reload would leave the row disagreeing with the pane — and a refused save keeps you
  on the edit face with your text.

  Re-seeding from the response is the one that would have gone unnoticed: the server normalises, so a version
  that re-seeded from the model it had just sent shows what the user asked for instead of what exists, and
  the difference only surfaces on a later reload.

  Five mutants, and the fourth is worth recording: deleting the directory reload outright SURVIVED the first
  version of that case, because the page lists the directory while it is constructing and the assertion
  counted from zero rather than from a baseline. A count without a baseline cannot tell "it happened" from
  "something else happened".

- **The Extract face is its own store — `G-3`'s ninth cut.** Nothing user-visible changes. The three signals,
  the one request and the two paging rules moved to `file-extract.store.ts`; the page kept the two methods the
  template calls, because they are what resolve the space and the path, and threading those into the store
  would give it two things to be wrong about instead of none.

  The lazy-open rule stayed on the page as well: deciding to fetch on the first open and not on every switch
  back is a judgement about a gesture, and the gesture belongs to whoever owns the detail pane. What moved is
  the state that judgement reads — `hasNothing()` — so the page no longer has to know that "nothing to show"
  means two signals rather than one. Reading `!extract()` alone would re-fetch while a request was in flight,
  which is one of the four rules pinned in the change before this.

  1 046 code lines, and the frozen ceiling comes down with it (1 050 → 1 036) so the list cannot drift upward.
  Every one of the 108 cases in that folder passed with subjects re-pointed and no assertion edited.

- **The directory listing is its own store, which is the eighth cut off the largest file in the repo.**
  Internal only: no screen changes, no route changes, no parameter changes. It is here because the file it
  came out of is the one every file-browser change lands in, and because two conditions inside it turned out
  to be unable to decide anything.

  What moved: the listing's five state signals, its five requests (list, new folder, rename, delete,
  download URL), and the rule that decides whether a fetch is a fresh LOAD or a background REFRESH — one
  function with six callers, kept as one function because asking each caller to classify itself is how five
  get it right and one does not.

  **The reload after a write moved with it.** It was the same statement written at three call sites, and a
  fourth copy is how one of them ends up missing. What a write means BEYOND that reload — refresh the
  sidebar's root, tell the host the file set changed — stays with the page, which is the only thing that
  knows those exist.

  **Two conditions retired, both found by mutating them and watching nothing fail.** The load-versus-refresh
  test asked whether the last attempt had failed; that mattered while a failed listing kept its rows on
  screen, and stopped mattering the moment those rows started being cleared, earlier in this same release.
  A second one, in the same function, had never been able to matter. Neither was deleted quietly: the
  comment in their place says what they guarded and what removed the need.

  **And 105 characterization cases held it, with four ADDED rather than edited.** A refused new folder keeps
  the name you typed and a refused rename leaves the row in edit mode — both were true before this change,
  neither had an assertion, and the first version of this cut broke both of them silently.

- **The file tree's state and requests moved into a store** — G-3's seventh cut and the first store rather than
  a component, taking the largest file in the repo from 1 118 to 1 070 code lines.

  A store because a component cannot hold them: the sidebar renders inside an `@if (sidebarOpen())`, so the tree
  component is destroyed every time the sidebar closes, and a component owning `listFiles` would cancel it on
  destroy and lose the loaded tree. A store the page provides has the page's lifetime. Provided per page rather
  than application-wide, so leaving the page forgets a space's directories instead of carrying them into the
  next.

  Navigation stayed on the page deliberately. `onTreeClick` calls `navigate(path)` and then `toggle(node)` — one
  gesture with two effects, both of them the behaviour — and the two calls sitting side by side are what keep
  G-10's duplicate directory listing findable rather than buried inside a store method.

  `joinPath` moved to `file-format.ts` at the same time: the tree and the breadcrumb are the only two things that
  build a path in that page, and a second copy is how they start to disagree. A characterization case asserts a
  node's path equals what that function returns, rather than a literal, for exactly that reason.

  91 tests in that folder pass with their SUBJECTS re-pointed and not one assertion edited, which is the claim
  this change is making. They failed loudly first — `c.treeRoot is not a function` — which is what a subject
  re-point is supposed to look like.

- **The file manager's directory tree is its own component.** Sixth cut of G-3: `file-tree.component.ts` takes
  the recursive template, six CSS rules and the `TreeNode` interface, and the largest file in the repo goes
  1 176 → 1 118 code lines. The frozen size came down with it — a ceiling far above the real size is headroom
  the file can regrow into without the gate saying a word.

  The tree's STATE and its two requests stayed on the page deliberately. The sidebar sits inside an
  `@if (sidebarOpen())`, so a component owning the directory listing would cancel it on destroy and lose the
  loaded tree, and reopening would re-fetch — which one of the characterization cases pins that it does not.
  What remains on the shell is a store, not another component.

  Nothing in the product changed, and the ten characterization cases from the previous change are how that is
  known: 91 tests in that folder pass with not one assertion edited. One of them earned its keep on the first
  run — the extracted component rendered NOTHING, because a standalone component that does not import
  `NgTemplateOutlet` treats `*ngTemplateOutlet` as an unknown attribute and raises no error at all.

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

- **The preview had no test for what it DECIDES — fourteen cases, and four of them found defects.** The block that was
  already there covers the object URL, which is the one resource on that page that must be released. None of
  it touches the three things below, and each was measured to have no assertion anywhere in the folder.

  **Which kind a file is** — a lookup across five extension tables with `unknown` as the fallback. Lost, a
  `.zip` would show a spinner that never stops, which reads as a hung request rather than a file type with
  no preview. Case-folding is in there too, and so is the rule that a leading dot is not an extension.

  **The failure path, which is written out THREE TIMES**, once per fetch branch. That is the shape this
  codebase produces most — one rule, several implementations, the weakest winning silently — and nothing
  asserted any of the three, so unifying them could have dropped one and stayed green. Also pinned: the
  spinner clears, because a blank pane cannot be told apart from an empty file.

  **What the renderer is told.** `previewModel`'s own docstring says the states are mutually exclusive and
  that saying so in one place is what stops the child re-deriving "am I loading or erroring" from separate
  flags. That claim now has a test, as does the null it returns when nothing is open.

  Two more that were simply missing: the markdown branch's stale-response guard, which is the same race the
  image branch was fixed for, and the six ways an `exceljs` cell can be an OBJECT — a formula with its
  cached result, a hyperlink with its label, rich text as runs, an error, a Date and an empty cell. A preview
  rendering `[object Object]` down a formula column does not error and looks like a sheet nobody filled in.

  **And the auth header, which is the whole reason this code fetches by hand.** The file endpoint requires
  it and a native `<img src>` cannot send one, which is what regressed image and PDF previews when the
  `?token=` fallback was scoped to SSE-only. The DOWNLOAD path has had a case for that since the regression
  and the preview path never did — the same rule tested in one of the two places it lives. Dropping it fails
  every branch identically and silently: a 401 surfaces as an error message that reads like a permissions
  problem with the file.

  **Twenty-seven mutants, twenty-seven dead, and three earned their keep.** One passed because the FIXTURE
  could not see the rule — the dotfile guard only shows itself for a file literally named `.md`. One was a
  no-op dressed as a change. And one was the auth header, which nothing checked at all.

- **The toolbar is its own component — `G-3.3`, and the first cut into the page's TEMPLATE.**
  `file-toolbar.component.ts` takes the space selector, the breadcrumb trail, the new-folder form, the
  upload picker and the sidebar toggle: 764 → 682 code lines.

  **Its style rules travelled with its markup, which is not a tidiness point.** Angular scopes a component's
  styles to its own template, so a rule the page declares cannot reach an element a child renders — and the
  failure is silent: no error, no warning, just an unstyled control that still works. `.rename-form` is
  DUPLICATED rather than moved, because the in-table rename form uses the same class from
  `file-listing.component.ts`; two consumers, so the rule exists in both places, which is how that was
  learned the first time.

  **The new-folder form is two-way rather than local state.** A refused create has to keep what was typed —
  losing an edit to a failed request is the one outcome trying again cannot undo — so the page closes the
  form on the ANSWER, not on the attempt. If the component owned that flag outright it would have to be told
  the outcome, which is a second channel for a decision the page already makes.

  **Read on a screenshot, not only in a test.** An isolated instance was booted and driven through three
  states — the root, the form open in place of its button, and a nested folder — because a moved stylesheet
  is exactly the change that measures correctly and looks wrong. `root / reports` renders with the
  breadcrumb's accent, separator and current-segment rules intact, the sidebar toggle still sits hard right
  on its `margin-left: auto`, and the run logged no console errors.

- **The preview group is its own store — `G-3.2`, and the biggest of the remaining cuts.**
  `file-preview.store.ts` owns the eight signals, the view model that joins them, the fetch, both
  renderers, the blob-URL binding and the full-screen flag — and, above the class, the five extension
  tables, the kind decision, and the spreadsheet cell formatter that exist only for it. 939 → 764 code
  lines.

  **The spreadsheet note is a translation KEY now, not a sentence.** Five stores on this page and not one of
  them translates: the wording of anything a person reads belongs to the renderer, which can see the locale.
  The note is the only prose the preview produces and the PARSE is what knows the numbers, so the parse
  returns the key and its parameters and `file-preview.component.ts` renders them. Same rule as the listing
  store's failure keys, from the other end.

  **The highlight.js language registrations moved with the call that needs them**, which is the half a move
  like this loses. `highlight.js/lib/core` is a module singleton with an empty registry, so a call for an
  unregistered language throws — and the ten `registerLanguage` lines were sitting in the page while
  `hljs.highlight` left. It would have kept working for exactly as long as something imported the page
  first: a load-order dependency nothing states. Confirmed load-bearing by deleting them and watching a case
  go red.

  Two things stayed on the page and one wrapper was deleted rather than moved. Opening a file still
  orchestrates three stores — the extract is cleared, the metadata record is loaded, the pane switches face
  — because none of those is the preview's to decide, and the URL is passed IN because it comes from the
  listing store. The deleted one was a one-line `renderMarkdown` whose own docblock said it existed
  "because the preview's tests drive it directly": a method kept alive by its own test, which is the thing
  `preview-object-url.ts` warns about in as many words. Its case now follows the path production takes.

- **The extract tab's four rules are pinned before the group is extracted.** Nothing user-visible changes.
  Three of the four had no test, and each is the kind a rewrite gets subtly wrong while every assertion it
  kept still passes: paging APPENDS rather than replaces (a diagnostic must not throw away what the reader
  has scrolled through) and keeps the FIRST response's `skip`, since that records where the view started;
  the next page is asked for from what is ON SCREEN rather than from the last response, which would ask for
  the same page for ever; the tab fetches once and lazily rather than on every switch back; and a failed
  load says so instead of rendering an empty extract, because "no chunks" and "could not ask" are different
  answers.

  Five mutants killed — replace-instead-of-append, the newest `skip` winning, paging from the response,
  re-fetching on every open, and a failed load leaving the spinner up.

- **Three legacy env-var spellings are now scheduled for removal at the next major**, and this page said
  they never would be. `OLLAMA_URL`, `WHISPER_URL` and `WHISPER_MODEL` have resolved to `VISION_BASE_URL`,
  `STT_BASE_URL` and `STT_MODEL` since 3.0, warning once at startup. The reasoning for keeping them was that
  breaking a documented env var to improve its spelling is not a worthwhile trade — the owner has
  reconsidered, and the notice belongs here rather than in the release that removes them.

  **Nothing changes in this release, and you can act now anyway.** Both spellings resolve in every 3.x
  build, so renaming them in your manifest today is safe and needs no coordination with an upgrade. Three
  places in the guides said they were permanent and now say what is true instead: a promise nobody
  retracted would surprise an operator at the major, which is the whole failure a deprecation notice
  exists to prevent.

- **Four config migrations are PERMANENT, not release tails — and one of them was going to be deleted.**
  They lift a legacy `config.json` key onto its replacement at boot: the removed face-recognition switch,
  the removed media master switch, the four `mediaEmbedding` url/model spellings, and a space's
  `description`. All four shipped at or before the 3.0.0 floor 4.0 upgrades from, which reads as licence to
  drop them.

  **The floor is not the test, and the code says so in its own words.** Each is written as *mutate in
  memory, then attempt to persist, and on failure warn "will retry next boot"*. That retry path means the
  product never assumed the write succeeded — so "every instance has already been migrated" is an
  assumption the implementation itself declines to make, and while a stale key survives on disk the
  migration is what turns it into the right value, on every boot.

  **None of the four fails by losing a value. Each leaves a WRONG DEFAULT, because the defaults moved
  underneath them.** A stale `faceRecognition.enabled: false` under an `auto` or `recognition` image ceiling
  would start face detection and store face embeddings — biometric data — with nobody having asked;
  measured, not inferred. A stale `mediaEmbedding.enabled: false` would turn captioning and transcription on
  for an instance that had media off. A stale `ollamaUrl` would drop the vision endpoint to the built-in
  default and caption every document against whatever answers there. A stale `description` would lose a
  space's MCP directive — and since `description` is refused at both doors since 3.0, the operator could not
  re-send it under the old name either.

  Three of those are a setting that is present, configures nothing, and produces no error, which is the
  failure this release has now twice refused to ship. A new gate pins the WIRING rather than the behaviour,
  because every existing test on these four passes if the migration merely stops being CALLED — a deletion
  takes the function and its test out together and leaves nothing red. It also asserts each one runs OUTSIDE
  its own `try`, so the in-memory fix still applies when the disk write fails, which is the only case where
  any of this matters.

- **`validateMemory`'s docblock now says the type allowlist is disputed rather than silently disagreeing with
  three documents.** The interface docblock and two integration-guide pages state that the keys of
  `typeSchemas.memory` are the allowed type values; the code only ever uses `type` to look one up. That looked
  like a documented-but-unimplemented feature until the reason for the asymmetry turned up: the memories tab's
  type control is free text with suggestions *because* the server accepts any string, and a closed select would
  have been stricter than the API. Two shipped promises pointing opposite ways is a product decision, not a
  defect, so it is filed for a ruling and the code now says where.

- **A processing poll whose own request FAILS keeps running, and now has a test saying so.** Seven cases
  already stood over that poll — it re-lists while something is in flight, keeps going, leaves an idle
  folder alone, retires itself when the file finishes, never stacks two timers, ignores which pane face is
  open, and is cleared on destroy. None of them reached a failed request.

  Retiring the poll on one failure would mean a single blip freezes the stage bar until the person navigates
  away and back, and the file they are watching finishes with the bar stuck — which is indistinguishable
  from the wedged pipeline the poll exists to fix. So it carries on, and the view repairs itself when the
  server answers again. Confirmed by mutation: retiring it on a failed listing turns the case red.

  This closes `G-15`, the last thing left of `G-3`, with an answer rather than a move: the poll reads
  three stores, so any store owning it would reach into two others. A page is where something belonging to
  no single store lives.

- **A tracker exemption is now checked by its REASON, not only by the filename it names.** The local
  pre-push check verified that each exempted page still exists — the half that cannot hurt anyone, since an
  exemption pointing at a deleted file excuses nothing. It said so itself, in a yellow *"harmless, but tidy
  it"*.

  The half that had already caused damage was never read. A page was exempted as *"indexed by outcome rather
  than queued"*, the outcomes moved elsewhere, and the exemption stayed — so that page collected settled
  work filed as open for weeks while every checked page reported clean. The file existed the whole time.

  *"Is this sentence still true?"* has no check. **A number in it does.** When a reason says how many steps
  a checklist has, that is a claim about the file and the file can be counted — and the one entry subject to
  the new rule was wrong, saying six where there are seven. A second stale count turned up beside it, in the
  message that tells you how to rebuild the checklist if it is missing: it listed six rows, and the one it
  left out was the documentation row. A row that is absent is not checked, so following that instruction
  produced a checklist with one of its four real checks switched off.

- **The contributor guidelines say what the code now does, and a gate reads them.** `CLAUDE.md` carried three
  claims that this release's own PRs had made false — one of them written the same morning and stale by
  lunchtime, six changes having landed between writing it and reading it back. It ships no behaviour; it is what
  a contributor acts on, which is why a false rule there is a decision taken against something that is not true.

  What was wrong: the replicated-field rule still described a hand-kept exemption list and claimed no sync path
  enqueues an embed job (it always did — the function is named `enqueueIngestedRecord`, and grepping for the
  other name is how I got that wrong); the MCP/REST parity section presented `recall`'s filter grammar gap as
  current when it has been fixed; and rule 4 of the five-places rule named one userguide page when this
  release's capabilities landed on two others.

  `docs-name-real-identifiers.test.js` now includes `CLAUDE.md` in the set it checks — every backticked
  camelCase name has to exist somewhere in the repository — and excludes it from its own haystack, since a
  document that is its own haystack validates every name it invents. Mutation-tested by exit code.

  The wider sweep the file cannot mechanically do — a claim that is FALSE rather than absent — is filed as
  **Q-1**, last in the queue and gating the release tag: it is only worth doing against the code as it ships.

- **`npm run preflight` now says when a database suite did not run.** Thirty-one standalone suites need the test
  MongoDB and stand down with a message when it is absent — correctly, and in CI the harness throws rather than
  reporting a green no-op. What was missing is that preflight then printed *"PASSED"* in exactly the same words
  as a run that had executed all of them.

  It cost a 21-minute CI round trip on the change above: removing a positional parameter shifted the argument
  after it, and the only callers passing that many positionals are database suites. The seven failures arrived
  as behaviour (*"waitForEmbedding: true still fails loudly"*) rather than as a signature mismatch.

  Derived from imports plus one TCP probe rather than by parsing test output: a suite that needs the harness
  cannot have run if the port is closed, and that is knowable without reading a line of the report.

- **A removed field could still be written by an internal caller.** `updateSpace` took a `description` and
  folded it into `meta.purpose`. Correct when written, and unreachable since `refuseRemovedDescription` went
  in front of both planners — every request carrying the field 400s, and all four internal callers pass
  `meta`. What was left was one rule with two implementations where the survivor silently ACCEPTED what the
  refusal exists to reject, reachable by any code going straight to `updateSpace` instead of through the
  planners.

### Removed

- **The token API no longer accepts `spaces`, `admin` or `readOnly` when creating a token** (breaking).
  Send `rights` instead — the per-space permission grid, which has been the real permission model since
  2.6 and is what the Tokens page has been sending. Nothing an operator does in the interface changes.

  This affects scripts that create tokens through the API with the old fields. They now get a `400` that
  names the replacement for each one: `spaces` → `rights.perSpace`, `admin` → `rights.instanceAdmin`,
  `readOnly` → `rights.floor` with read rungs. A plain "unrecognised field" would have told you that you
  were wrong without telling you what to do.

  **Existing tokens are untouched.** The old fields are still stored on tokens that have them and are
  still honoured; this is about what the create endpoint accepts, not about what already exists.

  **Two limits moved across with it, and nearly did not.** The old space list refused an empty space id
  and allowed at most a thousand entries. The permission grid that replaces it had neither, so removing
  the list would have quietly dropped both — a token could have named any number of spaces, or a space
  whose name is nothing at all. Both now apply to the grid, with the same thousand.

  Each was guarded by a security test that would have gone on passing: both assert that the request is
  refused, and a field that no longer exists is also refused. Same answer, different reason, protection
  gone with nothing to show for it.

- **BREAKING: the two `syncSchedule` shorthands are gone, and an unrunnable schedule is now REFUSED.**
  `"*/N minutes"` / `"every Nm"` and `"*/N hours"` / `"every Nh"` were translated to cron on the way in for
  the whole of 2.x and 3.x. Send a cron expression: `"*/5 * * * *"`, `"0 * * * *"`. Nothing to do on
  upgrade — a shorthand already in `config.json` is rewritten to the expression it always meant, at boot, so
  an existing network keeps syncing at the same rate.

  **The refusal is the point, and it fixes something older than the deprecation.** `syncSchedule` was
  `z.string().optional()` on both network routes and validated nothing, so ANY string got a `2xx` — and if
  it did not resolve, the scheduler logged *"Unrecognised sync schedule … using manual sync only"* and
  carried on. An operator could set a schedule on the network card, be told it saved, and have that network
  never sync again, with the only evidence in a server log they have no reason to open. Both doors now
  refuse a schedule the scheduler cannot run, with a `400` naming the format; the settings page shows the
  server's own sentence, so the message is read where the mistake was made.

  A shorthand's refusal **names the cron expression it used to mean** — `"every 5m"` → `"*/5 * * * *"` — so
  an integrator who has had that string in their notes since 2.x gets a copy-and-paste fix rather than
  "invalid".

  **One case has no honest translation, and finding it is worth more than the removal.** A shorthand outside
  cron's range — `"every 90m"`, `"every 40h"` — never resolved to anything on any build, so a network
  holding one has been on manual sync since the day it was set and nothing has ever said so. Those are left
  exactly as stored and named individually in the startup log. Rounding one to the nearest cron expression
  would be the server deciding when to sync.

- **`excludeFromVectorSearch` is gone** (breaking). It was the name of the *never send this record to an
  embedding model* switch until 3.1.0, when it was renamed to `suppressEmbeddings` because the old name
  read as *removed from search* — which it never was. The switch itself is unchanged; only the old name
  has been retired.

  **Both halves went at once, and that was the point.** It survived as a name you could still SEND, and
  as a field written into every record beside the current one. Removing one and keeping the other is
  worse than keeping both: drop the stored field and a caller is told their write succeeded for something
  nothing reads; drop the name and records already carrying the field keep working while nobody can set
  it.

  **Nothing needs migrating.** Every write since 3.1.0 has set the current name, so a record that carries
  only the old one predates 3.1.0 — and the peer version floor already keeps such an instance off the
  network.

  **What changes for you:** a request or a tool call sending `excludeFromVectorSearch` is now refused
  instead of accepted. Send `suppressEmbeddings`. Both doors behaved identically before and behave
  identically now.

  **Why it could not go sooner.** A brain older than 3.1.0 does not know the current name, so it drops it
  when it stores a record — and its copy comes back with nothing saying *leave this one alone*. Content
  someone marked never-embed would reach a model and return to search results, silently, everywhere. The
  peer version floor added in this release is what makes that impossible, and the release checks refuse a
  tag below 4.0 while this field is absent.

- **BREAKING: the MCP SSE transport is gone.** `GET /mcp` opened a stream that handed back a `sessionId`, and
  `POST /mcp/messages?sessionId=…` carried the tool calls. Use **Streamable HTTP** instead — one
  `POST /mcp` per JSON-RPC call, with an `Authorization: Bearer` header. It has been the recommended
  transport in every guide throughout 3.x, it works through ordinary HTTP proxies, and every current MCP
  client speaks it. This is the MCP SDK's own deprecation, not ours.

  **Neither endpoint 404s.** `GET /mcp` answers **405** with `Allow: POST`, which is what the MCP
  specification asks of a server with no server-initiated stream, so a spec-following client handles it
  without reading the message. `POST /mcp/messages` answers **410 Gone**. Both bodies name the transport to
  use, because a removed endpoint that falls through to a generic *Not found* leaves the client's author
  guessing. An unauthenticated request still gets the **401** with the OAuth `WWW-Authenticate` header
  first, so the claude.ai connector flow is untouched.

  **Two things went with it, and both are the point rather than tidying.**

  A raw `?token=` in the URL no longer authenticates **any** route. That was the last exception, and it
  existed only for SSE clients that might not have been able to set a header; a token in a query string
  lands in access logs, proxy logs, browser history and `Referer` headers. The browser event streams already
  used a single-use `?ticket=` and are unaffected. The allowlist is deleted rather than emptied — an empty
  one fails closed, but it is a mechanism looking for a consumer.

  This also closes a rate-limit weakness the fallback had created. `globalRateLimit` skips a request that
  presents a credential, and the credential check read `?token=` — so appending `?token=anything` to an
  unauthenticated request moved the caller off the 300/min global limit and onto the 3000/min IP flood
  backstop. The backstop bounded it, so this was a tenfold amplification of anonymous request rate rather
  than an open door, but it was available to anyone with a query string, and nothing authenticated the
  parameter it turned on.

  **`ythril_mcp_connections_active` is removed, not pinned at zero.** A stateless transport holds no
  connections, so the gauge would have read 0 for ever — and 0 is a *plausible* value, which means a
  dashboard panel and an alert threshold both keep working while both keep saying no MCP client is connected.
  Count `ythril_mcp_tool_calls_total` instead; it counts work rather than sockets.

- **BREAKING: the three legacy media env vars are gone.** `OLLAMA_URL`, `WHISPER_URL` and
  `WHISPER_MODEL` resolved as aliases for `VISION_BASE_URL`, `STT_BASE_URL` and `STT_MODEL` for the whole of
  3.x, warning once at startup. Rename them and nothing else changes; the current names have worked since
  2.1 and resolve in every 3.x build, so a manifest written for 4.0 also runs on 3.x.

  **Setting a removed name now STOPS THE BOOT, and that is the design rather than a side effect.** Deleting
  the alias and nothing else would mean a manifest that still says `OLLAMA_URL=http://vllm:8000` starts
  cleanly, configures nothing, and captions every document against the built-in default — with no error
  anywhere. Of the three things a set variable can do — work, error, or nothing — the third is the worst,
  and it is the one you get for free. The message names the replacement and what it configures.

  The **config-file** half of the same rename is unaffected: `mediaEmbedding.ollamaUrl` and its three
  siblings are still lifted onto `vision.*` / `stt.*` and deleted, because a file the product owns can be
  fixed rather than refused. An operator's manifest is not their config.json.

- **BREAKING: the server-rendered setup form is gone, and so are `GET`/`POST /api/setup`.** Use
  **`POST /api/setup/json`** for programmatic first-run setup — it was already the documented preference, it
  is what the web UI posts, and it takes the same label in a JSON body instead of a form encoding.

  **Two of the four endpoints had already stopped answering, and the guide still documented them.** The
  `/setup` MOUNT was removed in an earlier release: Express matches a mount before the SPA's index fallback,
  so mounting the setup router at `/setup` as well as `/api/setup` had made the web UI's own first-run page
  unreachable — the legacy form was the live entry point and the SPA's page had never served one. That half
  shipped with an end-to-end first-run proof rather than on the argument that the SPA route existed.

  This is the half left behind, and it was not harmless. The form's `action="/setup"` posted to a path that
  no longer existed and the error page linked back to it, so the file still LOOKED like the live entry point
  on the one code path that runs before any identity exists — and `11-setup-api.md` kept promising both
  endpoints, which is the worse failure: a reader following a guide that was correct when written concludes
  the product is broken rather than the page is old.

  **Deleting it surfaced a bound that was in the wrong handler.** `SETUP_LABEL_MAX` was enforced by the
  form's `POST` and not by `POST /json` — one rule, two implementations, and the weaker one was the survivor.
  Since the mount had already gone, `instanceLabel` had been unbounded on the unauthenticated boot path for a
  release. The cap now applies where it runs, on the trimmed value that is actually stored, at the same 100
  characters the web UI's own input carries.

  Two gates tightened as a consequence rather than being adjusted around: `setup/routes.ts` leaves the
  "errors need not be JSON" exemption list, because the exemption stopped being TRUE rather than stopping
  being needed — and an exemption that is no longer earned is a hole nobody watches, since a file on that
  list is a file the rule does not apply to.

### Fixed

- **"A token with no permissions reaches nothing" was true in two places out of four** (`Q-5`). The rule was
  settled in 4.0 and applied to the two places anyone had looked at. The other two were the check that decides
  which *area* of a space a call may touch — and it has a copy on each door, so both the web API and the agent
  API let such a caller past it.

  **Nothing could get in through either, and that is the reason nobody found them.** A caller with no
  permissions is given an empty list of spaces before any of this runs, and every one of these calls needs a
  space. So the gap was unreachable in exactly the way the two already-fixed copies were — which is the
  dangerous kind: nothing exercises it, so nothing reports it, and anything that ever did reach it would have
  been let through.

  **Both files already held the answer, twenty and forty lines away.** In each one, a neighbouring check
  refuses a caller with no permissions, with a comment explaining why. The two that did not carried a comment
  explaining why they need not — a reason that stopped being true two releases ago, when the login path
  started building permissions for every session.

  **The check that guards this is now about the rule rather than about one function.** It had been written
  against the first place the problem was found, which is why the sweep it belonged to stopped there. It now
  asks every check that can be handed a caller with no permissions, and asks it by calling the check rather
  than reading its source.

- **An administrator restricted to certain spaces could not create a token at all** — through this
  product's own Tokens page, which is the only way most people do it. The refusal said *"A
  space-restricted token cannot create an unrestricted (all-spaces) token"* about a request that was not
  unrestricted.

  The create form stopped sending the old space list some releases ago and now sends the per-space
  permission grid instead. The check guarding against a restricted administrator handing out more access
  than they hold was still reading the OLD field, found it missing, and read "missing" as "everything".

  **An unrestricted administrator never saw it**, because the check is skipped entirely for them — so the
  people most likely to try the form were exactly the ones it could not affect.

  The mint form and the edit form now decide "outside your scope" with the same piece of code. A note on
  the edit form had claimed for some time that they already did.

- **SECURITY: the two peer governance relays authenticate the caller and now also AUTHORISE them**
  (`Q-1.1`, found by the guideline audit). `POST /api/sync/networks/:id/members` and
  `POST /api/sync/networks/:id/votes/:roundId` are the calls a peer makes to report its own member record
  or to pass along a vote. Both carried authentication and a read-only refusal and nothing else — no space
  scope, no network membership — so **every token that could write anything could drive both**.

  On the members relay that reached any member's address, label and children. On the votes relay it
  reached a cast attributed to **any instance, on any round**, and the rounds include member removal,
  space deletion and space wipe — which pass on a single yes with no veto on two of the network types.

  **The signature requirement did not stop it, because the caller's identity DEFAULTED.** The relay
  resolved the reporting instance as *the peer id on the token, or else the instance named in the body*.
  A caller with no peer identity therefore became the cast's own author: reporter and voter matched by
  construction, the own-cast path was taken, and a network configured to require signed votes accepted an
  unsigned one.

  **Each route stated the rule it did not enforce**, which is why this read as safe. The members route
  said in as many words that *"tokens without peerInstanceId (admin/local) may update any record"* — a
  description of who was expected to hold such a token, sitting where a check should have been. One rule,
  written twice, and the copy in front of the route was the weaker one.

  The question is answered once now, and both relays take the verdict: **a peer token speaking for its own
  instance, or an instance administrator relaying on a peer's behalf.** Anything else is a `403` naming
  both ways in, because a relay is wired up once and then debugged from its response.

  **The check also moved ahead of the lookups.** It used to run after the network and round were fetched,
  so a caller who may not vote was told whether the round existed — an existence oracle over another
  network's governance, and a `404` where the answer should have been `403`.

  Nothing legitimate changes: a peer syncs as before, and an instance administrator still relays. That
  half is asserted too — the opposite failure, a guard so narrow it locks out the local administrator,
  would be found by an operator rather than by a test.

- **A token record with no rights matrix reached EVERY space. It now reaches none.** "Which spaces may this
  token see" had two implementations: the rights matrix, and the pre-3.0 `spaces` allowlist as a fallback for
  a record that had no matrix. Each was correct on its own — the fallback's rule was explicitly that an
  ABSENT allowlist means every space and an EMPTY one means none, never length-as-truthiness.

  Composed, they made the answer **fail-open**: no matrix *and* no allowlist returned every space in the
  instance. That is defensible as "a legacy token is unrestricted" and not defensible as the answer to "this
  record carries no scope information at all", which is what the case had become. The reach helper did it,
  the space guard did it, the proxy lens did it, and the MCP dispatcher did it.

  **The fallback was also unreachable, which is why it could go rather than merely be reordered.** There is
  one place a record is attached to a request and one place a bearer resolves into one, with two branches:
  `createToken` always writes a matrix and the boot backfill derives one in memory for anything stored
  without one, and the OIDC path derives one per request through the same `migrateToken` the migration uses.
  A new gate asserts each of those, because "cannot happen" is worth exactly what the thing preventing it is
  worth.

  Every one of those arms cited the same justification — *"OIDC tokens are built per request and never reach
  the config backfill, so removing this would refuse them all"* — and that stopped being true when the OIDC
  path gained a derived matrix. The branch served nobody, and what it did meanwhile was fail open.

  **One arm was worse than dead.** The MCP dispatcher also checked `if (tokenSpaces && !tokenSpaces.includes(
  space))` on EVERY call, matrix or not — the belt-and-braces `&&` its own gate forbids in the filter one
  screen away. Harmless while the array agreed with the matrix derived from it, and a silent refusal of
  access the matrix GRANTS from the moment a token is edited through the rights editor.

  The legacy fields are not removed — they are still on the record type, still written, still returned by the
  tokens API. What is gone is their last use as a scoping input. `auth/legacy-spaces.ts` is deleted with
  them, along with `mayUseProxy`, which had no caller and was a third statement of a rule two live paths
  already implement.

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

- **The admin import wrote arbitrary documents with no validation and no embed job.** `POST
  /api/admin/spaces/:id/import` did `replaceOne(…, { upsert: true })` on whatever it was given: zero schema
  references anywhere in the handler, and no queue entry — so a restored backup was stored and **invisible to
  meaning-ranked search** until somebody thought to run a reindex they were never told they needed.

  **The validation half read as a decision and had been filed as one.** The tension is real: an import is how
  you restore a backup, and a backup taken before a schema change would be refused by the instance's own
  current rules, which makes backups unrestorable. It sat as an unasked question for the owner.

  It should not have. `api/sync/_shared.ts` meets the identical problem on the identical kind of payload and
  answers it by RECORDING rather than refusing — the document is stored and the violations are reported back.
  Import is the other bulk ingest path into the same collections, and one rule with two answers is the defect
  this codebase produces most. The question was withdrawn rather than put.

  Each collection's result now carries `schemaViolations`, naming the documents and what was wrong with each.
  Per record and not a count: a number tells an operator that something in a 50 000-record restore is wrong and
  nothing about which one.

  **The write goes through `ingestBrainDoc`**, which is the only thing the sync router permits to write a brain
  document precisely so a new ingest site cannot be written without the queue. Import had grown its own
  `replaceOne` beside it and inherited none of that. A gate now refuses a second `replaceOne` in that module.

  **Two things it still does not do, and both are now stated rather than absent.** It does not reallocate
  `seq` — an exported document keeps the one it had, so a restored instance and its peers still agree about
  which copy is newer. And it does not check tombstones: sync refuses a document whose id was deleted so a
  lagging peer cannot resurrect it, while a restore is the one case where resurrection is the point. The cost
  is that a record deleted after the backup comes back and the tombstone removes it again on the next sync.

  The handler moved to `api/admin-import.ts` on the way, which is what let it be exercised against a real
  database without an HTTP server.

- **Every sortable table header in the app was lower-case, alone among the tables.** The shared header renders
  its label inside a `<button>`, and a button does not inherit `text-transform` from its `th` the way a span
  does — nor is it part of the `font` shorthand the component was already inheriting. So the four Brain tabs
  and the file listing had mixed-case headings while every other table in the product had uppercase ones.
  Found by photographing the new token table, which sits directly under an uppercase one.

- **The token table's empty row spanned seven of its eight columns**, so the empty state stopped one cell short
  and the panel had a notch cut out of its right edge.

- **Every start logged a warning about a repair that had already happened, and the repair it named could
  never have worked.** On boot, a token that predates the per-space rights matrix gets one derived from
  its old settings. That derivation is deliberately kept in memory and not written to disk — but the code
  tried to write it anyway, using a mechanism that does not exist in this codebase, so the attempt failed
  on every boot of every instance and left a line saying *"Could not persist derived token rights (will
  retry next boot)"*.

  **Nothing was ever wrong with your tokens.** The derivation itself always worked, and the thing that
  failed was a write that was not supposed to happen. Access was never affected. What was affected is
  that an operator reading their logs saw a permanent warning describing a retry that could not occur —
  it reads like a full disk, and no amount of restarting would clear it.

  **Why the obvious fix would have been the real bug.** Making that write succeed looks like a one-line
  repair and would have quietly reversed a deliberate decision: the derived rights are held in memory on
  purpose, because parts of the system still read the old settings directly, and writing a derivation to
  disk before it has been checked against the behaviour it reproduces makes any mistake in it permanent.
  So the fix is the other way round — the step now has no way to write at all, and cannot be asked to.
  Persisting it is a separate, deliberate piece of work.

  **The rollback instructions described a file change that never happened.** The hosting guide told you
  that upgrading writes a rights matrix into `config.json`, so an older build would read tokens carrying
  a field it does not understand. That has never occurred on any instance — the write always failed. The
  table now says what is true: tokens are untouched, and the config file you copy before upgrading is
  identical afterwards as far as they are concerned.

  Four places in the codebase said this step writes nothing and two said it does. The ones that
  disagreed were checks that read the source for the word "persist", found it, and passed — over a call
  that threw every time it ran. All six now say the same thing, and they assert the absence of a write
  rather than the presence of one.

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

- **The rules this codebase states about itself were checked against the code, and thirteen of them were
  false** (`Q-1`, first slice — the audit covers nine surfaces and this is one of them).

  Two would have cost a reader something real. The page said a route with no token-rights row is *"either
  unreachable or ungoverned, and both fail silently"* — it is neither: the request is served with its reach
  enforced and its area not, and it logs a warning naming itself on every call, which is how an operator
  found one. It also gave one instruction where there are two answers, and following it for a route that is
  not a view of a space's data area-scopes a route the design says must not be.

  And the instruction for adding a replicated field to a FILE was wrong in the direction that hides. Five of
  the six collections exclude fields from the space hash by naming them; files INCLUDE the fields they hash,
  because a file record has thirty-odd fields and most are local machinery. So *"add the field, do not
  exclude it"* leaves a file field outside the hash — two instances holding different data and agreeing they
  match, for ever, with nothing to contradict it.

  **Four of the thirteen rotted in the last few days, which is the argument for the audit rather than a
  footnote to it.** The page named four replicated documents and there are six; claimed one ingest function
  where there are now two; said the hash exclusion lives in two places and it is three; and described every
  arriving document as validated by a schema that STRIPS unknown keys, when file metadata refuses them
  instead. Each was true when written and none announced that it had stopped being.

  Counts are now written as the rule that produces them — *"every `Incoming*` schema in that file"* rather
  than *"four"* — because the gate protecting exactly this had the identical bug: a hand-written list of
  four documents that missed the fifth when it arrived, and reported clean about a document nobody had
  checked.

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

- **A peer's retention schedule could delete this instance's records, and a peer's vectors were stored and
  ranked as if they were ours.** Both on the PULL side of a sync, both silent, and the second is the one
  that costs data.

  Five fields on a record belong to the instance holding it: the search vector and the name of the model
  that built it, the snippet a search matched, and the two stamps saying when this instance's retention
  policy expires the record and its description. When another instance SENDS us a document, those five are
  dropped — the schema that validates an arriving push does not accept them.

  **When we FETCH a document from a peer instead, nothing validated it.** The fetch asks for whole records
  and stores what comes back, so the sender's five arrived intact. The vector is the mild half: ranking one
  model's vectors against another's does not fail, it just returns plausible answers in the wrong order.
  The expiry stamp is the expensive half. A background sweep deletes every record whose stamp has passed,
  in every space — so an instance keeping data for a year, syncing with one that keeps it for a week, threw
  records away after a week. Nothing was logged, and the deletion is indistinguishable from that operator's
  own policy working.

  Both directions now drop the same five, from one list. The sending side also leaves them out of the page,
  which is not the safeguard — the receiver's decision is — but does make a sync page materially smaller,
  since a vector is several hundred numbers per record.

  **Nothing existing had to be repaired**: a stamp that arrived from a peer was overwritten by this
  instance's own on the record's next write, and a vector by its next embed. What could not be undone was
  a record already deleted, which is why the fix is not a backfill.

- **A large file never replicated, and a file-metadata-only sync cycle never finished** (`Q-2`). Both were
  one root cause wearing different symptoms: 4.0 added a SIXTH replicated record family, and five places
  still counted five.

  **Any file whose body took longer than ten seconds to arrive aborted, logged, and was retried identically
  on the next cycle — for ever.** The download asked for a ten-MINUTE transfer budget and also passed the
  request carrying the ordinary ten-second one, and the second of those wins. The comment beside it
  explained why a whole file needs the longer budget, which is how this survived: the intent was written
  down and the code did the opposite. Small files synced; large ones silently did not.

  **And a cycle whose only change was file metadata re-sent the same page every time.** The watermark
  recording how far a push got was computed from a hand-written list of families that omitted file
  metadata — while the same call passed that transfer in the list used to detect a truncation. So it could
  hold the watermark back and never advance it.

  That list is gone: the watermark is derived from the transfers it is given, so a seventh family cannot
  reproduce this. **There were THREE such lists rather than two.** The third keeps locally-written records
  sorting above received ones, and it omitted file metadata too — so a record arriving with a high sequence
  number left the local counter beneath it, and the next local write could take a number below a record
  already stored.

  Two more the same number was hiding. **A push of file metadata now reports what happened to it** — six
  arrays went in and five sets of counters came back, so a sender was told nothing about the one family it
  cannot otherwise check. And **a proposed space wipe now reaches the other members**: it cast its own yes
  vote unsigned, where every other vote in the product is signed, so on a network configured to require
  signatures the proposal carried locally and every peer refused it — silently, because refusing an
  unsigned vote is correct behaviour. The comment describing what an unrestricted wipe destroys said five
  collections; it destroys six.

- **`sync_now` said it does not wait, and that an unreachable peer is not an error. Both were wrong.**
  The tool awaits the whole cycle, reports how many networks synced and how many failed, and sets its
  error flag from that count. So an agent was told to ignore an outcome it was being handed, and to poll
  `list_peers` for a result it already had — and told not to expect a failure it does get.

  **A gate required both false sentences**, which is the second time this has happened in that file. Its
  own comment records the first, eighty lines above: *"A gate written from a description rather than from
  the code does not catch a wrong description; it CEMENTS it, and turns rewriting it into a test failure
  that looks like a regression."* Both claims are now asserted from both sides — the handler must await
  and must derive its error flag from the count, AND the description must say so. Whichever one moves,
  the gate fails naming the other.

  The description keeps what was genuinely useful and was being conflated with it: a clean cycle is
  still not proof that a space has converged, because a cycle transfers what the watermarks say is
  outstanding and can be bounded per hop.

- **The divergence check reported every space with a retention policy as divergent, for ever.** The Merkle root
  hashed `_expireAt` and `_contentExpireAt` — the retention stamps — and neither is on any ingest schema, so both
  are stripped on push. The sender's copy carried the key, the receiver's did not, and the two roots could never
  agree about identical content. On any network with `merkle: true` that meant a `MERKLE_DIVERGENCE` warning
  every cycle, and because the check is advisory nothing ever contradicted it. A permanent false alarm is worse
  than a wrong number: it teaches an operator to ignore the one signal that means data really is missing.

  Excluded rather than replicated, on the same reasoning `DERIVED_FIELDS` already gave for the embedding vector:
  each instance computes its stamp from its own policy, and shipping the sender's would let one peer decide when
  another deletes its data.

  **The marks a lapsed content window leaves behind are still hashed**, and that is the half a blanket
  "exclude anything expiry-shaped" would have got wrong. `contentRedacted` and `contentRedactedAt` say what the
  record IS — that it had a description and the description is gone — and they replicate. Excluded, a redacted
  entry would hash identically to one that still has its detail: real divergence going unreported. There is a
  case for it beside the two that drove the fix.

  This empties the exemption list in `a-replicated-field-reaches-its-incoming-schema.test.js`, which is how it
  was meant to go: an entry there names a live defect with the right answer beside it, and the gate's own
  stale-row check refused to let the rows outlive the fix.

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

- **The thirteen sync-ingest write sites are one function.** Each wrote the document and then queued its
  embedding as a separate following statement, which holds for as long as everyone writing the fourteenth
  remembers the second line — and a record written without the queue is stored, listed, traversable and absent
  from every meaning-ranked search on that peer, with nothing to grep for. `ingestBrainDoc` does both, and it is
  now the only thing in the ingest router permitted to write a brain document.

  The gate that covered this compared two counts, thirteen against thirteen. Equal counts are a weaker claim
  than they look — and they go VACUOUS: nought writes and nought enqueues are equal too, so extracting the
  write made that check pass by looking at nothing. Its floor caught it, and the rule is structural now.

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

- **A comment told the next developer to remove a search option that must never be removed** (`Q-5`).
  Nothing an operator or an integrator can observe changed — but of everything this audit has turned up,
  this is the one that was pointing at a future defect rather than describing a past one.

  `find_similar` takes an option that widens the search to every space you can reach. On the agent API it
  looks redundant, because leaving the space out does the same thing. On the web API it is not: **that route
  takes the space in its address**, so *"leave it out"* cannot be said at all, and the option is the only way
  to ask for the same thing. Removing it would leave the two APIs able to do different things, which the
  check that compares them exists to prevent.

  That was worked out once, and the option's own description was corrected to say it is not going away — so
  that nobody plans around a removal that will never happen. **Two comments in the code that implements it
  kept the old wording**, and one of them said the removal was still coming. A stale sentence misinforms; a
  stale instruction gets followed.

  A new check now holds it: any option whose description claims permanence may not be called deprecated by
  the code implementing it. Written as a rule rather than about this one option, so the next option kept for
  the same reason is covered without anybody remembering to add it.

- **A troubleshooting answer explained itself with a mechanism that has since gained a second case** (`Q-5`).
  The integration guide answers *"my filtered search returned fewer results than I asked for"* — and the
  answer it gives is right, but the reason it gives is now only half true.

  The promise is that the result count is filled from records that actually match your filter, so a filtered
  search cannot silently skip one. **That promise has never changed.** How it is kept depends on the filter:
  a simple one narrows the search inside the index, while a raw MongoDB one has the whole space scored and
  then filtered — slower, same records, still nothing missed. The guide gave the first as *the* explanation.

  Three other places describing the same thing already state the promise first and the speed note second.
  This one is the straggler, and it is the failure this project's own notes predict about explaining a
  mechanism instead of a guarantee: the mechanism gains a case, and nobody revisits every sentence that
  described the old one.

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

- **A hard-filtered search returned fewer records than it could, and a flag for finding what you just
  wrote did nothing on the usual call** (`Q-3`, the last bundle of the guideline audit). Every place where
  one door accepted less than the other, or described something neither door does — and one of them turned
  out to be the search FORM rather than either API.

  **`minScore` was applied after the cut.** Asking for ten records above a threshold could return three
  while forty cleared it: the ten-record window was chosen from the unfiltered ranking and then thinned.
  It now narrows the candidates, so the count you ask for is filled from records that qualify — the same
  guarantee the property filter already made and stated. The two search tools also stopped disagreeing
  about when the threshold applies.

  **`includeFreshWrites` was inert on the idiomatic agent call.** Its whole purpose is finding a record
  before the search index has it, and it was forwarded only when a single space was named — while omitting
  the space is the form the tool promotes and the form both write tools point at afterwards. So the
  documented remedy for *"I wrote it and cannot find it"* did nothing, with a success response. The
  existing test could not see it: it drives the REST door, where the space is in the path and that branch
  cannot be reached.

  **The timeline listing now says which space each entry is in.** It is the one tool built for searching
  across every space you can reach, its description promised the space on each row, and it returned none —
  while changing or deleting an entry REQUIRES one. Every row it handed back was a row you could not act
  on, and the single missing field was the one you needed.

  Also: the structured-query refusal lists every collection it accepts rather than five of six, so a
  mistyped call is no longer handed a list excluding a legal value; the per-type floor refuses a negative
  or fractional value on both doors, as the ceiling one line below it always did; and `help()` no longer
  says field selection exists on one tool when all three take it, or leave a search tool out of the list
  that can span every space.

  **And `topK` no longer has a ceiling on either door** (owner's ruling, `P-34`). This door clamped it to
  100 silently while the agent door accepted anything, so asking for 500 returned 100 through one and 500
  through the other — and a silent clamp is the worst of the options, because you are told nothing and
  believe you have the top 500.

  His question settled it rather than the options I had priced: the byte budget already returns whole
  records and reports truncation on every response, so the ANSWER never needed a cap. What a cap was
  standing in for is WORK, and that bound now sits where the work is — the per-type over-fetch and the
  graph walk each carry their own absolute limit, so an enormous request costs a bounded amount of effort
  instead of being refused or quietly rewritten.

  **And there was a THIRD door with the old cap still on it: the search form itself.** Its result-count box
  carried an upper limit of 100, so the browser silently refused a larger number and nothing reported it —
  an operator was told the ceiling was 100 while a script beside them asked for 500 and got it. Removed,
  and gated, because the five-places rule counts the screen as one of the places.

  The operator's Search page said *"1–100"* and the guide's "which search do I want" page still advised
  against a large request on the grounds that it would be capped. Both now describe the real bound, which
  is the size of the answer rather than the number of rows.

  **The `club` network type was labelled *"supermajority"* in all three languages.** One yes with no veto
  carries a club round — the guide and the README both said so, and the label a person reads while choosing
  a trust boundary was the copy that was wrong. Corrected in English, German and Polish.

- **A nested entity property was refused on create and STORED on update, and it taught a caller the wrong
  contract.** Reported by an integrator who measured both writes minutes apart against one space, on the
  same record type and the same field name: `POST .../entities` answered
  `400 `properties` values must be string, number, or boolean`, and `PATCH .../entities/:id` answered
  `200` and read the object back three levels deep.

  **The damage was not the refusal that did not happen.** In their words: *"the hole did not fail, it
  taught us the wrong contract."* They wrote a nested value through the permissive door, read it back
  whole, concluded the product supported nested properties, and built on that — so the failure was
  scheduled to arrive later, on a different route, as a puzzle instead of a message.

  **And it was three doors, not the two reported.** `POST .../bulk` cast the property bag with no value
  check at all. A reporter names where they saw it; the sweep has to be wider than the report. The rule now
  has one implementation (`brain/property-values.ts`) and every entity door calls it, with the refusal
  message unchanged because a caller is already parsing it.

  **MCP was correct all along**, on both of its entity tools — they declare
  `additionalProperties: { oneOf: [string, number, boolean] }` and the dispatcher enforces the schema. So
  this was MCP refusing what REST accepted: the parity rule broken in the direction nobody reports, because
  the door that complains is the one that looks broken.

  **Nested properties are not being added, and the guides now say why.** The integrator's own conclusion,
  which we share: *"a nested value in a property is usually a graph in the wrong place."* A property bag
  cannot be improved a piece at a time — changing one phase of a plan stored as one nested value means
  rewriting the value — and nothing that walks the graph can see inside it. `04f-write-semantics.md` and
  the Brain user guide both carry that now.

  Records already holding a nested value keep it: nothing rewrites stored data, and
  `deleteFields: ["properties.theKey"]` removes one.

  **The same defect was one record type over, and sweeping the class is what found it.** FILE META had it
  too, and it would have survived a fix scoped to what was reported. `write_file` — the create door for a
  file's properties — declared the value types and always refused a nested one; `update_file_meta`
  declared only that the bag was an object; `PATCH .../file-meta/:path` checked the bag's shape and never
  looked inside it; and the UPLOAD, which is where a file's properties are first set, silently DROPPED a
  malformed bag and answered `2xx` — the worst of the four, because an upload is not a cheap request to
  repeat. All four agree now.

  **And `update_file_meta`'s published schema had been telling callers the opposite of what it does.** Its
  `properties` description said the whole object is REPLACED and unnamed keys DELETED. It has merged since
  3.1, the tool's own prose says so, and the implementation does — only the schema disagreed. A schema
  description is what a caller reads while constructing arguments, which makes it the one surface where
  being wrong is invisible: nobody reports a behaviour they were told they did not have.

  **The gate is named for the rule rather than the record type** — `a-property-value-is-primitive-on-every-door`
  — because it was written as `an-entity-property-…` and covered file meta within the hour.

- **Opening a space's settings and pressing Save deleted an edge label's declared ends.** If `endpoints` or
  `functional` had been set through the API — the only way to set them until this release — the settings
  dialog dropped both while loading the space and wrote them back as absent. No error, no warning, and
  nothing in the dialog even named the field, so the loss was invisible from the UI and looked like an API
  problem from the outside.

  **The carry-through that was supposed to prevent exactly this was in place, and pointed at nothing.** The
  save path had been writing both fields since 3.7 specifically so that a UI save could not delete an API
  declaration; it wrote them from editor state that the load path never filled. Each half was tested and
  agreed with itself.

  It surfaced the moment the control existed: opening a label whose rule had been declared through the API
  showed empty boxes. A round-trip test over one fixture now pins load and save together, which is the only
  shape that could have caught it.

- **An update route dropped unknown fields silently, and a `warn`-mode space was told nothing about an edit.**
  The second half is the finding. The create responses carry a `warnings` array for schema violations; the
  update responses carried **none at all** — and the writers had been computing the classification and handing
  it back through `onValidation` the whole time, which the routes simply never took. So the same violation was
  reported when a record was created and silent when it was edited.

  Both halves ship together, because the first one had nowhere to go until the array existed. An update
  response now carries `warnings` when there is something to say, with the schema violations and the
  unknown-field rows in one array and one shape.

  **The accepted-field lists are each route's own, not copies of the creates'.** `deleteFields` is an update
  field and `id` is a path parameter there, so a copied list would have produced an "unknown field" warning
  about a parameter that works — which the drift check refuses: every name a handler READS, destructured or via
  `req.body?.['x']`, has to be declared.

  Four mutants dead by exit code. The gate's own first draft looked for the word `onValidation` in the handler
  and failed against working code: the parameter is positional, so a handler that takes it correctly never
  spells the name. It asserts the callback and the warnings being read back instead — the two things that
  actually have to be true.

- **`maxBytes` counted characters, and the name, the parameter, the refusal, the response field and the
  documentation all said bytes.** `JSON.stringify(record).length` is UTF-16 code units — equal to bytes for
  ASCII and wrong for everything else. `Grüße aus Köln — ąćę` counted 31 against 39 real bytes (26% under);
  three emoji counted 17 against 23 (35% under).

  A transport or client limit IS expressed in bytes, and this budget exists to keep a response under one — so a
  German or Polish space overran its stated budget by about a quarter, which is exactly the failure the budget
  was built to prevent. The canary's measured client refusal at "98,356" was counted this way too.

  **Owner's decision, 2026-08-30 (option C): both units, both enforced.** `maxChars` is the ceiling that always
  existed, now named for what it measures and carrying the defaults — **50 000 on REST** (down from the 100 000
  that was already characters) and **25 000 on MCP**, unchanged. `maxBytes` counts real UTF-8 bytes and has
  **no default**: bytes are always ≥ characters, so a byte default equal to the character one would silently
  become the binding constraint on every non-ASCII answer.

  **"Lower wins" is not a `Math.min` across the two.** Characters and bytes are different scales, so
  collapsing them to one number would be meaningless. Both ceilings are carried and the answer stops at
  whichever it reaches first — which is what "both apply" means, and what the `maxTokens`/`maxChars` pair
  already does WITHIN one unit, where a minimum is meaningful. `maxTokens` now resolves against characters,
  where it always belonged: the conversion produces characters and was only ever compared against a "byte"
  budget that was secretly counting them.

  **`charsReturned` and `budgetChars` join `bytesReturned` and `budgetBytes`, always.** Reporting one figure is
  most of why this survived: a caller comparing `bytesReturned` against their own byte limit was comparing it
  against a character count, with no second number to notice the difference with. `budgetBytes` is `null` when
  no byte ceiling was asked for — present rather than omitted, like every other field on that envelope.

  The gate's fixtures are German and emoji as well as ASCII, which is the part that matters: for ASCII the two
  numbers are equal, so a suite written in ASCII cannot tell the units apart at all. That is how this lasted.

- **`suppressEmbeddings` was documented, worked on update, and was silently dropped on create — on all four
  record types.** A record that was never meant to be searchable had to be written twice: once embedded, once
  to remove the vector, with a window between the two where it WAS searchable. Reported from outside on
  2026-08-30 by an integrator writing a dedupe marker on every inbound message.

  **The report named memories; it was every create.** Each one handed `embeddingSuppressedFor` a type-only
  object — `{ type }`, `{ label }`, `{ type: fields.type }` — so the schema and space tiers were consulted and
  the record tier was not *overridden* but simply **not stated**: the caller's flag had nowhere to be read
  from. Fixing the one that was reported and leaving three is this repo's signature defect arriving as an
  omission, so the gate is derived from the calls rather than from four remembered names.

  Three things now happen, and a fix doing two of them would be worse than none: no vector, **no embed job
  queued**, and the flag stored on the record. The queue matters most — skipping the inline embed while still
  queueing a job stores exactly what the flag forbids a few seconds later, with nothing to come back and
  remove it. Storing it matters because everything that revisits a record resolves the tiers from the
  DOCUMENT: a reindex or a queue retry would otherwise embed it anyway, and the caller would never learn that
  their flag lasted one write.

  Both spellings on all eight doors, since `parseRecordSuppression` owns that grammar and the update paths
  already use it — a create taking only the new name would be a third grammar for one switch. The four MCP
  create tools DECLARE the parameter, which is not optional: `additionalProperties: false` is enforced before
  the handler runs, so an accepted-but-undeclared argument is a hard refusal there while REST answers 200.

  **`DupeCheckOpts` moved to `brain/write-options.ts`.** It is a write type — five writers and the write
  routes' shared helper import it, and `recall.ts` only declared it — and adding one optional field pushed
  that file past its frozen size. That was the god-file gate working: every addition to what a CREATE accepts
  had been landing in the recall module because that is where the type already was. The freeze goes DOWN.

- **A brain create accepted any field you invented and answered `201`.** There was no body schema: each route
  destructured the keys it knew, hand-validated those, and dropped the rest. `"totallyMadeUpField": "xyzzy"`
  came back with a record id and nothing else.

  So a caller could not tell *"this parameter is not implemented"* from *"this parameter was applied"* — both
  are a success and an id. That is how `suppressEmbeddings`-on-create stayed hidden for two weeks: the
  integrator sent it, got a 200, and believed it.

  All four creates now return a `warnings` row naming each key they did not understand, **and what they do
  accept** — a warning that only says "unknown field" tells a caller their write was wrong without telling them
  what right looks like. The rows share the `warnings` array with schema violations and the same
  `{field, value, reason}` shape; a second channel for the second kind would be worse than the silence it
  replaces.

  **A warning, not a `400`**, which is what the reporter asked for and were explicit about: a strict rejection
  might break existing callers. It is also better on its own terms — a refusal answers a different question,
  and would turn every forward-compatible client into a broken one the day a field is removed.

  **MCP refuses where REST warns.** A tool's input schema is `additionalProperties: false` and the dispatcher
  enforces it, so an unknown argument is an error there before any handler runs. That asymmetry is now
  documented rather than discovered: test through one door and deploy through the other and you get two
  different answers to the same mistake.

  The shared write options — `ttlDays`, `waitForEmbedding`, the duplicate flags, both suppression spellings —
  are known to every route without any of them restating the list, because they are read by helpers rather than
  by a route body. A warnings array that cried wolf on the commonest write there is would be one nobody reads.

  Gated in two directions, and the second is what makes it stay true: every name a create route READS must be
  declared, whether it comes from the destructure or from `req.body?.['id']`. Two mutants survived the first
  draft of that check — one because the destructure regex stopped at the `properties = {}` default and silently
  matched the PATCH handler's instead, one because the key-read pattern could not parse an optional chain
  followed by a bracket. Both are gates that changed subject rather than failing.

  The UPDATE routes still do not report unknown fields: they carry no `warnings` array at all, so that is a
  response-shape change rather than a new row in an existing field, and it is filed separately.

- **A merge could move an edge onto an end its label forbids, and said nothing.** Since the endpoint rules
  became write-time refusals, every path that CREATES an edge enforces them — they all go through `upsertEdge`.
  A merge creates nothing: it rewrites the `from` or `to` of every edge touching the absorbed entity, on the
  collection, inside a transaction. So it was the one operation left that could produce the violation the rules
  exist to prevent.

  And it is a legitimate thing to do. A merge is how an operator fixes a record that was typed wrongly, which
  makes "the two entities are different types" the normal case rather than a mistake.

  The plan now carries `endpointRuleWarnings[]` — `{ edgeId, label, end, field, reason }` per affected edge, on
  the `409` preview AND on the success body. On the success body because that is when it matters: a plan with no
  property conflicts never produces a preview, so reporting them only on the `409` would mean the commonest
  merge said nothing at all.

  **Reported, never blocking**, following `duplicateEdgeWarnings`, which this file already established as
  merge's answer to "relinking will do something you should know about". `fullyResolved` deliberately does not
  consult it: only an unresolved property conflict has an answer the caller can supply, and refusing would leave
  duplicates unmergeable in any space that declared a rule after the data existed — the same reasoning
  `preExisting` exists for on the write path.

  **Only the end that MOVES is reported.** The decision is made by `validateEdge`, the same pure function the
  write path refuses with, handed a `ResolvedEdgeEnds` describing that end and nothing else — an absent field
  there means *the caller did not look*, so the unmoved end reports nothing without any special case. A
  violation on the unmoved end is stored data, and `POST /validate-schema` is what lists those; repeating it on
  a preview would blame the operator for something they cannot fix by merging.

  The violations are filtered to the endpoint fields, because `validateEdge` also checks the label allowlist and
  the property schemas and a merge changes neither. A mutant that removed that filter survived nine cases before
  a case was written for it: an edge under a label the space no longer declares was legal when it was written,
  and a relink does not make it less so.

  `functional` is included, and a merge is the only operation that can break it without writing an edge: two
  people each reporting to somebody is legitimate, and merging them leaves one person with two managers.

- **The property-schema grammar was written twice, in two files, and a comment admitted it.**
  `api/schema-library.ts` declared its own `PropertySchemaZ` under the note *"matches spaces.ts
  PropertySchemaZ"*. A property schema decides what values a caller may STORE, so two copies means a value the
  inline door accepts and the library door refuses, or the reverse — invisible from either side, and the defect
  class this codebase produces most.

  **The two were character-identical when this was found, and that is the point.** Nothing was broken yet, and
  nothing would have said when it broke. Both objects now come from one export, and the library composes it with
  the one difference it is MEANT to have: `retention` is refused there, because nothing resolves a `$ref` when a
  window is read, so a window on a library entry would never fire.

  **Gated in both directions**, because both objects existing looked entirely reasonable. From the source, that
  one module declares the grammar and the library imports it. From behaviour, that seventeen values — eight
  valid and nine wrong in each of the ways the grammar refuses — parse to the same verdict through both doors.
  The refusals are the half that matters: two schemas that both accept `{type: 'string'}` prove nothing about
  each other.

  `LibraryTypeSchemaZ` is exported now, which is what makes the behavioural half possible — the gate that
  asserted the `retention` refusal had to read the file as TEXT before, and reading text is what let a second
  copy of the grammar sit there unnoticed.

- **One traverse hop read every edge touching the frontier, with no limit — on both traversals.** A hub entity
  with a hundred thousand edges pulled a hundred thousand documents into memory, per hop, per member space.

  **And the cap that looks like it prevents that counts something else.** `limit` bounds nodes EMITTED: a
  neighbour already visited, or of a kind that does not hydrate, is skipped without spending any of it. So the
  ceiling counted hydrated rows and never documents read — defeating the invariant `graph-spill.ts` states in
  its own words, *"one hub with a hundred thousand edges would turn a bounded read into an unbounded one"*, one
  layer below the ceiling that was supposed to hold it.

  The case that isolates it is a hub whose edges all lead back to already-visited nodes: nothing new is emitted,
  so every truncation signal stayed quiet *precisely* when the read was largest — and a hub's edges mostly do
  lead back where you came from. That answered `truncated: false` having read the entire hub.

  Both hops are bounded now, with a `+ 1` probe so truncation is detected rather than guessed, and reported
  through the flag the result already carries. Not silently trimmed: the owner's completeness ruling is that a
  cost the caller can see is a different thing from one they cannot, and a mutant that bounds the read without
  reporting is one of the four this is tested against.

  **`truncated: true` therefore has three causes now**, where an integrator may have read it as one. The
  guide says so.

  It was missing in both traversals — the standalone walk and recall's seed expansion — which is the defect
  class this repo produces most, and these two have drifted before: `frontierEdgeQuery` exists because one
  followed every edge both ways while the other applied the direction, twenty lines apart. The link-record scan
  sitting between them already had the budget and the flag; the edge read beside it did not.

- **An edge's derived id now distinguishes endpoints of different KINDS, and so do the two other places that
  express edge identity.** Each collection assigns its own UUIDs, so a memory may hold the same id as an entity:
  `(X) -[mentions]-> (Y as entity)` and the same triplet with Y a memory are two relationships that derived one
  id. The second is then a duplicate key — on every sync cycle — which is the defect deriving the id was
  introduced to remove, arriving back through the endpoint M-1 widened.

  It matters most for what comes next. A lazy self-healing migration runs independently on every peer, so two
  peers converting the same link is the ORDINARY case rather than a race; without the kinds in the key they
  produce two ids for one link, at one record per mention.

  **An entity-to-entity edge derives exactly the id it did before**, byte for byte, and that is a requirement
  rather than a courtesy: a peer on an older build derives without the kinds, so appending them unconditionally
  would give two peers different ids for the same ordinary edge — re-opening the duplicate-key loop on precisely
  the networks that are mid-upgrade. They are appended only when at least one endpoint is not an entity, a
  combination that could not exist before this release. The test holds it to a hardcoded id rather than a
  recomputed one, because a test that derives its expectation from the function it checks cannot notice a
  re-derivation.

  **Filed as an id change; it is three.** Edge identity is expressed in the derived `_id`, in the unique index,
  and in the triplet lookup that decides insert-versus-update, and shipping one alone leaves them disagreeing:
  the id says two relationships while the index says one, so the row is refused on the triplet with its `_id`
  free. The index is now `(from, to, label, fromKind, toKind)` — safe on existing data, because an entity
  endpoint stores nothing and Mongo indexes a missing field as null, so every edge written before this keys
  identically to a new ordinary one.

  **And the old index had to be dropped, not merely superseded.** `createIndex` with a new key spec creates an
  ADDITIONAL index: on every space that already existed, `from_1_to_1_label_1` kept its unique constraint and
  kept refusing exactly the rows the widened key exists to allow — a free `_id` and a rejected insert. On a
  fresh space nothing was wrong, which is the shape of defect that ships looking tested. A boot-time drop is
  allowed here because an index is local state rather than synced data, which is the case the lazy-migration
  rule exempts, and it is matched on the key SHAPE rather than the name because a name is derived. A database
  test holds both directions: the old one goes, and the replacement does not go with it.

  `storedEdgeKind` is what makes that true: an explicit `"entity"` is normalised to absent, so there is one
  stored representation. Without it the same three places disagree again — one id for both forms, two index
  keys, and a triplet filter that matches only the absent one.

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

- **A header with a search box docked under it sat higher than its neighbours.** A filtered column is taller,
  and the default middle alignment then centres the shorter cells against it, so the labels in one header row
  landed at two different heights. Invisible in the Brain tabs, where nearly every column has a filter;
  obvious on the token table, where two of seven do.

  Both of these measured perfectly — the right number of columns, the right number of boxes, correct borders
  and radii — and both are only visible in a screenshot.

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

- **Two source comments described their own fixed defects as open.** The MCP parity list said *"one row
  left: `reindex`"* directly above an array that is empty and says so, and the sync ingest schema said a
  retention stamp *"is nonetheless hashed"* after the release that stopped hashing it. Both are the failure
  mode the audit exists for: a reader is taught to work around something that is not there, and to plan work
  that is done.

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

- **A source preview could show one file's contents under another file's name.** Arrow from a large `.ts` to
  a small one and the order is: start A, start B, B comes back and is shown, A comes back and overwrites it.
  The pane then holds A's highlighted source under B's name and stays that way until something re-renders,
  with nothing erroring.

  **This is the same defect the image preview had, and the answer is the reason it was one at all.** Four
  rules were written out per fetch branch — the auth header, the `!r.ok` throw, the failure path, and the
  staleness check — three times over. The staleness check had only THREE copies: markdown guarded, xlsx
  guarded, the blob binder guarded after a leak was found on 2026-09-02, and plain text never got one. One
  rule with a copy MISSING looks exactly like three correct implementations until somebody counts.

  There is now one seam every branch goes through, which fixed two more divergences on the way. **A stale
  response no longer clears the spinner** belonging to the fetch still running for the file on screen — the
  image branch used to, leaving a pane with no spinner and no content. **A stale FAILURE is no longer
  reported**, because one file's 403 on a different file's pane cannot be acted on, and the file it is about
  is not the one being looked at. And the object URL is now allocated only for a response somebody is still
  waiting for, rather than created before the check and then dropped or released.

- **A queued upload went to whichever folder was open when its turn came, not the one it was dropped on.**
  The queue uploads one file at a time, so the gap between dropping a batch and starting a given file is as
  long as everything ahead of it. The destination was read at the moment each upload STARTED — so queueing
  twenty files and then opening another folder sent the remainder there instead, with a `done` row claiming
  success and the file nowhere the person looked for it. Each row now remembers where it was dropped, and a
  retry uses that same destination rather than wherever you are standing when you press it.

  Two rules that had no test also gained one, both found by mutating the code rather than by reading it. A
  batch dropped WHILE an upload is running now provably joins the queue instead of starting beside it — the
  one-at-a-time rule held within a batch and nothing checked it across two. And retrying a row that did not
  fail is provably a no-op: an upload is a REPLACE that drops the file's conversion chunks, converted
  Markdown, extracted images and generated description, so uploading the same bytes twice is not harmless.

- **Arrowing quickly through a folder of images could show the wrong one, and leaked a blob each time.** An
  image or PDF preview fetches the file and wraps it in an object URL. `openPreview` releases the current URL
  synchronously and then starts the fetch, which resolves later — so moving from A to B before A's response
  arrives gave this order: release nothing (A has not resolved), start B, **A resolves and takes the pane**,
  B resolves and overwrites it. A's blob was then unreachable and never released, and in the gap between the
  two responses A's image was on screen under B's name.

  Both halves are invisible in the way this page's resources always are: a leak reports nothing and lives as
  long as the tab, and the wrong image looks like a slow load that settled.

  The spreadsheet preview had guarded exactly this since it was written — *"fast arrow-nav moved on"* — and
  the image/PDF branch, the only one that ALLOCATES something, did not. One rule, two implementations, and
  the weaker one where being wrong costs more than a stale table. Both now go through one function that
  checks the selection before binding, and releases the late URL rather than dropping it: it was created a
  line earlier, so returning without releasing would have traded a wrong image for a certain leak.

  Found while preparing the preview for extraction, by writing the cases the tracker said were missing —
  including two that PASSED and are worth keeping anyway: navigating away releases the URL (nothing calls
  `closePreview` on the way out), and opening a second preview releases the first.

- **A folder whose listing failed showed the PREVIOUS folder's files under the new folder's name.** Open a
  folder that cannot be read: the path said `root / docs`, the table listed the files of `root`, and nothing
  anywhere said the listing had failed. An operator was reading one directory's contents labelled as
  another's — the kind of wrong that gets believed.

  **Both halves were defensible, which is why it lasted.** The failure WAS recorded; the file list renders
  that message in place of its "this folder is empty" state, so it can only appear when there are no rows —
  and a failed navigation left the previous folder's rows sitting there. Neither piece looks wrong on its own.

  The rows are cleared now, so the message and its **Retry** appear, and the retry loads the folder named in
  the path rather than the one whose rows have gone. **A failed background refresh still keeps its rows** and
  marks them not-current: a lost request during an ingest must not blank a list that is fine, which is a
  separate rule with its own bug behind it.

  Found by reading a screenshot while verifying the tree's new failure state, not by any assertion — and the
  assertions came after, one for each half, because a fix that cleared on refresh too would trade a visible
  defect for an invisible one.

- **Clicking a folder in the file tree listed that directory twice.** One gesture, two identical
  requests: the page loaded the folder for the main listing, and the sidebar loaded the same path again for
  its children — same URL, same moment, every time a folder was opened. The listing the page fetches already
  contains the directories the tree wants, so the second request bought nothing and doubled the cost of
  browsing on the one page an operator clicks through most.

  The tree is fed from the listing now, and the sidebar issues no request of its own. A collapse and a
  re-expand still cost nothing at all, because the children are already there. A folder waiting for a
  listing that never arrives — you clicked it and then went somewhere else — stays waiting rather than
  filling with the other directory's contents.

  **The order was the whole reason this waited**, and the entry below is the other half. The duplicate used
  to be the only thing that put a failed expand on screen — the tree had no error state, so removing the
  request first would have made a folder that would not open genuinely silent. The tree got its own message
  first, and a failed listing now feeds that message instead of the vanished second request.

- **The file tree had no failure state at all, and a folder that would not open said nothing.**
  `expandTreeNode`'s error branch reset the spinner and left the node closed: the caret sprang back and that
  was the whole message, on a page where every other load reports itself (`loadError`, `refreshFailed`,
  `spacesError`).

  An operator did see something — **by accident.** Clicking a folder fires two identical requests, and the
  second one put the error on the listing beside the tree. That accident is why the order matters and why this
  is not the same change as removing the duplicate: taking the second request away first would have made a
  failed expand genuinely silent. The duplicate is filed as `G-13` and can go now.

  The reason appears in red under the folder that refused, and clicking it again retries. Per node rather than
  one banner, because a failure belongs to the folder that could not be opened — a single message would leave
  an operator with two collapsed folders and no way to tell which one refused. It is cleared on every attempt,
  so a folder that failed once and then worked does not keep a stale message under its children.

  **And a root listing that fails is a failed tree, not an empty one.** That one cannot be a per-node message,
  because there is no node to hang it on: the tree is empty either way, and a space whose folders could not be
  fetched looked exactly like a space with none.

  **Verified by looking**, on an isolated instance with the failure injected, at both states — which is how a
  second defect turned up that no assertion was going to find: a failed NAVIGATION shows the previous folder's
  rows under the new breadcrumb, because the listing renders its error inside the table's empty state and the
  old rows are still there. Filed as `G-14`.

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

- **A translation key defined twice used the wrong one, silently.** `JSON.parse` keeps the last of two
  identical keys and reports nothing, so the file parses, the key count looks right, and the reader sees the
  other definition's text. A check now reads the locale files as TEXT rather than as parsed objects, because
  a parsed object cannot answer the question — which is exactly why the duplicate survived being added.

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

- **Fourteen source files held a stray carriage return, so git treated them as BINARY and a pull request
  touching one showed the whole file as rewritten.** Git decides per file whether it holds text, and a
  carriage return that is not followed by a newline makes it answer no. A binary file gets no line diff and
  no line-ending normalisation, so a two-line import change arrives as `1 422 insertions, 1 419 deletions`.

  The noise is not the damage. The damage is that a real change inside such a file is not reviewed, because
  nobody reads a wall of unchanged lines — and `git diff` on the working tree shows nothing useful either,
  so the state conceals the one tool you would investigate it with.

  The cause is a single regex idiom, used to insert an import line after a file's first import: matching
  the line with `[^\n]*`. On a CRLF working tree that class matches up to and INCLUDING the carriage
  return, because a carriage return is not a newline; the replacement then appends its own line ending, and
  the file holds `\r\r\n`. The class has to be `[^\r\n]*`.

  Two of the fourteen — `api/spaces-reembed.ts` and `mcp/tools/search.ts` — had been on `main` since an
  earlier session, from the same idiom, and were invisible for exactly the reason above: the commit that
  did it looked like a formatting pass. Repairing those two is why two files in this release show as fully
  rewritten; they are returning to newline-only endings and nothing in them changed.

  `no-source-file-carries-a-lone-cr.test.js` holds the rule. It scans the working tree rather than the
  committed blobs: reading every blob costs a `git show` per file, and by the time the bytes are committed
  the diff is already unreviewable.

- **A mermaid diagram in a markdown preview was rendering unstyled, and had been since the preview was
  split out.** Its rule sat in the page's stylesheet while the diagram is drawn inside a child component —
  and a page cannot style into a child's template, let alone into content that child binds with
  `[innerHTML]`. So the two things the rule does, centring the diagram and capping its width, did neither.
  A wide diagram overflowed its column.

  It looked like a slightly wonky diagram rather than a missing stylesheet, which is why it survived the cut
  that moved `.preview-body img` and `iframe` to the renderer and left this one behind. It is now
  `.md-rendered ::ng-deep .mermaid-diagram`, beside the other rules that reach the same content, and the
  fix was read on a screenshot: the diagram is centred and the SVG is width-capped to its container.

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

- **The guide pages now say what the code does — about forty corrections across eleven pages** (`Q-4`,
  the documentation bundle of the guideline audit). No route, parameter or default changed; every
  correction was checked against the source rather than against another page.

  **The one a peer implementer would have lost data to.** File metadata became the sixth replicated
  record family, and `docs/sync-protocol.md` documented five: no rows in either endpoint table, absent
  from both phase blocks, missing from the batch body. A peer built from that page serves no file
  descriptions, tags or link arrays and drops them on arrival — and because the content hash covers all
  six collections, its root then disagrees permanently over data that is not different. Links were in the
  same state, including a missing key on the deletion response, so a link deletion never propagated.

  **Two claims were the exact reverse of the code, and are now written as corrections rather than quietly
  swapped.** `applied: 0` on a deletion push was documented as proof that the peer already had everything;
  the receiver counts every element that passes a shape check whether or not it stored anything, and
  discards the rest silently — so a number short of what you sent means that many were thrown away, and
  zero means all of them were. The page then told you to prune on it. And `strictLinkage` was documented
  as OFF by default when an absent setting means ON, which made every example below that note look as
  though it would work as written.

  **Two capabilities were documented as absent.** The integration guide told an integrator there is no
  cascade delete and that *"probing for a spelling that works will not find one"* — thirty lines above the
  section describing it, and it is why the person who asked for the feature tried four spellings before
  writing the workaround by hand. And `network-types.md` said no mechanism can delete data on another
  member's instance; the wipe vote is exactly that, and on two of the five network types one member
  carries it.

  **Two controls an operator can grant were described on no page at all:** **Instance administrator** and
  **May create new spaces**, both in the token create dialog, which the guide described as asking for
  three things. The rights matrix has four areas and the guide named three while telling you to *"set all
  four cells"* — **Data quality** appeared nowhere.

  The rest are screens that had moved on: a permission pill *"colour-coded by privilege"* that is now a
  bar chart, one pencil where there are two, a cron field in a dialog that has none, a space picker on a
  toolbar that never had one, eight Brain tabs where there are nine, two About cards where there are four,
  three media classes where there are four — so turning off the three named left Text running — and five
  sidebar entries under labels they no longer use, with two missing.

  Where a correction describes a DEFECT rather than a stale sentence, it says so and names the tracker row:
  the file download does not get the transfer budget it is passed, the batch ingest accepts six families
  and reports five, and `minScore` is applied after the cut to `topK` rather than before.

- **Two more safety checks were looking at part of what their titles claimed** (`Q-5`), found by turning the
  rule the previous change added into a search rather than waiting to trip over the next one. Nothing an
  operator can observe changes; the code both check is correct.

  One says *"every per-type count is reported back"* and looked at four of the six kinds of record a sync
  carries. The two it skipped **should** be skipped — the count is about a record breaking the rules its
  type declares, and neither of those two has a type to break rules from. That was right and unwritten, so it
  read as an oversight rather than as a decision, and nothing would have noticed if it stopped being true.

  The other says *no route reinvents the permission rule for itself* and read three files out of eight in
  that folder — including none of the three added most recently. It now reads the folder, so the next route
  somebody adds is covered on the day it appears, which is exactly when a copy of that rule would be written:
  whoever adds one copies the nearest existing route.

- **Three safety checks were passing while looking at part of what their own titles claimed** (`Q-5`). None
  of them was wrong about the code it did check, and the code they all guard turned out to be correct — so
  nothing here changes what the product does. What changes is that these three would now notice.

  **Two sync checks said "every incoming record type" and looked at four of six.** When one instance sends a
  record to another, the receiving instance validates it against a description of what that kind of record
  may contain. There are six such descriptions. Both checks — one making sure a record marked *never make
  this searchable* keeps that mark on arrival, the other making sure a search index built by somebody else's
  model is never accepted as ours — looped over a hard-coded four.

  The one they both skipped is **file metadata**, which is the type that needs the first check most: a file
  has no type schema to fall back on, so the mark on the record itself is the only switch there is. It
  carries the mark correctly today and has never carried a foreign search index; the checks simply were not
  the reason.

  **This project's own notes already record this exact failure being paid for once**, in a different check,
  which is why the fix is a derived list rather than a corrected one: the descriptions are now read out of
  the code that defines them, so a seventh kind is covered the day it exists. The one legitimate exemption —
  a link record, which is two ids and a label and so has no text to make searchable — is now written down as
  an exemption with its reason, instead of being absent from a list.

  **And the check that guards the next-change plan against going stale looked for the rarer symptom.** It
  refused a plan naming a pull request that had already merged. The plan it was watching named no pull
  request at all: it described nine items that shipped about twenty pull requests earlier, and the check
  reported clean every run in between. A plan is written in the project's own item ids, so those are what it
  now reads — at least one has to be work the queue still holds.

  Also corrected in the same sweep, each against the code: the integration guide told an integrator that a
  token's pre-4.0 permission fields *"are still honoured"* — nothing reads them, and a token arriving with
  no permission matrix now reaches nothing at all; the same page said sending `readOnly` or `admin` when
  creating a token *"still does exactly what it always did"*, twenty lines below a table correctly saying
  both are refused; the hosting page repeated the first of those; and a comment heading in the sync code
  still read *"why the legacy fallback stays"* directly above the paragraph explaining that it is gone.

- **Characterization tests for the four space wipes, before they become one.** `bulkDeleteEntities`,
  `bulkDeleteMemories`, `bulkDeleteEdges` and `bulkDeleteChrono` are the same thirty lines four times (`R-4`),
  and before this the only assertion on any of them was in `face-label-cascade.test.js` — which covers the
  ENTITY one incidentally, because face labels are what that file is about. The tombstone behaviour of the other
  three, which is the entire point of a wipe on a replicated collection, was asserted nowhere.

  A wipe is not a delete: it is a delete plus one tombstone per document, because a peer holding those records
  has to be told they are gone. A wipe that empties the collection and writes no tombstones is one the next sync
  cycle silently UNDOES, record by record, from the peer's copy.

  **The pass found that the four are not identical**, which the tracker row had wrong: it said the differences
  were webhook emissions, and none of them emits a webhook. The entity wipe also clears every face label in the
  space — wholesale rather than by id list, for the reason its own comment gives — and the memory wipe orders
  its tombstone range newest-first. An extraction treating the four as the same drops the first of those, and
  what is left behind is a file-meta record pointing at an entity that no longer exists.

  Twenty cases against a real MongoDB, and all five mutants died: the dropped cascade, the wrong tombstone type,
  no tombstones at all, the lost empty-collection early return, and one seq reused for every tombstone. Two of
  those mutants reported NO-OP on the first run and proved nothing — the working tree is CRLF, so a multi-line
  search string written with a bare LF matches nothing while looking exactly like a pass.

  Nothing in the product changed.

- **A third gate was decorative on the machine it runs on before pushing.** The check that every promise
  of a whole record also states its price found the paragraph around that promise by searching for a blank
  line as `

`. This repository checks out CRLF on Windows, where a blank line is `

` — so the
  search missed, the window silently widened to the WHOLE FILE, and a price written anywhere in the
  document satisfied a promise anywhere else. Exactly what the check's own note says it must not allow.

  So it was real in CI and inert locally, and it caught a defect introduced in this same change: a rewritten
  paragraph promising whole records with no mention that the graph is what fills the budget. Both fixed, and
  the window is mutation-tested — removing the price now fails locally, which it could not before.

- **Two gate assertions could not fail, and two more required a description that was false**
  (`Q-1.2`–`Q-1.4`). Found by the guideline audit, and this is the class that matters most, because a
  check that cannot fail is worse than no check: it is counted as protection.

  **The two that could not fail** guarded the `recall` tool's response documentation. One demanded a
  response field called `complete`. There is no such field — the record cap became a byte budget releases
  ago, and the spill is `remainder`, written only when the caller asks. The assertion passed anyway, on
  the word appearing in *"its complete `_graph`"*. The other asked, in its own failure message, for *"a
  size cliff rather than a gentle limit"* — and was satisfied by the schema saying **"it is a slope now
  rather than a cliff"**, the opposite claim, because that sentence contains the word `cliff`.

  The field names are now **derived by calling the function that builds the envelope**, so a field added
  or renamed there arrives in the gate without anyone remembering. A hand-written list is what rotted.

  **Widening that gate to `find_similar` found a live wrong promise.** It was scoped to `recall` alone,
  which is how the tool that returns the SAME envelope came to document a `complete` field holding a
  download for the full set. A caller waited for something nothing sends, never set `remainderDump`, and
  never learned `nextSkip` exists — three ways to reach the rest of a truncated answer, and the
  documented one was the one that does not work.

- **Two gate docblocks described their own fixed defects as current**, each contradicted by assertions in
  the same file. One said `update_chrono` offered *"no way at all"* to remove a property, ten lines above
  a test titled *"and chrono really has deleteFields now, on BOTH doors"*. The other opened by saying
  three of the four deletes never refuse, while its body comment says *"The asymmetry this block was
  written for is GONE"* and asserts the refusals.

  A reader who stops at a header — which is what a header is for — planned around a limitation that was
  not there, and wrote no handling for a refusal they will get. Both corrected, and both keep the part
  that is still true: `tags` really do replace on a memory and merge on an entity, and `delete_edge`
  really is the one that cannot be blocked, because an edge IS the link.

- **The working-order gate found three of its rows by NUMBER, so a renumbered checklist lost checks in
  silence.** It located the tests row with a literal `2`, the CHANGELOG row with `6` and the guides row with
  `7`. Write the checklist with nine rows — the natural thing when a job has more than seven things worth
  attesting — and `7 full suite` lands where the guides check looks, while whatever happens to be row 2
  lands where the tests check looks.

  Worse, a row that simply was not there answered `undefined` and every rule reading it then skipped itself.
  A checklist with no guides row passed the guides check.

  **Found by writing a nine-row checklist, and only because two of the three complained at once.** A
  numbering that lined up differently would have passed with rows unread and nothing said. The rows ARE the
  attestation this gate exists for, so losing two of them quietly is the gate reporting on something it
  never looked at.

  Rows are now found by NAME — `plan`, `tests first`, `CHANGELOG`, `guides` — and a checklist missing any
  of them fails outright, which is what makes "absent" distinguishable from "empty". Measured both ways: with
  a seven-row checklist whose last row is not the guides row, the gate as it shipped says nothing and the
  fixed one says *"has no ticked row for: guides"*.

  `tests first` rather than `tests`, because row 4 says "those tests pass" and attests something else. And
  the body is captured to the next row rather than to the end of the line, so a reason that wraps survives —
  the guides row's reason usually wraps, and it is the row whose reason has to be read.

  This also removes the reason to keep the checklist at exactly seven rows, which was a constraint on the
  writing rather than on the work.

- **The tracker gate said "every open item is indexed" while an in-progress item sat unindexed.** The fix one
  change earlier gave `todo-open-items.mjs` a single definition of what an item id looks like and rewrote
  three patterns to use it. **Five more copies were in `todo-consistency.mjs` — the module that imports
  it** — and the shape of that miss is the thing worth keeping: a sweep for the copies inside the file being
  fixed reports clean while the same rule stands unfixed next door.

  Two of the five changed behaviour, and the worse one was silent. **Rule 2 re-implemented `openItems`**
  rather than calling it, with a parser weaker in two ways. It matched `[ ]` and not `[~]`, so marking a
  row in progress while its PR was in flight removed it from the check — the honest bookkeeping act made the
  gate cover less. And its id pattern had no notion of a sub-id, so `G-3.1` read as `G-3` and was then
  satisfied by the PARENT's row in the queue.

  That is a false green on the rule the release cadence hangs on: *"cut the tag when the ordered queue is
  empty"* means an item the queue never mentions makes "empty" a statement about one file rather than about
  the work. Measured rather than argued — with an unindexed `- [~] **G-9-7 …**` planted in a tracker, the
  gate as it shipped answered ✓ and the same gate now answers ✗.

  The other one failed loudly, which is the only reason any of this was found: the working-order plan row
  read `G-3.2` as `G-3` and refused a job the queue did hold. Rule 2 now shares the one item parser, and
  two named helpers replace the remaining copies — including an id that is now ESCAPED before it becomes a
  pattern, which sub-ids made load-bearing: interpolated raw, `G-3.1` is a pattern whose dot matches any
  character, so a queue holding `G-3x1` would have satisfied it.

- **The tracker gate could not see a numbered sub-id, and read one as its parent.** A decomposition row was
  broken into numbered steps — `G-3.1` under `G-3` — so the queue shows what is left of it. Every rule in
  `todo-consistency.mjs` then went quiet about those rows, and each went quiet differently, which is what
  made it worth a test rather than a one-character edit.

  The index row matched **nothing at all**, so the rule that checks a queue row against its home file simply
  skipped it: no failure, no warning, one fewer row checked. In a tracker the item matched the **parent** —
  `G-3.1` read as `G-3` — and that is the worse half, because the same rule then found the parent declared,
  ticked the row, and reported a queue whose steps nobody had confirmed existed.

  The pattern was written out three times, once per rule, which is this repo's signature defect arriving
  inside the script whose job is to catch it. One definition now feeds all three, as that module's own header
  already argued for. The older `- [ ] **A-1.**` shape still reads as `A-1`: a digit after the dot continues
  the id, anything else ends it.

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

### Security

- **A token with no permission grid reached every space. It now reaches none.**

  Two places decided what a token could see, and both had the same fallback: if the token had no
  per-space grid, fall back to the list of space names that older versions used — and treat an EMPTY list
  as *everything*. That list stopped being stored on tokens in 3.1, so it was always empty, so the
  fallback always meant unrestricted.

  **Nothing could reach that fallback**, which is why it was never seen: every token has a grid. A new one
  gets it when it is created, an old one gets it derived at startup, and a single-sign-on session builds
  one from its claims on every request. That made it a branch nothing exercised — and one that would have
  handed over the whole instance if anything ever had.

  **No fallback and no backwards compatibility** (owner's call). A token with no grid is refused
  everywhere, which was already described in the code as the safe direction; what has changed is that
  there is no longer any token it would wrongly refuse.

  You will notice nothing. This closes a hole that could not be reached rather than changing what a
  working token can do.

### Internal

- **The GitHub Release for a big version is now abridged rather than refused.** Found the expensive way,
  cutting this one: the tag was pushed, both registries took the image, and the very last step — the one
  that creates the Release page a person reads — failed outright, because GitHub caps a release body at
  125 000 characters and these notes are 335 002.

  **Every release before this fitted**, so nothing had ever tested the other end. The script had a check for
  notes that are too SHORT — a version announced with nothing said about it — and none for too long. A major
  is where that breaks, because a major carries everything since the last one.

  The Release now shows as much as fits, **cut between entries and never inside one**, and says so at the top
  as well as the bottom: how many entries of how many, and a link to the full notes in the changelog at that
  exact tag. Told only at the bottom, a reader who stopped halfway would take a window onto the notes for all
  of them.

- **A comment that told a future reader to change a documented parameter, on a reason that was wrong.**
  Nothing an operator or integrator can observe has changed — no route, tool, parameter, default or
  stored shape — and the line is here because a source change with no user-facing effect still earns one.

  `direction` narrows stored edges and never links. Two places in the source explained that by saying a
  link is an array holding one orientation, and that the link-records migration would give links two ends
  and force the question to be decided again — *"a scan gaining a direction parameter is the migration
  arriving, not a regression"*.

  Both halves were wrong. Links are already records on a converted space, and the array shape expresses
  both readings anyway — the traversal implements both, either way round. So the storage was never what
  made `direction` meaningless. What does is the reason the guide and both tool schemas already gave: the
  two ends of a link are different KINDS of thing, so its direction is implied by where you started.

  The stale half was an instruction rather than a description, which is why it is worth an entry: it
  pre-authorised a change to a documented parameter and told the reader to distrust the check that would
  have stopped it.

- **The notes for this release are grouped by subject instead of by the order the work happened** (`C-1`),
  and a check keeps them that way. Nothing in the product changed; what changed is that this section is
  readable.

  It had grown to 4 303 lines under **54 headings** — twenty separate *Fixed* blocks, eighteen *Changed*,
  seven *Added*. That is what appending produces: every change added its own block at the top rather than
  merging into the one already there, and each of those was individually correct. The cost lands on whoever
  reads the notes: *"what changed about sync?"* meant reading all 4 303 lines, because sync sat in twenty
  places. There are now six headings, one per kind, and entries about one subject run together — auth,
  sync, brain and search, files and media, the UI, operations, then gates and tooling.

  **No entry was reworded, dropped or merged** — every line of every one of the 212 is byte-for-byte what it
  was, checked as a set before and after. Only headings and blank lines moved.

  A new gate holds the heading structure of the section that is still being appended to: one `Added`,
  `Changed`, `Removed`, `Fixed`, `Security` and `Internal`, in that order, and no near-synonym beside
  them — `### Fixes` next to `### Fixed` would pass a uniqueness check and rebuild the same pile. Tagged
  releases are left exactly as published. Grouping entries by subject is judgement, so no gate can hold it;
  that half is a release step now.

- **The six record types that replicate are now listed once, and both directions of a sync read that
  list** (`A-12`). Nothing an operator can observe changed — no route, no setting, no stored shape — and
  the entry is here because it is the kind of change that hides a defect if it goes wrong.

  They were written out twice, once for the pull and once for the push. Adding a seventh type meant six
  edits in two places, and nothing fails when one list gets it and the other does not: it builds, it runs,
  and one direction quietly ignores a whole kind of record. That already happened once — when file
  metadata became the sixth type, it was missing from three separate lists, and every omission was silent.

  The list lives in its own file rather than inside the sync engine, because which types replicate is a
  fact about replication and not about that loop — the integrity hash, the ingest checks and the retention
  sweep each hold an opinion of the same set, and each has been wrong about it at least once.

- **One row of a network's member list is now its own component** (`N-2`). The Networks settings page
  looks and behaves exactly as it did; what changed is that the block of markup describing a single peer —
  its id, its sync direction, the two warning badges, the endpoint link and the remove button — moved out
  of the page into `network-member-row.component.ts`, with the four style rules that only that markup used.

  It was owed. Every new fact we learn how to show about a peer lands in that same block — the
  version-refusal badge was the second one in a year — so the page grows every time, and the page is where
  the network-level state lives. The size ceiling this repo keeps on large files had been raised for that
  badge; this pays the raise back rather than fitting under it, and the page is now 52 lines below where it
  stood before.

  The rule that guards those ceilings gained the state it was missing. It could record a raise as *queued
  for a split* or as *not worth splitting*, and had no way to say *split, and the size is back down* — so a
  finished decomposition had to be filed as one of the two things it was not. It can now say so, and unlike
  the other two that claim is checked against the file's actual frozen size, because it is the only one of
  the three with a number behind it.

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

- **The guideline sweep that gates this release is finished: Q-5 is complete.** It re-checked everything
  merged since the previous audit against the places this project claims to be true: the two APIs, both
  guides, the operator's pages, the project's own rules, and the checks that are supposed to stop each of
  those going stale.

  **It ran in six rounds, and only the first found something that had cost anything.** A record arriving
  from another instance could bring that instance's deletion schedule with it, so an operator keeping data
  for a year could lose it after a peer's week — silently, and indistinguishably from their own policy
  working. Everything after that was a claim that had outlived its truth.

  **The pattern worth naming, because it accounts for most of what was found:** a sentence that was correct
  when it was written, sitting somewhere nobody re-reads. A safety check whose title claimed more than its
  body looked at, five times over. A permission rule fixed in two places and missed in two more. A comment
  telling the next developer to remove something that must never be removed. One explanation of a removed
  fallback still alive in six files, each of them right on the day it was written.

  **Nothing an operator can observe changed after round 1.** The remaining rounds tightened the checks that
  are supposed to catch these, and wrote down the shape so it is looked for rather than tripped over — which
  is how the last round found two more, and how the follow-up sweep it produced came to be scheduled rather
  than assumed complete.

- **The way this project's safety checks were going wrong is now written down as a rule of its own**
  (`Q-5`). Nothing an operator can observe changed. It is here because the same failure appeared **four
  times in one audit, in three unrelated parts of the codebase**, and it had already been recorded once — as
  a footnote to a single incident, which is exactly why it kept happening.

  The shape: **a check whose title is a claim about everything, whose body looks at part of it.** Both are
  written by the same person on the same day, and the title is the half everyone afterwards believes.
  Nothing ever contradicts it, because a check that passes is evidence of nothing in particular.

  The rule it becomes has three parts, and the third is the one that gets skipped: work out the set from the
  code rather than listing it; assert the *rule* rather than the place it currently lives, so a fifth place
  written next year is covered; and **see the check fail before believing it** — on the part it newly
  covers, not the part that was already checked.

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

---


---

## Earlier releases

- [3.x](changelog/CHANGELOG-3.x.md) — 6 releases
- [2.x](changelog/CHANGELOG-2.x.md) — 17 releases
- [1.x](changelog/CHANGELOG-1.x.md) — 10 releases
- [0.x](changelog/CHANGELOG-0.x.md) — 18 releases
