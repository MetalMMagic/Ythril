/**
 * The seven retrieval methods, and the one-axis-at-a-time grid over the knobs.
 *
 * `benchmarks/PROTOCOL.md` → *Retrieval methods, scored individually* and *The parameter sweep*. This module
 * turns both of those sections into something a runner can execute, and it is written so that the ways a
 * retrieval benchmark normally goes wrong fail loudly here instead of producing a plausible row.
 *
 * ## What this module is allowed to know: the question's TEXT, and nothing else
 *
 * `retrieveFor` takes a **string**. Not a question object with the graded fields hanging off it, not an id it
 * could look one up by. That is the structural half of the protocol's blindness rule, and it is structural
 * precisely because the alternative is a promise: a retriever that can see which category a question is, or
 * which turns were cited, can be tuned per category by accident long before anybody does it on purpose — and
 * from a results table the two are indistinguishable.
 *
 * The options object is strict for the same reason. A fifth key added later — `category`, to "just log it" —
 * would be accepted silently by a permissive object and would put the answer key one property access away from
 * the code that builds the query. It is refused by name.
 *
 * ## The knob that is not a knob: two of the seven methods are INSTANCE-level
 *
 * This is the thing a reader of the protocol's method table would not guess, and getting it wrong would
 * mislabel published rows.
 *
 * `POST /recall` takes `query`, `topK`, `types`, `minScore`, `filter`, `traverse`, `tags`, `minPerType`,
 * `maxPerType`, `maxTimeMS`, `maxBytes` — and **no channel switch and no rerank flag**. Whether the lexical
 * channel is fused in is `YTHRIL_HYBRID_SEARCH` on the server (`brain/lexical-search.ts#hybridSearchEnabled`),
 * and whether a cross-encoder runs is whether one is configured at all (`RERANK_URL`/`RERANK_MODEL`). So
 * "vector only" and "+rerank" are not requests a client can make: they are instances a runner must bring.
 *
 * What makes that checkable rather than merely stated is that the per-stage scores are **unconditional on both
 * doors** — `lexicalScore`, `fusedScore` and `rerankScore` come back on every result whose stage ran, with no
 * parameter that removes them (`brain/recall-shape.ts#RECALL_RANKING_DIAGNOSTICS`). Every call here therefore
 * reports which stages the server says it ran, and a stage that fired while the method's label says it is off
 * is a REFUSAL, not a note. A row labelled "vector only" that is really the fused ranking is the single most
 * damaging thing this harness could emit, because it is wrong in the direction that flatters us.
 *
 * The detection is one-sided and that is worth being explicit about: a stage that did NOT fire on one question
 * proves nothing — the lexical channel legitimately returns nothing when no term matches, and the reranker is
 * skipped when the remaining budget is below `RERANK_MIN_BUDGET_MS`. So absence is REPORTED (`stages` on every
 * result) for the runner to aggregate, and only presence is refused. "The reranker fired on 4% of calls" is a
 * finding; failing the run on the first budget-skipped question would be a false alarm.
 *
 * ## `records` is a count, and the raw list is beside it
 *
 * `CONTRACTS.md` gives `retrieveFor -> {context, records, tokens, ms}` without saying which `records` is.
 * `ingest/*` in the same file uses the same word for a count (`{records: n, modelCalls: n}`), so it is a count
 * here too, and the retrieved documents are returned as `retrieved` beside it. Report writing needs both: the
 * count for the table, the documents for the drill-down the protocol demands.
 */

import { performance } from 'node:perf_hooks';

/* ── The five axes ──────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The axis names, in the protocol's vocabulary rather than the API's.
 *
 * `budgetBytes` is the protocol's name for what `POST /recall` calls `maxBytes`. Two names for one knob is
 * exactly where a silent mismatch lives, so the translation happens in ONE place (`recallRequest`) and nowhere
 * else in this file spells the API name.
 */
export const AXES = ['topK', 'traverse', 'minScore', 'budgetBytes', 'rerank'];

/** `topK` values, fixed by the protocol's sweep table. */
const TOP_K_VALUES = [5, 10, 20, 50];

/** Traverse depths, fixed by the protocol. The server's ceiling is 5 (`brain/edges.js#MAX_RECALL_TRAVERSE`). */
const TRAVERSE_VALUES = [0, 1, 2];

/**
 * The two shipped byte budgets, mirrored from `server/src/brain/result-budget.ts`.
 *
 * Mirrored rather than imported: the harness talks to the instance through the same REST door a user has, and
 * an import from `server/src` would make it a different client from the one being measured. The cost of a
 * mirror is drift, so it is not left to be noticed — `gridCells` asserts that the shipped default in
 * `configs/ythril.json` is one of the values on this axis, which is the assertion that fires the day the
 * product changes a default and this copy does not.
 */
const MCP_DEFAULT_BYTES = 25_000;
const REST_DEFAULT_BYTES = 100_000;

/**
 * 14, and the number is asserted rather than assumed.
 *
 * `4 + 3 + 2 + 3 + 2`. The full factorial the protocol first specified was 144, and Amendment 1 replaced it
 * because the total was unbounded once multiplied by rungs, seeds and an answer-plus-judge pair. A grid that
 * quietly grows back is the same defect returning, so a change to any axis above fails this and forces a dated
 * amendment instead of a bigger bill.
 */
const EXPECTED_CELLS = 14;

