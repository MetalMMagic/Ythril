/**
 * Database-level tests: deleting a person unlinks their face vectors.
 *
 * The bug these pin down: face descriptors are not stored in a face collection — they are **filemeta**
 * records (`{fileId}#face-chunk{N}`) carrying `faceEmbedding` and, once labelled, `faceEntityId`.
 * `deleteEntity` deleted the entity and wrote a tombstone and never touched `${spaceId}_files`, so the
 * only "delete this person" action the product offers left their biometric descriptors on disk still
 * tagged with the identifier that was just erased.
 *
 * Three properties are under test, and they are not the same property:
 *
 *   1. THE CASCADE FIRES, AND UNLABELS RATHER THAN DELETES. The face record belongs to the *file*,
 *      which the operator did not delete. "Delete this person" means we stop claiming to know whose
 *      face it is — not that the photo loses its face. So `faceEntityId`/`faceScore` go and
 *      `faceEmbedding` stays.
 *   2. IT FIRES ON EVERY DELETE PATH. Single delete, bulk wipe, and the TTL sweep (which routes
 *      through `deleteEntity`, so a person entity can expire and detach its faces with no human
 *      action at all). This being fixed in one caller only is the exact shape of the original bug.
 *   3. THE BLIND SPOT THAT HID IT IS CLOSED. `findEntityBacklinks` scanned `_edges`/`_memories`/
 *      `_chrono` and not `_files`, so under `strictLinkage` — the strongest setting available — a
 *      person referenced *only* by face labels deleted cleanly and the "something still points at
 *      this" guard stayed silent about the one reference class holding biometric data.
 *
 * These run against a REAL MongoDB (see `_mongo-harness.mjs`). That is deliberate and not incidental:
 * the cascade is an `updateMany` with `$unset` and an `$in` filter, and a hand-written fake collection
 * that got either subtly wrong would pass here while production kept the labels.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/face-label-cascade.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

// `deleteEntity` reads `getConfig().instanceId` for the tombstone — set before importing the loader.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-face-cascade-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;

const SPACE = 'general';
const ALICE = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const BOB   = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

let mongo, entities, files, brain, faceEmbedder;

/** A face-chunk filemeta record, exactly the shape the recogniser writes. */
function faceChunk(id, parentFileId, entityId) {
  return {
    _id: id,
    spaceId: SPACE,
    parentFileId,
    faceEmbedding: Array.from({ length: 128 }, (_, i) => i / 128),
    faceBbox: [0.1, 0.1, 0.2, 0.2],
    ...(entityId ? { faceEntityId: entityId, faceScore: 0.91 } : {}),
  };
}

const face = (id) => files.findOne({ _id: id });

