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

/**
 * A REAL Response, not a { ok, status, json } shape.
 *
 * The client under test reads its body through boundedJson, which bounds a read by inspecting content-length
 * and streaming res.body — neither of which a hand-rolled double has. Making the helper fall back to res.json()
 * for objects lacking them was rejected: that is a silent bypass reachable from anywhere, and a guard with a
 * silent bypass is worse than none. Using the real thing also means these tests exercise the production path.
 */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

let judgePair, findPropertyDisagreements, consultedModel, _reloadConfig;
let cfgPath;
const rec = (id, text, properties) => ({ id, text, ...(properties ? { properties } : {}) });

function configureNli(on) {
  fs.writeFileSync(cfgPath, JSON.stringify({
    spaces: [], tokens: [], networks: [],
    mediaEmbedding: on ? { nli: { baseUrl: 'http://nli:8080', model: 'deberta-mnli' } } : {},
  }), 'utf8');
  _reloadConfig();
}
const stubNli = (body, ok = true) => { globalThis.fetch = async () => jsonResponse(body, ok ? 200 : 503); };

describe('contradiction judge', () => {
  before(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-judge-'));
    cfgPath = path.join(dir, 'config.json');
    process.env['CONFIG_PATH'] = cfgPath;
    fs.writeFileSync(cfgPath, JSON.stringify({ spaces: [], tokens: [], networks: [] }), 'utf8');
    const loader = await import('../../server/dist/config/loader.js');
    _reloadConfig = loader.loadConfig;
    ({ judgePair, findPropertyDisagreements, consultedModel } = await import('../../server/dist/brain/contradiction-judge.js'));
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
      globalThis.fetch = async () => { called = true; return jsonResponse({ label: 'entailment', score: 0.99 }); };
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

    it('a low-confidence verdict → unjudged, and reported as ANSWERED-WEAKLY not unavailable', async () => {
      configureNli(true);
      stubNli({ label: 'contradiction', score: 0.31 });
      const v = await judgePair(rec('a', 'x is true'), rec('b', 'x is false'));
      assert.equal(v.kind, 'unjudged', 'noise in a review queue is what makes people stop reading it');
      // The distinction the scanner's cursor turns on: a weak answer is still an answer, so the scan may
      // move past this pair. An unreachable judge is not, and must not settle it.
      assert.equal(v.reason, 'low-confidence');
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

describe('a verdict says when the judge probably did not see the whole text', () => {
  // Reported by an operator running their own judge: encoder cross-encoders cap at 512 tokens, their entity
  // descriptions run to thousands of characters, so a pair is judged on its opening paragraphs — with a
  // completely normal-looking confidence. Nothing errors, which is what makes it dangerous: a confident
  // verdict about the first page is indistinguishable from a confident verdict about the record.
  //
  // We do not truncate — the model does, invisibly — so the flag is explicitly a PROXY on length. These tests
  // pin both directions, because a flag that fires on ordinary records is one reviewers learn to ignore.
  const long = 'x'.repeat(2_000);
  const short = 'the service runs on 8080';

  beforeEach(() => { configureNli(true); });

  it('flags a contradiction whose text exceeds the likely window', async () => {
    stubNli({ label: 'contradiction', score: 0.9 });
    const v = await judgePair(rec('a', long), rec('b', short));
    assert.equal(v.kind, 'contradiction');
    assert.equal(v.truncated, true, 'a long side must be reported');
  });

  it('flags it when the OTHER side is the long one', async () => {
    stubNli({ label: 'contradiction', score: 0.9 });
    assert.equal((await judgePair(rec('a', short), rec('b', long))).truncated, true);
  });

  it('flags an AGREE verdict too — the reason to distrust it is the same', async () => {
    stubNli({ label: 'entailment', score: 0.9 });
    const v = await judgePair(rec('a', long), rec('b', short));
    assert.equal(v.kind, 'agree');
    assert.equal(v.truncated, true);
  });

  it('is ABSENT on ordinary-length text, not false', async () => {
    // Absence must mean "not long enough to worry about". A `truncated: false` on every finding is a field
    // reviewers stop reading, which is exactly what the operator warned us about with a different flag.
    stubNli({ label: 'contradiction', score: 0.9 });
    const v = await judgePair(rec('a', short), rec('b', 'the service does not run on 8080'));
    assert.equal('truncated' in v, false, `expected no truncated key: ${JSON.stringify(v)}`);
  });

  it('is not set by the STRUCTURED pass, which reads whole property values', async () => {
    // The deterministic pass compares single-valued properties; no model, no window, nothing truncated. A
    // flag there would be a claim about a mechanism that was never involved.
    const v = await judgePair(
      rec('a', long, { port: 8080 }),
      rec('b', long, { port: 9090 }),
    );
    assert.equal(v.basis, 'structured-field');
    assert.equal('truncated' in v, false, 'the structured verdict must not carry a model-window caveat');
  });
});

describe('the deterministic pass must not spend the model', () => {
  /**
   * The bug this pins, reported as "judgedPairs: 6 against my judge's own counter of 12".
   *
   * The scanner's structured pass asked for `minConfidence: 2` — an unreachable floor — on the theory that a
   * verdict which can never clear it is a verdict never taken. But the floor is applied to the RESPONSE. The
   * request was still made, the record text still left the instance, the endpoint still served it, and only
   * then was the answer discarded. Every pair in the sweep was judged twice and only the second was counted.
   *
   * So this asserts on the CALL, not on the verdict: a test that only checked the returned kind passed
   * before the fix and after it.
   */
  let saved;
  before(() => { configureNli(true); });
  beforeEach(() => { saved = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = saved; });

  const spyFetch = () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return jsonResponse({ label: 'contradiction', score: 0.99 }); };
    return () => calls;
  };

  it('reaches no endpoint at all under structuredOnly', async () => {
    const calls = spyFetch();
    const v = await judgePair(rec('a', 'the service runs on 8080'), rec('b', 'the service does not run on 8080'),
      { structuredOnly: true });
    assert.equal(calls(), 0, 'structuredOnly made a model call — the free pass is not free');
    assert.equal(v.kind, 'unjudged');
    // Deliberately NOT `no-judge-configured`: a judge IS configured here and is answering. We declined to ask.
    assert.equal(v.reason, 'model-not-consulted');
  });

  it('an unreachable minConfidence does NOT prevent the call — which is why the flag exists', async () => {
    const calls = spyFetch();
    const v = await judgePair(rec('a', 'x is true'), rec('b', 'x is false'), { minConfidence: 2 });
    assert.equal(calls(), 1, 'the old structured pass paid for this call and threw the answer away');
    assert.equal(v.kind, 'unjudged');
  });

  it('still returns the deterministic contradiction it CAN reach', async () => {
    const calls = spyFetch();
    const v = await judgePair(rec('a', 'runs on 8080', { port: 8080 }), rec('b', 'runs on 9090', { port: 9090 }),
      { structuredOnly: true });
    assert.equal(v.kind, 'contradiction');
    assert.equal(v.basis, 'structured-field');
    assert.equal(calls(), 0);
  });

  it('reports model-not-consulted even for empty text, because nothing was asked', async () => {
    // The no-text and no-judge-configured checks sit on the model path. Reaching them under structuredOnly
    // would report a judge problem to a caller that never wanted a judge.
    const v = await judgePair(rec('a', '  '), rec('b', 'x is false'), { structuredOnly: true });
    assert.equal(v.reason, 'model-not-consulted');
  });
});

describe('consultedModel — what a sweep SPENT, not what it settled', () => {
  // The scanner's budget bounds egress, so it has to count every served request. Two of these cost a call
  // and settle nothing, which is exactly why `judgedPairs` could never reconcile with a judge's own counter.
  it('counts a model verdict', () => {
    assert.equal(consultedModel({ kind: 'contradiction', basis: 'nli', confidence: 0.9 }), true);
    assert.equal(consultedModel({ kind: 'agree', basis: 'nli', confidence: 0.9 }), true);
  });

  it('counts a low-confidence answer — paid for in full, then discarded', () => {
    assert.equal(consultedModel({ kind: 'unjudged', reason: 'low-confidence' }), true);
  });

  it('counts an unavailable judge — the record text left the instance regardless', () => {
    assert.equal(consultedModel({ kind: 'unjudged', reason: 'judge-unavailable' }), true);
  });

  it('does not count anything that reached no endpoint', () => {
    assert.equal(consultedModel({ kind: 'contradiction', basis: 'structured-field', confidence: 1, fields: [] }), false);
    assert.equal(consultedModel({ kind: 'unjudged', reason: 'no-text' }), false);
    assert.equal(consultedModel({ kind: 'unjudged', reason: 'no-judge-configured' }), false);
    assert.equal(consultedModel({ kind: 'unjudged', reason: 'model-not-consulted' }), false);
  });
});
