/**
 * Integration tests: property KEYS are embedded for semantic recall (B4).
 *
 * Previously the embedded text either dropped property keys (memory/entity) or omitted
 * properties entirely (edge/chrono), so recall couldn't match on a property name and
 * values lost their field context. All builders now fold `key value` pairs into the
 * embedded text via the shared propsEmbedText helper.
 *
 * These tests assert the stored embedding text (`matchedText`, read back from the RECORD — see the helper
 * below for why not from recall) contains the property KEY for a memory, an entity, an edge, and a chrono
 * entry — the edge
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
import { INSTANCES, post, get } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const SPACE = `b4-embed-props-${RUN}`;

let token;
let embeddingAvailable = false;

/**
 * Poll the RECORD by id until its `matchedText` is populated, then return it.
 *
 * ## Why this does not use recall, having previously used it
 *
 * These tests assert one thing: that a property KEY reaches the stored embed text. `matchedText` lives on the
 * document, written by the embed job moments after the write. Recall was never necessary to see it — it was
 * incidental, and it was the only reason this suite was flaky.
 *
 * The old helper polled `POST /recall` for **30 seconds** waiting for the record to become findable. Recall
 * reads the **eventually-consistent vector index**, and the worst case for that lag was MEASURED by an
 * operator at **150 seconds** (tracked separately: `recall` cannot see a record written two minutes ago). So
 * the deadline was five times too short and the suite failed whenever the index was slow — four times in one
 * evening, twice on `main` where no PR was in flight, each time reading like a mysterious infrastructure
 * flake on a diff that could not touch it.
 *
 * **Raising the timeout was the tempting fix and the wrong one:** it would trade a flaky test for a
 * two-and-a-half-minute one, and it would still be measuring index latency rather than the thing under test.
 * Reading the document waits only for the embed job — about a second — and it cannot be affected by index lag
 * at all.
 *
 * The `matchedText != null` condition matters: an immediate read can arrive before the embed job has run, and
 * asserting on an absent value would turn this back into a race with a different clock.
 */
const COLLECTION_PATH = { memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono' };

async function embedTextOf(kind, id, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await get(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/${COLLECTION_PATH[kind]}/${id}`);
    if (r.status === 200 && r.body?.matchedText != null) return r.body;
    await new Promise(res => setTimeout(res, 250));
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
    const hit = await embedTextOf('memory', r.body._id);
    assert.ok(hit, 'memory should have its embed text stored');
    assert.match(hit.matchedText ?? '', /occupation/,
      `memory embed text must include the property key: ${hit.matchedText}`);
  });

  it('entity embedding text includes the property key', async (t) => {
    if (!embeddingAvailable) return t.skip('Embedding not available');
    const r = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/entities`,
      { name: `EntPropKey-${RUN}`, type: 'concept', properties: { occupation: 'engineer' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const hit = await embedTextOf('entity', r.body._id);
    assert.ok(hit, 'entity should have its embed text stored');
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
    const hit = await embedTextOf('chrono', r.body._id);
    assert.ok(hit, 'chrono should have its embed text stored');
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
    const hit = await embedTextOf('edge', r.body._id);
    assert.ok(hit, 'edge should have its embed text stored');
    assert.match(hit.matchedText ?? '', /medium/,
      `edge embed text must include the property key: ${hit.matchedText}`);
  });
});
