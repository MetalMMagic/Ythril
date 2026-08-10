import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import type { TokenRights } from './rights-glyph.component';
import type { Space, TokenRecord } from '../../core/api.types';

/**
 * Edit an existing token's rights.
 *
 * ## Why the server's refusals are surfaced verbatim
 *
 * Two guards can reject this save, and both are decisions the operator needs the reason for:
 *
 *  - **the cap** — a token may not grant rights it does not hold, and the 403 names every level that was
 *    over the line;
 *  - **the floor** — a token may not raise its OWN floor, and the 403 names the areas that would have gone
 *    up.
 *
 * Replacing either with a generic "could not save" would leave the operator guessing between "I asked for
 * too much" and "I am not allowed to do this to myself", which are different problems with different next
 * steps. So the message is shown as it arrives.
 *
 * ## Why the draft starts from what the token has
 *
 * Starting from an empty matrix would make every save a silent narrowing of everything the operator did not
 * happen to re-enter.
 */
@Component({
  selector: 'app-token-rights-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent, ModalDirective, RightsMatrixComponent],
  template: `
    <div class="dialog-backdrop">
      <div class="dialog" [appModal]="'tokens.rights.title' | transloco"
           (dismiss)="close.emit()" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ 'tokens.rights.title' | transloco }} — {{ token().name }}</h3>
          <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()">
            <ph-icon name="x" [size]="14"/>
          </button>
        </div>

        @if (error()) {
          <!-- Verbatim: the server names the areas or levels that were refused, and a generic message would
               leave the operator guessing which of the two guards fired. -->
          <p class="form-error" role="alert" style="white-space:pre-wrap;">{{ error() }}</p>
        }

        <app-rights-matrix [rights]="draft()" [spaces]="spaceIds()" (changed)="draft.set($event)"/>

        <div class="form-grid-bottom" style="margin-top:12px;">
          <button class="btn-secondary btn" type="button" (click)="close.emit()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button class="btn-primary btn" type="button" style="margin-left:auto;"
                  [disabled]="saving()" (click)="save()">
            {{ 'common.save' | transloco }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class TokenRightsDialogComponent {
  private authApi = inject(AuthApi);
  private transloco = inject(TranslocoService);

  token = input.required<TokenRecord>();
  availableSpaces = input<Space[]>([]);
  close = output<void>();
  saved = output<TokenRecord>();

  saving = signal(false);
  error = signal('');

  /** Starts from what the token HAS — an empty start would make every save narrow everything not re-entered. */
  draft = signal<TokenRights>({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} });

  spaceIds = () => this.availableSpaces().map(s => s.id);

  ngOnInit(): void {
    const r = this.token().rights;
    if (r) this.draft.set({ ...r } as TokenRights);
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    this.authApi.setTokenRights(this.token().id, this.draft()).subscribe({
      next: ({ token }) => { this.saving.set(false); this.saved.emit(token); },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? this.transloco.translate('tokens.error.rightsFailed'));
      },
    });
  }
}
