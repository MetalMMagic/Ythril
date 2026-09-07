/**
 * Unit tests: sync schedule → cron translation (sync/schedule.ts resolveSyncCron)
 *
 * The sync scheduler runs on node-cron (same as backups). resolveSyncCron maps
 * a network's `syncSchedule` string to a cron expression:
 *  - a real cron expression passes through (the documented format — the old
 *    bespoke parser silently ignored these, leaving networks on manual sync);
 *  - anything else returns null (caller falls back to manual sync).
 *
 * **The two legacy shorthands were translated here until 4.0 removed them.** What
 * replaced the translation is a refusal at input and a rewrite on disk, both
 * covered by `a-sync-schedule-either-runs-or-is-refused.test.js` — this file now
 * asserts that the scheduler translates NOTHING, which is what makes those two
 * the only paths.
 *
 * Pure in-process logic — no network, no config. Run with:
 *   node --test testing/standalone/sync-cron.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSyncCron } from '../../server/dist/sync/schedule.js';

describe('resolveSyncCron — cron passthrough', () => {
  it('keeps a standard 5-field cron expression as-is', () => {
    assert.equal(resolveSyncCron('*/5 * * * *'), '*/5 * * * *');
    assert.equal(resolveSyncCron('0 */2 * * *'), '0 */2 * * *');
    assert.equal(resolveSyncCron('30 3 * * 1'), '30 3 * * 1');
  });

  it('keeps a 6-field (seconds) cron expression as-is', () => {
    assert.equal(resolveSyncCron('0 */5 * * * *'), '0 */5 * * * *');
  });

  it('trims surrounding whitespace', () => {
    assert.equal(resolveSyncCron('  */10 * * * *  '), '*/10 * * * *');
  });
});

describe('resolveSyncCron — the legacy shorthands are no longer translated HERE', () => {
  /*
   * These two cases asserted the translation: `every 30m` resolved to a cron expression, and had done since
   * before 2.0. 4.0 removed the shorthands, and the pieces that replaced the translation are somewhere else
   * on purpose — a refusal at input and a rewrite on disk, both in
   * `a-sync-schedule-either-runs-or-is-refused.test.js`.
   *
   * Kept as an inverted case rather than deleted, because "the scheduler translates nothing" is the property
   * that makes the other two the only paths. If translation came back here, an operator could keep sending a
   * shorthand and it would work on one door and be refused on another — one rule, two implementations, which
   * is the shape this repository produces most.
   */
  it('a shorthand resolves to null, so nothing reaches the scheduler untranslated', () => {
    // set-claim: the legacy shorthands that exist in stored config files -- a closed HISTORICAL set that
    // cannot grow, because nothing writes them any more.
    for (const shorthand of ['*/5 minutes', '*/15 minutes', 'every 30m', 'every 1min', '*/2 hours', 'every 3h']) {
      assert.equal(resolveSyncCron(shorthand), null, `${shorthand} must no longer translate here`);
    }
  });
});

describe('resolveSyncCron — unrecognised → null', () => {
  it('returns null for empty / gibberish', () => {
    assert.equal(resolveSyncCron(''), null);
    assert.equal(resolveSyncCron('   '), null);
    assert.equal(resolveSyncCron('whenever'), null);
  });

  it('returns null for the shorthand values cron never could express', () => {
    // Unchanged in behaviour and worth keeping separate: these were null BEFORE the removal too, which is
    // why a network holding one has been on manual sync since the day it was set.
    assert.equal(resolveSyncCron('every 90m'), null);   // minutes > 59
    assert.equal(resolveSyncCron('*/25 hours'), null);   // hours > 23
    assert.equal(resolveSyncCron('every 0m'), null);     // zero
  });
});
