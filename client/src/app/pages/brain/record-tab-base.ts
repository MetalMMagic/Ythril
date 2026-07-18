import { Directive, effect, inject, input, signal, untracked } from '@angular/core';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordListState } from './record-list-state.service';

/**
 * Shared machinery for the five record-tab components (memories/entities/edges/chrono/filemeta),
 * extracted after all five landed (A17.9d). Holds ONLY what is provably universal across all of them
 * — the collaborators every tab injects, the `spaceId` input, page size, the paging cursor, the
 * self-load effect, and the delete-confirm toggle.
 *
 * Deliberately minimal: everything that VARIES stays in the subclass — the `brainApi`/`filesApi` and
 * `drawerState` a tab may or may not need, the `mutated`/`openInManager` outputs, the `recordFilter`/
 * search state, and every create/edit/delete/search body. That is the point: a "CRUD base" that
 * absorbed those would erase the per-tab asymmetries the A17.9b-6b characterization tests pin (memory
 * sends properties raw while entity/edge strip; delete refreshes stats for some tabs but not others;
 * memory/chrono resolve chip names on load, entity does not). The base cannot force a wrong shape.
 *
 * `@Directive()` (not a plain abstract class) is the Angular-blessed carrier for shared component
 * logic with `input()`/`inject()`/`effect()`; concrete tabs extend it and add their own `@Component`.
 */
@Directive()
export abstract class RecordTabBase {
  readonly store = inject(BrainStore);
  readonly picker = inject(EntityRefPicker);
  readonly recordList = inject(RecordListState);

  readonly spaceId = input.required<string>();
  readonly pageSize = 20;

  skip = signal(0);

  constructor() {
    // Self-load on creation (tab activation via the shell's gated @if) and on a space switch while
    // mounted. The `if (id)` guard keeps it to a single real load until the input settles.
    effect(() => {
      const id = this.spaceId();
      this.skip.set(0);
      this.resetOnSpaceChange();
      if (id) this.load();
    });

    // Live refresh (F12): when the shell signals a change for this space+collection, reload the CURRENT
    // page (no skip/search reset — keep the user's position). Only the mounted tab has a live effect, so
    // only the active list reloads. `untracked` keeps this effect off the spaceId dependency so a space
    // switch doesn't double-load via both effects.
    let firstTick = true;
    effect(() => {
      this.store.liveRefreshTick();
      if (firstTick) { firstTick = false; return; }
      if (untracked(() => this.spaceId())) this.load();
    });
  }

  /** Load the tab's list for the active space. Sets `recordList.loading`/`loadError` + `store.<coll>`. */
  protected abstract load(): void;

  /** Override to clear per-tab filter/search state on a space switch (default: nothing beyond skip). */
  protected resetOnSpaceChange(): void {}

  retryCurrentTab(): void { this.load(); }

  prevPage(): void { this.skip.update(s => Math.max(0, s - this.pageSize)); this.load(); }
  nextPage(): void { this.skip.update(s => s + this.pageSize); this.load(); }

  requestDelete(id: string): void { this.recordList.confirmDeleteId.set(id); }
  cancelDelete(): void { this.recordList.confirmDeleteId.set(''); }
}
