/**
 * `skip` is honoured on `POST /query`, and the four brain read routes refuse a key they cannot honour — REST and MCP.
 *
 * ## The report
 *
 * aigents, 2026-08-12T1410Z: `skip` was accepted at 200 and silently ignored, and *"it cost us a fabricated number"* —
 * a paged sweep re-read page one every time and was counted as if it had advanced.
 *
 * Two defects, and they need different fixes. Honouring `skip` is a feature; **refusing a key the route cannot honour is
 * the bug fix**, and it is the one that would have saved them the number. So this file asserts the refusal on all four
 * read routes, not the one key on the one route.
 *
 * MCP's `query` already declared `additionalProperties: false` and so already refused unknown arguments — REST was the
 * weaker of the two surfaces for the same rule. That is the pattern this codebase keeps producing, so the MCP half here
 * checks the thing MCP could still get wrong: that `skip` is offered and honoured there too, rather than becoming a
 * REST-only parameter the day after we emptied the REST-only capability map.
 *
 * ## Paging is asserted by TILING, not by "page two differs from page one"
 *
 * Two different pages can both be wrong. The assertion is that the concatenated pages equal one unpaged read exactly —
 * same ids, same order, no repeats — because a sweep that re-reads or drops a row still returns plausible pages, which is
 * precisely how the fabricated number was produced.
 *
 * Run: node --test testing/integration/query-skip-and-strict-bodies.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, delWithBody } from '../sync/helpers.js';
import { openMcpSession } from '../sync/mcp-session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();

const SPACE = `qskip-${RUN}`;
const M1 = `qskip-m1-${RUN}`;
const M2 = `qskip-m2-${RUN}`;
const PROXY = `qskip-proxy-${RUN}`;
const TOTAL = 12;

let token;
let session;
const created = [];

const query = (body, space = SPACE) => post(INSTANCES.a, token, `/api/brain/spaces/${space}/query`, body);

async function makeSpace(id, body = {}) {
  const r = await post(INSTANCES.a, token, '/api/spaces', { id, label: id, ...body });
  assert.equal(r.status, 201, `space create failed: ${JSON.stringify(r.body)}`);
  created.push(id);
}

before(async () => {
  token = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  await makeSpace(SPACE);
  await makeSpace(M1);
  await makeSpace(M2);
  await makeSpace(PROXY, { proxyFor: [M1, M2] });

  // Sequential, so `seq` is strictly increasing and the documented order is total.
  for (let i = 0; i < TOTAL; i++) {
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/memories`, {
      fact: `paged ${String(i).padStart(2, '0')} ${RUN}`,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  }
  // Half in each member, so a proxy page has to interleave rather than concatenate.
  for (let i = 0; i < 6; i++) {
    for (const m of [M1, M2]) {
      await post(INSTANCES.a, token, `/api/brain/spaces/${m}/memories`, { fact: `${m} row ${i} ${RUN}` });
    }
  }
  session = await openMcpSession(token);
});

after(async () => {
  session?.close();
  for (const id of created.reverse()) {
    await delWithBody(INSTANCES.a, token, `/api/spaces/${id}`, { confirm: true }).catch(() => {});
  }
});

describe('REST: skip paginates instead of being ignored', () => {
  it('page two does not start where page one did', async () => {
    const p1 = await query({ collection: 'memories', filter: {}, limit: 5, skip: 0 });
    const p2 = await query({ collection: 'memories', filter: {}, limit: 5, skip: 5 });
    assert.equal(p1.status, 200, JSON.stringify(p1.body));
    assert.equal(p2.status, 200, JSON.stringify(p2.body));
    assert.equal(p1.body.results.length, 5);
    assert.notEqual(p1.body.results[0]._id, p2.body.results[0]._id,
      'this is the reported defect: page two returned page one');
  });

  it('the pages TILE the collection — no repeats, no gaps, same order', async () => {
    const all = await query({ collection: 'memories', filter: {}, limit: 100 });
    assert.equal(all.body.results.length, TOTAL);

    const stitched = [];
    for (let s = 0; s < TOTAL; s += 5) {
      const page = await query({ collection: 'memories', filter: {}, limit: 5, skip: s });
      stitched.push(...page.body.results);
    }
    assert.deepEqual(stitched.map(d => d._id), all.body.results.map(d => d._id));
    assert.equal(new Set(stitched.map(d => d._id)).size, TOTAL);
  });

  it('echoes limit and skip, so a caller can tell what was applied', async () => {
    // The distinction the fabricated number came from: "the page I asked for" vs "what the server capped it to".
    const r = await query({ collection: 'memories', filter: {}, limit: 3, skip: 4 });
    assert.equal(r.body.limit, 3);
    assert.equal(r.body.skip, 4);
    assert.equal(r.body.count, 3);
  });

  it('a skip past the end is an empty page, not the last one', async () => {
    // Returning the tail here makes a paging loop run for ever.
    const r = await query({ collection: 'memories', filter: {}, limit: 5, skip: TOTAL + 50 });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.results, []);
  });

  it('refuses a negative or fractional skip rather than reading it as 0', async () => {
    for (const bad of [-1, 1.5, '3', null]) {
      const r = await query({ collection: 'memories', filter: {}, skip: bad });
      assert.equal(r.status, 400, `skip=${JSON.stringify(bad)} was accepted: ${JSON.stringify(r.body)}`);
    }
  });

  it('pages a PROXY space over the merged set, not per member', async () => {
    // The compounding defect: asking each member for [skip, skip+limit) and concatenating skips that many rows PER
    // MEMBER and orders the result by member. Twelve rows across two members must page exactly like twelve in one.
    const all = await query({ collection: 'memories', filter: {}, limit: 100 }, PROXY);
    assert.equal(all.status, 200, JSON.stringify(all.body));
    assert.equal(all.body.results.length, 12, 'both members are read');

    const stitched = [];
    for (let s = 0; s < 12; s += 4) {
      const page = await query({ collection: 'memories', filter: {}, limit: 4, skip: s }, PROXY);
      assert.ok(page.body.results.length <= 4,
        `a proxy page returned ${page.body.results.length} rows for limit 4 — the limit is per member, not per page`);
      stitched.push(...page.body.results);
    }
    assert.equal(new Set(stitched.map(d => d._id)).size, 12, 'every row exactly once across the proxy pages');
    assert.deepEqual(stitched.map(d => d._id), all.body.results.map(d => d._id),
      'and in the same order as the unpaged read');
  });
});

describe('REST: the four read routes refuse a key they cannot honour', () => {
  const cases = [
    ['/query', { collection: 'memories', filter: {}, sort: { seq: 1 } }, 'sort'],
    ['/recall', { query: 'anything', topk: 5 }, 'topk'],
    ['/traverse', { startId: '00000000-0000-4000-8000-000000000000', depth: 2 }, 'depth'],
    ['/find-similar', { entryId: '00000000-0000-4000-8000-000000000000', entryType: 'memory', limit: 5 }, 'limit'],
  ];

  for (const [route, body, offender] of cases) {
    it(`${route} names the unknown key '${offender}' in a 400`, async () => {
      // Naming it matters: `{"error":"unknown field"}` sends a caller reading their own request to find which one, and
      // the entire value of refusing is to shorten that search to zero.
      const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}${route}`, body);
      assert.equal(r.status, 400, `${route} accepted '${offender}': ${JSON.stringify(r.body)}`);
      assert.ok(JSON.stringify(r.body).includes(offender), `the 400 must name '${offender}': ${JSON.stringify(r.body)}`);
      assert.deepEqual(r.body.unrecognized_keys, [offender]);
    });
  }

  it('still accepts every documented key on /query', async () => {
    // The other half of strictness, and the one that breaks callers if it is wrong.
    const r = await query({
      collection: 'memories', filter: {}, projection: { fact: 1 }, limit: 2, skip: 1, maxTimeMS: 3000,
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });

  it('still accepts the DEPRECATED crossSpace on find-similar', async () => {
    // Refusing a key we deprecated but still accept elsewhere would be a worse contract than the permissive body this
    // replaces: we told callers to stop using it, not that it would start erroring.
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/find-similar`, {
      entryId: '00000000-0000-4000-8000-000000000000', entryType: 'memory', crossSpace: false,
    });
    assert.notEqual(r.status, 400, `crossSpace was refused: ${JSON.stringify(r.body)}`);
  });
});

describe('MCP: query offers skip too, rather than it becoming REST-only', () => {
  it('advertises skip in the tool schema', async () => {
    const tool = (await session.listTools()).find(t => t.name === 'query');
    assert.ok(tool, 'query tool missing');
    assert.ok(tool.inputSchema.properties.skip,
      'skip must be on the MCP schema as well — a parameter added to REST alone is how the capability map filled up');
  });

  it('honours it, and the pages tile', async () => {
    const call = (args) => session.callTool('query', { space: SPACE, collection: 'memories', filter: {}, ...args });
    const all = JSON.parse((await call({ limit: 100 })).content[0].text);
    assert.equal(all.length, TOTAL);

    const stitched = [];
    for (let s = 0; s < TOTAL; s += 5) {
      stitched.push(...JSON.parse((await call({ limit: 5, skip: s })).content[0].text));
    }
    assert.deepEqual(stitched.map(d => d._id), all.map(d => d._id), 'MCP pages must tile exactly as REST does');
  });

  it('refuses a fractional skip', async () => {
    const r = await session.callTool('query', { space: SPACE, collection: 'memories', filter: {}, skip: 1.5 });
    assert.ok(r?.isError, `a fractional skip was accepted: ${JSON.stringify(r)}`);
  });

  it('already refused unknown arguments, and still does', async () => {
    // `additionalProperties: false` was always there. Asserted so that a future relaxation of the schema shows up here
    // rather than as a silently ignored argument, which is the REST defect arriving on the other surface.
    const r = await session.callTool('query', { space: SPACE, collection: 'memories', filter: {}, sort: { seq: 1 } });
    assert.ok(r?.isError, `MCP accepted an unknown argument: ${JSON.stringify(r)}`);
  });
});
