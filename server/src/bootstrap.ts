import { log } from './util/log.js';

/**
 * Initialise space collections + indexes and start every background service a
 * configured instance needs: the webhook retry worker, sync scheduler, backup
 * scheduler, dedup scanner, stale-chunk cleanup, and the media embedding worker.
 *
 * Called from TWO places so a configured instance always ends up fully running:
 *   1. boot, when the config already exists (`!isFirstRun` in index.ts); and
 *   2. the setup route, immediately after a first-run instance is configured — so a
 *      freshly set-up instance is fully operational WITHOUT a process restart.
 *
 * A process is only ever one of those cases (a first-run boot skips this; the setup
 * route 404s once configured), so this runs exactly once per process. The config
 * must already be loaded before calling — every service below reads it.
 *
 * Structured in two phases on purpose: DB initialisation (phase 1) can hit a
 * transient error (e.g. a MongoDB replica-set election right after boot surfaces
 * "interrupted at shutdown"), and that must NOT stop the background workers (phase 2)
 * from starting. The workers tolerate a not-yet-ready DB — they retry and idle — and
 * the boot path re-runs phase 1 on the next restart, so a one-off phase-1 hiccup
 * self-heals while the instance stays operational in the meantime.
 */
export async function startConfiguredInstanceServices(): Promise<void> {
  // ── Phase 1: DB initialisation (best-effort) ──────────────────────────────
  try {
    // Ensure the built-in general space exists BEFORE initAllSpaces() so its
    // collections get created.
    const { ensureGeneralSpace, initAllSpaces, reconcilePendingSpaceOp } = await import('./spaces/spaces.js');
    await ensureGeneralSpace();
    // Complete any space rename/delete interrupted by a crash BEFORE initAllSpaces()
    // — otherwise init could recreate empty collections under the pre-rename id.
    await reconcilePendingSpaceOp();
    await initAllSpaces();

    const { initAuditCollection } = await import('./audit/audit.js');
    await initAuditCollection();

    const { initWebhookDeliveryIndexes } = await import('./webhooks/store.js');
    await initWebhookDeliveryIndexes();

    const { resetStaleWatermarksIfNeeded } = await import('./util/seq.js');
    await resetStaleWatermarksIfNeeded();
  } catch (err) {
    log.error(`Instance DB initialisation failed (background services will still start): ${err}`);
  }

  // ── Phase 2: start background services (always) ───────────────────────────
  // Synchronous, non-throwing loop/timer starters that tolerate a not-yet-ready DB,
  // so they must start regardless of any phase-1 hiccup above.
  const { startRetryWorker } = await import('./webhooks/dispatcher.js');
  startRetryWorker();

  const { startSyncScheduler } = await import('./sync/engine.js');
  startSyncScheduler();
  const { startBackupScheduler } = await import('./db/backup-scheduler.js');
  startBackupScheduler();
  const { startDupeScanner } = await import('./brain/dupe-scanner.js');
  startDupeScanner();

  const { cleanupStaleChunks } = await import('./files/chunks.js');
  cleanupStaleChunks().catch(err => log.error(`Stale chunk cleanup failed: ${err}`));

  const { startMediaEmbeddingWorker } = await import('./files/media/worker.js');
  startMediaEmbeddingWorker();
}
