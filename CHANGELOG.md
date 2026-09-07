# Changelog

All notable changes to Ythril are documented here. This file covers the **current major series**;
earlier majors are archived under [`changelog/`](changelog/) and linked at the bottom.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **The Query panel's answer is a card, its records fold, and the Search button is where you look for it.**
  Owner-directed, 2026-09-07. Three things at once, because they are one complaint:

  - **A long record is a few lines until you open it.** Every result renders as a JSON tree — a nested part
    starts collapsed with its size beside it (`{…} 4 keys`, `[…] 3 items`), each level has a copy button that
    copies that part alone, and *Expand all* / *Collapse all* sit in the card header. It replaces a
    pretty-printed dump per result, which is unreadable the moment a record carries a properties bag.
  - **The answer sits in its own card**, with a header saying how many results and how big the answer was.
    There is no longer a row holding one button wedged between the request and the answer.
  - **Run and Clear are on a sticky bar at the top right**, so a parameter changed at the bottom of a long
    form does not send you back up to run it.

  A **JSON** view beside the rendered one shows the whole response exactly as the API returned it — the
  count, the truncation flag, the budget figures and every graph subtree. That is what an assistant calling
  the same search receives, and this panel is where a search is tried before it is sent by something else.

  The tree walks only into what is OPEN, so a hundred elements behind a closed caret cost one line rather
  than a hundred. That is what keeps it usable on the answers the byte budget exists for.

- **The link conversion can be previewed, and the guides now say what it touches and how to undo it.**
  `npm run links:convert -- --preview` reads and writes nothing: per space, how many records carry each
  connection list, how many entries those lists hold, and how many link records already exist. Run it again
  after converting and only the link count has moved.

  Reported by an operator who had not run the migration and said exactly why — they could not see its scale
  beforehand, the `400` that follows lands on some other service's next write, and nothing anywhere said
  whether it could be undone. *"An operator who believes a step is irreversible defers it, which is what we
  are doing."*

  **Three of those four answers already existed in the code and nowhere a reader would find them**, and they
  are now on both the integrator's and the operator's page:

  - **It is per space, and one space is a real pilot.** Converting a named space deliberately does not set
    `completeLinkage`, so links are created and nothing starts being refused.
  - **The prerequisite is therefore "before you MARK", not "before you convert".** Between the two you can
    find your remaining array writers at your own pace — including agent sessions, since `create_chrono` and
    its siblings accept `entityIds` directly.
  - **The marker is reversible.** It is an ordinary space setting; turn it off and array writes are accepted
    again. The link records stay, because they are not what it switches.

  The preview is a separate function from the conversion rather than a dry-run flag through it, and a gate
  holds it to an allowlist of read calls — a preview sharing the writer's path is one forgotten branch away
  from writing, and a preview an operator does not trust is worse than none.

- **A slot can ask a thinking model to think less.** Each model slot gains a **Reasoning effort** setting,
  sent as `reasoning_effort` on the OpenAI-shaped request. Blank means the field is not sent at all, which is
  what every installation did before this existed.

  **The case it was reported from, with the number.** A 27B model answers, and takes **3 minutes 32 seconds**
  at its own default effort — nothing misconfigured, it is thinking. Three callers around it were failing at
  three different deadlines against that one endpoint, and none of them could ask for less, so each had only a
  timeout to fail on. A longer budget is not a fix for that shape.

  **Check which values your model accepts.** Only `none` is handled by the inference server (it turns thinking
  off outright, whatever the model). `minimal`, `low`, `medium`, `high`, `xhigh` and `max` are passed to the
  model's own chat template, and **a template that does not know a value rejects the request** — the server
  starts normally and then fails every call. Qwen3.8 accepts `low`, `medium` and `xhigh` and errors on
  `minimal`, `high` and `max`; on it, `medium` cuts the wait by about a third.

  Where a second model is available, pointing the slot at one that does not think is still better than asking
  one that does to stop.

  **Both per-slot settings are now on the Models page**, on each model's own card: the call budget, which had
  been config-only since it shipped, and the reasoning effort beside it — the effort only on the cards whose
  requests actually carry it, because a control wired to nothing reads as configuration that took effect. An
  empty budget means the built-in default, shown as the placeholder; an empty effort means nothing is sent.
  Infra pins a slot as before, and both controls lock together.

### Changed

- **A release note too long for GitHub now leads with what breaks, instead of with whatever came first.**
  Breaking entries are lifted above everything else, all of them, and the notice at the top says how many of
  how many are shown. The paragraphs a release opens with are kept whole; the rest follows in its original
  order.

  Reported by an operator who read the abridged 4.0.0 notes and missed the largest change in the release —
  the link system, which changes what happens to every caller writing `entityIds`. They found it because
  their own owner asked, not because the release told them. **The finding is the truncation, not the
  omission:** 81 entries of 227 were shown, chosen by nothing but document order, and no amount of raising
  the budget fixes a selection rule that is *"whatever came first"*.

  What counts as breaking is read out of the text rather than kept in a list: the word itself, in either
  spelling this changelog has used, or membership of the `Removed` section — because a removal breaks a
  caller whether or not its author happened to write the word.

  A release whose notes fit is published unchanged, as before.

