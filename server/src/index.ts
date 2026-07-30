import { createServer } from 'http';
import { configExists, loadConfig, loadSecrets, loadSchemaLibrary, getMongoUri, flushConfig, migrateStateFilesAtRest, requireEncryptedAtRest, atRestEncryptionActive } from './config/loader.js';
import { beginShutdown } from './lifecycle.js';
import { connectMongo, closeMongo, checkVectorSearchAvailability } from './db/mongo.js';
import { createApp } from './app.js';
import { startConfiguredInstanceServices } from './bootstrap.js';
import { stopSyncScheduler } from './sync/engine.js';
import { stopBackupScheduler } from './db/backup-scheduler.js';
import { stopDupeScanner } from './brain/dupe-scanner.js';
import { cleanupStaleChunks } from './files/chunks.js';
import { log } from './util/log.js';

// Enable debug logging when --debug flag is passed or DEBUG env is already set.
if (process.argv.includes('--debug')) {
  process.env['DEBUG'] = '1';
}

const PORT = Number(process.env['PORT'] ?? 3200);

// ANSI helpers — no-op when stdout is not a TTY (e.g. piped logs)
const isTTY = process.stdout.isTTY;
const BOLD   = isTTY ? '\x1b[1m'           : '';
const ORANGE = isTTY ? '\x1b[38;5;208m'    : '';
const GREEN  = isTTY ? '\x1b[32m'          : '';
const YELLOW = isTTY ? '\x1b[33m'          : '';
const RESET  = isTTY ? '\x1b[0m'           : '';