/* ── The seven methods ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * The seven, each `{ id, label, params }` per `CONTRACTS.md`, plus what a method needs that a request cannot
 * carry.
 *
 * - `params` — the knobs the method FIXES BY DEFINITION. They override the cell's defaults, because a method
 *   called "hybrid + rerank" that ran with the shipped `rerank: false` default would be a mislabelled row
 *   rather than a default honoured. `resolveParams` is the only place that merge happens.
 * - `channel` — what the instance must be configured as. Not a request parameter; see the module note.
 * - `path` — which door the method uses: ranked `recall`, or the deterministic `query` predicate.
 * - `minTraverse` — for the two traversing methods, the depth floor that makes the method what it is. 1, the
 *   SMALLEST depth that is still "traverse on", so the method is scored at its cheapest rather than at a depth
 *   chosen to flatter it; the traverse axis then measures 1 against 2.
 * - `caveat` — non-empty exactly when `approximate` is true, and it is carried out on every result so a report
 *   cannot print the row without it.
 */
export const RETRIEVAL_METHODS = [
  {
    id: 'vector',
    label: 'vector only',
    params: { traverse: 0, rerank: false },
    channel: 'vector',
    path: 'recall',
    approximate: false,
    /*
     * REQUIRES `YTHRIL_HYBRID_SEARCH=off` on the instance. Reconstructing the vector ranking client-side from a
     * fused response was considered and rejected: `topK` truncation happens SERVER-side on the fused order, so
     * a record ranked tenth by vector and unranked lexically can be displaced out of the response entirely by
     * records that fusion promoted. Re-sorting what came back by `score` would look exact and would silently be
     * a different top-K. Refusing when the response proves fusion ran is the honest half of this.
     */
    requires: 'an instance with hybrid search OFF',
  },
  {
    id: 'lexical',
    label: 'lexical only (derived from the fused pool)',
    params: { traverse: 0, rerank: false },
    channel: 'lexical',
    path: 'recall',
    approximate: true,
    requires: 'an instance with hybrid search ON',
    /*
     * THE ONE ROW THAT IS NOT WHAT ITS PROTOCOL NAME SAYS, stated here rather than discovered by a reader.
     *
     * The server has no lexical-only mode: `hybridSearchEnabled()` is a two-state switch between "vector" and
     * "vector fused with lexical", so the keyword channel alone is not something either door can be asked for.
     * What IS available is the channel's own opinion — `lexicalScore` is the Mongo `textScore` the lexical
     * search computed, returned unconditionally — so this method keeps the results that matched lexically and
     * orders them by that score alone.
     *
     * What it therefore is not: the candidate pool was still assembled with embeddings in it (the lexical
     * channel does introduce records the vector search never returned, but capped and after the pool exists),
     * so this is "the lexical ranking over the hybrid pool", not "no embeddings" as the protocol's table says.
     * Reporting it without this sentence would overstate a channel we cannot isolate. Refusing to score the row
     * at all was the alternative, and it costs a whole method the protocol pre-registered.
     *
     * It also fails visibly rather than plausibly: on an instance with hybrid OFF nothing carries a
     * `lexicalScore`, so every row is EMPTY — obviously broken in a results table, instead of quietly being the
     * vector row under a second name.
     */
    caveat: 'Lexical ranking over the hybrid candidate pool, not a pure keyword retrieval: the server has no '
      + 'lexical-only mode, so the pool was assembled with the vector channel in it. Results are the subset '
      + 'carrying a lexicalScore, ordered by it — and topK and budgetBytes bounded the pool this was derived '
      + 'from, not the rows reported here.',
  },
  {
    id: 'hybrid',
    label: 'hybrid (RRF)',
    params: { traverse: 0, rerank: false },
    channel: 'hybrid',
    path: 'recall',
    approximate: false,
    requires: 'an instance with hybrid search ON and no reranker configured',
  },
  {
    id: 'hybrid-rerank',
    label: 'hybrid + rerank',
    params: { traverse: 0, rerank: true },
    channel: 'hybrid',
    path: 'recall',
    approximate: false,
    requires: 'an instance with hybrid search ON and a reranker configured',
  },
  {
    id: 'hybrid-traverse',
    label: 'hybrid + traverse',
    params: { rerank: false },
    minTraverse: 1,
    channel: 'hybrid',
    path: 'recall',
    approximate: false,
    requires: 'an instance with hybrid search ON and no reranker configured',
  },
  {
    id: 'everything',
    label: 'hybrid + traverse + rerank',
    params: { rerank: true },
    minTraverse: 1,
    channel: 'hybrid',
    path: 'recall',
    approximate: false,
    requires: 'an instance with hybrid search ON and a reranker configured',
  },
  {
    id: 'deterministic-query',
    label: 'deterministic query',
    /*
     * No ranking exists on this path, so three of the five axes are pinned to "off" rather than left free: a
     * `minScore` threshold over records that have no score, or a rerank of an unordered set, would be a cell
     * that reads as measured and measured nothing. `cellApplies` drops them for this method because of these
     * pins, which is the same mechanism that drops the traverse cells — one rule, not a special case.
     */
    params: { traverse: 0, minScore: null, rerank: false },
    channel: 'none',
    path: 'query',
    approximate: false,
    requires: 'nothing instance-level — it is a predicate over the store',
  },
];

const METHODS_BY_ID = new Map(RETRIEVAL_METHODS.map(m => [m.id, m]));

/* ── The grid ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The 14 one-axis-at-a-time cells, from the shipped defaults.
 *
 * @param defaults the parsed `benchmarks/configs/ythril.json`, which must carry every knob the protocol says is
 *                 pinned there, plus the two values the protocol says are chosen at pin time:
 *
 *   {
 *     topK, traverse, minScore, budgetBytes, rerank,          // the shipped defaults, written out
 *     sweep: { minScore, budgetBytesTight }                   // the two pin-time choices
 *   }
 *
 * Both sweep values are REQUIRED and neither is defaulted here. The protocol says the `minScore` threshold is
 * "chosen at pin time from the score distribution" — a number this module invented would be a threshold nobody
 * pinned, reported as though somebody had, and it would be invisible in the results. Same for the tight budget:
 * "deliberately tight" is a judgement about this deployment, and a default would quietly make it not tight.
 *
 * Every cell carries the axis it varies and whether it IS the baseline. The baseline appears once per axis
 * whose value list contains the shipped default — the protocol's arithmetic counts it that way — so a runner
 * that wants to execute it once can filter on `baseline`, and a cache keyed on `params` gets the reuse for free
 * because the params are byte-identical.
 */
