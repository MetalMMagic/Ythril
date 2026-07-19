import fs from 'node:fs';
import path from 'node:path';
import { log } from '../util/log.js';
import type { Config, SecretsFile, SchemaLibraryEntry, SchemaCatalog } from './types.js';
import { resolveMasterSecret, isEnvelope, encryptEnvelope, decryptEnvelope } from './secretbox.js';

const CONFIG_PATH = process.env['CONFIG_PATH'] ?? '/config/config.json';
const SECRETS_PATH = path.join(path.dirname(CONFIG_PATH), 'secrets.json');
const SCHEMA_LIB_PATH = path.join(path.dirname(CONFIG_PATH), 'schema-library.json');
const SCHEMA_CATALOGS_PATH = path.join(path.dirname(CONFIG_PATH), 'schema-catalogs.json');

let _config: Config | null = null;
let _secrets: SecretsFile | null = null;

// ── File permission check ──────────────────────────────────────────────────

function checkPermissions(filePath: string): void {
  // Windows does not support Unix-style DAC file permissions — skip check.
  if (process.platform === 'win32') return;
  try {
    const stat = fs.statSync(filePath);
    const mode = stat.mode & 0o777;
    if (mode & 0o077) {
      // On Docker with Windows-hosted volumes (WSL2 bind mounts), all files
      // appear as 0o777 regardless of intended permissions.  Detect this by
      // checking whether the directory itself is also 0o777 — if so, we are
      // on a Windows volume mount; silently fix the file permissions and continue.
      const dirStat = fs.statSync(path.dirname(filePath));
      const dirMode = dirStat.mode & 0o777;
      if (dirMode & 0o002) {
        // Directory is world-writable — almost certainly a Docker/WSL2 Windows
        // volume mount.  Fix the file permissions so future restarts won't re-trigger.
        try { fs.chmodSync(filePath, 0o600); } catch { /* best-effort */ }
        return;
      }
      // If this process owns the file (common in Kubernetes hostPath mounts where
      // an init container writes the file as the same UID), auto-fix permissions
      // and continue with a warning rather than exiting.
      // process.getuid is not available on Windows, but we return early above for
      // win32, so this guard handles any other exotic platform that lacks UID support.
      // Use -1 as a sentinel: stat.uid is always >= 0, so the condition never matches.
      const processUid = typeof process.getuid === 'function' ? process.getuid() : -1;
      if (processUid !== -1 && stat.uid === processUid) {
        try {
          fs.chmodSync(filePath, 0o600);
          log.warn(
            `SECURITY: ${filePath} had loose permissions (mode ${mode.toString(8)}); ` +
            `auto-fixed to 0600.`,
          );
          return;
        } catch { /* fall through to hard exit if chmod fails */ }
      }
      log.error(
        `SECURITY: ${filePath} is world/group-readable (mode ${mode.toString(8)}). ` +
        `Fix with: chmod 600 ${filePath}`,
      );
      process.exit(1);
    }
  } catch {
    // file doesn't exist yet — fine
  }
}

// ── Config ─────────────────────────────────────────────────────────────────

/** Fail-fast validation for the OIDC block — called on every config load/reload. */
function validateOidcBlock(cfg: Config): void {
  const oidc = cfg.oidc;
  if (!oidc || !oidc.enabled) return; // disabled or absent — nothing to validate
  if (!oidc.issuerUrl || typeof oidc.issuerUrl !== 'string') {
    throw new Error('oidc.enabled is true but oidc.issuerUrl is missing or not a string');
  }
  if (!oidc.clientId || typeof oidc.clientId !== 'string') {
    throw new Error('oidc.enabled is true but oidc.clientId is missing or not a string');
  }
  try {
    const parsed = new URL(oidc.issuerUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('oidc.issuerUrl must use http or https');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('oidc.')) throw err;
    throw new Error(`oidc.issuerUrl is not a valid URL: ${oidc.issuerUrl}`);
  }
  if (oidc.audience !== undefined && typeof oidc.audience !== 'string') {
    throw new Error('oidc.audience must be a string when provided');
  }
  if (oidc.scopes !== undefined) {
    if (!Array.isArray(oidc.scopes) || oidc.scopes.some(s => typeof s !== 'string')) {
      throw new Error('oidc.scopes must be an array of strings when provided');
    }
  }
}

