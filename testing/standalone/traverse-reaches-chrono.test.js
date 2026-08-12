/**
 * A chrono entry is reachable by `traverse`.
 *
 * ## The reported cost, which is why this is not cosmetic
 *
 * `chrono.entityIds` was the only thing linking a chrono to the graph, and it was legible to `query()` and
 * invisible to `traverse` — the retrieval path an agent reaches for first. An integrator measured what that
 * costs: reconstructing a **33-day hardware-RMA timeline took four `query()` calls plus two repo greps**, and
 * the first pass still missed the actual carrier ticket, which had to be found by a name regex rather than by
 * traversal from the incident.
 *
 * Their framing is the right one: the natural reading of "knowledge graph" is that a chrono is a node.
 *
 * ## What is pinned here
 *
 * The traversal itself needs MongoDB, so the behaviour is proven in the Docker suite. What this file pins is
 * the part that is pure and the part that is a promise to callers:
 *
 *  - the synthetic link has a REAL label, so `edgeLabels` can include or exclude it like any other;
 *  - an explicit `edgeLabels` filter that does not name it EXCLUDES chrono — a filter that cannot exclude
 *    something is not a filter, and asking for `depends_on` must not quietly return timeline entries;
 *  - chrono nodes are marked `kind`, and entity nodes are not — so a response is byte-identical for every
 *    caller that was already using this, and a caller following `_id` knows which collection to look in;
 *  - the chrono node does NOT join the next frontier, or a depth-2 walk would bounce back through every
 *    entity the chrono mentions;
 *  - **both surfaces take the same flag with the same default.** A rule that reaches one door and not the
 *    other is the defect four brain-API fixes were about.
 *
 * Run: node --test testing/standalone/traverse-reaches-chrono.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
let CHRONO_LINK_LABEL;

describe('the chrono link is a first-class edge label', () => {
  before(async () => {
    ({ CHRONO_LINK_LABEL } = await import('../../server/dist/brain/edges.js'));
  });

  it('is exported and non-empty, so callers can name it', () => {
    assert.equal(typeof CHRONO_LINK_LABEL, 'string');
    assert.ok(CHRONO_LINK_LABEL.length > 0);
    // Named for the field it derives from: a reader of a traverse result can tell a modelled relationship
    // from a derived one without consulting the docs.
    assert.match(CHRONO_LINK_LABEL, /chrono/);
  });
});

describe('traverse follows chrono.entityIds', () => {
  const src = read('server/src/brain/edges.ts');
  // Comments explain the mechanism by name, so they must not satisfy the checks that guard it.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

  it('queries the chrono collection for entries pointing at the frontier', () => {
    assert.match(code, /_chrono`\)/, 'the traversal must read the chrono collection');
    assert.match(code, /entityIds: \{ \$in: frontier \}/,
      'the link is `entityIds` containing a frontier node — that is the inbound edge this ask is about');
  });

  it('an explicit edgeLabels filter excludes chrono unless it names the label', () => {
    assert.match(code, /wantsChronoLabel/,
      'without this, asking for one label would quietly return chrono entries as well');
    assert.match(code, /edgeLabels\.includes\(CHRONO_LINK_LABEL\)/);
  });

  it('marks the chrono node and leaves entity nodes untouched', () => {
    assert.match(code, /kind: 'chrono'/, 'a caller following `_id` must know which collection to look in');
    // The entity push must NOT carry a kind — absence is what keeps existing responses identical.
    const entityPush = /resultNodes\.push\(\{ _id: entity\._id[^)]*\)/.exec(code)?.[0] ?? '';
    assert.ok(entityPush, 'could not find the entity node push');
    assert.doesNotMatch(entityPush, /kind:/,
      'an entity node must stay exactly as it was, so no existing response changes shape');
  });

  it('collects every non-entity kind BEFORE the early break, and the break counts each one', () => {
    // The defect this gate did not catch on its own: the BFS breaks out when a frontier yields no entity
    // neighbours, and the chrono lookup originally sat after that break — so an entity whose only link is a
    // timeline traversed to nothing, which is the reported scenario rather than an edge case. Behaviour
    // proved it; this pins the ordering that fixed it.
    //
    // Read from the break STATEMENT rather than a literal substring of its condition. The condition gained a
    // third clause when `includeMemories` landed, which broke the old exact-text match while the property it
    // was protecting was still perfectly intact — a gate that fails on a shape change it does not care about
    // teaches people to edit gates rather than believe them.
    const collections = ['chronoHere', 'memoriesHere', 'filesHere'];
    const breakLine = code.split('\n').find(l => l.includes('break;') && l.includes('newNeighborIds.length === 0'));
    assert.ok(breakLine, 'could not find the early break');

    for (const name of collections) {
      // Word-boundary, not substring: `indexOf('const chronoHere')` also matches `const chronoHereMoved`, so a
      // rename slid straight past this check when it was mutation-tested.
      const declaredAt = code.search(new RegExp(`const ${name}\\b`));
      assert.ok(declaredAt > 0, `could not find the ${name} lookup`);
      assert.ok(code.indexOf(breakLine) > declaredAt, `${name} must be collected before the early break`);
      assert.ok(breakLine.includes(`${name}.length === 0`),
        `the break must count ${name} — otherwise an entity whose only links are that kind looks like a dead end`);
    }
  });

  it('does not expand FROM a chrono node', () => {
    // A chrono links to entities, not to other chrono entries, so expanding one would only walk back to
    // entities already visited — spending depth to return nothing.
    const chronoBlock = code.slice(code.indexOf('for (const { doc, via } of chronoHere)'));
    const block = chronoBlock.slice(0, chronoBlock.indexOf('frontier = nextFrontier'));
    assert.doesNotMatch(block, /nextFrontier\.push/, 'a chrono node must not join the next frontier');
  });

  it('honours the node limit like any other node', () => {
    const chronoBlock = code.slice(code.indexOf('for (const { doc, via } of chronoHere)'));
    assert.match(chronoBlock.slice(0, 600), /resultNodes\.length >= limit/,
      'chrono nodes must count toward `limit`, or a timeline-heavy space blows past it');
  });

  it('reuses the chrono id for the synthetic edge rather than inventing one', () => {
    // An invented edge id would 404 for anyone who looked it up. The chrono's own id resolves.
    assert.match(code, /resultEdges\.push\(\{ _id: doc\._id/);
  });
});

describe('both surfaces take the same flag with the same default', () => {
  const rest = read('server/src/api/brain/search.ts');
  const mcp = read('server/src/mcp/tools/edge.ts');

  it('REST accepts includeChrono, defaults it ON, and validates its type', () => {
    // The three inclusion flags are now validated by one loop over an object of defaults, so the rejection
    // message is templated (`\`${flag}\` must be a boolean`) rather than spelled out per flag. What matters is
    // unchanged: the flag is known, its default is on, and a non-boolean is refused — coercing a string would
    // make includeChrono:"false" silently mean true.
    assert.match(rest, /includeChrono:\s*true/, 'includeChrono must still default to ON');
    assert.match(rest, /must be a boolean/, 'a non-boolean must be rejected, not coerced');
    assert.match(rest, /typeof raw !== 'boolean'|typeof includeChronoRaw !== 'boolean'/,
      'the type check must be a real typeof test');
  });

  it('MCP advertises it in the tool schema, so an agent can discover it', () => {
    assert.match(mcp, /includeChrono: \{ type: 'boolean', default: true/);
  });

  it('both default to ON — the defect was discoverability, not the absence of a flag', () => {
    for (const [name, src] of [['REST', rest], ['MCP', mcp]]) {
      assert.match(src, /includeChrono[^\n]*!== false|!== false/, `${name} must treat only an explicit false as opt-out`);
    }
  });
});