- **The guides now say what reranking COSTS, which is the number that decides whether you get it.** The
  cross-encoder reads your question together with each candidate passage, so its work tracks the total TEXT
  of `topK × candidateMultiplier` candidates rather than their count. On records of several kilobytes that is
  seconds per result — measured on a live instance, one result took 5.09 s and four took 17.79 s, while
  another instance on the same server and model reranked a comparable set in 2.83 s. The only difference was
  how long the records were.

  Nothing about the behaviour changed. What was missing is that the failure is silent: when the budget
  expires the search still answers, ordered by meaning alone, and looks entirely reasonable. At the default
  multiplier of 4 and the default 20-second budget that puts the ceiling at about four results on six-to-
  nine-kilobyte records, and nobody reports a result that looks fine.

  Covered on all three pages that an operator or an integrator would open for it, including which of the two
  possible deadlines is ours: raising `modelSlots.rerank.timeoutMs` past the limit of whatever proxy sits in
  front of the API buys nothing.

- **The question, the JSON filter and the JSON projection are three cards side by side** on Brain → Query →
  Semantic Search. They are the three controls that decide WHAT is searched; the rest of the panel decides
  how much comes back and in what shape. The filter and projection were previously buried below the question
  among the tag and type fields.




- **Every benchmark ingest strategy declares what its corpus may contain, and the instance enforces it.**
  The spaces were created bare: `validationMode` defaults to strict, but with no `typeSchemas` there is
  nothing to validate, so every malformed record was accepted. A missing field then scores low and reads as a
  finding about retrieval rather than as a bug.

- **Linking a record to what it is about costs its ranking nothing** (measured, 199 questions). Three
  strategies in the benchmark folder claimed it cost 1.5 points by prepending linked entity names to the
  fact; `entityIds` never reaches the embedded text. Walking those links is a different matter: at a fixed
  answer budget a `traverse: 2` recall returned 6.0 records where the same query without the walk returned
  19.7. Filed as `F-24` — a caller cannot cap how far one match spreads.

### Fixed

- **Two more copies of a shared vocabulary, both on paths where a copy is expensive.** `edge-id.ts` had its
  own default for an edge endpoint's kind — and that module decides an edge's IDENTITY, so the day the
  default changes an id derived there would disagree with the kind stored beside it, and the two would
  describe different edges while looking like one. The five chrono statuses were spelled out again in the
  sync INGEST schema, where a list two words wrong refuses a status the rest of the product accepts and holds
  the replication watermark on it, and in the bulk tool's published schema.

  All three now read the one list. Nothing behaves differently today: every copy agreed with what it was
  copying, which is exactly why nothing had reported them.

  Found by finishing the file-path half of the gate sweep — four more titles that claimed a whole set
  (*"no door"*, *"nothing writes them out again"*, *"neither door"*, *"every door"*) while reading between
  one and four named files. Two hard-coded counts went with them.

- **The function that flattened a graph into the result list is deleted, not merely unused.** The Query panel
  stopped calling it when the reported bug was fixed — a traversed neighbour arriving in rank order, counted
  in the total, looking exactly like a match — but the function stayed exported, with its own tests keeping
  it alive and a comment in the API service still pointing at it as the thing that turns the tree into rows.

  Nothing in the product called it. What it cost is the next component to go looking for a way to render a
  traversal: the flattener was the obvious answer, it was documented as the answer, and using it would have
  reintroduced the bug in a second place. The behaviour is pinned either way — a spec asserts that two
  neighbours under one match leave one result, not three.

- **Nine gates that asserted a whole set while reading a hand-written list of files now read the codebase.**
  Each had a title claiming *"nothing in `server/src`"*, *"no module"*, *"any route"*, *"every reader"*,
  *"every list function"*, *"no door"* — and a body that looked at between one and five named files, which
  were the files somebody had open on the day it was written. Their sets are derived from `git ls-files` or
  from who imports the thing under test, each with a floor on what it found, because an empty scan passes
  every loop written over it.

  Three assertions carrying an exact call count went with them. A number in a title or an assertion is a
  second copy of a fact the code already holds, and it fails in both directions: a new site is invisible to
  it, and a site that legitimately appears goes red on arithmetic rather than on the rule.

  **One found a real defect.** Three modules in the access layer each kept their own copy of the four
  permission areas — two as arrays, one as a hand-written type — and nothing compared them; one of the three
  is what decides whether a token may touch a space at all. They agreed, so nothing was wrong today. What
  they cost is the day a fifth area is declared, when the copies nobody remembers keep governing access with
  the old vocabulary and the compiler is happy with every one of them. All three now read the one list.

- **The tracker gate compared against whatever `main` pointed at locally**, so a branch cut while that ref
  was behind diffed against an older tree — files the branch never touched read as changes, and the rule
  that every change owes an `[Unreleased]` entry passed on somebody else's commits. Three pull requests
  shipped with no entry that way, each ticking the row, each green. It asks `origin/main` first now.