// ── At-rest encryption (PR-S2) ─────────────────────────────────────────────
// The state files are transparently encrypted when a master secret is configured
// (YTHRIL_MASTER_KEY / YTHRIL_MASTER_PASSPHRASE). Detection is by envelope marker, so plaintext files
// keep working (back-compat) and are migrated in place by migrateStateFilesAtRest() at boot.

const STATE_FILES = [CONFIG_PATH, SECRETS_PATH, SCHEMA_LIB_PATH, SCHEMA_CATALOGS_PATH];

/** Decrypt if the raw file is an envelope; pass through if plaintext. Throws (never returns ciphertext)
 *  when a file is encrypted but the master secret is missing or wrong — the caller turns that into a
 *  hard boot failure rather than silently starting with unreadable/empty state. */
function decodeStateFile(raw: string, label: string): string {
  if (!isEnvelope(raw)) return raw;
  const secret = resolveMasterSecret();
  if (!secret) {
    throw new Error(`${label} is encrypted at rest but no master secret is configured — set YTHRIL_MASTER_KEY or YTHRIL_MASTER_PASSPHRASE`);
  }
  try {
    return decryptEnvelope(raw, secret);
  } catch (err) {
    throw new Error(`Failed to decrypt ${label} (wrong master secret or corrupt file): ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Encrypt for writing when a master secret is configured; otherwise write plaintext. */
function encodeStateFile(serialized: string): string {
  const secret = resolveMasterSecret();
  return secret ? encryptEnvelope(serialized, secret) : serialized;
}

/** True when at-rest encryption is currently active (a master secret is configured). */
export function atRestEncryptionActive(): boolean {
  return resolveMasterSecret() !== null;
}

/** Whether the operator requires state files to be encrypted at rest (env → config → default false). */
export function requireEncryptedAtRest(): boolean {
  if (process.env['YTHRIL_REQUIRE_ENCRYPTED_AT_REST'] === 'true') return true;
  try { return getConfig().requireEncryptedAtRest === true; } catch { return false; }
}

/**
 * Encrypt any still-plaintext state file in place when a master secret is configured (upgrade path).
 * Each migration is round-trip verified before the atomic replace, and no plaintext copy is left behind.
 * Idempotent: already-encrypted files are skipped. Call once at boot BEFORE loadConfig().
 */
export function migrateStateFilesAtRest(): void {
  const secret = resolveMasterSecret();
  if (!secret) return;
  for (const p of STATE_FILES) {
    let raw: string;
    try {
      if (!fs.existsSync(p)) continue;
      raw = fs.readFileSync(p, 'utf8');
    } catch (err) {
      throw new Error(`At-rest migration: cannot read ${path.basename(p)}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!raw.trim() || isEnvelope(raw)) continue; // empty or already encrypted
    const enc = encryptEnvelope(raw, secret);
    if (decryptEnvelope(enc, secret) !== raw) {
      throw new Error(`At-rest migration: round-trip verification failed for ${path.basename(p)} — leaving it unchanged`);
    }
    const tmp = p + '.enc.tmp';
    fs.writeFileSync(tmp, enc, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, p);
    try { fs.chmodSync(p, 0o600); } catch { /* non-POSIX host */ }
    log.info(`Encrypted ${path.basename(p)} at rest`);
  }
}

export function configExists(): boolean {
  if (!fs.existsSync(CONFIG_PATH)) return false;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8').trim();
    return raw.length > 0 && JSON.parse(raw) !== null;
  } catch {
    return false;
  }
}

export function loadConfig(): Config {
  checkPermissions(CONFIG_PATH);
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(decodeStateFile(raw, 'config.json')) as Config;
  // Normalise arrays that may be absent in partial config files written before
  // first-run setup completes (e.g. a config pre-seeded with only storage quotas).
  parsed.spaces ??= [];
  parsed.tokens ??= [];
  parsed.networks ??= [];
  _config = parsed;
  validateOidcBlock(_config);
  return _config;
}

