/**
 * Every record type REST can delete, MCP can delete.
 *
 * ## The reported gap
 *
 * *"An agent can `wipe_space` over MCP but cannot delete one edge."* REST has deleted all four record types
 * since it existed; MCP shipped `delete_memory` and nothing else. So the only edge-removal reachable from an
 * agent was **destroying the entire space** — the most destructive operation available standing in for the
 * least.
 *
 * That is the two-surfaces-one-rule shape four other defects already had, and it is why this is a gate rather
 * than three tools: the asymmetry was not introduced deliberately, it accumulated. A fifth record type, or a
 * second delete route, will accumulate the same way unless something compares the two lists.
 *
 * ## What this asserts, and why it reads REST first
 *
 * The REST routes are the reference. The check derives what MUST exist from the routers rather than from a
 * hardcoded list of four names — a list would have been written to match today's tools and would agree with
 * itself forever.
 *
 * The entity delete additionally has to carry the REST route's referential guard. Shipping the tool WITHOUT it
 * would close the reported gap while opening a worse one: an agent able to leave dangling references that a
 * REST client is refused. A weaker rule on the second surface is the defect, not the absence of the surface.
 *
 * Run: node --test testing/standalone/mcp-delete-parity.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Record types REST deletes one-by-id, read from the routers themselves. */
function restSingleDeletes() {
  const found = new Set();
  for (const [file, collection] of [
    ['server/src/api/brain/entities.ts', 'entities'],
    ['server/src/api/brain/edges.ts', 'edges'],
    ['server/src/api/brain/chrono.ts', 'chrono'],
    ['server/src/api/brain/memories.ts', 'memories'],
  ]) {
    let src;
    try { src = read(file); } catch { continue; }
    // A single-record delete ends in `/:id`; the bulk wipe does not, and must not count.
    if (new RegExp(`\\.delete\\('/spaces/:spaceId/${collection}/:id'`).test(src)) found.add(collection);
  }
  return found;
}

const MCP_TOOL_FOR = {
  entities: 'delete_entity',
  edges: 'delete_edge',
  chrono: 'delete_chrono',
  memories: 'delete_memory',
};

describe('MCP can delete everything REST can delete', () => {
  const registry = read('server/src/mcp/tools/index.ts');
  const rest = restSingleDeletes();

  it('found the REST delete routes to compare against', () => {
    // Floors the enumeration: if the route pattern changes, every tool looks unnecessary and this file
    // passes while checking nothing.
    assert.ok(rest.size >= 4, `only found single-record DELETE routes for: ${[...rest].join(', ') || 'nothing'}`);
  });

  it('registers a delete tool for each of them', () => {
    const missing = [...rest]
      .map(c => MCP_TOOL_FOR[c])
      .filter(tool => !new RegExp(`^\\s*${tool}Tool,`, 'm').test(registry));
    assert.deepEqual(missing, [],
      'REST deletes these record types one at a time and MCP does not — leaving `wipe_space` as the only way '
      + 'an agent can remove one of them');
  });

  it('every delete tool is marked mutating, so a read-only token cannot reach it', () => {
    for (const [file, tool] of [
      ['server/src/mcp/tools/entity.ts', 'delete_entity'],
      ['server/src/mcp/tools/edge.ts', 'delete_edge'],
      ['server/src/mcp/tools/chrono.ts', 'delete_chrono'],
      ['server/src/mcp/tools/memory.ts', 'delete_memory'],
    ]) {
      const src = read(file);
      const at = src.indexOf(`name: '${tool}'`);
      assert.ok(at > 0, `${tool} not found in ${file}`);
      // `mutating` sits within the handful of lines after `name`. The read-only gate is derived from it.
      assert.match(src.slice(at, at + 400), /mutating: true/, `${tool} must be marked mutating`);
    }
  });
});

describe('the MCP entity delete carries the REST route’s referential guard', () => {
  const mcp = read('server/src/mcp/tools/entity.ts');
  const restSrc = read('server/src/api/brain/entities.ts');
  const tool = mcp.slice(mcp.indexOf("name: 'delete_entity'"));

  it('REST really does guard it — otherwise this test asserts a rule that does not exist', () => {
    assert.match(restSrc, /isStrictLinkage\(mid\)/);
    assert.match(restSrc, /findEntityBacklinks\(mid, id\)/);
  });

  it('the tool checks strictLinkage and refuses on a blocking backlink', () => {
    assert.match(tool, /isStrictLinkage\(mid\)/,
      'without this an agent can leave dangling references a REST client is refused');
    assert.match(tool, /findEntityBacklinks\(mid, id\)/);
    assert.match(tool, /still referenced by/, 'the refusal must name what is pointing at the entity');
  });

  it('face labels do NOT block, exactly as in REST', () => {
    // `deleteEntity` unlabels them in the same operation, so they cannot dangle. Blocking on them would make
    // "delete this person" the one thing an operator cannot do for the subject whose data is biometric.
    for (const src of [restSrc, tool]) {
      assert.match(src, /b\.type !== 'face'/);
    }
  });

  it('checks BEFORE deleting, not after', () => {
    const guard = tool.indexOf('findEntityBacklinks');
    const del = tool.indexOf('await deleteEntity(');
    assert.ok(guard > 0 && del > guard, 'the backlink guard must run before the delete');
  });
});
