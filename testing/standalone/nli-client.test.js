/**
 * Standalone tests for the NLI contradiction judge's client (F-REVIEW).
 *
 * Two properties carry real weight here:
 *
 * 1. **An unanswerable judge returns null, never a verdict.** If an unreachable or misconfigured endpoint
 *    quietly resolved to "entailment"/"neutral", every contradiction check would pass and the Review queue
 *    would look reassuringly empty — indistinguishable from a genuinely clean instance. Null means "no
 *    verdict"; the caller must not read it as "no contradiction".
 * 2. **Label normalisation.** MNLI heads report labels in at least three conventions
 *    (`contradiction`, `CONTRADICTION`, `LABEL_0`). Getting the LABEL_n mapping backwards would invert the
 *    judge — flagging agreements and passing contradictions — while every test that only checked "a verdict
 *    came back" would still be green.
 *
 * Run: node --test testing/standalone/nli-client.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let classify, nliConfigured, _reloadConfig;
let dir, cfgPath;
const savedEnv = {};
const ENV = ['NLI_URL', 'NLI_MODEL', 'NLI_API_KEY'];

function writeConfig(mediaEmbedding) {
  fs.writeFileSync(cfgPath, JSON.stringify({ spaces: [], tokens: [], networks: [], mediaEmbedding }), 'utf8');
  _reloadConfig?.();
}

describe('NLI client — the contradiction judge', () => {
  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-nli-'));
    cfgPath = path.join(dir, 'config.json');
    process.env['CONFIG_PATH'] = cfgPath;
    fs.writeFileSync(cfgPath, JSON.stringify({ spaces: [], tokens: [], networks: [] }), 'utf8');
    const loader = await import('../../server/dist/config/loader.js');
    _reloadConfig = loader.loadConfig;
    ({ classify, nliConfigured } = await import('../../server/dist/brain/nli-client.js'));
    _reloadConfig();
  });

  beforeEach(() => { for (const k of ENV) { savedEnv[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => {
    for (const k of ENV) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
    globalThis.fetch = globalThis.__realFetch ?? globalThis.fetch;
  });

  it('is unconfigured until BOTH an endpoint and a model are set', () => {
    writeConfig({});
    assert.equal(nliConfigured(), false, 'nothing configured');
    writeConfig({ nli: { baseUrl: 'http://nli:8080' } });
    assert.equal(nliConfigured(), false, 'an endpoint with no model cannot be called');
    writeConfig({ nli: { model: 'deberta-mnli' } });
    assert.equal(nliConfigured(), false, 'a model with no endpoint cannot be called');
    writeConfig({ nli: { baseUrl: 'http://nli:8080', model: 'deberta-mnli' } });
    assert.equal(nliConfigured(), true);
  });

  it('returns null (no verdict) when unconfigured — NOT a passing verdict', async () => {
    writeConfig({});
    assert.equal(await classify('a', 'b'), null);
  });

  it('returns null when the endpoint errors or is unreachable — NOT a passing verdict', async () => {
    writeConfig({ nli: { baseUrl: 'http://nli:8080', model: 'm' } });
    globalThis.__realFetch ??= globalThis.fetch;

    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    assert.equal(await classify('a', 'b'), null, 'a 503 is not "these records agree"');

    globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
    assert.equal(await classify('a', 'b'), null, 'an unreachable judge is not "these records agree"');
  });

  it('normalises every MNLI label convention, including LABEL_n ordering', async () => {
    writeConfig({ nli: { baseUrl: 'http://nli:8080', model: 'm' } });
    globalThis.__realFetch ??= globalThis.fetch;
    const cases = [
      [{ label: 'contradiction', score: 0.9 }, 'contradiction'],
      [{ label: 'ENTAILMENT', score: 0.8 }, 'entailment'],
      [{ label: 'Neutral', score: 0.5 }, 'neutral'],
      // Standard MNLI ordering: 0=contradiction, 1=neutral, 2=entailment. Inverting this would make the
      // judge flag agreements and pass contradictions, with every "a verdict came back" test still green.
      [{ label: 'LABEL_0', score: 0.7 }, 'contradiction'],
      [{ label: 'LABEL_1', score: 0.7 }, 'neutral'],
      [{ label: 'LABEL_2', score: 0.7 }, 'entailment'],
    ];
    for (const [body, expected] of cases) {
      globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => body });
      const v = await classify('p', 'h');
      assert.equal(v?.label, expected, `${body.label} must normalise to ${expected}`);
      assert.equal(v?.score, body.score);
    }
  });

  it('accepts the HF array shape as well as a bare object', async () => {
    writeConfig({ nli: { baseUrl: 'http://nli:8080', model: 'm' } });
    globalThis.__realFetch ??= globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => [[{ label: 'contradiction', score: 0.95 }]] });
    assert.deepEqual(await classify('p', 'h'), { label: 'contradiction', score: 0.95 });
  });

  it('returns null for an unreadable body rather than inventing a label', async () => {
    writeConfig({ nli: { baseUrl: 'http://nli:8080', model: 'm' } });
    globalThis.__realFetch ??= globalThis.fetch;
    for (const body of [{}, { label: 'wat', score: 0.9 }, { label: 'neutral' }, null]) {
      globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => body });
      assert.equal(await classify('p', 'h'), null, `unreadable body ${JSON.stringify(body)} must yield no verdict`);
    }
  });
});
