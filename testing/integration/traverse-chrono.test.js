/**
 * Integration: `traverse` reaches a chrono entry through `chrono.entityIds`.
 *
 * ## The reported cost
 *
 * `chrono.entityIds` was the only thing linking a chrono to the graph, legible to `query()` and invisible to
 * `traverse` — the retrieval path an agent reaches for first. An integrator measured it: reconstructing a
 * **33-day hardware-RMA timeline took four `query()` calls plus two repo greps**, and the first pass still
 * missed the actual carrier ticket, which had to be found by a name regex rather than by traversal from the
 * incident.
 *
 * ## Why this is an integration test and not only a unit one
 *
 * The source-level gate (`traverse-reaches-chrono`) passed on a version that returned **nothing** for the
 * commonest case in the report: an entity whose only link is a timeline. The BFS breaks out early when a
 * frontier yields no entity neighbours, and the chrono lookup sat after that break — so an incident with ten
 * chrono entries and no edges traversed to an empty result. Nothing about the source reads wrong; only running
 * it does.
 *
 * That case is the first test below, deliberately.
 *
 * Run: node --test testing/integration/traverse-chrono.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const SPACE = `traverse-chrono-${RUN}`;

let tokenA;
const ids = {};
const token = () => tokenA;
const P = (p, body) => post(INSTANCES.a, token(), p, body);
const traverse = (body) => P(`/api/brain/spaces/${SPACE}/traverse`, body);

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  const sp = await P('/api/spaces', { id: SPACE, label: `Traverse Chrono ${RUN}` });
  assert.equal(sp.status, 201, `create space: ${JSON.stringify(sp.body)}`);

  // A lone entity whose ONLY link is a timeline — the case that returned nothing.
  const lone = await P(`/api/brain/spaces/${SPACE}/entities`, { name: `Lone Incident ${RUN}`, type: 'incident' });
  ids.lone = lone.body?._id;

  // And an incident with a real edge AND a chrono, so both kinds of node appear in one result.
  const inc = await P(`/api/brain/spaces/${SPACE}/entities`, { name: `RMA Incident ${RUN}`, type: 'incident' });
  const car = await P(`/api/brain/spaces/${SPACE}/entities`, { name: `Carrier Ticket ${RUN}`, type: 'ticket' });
  ids.inc = inc.body?._id;
  ids.car = car.body?._id;
  await P(`/api/brain/spaces/${SPACE}/edges`, { from: ids.inc, to: ids.car, label: 'depends_on' });

  const c1 = await P(`/api/brain/spaces/${SPACE}/chrono`, {
    title: 'Unit collected by carrier', type: 'event',
    startsAt: '2026-07-04T09:00:00.000Z', entityIds: [ids.inc],
  });
  const c2 = await P(`/api/brain/spaces/${SPACE}/chrono`, {
    title: 'Replacement promised', type: 'event',
    startsAt: '2026-07-06T09:00:00.000Z', entityIds: [ids.lone],
  });
  ids.chrono = c1.body?._id;
  ids.loneChrono = c2.body?._id;
});

after(async () => {
  await fetch(`${INSTANCES.a}/api/spaces/${SPACE}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  }).catch(() => {});
});

describe('traverse reaches chrono entries', () => {
  it('an entity whose ONLY link is a timeline is not a dead end', async () => {
    // The regression the unit gate could not see: the BFS used to break out before looking for chrono.
    const r = await traverse({ startId: ids.lone, direction: 'both', maxDepth: 2 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const node = (r.body.nodes ?? []).find(n => n._id === ids.loneChrono);
    assert.ok(node, `the chrono must be reachable with no edges present: ${JSON.stringify(r.body)}`);
    assert.equal(node.kind, 'chrono');
    assert.equal(node.name, 'Replacement promised', 'the node name is the chrono title');
  });

  it('returns entity and chrono nodes together, and marks only the chrono', async () => {
    const r = await traverse({ startId: ids.inc, direction: 'both', maxDepth: 2 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const nodes = r.body.nodes ?? [];

    const chrono = nodes.find(n => n._id === ids.chrono);
    assert.ok(chrono, `the chrono must be reachable: ${JSON.stringify(nodes)}`);
    assert.equal(chrono.kind, 'chrono');

    const entity = nodes.find(n => n._id === ids.car);
    assert.ok(entity, 'the entity reached by a real edge is still returned');
    assert.ok(!('kind' in entity),
      'an entity node must be unchanged — absence of `kind` is what keeps every existing response identical');

    const link = (r.body.edges ?? []).find(e => e.to === ids.chrono);
    assert.ok(link, 'the synthetic link must be reported like any other edge');
    assert.equal(link.label, 'chrono.entityIds');
    assert.equal(link.from, ids.inc, 'it hangs off the entity the chrono references');
    assert.equal(link._id, ids.chrono, 'the edge id is the chrono id — never an invented id that 404s');
  });

  it('includeChrono:false restores the entity-only shape', async () => {
    const r = await traverse({ startId: ids.inc, direction: 'both', maxDepth: 2, includeChrono: false });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const nodes = r.body.nodes ?? [];
    assert.ok(!nodes.some(n => n._id === ids.chrono), 'no chrono node');
    assert.ok(nodes.some(n => n._id === ids.car), 'the entity is still reached');
  });

  it('an explicit edgeLabels filter excludes chrono unless it names the label', async () => {
    // A filter that cannot exclude something is not a filter: asking for `depends_on` must not quietly
    // return timeline entries.
    const filtered = await traverse({ startId: ids.inc, direction: 'both', maxDepth: 2, edgeLabels: ['depends_on'] });
    assert.ok(!(filtered.body.nodes ?? []).some(n => n._id === ids.chrono),
      `depends_on must not return chrono: ${JSON.stringify(filtered.body.nodes)}`);

    const named = await traverse({ startId: ids.inc, direction: 'both', maxDepth: 2, edgeLabels: ['chrono.entityIds'] });
    assert.ok((named.body.nodes ?? []).some(n => n._id === ids.chrono),
      `naming the label must return it: ${JSON.stringify(named.body.nodes)}`);
  });

  it('refuses a non-boolean includeChrono rather than coercing it', async () => {
    // `includeChrono: "false"` is truthy in JavaScript. Coercing it would mean the opt-out silently did the
    // opposite of what the caller asked.
    const r = await traverse({ startId: ids.inc, includeChrono: 'false' });
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.match(r.body.error, /includeChrono/);
  });
});