export function gridCells(defaults) {
  const d = validatedDefaults(defaults);

  const axisValues = {
    topK: TOP_K_VALUES,
    traverse: TRAVERSE_VALUES,
    // `null` is "off". Not `0`: the server treats a `minScore` of 0 as off as well, but a cell labelled `0`
    // reads as a threshold that was applied and found nothing.
    minScore: [null, d.sweep.minScore],
    budgetBytes: [d.sweep.budgetBytesTight, MCP_DEFAULT_BYTES, REST_DEFAULT_BYTES],
    rerank: [false, true],
  };

  const cells = [];
  for (const axis of AXES) {
    for (const value of axisValues[axis]) {
      const params = {
        topK: d.topK, traverse: d.traverse, minScore: d.minScore,
        budgetBytes: d.budgetBytes, rerank: d.rerank,
      };
      params[axis] = value;
      cells.push({
        id: `${axis}=${labelOf(axis, value)}`,
        axis,
        value,
        params,
        baseline: AXES.every(a => params[a] === d[a]),
      });
    }
  }

  if (cells.length !== EXPECTED_CELLS) {
    throw new Error(
      `gridCells produced ${cells.length} cells; the protocol pre-registers ${EXPECTED_CELLS} `
      + '(4 + 3 + 2 + 3 + 2, one axis at a time). Changing an axis changes what the published grid costs and '
      + 'what it measures — add a dated entry to PROTOCOL.md#amendments rather than widening this quietly.');
  }
  return cells;
}

/**
 * The shipped configuration as a single cell, for the runs that use no grid at all.
 *
 * Tier 0 is "shipped defaults only, no grid", and the head-to-head number against any competitor is pinned to
 * the same configuration. Exported so neither of those has to hand-build a cell and get its shape subtly wrong
 * — an invented cell is how a head-to-head ends up run on something that is not the shipped default.
 */
export function defaultCell(defaults) {
  const d = validatedDefaults(defaults);
  return {
    id: 'shipped-defaults',
    // No axis is varied, so no cell/method conflict is possible — see `cellApplies`.
    axis: null,
    value: null,
    params: { topK: d.topK, traverse: d.traverse, minScore: d.minScore, budgetBytes: d.budgetBytes, rerank: d.rerank },
    baseline: true,
  };
}

/**
 * The knobs a method actually runs with: the cell's, with the method's definition on top.
 *
 * Exported because the protocol requires every retrieval knob to be echoed into the result file, and what
 * belongs there is what RAN — not `cell.params` (which the method may have overridden) and not `method.params`
 * (which is only the part the method fixes). One function, so a results file and a request cannot disagree
 * about what was measured.
 */
export function resolveParams(method, cell) {
  const m = resolveMethod(method);
  assertCellShape(cell);
  const params = { ...cell.params, ...m.params };
  if (m.minTraverse != null) params.traverse = Math.max(params.traverse, m.minTraverse);
  return params;
}

/**
 * Does this cell measure anything for this method?
 *
 * One rule: a cell is applicable unless the method overrides the very axis the cell varies. `topK=50` against
 * "hybrid + rerank" is a real measurement; `rerank=off` against it is not — the method IS the reranker, so the
 * cell would silently run with rerank on and be filed under "off". That is the mislabelled-row failure again,
 * and it is why `retrieveFor` refuses such a pair rather than resolving it.
 *
 * The same rule, with no special cases, is what drops the traverse cells for the non-traversing methods, the
 * `traverse=0` cell for the two traversing ones, and three of the five axes for the deterministic predicate.
 */
export function cellApplies(method, cell) {
  const m = resolveMethod(method);
  assertCellShape(cell);
  if (cell.axis === null) return true;
  return resolveParams(m, cell)[cell.axis] === cell.value;
}

/* ── Retrieval ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Retrieve the context for one question.
 *
 * @param question a question's TEXT. A string, and the refusal below is deliberate — see the module note.
 * @param options  exactly `{ ythril, space, method, cell }`, refused if it carries anything else.
 * @returns `{ context, records, tokens, ms, ... }` — the contract's four, plus the raw retrieval and the
 *          evidence a results file needs to be checkable:
 *
 *   context     the string that goes into the answerer prompt, identical in format for every method and rung
 *   records     how many records are in it
 *   tokens      an APPROXIMATION — see `approxTokens`
 *   ms          wall clock of the store call(s) ONLY, not of rendering: `ms` is published as retrieval latency
 *               and a harness's own string building is not something a user waits for
 *   retrieved   the records themselves, in the order they were returned
 *   bytes       exact byte length of `context`
 *   params      the resolved knobs, for the result file
 *   stages      which retrieval stages the server reports having run
 *   truncated   whether the byte budget bit
 *   calls       how many store calls this took — the deterministic predicate needs several
 *   approximate / caveat  carried out of the method so a report cannot print the row without the caveat
 */
