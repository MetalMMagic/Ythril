import { Injectable, signal } from '@angular/core';

/**
 * Singleton interaction state shared by every record tab (memories/entities/edges/chrono/filemeta).
 *
 * Extracted from BrainComponent (A17.9b-6c) as the keystone before the tabs become their own
 * components. These signals are singleton by nature — only one record is being loaded, inline-edited,
 * or delete-confirmed at a time — so a single shared instance is faithful to today's behaviour and
 * lets the shell's unified loading overlay and each future tab component read the same state without
 * duplication. The per-tab FILTERS and pagination (`recordFilter`, `filterEntity`, `skip*`) are NOT
 * here — those are genuinely per-tab and move to each tab component as it is extracted.
 *
 * Provided by BrainComponent (not root): one instance per mounted page.
 */
@Injectable()
export class RecordListState {
  /** True while the active tab's list is loading (drives the shell's content overlay). */
  loading = signal(false);
  /** Failure reason for the active tab's last load; null when it succeeded (or hasn't run). */
  loadError = signal<string | null>(null);

  /** The `_id` of the row being inline-edited (empty = none). */
  editingId = signal('');
  editSaving = signal(false);
  editError = signal('');

  /** The `_id` of the row whose delete is awaiting confirmation (empty = none). */
  confirmDeleteId = signal('');

  cancelEdit(): void {
    this.editingId.set('');
    this.editError.set('');
  }
}
