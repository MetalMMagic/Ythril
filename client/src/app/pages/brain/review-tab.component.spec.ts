/**
 * ReviewTabComponent characterization tests.
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
import { ReviewTabComponent } from './review-tab.component';
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
    imports: [ReviewTabComponent, getTranslocoModule()],
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
  const f = TestBed.createComponent(ReviewTabComponent);
  f.componentInstance.spaceId = 'work';   // per-space now: the tab always reviews one space
  f.detectChanges(); // ngOnInit → load()
  return { f, c: f.componentInstance, toastErrors };
}

describe('ReviewTabComponent', () => {
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

  it('re-rate on the "dismissed" filter removes the row (it is no longer dismissed)', () => {
    const reopen = vi.fn(() => of({ status: 'open' }));
    const { c } = setup({
      listDuplicates: () => of({ duplicates: [rec({ id: 'd1', status: 'dismissed' }), rec({ id: 'd2', status: 'dismissed' })] }),
      reopenDuplicate: reopen,
    });
    c.statusFilter = 'dismissed';
    c.reopen(rec({ id: 'd1', status: 'dismissed' }));
    expect(reopen).toHaveBeenCalledWith('d1');
    expect(c.rows().map(r => r.id)).toEqual(['d2']);
  });

  it('re-rate on the "all" filter flips the row back to open in place', () => {
    const { c } = setup({
      listDuplicates: () => of({ duplicates: [rec({ id: 'd1', status: 'dismissed' })] }),
      reopenDuplicate: () => of({ status: 'open' }),
    });
    c.statusFilter = 'all';
    c.reopen(rec({ id: 'd1', status: 'dismissed' }));
    expect(c.rows()[0]).toMatchObject({ id: 'd1', status: 'open' });
  });

  it('a re-rate failure surfaces an error toast and leaves the row', () => {
    const { c, toastErrors } = setup({
      listDuplicates: () => of({ duplicates: [rec({ id: 'd1', status: 'dismissed' })] }),
      reopenDuplicate: () => throwError(() => ({ error: { error: 'nope' } })),
    });
    c.statusFilter = 'dismissed';
    c.reopen(rec({ id: 'd1', status: 'dismissed' }));
    expect(toastErrors).toContain('nope');
    expect(c.rows().map(r => r.id)).toEqual(['d1']);
  });

  it('the search box narrows filteredRows over summaries/type/space, leaving rows() intact', () => {
    const { c } = setup({
      listDuplicates: () => of({ duplicates: [
        rec({ id: 'd1', aSummary: 'Vault secrets', bSummary: 'secret store' }),
        rec({ id: 'd2', aSummary: 'Telemetry', bSummary: 'metrics' }),
      ] }),
    });
    c.query.set('vault');
    expect(c.filteredRows().map(r => r.id)).toEqual(['d1']);
    expect(c.rows().length).toBe(2); // the underlying list is untouched
    c.query.set('');
    expect(c.filteredRows().length).toBe(2);
  });

  it('renders a Re-rate button on a dismissed row and a search box, and the button reopens', () => {
    const reopen = vi.fn(() => of({ status: 'open' }));
    const { f } = setup({
      listDuplicates: () => of({ duplicates: [rec({ id: 'd1', status: 'dismissed', type: 'entity' })] }),
      reopenDuplicate: reopen,
    });
    // The Re-rate button keys off the row's own status ('dismissed'), not the filter dropdown, so the
    // single detectChanges in setup() has already rendered it.
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.dup-search input[type="search"]')).not.toBeNull();
    // The dismissed row must offer Re-rate, not Dismiss/Merge.
    const btn = el.querySelector('.dup-actions button') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    btn!.click();
    expect(reopen).toHaveBeenCalledWith('d1');
  });

  it('scopes every query to its space, and reloads when the space changes', async () => {
    // The move out of global Settings is only real if the space reaches the API — otherwise the tab would
    // quietly show every space's pairs inside one space's Brain.
    const listDuplicates = vi.fn(() => of({ duplicates: [] }));
    const scanDuplicates = vi.fn(() => of({ scannedSpaces: 1, scanned: 0, pairs: 0 }));
    const { f, c } = setup({ listDuplicates, scanDuplicates });
    expect(listDuplicates).toHaveBeenCalledWith('open', 'work');

    c.scan();
    expect(scanDuplicates).toHaveBeenCalledWith('work');

    // Switching space in the Brain must re-point the tab, not leave the previous space's pairs on screen.
    listDuplicates.mockClear();
    c.spaceId = 'other';
    f.componentRef.setInput?.('spaceId', 'other');
    c.ngOnChanges({ spaceId: { currentValue: 'other', previousValue: 'work', firstChange: false, isFirstChange: () => false } });
    expect(listDuplicates).toHaveBeenCalledWith('open', 'other');
  });
});