export async function retrieveFor(question, options) {
  const text = assertQuestionTextOnly(question);
  const { ythril, space, method, cell } = assertOptions(options);
  const m = resolveMethod(method);
  assertCellShape(cell);

  if (!cellApplies(m, cell)) {
    const resolved = resolveParams(m, cell)[cell.axis];
    throw new Error(
      `retrieveFor: cell '${cell.id}' does not apply to method '${m.id}' — the method fixes `
      + `${cell.axis} at ${labelOf(cell.axis, resolved)}, so running it would file a `
      + `${labelOf(cell.axis, resolved)} measurement under ${labelOf(cell.axis, cell.value)}. `
      + 'Filter the grid with cellApplies() before calling.');
  }

  const params = resolveParams(m, cell);
  const outcome = m.path === 'recall'
    ? await recallPath(text, { ythril, space, method: m, params })
    : await queryPath(text, { ythril, space, params });

  const context = renderContext(outcome.retrieved);
  return {
    context,
    records: outcome.retrieved.length,
    tokens: approxTokens(context),
    ms: outcome.ms,
    retrieved: outcome.retrieved,
    bytes: Buffer.byteLength(context, 'utf8'),
    params,
    stages: outcome.stages,
    truncated: outcome.truncated,
    calls: outcome.calls,
    approximate: m.approximate,
    ...(m.approximate ? { caveat: m.caveat } : {}),
  };
}

/* ── The ranked path ────────────────────────────────────────────────────────────────────────────────────── */

async function recallPath(text, { ythril, space, method, params }) {
  const started = performance.now();
  const response = await ythril.recall(space, recallRequest(text, params));
  const ms = performance.now() - started;

  const results = assertEnvelope(response, 'recall');
  const stages = observedStages(results);
  assertStagesMatchLabel(method, params, stages);

  return {
    retrieved: method.channel === 'lexical' ? lexicalOnly(results) : results,
    stages,
    // The server applied the budget and says whether it bit. Trusting its field rather than re-deriving the
    // answer from what came back: two implementations of one rule is the defect this repo produces most.
    truncated: response.truncated === true,
    calls: 1,
    ms,
  };
}

/**
 * The request, and the ONE place `budgetBytes` becomes `maxBytes`.
 *
 * `minScore` is omitted when off rather than sent as `null`. The route reads `typeof minScore === 'number'`, so
 * a null would be ignored — but sending a key that is ignored is how a caller comes to believe a threshold was
 * applied, and this harness publishes what it sent.
 *
 * `types` is deliberately not sent. Constraining the record types per method would make the ingestion rungs
 * incomparable — S0 writes only memories, S4 writes four types — and the rung comparison is the table the
 * protocol calls the one that matters most.
 */
function recallRequest(text, params) {
  return {
    query: text,
    topK: params.topK,
    traverse: params.traverse,
    maxBytes: params.budgetBytes,
    ...(params.minScore == null ? {} : { minScore: params.minScore }),
  };
}

/** Which stages the server says ran, read off the unconditional per-stage scores. */
function observedStages(results) {
  return {
    vector: results.some(r => typeof r.score === 'number'),
    lexical: results.some(r => typeof r.lexicalScore === 'number'),
    fused: results.some(r => typeof r.fusedScore === 'number'),
    rerank: results.some(r => typeof r.rerankScore === 'number'),
  };
}

/**
 * Refuse a row whose label is contradicted by what the server reports it did.
 *
 * Only the "it fired and the label says off" direction. The opposite — a stage the label says is on that did
 * not fire — is legitimate per call (nothing matched lexically; the reranker skipped below
 * `RERANK_MIN_BUDGET_MS`) and is reported through `stages` for the runner to aggregate instead. A gate that
 * cannot tell "did not fire" from "is not configured" must not be the thing that fails a run, but a run where
 * the reranker never fired is a finding the results have to state, so the evidence goes out with every call.
 */
function assertStagesMatchLabel(method, params, stages) {
  if (method.channel === 'vector' && (stages.lexical || stages.fused)) {
    throw new Error(
      `retrieveFor: method '${method.id}' is labelled vector-only but the response carries fusion scores — `
      + 'this instance has hybrid search ON, so the ranking is the fused one. Run this method against an '
      + 'instance started with YTHRIL_HYBRID_SEARCH=off; the row is otherwise mislabelled.');
  }
  if (!params.rerank && stages.rerank) {
    throw new Error(
      `retrieveFor: method '${method.id}' runs with rerank off but the response carries rerankScore — this `
      + 'instance has a reranker configured, so the ordering is the cross-encoder\'s. Run the rerank-off rows '
      + 'against an instance with no RERANK_URL/RERANK_MODEL.');
  }
}

/**
 * The lexical channel's own ranking, over the pool the fused search returned.
 *
 * Records with no `lexicalScore` did not match lexically and are DROPPED rather than kept at the bottom:
 * keeping them would make this row the hybrid row with a different sort. Ties fall back to `_id` so the order
 * is total and a re-run is byte-identical — an unstable sort would show up as noise between seeds and be read
 * as retrieval variance.
 */
function lexicalOnly(results) {
  return results
    .filter(r => typeof r.lexicalScore === 'number')
    .sort((a, b) => b.lexicalScore - a.lexicalScore || String(a._id).localeCompare(String(b._id)));
}

/* ── The deterministic path ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Text fields per collection, mirrored from `server/src/brain/text-search.ts#SEARCHABLE_FIELDS`.
 *
 * `files` is absent on purpose: the protocol records LoCoMo's images as out of scope, so a file predicate would
 * search a collection this benchmark never writes and cost a store call per question to prove it.
 *
 * A mirror can drift. What it would cost here is a predicate that misses a field the product searches, making
 * this method look worse than the shipped behaviour — so the drift direction is against us, which is the right
 * way round for a number we publish.
 */
const SEARCHABLE_FIELDS = {
  memories: ['fact', 'description'],
  entities: ['name', 'description'],
  chrono: ['title', 'description'],
  edges: ['label', 'description'],
};

/** The collections queried, in a fixed order so a re-run produces the same context byte for byte. */
const QUERY_COLLECTIONS = ['memories', 'entities', 'chrono', 'edges'];

/**
 * General English function words. **Not derived from this dataset** — Amendment 3 forbids that, and the test it
 * gives is "would this still be right for a user whose conversations look nothing like this dataset?" A
 * function-word list is a property of the language, so it passes; a list tuned to what LoCoMo questions happen
 * to contain would not.
 *
 * The wh-words are in it. They say what the question is ASKING, not what the store contains: leaving "when" in
 * an OR predicate matches every record that happens to contain the word.
 */
