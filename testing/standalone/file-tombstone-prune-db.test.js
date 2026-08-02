/**
 * Database-level test: the file-tombstone prune deletes what every peer has acknowledged, and nothing above it.
 *
 * ## Why a second DB gate rather than a case in the record one
 *
 * The key is a `deletedAt` STRING, not a numeric `seq`, and that changes what MongoDB does:
 *
 *   - string `$lte` is a lexical comparison, which is only the intended ordering for the fixed-width ISO8601 UTC
 *     form. A stored offset form (`+02:00`) sorts wrongly, and the driver will happily compare it.
 *   - a document with **no** `deletedAt` does not match `$lte` at all. That is the behaviour relied on — an
 *     unparseable timestamp cannot be proven delivered — and it is exactly the case a hand-written JS matcher
 *     gets backwards (`undefined <= x` is false in JS, but `null` fields DO match some Mongo comparisons).
 *
 * The assertion that matters is survival, not removal: a path kept one cycle longer is housekeeping, a path
 * dropped before a peer acknowledged it means a deleted file returns on the next manifest sync.
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/file-tombstone-prune-db.test.js
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'fspace';
const OTHER = 'ospace';

let mongo, pruneFileTombstonesToFloor, fileTombstoneFloor;

const iso = (day) => `2026-08-${String(day).padStart(2, '0')}T00:00:00.000Z`;

/** One tombstone per day, so "which survived" reads off the days. */
const tombstone = (day, spaceId = SPACE) => ({
  _id: `${spaceId}-${day}`,
  spaceId,
  path: `patients/report-${day}.pdf`,   // a path is often personal in itself — the reason this prune exists
  deletedAt: iso(day),
});

const daysIn = async (spaceId) => {
  const rows = await mongo.col(`${spaceId}_file_tombstones`).find({}).sort({ deletedAt: 1 }).toArray();
  return rows.map(r => r.deletedAt);
};

describe('file tombstone prune (real MongoDB)', { skip }, () => {
  before(async () => {
    mongo = await openTestMongo('filetombprune');
    ({ pruneFileTombstonesToFloor } = await import('../../server/dist/brain/tombstone-prune.js'));
    ({ fileTombstoneFloor } = await import('../../server/dist/sync/file-tombstone-ack.js'));
  });

  after(async () => { await closeTestMongo(); });

  beforeEach(async () => {
    await mongo.col(`${SPACE}_file_tombstones`).deleteMany({});
    await mongo.col(`${OTHER}_file_tombstones`).deleteMany({});
    await mongo.col(`${SPACE}_file_tombstones`).insertMany([1, 5, 10, 20].map(d => tombstone(d)));
    await mongo.col(`${OTHER}_file_tombstones`).insertMany([1, 5].map(d => tombstone(d, OTHER)));
  });

  it('deletes at and below the acknowledged position, keeps the rest', async () => {
    const removed = await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: iso(10), peers: 2 });
    assert.equal(removed, 3);
    assert.deepEqual(await daysIn(SPACE), [iso(20)]);
  });

  it('keeps the tombstone one tick above the position — the boundary that loses a path', async () => {
    await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: '2026-08-09T23:59:59.999Z', peers: 1 });
    assert.deepEqual(await daysIn(SPACE), [iso(10), iso(20)]);

    await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: iso(10), peers: 1 });
    assert.deepEqual(await daysIn(SPACE), [iso(20)], 'the acknowledged one must go');
  });

  it('does not touch another space', async () => {
    await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: iso(31), peers: 0 });
    assert.deepEqual(await daysIn(SPACE), []);
    assert.deepEqual(await daysIn(OTHER), [iso(1), iso(5)]);
  });

  it('deletes NOTHING when no floor was earned', async () => {
    for (const reason of ['member-never-acked', 'peer-token-scoped']) {
      const removed = await pruneFileTombstonesToFloor(SPACE, { prune: false, reason });
      assert.equal(removed, -1, `${reason} reported a prune`);
      assert.equal((await daysIn(SPACE)).length, 4, `${reason} deleted tombstones`);
    }
  });

  it('leaves a tombstone with no deletedAt alone rather than treating it as the epoch', async () => {
    // It cannot be proven delivered, so it must survive. MongoDB does not match a missing field against `$lte`,
    // which is the behaviour this depends on — assert it against the driver, not against a belief.
    await mongo.col(`${SPACE}_file_tombstones`).insertOne({ _id: 'legacy', spaceId: SPACE, path: 'x.pdf' });
    await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: iso(31), peers: 0 });
    const left = await mongo.col(`${SPACE}_file_tombstones`).find({}).toArray();
    assert.deepEqual(left.map(r => r._id), ['legacy']);
  });

  it('drops the whole collection for a space with no peers — through the real decision', async () => {
    const floor = fileTombstoneFloor([], SPACE, []);
    assert.equal(floor.prune, true);
    assert.equal(await pruneFileTombstonesToFloor(SPACE, floor), 4);
    assert.deepEqual(await daysIn(SPACE), []);
  });

  it('leaves the space alone when one member has never acked — through the real decision', async () => {
    const floor = fileTombstoneFloor(
      [{ instanceId: 'a', lastFileTombstoneAckedAt: { [SPACE]: iso(20) } }, { instanceId: 'b' }],
      SPACE,
    );
    assert.equal(floor.prune, false);
    await pruneFileTombstonesToFloor(SPACE, floor);
    assert.equal((await daysIn(SPACE)).length, 4);
  });

  it('is idempotent, and reports 0 on a collection that never existed', async () => {
    await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: iso(5), peers: 1 });
    assert.equal(await pruneFileTombstonesToFloor(SPACE, { prune: true, upTo: iso(5), peers: 1 }), 0);
    assert.equal(await pruneFileTombstonesToFloor('never-used', { prune: true, upTo: iso(5), peers: 0 }), 0);
  });
});
