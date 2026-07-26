/**
 * ToolsTabComponent — per-row "Rebuild" action on the vector-index table (item 18).
 *
 * The table surfaces index drift (config says ready, the database has no index); the button repairs it
 * by calling the SAME `rebuildSpaceIndexes` the space Danger Zone uses, behind a confirm. These tests
 * exercise the component logic directly (no template render) with light service mocks.
 */
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { ToolsTabComponent } from './tools-tab.component';
import { PipelineStatusService } from './pipeline-status.service';
import { SpacesApi } from '../../../core/spaces-api.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';
import { SpaceIndexStatus } from './models.types';

function makeSpace(over: Partial<SpaceIndexStatus> = {}): SpaceIndexStatus {
  return { id: 'general', label: 'General', stored: 'ready', live: 'missing', collections: [], drifted: true, ...over };
}

function setup(opts: { confirm?: boolean; rebuild?: 'ok' | 'error' } = {}) {
  const confirm = vi.fn().mockResolvedValue(opts.confirm ?? true);
  const rebuildSpaceIndexes = vi.fn().mockReturnValue(
    opts.rebuild === 'error'
      ? throwError(() => ({ error: { error: 'boom' } }))
      : of({ ok: true, spaceId: 'general', status: 'started' }),
  );
  const success = vi.fn();
  const error = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ToolsTabComponent, getTranslocoModule()],
    providers: [
      { provide: PipelineStatusService, useValue: { status: () => null, driftedSpaces: () => [] } },
      { provide: SpacesApi, useValue: { rebuildSpaceIndexes } },
      { provide: ToastService, useValue: { success, error } },
      { provide: ConfirmDialogService, useValue: { confirm } },
    ],
  });
  const c = TestBed.createComponent(ToolsTabComponent).componentInstance;
  return { c, confirm, rebuildSpaceIndexes, success, error };
}

describe('ToolsTabComponent — per-row rebuild', () => {
  beforeEach(() => vi.clearAllMocks());

  it('declining the confirm does not call the api and does not mark the row rebuilding', async () => {
    const { c, confirm, rebuildSpaceIndexes } = setup({ confirm: false });
    await c.rebuildIndexes(makeSpace());
    expect(confirm).toHaveBeenCalledOnce();
    expect(rebuildSpaceIndexes).not.toHaveBeenCalled();
    expect(c.rebuilding().has('general')).toBe(false);
  });

  it('confirming calls rebuildSpaceIndexes, toasts success, and clears the rebuilding flag', async () => {
    const { c, rebuildSpaceIndexes, success } = setup({ confirm: true, rebuild: 'ok' });
    await c.rebuildIndexes(makeSpace());
    expect(rebuildSpaceIndexes).toHaveBeenCalledWith('general');
    expect(success).toHaveBeenCalledOnce();
    // synchronous `of(...)` resolves the subscribe before we get here — flag is cleared again
    expect(c.rebuilding().has('general')).toBe(false);
  });

  it('an api error toasts the error and clears the rebuilding flag', async () => {
    const { c, error, success } = setup({ confirm: true, rebuild: 'error' });
    await c.rebuildIndexes(makeSpace());
    expect(error).toHaveBeenCalledOnce();
    expect(success).not.toHaveBeenCalled();
    expect(c.rebuilding().has('general')).toBe(false);
  });

  it('renders a Rebuild button per space row and wires its click to the rebuild flow', async () => {
    const confirm = vi.fn().mockResolvedValue(false); // decline so we only assert the button reaches confirm
    const rebuildSpaceIndexes = vi.fn();
    const status = () => ({
      checkedAt: '', sidecars: [], models: [], faceRecognition: { state: 'ok' as const },
      index: { spaces: [makeSpace({ id: 'general', label: 'General' })] },
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ToolsTabComponent, getTranslocoModule()],
      providers: [
        { provide: PipelineStatusService, useValue: { status, driftedSpaces: () => [makeSpace()] } },
        { provide: SpacesApi, useValue: { rebuildSpaceIndexes } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    });
    const fixture: ComponentFixture<ToolsTabComponent> = TestBed.createComponent(ToolsTabComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('td.act button') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    btn!.click();
    expect(confirm).toHaveBeenCalledOnce(); // the click reached the guarded confirm dialog
  });

  it('ignores a second click while a rebuild is already in flight for that row', async () => {
    // A never-completing observable keeps the row "rebuilding" so the re-entrancy guard is observable.
    const rebuildSpaceIndexes = vi.fn().mockReturnValue({ subscribe: () => ({}) });
    const confirm = vi.fn().mockResolvedValue(true);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ToolsTabComponent, getTranslocoModule()],
      providers: [
        { provide: PipelineStatusService, useValue: { status: () => null, driftedSpaces: () => [] } },
        { provide: SpacesApi, useValue: { rebuildSpaceIndexes } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    });
    const c = TestBed.createComponent(ToolsTabComponent).componentInstance;
    const sp = makeSpace();
    await c.rebuildIndexes(sp);
    expect(c.rebuilding().has('general')).toBe(true);
    await c.rebuildIndexes(sp); // guarded — no second confirm, no second api call
    expect(confirm).toHaveBeenCalledOnce();
    expect(rebuildSpaceIndexes).toHaveBeenCalledOnce();
  });
});
