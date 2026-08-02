/**
 * Per-chrono-type retention — the rule, every branch, without a database.
 *
 * ## Where the requirement came from
 *
 * A canary operator, 2026-08-02. Their `operation-logs` space holds deploy `event`s next to `health-snapshot`
 * and `metrics-snapshot` records, and the two want opposite treatment — so a space-wide TTL is the wrong axis:
 *
 *   - deploy events are **content-free by design**, so they cluster tightly and displace knowledge. A recall
 *     for *"how is the platform deployed and what runs on the server"* returned four near-identical
 *     `platform-apps deployed` chronos at 0.874, above the guideline they wanted at 0.823;
 *   - snapshots exist to be **trended**, and 90 days is one quarter with no year-over-year.
 *
 * It is a recall-quality feature, not a storage one: their volumes were 516 and 139 records.
 *
 * ## What must not go wrong
 *
 * The dangerous direction is deleting or redacting MORE than the operator asked for — a snapshot series
 * silently truncated, or a per-record `ttlDays` overridden by a type policy. Every case below is about
 * precedence and about a policy that cannot fire.
 *
 * Run: node --test testing/standalone/chrono-retention.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DAY = 86_400_000;
const T0 = Date.parse('2026-01-01T00:00:00.000Z');

let chronoRetentionDays, chronoContentDays, chronoExpiry, chronoContentExpiry,
  needsContentRedaction, REDACTED_CHRONO_FIELDS;

before(async () => {
  ({ chronoRetentionDays, chronoContentDays, chronoExpiry, chronoContentExpiry,
    needsContentRedaction, REDACTED_CHRONO_FIELDS } =
    await import('../../server/dist/brain/chrono-retention.js'));
});

/** The reporter's actual configuration, as the shape they asked for. */
const TELEMETRY = {
  recordTtlDays: 90,
  chronoRetention: {
    event: { days: 90, contentDays: 14 },
    episode: { days: 90 },
    'health-snapshot': { days: 3650 },
    'metrics-snapshot': { days: 3650 },
  },
};

describe('which window applies', () => {
  it('a type with its own window overrides the space default', () => {
    assert.equal(chronoRetentionDays(TELEMETRY, 'health-snapshot'), 3650);
    assert.equal(chronoRetentionDays(TELEMETRY, 'event'), 90);
  });

  it('a type not named falls back to the space default', () => {
    assert.equal(chronoRetentionDays(TELEMETRY, 'meeting'), 90);
  });

  it('no policy and no space default means no expiry at all', () => {
    assert.equal(chronoRetentionDays({}, 'event'), undefined);
    assert.equal(chronoExpiry({}, 'event', T0), undefined);
  });

  it('a type with ONLY contentDays still deletes on the space schedule', () => {
    // Reading "no days" as "keep forever" would silently retain records the operator expected to go — they set
    // a content window to redact SOONER, not to exempt the type from deletion.
    const space = { recordTtlDays: 90, chronoRetention: { event: { contentDays: 7 } } };
    assert.equal(chronoRetentionDays(space, 'event'), 90);
    assert.equal(chronoContentDays(space, 'event'), 7);
  });

  it('rejects zero and negative windows rather than expiring instantly', () => {
    for (const bad of [0, -1, NaN, Infinity, '30', null, undefined]) {
      const space = { chronoRetention: { event: { days: bad } } };
      assert.equal(chronoRetentionDays(space, 'event'), undefined, `days=${String(bad)} was accepted`);
    }
  });
});

describe('the per-record ttlDays still wins', () => {
  it('an explicit ttlDays beats the type policy', () => {
    const e = chronoExpiry(TELEMETRY, 'health-snapshot', T0, 5);
    assert.equal(e.getTime(), T0 + 5 * DAY);
  });

  it('ttlDays 0 or null means never expire, whatever the policy says', () => {
    assert.equal(chronoExpiry(TELEMETRY, 'event', T0, 0), undefined);
    assert.equal(chronoExpiry(TELEMETRY, 'event', T0, null), undefined);
  });

  it('an omitted ttlDays defers to the policy', () => {
    assert.equal(chronoExpiry(TELEMETRY, 'event', T0).getTime(), T0 + 90 * DAY);
    assert.equal(chronoExpiry(TELEMETRY, 'health-snapshot', T0).getTime(), T0 + 3650 * DAY);
  });

  it('expiry is measured from the record, not from now', () => {
    // The backfill stamps existing records from their own createdAt. Using `now` would hand every one of them a
    // fresh full window, which is the opposite of enabling a retention policy.
    const older = Date.parse('2020-06-01T00:00:00.000Z');
    assert.equal(chronoExpiry(TELEMETRY, 'event', older).getTime(), older + 90 * DAY);
  });
});