- **Three modules in the access layer each kept their own copy of the four permission areas**, and nothing
  compared them. Two held the names as an array — including the module that decides whether a token may
  touch a space at all — and a third held them as a hand-written type. All three now read the one list.

  Nothing was wrong today: all four copies happened to agree. What they cost is the day a fifth area is
  declared, when the copies that were missed keep governing access with the old vocabulary and the compiler
  is happy with every one of them.

  Found by making four gates check what their own titles claimed. Each said *"nothing in `server/src`"*,
  *"no module"*, *"any route"*, *"every reader"* — and each read a hand-written list of two to five files,
  which were the files somebody had open on the day it was written. The gate that claimed the whole access
  layer was reading three of its modules; derived from `git ls-files`, it found the other two immediately.

- **A refused save on Media Processing now says what the server said.** Selecting an extraction mode the
  installation cannot serve left the Save button looking inert: the request was made, the API answered with a
  reason, and the page threw it away. An operator hit this against 4.0.0 and spent an hour not knowing which
  field was objecting.

  It was broader than the one form they hit. The bar that renders the outcome sat behind a condition that was
  the literal `false`, so it never appeared — and that bar was the **only** place on the page where either a
  refusal or a confirmation was ever shown. Every card and every pipeline sets both; nothing displayed
  either. The success half mattered as much: with no confirmation, silence meant "saved" and "refused"
  equally.

- **A token that administers every space through the rights FLOOR was refused by the token routes**, where the
  guide promises it a scoped listing. It held `admin` on all four areas with no `instanceAdmin`, and
  `GET /api/tokens` answered `Admin token required`.

  The gate counted per-space rows, and a floor names no space, so it read zero as "administers nothing" —
  while the same rights already scoped that token to every space. **The cost was a daily token-inventory job
  running blind for two weeks**, so an expiring credential lapsed with no warning. The same count hid every
  space-admin tool from that token over MCP, and is corrected with it.

- **The vector-index panel no longer declares every space broken on a self-hosted MongoDB, next to a button
  that would re-embed everything.** `listSearchIndexes` is the Atlas Search API; a replica set running
  `$vectorSearch` natively has nothing behind it, so the call succeeds and returns an empty list — which was
  read as "no index exists". Every space then showed as drifted, in red, each row offering **Rebuild**.

  Reported against a live fleet where recall on those exact spaces returned correctly ranked results with
  real scores. **The danger was the button**: a 79-file re-ingest on that host took embedding from 80 ms to
  2–9 seconds for forty minutes and starved the reranker; fifteen spaces would have been hours of it, on a
  false alarm.

  When not one index is found anywhere on the instance, the panel now says the deployment does not report
  search indexes, and points at the check that actually answers the question — whether recall returns ranked
  results. A single space missing an index among others that have them still reports as missing.

- **The document verify model has its own call budget again — it never actually had one.** `docVerify` was a
  declared slot: it had a default, the admin API accepted it, infrastructure could pin it, and the field
  reference documented it. Nothing read it. The second-opinion pass runs against its own endpoint, usually a
  different model, and was charged to `docVlm` for its budget, its egress permission and its reasoning
  effort — so an operator who raised `modelSlots.docVerify.timeoutMs` because that model is slower got no
  effect and no warning.
- **The Query panel no longer reshapes the answer it shows you.** Records reached by graph traversal were
  appended to the result list as if they were matches — in rank order, counted in the total, and
  indistinguishable from a record that actually answered the question. They now sit under the match that
  reached them, grouped as entities, memories, chrono entries and files, each shown whole with its hop count
  and the link that reached it.

  **Why this is a bug and not a preference:** the panel is where queries are tested before they are sent by
  something else. A request tried there and then issued by an MCP client has to come back the same shape, or
  the screen is teaching a contract the product does not have.

- **A semantic search that matched nothing now says so.** It rendered exactly what the panel shows before
  you have searched at all — nothing — so the natural reading was that the button had not worked. The
  advanced-query side has always said "no documents"; this side kept only the result list, and an empty list
  cannot tell "found nothing" from "not asked yet". An error still reads as an error rather than as no
  matches, because a search that failed did not find nothing, it did not finish.



- **Internal: shell scripts are pinned to LF in `.gitattributes`.** No deployment was affected — the
  committed bytes have always been LF, and a Linux or macOS checkout gets them unchanged. It bites a
  contributor on Windows, whose checkout converts to CRLF, when a POSIX shell then runs that working tree:
  a container bind-mounting it, or WSL. `sh` reads the carriage return after `set -e` as part of the option
  name and the script dies on its first line.
- **The benchmark's own bookkeeping was inside the records it was ranking.** A memory's embedded text is
  built from its fact, tags, description and properties — key and value both — so every benchmark record
  carried `turn D3:1,D3:2,D3:3 speaker Caroline,Melanie statedOn 2023-06-27 turns 5` in its vector. That is
  how a result was joined back to the answer key, not something any deployment would store. It now lives
  outside the corpus.

