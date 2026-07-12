/**
 * Integration tests: signed governance votes + safe relay.
 *
 * Proves the end-to-end wiring of the vote-signing feature:
 *  1. A vote cast created via the API carries an Ed25519 signature, and that
 *     signature survives propagation to a peer unchanged.
 *  2. Signing public keys distribute between peers via member gossip (TOFU pin).
 *  3. A VALID signed cast from a third instance (C) is accepted even when relayed
 *     by a different peer (B) — the multi-hop relay that plain own-cast-only
 *     rejected. A TAMPERED relayed cast is rejected.
 *
 * Run:  node --test testing/sync/vote-signing.test.js
 * Pre-requisite: docker compose -f docker-compose.test.yml up && node testing/sync/setup.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dockerExec, INSTANCES, post, del, delWithBody, triggerSync, waitFor } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, 'configs');

let tokenA, tokenB, instanceIdA, instanceIdB, peerTokenForA, peerTokenForB, networkId, testSpaceId;

function getInstanceId(c) {
  return dockerExec(`docker exec ${c} node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/config/config.json','utf8'));process.stdout.write(j.instanceId)"`).toString().trim();
}
function injectPeerToken(c, id, tok) {
  const s = `const fs=require('fs');const p='/config/secrets.json';const s=JSON.parse(fs.readFileSync(p,'utf8'));s.peerTokens=s.peerTokens||{};s.peerTokens['${id}']='${tok}';fs.writeFileSync(p,JSON.stringify(s,null,2),{mode:0o600});process.stdout.write('ok');`;
  dockerExec(`docker exec ${c} node -e "${s}"`);
}
function readConfig(c) {
  return JSON.parse(dockerExec(`docker exec ${c} node -e "const fs=require('fs');process.stdout.write(fs.readFileSync('/config/config.json','utf8'))"`).toString());
}
/** Mutate a container's config.json for a network via a base64-encoded JS patch fn body. */
function patchNetwork(c, netId, patchB64) {
  const s = `const fs=require('fs');const p='/config/config.json';const cfg=JSON.parse(fs.readFileSync(p,'utf8'));const n=cfg.networks.find(x=>x.id==='${netId}');const patch=new Function('n','cfg',Buffer.from('${patchB64}','base64').toString('utf8'));patch(n,cfg);fs.writeFileSync(p,JSON.stringify(cfg,null,2),{mode:0o600});process.stdout.write('ok');`;
  dockerExec(`docker exec ${c} node -e "${s}"`);
}
function patch(c, netId, fnBody) {
  patchNetwork(c, netId, Buffer.from(fnBody, 'utf8').toString('base64'));
}

function voteMsg({ networkId, roundId, subjectInstanceId, instanceId, vote }) {
  return ['ythril-vote:v1', networkId, roundId, subjectInstanceId, instanceId, vote].join('|');
}
function ed25519() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    pub: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    priv: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}
function signCast(priv, fields) {
  return crypto.sign(null, Buffer.from(voteMsg(fields), 'utf8'), crypto.createPrivateKey(priv)).toString('base64');
}

