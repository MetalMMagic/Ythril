/**
 * Standalone tests: OIDC issuer + discovery-document SSRF guard (SSRF part 2b).
 *
 * What this module looked like before: `validateOidcUrl` rejected exactly four things — non-http(s),
 * embedded credentials, `169.254.*` / `metadata.google.internal`, and `0.0.0.0`. Every general
 * private range (`10.*`, `192.168.*`, `172.16-31.*`, `127.*`, `::1`) was allowed, discovery was
 * fetched with a plain `fetch` (no DNS pinning, no redirect re-validation), and `jwks_uri` — a URL
 * that arrives inside a document — was handed to `createRemoteJWKSet` after only that four-item
 * check.
 *
 * Three properties are under test here, and they are not the same property:
 *
 *   1. THE DEFAULT IS PUBLIC-ONLY, AND THE OPT-IN EXISTS. Tightening the default without
 *      `oidc.allowPrivateIssuer` shipping alongside it is an outage for every Keycloak-on-10.x
 *      deployment, so "private is refused by default" and "private is permitted with the flag" are
 *      both requirements, tested together.
 *   2. THE OPT-IN NEVER REACHES THE CROWN JEWELS. Loopback, link-local / cloud IMDS and the metadata
 *      hostnames stay refused with the flag ON. "Private address" and "cloud metadata endpoint" are
 *      different risk classes and must not share a switch.
 *   3. A PUBLIC ISSUER MAY NOT NAME A PRIVATE ENDPOINT — flag or no flag. This is the actual attack
 *      and the case with no coverage at all before: OIDC Discovery §4.3 constrains the document's
 *      `issuer` field and nothing else, so `jwks_uri` was a free pivot into the internal network.
 *      The allowance for discovered endpoints is therefore derived from the ISSUER's address class,
 *      not from the global flag.
 *
 * Everything below runs against the real exported functions in `server/dist` — no hand-copied
 * validator (see `_REFERENCE.md`, QA METHOD).
 *
 * Run: node --test testing/standalone/oidc-issuer-ssrf.test.js
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Read at loader module-load time — must be set before any dist import below.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-oidc-ssrf-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;

let validateOidcUrl;
let issuerIsPrivate;
let validateDiscoveryDocument;
let getDiscoveryDoc;
let clearOidcCache;
let allowPrivateOidcIssuer;
let computeSecurityPosture;
let loader;

const ENV_KEY = 'YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER';
let savedEnv;

/** Internal IdPs an operator legitimately runs — refused by default, permitted by the opt-in. */
const PRIVATE_ISSUERS = [
  'http://10.1.2.3:8080/realms/main',
  'http://192.168.1.50:8080/realms/main',
  'http://172.16.0.9:8080/realms/main',
  'https://[fd00::5]/realms/main',
];

/** Refused with the flag ON as well — the opt-in widens where an IdP may live, nothing more. */
const CROWN_JEWELS = [
  'http://127.0.0.1:8080/realms/main',
  'http://localhost:8080/realms/main',
  'http://169.254.169.254/latest/meta-data/',
  'http://metadata.google.internal/computeMetadata/v1/',
  'http://100.100.100.200/latest/meta-data/',
  'http://[::1]:8080/realms/main',
  'http://0.0.0.0:8080/realms/main',
];

const PUBLIC_ISSUER = 'https://keycloak.example.com/realms/main';

/** Write a config to disk and load it. `oidc` omitted → a config with no OIDC block at all. */
function seedConfig(oidc) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    instanceId: 'oidc-ssrf-test', instanceLabel: 'test', tokens: [], networks: [],
    spaces: [{ id: 'general', label: 'General', builtIn: true, folders: [] }],
    ...(oidc ? { oidc } : {}),
  }, null, 2), { mode: 0o600 });
  loader.loadConfig();
}

/** A well-formed document for `issuer`, with every endpoint on the issuer's own origin. */
function docFor(issuer, overrides = {}) {
  const base = issuer.replace(/\/$/, '');
  return {
    issuer,
    jwks_uri: `${base}/protocol/openid-connect/certs`,
    authorization_endpoint: `${base}/protocol/openid-connect/auth`,
    token_endpoint: `${base}/protocol/openid-connect/token`,
    ...overrides,
  };
}

