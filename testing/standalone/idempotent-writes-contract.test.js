/**
 * The retry-safety contract, in the parts that can be checked without a database.
 *
 * The behaviour itself — "how many records are in the collection after the second call" — is a database question
 * and lives in `testing/integration/idempotent-writes.test.js`. This file holds everything else, because the
 * integration suite needs Docker and therefore only runs in CI, while the contract is the part somebody breaks
 * accidentally while editing a route.
 *
 * ## What it defends
 *
 *  1. **All four record types are documented**, with their different mechanisms. Two of them (entity by id, edge
 *     by natural key) were already idempotent and nobody was told — the only mention of supplying an id was inside
 *     a *warning string* about updating an existing entity. Documented capability is the whole point of this work.
 *  2. **A caller-supplied id is validated as a UUID v4** on the new paths. It becomes the `_id` of a record that
 *     replicates across every peer in every network the space belongs to, so an arbitrary string must not reach it.
 *  3. **The MCP tools advertise it.** An MCP agent is precisely the "external caller that retries" this exists for;
 *     leaving it REST-only would have fixed the case that matters least.
 *  4. **The convergence emits `*.updated`, not `*.created`.** A subscriber has to be able to tell a converged
 *     retry from a new record, and getting this backwards would be invisible to any count-based test.
 *
 * Run: node --test testing/standalone/idempotent-writes-contract.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DOC = 'docs/integration-guide/04-brain-api.md';
const doc = readFileSync(join(ROOT, DOC), 'utf8');

const src = (p) => readFileSync(join(ROOT, p), 'utf8');

/** The two writers that gained the path, and the one it was modelled on. */
const WRITERS = [
  { label: 'memory', impl: 'server/src/brain/memory.ts', route: 'server/src/api/brain/memories.ts', event: 'memory.updated' },
  { label: 'chrono', impl: 'server/src/brain/chrono.ts', route: 'server/src/api/brain/chrono.ts', event: 'chrono.updated' },
];

describe('the contract is documented', () => {
  it('a Retry Safety section exists and names all four record types', () => {
    assert.match(doc, /## Retry Safety/,
      'the Retry Safety section is gone. Two of these four types were already idempotent and nobody knew, which is '
      + 'the failure this section exists to prevent.');
    const region = doc.slice(doc.indexOf('## Retry Safety'), doc.indexOf('## Retry Safety') + 4000);
    for (const t of ['memory', 'chrono', 'entity', 'edge']) {
      assert.ok(region.includes(t), `the Retry Safety section does not mention ${t}`);
    }
  });

  it("says plainly that idempotent does NOT mean no-op", () => {
    // "Idempotent" is routinely read as "the second call does nothing". Here the second write really happens and
    // moves seq — an integrator who believes otherwise will be confused by their own audit log.
    assert.match(doc, /not a no-op/i,
      'the doc does not warn that the retry is a real write; seq and updatedAt advance and it appears in the audit '
      + 'log, which contradicts the usual reading of "idempotent"');
    assert.match(doc, /\bseq\b/, 'the doc does not mention that seq advances');
  });

  it('states the UUID v4 requirement and that omitting the id is unchanged', () => {
    assert.match(doc, /UUID v4/, 'the id format is not stated');
    assert.match(doc, /Omitting .{0,6}id.{0,6} is unchanged|every call creates a new record/i,
      'the doc does not reassure that existing clients which omit the id are unaffected — the first question any '
      + 'reader of a new write parameter has');
  });

  it('tells the reader to generate the id BEFORE the first attempt', () => {
    // The technique is worthless if the id is generated per attempt, and that is the natural mistake.
    assert.match(doc, /before your first attempt|before the first attempt/i,
      'the doc does not say to generate the id before the first attempt, which is the one detail that makes the '
      + 'technique work');
  });
});

