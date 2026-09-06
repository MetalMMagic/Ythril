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

## What has actually been measured

One tier has been run. **Tier 0-R — evidence recall, with no model anywhere in the loop.** For each question
the turns the reference answer cites are known, a search is run, and the question asked is whether those turns
came back — and, since 2026-09-06, **whether the FIRST result was the right one**.

### The headline: was the first answer right

Full report and raw rows: [`results/2026-09-06-tier0r-rank/`](results/2026-09-06-tier0r-rank/). LoCoMo, dataset pinned by `sha256`,
199 questions sampled from the 1 982 that cite evidence, all ten conversations. Every rung is given the **same
25 000-character answer budget** with `topK` set high enough that the budget binds and not the record count —
otherwise a rung whose records are ten turns long is simply handed ten times the text.

| rung | all at rank 1 | top record chars | all within 3 | MRR | mean depth | all evidence |
|---|---|---|---|---|---|---|
| `s0w` — overlapping windows of 5 turns | **50.8%** | 717 | 69.3% | 0.703 | 2.9 | 86.4% |
| `s0` — one record per turn | **31.7%** | 177 | 46.2% | 0.513 | 5.7 | 73.4% |
| `s0wd` — the same windows, with the date in the text | **50.8%** | 779 | 66.3% | 0.709 | 2.9 | 86.9% |
| `s0e` — one record per recurring subject | **10.6%** | 1 322 | 17.6% | 0.228 | 4.1 | 31.7% |

- **`all at rank 1`** — the single top-ranked record held every turn the answer cites.
- **`top record chars`** — how big that first result was. It is printed beside the score because a record
  holding the whole transcript would rank first, contain everything, and score 100% having retrieved nothing.
- **`all within 3`** — everything the answer cites, inside the first three results. The question a reader
  actually has: is what I came for on the screen, or do I have to go looking.
- **`mean depth`** — how far down the list a caller had to read before holding all the evidence.
- **`all evidence`** — the old headline: did it come back *anywhere* in the results. Kept, demoted, never
  quoted alone.

### Why the last row is the most useful one here

`s0e` reaches the **most** of the conversation per query — 96.9 source turns against 77.7 and 48.5 — and is by
some distance the **worst** at answering. Gathering more text near a query is not the same as ranking the right
text first, and under the old coverage-only metric it would have read as a middling result rather than a bad
one.

That is the whole reason the headline changed. A retrieval score can be raised by ranking better or by
returning more, the second is far easier, and only one of them is retrieval.

### A change that was expected to help and did not

A stored memory says *who* said something and not *when*: the date sits in a property, and a property is never
embedded. So a question about time has nothing in the corpus to match against — and a fifth of the questions
are about time.

That is a real defect, and closing it changed nothing. `s0wd` is `s0w` plus one line of date text per record.
Time questions went from 46.9% to 53.1% at rank 1 — two questions of thirty-two — and the whole set lost six
from `all within 3`. Net zero, and both movements are inside the noise this harness carries.

It is published because a result that is not a win is the one most likely to go unmentioned, and because it is
the control for any future claim that the records need more context written into them.

### The wall, stated plainly: multi-hop is 0.0% and cannot be otherwise

**Every rung scores 0.0% at rank 1 on the 28 multi-hop questions**, including the two that do well everywhere
else. Those questions need evidence from two conversations weeks apart, and no single record can hold both
without gluing unrelated text together — which is what `s0e` does, and why it is last.

So **100% is not reachable at rank 1**, and the honest ceiling with these 28 excluded is 85.9%. For a
multi-hop question the meaningful measure is `mean depth`: how few results must be read, not whether the first
one sufficed. That is a different promise and it is reported separately rather than averaged into the headline.

### Read the number with these caveats, which are the report's own

- **Recall is not accuracy.** This asks whether the turns the gold answer cites came back. It does not ask
  whether a model would then answer correctly from them.
- **A miss is not necessarily a failure.** The same fact is often restated elsewhere in a transcript, so an
  answer may be reachable from a turn the gold key does not cite.