- **A benchmark rung could be measured before its records were searchable**, scoring 0% for a corpus that was
  fine. An empty embedding queue cannot distinguish "finished" from "not enqueued yet", and only fast ingests
  were affected. The harness now waits until a search actually returns something.

## [4.0.1] — 2026-09-06

A patch for one defect: a schema rule the server would not run rejected every record it was supposed to check.

### Fixed

- **A schema pattern too risky to evaluate was reported as though your data were wrong, and it rejected every
  record of that type for ever.** The ordinary way to write *"one or more of these, comma-separated"* uses a
  repeated group — `^D[0-9]+:[0-9]+(,D[0-9]+:[0-9]+)*$`. The server declines to run a pattern that can
  backtrack exponentially, and said so by answering *"does not match"*: the same answer a value that genuinely
  failed produces. The schema was accepted when it was saved, and nothing anywhere said it had never been
  applied.

  **What to do if you have one.** Such a pattern is now refused when the schema is saved, on `namingPattern`
  as well as on a property, with a message naming the construct to rewrite — a character class usually does
  the same job (`^D[0-9]+:[0-9,:D]*$`). A pattern **already stored** now reports `pattern not evaluated, so
  nothing was checked`, which points at the schema instead of at a record that is correct.

  The safety check itself is unchanged: a stored schema still cannot hang the server on a hostile value.

### Added

- **The benchmark folder publishes measured results, not only a method** (`B-1`). It held a protocol written
  before any result existed and no figure anywhere.

  What is published is the tier that needs no model: for each question the turns the reference answer cites
  are known, a search is run, and the question asked is **whether the FIRST result held them**. Overlapping
  five-turn windows get the first answer right 50.8% of the time and put everything the answer needs into the
  top three 69.3% of the time, against 31.7% and 46.2% for one record per conversation turn. Strategies that
  lost are published beside the ones that won.

  **The ceiling is 85.9%, not 100%,** and the reason is stated rather than left to be discovered: 28 of the
  199 questions need evidence from two conversations weeks apart, which no single record can hold.

  **It is deliberately not the number other systems quote.** Those are end-to-end answering — did the system
  get the question right — and this is whether the evidence was retrieved, so the tier is named everywhere the
  figure appears. Nothing in the retrieval path was tuned to produce it, and the window shape used is the one
  written down before any result was read.

## [4.0.0] — 2026-09-05

**4.0 is the release where a link became a record.**

Until now, two records could only be related if both were entities: an edge's endpoints were entity ids, so a
memory, a timeline entry or a file could be *named* by something but could never be walked to. The arrays that
were supposed to express those relationships — `chrono.memoryIds`, `file.memoryIds`, `file.chronoIds` — were
stored and read by nothing.

Now a relationship is a record in its own right. A search that matches a memory is no longer a dead end: the
walk continues through what that memory names. Graph expansion follows links as well as edges, an edge can say
what KIND each of its ends is, and the scan that refuses a delete can finally see a reference from a memory, a
timeline entry or a file instead of only from another entity.

The six entries that describe it open **Added**, directly below. Everything else in this release is smaller
than they are.

**Breaking, and what to do about each.**

| what changed | what to do |
|---|---|
| `OLLAMA_URL`, `WHISPER_URL`, `WHISPER_MODEL` **refuse the boot** | rename to `VISION_BASE_URL`, `STT_BASE_URL`, `STT_MODEL`. A manifest written for 4.0 also runs on 3.x; one using the old names starts on 3.x and will not start on 4.0 |
| `POST /api/tokens` refuses `spaces`, `admin`, `readOnly` | send `rights`; the refusal names the replacement for each |
| a token with **no rights matrix reaches nothing** | nothing to do — every token gets one at mint, at boot, or per request. Listed because it removes a fallback, not because it should bite |
| `excludeFromVectorSearch` is gone | it is `suppressEmbeddings`, and has been since 3.1 |
| the **MCP SSE transport** is gone (`GET /mcp`) | use `POST /mcp`, recommended throughout 3.x |
| the two `syncSchedule` shorthands are gone | write real cron. An unrunnable schedule is now refused rather than ignored |
| the server-rendered setup form is gone, with `GET`/`POST /api/setup` | use the SPA, or `POST /api/setup/json` |
| a peer's retention stamp no longer sets **your** expiry | nothing to do. If records vanished earlier than your policy allows while syncing with a shorter-retention peer, this was why |

**Docs:** 31 files changed. A size-idempotent re-ingest should `--force` this tag rather than diffing a file
list.

### Added

- **A relationship can now point at any kind of record, not just an entity.** `from` and `to` on an edge take
  `fromKind` / `toKind` — one of `entity`, `memory`, `chrono` or `file` — on `POST /edges`,
  `PATCH /edges/:id`, `upsert_edge`, `update_edge` and both bulk doors. A photo's file record can point at the
  people in it, the party it was taken at, and what happened there.

  Omitting the kind means `entity`, so **every edge you already have is unchanged and nothing was migrated**.
  A file endpoint is the space-relative path rather than a UUID, because that is what a file's id is.