/**
 * Read config.json from disk and update the in-memory config.
 *
 * Unlike loadConfig(), this function does NOT call checkPermissions() first —
 * it tolerates a temporarily mis-permissioned file and corrects it via
 * chmodSync only (without rewriting the file contents).
 *
 * IMPORTANT: we must NOT call saveConfig() here.  On Docker Desktop
 * (Windows / macOS) the host-side bind-mount write may not have propagated to
 * the container yet by the time the reload request arrives.  If we read the
 * stale container view and then rewrite the file, we permanently overwrite the
 * operator's change.  Instead we only fix the permission bits in-place and
 * update _config in memory.  A subsequent reload (or the test retry loop) will
 * converge once the bind-mount delivers the latest version.
 */
export function reloadConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  let parsed: Config;
  try {
    parsed = JSON.parse(decodeStateFile(raw, 'config.json')) as Config;
  } catch (err) {
    log.error(`reloadConfig: config.json has invalid JSON — keeping current config: ${err}`);
    throw new Error('config.json contains invalid JSON; current configuration unchanged');
  }
  // Normalise arrays that may be absent in partial config files.
  parsed.spaces ??= [];
  parsed.tokens ??= [];
  parsed.networks ??= [];
  validateOidcBlock(parsed);
  _config = parsed;
  // Fix permission bits without rewriting content — avoids overwriting a
  // host-side edit that hasn't propagated through the bind-mount yet.
  try { fs.chmodSync(CONFIG_PATH, 0o600); } catch { /* non-POSIX host — ignore */ }
  return parsed;
}

export function getConfig(): Config {
  if (!_config) throw new Error('Config not loaded — call loadConfig() first');
  return _config;
}

// ── Config persistence ───────────────────────────────────────────────────────
// Two write paths share config.json:
//   • saveConfig()      — durable & synchronous. Used by every correctness- or
//                         security-critical mutation (tokens, spaces, networks,
//                         setup). Behaviour is unchanged: the change is on disk
//                         before the call returns.
//   • saveConfigSoon()  — coalesced & asynchronous. Used ONLY by the sync engine
//                         hot path (P2), which persists tiny bookkeeping fields —
//                         pull/push watermarks, per-member failure counters,
//                         lastSyncAt — dozens to hundreds of times per cycle. Done
//                         synchronously, each was a whole-file write that blocked
//                         the event loop and stalled all request handling. These
//                         fields are runtime state, not configuration: losing the
//                         last few on a crash is harmless (watermarks re-derive by
//                         seq on the next pull, counters are cosmetic), so they are
//                         safe to flush lazily off the event loop.
//
// A monotonic generation counter lets the two paths coexist without a torn or
// stale write: every in-memory mutation bumps `_writeGeneration`; the async
// flush records the generation it commits, and a synchronous durable write that
// lands a newer generation mid-flush causes the async flush to discard its
// now-stale snapshot instead of clobbering the fresher on-disk copy.

let _writeGeneration = 0;   // bumped on every in-memory config mutation via save*
let _flushedGeneration = 0; // highest generation already durably on disk
let _flushScheduled = false;
let _flushChain: Promise<void> = Promise.resolve();

export function saveConfig(config: Config): void {
  _config = config;
  const gen = ++_writeGeneration;
  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  // Atomic write: write to temp file then rename
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, encodeStateFile(JSON.stringify(config, null, 2)), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, CONFIG_PATH);
  // Ensure permissions after write
  fs.chmodSync(CONFIG_PATH, 0o600);
  if (gen > _flushedGeneration) _flushedGeneration = gen;
}

/**
 * Persist config.json off the event loop, coalescing bursts. For the sync
 * engine's high-frequency bookkeeping writes only — see the header above.
 * Returns immediately; the write lands on a later tick.
 */
export function saveConfigSoon(config: Config): void {
  _config = config;
  _writeGeneration++;
  if (_flushScheduled) return; // a flush is already queued — it will pick up the latest state
  _flushScheduled = true;
  setImmediate(() => {
    _flushScheduled = false;
    // Serialize writes so two flushes never race on the temp file.
    _flushChain = _flushChain
      .catch(() => { /* a prior flush failure must not break the chain */ })
      .then(() => writeConfigAsync())
      .catch(err => log.error(`Async config flush failed: ${err}`));
  });
}

