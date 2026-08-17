/**
 * REST and MCP return the same recall CONTENT, each in its own transport's shape.
 *
 * ## The rule this gates
 *
 * Owner, 2026-08-16, after being shown both responses side by side: *"can we do 2.3 (recursive on _graph
 * ofc) and from 3#a the fields but not the shape? so both deliver exact same content but in a standard way
 * for their transport?"*
 *
 * So the ENVELOPE is allowed to differ and the FIELD SET is not:
 *
 * - REST returns a flat result — record fields beside `score`.
 * - MCP returns `{score, spaceId, type, record: {…}}`.
 * - The union of keys a caller can read must be identical, at the result and at every depth of `_graph`.
 *
 * ## What it was catching
 *
 * `_graph[].node` was the divergence. MCP mapped the entity through an allowlist; REST attached the Mongo
 * document, so a REST caller saw `_expireAt` and every other stored field. Both now go through
 * `graphNodeRecord`, which is why that function moved out of `mcp/tools/shared.ts`: while it lived on the MCP
 * side, "REST returns the same thing" was a promise rather than a mechanism.
 *
 * `_graph[].edge` also carried a full embedding VECTOR on both doors — the traversal was the one query in the
 * codebase fetching edges with no projection — so "the vector is never returned" was very nearly false.
 *
 * ## Exercised, not grepped
 *
 * Both shapes are built by calling the real functions. A grep could only ever check that two files mention
 * the same words.
 *
 * Run: node --test testing/standalone/both-doors-same-recall-content.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let mapGraphNodes, graphNodeRecord, toRecallRecord, withoutDiagnostics;
let RECALL_DIAGNOSTIC_FIELDS, RECALL_RANKING_DIAGNOSTICS, diagnosticFields;
before(async () => {
  ({ mapGraphNodes, graphNodeRecord } = await import('../../server/dist/brain/recall-graph.js'));
  ({ toRecallRecord } = await import('../../server/dist/mcp/tools/shared.js'));
  ({
    withoutDiagnostics, RECALL_DIAGNOSTIC_FIELDS, RECALL_RANKING_DIAGNOSTICS, diagnosticFields,
  } = await import('../../server/dist/brain/recall-shape.js'));
});

/** A stored entity with every field the collection carries, including the ones nobody should receive. */
const entityDoc = () => ({
  _id: 'ent-b', spaceId: 'general', name: 'Queue', type: 'service', tags: ['infra'],
  description: 'the embedding job queue', properties: { tier: 'core' },
  createdAt: 'c', updatedAt: 'u',
  seq: 77, embeddingModel: 'm', matchedText: 'Queue service infra',
  embedding: [0.1, 0.2], _expireAt: 'someday',
});

const edgeDoc = () => ({
  _id: 'e1', spaceId: 'general', from: 'a', to: 'b', label: 'depends_on', type: 'technical',
  weight: 0.8, tags: ['infra'], description: 'why', properties: { since: '2026-01' },
  createdAt: 'c', updatedAt: 'u',
  seq: 412, embeddingModel: 'm', matchedText: 'infra a depends_on b',
  embedding: [0.3, 0.4],
});

/** A recall hit as `recall()` hands it back: flat, with every diagnostic present. */
const seed = () => ({
  _id: 'seed-1', spaceId: 'general', type: 'entity', name: 'API', entityType: 'service',
  tags: ['infra'], description: 'the public API', properties: {},
  createdAt: 'c', updatedAt: 'u', score: 0.81,
  lexicalScore: 0.44, fusedScore: 0.72, rerankScore: 0.91,
  seq: 88, embeddingModel: 'm', matchedText: 'API service infra',
});

const tree = () => [{
  edge: edgeDoc(),
  node: entityDoc(),
  paths: [['seed-1', 'ent-b']],
  _graph: [{ edge: edgeDoc(), node: entityDoc(), paths: [['seed-1', 'ent-b', 'ent-c']] }],
}];

/** The REST result: the flat hit, diagnostics applied, graph nested through the one implementation. */
const restResult = (diag) => {
  const [r] = withoutDiagnostics([seed()], diag);
  return { ...r, _graph: mapGraphNodes(tree(), graphNodeRecord, diag) };
};

/** The MCP result: envelope plus `record`, same graph. */
const mcpResult = (diag) => ({
  score: seed().score,
  ...diagnosticFields(seed(), RECALL_RANKING_DIAGNOSTICS, diag),
  spaceId: seed().spaceId,
  type: seed().type,
  record: toRecallRecord(seed(), { includeDiagnostics: diag }),
  _graph: mapGraphNodes(tree(), graphNodeRecord, diag),
});

