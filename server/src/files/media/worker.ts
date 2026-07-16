/**
 * MediaEmbeddingWorker
 *
 * Starts an async background loop that continuously polls for pending media
 * embedding jobs across all non-proxy spaces.
 *
 * Design principles:
 * - Worker starts unconditionally at process start (never gated on `enabled`)
 * - Enqueueing is skipped at write_file time when `enabled: false`
 * - Exponential idle backoff: double poll interval on empty queue, cap at max
 * - Concurrency: up to `workerConcurrency` jobs processed in parallel per tick
 * - Stalled job recovery: reset "processing" jobs older than `stalledJobTimeoutMs`
 *
 * Behaviour when `mediaEmbedding.enabled` flips from `true` → `false`:
 *   The worker still drains any jobs that were enqueued while it was enabled.
 *   This is intentional — those uploads already incurred CPU/disk and the
 *   user expects the corresponding chunks to appear in recall results. To
 *   stop processing in flight, set `enabled: false` AND set
 *   `workerConcurrency: 0` (or restart the pod, which leaves any pending
 *   jobs in the queue for a future enable).
 *
 * Provider/worker config is hot-reloaded WITHOUT a restart. A dedicated timer
 * (`providerRefreshTimer`) re-reads the config and rebuilds the provider bundle
 * when the provider-relevant config actually changes. It runs on its own interval,
 * decoupled from the job loop *on purpose*: a job can block the loop for up to the
 * provider timeout (image 120 s, audio 300 s), and a config change — often made
 * precisely because a provider is hanging — must not have to wait for that job to
 * drain. The read is an in-memory config lookup, not a network call. Each tick
 * snapshots the current bundle for its jobs, so a job always runs against one stable
 * provider set (no mid-job swap).
 */

import { getConfig, getMediaEmbeddingConfig } from '../../config/loader.js';
import { toSafeRelPath } from '../../util/paths.js';
import { isProxySpace } from '../../spaces/proxy.js';
import type { MediaJobDoc } from '../../config/types.js';
import { log } from '../../util/log.js';
import { createMediaProviders } from './providers.js';
import type { MediaProviderBundle } from './providers.js';
import { claimNextJob, completeJob, failJob, resetStalledJobs, cancelMediaJob, currentWorkEpoch, waitForWork, wakeWorkers } from './job-queue.js';
import { embedImage } from './image-embedder.js';
import { embedAudio } from './audio-embedder.js';
import { embedVideo } from './video-embedder.js';
import { col, asFilter } from '../../db/mongo.js';
import type { FileMetaDoc } from '../../config/types.js';
import { updateFileMeta, markFileMetaDeleted } from '../file-meta.js';
import {
  runConversionPipeline,
  storeConversionResults,
  deleteConversionArtifacts,
} from '../converters/pipeline.js';
import type { ResolvedFormat } from '../converters/pipeline.js';
import { ConversionUnavailableError } from '../converters/types.js';
import fs from 'fs/promises';
import path from 'path';
import { spaceRoot } from '../sandbox.js';
import {
  mediaJobsCompletedTotal,
  mediaJobsFailedTotal,
  mediaJobsRetriedTotal,
  mediaJobDurationSeconds,
} from '../../metrics/registry.js';

let running = false;
let stalledSweepTimer: NodeJS.Timeout | null = null;
let providerRefreshTimer: NodeJS.Timeout | null = null;

/** How often the provider-refresh timer re-reads config to pick up a hot change. */
const PROVIDER_REFRESH_MS = 2_000;

/** Start the media embedding worker loop. Idempotent — safe to call multiple times. */
export function startMediaEmbeddingWorker(): void {
  if (running) return;
  running = true;
  log.info('Media embedding worker: started');
  void workerLoop();
}

/** Stop the worker loop gracefully (completes the in-flight batch). */
export function stopMediaEmbeddingWorker(): void {
  running = false;
  if (stalledSweepTimer) {
    clearInterval(stalledSweepTimer);
    stalledSweepTimer = null;
  }
  if (providerRefreshTimer) {
    clearInterval(providerRefreshTimer);
    providerRefreshTimer = null;
  }
  // The idle wait is interruptible, so wake it: otherwise a worker parked on a 30s backoff
  // would keep the process alive for up to that long after a stop request.
  wakeWorkers();
  log.info('Media embedding worker: stop requested');
}

