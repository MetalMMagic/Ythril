# Recall & Similarity

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Recall & Similarity

### Semantic Search (Recall)

Available as both:

- REST: `POST /api/brain/spaces/:spaceId/recall`
- MCP tool: `recall`

```json
{
  "query": "how does OAuth PKCE work?",
  "topK": 10,
  "types": ["memory", "entity"],
  "minScore": 0.65
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `query` | ✅ | — | Natural-language search text (non-empty string) |
| `topK` | — | `10` | Max returned results (1-100) |
| `types` | — | all types | Restrict result knowledge types |
| `minScore` | — | none | Filter out low-similarity matches |
| `filter` | — | none | Property equality/comparison filter (see below) |
| `tags` | — | none | Array of strings — restrict to records carrying these tags |
| `minPerType` | — | none | Object mapping knowledge type → minimum hits, e.g. `{ "entity": 2 }`. Guarantees at least that many results of the type; each value is clamped to `topK` |
| `maxPerType` | — | none | Object mapping knowledge type → **maximum** hits, e.g. `{ "file": 2 }` — the ceiling to `minPerType`'s floor. A slot the cap frees goes to another type. Each value must be at least `1` and is clamped to `topK`; a value below `minPerType` for the same type is a `400` (see below) |
| `maxTimeMS` | — | the instance budget | Deadline for this recall, in ms. **Can only lower the instance's `RECALL_BUDGET_MS`, never raise it** — a larger value is clamped to it, and a very small one is clamped up to a 250 ms floor. On expiry you get a **partial** answer with a `degraded` field, not an error and not a hang |
| `traverse` | — | `0` | Graph-expansion depth (integer 0–5). `0` = classic recall; > 0 follows edges from each match (see [Graph-Augmented Recall](#graph-augmented-recall-traverse-parameter)) |
| `includeFreshWrites` | — | `false` | Also scan the newest records straight from each collection, so a record written seconds ago is findable before the vector index has ingested it. See below. A non-boolean is a `400`, never coerced |
| `includeContent` | — | `true` | Whether file-chunk results carry `content` — the passage body. `false` returns locations and metadata only (path, heading, chunk index, tags, properties). A non-boolean is a `400`, never coerced |
| `includeDiagnostics` | — | `false` | Add back the fields a result carries for the SYSTEM rather than for you: `matchedText` (the exact pre-embedding source string — for a file chunk, the passage a SECOND time), `embeddingModel`, `seq`, and the per-stage `lexicalScore`/`fusedScore`/`rerankScore`. **Applies recursively**, so a `traverse` answer's `_graph` nodes and edges follow it at every depth. Off by default since 3.1.0 — before then this door sent all six unconditionally while MCP sent none. The embedding VECTOR is not among them and is never returned by anything. A non-boolean is a `400`, never coerced |

**Response** `200`:

```json
{
  "results": [
    { "_id": "...", "type": "memory", "fact": "...", "score": 0.91 }
  ],
  "count": 1
}
```

### Bounding a recall in time: `maxTimeMS` and `degraded`

A recall runs its hops in series — embed the query, search each collection, fuse the lexical channel, rerank —
and a slow one can outlast the client waiting for it. `maxTimeMS` puts the bound where the work is instead of
in each caller's HTTP timeout, which is the difference between a rule and a convention.

**What happens on expiry is the useful part: you get what finished.** Collections that answered are returned;
one that ran out of time contributes nothing and the response gains a `degraded` array:

```json
{
  "results": [ { "_id": "...", "type": "memory", "score": 0.83 } ],
  "count": 1,
  "degraded": ["search_timeout"]
}
```

| reason | meaning |
|---|---|
| `search_timeout` | at least one collection's vector search hit the deadline, so the answer is **partial** — fewer results than the corpus holds, not fewer results because the corpus is empty |
| `rerank_skipped_budget` | the cross-encoder was configured but not run: too little budget was left. The order is the hybrid-fusion order, which is a slightly worse ranking, delivered |
| `rerank_unavailable` | the cross-encoder was configured and did not answer (unreachable, non-2xx, unreadable body) |

**`degraded` is absent when nothing degraded** — it is not an empty array on every healthy response, because a
field that is almost always empty is one readers stop looking at. Treat its presence as "this answer is
thinner than it could have been", and note that the status is still `200`: partial results beat an error, and
both beat hanging.

**The clamps are deliberate.** `maxTimeMS` can only lower the instance's budget: letting a request body
extend it would hand any caller a denial-of-service lever, and how long the server may spend is the operator's
decision. A value below 250 ms is clamped up, because `maxTimeMS: 1` would otherwise be a guaranteed empty
answer, which reads as a broken parameter rather than an honoured one.

The same `degraded` field appears on `traverse > 0` responses, since seeds that were partial produce a partial
expansion and a longer list would otherwise hide it.

**A contradictory floor/ceiling pair is refused, not resolved.** `minPerType.entity: 5` with
`maxPerType.entity: 2` answers `400`, naming both values:

```json
{ "error": "minPerType.entity (5) is greater than maxPerType.entity (2) — the two contradict, so neither can be applied" }
```

Floor-wins and ceiling-wins are both defensible, which is exactly why the request has to say which it meant.
A `maxPerType` value of `0` is refused for the same kind of reason — it would be a second, less obvious way to
spell `types` without that type.

Searches **all knowledge types** (memories, entities, edges, chrono entries, and files) and includes a
`type` discriminator field on every result. No configuration needed — the defaults below are what a
fresh instance does.

#### How a result is ranked

Recall runs up to three stages. Each is independent, each degrades to the previous one if it is
unavailable, and **none of them can fail a search** — a stage that cannot answer simply has no opinion.

1. **Vector search** (always). The query is embedded with the same model and the same task prefix used at
   index time, and MongoDB `$vectorSearch` returns the nearest records per type. This produces `score`.

2. **Lexical search + rank fusion** (automatic). In parallel, a MongoDB `$text` (BM25-family) query ranks
   the same records lexically, producing `lexicalScore`; the two rankings are combined by **Reciprocal
   Rank Fusion** into `fusedScore`.

   This exists because vector search compares *meaning*, which is the wrong tool for the tokens a corpus
   is most precise about — article numbers, form ids, part codes, clause names, proper nouns. An opaque
   identifier has no useful semantic neighbourhood, so the right record could rank below plausible prose
   and fall outside `topK`. Nothing errored; the answer was just built from the wrong passages.

   Fusion uses **rank, never raw score**: `textScore` is unbounded and grows with term rarity, cosine is
   bounded, and any normalisation between them would need a calibration that drifts as a space grows. A
   record ranked well by *both* channels outranks one that wins a single channel — agreement between an
   exact-token match and a semantic match is the strongest signal either gives.

   The channel both **reorders** the candidate set and can **introduce** a record the vector search did
   not return at all — which matters most for exactly the queries it exists for, since an opaque
   identifier's embedding is nearly arbitrary and its record is therefore the most likely to sit outside
   the vector candidate pool.

   An introduced record is not given an invented score. Its embedding is read and compared against the
   query vector directly, so its `score` is measured on the same scale as every other result and
   `minScore` filters it exactly as it filters the rest. The mapping from raw similarity to the reported
   `score` is *verified on every query* rather than assumed: any record that appears in both channels
   already carries an engine-reported score, and its locally recomputed value must match. If they
   disagree — or if no record overlaps, leaving nothing to check against — **no record is introduced**
   and the channel falls back to reordering alone.

   Set `YTHRIL_HYBRID_SEARCH=off` to disable the whole channel.

3. **Cross-encoder reranking** (only when configured). If `mediaEmbedding.rerank` names an endpoint and a
   model, a cross-encoder reads the query and each candidate passage *together* and scores the actual
   match, producing `rerankScore`. A bi-encoder can only compare two independently-computed summaries of
   meaning; a cross-encoder reads the pair. That is what lifts precision in the top few results.

   It has no index, so it can only re-order what stages 1–2 found — hence `candidateMultiplier`, which
   widens the pool it gets to choose from. Unreachable or unconfigured means no opinion, and the fused
   order stands. See the `mediaEmbedding.rerank.*` rows in [Configuration](05b-media-embedding.md#configuration).

**Ordering precedence is `rerankScore` → `fusedScore` → `score`** — the order of how much each signal
actually knows.

#### `minScore` always filters on `score`

This is deliberate and worth being explicit about: `minScore` is a **vector-similarity** floor and stays
one. The three scores are on unrelated scales, so reinterpreting a caller's fixed threshold against a
fused rank or a cross-encoder logit would change what that threshold returns without anyone touching it.
Ordering may use the better signal; filtering does not.

The extra scores are returned when they were produced, so a caller can see why a result placed where it
did:

```json
{
  "results": [
    {
      "_id": "...", "type": "file", "path": "specs/NMK-240C.md",
      "score": 0.71,
      "lexicalScore": 4.83,
      "fusedScore": 0.0325,
      "rerankScore": 0.94
    }
  ],
  "count": 1
}
```

`lexicalScore` is absent when the record did not match lexically; `fusedScore` when hybrid is off;
`rerankScore` when no reranker is configured or it did not answer.

**The MCP `recall` tool returns `score` only.** Every field it returns is multiplied by `topK` and paid
for in tokens by whoever called it, so the per-stage scores are deliberately omitted there and kept here,
where the caller is a program and the response is not a model's context window.

#### A request using every capability

Nothing here is required — this is one call exercising all eight parameters at once, to show how they
compose.

```json
POST /api/brain/spaces/dev-apps/recall
{
  "query": "PKCE failures on form NMK-SI-11 during the auth rewrite",
  "topK": 20,
  "types": ["memory", "entity", "chrono", "file"],
  "tags": ["auth", "postmortem"],
  "minPerType": { "entity": 2, "chrono": 1 },
  "minScore": 0.55,
  "traverse": 1,
  "filter": {
    "properties.severity": { "in": ["high", "critical"] },
    "properties.reviewCount": { "gte": 2 },
    "properties.supersededBy": { "exists": false },
    "status": { "ne": "cancelled" }
  }
}
```

Read in the order the server applies them:

| Parameter | What it does here |
|---|---|
| `query` | Ranked semantically **and** lexically. `NMK-SI-11` is the reason the lexical channel matters — its embedding carries almost no meaning. |
| `types` | Restricts which collections are searched at all. Edges are excluded. |
| `tags` | Hard filter, **AND** semantics — a record must carry *both* `auth` and `postmortem`. |
| `filter` | Hard filter. Keys must start with `properties.`, `tags`, `type`, `name`, `status` or `label`; any other key is rejected. Operators: `eq`, `ne`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`. All conditions must match. |
| `minPerType` | Guarantees a floor per type *if that many exist*, so a flood of file passages cannot crowd out every entity. Each value is clamped to `topK`. |
| `maxPerType` | The ceiling to that floor, and the other half of the same problem: one long file passage that scores well can take slots several one-line records would have answered more cheaply. A candidate whose type is already at its cap is **skipped and the walk continues**, so the freed slot goes to another type rather than shortening the list. |
| `minScore` | Applied **last**, on the vector score, and it can drop a `minPerType`-guaranteed result — a floor is a request for coverage, not a licence to return matches you called too weak. |
| `topK` | The final cut. |
| `traverse` | After the cut, follows knowledge-graph edges outward from every match (both directions) and nests the connected entities **under the match that reached them**. |

