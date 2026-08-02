/**
 * Database-level test: the backfill and content-redaction passes, against a real MongoDB.
 *
 * The pure rule is covered by `chrono-retention.test.js`. This covers what only the driver can settle:
 *
 *  - `$unset` really removes the fields (a `$set: undefined` silently does nothing in some drivers);
 *  - the sweep query matches by `_contentExpireAt` and skips already-redacted records, so a settled collection
 *    costs one indexed miss rather than a rewrite every five minutes;
 *  - the backfill stamps from each record's own `createdAt`, which is the difference between enabling a policy
 *    that prunes the backlog and one that grants every existing record a fresh full window;
 *  - **the record survives redaction.** That is the whole promise of the first tier: "that a deploy happened is
 *    still true, the detail is not kept".
 *
 * Run: `npm run test:up` first, then
 *      node --test testing/standalone/chrono-retention-db.test.js
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openTestMongo, closeTestMongo, mongoSkipReason } from './_mongo-harness.mjs';

const skip = await mongoSkipReason();

const SPACE = 'telemetry';
const DAY = 86_400_000;

let mongo, backfillChronoExpiry, redactLapsedChronoContent, hasChronoPolicy;

/** The reporter's own policy shape. */
const POLICY = {
  recordTtlDays: 90,
  chronoRetention: {
    event: { days: 90, contentDays: 14 },
    'health-snapshot': { days: 3650 },
  },
};

const chrono = (id, type, createdAt, extra = {}) => ({
  _id: id, spaceId: SPACE, type, title: `${type} ${id}`,
  description: 'deployed platform-apps to production',
  matchedText: 'deployed platform-apps to production',
  properties: { revision: 'abc123' },
  embedding: Array.from({ length: 8 }, (_, i) => i / 8),
  embeddingModel: 'nomic-embed-text-v1.5',
  startsAt: createdAt, status: 'done', tags: ['deploy'], entityIds: ['e1'], memoryIds: [],
  createdAt, updatedAt: createdAt, seq: 1,
  author: { instanceId: 'self' },
  ...extra,
});

const load = async (id) => mongo.col(`${SPACE}_chrono`).findOne({ _id: id });

