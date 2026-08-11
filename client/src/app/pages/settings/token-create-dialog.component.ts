import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import { DIALOG_STYLES } from './dialog.styles';
import type { TokenRights } from './rights-glyph.component';
import type { Space, TokenRecord } from '../../core/api.types';

/**
 * The create-token dialog: a label, an optional expiry, and the rights matrix.
 *
 * ## Why it is its own component
 *
 * It was over a quarter of `tokens.component.ts` and pushed that file past the god-file ceiling.
 *
 * That extraction also produced the bug this file's styles now fix. `.dialog-backdrop` and `.dialog` were
 * defined in `tokens.component.ts`, and Angular scopes component styles — so moving the markup out left the
 * CSS behind and the "dialog" rendered as a plain full-width block at the top of the page, no backdrop, no
 * centring, pushing the token list down. Nothing failed: it compiled, it rendered, the tests passed, and it
 * was simply wrong to look at. The shell now comes from `DIALOG_STYLES`, which a move cannot leave behind.
 *
 * ## Why three controls became one
 *
 * The form used to carry a spaces checkbox list, a three-way permission radio (read-only / standard / admin)
 * AND the matrix behind a "Use the per-space matrix" button. Those are two vocabularies for one decision, and
 * the server treats them as **mutually exclusive** — so the form could compose a body the API refuses, and
 * the operator would read that 400 as a bug rather than as a choice they had made.
 *
 * The matrix expresses everything the radio and the checkbox list expressed, and things they could not
 * (admin on Files in one space and nothing anywhere else). So they are gone, not kept beside it.
 *
 * The second-factor selector is gone from CREATE for a different reason: MFA is a property of the token, set
 * on the token, not a decision folded into minting it.
 *
 * ## The contract this must not change
 *
 * The REQUEST BODY. It is what the server's mint cap and the audit log see, and `tokens.component.spec.ts`
 * characterizes it. Those tests were rewritten with this change rather than around it: the body is now always
 * `{ name, rights }` plus an optional `expiresAt`, and never the legacy trio.
 */
@Component({
  selector: 'app-token-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, RightsMatrixComponent],
  styles: [DIALOG_STYLES],
  template: `
      <div class="dialog-backdrop">
        <div class="dialog" [appModal]="'tokens.create.title' | transloco" (dismiss)="close.emit()" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div class="card-title">{{ 'tokens.create.title' | transloco }}</div>
            <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()"><ph-icon name="x" [size]="14"/></button>
          </div>

          @if (createError()) {
            <div class="alert alert-error" style="margin-bottom:16px;">{{ createError() }}</div>
          }

          <form (ngSubmit)="createToken()" #f="ngForm">
            <div class="form-grid">
              <div class="field" style="margin-bottom:0;">
                <label>{{ 'tokens.create.label' | transloco }}</label>
                <input type="text" [(ngModel)]="newName" name="name" [placeholder]="'tokens.create.labelPlaceholder' | transloco" maxlength="200" required />
              </div>
              <div class="field" style="margin-bottom:0;">
                <label>{{ 'tokens.create.expires' | transloco }}</label>
                <input type="date" class="styled-input" [(ngModel)]="newExpiry" name="expiry" />
              </div>
            </div>

            <!-- The per-space matrix, and it is the whole permission model now.
                 It used to sit behind a "Use the per-space matrix" button, below a spaces checkbox list and a
                 three-way permission radio that described the SAME access in the pre-2.6.0 vocabulary. Three
                 controls for one decision, two of which the server treats as mutually exclusive with the
                 third — so the form could express bodies the API refuses. The matrix says everything they
                 said and things they could not (admin on Files in one space and nothing anywhere else), so
                 they are gone rather than kept beside it. -->
            <div class="field" style="margin-top:14px; margin-bottom:0;">
              <label>{{ 'tokens.create.permission' | transloco }}</label>
              <p class="permission-help">
                <ph-icon name="info" [size]="14" />
                <span>{{ 'tokens.matrix.help' | transloco }}</span>
              </p>
              @if (spacesLoadFailed()) {
                <div class="alert alert-error" style="margin-top:6px; font-size:12px;">{{ 'tokens.create.spacesLoadFailed' | transloco }}</div>
              } @else if (availableSpaces().length === 0) {
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">{{ 'tokens.create.loadingSpaces' | transloco }}</div>
              } @else {
                <app-rights-matrix
                  [rights]="draftRights()"
                  [spaces]="spaceIds()"
                  (changed)="draftRights.set($event)"/>
              }
            </div>

            <div class="form-grid-bottom" style="margin-top:12px;">
              <button class="btn-secondary btn" type="button" (click)="close.emit()">{{ 'common.cancel' | transloco }}</button>
              <button class="btn-primary btn" type="submit" style="margin-left:auto;" [disabled]="creating() || !newName.trim()">
                @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'tokens.create.submitButton' | transloco }}
              </button>
            </div>
          </form>
        </div>
      </div>
  `,
})
export class TokenCreateDialogComponent {
  private authApi = inject(AuthApi);
  private transloco = inject(TranslocoService);

  availableSpaces = input<Space[]>([]);
  spacesLoadFailed = input(false);
  close = output<void>();
  created = output<{ token: TokenRecord; plaintext: string }>();

  creating = signal(false);
  createError = signal('');
  /** Just the ids: the matrix keys rows by id and does not need the rest of a space. */
  spaceIds = computed(() => this.availableSpaces().map(s => s.id));
  draftRights = signal<TokenRights>({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} });
  newName = '';
  newExpiry = '';

  createToken(): void {
    if (!this.newName.trim()) return;
    this.creating.set(true);
    this.createError.set('');

    // ONE description of access, always the matrix. The legacy `spaces`/`admin`/`readOnly` trio is mutually
    // exclusive with `rights` on the server, so a form offering both could compose a body the API refuses —
    // and the operator would read that 400 as a bug rather than as a choice they had made.
    const body: { name: string; expiresAt?: string; rights: TokenRights } = {
      name: this.newName.trim(),
      rights: this.draftRights(),
    };
    if (this.newExpiry) body.expiresAt = new Date(this.newExpiry).toISOString();

    this.authApi.createToken(body).subscribe({
      next: ({ token, plaintext }) => {
        this.creating.set(false);
        this.close.emit();
        this.created.emit({ token, plaintext });
        this.newName = '';
        this.newExpiry = '';
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err.error?.error ?? this.transloco.translate('tokens.error.createFailed'));
      },
    });
  }
}
