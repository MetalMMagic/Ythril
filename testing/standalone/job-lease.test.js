/**
 * The pure parts of a job's claim: the heartbeat throttle, the abandonment signal, and the line an
 * operator actually reads when a job is re-queued.
 *
 * `job-lease-db.test.js` covers the lease itself against a real MongoDB, because that is where the
 * question "did this write match the document" is answered. This file covers the decisions that surround
 * it, which a database cannot check:
 *
 *   - a heartbeat every ~200 ms would triple the writes the embedding phase makes to say nothing new, and
 *     an unconditional throttle would swallow the LAST step so a bar stops at 47/50 and reads as a hang;
 *   - the re-queue log used to be `reset 1 stalled job(s) to pending` at `info` — no file, no elapsed time,
 *     no size, so a fleet whose large documents were being killed mid-flight had nothing to grep for.
 *
 * Run: node --test testing/standalone/job-lease.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let shouldHeartbeat, stalledJobWarning, newClaimToken, isLeaseLost, JobLeaseLostError,
  HEARTBEAT_MIN_INTERVAL_MS;

const NOW = Date.parse('2026-08-01T12:00:00.000Z');

describe('job lease helpers', () => {
  before(async () => {
    ({ shouldHeartbeat, stalledJobWarning, newClaimToken, isLeaseLost, JobLeaseLostError,
      HEARTBEAT_MIN_INTERVAL_MS } = await import('../../server/dist/files/media/lease.js'));
  });

  describe('shouldHeartbeat', () => {
    it('throttles steps that land faster than the interval', () => {
      assert.equal(shouldHeartbeat(NOW, NOW + 200), false, 'a chunk lands every ~200 ms');
      assert.equal(shouldHeartbeat(NOW, NOW + HEARTBEAT_MIN_INTERVAL_MS), true);
    });

    it('ALWAYS writes the last step, however soon it lands', () => {
      // Otherwise the final state of a phase can fall inside the throttle window and the last report
      // anyone sees is 47/50 — indistinguishable from stopping at 47.
      assert.equal(shouldHeartbeat(NOW, NOW + 1, true), true);
    });

    it('stays well inside any usable stall timeout', () => {
      // The admin API's floor for stalledJobTimeoutMs is 30 s. A throttle anywhere near that would be a
      // stall detector racing its own heartbeat.
      assert.ok(HEARTBEAT_MIN_INTERVAL_MS <= 5_000, `${HEARTBEAT_MIN_INTERVAL_MS} is too coarse`);
    });
  });

  describe('newClaimToken', () => {
    it('differs between two claims taken in the same millisecond', () => {
      const tokens = new Set(Array.from({ length: 200 }, () => newClaimToken()));
      assert.equal(tokens.size, 200, 'two pods can claim in the same tick — a timestamp would collide');
    });
  });

  describe('isLeaseLost', () => {
    it('recognises the error', () => {
      assert.equal(isLeaseLost(new JobLeaseLostError('general', 'doc.pdf')), true);
    });

    it('recognises one built by a different module instance', () => {
      // `instanceof` fails across duplicate module copies (dist vs src, or a bundler), and the worker's
      // decision between "abandon" and "fail and burn an attempt" hangs off this answer.
      const e = new Error('Lease lost');
      e.name = 'JobLeaseLostError';
      assert.equal(isLeaseLost(e), true);
    });

    it('does not swallow ordinary failures', () => {
      for (const e of [new Error('embedder down'), new TypeError('x'), 'string', null, undefined]) {
        assert.equal(isLeaseLost(e), false, String(e));
      }
    });
  });

  describe('stalledJobWarning', () => {
    const job = {
      spaceId: 'reporting',
      _id: 'reports/q1.pdf',
      filePath: 'reports/q1.pdf',
      progressAt: '2026-08-01T11:54:00.000Z',   // 6 minutes of silence
      claimedAt: '2026-08-01T11:40:00.000Z',
      attempts: 2,
      maxAttempts: 3,
      progress: { step: 'embed', done: 143, total: 512 },
    };

    it('names the file, the silence, the size, the step and the attempt', () => {
      const line = stalledJobWarning(job, NOW, 358_400);
      assert.match(line, /reporting\/reports\/q1\.pdf/);
      assert.match(line, /360s/, 'elapsed since the last sign of life, not since the claim');
      assert.match(line, /350 KiB/);
      assert.match(line, /embed 143\/512/, 'which step it was in is the diagnostic');
      assert.match(line, /attempt 2\/3/);
    });

    it('says what to do about it — slow is not stuck', () => {
      const line = stalledJobWarning(job, NOW, 358_400);
      assert.match(line, /stalledJobTimeoutMs/);
      assert.match(line, /embedConcurrency/);
    });

    it('measures from claimedAt when the job never ticked', () => {
      const line = stalledJobWarning({ ...job, progressAt: null }, NOW, 1024);
      assert.match(line, /1200s/, 'an old build claimed it and never heartbeat');
    });

    it('degrades instead of throwing when fields are missing', () => {
      // It is a log line for a recovery path: a missing size or an unparseable date must not turn the
      // warning into an exception inside the sweep that is trying to recover jobs.
      const line = stalledJobWarning({}, NOW, undefined);
      assert.match(line, /unknown time/);
      assert.match(line, /unknown size/);
      assert.match(line, /no step reported/);
      assert.doesNotThrow(() => stalledJobWarning({ progressAt: 'not-a-date' }, NOW, NaN));
    });
  });
});
