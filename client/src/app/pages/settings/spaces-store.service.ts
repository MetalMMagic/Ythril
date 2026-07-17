import { Injectable, inject, signal, computed } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Network, Space } from '../../core/api.types';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';

/**
 * Owns the spaces page's SERVER DATA — the space list, the networks, and every mutation of them.
 *
 * Split from SpaceSettingsState on purpose (A17.8b): the two are different kinds of state with
 * different lifetimes. This is data fetched from the server and shared by the list and every dialog;
 * SpaceSettingsState is ephemeral form state that dies when the dialog closes. Tangling them is what
 * forced the old component to own both.
 *
 * Because it is a service, the dialogs and tabs mutate the list by calling it — no `@Output()`
 * plumbing back to a parent, and no component owning data that outlives it. Provided by
 * SpacesComponent (not root), so the lifetime matches the page.
 *
 * VIEW state (search text, sort mode) deliberately does NOT live here — that belongs to the
 * component rendering the list, not to the data.
 */
@Injectable()
export class SpacesStore {
  private spacesApi   = inject(SpacesApi);
  private networksApi = inject(NetworksApi);

  readonly spaces   = signal<Space[]>([]);
  readonly networks = signal<Network[]>([]);
  readonly loading  = signal(true);

  /**
   * spaceId -> the networks that space belongs to.
   *
   * The list template needs this per row. It used to call `networks().filter(...)` inline — twice
   * per row (once for `.length`, once for the `@for`) — so rendering N rows did 2N full scans of the
   * network list on every change-detection pass, allocating a fresh array each time (which also
   * defeats `@for` tracking, since the identity changed on every pass). This computes the index once
   * per networks() change instead: O(1) lookup per row, and a stable array identity.
   */
  readonly networksBySpace = computed(() => {
    const index = new Map<string, Network[]>();
    for (const n of this.networks()) {
      for (const spaceId of n.spaces) {
        const list = index.get(spaceId);
        if (list) list.push(n);
        else index.set(spaceId, [n]);
      }
    }
    return index;
  });

  /** Networks the given space belongs to. Empty array shared across misses — do not mutate it. */
  private static readonly NO_NETWORKS: readonly Network[] = [];
  networksForSpace(spaceId: string): Network[] {
    return this.networksBySpace().get(spaceId) ?? (SpacesStore.NO_NETWORKS as Network[]);
  }

  load(): void {
    this.loading.set(true);
    this.spacesApi.listSpaces().subscribe({
      next: ({ spaces }) => { this.spaces.set(spaces); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.networksApi.listNetworks().subscribe({
      next: ({ networks }) => this.networks.set(networks),
      error: () => {},
    });
  }

  refreshNetworks(): void {
    this.networksApi.listNetworks().subscribe({
      next: ({ networks }) => this.networks.set(networks),
      error: () => {},
    });
  }

  /** Merge a server-returned space back into the list (after a settings save). */
  applySpace(space: Space): void {
    this.spaces.update(list => list.map(s => s.id === space.id ? { ...s, ...space } : s));
  }

  /** Reorder optimistically, then persist; on failure fall back to a full reload. */
  reorder(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;
    const list = [...this.spaces()];
    moveItemInArray(list, previousIndex, currentIndex);
    this.spaces.set(list);
    this.spacesApi.reorderSpaces(list.map(s => s.id)).subscribe({
      next: ({ spaces }) => { this.spaces.set(spaces); },
      error: () => this.load(),
    });
  }

  /**
   * Poll until no space reports `indexStatus: 'building'`.
   *
   * A newly created space returns immediately with its Atlas vector indexes still building; recall
   * stays empty until they are ready. Capped at ~2 min.
   */
  pollIndexStatus(attempt = 0): void {
    if (attempt > 40) return; // ~2 min cap
    setTimeout(() => {
      this.spacesApi.listSpaces().subscribe({
        next: ({ spaces }) => {
          this.spaces.set(spaces);
          if (spaces.some(s => s.indexStatus === 'building')) this.pollIndexStatus(attempt + 1);
        },
        error: () => {},
      });
    }, 3000);
  }
}