/** Atomically write the current in-memory config, unless a newer durable write
 *  has already superseded the snapshot we captured. Uses a distinct temp file so
 *  it never collides with saveConfig()'s synchronous write. */
async function writeConfigAsync(): Promise<void> {
  const gen = _writeGeneration;
  const config = _config;
  if (!config || gen <= _flushedGeneration) return; // nothing new to persist
  const snapshot = encodeStateFile(JSON.stringify(config, null, 2));
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const tmp = CONFIG_PATH + '.async.tmp';
  await fs.promises.writeFile(tmp, snapshot, { encoding: 'utf8', mode: 0o600 });
  // A synchronous durable write may have landed a newer generation while we were
  // writing — if so our snapshot is stale, so discard it rather than clobber disk.
  if (_flushedGeneration >= gen) {
    await fs.promises.unlink(tmp).catch(() => { /* already gone */ });
    return;
  }
  await fs.promises.rename(tmp, CONFIG_PATH);
  try { await fs.promises.chmod(CONFIG_PATH, 0o600); } catch { /* non-POSIX host — ignore */ }
  if (gen > _flushedGeneration) _flushedGeneration = gen;
}

/**
 * Flush any pending coalesced config write to disk and wait for it. Call on
 * graceful shutdown so the last watermarks are persisted before exit.
 */
export async function flushConfig(): Promise<void> {
  await _flushChain.catch(() => { /* logged at the flush site */ });
  // A saveConfigSoon may have run after the last scheduled flush started — make a
  // final durable pass if anything is still unwritten.
  if (_config && _writeGeneration > _flushedGeneration) {
    saveConfig(_config);
  }
}

// ── Secrets ────────────────────────────────────────────────────────────────

export function loadSecrets(): SecretsFile {
  checkPermissions(SECRETS_PATH);
  if (!fs.existsSync(SECRETS_PATH)) {
    // Pre-setup: no secrets file yet — return empty shell
    _secrets = { peerTokens: {} };
    return _secrets;
  }
  const raw = fs.readFileSync(SECRETS_PATH, 'utf8');
  _secrets = JSON.parse(decodeStateFile(raw, 'secrets.json')) as SecretsFile;
  return _secrets;
}

export function getSecrets(): SecretsFile {
  if (!_secrets) return loadSecrets();
  return _secrets;
}

export function saveSecrets(secrets: SecretsFile): void {
  _secrets = secrets;
  fs.mkdirSync(path.dirname(SECRETS_PATH), { recursive: true });
  const tmp = SECRETS_PATH + '.tmp';
  fs.writeFileSync(tmp, encodeStateFile(JSON.stringify(secrets, null, 2)), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, SECRETS_PATH);
  fs.chmodSync(SECRETS_PATH, 0o600);
}

// ── Schema Library ─────────────────────────────────────────────────────────

let _schemaLibrary: SchemaLibraryEntry[] | null = null;

/**
 * Load schema-library.json from disk. Returns an empty array if the file
 * does not exist yet (first run before any entry is created).
 */
export function loadSchemaLibrary(): SchemaLibraryEntry[] {
  if (!fs.existsSync(SCHEMA_LIB_PATH)) {
    _schemaLibrary = [];
    return _schemaLibrary;
  }
  try {
    checkPermissions(SCHEMA_LIB_PATH);
    const raw = fs.readFileSync(SCHEMA_LIB_PATH, 'utf8');
    _schemaLibrary = JSON.parse(decodeStateFile(raw, 'schema-library.json')) as SchemaLibraryEntry[];
  } catch (err) {
    log.warn(`schema-library.json could not be loaded — treating as empty: ${err}`);
    _schemaLibrary = [];
  }
  return _schemaLibrary;
}

/** Return the in-memory schema library, loading from disk if not yet loaded. */
export function getSchemaLibrary(): SchemaLibraryEntry[] {
  if (!_schemaLibrary) return loadSchemaLibrary();
  return _schemaLibrary;
}