**`traverse > 0` adds `_graph` to each match** — this is the one thing worth knowing before using it. The
results stay the matches, in rank order, exactly as `traverse: 0` returns them; what the graph reached hangs
off the match that reached it:

```json
{
  "results": [
    {
      "_id": "…", "type": "file", "path": "runbooks/NMK-SI-11.md",
      "score": 0.71, "lexicalScore": 4.83, "fusedScore": 0.0325, "rerankScore": 0.94,
      "matchedText": "Form NMK-SI-11 must be filed within 6 hours…",
      "_graph": [
        {
          "edge": {
            "_id": "…", "from": "runbooks/NMK-SI-11.md", "to": "security-team", "label": "owned-by",
            "description": "the team that signs the form off", "tags": ["ownership"],
            "createdAt": "2026-07-02T09:14:00.000Z"
          },
          "node": { "_id": "…", "type": "entity", "name": "security-team" },
          "paths": [["<match id>", "<security-team id>"]]
        }
      ]
    }
  ],
  "count": 1,
  "traverseDepth": 1,
  "graphNodes": 1
}
```

| field | meaning |
|---|---|
| `count` | the number of **matches** — what `topK` bounds |
| `graphNodes` | how many traversed nodes the trees hold in total |
| `edge` | the **whole** edge document for the hop that reached this node, including its `description` and `tags` |
| `node` | the reached record |
| `paths` | **every** route from a match to this node, record ids, match first. `paths[0]` is the route it is nested under, so `paths[0].length - 1` is the hop count |
| `pathsTruncated` | present and `true` only when a node had more routes than were recorded |
| `_graph` | on a nested node too — depth is a tree, so a two-hop node hangs off the one-hop node that reached it |

