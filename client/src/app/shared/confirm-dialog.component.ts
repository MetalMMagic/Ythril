/**
 * Confirm dialog — a themed replacement for native `confirm()`, opened through
 * the CDK `Dialog` service. Building on CDK gives focus-trap, `role="dialog"`,
 * `aria-modal`, Escape-to-close and focus restore **by construction** (U5), so
 * every confirmation is keyboard- and screen-reader-safe without per-site work.
 *
 * Two consequence tiers:
 *  - plain confirm (reversible actions): Cancel / Confirm.
 *  - type-to-confirm (irreversible actions — wipe/delete space, restore backup,
 *    migrate DB): the confirm button stays disabled until the operator types an
 *    exact challenge string (e.g. the space id), the GitHub-style ritual (C3).
 *
 * Open via ConfirmDialogService, not directly.
 */
import { Component, ElementRef, inject, signal, viewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

export interface ConfirmDialogData {
  /** Dialog heading. */
  title: string;
  /** Body text (plain string; already localised by the caller). */
  message: string;
  /** Confirm button label. Defaults to common.confirm. */
  confirmLabel?: string;
  /** Cancel button label. Defaults to common.cancel. */
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  danger?: boolean;
  /**
   * When set, the confirm button is disabled until the user types this exact
   * string. Use for irreversible actions (the type-the-id gate).
   */
  requireText?: string;
  /** Label shown above the type-to-confirm input (e.g. "Type the space id"). */
  requireTextLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  styles: [`
    .dialog {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      width: 100%; max-width: 440px;
      box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.25));
    }
    h2 { margin: 0 0 0.6rem; font-size: 1.1rem; color: var(--text-primary); }
    .message { margin: 0 0 1.1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; }
    .confirm-label { display: block; margin: 0 0 0.4rem; font-size: 0.82rem; color: var(--text-muted); }
    input {
      width: 100%; padding: 0.55rem 0.75rem; margin-bottom: 1.1rem;
      border: 1px solid var(--border); border-radius: 6px;
      background: var(--bg-primary); color: var(--text-primary);
      font-family: var(--font-mono, monospace); font-size: 0.9rem;
      box-sizing: border-box;
    }
    input:focus { outline: none; border-color: var(--accent); }
    .actions { display: flex; gap: 10px; justify-content: flex-end; }
    .btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  template: `
    <div class="dialog" role="document">
      <h2 id="confirm-title">{{ data.title }}</h2>
      <p class="message">{{ data.message }}</p>

      @if (data.requireText) {
        <label class="confirm-label" for="confirm-challenge">
          {{ data.requireTextLabel || ('common.typeToConfirm' | transloco: { text: data.requireText }) }}
        </label>
        <input
          #challenge
          id="confirm-challenge"
          type="text"
          autocomplete="off"
          spellcheck="false"
          [(ngModel)]="typed"
          (keyup.enter)="onEnter()"
        />
      }

      <div class="actions">
        <button type="button" class="btn btn-secondary btn-sm" (click)="cancel()">
          {{ data.cancelLabel || ('common.cancel' | transloco) }}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          [class.btn-danger]="data.danger"
          [class.btn-primary]="!data.danger"
          [disabled]="!canConfirm()"
          (click)="confirm()"
        >
          {{ data.confirmLabel || ('common.confirm' | transloco) }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent implements AfterViewInit {
  readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  private ref = inject<DialogRef<boolean>>(DialogRef);

  private challengeInput = viewChild<ElementRef<HTMLInputElement>>('challenge');

  typed = signal('');

  ngAfterViewInit(): void {
    // Focus the challenge input for the type-to-confirm tier so the operator
    // lands where the action requires input; plain confirms keep CDK's default
    // focus (the first tabbable — the Cancel button, the safe default).
    this.challengeInput()?.nativeElement.focus();
  }

  canConfirm(): boolean {
    if (!this.data.requireText) return true;
    return this.typed().trim() === this.data.requireText;
  }

  onEnter(): void {
    if (this.canConfirm()) this.confirm();
  }

  confirm(): void {
    if (this.canConfirm()) this.ref.close(true);
  }

  cancel(): void {
    this.ref.close(false);
  }
}
