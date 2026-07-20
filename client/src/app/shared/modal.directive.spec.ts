/**
 * U5 — ModalDirective gives a hand-rolled overlay the modal a11y contract by construction, and
 * (centralised here) owns backdrop-click dismissal — off by default so data-entry dialogs never
 * discard input on a stray click, opt-in for read-only/confirm dialogs.
 */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ModalDirective } from './modal.directive';

@Component({
  standalone: true,
  imports: [ModalDirective],
  template: `
    @if (open) {
      <div class="backdrop">
        <div class="panel" [appModal]="label" [appModalCloseOnBackdrop]="closeOnBackdrop" (dismiss)="dismissed = true">
          <button>focus me</button>
        </div>
      </div>
    }
  `,
})
class HostComponent {
  open = true;
  label = 'Test dialog';
  closeOnBackdrop = false;
  dismissed = false;
}

describe('ModalDirective', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  /** Render with the backdrop-close flag decided up front (avoids a mid-lifecycle input change). */
  const render = (closeOnBackdrop = false) => {
    fixture.componentInstance.closeOnBackdrop = closeOnBackdrop;
    fixture.detectChanges();
  };
  const panel = () => fixture.nativeElement.querySelector('.panel') as HTMLElement;
  const backdrop = () => fixture.nativeElement.querySelector('.backdrop') as HTMLElement;

  it('marks the panel as an accessible modal dialog', () => {
    render();
    const el = panel();
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Test dialog');
  });

  it('emits dismiss on Escape', () => {
    render();
    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.dismissed).toBe(true);
  });

  it('does NOT dismiss on a backdrop click by default (data-entry safe)', () => {
    render(false);
    backdrop().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.dismissed).toBe(false);
  });

  it('dismisses on a backdrop click when appModalCloseOnBackdrop is set', () => {
    render(true);
    backdrop().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.dismissed).toBe(true);
  });

  it('never dismisses on a click that originates inside the panel, even with backdrop-close on', () => {
    render(true);
    // A click bubbling up from a button inside the panel must not be treated as a backdrop click.
    (panel().querySelector('button') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.dismissed).toBe(false);
  });

  // Focus capture on open + restore to the opener on destroy is CDK FocusTrap's own (library-tested)
  // behaviour, wired in ngAfterViewInit/ngOnDestroy; jsdom doesn't model focus reliably, so it's
  // covered by manual QA rather than a brittle unit assertion here.
});
