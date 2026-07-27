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
import { col, asFilter, asUpdate, isVectorSearchAvailable } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { needsReindex } from '../spaces/_shared.js';
import { log } from '../util/log.js';
import { findSimilar, DEFAULT_DUPE_THRESHOLD, type RecallKnowledgeType } from './recall.js';
import { judgePair, type JudgeableRecord } from './contradiction-judge.js';
import { recordContradiction } from './contradiction-candidates.js';
import { nliConfigured } from './nli-client.js';
import type { DupeScanStateDoc, DupeScanType } from '../config/types.js';

const SCAN_STATE = 'ythril_dupe_scan_state';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_PER_RUN = 5000;
const DEFAULT_TYPES: DupeScanType[] = ['memory', 'entity'];
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

const toJudgeable = (r: { id: string; text?: string; properties?: Record<string, string | number | boolean> }): JudgeableRecord =>
  ({ id: r.id, text: r.text ?? '', ...(r.properties ? { properties: r.properties } : {}) });

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
    for (const match of results) {
      if (match.type !== type) continue;
      const a = toJudgeable(source as never);
      const b = toJudgeable(match as never);

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
        { id: a.id, summary: (source as { summary?: string }).summary ?? a.text.slice(0, 200), seq: (source as { seq?: number }).seq ?? 0 },
        { id: b.id, summary: (match as { summary?: string }).summary ?? b.text.slice(0, 200), seq: (match as { seq?: number }).seq ?? 0 },
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

/** Scan every real (non-proxy) space once, incrementally. */
export async function runContradictionScanAllSpaces(): Promise<void> {
  for (const s of getConfig().spaces) {
    if (s.proxyFor) continue;
    try { await scanSpace(s.id); }
    catch (err) { log.warn(`Contradiction scan failed for ${s.id}: ${err instanceof Error ? err.message : String(err)}`); }
  }
}
