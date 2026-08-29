# Harness module contracts

Every module below is built against this file. It exists because the modules were written in parallel, and an
interface agreed after the fact is an interface nobody agreed.

Plain ESM `.mjs`, Node built-ins only — no dependencies beyond what the repo already has. Everything is pure and
testable except the three modules that are explicitly I/O (`ythril`, `models`, `cache`).

## The rule that shapes the layout

**`dataset/locomo.mjs` exports conversations and questions through SEPARATE functions, and nothing under
`ingest/` may import the questions one.** `benchmark-ingest-cannot-see-the-questions.test.js` enforces it. That
is not tidiness — shaping extraction around the answer key is the strongest way to overfit a memory benchmark
and it is invisible from a results table.

## `pins.mjs`

```js
loadPins()                  // -> parsed pins.json, throws with the missing key named
fetchDataset(name)          // -> absolute path to the local copy; downloads if absent
verifyDataset(name)         // -> {ok, expected, actual}; NEVER silently re-downloads on mismatch
```

A sha256 mismatch is fatal and says both hashes. A benchmark that quietly re-fetches a changed dataset reports
numbers for data nobody pinned.

## `dataset/locomo.mjs`

```js
loadConversations(path)     // -> Conversation[]   (NO question data on these objects, at all)
loadQuestions(path)         // -> Question[]       (never imported by ingest/)

Conversation = { id, speakers: [a, b], sessions: [{ index, startsAt, turns: [Turn] }] }
Turn         = { id, sessionIndex, speaker, text }        // `id` is the dia_id, e.g. "D3:17"
Question     = { conversationId, question, answer, evidence: [turnId], category, adversarialAnswer? }
```

`startsAt` is the session's own timestamp parsed to ISO. **Nine evidence references in the release are malformed**
— several ids concatenated into one string, a stray colon — so `loadQuestions` normalises them and reports what
it repaired rather than dropping them silently.

## `cache.mjs`

```js
cacheKey(parts)             // -> hex string; parts is any JSON-serialisable object
withCache(dir, key, fn)     // -> await fn() on a miss, the stored value on a hit
cacheStats()                // -> {hits, misses}
```

**The model id and every parameter go INTO the key.** A cache hit that returns an answer from a different model
is worse than no cache, and it is invisible.

## `models.mjs`

```js
makeClient({ provider, model, apiKey, concurrency, maxUsd, maxCalls, onSpend })
  -> { complete({ system, user, maxTokens }) -> { text, usage: {in, out}, cached } , spent(), calls() }
```

- Refuses to start if a pinned model is unavailable. **Never substitutes.**
- Stops at `maxUsd`/`maxCalls` by throwing `BudgetExhausted`, leaving the cache resumable.
- Retries on rate limits with backoff; a retry is not a new call for budget purposes.
- `estimate: true` returns token counts and makes no network calls.

## `ythril.mjs`

The REST client — the same door a user has. No imports from `server/src`.

```js
makeYthril({ baseUrl, token })
  -> { createSpace(id), deleteSpace(id),
       writeMemory(space, {...}), writeEntity(space, {...}), writeEdge(space, {...}), writeChrono(space, {...}),
       recall(space, { query, topK, traverse, types, minScore, maxBytes }),
       query(space, { collection, filter, limit }),
       waitForEmbeddings(space, { timeoutMs }) }
```

`waitForEmbeddings` polls the embed-queue endpoint. **A retrieval run that starts before ingestion has embedded
is measuring the queue, not the retriever** — and it would look exactly like poor recall.

## `ingest/*.mjs`

One module per rung. Each exports:

```js
export const rung = 's4';
export const needsModel = true;
export async function ingest({ conversation, ythril, space, extract })   // -> {records: n, modelCalls: n}
```

`extract` is injected, so a rung that needs a model cannot reach one it was not given, and S0/S0+ are provably
model-free. **No module here imports `loadQuestions`.**

## `retrieve.mjs`

```js
RETRIEVAL_METHODS           // the seven, each { id, label, params }
gridCells(defaults)         // one-axis-at-a-time from the shipped defaults; 14 cells, not 144
retrieveFor(question, { ythril, space, method, cell })  // -> {context, records, tokens, ms}
```

Takes a question's TEXT only. It never sees the gold answer, the evidence ids or the category.

## `grade/lexical.mjs`

```js
f1(prediction, gold)        // -> {f1, precision, recall}
```

The dataset's own metric. No model, so no prompt sensitivity — which is why it grades the whole grid.

## `grade/judge.mjs`

```js
judgeBlind({ question, gold, candidates, client, prompts })
  -> [{ systemId, correct, reason }]
```

Candidates are **shuffled and unlabelled** before the model sees them, and re-labelled after. One call grades
every candidate for a question: same measurement, a fraction of the calls, and the candidates are compared
against each other rather than each against the grader's mood.

## `report.mjs`

```js
writeResults(dir, { tier, pins, configs, rows, costs, cacheStats })
```

Writes the scores, the per-conversation breakdown and **every raw model output**. A results table nobody can
drill into is a press release.

## `run.mjs`

The CLI. `--estimate` first, always.

```
node benchmarks/harness/run.mjs --tier 0 [--estimate] [--max-usd 5] [--max-calls 2000]
                                [--concurrency 3] [--questions 200] [--seed 1] [--ceiling-questions 50]
```
