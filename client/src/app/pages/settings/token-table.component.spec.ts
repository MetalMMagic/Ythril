import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { AuthApi } from '../../core/auth-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { TokensComponent } from './tokens.component';
import type { TokenRecord } from '../../core/api.types';

/**
 * The Tokens table's headers, search boxes and empty states — asserted through the PAGE.
 *
 * ## Why through the page rather than the component alone
 *
 * Because the wiring is the thing that can be wrong. `token-table.spec.ts` already exercises every ordering and
 * matching rule directly, so nothing here needs to re-check a comparator; what is untested until a page renders
 * is whether the header a user clicks reaches `setSort`, whether the box they type in reaches the filter, and
 * whether the two ever get connected to the same list.
 *
 * That is the mistake this repo has made before and caught late: a spec asserting `componentInstance.model()`
 * passed while the template handed a *copy* to every widget, so the page was inert and 84 tests were green.
 * Reaching the real elements is what makes these assertions mean anything.
 */
/**
 * The same provider set the page's own spec uses, including `verifyToken` — the page renders
 * `<app-own-token-rights/>`, which reads the caller's own record, and a stub without it fails every case here
 * with a message about the panel rather than about the table.
 */
function render(tokens: TokenRecord[]) {
  TestBed.configureTestingModule({
    imports: [TokensComponent, getTranslocoModule()],
    providers: [
      { provide: AuthApi, useValue: {
        getMe: () => of({ admin: true, id: 'self', name: 'self' }),
        verifyToken: () => of({ id: 'self', name: 'self' }),
        listTokens: () => of({ tokens }),
      } },
      { provide: SpacesApi, useValue: { listSpaces: () => of({ spaces: [{ id: 'work', label: 'work' }] }) } },
      { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TokensComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

const tok = (over: Partial<TokenRecord> = {}): TokenRecord => ({
  id: 'id', name: 'token', createdAt: '2026-01-01T00:00:00.000Z', spaces: [], admin: false, ...over,
} as TokenRecord);

beforeEach(() => TestBed.resetTestingModule());

describe('the token table sorts on every column but the buttons', () => {
  it('seven headers are clickable and the actions column is not', () => {
    /*
     * The owner's request in one assertion: *"sortable on any column except the button one"*. Counted from the
     * rendered header rather than from a list in the component, because a column can be added to the template
     * without a sort field and nobody notices — the caret is small and its absence looks like a style.
     *
     * The shared header renders the label as a `<button>` only when a sort field is passed, which is what makes
     * "clickable" the thing to count.
     */
    const { el } = render([tok()]);
    const headers = [...el.querySelectorAll('thead th')];
    expect(headers.length, 'eight columns, the last being the actions').toBe(8);
    const sortable = headers.filter(h => h.querySelector('button'));
    expect(sortable.length).toBe(7);
    expect(headers[7]!.querySelector('button'), 'the actions column must not sort').toBeNull();
  });

  it('clicking a header sorts by it, and clicking it again flips the direction', () => {
    // Driven from the DOM: the click has to reach `setSort` through the child's output, which is the half a
    // component-only test cannot see.
    const { fixture, c, el } = render([tok({ id: 'a', name: 'zeta' }), tok({ id: 'b', name: 'Alpha' })]);
    const labelHeader = el.querySelector('thead th button') as HTMLButtonElement;

    labelHeader.click();
    fixture.detectChanges();
    expect(c.sortField()).toBe('label');
    expect(c.sortDir()).toBe('asc');
    expect([...el.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent?.trim())[0])
      .toContain('Alpha');

    labelHeader.click();
    fixture.detectChanges();
    expect(c.sortDir()).toBe('desc');
    expect([...el.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent?.trim())[0])
      .toContain('zeta');
  });

  it('an unsorted page renders the order the server sent', () => {
    /*
     * The default has to be a no-op, or this change would silently reorder a table every operator already
     * knows. `sortField` starts as `''`, which is not a column, and the comparator is never reached.
     */
    const { c, el } = render([tok({ id: 'a', name: 'zeta' }), tok({ id: 'b', name: 'Alpha' })]);
    expect(c.sortField()).toBe('');
    expect([...el.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent?.trim())[0])
      .toContain('zeta');
  });
});

describe('the token table searches label and spaces', () => {
  it('there are exactly two search boxes, docked under those two headers', () => {
    /*
     * Two, because the owner named two: *"label/spaces have to be searchable"*. Asserted by position rather
     * than by count alone — two boxes under the wrong columns would satisfy a count and answer the wrong
     * question.
     */
    const { el } = render([tok()]);
    const headers = [...el.querySelectorAll('thead th')];
    expect(el.querySelectorAll('thead .col-filter-input').length).toBe(2);
    expect(headers[0]!.querySelector('.col-filter-input'), 'label').not.toBeNull();
    expect(headers[5]!.querySelector('.col-filter-input'), 'spaces').not.toBeNull();
  });

  it('typing in the label box narrows the rows', () => {
    const { fixture, el } = render([tok({ id: 'a', name: 'CI runner' }), tok({ id: 'b', name: 'laptop' })]);
    const box = el.querySelector('thead th .col-filter-input') as HTMLInputElement;
    box.value = 'runn';
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const names = [...el.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent ?? '');
    expect(names.length).toBe(1);
    expect(names[0]).toContain('CI runner');
  });

  it('the spaces box matches the badge words, so "all" finds an unrestricted token', () => {
    // The case that would be missed by matching `t.spaces` alone: an unrestricted token has no ids to match and
    // renders "all spaces", so the column would answer every query but the one about the widest rows.
    const { fixture, el } = render([tok({ id: 'a', name: 'wide', spaces: [] }), tok({ id: 'b', name: 'narrow', spaces: ['work'] })]);
    const box = [...el.querySelectorAll('thead .col-filter-input')][1] as HTMLInputElement;
    box.value = 'all';
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const names = [...el.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent ?? '');
    expect(names.length).toBe(1);
    expect(names[0]).toContain('wide');
  });
});

describe('an empty table says which kind of empty it is', () => {
  it('filtered to nothing offers to clear the search, not to create a token', () => {
    /*
     * The two empties mean opposite things and one message cannot serve both. An operator who filters to
     * nothing and reads "you have no tokens yet" would reasonably believe their tokens had been revoked.
     */
    const { fixture, c, el } = render([tok({ name: 'laptop' })]);
    c.labelFilter.set('nothing-matches-this');
    fixture.detectChanges();
    // Counted as "no data row", not as "no first cell" — the empty state IS a row with a first cell, so a
    // naive count of `tbody tr td:first-child` reports one and the assertion would pass on a rendered token.
    expect(el.querySelectorAll('tbody tr td[colspan]').length, 'the empty row replaced the data').toBe(1);
    expect(el.querySelector('tbody')!.textContent, 'and no token survived the filter').not.toContain('laptop');
    const empty = el.querySelector('.empty-state');
    expect(empty, 'an empty state is shown').not.toBeNull();
    expect(empty!.textContent).toContain('tokens.empty.filteredTitle');
    expect(empty!.textContent).not.toContain('tokens.empty.title');
  });

  it('and the empty row spans all eight columns', () => {
    /*
     * It said seven while the table has eight, so the empty state stopped one cell short and the panel had a
     * notch cut out of its right edge. Fixed in passing, and pinned because a colspan is invisible in review
     * and only shows up as a shape.
     */
    const { el } = render([]);
    expect(el.querySelector('tbody td')?.getAttribute('colspan')).toBe('8');
  });
});