describe('OIDC issuer + discovery SSRF guard', () => {
  before(async () => {
    ({ validateOidcUrl, issuerIsPrivate, validateDiscoveryDocument, getDiscoveryDoc, clearOidcCache } =
      await import('../../server/dist/auth/oidc.js'));
    ({ allowPrivateOidcIssuer } = await import('../../server/dist/config/oidc-egress-policy.js'));
    ({ computeSecurityPosture } = await import('../../server/dist/config/security-posture.js'));
    loader = await import('../../server/dist/config/loader.js');
  });

  // Both the env var AND the on-disk config feed `allowPrivateOidcIssuer()`, so both are reset
  // between tests — a config left enabled by one case would silently permit a private issuer in the
  // next, and the assertion that noticed would be a 10s network timeout rather than a clear failure.
  beforeEach(() => {
    savedEnv = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
    seedConfig(null);
  });
  afterEach(() => { if (savedEnv === undefined) delete process.env[ENV_KEY]; else process.env[ENV_KEY] = savedEnv; });

  // ── The opt-in ─────────────────────────────────────────────────────────────
  describe('the flag itself', () => {
    it('is OFF by default', () => {
      assert.equal(allowPrivateOidcIssuer(), false);
    });

    it('turns on from the environment', () => {
      process.env[ENV_KEY] = 'true';
      assert.equal(allowPrivateOidcIssuer(), true);
    });

    it('only the exact string "true" enables it', () => {
      for (const value of ['1', 'yes', 'TRUE', 'on', '']) {
        process.env[ENV_KEY] = value;
        assert.equal(allowPrivateOidcIssuer(), false, `"${value}" must not enable a private issuer`);
      }
    });
  });

  // ── Issuer admission ───────────────────────────────────────────────────────
  describe('issuer URL admission', () => {
    it('accepts a public issuer with the flag off', () => {
      assert.doesNotThrow(() => validateOidcUrl(PUBLIC_ISSUER, 'issuerUrl', false));
    });

    it('refuses a private issuer by default — this is the behaviour change', () => {
      for (const url of PRIVATE_ISSUERS) {
        assert.throws(() => validateOidcUrl(url, 'issuerUrl', false), /must be a public http\(s\) URL/, url);
      }
    });

    it('names the flag in the rejection, so an operator can act on it', () => {
      assert.throws(
        () => validateOidcUrl('http://10.1.2.3:8080/realms/main', 'issuerUrl', false),
        /oidc\.allowPrivateIssuer.*YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER=true/s,
      );
    });

    it('accepts a private issuer once opted in — the internal-Keycloak deployment', () => {
      for (const url of PRIVATE_ISSUERS) {
        assert.doesNotThrow(() => validateOidcUrl(url, 'issuerUrl', true), url);
      }
    });

    it('refuses loopback, link-local/IMDS and the metadata hostnames REGARDLESS of the flag', () => {
      for (const url of CROWN_JEWELS) {
        assert.throws(() => validateOidcUrl(url, 'issuerUrl', false), /OIDC issuerUrl/, `${url} (flag off)`);
        assert.throws(() => validateOidcUrl(url, 'issuerUrl', true), /always-blocked address/, `${url} (flag ON)`);
      }
    });

    it('still refuses non-http(s) schemes and embedded credentials', () => {
      assert.throws(() => validateOidcUrl('file:///etc/passwd', 'issuerUrl', true), /must use http or https/);
      assert.throws(() => validateOidcUrl('ftp://idp.example.com/', 'issuerUrl', true), /must use http or https/);
      assert.throws(() => validateOidcUrl('https://user:pw@idp.example.com/', 'issuerUrl', true), /embedded credentials/);
      assert.throws(() => validateOidcUrl('not a url', 'issuerUrl', true), /is not a valid URL/);
    });

    it('sees through non-standard IPv4 encodings — the guard is not a string match', () => {
      // 2130706433 === 0x7f000001 === 127.0.0.1. The old four-item check missed every one of these.
      for (const url of ['http://2130706433:8080/', 'http://0x7f000001:8080/', 'http://127.1:8080/']) {
        assert.throws(() => validateOidcUrl(url, 'issuerUrl', true), /always-blocked address/, url);
      }
    });
  });

  // ── Issuer address class ───────────────────────────────────────────────────
  describe('issuerIsPrivate — what scopes the document allowance', () => {
    it('is true only for an issuer that the opt-in alone makes reachable', () => {
      for (const url of PRIVATE_ISSUERS) assert.equal(issuerIsPrivate(url), true, url);
    });

    it('is false for a public issuer and for a bare hostname', () => {
      assert.equal(issuerIsPrivate(PUBLIC_ISSUER), false);
      assert.equal(issuerIsPrivate('https://accounts.google.com'), false);
      // A hostname is not classifiable statically — only the resolution-time guard knows where it
      // points, so it must NOT be treated as private (which would widen what its document may name).
      assert.equal(issuerIsPrivate('http://keycloak.internal:8080/realms/main'), false);
    });

    it('is false for a crown jewel — it is blocked, not "private"', () => {
      assert.equal(issuerIsPrivate('http://127.0.0.1:8080/'), false);
      assert.equal(issuerIsPrivate('http://169.254.169.254/'), false);
    });
  });

  // ── Discovery document ─────────────────────────────────────────────────────
  describe('discovery document — §4.3 issuer match', () => {
    it('rejects a document whose issuer does not match the configured URL', () => {
      const doc = docFor('https://evil.example.com/realms/main');
      assert.throws(
        () => validateDiscoveryDocument(doc, PUBLIC_ISSUER, false),
        /does not match configured issuerUrl/,
      );
    });

    it('tolerates a trailing-slash difference, which is not a mismatch', () => {
      const doc = docFor(PUBLIC_ISSUER + '/');
      assert.doesNotThrow(() => validateDiscoveryDocument(doc, PUBLIC_ISSUER, false));
    });

    it('rejects a document with no issuer field at all', () => {
      const doc = docFor(PUBLIC_ISSUER);
      delete doc.issuer;
      assert.throws(() => validateDiscoveryDocument(doc, PUBLIC_ISSUER, false), /does not match configured issuerUrl/);
    });
  });

  describe('discovery document — the endpoints beside the issuer', () => {
    it('REJECTS a public issuer that names a private jwks_uri — the attack with no prior coverage', () => {
      const doc = docFor(PUBLIC_ISSUER, { jwks_uri: 'http://10.0.0.5/keys' });
      assert.throws(() => validateDiscoveryDocument(doc, PUBLIC_ISSUER, false), /OIDC jwks_uri/);
    });

    it('rejects it even when the global opt-in is on — the allowance follows the ISSUER, not the flag', () => {
      process.env[ENV_KEY] = 'true';
      // `issuerIsPrivate(PUBLIC_ISSUER)` is false, so a public issuer's document is validated with
      // allowPrivate=false no matter what the operator enabled for their own internal IdP.
      const doc = docFor(PUBLIC_ISSUER, { jwks_uri: 'http://10.0.0.5/keys' });
      assert.throws(
        () => validateDiscoveryDocument(doc, PUBLIC_ISSUER, issuerIsPrivate(PUBLIC_ISSUER)),
        /OIDC jwks_uri/,
      );
    });

    it('rejects a private authorization_endpoint, token_endpoint or end_session_endpoint too', () => {
      for (const field of ['authorization_endpoint', 'token_endpoint', 'end_session_endpoint']) {
        const doc = docFor(PUBLIC_ISSUER, { [field]: 'http://192.168.4.4/pivot' });
        assert.throws(() => validateDiscoveryDocument(doc, PUBLIC_ISSUER, false), new RegExp(`OIDC ${field}`), field);
      }
    });

    it('rejects a document with no jwks_uri rather than passing undefined down the line', () => {
      const doc = docFor(PUBLIC_ISSUER);
      delete doc.jwks_uri;
      assert.throws(() => validateDiscoveryDocument(doc, PUBLIC_ISSUER, false), /has no jwks_uri/);
    });

    it('ACCEPTS endpoints on a different public origin — Google, and why same-origin was not shipped', () => {
      // These are Google's real published values. `accounts.google.com` publishes a jwks_uri on
      // `www.googleapis.com` and a token_endpoint on `oauth2.googleapis.com` — three origins, and
      // not even a shared registrable domain. A "endpoints must share the issuer's host" rule would
      // break Google Sign-In outright, which is the same class of upgrade outage this change exists
      // to avoid. If someone reaches for that rule later, this test is the reason not to.
      const google = 'https://accounts.google.com';
      const doc = {
        issuer: google,
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_endpoint: 'https://oauth2.googleapis.com/token',
      };
      assert.doesNotThrow(() => validateDiscoveryDocument(doc, google, issuerIsPrivate(google)));
    });

    it('accepts a private issuer naming private endpoints — the internal-Keycloak document', () => {
      const internal = 'http://10.1.2.3:8080/realms/main';
      const doc = docFor(internal);
      assert.doesNotThrow(() => validateDiscoveryDocument(doc, internal, issuerIsPrivate(internal)));
    });

    it('still refuses a crown-jewel endpoint from a private issuer', () => {
      const internal = 'http://10.1.2.3:8080/realms/main';
      const doc = docFor(internal, { jwks_uri: 'http://169.254.169.254/latest/meta-data/' });
      assert.throws(
        () => validateDiscoveryDocument(doc, internal, issuerIsPrivate(internal)),
        /always-blocked address/,
      );
    });
  });

  // ── The boot signal ────────────────────────────────────────────────────────
  // Getting the guard right and letting an operator discover it from a login page that says
  // "authentication failed" would be a bad change shipped correctly. This is the half that makes the
  // upgrade survivable, so it is tested like a feature, not like logging.
  describe('startup security posture', () => {
    const oidcCheck = () => computeSecurityPosture().checks.find(c => c.id === 'oidc.issuer');

    const BASE = { enabled: true, clientId: 'ythril' };

    it('FAILS the posture when an enabled private issuer has no opt-in — the upgrade outage', () => {
      seedConfig({ ...BASE, issuerUrl: 'http://10.1.2.3:8080/realms/main' });
      const check = oidcCheck();
      assert.ok(check, 'expected an oidc.issuer posture check');
      assert.equal(check.level, 'fail');
      assert.match(check.message, /no one can sign in/i);
      assert.match(check.message, /oidc\.allowPrivateIssuer/);
      assert.match(check.message, /YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER=true/);
    });

    it('drops to a warn once the operator opts in — and still names the exposure', () => {
      process.env[ENV_KEY] = 'true';
      seedConfig({ ...BASE, issuerUrl: 'http://10.1.2.3:8080/realms/main' });
      const check = oidcCheck();
      assert.equal(check.level, 'warn');
      assert.match(check.message, /10\.1\.2\.3/, 'report the address, not just the flag');
      assert.match(check.message, /still apply/, 'say the guard is still on');
    });

    it('FAILS for a crown-jewel issuer even with the opt-in — no flag reaches these', () => {
      process.env[ENV_KEY] = 'true';
      seedConfig({ ...BASE, issuerUrl: 'http://169.254.169.254/realms/main' });
      assert.equal(oidcCheck().level, 'fail');
    });

    it('says nothing at all for a public issuer with the flag off — no noise', () => {
      seedConfig({ ...BASE, issuerUrl: PUBLIC_ISSUER });
      assert.equal(oidcCheck(), undefined);
    });

    it('flags an opt-in that nothing is using', () => {
      process.env[ENV_KEY] = 'true';
      seedConfig({ ...BASE, issuerUrl: PUBLIC_ISSUER });
      const check = oidcCheck();
      assert.equal(check.level, 'warn');
      assert.match(check.message, /nothing is using the permission/);
    });

    it('says nothing when OIDC is disabled, whatever the issuer looks like', () => {
      seedConfig({ ...BASE, enabled: false, issuerUrl: 'http://10.1.2.3:8080/realms/main' });
      assert.equal(oidcCheck(), undefined);
    });

    it('refuses to load a quoted boolean rather than reading it as OFF', () => {
      // `"allowPrivateIssuer": "true"` is a string, so `=== true` is false — the internal IdP would
      // stop authenticating and the config would look correct to whoever wrote it.
      assert.throws(
        () => seedConfig({ ...BASE, issuerUrl: PUBLIC_ISSUER, allowPrivateIssuer: 'true' }),
        /allowPrivateIssuer must be a boolean/,
      );
    });

    it('accepts the config key itself, not just the env var', () => {
      seedConfig({ ...BASE, issuerUrl: 'http://10.1.2.3:8080/realms/main', allowPrivateIssuer: true });
      assert.equal(allowPrivateOidcIssuer(), true);
      assert.equal(oidcCheck().level, 'warn', 'the config key must clear the FAIL the same way the env var does');
    });
  });

  // ── End to end, without a network ──────────────────────────────────────────
  describe('getDiscoveryDoc', () => {
    beforeEach(() => clearOidcCache());

    it('refuses a private issuer before it opens a socket', async () => {
      await assert.rejects(
        () => getDiscoveryDoc('http://10.1.2.3:8080/realms/main'),
        /must be a public http\(s\) URL/,
      );
    });

    it('refuses a crown-jewel issuer with the opt-in on', async () => {
      process.env[ENV_KEY] = 'true';
      await assert.rejects(
        () => getDiscoveryDoc('http://169.254.169.254/realms/main'),
        /always-blocked address/,
      );
    });
  });
});
