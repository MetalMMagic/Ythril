/**
 * U5 — ModalDirective gives a hand-rolled overlay the modal a11y contract by construction.
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
      <div class="panel" [appModal]="label" (dismiss)="dismissed = true">
        <button>focus me</button>
      </div>
    }
  `,
})
class HostComponent {
  open = true;
  label = 'Test dialog';
  dismissed = false;
}

describe('ModalDirective', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  const panel = () => fixture.nativeElement.querySelector('.panel') as HTMLElement;

  it('marks the panel as an accessible modal dialog', () => {
    const el = panel();
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Test dialog');
  });

  it('emits dismiss on Escape', () => {
    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.dismissed).toBe(true);
  });

  // Focus capture on open + restore to the opener on destroy is CDK FocusTrap's own (library-tested)
  // behaviour, wired in ngAfterViewInit/ngOnDestroy; jsdom doesn't model focus reliably, so it's
  // covered by manual QA rather than a brittle unit assertion here.
});