const STOPWORDS = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'hers', 'him', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'she', 'should', 'so', 'some',
  'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'to', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your',
]);

/**
 * The server's own regex-pattern ceiling, mirrored from `server/src/util/redos.ts#MAX_PATTERN_LENGTH`.
 * A longer term is refused here rather than sent — a 400 mid-run is the same stop with a worse message.
 */
const MAX_PATTERN_LENGTH = 500;

/**
 * No ranking at all: a predicate over the store, on every collection the rungs write.
 *
 * Several store calls, because `/query` takes one collection per request. The results are merged ROUND-ROBIN
 * rather than concatenated in collection order. Concatenation was the obvious version and it is wrong in a way
 * that would have looked like a finding: memories are by far the most numerous record type, so at a tight
 * budget they would fill it entirely and every edge and chrono record would be dropped — and the row would read
 * as "the graph and the timeline do not help", when it was the merge that removed them. Round-robin is not a
 * ranking: it compares nothing, and each collection keeps its own order.
 */
async function queryPath(text, { ythril, space, params }) {
  const terms = contentTerms(text);
  if (terms.length === 0) {
    /*
     * Every word was a function word. The predicate would be `{}`, which matches everything and returns the
     * store's first `limit` records in its default order — a full context that has nothing to do with the
     * question, charged to this method's token cost. Nothing retrieved is the truthful answer, and it costs no
     * calls to say so.
     */
    return { retrieved: [], stages: NO_STAGES, truncated: false, calls: 0, ms: 0 };
  }

  const filterFor = collection => ({
    $or: SEARCHABLE_FIELDS[collection].flatMap(
      field => terms.map(t => ({ [field]: { $regex: escapeRegex(t), $options: 'i' } }))),
  });

  const started = performance.now();
  const perCollection = [];
  for (const collection of QUERY_COLLECTIONS) {
    const response = await ythril.query(space, {
      collection,
      filter: filterFor(collection),
      // `limit` is this path's `topK`: the axis means "how many records may this method return per store
      // call", and that is what it means on the ranked path too.
      limit: params.topK,
    });
    perCollection.push(assertEnvelope(response, 'query').map(doc => shapeQueryRecord(collection, doc)));
  }
  const ms = performance.now() - started;

  /*
   * `/query` has no byte budget — `QUERY_BODY_FIELDS` is `collection, filter, projection, limit, skip, sort,
   * dir, maxTimeMS` — so the budget axis is applied here instead, by the SAME rule the server applies on the
   * ranked path: whole records only, and a single record larger than the whole budget is still returned alone.
   * Two implementations of one rule is what the house rule warns about; matching the server's rule exactly is
   * what keeps a `budgetBytes` number comparable across the two paths rather than being two different numbers
   * with one name.
   */
  const budgeted = budgetWholeRecords(interleave(perCollection), params.budgetBytes);
  return {
    retrieved: budgeted.kept,
    stages: NO_STAGES,
    truncated: budgeted.truncated,
    calls: QUERY_COLLECTIONS.length,
    ms,
  };
}

/** No stage ran, and the three ranked stages are false rather than absent so a report never interprets a gap. */
const NO_STAGES = Object.freeze({ vector: false, lexical: false, fused: false, rerank: false });

/**
 * The question's content words, deduplicated, in the order they appear.
 *
 * A repeated term adds an OR clause that changes no result and spends pattern budget. Order is the question's
 * own, so the predicate is reproducible from the question text alone.
 *
 * `$or` and not `$and`. An AND over every content word matches almost nothing on any corpus, which would make
 * this method look useless rather than showing what it is for — an exact predicate that wins on questions with
 * a nameable answer and loses on open-ended ones. Both halves of that are the reason the protocol includes the
 * row.
 */
function contentTerms(text) {
  const terms = [];
  const seen = new Set();
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}']+/u)) {
    const term = raw.replace(/^'+/, '').replace(/'+$/, '');
    if (!term || STOPWORDS.has(term) || seen.has(term)) continue;
    const escaped = escapeRegex(term);
    if (escaped.length > MAX_PATTERN_LENGTH) {
      throw new Error(
        `retrieveFor: a term of ${escaped.length} escaped characters exceeds the store's `
        + `${MAX_PATTERN_LENGTH}-character regex limit. Silently dropping it would make the predicate quietly `
        + 'narrower than the question.');
    }
    seen.add(term);
    terms.push(term);
  }
  return terms;
}

/** Mirrors `server/src/util/redos.ts#escapeRegex`: the term is a literal, never a pattern. */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A raw `/query` document, in the shape a recall result arrives in.
 *
 * **The two doors return the same record differently, and this is where that gets reconciled once.** `/recall`
 * builds its results from a whitelist (`brain/recall.ts#mapToRecallResult`) which renames the record's own
 * `type` out of the way of the result discriminator: an entity's `type` becomes `entityType`, an edge's becomes
 * `edgeType`, a chrono's becomes `chronoType`. `/query` returns the stored document, where `type` is still the
 * record's own. Rendering both without this would either lose the entity type or hand the renderer "person" as
 * a record kind — a difference between two methods' contexts that has nothing to do with retrieval.
 *
 * A memory's own `type` has nowhere to go — recall drops it, so it is dropped here too. Keeping it on this path
 * alone would give the deterministic method a field the ranked ones cannot have.
 */
function shapeQueryRecord(collection, doc) {
  switch (collection) {
    case 'memories': return { ...doc, type: 'memory' };
    case 'entities': return { ...doc, type: 'entity', entityType: doc.type };
    case 'chrono': return { ...doc, type: 'chrono', chronoType: doc.type };
    case 'edges': return { ...doc, type: 'edge', edgeType: doc.type };
    default: throw new Error(`retrieveFor: no record shape for collection '${collection}'`);
  }
}