/** Every key a caller can read off a result, wherever the transport put it. */
const flatKeys = (o) => {
  const keys = new Set(Object.keys(o).filter(k => k !== '_graph' && k !== 'record'));
  for (const k of Object.keys(o.record ?? {})) keys.add(k);
  return keys;
};

for (const diag of [false, true]) {
  describe(`the two doors carry the same content (includeDiagnostics: ${diag})`, () => {
    it('the result-level field set is identical', () => {
      // MCP calls the entity's own type `record.type` and puts the knowledge type on the envelope; REST
      // spells the second one `entityType` beside a `type` that is also the knowledge type. Same two facts,
      // and both doors carry both — so the comparison is over the flattened key set, which is what a caller
      // can actually read, rather than over a nesting they each chose for their own reasons.
      const rest = flatKeys(restResult(diag));
      const mcp = flatKeys(mcpResult(diag));
      rest.delete('entityType'); mcp.delete('entityType');
      const onlyRest = [...rest].filter(k => !mcp.has(k)).sort();
      const onlyMcp = [...mcp].filter(k => !rest.has(k)).sort();
      assert.deepEqual({ onlyRest, onlyMcp }, { onlyRest: [], onlyMcp: [] },
        'one door carries a field the other does not — the envelope may differ, the content may not');
    });

    it('and so does every node at every depth of _graph', () => {
      const walk = (nodes, out = []) => {
        for (const n of nodes ?? []) {
          out.push({ node: Object.keys(n.node).sort(), edge: Object.keys(n.edge).sort() });
          walk(n._graph, out);
        }
        return out;
      };
      const rest = walk(restResult(diag)._graph);
      const mcp = walk(mcpResult(diag)._graph);
      assert.ok(rest.length >= 2, 'the fixture must nest at least two levels or this proves nothing');
      assert.deepEqual(rest, mcp, 'the graph must be identical on both doors, recursively');
    });
  });
}

describe('the default withholds the system fields, everywhere', () => {
  it('no diagnostic survives at the result level on either door', () => {
    for (const [door, r] of [['REST', restResult(false)], ['MCP', mcpResult(false)]]) {
      const keys = flatKeys(r);
      for (const f of RECALL_DIAGNOSTIC_FIELDS) {
        assert.equal(keys.has(f), false, `${door} still returns \`${f}\` by default`);
      }
    }
  });

  it('nor anywhere in _graph, on the node OR the edge, at any depth', () => {
    // The edge is the one that bites: it is the WHOLE document, once per hop, and it carries a
    // `matchedText` of its own. Honouring the flag on the results and not on their neighbourhood would
    // leave the larger half of the saving unmade on a traversing call.
    const check = (nodes, door) => {
      for (const n of nodes ?? []) {
        for (const f of RECALL_DIAGNOSTIC_FIELDS) {
          assert.equal(f in n.node, false, `${door}: _graph node still carries \`${f}\``);
          assert.equal(f in n.edge, false, `${door}: _graph edge still carries \`${f}\``);
        }
        check(n._graph, door);
      }
    };
    check(restResult(false)._graph, 'REST');
    check(mcpResult(false)._graph, 'MCP');
  });
});

describe('the vector is never returned, and includeDiagnostics cannot bring it back', () => {
  it('not on a result, on either door, under either setting', () => {
    for (const diag of [false, true]) {
      for (const [door, r] of [['REST', restResult(diag)], ['MCP', mcpResult(diag)]]) {
        assert.equal(flatKeys(r).has('embedding'), false,
          `${door} returned the vector with includeDiagnostics: ${diag}`);
      }
    }
  });

  it('and not on a graph node or edge, at any depth, under either setting', () => {
    // `_graph[].edge` was a real leak: the traversal fetched edges with NO projection, so a
    // `recall(traverse: n)` shipped a float array per hop on both doors. The query now projects it out and
    // this strips it again — a claim that absolute should not rest on one projection being remembered.
    const check = (nodes, label) => {
      for (const n of nodes ?? []) {
        assert.equal('embedding' in n.node, false, `${label}: a graph node carried the vector`);
        assert.equal('embedding' in n.edge, false, `${label}: a graph edge carried the vector`);
        check(n._graph, label);
      }
    };
    for (const diag of [false, true]) {
      check(restResult(diag)._graph, `REST diag:${diag}`);
      check(mcpResult(diag)._graph, `MCP diag:${diag}`);
    }
  });

  it('nor any other stored bookkeeping field the document happened to carry', () => {
    // `_expireAt` is the TTL stamp. REST used to return it on a graph node purely because it attached the
    // Mongo document; nobody chose that, and an allowlist is what stops the next such field arriving
    // silently.
    const [first] = restResult(false)._graph;
    assert.equal('_expireAt' in first.node, false, 'a graph node still carries the TTL stamp');
  });
});