- **Three link fields that were stored but never read now work: `chrono.memoryIds`, `file.memoryIds` and
  `file.chronoIds`.** They have been accepted, validated and replicated since 3.x, and nothing walked them —
  a traverse from a memory did not reach the timeline entry that named it. It does now, on every space.

- **`recall`'s graph expansion follows links, not only edges.** Two records can be related by a stored edge or
  by the `entityIds` a memory, timeline entry or file carries. Expansion followed edges alone, so a space
  whose relationships are mentions — which is most spaces, because mentions happen automatically and edges are
  written deliberately — got an empty graph back from `recall(traverse: n)`.

  ```json
  { "traverse": { "depth": 2, "includeChrono": true, "includeMemories": true, "includeFiles": true } }
  ```

  **All three default to false, so no existing response changes.** A recall's answer is budgeted and a match
  is counted with its whole subtree, so anything admitted by default costs you matches. A linked node arrives
  with its `kind` and the fields that identify it, never file chunk text.

- **A search result that is not an entity is no longer a dead end.** A memory, timeline entry or file that
  matched came back with an empty graph at any depth, and both APIs told you to lift its `entityIds` out and
  traverse from those yourself. With the matching flag on, the walk starts from what the match names.

- **A space converted with `npm run links:convert` refuses array writes and points at the link door.** Sending
  `entityIds`, `memoryIds` or `chronoIds` to a write door answers `400` naming `POST .../links`, so one fact
  cannot be written two ways and then disagree with itself.

  **The fields are still read, stored and replicated — nothing you have is lost**, and a space you have not
  converted is untouched. Records arriving from a peer are never refused, and editing a record that still
  carries a legacy array works as long as the edit does not mention the array.

- **Converting is a speed upgrade, never a correctness prerequisite.** A converted space answers "what is
  related to this?" from indexed link records; an unconverted one keeps walking the arrays. Both answer all
  six link classes, so the three fields above work everywhere immediately.
- **Deleting a memory or a timeline entry can now be REFUSED, and this is the change most likely to reach a
  running script.** In a space with `strictLinkage` on, a timeline entry that lists a memory — or a file that
  lists either — blocks the delete with a `409` naming what refers to it. With `strictLinkage` off, deletes
  still always succeed.

  It always succeeded before because three of the six link fields had no reader, so the reference was stored,
  replicated and invisible — leaving the referring record pointing at something that no longer existed, which
  is exactly what `strictLinkage` is for. `delete_edge` is unchanged: links run from a record to what it is
  about, so nothing can point at an edge.

- **Deleting an entity can take its edges with it, behind a preview and a token.** A `DELETE` on an entity is
  still refused while edges connect it to something, and the refusal now names the way out: call
  `GET .../entities/:id/cascade-preview`, read exactly what would go, and repeat the `DELETE` with the
  `cascadeToken` it returns. `entity_cascade_preview` is the same capability for an agent.

- **A space can restrict which memory TYPES it accepts.** Declaring one or more `typeSchemas.memory` entries
  makes those the allowed set, exactly as it already did for entities, edges and timeline entries. A space
  that declares none still accepts any string, so this can only newly refuse a write where you explicitly
  declared types.

  Both memory type controls become a **select** where a space declares types and stay free text where it does
  not. The column filter still offers declared types plus the values actually present, so a record written
  before a schema change stays findable.

- **A brain says what version it runs, and one too old is refused rather than trusted.** Every instance reports
  its version over member gossip in both directions, and a peer below the required minimum is sent no data and
  accepted from for none. The refusal names both numbers — what the peer runs, and what is required — because
  the person who has to act on it is the operator of the *other* instance, reading it in their own log.

- **A file's metadata now replicates** — its description, tags, properties and the records attached to it. The
  bytes always travelled; what somebody wrote about a file did not, so a file linked to an entity on one
  instance showed the connection in the peer's graph and nothing in the peer's file list.

  Only the authored half crosses the wire, and the write **merges** rather than replaces: each instance keeps
  what it worked out from its own copy of the bytes — size, checksum, extracted text, search vector. A field
  the sender omits is left alone rather than cleared, so a peer on an older build cannot erase a description
  it has never heard of.

- **A file metadata record has a `seq`, which it never had.** It is the ordering primitive replication runs on.
  Its absence was also a live defect with nothing to do with sync: two writers appending to a file's entity
  list had nothing to order them, so one append could silently drop the other.

  Metadata written before 4.0 has none and does not reach a peer until the record is next written.
  `npm run links:convert` stamps what is already stored — idempotent, safe to run twice.

- **The divergence check covers a file's metadata, and only the authored half.** Cover nothing and two
  instances holding different descriptions report themselves identical. Cover the derived fields too and two
  instances that agree about everything anybody wrote diverge for ever over a size in bytes, which teaches an
  operator to ignore the warning. The check is advisory and blocks nothing.

- **Every model slot's call budget is operator-settable.** Only the document pipeline was configurable before.

