/**
 * Per-space contradiction scanner (F-REVIEW slice 3c).
 *
 * Walks a space's records, pairs each with its nearest neighbours (the same vector search the duplicate
 * scanner uses — similarity finds the CANDIDATES, it never decides them), asks `judgePair`, and hands the
 * verdict to `recordContradiction`.
 *
 * ── Why there are TWO cursors ────────────────────────────────────────────────────────────────────────
 *
 * The duplicate scanner keeps one cursor per space/type and advances it **per record**: once a record has
 * been scanned the cursor moves past it, and the record is only revisited when its own `seq` changes. That
 * is sound there, because its judge is a cosine score — it always answers.
 *
 * Here the judge can decline. `judgePair` returns `unjudged` when the NLI endpoint is unconfigured,
 * unreachable, or returned nonsense. `recordContradiction` correctly writes nothing for those — but writing
 * nothing is not enough: a single shared cursor would still have moved past the record, so the pair would
 * not be looked at again until one of its records happened to change. An NLI outage during a nightly sweep
 * would silently skip everything it touched, permanently, and the Review tab would look clean.
 *
 * So the two passes keep their own cursors:
 *
 *   `{space}:{type}`       STRUCTURED — deterministic property conflicts. Always answers, so it always
 *                          advances. This pass is useful with **no NLI model configured at all**.
 *   `{space}:{type}:nli`   NLI — advances only over records the judge actually answered for. If the judge
 *                          is unavailable the cursor simply stalls where it is and resumes from exactly
 *                          there once a model is configured. Nothing is lost, nothing is falsely settled.
 *
 * A *low-confidence* verdict is NOT a stall: the judge answered, just weakly, and re-asking would give the
 * same answer — so the NLI cursor moves past it. That is the whole reason `Verdict` distinguishes
 * `low-confidence` from `judge-unavailable`.
 */
import { schedule, validate, type ScheduledTask } from 'node-cron';
import { col, asFilter, asUpdate, isVectorSearchAvailable } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { needsReindex } from '../spaces/_shared.js';
import { log } from '../util/log.js';
import { findSimilar, summariseRecall, DEFAULT_DUPE_THRESHOLD, type RecallKnowledgeType, type RecallResult } from './recall.js';
import { judgePair, type JudgeableRecord } from './contradiction-judge.js';
import { extraClaimFields, fetchStructuredClaims, type ClaimMap } from './structured-claims.js';
import { recordContradiction } from './contradiction-candidates.js';
import { nliConfigured } from './nli-client.js';
import type { DupeScanStateDoc, DupeScanType } from '../config/types.js';

const SCAN_STATE = 'ythril_dupe_scan_state';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_PER_RUN = 5000;
// Chrono is swept alongside memories and entities: a calendar is exactly where the same thing gets logged
// twice with conflicting states, and its `status` is a single-valued claim the structured pass can settle
// without a model. See structured-claims.ts for why its dates are deliberately not part of that.
export const DEFAULT_TYPES: DupeScanType[] = ['memory', 'entity', 'chrono'];
const TOPK = 5;

const COLLECTION_SUFFIX: Record<DupeScanType, string> = {
  memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono', file: 'files',
};

/** Which pass a cursor belongs to. The suffix keeps them in the existing scan-state collection. */
export type Pass = 'structured' | 'nli';

/** Cursor key. The structured pass keeps the unsuffixed key so it reads naturally alongside the dupe one. */
export function cursorKey(spaceId: string, type: DupeScanType, pass: Pass): string {
  return pass === 'nli' ? `${spaceId}:${type}:contradiction:nli` : `${spaceId}:${type}:contradiction`;
}

async function getCursor(spaceId: string, type: DupeScanType, pass: Pass): Promise<number> {
  const doc = await col<DupeScanStateDoc>(SCAN_STATE).findOne(
    asFilter<DupeScanStateDoc>({ _id: cursorKey(spaceId, type, pass) }));
  return doc?.cursorSeq ?? 0;
}

async function setCursor(spaceId: string, type: DupeScanType, pass: Pass, cursorSeq: number): Promise<void> {
  await col<DupeScanStateDoc>(SCAN_STATE).updateOne(
    asFilter<DupeScanStateDoc>({ _id: cursorKey(spaceId, type, pass) }),
    asUpdate<DupeScanStateDoc>({ $set: { spaceId, type, cursorSeq, updatedAt: new Date().toISOString() } }),
    { upsert: true },
  );
}

