# Benchmark protocol — pre-registered

> **This file is committed BEFORE any benchmark is run.** That ordering is the whole point of it, and it is
> provable: `git log --diff-filter=A -- benchmarks/PROTOCOL.md` gives the date this landed, and every result file
> under `benchmarks/results/` carries the commit it was produced at. A method chosen after seeing the score is
> not a method, whatever it is called afterwards.
>
> **Amendments are appended, never edited in.** If something here turns out to be unworkable, add a dated entry
> to [Amendments](#amendments) saying what changed and why, and re-run everything affected. A silent edit to this
> file after a run invalidates the run.

## What this is for, stated plainly

Ythril is a memory system, and the claim we want to be able to make is that it retrieves better, cheaper, or
faster than the alternatives on long conversations. That claim is worth exactly as much as the method behind it,
and memory benchmarking currently has a credibility problem: published comparisons routinely drop the category
they do worst on, grade with an unpublished judge prompt, and run competitors on defaults while their own system
is tuned.

So the target here is not a good number. **It is a number a sceptical reader can re-derive**, which is the only
kind worth putting in front of somebody who will check.

Two things follow from that, and both are binding:

1. **Every category is reported, including the ones we lose.** See [If we lose](#if-we-lose).
2. **The harness and the raw model outputs are committed**, not just the scores.

## The benchmarks

### LoCoMo

*Evaluating Very Long-Term Conversational Memory of LLM Agents* (Maharana et al., 2024). Multi-session dialogues
between two personas with question–answer pairs over the whole history, categorised by reasoning type
(single-hop, multi-hop, temporal, open-domain knowledge, and **adversarial** — questions the conversation does not
answer).

**Why it is here:** it is the dataset the competing vendors quote, so it is the only way to be comparable with
their published claims.

**What is wrong with it, recorded up front:** it is small — on the order of ten conversations — so a difference
of a few points between systems is inside the noise, which is why [variance reporting](#runs-and-variance) is
mandatory here rather than optional. It has also been public since 2024 and the dialogues are model-generated,
so part of any score is the answerer recognising the text rather than retrieving it. That is what the
[contamination probe](#control-3-no-context-contamination-probe) exists to measure.

### LongMemEval

A larger, purpose-built long-term-memory evaluation with a wider set of reasoning types and a cleaner design than
LoCoMo.

**Why it is here:** it carries the credibility that LoCoMo cannot, being bigger and built for this task rather
than adapted to it. LoCoMo carries the comparability. Neither alone is enough.

### Pinning

Before the first run, `benchmarks/pins.json` records for each dataset: the source URL, the commit or release tag,
a `sha256` of every file used, the licence, and the **counts actually observed** — conversations, questions, and
questions per category. Counts come from the data at pin time and not from any paper's abstract, because the
published figure and the released file have disagreed before in this field.

## Systems under test

| system | what it is | why it is here |
|---|---|---|
| **Ythril** | the system, configured as [below](#ythrils-configuration) | the subject |
| **Full context** | the entire conversation in the answerer's prompt, no retrieval | the CEILING. If retrieval beats it, something is wrong and we go looking rather than publishing |
| **No memory** | the question alone, no conversation | the FLOOR. Anything a system scores below this is worse than useless |
| **At least one competing memory system** | configured per its own maintainers' published recommendation | the comparison anyone actually cares about |

**The competitor's configuration is committed, verbatim, in `benchmarks/configs/`, with a link to the
documentation it came from.** If their docs are ambiguous we take the more generous reading, and we say in the
results which reading we took. A benchmark where the competitor is on defaults and we are tuned is the most
common way this goes wrong and the easiest to spot from outside.

Where a competitor has published their own LoCoMo number, we report **both** — theirs as published and ours as
measured — and if the two differ we say so and do not quietly prefer the flattering one.

## Ythril's configuration

Every retrieval knob is pinned in `benchmarks/configs/ythril.json` and echoed into each result file. No value is
chosen per question, per category, or per dataset — one configuration answers everything, because a system tuned
per category is not the system anybody deploys.

Pinned explicitly, at minimum: `topK`, `budgetBytes`, whether `traverse` expansion is on and to what depth,
reranking on or off and which model, the embedding model, and whether the deterministic `query` path is used at
all. Anything left at its default is recorded as the default with its value written out, so "default" cannot
change underneath a published number.

### Ingestion strategies, scored individually — the table that matters most

**How a conversation becomes records is a bigger lever than any retrieval knob**, and it is the half a results
table normally hides. A memory system that extracts atomic facts with a model will beat one that stores raw turns
on almost any question, and that difference has nothing to do with the store underneath. So ingestion is a
**dimension of the experiment**, not a fixed preprocessing step, and each rung is its own row:

| # | strategy | what is written | what it costs at write |
|---|---|---|---|
| **S0** | raw turns | one memory per dialogue turn, verbatim | nothing — no model call |
| **S1** | session summaries | one memory per session | one call per session |
| **S2** | atomic facts | model-extracted facts as memories, the shape competing systems use | one call per session |
| **S3** | facts + graph | S2, plus entities (people, places, organisations, objects) with typed edges between them | S2 plus one extraction pass |
| **S4** | facts + graph + chrono | S3, plus every dated event as a `chrono` record with `startsAt`/`endsAt` | S3 plus date resolution |

The ladder is the point. **S0 is the floor that costs nothing**, and if S4 does not beat it by more than its
token cost is worth, that is a finding about this product and it gets published as one. The interesting
comparisons are the rungs, not the totals:

- **S2 → S3** answers *does the knowledge graph earn its keep?* — and the answer should show up in the
  **multi-hop** category specifically, because that is what edges are for. If multi-hop does not move, the graph
  is not paying for itself on this workload and we say so.
- **S3 → S4** answers the same question for chrono, and the place to look is the **temporal** category. Ythril
  models dated events as first-class records with a real start and end; nearly every competing system stores them
  as text. If that does not show up in temporal accuracy, the modelling is not reaching the retrieval.

### Isolating the store from the extraction

The obvious confound: if we beat a competitor, is it because our storage model is better or because our
extraction prompt is? A comparison that cannot separate those is a comparison of prompts wearing an
architecture's name.

So where a competitor's ingestion can be driven with facts we supply, **the same extracted fact set is written
into both systems** and the retrieval is compared on that. Where it cannot, the results say so explicitly and the
comparison is labelled end-to-end rather than architectural. This is one run more than anybody else does and it
is the difference between a leaderboard position and an explanation.

### Ingestion never sees the questions

The strongest way to overfit a memory benchmark is to shape the extraction around the questions being graded, and
it is invisible from the outside — nobody can tell from a results table that an extraction prompt was iterated
thirty times against the answer key.

**So it is prevented structurally rather than promised.** The ingest stage is given the conversation and nothing
else: the QA file is not passed to it, not reachable from it, and a gate asserts that the ingest module cannot
import or read the question set at all. The extraction prompts live in `benchmarks/prompts/` and are published
with everything else.

Iterating an extraction prompt is legitimate work. Iterating it against the conversations we then report on is
not, which is why any such iteration happens on the development conversations named in
[Development versus reporting](#development-versus-reporting) and the consequence is reported on the untouched
ones.

### Mapping a conversation onto Ythril's primitives

Recorded here so the mapping is a stated design rather than something a reader has to reverse-engineer from the
harness:

- **space** — one per conversation. Isolation is what makes cross-conversation leakage impossible rather than
  merely unlikely, and it is how a real deployment would separate two customers.
- **memory** — an atomic fact, one claim per record. Speaker attribution and session index are properties.
- **entity** — a person, place, organisation or object, typed, with a schema per type.
- **edge** — a typed relation between two entities. Direction is part of the claim.
- **chrono** — a dated event, with `startsAt` and where known `endsAt`. Relative dates in the dialogue ("last
  month") are resolved against the session's own timestamp, and **the resolution is recorded on the record** so a
  wrong resolution is visible in the raw output rather than silently wrong in a score.
- **file** — unused. LoCoMo's images are out of scope for this run, and saying so is better than leaving a reader
  to wonder whether they were quietly included.

### Retrieval methods, scored individually

Ythril has several retrieval paths that competing systems collapse into one, and scoring them separately is the
most useful thing this benchmark can produce — for a reader deciding how to configure it, and for us deciding
what to improve. Each is a **separate row in every results table**, not a variant hidden inside one number:

| method | what it exercises |
|---|---|
| **vector only** | semantic recall alone — the baseline every memory system has |
| **lexical only** | the keyword channel alone, no embeddings |
| **hybrid (RRF)** | both channels fused, which is the shipped path |
| **hybrid + rerank** | fusion followed by the cross-encoder |
| **hybrid + traverse** | fusion, then graph expansion from each hit along typed edges |
| **hybrid + traverse + rerank** | everything |
| **deterministic `query`** | no ranking at all — a predicate over the store. Included because some questions have an exact answer and a benchmark that only measures ranking cannot see that |

The last row matters for an honest reading: `query` will lose badly on open-ended questions and may win outright
on ones with a nameable answer. Both halves of that are informative, and reporting only the hybrid row would hide
a real capability.

### The parameter sweep

A grid over the knobs that plausibly move retrieval quality, run for every method above where the knob applies:

| axis | values |
|---|---|
| `topK` | 5, 10, 20, 50 |
| `traverse` depth | 0 (off), 1, 2 |
| `minScore` | off, and one threshold chosen at pin time from the score distribution |
| `budgetBytes` | the MCP default, the REST default, and one deliberately tight value |
| rerank | off, on |

**The full grid is published — every cell, not the best one.** That is the whole discipline here, and it is worth
being blunt about why.

#### What the grid costs, and why it is ONE AXIS AT A TIME

The grid as first written was a full factorial — `topK` × traverse × `minScore` × budget × rerank — which is
**144 cells**, and across five ingestion strategies, three seeds and an answer-plus-judge pair per question it
runs to hundreds of millions of model calls. That was an unbounded specification and it is corrected here rather
than quietly reduced later; see [Amendment 1](#amendment-1--the-grid-is-one-axis-at-a-time-and-the-run-is-tiered).

**One axis at a time, from the shipped default.** Each axis is varied while the others hold at their default
value, so the grid is `4 + 3 + 2 + 3 + 2 = 14` cells rather than 144. What that gives up is interaction effects —
whether `topK: 50` behaves differently at traverse depth 2 than at depth 0 — and on ten conversations those are
undetectable anyway: an interaction smaller than the run-to-run spread is not a finding, it is a coin. Giving up
what cannot be measured is not a compromise.

**Grid cells are graded lexically, not by the judge.** The lexical metric is free and deterministic, so the
14-cell sweep costs answerer calls and nothing else. The judge is spent where a claim depends on it: the
head-to-head configurations, on the reported question set. To check that the free metric is not ranking the cells
differently from the paid one, **the best three and worst three cells are also judged** — six cells' worth of
grading to validate fourteen cells' worth of ranking.

**Extraction output is cached on disk and committed.** Ingestion is per conversation, not per question, so S1–S4
cost roughly `conversations × sessions` calls ONCE. Re-running the answerer against cached records must never
re-extract; a harness that re-extracts per seed turns the cheapest part of the run into the most expensive.

**One judge call grades every candidate for a question.** The blind shuffle already presents the candidates
unlabelled, so presenting all of them together in one call is the same measurement for a fraction of the calls —
and it is strictly better judging, because the candidates are compared against each other rather than each
against the grader's mood.

#### The sweep is an ablation, not a search for a headline

Running forty configurations and reporting the winner is **the** classic way to manufacture a benchmark result,
and it is indistinguishable from cheating no matter how the run was intended. With ten conversations, the best
cell of a forty-cell grid is very likely best **by noise**: it is the maximum of forty noisy draws, and its
expected value is above the true best configuration's. Three rules make the sweep legitimate instead:

1. **The head-to-head number against any competitor uses ONE configuration, declared in this file before the
   first run** — the product's shipped defaults, listed in `configs/ythril.json`. Not the grid's winner. If the
   grid later shows a better default, that is a change to the *product*, shipped and released, and only then does
   it become the number we quote.
2. **If the grid is used to CHOOSE anything**, the choice is made on the development conversations named in
   [Development versus reporting](#development-versus-reporting) and the consequence is reported on the ones
   never looked at. A configuration selected and reported on the same data is not a measurement.
3. **The noise floor is published with the grid.** Every cell carries its own ± std across the three seeds, and
   the results state in words how the best cell compares to the median cell *relative to that spread*. Where the
   spread swallows the spread of the grid, the finding is "these parameters do not measurably matter on this
   dataset" — which is a real and useful result, not a failed experiment.

#### What the grid is actually for

Three things, none of which is a bigger headline number:

- **Where the knobs bite.** If traverse depth 2 costs 40% more tokens for one point of accuracy, an operator
  wants to know that, and it is exactly the kind of guidance a single benchmark number cannot carry.
- **Whether our defaults are right.** The most valuable outcome is discovering the shipped default is beaten by
  another cell on the held-out conversations — because then we change the default and say so.
- **Where the architecture pays off.** Graph traversal and chrono records should help most on multi-hop and
  temporal questions and least on single-hop. If the per-category grid does not show that, the claim that the
  graph earns its keep is weaker than we thought, and the results say so.

Cost is on every cell, not only accuracy: a configuration that buys two points for triple the retrieval tokens is
a worse default than the one it beats, and the table has to make that visible rather than leaving it to a reader
to work out.

### Ingestion is part of the cost, and is disclosed

How a memory system writes is where the real expense usually sits, and it is what a benchmark that reports only
retrieval accuracy hides. For every system, including ours, the results record:

- what happens per session at write time, in one sentence;
- **tokens sent to any model during ingestion**, per conversation;
- wall-clock to ingest one conversation;
- bytes stored per conversation.

A system that spends a hundred thousand tokens of model extraction per conversation may well be more accurate.
That is a legitimate design, and the number belongs next to the accuracy rather than out of frame.

## The answerer

One model answers for every system, so the comparison is between retrieval and nothing else.

- Model pinned by exact id and version in `pins.json`.
- `temperature: 0`, seed fixed and recorded.
- The answering prompt is in `benchmarks/prompts/answer.md`, used byte-identically for every system. Only the
  retrieved context differs.

## Grading

**Two metrics, reported side by side, always.** They fail in different directions and a claim that only survives
one of them is not a claim.

### 1. Lexical

The metric from the dataset's own paper (F1 against the gold answer for LoCoMo). No model in the loop, so no
prompt sensitivity and no judge bias. It under-credits a correct answer worded differently, which is exactly why
it does not appear alone.

### 2. LLM-as-judge

- The judge prompt is in `benchmarks/prompts/judge.md`, reproduced verbatim in the results, and frozen by this
  protocol.
- Judge model pinned by exact id and version; `temperature: 0`.
- **The judge is blind.** Answers from all systems for one question are shuffled and presented without labels,
  so the judge cannot know which system produced which. The mapping is restored after grading. This costs
  nothing and removes the most obvious source of judge bias; almost no published comparison does it.
- The judge never sees the retrieved context — only the question, the gold answer, and the candidate. Showing it
  the context invites it to grade the retrieval instead of the answer.
- **Judge agreement is measured, not assumed:** a random sample of at least 100 gradings is checked by hand and
  the agreement rate is published. A judge that agrees with a human 70% of the time cannot support a claim of a
  three-point difference, and saying so is more useful than a decimal place.

## Controls

### Control 1: no memory

Question only. Establishes the floor.

### Control 2: full context

The whole conversation in the prompt. Establishes the ceiling and, more usefully, the **exchange rate**: the
headline result we care about is not "we beat a competitor by N points" but *"X% of full-context quality at Y% of
the tokens"*, which is the number that decides whether a memory system is worth running at all.

### Control 3: no-context contamination probe

Every question asked with **no conversation and no retrieval**, to the same answerer. Anything it gets right, it
either memorised from the public dataset or could guess from the question alone.

Two scores are then published for every system:

- **primary** — all questions, the number comparable to everyone else's;
- **contamination-excluded** — the same run with every question the no-context probe answered correctly removed.

The second will be lower. Publishing it is the point: it is the check nobody else runs, and being the party that
reports the deflated number is worth more than the points it costs.

## Runs and variance

- **Three runs per system**, different seeds, everything else identical.
- Report **mean ± standard deviation**, never a single run.
- **Per-conversation scores are published**, so a reader can see whether a lead comes from all ten conversations
  or from one.
- A difference smaller than the standard deviation is reported as **no measured difference**, in those words. On
  a ten-conversation dataset that will happen, and pretending otherwise is how this field lost its credibility.

## Cost and latency, in the same table as accuracy

Accuracy alone flatters whichever system is allowed to spend the most. Every results table carries, per system:

| column | why |
|---|---|
| accuracy (both metrics, ± std) | the claim |
| ingest tokens / conversation | what writing costs |
| retrieval tokens / question | what reading costs |
| p50 / p95 retrieval latency | what a user waits |
| stored bytes / conversation | what it costs to keep |
| **accuracy per 1k retrieval tokens** | the derived number that actually differentiates a memory system |

## The run is tiered, and the floor is publishable

A benchmark nobody can afford to re-run is not reproducible, whatever the harness says. So the run is defined in
tiers, each a superset of the one before, and **the floor is a complete publishable result on its own** rather
than a smoke test.

### Tier 0 — the floor

| | |
|---|---|
| dataset | LoCoMo only |
| questions | a **stratified subsample**, fixed seed, proportional across categories including adversarial. The same subsample for every system — that is what keeps it fair — and its size and seed are recorded in the results |
| ingestion | **S0 and S4 only** — the free floor and the full graph-plus-chrono shape. The most informative pair there is, because together they answer whether any of the modelling earns its keep |
| retrieval | shipped defaults only, no grid |
| systems | Ythril, the no-memory floor, the full-context ceiling |
| grading | lexical for all; judge once per question over all candidates blind |
| seeds | 1, and the result is labelled exploratory until Tier 1 |

Order of magnitude: **~1,000 model calls**, of which the full-context answers are the expensive ones. The
no-context contamination probe is the same run as the no-memory floor, so it costs nothing extra.

### Tier 1 — reportable

Adds the S2 rung (the shape competitors use, so the comparison is against like), the 14-cell one-axis-at-a-time
grid on lexical grading, **three seeds on the head-to-head only**, and one competing system. Single-digit
thousands of calls.

### Tier 2 — complete

Adds LongMemEval, the remaining ingestion rungs, the full question set rather than a subsample, and the
same-facts-into-both-stores isolation run.

**A tier is only published with its own tier named in the results**, so a Tier 0 number is never quoted as though
it were Tier 2. And a subsampled result says so, with its size, because a wider confidence interval that is
declared is honest and one that is hidden is not.

## Development versus reporting

There is no train split in either dataset, so the risk of tuning on the test set is real and has to be managed
explicitly rather than promised away.

- Conversations used while building the harness are **named** in the results.
- Scores are reported on the full set **and** separately on the conversations never looked at during development.
- If the two differ materially, the untouched number is the headline.

## If we lose

**Every category is published, including the ones where a competitor beats us, and including a losing headline.**

This is not modesty. A selectively reported benchmark is worth less than no benchmark to the only audience that
matters — the reader who checks — and the first person to notice a missing category will be the competitor whose
number we omitted. If Ythril loses a category, the results say so, and the analysis says why, and that is a more
persuasive document than a clean sweep nobody believes.

If the overall result is bad, we publish it and fix the system. The protocol does not get renegotiated.

## What would falsify a claim we make

Stated in advance so it cannot be argued away later:

- a reproduction from the committed harness that lands outside our reported ± std;
- a competitor demonstrating their system was misconfigured, judged against the config we committed;
- a judge-prompt change that moves the ranking — which is why the prompt is frozen here and the lexical metric is
  reported beside it;
- the contamination-excluded score reversing the ranking, which is why it is published rather than kept.

Any of these and the claim is withdrawn and corrected in place, with the correction dated.

## Reproduction

One command, from a clean checkout, with the datasets fetched by `pins.json`:

```bash
npm run bench
```

Raw model outputs — every question, every candidate answer, every judge verdict — are committed under
`benchmarks/results/<date>-<commit>/`. A results table nobody can drill into is a press release.

## Amendments

Append here, dated, with the reason and what was re-run. A silent edit elsewhere in this file invalidates the
runs it covers; this section is how a change stays legitimate.

### Amendment 1 — the grid is one axis at a time, and the run is tiered

**2026-08-28, before any run.**

The first version of this protocol specified a full-factorial grid and gave no bound on the total, which came to
hundreds of millions of model calls once multiplied by ingestion strategies, seeds, and an answer-plus-judge pair
per question. That was a specification error rather than a change of mind, and nothing had been run against it.

Changed: the sweep is one-axis-at-a-time from the shipped default (14 cells, not 144); grid cells are graded
lexically with the best and worst three also judged as a ranking check; extraction output is cached and
committed; one judge call grades every candidate for a question, which the blind shuffle already made possible;
and the run is defined in three tiers with a publishable floor of roughly a thousand calls.

**Nothing re-run, because nothing had been run.** Recorded anyway — an amendment made before the first result is
exactly as much a part of the record as one made after, and a protocol whose amendment log starts only when it
becomes embarrassing is not a protocol.
