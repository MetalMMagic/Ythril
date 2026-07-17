/**
 * SpacesStore — the spaces page's server-data owner.
 *
 * Covers the behaviour moved out of SpacesComponent (A17.8b) plus the `networksBySpace` index that
 * replaced the per-row `networks().filter(...)` scan. The index is the point of the class as much as
 * the data is, so it is pinned here: correctness (right networks per space) AND the property that
 * made it worth doing (a stable array identity across reads, which is what lets `@for` track rows
 * instead of re-creating them every change-detection pass).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { of, throwError } from 'rxjs';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import type { Network, Space } from '../../core/api.types';
import { SpacesStore } from './spaces-store.service';

const space = (id: string, over: Partial<Space> = {}): Space => ({ id, label: id, ...over } as Space);
const net = (id: string, spaces: string[]): Network => ({ id, label: id.toUpperCase(), spaces } as Network);

function make(opts: { spaces?: Space[]; networks?: Network[]; spacesFail?: boolean; networksFail?: boolean } = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      SpacesStore,
      { provide: SpacesApi, useValue: {
        listSpaces: () => opts.spacesFail ? throwError(() => new Error('x')) : of({ spaces: opts.spaces ?? [] }),
        reorderSpaces: (ids: string[]) => of({ spaces: (ids).map(i => space(i)) }),
      } },
      { provide: NetworksApi, useValue: {
        listNetworks: () => opts.networksFail ? throwError(() => new Error('x')) : of({ networks: opts.networks ?? [] }),
      } },
    ],
  });
  return TestBed.inject(SpacesStore);
}

describe('SpacesStore — load', () => {
  it('loads spaces and networks, and clears loading', () => {
    const s = make({ spaces: [space('work')], networks: [net('n1', ['work'])] });
    s.load();
    expect(s.spaces().map(x => x.id)).toEqual(['work']);
    expect(s.networks().map(x => x.id)).toEqual(['n1']);
    expect(s.loading()).toBe(false);
  });

  it('a failing spaces call still clears loading', () => {
    const s = make({ spacesFail: true });
    s.load();
    expect(s.loading()).toBe(false);
    expect(s.spaces()).toEqual([]);
  });

  it('a failing networks call is non-fatal — spaces still load', () => {
    const s = make({ spaces: [space('work')], networksFail: true });
    s.load();
    expect(s.spaces()).toHaveLength(1);
    expect(s.networks()).toEqual([]);
  });
});

describe('SpacesStore — networksBySpace index', () => {
  // Replaces `networks().filter(n => n.spaces.includes(id))` called twice per row. Same answer,
  // O(1) per row instead of a full scan, and — see the identity test — a stable array reference.
  it('maps each space to the networks that contain it', () => {
    const s = make({ networks: [net('a', ['work', 'home']), net('b', ['work'])] });
    s.load();
    expect(s.networksForSpace('work').map(n => n.id)).toEqual(['a', 'b']);
    expect(s.networksForSpace('home').map(n => n.id)).toEqual(['a']);
  });

  it('a space in no network returns empty', () => {
    const s = make({ networks: [net('a', ['other'])] });
    s.load();
    expect(s.networksForSpace('work')).toEqual([]);
  });

  it('returns the SAME array instance across reads — @for tracking depends on it', () => {
    const s = make({ networks: [net('a', ['work'])] });
    s.load();
    expect(s.networksForSpace('work')).toBe(s.networksForSpace('work'));
  });

  it('recomputes when networks change', () => {
    const s = make({ networks: [net('a', ['work'])] });
    s.load();
    expect(s.networksForSpace('work')).toHaveLength(1);
    s.networks.set([net('a', ['work']), net('b', ['work'])]);
    expect(s.networksForSpace('work').map(n => n.id)).toEqual(['a', 'b']);
  });
});

describe('SpacesStore — mutations', () => {
  it('applySpace merges a server-returned space into the list', () => {
    const s = make();
    s.spaces.set([space('work', { label: 'Old' }), space('home')]);
    s.applySpace(space('work', { label: 'New' }));
    expect(s.spaces().map(x => x.label)).toEqual(['New', 'home']);
  });

  it('applySpace leaves the list alone when the id is unknown', () => {
    const s = make();
    s.spaces.set([space('work')]);
    s.applySpace(space('nope'));
    expect(s.spaces().map(x => x.id)).toEqual(['work']);
  });

  it('reorder moves an item and persists the new order', () => {
    const s = make();
    s.spaces.set([space('a'), space('b'), space('c')]);
    s.reorder(0, 2);
    expect(s.spaces().map(x => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('reorder is a no-op when the index has not changed', () => {
    const s = make();
    const before = [space('a'), space('b')];
    s.spaces.set(before);
    s.reorder(1, 1);
    expect(s.spaces()).toBe(before); // untouched, not even re-set
  });

  it('refreshNetworks refetches only the networks', () => {
    const s = make({ networks: [net('a', ['work'])] });
    s.refreshNetworks();
    expect(s.networks().map(n => n.id)).toEqual(['a']);
  });
});
