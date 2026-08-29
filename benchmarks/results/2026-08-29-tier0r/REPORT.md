# Tier 0-R — evidence recall, no model anywhere

**Run:** 2026-08-29 · commit `0093ac77` · ythril-bench:latest id 582c3fabf68c (server built from 0093ac77), MongoDB 8.3.4 Atlas-local. The three rungs ran as SEPARATE invocations against the same instance and the same seeded sample — s0 first, then s0+ re-run after a defect that made it write no turns, then s0g. Ingestion differs per rung by construction; the questions, the sample and the retrieval configuration do not.
**Dataset:** LoCoMo, sha256 `79fa87e90f040813…`
**Questions:** 199 sampled from 1982 answerable (4 excluded: no evidence cited)
**Retrieval:** `recall` at the shipped default, `topK: 20`, no traverse, no threshold
**Model calls:** 0

## What this measures, and what it does not

For each question, the turns the gold answer cites as evidence are known. The retrieval is run and
the question asked is: **did those turns come back?** That is all. Specifically:

- **Recall is not accuracy.** A retrieved turn does not mean a model would answer correctly from it.
- **A miss is not necessarily a failure.** The same fact is often restated elsewhere in the
  transcript, so an answer may be available from a turn the gold key does not cite.
- **More is not better.** A configuration that returns everything scores perfectly here and is
  useless in practice; read the mean-records column beside every score.
- **"Adversarial" does not mean unanswerable here.** Category 5 is named adversarial and it is easy to
  assume that means the answer is absent from the transcript — it is not. In this release all 446 of
  them cite evidence and carry a real answer, in a separate `adversarial_answer` field rather than
  the usual one. They score like any other single-hop category and are read that way below.

## Overall

| rung | questions | all evidence | any evidence | mean records | mean ms |
|---|---|---|---|---|---|
| `s0` | 199 | **66.8%** | 75.9% | 20.0 | 299 |
| `s0+` | 199 | **65.3%** | 74.4% | 20.0 | 90 |
| `s0g` | 199 | **66.3%** | 75.4% | 20.0 | 58 |

## By question category

**`s0`**

| category | questions | all evidence | any evidence |
|---|---|---|---|
| 1 — multi-hop | 28 | 39.3% | 78.6% |
| 2 — temporal | 32 | 84.4% | 93.8% |
| 3 — open-domain | 9 | 66.7% | 77.8% |
| 4 — single-hop | 85 | 74.1% | 77.6% |
| 5 — adversarial | 45 | 57.8% | 57.8% |

**`s0+`**

| category | questions | all evidence | any evidence |
|---|---|---|---|
| 1 — multi-hop | 28 | 35.7% | 75.0% |
| 2 — temporal | 32 | 84.4% | 93.8% |
| 3 — open-domain | 9 | 55.6% | 66.7% |
| 4 — single-hop | 85 | 74.1% | 77.6% |
| 5 — adversarial | 45 | 55.6% | 55.6% |

**`s0g`**

| category | questions | all evidence | any evidence |
|---|---|---|---|
| 1 — multi-hop | 28 | 35.7% | 75.0% |
| 2 — temporal | 32 | 84.4% | 93.8% |
| 3 — open-domain | 9 | 55.6% | 66.7% |
| 4 — single-hop | 85 | 75.3% | 78.8% |
| 5 — adversarial | 45 | 57.8% | 57.8% |

## By how much evidence the question needs

The column that matters most. A question citing one turn needs one hit; a question citing four needs
all four before `all evidence` counts it. If the strict score falls away as the evidence count rises,
that is the multi-hop weakness the graph is supposed to address — and it is measurable here, before
any model is involved.

**`s0`**

| evidence turns | questions | all evidence | any evidence |
|---|---|---|---|
| 1 | 160 | 74.4% | 74.4% |
| 2 | 21 | 57.1% | 81.0% |
| 3 | 8 | 12.5% | 100.0% |
| 4 | 4 | 0.0% | 75.0% |
| 5 or more | 6 | 16.7% | 66.7% |

**`s0+`**

| evidence turns | questions | all evidence | any evidence |
|---|---|---|---|
| 1 | 160 | 72.5% | 72.5% |
| 2 | 21 | 57.1% | 81.0% |
| 3 | 8 | 12.5% | 100.0% |
| 4 | 4 | 0.0% | 75.0% |
| 5 or more | 6 | 16.7% | 66.7% |

**`s0g`**

| evidence turns | questions | all evidence | any evidence |
|---|---|---|---|
| 1 | 160 | 73.8% | 73.8% |
| 2 | 21 | 57.1% | 81.0% |
| 3 | 8 | 12.5% | 100.0% |
| 4 | 4 | 0.0% | 75.0% |
| 5 or more | 6 | 16.7% | 66.7% |

## Per conversation

Included because a mean over ten conversations can hide one that failed completely, and a reader who
cannot see the spread has to take the mean on trust.

**`s0`**

| conversation | questions | all evidence | any evidence |
|---|---|---|---|
| conv-26 | 16 | 68.8% | 75.0% |
| conv-30 | 12 | 66.7% | 66.7% |
| conv-41 | 12 | 83.3% | 91.7% |
| conv-42 | 33 | 57.6% | 63.6% |
| conv-43 | 22 | 68.2% | 77.3% |
| conv-44 | 15 | 66.7% | 80.0% |
| conv-47 | 20 | 65.0% | 75.0% |
| conv-48 | 28 | 71.4% | 85.7% |
| conv-49 | 25 | 72.0% | 80.0% |
| conv-50 | 16 | 56.3% | 68.8% |

**`s0+`**

| conversation | questions | all evidence | any evidence |
|---|---|---|---|
| conv-26 | 16 | 62.5% | 68.8% |
| conv-30 | 12 | 66.7% | 66.7% |
| conv-41 | 12 | 83.3% | 91.7% |
| conv-42 | 33 | 57.6% | 63.6% |
| conv-43 | 22 | 68.2% | 77.3% |
| conv-44 | 15 | 66.7% | 80.0% |
| conv-47 | 20 | 65.0% | 75.0% |
| conv-48 | 28 | 67.9% | 82.1% |
| conv-49 | 25 | 72.0% | 80.0% |
| conv-50 | 16 | 50.0% | 62.5% |

**`s0g`**

| conversation | questions | all evidence | any evidence |
|---|---|---|---|
| conv-26 | 16 | 62.5% | 68.8% |
| conv-30 | 12 | 66.7% | 66.7% |
| conv-41 | 12 | 83.3% | 91.7% |
| conv-42 | 33 | 57.6% | 63.6% |
| conv-43 | 22 | 68.2% | 77.3% |
| conv-44 | 15 | 66.7% | 80.0% |
| conv-47 | 20 | 65.0% | 75.0% |
| conv-48 | 28 | 71.4% | 85.7% |
| conv-49 | 25 | 72.0% | 80.0% |
| conv-50 | 16 | 56.3% | 68.8% |
