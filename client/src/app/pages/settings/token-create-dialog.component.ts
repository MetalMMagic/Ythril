import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthApi } from '../../core/auth-api.service';
import { RightsMatrixComponent } from './rights-matrix.component';
import type { TokenRights } from './rights-glyph.component';
import type { Space, TokenRecord } from '../../core/api.types';

/**
 * The create-token dialog.
 *
 * ## Why it is its own component
 *
 * It was over a quarter of `tokens.component.ts` and pushed that file past the god-file ceiling. It is also
 * a self-contained flow: thirteen pieces of state that exist only while the dialog is open, and one decision
 * — legacy permission fields or the per-space matrix — that the rest of the page has no opinion about.
 *
 * ## The contract this must not change
 *
 * The REQUEST BODY. It is what the server's mint cap and the audit log see, and
 * `tokens.component.spec.ts` characterizes it: legacy fields and `rights` are mutually exclusive, `mfa` is
 * omitted when `inherit`, `spaces` only when some are selected. Those tests were written and proven green
 * against the pre-extraction code precisely so this move could be judged by them rather than by the diff.
 */
@Component({
  selector: 'app-token-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, RightsMatrixComponent],
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

            <div class="field" style="margin-top:12px; margin-bottom:0;">
              <label>{{ 'tokens.create.spaces' | transloco }}</label>
              @if (spacesLoadFailed()) {
                <div class="alert alert-error" style="margin-bottom:6px; font-size:12px;">{{ 'tokens.create.spacesLoadFailed' | transloco }}</div>
                <input type="text" [(ngModel)]="newSpacesFallback" name="spaces" [placeholder]="'tokens.create.spacesFallbackPlaceholder' | transloco" />
              } @else if (availableSpaces().length === 0) {
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">{{ 'tokens.create.loadingSpaces' | transloco }}</div>
              } @else {
                <div class="table-wrapper" hscrollTop style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm);">
                  <table style="margin:0;">
                    <thead>
                      <tr>
                        <th style="width:40px; text-align:center;">
                          <input type="checkbox" [checked]="newSelectedSpaces.length === 0" (change)="selectAllSpaces()" [attr.title]="'tokens.create.allSpacesTitle' | transloco" />
                        </th>
                        <th>{{ 'auditLog.filter.space' | transloco }} <span style="font-size:10px; color:var(--text-muted); font-weight:400;">— {{ 'tokens.create.spacesCheckNoneHint' | transloco }}</span></th>
                        <th>{{ 'spaces.table.column.id' | transloco }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of availableSpaces(); track s.id) {
                        <tr style="cursor:pointer;" (click)="toggleSpace(s.id)">
                          <td style="text-align:center;">
                            <input type="checkbox" [checked]="isSpaceSelected(s.id)" (click)="$event.stopPropagation()" (change)="toggleSpace(s.id)" />
                          </td>
                          <td>{{ s.label }}</td>
                          <td><span class="badge badge-gray mono">{{ s.id }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              <div class="scope-hint">{{ 'tokens.create.spacesHint' | transloco }}</div>
            </div>

            <!-- Second factor, per token. The instance-wide switch is all-or-nothing, which is what makes
                 MFA mutually exclusive with automation — a scheduler cannot type a code. Inherit is the
                 default and means exactly what it means today. -->
            <div class="field" style="margin-top:12px; margin-bottom:0;">
              <label for="tokenMfa">{{ 'tokens.create.mfa' | transloco }}</label>
              <select id="tokenMfa" [(ngModel)]="newMfa" name="mfa">
                <option value="inherit">{{ 'tokens.mfa.inherit' | transloco }}</option>
                <option value="exempt">{{ 'tokens.mfa.exempt' | transloco }}</option>
                <option value="required">{{ 'tokens.mfa.required' | transloco }}</option>
              </select>
              <p class="permission-help">
                <ph-icon name="info" [size]="14" />
                <span>{{ ('tokens.mfa.' + newMfa + '.desc') | transloco }}</span>
              </p>
            </div>

            <div class="field" style="margin-top:12px; margin-bottom:0;">
              <label>{{ 'tokens.create.permission' | transloco }}</label>
              <div class="permission-radio-group">
                <label class="permission-radio-item">
                  <input type="radio" name="permission" value="readOnly" [(ngModel)]="newPermission" />
                  {{ 'tokens.permission.readOnly' | transloco }}
                </label>
                <label class="permission-radio-item">
                  <input type="radio" name="permission" value="standard" [(ngModel)]="newPermission" />
                  {{ 'tokens.permission.standard' | transloco }}
                </label>
                @if (callerIsAdmin()) {
                  <label class="permission-radio-item">
                    <input type="radio" name="permission" value="admin" [(ngModel)]="newPermission" />
                    {{ 'tokens.permission.admin' | transloco }}
                  </label>
                }
              </div>
              <p class="permission-help">
                <ph-icon name="info" [size]="14" />
                <span>{{ ('tokens.permission.' + newPermission + '.desc') | transloco }}</span>
              </p>
            </div>

            <!-- The per-space matrix, shown only when the operator asks for it. Collapsed by default because
                 the legacy permission control above already answers the common case, and the two are
                 mutually exclusive on the wire: the server refuses a body carrying both rather than
                 silently preferring one. Opening this is therefore a deliberate switch, not an extra. -->
            <div style="margin-top:14px;">
              <button class="btn-secondary btn btn-sm" type="button" (click)="useMatrix.set(!useMatrix())">
                {{ useMatrix() ? ('tokens.matrix.hide' | transloco) : ('tokens.matrix.show' | transloco) }}
              </button>
              @if (useMatrix()) {
                <p class="permission-help" style="margin-top:8px;">
                  <ph-icon name="info" [size]="14" />
                  <span>{{ 'tokens.matrix.help' | transloco }}</span>
                </p>
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
  /** Whether the CALLER is an admin — only an admin may offer the admin permission. Passed in rather than
   *  re-fetched: two components asking `getMe()` is two answers that can disagree mid-dialog. */
  callerIsAdmin = input(false);
  close = output<void>();
  created = output<{ token: TokenRecord; plaintext: string }>();

  creating = signal(false);
  createError = signal('');
  /** Just the ids: the matrix keys rows by id and does not need the rest of a space. */
  spaceIds = computed(() => this.availableSpaces().map(s => s.id));
  useMatrix = signal(false);
  draftRights = signal<TokenRights>({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} });
  newName = '';
  newExpiry = '';
  newPermission: 'readOnly' | 'standard' | 'admin' = 'standard';
  newMfa: 'inherit' | 'exempt' | 'required' = 'inherit';
  newSelectedSpaces: string[] = [];
  newSpacesFallback = '';

  /** Empty selection means "all spaces" in this form, matching what the server does with an absent list. */
  selectAllSpaces(): void { this.newSelectedSpaces = []; }

  isSpaceSelected(id: string): boolean { return this.newSelectedSpaces.includes(id); }

  toggleSpace(id: string): void {
    this.newSelectedSpaces = this.isSpaceSelected(id)
      ? this.newSelectedSpaces.filter(s => s !== id)
      : [...this.newSelectedSpaces, id];
  }

  createToken(): void {
    if (!this.newName.trim()) return;
    this.creating.set(true);
    this.createError.set('');

    const body: {
      name: string; expiresAt?: string; admin?: boolean; readOnly?: boolean; spaces?: string[];
      mfa?: 'exempt' | 'required'; rights?: TokenRights;
    } = { name: this.newName.trim() };
    // Sent only when it says something — `inherit` is the absent state on the server too.
    if (this.newMfa !== 'inherit') body.mfa = this.newMfa;
    if (this.newExpiry) body.expiresAt = new Date(this.newExpiry).toISOString();

    if (this.useMatrix()) {
      // EITHER the matrix OR the legacy fields, never both. The server refuses a body carrying both rather
      // than silently preferring one, so sending the permission radio alongside would turn a deliberate
      // choice into a 400 the operator did not make.
      body.rights = this.draftRights();
    } else {
      if (this.newPermission === 'admin') body.admin = true;
      if (this.newPermission === 'readOnly') body.readOnly = true;

      let spaceIds: string[];
      if (this.spacesLoadFailed()) {
        spaceIds = this.newSpacesFallback.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        spaceIds = [...this.newSelectedSpaces];
      }
      if (spaceIds.length) body.spaces = spaceIds;
    }

    this.authApi.createToken(body).subscribe({
      next: ({ token, plaintext }) => {
        this.creating.set(false);
        this.close.emit();
        this.created.emit({ token, plaintext });
        this.newName = '';
        this.newExpiry = '';
        this.newPermission = 'standard';
        this.newSelectedSpaces = [];
        this.newSpacesFallback = '';
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err.error?.error ?? this.transloco.translate('tokens.error.createFailed'));
      },
    });
  }
}