/** Atomically persist the schema library to disk. */
export function saveSchemaLibrary(entries: SchemaLibraryEntry[]): void {
  _schemaLibrary = entries;
  fs.mkdirSync(path.dirname(SCHEMA_LIB_PATH), { recursive: true });
  const tmp = SCHEMA_LIB_PATH + '.tmp';
  fs.writeFileSync(tmp, encodeStateFile(JSON.stringify(entries, null, 2)), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, SCHEMA_LIB_PATH);
  try { fs.chmodSync(SCHEMA_LIB_PATH, 0o600); } catch { /* non-POSIX — ignore */ }
}

// ── Schema catalogs ────────────────────────────────────────────────────────

let _schemaCatalogs: SchemaCatalog[] | null = null;

/** Load schema-catalogs.json from disk. Returns empty array if not found. */
export function loadSchemaCatalogs(): SchemaCatalog[] {
  if (!fs.existsSync(SCHEMA_CATALOGS_PATH)) {
    _schemaCatalogs = [];
    return _schemaCatalogs;
  }
  try {
    checkPermissions(SCHEMA_CATALOGS_PATH);
    const raw = fs.readFileSync(SCHEMA_CATALOGS_PATH, 'utf8');
    _schemaCatalogs = JSON.parse(decodeStateFile(raw, 'schema-catalogs.json')) as SchemaCatalog[];
  } catch (err) {
    log.warn(`schema-catalogs.json could not be loaded — treating as empty: ${err}`);
    _schemaCatalogs = [];
  }
  return _schemaCatalogs;
}

/** Return the in-memory catalog list, loading from disk if not yet loaded. */
export function getSchemaCatalogs(): SchemaCatalog[] {
  if (!_schemaCatalogs) return loadSchemaCatalogs();
  return _schemaCatalogs;
}

/** Atomically persist the catalog list to disk. */
export function saveSchemaCatalogs(catalogs: SchemaCatalog[]): void {
  _schemaCatalogs = catalogs;
  fs.mkdirSync(path.dirname(SCHEMA_CATALOGS_PATH), { recursive: true });
  const tmp = SCHEMA_CATALOGS_PATH + '.tmp';
  fs.writeFileSync(tmp, encodeStateFile(JSON.stringify(catalogs, null, 2)), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, SCHEMA_CATALOGS_PATH);
  try { fs.chmodSync(SCHEMA_CATALOGS_PATH, 0o600); } catch { /* non-POSIX — ignore */ }
}

// ── Defaults ───────────────────────────────────────────────────────────────

export function getEmbeddingConfig() {
  const cfg = getConfig();
  // No baseUrl in the default = use the bundled local ONNX model.
  // Set baseUrl in config.json to override with an HTTP endpoint (e.g. Ollama).
  return cfg.embedding ?? {
    model: 'nomic-ai/nomic-embed-text-v1.5',
    dimensions: 768,
    similarity: 'cosine' as const,
  };
}

export function getMongoUri(): string {
  const cfg = _config;
  // An explicit URI always wins — infra-managed deployments (managed Atlas, an existing
  // cluster) must be able to override, and they carry their own credentials.
  const explicit = process.env['MONGO_URI'] ?? cfg?.mongo?.uri;
  if (explicit) return explicit;

  // Otherwise we are talking to the BUNDLED `ythril-mongo` container. If the operator
  // supplied credentials for it, authenticate — the bundled database is unauthenticated
  // by default, which means anything that can reach port 27017 can read and rewrite every
  // space, bypassing tokens, space scoping and the audit log entirely (see S7).
  //
  // Credentials are optional so that EXISTING installs keep working: MongoDB cannot have
  // auth switched on in place (the Atlas Local image only provisions the replica-set
  // keyfile on a first init), so an existing database must be migrated deliberately.
  const user = process.env['MONGO_USERNAME'];
  const pass = process.env['MONGO_PASSWORD'];
  if (user && pass) {
    // Percent-encode: a password may legitimately contain `@`, `:`, `/` etc., which would
    // otherwise be parsed as URI delimiters and produce a confusing connection failure.
    const creds = `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
    return `mongodb://${creds}@ythril-mongo:27017/ythril?directConnection=true&authSource=admin`;
  }

  return 'mongodb://ythril-mongo:27017/ythril?directConnection=true';
}