/** What one record's evaluation did — the caller needs `judgeStalled` to decide about the NLI cursor. */
export interface RecordOutcomeSummary {
  found: number;
  /** True when at least one pair could not be judged because the judge itself was unavailable. */
  judgeStalled: boolean;
}

/**
 * A recall hit as the judge sees it.
 *
 * The mapping is spelled out rather than cast because getting it wrong is silent and total. A `RecallResult`
 * carries `_id` (not `id`) and keeps its free text under a per-type field (`fact` / `name` / `title`) — it
 * has no `text` and no `summary` at all. Handing one straight to `JudgeableRecord` therefore yields
 * `id: undefined, text: ''`, which does not fail: `judgePair` reads the empty text as `no-text` so the NLI
 * pass silently judges nothing ever, and every structured finding is written under the pair id
 * `"undefined:undefined"`, so the whole space collapses into one row that each pair overwrites in turn.
 * Nothing throws and the sweep reports success. That is what the `as never` casts here used to hide.
 */
export function toJudgeable(r: RecallResult, claims?: ClaimMap): JudgeableRecord {
  // `summariseRecall` is the same one-liner the duplicate review list shows, so a contradiction card and a
  // duplicate card describe the same record identically. `description` is appended for the NLI pass, which
  // needs prose to entail over — a bare title rarely contradicts anything.
  const head = summariseRecall(r);
  return {
    id: r._id,
    text: r.description ? `${head}. ${r.description}` : head,
    ...(claims ? { properties: claims } : {}),
  };
}

/**
 * Evaluate one seed record against its nearest neighbours.
 *
 * `pass` decides what a pair is allowed to consult: the structured pass never calls the model (so it can
 * run with no NLI configured), the NLI pass is the one that may stall.
 */
export async function evalRecord(
  spaceId: string, type: DupeScanType, recordId: string, pass: Pass, threshold: number,
): Promise<RecordOutcomeSummary> {
  let found = 0;
  let judgeStalled = false;
  try {
    const { source, results } = await findSimilar(
      spaceId, recordId, type as RecallKnowledgeType, TOPK, [type as RecallKnowledgeType], threshold);
    const sameType = results.filter(m => m.type === type);

    // For a type whose claims include stored columns (chrono's `status`), read them from the COLLECTION
    // rather than from the recall result — `RecallChrono.status` is derived from the clock, so judging on
    // it would produce a candidate whose verdict changes overnight while both records sit untouched.
    // One round trip covers the seed and all its neighbours.
    const stored = extraClaimFields(type).length > 0
      ? await fetchStructuredClaims(spaceId, type, [source._id, ...sameType.map(m => m._id)])
      : null;
    const claimsOf = (r: RecallResult): ClaimMap | undefined =>
      stored ? stored.get(r._id) : r.properties;

    const a = toJudgeable(source, claimsOf(source));
    for (const match of sameType) {
      const b = toJudgeable(match, claimsOf(match));

      // The structured pass must not reach the model — it has to stay useful (and cursor-advancing) on an
      // instance with no NLI endpoint at all. It only records a verdict it can reach deterministically.
      const verdict = pass === 'structured'
        ? await judgePair(a, b, { schemas: undefined, minConfidence: 2 })   // >1 ⇒ any NLI answer is discarded
        : await judgePair(a, b);

      if (verdict.kind === 'unjudged' && verdict.reason === 'judge-unavailable') {
        judgeStalled = true;
        continue;   // leave the pair unsettled; the NLI cursor will not move past this record
      }
      const outcome = await recordContradiction(spaceId, type,
        { id: a.id, summary: summariseRecall(source), seq: source.seq ?? 0 },
        { id: b.id, summary: summariseRecall(match), seq: match.seq ?? 0 },
        verdict);
      if (outcome === 'created' || outcome === 'reopened') found++;
    }
  } catch {
    /* no stored vector, record merged away, or search failed — skip the seed, not the sweep */
  }
  return { found, judgeStalled };
}

export interface ContradictionScanResult {
  scanned: number;
  found: number;
  /** True when the NLI pass stopped early because the judge was unavailable. Reported, not swallowed. */
  nliStalled: boolean;
}