describe('the content tier cannot be set up to never fire', () => {
  it('a content window at or past the delete window is ignored', () => {
    // It could never fire — the record is gone first — and a policy that silently does nothing is worse than a
    // rejected one.
    for (const contentDays of [90, 120]) {
      const space = { chronoRetention: { event: { days: 90, contentDays } } };
      assert.equal(chronoContentDays(space, 'event'), undefined, `contentDays=${contentDays} was kept`);
    }
  });

  it('a content window inside the delete window applies', () => {
    assert.equal(chronoContentDays(TELEMETRY, 'event'), 14);
    assert.equal(chronoContentExpiry(TELEMETRY, 'event', T0).getTime(), T0 + 14 * DAY);
  });

  it('a content window is checked against the SPACE default when the type sets no days', () => {
    const space = { recordTtlDays: 10, chronoRetention: { event: { contentDays: 30 } } };
    assert.equal(chronoContentDays(space, 'event'), undefined, '30 > the 10-day space default, so it can never fire');
  });

  it('a type with no content window never redacts', () => {
    assert.equal(chronoContentDays(TELEMETRY, 'health-snapshot'), undefined);
    assert.equal(chronoContentExpiry(TELEMETRY, 'health-snapshot', T0), undefined);
  });
});

describe('what redaction removes', () => {
  it('drops the vector along with the text', () => {
    // The whole point: a record that keeps its embedding keeps winning semantic searches for content that is no
    // longer there, which is the reported failure.
    assert.ok(REDACTED_CHRONO_FIELDS.includes('embedding'));
    assert.ok(REDACTED_CHRONO_FIELDS.includes('matchedText'));
    assert.ok(REDACTED_CHRONO_FIELDS.includes('description'));
  });

  it('keeps the fact — title, type, when, tags and links are NOT removed', () => {
    for (const kept of ['title', 'type', 'startsAt', 'tags', 'entityIds', 'memoryIds', 'status']) {
      assert.equal(REDACTED_CHRONO_FIELDS.includes(kept), false, `${kept} must survive redaction`);
    }
  });

  it('does not rewrite a record that is already redacted', () => {
    assert.equal(needsContentRedaction({ contentRedacted: true, description: 'x' }), false);
  });

  it('reports nothing to do for a record that never had detail', () => {
    assert.equal(needsContentRedaction({ title: 'deployed' }), false);
    assert.equal(needsContentRedaction({ description: 'a note' }), true);
    assert.equal(needsContentRedaction({ embedding: [0.1] }), true);
  });
});

describe('the feature is reachable and wired', () => {
  // Named files. A rule nothing calls is a rule that does not exist, and this one is invisible when broken:
  // records simply keep accumulating, which is what the operator reported in the first place.
  it('the chrono write passes its type so the policy applies', () => {
    const src = readFileSync(join(ROOT, 'server/src/brain/chrono.ts'), 'utf8');
    assert.match(src, /stampExpiryOnCreate\(spaceId,\s*doc,\s*ttlDays,\s*doc\.type\)/);
  });

  it('the API accepts and clears the policy', () => {
    const src = readFileSync(join(ROOT, 'server/src/api/spaces.ts'), 'utf8');
    assert.match(src, /chronoRetention: z\.record\(/, 'the space PATCH does not accept chronoRetention');
    assert.match(src, /updateSpace\(id, \{ chronoRetention: next \}\)/);
    assert.match(src, /chronoRetention !== undefined/, 'the at-least-one-field refine does not list it');
  });

  it('the sweep runs both passes', () => {
    const src = readFileSync(join(ROOT, 'server/src/brain/ttl-sweep.ts'), 'utf8');
    assert.match(src, /sweepChronoRetention\(now\)/);
    const red = readFileSync(join(ROOT, 'server/src/brain/chrono-redaction.ts'), 'utf8');
    assert.match(red, /backfillChronoExpiry/);
    assert.match(red, /redactLapsedChronoContent/);
  });

  it('the backfill dates records from createdAt, never from now', () => {
    // The one line that decides whether enabling a policy prunes the backlog or resets it.
    const red = readFileSync(join(ROOT, 'server/src/brain/chrono-redaction.ts'), 'utf8');
    assert.match(red, /Date\.parse\(r\.createdAt/);
    assert.doesNotMatch(red, /chronoExpiry\(space, r\.type, Date\.now\(\)/);
  });

  it('the content-expiry sweep query is indexed', () => {
    const ttl = readFileSync(join(ROOT, 'server/src/brain/ttl.ts'), 'utf8');
    assert.match(ttl, /createIndex\(\{ _contentExpireAt: 1 \}/);
  });
});
