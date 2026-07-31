/**
 * Verify makes a REAL request, with synthetic content, and does not call a cold start a failure.
 *
 * ## Why the endpoint exists
 *
 * `test-connection` lists an endpoint's models. That answers "is something there" and is deliberately
 * cheap and content-free — but it cannot answer the question an operator actually has: *does my
 * configured model work?* Two field reports made the gap concrete:
 *
 *  - A vision endpoint was listed, reachable, and failed on **every image**, because the request carried
 *    `data:application/octet-stream;base64,…` and strict servers reject it. No list probe could see that.
 *  - Endpoints that serve **aliases** — llama-swap roles, gateways, Azure deployments — do not enumerate
 *    the names they answer to, so "not listed" is not evidence of anything.
 *
 * ## The three properties under test
 *
 * 1. **Synthetic content only.** Verify exercises the real provider path without sending anything of the
 *    operator's. For several targets that path is an egress path, and a diagnostic must not become one.
 * 2. **A cold start is not a failure.** A reporter's successful vision call took 34.7s — their
 *    llama-swap was swapping the model in, on a GPU shared by five roles. A short timeout would
 *    reintroduce exactly the false negative Verify exists to remove, so a timeout is its own outcome.
 * 3. **It is audited.** Unlike the probe beside it, Verify leaves the instance and costs money.
 *
 * Run: node --test testing/standalone/model-verify.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('server/src/api/model-verify.ts', 'utf8');
const AUDIT = readFileSync('server/src/audit/middleware.ts', 'utf8');
const APP = readFileSync('server/src/app.ts', 'utf8');

const { verifyTarget } = await import('../../server/dist/api/model-verify.js');

describe('the synthetic payloads are real files, not placeholders', () => {
  // Extracted from the module rather than restated: a fixture that drifts from the source proves nothing.
  const pngB64 = /'([A-Za-z0-9+/=]{80,})',\s*\n\s*'base64',/.exec(SRC)?.[1];

  it('the 1x1 PNG is a valid PNG', () => {
    assert.ok(pngB64, 'could not find the embedded PNG');
    const buf = Buffer.from(pngB64, 'base64');
    // Signature, then the IHDR chunk type at the documented offset.
    assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(buf.subarray(12, 16).toString('latin1'), 'IHDR');
    assert.equal(buf.readUInt32BE(16), 1, 'width must be 1');
    assert.equal(buf.readUInt32BE(20), 1, 'height must be 1');
  });

  it('it is genuinely tiny — a diagnostic must not ship a payload', () => {
    assert.ok(Buffer.from(pngB64, 'base64').length < 200);
  });

  it('the silent WAV is built, not shipped as a fixture', () => {
    assert.match(SRC, /function silentWav/);
    assert.match(SRC, /header\.write\('RIFF', 0\)/);
    assert.match(SRC, /header\.write\('WAVE', 8\)/);
    assert.match(SRC, /header\.write\('data', 36\)/);
  });

  it('nothing operator-supplied is sent', () => {
    // The payloads are a generated image, generated silence, and the literal word ping.
    assert.match(SRC, /embed\('ping'\)/);
    assert.match(SRC, /draft: 'ping', evidence: 'ping'/);
    assert.doesNotMatch(SRC, /readFile\(|getFileBytes|fileBytes/);
  });
});

describe('a cold start is reported as its own outcome', () => {
  it('there is a still-loading outcome distinct from failed', () => {
    assert.match(SRC, /'ok' \| 'failed' \| 'still-loading' \| 'unconfigured'/);
  });

  it('a timeout maps to still-loading, never to failed', () => {
    // Four call sites; every one of them must take the same branch.
    const timeoutBranches = [...SRC.matchAll(/if \(r\.timedOut\) return done\('([a-z-]+)'\)/g)].map(m => m[1]);
    assert.ok(timeoutBranches.length >= 4, `expected a timeout branch per target, found ${timeoutBranches.length}`);
    assert.deepEqual([...new Set(timeoutBranches)], ['still-loading']);
  });

  it('the budget is generous enough for a swapping backend', () => {
    // The field measurement was 34.7s for a model being swapped in on a shared GPU. A tight budget here
    // recreates the false negative this endpoint removes.
    const ms = Number(/MODEL_VERIFY_TIMEOUT_MS'\] \?\? (\d+_?\d*)/.exec(SRC)?.[1].replace('_', ''));
    assert.ok(ms >= 60_000, `budget is ${ms}ms — a cold model load has been measured at ~35s`);
  });

  it('the budget is tunable without a rebuild', () => {
    assert.match(SRC, /process\.env\['MODEL_VERIFY_TIMEOUT_MS'\]/);
  });
});

describe('outcomes are honest about what was established', () => {
  it('silence transcribing to no text is a PASS, not a failure', () => {
    // Asserting on transcript text would fail a perfectly working STT endpoint, since the payload is
    // deliberately silent. Reaching a structured response is the pass.
    assert.match(SRC, /silence transcribed to no text, as expected/);
  });

  it('an empty caption IS a failure — the model answered with nothing', () => {
    assert.match(SRC, /the model answered with an empty caption/);
  });

  it('an unconfigured target is not reported as broken', () => {
    assert.match(SRC, /done\('unconfigured'/);
  });

  it('a thrown error becomes a failed outcome, not a 500', () => {
    // The whole point is to report on a broken endpoint; crashing on one would be perverse.
    assert.match(SRC, /catch \(err\)[\s\S]{0,220}return done\('failed'/);
  });
});

describe('it runs unconfigured targets without a live endpoint', () => {
  // With nothing configured in this process, every target must resolve rather than hang or throw.
  for (const target of ['vision', 'stt', 'embedding', 'assist']) {
    it(`${target} resolves to a structured result`, async () => {
      const r = await verifyTarget(target);
      assert.equal(r.target, target);
      assert.ok(['ok', 'failed', 'still-loading', 'unconfigured'].includes(r.outcome), r.outcome);
      assert.equal(typeof r.latencyMs, 'number');
    });
  }
});

describe('wiring', () => {
  it('the route is mounted', () => {
    assert.match(APP, /app\.use\('\/api\/admin\/media-config', modelVerifyRouter\)/);
  });

  it('it requires admin + MFA, like the probe beside it', () => {
    assert.match(SRC, /modelVerifyRouter\.post\('\/verify', requireAdminMfa/);
  });

  it('it is AUDITED rather than exempted', () => {
    // `test-connection` is exempt because it "mutates nothing" — true there, false here. Verify leaves
    // the instance, costs money on a metered endpoint, and for assist exercises the acknowledged-egress
    // path. Which admin triggered that is worth having.
    assert.match(AUDIT, /media-config\\\/verify\$\/,\s*operation: 'config\.media\.verify'/);
  });
});
