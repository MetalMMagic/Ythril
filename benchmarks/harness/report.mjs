/**
 * The results writer: everything a sceptic needs to re-derive a published number.
 *
 * `writeResults(dir, { tier, pins, configs, rows, costs, cacheStats })` per `CONTRACTS.md`, plus the two
 * parameters the contract line does not spell out — `date` and `commit`. **They are parameters and never read
 * from the environment.** This module calls neither `git` nor `Date`: a report writer that stamps its own
 * timestamp cannot be tested (its output changes every run), and one that shells out to `git` records the
 * checkout it happened to run in rather than the commit the numbers were produced at. The rejected alternative
 * was `execFileSync('git', ['rev-parse', 'HEAD'])` here, which costs exactly that — a resumed run that finishes
 * after a later commit would label its numbers with the wrong source.
 *
 * ## What every file here carries, and why it is on every file
 *
 * Each JSON file, and **each line of each `.jsonl`**, carries `tier` and `commit`. Stamping the run directory
 * alone was rejected: the failure this prevents is a row or a table pasted into a slide deck, and the moment it
 * leaves the directory the directory name is gone. `PROTOCOL.md` states the rule as *"a tier is only published
 * with its own tier named in the results"*, and a Tier 0 number quoted as Tier 2 is the specific misreading it
 * exists to stop. Thirty bytes a row is the price.
 *
 * ## Raw outputs, not just scores
 *
 * `rows.jsonl` holds every row VERBATIM — every prediction, every judge verdict and its reason. Nothing is
 * summarised away, because `PROTOCOL.md` closes on *"a results table nobody can drill into is a press release"*
 * and a scores file alone is exactly that. `raw/<stream>.jsonl` takes anything that is not per-question — the
 * extraction outputs, say — through the optional `raw` option.
 *
 * ## The two numbers this module refuses to invent
 *
 * 1. **A missing cost is `not recorded`, never `0`.** S0's ingestion genuinely costs zero model tokens, and that
 *    zero is the ladder's headline claim. Printing `0` for a cost the harness never reported would manufacture
 *    that claim for every rung, and it would be indistinguishable from the true one.
 * 2. **A single seed has no standard deviation.** With one seed this prints `(1 seed)` and not `± 0.000`. A
 *    `± 0.000` asserts that the run is perfectly repeatable, which is the opposite of what one seed measured.
 *
 * ## Where a difference is smaller than the noise
 *
 * `PROTOCOL.md` § Runs and variance: *"A difference smaller than the standard deviation is reported as **no
 * measured difference**, in those words."* Every place this file prints a difference goes through
 * {@link renderDifference}, so the rule has one implementation rather than one per table — which is the defect
 * `CLAUDE.md` names as the one this repo produces most.
 *
 * The spread a difference is judged against is `sqrt(sA² + sB²)`, the standard deviation OF THE DIFFERENCE.
 * The rejected alternative was `max(sA, sB)`; it is smaller, so it would call more differences real, and the
 * direction of that error is the one this whole protocol exists to avoid.
 *
 * ## Input shapes this module fixes, because the contract was silent
 *
 * ```
 * Row = {
 *   system,          // 'ythril' | 'no-memory' | 'full-context' | a competitor id      REQUIRED
 *   rung,            // 's0' | 's0+' | 's4' … — absent for systems that do not ingest
 *   method,          // a RETRIEVAL_METHODS id — absent for systems that do not retrieve
 *   cell,            // a gridCells() id; ABSENT means the shipped defaults
 *   label,           // optional display name; defaults to the derived key
 *   seed,            // REQUIRED — variance is measured across seeds and nothing else
 *   conversationId,  // REQUIRED       questionId,  // REQUIRED — the join key across systems
 *   category,        // REQUIRED — every category is reported, including the ones we lose
 *   question, gold,
 *   prediction,      // REQUIRED KEY (may be ''), the raw model output
 *   lexical:  { f1, precision, recall },                 // REQUIRED — the free metric grades everything
 *   judge:    { correct, reason },                       // optional — grid cells are not judged
 *   retrieval:{ records, tokens, ms },                   // optional — absent = no retrieval step
 *   answer:   { tokens: { in, out }, ms, usd },          // optional
 *   contaminated,    // optional boolean; unions INTO the excluded set, never out of it
 * }
 *
 * costs = {
 *   ingest: { '<system>/<rung>': { tokensPerConversation, modelCalls,
 *                                  wallClockMsPerConversation, storedBytesPerConversation } },
 *   …anything else, echoed verbatim into costs.json
 * }
 * ```
 *
 * `costs.ingest` is keyed by `system/rung` and NOT by the full system key, because ingestion happens once per
 * conversation per rung and is shared by every retrieval method and grid cell scored on top of it. Keying it by
 * the full system key would make the harness write the same number fourteen times, and fourteen copies of one
 * fact is fourteen chances for one of them to be wrong.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';

/** The exact words `PROTOCOL.md` requires. Exported so a gate can assert on the string rather than on a rendering. */
export const NO_MEASURED_DIFFERENCE = 'no measured difference';

/** Said wherever a spread is needed and one seed is all there is. Never rendered as `± 0`. */
const NO_SPREAD = 'single seed — run-to-run spread not measured';

/** Said wherever a cost was not reported. Distinct from a reported zero, which is a real and load-bearing value. */
const NOT_RECORDED = 'not recorded';

/**
 * The ladder's order, for the rung tables. Rungs the harness invents are appended in first-appearance order
 * rather than dropped — an unknown rung silently sorted last would be indistinguishable from one that was
 * never run.
 */
const RUNG_ORDER = ['s0', 's0+', 's1', 's2', 's3', 's4'];

const refuse = msg => { throw new Error(`report.mjs: ${msg}`); };

const isObject = v => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = v => typeof v === 'number' && Number.isFinite(v);

/**
 * The run directory's name.
 *
 * Exported so `run.mjs` can name the directory without a second copy of the rule. Two implementations of one
 * naming convention is how a resumed run writes half its files beside the other half.
 */
export function runDirName({ date, commit }) {
  return `${date}-${commit}`;
}

// ── validation ──────────────────────────────────────────────────────────────
// Everything below refuses rather than coerces. A silently-defaulted parameter in a results writer does not
// produce a wrong file; it produces a plausible one, which is worse.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A short or full sha, optionally `-dirty`. The suffix is not cosmetic: the summary says so in words. */
const COMMIT_RE = /^[0-9a-f]{7,40}(-dirty)?$/;
/** Stream names become path segments, so they are restricted rather than sanitised. */
const STREAM_RE = /^[a-z0-9][a-z0-9-]*$/;

