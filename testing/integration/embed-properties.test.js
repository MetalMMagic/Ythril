/**
 * Integration tests: property KEYS are embedded for semantic recall (B4).
 *
 * Previously the embedded text either dropped property keys (memory/entity) or omitted
 * properties entirely (edge/chrono), so recall couldn't match on a property name and
 * values lost their field context. All builders now fold `key value` pairs into the
 * embedded text via the shared propsEmbedText helper.
 *
 * These tests assert the stored embedding text (`matchedText`, returned by recall)
 * contains the property KEY for a memory, an entity, an edge, and a chrono entry — the edge
 * and chrono cases embedded no property data at all before the original fix, and the REST
 * memory-create path had *regressed* to values-only (it inlined its own embed-text derivation
 * instead of calling the shared `remember()` — fixed by routing it through the shared function).
 *
 * Run: node --test testing/integration/embed-properties.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const SPACE = `b4-embed-props-${RUN}`;

let token;
let embeddingAvailable = false;

/** Poll recall until the doc with `id` appears, then return its result row. */
async function recallMatch(id, query, types, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/recall`, { query, types, topK: 50 });
    if (r.status === 200) {
      const hit = r.body.results?.find(x => x._id === id);
      if (hit) return hit;
    }
    await new Promise(res => setTimeout(res, 500));
  }
  return null;
}

describe('Property keys are embedded (B4)', () => {
  before(async () => {
    token = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
    const c = await post(INSTANCES.a, token, '/api/spaces', { id: SPACE, label: 'B4 Embed Props', meta: { strictLinkage: false } });
    assert.ok([201, 409].includes(c.status), `create space: ${JSON.stringify(c.body)}`);
    // Probe whether embeddings are available in this stack.
    const probe = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/entities`,
      { name: `__probe-${RUN}__`, type: 'probe', properties: { probe: 'yes' } });
    embeddingAvailable = probe.status === 201;
  });

  after(async () => {
    await fetch(`${INSTANCES.a}/api/spaces/${SPACE}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    }).catch(() => {});
  });

  it('memory embedding text includes the property key (REST create, via shared remember())', async (t) => {
    if (!embeddingAvailable) return t.skip('Embedding not available');
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/memories`,
      { fact: `MemPropKey-${RUN}`, properties: { occupation: 'pilot' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    // remember() stores matchedText on the doc, so the create response now exposes it directly —
    // before the fix the REST create set no matchedText and embedded values only ("pilot").
    assert.match(r.body.matchedText ?? '', /occupation pilot/,
      `memory create must fold "key value" into matchedText: ${r.body.matchedText}`);
    const hit = await recallMatch(r.body._id, `MemPropKey-${RUN}`, ['memory']);
    assert.ok(hit, 'memory should be recallable once indexed');
    assert.match(hit.matchedText ?? '', /occupation/,
      `memory embed text must include the property key: ${hit.matchedText}`);
  });

  it('entity embedding text includes the property key', async (t) => {
    if (!embeddingAvailable) return t.skip('Embedding not available');
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/entities`,
      { name: `EntPropKey-${RUN}`, type: 'concept', properties: { occupation: 'engineer' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const hit = await recallMatch(r.body._id, `EntPropKey-${RUN}`, ['entity']);
    assert.ok(hit, 'entity should be recallable once indexed');
    assert.match(hit.matchedText ?? '', /occupation/,
      `entity embed text must include the property key: ${hit.matchedText}`);
  });

  it('chrono embedding text includes the property key (previously omitted entirely)', async (t) => {
    if (!embeddingAvailable) return t.skip('Embedding not available');
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/chrono`, {
      title: `ChronoPropKey-${RUN}`, type: 'event', startsAt: new Date(RUN).toISOString(),
      properties: { venue: 'stadium' },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const hit = await recallMatch(r.body._id, `ChronoPropKey-${RUN}`, ['chrono']);
    assert.ok(hit, 'chrono should be recallable once indexed');
    assert.match(hit.matchedText ?? '', /venue/,
      `chrono embed text must include the property key: ${hit.matchedText}`);
  });

  it('edge embedding text includes the property key (previously omitted entirely)', async (t) => {
    if (!embeddingAvailable) return t.skip('Embedding not available');
    const from = `EdgeFrom-${RUN}`;
    const to = `EdgeTo-${RUN}`;
    await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/entities`, { name: from, type: 'concept' });
    await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/entities`, { name: to, type: 'concept' });
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/edges`, {
      from, to, label: `edgePropKey${RUN}`, properties: { medium: 'email' },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const hit = await recallMatch(r.body._id, `edgePropKey${RUN}`, ['edge']);
    assert.ok(hit, 'edge should be recallable once indexed');
    assert.match(hit.matchedText ?? '', /medium/,
      `edge embed text must include the property key: ${hit.matchedText}`);
  });
});
