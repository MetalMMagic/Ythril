/**
 * Standalone tests: the notify limiter honours the test kill-switch.
 *
 * `POST /api/notify/trigger` is how the harness drives a sync cycle. It is guarded
 * by `notifyRateLimit` (60/min per IP) — and every request from the harness shares a
 * single source IP, so the sync suites collectively exhausted the window and started
 * getting 429s. The tests' trigger call swallows errors, so a 429 meant the sync cycle
 * silently never ran, and load-sensitive sync assertions timed out looking like flakes
 * (this is what made the signed-vote relay test intermittently fail in CI).
 *
 * notifyRateLimit was the ONLY limiter with no `skip:` clause. These tests pin both
 * halves of the fix:
 *   - instance A (SKIP_SYNC_RATE_LIMIT=true) must serve well past 60 triggers/min
 *   - instance C (no kill-switch) must still enforce the real 429
 *
 * Run: node --test testing/standalone/notify-rate-limit.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');

const tokenFor = (inst) => fs.readFileSync(path.join(CONFIGS, inst, 'token.txt'), 'utf8').trim();

/** Fire n sequential triggers, returning the set of status codes seen. */
async function hammerTrigger(baseUrl, token, n) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const res = await fetch(`${baseUrl}/api/notify/trigger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      // A networkId that does not exist: the endpoint is fire-and-forget, so this
      // exercises the rate limiter without kicking off real sync work.
      body: JSON.stringify({ networkId: 'rate-limit-probe-nonexistent' }),
    });
    codes.push(res.status);
  }
  return codes;
}

describe('notify rate limit — kill-switch', () => {
  it('instance A (SKIP_SYNC_RATE_LIMIT set) serves far more than 60 triggers/min', async () => {
    // 90 > the 60/min ceiling. Before the fix this produced 30x 429 on A, which is
    // precisely how the harness lost its sync triggers under load.
    const codes = await hammerTrigger(INSTANCES.a, tokenFor('a'), 90);
    const tooMany = codes.filter(c => c === 429).length;
    assert.equal(
      tooMany, 0,
      `notify triggers on A must not be rate-limited when the kill-switch is set (got ${tooMany}x 429)`,
    );
    assert.ok(codes.every(c => c === 200), `expected all 200s, saw: ${[...new Set(codes)].join(',')}`);
  });

  it('instance C (no kill-switch) still enforces the real 60/min limit', async () => {
    // C deliberately omits the SKIP_* envs so the genuine 429 behaviour stays covered.
    const codes = await hammerTrigger(INSTANCES.c, tokenFor('c'), 75);
    assert.ok(
      codes.includes(429),
      'C must still rate-limit notify — the kill-switch must not weaken real deployments',
    );
  });
});