- **The token list sorts on every column and searches on Label and Spaces.** Spaces sorts by reach rather than
  alphabetically: library-access tokens first, then space-restricted ones, then unrestricted.

- **"What is next to this?" is answered from one definition everywhere.** Five readers each followed a
  different subset of the six link fields — the standalone traverse, the walk inside `recall`, the scan that
  refuses a delete, the ER diagram, and the check sync runs on arriving records. The last had never adopted
  the shared module at all, so a record arriving from a peer had one link field checked instead of six. It
  still only records what it finds: sync ingest is validated, counted and let in.

- **The delete scan compares an edge endpoint's KIND as well as its id.** Matching on the id alone could block
  a delete because of an edge pointing at a different record that happened to share it.

### Changed

- **A request with no authenticated token is no longer read as an unrestricted legacy one.** An empty record
  used to resolve to full access.

- **A token with no permission grid reaches nothing**, on both APIs and at both the space check and the area
  check. There is no fallback left. Every token has a grid, so this should not bite.

- **BREAKING: an entity must have a type.** `POST /api/brain/spaces/:id/entities` refuses a create without
  one. The type selects the per-type schema, so a typeless entity is one nothing can validate.

- **BREAKING: `maxBytes` on `recall` and `find_similar` means bytes.** It counted characters. If you set it
  against a byte budget, it was letting through roughly twice what you asked for on non-ASCII content.

- **A relationship between two records is a record of its own**, in its own collection, written by every path
  that used to write one of the six arrays. `POST /api/brain/spaces/:id/links` is the door, on both APIs, and
  `npm run links:convert` turns an existing space's arrays into records.

- **`completeLinkage` on a space says its links are all records.** A LOCAL setting — never voted, never
  replicated — because it describes what this instance has converted.

- **An edge id is derived from what identifies the edge**, so two peers that independently create the same
  relationship now agree on its id instead of storing it twice. **Existing edges keep their ids and there is
  no migration.** Changing an edge's identity now moves it to the id that identity derives — so the call
  succeeds and your *next* request for the old id is a `404`.

- **An edge label can declare what kind of entity sits at each end, and how many.** A write that breaks the
  rule is refused rather than stored, and the refusal names the label and what it expects.

- **`recall`'s graph expansion is the real traverse**: it narrows by edge label and direction like the
  standalone tool, instead of following everything.

- **`/query` answers within a size budget**, like every other read path.

- **An update refuses what its create refuses.** Eight defects of one shape — a rule enforced on the way in
  and not on the way back. A create no longer silently discards a malformed field; a memory update checks
  that an entity EXISTS rather than only that its id is well-formed; changing an edge endpoint's kind
  re-resolves that endpoint; and a batch write stopped dropping four things its own documentation promised.

- **The refusal that blocks an entity delete now names the direction it checks**, and a `409` carries
  `references` alongside `backlinks` — everything found, rather than half of it.

- **A retention setting meant for timeline entries was accepted on every collection and applied to none.**

- **`ttlDays` works and always did** — the field to read it back was never the one it looked like.

- **A vector never crosses the wire.** A record arriving from a peer is embedded by the receiver with its own
  model. Ranking one model's vectors against another's does not fail; it returns plausible results in the
  wrong order.

- **A memory's and a file's embedding is built from its own content**, not from records it happens to name.

- **A plaintext peer URL is refused where it is ADDED**, on every door, rather than coming back as a `400`
  from the other instance.

- **The text-embedding API key no longer stays in `config.json`.** It moves to `secrets.json` (`0o600`) on
  first boot, like the other provider keys — `config.json` is the file operators copy, paste into issues and
  mount as a ConfigMap.

- **Three legacy env-var spellings are scheduled for removal at the next major** rather than now: breaking a
  documented env var to improve its spelling is not a worthwhile trade mid-series.

- **Four config migrations are permanent, not release tails.** They lift settings written under older
  spellings every time the config is read, and removing them would silently reset those settings.

- **The Search panel can do everything a `recall` call can**, shows the request it would send live with a
  Copy button, and lays every control out across the width instead of hiding some.

- **The README said 31 MCP tools. There are 44** — and it did not mention nine capabilities the product has.

### Removed

- **`POST /api/tokens` no longer accepts `spaces`, `admin` or `readOnly`** (breaking). Send `rights` — the
  per-space permission grid, which has been the real permission model since 2.6 and is what the Tokens page
  already sends. **Nothing changes in the interface.**

  Scripts that mint tokens with the old fields get a `400` naming the replacement for each: `spaces` →
  `rights.perSpace`, `admin` → `rights.instanceAdmin`, `readOnly` → `rights.floor` with read rungs.

  **A token with no permission grid now reaches nothing.** In practice every token has one — minted with it,
  or given one at boot, or derived per request for a login session — so this should not bite. It is listed
  because it removes a fallback that used to treat "no permissions recorded" as "all permissions".

