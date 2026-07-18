import {
  AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, inject,
} from '@angular/core';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';

/**
 * Makes a hand-rolled overlay panel an accessible modal dialog, in one attribute (U5).
 *
 * Applied to the dialog *panel* element (the box, not the backdrop), it supplies — by construction —
 * `role="dialog"`, `aria-modal="true"`, an `aria-label`, a CDK focus trap that captures focus on open
 * and restores it to the opener on close, and Escape-to-dismiss. This is the content-dialog counterpart
 * to the CDK confirm-dialog wrapper (U1) and the same behaviour the shell's mobile drawer already uses.
 *
 * Usage: `<div class="dialog" [appModal]="'x.title' | transloco" (dismiss)="close()"
 *              (click)="$event.stopPropagation()"> … </div>`
 * — `dismiss` fires on Escape; wire it to that overlay's own close action.
 */
@Directive({
  selector: '[appModal]',
  standalone: true,
  host: {
    'role': 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': 'appModal || null',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class ModalDirective implements AfterViewInit, OnDestroy {
  /** aria-label text for the dialog (already translated by the caller). */
  @Input('appModal') appModal?: string;
  /** Emitted when the user presses Escape while focus is inside the dialog. */
  @Output() dismiss = new EventEmitter<void>();

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private trapFactory = inject(FocusTrapFactory);
  private trap?: FocusTrap;
  private previouslyFocused: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.trap = this.trapFactory.create(this.el.nativeElement);
    // Focuses [cdkFocusInitial] if present, else the first tabbable element.
    this.trap.focusInitialElementWhenReady();
  }

  ngOnDestroy(): void {
    this.trap?.destroy();
    // Restore focus to whatever opened the dialog so keyboard users aren't dumped at the top.
    this.previouslyFocused?.focus?.();
  }

  onEscape(e: Event): void {
    e.stopPropagation();
    this.dismiss.emit();
  }
}
