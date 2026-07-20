/**
 * SSRF follow-up — media provider egress guard. EXTERNAL providers (ExternalVisionProvider /
 * ExternalWhisperProvider) must route through `ssrfSafeFetch`, so pointing one at a private/loopback address
 * is SSRF-BLOCKED before any connection. LOCAL providers (OllamaVisionProvider / WhisperProvider) keep a
 * plain fetch — their addresses are private by design — so the same URL yields a plain connection error,
 * NOT an SSRF block. That difference is exactly the guard being applied selectively.
 *
 * Deterministic: 127.0.0.1:9 is a literal loopback address the SSRF guard rejects up front.
 *
 * Run: node --test testing/standalone/media-egress-ssrf.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const LOOPBACK = 'http://127.0.0.1:9'; // discard port; the SSRF guard blocks it before any connect
let P;
before(async () => { P = await import('../../server/dist/files/media/providers.js'); });

async function errorOf(fn) {
  try { await fn(); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
}

describe('media provider egress SSRF guard', () => {
  it('ExternalVisionProvider is SSRF-guarded — a private endpoint is blocked', async () => {
    const msg = await errorOf(() => new P.ExternalVisionProvider({ baseUrl: LOOPBACK }).caption(Buffer.from('x'), 'image/png'));
    assert.ok(msg, 'should throw');
    assert.match(msg, /Blocked SSRF target/, `expected an SSRF block, got: ${msg}`);
  });

  it('ExternalWhisperProvider is SSRF-guarded — a private endpoint is blocked', async () => {
    const msg = await errorOf(() => new P.ExternalWhisperProvider({ baseUrl: LOOPBACK }).transcribe(Buffer.from('x'), 'audio/wav'));
    assert.ok(msg, 'should throw');
    assert.match(msg, /Blocked SSRF target/, `expected an SSRF block, got: ${msg}`);
  });

  it('OllamaVisionProvider (local) is NOT SSRF-guarded — a private endpoint is a plain connection error', async () => {
    const msg = await errorOf(() => new P.OllamaVisionProvider({ baseUrl: LOOPBACK }).caption(Buffer.from('x'), 'image/png'));
    assert.ok(msg, 'should throw');
    assert.doesNotMatch(msg, /Blocked SSRF target/, `local provider must reach the private endpoint, not be SSRF-blocked: ${msg}`);
  });

  it('WhisperProvider (local) is NOT SSRF-guarded — a private endpoint is a plain connection error', async () => {
    const msg = await errorOf(() => new P.WhisperProvider({ baseUrl: LOOPBACK }).transcribe(Buffer.from('x'), 'audio/wav'));
    assert.ok(msg, 'should throw');
    assert.doesNotMatch(msg, /Blocked SSRF target/, `local provider must reach the private endpoint, not be SSRF-blocked: ${msg}`);
  });
});