export function getDataRoot(): string {
  return process.env['DATA_ROOT'] ?? '/data';
}

// ── Media Embedding Config ─────────────────────────────────────────────────

import type { MediaEmbeddingConfig, MediaProviderConfig, FaceRecognitionConfig, DocumentProcessingConfig } from './types.js';

const MEDIA_EMBEDDING_DEFAULTS: Required<Omit<MediaEmbeddingConfig, 'vision' | 'stt' | 'ollamaUrl' | 'visionModel' | 'whisperUrl' | 'whisperModel' | 'lockedByInfra' | 'faceRecognition' | 'documentProcessing'>> = {
  // Enabled by default: both K8s manifests (kubernetes/manifests/ollama-deploy.yaml,
  // whisper-deploy.yaml) and the workstation docker-compose.yml ship with bundled
  // ollama + whisper services. The default `vision.baseUrl` / `stt.baseUrl` resolve
  // in both environments via the short service name (Docker bridge DNS in compose;
  // ClusterFirst DNS in the `ythril` namespace in K8s).
  enabled: true,
  visionProvider: 'local',
  sttProvider: 'local',
  workerConcurrency: 2,
  workerPollIntervalMs: 1000,
  workerMaxPollIntervalMs: 30_000,
  fallbackToExternal: false,
  maxFileSizeBytes: 524_288_000, // 500 MiB
  stalledJobTimeoutMs: 300_000,  // 5 min
};

/**
 * Default media size cap (500 MiB). Single source for the fallback used when a resolved config
 * omits `maxFileSizeBytes` — previously hand-copied as the `524_288_000` literal in three dispatch
 * sites.
 */
export const DEFAULT_MEDIA_MAX_FILE_SIZE_BYTES = MEDIA_EMBEDDING_DEFAULTS.maxFileSizeBytes;

/**
 * Resolve the full media embedding configuration by merging:
 *   1. Environment variables (highest precedence)
 *   2. config.json `mediaEmbedding` block
 *   3. Built-in defaults (lowest precedence)
 *
 * Populates `lockedByInfra` with any key whose effective value came from an
 * env var — the Settings UI uses this list to render those fields as read-only.
 */
/** Correct the invalid Ollama model name `moondream2` (which 404s on pull) to the
 *  real registry name `moondream`. Applied to the resolved vision model from any
 *  source so installs that saved the bad name keep working after the fix. */
function normalizeVisionModel(model: string): string {
  return model === 'moondream2' ? 'moondream' : model;
}

