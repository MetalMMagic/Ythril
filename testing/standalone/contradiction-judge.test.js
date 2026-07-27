/**
 * Standalone tests for the contradiction judge (F-REVIEW slice 3a).
 *
 * The judge is pure, so this needs no database and no model — the NLI endpoint is driven by stubbing
 * fetch, exactly as the nli-client tests do.
 *
 * What actually needs pinning here is the THREE-state verdict. `contradiction` / `agree` / `unjudged`.
 * The temptation in every implementation of this is to collapse `unjudged` into `agree`, because both
 * mean "nothing to show the reviewer right now". They are not the same:
 *
 *   - `agree`    — the judge looked and these records are consistent. Settled; don't look again.
 *   - `unjudged` — the judge could not look (no endpoint, outage, unreadable reply, low confidence).
 *                  MUST be revisited. A scanner that records a verdict does not revisit it, so folding
 *                  this into `agree` would permanently mark every pair seen during an outage as fine, and
 *                  the Review queue would look cleanest exactly when the judge was most broken.
 *
 * Run: node --test testing/standalone/contradiction-judge.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let judgePair, findPropertyDisagreements, _reloadConfig;
let cfgPath;
const rec = (id, text, properties) => ({ id, text, ...(properties ? { properties } : {}) });

function configureNli(on) {
  fs.writeFileSync(cfgPath, JSON.stringify({
    spaces: [], tokens: [], networks: [],
    mediaEmbedding: on ? { nli: { baseUrl: 'http://nli:8080', model: 'deberta-mnli' } } : {},
  }), 'utf8');
  _reloadConfig();
}
const stubNli = (body, ok = true) => { globalThis.fetch = async () => ({ ok, status: ok ? 200 : 503, json: async () => body }); };

describe('contradiction judge', () => {
  before(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-judge-'));
    cfgPath = path.join(dir, 'config.json');
    process.env['CONFIG_PATH'] = cfgPath;
    fs.writeFileSync(cfgPath, JSON.stringify({ spaces: [], tokens: [], networks: [] }), 'utf8');
    const loader = await import('../../server/dist/config/loader.js');
    _reloadConfig = loader.loadConfig;
    ({ judgePair, findPropertyDisagreements } = await import('../../server/dist/brain/contradiction-judge.js'));
    _reloadConfig();
  });

  beforeEach(() => { globalThis.__realFetch ??= globalThis.fetch; });
  afterEach(() => { globalThis.fetch = globalThis.__realFetch; });

  // ── The deterministic half ────────────────────────────────────────────────
  describe('structured property disagreement', () => {
    it('flags the same key set to different values', () => {
      const d = findPropertyDisagreements(rec('a', '', { port: 8080 }), rec('b', '', { port: 9090 }));
      assert.deepEqual(d, [{ key: 'port', aValue: 8080, bValue: 9090 }]);
    });

    it('is silent when only one record makes the claim — that is not a disagreement', () => {
      assert.deepEqual(findPropertyDisagreements(rec('a', '', { port: 8080 }), rec('b', '', { host: 'x' })), []);
    });

    it('is silent when both agree', () => {
      assert.deepEqual(findPropertyDisagreements(rec('a', '', { port: 8080 }), rec('b', '', { port: 8080 })), []);
    });

    it('beats the NLI pass — a deterministic answer is preferred and costs nothing', async () => {
      configureNli(true);
      let called = false;
      globalThis.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => ({ label: 'entailment', score: 0.99 }) }; };
      const v = await judgePair(rec('a', 'runs on 8080', { port: 8080 }), rec('b', 'runs on 9090', { port: 9090 }));
      assert.equal(v.kind, 'contradiction');
      assert.equal(v.basis, 'structured-field');
      assert.equal(v.confidence, 1, 'a deterministic conflict is not a probability');
      assert.equal(called, false, 'the model must not be called when the structured pass already decided');
    });
  });

  // ── The three-state verdict ───────────────────────────────────────────────
  describe('unjudged is NOT agreement', () => {
    it('no NLI endpoint configured → unjudged, not agree', async () => {
      configureNli(false);
      const v = await judgePair(rec('a', 'the service runs on 8080'), rec('b', 'the service does not run on 8080'));
      assert.equal(v.kind, 'unjudged');
      assert.equal(v.reason, 'no-judge-configured');
    });

    it('endpoint down → unjudged, not agree (an outage must not clear the queue)', async () => {
      configureNli(true);
      stubNli({}, false);
      const v = await judgePair(rec('a', 'x is true'), rec('b', 'x is false'));
      assert.equal(v.kind, 'unjudged');
      assert.equal(v.reason, 'judge-unavailable');
    });

    it('a low-confidence verdict → unjudged, not a reported contradiction', async () => {
      configureNli(true);
      stubNli({ label: 'contradiction', score: 0.31 });
      const v = await judgePair(rec('a', 'x is true'), rec('b', 'x is false'));
      assert.equal(v.kind, 'unjudged', 'noise in a review queue is what makes people stop reading it');
    });

    it('empty text on either side → unjudged (nothing for an entailment model to read)', async () => {
      configureNli(true);
      stubNli({ label: 'contradiction', score: 0.99 });
      assert.equal((await judgePair(rec('a', '   '), rec('b', 'x is false'))).kind, 'unjudged');
      assert.equal((await judgePair(rec('a', 'x is true'), rec('b', ''))).kind, 'unjudged');
    });
  });

  // ── The NLI half, when it can answer ──────────────────────────────────────
  it('reports a confident contradiction from the model', async () => {
    configureNli(true);
    stubNli({ label: 'contradiction', score: 0.93 });
    const v = await judgePair(rec('a', 'the service runs on 8080'), rec('b', 'the service does not run on 8080'));
    assert.equal(v.kind, 'contradiction');
    assert.equal(v.basis, 'nli');
    assert.equal(v.confidence, 0.93);
  });

  it('reports agreement as agree — settled, distinct from unjudged', async () => {
    configureNli(true);
    stubNli({ label: 'entailment', score: 0.88 });
    const v = await judgePair(rec('a', 'the service runs on 8080'), rec('b', 'the service listens on port 8080'));
    assert.equal(v.kind, 'agree');
    assert.equal(v.basis, 'nli');
  });

  it('treats neutral as agree, not as a contradiction', async () => {
    // Neutral means "unrelated / does not follow" — it is emphatically not "these oppose". Reporting it
    // would fill the queue with pairs a reviewer has no decision to make about.
    configureNli(true);
    stubNli({ label: 'neutral', score: 0.77 });
    assert.equal((await judgePair(rec('a', 'the sky is blue'), rec('b', 'the service runs on 8080'))).kind, 'agree');
  });

  it('honours a caller-supplied confidence floor', async () => {
    configureNli(true);
    stubNli({ label: 'contradiction', score: 0.7 });
    assert.equal((await judgePair(rec('a', 'p'), rec('b', 'q'), { minConfidence: 0.9 })).kind, 'unjudged');
    assert.equal((await judgePair(rec('a', 'p'), rec('b', 'q'), { minConfidence: 0.5 })).kind, 'contradiction');
  });
});