// ── Internal ──────────────────────────────────────────────────────────────

/**
 * Signature of the provider-relevant config. Providers are rebuilt only when this
 * changes, so hot-reloading does not churn provider clients on every tick.
 */
export function providerSignature(cfg: ReturnType<typeof getMediaEmbeddingConfig>): string {
  return JSON.stringify([
    cfg.visionProvider ?? 'local',
    cfg.sttProvider ?? 'local',
    cfg.fallbackToExternal ?? false,
    cfg.vision ?? {},
    cfg.stt ?? {},
  ]);
}

// Provider bundle the worker is CURRENTLY running, plus the signature it was built
// from. Hoisted to module scope so the provider-refresh timer can rebuild them even
// while the job loop is blocked on a slow job — a hung provider call must never
// freeze config hot-reload.
let activeProviders: MediaProviderBundle | null = null;
let activeProviderSig = '';

function buildProviders(cfg: ReturnType<typeof getMediaEmbeddingConfig>): MediaProviderBundle {
  return createMediaProviders(
    cfg.vision ?? {},
    cfg.stt ?? {},
    cfg.visionProvider ?? 'local',
    cfg.sttProvider ?? 'local',
    cfg.fallbackToExternal ?? false,
  );
}

/**
 * Re-read the media config and rebuild the provider bundle if the provider-relevant
 * config changed. Cheap (an in-memory config read + a rebuild only on real change),
 * so it is safe to call on a short timer. Runs independently of the job loop.
 */
function refreshProviders(): void {
  const cfg = getMediaEmbeddingConfig();
  const sig = providerSignature(cfg);
  if (activeProviders && sig === activeProviderSig) return;
  const firstBuild = activeProviders === null;
  activeProviders = buildProviders(cfg);
  activeProviderSig = sig;
  if (!firstBuild) log.info('Media worker: provider config changed — providers reloaded');
}

/**
 * The provider signature the worker is actually running right now. Compare it
 * against `providerSignature(getMediaEmbeddingConfig())` to tell whether a saved
 * config change has been picked up yet — the refresh timer applies it on its own,
 * with no restart, even while a slow job is in flight.
 */
export function getActiveProviderSignature(): string {
  return activeProviderSig;
}