A traversed node carries **no score**. It was reached structurally, not matched: it has no similarity to the
query, and it is not in the ranked list at all — so there is no `null` competing with a real score, and
nothing for `minScore` or `topK` to act on that nobody measured.

An ordered array of ids **is** the direction — match first, this node last — so there is no orientation to
work out. The hop labels along the nesting route are not lost either: each node on it carries its own `edge`,
so walking the tree yields the chain in order. Only the last hop of an *alternate* route has no label, and
both of its endpoint ids are right there.

The MCP `recall` tool takes the same parameters, plus `space` (omit it to search every accessible space):

```json
{
  "space": "dev-apps",
  "query": "PKCE failures on form NMK-SI-11 during the auth rewrite",
  "topK": 20,
  "types": ["memory", "entity", "chrono", "file"],
  "tags": ["auth", "postmortem"],
  "minPerType": { "entity": 2, "chrono": 1 },
  "minScore": 0.55,
  "traverse": 1,
  "filter": {
    "properties.severity": { "in": ["high", "critical"] },
    "properties.reviewCount": { "gte": 2 },
    "properties.supersededBy": { "exists": false },
    "status": { "ne": "cancelled" }
  }
}
```

**Performance note.** `tags`, `type`, `name`, `status`, `label` — and, on spaces whose schema declares
them, `properties.<key>` — are pushed into the vector index as native pre-filters. Undeclared
`properties.*` and `exists` are still correct but scan exhaustively, so prefer declared fields on large
spaces. `traverse` above 2 on a dense graph is slow; narrow the seed set with `tags`/`filter` first.

