# Ingestion specification — how a conversation becomes records

> **This is a PRODUCT specification, and it was written blind to the benchmark's questions.** Not their content,
> not their statistics, not their category distribution. The rule is [`PROTOCOL.md` Amendment 3](PROTOCOL.md):
> a record model calibrated to one corpus's proportions is a worse product, so every element here carries a
> justification a user with entirely different data would accept.
>
> It was produced by a fan-out of independent designs — one arguing for the graph, one for time, one deliberately
> arguing that neither is needed — each judged adversarially for topology fit, retrieval realism, generality and
> cost honesty, then synthesised. [The sceptic's case](#the-sceptics-case) survived into the specification
> rather than being argued away, because it is the most likely outcome and it needs to be on record BEFORE the
> numbers exist.

## Writing a multi-session conversation into Ythril

### 0. Scope and space layout

**One conversation → one space.** Never one space for a corpus. Two reasons, both general: retrieval scope must
match the memory's owner, or one person's recall returns another person's life; and turn identifiers in
transcript formats are commonly unique only within a conversation (`D<session>:<turn>` here), so a shared space
makes provenance ambiguous. Cross-space recall exists for the rare caller who genuinely wants it.

### 1. The one invariant: ONE CLAIM, ONE EMBEDDED RECORD

Every claim extracted from the dialogue produces exactly one record that carries a vector. A claim may produce
additional records for structure, and those are written with `suppressEmbeddings: true`.

This is the spine of the whole specification and it is mechanism-driven. Edges are independently embedded and
compete with memories, entities and chrono entries for `topK` slots (recall's own tool schema records a `topK`
of 20 returning 2 edges on a persona space). A memory plus a mirroring edge for the same sentence is the same
sentence twice in one ranked list: it costs a slot, it makes `count` a lie about how much the caller learned,
and the two copies diverge the moment one is updated.

`suppressEmbeddings` is what makes the invariant affordable. A suppressed record has no vector at all — the
write path `$unset`s it before `matchedText` is ever built, so the record is invisible to `$vectorSearch` *and*
to the `$text` lexical channel (which indexes `matchedText`), while `query`, `list`, `get`, the `traverse` tool
and `recall`'s own traverse expansion still reach it in full, edge description and properties included. Graph
density and ranked-list pollution are therefore independent variables. This is the single best idea in the three
designs and it survives intact.

**General justification:** in any store where structure and content share one ranked list, structure added for
navigation will silently evict content added for answers. A product needs a way to add a hop without adding a
sentence. Any store lacking that mechanism should be given structure far more sparingly.

### 2. The shape rule — what a claim becomes

The record type is decided by the **shape** of the claim, never by its topic. Three shapes, three destinations:

| shape | test | destination |
|---|---|---|
| **attribute** | a standing property of one subject, true over an interval, not an occurrence | **memory**, `entityIds` = every registry entity it names |
| **event** | something that happened, is happening, or is intended, AND a date resolves | **chrono**, `entityIds` = every registry entity involved |
| **relation** | a durable tie between two entities that both earned a node | **edge** (embedded, unless it mirrors a memory) |

A claim that is event-shaped but whose date does **not** resolve is a memory, not a chrono (§8). A claim that
is relation-shaped but where one end did not earn a node is a memory.

**General justification:** shape is a property of the sentence and is stable across domains; topic is a property
of the corpus and is not. A rule keyed on topic ("pets become edges") has to be rewritten for every new user. A
rule keyed on shape does not.

### 3. Provenance on every record, without exception

Every record written by this ingest carries, in `properties`:

- `session` (int) — the session ordinal
- `turn` (string) — the source turn identifier, e.g. `D3:17`; a comma-joined list when a claim spans turns
- `speaker` (string) — the canonical name of who asserted it
- `statedOn` (string, `YYYY-MM-DD`) — the calendar date of the session that asserted it

`statedOn` is load-bearing beyond citation. `recall` cannot filter `startsAt` — its key allowlist is
`properties.*`, `tags`, `type`, `name`, `status`, `label` — but it *can* filter `properties.statedOn` with
`gte`/`lte`, and ISO dates compare correctly as strings. So the mirror is the only way a caller gets a
time-bounded recall on either door without a second `query` call. Chrono entries additionally mirror
`properties.startsOn` (the date part of `startsAt`) for the same reason.

Declare `statedOn`, `startsOn`, `session`, `speaker` and `status` as filter fields in the space's type schemas.
Undeclared properties still filter correctly but fall off the native `$vectorSearch` pre-filter onto an
exhaustive scan — same results, materially slower.

**General justification:** a memory product that cannot say where a fact came from cannot be trusted, cannot be
corrected, and cannot be audited. And time is the one axis every corpus has; if the store's ranked search cannot
reach the native time field, mirror it into a field the ranked search can reach.

### 4. Entities and the registry

Nine types, closed set, in config (§entityTypes). Closed because `type` is a filter key and a `maxPerType` key:
an open vocabulary lets an extractor mint `Hobby`, `Activity` and `Pastime` as three types and the filter stops
meaning anything.

**Identity is the hard part and it is not the model's job.** `upsertEntity` mints a fresh UUID unless an `id` is
passed, and only *warns* when a same name+type already exists; `findEntitiesByName` documents that name is a
non-unique label. Two `Pepper` documents fragment every path through them and no error is raised — this repo's
signature silent defect. So:

1. The ingester holds a **per-space registry**: `normalise(name) + '\0' + type → id`, where `normalise` is
   casefold, strip diacritics, collapse whitespace, strip a trailing possessive.
2. The registry is carried across **every session of the conversation** and is passed into the extraction prompt
   as a name list, so the model reuses exact spellings rather than inventing variants.
3. Every re-mention passes `id`. Nothing is ever created by name alone after session 1.
4. Aliases and nicknames are recorded on the survivor as `properties.aliases` (comma-joined), which is embedded,
   so the nickname is findable on the canonical node.
5. After the last session, run a reconciliation sweep: `find_entities_by_name` for every registry name,
   `merge_entities` for every duplicate. Iterate the full result list — taking `[0]` and moving on is exactly
   how the second copy survives and goes on accumulating edges.

**Participants are terminals, not transit nodes.** In two-party dialogue the participants accumulate almost all
the mass, and `recall`'s traverse expansion has no lever to survive a hub: `buildGraphWithSpill(memberIds,
seeds, maxDepth, inlineCap)` takes no `edgeLabels`, no `direction` and no degree cap, and the edge scan
`$or:[{from:{$in:frontier}},{to:{$in:frontier}}]` is truncated at `limit` in raw Mongo order. One hop off a
participant therefore returns an arbitrary slice. Two rules follow, and both hold for any corpus with a heavy-
tailed degree distribution (which is all of them):

- **Attribute and event claims never become edges.** They attach through `entityIds`, which does not raise
  anyone's degree. This bounds a participant's degree by their number of durable relations (tens) instead of
  their number of facts (hundreds).
- **Third-party claims are joined directly.** "Max is Deborah's mother's cat" mints `Mother → owns → Max`, not
  two edges through Deborah. A path that does not need the hub does not pay for it.

### 5. Edges

Fourteen labels, closed set, entity→entity only (§edgeLabels). An edge whose `to` is a chrono or memory id is
invisible to traversal — `traverseFromSeeds` looks the frontier up in `{spaceId}_entities` and does
`if (!entity) continue` — so such edges must never be written.

**Direction: the subject of the sentence is always `from`.** The `traverse` tool defaults to
`direction: outbound`, so an inconsistently oriented edge is unreachable from the side that should find it.
Where the reverse reading needs its own words (kinship), the reverse term goes in `properties.inverse` rather
than becoming a second edge.

**Nuance goes in properties, not in new labels.** One `family_of` with `properties.relation` beats eight kin
labels: extraction stays consistent, and `label` stays a coarse filter that actually narrows.

**Supersession is a property, not a second edge.** One edge per `(from, label, to)` triple, upserted. A relation
that ends gets `properties.status: 'former'` and `properties.until`. Two contradictory edges with no marking is
a store that answers "where does she work" with both jobs and no way to tell which is now.

**`weight` is not used.** There is no score weighting or type boosting anywhere in the codebase; a weight field
that nothing reads is a promise the store does not keep.

### 6. Memories

`fact` must be **self-contained**. Every pronoun resolved to a name, every deictic ("here", "last week")
replaced with its resolved value in words, the subject named explicitly even when it is the speaker. One claim
per memory, 1–2 sentences, ~300 characters as a target.

**General justification, and it is the highest-value writing rule in this document:** retrieval returns a record
without its context. A record that needs its context to be understood is a record that cannot be used, and worse,
it embeds against the wrong text — "he loved it" carries no retrievable meaning at all.

`type` is drawn from a closed set: `turn`, `attribute`, `preference`, `belief`, `speech_act`, `state`. Closed
for the same reason entity types are.

`tags` stay few — `session-<n>`, plus `image` when the claim came from an image caption. Tags lead the embed
text (`memoryEmbedText` joins tags first), so an inflated tag set dilutes every vector in the space.

`entityIds` names every registry entity in the fact. This is not bookkeeping: linked entity **names** are folded
into the memory's embed text, so linking improves the memory's own recall, and the `traverse` tool follows
`entityIds` inbound (`includeMemories: true`), which is the only structural route to a memory that exists.

Memories are never suppressed — a memory is always the primary rankable record for its claim.

### 7. Chrono entries

A chrono is written when the claim is event-shaped **and** §8 resolves a date. `type` mapping:

- past occurrence → `event`
- stated future intention → `plan`
- dated commitment with an obligation character (appointment, due date) → `deadline`
- forecast about the world → `prediction`
- once-only life change (moved, married, graduated, adopted, was diagnosed) → `milestone`

`status` describes the claim **as last evidenced in the dialogue**: `completed` (happened and done), `active`
(ongoing at last mention), `upcoming` (stated as future, never revisited), `cancelled` (explicitly abandoned).
**Never write `overdue`** — it is derived at read time from `endsAt ?? startsAt` versus now and is never stored.
Note the consequence honestly: a 2023 plan ingested today reads as `overdue` while its embedding still says
`upcoming`, because embeddings are built from the stored status. That is correct behaviour for a live memory and
an artefact for an archive; `properties.asOf` records the date the status was true.

`title` ≤ 80 chars and self-contained (it leads the embed text). `description` carries the full sentence.
`entityIds` names everyone involved — that is what lets the `traverse` tool reach the entry from the person it
is about, with `includeChrono` on by default. `memoryIds` links a memory only in the rare case one exists for
the same claim; under §1 there usually is none.

### 8. Dates — see `dateResolution` for the full table

Three rules matter more than the table:

1. **The anchor is the session's own timestamp**, never the ingest clock. If the first session's timestamp
   cannot be parsed, ingestion **halts** rather than guessing — an unanchored corpus mis-dates everything
   silently, which is worse than not ingesting it.
2. **Never invent a date.** "When I was twelve", "back in college", "a while ago" do not resolve. The claim
   becomes a memory with the literal phrase in `properties.timeRef`. A fabricated timestamp is worse than an
   absent one because it is silently *filterable* — it will be returned confidently by a date-range query.
3. **Coarse time is stored as an interval with a declared precision**, not as a false day. `precision` ∈
   `day|week|month|season|year`, and `endsAt` closes the window whenever precision is coarser than a day.

### 9. Write order and operations

Entities → memories and chronos → edges. Mandatory, not stylistic: a space with strict linkage requires
`from`/`to` to be existing entity ids, and `entityIds` needs the ids to exist. Batch through `bulk_write` per
session. Both doors take the same parameters; nothing here is REST-only or MCP-only.

Before measuring anything, confirm the embed queue has drained (`list_embed_jobs`, `get_stats`). Writes succeed
while the embedder is down — the record is stored and queued — so a benchmark run immediately after ingest can
measure an unindexed corpus and report it as a retrieval failure.

### 10. The read contract this ingest assumes

An ingest specification that does not say how the store is to be read is untestable. The intended read:

- **Default:** `recall(query, topK: 20, maxPerType: { edge: 2 }, traverse: 0)`. Edges are capped rather than
  excluded, because an embedded edge is the primary record for a relational claim and sometimes *is* the answer.
- **When the question names a subject:** a second call to the `traverse` tool from that entity's id, with
  `edgeLabels` for the relation asked about, `direction: both`, `includeChrono: true`,
  `includeMemories: true`, `limit: 200`. This is where the graph pays, because this is the only path with label
  filtering and a degree budget.
- **`recall(traverse: 1)`** is the cheap approximation of the above and is expected to be worse on any hub-heavy
  corpus, for the reasons in §4.
- **Time-bounded questions:** add `filter: { "properties.statedOn": { gte, lte } }` or `properties.startsOn`.

### 11. What is deliberately not built

No session entity (it would be a walkable hub joining everything to everything). No entity for values, abstract
themes, emotions or one-off foods (write-once leaves that add degree and answer nothing). No shadow memory
duplicating a chrono. No per-fact re-minting of entities. No use of `weight`.

## Entity types

```json
[
  {
    "type": "person",
    "qualifies": "A proper name, or a stable definite description that recurs ('Deborah's mother'). Both dialogue participants always. A third party only when named or stably describable.",
    "mintWhen": "First mention. Participants are minted before session 1 from the conversation metadata.",
    "properties": {
      "role": "participant | third_party",
      "aliases": "comma-joined nicknames and spellings seen in the dialogue",
      "firstSeenOn": "YYYY-MM-DD of the session that introduced them",
      "lastSeenOn": "YYYY-MM-DD, updated on every re-mention",
      "sessions": "comma-joined session ordinals that mention them"
    },
    "whyRightInGeneral": "People are the only reliable coreference anchor in any conversation, and the subject of nearly every claim. Without person nodes there is nothing to hang provenance or relations on. This is the one type no corpus can do without.",
    "hubRule": "Participants are terminals of last resort: attribute and event claims attach via entityIds, never as edges, and third-party claims are joined to each other directly rather than routed through a participant."
  },
  {
    "type": "animal",
    "qualifies": "A named animal — pet or otherwise.",
    "mintWhen": "First mention with a name. An unnamed animal ('a dog we saw') is not an entity.",
    "properties": {
      "species": "string",
      "breed": "string",
      "bornOn": "YYYY-MM-DD",
      "acquiredOn": "YYYY-MM-DD",
      "aliases": "comma-joined",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "A named non-human companion is re-referred to across sessions by the same token, accumulates attributes (age, health, breed) and sits mid-chain between two people. Naming is the general test — a thing a user gives a name to is a thing they will ask about again."
  },
  {
    "type": "place",
    "qualifies": "A named geographic or venue-scale location: city, country, region, park, trail, beach, named venue.",
    "mintWhen": "First named mention.",
    "properties": {
      "kind": "city | country | region | venue | natural",
      "country": "string",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "Places are cheap, highly connective, and containment-structured. The place-in-place chain lets one hop generalise a location the question never named ('anything about Colorado' reaching a Denver fact), which no amount of embedding similarity reliably delivers."
  },
  {
    "type": "organization",
    "qualifies": "A named employer, school, club, team, course, non-profit, band, business.",
    "mintWhen": "First named mention.",
    "properties": {
      "kind": "employer | school | club | team | nonprofit | business | course",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "An organization is a stable named referent that accumulates over time and is the standard second hop off a person. It is also how two people who never appear in the same turn become connected, which is the only way some joins exist at all."
  },
  {
    "type": "work",
    "qualifies": "A titled work: book, film, series, game, album, song.",
    "mintWhen": "First mention of a title.",
    "properties": {
      "medium": "book | film | series | game | album | song",
      "creator": "string",
      "year": "int",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "Titles are exactly the tokens embeddings lose and the lexical channel rescues, and they recur verbatim across sessions. Giving a title its own node with its own name field puts it into the entity name index and into every linked record's embed text."
  },
  {
    "type": "object",
    "qualifies": "A specific owned or made artifact with an identity: a car, a guitar, a camera, a house, a bike, a tattoo. Requires a distinguishing name, brand or model, OR an acquisition/loss event.",
    "mintWhen": "First mention meeting the qualification test. A generic possession mentioned once ('my shoes') is not an entity.",
    "properties": {
      "kind": "string",
      "brand": "string",
      "acquiredOn": "YYYY-MM-DD",
      "status": "owned | sold | lost | broken",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "Possessions are re-referred to with definite articles ('the bike') across sessions and carry their own history of acquisition, use and loss. The qualification test — distinguishable or event-bearing — is what stops this type becoming a dumping ground for every noun."
  },
  {
    "type": "activity",
    "qualifies": "A recurring practice or hobby: pottery, yoga, basketball, hiking, painting, gaming. The thing DONE, never an instance of doing it.",
    "mintWhen": "First mention as a practice rather than a one-off occurrence.",
    "properties": {
      "kind": "sport | craft | art | outdoor | game | domestic | music",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "Practices are the densest genuine join in conversational memory: they connect people to places, events, organizations and objects that share nothing else. The instance/practice split is the general rule — the practice is durable and earns a node, the instance is dated and becomes a chrono."
  },
  {
    "type": "condition",
    "qualifies": "A durable health constraint: allergy, intolerance, chronic illness, mental-health condition, injury with lasting effect.",
    "mintWhen": "First mention.",
    "properties": {
      "kind": "allergy | intolerance | chronic | injury | mental_health",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "A constraint must be answerable with certainty and must be retrievable when the question does not name it ('what can I cook for her' must reach the gluten intolerance). Giving it a filterable type rather than burying it in prose is what makes a certainty-grade lookup possible. It is also the type most damaging to get wrong, which is the general argument for making it explicit rather than implicit."
  },
  {
    "type": "project",
    "qualifies": "A named ongoing undertaking with a goal: a screenplay, a restoration, a studio, a campaign, a prototype, a degree.",
    "mintWhen": "First mention as an undertaking with an intended end state.",
    "properties": {
      "status": "planned | active | paused | completed | abandoned",
      "startedOn": "YYYY-MM-DD",
      "firstSeenOn": "YYYY-MM-DD",
      "lastSeenOn": "YYYY-MM-DD"
    },
    "whyRightInGeneral": "A project accumulates across many sessions and has a status that changes — which is precisely the case where an entity beats a memory, because the entity can be updated in place while a pile of memories can only be appended to and then contradict each other."
  },
  {
    "type": "__vocabulary_rule",
    "qualifies": "These nine are the DEFAULT vocabulary and belong in per-deployment config, not in code. The set must be CLOSED.",
    "mintWhen": "n/a",
    "properties": {},
    "whyRightInGeneral": "A closed set is what makes `type` a usable recall filter and a usable maxPerType key. An open set lets an extractor mint Hobby, Activity and Pastime as three types for one concept, after which filtering by type narrows nothing and the operator cannot tell that it stopped working."
  },
  {
    "type": "__no_event_entity",
    "qualifies": "A named occasion ('the Denver trip', 'Maya's wedding') does NOT get an entity. It is one chrono entry, updated in place as later sessions add to it.",
    "mintWhen": "never",
    "properties": {},
    "whyRightInGeneral": "Two records for one occurrence is the classic drift defect: they double-count in a ranked list and diverge on update. The occasion stays reachable from every linked person through the traverse tool's entityIds following, which is the structural route that already exists for it."
  }
]
```

## Edge labels

```json
[
  {
    "label": "family_of",
    "direction": "subject -> relative",
    "from": "person",
    "to": "person",
    "embedded": true,
    "properties": {
      "relation": "mother | father | sister | brother | son | daughter | cousin | partner | spouse | grandparent | ...",
      "inverse": "the reverse term, so a path reads correctly walked either way",
      "status": "current | former"
    },
    "whyRightInGeneral": "Kin chains are the canonical multi-hop in any personal corpus and are how third parties become reachable at all. ONE label with a `relation` property rather than eight labels keeps extraction consistent and keeps `label` a coarse filter that actually narrows."
  },
  {
    "label": "knows",
    "direction": "subject -> other person",
    "from": "person",
    "to": "person",
    "embedded": true,
    "properties": {
      "kind": "friend | colleague | neighbour | ex_partner | acquaintance | mentor",
      "since": "YYYY-MM-DD",
      "status": "current | former"
    },
    "whyRightInGeneral": "Non-kin social ties are the other half of the person graph and answer a different question from kinship, so they must not share a label with it."
  },
  {
    "label": "owns",
    "direction": "owner -> owned",
    "from": "person",
    "to": "animal | object",
    "embedded": true,
    "properties": {
      "since": "YYYY-MM-DD",
      "until": "YYYY-MM-DD",
      "status": "current | former"
    },
    "whyRightInGeneral": "Possession is bidirectionally interesting — 'whose dog is Pepper' and 'what does she own' are one edge — and ownership ends, which is why it carries a status rather than being deleted when it lapses."
  },
  {
    "label": "works_at",
    "direction": "person -> employer",
    "from": "person",
    "to": "organization",
    "embedded": true,
    "properties": {
      "role": "string",
      "since": "YYYY-MM-DD",
      "until": "YYYY-MM-DD",
      "status": "current | former"
    },
    "whyRightInGeneral": "Occupation is a standing state, not an event, so it belongs on an edge rather than in a chrono. `status: former` is what lets a superseded fact stay retrievable without being wrong — the general requirement that a memory keep history without asserting it as present."
  },
  {
    "label": "member_of",
    "direction": "person -> organization",
    "from": "person",
    "to": "organization",
    "embedded": true,
    "properties": {
      "role": "string",
      "since": "YYYY-MM-DD",
      "status": "current | former"
    },
    "whyRightInGeneral": "Kept separate from works_at because 'where does she work' must not return her book club. Two questions that must not answer each other need two labels."
  },
  {
    "label": "lives_in",
    "direction": "person -> place",
    "from": "person",
    "to": "place",
    "embedded": true,
    "properties": {
      "since": "YYYY-MM-DD",
      "until": "YYYY-MM-DD",
      "status": "current | former"
    },
    "whyRightInGeneral": "Residence is the most-asked standing location fact and it changes, so it needs the same current/former treatment as employment."
  },
  {
    "label": "located_in",
    "direction": "contained -> container",
    "from": "place | organization",
    "to": "place",
    "embedded": true,
    "properties": {},
    "whyRightInGeneral": "The containment chain is what lets a question about a region reach a fact about a neighbourhood. It is the cheapest generalisation hop in any graph and costs one edge per place."
  },
  {
    "label": "part_of",
    "direction": "part -> whole",
    "from": "organization | project | work",
    "to": "organization | project | work",
    "embedded": true,
    "properties": {},
    "whyRightInGeneral": "Non-spatial containment (a team inside a company, an episode inside a series, a milestone inside a project). Kept apart from located_in because conflating spatial and organisational containment makes both unusable as filters."
  },
  {
    "label": "practices",
    "direction": "person -> activity",
    "from": "person",
    "to": "activity",
    "embedded": true,
    "properties": {
      "frequency": "string as stated",
      "since": "YYYY-MM-DD",
      "status": "current | former"
    },
    "whyRightInGeneral": "A durable practice is a standing relation, unlike a single session of doing it. Restricting this label to durable practice is what keeps a person's degree bounded — every occurrence would otherwise mint an edge."
  },
  {
    "label": "works_on",
    "direction": "person -> project",
    "from": "person",
    "to": "project",
    "embedded": true,
    "properties": {
      "role": "string",
      "status": "current | former"
    },
    "whyRightInGeneral": "Projects are multi-session by nature; the edge is what makes every session's contribution converge on one node instead of scattering."
  },
  {
    "label": "has_condition",
    "direction": "person -> condition",
    "from": "person",
    "to": "condition",
    "embedded": true,
    "properties": {
      "since": "YYYY-MM-DD",
      "severity": "string as stated",
      "status": "current | resolved"
    },
    "whyRightInGeneral": "The condition is the shared referent and the edge carries the person-specific detail. Splitting it this way lets a query filter `type: condition` for certainty-grade constraint lookup while severity stays attached to the person it belongs to."
  },
  {
    "label": "created_by",
    "direction": "work -> creator",
    "from": "work",
    "to": "person",
    "embedded": true,
    "properties": {
      "role": "author | director | artist | developer"
    },
    "whyRightInGeneral": "Attribution recurs verbatim and is asked about in both directions. It is also the one edge that routinely connects a third party who appears in exactly one turn to something durable."
  },
  {
    "label": "likes",
    "direction": "person -> liked thing",
    "from": "person",
    "to": "work | activity | place | organization | object | animal | person",
    "embedded": false,
    "suppressEmbeddings": true,
    "properties": {
      "strength": "likes | loves | favourite",
      "statedOn": "YYYY-MM-DD",
      "session": "int"
    },
    "whyRightInGeneral": "An affinity is both a sentence you would read and a route you would walk. The sentence is the preference MEMORY; this edge buys only the route, and `suppressEmbeddings` means it costs zero rank slots while remaining fully visible to traversal, query and get. Capped at one edge per (person, target) pair however many times the affinity is restated, and never minted toward an abstract value or a one-off food — that cap is what keeps the largest class of claims in any personal corpus from exploding the hub's degree."
  },
  {
    "label": "dislikes",
    "direction": "person -> disliked thing",
    "from": "person",
    "to": "work | activity | place | organization | object | animal | person",
    "embedded": false,
    "suppressEmbeddings": true,
    "properties": {
      "strength": "dislikes | hates | avoids",
      "statedOn": "YYYY-MM-DD",
      "session": "int"
    },
    "whyRightInGeneral": "A separate label rather than a polarity property on `likes`, because `label` is the only filter a traversal offers and 'what does she avoid' must not return what she loves. Where a distinction changes the answer, it belongs in the field the query can filter on."
  },
  {
    "label": "__orientation_rule",
    "direction": "the SUBJECT of the sentence is always `from`",
    "from": "-",
    "to": "-",
    "embedded": false,
    "properties": {},
    "whyRightInGeneral": "The traverse tool defaults to `direction: outbound`, so an inconsistently oriented edge is unreachable from the side that should have found it — and nothing reports the miss. Direction is part of the claim, not formatting."
  },
  {
    "label": "__supersession_rule",
    "direction": "-",
    "from": "-",
    "to": "-",
    "embedded": false,
    "properties": {},
    "whyRightInGeneral": "One edge per (from, label, to) triple, upserted. A relation that ends gets `status: former` plus `until`, never a second edge. Two contradictory edges with no marking make the store answer a 'what is true now' question with both answers and no way to choose."
  },
  {
    "label": "__never_to_non_entities",
    "direction": "-",
    "from": "-",
    "to": "-",
    "embedded": false,
    "properties": {},
    "whyRightInGeneral": "An edge whose endpoint is a memory or chrono id is silently dropped by traversal (`if (!entity) continue` after the entities lookup). Writing one produces a graph that looks connected in the database and returns half a walk with no error."
  }
]
```

## Memory rules

```json
{
  "whatBecomesAMemory": [
    "Every attribute-shaped claim: a standing property of one subject (preference, belief, value, skill, quantity, duration, role description that did not earn an edge).",
    "Every event-shaped claim whose date does NOT resolve under the date rules — it keeps the literal time phrase in `properties.timeRef` and never gets an invented startsAt.",
    "Every interpersonal speech act whose content is the point ('Tim recommended a pair of shoes to John'), with both people in entityIds.",
    "Every relation-shaped claim where one end did not earn an entity node.",
    "Rung 0 only: the verbatim turn itself, `type: 'turn'`."
  ],
  "whatDoesNotBecomeAMemory": [
    "A claim already written as a chrono. One claim, one embedded record — no shadow memory.",
    "A claim already written as an EMBEDDED edge. (A claim written as a SUPPRESSED edge keeps its memory; that is the point of suppressing it.)",
    "Pure conversational filler with no claim ('haha yeah', 'how are you'). Rung 0 stores these as turns; rung 2 extracts nothing from them."
  ],
  "factWriting": {
    "selfContained": "MANDATORY. Every pronoun resolved to a name, every deictic ('here', 'last week', 'that place') replaced with its resolved value in words, the subject named explicitly even when it is the speaker. A retrieved record arrives without its context; a record that needs context cannot be used, and it embeds against text that carries no meaning.",
    "oneClaim": "One claim per memory. A turn averages ~3 sentences and routinely carries three claims; one memory per claim is what makes minScore and topK mean something.",
    "person": "Third person, present or past tense as the claim requires. Never first person — 'I' is unresolvable out of context and embeds identically for both speakers.",
    "length": "1-2 sentences, ~300 characters target, 500 hard.",
    "noHedging": "State what was said, not how confidently. Confidence belongs in `properties.confidence` if anywhere, not in the sentence, because hedge words dominate short embeddings."
  },
  "fields": {
    "type": "Closed set: turn | attribute | preference | belief | speech_act | state. Closed because `type` is a recall filter key and a maxPerType key.",
    "entityIds": "Every registry entity the fact names. Not bookkeeping: linked entity NAMES are folded into the memory's embed text (memoryEmbedText), so linking improves the memory's own recall; and entityIds is the only structural route to a memory that exists (traverse tool, includeMemories: true).",
    "tags": "['session-<n>'], plus 'image' when derived from an image caption. Kept minimal because tags LEAD the embed text and an inflated tag set dilutes every vector in the space.",
    "description": "Used only when the claim needs context the fact line cannot carry without breaking self-containment — e.g. the question that prompted the answer. Usually absent.",
    "properties": "session, turn, speaker, statedOn always; plus claim-specific keys (timeRef, durationText, quantity, approx).",
    "suppressEmbeddings": "NEVER set on a memory. A memory is always the primary rankable record for its claim."
  },
  "imageTurns": {
    "rule": "When a turn carries an image caption, append it to the turn text as '[image: <caption>]' at rung 0, and treat the caption as an assertable claim at rung 2 attributed to the same speaker with `properties.source: 'image_caption'`.",
    "whyRightInGeneral": "A caption is a machine's description, not the user's words. Merging it silently into a fact makes a model's guess indistinguishable from something a person said, and there is no way to withdraw it later. The source key is what keeps that reversible."
  },
  "deduplication": {
    "rule": "Before writing, compare the normalised fact against memories already written for the same subject in this space. An exact restatement is NOT written again; instead the existing memory's `properties.turn` gains the new turn id and `properties.restatedOn` is set. A CONTRADICTING restatement is written as a new memory and the older one gets `properties.supersededBy` = the new id.",
    "whyRightInGeneral": "Conversations restate. Without dedup the store's ranked list fills with N copies of one fact and crowds out the other N-1 facts the caller needed; without supersession marking, a corrected fact and its correction both come back with nothing to choose between them."
  }
}
```

## Chrono rules

```json
{
  "whatBecomesAChrono": [
    "A claim that names an occurrence — happened, is happening, or is intended — AND whose time resolves to a calendar day, week, month, season or year under the date rules.",
    "A dated status change that is also written as an edge property (e.g. 'she left the bank in March'): the chrono records the occurrence, the edge records the resulting state. These are two different claims, not one duplicated, so the invariant holds."
  ],
  "whatDoesNotBecomeAChrono": [
    "Any occurrence whose date does not resolve. It is a memory with `properties.timeRef` holding the literal phrase. A fabricated timestamp is worse than an absent one, because it is silently filterable and will be returned confidently by a date-range query.",
    "A durable practice ('she does yoga') — that is an activity entity plus a `practices` edge. Only an instance ('she went to yoga on Tuesday') is a chrono.",
    "A session itself, at rung 2 and above. Rung 1 writes one session chrono deliberately; see the ladder."
  ],
  "typeMapping": {
    "event": "A past or present occurrence with no obligation character.",
    "plan": "A stated future intention.",
    "deadline": "A dated commitment with an obligation character — appointment, due date, booked slot.",
    "prediction": "A forecast about the world rather than about the speaker's own actions.",
    "milestone": "A once-only life change: moved, married, graduated, adopted, was diagnosed, started or ended a job."
  },
  "statusMapping": {
    "rule": "Status describes the claim AS LAST EVIDENCED IN THE DIALOGUE, not as of the ingest clock.",
    "completed": "It happened and is finished.",
    "active": "Ongoing at its last mention.",
    "upcoming": "Stated as future and never revisited by a later session.",
    "cancelled": "Explicitly abandoned or called off.",
    "overdue": "NEVER WRITTEN. `deriveChronoStatus` computes it at read time from `endsAt ?? startsAt` versus now, and nothing stores it.",
    "honestConsequence": "A 2023 plan ingested today READS as overdue while its embedding still says 'upcoming', because chrono embed text is built from the stored status and is not rebuilt on a clock tick. That is right for a live memory and an artefact for an archive. `properties.asOf` records the date the status was true, so a reader can tell the difference."
  },
  "fields": {
    "title": "<= 80 characters, self-contained, names the subject. It leads the chrono embed text, so a vague title costs ranking directly.",
    "description": "The full self-contained sentence plus any detail the title dropped.",
    "startsAt": "ISO string per the date rules.",
    "endsAt": "Present whenever precision is coarser than a day (closing the precision window) or the dialogue states a range.",
    "entityIds": "Every registry entity involved. This is what lets the traverse tool reach the entry from the person it is about (includeChrono defaults true). An unlinked chrono is reachable only by search or by date, never from the thing it concerns.",
    "memoryIds": "Links the stating memory when one exists. Under the one-record invariant there usually is none.",
    "tags": "['session-<n>'].",
    "properties": "session, turn, speaker, statedOn, startsOn (the YYYY-MM-DD mirror of startsAt), precision, approx, asOf; plus recurrenceText when the recurrence was stated in words.",
    "recurrence": "Set only when the dialogue states a recurrence explicitly ('every Tuesday'): {freq, interval, until?}. Never inferred from two occurrences.",
    "suppressEmbeddings": "Never set on a chrono."
  },
  "startsOnMirror": {
    "rule": "`properties.startsOn` duplicates the date part of `startsAt` on every chrono entry.",
    "whyRightInGeneral": "recall's filter key allowlist is properties.*, tags, type, name, status, label — startsAt is not reachable, and list_chrono's after/before filter createdAt rather than startsAt. Without the mirror, 'meaning-ranked AND time-bounded' takes two calls on both doors. Mirroring a native field into a filterable one is the general move whenever the ranked search cannot reach the axis the user asks along."
  }
}
```

## Date resolution

```json
{
  "anchor": {
    "rule": "The anchor A is the SESSION's own timestamp, parsed from the session header, never the ingest clock.",
    "parsing": "Parse to a calendar date and, when stated, a clock time. Treat the value as wall-clock in a single nominal zone and DO NOT convert time zones.",
    "failure": "If a session's timestamp will not parse, inherit the previous session's date and set `properties.anchorInferred: true` on every record from that session. If the FIRST session will not parse, HALT ingestion — an unanchored corpus mis-dates every relative expression silently, which is worse than not ingesting it.",
    "whyRightInGeneral": "Every relative expression in a conversation is relative to when it was said. Anchoring on ingest time is the single most common way a memory product produces confidently wrong dates, and the error is invisible because the values look well-formed."
  },
  "storageFormat": {
    "dayPrecision": "YYYY-MM-DDT00:00:00.000Z",
    "withStatedClockTime": "YYYY-MM-DDTHH:MM:00.000Z using the stated wall-clock time, no zone conversion",
    "mirror": "properties.startsOn = YYYY-MM-DD; properties.statedOn = the anchor date as YYYY-MM-DD, on EVERY record of every type",
    "precisionKey": "properties.precision in {day, week, month, season, year}",
    "approxKey": "properties.approx = true whenever the resolution involved an assumption (fuzzy quantity, hemisphere, midpoint)",
    "whyRightInGeneral": "Converting a conversational date into a real instant invents precision the speaker never had and can shift the calendar day. Storing wall-clock plus a declared precision keeps the record honest and still range-filterable."
  },
  "tenseRules": {
    "past": "Governing verb is past or perfect, or the clause is framed as a report of something done.",
    "future": "Modal or prospective framing: will, going to, planning to, hoping to, next, upcoming.",
    "ongoing": "Present continuous or explicit 'these days / at the moment' — resolves to A with status active.",
    "useOfTense": "Tense DISAMBIGUATES an underspecified expression (a bare weekday, a bare month/day) and nothing else. It never overrides an explicit direction word."
  },
  "table": [
    {
      "expression": "today, this morning, this afternoon, this evening, tonight",
      "resolvesTo": "A",
      "precision": "day"
    },
    {
      "expression": "yesterday",
      "resolvesTo": "A - 1 day",
      "precision": "day"
    },
    {
      "expression": "last night",
      "resolvesTo": "A - 1 day",
      "precision": "day"
    },
    {
      "expression": "the day before yesterday",
      "resolvesTo": "A - 2 days",
      "precision": "day"
    },
    {
      "expression": "tomorrow",
      "resolvesTo": "A + 1 day",
      "precision": "day"
    },
    {
      "expression": "the day after tomorrow",
      "resolvesTo": "A + 2 days",
      "precision": "day"
    },
    {
      "expression": "last <weekday>",
      "resolvesTo": "the most recent <weekday> STRICTLY before A",
      "precision": "day"
    },
    {
      "expression": "next <weekday>",
      "resolvesTo": "the first <weekday> STRICTLY after A; if A is that weekday, A + 7",
      "precision": "day"
    },
    {
      "expression": "bare <weekday> (on Friday)",
      "resolvesTo": "past tense -> the most recent <weekday> <= A; future -> the first <weekday> >= A",
      "precision": "day"
    },
    {
      "expression": "this weekend",
      "resolvesTo": "A is Mon-Thu -> the coming Sat; A is Fri-Sun -> the Sat of the current week. endsAt = that Sunday",
      "precision": "week"
    },
    {
      "expression": "last weekend",
      "resolvesTo": "the Saturday of the most recent COMPLETED weekend before A; endsAt = that Sunday",
      "precision": "week"
    },
    {
      "expression": "last week",
      "resolvesTo": "Monday of the previous ISO week; endsAt = that Sunday",
      "precision": "week"
    },
    {
      "expression": "next week",
      "resolvesTo": "Monday of the next ISO week; endsAt = that Sunday",
      "precision": "week"
    },
    {
      "expression": "last month",
      "resolvesTo": "first day of the previous calendar month; endsAt = its last day",
      "precision": "month"
    },
    {
      "expression": "next month",
      "resolvesTo": "first day of the next calendar month; endsAt = its last day",
      "precision": "month"
    },
    {
      "expression": "last year / next year",
      "resolvesTo": "1 January of that year; endsAt = 31 December",
      "precision": "year"
    },
    {
      "expression": "N days/weeks/months/years ago",
      "resolvesTo": "A minus N of that unit",
      "precision": "matches the unit"
    },
    {
      "expression": "in N days/weeks/months",
      "resolvesTo": "A plus N of that unit",
      "precision": "matches the unit"
    },
    {
      "expression": "a few days ago",
      "resolvesTo": "A - 3 days, approx = true",
      "precision": "week"
    },
    {
      "expression": "a couple of weeks ago",
      "resolvesTo": "A - 14 days, approx = true",
      "precision": "week"
    },
    {
      "expression": "a while ago / recently / the other day",
      "resolvesTo": "NOT RESOLVED",
      "precision": "unknown"
    },
    {
      "expression": "last <season>",
      "resolvesTo": "the most recent COMPLETED season window before A, using the configured hemisphere (default north: spring Mar1-May31, summer Jun1-Aug31, autumn Sep1-Nov30, winter Dec1-endFeb, winter's year = the year of its December). endsAt closes the window. approx = true and properties.hemisphere records the assumption",
      "precision": "season"
    },
    {
      "expression": "bare month/day (May 8th)",
      "resolvesTo": "candidate years {A.year-1, A.year, A.year+1}; past tense -> the greatest candidate <= A; future -> the least candidate >= A; no tense -> the candidate nearest A",
      "precision": "day"
    },
    {
      "expression": "bare month (in May)",
      "resolvesTo": "same year selection as above; startsAt = the 1st, endsAt = the last day",
      "precision": "month"
    },
    {
      "expression": "full date with a year",
      "resolvesTo": "as stated",
      "precision": "day"
    },
    {
      "expression": "since <year> / for N years",
      "resolvesTo": "not a chrono. `properties.since` on the entity or edge = A minus N years (approx = true) when derivable, and the literal always goes to `properties.durationText`",
      "precision": "year"
    },
    {
      "expression": "every <weekday> / every month",
      "resolvesTo": "chrono with recurrence {freq, interval: 1}; startsAt = the next or most recent matching date by tense",
      "precision": "day"
    },
    {
      "expression": "relative to another event (the day after the wedding)",
      "resolvesTo": "resolved ONLY if the referenced event already has a resolved startsAt in this conversation; otherwise NOT RESOLVED",
      "precision": "inherits"
    },
    {
      "expression": "life-stage references (when I was 12, back in college, as a kid)",
      "resolvesTo": "NOT RESOLVED",
      "precision": "unknown"
    }
  ],
  "unresolvablePolicy": {
    "rule": "A claim whose time does not resolve is a MEMORY, never a chrono. The literal phrase goes to `properties.timeRef` and the fact line keeps it in words.",
    "whyRightInGeneral": "An absent date makes a record un-findable by date search — recoverable, and obvious to whoever looks. An invented date makes the record findable by the WRONG date search — unrecoverable, and invisible. The asymmetry is the whole argument, and it holds for any store with a time filter."
  },
  "orderOfEvaluation": "First match wins, top of the table down. Explicit direction words (last/next/ago/in) always beat tense inference."
}
```

## The ladder — what each rung costs and what it should buy

```json
[
  {
    "rung": 0,
    "name": "Verbatim turns — deterministic, no model",
    "deterministic": true,
    "writes": [
      "2 person entities per conversation (participants), minted from conversation metadata before session 1",
      "1 memory per turn, type 'turn', fact = the turn text with any image caption appended as '[image: <caption>]'",
      "entityIds = [speaker, addressee]; tags = ['session-<n>']; properties = {session, turn, speaker, statedOn, source}"
    ],
    "cost": "Zero model calls. One embedding per turn (~590 per conversation, ~5,900 for a 10-conversation corpus). Minutes of wall clock, dominated by the embed queue.",
    "buys": "Complete, lossless coverage: nothing said is unretrievable, verbatim phrasing survives for the lexical channel to rescue, and every later rung has a citable floor to fall back to. This is the baseline any graph must beat.",
    "whyRightInGeneral": "The cheapest correct thing should exist before the expensive clever thing, so the expensive clever thing can be measured against it rather than assumed better."
  },
  {
    "rung": 1,
    "name": "Session spine — one cheap model call per session",
    "deterministic": false,
    "writes": [
      "1 chrono per session: type 'event', title 'Session <n> — <topic phrase>', startsAt = the session anchor, status 'completed', entityIds = both participants, description = a 2-3 sentence summary"
    ],
    "cost": "One summarisation call per session (~272 for this corpus), ~800 input / ~120 output tokens each.",
    "buys": "Date-anchored navigation ('what were we talking about in May') and a coarse fallback answer when fine extraction missed a claim. A chrono rather than an entity DELIBERATELY: a session entity would be a walkable hub joining everything to everything through recall's unfiltered expansion, while a chrono is unwalkable from recall and therefore safe.",
    "whyRightInGeneral": "Time-bucketed summaries are the one structure that is useful in every corpus and cannot mislead, because a summary that is wrong is still correctly attributed to its window."
  },
  {
    "rung": 2,
    "name": "Claim extraction — the main model pass",
    "deterministic": false,
    "writes": [
      "Memories for attribute-shaped and unresolvable-time claims",
      "Chrono entries for event-shaped claims whose dates resolve",
      "Entity CANDIDATES (name + type + a one-line description), which the registry resolves to ids"
    ],
    "cost": "One extraction call per session (~272), ~1,200 input (session text + the registry name list) / ~700 output tokens. This is where nearly all the model spend sits.",
    "buys": "Single-claim, self-contained, individually rankable records with resolved dates and working type/status filters. Expected to be where most of the achievable accuracy is.",
    "whyRightInGeneral": "Retrieval granularity should match answer granularity. A turn holds ~3 claims; returning a turn to answer one of them spends two thirds of the slot on noise, and that ratio is a property of conversation, not of this dataset."
  },
  {
    "rung": 3,
    "name": "Entity canonicalisation and the relational spine",
    "deterministic": "mostly — the registry is deterministic, the label choice is not",
    "writes": [
      "Canonical entities with ids reused across every session (the registry)",
      "Embedded edges from the closed label set for durable relations",
      "Suppressed `likes`/`dislikes` mirror edges, capped at one per (person, target) pair",
      "A post-ingest find_entities_by_name + merge_entities reconciliation sweep"
    ],
    "cost": "Registry bookkeeping is free. Label assignment rides along in the rung-2 call (no extra call). Reconciliation is one sweep per conversation plus a small number of merge decisions.",
    "buys": "Cross-session joins that no amount of embedding similarity gives you: the same 'Pepper' in session 3 and session 19 is ONE node, so a walk from either reaches both. Also the certainty-grade constraint lookup (filter type=condition).",
    "whyRightInGeneral": "Identity resolution is the one thing a vector index structurally cannot do — two mentions of the same thing are near each other in embedding space but are still two records, and no topK can merge them. This rung is worth building even if the traversal on top of it turns out not to pay."
  },
  {
    "rung": 4,
    "name": "Supersession and contradiction",
    "deterministic": false,
    "writes": [
      "properties.supersededBy on outdated memories",
      "properties.status = 'former' + until on ended relations",
      "chrono status transitions when a later session reports the outcome of an earlier plan"
    ],
    "cost": "One comparison call per candidate pair, where candidates come from the deterministic dedup pass (same subject, same predicate class). Bounded by restatement rate, not corpus size.",
    "buys": "Correct answers to 'what is true NOW' rather than a ranked list containing both the old and the new fact with nothing to choose between them.",
    "whyRightInGeneral": "A memory that only appends is a memory that gets less accurate the longer it is used. This is the rung most products skip and it is the one whose absence users actually notice."
  }
]
```

## Rejected, and why

```json
[
  {
    "element": "A session entity (a walkable node per session)",
    "fromDesign": "the session-hub designs",
    "whyRejected": "recall's traverse expansion takes no edgeLabels, no direction and no degree cap, and truncates a hub's neighbourhood in raw Mongo scan order. A session node would connect every claim in that session to every other, so one hop off any seed returns an arbitrary slice of a whole session. The session's useful content is its DATE, which is already on every record as properties.statedOn and, at rung 1, as an unwalkable chrono."
  },
  {
    "element": "A 'value / abstract theme' entity type (kindness, community, self-acceptance)",
    "fromDesign": "design 0's entity list",
    "whyRejected": "Named in the design's own source material as 'almost always a dead-end leaf'. It adds degree to the participant hub and is never the subject of a useful walk. Beliefs and values become belief-typed memories instead, where they are fully rankable."
  },
  {
    "element": "Food / dish as an entity type",
    "fromDesign": "the corpus's entity inventory",
    "whyRejected": "Fails the general mint test: mentioned once, accumulates nothing, and is not a hop anyone needs. Becomes a memory. A recurring signature dish would qualify as an `object` only if it acquired a name and a history, which is the same test everything else passes."
  },
  {
    "element": "An edge per preference, embedded",
    "fromDesign": "graph-first, applied naively to the largest claim class",
    "whyRejected": "Preferences are the largest well-defined class in personal dialogue (15-18% here). Embedding one edge each puts a second copy of every preference into the ranked list AND explodes the participant's degree, which is exactly what recall's hub-blind truncation cannot survive. Resolved as: the preference is a memory (embedded), the edge is a suppressed mirror, capped at one per (person, target) pair."
  },
  {
    "element": "A memory shadowing every chrono entry",
    "fromDesign": "the redundancy-for-recall designs",
    "whyRejected": "Two embedded records for one claim occupy two topK slots, make `count` misreport how much the caller learned, and diverge on update. The one-claim-one-embedded-record invariant is the single checkable rule that prevents it."
  },
  {
    "element": "Eight kinship labels (mother_of, sister_of, cousin_of, ...)",
    "fromDesign": "label-per-relation designs",
    "whyRejected": "Label explosion makes extraction inconsistent (the model picks differently for the same tie in different sessions) and makes `label` filtering useless because the caller must enumerate. One `family_of` with `properties.relation` and `properties.inverse` carries the same information and keeps the filter coarse and usable."
  },
  {
    "element": "Using `weight` to express importance",
    "fromDesign": "the ranking-tuning designs",
    "whyRejected": "Verified: there is no score weighting or type boosting anywhere in the codebase. A weight nothing reads is a promise the store does not keep, and the next reader will believe it."
  },
  {
    "element": "Filtering or sorting a recall by `startsAt`",
    "fromDesign": "the time-first designs",
    "whyRejected": "Impossible. recall's key allowlist is properties.*, tags, type, name, status, label; a startsAt range predicate exists only in `query`, and list_chrono's after/before filter createdAt. Replaced by the properties.startsOn / properties.statedOn mirrors, which recall CAN filter with gte/lte."
  },
  {
    "element": "Attaching a chrono or memory to an entity with an EDGE",
    "fromDesign": "the everything-is-a-node designs",
    "whyRejected": "traverseFromSeeds hydrates the frontier from {spaceId}_entities and does `if (!entity) continue`. Such an edge produces a graph that looks connected in the database and returns half a walk with no error. entityIds is the correct link, and the traverse tool follows it with includeChrono on by default."
  },
  {
    "element": "Inventing a date for a fuzzy time reference so the claim can be a chrono",
    "fromDesign": "the maximise-chrono-coverage designs",
    "whyRejected": "An absent date is recoverable and visible; a wrong date is neither, because the record then answers date-range queries confidently and wrongly. Unresolvable time makes the claim a memory with the literal phrase preserved."
  },
  {
    "element": "Per-session entity creation without a carried registry",
    "fromDesign": "the stateless-per-session designs",
    "whyRejected": "upsertEntity mints a fresh UUID unless `id` is passed and only warns on a duplicate name+type. Without a carried registry every session mints new nodes and the graph becomes disconnected stars — the failure mode that makes cross-session retrieval, the entire point of a multi-session memory, silently impossible."
  },
  {
    "element": "Relying on recall(traverse: 1) as the graph's payoff path",
    "fromDesign": "design 0's implicit read model",
    "whyRejected": "Not rejected as a capability, rejected as the PRIMARY path. It has no label filter, no direction and no degree cap. The graph's payoff should be sought through the `traverse` tool as a second call, which has all three plus entityIds following. Stated explicitly so the measurement tests the right thing."
  }
]
```

## The sceptic's case

The minimal design is likely to be competitive, and possibly to win outright. I want that written down before the numbers arrive.

The sceptic's argument runs in four steps and I do not have a rebuttal for any of them.

**One. Most claims in personal dialogue are attributes about one of two people, and an attribute needs no graph.** A well-formed, self-contained, single-claim memory with the subject named is retrievable by meaning and by exact token in one hop. Rung 0 plus rung 2 produces exactly that. Rungs 3 and 4 add identity resolution and structure on top, and structure only pays when the retrieval has to CROSS something — from a thing the question names to a thing it does not.

**Two. Ythril's cheap graph path is the weak one.** recall's traverse expansion takes no edgeLabels, no direction and no degree cap; it scans `$or:[{from:{$in:frontier}},{to:{$in:frontier}}]` and truncates in raw Mongo order. On a corpus where two nodes hold most of the edges, one hop off a participant is an arbitrary slice. So the design's own graph is best consumed through a SECOND call to the `traverse` tool — which means the graph's benefit is not free at read time either, and a system that answers in one call may beat a better-structured system that needs two.

**Three. Edges tax the thing that works.** Embedded edges compete for topK against the memories that carry the actual sentences. I have capped that with `maxPerType: {edge: 2}` and with suppression on mirror edges, but the honest position is that every embedded edge is a bet that a structural sentence will out-rank a content sentence, and I do not know the hit rate.

**Four. Extraction is lossy and verbatim is not.** Rung 0 cannot miss a claim, because it stores everything. Rung 2 can, and any claim it drops is gone from the ranked list even though the store technically holds it at rung 0. If the rung-2 extractor is mediocre, rung 0 alone may beat rung 0 plus a bad rung 2 — which is an argument for keeping rung 0 permanently rather than treating it as scaffolding.

**What I am nevertheless confident of, and why I built the graph anyway.** Identity resolution is the one thing a vector index structurally cannot do. Two mentions of the same pet in sessions 3 and 19 are near each other in embedding space and are still two records; no topK merges them, and no reranker can. That is rung 3's registry, and it is worth building even if the traversal on top of it turns out to be decoration — the registry alone makes `entityIds` correct, and correct `entityIds` is what makes the `traverse` tool, the entity-name lexical index, and every linked record's embed text work.

If the measurement shows the graph adding nothing, the correct conclusion is not that structure is worthless. It is that the structure was consumed through the wrong door, and the next experiment is the two-call read, not more edges.

## What would falsify the graph claim

Run four ingests of the same corpus and compare accuracy on an identical question set, with identical read parameters except where stated:

- **A — floor:** rung 0 only, `recall(topK: 20, traverse: 0)`.
- **B — claims:** rungs 0+1+2, `recall(topK: 20, traverse: 0)`. No entities beyond the two participants, no edges.
- **C — graph, cheap door:** rungs 0-4, `recall(topK: 20, maxPerType: {edge: 2}, traverse: 1)`.
- **D — graph, precise door:** rungs 0-4, `recall(topK: 20, maxPerType: {edge: 2}, traverse: 0)` followed by a `traverse` call from the top-ranked entity with `edgeLabels` matching the question's relation, `direction: both`, `includeChrono: true`, `includeMemories: true`, `limit: 200`.

The graph claim is **falsified** if `C - B` and `D - B` are both within run-to-run variance. In that case rungs 3 and 4 are decoration for conversational memory and the specification should collapse to B, keeping only the participant entities and dropping every edge label.

The graph claim is **half-falsified — and this is the outcome I consider most likely** — if `C ≈ B` but `D > B`. That says the structure is real but recall's expansion cannot use it, because it cannot filter by label or bound a hub's degree. The correct response is then to stop writing embedded edges entirely (set `suppressEmbeddings: true` on all fourteen labels, reclaiming every topK slot they consume) and to make the two-call read the documented default.

A separate, cheaper falsification of the *embedded* half alone: re-run C with `types` excluding `edge`. If accuracy does not drop, embedded edges were never earning their rank slots, whatever the traversal is worth.

And a falsification of the date machinery specifically: re-run B with every `properties.startsOn` / `properties.statedOn` mirror removed and every chrono downgraded to a memory. If accuracy is unchanged, the entire chrono apparatus — types, statuses, precision windows, the resolution table — is bookkeeping, and the honest specification stores dates only as words inside self-contained memory text.
