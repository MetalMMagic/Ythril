/**
 * Background semantic-duplicate scanner + per-space action engine.
 *
 * A cron-scheduled sweep (off by default; enable via `config.dupeScanner`) walks
 * each space by `seq` and, for every near-duplicate pair, applies the space's
 * duplicate-action rules (`SpaceConfig.dupeRules`). It is deliberately
 * independent of the interactive insert-time check:
 *
 *   - It scans EVERY record, including those inserted with checkDuplicates off.
 *   - It re-scans edited records automatically (updates advance `seq`), and
 *     re-evaluates a pair whenever either record has changed since last seen.
 *   - It uses each record's STORED embedding (via findSimilar) — no re-embedding.
 *
 * Action rules (first match by descending minScore wins; no match ⇒ `flag`):
 *   - flag      → record a reviewable candidate (non-destructive).
 *   - automerge → entities only: losslessly merge (skip on a value conflict).
 *   - notify    → emit a `duplicate.detected` webhook (both records + score),
 *                 via subscriptions or a per-rule override URL.
 *
 * Cursor model: a per-(space, type) cursor in `ythril_dupe_scan_state` holds the
 * highest `seq` already swept; each run scans records with a greater `seq` in
 * bounded batches, capped at `maxPerRun` so the initial pass spreads over runs.
 */

import { schedule, validate, type ScheduledTask } from 'node-cron';
import { col, asFilter, asUpdate, isVectorSearchAvailable } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { needsReindex } from '../spaces/_shared.js';
import { ssrfSafeFetch } from '../util/ssrf.js';
import { log } from '../util/log.js';
import {
  findSimilar,
  summariseRecall,
  DEFAULT_DUPE_THRESHOLD,
  type RecallResult,
  type RecallKnowledgeType,
} from './recall.js';
import { computeMergePlan, applyResolutions, executeMerge } from './merge.js';
import { emitWebhookEvent } from '../webhooks/dispatcher.js';
import type { DupeCandidateDoc, DupeScanStateDoc, DupeScanType, DupeActionRule } from '../config/types.js';

const DEFAULT_SCHEDULE = '0 3 * * *';   // 03:00 daily
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_PER_RUN = 5000;
const DEFAULT_TYPES: DupeScanType[] = ['memory', 'entity'];
const TOPK = 5;                          // similar records fetched per seed
const SCAN_STATE = 'ythril_dupe_scan_state';

const COLLECTION_SUFFIX: Record<DupeScanType, string> = {
  memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono', file: 'files',
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** Canonical, collision-resistant candidate key. Length-prefixing aId disambiguates
 *  ids that themselves contain the ':' separator. */
function pairKey(type: DupeScanType, aId: string, bId: string): string {
  return `${type}:${aId.length}:${aId}:${bId}`;
}

// ── Cursor state ─────────────────────────────────────────────────────────────

async function getCursor(spaceId: string, type: DupeScanType): Promise<number> {
  const doc = await col<DupeScanStateDoc>(SCAN_STATE).findOne(asFilter<DupeScanStateDoc>({ _id: `${spaceId}:${type}` }));
  return doc?.cursorSeq ?? 0;
}

async function setCursor(spaceId: string, type: DupeScanType, cursorSeq: number): Promise<void> {
  await col<DupeScanStateDoc>(SCAN_STATE).updateOne(
    asFilter<DupeScanStateDoc>({ _id: `${spaceId}:${type}` }),
    asUpdate<DupeScanStateDoc>({ $set: { spaceId, type, cursorSeq, updatedAt: new Date().toISOString() } }),
    { upsert: true },
  );
}

// ── Rule evaluation + actions ────────────────────────────────────────────────

/** First matching rule by descending minScore, or null (⇒ flag). */
function pickRule(rules: DupeActionRule[] | undefined, type: DupeScanType, score: number): DupeActionRule | null {
  if (!rules || rules.length === 0) return null;
  const sorted = [...rules].sort((a, b) => b.minScore - a.minScore);
  for (const r of sorted) {
    if (score >= r.minScore && (!r.types || r.types.includes(type))) return r;
  }
  return null;
}

async function upsertCandidate(
  spaceId: string, type: DupeScanType, a: RecallResult, b: RecallResult,
  aSeq: number, bSeq: number, score: number,
  status: DupeCandidateDoc['status'], resolution?: DupeCandidateDoc['resolution'],
): Promise<void> {
  const _id = pairKey(type, a._id, b._id);
  const now = new Date().toISOString();
  await col<DupeCandidateDoc>(`${spaceId}_dupe_candidates`).updateOne(
    asFilter<DupeCandidateDoc>({ _id }),
    asUpdate<DupeCandidateDoc>({
      $setOnInsert: { spaceId, type, aId: a._id, bId: b._id, detectedAt: now },
      $set: {
        aSummary: summariseRecall(a), bSummary: summariseRecall(b),
        aSeq, bSeq, score, status, updatedAt: now,
        ...(resolution ? { resolution } : {}),
      },
    }),
    { upsert: true },
  );
}

/** Attempt a lossless entity merge. Returns true only if it actually merged. */
async function tryAutoMerge(spaceId: string, seed: RecallResult, match: RecallResult): Promise<boolean> {
  const pref = getConfig().spaces.find(s => s.id === spaceId)?.dupeMergeSurvivor ?? 'older';
  const seedOlder = (seed.seq ?? 0) <= (match.seq ?? 0);
  const olderId = seedOlder ? seed._id : match._id;
  const newerId = seedOlder ? match._id : seed._id;
  const survivorId = pref === 'newer' ? newerId : olderId;
  const absorbedId = pref === 'newer' ? olderId : newerId;

  try {
    const result = await computeMergePlan(spaceId, survivorId, absorbedId, []);
    if ('error' in result) return false;
    const { plan, fullyResolved, survivor, absorbed } = result;
    if (!fullyResolved) return false;   // a property value conflict — not lossless, leave for review
    const mergedProps = applyResolutions(survivor.properties ?? {}, absorbed.properties ?? {}, plan.propertyConflicts, plan.absorbedOnlyProperties);
    await executeMerge(spaceId, survivor, absorbed, mergedProps, { tokenLabel: 'dupe-scanner' });
    log.info(`Auto-merged entity ${absorbed._id} → ${survivor._id} in '${spaceId}' (score ${(match.score ?? 0).toFixed(3)})`);
    return true;
  } catch (err) {
    log.warn(`Auto-merge failed in '${spaceId}': ${err}`);
    return false;
  }
}

async function fireNotify(spaceId: string, type: DupeScanType, a: RecallResult, b: RecallResult, score: number, overrideUrl?: string): Promise<void> {
  const entry = { type, score, a, b };
  if (overrideUrl) {
    try {
      const resp = await ssrfSafeFetch(overrideUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'duplicate.detected', spaceId, timestamp: new Date().toISOString(), ...entry }),
      });
      resp.body?.cancel?.();
    } catch (err) {
      log.warn(`Dupe notify (override URL) failed for '${spaceId}': ${err}`);
    }
  } else {
    emitWebhookEvent({ event: 'duplicate.detected', spaceId, entry });
  }
}

