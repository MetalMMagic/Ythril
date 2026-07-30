/**
 * The logger does not print credentials that arrive inside a URL.
 *
 * ## The gap this closes, which the repo had already reasoned about elsewhere
 *
 * `audit/audit-changes.ts` keeps webhook routes out of the audit log **entirely**, and says why: "a
 * webhook URL can embed [a credential] in userinfo or a query string". That reasoning was applied to the
 * audit store and not to the application log — and `webhooks/store.ts` logs the target URL verbatim when
 * a webhook is created. Same secret, different retained store, and application logs usually have
 * *broader* access than the admin-only audit API, because they get shipped to an aggregator.
 *
 * The fix is central, in `redact()`, rather than at that one call site: a URL reaches a log line most
 * often inside an *error message* nobody wrote by hand, so fixing the call sites you can find leaves the
 * ones you cannot.
 *
 * ## What these tests are really checking
 *
 * Not "does the regex work" but **"is it safe to log a URL at all"** — plus the two ways a redactor goes
 * wrong: missing a case (a live credential in a retained store) and over-matching (redacting ordinary
 * text until the logs are useless and people stop reading them).
 *
 * Run: node --test testing/standalone/log-redaction-urls.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let log, getLogLines;

before(async () => {
  ({ log, getLogLines } = await import('../../server/dist/util/log.js'));
});

/** Log a line and return what actually landed in the ring buffer. */
function logged(msg) {
  log.warn(msg);
  const lines = getLogLines(1);
  return lines[lines.length - 1] ?? '';
}

describe('URL userinfo never reaches the log', () => {
  it('redacts user:password@host', () => {
    const out = logged('Webhook created: abc → https://svc:s3cr3t@hooks.example.com/path');
    assert.ok(!out.includes('s3cr3t'), `credential leaked: ${out}`);
    assert.ok(out.includes('hooks.example.com'), 'the host must survive, or the line explains nothing');
  });

  it('redacts a bare user@host too', () => {
    // A username alone is not a secret, but it is an identifier that does not belong in a log line and
    // the pattern that carries it is the same one that carries the password.
    const out = logged('peer https://deploybot@peer.internal/api/sync refused');
    assert.ok(!out.includes('deploybot'), `userinfo leaked: ${out}`);
    assert.ok(out.includes('peer.internal'));
  });

  it('leaves an @ in a path or query alone', () => {
    // Over-redaction is the other failure mode: an unreadable log gets ignored, and an ignored log is
    // not a log.
    const out = logged('GET https://api.example.com/users/me@example.com?sort=name ok');
    assert.ok(out.includes('me@example.com'), `over-redacted: ${out}`);
    assert.ok(out.includes('sort=name'));
  });
});

describe('credential-bearing query parameters', () => {
  for (const param of ['api_key', 'apikey', 'api-key', 'access_token', 'token', 'secret', 'password', 'sig', 'signature', 'key', 'auth']) {
    it(`redacts ?${param}=`, () => {
      const out = logged(`fetch failed: https://provider.example.com/v1/x?${param}=SUPERSECRETVALUE`);
      assert.ok(!out.includes('SUPERSECRETVALUE'), `${param} leaked: ${out}`);
      assert.ok(out.includes('provider.example.com'), 'the endpoint must still be identifiable');
    });
  }

  it('redacts a secret param that is not the first one', () => {
    const out = logged('https://x.example.com/a?page=2&api_key=LEAKME&sort=asc');
    assert.ok(!out.includes('LEAKME'), `leaked: ${out}`);
    assert.ok(out.includes('page=2') && out.includes('sort=asc'), 'harmless params must survive');
  });

  it('does NOT redact a param that merely ends in a secret-ish word', () => {
    // `sort_key`, `monkey`, `pubkey_id` are anchored out by requiring ? or & immediately before.
    const out = logged('https://x.example.com/a?sort_key=name&monkey=yes');
    assert.ok(out.includes('sort_key=name'), `over-redacted: ${out}`);
    assert.ok(out.includes('monkey=yes'), `over-redacted: ${out}`);
  });
});

describe('the existing redactions still hold', () => {
  it('Bearer tokens', () => {
    const out = logged('Authorization: Bearer abc123def456');
    assert.ok(!out.includes('abc123def456'), `bearer leaked: ${out}`);
  });
});

describe('the webhook creation log is covered by this, not by hand', () => {
  it('logs the URL through the central logger rather than console', () => {
    // If this line ever moved to `console.log`, it would bypass redact() entirely and the tests above
    // would keep passing while the credential went straight out.
    const src = readFileSync('server/src/webhooks/store.ts', 'utf8');
    const line = src.split('\n').find(l => l.includes('Webhook created:'));
    assert.ok(line, 'the creation log line should still exist');
    assert.match(line, /log\.(info|warn|debug|error)\(/, 'it must go through the redacting logger');
  });
});