#### Graph-Augmented Recall (`traverse` parameter)

By default `recall` returns matches in isolation — the knowledge-graph edges between records are not consulted. Set `traverse` to an integer between `1` and `5` to follow the graph outward from every match: for each seed, the server walks edges (in **both** directions) up to `traverse` hops and returns the connected entities alongside the matches. This turns semantic search into context-aware retrieval — "recall the Vault service **and everything connected to it**" in one call, instead of a recall followed by manual `traverse`/`query` calls.

`traverse: 0` (the default) is behaviourally identical to classic recall and returns the classic response shape above. When `traverse > 0` the results are unchanged and each one gains a `_graph` array holding what the walk reached from it, plus `traverseDepth` and `graphNodes` on the envelope.

> **This parameter and the [`/traverse` endpoint](04b-graph-api.md#traverse-graph) are different tools that share a name.**
> The difference is where the walk STARTS, and it decides which one you want:
>
> | | starts from | use it when |
> |---|---|---|
> | `recall` with `traverse: n` | whatever the query matched semantically | you can *describe* the starting point but do not know its id |
> | `POST /traverse` | one entity id you supply (`startId`) | you already *have* the node and want its neighbourhood |
>
> Both walk edges in both directions, so neither is "the directional one". An integrator read this section,
> concluded that graph expansion only ever radiates outward from semantic matches, and hand-walked the edge
> list in two flows — the endpoint below does exactly what they were building by hand.

```json
{
  "query": "authentication token scoping",
  "types": ["entity"],
  "traverse": 2
}
```

**Response** `200` (when `traverse > 0`):

```json
{
  "results": [
    {
      "_id": "adr-0042", "name": "Token Scoping", "type": "decision", "score": 0.91,
      "_graph": [
        {
          "edge": {
            "_id": "e-42-79", "from": "adr-0042", "to": "adr-0079", "label": "implements",
            "description": "0079 is how 0042 was carried out", "tags": [],
            "createdAt": "2026-05-11T08:00:00.000Z"
          },
          "node": { "_id": "adr-0079", "name": "Vault Integration", "type": "decision" },
          "paths": [["adr-0042", "adr-0079"]],
          "_graph": [
            {
              "edge": { "_id": "e-79-88", "from": "adr-0079", "to": "adr-0088", "label": "supersedes" },
              "node": { "_id": "adr-0088", "name": "Vault Rotation", "type": "decision" },
              "paths": [["adr-0042", "adr-0079", "adr-0088"], ["adr-0042", "adr-0051", "adr-0088"]]
            }
          ]
        }
      ]
    }
  ],
  "count": 1,
  "traverseDepth": 2,
  "graphNodes": 2
}
```

| Field | Meaning |
|-------|---------|
| `count` | The number of **matches**, which is what `topK` bounds. It does **not** include traversed nodes |
| `graphNodes` | How many traversed nodes came back in total, across every match |
| `edge` | The **whole** edge document for the hop that reached this node — `description` and `tags` included |
| `node` | The reached **entity** document |
| `paths` | Every route from a match to this node, record ids, match first. `paths[0]` is the nesting route; `paths[0].length - 1` is the hop count |
| `pathsTruncated` | Present and `true` only when a node had more routes than were recorded (cap: 8) |
| `_graph` | Present on a nested node too, so depth is a tree: `adr-0088` hangs off `adr-0079`, which hangs off the match |
| `graphTruncated` | Present and `true` only when the inline graph is **short of the real neighbourhood** |
| `graphComplete` | Present with it: `{nodes, path, download, expiresAt}` — where the **whole** graph was written |

Note `adr-0088` above: it is reachable two ways and appears **once**, with both routes in `paths`. A caller
counting rows never double-counts a record, and no relationship is invisible.

**Guard rails:**

- **Depth cap:** `traverse` must be `0`–`5`. A value of `6` or higher (or a negative/non-integer value) returns `400` — it is rejected, not clamped.
- **Node cap, and it is a spill point rather than a truncation point:** the inline traversed nodes are capped at
  `topK × (traverse + 1) × 4` minus the matches, preferring lower-hop records. When the neighbourhood is bigger
  than that, the **complete** graph is written to the space's `_tmp/` as JSON and the response carries
  `graphTruncated: true` plus `graphComplete`:

  ```json
  {
    "graphNodes": 7,
    "graphTruncated": true,
    "graphComplete": {
      "nodes": 30,
      "path": "_tmp/graph-9f1c….json",
      "download": "/api/files/dev-apps?path=_tmp%2Fgraph-9f1c….json",
      "expiresAt": "2026-08-14T15:41:00.000Z"
    }
  }
  ```

  So a caller either receives the whole neighbourhood inline or receives a link to the whole neighbourhood —
  never a silently short one. There is no `total` for a neighbourhood to compare against, and a short graph
  reads as *"this record has few relationships"*, which is a wrong conclusion about the data rather than about
  the request.

  - The **download is the ordinary authenticated file route** — your own token, the space's own access control.
    Which also means a token with brain read but **no files read** receives a link it cannot fetch. It still
    learns the graph was short, which is the part that was previously invisible; grant `files: read` on the
    space if you want the spill itself.
  - The file **expires after one day** and is removed with its record by the retention sweep.
  - It is **hidden from file browsing** (like `_converted/` and `_extracted/`) and is **never embedded**, so it
    cannot come back as a recall hit.
  - The spill walk is itself bounded, at 20× the inline cap. If even that is reached, `graphComplete.ceilingHit`
    is `true` and the same flag is inside the file — a second silent truncation inside the fix for the first one
    would be the same defect again.
- **Cycle-safe:** each record is visited once, so a circular graph (A→B→C→A) never loops or produces duplicates. A record reachable by several routes is nested under the **shortest** one, with the rest in `paths`.
- **Space-scoped:** traversal stays within the spaces the calling token may access. An edge pointing at a record in a space the token cannot see (or at an id that is not an entity) is silently skipped — no data and no `403` leak.
- Only **entities** are returned by traversal (edges connect entities); memories, chrono entries, and files still appear as seeds when they match semantically.

**Performance:** traversal issues roughly two batched (`$in`) MongoDB queries per hop, not one query per node. Even so, `traverse > 2` on a densely-connected graph can fan out quickly — pair it with `filter`, `tags`, or a low `topK` to keep the seed set (and therefore the traversal frontier) tight.

#### A large answer comes back as a sample and a download

A recall cannot be paged — `topK` is the answer, not a window into it — so an answer that is too large to return
has nowhere to go. Past **25 records** (matches plus traversed nodes) the whole result set is written to the
space's `_tmp/` as JSON and the response carries **three matches** as a sample plus the link to all of it:

```json
{
  "results": [ /* 3 matches, complete, each with its own `_graph` */ ],
  "count": 100,
  "graphNodes": 240,
  "truncated": true,
  "complete": {
    "matches": 100,
    "records": 340,
    "inline": 3,
    "path": "_tmp/results-9f1c….json",
    "download": "/api/files/dev-apps?path=_tmp%2Fresults-9f1c….json",
    "expiresAt": "2026-08-14T20:11:00.000Z"
  }
}
```

- **`count` is the real total**, never the sample. A caller reading `count: 3` would conclude the space holds three
  matching records.
- The file is **self-describing**: it repeats the request that produced it, the counts, and its own expiry.
- **No embedding vectors are written**, at any depth — a result set serialised verbatim is the one place they
  would otherwise land in a file an operator opens.
- Same authenticated download and same **one-day** expiry as the graph spill below.

#### Recall without passage bodies (`includeContent`)

A file result's `content` is the passage body, and it is by far the largest field a result carries — paid for
`topK` times, in tokens. `includeContent: false` omits it and returns everything needed to decide *which*
passage you want: path, heading, chunk index, tags, properties.

```json
{ "query": "retention policy", "types": ["file"], "includeContent": false }
```

That turns one expensive call into a cheap two-phase flow — recall to find **where** something is, then read
only the chunk you chose (`GET /api/files/:spaceId/…`). MCP `recall` and `find_similar` have taken the same
flag with the same meaning since they shipped; REST had no way to ask, which an integrator pointed out.

It drops `content` and nothing else, on file results and nothing else — the flag is about the passage body,
not about thinning a result. The default is `true`, so no existing caller changes.

#### Searching for something you just wrote (`includeFreshWrites`)

`$vectorSearch` reads an index, and that index lags behind the collection. The vector is on the document the
moment it is written — insert-time duplicate detection sees a brand-new record immediately — but recall does
not see it until mongot has ingested it. **An integrator measured a memory still invisible to recall 150
seconds after writing it**, polled every 5 s, for a distinctive nine-word phrase.

`includeFreshWrites: true` also scans the newest records straight from each collection, which is exactly the
set the index has not caught up with:

```json
{ "query": "the phrase I just stored", "includeFreshWrites": true }
```

- **A fresh hit is indistinguishable from an indexed one** — same shape, same `score`, same per-type fields.
  You cannot tell which channel found a record, and should not need to.
- **It is off by default**, and that is a decision rather than an omission. The scan is paid per knowledge
  type, and recall is a path somebody is waiting on. Turn it on for the case it exists for: searching for
  something you just wrote. Bounded by a time window and a document cap, so its cost tracks how much has been
  written recently rather than how large the space is (~9 ms with an empty window, ~52 ms with a full one, at
  20k records).
- **`exact: true` is not an alternative** and was measured not to be. It scans the index exhaustively rather
  than the collection, so it skips the approximate traversal, not mongot: on the same insert, ANN first saw
  the record after 1088 ms and ENN after 1083 ms.

Operators can see whether the lag is biting on their instance: `ythril_recall_fresh_writes_found_total`
counts records returned that the index had not yet ingested. Zero means the index is keeping up with writes.

#### Prefiltered Recall (`filter` parameter)

Use `filter` to restrict results to records where specific properties match a condition.

**Two grammars are accepted.** The operator-object form below is unchanged: one operator object per key, AND-ed across
keys. **Raw MongoDB is also accepted** — the same operators `query` takes (`$or`, `$and`, `$not`, `$nor`, `$in`, `$regex`,
`$elemMatch`, the comparisons), nested to depth 8, validated by the same parser with the same refusals.

That exists because the operator-object form cannot express an OR at any length, so a caller who wanted meaning-ranking
*and* a real predicate had to run `query` first and feed ids into something else:

```json
{
  "query": "authentication architecture decisions",
  "types": ["entity"],
  "filter": {
    "type": "message",
    "$or": [
      { "properties.status": "open" },
      { "properties.kind": { "$in": ["ask", "request"] } }
    ]
  }
}
```

Three rules apply to both grammars:

- **A filter that MIXES them is a `400`** naming the offending keys, rather than one half quietly winning.
- **The key allowlist still applies**, recursively — including inside `$or`. Keys must start with `properties.`, `tags`,
  `type`, `name`, `status` or `label`. Widening the grammar did not widen the keys, because a recall filter that could name
  any field would be a way to filter a vector search on fields the index cannot serve.
- **A raw filter takes the exhaustive path.** `$or` and `$regex` cannot be pushed into `$vectorSearch` as a native
  pre-filter, so the whole space is scored and then filtered — slower, same records, and still nothing dropped by `topK`.

The operator-object form keeps the native pre-filter path where the fields are declared, so existing callers lose no
performance.

```json
{
  "query": "authentication architecture decisions",
  "types": ["entity"],
  "filter": {
    "properties.status": { "eq": "accepted" },
    "properties.domain": { "eq": "security" }
  }
}
```

**Supported operators:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Exact equality | `{ "eq": "accepted" }` |
| `ne` | Not equal | `{ "ne": "draft" }` |
| `in` | Value is in array (any-of) | `{ "in": ["security", "auth"] }` |
| `exists` | Property is/isn't present | `{ "exists": true }` |
| `gt` | Greater than (numeric) | `{ "gt": 10 }` |
| `gte` | Greater than or equal | `{ "gte": 5 }` |
| `lt` | Less than (numeric) | `{ "lt": 100 }` |
| `lte` | Less than or equal | `{ "lte": 99 }` |

Multiple operators on the same key are AND-ed (range queries):

```json
{ "properties.score": { "gte": 50, "lt": 100 } }
```

**Allowed filter key prefixes:** `properties.`, `tags`, `type`, `name`, `status`, `label`. Any other key returns `400`. This prevents filter-key injection attacks.

**Examples:**

```json
// Only accepted ADRs
{ "filter": { "properties.status": { "eq": "accepted" } } }

// Records tagged with "security" OR "auth" (any-of)
{ "filter": { "tags": { "in": ["security", "auth"] } } }

// Entities of type "service" with a count property > 0
{ "filter": { "type": { "eq": "service" }, "properties.count": { "gt": 0 } } }

// Records where properties.domain exists
{ "filter": { "properties.domain": { "exists": true } } }
```

> **Performance note:** A filter that references only declared index fields — `tags`, `type`, `name`, `status`, `label`, and any schema-declared `properties.<key>` — using the operators `eq`, `in`, `gt`, `gte`, `lt`, or `lte` is pushed into a native `$vectorSearch` `filter` and runs as `exact:true` search restricted to the matching subset, so cost is proportional to the number of matching records rather than the whole collection. Only undeclared dynamic `properties.*` keys, `exists`, and `ne` fall back to the exhaustive ENN path, which scores every document in the space before applying the filter. To keep a heavily-filtered property on the fast path, declare it in the space schema rather than adding a standalone MongoDB index.

**What is vector-indexed:**

| Data type | Embedded? | Fields included in embedding text | Returned by `recall`? |
|-----------|:---------:|-----------------------------------|:---------------------:|
| `memory` | ✅ | `tags` + entity names + `fact` + `description` + `properties` | ✅ |
| `entity` | ✅ | `name` + `type` + `tags` + `description` + `properties` | ✅ |
| `edge` | ✅ | `tags` + `from` + `label` + `to` + `type` + `description` + `properties` | ✅ |
| `chrono` | ✅ | `type` + `status` + `title` + `tags` + `description` + `properties` | ✅ |
| `file` | ✅ | `path` + `tags` + `description` | ✅ |

> **Note — `properties` in the embedding text.** `properties` are embedded as `key value`
> pairs (both the key *and* the value), so a phrase living only in `properties.outcome` is
> findable via `recall`. `edge` and `chrono` did **not** embed `properties` in releases up to
> 1.4.4 — if you are upgrading, existing records keep their old embedding until they are
> re-embedded. Reindex a space to pick up the change:
> `POST /api/brain/spaces/:spaceId/reindex`.

---

### Find Similar (Vector Similarity by Entry ID)

```http
POST /api/brain/spaces/:spaceId/find-similar
```

Given an existing entry's `_id`, find other entries with high vector similarity. Unlike `recall` (which re-embeds a text query), `find_similar` uses the entry's **stored embedding vector** directly — no re-embedding step. Ideal for deduplication, "more like this", and merge detection.

> **Also available as MCP tool:** `find_similar` — note the MCP tool makes `space` optional (omit it to search all accessible spaces, like `recall`); its `crossSpace` flag is deprecated in favour of omitting `space`. This REST endpoint keeps `spaceId` in the path and the `crossSpace` body flag. Every other parameter, including `traverse` and `includeContent`, is identical on both doors.

**Request body:**

```json
{
  "entryId": "<UUID of the source entry>",
  "entryType": "memory",
  "targetTypes": ["memory", "entity"],
  "topK": 10,
  "minScore": 0.7,
  "traverse": 0,
  "includeContent": true,
  "crossSpace": false
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `entryId` | ✅ | — | UUID of the entry to use as the query vector |
| `entryType` | ✅ | — | Knowledge type of the source entry (`memory`, `entity`, `edge`, `chrono`, `file`) |
| `targetTypes` | — | all types | Which knowledge types to search in |
| `topK` | — | `10` | Maximum results (1–100) |
| `minScore` | — | `0.0` | Minimum cosine similarity threshold |
| `traverse` | — | `0` | Graph-expansion depth (0–5). With `traverse > 0` each match is expanded along edges and the connected entities come back alongside it — see the response shape below |
| `includeContent` | — | `true` | Whether file-chunk results carry their passage `content`. `false` returns locations and metadata only, exactly as on `recall` |
| `includeDiagnostics` | — | `false` | Add back the fields a result carries for the SYSTEM rather than for you: `matchedText` (the exact pre-embedding source string — for a file chunk, the passage a SECOND time), `embeddingModel`, `seq`, and the per-stage `lexicalScore`/`fusedScore`/`rerankScore`. **Applies recursively**, so a `traverse` answer's `_graph` nodes and edges follow it at every depth. Off by default since 3.1.0 — before then this door sent all six unconditionally while MCP sent none. The embedding VECTOR is not among them and is never returned by anything. A non-boolean is a `400`, never coerced |
| `crossSpace` | — | `false` | If `true`, search across all spaces the token can access |

**Response** `200`:

```json
{
  "source": { "_id": "...", "type": "entity", "name": "auth-service", "score": 1.0 },
  "results": [
    { "_id": "...", "type": "entity", "name": "auth-gateway", "spaceId": "dev-apps", "score": 0.91 },
    { "_id": "...", "type": "memory", "fact": "Auth service uses PKCE...", "spaceId": "dev-apps", "score": 0.84 }
  ]
}
```

- `source` echoes the input entry with `score: 1.0` (self-match) — excluded from `results`
- Results sorted by `score` descending
- `spaceId` included on each result when `crossSpace: true`

**With `traverse > 0`** the response carries the same graph-augmented shape `recall` uses: each match gains a `_graph`
array of `{edge, node, paths}`, nested nodes carry their own `_graph`, and the envelope adds `traverseDepth` and
`graphNodes`. `count` stays the number of matches. The traversed nodes are capped at `topK × (traverse + 1) × 4` minus
the matches. It is the same builder behind both endpoints and both doors — see
[Graph-Augmented Recall](#graph-augmented-recall-traverse-parameter) for the field-by-field table.

```json
{
  "source": { "_id": "...", "type": "entity", "name": "auth-service", "score": 1.0 },
  "results": [
    {
      "_id": "...", "type": "entity", "name": "auth-gateway", "spaceId": "dev-apps", "score": 0.91,
      "_graph": [
        {
          "edge": { "_id": "...", "from": "...", "to": "...", "label": "depends_on", "description": "gateway calls it on every login", "tags": [] },
          "node": { "_id": "...", "type": "entity", "name": "token-service" },
          "paths": [["<match id>", "<token-service id>"]]
        }
      ]
    }
  ],
  "count": 1,
  "traverseDepth": 1,
  "graphNodes": 1
}
```

**Common use cases:**

| Use case | Parameters |
|----------|-----------|
| Dedup scan | `entryType: "entity"`, `targetTypes: ["entity"]`, `minScore: 0.90` |
| "More like this" | `topK: 5`, all target types |
| Cross-space merge detection | `crossSpace: true`, `minScore: 0.85`, `targetTypes: ["entity"]` |
| Memory consolidation | `entryType: "memory"`, `targetTypes: ["memory"]`, `minScore: 0.88` |