async function workerLoop(): Promise<void> {
  const startupCfg = getMediaEmbeddingConfig();
  const startupStalledTimeoutMs = startupCfg.stalledJobTimeoutMs ?? 300_000;

  let currentPollMs = startupCfg.workerPollIntervalMs ?? 1_000;

  // On startup: reset any stalled jobs (crash recovery)
  const spaceIds = getLocalSpaceIds();
  if (spaceIds.length > 0) {
    await resetStalledJobs(spaceIds, startupStalledTimeoutMs).catch(err =>
      log.warn(`Media worker: stalled job reset error: ${err instanceof Error ? err.message : String(err)}`),
    );
  }

  // Schedule periodic stalled-job sweep so a pod crash mid-job is recovered
  // even when the worker loop is otherwise idle (no new uploads). Interval is
  // half the stall timeout so a job is recovered within ~1.5× the timeout.
  // The sweep re-reads the timeout each fire so a config change is honoured; the
  // interval itself is fixed at startup (changing it would mean re-arming the timer).
  const sweepIntervalMs = Math.max(30_000, Math.floor(startupStalledTimeoutMs / 2));
  stalledSweepTimer = setInterval(() => {
    if (!running) return;
    const ids = getLocalSpaceIds();
    if (ids.length === 0) return;
    const stalledTimeoutMs = getMediaEmbeddingConfig().stalledJobTimeoutMs ?? 300_000;
    void resetStalledJobs(ids, stalledTimeoutMs).catch(err =>
      log.warn(`Media worker: periodic stalled reset error: ${err instanceof Error ? err.message : String(err)}`),
    );
  }, sweepIntervalMs);
  // Don't keep the event loop alive solely for the sweep timer
  if (typeof stalledSweepTimer.unref === 'function') stalledSweepTimer.unref();

  // Build the initial provider bundle, then keep it fresh on a dedicated timer.
  // A6: this is what makes provider config hot-reload without a restart. The timer
  // runs independently of the job loop below, so a config change is picked up even
  // while a slow job holds the loop (see the file header).
  refreshProviders();
  providerRefreshTimer = setInterval(() => {
    if (!running) return;
    refreshProviders();
  }, PROVIDER_REFRESH_MS);
  if (typeof providerRefreshTimer.unref === 'function') providerRefreshTimer.unref();

  while (running) {
    // A6: re-read the worker-tuning config every tick so an admin change via
    // PATCH /api/admin/media-config takes effect WITHOUT a restart. This is an
    // in-memory config read, not a network call, so it is cheap. (Provider config
    // is applied by the refresh timer above, not here.)
    const mediaCfg = getMediaEmbeddingConfig();
    const workerConcurrency = mediaCfg.workerConcurrency ?? 2;
    const workerPollIntervalMs = mediaCfg.workerPollIntervalMs ?? 1_000;
    const workerMaxPollIntervalMs = mediaCfg.workerMaxPollIntervalMs ?? 30_000;

    // Snapshot the current provider bundle for this tick's jobs. A job therefore
    // always runs against ONE stable provider set for its whole duration — a config
    // change mid-job can never swap the provider out from under it. The bundle is
    // guaranteed non-null: refreshProviders() ran before the loop and the timer only
    // ever replaces it.
    const jobProviders = activeProviders ?? buildProviders(mediaCfg);

    // A lowered max must take effect immediately, not only after the next reset.
    currentPollMs = Math.min(currentPollMs, workerMaxPollIntervalMs);

    // Re-read space list on each tick (handles dynamic space creation/removal)
    const activeSpaceIds = getLocalSpaceIds();

    if (activeSpaceIds.length === 0) {
      await sleep(currentPollMs);
      continue;
    }

    // Sample the work epoch BEFORE claiming. If something is enqueued while we are claiming
    // (or between the failed claim and the sleep below), the epoch moves and waitForWork()
    // returns immediately instead of letting that job wait out the whole backoff.
    const epochBeforeClaim = currentWorkEpoch();

    // Claim up to `workerConcurrency` jobs
    const claimed: MediaJobDoc[] = [];
    for (let i = 0; i < workerConcurrency; i++) {
      const job = await claimNextJob(activeSpaceIds).catch(err => {
        log.warn(`Media worker: claim error: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      });
      if (!job) break;
      claimed.push(job);
    }

    if (claimed.length === 0) {
      // Exponential backoff on an empty queue — but INTERRUPTIBLE.
      //
      // The backoff is right for CPU and wrong for latency: it stretches to
      // workerMaxPollIntervalMs (30s by default), so an upload into an idle system used to
      // wait up to 30 SECONDS before embedding even started, with the file sitting in
      // "pending" the whole time. Every path that creates claimable work already announces
      // it, so that announcement now wakes us.
      currentPollMs = Math.min(currentPollMs * 2, workerMaxPollIntervalMs);
      const wokenByWork = await waitForWork(currentPollMs, epochBeforeClaim);
      if (wokenByWork) {
        // Real work arrived — drop straight back to the fast poll interval rather than
        // carrying the idle backoff into a now-busy queue.
        currentPollMs = workerPollIntervalMs;
      }
      continue;
    }

    // Reset backoff — we have work
    currentPollMs = workerPollIntervalMs;

    // Process jobs concurrently
    await Promise.allSettled(claimed.map(job => processJob(job, jobProviders)));

    // Brief pause to prevent tight loop when constantly finding work
    await sleep(currentPollMs);
  }
}

async function processJob(
  job: MediaJobDoc,
  providers: { vision: import('./providers.js').VisionProvider; stt: import('./providers.js').SttProvider },
): Promise<void> {
  const { spaceId, filePath, mediaType, mimeType, _id: fileId, attempts, maxAttempts } = job;
  const endTimer = mediaJobDurationSeconds.startTimer({ media_type: mediaType });

  try {
    // Load file bytes from disk
    const absolutePath = resolveFilePath(spaceId, filePath);
    let fileBytes: Buffer;
    try {
      fileBytes = await fs.readFile(absolutePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // The source file is gone — it was deleted after this job was queued. Retrying can
        // never succeed, so this is TERMINAL, not a failure: reconcile to disk truth by
        // dropping the job and any orphaned metadata/artifacts, and stop (no retry, no
        // "exhausted retries" churn — that infinite loop is exactly what this avoids).
        await reconcileDeletedSource(spaceId, fileId);
        log.info(`Media worker: source file ${spaceId}/${fileId} no longer exists — removed job and orphaned metadata (no retry)`);
        return;
      }
      throw new Error(`Could not read file for embedding: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Mark file as "processing" in file meta
    const now = new Date().toISOString();
    await col<FileMetaDoc>(`${spaceId}_files`).updateOne(
      asFilter<FileMetaDoc>({ _id: fileId }),
      { $set: { embeddingStatus: 'processing', updatedAt: now } },
    ).catch(() => {}); // non-fatal — job tracking is the source of truth

    // Run the appropriate embedder
    let derivedDescription: string | undefined;
    // Final file embeddingStatus for a job that completes without retrying. Text
    // conversion may embed some chunks and fail others; a partial result is recorded
    // as 'partial' (not 'complete') so it stays visible and retry-eligible (B3).
    let fileEmbeddingStatus: 'complete' | 'partial' = 'complete';
    switch (mediaType) {
      case 'image':
        derivedDescription = await embedImage(spaceId, fileId, fileBytes, mimeType, providers.vision);
        break;
      case 'audio':
        await embedAudio(spaceId, fileId, fileBytes, mimeType, providers.stt);
        break;
      case 'video':
        await embedVideo(spaceId, fileId, fileBytes, mimeType, providers.vision, providers.stt);
        break;
      case 'text': {
        // Text/document embedding: chunk + embed the file content asynchronously.
        // Delete any stale chunks first so a re-upload always produces a clean set.
        await deleteConversionArtifacts(spaceId, fileId);
        const resolvedFmt = (job.resolvedFormat ?? 'text') as ResolvedFormat;
        const { chunks, convertedMarkdown, extractedImages } = await runConversionPipeline(
          fileBytes, filePath, resolvedFmt,
        );
        if (chunks.length > 0 || extractedImages.length > 0) {
          const { chunkCount, convertedFileId, embedFailures } = await storeConversionResults(
            spaceId, filePath, chunks, convertedMarkdown, extractedImages,
          );
          const metaUpdate: Record<string, unknown> = { chunkCount };
          if (convertedFileId) metaUpdate['convertedFileId'] = convertedFileId;
          await col<FileMetaDoc>(`${spaceId}_files`).updateOne(
            asFilter<FileMetaDoc>({ _id: fileId }),
            { $set: metaUpdate },
          ).catch(() => {});

          // Embedding outcome drives the job result (B3): a total failure throws so
          // the existing failJob → backoff → retry path handles a transient embedder
          // outage; a partial failure is recorded but not retried (the embedded chunks
          // are useful and a retry re-embeds everything).
          if (chunkCount > 0 && embedFailures === chunkCount) {
            throw new Error(`All ${chunkCount} chunk(s) failed to embed`);
          }
          if (embedFailures > 0) {
            fileEmbeddingStatus = 'partial';
            log.warn(`Media worker: ${spaceId}/${fileId} embedded with ${embedFailures}/${chunkCount} chunk failure(s) — marked partial`);
          }
        }
        break;
      }
      default:
        throw new Error(`Unknown mediaType: ${String(mediaType)}`);
    }

    // Write AI-generated caption to parent file meta description if not already set by user.
    // This also re-embeds the parent file meta so the caption is searchable on the file itself.
    if (derivedDescription) {
      const parentMeta = await col<FileMetaDoc>(`${spaceId}_files`).findOne(
        asFilter<FileMetaDoc>({ _id: fileId }),
        { projection: { description: 1 } },
      );
      if (!parentMeta?.description?.trim()) {
        await updateFileMeta(spaceId, filePath, { description: derivedDescription }).catch(err =>
          log.warn(`Media worker: failed to write caption to file meta ${spaceId}/${fileId}: ${err instanceof Error ? err.message : String(err)}`),
        );
      }
    }

    await completeJob(spaceId, fileId, fileEmbeddingStatus);
    mediaJobsCompletedTotal.labels({ space: spaceId, media_type: mediaType }).inc();
    log.info(`Media worker: completed ${mediaType} job ${spaceId}/${fileId} (${fileEmbeddingStatus})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`Media worker: job ${spaceId}/${fileId} failed: ${message}`);
    // An oversized document will never shrink — fail permanently instead of
    // burning the retry budget re-reading a file the pipeline refuses to convert.
    const permanent = err instanceof ConversionUnavailableError && err.reason === 'too_large';
    if (permanent) {
      await col<FileMetaDoc>(`${spaceId}_files`).updateOne(
        asFilter<FileMetaDoc>({ _id: fileId }),
        { $set: { embeddingStatus: 'skipped' } },
      ).catch(() => {});
    }
    if (permanent || attempts >= maxAttempts) {
      mediaJobsFailedTotal.labels({ space: spaceId, media_type: mediaType }).inc();
    } else {
      mediaJobsRetriedTotal.labels({ space: spaceId, media_type: mediaType }).inc();
    }
    await failJob(spaceId, fileId, permanent ? maxAttempts : attempts, maxAttempts, message).catch(innerErr =>
      log.warn(`Media worker: failJob error: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`),
    );
  } finally {
    endTimer();
  }
}

/**
 * Reconcile a media job whose source file has been deleted: remove the job, its
 * orphaned file-meta record, and any conversion artifacts (chunks / converted /
 * extracted). Disk is the source of truth for the file store, so a job pointing at
 * a file that no longer exists is stale and must be cleaned up, not retried.
 * Best-effort throughout — each step swallows its own error.
 */
async function reconcileDeletedSource(spaceId: string, fileId: string): Promise<void> {
  await cancelMediaJob(spaceId, fileId).catch(err =>
    log.warn(`reconcileDeletedSource: cancelMediaJob ${spaceId}/${fileId}: ${err instanceof Error ? err.message : String(err)}`),
  );
  await deleteConversionArtifacts(spaceId, fileId).catch(err =>
    log.warn(`reconcileDeletedSource: deleteConversionArtifacts ${spaceId}/${fileId}: ${err instanceof Error ? err.message : String(err)}`),
  );
  // Honour softDeleteFileMeta: flag the orphaned record for audit, or hard-remove it.
  if (getConfig().softDeleteFileMeta === true) {
    await markFileMetaDeleted(spaceId, fileId).catch(err =>
      log.warn(`reconcileDeletedSource: flag file meta ${spaceId}/${fileId}: ${err instanceof Error ? err.message : String(err)}`),
    );
  } else {
    await col<FileMetaDoc>(`${spaceId}_files`).deleteOne(asFilter<FileMetaDoc>({ _id: fileId })).catch(err =>
      log.warn(`reconcileDeletedSource: delete file meta ${spaceId}/${fileId}: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}

/** Return all local (non-proxy) space IDs. */
function getLocalSpaceIds(): string[] {
  try {
    const cfg = getConfig();
    return (cfg.spaces ?? [])
      .map(s => s.id)
      .filter(id => !isProxySpace(id));
  } catch {
    return [];
  }
}

/** Resolve the absolute file path on disk for a given space + relative path. */
function resolveFilePath(spaceId: string, filePath: string): string {
  const base = spaceRoot(spaceId);
  // Prevent path traversal: only forward-slash paths, no `..` segments
  const safe = toSafeRelPath(filePath);
  return path.join(base, safe);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
