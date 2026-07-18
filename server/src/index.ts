import { createServer } from 'http';
import os from 'os';
import { configExists, loadConfig, loadSecrets, loadSchemaLibrary, getMongoUri, flushConfig, migrateStateFilesAtRest, requireEncryptedAtRest, atRestEncryptionActive } from './config/loader.js';
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

    // TLS warning: if non-loopback binding and plaintext allowed
    const { getConfig } = await import('./config/loader.js');
    const cfg = getConfig();
    if (cfg.allowInsecurePlaintext) {
      const ifaces = Object.values(os.networkInterfaces()).flat();
      const hasExternal = ifaces.some(
        iface => iface && !iface.internal && iface.family === 'IPv4',
      );
      if (hasExternal) {
        console.warn(
          `\n${YELLOW}  ⚠  WARNING${RESET}  allowInsecurePlaintext is true and this host has external\n` +
          `     network interfaces. All traffic (including tokens) is unencrypted.\n` +
          `     Deploy behind TLS termination (Nginx/Caddy/ingress) in production.\n`,
        );
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

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.debug(`${signal} received — shutting down`);
    stopSyncScheduler();
    stopBackupScheduler();
    stopDupeScanner();
    const { stopRetryWorker } = await import('./webhooks/dispatcher.js');
    stopRetryWorker();
    server.close(() => log.debug('HTTP server closed'));
    // Persist any coalesced config writes (sync watermarks) before exit.
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