describe('chrono retention (real MongoDB)', { skip }, () => {
  before(async () => {
    mongo = await openTestMongo('chronoretention');
    ({ backfillChronoExpiry, redactLapsedChronoContent, hasChronoPolicy } =
      await import('../../server/dist/brain/chrono-redaction.js'));
  });

  after(async () => { await closeTestMongo(); });

  beforeEach(async () => { await mongo.col(`${SPACE}_chrono`).deleteMany({}); });

  it('stamps an existing record from its OWN createdAt', async () => {
    const created = new Date(Date.now() - 60 * DAY).toISOString();
    await mongo.col(`${SPACE}_chrono`).insertOne(chrono('e-old', 'event', created));

    assert.equal(await backfillChronoExpiry(SPACE, POLICY), 1);
    const doc = await load('e-old');
    // 90 days from creation, i.e. 30 days from now — NOT 90 days from now.
    const expected = Date.parse(created) + 90 * DAY;
    assert.equal(doc._expireAt.getTime(), expected);
    assert.equal(doc._contentExpireAt.getTime(), Date.parse(created) + 14 * DAY);
    assert.ok(doc._expireAt.getTime() < Date.now() + 90 * DAY,
      'the record was given a fresh full window instead of being dated from its creation');
  });

  it('stamps a snapshot with its long window and no content window', async () => {
    const created = new Date(Date.now() - 200 * DAY).toISOString();
    await mongo.col(`${SPACE}_chrono`).insertOne(chrono('h1', 'health-snapshot', created));
    await backfillChronoExpiry(SPACE, POLICY);
    const doc = await load('h1');
    assert.equal(doc._expireAt.getTime(), Date.parse(created) + 3650 * DAY);
    assert.equal(doc._contentExpireAt, undefined, 'a snapshot must never be redacted — it exists to be trended');
  });

  it('leaves a record that already carries an expiry alone', async () => {
    // Re-sliding would silently override a deliberate per-record `ttlDays`.
    const created = new Date(Date.now() - 10 * DAY).toISOString();
    const pinned = new Date(Date.now() + 5 * DAY);
    await mongo.col(`${SPACE}_chrono`).insertOne({ ...chrono('e-pinned', 'event', created), _expireAt: pinned });
    assert.equal(await backfillChronoExpiry(SPACE, POLICY), 0);
    assert.equal((await load('e-pinned'))._expireAt.getTime(), pinned.getTime());
  });

  it('ignores a record it cannot date', async () => {
    await mongo.col(`${SPACE}_chrono`).insertOne(chrono('e-bad', 'event', 'not-a-date'));
    assert.equal(await backfillChronoExpiry(SPACE, POLICY), 0);
    assert.equal((await load('e-bad'))._expireAt, undefined);
  });

  it('does nothing at all without a policy', async () => {
    await mongo.col(`${SPACE}_chrono`).insertOne(chrono('e1', 'event', new Date().toISOString()));
    assert.equal(hasChronoPolicy({ recordTtlDays: 90 }), false);
    assert.equal(await backfillChronoExpiry(SPACE, { recordTtlDays: 90 }), 0);
    assert.equal((await load('e1'))._expireAt, undefined);
  });

  it('drops the detail and the vector, and KEEPS the record', async () => {
    const created = new Date(Date.now() - 30 * DAY).toISOString();
    await mongo.col(`${SPACE}_chrono`).insertOne({
      ...chrono('e2', 'event', created), _contentExpireAt: new Date(Date.now() - DAY),
    });

    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 1);
    const doc = await load('e2');
    assert.ok(doc, 'the record itself must survive — that is the whole point of the first tier');
    assert.equal(doc.contentRedacted, true);
    assert.ok(typeof doc.contentRedactedAt === 'string');
    for (const gone of ['description', 'matchedText', 'properties', 'embedding', 'embeddingModel']) {
      assert.equal(doc[gone], undefined, `${gone} survived redaction`);
    }
    for (const kept of ['title', 'type', 'startsAt', 'tags', 'entityIds', 'status', 'createdAt']) {
      assert.notEqual(doc[kept], undefined, `${kept} must survive redaction`);
    }
  });

  it('does not touch a record whose content window has not lapsed', async () => {
    await mongo.col(`${SPACE}_chrono`).insertOne({
      ...chrono('e3', 'event', new Date().toISOString()), _contentExpireAt: new Date(Date.now() + 10 * DAY),
    });
    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 0);
    assert.equal((await load('e3')).description, 'deployed platform-apps to production');
  });

  it('does not touch a record with no content window at all', async () => {
    await mongo.col(`${SPACE}_chrono`).insertOne(chrono('h2', 'health-snapshot', new Date().toISOString()));
    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 0);
    assert.equal((await load('h2')).embedding.length, 8);
  });

  it('is idempotent — a second pass finds nothing to do', async () => {
    await mongo.col(`${SPACE}_chrono`).insertOne({
      ...chrono('e4', 'event', new Date().toISOString()), _contentExpireAt: new Date(Date.now() - DAY),
    });
    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 1);
    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 0,
      'an already-redacted record must drop out of the sweep query, not be rewritten every cycle');
  });

  it('marks a record that had no detail rather than looping on it', async () => {
    await mongo.col(`${SPACE}_chrono`).insertOne({
      _id: 'bare', spaceId: SPACE, type: 'event', title: 'deployed', startsAt: '2026-01-01T00:00:00.000Z',
      status: 'done', tags: [], entityIds: [], memoryIds: [], createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z', seq: 1, author: { instanceId: 'self' },
      _contentExpireAt: new Date(Date.now() - DAY),
    });
    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 1);
    assert.equal((await load('bare')).contentRedacted, true);
    assert.equal(await redactLapsedChronoContent(SPACE, new Date()), 0);
  });
});
