import { col, asFilter, asUpdate } from '../db/mongo.js';
import { getConfig, saveConfig } from '../config/loader.js';
import { log } from './log.js';
import type { SpaceCounterDoc } from '../config/types.js';

/**
 * Returns the next monotonic sequence number for a space.
 * Safe for concurrent callers — uses findOneAndUpdate with $inc.
 */
export async function nextSeq(spaceId: string): Promise<number> {
  const counters = col<SpaceCounterDoc>('ythril_counters');
  const result = await counters.findOneAndUpdate(
    { _id: spaceId },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!result) throw new Error(`Failed to increment sequence counter for space ${spaceId}`);
  return result.seq;
}

/**
 * Reserve a contiguous block of `count` sequence numbers in ONE round trip.
 *
 * Returns the FIRST seq of the block; the caller owns `[first, first + count - 1]`.
 *
 * The bulk-delete paths write one tombstone per document and used to call `nextSeq()` inside
 * the loop — a sequential round trip per document, so wiping 100k memories cost 100k awaited
 * round trips *before the delete even started*. A single `$inc` by `count` reserves the whole
 * range atomically.
 *
 * Gaps are safe, reuse is NOT. If the caller fails after reserving, the block is simply never
 * used — sync compares seqs with `>`, so a hole in the sequence is harmless, whereas handing
 * the same seq to two documents would corrupt the watermark logic. That is why this reserves
 * up-front rather than rolling back on error.
 */
export async function reserveSeqBlock(spaceId: string, count: number): Promise<number> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`reserveSeqBlock: count must be a positive integer, got ${count}`);
  }
  const counters = col<SpaceCounterDoc>('ythril_counters');
  const result = await counters.findOneAndUpdate(
    { _id: spaceId },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!result) throw new Error(`Failed to reserve ${count} sequence numbers for space ${spaceId}`);
  // `result.seq` is the counter AFTER the increment, i.e. the LAST seq of our block.
  return result.seq - count + 1;
}

/** Read the current counter for a space (0 when it does not exist yet). */
export async function currentSeq(spaceId: string): Promise<number> {
  const doc = await col<SpaceCounterDoc>('ythril_counters')
    .findOne(asFilter<SpaceCounterDoc>({ _id: spaceId })) as SpaceCounterDoc | null;
  return doc?.seq ?? 0;
}

/**
 * The protocol sequence ceiling (mirrors `MAX_SYNC_SEQ` in api/sync.ts, where
 * incoming docs are Zod-validated to `<= 2^50`). A document at or above this
 * cannot be represented, so it is never a legitimate value on the wire.
 */
export const MAX_SYNC_SEQ = 2 ** 50;

/**
 * Headroom kept below `MAX_SYNC_SEQ`. Ingesting a document advances the space
 * counter (`bumpSeq`) so local writes always sort above synced ones — so a peer
 * that pushes one document with `seq` near the ceiling drags the counter there,
 * and the space's *next* local write exceeds `MAX_SYNC_SEQ` and is rejected by
 * every peer: silent, unrecoverable write loss.
 *
 * The guard is absolute rather than relative to the current counter: legitimate
 * seqs are small monotonic counters (`nextSeq` increments by 1), so they sit far
 * below `MAX_SYNC_SEQ - SEQ_CEILING_RESERVE` regardless of a space's history,
 * while the poisoning value (near 2^50) is caught. A relative "max jump" guard
 * would instead false-positive on the initial sync of a high-volume space to a
 * fresh peer. 2^40 (~1.1e12) of reserve leaves an unreachable number of future
 * writes before the ceiling.
 */
export const SEQ_CEILING_RESERVE = 2 ** 40;

/** The highest `seq` an ingested document may carry. */
export const MAX_INGEST_SEQ = MAX_SYNC_SEQ - SEQ_CEILING_RESERVE;

/**
 * True when `seq` is out of range or so close to the protocol ceiling that
 * ingesting it would strand the space's counter. Callers reject such documents.
 * Synchronous — the bound does not depend on the current counter.
 */
export function isSeqImplausible(seq: number): boolean {
  return !Number.isFinite(seq) || seq < 0 || seq > MAX_INGEST_SEQ;
}

/**
 * Ensure the space counter is at least `minSeq`.
 * Called after receiving remote documents via sync so that subsequent local
 * writes always get a seq higher than any synced document.
 * Uses $max — only advances the counter, never decreases it.
 *
 * The advance is CLAMPED to `MAX_INGEST_SEQ`: ingest paths already refuse
 * documents above it, and this is the backstop that keeps a stray value from
 * stranding the counter within `SEQ_CEILING_RESERVE` of the ceiling.
 */
export async function bumpSeq(spaceId: string, minSeq: number): Promise<void> {
  if (minSeq > MAX_INGEST_SEQ) {
    log.warn(
      `Clamped seq bump for space '${spaceId}': requested ${minSeq} exceeds ` +
      `MAX_INGEST_SEQ (${MAX_INGEST_SEQ}) — advancing to the ceiling reserve instead.`,
    );
    minSeq = MAX_INGEST_SEQ;
  }
  await col<SpaceCounterDoc>('ythril_counters').updateOne(
    asFilter<SpaceCounterDoc>({ _id: spaceId }),
    asUpdate<SpaceCounterDoc>({ $max: { seq: minSeq } }),
    { upsert: true },
  );
}

/**
 * Detects the bind-mount / volume mismatch that occurs when `docker compose
 * down -v` wipes MongoDB but leaves config.json intact on the host bind-mount.
 *
 * Symptom: ythril_counters is empty (seq counter was in the wiped volume) yet
 * one or more network members carry a non-zero lastSeqReceived watermark from
 * the previous run.  Without this fix those networks would pull with a high
 * sinceSeq and silently miss every document whose seq falls below the stale
 * watermark.
 *
 * Safe to call at every startup: it is a no-op when ythril_counters is
 * non-empty (normal restart) or when all watermarks are already zero.
 */
export async function resetStaleWatermarksIfNeeded(): Promise<void> {
  const count = await col<SpaceCounterDoc>('ythril_counters').estimatedDocumentCount();
  if (count > 0) return; // MongoDB intact — nothing to do

  const cfg = getConfig();
  let changed = false;
  for (const net of cfg.networks) {
    for (const member of net.members) {
      if (member.lastSeqReceived && Object.keys(member.lastSeqReceived).length > 0) {
        member.lastSeqReceived = {};
        changed = true;
      }
    }
    // Also clear any pendingMember watermarks inside vote rounds
    for (const round of net.pendingRounds) {
      if (round.pendingMember?.lastSeqReceived && Object.keys(round.pendingMember.lastSeqReceived).length > 0) {
        round.pendingMember.lastSeqReceived = {};
        changed = true;
      }
    }
  }
  if (changed) {
    saveConfig(cfg);
    log.warn('Seq counters absent but watermarks were non-zero — reset all lastSeqReceived to 0 (bind-mount/volume mismatch recovery)');
  }
}
