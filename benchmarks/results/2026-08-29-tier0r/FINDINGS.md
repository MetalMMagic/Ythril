# Tier 0-R — what the run found

`REPORT.md` is generated from `rows.json` and covers the shipped-default cell. This file is written by hand and
covers the two sweeps, which is where the findings are. Both sweeps ran over the **already-ingested spaces**, so
every configuration saw a byte-identical corpus and nothing was re-written between cells.

## 1 · The headline: strict recall collapses as evidence count rises

S0, 199 questions, `topK: 20`, no traverse:

| evidence turns | questions | all evidence | any evidence |
|---|---|---|---|
| 1 | 160 | 74.4% | 74.4% |
| 2 | 21 | 57.1% | 81.0% |
| 3 | 8 | 12.5% | 100.0% |
| 4 | 4 | 0.0% | 75.0% |
| 5+ | 6 | 16.7% | 66.7% |

Flat text finds **some** of a multi-hop question's evidence almost always and **all** of it almost never. The gap
between the two columns is the whole multi-hop problem, and it is visible without a single model call.

## 2 · The three ingestion rungs are within 1.5 points of each other

| rung | what it stores | all evidence | any evidence |
|---|---|---|---|
| S0 | one memory per turn | **66.8%** | 75.9% |
| S0+ | S0 + participants, sessions, chrono, edges | 65.3% | 74.4% |
| S0G | the same turns modelled as entities + `said_in` edges | 66.3% | 75.4% |

**S0+ is not worse because structure is worthless.** It is worse because `entityIds` on a memory is read by
`memoryEmbedText`, which prepends the linked entities' NAMES to the fact before embedding. Same turn, same
query, measured directly across the two spaces: **0.8528 in S0, 0.8369 in S0+.** Linking a record changed its
ranking, which is a coupling between two independent concerns rather than a property of structure.

S0G re-models the same turns as entities so they can be edge endpoints, and lands back within half a point of
S0 — so the re-modelling itself is close to free. Its purpose was to make the graph reachable at all, and it did.

## 3 · Graph expansion currently costs accuracy, and the cause is not the graph

S0G, the only rung whose graph a search can actually walk:

| configuration | all evidence | any evidence | mean turns retrieved | strict, 3+ evidence |
|---|---|---|---|---|
| `topK 20`, traverse 0 | 66.3% | 75.4% | 20.0 | 11.1% |
| `topK 20`, traverse 1 | 66.3% | 75.4% | 20.0 | 11.1% |
| `topK 20`, traverse 2 | 60.3% | 69.3% | 9.4 | **0.0%** |
| `topK 20`, traverse 3 | 58.8% | 68.3% | 7.6 | **0.0%** |
| `topK 50`, traverse 2 | 63.3% | 74.4% | 12.8 | 5.6% |
| **`topK 50`, traverse 0** | **72.9%** | **82.4%** | 50.0 | **16.7%** |

Traverse is flat at depth 1 — one hop from a matched turn reaches only its session node, which carries no turn
id — and then actively harmful at depth 2 and 3, worst exactly where the graph was supposed to help.

**The cause is budget eviction, not a useless graph.** Same space, same query, only `traverse` changed:

| | results | turn records | `_graph` inline | `graphNodes` | bytes | `truncated` |
|---|---|---|---|---|---|---|
| `traverse: 0` | **20** | 20 | 0 | — | 12,233 | false |
| `traverse: 2` | **6** | 6 | 4 | **193** | 99,307 | true |

The default byte budget is 100,000. Graph expansion attaches `_graph` to every match, the response reaches the
budget, and **the result list is truncated from 20 matches to 6** — the caller loses 70% of what they searched
for in exchange for four neighbours. `graphNodes: 193` counts the neighbourhood that was *found*; four reached
the caller.

Worth stating precisely, because it rules out the obvious explanation: **there were no memories or chronos in
that graph.** Recall's expansion walks `_edges` and hydrates only from `_entities`, and has no include-flags at
all — every one of the 193 nodes was an entity. So this is not "traversal drags in big records"; the matches and
their own decoration compete for one budget and the matches lose.

## 4 · The best configuration measured is `topK 50` with traverse OFF

72.9% strict, 82.4% loose, 16.7% on multi-hop. Every traversing configuration scored below it. That is a
statement about the byte budget's priority, not about graphs, and it should be re-measured once a match can no
longer be evicted by its own `_graph`.

## What none of this says

Recall is not accuracy — no model answered anything here. An unretrieved turn may still be answerable from
elsewhere in the transcript. And a configuration that returns more of everything scores better on this metric
while being worse in use, which is why the mean-records column sits beside every score.
