/**
 * Renamed media env vars: the current name wins, the legacy name still works, and the swap is announced.
 *
 * `OLLAMA_URL` sets `vision.baseUrl` — and `vision.baseUrl` is used **even when `visionProvider` is
 * `external`**. So an operator running vLLM, llama.cpp or LocalAI must set a variable named after a
 * product they are not running, if they find it at all. `WHISPER_URL` / `WHISPER_MODEL` do the same to
 * anyone whose STT backend is not Whisper (reported by a deployment running Qwen3-ASR).
 *
 * The instance already gets this distinction right one layer up and documents it: `local` / `external`
 * names a **wire protocol, not a product**. These three names contradict that.
 *
 * Two failure modes this pins, in opposite directions:
 *
 *   1. **Breaking the legacy name.** Someone upgrading for a security fix should not also get an outage
 *      because a variable was renamed. The aliases work indefinitely.
 *   2. **A silent alias.** An operator never told the name changed never migrates, and the deprecation
 *      never ends. Exactly one warning per legacy name per process.
 *
 * And the one that is easy to get wrong: `lockedByInfra` must reflect **whichever** spelling was used.
 * If it only tracked the new name, the Settings UI would render the field editable while the legacy env
 * var silently overrode every save — the same "looks configured, isn't" shape as the #546 probe bug.
 *
 * Run: node --test testing/standalone/renamed-media-env-vars.test.js
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// CONFIG_PATH is read when the loader module is first evaluated, so it must be set before the dynamic
// import below — a static import would run too early.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-env-rename-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;

let getMediaEmbeddingConfig;
let resetLegacyEnvWarningsForTests;
let getLogLines;

const KEYS = [
  'VISION_BASE_URL', 'OLLAMA_URL',
  'STT_BASE_URL', 'WHISPER_URL',
  'STT_MODEL', 'WHISPER_MODEL',
  'VISION_PROVIDER', 'STT_PROVIDER',
];

const clear = () => { for (const k of KEYS) delete process.env[k]; };

/**
 * Lines emitted *during* `fn`, filtered to those mentioning `needle`.
 *
 * The log ring buffer is process-wide and append-only, so reading its tail after the fact also picks up
 * warnings from earlier cases in this same file — which made "warns exactly once" and "stays quiet" pass
 * or fail on test ORDER rather than on behaviour. Snapshot, act, diff.
 */
function capture(fn, needle) {
  const before = getLogLines(500).length;
  fn();
  return getLogLines(500).slice(before).filter(l => l.includes(needle));
}

