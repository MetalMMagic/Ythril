/**
 * Unit tests: sync schedule → cron translation (sync/schedule.ts resolveSyncCron)
 *
 * The sync scheduler now runs on node-cron (same as backups). resolveSyncCron
 * maps a network's `syncSchedule` string to a cron expression:
 *  - a real cron expression passes through (the documented format — the old
 *    bespoke parser silently ignored these, leaving networks on manual sync);
 *  - two legacy shorthands are translated for backward compatibility;
 *  - anything else returns null (caller falls back to manual sync).
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

describe('resolveSyncCron — legacy shorthand translation', () => {
  it('translates "*/N minutes" and "every Nm"', () => {
    assert.equal(resolveSyncCron('*/5 minutes'), '*/5 * * * *');
    assert.equal(resolveSyncCron('*/15 minutes'), '*/15 * * * *');
    assert.equal(resolveSyncCron('every 30m'), '*/30 * * * *');
    assert.equal(resolveSyncCron('every 1min'), '*/1 * * * *');
  });

  it('translates "*/N hours" and "every Nh"', () => {
    assert.equal(resolveSyncCron('*/2 hours'), '0 */2 * * *');
    assert.equal(resolveSyncCron('every 3h'), '0 */3 * * *');
  });
});

describe('resolveSyncCron — unrecognised / out-of-range → null', () => {
  it('returns null for empty / gibberish', () => {
    assert.equal(resolveSyncCron(''), null);
    assert.equal(resolveSyncCron('   '), null);
    assert.equal(resolveSyncCron('whenever'), null);
  });

  it('returns null for shorthand values cron cannot express', () => {
    assert.equal(resolveSyncCron('every 90m'), null);   // minutes > 59
    assert.equal(resolveSyncCron('*/25 hours'), null);   // hours > 23
    assert.equal(resolveSyncCron('every 0m'), null);     // zero
  });
});