function validateHeader({ tier, date, commit }) {
  if (!Number.isInteger(tier) || tier < 0) {
    refuse(`tier must be a non-negative integer, got ${JSON.stringify(tier)}. `
      + 'PROTOCOL.md defines 0, 1 and 2; a higher one is accepted because an amendment may add it, but an '
      + 'unlabelled result is refused because a tier is what stops a floor number being quoted as a complete one.');
  }
  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    refuse(`date must be YYYY-MM-DD, got ${JSON.stringify(date)}. It is half the directory name and half the `
      + 'published identity of the run, so it is a parameter and not something this module invents.');
  }
  if (typeof commit !== 'string' || !COMMIT_RE.test(commit)) {
    refuse(`commit must be a hex sha of 7-40 characters, optionally suffixed '-dirty', got ${JSON.stringify(commit)}.`);
  }
}

/**
 * @returns the join key for a question across systems.
 *
 * Scoped by conversation because `CONTRACTS.md`'s `Question` has no id of its own — the harness assigns one, and
 * an id assigned per conversation is the likely shape. Scoping costs nothing if the ids are already global.
 */
const questionKeyOf = row => `${row.conversationId}#${row.questionId}`;

/** The identity of one scored configuration. `-` marks an axis the system does not have, so keys stay alignable. */
const systemKeyOf = row =>
  [row.system, row.rung ?? '-', row.method ?? '-', row.cell ?? '-'].map(p => String(p)).join('/');

/** Ingestion is per conversation per rung, shared by every method and cell scored on top of it. */
const ingestKeyOf = row => `${row.system}/${row.rung ?? '-'}`;

function validateRows(rows, { tier, commit }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    refuse('rows must be a non-empty array. An empty results directory published under a commit reads as '
      + '"we ran it and this is what happened", so it is refused rather than written.');
  }
  rows.forEach((row, i) => {
    const at = `rows[${i}]`;
    if (!isObject(row)) refuse(`${at} is not an object`);
    for (const key of ['system', 'conversationId', 'questionId', 'category']) {
      const v = row[key];
      if (v === undefined || v === null || v === '') {
        refuse(`${at} has no ${key}. ${key === 'questionId'
          ? 'Without it the contamination-excluded score cannot be computed at all, because excluding a question '
            + 'from every system requires a key that joins the systems. Assign one in run.mjs; CONTRACTS.md\'s '
            + 'Question carries none.'
          : 'It is required to group the results, and a row that cannot be grouped would be silently dropped.'}`);
      }
    }
    if (row.seed === undefined || row.seed === null) {
      refuse(`${at} has no seed. Variance is measured across seeds and across nothing else, so an unlabelled `
        + 'row would be pooled into whichever seed happened to be first and inflate or deflate its spread.');
    }
    if (!('prediction' in row)) {
      refuse(`${at} has no 'prediction' key. The raw model output is the drill-down; a row without it is a score `
        + 'nobody can check. An empty string is accepted — a model that answered with nothing is a real result.');
    }
    if (!isObject(row.lexical) || !isFiniteNumber(row.lexical.f1)) {
      refuse(`${at} has no numeric lexical.f1. PROTOCOL.md requires two metrics side by side and the lexical one `
        + 'is free and deterministic, so it grades every row — a row without it cannot appear in either table.');
    }
    if (row.judge !== undefined && row.judge !== null) {
      if (!isObject(row.judge) || typeof row.judge.correct !== 'boolean') {
        refuse(`${at}.judge must be {correct: boolean, reason}. A missing verdict is expressed by omitting judge `
          + 'entirely; a truthy non-boolean would grade as correct on the strength of being a string.');
      }
    }
    if (row.retrieval !== undefined && row.retrieval !== null) {
      if (!isObject(row.retrieval) || !isFiniteNumber(row.retrieval.tokens) || !isFiniteNumber(row.retrieval.ms)) {
        refuse(`${at}.retrieval must be {records, tokens, ms} with numeric tokens and ms — those two are the cost `
          + 'and latency columns. Omit retrieval entirely for a system with no retrieval step.');
      }
    }
    // A row carrying its own tier or commit means two sources for one fact. The file's own is authoritative, so
    // a disagreement is refused rather than overwritten: overwriting would hide that the harness thought otherwise.
    if (row.tier !== undefined && row.tier !== tier) refuse(`${at}.tier is ${row.tier} but the run is tier ${tier}`);
    if (row.commit !== undefined && row.commit !== commit) refuse(`${at}.commit is ${row.commit} but the run is at ${commit}`);
  });
}

// ── statistics ──────────────────────────────────────────────────────────────

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Sample standard deviation, `n-1`.
 *
 * The population form (`n`) was rejected: the three seeds are a sample of the runs we could have done, not the
 * population of them, and `n` under-states the spread — which would let differences through the
 * "no measured difference" filter that the protocol means to catch.
 */