- **The two `syncSchedule` shorthands are gone, and a schedule that cannot run is now refused** (breaking).
  Send cron: `"*/5 * * * *"`. **Nothing to do on upgrade** — a shorthand already in `config.json` is rewritten
  at boot to the expression it always meant, so an existing network keeps syncing at the same rate.

  The refusal matters more than the removal. `syncSchedule` accepted any string and answered `2xx`; if it did
  not resolve, the scheduler logged a line and carried on, so you could set a schedule, be told it saved, and
  have that network never sync again. Both doors now refuse with a `400` naming the format, and a shorthand's
  refusal names the cron it used to mean.

  **One case has no honest translation and is left alone:** a shorthand outside cron's range — `"every 90m"` —
  never resolved on any build, so a network holding one has been on manual sync since the day it was set.
  Those are named individually in the startup log rather than rounded to a schedule nobody chose.

- **`excludeFromVectorSearch` is gone** (breaking). It is `suppressEmbeddings`, and has been since 3.1 — the
  switch is unchanged, only the old name is retired. Sending the old name is now refused rather than accepted.

  **Nothing needs migrating.** Every write since 3.1 has used the current name, and the peer version floor
  added in this release keeps an instance old enough to only know the other one off the network.

- **The MCP SSE transport is gone** (breaking). `GET /mcp` answers `405` with `Allow: POST`. Use one
  `POST /mcp` per JSON-RPC call with an `Authorization: Bearer` header — the recommended transport throughout
  3.x. The `ythril_mcp_connections_active` metric is removed rather than pinned at zero, because a stateless
  transport holds no connections to count.

- **Three legacy media env vars are gone** (breaking): `OLLAMA_URL`, `WHISPER_URL`, `WHISPER_MODEL`. They are
  `VISION_BASE_URL`, `STT_BASE_URL` and `STT_MODEL`.

  **Setting a removed name STOPS THE BOOT rather than being ignored**, deliberately: ignoring it meant an
  instance captioning and transcribing against a built-in default while the operator believed their own
  setting was in force. A manifest written for 4.0 also runs on 3.x; one still using the old names runs on
  3.x and will not start on 4.0.

- **The server-rendered setup form is gone, with `GET`/`POST /api/setup`** (breaking). Use the web interface,
  or `POST /api/setup/json` for programmatic first-run setup — already the documented preference, and it
  returns the admin token as JSON.

### Fixed

**Permissions and tokens**

- **An administrator restricted to certain spaces could not create a token at all**, through the product's own
  Tokens page.
- **SECURITY: the two peer governance relays authenticated the caller and did not authorise them.**
- **Ten routes in the spaces router had no rights classification**, so their reach was enforced and their area
  was not.
- **The admin import wrote arbitrary documents with no validation and no embedding job**, so imported records
  were unsearchable.
- **A per-token rate limit above 300/min could not take effect, and the API said it had.**

**Sync**

- **A peer's retention schedule could delete this instance's records.** A record arriving by pull carried the
  sender's expiry, and the sweep acts on it — so an instance keeping data for a year, syncing with one that
  keeps a week, lost records after a week, with nothing logged on either side. There is no backfill: what was
  deleted is gone.
- **A record marked "never embed this" lost that mark when it synced**, so a peer embedded it and put it back
  into search results.
- **Every suppressed memory was silently deleted by sync, permanently.**
- **A memory's `type` was deleted whenever the memory arrived by push**, and a timeline entry lost the marks
  saying its description had expired.
- **A large file never replicated**, and a cycle carrying only file metadata never finished.
- **One duplicate relationship stopped a peer receiving any further edges, permanently** — and one duplicate
  key stopped a member syncing at all, reported as an unrelated error.
- **A record re-created after a peer deleted it could be refused for ever, silently.**
- **The divergence check reported every space with a retention policy as divergent**, so the one signal that
  means data is really missing was permanently false.
- **Three of the four single-record sync routes stored a peer's record without checking it**, and the one
  schema check that existed sat on the path a peer barely uses.
- **`sync_now` said it does not wait and that an unreachable peer is not an error.** Neither was true.

**Search, records and the graph**

- **A hard-filtered search returned fewer records than it could**, and a flag meant for finding similar records
  did not work.
- **A brain create accepted any field you invented and answered `201`.** A nested property was refused on
  create and stored on update; an update route dropped unknown fields silently; and a `warn`-mode space was
  told nothing about an edit.
- **`suppressEmbeddings` was honoured on exactly one write path and ignored on ten others**, and was silently
  dropped on create on all four record types. Turning suppression on now also removes vectors already stored,
  which is what it always claimed to do.
- **`maxBytes` counted characters** — the parameter, the refusal, the response field and the documentation all
  said bytes.
- **One traverse hop read every edge touching the frontier, with no limit**, on both APIs. The link scans were
  unbounded and unindexed, so following links from `recall` could be very slow, and a bounded scan could drop
  records while the answer claimed the graph was complete.
- **`graphNodes` counted nodes the caller never received.**
- **Timeline, memory and file links were silently missing from the graph view**, and tapping one of those nodes
  opened an empty panel with a blank name.
- **Merging two entities could move an edge onto an end its label forbids**, could write an entity its own
  space would have refused, and **emptied the survivor's face gallery**.
