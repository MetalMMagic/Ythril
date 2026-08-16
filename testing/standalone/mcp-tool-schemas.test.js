/**
 * MCP tool-schema completeness (F1 self-describing surface).
 *
 * An agent must be able to discover every possible input, value, bound, and operator for a tool from
 * `tools/list` alone. These tests pin the machine-readable invariants that make that true across ALL_TOOLS,
 * plus the highest-value per-tool enrichments (query.filter operators, recall filter key allowlist, the
 * corrected query.maxTimeMS ceiling, find_similar's omit-space harmonisation) and the pure scope resolver.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TOOLS } from '../../server/dist/mcp/tools/index.js';
import { resolveFindSimilarScope } from '../../server/dist/mcp/tools/search.js';

// Stub ToolSchemas (the space fragments the router builds per-connection).
const schemas = {
  requiredSpace: { type: 'string', description: 'Space ID to operate on.' },
  optionalSpace: { type: 'string', description: 'Optional space ID. Omit to search across all accessible spaces.' },
};
const schemaOf = (name) => ALL_TOOLS.find(t => t.name === name).inputSchema(schemas);

describe('MCP tool schemas — universal invariants', () => {
  it('exposes exactly 39 tools', () => {
    // A deliberate tripwire, not a fact worth asserting for its own sake: the number changing means a tool
    // was added or removed, and every tool needs an audit mapping, a read-only classification and a docs
    // row. Bump it when you have done those three, never to make the suite quiet.
    // 36 -> 37: `update_space_schema`. Its three prerequisites are done — `audit-map.ts` maps it to
    // `space.update`, it is `mutating: true` + `admin: true` and listed among the tools a readOnly token cannot
    // see, and `16-mcp.md` carries its row.
    // 37 -> 38: `create_space`. Prerequisites done — `audit-map.ts` maps it to `space.create`, it is
    // `mutating: true` + `admin: true` and listed among the tools a readOnly token cannot see, and `16-mcp.md`
    // carries its row.
    // 38 -> 39: `reindex`, the LAST row of the capability map. Prerequisites done — audit mapping, readOnly
    // classification, docs row.
    // 39 -> 41: `list_embed_jobs` + `retry_record_embedding`, the brain-record half of the embed queue. These are the
    // first pair to arrive WITH their REST route rather than after it, which is the whole point — the capability map
    // was five rows long because five routes shipped alone. Prerequisites done for both: `retry_record_embedding` maps
    // to `brain.retry_embedding` and is listed among the tools a readOnly token cannot see, `list_embed_jobs` is
    // read-only and deliberately visible to a readOnly token, and `16-mcp.md` carries a row for each.
    // 41 -> 42: `er_model`. Prerequisites done — `audit-map.ts` maps it to `brain.er_model` (and the REST
    // route is now audited too, which it was not while `stats` was), it is read-only and deliberately
    // visible to a readOnly token, and `16-mcp.md` carries its row.
    // 42 -> 43: `retry_failed_media_embeddings`, the bulk counterpart to `retry_embedding`. Prerequisites done —
    // `audit-map.ts` maps it to `file.retry_embedding_all` like the route it mirrors, it is `mutating: true` and listed among
    // the tools a readOnly token cannot see, and `16-mcp.md` carries its row.
    // 43 -> 44: `update_file_meta`. Prerequisites done — `audit-map.ts` maps it to `file.meta.update` like
    // the route it mirrors, it is `mutating: true` and listed among the tools a readOnly token cannot see,
    // and `16-mcp.md` carries its row.
    assert.equal(ALL_TOOLS.length, 44);
  });

  it('every tool advertises a closed object schema (type:object, additionalProperties:false)', () => {
    for (const t of ALL_TOOLS) {
      const s = t.inputSchema(schemas);
      assert.equal(s.type, 'object', `${t.name}: type must be object`);
      assert.equal(s.additionalProperties, false, `${t.name}: must set additionalProperties:false so the option set is discoverable as complete`);
      assert.equal(typeof s.properties, 'object', `${t.name}: properties must be an object`);
      assert.ok(Array.isArray(s.required), `${t.name}: required must be an array`);
    }
  });
});

describe('MCP tool schemas — high-value enrichments', () => {
  it('query.filter documents the MongoDB operator allowlist + regex/depth rules', () => {
    const filter = schemaOf('query').properties.filter;
    for (const op of ['$eq', '$in', '$regex', '$options', '$elemMatch', '$mod']) {
      assert.ok(filter.description.includes(op), `query.filter description must list ${op}`);
    }
    assert.ok(/depth 8/.test(filter.description), 'query.filter must document the depth-8 cap');
  });

  it('query.maxTimeMS advertises the REAL 10000 ceiling (not the old prose 30000)', () => {
    const m = schemaOf('query').properties.maxTimeMS;
    assert.equal(m.maximum, 10000);
    assert.equal(m.default, 5000);
  });

  it('query.limit carries real bounds', () => {
    const l = schemaOf('query').properties.limit;
    assert.equal(l.minimum, 1);
    assert.equal(l.maximum, 100);
    assert.equal(l.default, 20);
  });

  it('recall.filter encodes the key allowlist via propertyNames, and traverse/minScore carry bounds', () => {
    const recall = schemaOf('recall');
    const pat = recall.properties.filter.propertyNames.pattern;
    const re = new RegExp(pat);
    assert.ok(re.test('properties.status'), 'properties.* keys allowed');
    assert.ok(re.test('tags'), 'tags key allowed');
    assert.ok(!re.test('evil'), 'arbitrary keys rejected by the pattern');
    assert.equal(recall.properties.traverse.minimum, 0);
    assert.equal(recall.properties.traverse.maximum, 5);
    assert.equal(recall.properties.minScore.minimum, 0);
    assert.equal(recall.properties.minScore.maximum, 1);
  });

  it('bulk_write arrays advertise the 500-item cap', () => {
    const props = schemaOf('bulk_write').properties;
    for (const k of ['memories', 'entities', 'edges', 'chrono']) {
      assert.equal(props[k].maxItems, 500, `bulk_write.${k} must cap at 500`);
    }
  });

  it('find_similar is harmonised to omit-space, and crossSpace is kept rather than deprecated', () => {
    const fs = schemaOf('find_similar');
    assert.ok(!fs.required.includes('space'), 'space must be optional (omit → all accessible spaces)');
    assert.deepEqual(fs.required, ['entryId', 'entryType']);
    assert.ok(fs.properties.traverse, 'find_similar must expose traverse (parity with recall)');
    assert.equal(fs.properties.traverse.maximum, 5);
    assert.equal(ALL_TOOLS.find(t => t.name === 'find_similar').spaceRequired, false);

    // THIS ASSERTION WAS REVERSED IN 3.0, and the reason is worth more than the line it replaces.
    //
    // `crossSpace` was slated for removal as row 1.2 of the deprecation checklist — omitting `space` says
    // the same thing, so the tool took two spellings for one idea. Removing it from the tool turned
    // `mcp-rest-parity`'s "find-similar ↔ find_similar" case RED: the REST route takes the space in its
    // PATH, so "omit the space" is not expressible there and `crossSpace: true` is its only route to the
    // same capability. Dropping it on one door alone is the parameter-level divergence that gate exists
    // to catch.
    //
    // So the flag is KEPT on both doors, and the schema description must stop promising a removal that
    // cannot happen — a caller reading "DEPRECATED" builds around an absence that will never arrive, and
    // an `inputSchema` description is what they read while constructing arguments.
    const desc = fs.properties.crossSpace.description;
    assert.ok(!/DEPRECATED/i.test(desc),
      'crossSpace is kept for REST parity — calling it deprecated tells a caller to avoid a supported flag');
    assert.match(desc, /OMIT `space`/i, 'the description must still name the idiomatic MCP form');
    assert.match(desc, /PATH/, 'and say WHY the flag exists, or the next reader files it as a duplicate again');
  });

  it('id fields carry a UUID-v4 pattern', () => {
    const pat = schemaOf('find_similar').properties.entryId.pattern;
    const re = new RegExp(pat);
    assert.ok(re.test('3b241101-e2bb-4255-8caf-4136c566a962'), 'valid uuid v4 accepted');
    assert.ok(!re.test('not-a-uuid'), 'non-uuid rejected by the pattern');
  });
});

describe('resolveFindSimilarScope (find_similar space resolution)', () => {
  const members = (space) => (space === 'proxy' ? ['m1', 'm2'] : [space]);
  const accessible = ['a', 'b', 'c'];

  it('with a space (no crossSpace): base is the resolved member, search stays in that space', () => {
    const r = resolveFindSimilarScope('a', false, accessible, members);
    assert.deepEqual(r.candidateBases, ['a']);
    assert.equal(r.searchIds, undefined);
  });

  it('with a proxy space: base is the first member', () => {
    const r = resolveFindSimilarScope('proxy', false, accessible, members);
    assert.deepEqual(r.candidateBases, ['m1']);
  });

  it('omitting the space searches all accessible spaces and probes each for the source', () => {
    const r = resolveFindSimilarScope(undefined, false, accessible, members);
    assert.deepEqual(r.candidateBases, accessible);
    assert.deepEqual(r.searchIds, accessible);
  });

  it('legacy crossSpace:true forces cross-space even when a space is given', () => {
    const r = resolveFindSimilarScope('a', true, accessible, members);
    assert.deepEqual(r.candidateBases, accessible);
    assert.deepEqual(r.searchIds, accessible);
  });
});