function sampleStd(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

const compareSeeds = (a, b) =>
  (typeof a === 'number' && typeof b === 'number') ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;

/**
 * Mean over seeds of the per-seed mean, plus the spread across seeds.
 *
 * Mean-of-means rather than a pooled mean over all rows: seeds are the unit of repetition, and a seed that
 * happened to score more questions would otherwise weigh more than the others in a number whose whole purpose is
 * to describe run-to-run behaviour.
 *
 * `std` is `null` — never `0` — when there is one seed. See the header.
 */
function statOver(rows, valueOf) {
  const bySeed = new Map();
  for (const row of rows) {
    const v = valueOf(row);
    if (v === null || v === undefined) continue;
    if (!bySeed.has(row.seed)) bySeed.set(row.seed, []);
    bySeed.get(row.seed).push(v);
  }
  const seeds = [...bySeed.keys()].sort(compareSeeds);
  if (seeds.length === 0) return null;
  const perSeed = seeds.map(seed => ({ seed, value: mean(bySeed.get(seed)), n: bySeed.get(seed).length }));
  const values = perSeed.map(p => p.value);
  return {
    mean: mean(values),
    std: sampleStd(values),
    seeds: seeds.length,
    n: perSeed.reduce((a, p) => a + p.n, 0),
    perSeed,
  };
}

/**
 * Nearest-rank percentile on the sorted sample: `sorted[ceil(q·n) - 1]`.
 *
 * No interpolation, so the value printed is a latency that was actually observed. An interpolated p95 is a
 * number no request ever took, which is a strange thing to put in a column headed "what a user waits".
 */
function percentile(sortedAscending, q) {
  if (sortedAscending.length === 0) return null;
  const rank = Math.min(sortedAscending.length, Math.max(1, Math.ceil(q * sortedAscending.length)));
  return sortedAscending[rank - 1];
}

const lexicalValue = row => row.lexical.f1;
const judgeValue = row => (row.judge ? (row.judge.correct ? 1 : 0) : null);

/**
 * The difference between two measurements, and whether it survives the noise.
 *
 * The single implementation of the protocol's rule. Everything that prints a difference calls this and then
 * {@link renderDifference}; nothing formats a delta by hand.
 */
function difference(a, b) {
  if (!a || !b) return { diff: null, testable: false, reason: 'one side has no measurement' };
  const diff = a.mean - b.mean;
  if (a.std === null || b.std === null) return { diff, testable: false, reason: NO_SPREAD };
  const spread = Math.sqrt(a.std ** 2 + b.std ** 2);
  return { diff, spread, testable: true, noMeasuredDifference: Math.abs(diff) < spread };
}

// ── formatting ──────────────────────────────────────────────────────────────

const fmt3 = n => (n === null || n === undefined ? NOT_RECORDED : n.toFixed(3));
const signed3 = n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(3)}`;

/** Thousands separators without ICU, so the output is byte-identical wherever it runs. */
function groupDigits(n) {
  if (n === null || n === undefined) return NOT_RECORDED;
  const rounded = Math.round(n);
  const s = String(Math.abs(rounded));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (rounded < 0 ? '−' : '') + grouped;
}

/** Pipes and newlines would silently reshape a markdown table, so a cell's text is neutralised, not trusted. */
const cell = v => String(v === null || v === undefined ? '' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** `0.412 ± 0.021 (3 seeds)`, or `0.412 (1 seed)`. Never `± 0.000`. */
function renderStat(stat) {
  if (!stat) return NOT_RECORDED;
  const seeds = `${stat.seeds} seed${stat.seeds === 1 ? '' : 's'}`;
  return stat.std === null ? `${fmt3(stat.mean)} (${seeds})` : `${fmt3(stat.mean)} ± ${fmt3(stat.std)} (${seeds})`;
}

/** The one place the protocol's phrase is produced. */
function renderDifference(d) {
  if (d.diff === null) return NOT_RECORDED;
  if (!d.testable) return `${signed3(d.diff)} — ${d.reason}`;
  if (d.noMeasuredDifference) return NO_MEASURED_DIFFERENCE;
  return `${signed3(d.diff)} ± ${fmt3(d.spread)}`;
}

function mdTable(headers, rows) {
  const out = [`| ${headers.map(cell).join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`];
  for (const r of rows) out.push(`| ${r.map(cell).join(' | ')} |`);
  return out.join('\n');
}

// ── aggregation ─────────────────────────────────────────────────────────────

/**
 * Everything the tables are drawn from, as data. Pure — no I/O — so a gate can assert on the numbers without
 * writing a directory, and so `summaryMarkdown` has nothing to compute for itself. A renderer that also
 * aggregates is a second implementation of the statistics, and the two drift apart on the first bug fix.
 */
export function aggregate({ tier, date, commit, rows, costs = {}, cacheStats, contaminationProbeSystem = null }) {
  const ingestCosts = isObject(costs.ingest) ? costs.ingest : null;

  // Contamination: PROTOCOL.md Control 3 — the no-context probe IS the no-memory floor's run, so the excluded
  // set is derived from the named system's judge verdicts. `row.contaminated` UNIONS into the set and never out
  // of it: exclusion only ever makes the published score lower, so a conservative merge cannot flatter anyone.
  const contaminatedQuestions = new Set();
  let probeRows = 0;
  let probeJudged = 0;
  for (const row of rows) {
    if (row.contaminated === true) contaminatedQuestions.add(questionKeyOf(row));
    if (contaminationProbeSystem !== null && row.system === contaminationProbeSystem) {
      probeRows++;
      if (row.judge) {
        probeJudged++;
        if (row.judge.correct) contaminatedQuestions.add(questionKeyOf(row));
      }
    }
  }
  const contamination = {
    probeSystem: contaminationProbeSystem,
    probeRows,
    probeRowsJudged: probeJudged,
    excludedQuestions: contaminatedQuestions.size,
    computed:
      contaminationProbeSystem === null
        ? false
        : probeRows > 0 && probeJudged > 0,
    reason:
      contaminationProbeSystem === null
        ? 'no contaminationProbeSystem was named, so the no-context probe could not be identified among the rows'
        : probeRows === 0
          ? `no rows carry system '${contaminationProbeSystem}' — the probe did not run, or it ran under another id`
          : probeJudged === 0
            ? 'the probe rows carry no judge verdicts, and "the answerer got it right with no context" is a '
              + 'judge question; grading it lexically would set a correctness threshold this protocol never fixed'
            : null,
  };

  const notContaminated = row => !contaminatedQuestions.has(questionKeyOf(row));

  // Systems keep FIRST-APPEARANCE order. Sorting by score was rejected: a table that reorders itself by result
  // is already arguing, and the protocol's whole posture is that the losing rows stay where they are.
  const order = [];
  const byKey = new Map();
  for (const row of rows) {
    const key = systemKeyOf(row);
    if (!byKey.has(key)) { byKey.set(key, []); order.push(key); }
    byKey.get(key).push(row);
  }

  const categories = [...new Set(rows.map(r => String(r.category)))].sort();
  const conversations = [...new Set(rows.map(r => String(r.conversationId)))].sort();
  const seeds = [...new Set(rows.map(r => r.seed))].sort(compareSeeds);
  const questions = new Set(rows.map(questionKeyOf));

  const systems = order.map(key => {
    const own = byKey.get(key);
    const head = own[0];

    const withRetrieval = own.filter(r => isObject(r.retrieval));
    const retrievalMs = withRetrieval.map(r => r.retrieval.ms).sort((a, b) => a - b);
    const answerMs = own.filter(r => isObject(r.answer) && isFiniteNumber(r.answer.ms))
      .map(r => r.answer.ms).sort((a, b) => a - b);

    const lexical = statOver(own, lexicalValue);
    const judge = statOver(own, judgeValue);
    const retrievalTokensPerQuestion = withRetrieval.length
      ? mean(withRetrieval.map(r => r.retrieval.tokens))
      : null;

    const ingest = ingestCosts ? ingestCosts[ingestKeyOf(head)] ?? null : null;

    return {
      key,
      label: head.label ?? key,
      system: head.system,
      rung: head.rung ?? null,
      method: head.method ?? null,
      cell: head.cell ?? null,
      shippedDefaults: head.cell === undefined || head.cell === null,
      rowCount: own.length,
      questions: new Set(own.map(questionKeyOf)).size,
      lexical,
      judge,
      lexicalExcludingContamination: contamination.computed ? statOver(own.filter(notContaminated), lexicalValue) : null,
      judgeExcludingContamination: contamination.computed ? statOver(own.filter(notContaminated), judgeValue) : null,
      byCategory: Object.fromEntries(categories.map(c => {
        const inCat = own.filter(r => String(r.category) === c);
        return [c, { n: inCat.length, lexical: statOver(inCat, lexicalValue), judge: statOver(inCat, judgeValue) }];
      })),
      byConversation: Object.fromEntries(conversations.map(c => {
        const inConv = own.filter(r => String(r.conversationId) === c);
        return [c, { n: inConv.length, lexical: statOver(inConv, lexicalValue), judge: statOver(inConv, judgeValue) }];
      })),
      retrieval: {
        // `covered` is published beside the mean because a system whose rows only sometimes carry a retrieval
        // step has a cost column measured on a subset, and a mean that hides which subset is not checkable.
        covered: withRetrieval.length,
        total: own.length,
        tokensPerQuestion: retrievalTokensPerQuestion,
        recordsPerQuestion: withRetrieval.length && withRetrieval.every(r => isFiniteNumber(r.retrieval.records))
          ? mean(withRetrieval.map(r => r.retrieval.records))
          : null,
        p50Ms: percentile(retrievalMs, 0.50),
        p95Ms: percentile(retrievalMs, 0.95),
      },
      answer: {
        covered: answerMs.length,
        p50Ms: percentile(answerMs, 0.50),
        p95Ms: percentile(answerMs, 0.95),
      },
      ingest: ingest ?? null,
      // The derived column PROTOCOL.md calls "the number that actually differentiates a memory system". Null,
      // not Infinity, when a system spends no retrieval tokens: dividing by zero would rank the no-memory floor
      // first on efficiency, which is true and useless.
      lexicalPer1kRetrievalTokens:
        lexical && isFiniteNumber(retrievalTokensPerQuestion) && retrievalTokensPerQuestion > 0
          ? lexical.mean / (retrievalTokensPerQuestion / 1000)
          : null,
    };
  });

  // The rung table is drawn from SHIPPED-DEFAULT rows only. Pooling grid cells into a rung's headline would let
  // the sweep's spread leak into the product number, and the sweep is deliberately a sweep of bad settings too.
  const defaultRows = rows.filter(r => r.cell === undefined || r.cell === null);
  const rungKeys = [];
  const rungRows = new Map();
  for (const row of defaultRows) {
    if (row.rung === undefined || row.rung === null) continue;
    const rung = String(row.rung);
    if (!rungRows.has(rung)) { rungRows.set(rung, []); rungKeys.push(rung); }
    rungRows.get(rung).push(row);
  }
  const rungOrder = [...rungKeys].sort((a, b) => {
    const ia = RUNG_ORDER.indexOf(a.toLowerCase());
    const ib = RUNG_ORDER.indexOf(b.toLowerCase());
    if (ia === -1 && ib === -1) return rungKeys.indexOf(a) - rungKeys.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const rungs = rungOrder.map(rung => {
    const own = rungRows.get(rung);
    const head = own[0];
    const withRetrieval = own.filter(r => isObject(r.retrieval));
    const ms = withRetrieval.map(r => r.retrieval.ms).sort((a, b) => a - b);
    return {
      rung,
      systems: [...new Set(own.map(r => r.system))],
      rowCount: own.length,
      lexical: statOver(own, lexicalValue),
      judge: statOver(own, judgeValue),
      byCategory: Object.fromEntries(categories.map(c => {
        const inCat = own.filter(r => String(r.category) === c);
        return [c, { n: inCat.length, lexical: statOver(inCat, lexicalValue), judge: statOver(inCat, judgeValue) }];
      })),
      retrievalTokensPerQuestion: withRetrieval.length ? mean(withRetrieval.map(r => r.retrieval.tokens)) : null,
      p50Ms: percentile(ms, 0.50),
      p95Ms: percentile(ms, 0.95),
      ingest: ingestCosts ? ingestCosts[ingestKeyOf(head)] ?? null : null,
    };
  });

  // The ladder: consecutive rungs. PROTOCOL.md predicts WHERE each step should show up — S2→S3 in multi-hop,
  // S3→S4 in temporal — so the per-category delta is carried, not just the total.
  const ladder = [];
  for (let i = 1; i < rungs.length; i++) {
    const from = rungs[i - 1];
    const to = rungs[i];
    ladder.push({
      from: from.rung,
      to: to.rung,
      lexical: difference(to.lexical, from.lexical),
      judge: difference(to.judge, from.judge),
      byCategory: Object.fromEntries(categories.map(c =>
        [c, difference(to.byCategory[c].lexical, from.byCategory[c].lexical)])),
    });
  }

  // "vs best" is measured against the best LEXICAL mean, because the lexical metric grades every row while the
  // judge grades only some — a best-of ranked on a metric half the rows lack would compare different question sets.
  const bestLexical = systems.reduce((best, s) =>
    (s.lexical && (!best || s.lexical.mean > best.lexical.mean) ? s : best), null);
  for (const s of systems) {
    s.vsBestLexical = bestLexical ? difference(s.lexical, bestLexical.lexical) : { diff: null, testable: false, reason: 'no measurement' };
    s.vsBestJudge = bestLexical ? difference(s.judge, bestLexical.judge) : { diff: null, testable: false, reason: 'no measurement' };
  }

  const hits = cacheStats && isFiniteNumber(cacheStats.hits) ? cacheStats.hits : null;
  const misses = cacheStats && isFiniteNumber(cacheStats.misses) ? cacheStats.misses : null;
  const lookups = hits === null || misses === null ? null : hits + misses;

  return {
    tier,
    date,
    commit,
    dirtyTree: commit.endsWith('-dirty'),
    counts: {
      rows: rows.length,
      questions: questions.size,
      conversations: conversations.length,
      categories: categories.length,
      systems: systems.length,
      seeds: seeds.length,
    },
    seeds,
    categories,
    conversations,
    questionsByCategory: Object.fromEntries(categories.map(c =>
      [c, new Set(rows.filter(r => String(r.category) === c).map(questionKeyOf)).size])),
    systems,
    rungs,
    ladder,
    bestLexicalKey: bestLexical ? bestLexical.key : null,
    contamination,
    cache: {
      hits,
      misses,
      lookups,
      // A hit rate over zero lookups is not 0 %, it is nothing. Printing 0 % would report a cache that missed
      // everything, which is the opposite of a cache that was never asked.
      hitRate: lookups && lookups > 0 ? hits / lookups : null,
    },
  };
}

// ── the human-readable summary ──────────────────────────────────────────────

const RETRIEVAL_NA = 'n/a (no retrieval step)';

function retrievalTokensCell(r) {
  if (r.covered === 0) return RETRIEVAL_NA;
  const suffix = r.covered < r.total ? ` (of ${r.covered}/${r.total} rows)` : '';
  return groupDigits(r.tokensPerQuestion) + suffix;
}

const msCell = v => (v === null ? RETRIEVAL_NA : `${groupDigits(v)} ms`);
const ingestCell = (ingest, field) =>
  (ingest && isFiniteNumber(ingest[field]) ? groupDigits(ingest[field]) : NOT_RECORDED);

/**
 * The summary a person reads. Pure: it renders {@link aggregate}'s output and computes nothing of its own, so
 * the tables and `scores.json` cannot disagree.
 */
export function summaryMarkdown(report, { pins = {}, configs = {}, costs = {}, files = [] } = {}) {
  const out = [];
  const p = s => out.push(s);

  p(`# Benchmark results — Tier ${report.tier}`);
  p('');
  p(`> **Tier ${report.tier}**, commit \`${report.commit}\`, ${report.date}. A tier is a SCOPE, not a quality`
    + ' grade, and it is on this page and on every line of every file beside it so that a number from this run can'
    + ' never be quoted as though it came from a wider one. The method was pre-registered in'
    + ' [`../../PROTOCOL.md`](../../PROTOCOL.md) before any of it ran.');
  if (report.dirtyTree) {
    p('>');
    p('> **The working tree was NOT clean when this ran.** The commit above does not fully describe the code that'
      + ' produced these numbers, so this run is not reproducible from the commit alone and must not be published'
      + ' as though it were.');
  }
  p('');

  // ── the run ───────────────────────────────────────────────────────────────
  p('## The run');
  p('');
  p(mdTable(['', ''], [
    ['tier', String(report.tier)],
    ['date', report.date],
    ['commit', `\`${report.commit}\``],
    ['working tree', report.dirtyTree ? '**not clean**' : 'clean'],
    ['seeds', `${report.seeds.map(String).join(', ')} (${report.counts.seeds})`],
    ['questions scored', `${report.counts.questions} across ${report.counts.conversations} conversation(s)`],
    ['scored configurations', String(report.counts.systems)],
    ['rows', String(report.counts.rows)],
  ]));
  p('');
  if (report.counts.seeds < 2) {
    p('**One seed. The run-to-run spread was not measured**, so no difference on this page has been shown to'
      + ' survive it. `PROTOCOL.md` labels a single-seed run exploratory until Tier 1, and every figure below reads'
      + ' `(1 seed)` rather than `± 0.000` — a zero there would assert perfect repeatability, which one run cannot'
      + ' show.');
    p('');
  } else {
    p(`Every figure is the mean of the per-seed means over ${report.counts.seeds} seeds, ± the sample standard`
      + ' deviation across them. **Where a difference is smaller than the spread of the difference (`sqrt(sA² +'
      + ` sB²)\`), this page prints "${NO_MEASURED_DIFFERENCE}" instead of the number.**`);
    p('');
  }

  p('### Questions per category');
  p('');
  p(mdTable(['category', 'distinct questions'],
    report.categories.map(c => [c, String(report.questionsByCategory[c])])));
  p('');
  p('Every category is here, including any this run loses. That is a rule in `PROTOCOL.md`, not an aspiration —'
    + ' the first reader to notice a missing category is the competitor whose number it hid.');
  p('');

  // ── pins ──────────────────────────────────────────────────────────────────
  const datasets = isObject(pins.datasets) ? pins.datasets : null;
  if (datasets) {
    p('### Datasets, as pinned');
    p('');
    p(mdTable(['dataset', 'sha256', 'bytes', 'licence'], Object.entries(datasets).map(([name, d]) => [
      name,
      d && d.sha256 ? `\`${d.sha256}\`` : 'NOT PINNED',
      d && isFiniteNumber(d.bytes) ? groupDigits(d.bytes) : NOT_RECORDED,
      d && d.licence ? d.licence : 'NOT RECORDED',
    ])));
    p('');
    p('The full pin, including the observed counts, is in `manifest.json`.');
    p('');
  }

  const configNames = Object.keys(configs);
  if (configNames.length) {
    p('### Configurations under test');
    p('');
    p(`Committed verbatim in \`manifest.json\` → \`configs\`: ${configNames.map(n => `\`${n}\``).join(', ')}.`);
    p('A knob that is not in that object was not pinned, and a number produced by an unpinned knob is not'
      + ' reproducible.');
    p('');
  }

  // ── accuracy per method ───────────────────────────────────────────────────
  p('## Accuracy per method, with cost and latency in the same table');
  p('');
  p('Accuracy alone flatters whichever system is allowed to spend the most, so the columns are not separable.'
    + ' One row per scored configuration — every grid cell, not the best one.');
  p('');
  p(mdTable(
    ['configuration', 'lexical F1', 'judge', 'lexical, contamination-excluded', 'ingest tokens/conv',
      'retrieval tokens/q', 'p50', 'p95', 'stored bytes/conv', 'F1 per 1k retrieval tokens', 'vs best (lexical)'],
    report.systems.map(s => [
      s.key === report.bestLexicalKey ? `**${s.label}**` : s.label,
      renderStat(s.lexical),
      renderStat(s.judge),
      report.contamination.computed ? renderStat(s.lexicalExcludingContamination) : 'not computed',
      ingestCell(s.ingest, 'tokensPerConversation'),
      retrievalTokensCell(s.retrieval),
      msCell(s.retrieval.p50Ms),
      msCell(s.retrieval.p95Ms),
      ingestCell(s.ingest, 'storedBytesPerConversation'),
      s.lexicalPer1kRetrievalTokens === null ? RETRIEVAL_NA : fmt3(s.lexicalPer1kRetrievalTokens),
      s.key === report.bestLexicalKey ? '—' : renderDifference(s.vsBestLexical),
    ]),
  ));
  p('');
  p(`An ingest cost reading "${NOT_RECORDED}" was not reported by the harness. **It is not a zero** — S0's`
    + ' ingestion genuinely costs no model tokens, and that zero is the ladder\'s headline claim, so it is never'
    + ' printed unless it was measured.');
  p('');

  // ── accuracy per category ─────────────────────────────────────────────────
  p('## Accuracy per category');
  p('');
  p('Lexical F1. The judge\'s per-category figures are in `per-category.json`, which also carries every'
    + ' per-seed value.');
  p('');
  p(mdTable(['configuration', ...report.categories],
    report.systems.map(s => [s.label, ...report.categories.map(c => renderStat(s.byCategory[c].lexical))])));
  p('');
  if (report.systems.length > 1) {
    p('### The closest call in each category');
    p('');
    p('The top two configurations, and whether the gap between them is a finding or a coin.');
    p('');
    p(mdTable(['category', 'first', 'second', 'gap'], report.categories.map(c => {
      const ranked = report.systems
        .filter(s => s.byCategory[c].lexical)
        .sort((a, b) => b.byCategory[c].lexical.mean - a.byCategory[c].lexical.mean);
      if (ranked.length < 2) return [c, ranked[0] ? ranked[0].label : NOT_RECORDED, '—', NOT_RECORDED];
      const d = difference(ranked[0].byCategory[c].lexical, ranked[1].byCategory[c].lexical);
      return [c, ranked[0].label, ranked[1].label, renderDifference(d)];
    })));
    p('');
  }

  // ── ingestion rungs ───────────────────────────────────────────────────────
  p('## Accuracy per ingestion rung');
  p('');
  if (!report.rungs.length) {
    p('No rung table: no shipped-default rows carry a `rung`. The rung table is drawn from rows with no grid'
      + ' `cell`, because pooling sweep cells into a rung\'s headline would let the sweep\'s deliberately bad'
      + ' settings move the product number.');
    p('');
  } else {
    p('Shipped-default rows only — a rung\'s number must not carry the sweep\'s deliberately bad cells.');
    p('');
    p(mdTable(
      ['rung', 'lexical F1', 'judge', 'ingest tokens/conv', 'ingest model calls', 'ingest wall clock/conv',
        'stored bytes/conv', 'retrieval tokens/q', 'p50', 'p95'],
      report.rungs.map(r => [
        r.rung,
        renderStat(r.lexical),
        renderStat(r.judge),
        ingestCell(r.ingest, 'tokensPerConversation'),
        ingestCell(r.ingest, 'modelCalls'),
        r.ingest && isFiniteNumber(r.ingest.wallClockMsPerConversation)
          ? `${groupDigits(r.ingest.wallClockMsPerConversation)} ms` : NOT_RECORDED,
        ingestCell(r.ingest, 'storedBytesPerConversation'),
        r.retrievalTokensPerQuestion === null ? RETRIEVAL_NA : groupDigits(r.retrievalTokensPerQuestion),
        msCell(r.p50Ms),
        msCell(r.p95Ms),
      ]),
    ));
    p('');
    if (report.ladder.length) {
      p('### Rung to rung — the comparison the ladder exists for');
      p('');
      p(mdTable(['step', 'Δ lexical F1', 'Δ judge'], report.ladder.map(l =>
        [`${l.from} → ${l.to}`, renderDifference(l.lexical), renderDifference(l.judge)])));
      p('');
      p('### Rung to rung, by category');
      p('');
      p('`PROTOCOL.md` predicts where each step should land: **facts → graph should move multi-hop**, and'
        + ' **graph → chrono should move temporal**. If they do not, the graph is not paying for itself on this'
        + ' workload, and that is published as a finding rather than smoothed into the total.');
      p('');
      p(mdTable(['step', ...report.categories], report.ladder.map(l =>
        [`${l.from} → ${l.to}`, ...report.categories.map(c => renderDifference(l.byCategory[c]))])));
      p('');
    }
  }

  // ── per conversation ──────────────────────────────────────────────────────
  p('## Per-conversation breakdown');
  p('');
  p('Published so a reader can see whether a lead comes from every conversation or from one. Lexical F1.');
  p('');
  const shown = report.systems.filter(s => s.shippedDefaults);
  const matrixSystems = shown.length && shown.length < report.systems.length ? shown : report.systems;
  const hidden = report.systems.length - matrixSystems.length;
  if (hidden > 0) {
    p(`Shipped-default configurations only — the remaining ${hidden} grid cell${hidden === 1 ? ' is' : 's are'}`
      + ' in `per-conversation.json`, complete, rather than in a table too wide to read.');
    p('');
  }
  p(mdTable(['conversation', ...matrixSystems.map(s => s.label)],
    report.conversations.map(c => [c, ...matrixSystems.map(s => renderStat(s.byConversation[c].lexical))])));
  p('');

  // ── contamination ─────────────────────────────────────────────────────────
  p('## Contamination');
  p('');
  p('LoCoMo has been public since 2024 and its dialogues are model-generated, so part of any score is the'
    + ' answerer recognising the text rather than retrieving it. Control 3 asks every question with **no'
    + ' conversation and no retrieval**; anything answered correctly is removed from the second score.');
  p('');
  if (report.contamination.computed) {
    p(mdTable(['', ''], [
      ['probe system', `\`${report.contamination.probeSystem}\``],
      ['probe rows', String(report.contamination.probeRows)],
      ['probe rows judged', String(report.contamination.probeRowsJudged)],
      ['questions excluded', `${report.contamination.excludedQuestions} of ${report.counts.questions}`],
    ]));
    p('');
    p('The contamination-excluded column in the method table above will be lower. Publishing it is the point: it'
      + ' is the check nobody else runs, and being the party that reports the deflated number is worth more than'
      + ' the points it costs.');
  } else {
    p(`**Not computed.** ${report.contamination.reason}.`);
    p('');
    p('`PROTOCOL.md` requires the contamination-excluded score to be published beside the headline, so this run'
      + ' is incomplete against its own protocol on that point, and says so here rather than omitting the'
      + ' section.');
  }
  p('');

  // ── cost ──────────────────────────────────────────────────────────────────
  p('## Cost of the run');
  p('');
  const costLines = [];
  if (isFiniteNumber(costs.usdTotal)) costLines.push(['spend, USD', costs.usdTotal.toFixed(4)]);
  if (isFiniteNumber(costs.modelCalls)) costLines.push(['model calls', groupDigits(costs.modelCalls)]);
  if (isFiniteNumber(costs.tokensIn)) costLines.push(['tokens in', groupDigits(costs.tokensIn)]);
  if (isFiniteNumber(costs.tokensOut)) costLines.push(['tokens out', groupDigits(costs.tokensOut)]);
  if (costLines.length) {
    p(mdTable(['', ''], costLines));
  } else {
    p(`Run totals: ${NOT_RECORDED}. \`costs.json\` holds whatever the harness did report, verbatim.`);
  }
  p('');

  // ── cache ─────────────────────────────────────────────────────────────────
  p('## Cache');
  p('');
  p(mdTable(['', ''], [
    ['hits', report.cache.hits === null ? NOT_RECORDED : groupDigits(report.cache.hits)],
    ['misses', report.cache.misses === null ? NOT_RECORDED : groupDigits(report.cache.misses)],
    ['lookups', report.cache.lookups === null ? NOT_RECORDED : groupDigits(report.cache.lookups)],
    ['hit rate', report.cache.hitRate === null
      ? 'no lookups — not 0 %, which would report a cache that missed everything'
      : `${(report.cache.hitRate * 100).toFixed(1)} %`],
  ]));
  p('');
  p('A high hit rate on a re-run is the design working: extraction is per conversation and paid once, and a'
    + ' harness that re-extracts per seed turns the cheapest part of the run into the most expensive. The model'
    + ' id and every parameter are inside the cache key, so a hit cannot return another model\'s answer.');
  p('');

  // ── drill-down ────────────────────────────────────────────────────────────
  p('## Every raw output');
  p('');
  p('A results table nobody can drill into is a press release. Every prediction, every judge verdict and its'
    + ' reason is here, and each line carries its own tier and commit so a row quoted out of this directory'
    + ' still says where it came from.');
  p('');
  if (files.length) {
    p(mdTable(['file', 'bytes', 'sha256'],
      files.map(f => [`\`${f.file}\``, groupDigits(f.bytes), `\`${f.sha256.slice(0, 16)}…\``])));
    p('');
    p('The digests are of the files as written, so a reader can tell an edited results directory from an'
      + ' original one. `manifest.json` carries them in full, plus `summary.md`\'s. Two digests cannot exist:'
      + ' this page\'s own, because the table is part of what would be hashed, and `manifest.json`\'s, for the'
      + ' same reason one line further on.');
    p('');
  }

  // ── the limits ────────────────────────────────────────────────────────────
  p('## What this page does not say');
  p('');
  const limits = [];
  limits.push(`This is **Tier ${report.tier}**. Every scope outside that tier is absent, not zero, and a number`
    + ' here is not a Tier 2 number.');
  if (report.counts.seeds < 2) {
    limits.push('One seed: no difference on this page has been shown to exceed the run-to-run spread, because the'
      + ' spread was not measured.');
  }
  if (!report.contamination.computed) {
    limits.push('No contamination-excluded score, so part of every figure here may be recognition of a public'
      + ' dataset rather than retrieval.');
  }
  if (report.systems.every(s => !s.judge)) {
    limits.push('No judge verdicts: only the lexical metric ran, and it under-credits a correct answer worded'
      + ' differently. `PROTOCOL.md` requires both metrics side by side for a claim.');
  }
  if (report.systems.every(s => !s.ingest)) {
    limits.push('No ingestion costs were reported, so the write side of the exchange rate is missing and the'
      + ' accuracy figures are unpriced.');
  }
  if (report.dirtyTree) {
    limits.push('The working tree was not clean, so these numbers cannot be reproduced from the commit alone.');
  }
  for (const l of limits) p(`- ${l}`);
  p('');
  p(`Produced by \`benchmarks/harness/report.mjs\` at commit \`${report.commit}\` on ${report.date}, `
    + `**Tier ${report.tier}**.`);
  p('');

  return out.join('\n');
}