/** Round-robin across the per-collection lists, each keeping its own order. */
function interleave(lists) {
  const out = [];
  const longest = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

/**
 * The server's budget rule, applied client-side: whole records, in order, until the next one would not fit.
 * Mirrors `server/src/brain/result-budget.ts#applyBudget`, including that the first record is returned even if
 * it alone exceeds the budget — returning nothing would turn a large record into an unanswerable question.
 */
function budgetWholeRecords(records, budgetBytes) {
  const kept = [];
  let used = 2; // the enclosing brackets, charged the way the server charges its envelope
  for (const record of records) {
    const size = Buffer.byteLength(JSON.stringify(record), 'utf8') + 1;
    if (kept.length > 0 && used + size > budgetBytes) return { kept, truncated: true };
    kept.push(record);
    used += size;
  }
  return { kept, truncated: false };
}

/* ── Rendering ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The retrieved records as the answerer's context.
 *
 * **Identical for every method, every cell and every ingestion rung.** The protocol's answerer section says
 * only the retrieved context differs between systems; a renderer that varied by method would put part of the
 * measured difference in this function, where no results table would ever show it.
 *
 * `_id` is not rendered. It is a uuid that costs tokens and tells the answerer nothing; the raw records are
 * returned beside the context for drill-down, so nothing is lost that a reader would want.
 */
function renderContext(records) {
  return records.map(r => renderRecord(r, 0)).join('\n');
}

function renderRecord(record, depth) {
  const indent = '  '.repeat(depth);
  const lines = [`${indent}[${record.type ?? 'record'}] ${headlineOf(record)}${propertySuffix(record)}`];
  lines.push(...renderHops(record._graph, depth + 1));
  return lines.join('\n');
}

/**
 * Graph expansion, nested exactly as the response nests it, to whatever depth came back.
 *
 * Each node is rendered under the seed that reached it WITH THE EDGE LABEL, which is what makes traversal
 * legible: the edge document's `from`/`to` are entity ids, but here the seed is the line above and the node is
 * the line itself, so the label alone states the relation. This is the whole reason the traverse methods can
 * contribute anything an answerer can read.
 *
 * `hop.node` is an entity DOCUMENT (`brain/recall-graph.ts#graphNodeRecord`), so its `type` is the entity's own
 * type — "person", not "entity". Spreading it over the renderer's discriminator would send `headlineOf` a type
 * it has never heard of and throw on the first traversing question. Same rename as `mapToRecallResult` does for
 * a top-level entity hit, so both arrive at the renderer as one shape.
 */
function renderHops(hops, depth) {
  const lines = [];
  for (const hop of hops ?? []) {
    const via = hop.edge?.label ? `-[${hop.edge.label}]-> ` : '-> ';
    const node = { ...hop.node, type: 'entity', entityType: hop.node?.type };
    lines.push(`${'  '.repeat(depth)}${via}${headlineOf(node)}${propertySuffix(node)}`);
    lines.push(...renderHops(hop._graph, depth + 1));
  }
  return lines;
}

/**
 * The one line a record is worth, per type.
 *
 * Written out per type rather than using `matchedText` — the exact string the retriever matched on, which would
 * have been the tidier choice and resolves an edge's entity ids to names for free. It is not available: it is
 * in `RECALL_RECORD_DIAGNOSTICS`, stripped unless `includeDiagnostics: true`, and that parameter is not on the
 * client this harness is built against.
 *
 * So an edge renders its `from`/`to` ids, which say nothing to an answerer. Recorded rather than worked around:
 * an edge that surfaces as a direct recall hit contributes almost nothing here, and what the graph actually
 * contributes arrives through traversal, where the neighbour records carry real names. If the edge rows matter
 * to a published conclusion, the fix is on the server — `/recall` resolving edge entity names the way the
 * traverse route already does — not a second guess in the harness.
 */
function headlineOf(record) {
  switch (record.type) {
    case 'memory': return withDescription(record.fact ?? '', record);
    case 'entity': return withDescription(`${record.name} (${record.entityType ?? record.type})`, record);
    case 'edge': return withDescription(`${record.from} -[${record.label}]-> ${record.to}`, record);
    case 'chrono': {
      /*
       * `endsAt` is rendered when it is there, and on the ranked path it never is: `mapToRecallResult` builds a
       * chrono result from `title`, `type`, `startsAt` and `status` and does not carry the end. That is the
       * server's omission and not the harness's, and it is left visible rather than normalised away — the
       * protocol's S3 → S4 question is literally whether chrono modelling reaches retrieval, and "the end of a
       * dated event is modelled but not returned by recall" is an answer to it.
       */
      const span = record.endsAt ? `${record.startsAt} to ${record.endsAt}` : record.startsAt;
      return withDescription(`${record.title} (${span}${record.status ? `, ${record.status}` : ''})`, record);
    }
    case 'file': return withDescription(record.headingText
      ? `${record.path} — ${record.headingText}` : String(record.path ?? ''), record);
    default:
      /*
       * Refused, not rendered as JSON. A record type this does not know about is a change on the server or a
       * rung writing something new, and quietly serialising it would put an unreviewed shape in front of the
       * answerer on some questions and not others — a difference in the measurement nobody would look for.
       */
      throw new Error(`retrieveFor: no renderer for record type '${record.type}' — add one deliberately, `
        + 'because an unrendered type changes the answerer\'s context on some questions and not others.');
  }
}

function withDescription(headline, record) {
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  return description ? `${headline} — ${description}` : headline;
}

/**
 * `properties` and `tags` verbatim, never a chosen subset.
 *
 * Which properties matter is exactly what the ingestion rungs are being measured on — S0 writes the session and
 * the speaker, S4 writes resolved dates — so a renderer that picked favourites would be scoring its own
 * judgement instead of theirs.
 */
function propertySuffix(record) {
  const parts = [];
  for (const [key, value] of Object.entries(record.properties ?? {})) parts.push(`${key}=${value}`);
  if (Array.isArray(record.tags) && record.tags.length > 0) parts.push(`tags=${record.tags.join(',')}`);
  return parts.length > 0 ? `  {${parts.join(' ')}}` : '';
}

/**
 * Characters / 3.5.
 *
 * The server's own figure for these payloads (`maxTokens`'s `charsPerToken` default), chosen there because the
 * customary 4.0 under-counts and is worst on graph-heavy responses — which is what a traversing recall returns.
 * It is an approximation and it is labelled one everywhere it surfaces: the protocol's cost table wants
 * retrieval tokens per question, and a published figure comes from the answerer's own tokeniser via
 * `models.mjs#estimate`. This is for sizing a run and for the relative cost of one cell against another, where
 * a consistent approximation is enough and a wrong tokeniser would not be.
 */
function approxTokens(context) {
  return Math.ceil(context.length / 3.5);
}

/* ── Refusals ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The question's text, or a refusal.
 *
 * **A string, never an object.** `Question` from `dataset/locomo.mjs` carries `answer`, `evidence` and
 * `category`; accepting one here would put all three inside the retriever, one property access from the code
 * that builds the query, with nothing but discipline in between. Refusing the object is the difference between
 * a rule that is enforced and a rule that is documented — and it is enforced at the only point where a caller
 * could pass it.
 */
function assertQuestionTextOnly(question) {
  if (typeof question !== 'string') {
    throw new TypeError(
      'retrieveFor(question, ...): question must be the question TEXT, a string. It was passed a '
      + `${question === null ? 'null' : typeof question}. Retrieval never sees the graded answer, the evidence `
      + 'ids or the category — passing the whole question record would put all three inside the retriever, '
      + 'which is the overfit this benchmark exists to be checkable about. Pass `q.question`.');
  }
  if (question.trim() === '') {
    throw new Error('retrieveFor(question, ...): question text is empty; there is nothing to retrieve for.');
  }
  return question.trim();
}

const ALLOWED_OPTIONS = ['ythril', 'space', 'method', 'cell'];

/**
 * Named keys that would carry the answer key into this module if the options object were permissive.
 *
 * They get their own refusal rather than the generic unknown-key one, because the generic message reads as a
 * typo to fix and this one is a rule to obey. It is listed here rather than left to the strict check because
 * the most likely way it happens is somebody adding a field for a good local reason.
 */
const BLINDNESS_VIOLATIONS = ['answer', 'evidence', 'category', 'adversarialAnswer', 'gold'];

function assertOptions(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError(`retrieveFor: options must be { ${ALLOWED_OPTIONS.join(', ')} }.`);
  }
  const keys = Object.keys(options);
  const forbidden = keys.filter(k => BLINDNESS_VIOLATIONS.includes(k));
  if (forbidden.length > 0) {
    throw new Error(
      `retrieveFor: options must not carry ${forbidden.join(', ')}. Retrieval is given the question text and `
      + 'nothing that describes the expected answer — not the gold string, not the evidence ids, not the '
      + 'question category. A retriever that can see any of them can be tuned per category by accident, and '
      + 'from a results table that is indistinguishable from tuning it on purpose.');
  }
  const unknown = keys.filter(k => !ALLOWED_OPTIONS.includes(k));
  if (unknown.length > 0) {
    throw new Error(
      `retrieveFor: unknown option(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_OPTIONS.join(', ')}.`);
  }
  for (const required of ALLOWED_OPTIONS) {
    if (options[required] == null) throw new Error(`retrieveFor: option '${required}' is required.`);
  }
  if (typeof options.ythril?.recall !== 'function' || typeof options.ythril?.query !== 'function') {
    throw new TypeError('retrieveFor: `ythril` must be a client from ythril.mjs — it needs recall() and query().');
  }
  if (typeof options.space !== 'string' || options.space.trim() === '') {
    throw new TypeError('retrieveFor: `space` must be a space id.');
  }
  return options;
}

