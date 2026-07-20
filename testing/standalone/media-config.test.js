/**
 * Standalone unit tests: getMediaEmbeddingConfig() resolution tiers and
 * lockedByInfra reporting.
 *
 * These tests run against the compiled server modules directly.
 * No running server, database, or filesystem writes are required.
 *
 * Run: node --test testing/standalone/media-config.test.js
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Module import helpers ─────────────────────────────────────────────────────
// loader.ts imports CONFIG_PATH from env at module-evaluation time.
// We point it at a temp file before loading the module.

const TEMP_CONFIG = path.join(__dirname, 'tmp-media-config-test.json');

const BASE_CONFIG = {
  instanceId: 'test-instance',
  instanceName: 'Test',
  spaces: [],
  tokens: [],
  networks: [],
};

// Set by before() once the module is imported; used by writeConfig() to keep
// in-memory config in sync with each test's disk write.
let _reloadConfig;

function writeConfig(extra = {}) {
  fs.writeFileSync(TEMP_CONFIG, JSON.stringify({ ...BASE_CONFIG, ...extra }, null, 2));
  // Reload in-memory config after writing so getMediaEmbeddingConfig() sees the new values.
  _reloadConfig?.();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getMediaEmbeddingConfig', () => {
  let getMediaEmbeddingConfig;
  let getDocumentProcessingConfig;
  let getDocAssistApiKey;

  const ENV_KEYS = [
    'MEDIA_EMBEDDING_ENABLED', 'VISION_PROVIDER', 'STT_PROVIDER',
    'OLLAMA_URL', 'VISION_MODEL', 'VISION_API_KEY',
    'WHISPER_URL', 'WHISPER_MODEL', 'STT_API_KEY',
    'WORKER_CONCURRENCY', 'WORKER_POLL_INTERVAL_MS', 'WORKER_MAX_POLL_INTERVAL_MS',
    'MEDIA_EMBEDDING_FALLBACK_TO_EXTERNAL', 'MAX_FILE_SIZE_BYTES', 'STALLED_JOB_TIMEOUT_MS',
    'DOC_ASSIST_URL', 'DOC_ASSIST_MODEL', 'DOC_ASSIST_API_KEY',
    'DOC_VERIFY_MODEL', 'DOC_VERIFY_URL',
    'YTHRIL_MEDIA_INFRA_MANAGED',
    'DOC_OCR_TIMEOUT_MS',
  ];

  function clearEnv() {
    for (const k of ENV_KEYS) delete process.env[k];
  }

  before(async () => {
    clearEnv();
    fs.writeFileSync(TEMP_CONFIG, JSON.stringify(BASE_CONFIG, null, 2));
    process.env['CONFIG_PATH'] = TEMP_CONFIG;
    // Dynamic import AFTER env is set so CONFIG_PATH is read at correct time.
    const mod = await import('../../server/dist/config/loader.js');
    getMediaEmbeddingConfig = mod.getMediaEmbeddingConfig;
    getDocumentProcessingConfig = mod.getDocumentProcessingConfig;
    getDocAssistApiKey = mod.getDocAssistApiKey;
    _reloadConfig = mod.reloadConfig;
    // Must call loadConfig() once to initialise _config before any test runs.
    mod.loadConfig();
  });

  after(() => {
    clearEnv();
    if (fs.existsSync(TEMP_CONFIG)) fs.unlinkSync(TEMP_CONFIG);
  });

  afterEach(() => {
    clearEnv();
    // Reset in-memory config after each test so env-var changes don't bleed.
    _reloadConfig?.();
  });

  describe('defaults', () => {
    it('returns enabled=true by default', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.enabled, true);
    });

    it('returns visionProvider=local by default', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.visionProvider, 'local');
    });

    it('returns sttProvider=local by default', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.sttProvider, 'local');
    });

    it('returns default Ollama URL', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.baseUrl, 'http://ollama:11434');
    });

    it('returns default Whisper URL', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.stt?.baseUrl, 'http://whisper:8000');
    });

    it('returns default workerConcurrency=2', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.workerConcurrency, 2);
    });

    it('returns default maxFileSizeBytes=524288000', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.maxFileSizeBytes, 524_288_000);
    });

    it('lockedByInfra is empty with no env vars', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.deepEqual(cfg.lockedByInfra, []);
    });
  });

  describe('env var override tier', () => {
    it('MEDIA_EMBEDDING_ENABLED=true overrides default', () => {
      process.env['MEDIA_EMBEDDING_ENABLED'] = 'true';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.enabled, true);
    });

    it('MEDIA_EMBEDDING_ENABLED=1 is treated as truthy', () => {
      process.env['MEDIA_EMBEDDING_ENABLED'] = '1';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.enabled, true);
    });

    it('OLLAMA_URL overrides default vision URL', () => {
      process.env['OLLAMA_URL'] = 'http://custom-ollama:11434';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.baseUrl, 'http://custom-ollama:11434');
    });

    it('VISION_MODEL overrides default model', () => {
      process.env['VISION_MODEL'] = 'llava:13b';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.model, 'llava:13b');
    });

    it('defaults the vision model to `moondream` (the real Ollama registry name)', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.model, 'moondream');
    });

    it('heals the invalid legacy vision model `moondream2` → `moondream` from saved config', () => {
      // `moondream2` is not a real Ollama model (a pull 404s); an install that saved it
      // must self-heal so image captioning works without a manual config edit.
      writeConfig({ mediaEmbedding: { vision: { model: 'moondream2' } } });
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.model, 'moondream');
    });

    it('heals `moondream2` from the VISION_MODEL env var too', () => {
      process.env['VISION_MODEL'] = 'moondream2';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.model, 'moondream');
    });

    it('WHISPER_URL overrides default STT URL', () => {
      process.env['WHISPER_URL'] = 'http://custom-whisper:8000';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.stt?.baseUrl, 'http://custom-whisper:8000');
    });

    it('WORKER_CONCURRENCY is parsed as a number', () => {
      process.env['WORKER_CONCURRENCY'] = '4';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.workerConcurrency, 4);
    });
  });

  describe('config.json override tier', () => {
    it('config.json mediaEmbedding.enabled overrides default', () => {
      writeConfig({ mediaEmbedding: { enabled: true } });
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.enabled, true);
    });

    it('config.json vision.baseUrl is used when no env var', () => {
      writeConfig({ mediaEmbedding: { vision: { baseUrl: 'http://from-config:11434' } } });
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.baseUrl, 'http://from-config:11434');
    });

    it('env var takes priority over config.json value', () => {
      process.env['OLLAMA_URL'] = 'http://env-url:11434';
      writeConfig({ mediaEmbedding: { vision: { baseUrl: 'http://config-url:11434' } } });
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision?.baseUrl, 'http://env-url:11434');
    });
  });

  describe('lockedByInfra reporting', () => {
    it('OLLAMA_URL adds vision.baseUrl to lockedByInfra', () => {
      process.env['OLLAMA_URL'] = 'http://ollama:11434';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.ok(cfg.lockedByInfra?.includes('vision.baseUrl'), 'Expected vision.baseUrl in lockedByInfra');
    });

    it('VISION_MODEL adds vision.model to lockedByInfra', () => {
      process.env['VISION_MODEL'] = 'moondream2';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.ok(cfg.lockedByInfra?.includes('vision.model'), 'Expected vision.model in lockedByInfra');
    });

    it('VISION_API_KEY adds vision.apiKey to lockedByInfra', () => {
      process.env['VISION_API_KEY'] = 'sk-secret';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.ok(cfg.lockedByInfra?.includes('vision.apiKey'), 'Expected vision.apiKey in lockedByInfra');
    });

    it('WHISPER_URL adds stt.baseUrl to lockedByInfra', () => {
      process.env['WHISPER_URL'] = 'http://whisper:8000';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.ok(cfg.lockedByInfra?.includes('stt.baseUrl'), 'Expected stt.baseUrl in lockedByInfra');
    });

    it('no env vars → empty lockedByInfra array', () => {
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.lockedByInfra?.length, 0);
    });

    it('multiple env vars → all appear in lockedByInfra', () => {
      process.env['OLLAMA_URL'] = 'http://ollama:11434';
      process.env['VISION_MODEL'] = 'llava';
      process.env['WHISPER_URL'] = 'http://whisper:8000';
      writeConfig();
      const cfg = getMediaEmbeddingConfig();
      assert.ok(cfg.lockedByInfra?.includes('vision.baseUrl'));
      assert.ok(cfg.lockedByInfra?.includes('vision.model'));
      assert.ok(cfg.lockedByInfra?.includes('stt.baseUrl'));
    });
  });

  // ── F11-b: external assist model ──────────────────────────────────────────────
  describe('assist model (F11-b)', () => {
    it('absent by default → empty block, no key, no lock', () => {
      writeConfig();
      const dp = getDocumentProcessingConfig();
      assert.equal(dp.assistModel.baseUrl, undefined);
      assert.deepEqual(dp.assistModel.uses, []);
      assert.equal(getDocAssistApiKey(), undefined);
      assert.equal(getMediaEmbeddingConfig().lockedByInfra?.includes('documentProcessing.assistModel'), false);
    });

    it('resolves baseUrl/model/uses/acknowledgedHost from config.json', () => {
      writeConfig({ mediaEmbedding: { documentProcessing: { assistModel: {
        baseUrl: 'https://api.example.com', model: 'big-llm', uses: ['repair'], acknowledgedHost: 'api.example.com',
      } } } });
      const dp = getDocumentProcessingConfig();
      assert.equal(dp.assistModel.baseUrl, 'https://api.example.com');
      assert.equal(dp.assistModel.model, 'big-llm');
      assert.deepEqual(dp.assistModel.uses, ['repair']);
      assert.equal(dp.assistModel.acknowledgedHost, 'api.example.com');
    });

    it('DOC_ASSIST_URL / DOC_ASSIST_MODEL env override config and lock the block', () => {
      process.env['DOC_ASSIST_URL'] = 'https://env.example.com';
      process.env['DOC_ASSIST_MODEL'] = 'env-model';
      writeConfig({ mediaEmbedding: { documentProcessing: { assistModel: { baseUrl: 'https://cfg.example.com', model: 'cfg-model' } } } });
      const dp = getDocumentProcessingConfig();
      assert.equal(dp.assistModel.baseUrl, 'https://env.example.com', 'env baseUrl wins');
      assert.equal(dp.assistModel.model, 'env-model', 'env model wins');
      assert.ok(getMediaEmbeddingConfig().lockedByInfra?.includes('documentProcessing.assistModel'));
    });

    it('getDocAssistApiKey reads DOC_ASSIST_API_KEY from env', () => {
      process.env['DOC_ASSIST_API_KEY'] = 'sk-env-123';
      writeConfig();
      assert.equal(getDocAssistApiKey(), 'sk-env-123');
      assert.ok(getMediaEmbeddingConfig().lockedByInfra?.includes('documentProcessing.assistModel'));
    });
  });

  // ── F11-d: consensus / verify model ───────────────────────────────────────────
  describe('verify model (F11-d)', () => {
    it('empty by default → no consensus pass', () => {
      writeConfig();
      const dp = getDocumentProcessingConfig();
      assert.equal(dp.verifyModel, '');
      assert.equal(dp.verifyBaseUrl, '');
    });

    it('resolves verifyModel/verifyBaseUrl from config.json', () => {
      writeConfig({ mediaEmbedding: { documentProcessing: { verifyModel: 'second-vlm', verifyBaseUrl: 'http://ollama2:11434' } } });
      const dp = getDocumentProcessingConfig();
      assert.equal(dp.verifyModel, 'second-vlm');
      assert.equal(dp.verifyBaseUrl, 'http://ollama2:11434');
    });

    it('DOC_VERIFY_MODEL / DOC_VERIFY_URL env override config', () => {
      process.env['DOC_VERIFY_MODEL'] = 'env-vlm';
      process.env['DOC_VERIFY_URL'] = 'http://env-ollama:11434';
      writeConfig({ mediaEmbedding: { documentProcessing: { verifyModel: 'cfg-vlm' } } });
      const dp = getDocumentProcessingConfig();
      assert.equal(dp.verifyModel, 'env-vlm');
      assert.equal(dp.verifyBaseUrl, 'http://env-ollama:11434');
    });
  });

  // ── configurable OCR-sidecar timeout ─────────────────────────────────────────
  describe('OCR timeout', () => {
    it('defaults to 120000 (2 min)', () => {
      writeConfig();
      assert.equal(getDocumentProcessingConfig().ocrTimeoutMs, 120_000);
    });

    it('resolves ocrTimeoutMs from config.json', () => {
      writeConfig({ mediaEmbedding: { documentProcessing: { ocrTimeoutMs: 300_000 } } });
      assert.equal(getDocumentProcessingConfig().ocrTimeoutMs, 300_000);
    });

    it('DOC_OCR_TIMEOUT_MS env overrides config', () => {
      process.env['DOC_OCR_TIMEOUT_MS'] = '450000';
      writeConfig({ mediaEmbedding: { documentProcessing: { ocrTimeoutMs: 300_000 } } });
      assert.equal(getDocumentProcessingConfig().ocrTimeoutMs, 450_000);
    });
  });

  // ── infra-managed lock (like YTHRIL_MONGO_INFRA_MANAGED) ──────────────────────
  describe('infra-managed media config', () => {
    it('defaults to not infra-managed', () => {
      writeConfig();
      assert.equal(getMediaEmbeddingConfig().infraManaged, false);
    });

    it('mediaEmbedding.infraManaged: true in config.json marks it managed', () => {
      writeConfig({ mediaEmbedding: { infraManaged: true } });
      assert.equal(getMediaEmbeddingConfig().infraManaged, true);
    });

    it('YTHRIL_MEDIA_INFRA_MANAGED=true env marks it managed even without the config flag', () => {
      process.env['YTHRIL_MEDIA_INFRA_MANAGED'] = 'true';
      writeConfig();
      assert.equal(getMediaEmbeddingConfig().infraManaged, true);
    });
  });
});
