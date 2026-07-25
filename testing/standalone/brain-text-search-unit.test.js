/**
 * Pure tests for `textSearchOr` — the freetext filter builder for the brain list endpoints (2b-iii-a).
 *
 * The load-bearing property is that the user's text is treated as a LITERAL substring, never as a
 * regex: an un-escaped value handed to `$regex` is a regex-injection / ReDoS vector. The DB test
 * proves MongoDB agrees; this pins the builder's shape and escaping without a database.
 *
 * Run: node --test testing/standalone/brain-text-search-unit.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { textSearchOr, SEARCHABLE_FIELDS } from '../../server/dist/brain/text-search.js';

describe('textSearchOr', () => {
  it('returns null for empty/whitespace/undefined — no filter, list stays unnarrowed', () => {
    assert.equal(textSearchOr(undefined, ['name']), null);
    assert.equal(textSearchOr('', ['name']), null);
    assert.equal(textSearchOr('   ', ['name']), null);
  });

  it('builds a case-insensitive $or across every field', () => {
    const f = textSearchOr('ali', ['name', 'description']);
    assert.deepEqual(f, {
      $or: [
        { name: { $regex: 'ali', $options: 'i' } },
        { description: { $regex: 'ali', $options: 'i' } },
      ],
    });
  });

  it('trims the query before matching', () => {
    const f = textSearchOr('  bob  ', ['name']);
    assert.equal(f.$or[0].name.$regex, 'bob');
  });

  it('ESCAPES regex metacharacters — the value is a literal substring, not a pattern', () => {
    const f = textSearchOr('a.b(c)+', ['name']);
    // Every metachar backslash-escaped; no bare `.`/`(`/`+` that the engine would interpret.
    assert.equal(f.$or[0].name.$regex, 'a\\.b\\(c\\)\\+');
  });

  it('neutralises a classic ReDoS payload into a literal', () => {
    const f = textSearchOr('(a+)+$', ['fact']);
    assert.equal(f.$or[0].fact.$regex, '\\(a\\+\\)\\+\\$');
  });

  it('each collection has a non-empty searchable field set', () => {
    for (const [name, fields] of Object.entries(SEARCHABLE_FIELDS)) {
      assert.ok(fields.length > 0, `${name} must have searchable fields`);
    }
  });

  it('files search over path + description (slice 4b)', () => {
    assert.deepEqual(SEARCHABLE_FIELDS.files, ['path', 'description']);
    const f = textSearchOr('readme', SEARCHABLE_FIELDS.files);
    assert.deepEqual(f, {
      $or: [
        { path: { $regex: 'readme', $options: 'i' } },
        { description: { $regex: 'readme', $options: 'i' } },
      ],
    });
  });
});
