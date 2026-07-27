/**
 * What an audit entry is allowed to say about a change — and, far more importantly, what it can never say.
 *
 * Audit entries are queryable by any admin and retained for `audit.retentionDays`. Several audited routes
 * handle secrets directly: token create/regenerate/update, webhook create/update (target URLs and signing
 * secrets), and the media-config routes (vision / STT / NLI / assist API keys).
 *
 * That makes the shape of this feature the whole feature. Diffing a request body and stripping known-secret
 * names fails in the worst direction — forget one name and a live key lands in a retained store where
 * nothing will report it. An ALLOWLIST fails the other way: forget a field and the entry merely lacks it.
 *
 * These tests pin that direction, not the current field list. The list will grow; the direction must not
 * flip.
 *
 * Run: node --test testing/standalone/audit-changes.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let auditChanges, AUDIT_CHANGE_FIELDS;

/** Anything whose NAME suggests a credential. Deliberately broad. */
const SECRETISH = /key|secret|token|password|credential|apikey|auth|bearer|signature|salt|hash/i;

describe('audit changes — nothing is recorded unless it was named', () => {
  before(async () => {
    ({ auditChanges, AUDIT_CHANGE_FIELDS } = await import('../../server/dist/audit/audit-changes.js'));
  });

  it('records nothing at all for an operation with no allowlist', () => {
    // The default must be silence. A route added later then leaks nothing until someone deliberately
    // decides what it may say — which is the only safe direction for a default to point.
    const before = { label: 'old', apiKey: 'sk-live-AAA' };
    const after = { label: 'new', apiKey: 'sk-live-BBB' };
    assert.deepEqual(auditChanges('token.create', before, after), []);
    assert.deepEqual(auditChanges('webhook.update', before, after), []);
    assert.deepEqual(auditChanges('some.route.added.next.year', before, after), []);
  });

  it('ignores unlisted fields even when they sit beside a listed one', () => {
    // The realistic leak: a PATCH body carrying both a harmless rename and a credential.
    const changes = auditChanges('space.update',
      { label: 'Old', apiKey: 'sk-live-AAA', secretToken: 'zzz' },
      { label: 'New', apiKey: 'sk-live-BBB', secretToken: 'yyy' });
    assert.deepEqual(changes.map(c => c.field), ['label']);
    assert.equal(JSON.stringify(changes).includes('sk-live'), false);
  });

  it('never names a credential-ish field in ANY allowlist', () => {
    // The guard against a future well-meant addition. If a genuinely safe field ever trips this, rename
    // the field rather than loosening the pattern.
    for (const [operation, fields] of Object.entries(AUDIT_CHANGE_FIELDS)) {
      for (const f of fields) {
        assert.ok(!SECRETISH.test(f), `${operation} allowlists "${f}", which reads like a credential`);
      }
    }
  });

  it('does not allowlist the operations whose payload IS a secret', () => {
    // token.create / token.regenerate produce the token; webhook.* carry URLs that can embed credentials
    // in userinfo or a query string. Absent by design, not by oversight.
    for (const op of ['token.create', 'token.regenerate', 'webhook.create', 'webhook.update']) {
      assert.equal(AUDIT_CHANGE_FIELDS[op], undefined, `${op} must not have a change allowlist`);
    }
  });
});

describe('audit changes — scalars only', () => {
  before(async () => {
    ({ auditChanges } = await import('../../server/dist/audit/audit-changes.js'));
  });

  it('drops objects and arrays rather than stringifying them', () => {
    // A nested value would mean one allowlisted parent name silently shipping every child it gains later —
    // the forget-one-field failure, reintroduced through nesting.
    const changes = auditChanges('space.update',
      { label: { nested: 'sk-live-AAA' } },
      { label: { nested: 'sk-live-BBB' } });
    assert.deepEqual(changes, []);
  });

  it('records scalar transitions with both sides', () => {
    const changes = auditChanges('space.update',
      { strictLinkage: false }, { strictLinkage: true });
    assert.deepEqual(changes, [{ field: 'strictLinkage', from: false, to: true }]);
  });

  it('distinguishes "was not set" from "set to null"', () => {
    // `from` absent means the field did not exist; from: null means it existed and was null. An audit
    // reader cannot reconstruct intent if those collapse together.
    const added = auditChanges('space.update', {}, { purpose: 'research' });
    assert.deepEqual(added, [{ field: 'purpose', to: 'research' }]);
    const nulled = auditChanges('space.update', { purpose: 'research' }, { purpose: null });
    assert.deepEqual(nulled, [{ field: 'purpose', from: 'research', to: null }]);
  });

  it('says nothing when nothing changed', () => {
    assert.deepEqual(auditChanges('space.update', { label: 'Same' }, { label: 'Same' }), []);
  });

  it('reads dotted paths without touching their siblings', () => {
    const changes = auditChanges('media-config.update',
      { levels: { images: 'caption', audio: 'off' }, vision: { apiKey: 'sk-AAA' } },
      { levels: { images: 'recognition', audio: 'off' }, vision: { apiKey: 'sk-BBB' } });
    assert.deepEqual(changes, [{ field: 'levels.images', from: 'caption', to: 'recognition' }]);
  });

  it('is safe on missing or malformed snapshots', () => {
    // The middleware may not have a "before" for every route; that must be silence, not a throw on a
    // fire-and-forget audit write.
    assert.deepEqual(auditChanges('space.update', null, { label: 'x' }), []);
    assert.deepEqual(auditChanges('space.update', undefined, undefined), []);
    assert.deepEqual(auditChanges('space.update', 'not-an-object', 42), []);
  });
});
