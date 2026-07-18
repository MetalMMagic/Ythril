/**
 * C6 — POST /api/notify/trigger gains an opt-in synchronous mode.
 *
 * Default is fire-and-forget (200 `{status:'triggered'}`). With `?wait=true` the request awaits the
 * sync cycle and reports its outcome, bounded by `?timeoutMs`. We prove the two paths differ using an
 * unknown network, whose sync throws: fire-and-forget swallows it (200), while `?wait=true` surfaces it
 * synchronously (500 `{status:'error'}`) — which is exactly the "sync and tell me the result" affordance.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const MISSING_NET = `no-such-network-${RUN}`;

describe('notify/trigger — synchronous ?wait=true (C6)', () => {
  let tokenA;
  before(() => { tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim(); });

  it('requires networkId', async () => {
    const r = await post(INSTANCES.a, tokenA, '/api/notify/trigger', {});
    assert.equal(r.status, 400);
  });

  it('fire-and-forget (default) returns 200 {status:triggered} even for an unknown network', async () => {
    const r = await post(INSTANCES.a, tokenA, '/api/notify/trigger', { networkId: MISSING_NET });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.status, 'triggered');
    assert.equal(r.body.networkId, MISSING_NET);
  });

  it('?wait=true awaits the cycle and surfaces the outcome synchronously', async () => {
    // Unknown network → the sync cycle throws "Network … not found"; ?wait=true reports it as an error
    // status (500), unlike the fire-and-forget path above which 200s and only logs.
    const r = await post(INSTANCES.a, tokenA, `/api/notify/trigger?wait=true`, { networkId: MISSING_NET });
    assert.equal(r.status, 500, JSON.stringify(r.body));
    assert.equal(r.body.status, 'error');
    assert.match(r.body.error, /not found/i);
    assert.equal(r.body.networkId, MISSING_NET);
  });
});
