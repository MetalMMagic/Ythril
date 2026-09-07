/**
 * The three legacy media env vars are REMOVED, and a manifest that still sets one stops the boot.
 *
 * ## What this file replaced, and why the subject changed
 *
 * It was `renamed-media-env-vars.test.js`, and it pinned the opposite: `OLLAMA_URL`, `WHISPER_URL` and
 * `WHISPER_MODEL` resolved as aliases for `VISION_BASE_URL`, `STT_BASE_URL` and `STT_MODEL`, warning once
 * per process. Its own docblock argued the aliases should live indefinitely — *"someone upgrading for a
 * security fix should not also get an outage because a variable was renamed"*.
 *
 * The owner reversed that on 2026-09-02 and 4.0 removes them. The notice shipped one release ahead, in the
 * three guides that had promised the opposite.
 *
 * ## The removal is a REFUSAL, and that is the whole design
 *
 * Deleting the alias and nothing else would be a silent misconfiguration, which is the one thing a major is
 * not allowed to do. `OLLAMA_URL=http://vllm:8000` would boot cleanly, resolve nothing, fall through to the
 * built-in `http://ollama:11434`, and caption every document against whatever answers there — with nothing
 * in the log. The hosting guide describes exactly that failure for the config-FILE half of the same rename,
 * which is how we know its shape.
 *
 * Three possible behaviours for a name that is set: it works, it errors, or it does nothing. The third is
 * the worst, and it is the one you get for free.
 *
 * ## `removedEnvVarsInUse` rather than the exit path
 *
 * `assertNoRemovedEnvVarsOrExit` calls `process.exit(1)`, so the module splits the decision from the exit
 * and this file asserts the decision. A test that could only exercise the exit could not run at all.
 *
 * Run: node --test testing/standalone/removed-media-env-vars.test.js
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// CONFIG_PATH is read when the loader module is first evaluated, so it must be set before the dynamic
// import below — a static import would run too early.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-env-removed-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;

let getMediaEmbeddingConfig;
let removedEnvVarsInUse;

const KEYS = [
  'VISION_BASE_URL', 'OLLAMA_URL',
  'STT_BASE_URL', 'WHISPER_URL',
  'STT_MODEL', 'WHISPER_MODEL',
  'VISION_PROVIDER', 'STT_PROVIDER',
];

const clear = () => { for (const k of KEYS) delete process.env[k]; };

describe('the removed media env vars', () => {
  before(async () => {
    const loader = await import('../../server/dist/config/loader.js');
    ({ getMediaEmbeddingConfig } = loader);
    ({ removedEnvVarsInUse } = await import('../../server/dist/config/env-removed.js'));
    // A minimal config with no `mediaEmbedding` block at all: every value under test then comes from the
    // env layer or the built-in default, which is exactly the resolution path being exercised.
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      instanceId: 'env-removed-test', instanceLabel: 'test', tokens: [], networks: [],
      spaces: [{ id: 'general', label: 'General', builtIn: true, folders: [] }],
    }, null, 2), { mode: 0o600 });
    loader.loadConfig();
  });

  beforeEach(clear);
  afterEach(clear);

  describe('each removed name is refused, and says what to use', () => {
    for (const [removed, use, configures] of [
      ['OLLAMA_URL', 'VISION_BASE_URL', 'vision.baseUrl'],
      ['WHISPER_URL', 'STT_BASE_URL', 'stt.baseUrl'],
      ['WHISPER_MODEL', 'STT_MODEL', 'stt.model'],
    ]) {
      it(`${removed} is refused and names ${use}`, () => {
        process.env[removed] = 'http://somewhere:1234';
        const problems = removedEnvVarsInUse();
        assert.equal(problems.length, 1, `expected exactly one problem: ${problems.join(' | ')}`);
        assert.match(problems[0], new RegExp(removed));
        assert.match(problems[0], new RegExp(use),
          'the message must name the replacement — unsetting the variable would lose the operator\'s setting');
        assert.match(problems[0], new RegExp(configures.replace('.', '\\.')),
          'and what it configures, because the old name described a product rather than the setting');
      });
    }

    it('reports all three at once rather than one per boot attempt', () => {
      // An operator with three legacy names should fix three, not restart three times. Same reasoning as
      // the numeric validator, which reports every malformed setting in one pass.
      process.env.OLLAMA_URL = 'http://a:1';
      process.env.WHISPER_URL = 'http://b:2';
      process.env.WHISPER_MODEL = 'x';
      assert.equal(removedEnvVarsInUse().length, 3);
    });

    it('an EMPTY value is still set, and still refused', () => {
      // `OLLAMA_URL=` in a compose file is a variable that is present. Reading it as absent would let the
      // exact manifest an operator needs told about pass silently.
      process.env.OLLAMA_URL = '';
      assert.equal(removedEnvVarsInUse().length, 1);
    });
  });

  describe('the current names are untouched', () => {
    it('nothing is refused when only the current names are set', () => {
      process.env.VISION_BASE_URL = 'http://vllm:8000';
      process.env.STT_BASE_URL = 'http://asr:9000';
      process.env.STT_MODEL = 'qwen3-asr';
      assert.deepEqual(removedEnvVarsInUse(), []);
    });

    it('and they still resolve, which is the half a removal must not break', () => {
      process.env.VISION_BASE_URL = 'http://vllm:8000';
      process.env.STT_BASE_URL = 'http://asr:9000';
      process.env.STT_MODEL = 'qwen3-asr';
      const cfg = getMediaEmbeddingConfig();
      assert.equal(cfg.vision.baseUrl, 'http://vllm:8000');
      assert.equal(cfg.stt.baseUrl, 'http://asr:9000');
      assert.equal(cfg.stt.model, 'qwen3-asr');
    });

    it('a removed name configures NOTHING now — it does not quietly still work', () => {
      /*
       * The other half of the refusal, and the one worth asserting rather than assuming: the boot stops, so
       * this state is unreachable in production — but if the alias were still wired, deleting the refusal
       * later would silently restore it. The value must not reach the config.
       */
      process.env.OLLAMA_URL = 'http://legacy:11434';
      assert.notEqual(getMediaEmbeddingConfig().vision.baseUrl, 'http://legacy:11434');
    });
  });

  describe('lockedByInfra follows the current name', () => {
    // The regression that would be invisible: the UI renders the field editable, every save appears to
    // work, and the env var overrides it on the next read. It used to have to track EITHER spelling; with
    // one spelling left there is one thing to get right, and it is still worth pinning.
    it('locks vision.baseUrl', () => {
      process.env.VISION_BASE_URL = 'http://vllm:8000';
      assert.ok(getMediaEmbeddingConfig().lockedByInfra.includes('vision.baseUrl'));
    });

    it('locks stt.baseUrl and stt.model', () => {
      process.env.STT_BASE_URL = 'http://asr:9000';
      process.env.STT_MODEL = 'qwen3-asr';
      const locked = getMediaEmbeddingConfig().lockedByInfra;
      assert.ok(locked.includes('stt.baseUrl'));
      assert.ok(locked.includes('stt.model'));
    });

    it('locks nothing when no env var is set', () => {
    // set-claim: sample config paths, one per shape the lock rule has to survive -- a nested provider URL,
    // another provider's, and a model name beside it.
      const locked = getMediaEmbeddingConfig().lockedByInfra;
      for (const f of ['vision.baseUrl', 'stt.baseUrl', 'stt.model']) {
        assert.ok(!locked.includes(f), `${f} must be editable when infra has not pinned it`);
      }
    });

    it('and a removed name locks nothing either', () => {
      // It configures nothing, so it must not make the UI read-only about a value it is not setting.
      process.env.OLLAMA_URL = 'http://legacy:11434';
      assert.ok(!getMediaEmbeddingConfig().lockedByInfra.includes('vision.baseUrl'));
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