export function getMediaEmbeddingConfig(): MediaEmbeddingConfig {
  const cfg = getConfig();
  const base = cfg.mediaEmbedding ?? {};
  const locked: string[] = [];

  function pick<T>(envKey: string, fieldName: string, configVal: T | undefined, defaultVal: T): T {
    const envRaw = process.env[envKey];
    if (envRaw !== undefined) {
      // Use the explicit field name so the UI's `isLocked('fallbackToExternal')`
      // check matches — derived camelCase (e.g. `mediaEmbeddingFallbackToExternal`)
      // would silently NOT lock the UI control.
      locked.push(fieldName);
      // numeric coercion
      if (typeof defaultVal === 'number') return Number(envRaw) as T;
      // boolean coercion
      if (typeof defaultVal === 'boolean') return (envRaw === 'true' || envRaw === '1') as unknown as T;
      return envRaw as unknown as T;
    }
    return configVal !== undefined ? configVal : defaultVal;
  }

  const enabled = pick('MEDIA_EMBEDDING_ENABLED', 'enabled', base.enabled, MEDIA_EMBEDDING_DEFAULTS.enabled);
  const visionProvider = pick('VISION_PROVIDER', 'visionProvider', base.visionProvider, MEDIA_EMBEDDING_DEFAULTS.visionProvider) as 'local' | 'external';
  const sttProvider = pick('STT_PROVIDER', 'sttProvider', base.sttProvider, MEDIA_EMBEDDING_DEFAULTS.sttProvider) as 'local' | 'external';

  // Vision provider block — each sub-field has its own env var
  const visionBaseUrlEnv = process.env['OLLAMA_URL'];
  const visionModelEnv = process.env['VISION_MODEL'];
  const visionApiKeyEnv = process.env['VISION_API_KEY'];
  // API keys: env var > secrets.json > legacy config.json (deprecated)
  let mediaSecrets: { visionApiKey?: string; sttApiKey?: string } = {};
  try { mediaSecrets = getSecrets().mediaEmbedding ?? {}; } catch { /* secrets file may not exist pre-setup */ }
  const vision: MediaProviderConfig = {
    baseUrl: visionBaseUrlEnv
      ?? base.vision?.baseUrl
      ?? base.ollamaUrl
      // Short service name resolves in both:
      //  - Docker Compose: bridge-network DNS to the `ollama` service
      //  - K8s: ClusterFirst DNS within the `ythril` namespace
      ?? 'http://ollama:11434',
    // `moondream` is the correct Ollama registry name; `moondream2` does not exist
    // there (a pull 404s), which silently broke bundled image captioning. Normalise
    // the invalid legacy name from ANY source (env / saved config) so existing installs
    // self-heal without a config-file migration.
    model: normalizeVisionModel(
      visionModelEnv ?? base.vision?.model ?? base.visionModel ?? 'moondream',
    ),
    apiKey: visionApiKeyEnv ?? mediaSecrets.visionApiKey ?? base.vision?.apiKey,
    label: base.vision?.label ?? 'Vision provider (Ollama-compatible)',
  };
  if (visionBaseUrlEnv) locked.push('vision.baseUrl');
  if (visionModelEnv) locked.push('vision.model');
  if (visionApiKeyEnv) locked.push('vision.apiKey');

  // STT provider block
  const sttBaseUrlEnv = process.env['WHISPER_URL'];
  const sttModelEnv = process.env['WHISPER_MODEL'];
  const sttApiKeyEnv = process.env['STT_API_KEY'];
  const stt: MediaProviderConfig = {
    baseUrl: sttBaseUrlEnv
      ?? base.stt?.baseUrl
      ?? base.whisperUrl
      // Short service name — resolves in both Docker Compose and the K8s `ythril` namespace.
      ?? 'http://whisper:8000',
    model: sttModelEnv
      ?? base.stt?.model
      ?? base.whisperModel
      ?? 'base',
    apiKey: sttApiKeyEnv ?? mediaSecrets.sttApiKey ?? base.stt?.apiKey,
    label: base.stt?.label ?? 'STT provider (OpenAI-compatible)',
  };
  if (sttBaseUrlEnv) locked.push('stt.baseUrl');
  if (sttModelEnv) locked.push('stt.model');
  if (sttApiKeyEnv) locked.push('stt.apiKey');

  return {
    enabled,
    visionProvider,
    sttProvider,
    vision,
    stt,
    workerConcurrency: pick('WORKER_CONCURRENCY', 'workerConcurrency', base.workerConcurrency, MEDIA_EMBEDDING_DEFAULTS.workerConcurrency),
    workerPollIntervalMs: pick('WORKER_POLL_INTERVAL_MS', 'workerPollIntervalMs', base.workerPollIntervalMs, MEDIA_EMBEDDING_DEFAULTS.workerPollIntervalMs),
    workerMaxPollIntervalMs: pick('WORKER_MAX_POLL_INTERVAL_MS', 'workerMaxPollIntervalMs', base.workerMaxPollIntervalMs, MEDIA_EMBEDDING_DEFAULTS.workerMaxPollIntervalMs),
    fallbackToExternal: pick('MEDIA_EMBEDDING_FALLBACK_TO_EXTERNAL', 'fallbackToExternal', base.fallbackToExternal, MEDIA_EMBEDDING_DEFAULTS.fallbackToExternal),
    maxFileSizeBytes: pick('MAX_FILE_SIZE_BYTES', 'maxFileSizeBytes', base.maxFileSizeBytes, MEDIA_EMBEDDING_DEFAULTS.maxFileSizeBytes),
    stalledJobTimeoutMs: pick('STALLED_JOB_TIMEOUT_MS', 'stalledJobTimeoutMs', base.stalledJobTimeoutMs, MEDIA_EMBEDDING_DEFAULTS.stalledJobTimeoutMs),
    // Surface the resolved document-processing/extraction settings (F11) so the admin API GET and the
    // Models UI can read them back (the worker ignores this block).
    documentProcessing: getDocumentProcessingConfig(),
    lockedByInfra: locked,
  };
}

