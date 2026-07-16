/**
 * Media embedding job queue.
 *
 * Persists `MediaJobDoc` records in the per-space `<spaceId>_media_jobs`
 * collection.  The worker claims jobs atomically via findOneAndUpdate.
 */

import { col, asFilter, asDoc, asUpdate } from '../../db/mongo.js';
import { toDocId } from '../../util/paths.js';
import { escapeRegex } from '../../util/redos.js';
import type { MediaJobDoc, FileMetaDoc } from '../../config/types.js';
import { log } from '../../util/log.js';

const MAX_ATTEMPTS = 3;

/**
 * Exponential backoff schedule (in ms) keyed by next attempt number.
 * After attempt 1 fails → wait 30 s; after 2 fails → wait 2 min.
 * The cap (`maxAttempts`) means we never schedule a wait beyond attempt 3.
 */
const RETRY_BACKOFF_MS: Record<number, number> = {
  1: 30_000,    // first retry available 30 s after the first failure
  2: 120_000,   // second retry available 2 min after the second failure
};

function nextClaimableAfter(nextAttempt: number): string {
  const delay = RETRY_BACKOFF_MS[nextAttempt] ?? 300_000;
  return new Date(Date.now() + delay).toISOString();
}


function jobCollection(spaceId: string) {
  return col<MediaJobDoc>(`${spaceId}_media_jobs`);
}

function fileCollection(spaceId: string) {
  return col<FileMetaDoc>(`${spaceId}_files`);
}

// ── Enqueue ────────────────────────────────────────────────────────────────

/**
 * Enqueue a new media embedding job.  Idempotent: if a job already exists
 * for this file and is not in a terminal state, it is left unchanged.
 * A previously-failed job is reset to `pending` so a new upload re-triggers
 * processing.
 */
export async function enqueueMediaJob(
  spaceId: string,
  filePath: string,
  mimeType: string,
  mediaType: 'image' | 'audio' | 'video',
): Promise<void> {
  const id = toDocId(filePath);
  const now = new Date().toISOString();

  const existing = await jobCollection(spaceId).findOne(
    asFilter<MediaJobDoc>({ _id: id }),
  ) as MediaJobDoc | null;

  if (existing && (existing.status === 'pending' || existing.status === 'processing')) {
    // Already queued — do not disturb
    return;
  }

  if (existing) {
    // Terminal state (complete/failed) — reset so re-upload triggers re-processing
    await jobCollection(spaceId).updateOne(
      asFilter<MediaJobDoc>({ _id: id }),
      asUpdate<MediaJobDoc>({
        $set: {
          status: 'pending',
          attempts: 0,
          lastError: null,
          claimedAt: null,
          claimableAfter: null,
          updatedAt: now,
          mimeType,
          mediaType,
        },
      }),
    );
  } else {
    const doc: MediaJobDoc = {
      _id: id,
      spaceId,
      filePath: id,
      mimeType,
      mediaType,
      status: 'pending',
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      lastError: null,
      claimedAt: null,
      claimableAfter: null,
      createdAt: now,
      updatedAt: now,
    };
    await jobCollection(spaceId).insertOne(asDoc<MediaJobDoc>(doc));
  }
  // The claim walk only probes spaces the hint knows about (P12) — so anything that CREATES
  // claimable work must announce it, or the job would sit unclaimed until the next full scan.
  markSpaceMayHaveWork(spaceId);
}

/**
 * Enqueue a new text document embedding job.
 * Unlike enqueueMediaJob, this ALWAYS resets the job to `pending` even when
 * a job is currently `pending` or `processing` — a re-upload means we have
 * new file content that must replace any in-flight work.
 *
 * The caller is responsible for deleting stale chunk records before enqueueing
 * so that a concurrent in-flight job (if any) finds no old data to overwrite.
 */