// ── writing ─────────────────────────────────────────────────────────────────

/** Every JSON file leads with the three facts that make it quotable on its own. */
const stamp = (report, body) => ({
  tier: report.tier,
  commit: report.commit,
  date: report.date,
  producedBy: 'benchmarks/harness/report.mjs',
  protocol: 'benchmarks/PROTOCOL.md',
  ...body,
});

async function emit(files, runDir, name, text) {
  const abs = join(runDir, name);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, text, 'utf8');
  files.push({
    file: name,
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
  });
  return abs;
}

const asJson = value => `${JSON.stringify(value, null, 2)}\n`;
const asJsonl = records => (records.length ? `${records.map(r => JSON.stringify(r)).join('\n')}\n` : '');

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

/**
 * Write a complete results directory.
 *
 * @param dir     the results ROOT, e.g. `benchmarks/results`. The run lands in `<dir>/<date>-<commit>/`. If
 *                `dir` is ALREADY that directory — its basename equals `<date>-<commit>` — it is used as-is
 *                rather than nested inside itself, so a caller that computed the path with {@link runDirName}
 *                and one that passed the root both land in the same place. That is idempotence, not a guess: no
 *                other basename is accepted as a run directory.
 * @param options `{ tier, pins, configs, rows, costs, cacheStats }` per CONTRACTS.md, plus the required `date`
 *                and `commit`, the optional `contaminationProbeSystem` (the id of the no-context probe's rows),
 *                the optional `raw` streams, and `overwrite` — which is required to replace a directory that
 *                already holds a manifest, because silently overwriting a published run destroys the thing the
 *                commit stamp was for.
 * @returns a description of what was written: the directory, every file with its byte count and sha256, and
 *          the aggregate's counts.
 */
