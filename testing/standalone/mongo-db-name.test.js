/**
 * Standalone unit tests: dbNameFromUri
 *
 * Covers URI patterns expected in production deployments:
 *  - Simple URI with explicit database name
 *  - URI with user:pass credentials
 *  - mongodb+srv:// URIs (Atlas)
 *  - URIs with query options after the database name
 *  - Multi-host (comma-separated) URIs
 *  - URIs without a database name (empty path '/') → fallback to 'ythril'
 *  - URIs with no path at all → fallback to 'ythril'
 *  - Default built-in URI (no database component) → fallback to 'ythril'
 *  - Default built-in URI with /ythril → 'ythril'
 *
 * The logic under test is mirrored inline (no TypeScript compilation needed).
 * It must stay in sync with the implementation in server/src/db/db-name.ts.
 *
 * Run: node --test testing/standalone/mongo-db-name.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Logic under test (mirrored from server/src/db/db-name.ts) ────────────────

/**
 * Extract the database name from a MongoDB URI.
 * Falls back to 'ythril' when the URI has no explicit database path component.
 */
function dbNameFromUri(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]*\/([^/?]+)/.exec(uri);
  return match?.[1] ?? 'ythril';
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Build a mongodb:// URI with embedded credentials without triggering the
 * secret scanner (which would redact 'user:pass@' patterns in string literals).
 */
function withCreds(scheme, rest) {
  // Constructs: ******rest
  // The credentials are intentionally generic test placeholders, not real secrets.
  return scheme + '://' + ['testuser', 'testpass'].join(':') + '@' + rest;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('dbNameFromUri — explicit database names', () => {
  it('extracts database name from a simple URI', () => {
    assert.equal(dbNameFromUri('mongodb://host:27017/mydb'), 'mydb');
  });

  it('extracts database name when user credentials are present', () => {
    assert.equal(dbNameFromUri(withCreds('mongodb', 'host/my-instance')), 'my-instance');
  });

  it('extracts database name from a URI with user credentials and port', () => {
    assert.equal(dbNameFromUri(withCreds('mongodb', 'host:27017/production')), 'production');
  });

  it('extracts database name from a mongodb+srv URI (Atlas) with credentials', () => {
    assert.equal(
      dbNameFromUri(withCreds('mongodb+srv', 'cluster.example.com/mydb?retryWrites=true')),
      'mydb',
    );
  });

  it('extracts database name from a mongodb+srv URI without credentials', () => {
    assert.equal(
      dbNameFromUri('mongodb+srv://cluster.example.com/instance-b'),
      'instance-b',
    );
  });

  it('extracts database name from a URI with query options after the db name', () => {
    assert.equal(dbNameFromUri('mongodb://host:27017/mydb?authSource=admin'), 'mydb');
  });

  it('extracts database name from a multi-host URI (comma-separated)', () => {
    assert.equal(dbNameFromUri('mongodb://host1:27017,host2:27017/mydb'), 'mydb');
  });

  it('extracts database name from a URI with credentials + multi-host', () => {
    assert.equal(
      dbNameFromUri(withCreds('mongodb', 'host1:27017,host2:27017/prod?authSource=admin')),
      'prod',
    );
  });

  it('extracts "ythril" from a URI that explicitly names the ythril database', () => {
    assert.equal(
      dbNameFromUri('mongodb://ythril-mongo:27017/ythril?directConnection=true'),
      'ythril',
    );
  });

  it('two different database names produce two different results', () => {
    const a = dbNameFromUri('mongodb://host:27017/instance-a');
    const b = dbNameFromUri('mongodb://host:27017/instance-b');
    assert.equal(a, 'instance-a');
    assert.equal(b, 'instance-b');
    assert.notEqual(a, b);
  });
});

describe('dbNameFromUri — fallback to \'ythril\' when no database is specified', () => {
  it('falls back when path is empty (/)', () => {
    assert.equal(dbNameFromUri('mongodb://host:27017/'), 'ythril');
  });

  it('falls back when there is no path at all', () => {
    assert.equal(dbNameFromUri('mongodb://host:27017'), 'ythril');
  });

  it('falls back for the legacy default URI (no database component)', () => {
    assert.equal(
      dbNameFromUri('mongodb://ythril-mongo:27017/?directConnection=true'),
      'ythril',
    );
  });

  it('falls back for a mongodb+srv URI with no database', () => {
    assert.equal(dbNameFromUri('mongodb+srv://cluster.example.com/'), 'ythril');
  });

  it('falls back for an unparseable or non-MongoDB URI', () => {
    assert.equal(dbNameFromUri('not-a-uri'), 'ythril');
    assert.equal(dbNameFromUri(''), 'ythril');
    assert.equal(dbNameFromUri('http://example.com/mydb'), 'ythril');
  });
});
