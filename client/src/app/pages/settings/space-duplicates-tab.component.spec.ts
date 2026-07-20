/**
 * SpaceDuplicatesTabComponent characterization tests.
 *
 * Written BEFORE the PR-U8 rework (empty state, minScore-as-percent/slider) and proven green against the
 * ORIGINAL component. Pins the save-rules logic that must survive: notify-URL validation, the auto-merge
 * confirmation gate, and score clamping in the persisted payload.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpaceDuplicatesTabComponent } from './space-duplicates-tab.component';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { SpacesStore } from './spaces-store.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import type { DupeActionRule } from '../../core/api.types';

function setup(updateSpace = vi.fn().mockReturnValue(of({ space: { id: 's1', label: 'S1' } })), confirmResult = true) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceDuplicatesTabComponent, getTranslocoModule()],
    providers: [
      SpaceSettingsState,
      { provide: SpacesApi, useValue: { updateSpace } },
      { provide: SpacesStore, useValue: { spaces: signal([]) } },
      { provide: ToastService, useValue: { error: () => {}, success: () => {}, show: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(confirmResult) } },
    ],
  });
  const f = TestBed.createComponent(SpaceDuplicatesTabComponent);
  const c = f.componentInstance;
  const state = TestBed.inject(SpaceSettingsState);
  state.settingsSpace.set({ id: 's1', label: 'S1' } as never);
  return { c, state, updateSpace };
}

describe('SpaceDuplicatesTabComponent — saveDupeRules', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('rejects an invalid notify webhook URL without saving', async () => {
    const { c, state, updateSpace } = setup();
    state.dupeRulesState = [{ minScore: 0.9, action: 'notify', webhookUrl: 'not-a-url' } as DupeActionRule];
    await c.saveDupeRules();
    expect(updateSpace).not.toHaveBeenCalled();
    expect(state.dupeError()).toBeTruthy();
  });

  it('does not save when the auto-merge confirmation is cancelled', async () => {
    const { c, state, updateSpace } = setup(vi.fn().mockReturnValue(of({ space: {} })), false);
    state.dupeRulesState = [{ minScore: 0.95, action: 'automerge' } as DupeActionRule];
    await c.saveDupeRules();
    expect(updateSpace).not.toHaveBeenCalled();
  });

  it('clamps minScore into [0,1] and persists survivor + onInsert', async () => {
    const { c, state, updateSpace } = setup();
    state.dupeRulesState = [
      { minScore: 1.5, action: 'flag' } as DupeActionRule,
      { minScore: -0.2, action: 'flag' } as DupeActionRule,
    ];
    state.dupeSurvivor = 'newer';
    state.dupeOnInsert = true;
    await c.saveDupeRules();
    expect(updateSpace).toHaveBeenCalledTimes(1);
    const [id, body] = updateSpace.mock.calls[0];
    expect(id).toBe('s1');
    expect(body.dupeRules.map((r: DupeActionRule) => r.minScore)).toEqual([1, 0]);
    expect(body.dupeMergeSurvivor).toBe('newer');
    expect(body.dupeRulesOnInsert).toBe(true);
  });

  it('marks saved + pristine after a successful save', async () => {
    const { c, state } = setup();
    state.dupeRulesState = [{ minScore: 0.9, action: 'flag' } as DupeActionRule];
    await c.saveDupeRules();
    expect(state.dupeSaved()).toBe(true);
    expect(state.dupeSaving()).toBe(false);
  });
});
