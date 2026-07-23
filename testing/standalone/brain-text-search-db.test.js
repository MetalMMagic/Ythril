/**
 * Database-level test: the brain freetext filter (2b-iii-a) matches a substring across the WHOLE
 * paginated set, and treats the query as a literal — against a real MongoDB.
 *
 * The docked column filter needs the match to span every page, not just the visible rows (same reason
 * the sort had to be server-side). And the escaping only matters if MongoDB really would interpret an
 * un-escaped value as a pattern — a JS matcher can't show that. Both are asserted here against the
 * real `col()` via the #371 harness, through the real `listEntities`.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/brain-text-search-db.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();
const SPACE = 'general';

let mongo, listEntities, textSearchOr, entities;

async function insertEntity(_id, name, description = '') {
  await entities.insertOne({ _id, spaceId: SPACE, name, description, type: 'x', createdAt: '2026-01-01T00:00:00.000Z', seq: 1 });
}

/** Run listEntities with a freetext search, walking all pages → the full matched set (ids). */
async function searchAllPages(query, pageSize = 2) {
  const or = textSearchOr(query, ['name', 'description']);
  const filter = or ?? {};
  const ids = [];
  for (let skipN = 0; ; skipN += pageSize) {
    const page = await listEntities(SPACE, filter, pageSize, skipN, { field: 'name', dir: 1 });
    if (page.length === 0) break;
    ids.push(...page.map(e => String(e._id)));
    if (page.length < pageSize) break;
  }
  return ids.sort();
}

describe('brain freetext search — against a real MongoDB', { skip }, () => {
  before(async () => {
    mongo = await openTestMongo('braintextsearch');
    ({ listEntities } = await import('../../server/dist/brain/entities.js'));
    ({ textSearchOr } = await import('../../server/dist/brain/text-search.js'));
    entities = mongo.col(`${SPACE}_entities`);
  });
  after(async () => { await closeTestMongo(); });
  beforeEach(async () => { await entities.deleteMany({}); });

  it('matches a substring across a PAGE BOUNDARY, not just the visible page', async () => {
    // Six names contain "ana"; page size 2 → three pages. A page-only filter would miss the rest.
    await insertEntity('e1', 'Banana');
    await insertEntity('e2', 'Ananas');
    await insertEntity('e3', 'Havana');
    await insertEntity('e4', 'Grape');       // no match
    await insertEntity('e5', 'Cabana');
    await insertEntity('e6', 'Nirvana');
    await insertEntity('e7', 'Analog');
    const ids = await searchAllPages('ana');
    assert.deepEqual(ids, ['e1', 'e2', 'e3', 'e5', 'e6', 'e7']);
  });

  it('is case-insensitive', async () => {
    await insertEntity('u1', 'Kubernetes');
    assert.deepEqual(await searchAllPages('KUBER'), ['u1']);
  });

  it('matches the description field too, not only the name', async () => {
    await insertEntity('d1', 'Widget', 'a load-bearing gizmo');
    await insertEntity('d2', 'Gadget', 'unrelated');
    assert.deepEqual(await searchAllPages('gizmo'), ['d1']);
  });

  it('treats the query as a LITERAL — a `.` does not match any character', async () => {
    await insertEntity('l1', 'a.b');   // literal dot
    await insertEntity('l2', 'axb');   // would match if `.` were a wildcard
    assert.deepEqual(await searchAllPages('a.b'), ['l1'], '`.` must be literal, so axb is NOT matched');
  });

  it('a regex payload is a literal, so `a+` does NOT match a run of a-s (distinguishes escaped)', async () => {
    // As a pattern `a+` matches "aaa"; escaped it is the literal two chars "a+", which appear nowhere.
    // This fails if escaping is removed — unlike a payload that matches nothing either way.
    await insertEntity('r1', 'aaa');
    assert.deepEqual(await searchAllPages('a+'), [], '`a+` must be literal — "aaa" is not the string "a+"');
  });

  it('empty search returns the full set (no narrowing)', async () => {
    await insertEntity('a1', 'Alpha');
    await insertEntity('a2', 'Beta');
    assert.deepEqual(await searchAllPages(''), ['a1', 'a2']);
  });
});
