/**
 * NetworkCreateDialogComponent — characterization tests for the create form, relocated from
 * networks.component.spec.ts when the Create dialog was extracted into its own child component (PR-U3).
 * Behavior is unchanged from the inline version: blank-label guard, the create payload shape, the
 * comma-separated fallback when the host's spaces list failed to load, and the server-error surface.
 * The only difference from the old inline version is that success now EMITS the created network (the
 * host appends + closes) instead of mutating a shared list.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { Network } from '../../core/api.types';
import { NetworksApi } from '../../core/networks-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { NetworkCreateDialogComponent } from './network-create-dialog.component';

describe('NetworkCreateDialogComponent (characterization)', () => {
  let api: { createNetwork: ReturnType<typeof vi.fn> };

  function make() {
    api = { createNetwork: vi.fn((body: unknown) => of({ id: 'new', label: (body as { label: string }).label } as Network)) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NetworkCreateDialogComponent, getTranslocoModule()],
      providers: [{ provide: NetworksApi, useValue: api }],
    });
    return TestBed.createComponent(NetworkCreateDialogComponent);
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('createNetwork() is a no-op when the label is blank', () => {
    const c = make().componentInstance;
    c.form = { label: '   ', type: 'closed', votingDeadlineHours: 48 };
    c.createNetwork();
    expect(api.createNetwork).not.toHaveBeenCalled();
  });

  it('createNetwork() posts the selected spaces and emits the created network', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    const created = vi.fn();
    c.created.subscribe(created);
    c.form = { label: ' Team ', type: 'club', votingDeadlineHours: 24 };
    c.networkSelectedSpaces = ['a', 'b'];
    c.createNetwork();
    expect(api.createNetwork).toHaveBeenCalledWith({ label: 'Team', type: 'club', spaces: ['a', 'b'], votingDeadlineHours: 24 });
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ id: 'new', label: 'Team' }));
    expect(c.creating()).toBe(false);
  });

  it('createNetwork() falls back to the comma-separated spaces field when the spaces list failed to load', () => {
    const fixture = make();
    fixture.componentRef.setInput('spacesLoadFailed', true);
    const c = fixture.componentInstance;
    c.form = { label: 'X', type: 'closed', votingDeadlineHours: 48 };
    c.networkSpacesFallback = 'general, personal ,';
    c.createNetwork();
    expect(api.createNetwork).toHaveBeenCalledWith(expect.objectContaining({ spaces: ['general', 'personal'] }));
  });

  it('createNetwork() surfaces the server error into createError', () => {
    const fixture = make();
    api.createNetwork.mockReturnValue(throwError(() => ({ error: { error: 'nope' } })));
    const c = fixture.componentInstance;
    c.form = { label: 'X', type: 'closed', votingDeadlineHours: 48 };
    c.createNetwork();
    expect(c.createError()).toBe('nope');
    expect(c.creating()).toBe(false);
  });

  it('toggleNetworkSpace() adds/removes ids and syncs the select-all flag', () => {
    const fixture = make();
    fixture.componentRef.setInput('availableSpaces', [{ id: 'a' }, { id: 'b' }] as never);
    const c = fixture.componentInstance;
    c.toggleNetworkSpace('a');
    expect(c.isNetworkSpaceSelected('a')).toBe(true);
    expect(c.networkSelectAll).toBe(false);
    c.toggleNetworkSpace('b');
    expect(c.networkSelectAll).toBe(true); // both selected → all
    c.toggleNetworkSpace('a');
    expect(c.isNetworkSpaceSelected('a')).toBe(false);
    expect(c.networkSelectAll).toBe(false);
  });

  it('toggleNetworkSelectAll() selects every available space then clears', () => {
    const fixture = make();
    fixture.componentRef.setInput('availableSpaces', [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as never);
    const c = fixture.componentInstance;
    c.toggleNetworkSelectAll();
    expect(c.networkSelectedSpaces).toEqual(['a', 'b', 'c']);
    c.toggleNetworkSelectAll();
    expect(c.networkSelectedSpaces).toEqual([]);
  });
});
