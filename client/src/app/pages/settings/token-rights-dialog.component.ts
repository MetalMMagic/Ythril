import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import { DIALOG_STYLES } from './dialog.styles';
import { FormsModule } from '@angular/forms';
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
  imports: [TranslocoPipe, PhIconComponent, ModalDirective, RightsMatrixComponent, FormsModule],
  styles: [DIALOG_STYLES],
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

        <!-- The label, editable here and nowhere else. This dialog used to edit the rights matrix ALONE, so a
             token's name was write-once: it could be set while minting and never corrected afterwards, even
             though PATCH has always accepted it. The two travel in one request, so a rename and a rights
             change are one audited edit rather than two that can half-fail. -->
        <div class="field" style="margin-bottom:14px;">
          <label for="tokenLabel">{{ 'tokens.create.label' | transloco }}</label>
          <input id="tokenLabel" type="text" [(ngModel)]="draftName" name="name"
                 [placeholder]="'tokens.create.labelPlaceholder' | transloco" maxlength="200" />
        </div>

        <label style="display:block;margin-bottom:6px;">{{ 'tokens.create.permission' | transloco }}</label>
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
  /** Same reasoning for the label: prefilled, so saving without touching it is not a rename to empty. */
  draftName = '';

  spaceIds = () => this.availableSpaces().map(s => s.id);

  ngOnInit(): void {
    const r = this.token().rights;
    if (r) this.draft.set({ ...r } as TokenRights);
    this.draftName = this.token().name;
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    // The name goes only when it actually changed. Sending it unchanged would work — PATCH accepts it — but
    // it would write a `token.update` audit entry claiming a rename that did not happen.
    const trimmed = this.draftName.trim();
    const renamed = trimmed && trimmed !== this.token().name;
    this.authApi.updateToken(this.token().id, {
      rights: this.draft(),
      ...(renamed ? { name: trimmed } : {}),
    }).subscribe({
      next: ({ token }) => { this.saving.set(false); this.saved.emit(token); },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? this.transloco.translate('tokens.error.rightsFailed'));
      },
    });
  }
}
