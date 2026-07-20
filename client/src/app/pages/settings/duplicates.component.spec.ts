/**
 * DuplicatesComponent characterization tests.
 *
 * Written BEFORE the PR-U8 UX rework (comparison cards, confidence meter, guarded Dismiss, SummaryStrip)
 * and proven green against the ORIGINAL component. Pins the load/scan/dismiss/merge behaviour that must
 * survive — including the CURRENT unguarded Dismiss (U8 adds a confirm; this test documents today's
 * behaviour so that change is explicit) and the confirm-guarded Merge.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { DuplicatesComponent } from './duplicates.component';
import { DuplicatesApi } from '../../core/duplicates-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import type { DuplicateRecord } from '../../core/api.types';

const rec = (over: Partial<DuplicateRecord> = {}): DuplicateRecord => ({
  id: 'd1', spaceId: 's', type: 'entity', aId: 'a', aSummary: 'A', bId: 'b', bSummary: 'B',
  score: 0.9, status: 'open', detectedAt: '2026-01-01', updatedAt: '2026-01-01', ...over,
});

function setup(api: Partial<Record<string, unknown>> = {}, confirmResult = true) {
  const toastErrors: string[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DuplicatesComponent, getTranslocoModule()],
    providers: [
      { provide: DuplicatesApi, useValue: {
        listDuplicates: () => of({ duplicates: [] }),
        scanDuplicates: () => of({}),
        dismissDuplicate: () => of({ status: 'ok' }),
        mergeDuplicate: () => of({ status: 'ok' }),
        ...api,
      } },
      { provide: ToastService, useValue: { error: (m: string) => toastErrors.push(m), success: () => {}, show: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(confirmResult) } },
    ],
  });
  const f = TestBed.createComponent(DuplicatesComponent);
  f.detectChanges(); // ngOnInit → load()
  return { f, c: f.componentInstance, toastErrors };
}

describe('DuplicatesComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('load populates rows and clears loading', () => {
    const { c } = setup({ listDuplicates: () => of({ duplicates: [rec(), rec({ id: 'd2' })] }) });
    expect(c.rows().length).toBe(2);
    expect(c.loading()).toBe(false);
    expect(c.error()).toBe(false);
  });

  it('a load failure sets the error state', () => {
    const { c } = setup({ listDuplicates: () => throwError(() => ({})) });
    expect(c.error()).toBe(true);
    expect(c.loading()).toBe(false);
  });

  it('dismiss (confirmed) on the "open" filter removes the row optimistically', async () => {
    const { c } = setup({}, true);
    c.statusFilter = 'open';
    c.rows.set([rec({ id: 'd1' }), rec({ id: 'd2' })]);
    await c.dismiss(rec({ id: 'd1' }));
    expect(c.rows().map(r => r.id)).toEqual(['d2']);
  });

  it('dismiss (confirmed) on the "all" filter keeps the row but marks it dismissed', async () => {
    const { c } = setup({}, true);
    c.statusFilter = 'all';
    c.rows.set([rec({ id: 'd1', status: 'open' })]);
    await c.dismiss(rec({ id: 'd1' }));
    expect(c.rows()[0]).toMatchObject({ id: 'd1', status: 'dismissed' });
  });

  it('dismiss is now guarded: cancelling the confirm leaves the row untouched', async () => {
    const dismissSpy = vi.fn().mockReturnValue(of({ status: 'ok' }));
    const { c } = setup({ dismissDuplicate: dismissSpy }, false);
    c.statusFilter = 'open';
    c.rows.set([rec({ id: 'd1' })]);
    await c.dismiss(rec({ id: 'd1' }));
    expect(dismissSpy).not.toHaveBeenCalled();
    expect(c.rows().map(r => r.id)).toEqual(['d1']);
  });

  it('merge asks for confirmation and, when confirmed, calls the API and removes the row', async () => {
    const mergeSpy = vi.fn().mockReturnValue(of({ status: 'ok' }));
    const { c } = setup({ mergeDuplicate: mergeSpy }, true);
    c.rows.set([rec({ id: 'd1' }), rec({ id: 'd2' })]);
    await c.merge(rec({ id: 'd1' }));
    expect(mergeSpy).toHaveBeenCalledWith('d1');
    expect(c.rows().map(r => r.id)).toEqual(['d2']);
  });

  it('merge does nothing when the confirmation is cancelled', async () => {
    const mergeSpy = vi.fn().mockReturnValue(of({ status: 'ok' }));
    const { c } = setup({ mergeDuplicate: mergeSpy }, false);
    c.rows.set([rec({ id: 'd1' })]);
    await c.merge(rec({ id: 'd1' }));
    expect(mergeSpy).not.toHaveBeenCalled();
    expect(c.rows().map(r => r.id)).toEqual(['d1']);
  });

  it('scan surfaces a distinct message for 403 vs other errors', () => {
    const forbidden = setup({ scanDuplicates: () => throwError(() => ({ status: 403 })) });
    forbidden.c.scan();
    expect(forbidden.toastErrors).toContain('duplicates.scanForbidden');

    const other = setup({ scanDuplicates: () => throwError(() => ({ status: 500 })) });
    other.c.scan();
    expect(other.toastErrors).toContain('duplicates.scanError');
  });
});
