/**
 * Integration tests: Pub/Sub topology sync (Publisher A -> Subscriber B)
 *
 * Verifies:
 *  1. Publisher writes propagate down to subscribers
 *  2. Subscriber writes do NOT propagate up to the publisher
 *  3. Publisher tombstones only delete publisher-authored docs on subscriber
 *
 * Run: node --test testing/sync/pubsub-topology.test.js
 * Pre-requisite: docker compose -f docker-compose.test.yml up && node testing/sync/setup.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INSTANCES, post, postRetry429, get, del, triggerSync, createMemory, waitFor,
} from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, 'configs');

let tokenA, tokenB;
let networkId;

describe('Pub/Sub topology (Publisher A -> Subscriber B)', () => {
  before(async () => {
    tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
    tokenB = fs.readFileSync(path.join(CONFIGS, 'b', 'token.txt'), 'utf8').trim();

    // Create pubsub network on A (publisher)
    const r = await post(INSTANCES.a, tokenA, '/api/networks', {
      label: 'Test PubSub',
      type: 'pubsub',
      spaces: ['general'],
    });
    assert.equal(r.status, 201, `Create pubsub network: ${JSON.stringify(r.body)}`);
    networkId = r.body.id;

    // Create a peer token on B for A to use when pushing
    const bPeer = await postRetry429(INSTANCES.b, tokenB, '/api/tokens', { name: 'pubsub-peer-a' });
    assert.equal(bPeer.status, 201, `Create peer token on B: ${JSON.stringify(bPeer.body)}`);

    // Add B as subscriber on A (direction=push: A pushes to B)
    const addB = await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/members`, {
      instanceId: 'instance-b',
      label: 'Instance B (Subscriber)',
      url: 'http://ythril-b:3200',
      token: bPeer.body.plaintext,
      direction: 'push',
    });
    assert.equal(addB.status, 201, `Add subscriber B: ${JSON.stringify(addB.body)}`);

    // Register the same network on B (subscriber side)
    const regB = await post(INSTANCES.b, tokenB, '/api/networks', {
      id: networkId,
      label: 'Test PubSub',
      type: 'pubsub',
      spaces: ['general'],
    });
    assert.equal(regB.status, 201, `Register pubsub network on B: ${JSON.stringify(regB.body)}`);

    // Create a peer token on A for B to use when pulling
    const aPeer = await postRetry429(INSTANCES.a, tokenA, '/api/tokens', { name: 'pubsub-peer-b' });
    assert.equal(aPeer.status, 201, `Create peer token on A: ${JSON.stringify(aPeer.body)}`);

    // Add A as the publisher member on B's side (direction=pull: B pulls from A)
    const addA = await post(INSTANCES.b, tokenB, `/api/networks/${networkId}/members`, {
      instanceId: 'instance-a',
      label: 'Instance A (Publisher)',
      url: 'http://ythril-a:3200',
      token: aPeer.body.plaintext,
      direction: 'pull',
    });
    assert.equal(addA.status, 201, `Add publisher A on B: ${JSON.stringify(addA.body)}`);

    // Verify direction was preserved as 'pull' (not forced to 'push')
    const netB = await get(INSTANCES.b, tokenB, `/api/networks/${networkId}`);
    const pubMember = netB.body.members?.find(m => m.instanceId === 'instance-a');
    assert.equal(pubMember?.direction, 'pull', 'Publisher stored as pull on subscriber side');

    console.log(`Created pubsub network: ${networkId}`);
  });

  after(async () => {
    if (networkId) {
      await del(INSTANCES.a, tokenA, `/api/networks/${networkId}`).catch(() => {});
      await del(INSTANCES.b, tokenB, `/api/networks/${networkId}`).catch(() => {});
    }
  });

  it('Publisher A: write propagates down to Subscriber B', async () => {
    const write = await createMemory(INSTANCES.a, tokenA, 'Published fact from A', ['pubsub-test']);
    assert.equal(write.status, 201);
    const memId = write.body._id ?? write.body.id;

    // A pushes to B
    await triggerSync(INSTANCES.a, tokenA, networkId);
    await waitFor(async () => {
      const r = await get(INSTANCES.b, tokenB, `/api/brain/general/memories/${memId}`);
      return r.status === 200;
    }, 15_000);
    console.log(`  Published fact appeared on B ✓`);
  });

  it('Subscriber B: write does NOT propagate to Publisher A', async () => {
    const write = await createMemory(INSTANCES.b, tokenB, 'Subscriber-only fact from B', ['pubsub-sub-local']);
    assert.equal(write.status, 201);
    const subMemId = write.body._id ?? write.body.id;

    // B syncs — B has A as direction='pull', so B only pulls from A, never pushes
    await triggerSync(INSTANCES.b, tokenB, networkId);

    // A syncs — A pushes to B, never pulls from B
    await triggerSync(INSTANCES.a, tokenA, networkId);

    // Wait and verify the subscriber-local fact is NOT on A
    await new Promise(r => setTimeout(r, 3_000));
    const r = await get(INSTANCES.a, tokenA, `/api/brain/general/memories/${subMemId}`);
    assert.equal(r.status, 404, 'Subscriber fact should NOT appear on publisher');
    console.log(`  Subscriber fact correctly absent from A ✓`);
  });

  it('Subscriber-local content survives publisher tombstone', async () => {
    // B creates a local memory
    const subWrite = await createMemory(INSTANCES.b, tokenB, 'Subscriber local fact for tombstone test', ['pubsub-survivor']);
    assert.equal(subWrite.status, 201);
    const subMemId = subWrite.body._id ?? subWrite.body.id;

    // A creates and then deletes a memory — tombstone should propagate to B
    const pubWrite = await createMemory(INSTANCES.a, tokenA, 'Publisher fact to be deleted', ['pubsub-delete-test']);
    assert.equal(pubWrite.status, 201);
    const pubMemId = pubWrite.body._id ?? pubWrite.body.id;

    // Push publisher memory to B first
    await triggerSync(INSTANCES.a, tokenA, networkId);
    await waitFor(async () => {
      const r = await get(INSTANCES.b, tokenB, `/api/brain/general/memories/${pubMemId}`);
      return r.status === 200;
    }, 15_000);

    // Now delete on A
    const delR = await del(INSTANCES.a, tokenA, `/api/brain/general/memories/${pubMemId}`);
    assert.equal(delR.status, 204, `Delete on A: expected 204, got ${delR.status}`);

    // Push tombstone to B
    await triggerSync(INSTANCES.a, tokenA, networkId);

    // Wait for tombstone to propagate
    await waitFor(async () => {
      const r = await get(INSTANCES.b, tokenB, `/api/brain/general/memories/${pubMemId}`);
      return r.status === 404;
    }, 15_000);
    console.log(`  Publisher's deleted fact removed from B ✓`);

    // Verify subscriber's own memory still exists
    const subCheck = await get(INSTANCES.b, tokenB, `/api/brain/general/memories/${subMemId}`);
    assert.equal(subCheck.status, 200, 'Subscriber local fact must survive publisher tombstone');
    console.log(`  Subscriber local fact survived publisher tombstone ✓`);
  });
});