/** Sweep one space. Incremental per pass; `reset` re-runs both from zero. */
export async function scanSpace(spaceId: string, opts?: { reset?: boolean }): Promise<ContradictionScanResult> {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space || space.proxyFor) return { scanned: 0, found: 0, nliStalled: false };
  if (!isVectorSearchAvailable() || needsReindex(spaceId)) return { scanned: 0, found: 0, nliStalled: false };

  const threshold = DEFAULT_DUPE_THRESHOLD;
  let scanned = 0;
  let found = 0;
  let nliStalled = false;

  // The NLI pass is skipped wholesale when no model is configured — its cursor stays put, so the day one is
  // configured it starts from the beginning of what it has not seen rather than from "now".
  const passes: Pass[] = nliConfigured() ? ['structured', 'nli'] : ['structured'];

  for (const pass of passes) {
    for (const type of DEFAULT_TYPES) {
      if (scanned >= DEFAULT_MAX_PER_RUN) break;
      if (opts?.reset) await setCursor(spaceId, type, pass, 0);
      let cursor = opts?.reset ? 0 : await getCursor(spaceId, type, pass);
      const coll = `${spaceId}_${COLLECTION_SUFFIX[type]}`;
      let stalledThisType = false;

      while (scanned < DEFAULT_MAX_PER_RUN && !stalledThisType) {
        const take = Math.min(DEFAULT_BATCH_SIZE, DEFAULT_MAX_PER_RUN - scanned);
        const batch = await col<{ _id: string; seq?: number }>(coll)
          .find(asFilter<{ _id: string; seq?: number }>({ spaceId, seq: { $gt: cursor } }), { projection: { _id: 1, seq: 1 } })
          .sort({ seq: 1 })
          .limit(take)
          .toArray();
        if (batch.length === 0) break;

        for (const rec of batch) {
          const out = await evalRecord(spaceId, type, rec._id, pass, threshold);
          found += out.found;
          scanned++;
          if (out.judgeStalled) {
            // Stop this pass HERE, without advancing past the record. The pair is not settled, so the
            // cursor must not claim it is — that is the whole point of the second cursor.
            stalledThisType = true;
            nliStalled = true;
            break;
          }
          if (typeof rec.seq === 'number' && rec.seq > cursor) cursor = rec.seq;
        }
        await setCursor(spaceId, type, pass, cursor);
      }
    }
  }

  if (nliStalled) log.warn(`Contradiction scan (${spaceId}): the NLI judge was unavailable — its cursor is parked and will resume where it stopped`);
  return { scanned, found, nliStalled };
}

/**
 * Scan every real (non-proxy) space once, incrementally.
 *
 * Reports what it did rather than running silently: a sweep that parked because the judge was unreachable
 * has NOT cleared anything, and that has to be distinguishable in the logs from a sweep that found nothing.
 * The whole two-cursor design exists to stop an outage looking like a clean queue; swallowing it here would
 * put the blind spot straight back.
 */
export async function runContradictionScanAllSpaces(): Promise<void> {
  let scanned = 0;
  let found = 0;
  let stalled = false;
  for (const s of getConfig().spaces) {
    if (s.proxyFor) continue;
    try {
      const r = await scanSpace(s.id);
      scanned += r.scanned; found += r.found; stalled ||= r.nliStalled;
    } catch (err) { log.warn(`Contradiction scan failed for ${s.id}: ${err instanceof Error ? err.message : String(err)}`); }
  }
  if (scanned > 0) log.info(`Contradiction scan: scanned ${scanned}, found ${found}`);
  if (stalled) log.warn('Contradiction scan: the NLI judge was unavailable — its cursor is parked and will resume where it stopped. This sweep did NOT clear the queue.');
}

// ── Scheduler (node-cron, mirrors the duplicate scanner) ─────────────────────
//
// Off by default and deliberately its own switch: the NLI pass is a model call per candidate pair and,
// with an external endpoint, egresses record text. Enabling duplicate detection must not silently start
// paying for inference. The default time sits half an hour after the dupe sweep so the two do not contend
// for the same vector-search capacity on a small instance.

const DEFAULT_SCHEDULE = '30 3 * * *';
let _task: ScheduledTask | null = null;

export function startContradictionScanner(): void {
  stopContradictionScanner();
  const cs = getConfig().contradictionScanner;
  if (!cs?.enabled) return;
  const cron = cs.schedule ?? DEFAULT_SCHEDULE;
  if (!validate(cron)) {
    log.warn(`Invalid contradictionScanner.schedule '${cron}' — contradiction scanner not started`);
    return;
  }
  _task = schedule(cron, () => {
    runContradictionScanAllSpaces().catch(err => log.error(`Scheduled contradiction scan error: ${err}`));
  });
  log.info(`Contradiction scanner scheduled (${cron})`);
}

export function stopContradictionScanner(): void {
  _task?.stop();
  _task = null;
}
