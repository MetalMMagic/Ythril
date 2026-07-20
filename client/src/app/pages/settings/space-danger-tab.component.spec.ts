/**
 * SpaceDangerTabComponent characterization tests.
 *
 * Written BEFORE the PR-U9 rework (escalate Wipe to a red tier, add type-to-confirm to Rename, responsive
 * tiles) and proven green against the ORIGINAL component. The danger tab performs the IRREVERSIBLE space
 * operations — rename, wipe, delete, leave-network — each behind a confirm. These tests pin that gating so
 * the redesign can't weaken it: a cancelled confirm must never call the API, and a confirmed one calls the
 * right endpoint and updates state. (Wipe/Delete already use type-to-confirm; the rework adds it to Rename.)
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpaceDangerTabComponent } from './space-danger-tab.component';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { SpacesStore } from './spaces-store.service';
import { NetworksApi } from '../../core/networks-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

function setup(confirmResult: boolean, api: Partial<Record<string, unknown>> = {}) {
  const spacesApi = {
    renameSpace: vi.fn().mockReturnValue(of({ space: { id: 'renamed', label: 'S' } })),
    wipeSpace: vi.fn().mockReturnValue(of({})),
    deleteSpace: vi.fn().mockReturnValue(of({})),
    getSpaceStats: vi.fn().mockReturnValue(of({})),
    ...api,
  };
  const networksApi = {
    listNetworks: vi.fn().mockReturnValue(of({ networks: [] })),
    leaveNetwork: vi.fn().mockReturnValue(of({})),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceDangerTabComponent, getTranslocoModule()],
    providers: [
      SpaceSettingsState,
      { provide: SpacesApi, useValue: spacesApi },
      { provide: NetworksApi, useValue: networksApi },
      { provide: SpacesStore, useValue: { spaces: signal([]), networks: signal([]), refreshNetworks: () => {} } },
      { provide: ToastService, useValue: { error: () => {}, success: () => {}, show: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(confirmResult) } },
    ],
  });
  const c = TestBed.createComponent(SpaceDangerTabComponent).componentInstance;
  const state = TestBed.inject(SpaceSettingsState);
  state.settingsSpace.set({ id: 'proj', label: 'Project' } as never);
  return { c, state, spacesApi, networksApi };
}

describe('SpaceDangerTabComponent — irreversible ops are confirm-gated', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('rename: no-op when the new id is blank or unchanged', async () => {
    const { c, state, spacesApi } = setup(true);
    state.dangerRenameId = '';
    await c.submitDangerRename();
    state.dangerRenameId = 'proj'; // same as current
    await c.submitDangerRename();
    expect(spacesApi.renameSpace).not.toHaveBeenCalled();
  });

  it('rename: a cancelled confirm does not call the API', async () => {
    const { c, state, spacesApi } = setup(false);
    state.dangerRenameId = 'proj-2';
    await c.submitDangerRename();
    expect(spacesApi.renameSpace).not.toHaveBeenCalled();
  });

  it('rename: confirmed calls renameSpace(old,new) and reflects the new space', async () => {
    const { c, state, spacesApi } = setup(true, {
      renameSpace: vi.fn().mockReturnValue(of({ space: { id: 'proj-2', label: 'Project' } })),
    });
    state.dangerRenameId = 'proj-2';
    await c.submitDangerRename();
    expect(spacesApi.renameSpace).toHaveBeenCalledWith('proj', 'proj-2');
    expect(state.settingsSpace()?.id).toBe('proj-2');
  });

  it('wipe: cancelled does not call the API; confirmed does', async () => {
    const cancelled = setup(false);
    await cancelled.c.confirmDangerWipe();
    expect(cancelled.spacesApi.wipeSpace).not.toHaveBeenCalled();

    const ok = setup(true);
    await ok.c.confirmDangerWipe();
    expect(ok.spacesApi.wipeSpace).toHaveBeenCalledWith('proj');
  });

  it('delete: cancelled does not call the API; confirmed deletes and closes the dialog', async () => {
    const cancelled = setup(false);
    await cancelled.c.confirmDangerDelete();
    expect(cancelled.spacesApi.deleteSpace).not.toHaveBeenCalled();

    const ok = setup(true);
    await ok.c.confirmDangerDelete();
    expect(ok.spacesApi.deleteSpace).toHaveBeenCalledWith('proj');
    expect(ok.state.settingsSpace()).toBeNull(); // closeSettings()
  });

  it('leave network: cancelled does not call the API; confirmed leaves', async () => {
    const cancelled = setup(false);
    await cancelled.c.leaveNetworkDanger('net1');
    expect(cancelled.networksApi.leaveNetwork).not.toHaveBeenCalled();

    const ok = setup(true);
    await ok.c.leaveNetworkDanger('net1');
    expect(ok.networksApi.leaveNetwork).toHaveBeenCalledWith('net1');
  });
});