/**
 * A method id, or one of the objects from `RETRIEVAL_METHODS`.
 *
 * A look-alike object is refused. Accepting one would let a caller hand-roll a method with different pins and
 * have it scored under one of the seven pre-registered names — a configuration invented after the fact,
 * reported as though it were in the protocol.
 */
function resolveMethod(method) {
  if (typeof method === 'string') {
    const found = METHODS_BY_ID.get(method);
    if (!found) {
      throw new Error(`retrieveFor: unknown method '${method}'. One of: ${[...METHODS_BY_ID.keys()].join(', ')}.`);
    }
    return found;
  }
  if (RETRIEVAL_METHODS.includes(method)) return method;
  throw new TypeError(
    'retrieveFor: `method` must be an id or one of the RETRIEVAL_METHODS objects. An object that merely looks '
    + 'like one would be a configuration invented outside the protocol, scored under a name from inside it.');
}

/** A cell from `gridCells` or `defaultCell` — checked by shape, since its values depend on the pinned config. */
function assertCellShape(cell) {
  if (cell === null || typeof cell !== 'object' || Array.isArray(cell)) {
    throw new TypeError('retrieveFor: `cell` must be a cell from gridCells() or defaultCell().');
  }
  if (!('axis' in cell) || (cell.axis !== null && !AXES.includes(cell.axis))) {
    throw new Error(`retrieveFor: cell.axis must be null or one of: ${AXES.join(', ')}.`);
  }
  if (cell.params === null || typeof cell.params !== 'object') {
    throw new TypeError('retrieveFor: cell.params is missing.');
  }
  for (const axis of AXES) {
    if (!(axis in cell.params)) {
      throw new Error(
        `retrieveFor: cell.params.${axis} is missing. Every cell states all five knobs, including the four it `
        + 'holds at their default — a results file that records only the varied one cannot say what the other '
        + 'four were when the run happened.');
    }
  }
  assertKnobs(cell.params, 'cell.params');
}