describe('Signed governance votes and safe relay', () => {
  before(async () => {
    tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
    tokenB = fs.readFileSync(path.join(CONFIGS, 'b', 'token.txt'), 'utf8').trim();
    instanceIdA = getInstanceId('ythril-a');
    instanceIdB = getInstanceId('ythril-b');

    testSpaceId = `vote-signing-${Date.now()}`;
    await post(INSTANCES.a, tokenA, '/api/spaces', { id: testSpaceId, label: 'Vote Signing Test Space' });
    await post(INSTANCES.b, tokenB, '/api/spaces', { id: testSpaceId, label: 'Vote Signing Test Space' });

    peerTokenForA = (await post(INSTANCES.b, tokenB, '/api/tokens', { name: `vs-a-${Date.now()}` })).body.plaintext;
    peerTokenForB = (await post(INSTANCES.a, tokenA, '/api/tokens', { name: `vs-b-${Date.now()}` })).body.plaintext;

    const netR = await post(INSTANCES.a, tokenA, '/api/networks', {
      label: `Vote Signing ${Date.now()}`, type: 'closed', spaces: [testSpaceId], votingDeadlineHours: 1,
    });
    assert.equal(netR.status, 201, JSON.stringify(netR.body));
    networkId = netR.body.id;

    const addB = await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/members`, {
      instanceId: instanceIdB, label: 'Instance B', url: 'http://ythril-b:3200', token: peerTokenForA, direction: 'both',
    });
    if (addB.status === 202) await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/votes/${addB.body.roundId}`, { vote: 'yes' });

    const netOnB = await post(INSTANCES.b, tokenB, '/api/networks', {
      id: networkId, label: 'Vote Signing', type: 'closed', spaces: [testSpaceId], votingDeadlineHours: 1,
    });
    assert.ok(netOnB.status === 201 || netOnB.status === 409, JSON.stringify(netOnB.body));
    const addAonB = await post(INSTANCES.b, tokenB, `/api/networks/${networkId}/members`, {
      instanceId: instanceIdA, label: 'Instance A', url: 'http://ythril-a:3200', token: peerTokenForB, direction: 'both',
    });
    if (addAonB.status === 202) await post(INSTANCES.b, tokenB, `/api/networks/${networkId}/votes/${addAonB.body.roundId}`, { vote: 'yes' });

    injectPeerToken('ythril-a', instanceIdB, peerTokenForA);
    injectPeerToken('ythril-b', instanceIdA, peerTokenForB);
    await post(INSTANCES.a, tokenA, '/api/admin/reload-config', {});
    await post(INSTANCES.b, tokenB, '/api/admin/reload-config', {});
  });

  after(async () => {
    if (networkId) {
      await del(INSTANCES.a, tokenA, `/api/networks/${networkId}`).catch(() => {});
      await del(INSTANCES.b, tokenB, `/api/networks/${networkId}`).catch(() => {});
      await delWithBody(INSTANCES.a, tokenA, `/api/spaces/${testSpaceId}`, { confirm: true }).catch(() => {});
      await delWithBody(INSTANCES.b, tokenB, `/api/spaces/${testSpaceId}`, { confirm: true }).catch(() => {});
    }
  });

  it('A vote cast is signed, and the signature propagates to B intact', async () => {
    // Open a join round on A and cast A's vote (now signed).
    const cand = `sig-cand-${Date.now()}`;
    const open = await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/members`, {
      instanceId: cand, label: 'Sig Candidate', url: 'http://vote-sign.internal:3200', token: `ythril_sig_${cand}`, direction: 'both',
    });
    assert.equal(open.status, 202, JSON.stringify(open.body));
    const roundId = open.body.roundId;
    const vr = await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/votes/${roundId}`, { vote: 'yes' });
    assert.ok([200, 201].includes(vr.status), JSON.stringify(vr.body));

    // A's own cast must carry a signature.
    const roundOnA = readConfig('ythril-a').networks.find(n => n.id === networkId).pendingRounds.find(r => r.roundId === roundId);
    const aCast = roundOnA.votes.find(v => v.instanceId === instanceIdA);
    assert.ok(aCast?.sig, 'A\'s vote cast must be signed');

    // Propagate to B and confirm the signature survived unchanged.
    await triggerSync(INSTANCES.b, tokenB, networkId);
    await waitFor(async () => {
      const rb = readConfig('ythril-b').networks.find(n => n.id === networkId)?.pendingRounds.find(r => r.roundId === roundId);
      const bCast = rb?.votes?.find(v => v.instanceId === instanceIdA);
      return bCast?.sig === aCast.sig;
    }, 10_000);
  });

  it('peers pin each other\'s signing public keys via gossip', async () => {
    await triggerSync(INSTANCES.a, tokenA, networkId);
    await triggerSync(INSTANCES.b, tokenB, networkId);
    await waitFor(async () => {
      const aSeesB = readConfig('ythril-a').networks.find(n => n.id === networkId)?.members.find(m => m.instanceId === instanceIdB)?.signingPublicKey;
      const bSeesA = readConfig('ythril-b').networks.find(n => n.id === networkId)?.members.find(m => m.instanceId === instanceIdA)?.signingPublicKey;
      return !!aSeesB && !!bSeesA;
    }, 12_000);
  });

  it('a VALID signed cast from a third instance is accepted when relayed by B; a tampered one is rejected', async () => {
    // Virtual third instance C with its own keypair, pinned as a member on A.
    const C = ed25519();
    const instanceIdC = `virt-c-${Date.now()}`;
    patch('ythril-a', networkId, `n.members.push({instanceId:${JSON.stringify(instanceIdC)},label:'Virtual C',url:'http://virtual-c.internal:3200',tokenHash:'x',direction:'both',signingPublicKey:${JSON.stringify(C.pub)}});`);
    await post(INSTANCES.a, tokenA, '/api/admin/reload-config', {});

    // Two rounds injected on B (which A will pull): one with a VALID C-signature,
    // one where the vote value was tampered after signing. Subject is a ghost id so
    // nothing is actually removed even if a round concluded.
    const validRid = `relay-ok-${Date.now()}`;
    const tamperRid = `relay-bad-${Date.now()}`;
    const ghost = 'ghost-subject';
    const validSig = signCast(C.priv, { networkId, roundId: validRid, subjectInstanceId: ghost, instanceId: instanceIdC, vote: 'yes' });
    const tamperSig = signCast(C.priv, { networkId, roundId: tamperRid, subjectInstanceId: ghost, instanceId: instanceIdC, vote: 'yes' });
    const deadline = new Date(Date.now() + 3_600_000).toISOString();
    const mkRound = (rid, vote, sig) => ({
      roundId: rid, type: 'remove', subjectInstanceId: ghost, subjectLabel: 'Ghost', subjectUrl: 'http://ghost.internal:3200',
      deadline, openedAt: new Date().toISOString(),
      votes: [{ instanceId: instanceIdC, vote, castAt: new Date().toISOString(), sig }],
    });
    patch('ythril-b', networkId, `n.pendingRounds=n.pendingRounds||[];n.pendingRounds.push(${JSON.stringify(mkRound(validRid, 'yes', validSig))});n.pendingRounds.push(${JSON.stringify(mkRound(tamperRid, 'veto', tamperSig))});`);
    await post(INSTANCES.b, tokenB, '/api/admin/reload-config', {});

    // A pulls from B (relay).
    await triggerSync(INSTANCES.a, tokenA, networkId);
    await triggerSync(INSTANCES.a, tokenA, networkId);

    await waitFor(async () => {
      const nets = readConfig('ythril-a').networks.find(n => n.id === networkId);
      const ok = nets?.pendingRounds?.find(r => r.roundId === validRid);
      return ok?.votes?.some(v => v.instanceId === instanceIdC && v.vote === 'yes');
    }, 12_000);

    const netA = readConfig('ythril-a').networks.find(n => n.id === networkId);
    const validRound = netA.pendingRounds.find(r => r.roundId === validRid);
    assert.ok(
      validRound?.votes?.some(v => v.instanceId === instanceIdC && v.sig === validSig),
      'A must accept C\'s validly-signed cast relayed by B (safe multi-hop relay)',
    );
    const tamperRound = netA.pendingRounds.find(r => r.roundId === tamperRid);
    if (tamperRound) {
      assert.ok(
        !tamperRound.votes?.some(v => v.instanceId === instanceIdC),
        'A must reject a tampered (vote value != signed value) relayed cast',
      );
    }
  });
});