- **Changing a memory's type never validated against the new type.**
- **A property `default` did nothing at all**, and `propertySchemas` was documented as retired while being one
  of the most-read fields.
- **An entity referenced only by a file deleted cleanly**, leaving the file pointing at nothing.
- **A space that declared an edge-label allowlist would have lost its contradiction scanning.**

**Files, media and the interface**

- **A source preview could show one file's contents under another file's name**, and arrowing quickly through
  a folder of images could show the wrong one.
- **A queued upload went to whichever folder was open when its turn came**, not the one it was dropped into.
- **A folder whose listing failed showed the previous folder's files under the new folder's name**, and a
  folder that would not open said nothing at all.
- **Clicking a folder in the file tree listed that directory twice.**
- **A long audio or video file could be re-queued while it was still being processed.**
- **A mistyped `MAX_FILE_SIZE_BYTES` removed the media file-size limit instead of raising it.**
- **A stale `?space=` still moved the Brain page to another space**, and clicking a knowledge-type tab in any
  space but the first jumped back to the first.
- **A translation key defined twice used the wrong one**, and a mermaid diagram in a markdown preview rendered
  unstyled.
- **Every sortable table header in the app was lower-case**, alone among the tables.

**Configuration and operations**

- **Every start logged a warning about a repair that had already happened**, naming a retry that could not
  happen.
- **The same setting had two different legal ranges depending on which door it arrived through**, on nine of
  them.
- **Seven routes answered `5xx` and threw away the exception that caused it.**
- **Read-modify-write against `/api/admin/media-config` now works.**
- **A provider fallback ran two model calls inside one step**, and stall detection was told about only one.

### Security

- **A token with no permission grid reached every space. It now reaches none.**

  Two places decided what a token could see, and both fell back to the list of space names older versions
  used — treating an EMPTY list as *everything*. That list stopped being stored on tokens in 3.1, so it was
  always empty, so the fallback always meant unrestricted. The same fallback was then found in two more
  places, in the check that decides which *area* of a space a call may touch, on both APIs.

  **Nothing could reach it**, which is why it was never seen: every token has a grid — created with one,
  given one at startup, or built from its claims per request for a login session. That made it a branch
  nothing exercised, and one that would have handed over the whole instance if anything ever had.

  **You will notice nothing.** It closes a hole that could not be reached rather than changing what a working
  token can do.

### Internal

Nothing here changes what the product does. It is recorded because a reader deciding whether to upgrade is
entitled to know what moved underneath.

- **Documentation and internal correctness.** About forty corrections across eleven guide pages, where a page
  described behaviour the code no longer had. Thirteen rules this codebase states about itself were checked
  against the code and found false. Several source comments described their own fixed defects as still open —
  one instructing a future reader to remove a parameter that must never be removed.

- **The checks themselves.** A number of gates were passing while examining less than their titles claimed:
  hard-coded lists where the set should have been derived, assertions that could not fail, a gate that found
  its rows by number, and tracker checks reporting "all open items indexed" while twenty-five were not. A CI
  hook recorded as an intermittent flake for two days turned out to be a deterministic API error.

- **Large files were broken up.** The file manager's page became eight components and stores — preview, upload
  panel, metadata editor, extract view, directory listing, toolbar, tree — and the graph page, the file-upload
  route, the recall traversal and the network member row each moved out of the file they had grown inside.
  Characterization tests landed first in every case. Raising a file's size ceiling now owes a queued
  decomposition.

- **One definition instead of many.** The six replicated record types, the collection map, the record types and
  the knowledge types are each written once now rather than in nine, sixteen and several places. The four sync
  read routes became one function and four collection wipes became one.

- **The benchmark harness runs, and its first tier needs no model.** `benchmarks/harness/` fetches a pinned
  dataset, ingests it three model-free ways, retrieves, grades and reports, with the method fixed in
  `PROTOCOL.md` before any result existed. The measured floor is published in `benchmarks/README.md`;
  `INGESTION.md` describes how a conversation becomes records, written blind to the questions.

- **The release process gained the checks it was missing.** The GitHub Release for a large version is abridged
  rather than refused — GitHub caps a release body and this one exceeded it, which failed the publish after
  the images had already shipped. The 2.x and 3.x notes are archived, with a gate holding this file to one
  major series. These notes are grouped by subject, and a gate keeps one heading per kind.

- **The guideline sweep that gates this release is finished.** It re-checked everything merged since the
  previous audit against the places this project claims to be true — both APIs, both guides, the operator's
  pages, the project's own rules, and the checks meant to stop each going stale. Six rounds; only the first
  found something that had cost anything, and it is in **Fixed** above. The recurring pattern — a check whose
  title claims more than its body examines — is now written down as a rule of its own.

## Earlier releases

- [3.x](changelog/CHANGELOG-3.x.md) — 6 releases
- [2.x](changelog/CHANGELOG-2.x.md) — 17 releases
- [1.x](changelog/CHANGELOG-1.x.md) — 10 releases
- [0.x](changelog/CHANGELOG-0.x.md) — 18 releases