/**
 * Apply the space's rules to one detected pair, respecting the change-detection
 * lifecycle: an unchanged pair (same seqs as last time) is skipped so a
 * dismissed pair stays dismissed and notifications don't repeat; a changed pair
 * is re-evaluated (and re-opened).
 */
async function handlePair(spaceId: string, type: DupeScanType, seed: RecallResult, match: RecallResult): Promise<void> {
  const [a, b] = seed._id < match._id ? [seed, match] : [match, seed];
  const aSeq = a.seq ?? 0;
  const bSeq = b.seq ?? 0;
  const _id = pairKey(type, a._id, b._id);

  const existing = await col<DupeCandidateDoc>(`${spaceId}_dupe_candidates`).findOne(asFilter<DupeCandidateDoc>({ _id }));
  if (existing) {
    if (existing.status === 'resolved' && existing.resolution === 'merged') return; // absorbed record gone
    if (existing.aSeq === aSeq && existing.bSeq === bSeq) return;                    // unchanged since last seen
  }

  const rule = pickRule(getConfig().spaces.find(s => s.id === spaceId)?.dupeRules, type, match.score ?? 0);
  const action = rule?.action ?? 'flag';
  const score = match.score ?? 0;

  if (action === 'automerge' && type === 'entity') {
    if (await tryAutoMerge(spaceId, seed, match)) {
      await upsertCandidate(spaceId, type, a, b, aSeq, bSeq, score, 'resolved', 'merged');
      return;
    }
    // value conflict or error — fall back to a reviewable candidate
    await upsertCandidate(spaceId, type, a, b, aSeq, bSeq, score, 'open');
    return;
  }

  if (action === 'notify') {
    await upsertCandidate(spaceId, type, a, b, aSeq, bSeq, score, 'open', 'notified');
    await fireNotify(spaceId, type, a, b, score, rule?.webhookUrl);
    return;
  }

  await upsertCandidate(spaceId, type, a, b, aSeq, bSeq, score, 'open');
}

/** Find and rule-process the near-duplicates of one record. Returns the pair count. */
async function evalOneRecord(spaceId: string, type: DupeScanType, recordId: string, threshold: number): Promise<number> {
  let n = 0;
  try {
    const { source, results } = await findSimilar(spaceId, recordId, type as RecallKnowledgeType, TOPK, [type as RecallKnowledgeType], threshold);
    for (const match of results) {
      if (match.type !== type) continue;
      await handlePair(spaceId, type, source, match);
      n++;
    }
  } catch { /* record lacks a stored vector, was merged away, or search failed — skip */ }
  return n;
}

/** Effective detection threshold for a space: the scanner floor, lowered to the
 *  lowest rule minScore so a rule can fire at its own threshold. */