export async function writeResults(dir, options) {
  if (typeof dir !== 'string' || dir.trim() === '') refuse('dir must be a non-empty path string');
  if (!isObject(options)) refuse('options must be an object');

  const {
    tier, date, commit, pins, configs, rows, costs, cacheStats,
    contaminationProbeSystem = null, raw = null, overwrite = false,
  } = options;

  validateHeader({ tier, date, commit });
  if (!isObject(pins)) refuse('pins is required and must be an object. Without the dataset pin — the url, the '
    + 'sha256 and the observed counts — a reader cannot tell which bytes produced these numbers.');
  if (!isObject(configs)) refuse('configs is required and must be an object. A number produced by an unpinned '
    + 'configuration is not reproducible, and PROTOCOL.md requires the configuration echoed into each result file.');
  if (!isObject(costs)) refuse('costs is required and must be an object. Accuracy without cost flatters whichever '
    + 'system was allowed to spend the most, which is the failure the cost columns exist to prevent.');
  if (!isObject(cacheStats) || !isFiniteNumber(cacheStats.hits) || !isFiniteNumber(cacheStats.misses)) {
    refuse('cacheStats must be {hits, misses} with both numeric, as cache.mjs returns them');
  }
  if (costs.ingest !== undefined && !isObject(costs.ingest)) {
    refuse("costs.ingest must be an object keyed '<system>/<rung>'");
  }
  validateRows(rows, { tier, commit });

  const rawStreams = raw === null ? {} : raw;
  if (!isObject(rawStreams)) refuse('raw must be an object of {streamName: Array}');
  for (const [name, records] of Object.entries(rawStreams)) {
    // The name becomes a path segment. Restricting the alphabet is refusal; stripping the bad characters would
    // be coercion, and it would let two different streams collapse onto one filename.
    if (!STREAM_RE.test(name)) refuse(`raw stream name ${JSON.stringify(name)} must match ${STREAM_RE}`);
    if (!Array.isArray(records)) refuse(`raw.${name} must be an array of records`);
  }

  const name = runDirName({ date, commit });
  const runDir = basename(dir) === name ? dir : join(dir, name);
  await mkdir(runDir, { recursive: true });
  if (!overwrite && await exists(join(runDir, 'manifest.json'))) {
    refuse(`${join(runDir, 'manifest.json')} already exists. A results directory is a published artefact and the `
      + 'commit stamp is what makes it citable, so it is not overwritten by accident. Pass overwrite: true to '
      + 'replace it deliberately.');
  }

  const report = aggregate({ tier, date, commit, rows, costs, cacheStats, contaminationProbeSystem });
  const files = [];

  // Every row, verbatim, with the two facts that survive a copy-paste out of this directory. Ours win over a
  // row's own tier/commit — validateRows already refused a disagreement, so this can only be filling them in.
  await emit(files, runDir, 'rows.jsonl', asJsonl(rows.map(r => ({ ...r, tier, commit }))));

  for (const [stream, records] of Object.entries(rawStreams)) {
    await emit(files, runDir, join('raw', `${stream}.jsonl`).replace(/\\/g, '/'),
      asJsonl(records.map(r => (isObject(r) ? { ...r, tier, commit } : { tier, commit, value: r }))));
  }

  await emit(files, runDir, 'scores.json', asJson(stamp(report, {
    counts: report.counts,
    seeds: report.seeds,
    categories: report.categories,
    questionsByCategory: report.questionsByCategory,
    bestLexicalKey: report.bestLexicalKey,
    systems: report.systems.map(s => ({
      key: s.key,
      label: s.label,
      system: s.system,
      rung: s.rung,
      method: s.method,
      cell: s.cell,
      shippedDefaults: s.shippedDefaults,
      rowCount: s.rowCount,
      questions: s.questions,
      lexical: s.lexical,
      judge: s.judge,
      lexicalExcludingContamination: s.lexicalExcludingContamination,
      judgeExcludingContamination: s.judgeExcludingContamination,
      retrieval: s.retrieval,
      answer: s.answer,
      ingest: s.ingest,
      lexicalPer1kRetrievalTokens: s.lexicalPer1kRetrievalTokens,
      vsBestLexical: { ...s.vsBestLexical, rendered: renderDifference(s.vsBestLexical) },
      vsBestJudge: { ...s.vsBestJudge, rendered: renderDifference(s.vsBestJudge) },
    })),
    rungs: report.rungs,
    // `rendered` is stored beside every difference so a consumer of the JSON gets the protocol's wording without
    // re-implementing the rule — the second implementation is where "no measured difference" would quietly stop
    // being printed.
    ladder: report.ladder.map(l => ({
      ...l,
      lexical: { ...l.lexical, rendered: renderDifference(l.lexical) },
      judge: { ...l.judge, rendered: renderDifference(l.judge) },
      byCategory: Object.fromEntries(Object.entries(l.byCategory).map(([c, d]) =>
        [c, { ...d, rendered: renderDifference(d) }])),
    })),
    contamination: report.contamination,
  })));

  await emit(files, runDir, 'per-category.json', asJson(stamp(report, {
    note: 'Every category, including any this run loses — PROTOCOL.md § If we lose.',
    categories: report.categories,
    questionsByCategory: report.questionsByCategory,
    systems: report.systems.map(s => ({ key: s.key, label: s.label, byCategory: s.byCategory })),
    rungs: report.rungs.map(r => ({ rung: r.rung, byCategory: r.byCategory })),
  })));

  await emit(files, runDir, 'per-conversation.json', asJson(stamp(report, {
    note: 'Published so a reader can see whether a lead comes from every conversation or from one.',
    conversations: report.conversations,
    systems: report.systems.map(s => ({ key: s.key, label: s.label, byConversation: s.byConversation })),
  })));

  await emit(files, runDir, 'costs.json', asJson(stamp(report, {
    note: 'The harness\'s cost report, verbatim, plus the per-configuration columns derived for the tables. A '
      + 'configuration with no ingest entry reads null and is printed "not recorded" — never zero, because zero '
      + 'is S0\'s real and load-bearing value.',
    reported: costs,
    perConfiguration: report.systems.map(s => ({
      key: s.key,
      label: s.label,
      ingest: s.ingest,
      retrievalTokensPerQuestion: s.retrieval.tokensPerQuestion,
      retrievalRowsCovered: `${s.retrieval.covered}/${s.retrieval.total}`,
      retrievalP50Ms: s.retrieval.p50Ms,
      retrievalP95Ms: s.retrieval.p95Ms,
      answerP50Ms: s.answer.p50Ms,
      answerP95Ms: s.answer.p95Ms,
      lexicalPer1kRetrievalTokens: s.lexicalPer1kRetrievalTokens,
    })),
  })));

  await emit(files, runDir, 'cache.json', asJson(stamp(report, {
    note: 'hitRate is null when nothing was looked up. Zero would report a cache that missed everything.',
    ...report.cache,
    reported: cacheStats,
  })));

  // summary.md lists the files, so it is rendered after them — and it is itself appended to the manifest below,
  // which is why the manifest is last.
  await emit(files, runDir, 'summary.md', summaryMarkdown(report, { pins, configs, costs, files: [...files] }));

  await emit(files, runDir, 'manifest.json', asJson(stamp(report, {
    note: 'The pins and the configurations, verbatim, plus a sha256 of every other file in this directory so an '
      + 'edited results set is distinguishable from an original one.',
    dirtyTree: report.dirtyTree,
    counts: report.counts,
    seeds: report.seeds,
    contaminationProbeSystem,
    pins,
    configs,
    files,
  })));

  return {
    dir: runDir,
    tier,
    date,
    commit,
    files,
    counts: report.counts,
    contamination: report.contamination,
    cache: report.cache,
  };
}