- **More is not better** — the caveat that turned out to matter most, and the reason for the metric change
  above.
- **This is NOT comparable to a published answer-accuracy number.** Systems quoting LoCoMo percentages are
  usually reporting end-to-end answering; this is evidence recall. Quoting it against one of those would be
  comparing two different measurements, which is the failure this whole folder exists to avoid. The protocol's
  rule is that a tier is only ever published with its own tier named — hence **Tier 0-R**, everywhere, including
  here.

### The first run, superseded and kept

The original run scored coverage only, at the shipped default `topK: 20` with no budget cap. Its rows predate
the rank columns and cannot be re-scored for them, so it is kept and labelled rather than deleted — deleting a
number because a better question came along is how a benchmark folder stops being checkable. Full report:
[`results/2026-08-29-tier0r/`](results/2026-08-29-tier0r/).

| rung | questions | all evidence | any evidence | mean records | mean ms |
|---|---|---|---|---|---|
| `s0` — raw turns | 199 | 66.8% | 75.9% | 20.0 | 299 |
| `s0+` — turns + deterministic structure | 199 | 65.3% | 74.4% | 20.0 | 90 |
| `s0g` — facts + graph | 199 | 66.3% | 75.4% | 20.0 | 58 |

### What was tuned, and what deliberately was not

**No retrieval parameter was adjusted.** No filter, no traverse, no threshold, no re-ranking; `topK` is set high
enough that the byte budget binds instead, which is what makes rungs comparable rather than what makes any of
them look good.

**The ingestion strategies ARE the subject, so choosing between them is the measurement and not a tuning knob.**
That is what the ladder in [`INGESTION.md`](INGESTION.md) exists to compare, and each rung is written blind to
the questions — a gate refuses any import of the question set from `ingest/`.

**The one number that could have been fitted, and was not.** The window rung has a shape — how many turns per
record, and how far each window advances. A sweep found a larger shape that scores better. **The published
figure uses the 5-turn, 2-step shape that was written down before any result was read**, because a parameter
chosen by reading the score is fitted to the answer key by a slower route than looking at it. The sweep's
numbers are not published as a result.

**Re-measured after every change to the metric, not before.** The rank columns were added on 2026-09-06 and
every rung was re-run under them; nothing was carried forward from the coverage-only run. The superseded table
above was produced at commit `0093ac77`, and the retrieval path has changed three times since — a filter
grammar widened, a create-time flag, and a mechanical types refactor — none of which touches the configuration
either run used.

A number leaving this folder for a public comparison gets re-run against the retriever as it is on that day.
That rule is what the figure is worth.

### What is not measured yet

**Tier 0 and above need a model.** Tier 0 adds an answerer and a judge and produces the number that is actually
comparable to other systems' published figures; Tier 1 is the first the protocol calls reportable. Both cost API
calls per run and per release, which is a decision rather than a build — the harness for them exists.

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
| `harness/` | the runner: ingest, retrieve, answer, grade. `run-tier0r.mjs` is the model-free tier; `run-tier0r-grid.mjs` sweeps it across methods and cells |
| `results/<date>-<commit>/` | scores, per-conversation breakdowns, and **every raw model output** |

## Cost, and the tier you are running

A benchmark nobody can afford to re-run is not reproducible, whatever the harness claims. The run is tiered and
**the floor is a complete publishable result** rather than a smoke test.

Tiers 0 through 2 are supersets of each other. **Tier 0-R is not one of that chain** — it is a different
measurement that happens to be cheaper than all of them: it grades whether the right records were RETRIEVED, not
whether a model then answered correctly, so it needs an embedder and nothing else. It exists because the
alternative was reporting nothing until somebody buys credits, and it is the tier that has actually run. Read
Amendment 4 in `PROTOCOL.md` for the four things it explicitly cannot tell you.

| tier | scope | order of magnitude |
|---|---|---|
| **0-R — retrieval only** | LoCoMo, a stratified question subsample, the model-free ingestion rungs, shipped-default retrieval. Scores *evidence recall*: did the turns the gold answer cites come back? | **no model calls at all** |
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
