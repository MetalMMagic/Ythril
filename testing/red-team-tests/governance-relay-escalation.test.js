/**
 * Red-team: the governance relays cannot be driven by an ordinary write token.
 *
 * `POST /api/sync/networks/:id/members` and `POST /api/sync/networks/:id/votes/:roundId` are peer relays.
 * Both carried `requireAuth` and `denyReadOnly` and nothing else — no space scope, no network membership —
 * so every token that could write anything could drive both.
 *
 * **What that reached.** On the members relay, any member's `url`, `label` or `children`. On the votes relay,
 * a cast attributed to ANY instance on ANY round, accepted even where the network sets `requireSignedVotes`:
 * the reporter resolved as `callerPeerId ?? body.instanceId`, so a caller with no peer identity became the
 * cast's own instance, the two matched by construction, and the own-cast path was taken. The rounds include
 * `remove`, `space_deletion` and `space_wipe`, and on `club` and `pubsub` one yes with no veto carries.
 *
 * **The refusal is asserted from OUTSIDE, with a token the product itself minted.** A unit test on the
 * predicate proves the rule; only a call proves the route asks it. The two escalations are checked
 * separately because they were two different holes in one rule, and a guard wired to one route would
 * otherwise report the pair as fixed.
 *
 * The round id below does not exist, and that is deliberate rather than a shortcut: the authorisation check
 * runs BEFORE the network and round lookups now, so a caller who may not vote is told so instead of learning
 * which rounds are open. A 404 here would mean the old order is back.
 *
 * Run: node --test testing/red-team-tests/governance-relay-escalation.test.js
 * Pre-requisite: the test stack is up and tokens provisioned (testing/sync/setup.js).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, del } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();

let adminToken;
let plainWriteToken;
const tokenIds = [];

before(async () => {
  adminToken = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();

  // An ORDINARY token: it can write, it is not an instance admin, and it carries no peer identity. That is
  // the shape every escalation below used, and it is the commonest token an instance hands out.
  const t = await post(INSTANCES.a, adminToken, '/api/tokens', {
    name: `relay-escalation-${RUN}`,
    spaces: ['general'],
  });
  assert.equal(t.status, 201, JSON.stringify(t.body));
  plainWriteToken = t.body.plaintext;
  tokenIds.push(t.body.token.id);
});

after(async () => {
  for (const id of tokenIds) await del(INSTANCES.a, adminToken, `/api/tokens/${id}`).catch(() => {});
});

describe('an ordinary write token cannot drive the governance relays', () => {
  it('the members relay refuses it', async () => {
    const r = await post(INSTANCES.a, plainWriteToken, '/api/sync/networks/any-network/members', {
      instanceId: 'attacker-instance',
      label: 'rewritten',
      url: 'https://example.invalid',
    });
    assert.equal(r.status, 403, `expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('the votes relay refuses it, and refuses BEFORE telling it whether the round exists', async () => {
    /*
     * Both halves in one assertion, because they fail differently. A 200 means the escalation is back. A
     * 404 means the authorisation moved back below the lookups, so an unauthorised caller can enumerate a
     * network's open rounds by the status code — which is how this route leaked before the reorder.
     */
    const r = await post(
      INSTANCES.a,
      plainWriteToken,
      '/api/sync/networks/any-network/votes/00000000-0000-4000-8000-000000000000',
      { vote: 'yes', instanceId: 'attacker-instance' },
    );
    assert.equal(r.status, 403, `expected 403 before any lookup, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('and the refusal names both ways in, so the caller is not left guessing', async () => {
    // A relay is wired up once and then debugged from the response. A bare 403 does not say whether a peer
    // credential or an administrator's is wanted, and both are legitimate answers.
    const r = await post(INSTANCES.a, plainWriteToken, '/api/sync/networks/any-network/members', {
      instanceId: 'attacker-instance',
      label: 'rewritten',
    });
    const msg = String(r.body?.error ?? '');
    assert.match(msg, /peer token/i, `the refusal does not mention a peer token: ${msg}`);
    assert.match(msg, /instance administrator/i, `the refusal does not mention an admin: ${msg}`);
  });
});

describe('the instance administrator still reaches them — the fix must not close the legitimate door', () => {
  it('an admin token gets past authorisation and is answered on the merits', async () => {
    /*
     * `404 Network not found` is the PASS here. It means the caller was authorised and the route went on to
     * look up a network that genuinely is not there. A 403 would mean the guard is too narrow and has locked
     * out the local administrator — the failure mode opposite to the one this file is about, and the one that
     * would be found by an operator rather than by a test.
     */
    const r = await post(INSTANCES.a, adminToken, '/api/sync/networks/any-network/members', {
      instanceId: 'some-instance',
      label: 'x',
    });
    assert.equal(r.status, 404, `expected 404 (authorised, no such network), got ${r.status}`);
  });

  it('and on the votes relay too', async () => {
    const r = await post(
      INSTANCES.a,
      adminToken,
      '/api/sync/networks/any-network/votes/00000000-0000-4000-8000-000000000000',
      { vote: 'yes', instanceId: 'some-instance' },
    );
    assert.equal(r.status, 404, `expected 404 (authorised, no such network), got ${r.status}`);
  });
});
