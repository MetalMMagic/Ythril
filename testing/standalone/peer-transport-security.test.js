/**
 * PR-S1 — peer transport-security policy (HTTPS-by-default peers).
 *
 * `peerSchemeAllowed` is the pure gate (explicit flags, no config) and is exhaustively covered here.
 * `isPeerSchemeAllowed` / `requireEncryptedTransport` read env-then-config; with no config loaded in a
 * standalone run they resolve from the env vars alone, which is exactly the override path we assert.
 *
 * Run: node --test testing/standalone/peer-transport-security.test.js
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  peerSchemeAllowed,
  isPeerSchemeAllowed,
  requireEncryptedTransport,
  insecurePeersAllowed,
} from '../../server/dist/config/transport-security.js';

describe('peerSchemeAllowed (pure)', () => {
  const combos = [
    { allowInsecure: false, requireEncrypted: false },
    { allowInsecure: true, requireEncrypted: false },
    { allowInsecure: false, requireEncrypted: true },
    { allowInsecure: true, requireEncrypted: true },
  ];

  it('https:// is always allowed regardless of flags', () => {
    for (const c of combos) assert.equal(peerSchemeAllowed('https://peer.example.com', c), true, JSON.stringify(c));
  });

  it('http:// allowed ONLY when allowInsecure && !requireEncrypted', () => {
    assert.equal(peerSchemeAllowed('http://peer', { allowInsecure: false, requireEncrypted: false }), false);
    assert.equal(peerSchemeAllowed('http://peer', { allowInsecure: true, requireEncrypted: false }), true);
    assert.equal(peerSchemeAllowed('http://peer', { allowInsecure: false, requireEncrypted: true }), false);
    // requireEncrypted overrides the opt-in
    assert.equal(peerSchemeAllowed('http://peer', { allowInsecure: true, requireEncrypted: true }), false);
  });

  it('http:// on loopback is still rejected by default (same host is not a trust boundary)', () => {
    assert.equal(peerSchemeAllowed('http://127.0.0.1:3200', { allowInsecure: false, requireEncrypted: false }), false);
    assert.equal(peerSchemeAllowed('http://localhost', { allowInsecure: false, requireEncrypted: false }), false);
  });

  it('non-http(s) schemes are rejected', () => {
    for (const u of ['ftp://peer', 'file:///etc/passwd', 'ws://peer', 'gopher://peer']) {
      assert.equal(peerSchemeAllowed(u, { allowInsecure: true, requireEncrypted: false }), false, u);
    }
  });

  it('malformed URLs are rejected', () => {
    for (const u of ['not a url', '', 'peer.example.com', '://nope']) {
      assert.equal(peerSchemeAllowed(u, { allowInsecure: true, requireEncrypted: false }), false, JSON.stringify(u));
    }
  });
});

describe('isPeerSchemeAllowed / requireEncryptedTransport (env overrides)', () => {
  afterEach(() => {
    delete process.env.SYNC_ALLOW_INSECURE_PEERS;
    delete process.env.REQUIRE_ENCRYPTED_TRANSPORT;
  });

  it('default (no env/config): https ok, http rejected', () => {
    assert.equal(isPeerSchemeAllowed('https://peer'), true);
    assert.equal(isPeerSchemeAllowed('http://peer'), false);
    assert.equal(requireEncryptedTransport(), false);
    assert.equal(insecurePeersAllowed(), false);
  });

  it('SYNC_ALLOW_INSECURE_PEERS=true permits http peers', () => {
    process.env.SYNC_ALLOW_INSECURE_PEERS = 'true';
    assert.equal(insecurePeersAllowed(), true);
    assert.equal(isPeerSchemeAllowed('http://peer'), true);
  });

  it('REQUIRE_ENCRYPTED_TRANSPORT=true overrides the opt-in', () => {
    process.env.SYNC_ALLOW_INSECURE_PEERS = 'true';
    process.env.REQUIRE_ENCRYPTED_TRANSPORT = 'true';
    assert.equal(requireEncryptedTransport(), true);
    assert.equal(insecurePeersAllowed(), false);
    assert.equal(isPeerSchemeAllowed('http://peer'), false);
    assert.equal(isPeerSchemeAllowed('https://peer'), true);
  });
});