async function main(): Promise<void> {
  const isFirstRun = !configExists();

  if (!isFirstRun) {
    // At-rest encryption (PR-S2): if a master secret is configured, transparently encrypt any
    // still-plaintext state file in place BEFORE loading (round-trip verified; no plaintext left).
    migrateStateFilesAtRest();
    loadConfig();
    loadSecrets();
    loadSchemaLibrary();

    // Strict mode: refuse to boot if encryption-at-rest is required but no master secret is set.
    if (requireEncryptedAtRest() && !atRestEncryptionActive()) {
      console.error(
        `\n${YELLOW}  ✗ FATAL${RESET}  requireEncryptedAtRest is set but no master secret is configured.\n` +
        `     Set YTHRIL_MASTER_KEY (32 bytes, base64/hex) or YTHRIL_MASTER_PASSPHRASE, or disable\n` +
        `     requireEncryptedAtRest. Refusing to start with unencrypted state files.\n`,
      );
      process.exit(1);
    }

    // NOTE: tokens created before the `prefix` field existed are NOT deleted.
    // findMatchingToken() verifies them via a fallback bcrypt scan and backfills
    // the prefix on first use (self-healing migration), so upgrading no longer
    // silently invalidates existing PATs.

    // Ensure this instance has a persistent Ed25519 signing keypair for governance
    // vote signatures. Generated once (no-op on subsequent boots).
    {
      const { ensureInstanceKeypair } = await import('./util/signing.js');
      ensureInstanceKeypair();
    }

    // Aggregate security-posture report (PR-S3): one PASS/WARN/FAIL view over transport (S1), at-rest
    // (S2), and MongoDB auth. Advisory by default; `security.strict` aborts boot on any FAIL.
    {
      const { computeSecurityPosture, formatPostureLines, securityStrict } = await import('./config/security-posture.js');
      const posture = computeSecurityPosture();
      const issues = posture.checks.filter(c => c.level !== 'pass');
      if (issues.length === 0) {
        console.log(`  ${GREEN}✓${RESET} security posture: all checks passed`);
      } else {
        console.warn(`\n${YELLOW}  security posture — review the following:${RESET}`);
        for (const line of formatPostureLines({ checks: issues, worst: posture.worst })) console.warn(line);
        console.warn('');
      }
      if (securityStrict() && posture.worst === 'fail') {
        console.error(`  ${YELLOW}✗ FATAL${RESET}  security.strict is on and the posture has FAIL findings above. Refusing to start.\n`);
        process.exit(1);
      }
    }
  }

  // Always connect to MongoDB — needed on first run so the setup route can
  // initialise the general space immediately after writing the config.
  await connectMongo();

  // Validate $vectorSearch support and log the result.
  {
    const uri = getMongoUri();
    const safeUri = uri.replace(/\/\/.*@/, '//[credentials]@');
    log.debug(`Checking $vectorSearch support on ${safeUri}`);
    const vsCheck = await checkVectorSearchAvailability();
    if (vsCheck.available) {
      console.log(`  ${GREEN}✓${RESET} $vectorSearch available (${vsCheck.details})`);
    } else {
      console.log(`  ${YELLOW}✗${RESET} $vectorSearch not available (${vsCheck.details}) — semantic search (recall) will be disabled`);
      console.log(`    Upgrade to MongoDB 8.2+, use Atlas Local, or connect to managed Atlas`);
    }
  }

  if (!isFirstRun) {
    // Initialise spaces/indexes and start all background services. On a FIRST-run
    // boot this is skipped (config isn't written yet) — the setup route calls the
    // same function once it writes the config, so a freshly set-up instance is fully
    // operational without a restart. See startConfiguredInstanceServices().
    await startConfiguredInstanceServices();
  }

  const { warnRateLimitBypass } = await import('./rate-limit/middleware.js');
  warnRateLimitBypass();

  // Surface an opted-in cross-origin embedding allowlist at boot — framing + theming
  // rights are being granted to those origins, so make that visible in the logs.
  if (!isFirstRun) {
    const { warnIfEmbeddingEnabled } = await import('./config/embed.js');
    warnIfEmbeddingEnabled();
  }

  const app = createApp();
  const server = createServer(app);

  // Periodic stale-chunk cleanup (every hour)
  const chunkCleanupInterval = setInterval(
    () => cleanupStaleChunks().catch(err => log.error(`Stale chunk cleanup failed: ${err}`)),
    60 * 60 * 1000,
  );
  chunkCleanupInterval.unref(); // don't block shutdown

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('');
    if (isFirstRun) {
      console.log(`  ${BOLD}ythril${RESET}  ·  first-run setup required`);
      console.log('');
      console.log(`  Open ${url} to get started`);
      console.log('');
    } else {
      console.log(`  ${BOLD}ythril${RESET}  ${GREEN}✓ ready${RESET}  ·  ${url}`);
      console.log('');
    }
  });

  /**
   * How long in-flight requests get to finish before they are cut off.
   *
   * Under Docker's default `stop` grace period the process is SIGKILLed 10 s after SIGTERM, so the
   * whole drain has to finish inside that or it accomplishes nothing. Eight seconds leaves room for the
   * config flush and the Mongo close that follow. Kubernetes' default is 30 s, so this is the tighter
   * of the two constraints; raise `SHUTDOWN_DRAIN_MS` if your orchestrator gives you longer.
   */
  const DRAIN_MS = Number(process.env['SHUTDOWN_DRAIN_MS'] ?? 8_000);

  /**
   * How long to keep serving after readiness starts reporting false, before the drain begins.
   *
   * Long enough for an orchestrator's readiness probe to fire and take this instance out of rotation.
   * Kubernetes' default `periodSeconds` is 10, so a value below that means some probes never see the
   * change; 2 s is a compromise that helps a typical setup without stalling every restart. Set it to 0
   * on a single-instance deployment — there is no load balancer to inform, so the wait is pure delay.
   *
   * Comes out of the same budget as DRAIN_MS: both must fit inside the orchestrator's stop grace.
   */
  const READY_GRACE_MS = Number(process.env['SHUTDOWN_READY_GRACE_MS'] ?? 2_000);

  let shuttingDown = false;

  /**
   * Graceful shutdown that actually drains.
   *
   * `server.close()` is asynchronous — it stops accepting new connections and calls back once the
   * existing ones have finished. It used to be called without being awaited, so the lines after it ran
   * immediately: Mongo was closed and `process.exit(0)` fired while requests were still running. A
   * container restart during a file upload or a brain write would tear the database connection out from
   * under it mid-write, and the process would report success on the way out.
   *
   * Now the close is awaited, bounded by DRAIN_MS. A connection that has not finished by then is forced
   * shut rather than allowed to hold the shutdown open — an idle keep-alive socket would otherwise keep
   * the process alive until the orchestrator SIGKILLs it, turning a graceful stop into a hard one.
   */
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;      // a second SIGTERM must not race the first through this
    shuttingDown = true;
    log.debug(`${signal} received — shutting down`);

    // Step one, before anything is torn down: stop advertising readiness, then give the orchestrator a
    // moment to notice and route elsewhere. Without this the drain below is only half the job — it
    // finishes the requests already running while new ones keep arriving over established keep-alive
    // connections, and those die at exit. Zero on a single-instance deployment, where there is no load
    // balancer to inform and the wait is pure delay.
    beginShutdown();
    if (READY_GRACE_MS > 0) await new Promise(r => setTimeout(r, READY_GRACE_MS));

    stopSyncScheduler();
    stopBackupScheduler();
    stopDupeScanner();
    const { stopRetryWorker } = await import('./webhooks/dispatcher.js');
    stopRetryWorker();

    await new Promise<void>(resolve => {
      const forced = setTimeout(() => {
        log.warn(`Shutdown: connections still open after ${DRAIN_MS}ms — closing them`);
        server.closeAllConnections();
        resolve();
      }, DRAIN_MS);
      forced.unref();
      server.close(() => { clearTimeout(forced); log.debug('HTTP server closed'); resolve(); });
    });

    // Only now is nothing mid-request. Persist coalesced config writes (sync watermarks), then drop
    // the database connection.
    await flushConfig();
    await closeMongo();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Crash handlers — catch unhandled rejections/exceptions so they are logged
  // instead of silently killing the process.
  process.on('unhandledRejection', (reason, promise) => {
    log.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    console.error('UNHANDLED REJECTION:', reason);
  });
  process.on('uncaughtException', (err) => {
    log.error(`Uncaught exception: ${err.stack ?? err}`);
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
