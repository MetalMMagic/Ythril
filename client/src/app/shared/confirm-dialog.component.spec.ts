import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { getTranslocoModule } from '../testing/transloco-testing';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

function setup(data: ConfirmDialogData) {
  const close = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ConfirmDialogComponent, getTranslocoModule()],
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: { close } },
    ],
  });
  const fixture = TestBed.createComponent(ConfirmDialogComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, close };
}

describe('ConfirmDialogComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders the title and message', () => {
    const { fixture } = setup({ title: 'Delete space', message: 'Are you sure?' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#confirm-title')?.textContent).toContain('Delete space');
    expect(el.querySelector('.message')?.textContent).toContain('Are you sure?');
  });

  it('plain confirm can be confirmed immediately', () => {
    const { cmp, close } = setup({ title: 't', message: 'm' });
    expect(cmp.canConfirm()).toBe(true);
    cmp.confirm();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('cancel closes with false', () => {
    const { cmp, close } = setup({ title: 't', message: 'm' });
    cmp.cancel();
    expect(close).toHaveBeenCalledWith(false);
  });

  it('type-to-confirm gates the confirm button until the exact text is typed', () => {
    const { cmp, close } = setup({ title: 't', message: 'm', requireText: 'my-space' });
    expect(cmp.canConfirm()).toBe(false);

    cmp.typed.set('my-spac');
    expect(cmp.canConfirm()).toBe(false);
    cmp.confirm();
    expect(close).not.toHaveBeenCalled(); // must not close while gated

    cmp.typed.set('my-space');
    expect(cmp.canConfirm()).toBe(true);
    cmp.confirm();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('type-to-confirm ignores surrounding whitespace', () => {
    const { cmp } = setup({ title: 't', message: 'm', requireText: 'abc' });
    cmp.typed.set('  abc  ');
    expect(cmp.canConfirm()).toBe(true);
  });

  it('Enter confirms only when the gate is satisfied', () => {
    const { cmp, close } = setup({ title: 't', message: 'm', requireText: 'x' });
    cmp.onEnter();
    expect(close).not.toHaveBeenCalled();
    cmp.typed.set('x');
    cmp.onEnter();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('renders the type-to-confirm input only when requireText is set', () => {
    const plain = setup({ title: 't', message: 'm' });
    expect((plain.fixture.nativeElement as HTMLElement).querySelector('#confirm-challenge')).toBeNull();

    const gated = setup({ title: 't', message: 'm', requireText: 'id' });
    expect((gated.fixture.nativeElement as HTMLElement).querySelector('#confirm-challenge')).toBeTruthy();
  });
});
