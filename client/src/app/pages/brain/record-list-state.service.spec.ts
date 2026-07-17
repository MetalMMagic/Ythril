import { describe, it, expect } from 'vitest';
import { RecordListState } from './record-list-state.service';

describe('RecordListState', () => {
  it('starts idle', () => {
    const s = new RecordListState();
    expect(s.loading()).toBe(false);
    expect(s.loadError()).toBeNull();
    expect(s.editingId()).toBe('');
    expect(s.confirmDeleteId()).toBe('');
  });

  it('cancelEdit clears the editing id and error but leaves saving/confirm untouched', () => {
    const s = new RecordListState();
    s.editingId.set('m1');
    s.editError.set('boom');
    s.editSaving.set(true);
    s.confirmDeleteId.set('m2');

    s.cancelEdit();

    expect(s.editingId()).toBe('');
    expect(s.editError()).toBe('');
    // cancelEdit is intentionally narrow — it does not touch saving or the delete confirmation.
    expect(s.editSaving()).toBe(true);
    expect(s.confirmDeleteId()).toBe('m2');
  });
});
