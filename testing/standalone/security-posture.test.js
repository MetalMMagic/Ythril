/**
 * PR-S3 — startup security-posture check (`config/security-posture.ts`).
 *
 * With no config loaded (standalone), the checks resolve from env + defaults — exactly the override
 * paths. Covers each PASS/WARN/FAIL transition the boot log and `security.strict` gate depend on.
 *
 * Run: node --test testing/standalone/security-posture.test.js
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { computeSecurityPosture, securityStrict } from '../../server/dist/config/security-posture.js';

const ENV_KEYS = [
  'REQUIRE_ENCRYPTED_TRANSPORT', 'SYNC_ALLOW_INSECURE_PEERS', 'TRUST_PROXY',
  'YTHRIL_MASTER_KEY', 'YTHRIL_MASTER_PASSPHRASE', 'YTHRIL_REQUIRE_ENCRYPTED_AT_REST',
  'YTHRIL_SECURITY_STRICT', 'MONGO_USERNAME', 'MONGO_URI',
];
function clearEnv() { for (const k of ENV_KEYS) delete process.env[k]; }
const find = (posture, id) => posture.checks.find(c => c.id === id);

describe('computeSecurityPosture', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('default posture: transport/at-rest/mongo all WARN, peers PASS, worst=warn', () => {
    const p = computeSecurityPosture();
    assert.equal(find(p, 'transport.tls').level, 'warn');
    assert.equal(find(p, 'transport.peers').level, 'pass');
    assert.equal(find(p, 'atRest.encryption').level, 'warn');
    assert.equal(find(p, 'mongo.auth').level, 'warn');
    assert.equal(p.worst, 'warn');
  });

  it('requireEncryptedTransport without trustProxy → FAIL', () => {
    process.env.REQUIRE_ENCRYPTED_TRANSPORT = 'true';
    const p = computeSecurityPosture();
    assert.equal(find(p, 'transport.tls').level, 'pass');
    assert.equal(find(p, 'transport.trustProxy').level, 'fail');
    assert.equal(p.worst, 'fail');
  });

  it('requireEncryptedTransport WITH trustProxy → no trustProxy failure', () => {
    process.env.REQUIRE_ENCRYPTED_TRANSPORT = 'true';
    process.env.TRUST_PROXY = '1';
    const p = computeSecurityPosture();
    assert.equal(find(p, 'transport.tls').level, 'pass');
    assert.equal(find(p, 'transport.trustProxy'), undefined);
  });

  it('allowInsecurePeers env → peers WARN', () => {
    process.env.SYNC_ALLOW_INSECURE_PEERS = 'true';
    assert.equal(find(computeSecurityPosture(), 'transport.peers').level, 'warn');
  });

  it('master key present → at-rest PASS', () => {
    process.env.YTHRIL_MASTER_KEY = crypto.randomBytes(32).toString('base64');
    assert.equal(find(computeSecurityPosture(), 'atRest.encryption').level, 'pass');
  });

  it('requireEncryptedAtRest without a key → at-rest strict FAIL', () => {
    process.env.YTHRIL_REQUIRE_ENCRYPTED_AT_REST = 'true';
    const p = computeSecurityPosture();
    assert.equal(find(p, 'atRest.strict').level, 'fail');
    assert.equal(p.worst, 'fail');
  });

  it('Mongo credentials (env user) → mongo auth PASS', () => {
    process.env.MONGO_USERNAME = 'u';
    assert.equal(find(computeSecurityPosture(), 'mongo.auth').level, 'pass');
  });

  it('Mongo URI with userinfo → mongo auth PASS', () => {
    process.env.MONGO_URI = 'mongodb://user:pass@host:27017/db';
    assert.equal(find(computeSecurityPosture(), 'mongo.auth').level, 'pass');
  });

  it('a fully-hardened env passes every check', () => {
    process.env.REQUIRE_ENCRYPTED_TRANSPORT = 'true';
    process.env.TRUST_PROXY = '1';
    process.env.YTHRIL_MASTER_KEY = crypto.randomBytes(32).toString('base64');
    process.env.MONGO_USERNAME = 'u';
    const p = computeSecurityPosture();
    assert.equal(p.worst, 'pass', JSON.stringify(p.checks.filter(c => c.level !== 'pass')));
  });

  it('securityStrict reads the env flag', () => {
    assert.equal(securityStrict(), false);
    process.env.YTHRIL_SECURITY_STRICT = 'true';
    assert.equal(securityStrict(), true);
  });
});