function effectiveThreshold(spaceId: string): number {
  const cfg = getConfig();
  const dc = cfg.dupeScanner ?? {};
  const base = typeof dc.threshold === 'number' ? clamp(dc.threshold, 0, 1) : DEFAULT_DUPE_THRESHOLD;
  const rules = cfg.spaces.find(s => s.id === spaceId)?.dupeRules ?? [];
  return rules.length > 0 ? Math.min(base, ...rules.map(r => clamp(r.minScore, 0, 1))) : base;
}

/**
 * Real-time hook: evaluate a single freshly-written record against the space's
 * duplicate rules — only when `dupeRulesOnInsert` is enabled. Fire-and-forget
 * safe (never throws). The scheduled scan covers everything else.
 */
export async function evaluateRecordForDuplicates(spaceId: string, type: DupeScanType, recordId: string): Promise<void> {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space || space.proxyFor || !space.dupeRulesOnInsert) return;
  if (!isVectorSearchAvailable() || needsReindex(spaceId)) return;
  try {
    await evalOneRecord(spaceId, type, recordId, effectiveThreshold(spaceId));
  } catch { /* never let insert-time evaluation surface an error */ }
}

// ── Sweep ────────────────────────────────────────────────────────────────────

export interface DupeScanResult {
  scanned: number;
  pairs: number;
}

/**
 * Sweep one space for duplicate pairs. Incremental by default (resumes from the
 * per-type cursor); pass `reset: true` for an on-demand full re-scan.
 */
export async function scanSpace(spaceId: string, opts?: { reset?: boolean }): Promise<DupeScanResult> {
  const cfg = getConfig();
  const dc = cfg.dupeScanner ?? {};
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space || space.proxyFor) return { scanned: 0, pairs: 0 };
  if (!isVectorSearchAvailable() || needsReindex(spaceId)) return { scanned: 0, pairs: 0 };

  const threshold = effectiveThreshold(spaceId);
  const batchSize = clamp(dc.batchSize ?? DEFAULT_BATCH_SIZE, 1, 1000);
  const maxPerRun = clamp(dc.maxPerRun ?? DEFAULT_MAX_PER_RUN, 1, 1_000_000);
  const types = (dc.types && dc.types.length > 0 ? dc.types : DEFAULT_TYPES);

  let scanned = 0;
  let pairs = 0;

  for (const type of types) {
    if (scanned >= maxPerRun) break;
    if (opts?.reset) await setCursor(spaceId, type, 0);
    let cursor = opts?.reset ? 0 : await getCursor(spaceId, type);
    const coll = `${spaceId}_${COLLECTION_SUFFIX[type]}`;

    while (scanned < maxPerRun) {
      const take = Math.min(batchSize, maxPerRun - scanned);
      const batch = await col<{ _id: string; seq?: number }>(coll)
        // spaceId pins the leading field of the {spaceId,seq} index so this is an
        // indexed range scan + sorted output, not a collection scan + blocking sort.
        .find(asFilter<{ _id: string; seq?: number }>({ spaceId, seq: { $gt: cursor } }), { projection: { _id: 1, seq: 1 } })
        .sort({ seq: 1 })
        .limit(take)
        .toArray();
      if (batch.length === 0) break;

      for (const rec of batch) {
        pairs += await evalOneRecord(spaceId, type, rec._id, threshold);
        if (typeof rec.seq === 'number' && rec.seq > cursor) cursor = rec.seq;
        scanned++;
      }
      await setCursor(spaceId, type, cursor);
    }
  }

  return { scanned, pairs };
}

/** Scan every real (non-proxy) space once, incrementally. Used by the scheduled sweep. */
export async function runDupeScanAllSpaces(): Promise<void> {
  const cfg = getConfig();
  for (const s of cfg.spaces) {
    if (s.proxyFor) continue;
    try {
      const r = await scanSpace(s.id);
      if (r.scanned > 0) log.info(`Dupe scan '${s.id}': scanned ${r.scanned}, pairs ${r.pairs}`);
    } catch (err) {
      log.warn(`Dupe scan '${s.id}' failed: ${err}`);
    }
  }
}

// ── Scheduler (node-cron, mirrors backup-scheduler) ──────────────────────────

let _task: ScheduledTask | null = null;

export function startDupeScanner(): void {
  stopDupeScanner();
  const dc = getConfig().dupeScanner;
  if (!dc?.enabled) return;
  const cron = dc.schedule ?? DEFAULT_SCHEDULE;
  if (!validate(cron)) {
    log.warn(`Invalid dupeScanner.schedule '${cron}' — duplicate scanner not started`);
    return;
  }
  _task = schedule(cron, () => {
    runDupeScanAllSpaces().catch(err => log.error(`Scheduled dupe scan error: ${err}`));
  });
  log.info(`Duplicate scanner scheduled (${cron})`);
}

export function stopDupeScanner(): void {
  _task?.stop();
  _task = null;
}
