/**
 * The four writers really do agree — against a real MongoDB, through the real functions.
 *
 * `one-merge-rule.test.js` pins the rule and gates the source. Neither can tell live code from dead
 * code: a grep-based version of this check would have passed happily while `updateMemory` replaced the
 * properties map, because the replace was a `$set` and the merge helper it should have used was simply
 * absent. Only a write, then a read, settles it.
 *
 * ## The defect this exists for
 *
 * `update_memory`'s tool schema said `properties` were "to merge". `updateMemory` did
 * `$set['properties'] = updates.properties` — a whole-map REPLACE. An agent patching one key silently
 * destroyed every other property on the record: no error, no warning, and the REST validation
 * simulation mirrored the same replace so the schema check could not see it either. `updateChrono`
 * had it too, through a generic `Object.entries(updates)` loop that treated `properties` like a scalar.
 *
 * So the test is written as ONE table over all four types, not four tests. The failure mode was
 * precisely that the types were handled in four places and nobody compared them.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/merge-rule-db.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'general';

// Written before any dist import: the loader reads CONFIG_PATH at module load.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-merge-rule-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH;

let mongo, brain;

/** The stored record, in every type: two properties and one tag, all of which must survive a patch. */
const STORED_PROPS = { owner: 'platform', rack: 'B12' };
/** The patch: one property the record already has, under a new value. Nothing else is mentioned. */
const PATCH_PROPS = { rack: 'C03' };
/** What every type must hold afterwards. `owner` surviving is the whole point. */
const MERGED_PROPS = { owner: 'platform', rack: 'C03' };

/**
 * One row per record type: how to create it, how to patch it, how to read it back.
 *
 * Each `create` returns the record id; each `update` calls the type's real update function with a
 * properties-only patch; each `load` returns the stored document.
 */
const TYPES = [
  {
    name: 'entity',
    create: async () => (await brain.entities.upsertEntity(
      SPACE, 'node-7', 'machine', ['prod'], STORED_PROPS, undefined, undefined,
    )).entity._id,
    update: (id) => brain.entities.updateEntityById(SPACE, id, { properties: PATCH_PROPS }),
    load: (id) => mongo.col(`${SPACE}_entities`).findOne({ _id: id }),
  },
  {
    name: 'edge',
    create: async () => (await brain.edges.upsertEdge(
      SPACE, 'a-1', 'b-1', 'runs-on', undefined, undefined, undefined, STORED_PROPS, ['prod'],
    ))._id,
    update: (id) => brain.edges.updateEdgeById(SPACE, id, { properties: PATCH_PROPS }),
    load: (id) => mongo.col(`${SPACE}_edges`).findOne({ _id: id }),
  },
  {
    name: 'memory',
    create: async () => (await brain.memory.remember(
      SPACE, 'node-7 runs the platform apps', [], ['prod'], undefined, STORED_PROPS,
    ))._id,
    update: (id) => brain.memory.updateMemory(SPACE, id, { properties: PATCH_PROPS }),
    load: (id) => mongo.col(`${SPACE}_memories`).findOne({ _id: id }),
  },
  {
    name: 'chrono',
    create: async () => (await brain.chrono.createChrono(SPACE, {
      title: 'rack move', type: 'event', startsAt: '2026-08-05T09:00:00Z',
      tags: ['prod'], properties: STORED_PROPS,
    }))._id,
    update: (id) => brain.chrono.updateChrono(SPACE, id, { properties: PATCH_PROPS }),
    load: (id) => mongo.col(`${SPACE}_chrono`).findOne({ _id: id }),
  },
];

describe('one merge rule, four record types (real MongoDB)', { skip }, () => {
  before(async () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(
      { spaces: [{ id: SPACE, label: 'General' }], networks: [], tokens: [] }, null, 2,
    ));
    mongo = await openTestMongo('mergerule');
    const loader = await import('../../server/dist/config/loader.js');
    loader.loadConfig();
    brain = {
      entities: await import('../../server/dist/brain/entities.js'),
      edges: await import('../../server/dist/brain/edges.js'),
      memory: await import('../../server/dist/brain/memory.js'),
      chrono: await import('../../server/dist/brain/chrono.js'),
    };
  });

  after(async () => {
    await closeTestMongo();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  for (const t of TYPES) {
    it(`${t.name}: a properties patch KEEPS the keys it does not mention`, async () => {
      const id = await t.create();
      const before = await t.load(id);
      assert.deepEqual(before.properties, STORED_PROPS, 'precondition: the record stored both properties');

      const returned = await t.update(id);
      const after = await t.load(id);

      assert.deepEqual(after.properties, MERGED_PROPS,
        `${t.name} lost a property the patch never mentioned — this is the replace defect. Removing a `
        + 'key is deleteFields\' job; an absence must never mean "delete".');
      // The returned document is what an API caller sees. It used to be built separately from the
      // `$set`, which is its own way for the two to disagree.
      if (returned && returned.properties) {
        assert.deepEqual(returned.properties, MERGED_PROPS,
          `${t.name}'s returned document disagrees with what was stored`);
      }
    });
  }

  it('all four types produce the SAME merged map from the same input', async () => {
    // The assertion the docs rely on and nothing enforced. Stated as one comparison rather than four
    // so a type drifting away fails here even if its own row above was updated to match it.
    const results = {};
    for (const t of TYPES) {
      const id = await t.create();
      await t.update(id);
      results[t.name] = (await t.load(id)).properties;
    }
    assert.deepEqual(results, {
      entity: MERGED_PROPS, edge: MERGED_PROPS, memory: MERGED_PROPS, chrono: MERGED_PROPS,
    });
  });

  it('an absent properties field leaves the stored map alone', async () => {
    // `undefined` is the caller saying nothing. Reading it as `{}` would clear the map on any patch
    // that only touches another field.
    for (const t of TYPES) {
      const id = await t.create();
      await t.update(id);                                   // establishes the merged state
      const patchless = t.name === 'entity' || t.name === 'edge'
        ? { description: 'unrelated' }
        : t.name === 'memory' ? { description: 'unrelated' } : { title: 'unrelated' };
      await (t.name === 'entity' ? brain.entities.updateEntityById(SPACE, id, patchless)
        : t.name === 'edge' ? brain.edges.updateEdgeById(SPACE, id, patchless)
          : t.name === 'memory' ? brain.memory.updateMemory(SPACE, id, patchless)
            : brain.chrono.updateChrono(SPACE, id, patchless));
      assert.deepEqual((await t.load(id)).properties, MERGED_PROPS,
        `${t.name}: a patch that says nothing about properties must not touch them`);
    }
  });
});