describe('face labels cascade when their person is deleted', { skip }, () => {
  before(async () => {
    mongo = await openTestMongo('facecascade');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      instanceId: 'face-cascade-test', instanceLabel: 'test', tokens: [], networks: [],
      spaces: [{ id: SPACE, label: 'General', builtIn: true, folders: [] }],
    }, null, 2), { mode: 0o600 });
    const loader = await import('../../server/dist/config/loader.js');
    loader.loadConfig();

    brain = await import('../../server/dist/brain/entities.js');
    faceEmbedder = await import('../../server/dist/files/media/face-embedder.js');
    entities = mongo.col(`${SPACE}_entities`);
    files = mongo.col(`${SPACE}_files`);
  });

  after(async () => { await closeTestMongo(); });

  beforeEach(async () => {
    await entities.deleteMany({});
    await files.deleteMany({});
    await mongo.col(`${SPACE}_tombstones`).deleteMany({});
    await entities.insertOne({ _id: ALICE, spaceId: SPACE, name: 'Alice', type: 'person', tags: [], properties: {} });
    await entities.insertOne({ _id: BOB, spaceId: SPACE, name: 'Bob', type: 'person', tags: [], properties: {} });
  });

  // ── 1. The cascade ─────────────────────────────────────────────────────────

  it('strips the label from every face that pointed at the deleted person', async () => {
    await files.insertOne(faceChunk('photo1.jpg#face-chunk0', 'photo1.jpg', ALICE));
    await files.insertOne(faceChunk('photo2.jpg#face-chunk0', 'photo2.jpg', ALICE));

    assert.equal(await brain.deleteEntity(SPACE, ALICE), true);

    for (const id of ['photo1.jpg#face-chunk0', 'photo2.jpg#face-chunk0']) {
      const doc = await face(id);
      assert.ok(doc, `${id} must still exist — the FILE was not deleted`);
      assert.equal(doc.faceEntityId, undefined, 'the erased person must not still be named');
      assert.equal(doc.faceScore, undefined, 'the confidence in a label that no longer exists is meaningless');
    }
  });

  it('keeps the descriptor and the rest of the record — unlabel, not delete', async () => {
    await files.insertOne(faceChunk('photo1.jpg#face-chunk0', 'photo1.jpg', ALICE));
    await brain.deleteEntity(SPACE, ALICE);

    const doc = await face('photo1.jpg#face-chunk0');
    assert.equal(doc.faceEmbedding.length, 128, 'the face still exists in the photo');
    assert.equal(doc.parentFileId, 'photo1.jpg');
    assert.deepEqual(doc.faceBbox, [0.1, 0.1, 0.2, 0.2]);
  });

  it('touches nobody else\'s labels', async () => {
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    await files.insertOne(faceChunk('b.jpg#face-chunk0', 'b.jpg', BOB));
    await files.insertOne(faceChunk('c.jpg#face-chunk0', 'c.jpg', null)); // detected, never labelled

    await brain.deleteEntity(SPACE, ALICE);

    assert.equal((await face('a.jpg#face-chunk0')).faceEntityId, undefined);
    assert.equal((await face('b.jpg#face-chunk0')).faceEntityId, BOB, 'Bob was not deleted');
    assert.equal((await face('c.jpg#face-chunk0')).faceEntityId, undefined);
  });

  it('still deletes the entity and writes its tombstone', async () => {
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    await brain.deleteEntity(SPACE, ALICE);

    assert.equal(await entities.findOne({ _id: ALICE }), null);
    const tomb = await mongo.col(`${SPACE}_tombstones`).findOne({ _id: ALICE });
    assert.ok(tomb, 'the cascade must not have displaced the tombstone');
    assert.equal(tomb.type, 'entity');
  });

  // ── 2. Every delete path ───────────────────────────────────────────────────

  it('the bulk wipe clears labels too, without an id-per-entity query', async () => {
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    await files.insertOne(faceChunk('b.jpg#face-chunk0', 'b.jpg', BOB));

    const n = await brain.bulkDeleteEntities(SPACE);
    assert.equal(n, 2);
    assert.equal((await face('a.jpg#face-chunk0')).faceEntityId, undefined);
    assert.equal((await face('b.jpg#face-chunk0')).faceEntityId, undefined);
  });

  it('unlabelFacesForEntities handles several people in one call', async () => {
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    await files.insertOne(faceChunk('b.jpg#face-chunk0', 'b.jpg', BOB));

    const n = await brain.unlabelFacesForEntities(SPACE, [ALICE, BOB]);
    assert.equal(n, 2);
  });

  it('unlabelFacesForEntities is a no-op for an empty list — never a whole-collection wipe', async () => {
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    assert.equal(await brain.unlabelFacesForEntities(SPACE, []), 0);
    assert.equal((await face('a.jpg#face-chunk0')).faceEntityId, ALICE, 'an empty id list must match nothing');
  });

  it('a person expiring by TTL detaches their faces too — no human action involved', async () => {
    // The worst version of this bug: `ttl-sweep` routes entity expiry through `deleteEntity`, so a
    // person record aging out silently orphaned every face labelled with them. Driven through the
    // real sweep rather than asserting that the two call the same function, because "the cascade is
    // in the shared helper" is exactly the claim that stops being true when someone adds a fourth
    // delete path.
    await entities.updateOne({ _id: ALICE }, { $set: { _expireAt: new Date('2020-01-01T00:00:00Z') } });
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    await files.insertOne(faceChunk('b.jpg#face-chunk0', 'b.jpg', BOB));

    const { sweepExpired } = await import('../../server/dist/brain/ttl-sweep.js');
    const deleted = await sweepExpired(new Date('2026-07-22T00:00:00Z'));

    assert.equal(deleted, 1, 'only the expired person should go');
    assert.equal(await entities.findOne({ _id: ALICE }), null);
    assert.equal((await face('a.jpg#face-chunk0')).faceEntityId, undefined, 'TTL expiry must cascade');
    assert.equal((await face('b.jpg#face-chunk0')).faceEntityId, BOB, 'Bob did not expire');
  });

  // ── 3. The blind spot ──────────────────────────────────────────────────────

  it('findEntityBacklinks now reports face references', async () => {
    await files.insertOne(faceChunk('a.jpg#face-chunk0', 'a.jpg', ALICE));
    await files.insertOne(faceChunk('b.jpg#face-chunk0', 'b.jpg', ALICE));

    const links = await brain.findEntityBacklinks(SPACE, ALICE);
    const faces = links.filter(l => l.type === 'face');
    assert.equal(faces.length, 2, 'faces were the reference class this never looked at');
    assert.deepEqual(faces.map(f => f._id).sort(), ['a.jpg#face-chunk0', 'b.jpg#face-chunk0']);
  });

  it('reports nothing for a person with no faces', async () => {
    await files.insertOne(faceChunk('b.jpg#face-chunk0', 'b.jpg', BOB));
    const links = await brain.findEntityBacklinks(SPACE, ALICE);
    assert.deepEqual(links.filter(l => l.type === 'face'), []);
  });

  // ── The pre-existing orphans no cascade can reach ──────────────────────────

  it('a label pointing at a deleted person no longer seeds new auto-labels', async () => {
    // Records orphaned by a delete that happened BEFORE the cascade shipped. Without this check the
    // gallery keeps matching them and the dangling id propagates onto every new photo of that face.
    assert.equal(await faceEmbedder.labelStillResolves(SPACE, ALICE), true);
    await entities.deleteOne({ _id: ALICE });
    assert.equal(await faceEmbedder.labelStillResolves(SPACE, ALICE), false);
  });

  it('a live label still resolves — the guard is not simply off', async () => {
    assert.equal(await faceEmbedder.labelStillResolves(SPACE, BOB), true);
  });
});
