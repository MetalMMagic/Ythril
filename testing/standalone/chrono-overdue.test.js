/**
 * C5 — deriveChronoStatus: `overdue` is computed on read from the due moment (endsAt ?? startsAt),
 * only for entries that aren't yet completed/cancelled. This pure rule is what both the read-mapping
 * (listChrono/getChronoById/recall) and the listChrono status-filter translation rely on.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveChronoStatus } from '../../server/dist/brain/chrono.js';

const NOW = new Date('2026-07-18T12:00:00Z');
const PAST = '2026-07-01T00:00:00Z';
const FUTURE = '2026-08-01T00:00:00Z';

describe('deriveChronoStatus (C5)', () => {
  it('upcoming past its startsAt (no endsAt) becomes overdue', () => {
    assert.equal(deriveChronoStatus({ status: 'upcoming', startsAt: PAST }, NOW), 'overdue');
  });

  it('active past its endsAt becomes overdue', () => {
    assert.equal(deriveChronoStatus({ status: 'active', startsAt: PAST, endsAt: PAST }, NOW), 'overdue');
  });

  it('uses endsAt over startsAt — a started-but-not-ended range is NOT overdue', () => {
    assert.equal(deriveChronoStatus({ status: 'active', startsAt: PAST, endsAt: FUTURE }, NOW), 'active');
  });

  it('a future entry stays upcoming', () => {
    assert.equal(deriveChronoStatus({ status: 'upcoming', startsAt: FUTURE }, NOW), 'upcoming');
  });

  it('completed/cancelled are never re-derived, even when past due', () => {
    assert.equal(deriveChronoStatus({ status: 'completed', startsAt: PAST }, NOW), 'completed');
    assert.equal(deriveChronoStatus({ status: 'cancelled', startsAt: PAST }, NOW), 'cancelled');
  });

  it('an already-overdue stored status is returned as-is', () => {
    assert.equal(deriveChronoStatus({ status: 'overdue', startsAt: PAST }, NOW), 'overdue');
  });
});