// ── Document Processing Config ──────────────────────────────────────────────

const DOCUMENT_PROCESSING_DEFAULTS: Required<DocumentProcessingConfig> = {
  strategy: 'hi_res',
  extractImages: true,
  // F11 — default `auto`: use the VLM when one is configured and reachable, else fall back to OCR. With no
  // vlmModel set this is byte-for-byte the old OCR path, so it's a safe default (never worse than OCR).
  mode: 'auto',
  renderDpi: 150,
  maxPages: 50,
  pageTimeoutMs: 60_000,
  concurrency: 2,
  vlmModel: '',    // empty = no VLM configured → vlm/auto/max fall back to OCR
  vlmBaseUrl: '',  // empty = reuse the media vision provider's (Ollama) URL
  repairModel: '',   // empty = reuse vlmModel for the max-mode repair pass
  repairBaseUrl: '', // empty = reuse vlmBaseUrl (then the vision URL)
};

/**
 * Return the resolved document processing configuration, merging:
 *   1. `config.json` `mediaEmbedding.documentProcessing` block
 *   2. Built-in defaults
 */
export function getDocumentProcessingConfig(): Required<DocumentProcessingConfig> {
  const mediaCfg = getConfig().mediaEmbedding;
  const base: DocumentProcessingConfig = mediaCfg?.documentProcessing ?? {};
  const d = DOCUMENT_PROCESSING_DEFAULTS;
  return {
    strategy: base.strategy ?? d.strategy,
    extractImages: base.extractImages ?? d.extractImages,
    mode: base.mode ?? d.mode,
    renderDpi: base.renderDpi ?? d.renderDpi,
    maxPages: base.maxPages ?? d.maxPages,
    pageTimeoutMs: base.pageTimeoutMs ?? d.pageTimeoutMs,
    concurrency: base.concurrency ?? d.concurrency,
    vlmModel: process.env['DOC_VLM_MODEL'] ?? base.vlmModel ?? d.vlmModel,
    vlmBaseUrl: process.env['DOC_VLM_URL'] ?? base.vlmBaseUrl ?? d.vlmBaseUrl,
    repairModel: process.env['DOC_REPAIR_MODEL'] ?? base.repairModel ?? d.repairModel,
    repairBaseUrl: process.env['DOC_REPAIR_URL'] ?? base.repairBaseUrl ?? d.repairBaseUrl,
  };
}

// ── Face Recognition Config ──────────────────────────────────────────────────

const FACE_RECOGNITION_DEFAULTS: Required<FaceRecognitionConfig> = {
  enabled: false,
  confidenceThreshold: 0.6,
  minFaceSizeFraction: 0.05,
  modelPath: 'human-models',
  personEntityTypes: ['person'],
  reprocessSyncedImages: true,
};

/**
 * Return the resolved face recognition configuration, merging:
 *   1. `config.json` `mediaEmbedding.faceRecognition` block
 *   2. Built-in defaults
 *
 * Returns defaults with `enabled: false` when no config block is present.
 */
export function getFaceRecognitionConfig(): Required<FaceRecognitionConfig> {
  const mediaCfg = getConfig().mediaEmbedding;
  const base: FaceRecognitionConfig = mediaCfg?.faceRecognition ?? {};
  return {
    enabled: base.enabled ?? FACE_RECOGNITION_DEFAULTS.enabled,
    confidenceThreshold: base.confidenceThreshold ?? FACE_RECOGNITION_DEFAULTS.confidenceThreshold,
    minFaceSizeFraction: base.minFaceSizeFraction ?? FACE_RECOGNITION_DEFAULTS.minFaceSizeFraction,
    modelPath: base.modelPath ?? FACE_RECOGNITION_DEFAULTS.modelPath,
    personEntityTypes: base.personEntityTypes ?? FACE_RECOGNITION_DEFAULTS.personEntityTypes,
    reprocessSyncedImages: base.reprocessSyncedImages ?? FACE_RECOGNITION_DEFAULTS.reprocessSyncedImages,
  };
}