describe('the routes validate a caller-supplied id', () => {
  for (const w of WRITERS) {
    it(`${w.label}: refuses anything that is not a UUID v4`, () => {
      // Asserts the id is tested against the pattern, not merely that the pattern is imported. The first version
      // matched `UUID_V4_RE` anywhere in the file — and both routes already use it for `entityIds` — so a mutation
      // replacing the id check with `true` passed while nothing validated the id at all.
      const s = src(w.route);
      assert.match(s, /UUID_V4_RE\.test\(rawId\)/,
        `${w.route} does not test the supplied id against UUID_V4_RE. It becomes the _id of a record that replicates `
        + 'across every peer in every network the space belongs to, so an arbitrary string must not reach it.');
      assert.match(s, /rawId !== undefined/,
        `${w.route} does not let the id be omitted, which every existing client relies on`);
      assert.match(s, /status\(400\)/, `${w.route} has no 400 path for a malformed id`);
    });
  }
});

describe('the implementation converges rather than duplicating', () => {
  for (const w of WRITERS) {
    it(`${w.label}: looks the record up by the supplied id before inserting`, () => {
      const s = src(w.impl);
      assert.match(s, /const existing/,
        `${w.impl} never looks for an existing record, so a supplied id cannot converge on anything`);
      assert.match(s, /_id: (id|fields\.id|existing\._id)/,
        `${w.impl} does not query by the supplied id`);
    });

    it(`${w.label}: a supplied id becomes the new record's identity`, () => {
      // Without this the FIRST call generates its own id, the caller's id names nothing, and the retry inserts a
      // second record — the bug, with a lookup in front of it that never matches.
      const s = src(w.impl);
      assert.match(s, /_id: (id|fields\.id) \?\? uuidv4\(\)/,
        `${w.impl} ignores the supplied id when inserting, so the caller's retry can never find the record`);
    });

    it(`${w.label}: emits ${w.event} on convergence, not *.created`, () => {
      // SCOPED to the converge branch, not the whole file. The first version asserted the file merely CONTAINED
      // `${w.event}` — which it does anyway, from the separate update function — so a mutation flipping the
      // converge branch to `*.created` passed. Scoping is the difference between checking the branch and checking
      // that the string exists somewhere.
      const s = src(w.impl);
      const branchAt = s.indexOf('if (existing) {');
      assert.ok(branchAt > 0, `${w.impl} has no convergence branch at all`);
      const branch = s.slice(branchAt, s.indexOf('\n  }', branchAt));
      assert.ok(branch.includes(`'${w.event}'`),
        `the convergence branch in ${w.impl} does not emit ${w.event}. A webhook subscriber cannot tell a converged `
        + 'retry from a new record, and no count-based test would catch it.');
      assert.ok(!branch.includes(`'${w.label}.created'`),
        `the convergence branch emits ${w.label}.created — it is an update to an existing record, and a subscriber `
        + 'would create a duplicate downstream from it');
    });
  }
});

describe('the MCP tools advertise it', () => {
  let ALL_TOOLS;
  before(async () => { ({ ALL_TOOLS } = await import('../../server/dist/mcp/tools/index.js')); });

  const schemas = {
    requiredSpace: { type: 'string', description: 'Space ID.' },
    optionalSpace: { type: 'string', description: 'Optional space ID.' },
  };

  for (const name of ['remember', 'create_chrono']) {
    it(`${name} takes an optional id, and says what it is for`, () => {
      const tool = ALL_TOOLS.find(t => t.name === name);
      assert.ok(tool, `the ${name} tool is gone`);
      const schema = tool.inputSchema(schemas);
      assert.ok(schema.properties.id, `${name} does not advertise an id — an MCP agent is exactly the caller that `
        + 'retries, so leaving this REST-only would fix the case that matters least');
      assert.match(schema.properties.id.description, /idempotent/i,
        `${name}'s id has no description explaining what it is for; an agent reads the schema and nothing else`);
      assert.ok(!(schema.required ?? []).includes('id'),
        `${name} made id REQUIRED, which breaks every existing agent call`);
    });
  }
});
