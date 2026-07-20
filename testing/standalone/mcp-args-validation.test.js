/**
 * MCP CallTool argument enforcement.
 *
 * The dispatcher now validates incoming args against each tool's advertised inputSchema (via ajv) before
 * running the handler — so `additionalProperties`, `enum`, numeric bounds, `pattern`, and `propertyNames`
 * are the REAL contract, not just documentation. These tests exercise the same `makeArgsValidator` the
 * router uses (per-connection, space-scoped schemas), covering the accept path and the breaking rejections.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TOOLS } from '../../server/dist/mcp/tools/index.js';
import { makeArgsValidator } from '../../server/dist/mcp/validate-args.js';

const schemas = {
  requiredSpace: { type: 'string', enum: ['general'], description: 'Space ID.' },
  optionalSpace: { type: 'string', enum: ['general'], description: 'Optional space ID.' },
};
const v = makeArgsValidator(schemas);
const tool = (name) => ALL_TOOLS.find(t => t.name === name);
const UUID = '3b241101-e2bb-4255-8caf-4136c566a962';

describe('MCP args enforcement — accept path', () => {
  it('accepts a well-formed recall call', () => {
    assert.equal(v.validate(tool('recall'), { space: 'general', query: 'hello', topK: 5 }), null);
  });
  it('accepts a valid recall filter (allowed key + operator)', () => {
    assert.equal(v.validate(tool('recall'), { query: 'x', filter: { 'properties.status': { eq: 'accepted' } } }), null);
  });
  it('accepts find_similar with the space OMITTED (now optional)', () => {
    assert.equal(v.validate(tool('find_similar'), { entryId: UUID, entryType: 'entity' }), null);
  });
});

describe('MCP args enforcement — breaking rejections', () => {
  const rejects = (name, args, needle) => {
    const err = v.validate(tool(name), args);
    assert.ok(err, `${name}: expected rejection for ${JSON.stringify(args)}`);
    if (needle) assert.ok(err.toLowerCase().includes(needle), `${name}: "${err}" should mention ${needle}`);
  };

  it('rejects an unknown property (additionalProperties:false)', () => {
    rejects('recall', { query: 'x', bogus: 1 }, 'bogus');
  });
  it('rejects a missing required property', () => {
    rejects('remember', { space: 'general' }, 'fact');
  });
  it('rejects an out-of-range number (find_similar.topK > 100)', () => {
    rejects('find_similar', { entryId: UUID, entryType: 'entity', topK: 500 });
  });
  it('rejects the wrong maxTimeMS ceiling (query.maxTimeMS > 10000)', () => {
    rejects('query', { space: 'general', collection: 'memories', filter: {}, maxTimeMS: 99999 });
  });
  it('rejects a bad enum value (wipe_space.types)', () => {
    rejects('wipe_space', { space: 'general', types: ['bogus'] });
  });
  it('rejects a bad collection enum (query.collection)', () => {
    rejects('query', { space: 'general', collection: 'widgets', filter: {} });
  });
  it('rejects a recall filter key outside the allowlist (propertyNames)', () => {
    rejects('recall', { query: 'x', filter: { evil: { eq: 1 } } });
  });
  it('rejects a recall filter operator outside the allowed set', () => {
    rejects('recall', { query: 'x', filter: { tags: { regex: 'x' } } });
  });
  it('rejects a non-UUID entryId (pattern)', () => {
    rejects('find_similar', { entryId: 'not-a-uuid', entryType: 'entity' });
  });
  it('rejects a space the token cannot see (enum)', () => {
    rejects('get_stats', { space: 'secret' });
  });
  it('bulk_write is EXEMPT from schema enforcement (partial-success: per-item errors, not call rejection)', () => {
    // bulk_write's contract is to process valid items and report per-item errors in the result, so the
    // dispatcher skips arg-validation for it (tool.skipSchemaValidation). Its rich schema stays in
    // tools/list for discovery; the handler validates each item.
    assert.equal(tool('bulk_write').skipSchemaValidation, true);
  });
});