export async function enqueueTextJob(
  spaceId: string,
  filePath: string,
  resolvedFormat: string,
  mimeType = 'text/plain',
): Promise<void> {
  const id = toDocId(filePath);
  const now = new Date().toISOString();

  const existing = await jobCollection(spaceId).findOne(
    asFilter<MediaJobDoc>({ _id: id }),
  ) as MediaJobDoc | null;

  if (existing) {
    // Always reset — new upload supersedes any previous or in-progress job
    await jobCollection(spaceId).updateOne(
      asFilter<MediaJobDoc>({ _id: id }),
      asUpdate<MediaJobDoc>({
        $set: {
          status: 'pending',
          attempts: 0,
          lastError: null,
          claimedAt: null,
          claimableAfter: null,
          updatedAt: now,
          mimeType,
          mediaType: 'text',
          resolvedFormat,
        },
      }),
    );
  } else {
    const doc: MediaJobDoc = {
      _id: id,
      spaceId,
      filePath: id,
      mimeType,
      mediaType: 'text',
      resolvedFormat,
      status: 'pending',
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      lastError: null,
      claimedAt: null,
      claimableAfter: null,
      createdAt: now,
      updatedAt: now,
    };
    await jobCollection(spaceId).insertOne(asDoc<MediaJobDoc>(doc));
  }

  // Same as enqueueMediaJob: announce the work, or the claim walk will not probe this space.
  markSpaceMayHaveWork(spaceId);

  // Reflect pending status on the file meta record immediately so the UI
  // can show an "embedding" indicator without waiting for the worker.
  await fileCollection(spaceId).updateOne(
    asFilter<FileMetaDoc>({ _id: id }),
    { $set: { embeddingStatus: 'pending', updatedAt: now } },
  ).catch(err => {
    log.debug(`enqueueTextJob: could not set embeddingStatus on file meta ${spaceId}/${id}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

// ── Claim ─────────────────────────────────────────────────────────────────

/**
 * Atomically claim one pending job across a set of spaces.
 * Returns the claimed job, or null if none available.
 *
 * Skips jobs whose `claimableAfter` is still in the future (exponential
 * retry backoff) so a fast-failing job cannot starve siblings.
 */
// ── Pending-work hint (P12) ─────────────────────────────────────────────────
//
// Media job collections are PER SPACE, so there is no single cross-space query: claiming
// walks the spaces one findOneAndUpdate at a time and returns on the first hit. When the queue
// is empty — the normal state — every claim paid a full N-space walk just to discover there
// was nothing to do, and the worker does that (workerConcurrency + 1) times per tick. At 100
// spaces that is ~300 sequential round trips per tick, all of them useless.
//
// The hint records which spaces MIGHT hold claimable work, so the walk visits only those.
// It is an optimisation, never the source of truth: a stale hint can only cause an extra
// (harmless) probe, and work is never lost, because...
//
// ...a periodic FULL scan re-seeds it. That matters for one specific case: a job whose retry
// backoff (`claimableAfter`) has not yet elapsed is `pending` but not claimable, so the claim
// returns null and the hint is dropped — and when the backoff DOES elapse, nothing would
// re-add it. The full scan bounds how long such a job can sit unnoticed.
const _pendingHint = new Set<string>();
let _lastFullScan = 0;
const FULL_SCAN_INTERVAL_MS = 30_000;

// ── Worker wake-up ──────────────────────────────────────────────────────────
//
// On an empty queue the worker backs its poll interval off to workerMaxPollIntervalMs (30s by
// default) and sleeps on a plain setTimeout. That is right for CPU, and wrong for latency: an
// upload into an idle system then waits up to 30 SECONDS before embedding even starts, while
// the user watches the file sit in "pending".
//
// Since every path that creates claimable work already announces it (below), the announcement
// can simply wake the worker. The epoch counter closes the obvious race — work enqueued
// *between* the worker's failed claim and the start of its sleep would otherwise be missed and
// wait out the full backoff anyway. The worker samples the epoch BEFORE claiming and passes it
// to waitForWork(), which returns immediately if it has since moved.
let _workEpoch = 0;
let _wakeWaiters: Array<() => void> = [];

/** Monotonic counter bumped every time claimable work is announced. */
export function currentWorkEpoch(): number {
  return _workEpoch;
}

/**
 * Sleep up to `ms`, returning early if work is announced.
 * Returns true if woken by work, false if it timed out.
 *
 * `sinceEpoch` must be sampled BEFORE the caller's claim attempt.
 */
export function waitForWork(ms: number, sinceEpoch: number): Promise<boolean> {
  // Work already arrived while the caller was claiming — do not sleep at all.
  if (_workEpoch !== sinceEpoch) return Promise.resolve(true);

  return new Promise<boolean>(resolve => {
    let settled = false;
    const finish = (woken: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      _wakeWaiters = _wakeWaiters.filter(w => w !== wake);
      resolve(woken);
    };
    const wake = () => finish(true);
    const timer = setTimeout(() => finish(false), ms);
    if (typeof timer.unref === 'function') timer.unref();
    _wakeWaiters.push(wake);
  });
}

/** Wake every waiter — used on announcement, and on shutdown so stopping is not delayed. */
export function wakeWorkers(): void {
  const waiters = _wakeWaiters;
  _wakeWaiters = [];
  for (const w of waiters) w();
}

/** Record that a space may have claimable work (enqueue, requeue-on-failure, stall reset). */
export function markSpaceMayHaveWork(spaceId: string): void {
  _pendingHint.add(spaceId);
  _workEpoch++;
  wakeWorkers();
}

/** Test seam: forget everything the hint knows, forcing the next claim to do a full scan. */
export function resetPendingHint(): void {
  _pendingHint.clear();
  _lastFullScan = 0;
}

export async function claimNextJob(
  spaceIds: string[],
): Promise<MediaJobDoc | null> {
  const now = new Date().toISOString();

  const dueFullScan = Date.now() - _lastFullScan >= FULL_SCAN_INTERVAL_MS;
  if (dueFullScan) _lastFullScan = Date.now();

  // On a full scan, probe every space (authoritative). Otherwise probe only the spaces the
  // hint says are worth probing — which, on an idle queue, is none.
  const candidates = dueFullScan ? spaceIds : spaceIds.filter(s => _pendingHint.has(s));

  for (const spaceId of candidates) {
    const claimed = await jobCollection(spaceId).findOneAndUpdate(
      asFilter<MediaJobDoc>({
        status: 'pending',
        // Either no backoff set, or backoff has elapsed.
        $or: [
          { claimableAfter: null },
          { claimableAfter: { $exists: false } },
          { claimableAfter: { $lte: now } as unknown as string },
        ],
      }),
      asUpdate<MediaJobDoc>({
        $set: { status: 'processing', claimedAt: now, claimableAfter: null, updatedAt: now },
        $inc: { attempts: 1 },
      }),
      { returnDocument: 'after', sort: { createdAt: 1 } },
    ) as MediaJobDoc | null;

    if (claimed) {
      // There may be MORE work in this space — keep probing it on the next claim.
      _pendingHint.add(spaceId);
      return claimed;
    }
    // Nothing claimable here right now. Drop the hint; a future enqueue, a requeue, or the
    // periodic full scan will put it back.
    _pendingHint.delete(spaceId);
  }
  return null;
}

// ── Complete / fail ────────────────────────────────────────────────────────

/** Mark a job done. The job itself is always `complete` (no more retries), but the
 *  FILE's embeddingStatus reflects whether every chunk actually embedded: pass
 *  'partial' when some chunks stored without a vector so the file stays distinguishable
 *  and retry-eligible instead of masquerading as fully embedded (B3). */
export async function completeJob(
  spaceId: string,
  fileId: string,
  fileEmbeddingStatus: 'complete' | 'partial' = 'complete',
): Promise<void> {
  const now = new Date().toISOString();
  await jobCollection(spaceId).updateOne(
    asFilter<MediaJobDoc>({ _id: fileId }),
    asUpdate<MediaJobDoc>({ $set: { status: 'complete', claimedAt: null, updatedAt: now } }),
  );
  await fileCollection(spaceId).updateOne(
    asFilter<FileMetaDoc>({ _id: fileId }),
    { $set: { embeddingStatus: fileEmbeddingStatus, updatedAt: now } },
  );
}

export async function failJob(
  spaceId: string,
  fileId: string,
  attempts: number,
  maxAttempts: number,
  errorMessage: string,
): Promise<void> {
  const now = new Date().toISOString();
  // Sanitise error: never surface raw internal paths/URLs in the API response
  const safeError = sanitiseError(errorMessage);

  if (attempts < maxAttempts) {
    // Still has retries — reset to pending with backoff
    // `attempts` here is the number of attempts already made (incremented by
    // the claim). Schedule the *next* claim for `attempts + 1` slots out.
    const claimableAfter = nextClaimableAfter(attempts + 1);
    await jobCollection(spaceId).updateOne(
      asFilter<MediaJobDoc>({ _id: fileId }),
      asUpdate<MediaJobDoc>({
        $set: {
          status: 'pending',
          claimedAt: null,
          claimableAfter,
          lastError: safeError,
          updatedAt: now,
        },
      }),
    );
    // Pending again (behind a backoff). Announce it: the probe it triggers is cheap, and it
    // keeps the invariant simple — everything that makes a job pending marks the space.
    markSpaceMayHaveWork(spaceId);
    log.warn(`Media job ${spaceId}/${fileId} failed (attempt ${attempts}/${maxAttempts}), retry after ${claimableAfter}: ${errorMessage}`);
  } else {
    // Exhausted retries
    await jobCollection(spaceId).updateOne(
      asFilter<MediaJobDoc>({ _id: fileId }),
      asUpdate<MediaJobDoc>({
        $set: {
          status: 'failed',
          claimedAt: null,
          lastError: safeError,
          updatedAt: now,
        },
      }),
    );
    await fileCollection(spaceId).updateOne(
      asFilter<FileMetaDoc>({ _id: fileId }),
      { $set: { embeddingStatus: 'failed', mediaJobError: safeError || undefined, updatedAt: now } },
    );
    log.warn(`Media job ${spaceId}/${fileId} exhausted retries: ${errorMessage}`);
  }
}

// ── Stalled job recovery ──────────────────────────────────────────────────

/**
 * Reset jobs stuck in "processing" (e.g. after pod crash / OOM kill).
 * Called once at worker startup AND periodically by the worker loop.
 *
 * Implemented as a per-document atomic claim via findOneAndUpdate so
 * concurrent worker pods cannot double-increment the `attempts` counter
 * for the same job (which a naive updateMany would do under contention).
 * Each call resets at most `maxPerSpace` stalled jobs per space; the loop
 * runs again on the next tick if more remain.
 */
export async function resetStalledJobs(
  spaceIds: string[],
  stalledJobTimeoutMs: number,
  maxPerSpace = 100,
): Promise<void> {
  const cutoff = new Date(Date.now() - stalledJobTimeoutMs).toISOString();
  let reset = 0;

  for (const spaceId of spaceIds) {
    for (let i = 0; i < maxPerSpace; i++) {
      const now = new Date().toISOString();
      const claimed = await jobCollection(spaceId).findOneAndUpdate(
        asFilter<MediaJobDoc>({
          status: 'processing',
          claimedAt: { $lt: cutoff } as unknown as string,
        }),
        {
          // Crash-recovery: clear the backoff guard so the recovered job is
          // immediately re-claimable. Without this, a job that crashed mid-
          // execution would carry a stale future `claimableAfter` from a prior
          // failure and remain invisible to the worker until that timestamp.
          $set: { status: 'pending', claimedAt: null, claimableAfter: null, updatedAt: now },
          $inc: { attempts: 1 },
        },
        { returnDocument: 'after', sort: { claimedAt: 1 } },
      ) as MediaJobDoc | null;
      if (!claimed) break;
      // Crash-recovered jobs are immediately claimable again — re-arm the hint, otherwise the
      // claim walk would skip this space until the next full scan.
      markSpaceMayHaveWork(spaceId);
      reset++;
    }
  }

  if (reset > 0) {
    log.info(`Media worker: reset ${reset} stalled job(s) to pending`);
  }
}

// ── Cancel (on file / directory deletion) ──────────────────────────────────

/**
 * Delete the media job for a single file, if one exists. Called when the file
 * is deleted so a queued job cannot outlive its source and retry forever
 * against a path that no longer exists.
 */
export async function cancelMediaJob(spaceId: string, filePath: string): Promise<void> {
  const id = toDocId(filePath);
  await jobCollection(spaceId).deleteOne(asFilter<MediaJobDoc>({ _id: id }));
}

/**
 * Delete every media job for files under `dirPath/` — including the jobs for
 * document-conversion sidecars (`_converted/<dir>/`, `_extracted/<dir>/`), whose
 * job ids do not share the folder prefix. Called on recursive directory delete.
 */
export async function cancelMediaJobsByPrefix(spaceId: string, dirPath: string): Promise<void> {
  const dir = toDocId(dirPath).replace(/\/?$/, '');
  if (!dir) return; // guard: empty path would match everything
  const prefixes = [`${dir}/`, `_converted/${dir}/`, `_extracted/${dir}/`];
  await jobCollection(spaceId).deleteMany(
    asFilter<MediaJobDoc>({ $or: prefixes.map(p => ({ _id: { $regex: `^${escapeRegex(p)}` } })) }),
  );
}

// ── retry_embedding helper ─────────────────────────────────────────────────

/**
 * Reset a specific job for manual re-trigger via the retry_embedding endpoint.
 * Returns 'ok', 'not_found', or 'processing'.
 */
export async function retryJob(
  spaceId: string,
  fileId: string,
): Promise<'ok' | 'not_found' | 'processing'> {
  const existing = await jobCollection(spaceId).findOne(
    asFilter<MediaJobDoc>({ _id: fileId }),
  ) as MediaJobDoc | null;

  if (!existing) return 'not_found';
  if (existing.status === 'processing') return 'processing';

  const now = new Date().toISOString();
  await jobCollection(spaceId).updateOne(
    asFilter<MediaJobDoc>({ _id: fileId }),
    asUpdate<MediaJobDoc>({
      $set: {
        status: 'pending',
        attempts: 0,
        lastError: null,
        claimedAt: null,
        claimableAfter: null,
        updatedAt: now,
      },
    }),
  );
  await fileCollection(spaceId).updateOne(
    asFilter<FileMetaDoc>({ _id: fileId }),
    { $set: { embeddingStatus: 'pending', mediaJobError: undefined, updatedAt: now } },
  );
  // A manual retry must be picked up promptly — announce it, or the claim walk would not
  // probe this space until the next full scan (up to 30 s of the user staring at "pending").
  markSpaceMayHaveWork(spaceId);
  return 'ok';
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Strip internal service URLs, file paths and stack traces from error strings
 * before they are stored in `lastError` / returned to clients.
 * Logs the raw error server-side before sanitisation.
 */
function sanitiseError(raw: string): string {
  // Remove anything that looks like a URL
  let s = raw.replace(/https?:\/\/[^\s,;)]+/g, '[url]');
  // Remove Unix-style absolute paths
  s = s.replace(/\/[a-z][a-z0-9_/-]+/gi, '[path]');
  // Truncate to 200 chars to keep the field reasonable
  return s.slice(0, 200);
}
