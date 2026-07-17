/**
 * Characterization tests for the pure brain formatters, pinned as they moved off BrainComponent
 * (A17.9b-4) into a shared module every drawer/tab owner can import.
 */
import { describe, it, expect } from 'vitest';
import { toLocalDatetime, fmtApiError } from './brain-format';

describe('toLocalDatetime', () => {
  it('renders a valid ISO string as local YYYY-MM-DDTHH:mm (zero-padded)', () => {
    // Construct from local parts so the assertion is timezone-independent: 2026-03-04 09:07 local.
    const iso = new Date(2026, 2, 4, 9, 7).toISOString();
    expect(toLocalDatetime(iso)).toBe('2026-03-04T09:07');
  });

  it('returns "" for an unparseable date', () => {
    expect(toLocalDatetime('not-a-date')).toBe('');
  });
});

describe('fmtApiError', () => {
  it('expands a schema_violation into "Schema violation — field: reason; …"', () => {
    const err = {
      error: {
        error: 'schema_violation',
        violations: [
          { field: 'age', value: -1, reason: 'must be >= 0' },
          { field: 'name', value: '', reason: 'required' },
        ],
      },
    };
    expect(fmtApiError(err, 'fallback')).toBe('Schema violation — age: must be >= 0; name: required');
  });

  it('passes a plain error string through', () => {
    expect(fmtApiError({ error: { error: 'not_found' } }, 'fallback')).toBe('not_found');
  });

  it('falls back when there is no error body', () => {
    expect(fmtApiError({}, 'Failed to save')).toBe('Failed to save');
  });
});
