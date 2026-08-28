# Benchmarks

Long-conversation memory benchmarks for Ythril, run against **LoCoMo** and **LongMemEval**, with the method fixed
in [`PROTOCOL.md`](PROTOCOL.md) before any result existed.

## Read this first

**[`PROTOCOL.md`](PROTOCOL.md) is pre-registered.** It was committed before the first run, and that ordering is
checkable:

```bash
git log --diff-filter=A --format='%ad  %h  pre-registered' -- benchmarks/PROTOCOL.md
```

Every result file records the commit it was produced at, so any reader can confirm the method predates the
number. Amendments are appended to the protocol with a date and a reason; a silent edit invalidates the runs it
covers.

## Why this folder is separate from `testing/`

`testing/` holds gates — things that must pass before a change ships, run by CI on every commit. A benchmark is
not a gate. It is a **measurement that gets published**, it costs real money in model calls, and it is allowed to
produce a bad number without blocking anything.

Mixing the two would make one of them worse: either the benchmark starts gating merges and gets quietly tuned
until it passes, or the gates start being treated as advisory. `testing/bench/` is a third thing again — licence
evidence for candidate models — and is unrelated to this folder despite the name.

## Layout

| path | what it holds |
|---|---|
| `PROTOCOL.md` | the pre-registered method. Frozen; amendments appended |
| `INGESTION.md` | how a conversation becomes records — a PRODUCT specification, written blind to the questions, carrying the sceptic's case and the experiment that would falsify the graph claim |
| `pins.json` | dataset sources, commits, `sha256` per file, licences, and the counts observed at pin time |
| `configs/` | the exact configuration of every system under test, ours and every competitor's, with the doc link the competitor's config came from |
| `prompts/` | the answering prompt and the judge prompt, verbatim — the two files that move published scores most and are published least |
| `harness/` | the runner: ingest, retrieve, answer, grade |
| `results/<date>-<commit>/` | scores, per-conversation breakdowns, and **every raw model output** |

## Cost, and the tier you are running

A benchmark nobody can afford to re-run is not reproducible, whatever the harness claims. The run is tiered, each
tier a superset of the last, and **the floor is a complete publishable result** rather than a smoke test:

| tier | scope | order of magnitude |
|---|---|---|
| **0 — floor** | LoCoMo, a stratified question subsample, ingestion S0 and S4 only, shipped-default retrieval, no grid, one seed | **~1,000 model calls** |
| **1 — reportable** | adds the S2 rung, the 14-cell one-axis-at-a-time grid on lexical grading, three seeds on the head-to-head, one competitor | single-digit thousands |
| **2 — complete** | adds LongMemEval, the remaining ingestion rungs, the full question set, the same-facts-into-both-stores isolation run | tens of thousands |

Four things keep those numbers down without giving up anything measurable:

- **One axis at a time**, not a full factorial — 14 grid cells instead of 144. What that gives up is interaction
  effects, which on ten conversations are smaller than the run-to-run spread and therefore not findings.
- **Grid cells are graded lexically**, which is free; the judge is spent on the head-to-head, plus the best and
  worst three cells to check the free metric ranks them the same way.
- **Extraction output is cached and committed.** Ingestion is per conversation, not per question, so it is paid
  once — a harness that re-extracts per seed turns the cheapest part of the run into the most expensive.
- **One judge call grades every candidate for a question**, which the blind shuffle already made possible and
  which is better judging as well as cheaper.

**Every result names its tier**, so a Tier 0 number is never quoted as though it were Tier 2, and a subsampled
result says so with its size.

## Running it

```bash
npm run bench
```

It needs API credentials for the answerer and judge models, and it will refuse to start rather than silently
substitute a different model if a pinned one is unavailable — a benchmark that quietly swaps the judge is not
measuring what its results claim.

## What the results will and will not say

- **Every category is reported, including ones we lose.** That is a rule in the protocol, not an aspiration.
- **Two metrics side by side** — the dataset's own lexical metric, and an LLM judge whose prompt is in this
  folder and whose agreement with a human grader is measured and published.
- **Cost and latency in the same table as accuracy**, because accuracy alone flatters whichever system is
  allowed to spend the most.
- **A contamination-excluded score** beside the headline: every question the answerer gets right with *no*
  conversation at all is removed, since the datasets are public and part of any score is recognition rather than
  retrieval.
- **No claim from a difference smaller than the run-to-run standard deviation.** On a ten-conversation dataset
  that will happen, and it will be reported in those words.
- **Six ingestion strategies scored separately** — raw turns, **deterministic structure (free: the speakers and
  every session's real timestamp, which the dataset already states)**, session summaries, atomic facts, facts +
  graph, facts + graph + chrono — because how a conversation becomes records is a bigger lever than any retrieval knob,
  and it is the half a results table normally hides. The rungs are the interesting comparison: facts → graph
  should move **multi-hop** specifically, graph → chrono should move **temporal**, and if they do not, that is a
  finding about this product and it gets published as one. The ingest stage is structurally prevented from seeing
  the questions.
- **Seven retrieval methods scored separately** — vector only, lexical only, hybrid, hybrid + rerank, hybrid +
  traverse, everything, and the deterministic `query` path — across a grid of `topK`, traverse depth, `minScore`,
  byte budget and rerank. **The whole grid is published, not its winner**, and the head-to-head number against a
  competitor uses the shipped defaults declared before the first run. Picking the best cell of a forty-cell grid
  on ten conversations is measuring noise, and the results say so where it applies.

## The point

A memory benchmark is only worth as much as the method behind it, and this field's published comparisons have
lost credibility by dropping inconvenient categories, hiding judge prompts, and running competitors on defaults.
The strongest thing this folder can contain is not a high score — it is a number a sceptic can re-derive from a
clean checkout, and the raw outputs to argue with.