/** The REST envelope, or a refusal that names what came instead. */
function assertEnvelope(response, what) {
  if (response === null || typeof response !== 'object' || !Array.isArray(response.results)) {
    throw new TypeError(
      `retrieveFor: ${what}() did not return the REST envelope — expected an object with a \`results\` array, `
      + `got ${response === null ? 'null' : Array.isArray(response) ? 'an array' : typeof response}. `
      + 'ythril.mjs returns the parsed response body; see CONTRACTS.md.');
  }
  return response.results;
}

/* ── Config validation ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * The shipped defaults, checked hard enough that a missing pin cannot become an invented one.
 *
 * The two structural checks are the ones worth naming:
 *
 * - **every axis must contain the shipped default.** The grid varies one axis while the rest sit at their
 *   default, so if the default is not itself on the axis, no cell in that axis is the baseline and every
 *   comparison in it is against a configuration that was never run. It is also the check that catches this
 *   file's mirrored byte constants going stale against the product.
 * - **the tight budget must be tighter than both shipped defaults.** "One deliberately tight value" is the
 *   protocol's third budget; a number equal to or above a default is a duplicate wearing the word "tight", and
 *   the axis would then measure two points instead of three.
 */
function validatedDefaults(defaults) {
  if (defaults === null || typeof defaults !== 'object' || Array.isArray(defaults)) {
    throw new TypeError('gridCells(defaults): expected the parsed benchmarks/configs/ythril.json.');
  }
  for (const axis of AXES) {
    if (!(axis in defaults)) {
      throw new Error(
        `gridCells: defaults.${axis} is missing. The protocol requires every retrieval knob to be pinned in `
        + 'configs/ythril.json with its value written out, so that "default" cannot change underneath a '
        + 'published number. It is not defaulted here.');
    }
  }
  assertKnobs(defaults, 'defaults');

  const sweep = defaults.sweep;
  if (sweep === null || typeof sweep !== 'object') {
    throw new Error(
      'gridCells: defaults.sweep is missing. It carries the two values the protocol says are chosen at pin '
      + 'time — { minScore, budgetBytesTight } — and neither can be invented here: a threshold this module '
      + 'made up would be reported as one somebody pinned.');
  }
  if (typeof sweep.minScore !== 'number' || !(sweep.minScore > 0)) {
    throw new Error(
      'gridCells: defaults.sweep.minScore must be the threshold chosen at pin time from the score '
      + 'distribution, a number above 0.');
  }
  if (!Number.isInteger(sweep.budgetBytesTight) || sweep.budgetBytesTight <= 0) {
    throw new Error('gridCells: defaults.sweep.budgetBytesTight must be a positive integer number of bytes.');
  }
  if (sweep.budgetBytesTight >= Math.min(MCP_DEFAULT_BYTES, REST_DEFAULT_BYTES)) {
    throw new Error(
      `gridCells: defaults.sweep.budgetBytesTight (${sweep.budgetBytesTight}) is not tighter than the shipped `
      + `budgets (${MCP_DEFAULT_BYTES}, ${REST_DEFAULT_BYTES}). The protocol's third budget value is a `
      + 'deliberately tight one; at or above a default it is a duplicate and the axis measures two points.');
  }

  const axisValues = {
    topK: TOP_K_VALUES,
    traverse: TRAVERSE_VALUES,
    minScore: [null, sweep.minScore],
    budgetBytes: [sweep.budgetBytesTight, MCP_DEFAULT_BYTES, REST_DEFAULT_BYTES],
    rerank: [false, true],
  };
  for (const axis of AXES) {
    if (!axisValues[axis].includes(defaults[axis])) {
      throw new Error(
        `gridCells: the shipped default ${axis}=${labelOf(axis, defaults[axis])} is not one of that axis's `
        + `values (${axisValues[axis].map(v => labelOf(axis, v)).join(', ')}), so no cell on it is the `
        + 'baseline and every comparison in that axis is against a configuration the grid never runs. Either '
        + 'the product default moved and this file\'s values are stale, or the config is wrong.');
    }
  }
  return defaults;
}

/** Shared by the config and the cell, so a knob cannot be valid in one and not the other. */
function assertKnobs(knobs, what) {
  if (!Number.isInteger(knobs.topK) || knobs.topK < 1) {
    throw new Error(`${what}.topK must be a positive integer.`);
  }
  if (!Number.isInteger(knobs.traverse) || knobs.traverse < 0) {
    throw new Error(`${what}.traverse must be a traversal depth: an integer of 0 or more.`);
  }
  if (knobs.minScore !== null && !(typeof knobs.minScore === 'number' && knobs.minScore > 0)) {
    throw new Error(
      `${what}.minScore must be null for off, or a number above 0. Off is null and not 0 so that a cell `
      + 'labelled with a threshold is always a cell where one was applied.');
  }
  if (!Number.isInteger(knobs.budgetBytes) || knobs.budgetBytes < 1) {
    throw new Error(`${what}.budgetBytes must be a positive integer number of bytes.`);
  }
  if (typeof knobs.rerank !== 'boolean') {
    throw new Error(`${what}.rerank must be a boolean.`);
  }
}

/** How a knob's value is written in a cell id and in a refusal — one spelling, so a reader can grep for it. */
function labelOf(axis, value) {
  if (axis === 'minScore') return value === null ? 'off' : String(value);
  if (axis === 'rerank') return value ? 'on' : 'off';
  return String(value);
}
