/**
 * Standalone tests: MongoDB connection URI + credentials (S7, part 2).
 *
 * The bundled database is unauthenticated unless the operator supplies credentials. That
 * matters because Ythril's security model (tokens, admin gating, space scoping, the audit
 * log) is enforced at the API layer ONLY — anything that can reach port 27017 can read and
 * rewrite every space, invisibly.
 *
 * These tests pin getMongoUri()'s precedence and its credential handling:
 *   - an explicit MONGO_URI always wins (managed Atlas / an existing cluster brings its own
 *     credentials, and must never be silently rewritten)
 *   - MONGO_USERNAME/MONGO_PASSWORD authenticate the BUNDLED database
 *   - credentials are percent-encoded (a password may contain `@`, `:`, `/` — which would
 *     otherwise be parsed as URI delimiters and produce a baffling connection failure)
 *   - with no credentials we fall back to the historical unauthenticated URI, so EXISTING
 *     installs keep working (MongoDB cannot have auth switched on in place)
 *
 * Run: node --test testing/standalone/mongo-auth-uri.test.js
 */

import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

let getMongoUri;
const saved = {};
const KEYS = ['MONGO_URI', 'MONGO_USERNAME', 'MONGO_PASSWORD'];

describe('getMongoUri — bundled-database credentials', () => {
  before(async () => {
    for (const k of KEYS) saved[k] = process.env[k];
    ({ getMongoUri } = await import('../../server/dist/config/loader.js'));
  });

  beforeEach(() => {
    for (const k of KEYS) delete process.env[k];
  });

  after(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('falls back to the unauthenticated URI when no credentials are set (existing installs)', () => {
    const uri = getMongoUri();
    assert.equal(uri, 'mongodb://ythril-mongo:27017/ythril?directConnection=true');
    assert.doesNotMatch(uri, /@/, 'must not invent credentials');
  });

  it('authenticates against the bundled database when credentials are supplied', () => {
    process.env['MONGO_USERNAME'] = 'ythril';
    process.env['MONGO_PASSWORD'] = 'sup3rs3cret';
    const uri = getMongoUri();
    assert.match(uri, /^mongodb:\/\/ythril:sup3rs3cret@ythril-mongo:27017\/ythril\?/);
    assert.match(uri, /authSource=admin/, 'the root user lives in the admin database');
  });

  it('percent-encodes credentials so URI delimiters in a password cannot break the connection', () => {
    process.env['MONGO_USERNAME'] = 'user@name';
    process.env['MONGO_PASSWORD'] = 'p@ss:w/rd';
    const uri = getMongoUri();
    assert.match(uri, /user%40name:p%40ss%3Aw%2Frd@ythril-mongo/);
    // The host must still parse as the host — i.e. the LAST '@' separates credentials.
    assert.equal(new URL(uri.replace(/^mongodb:/, 'http:')).hostname, 'ythril-mongo');
  });

  it('an explicit MONGO_URI always wins — it carries its own credentials', () => {
    process.env['MONGO_URI'] = 'mongodb+srv://u:p@cluster.example.mongodb.net/ythril';
    process.env['MONGO_USERNAME'] = 'ythril';
    process.env['MONGO_PASSWORD'] = 'ignored';
    assert.equal(getMongoUri(), 'mongodb+srv://u:p@cluster.example.mongodb.net/ythril');
  });

  it('a half-configured credential pair is ignored rather than producing a broken URI', () => {
    // `mongodb://user:@host` (or `:pass@`) is the kind of thing that fails at connect time
    // with an opaque error. Requiring BOTH keeps the failure mode obvious instead.
    process.env['MONGO_USERNAME'] = 'ythril';
    assert.doesNotMatch(getMongoUri(), /@/, 'username without password must not build a URI');

    delete process.env['MONGO_USERNAME'];
    process.env['MONGO_PASSWORD'] = 'lonely';
    assert.doesNotMatch(getMongoUri(), /@/, 'password without username must not build a URI');
  });
});