describe('renamed media env vars', () => {
  before(async () => {
    const loader = await import('../../server/dist/config/loader.js');
    ({ getMediaEmbeddingConfig, resetLegacyEnvWarningsForTests } = loader);
    ({ getLogLines } = await import('../../server/dist/util/log.js'));
    // A minimal config with no `mediaEmbedding` block at all: every value under test then comes from the
    // env layer or the built-in default, which is exactly the resolution path being exercised.
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      instanceId: 'env-rename-test', instanceLabel: 'test', tokens: [], networks: [],
      spaces: [{ id: 'general', label: 'General', builtIn: true, folders: [] }],
    }, null, 2), { mode: 0o600 });
    loader.loadConfig();
  });

  beforeEach(() => { clear(); resetLegacyEnvWarningsForTests(); });
  afterEach(clear);

  describe('resolution', () => {
    it('the current name is used', () => {
      process.env.VISION_BASE_URL = 'http://vllm.llm.svc.cluster.local:8000';
      assert.equal(getMediaEmbeddingConfig().vision.baseUrl, 'http://vllm.llm.svc.cluster.local:8000');
    });

    it('the legacy name still works — an upgrade must not become an outage', () => {
      process.env.OLLAMA_URL = 'http://legacy:11434';
      assert.equal(getMediaEmbeddingConfig().vision.baseUrl, 'http://legacy:11434');
    });

    it('with both set, the current name wins', () => {
      process.env.VISION_BASE_URL = 'http://new:8000';
      process.env.OLLAMA_URL = 'http://old:11434';
      assert.equal(getMediaEmbeddingConfig().vision.baseUrl, 'http://new:8000');
    });

    it('covers STT_BASE_URL / WHISPER_URL', () => {
      process.env.WHISPER_URL = 'http://asr:9000';
      assert.equal(getMediaEmbeddingConfig().stt.baseUrl, 'http://asr:9000');
      clear(); resetLegacyEnvWarningsForTests();
      process.env.STT_BASE_URL = 'http://qwen-asr.media.svc.cluster.local:9000';
      assert.equal(getMediaEmbeddingConfig().stt.baseUrl, 'http://qwen-asr.media.svc.cluster.local:9000');
    });

    it('covers STT_MODEL / WHISPER_MODEL', () => {
      process.env.WHISPER_MODEL = 'large-v3';
      assert.equal(getMediaEmbeddingConfig().stt.model, 'large-v3');
      clear(); resetLegacyEnvWarningsForTests();
      process.env.STT_MODEL = 'qwen3-asr';
      assert.equal(getMediaEmbeddingConfig().stt.model, 'qwen3-asr');
    });
  });

  describe('the deprecation is announced', () => {
    it('a legacy name warns and names its replacement', () => {
      process.env.OLLAMA_URL = 'http://legacy:11434';
      const warned = capture(() => getMediaEmbeddingConfig(), 'OLLAMA_URL');
      assert.ok(warned.length > 0, 'expected a deprecation warning');
      assert.match(warned.join('\n'), /VISION_BASE_URL/, 'must name the replacement, not just complain');
    });

    it('says which value won when both are set — the worst thing to leave silent', () => {
      // An operator can see OLLAMA_URL in their own manifest. Preferring the other one without saying so
      // sends them looking for a value that is present in config and absent in effect.
      process.env.VISION_BASE_URL = 'http://new:8000';
      process.env.OLLAMA_URL = 'http://old:11434';
      const warned = capture(() => getMediaEmbeddingConfig(), 'OLLAMA_URL');
      assert.match(warned.join('\n'), /using VISION_BASE_URL/);
    });

    it('warns once per process, not once per config read', () => {
      // getMediaEmbeddingConfig() is a resolver called on essentially every request path.
      process.env.WHISPER_URL = 'http://asr:9000';
      const warned = capture(() => { for (let i = 0; i < 5; i++) getMediaEmbeddingConfig(); },
        'WHISPER_URL is deprecated');
      assert.equal(warned.length, 1);
    });

    it('stays quiet when only the current name is used', () => {
      process.env.VISION_BASE_URL = 'http://vllm:8000';
      assert.deepEqual(capture(() => getMediaEmbeddingConfig(), 'deprecated'), []);
    });
  });

  describe('lockedByInfra follows whichever spelling was used', () => {
    // The regression that would be invisible: the UI renders the field editable, every save appears to
    // work, and the env var overrides it on the next read.
    it('locks vision.baseUrl via the current name', () => {
      process.env.VISION_BASE_URL = 'http://vllm:8000';
      assert.ok(getMediaEmbeddingConfig().lockedByInfra.includes('vision.baseUrl'));
    });

    it('locks vision.baseUrl via the LEGACY name too', () => {
      process.env.OLLAMA_URL = 'http://legacy:11434';
      assert.ok(getMediaEmbeddingConfig().lockedByInfra.includes('vision.baseUrl'));
    });

    it('locks stt.baseUrl and stt.model via either name', () => {
      process.env.WHISPER_URL = 'http://asr:9000';
      process.env.STT_MODEL = 'qwen3-asr';
      const locked = getMediaEmbeddingConfig().lockedByInfra;
      assert.ok(locked.includes('stt.baseUrl'), 'legacy spelling must still lock');
      assert.ok(locked.includes('stt.model'), 'current spelling must lock');
    });

    it('locks nothing when no env var is set', () => {
      const locked = getMediaEmbeddingConfig().lockedByInfra;
      for (const f of ['vision.baseUrl', 'stt.baseUrl', 'stt.model']) {
        assert.ok(!locked.includes(f), `${f} must be editable when infra has not pinned it`);
      }
    });
  });

  describe('the default label follows the provider, not the historical product', () => {
    it('an external vision provider is not labelled Ollama-compatible', () => {
      process.env.VISION_PROVIDER = 'external';
      assert.match(getMediaEmbeddingConfig().vision.label, /OpenAI-compatible/);
    });

    it('a local vision provider still says Ollama-compatible', () => {
      process.env.VISION_PROVIDER = 'local';
      assert.match(getMediaEmbeddingConfig().vision.label, /Ollama-compatible/);
    });
  });
});
