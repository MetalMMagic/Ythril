import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Space, TokenRecord } from '../../core/api.types';
import { AuthApi } from '../../core/auth-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { computed } from '@angular/core';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SummaryStripComponent, SummaryItem } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { RightsGlyphComponent, type TokenRights } from './rights-glyph.component';
import { TokenCreateDialogComponent } from './token-create-dialog.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';

@Component({
  selector: 'app-tokens',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective,
            SummaryStripComponent, StatusPillComponent, RelativeTimeComponent, HscrollTopDirective,
            ErrorStateComponent, RightsGlyphComponent, TokenCreateDialogComponent],
  styles: [`
    .new-token-banner {
      background: var(--success-dim);
      border: 2px solid color-mix(in srgb, var(--success) 50%, transparent);
      border-radius: var(--radius-md);
      padding: 20px;
      margin-bottom: 20px;
    }
    .new-token-banner-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--success);
      margin-bottom: 4px;
    }
    .new-token-banner-warn {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    .token-copy-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
    }
    .token-copy-value {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 13px;
      word-break: break-all;
      color: var(--text-primary);
    }
    .btn-copy-prominent {
      background: var(--success);
      color: var(--text-on-accent);
      border: none;
      border-radius: var(--radius-sm);
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity var(--transition);
    }
    .btn-copy-prominent:hover { opacity: 0.88; }
    .scope-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 3px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 160px;
      gap: 12px;
      align-items: start;
    }
    .form-grid-bottom {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 6px;
    }
    .checkbox-field label {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
      text-transform: none;
      letter-spacing: 0;
      font-weight: 400;
    }
    .spaces-toggle-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .space-toggle-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
      background: var(--bg-surface);
      transition: background var(--transition), border-color var(--transition);
      user-select: none;
    }
    .space-toggle-item:hover { background: var(--bg-elevated); }
    .space-toggle-item input[type=checkbox] { width: 13px; height: 13px; margin: 0; flex-shrink: 0; }
    .space-toggle-item .space-id { color: var(--text-muted); font-size: 11px; font-family: var(--font-mono); }
    .permission-radio-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .permission-radio-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      background: var(--bg-surface);
      transition: background var(--transition), border-color var(--transition);
      user-select: none;
    }
    .permission-radio-item:hover { background: var(--bg-elevated); }
    .permission-radio-item input[type=radio] { width: 14px; height: 14px; margin: 0; flex-shrink: 0; }
    .permission-help {
      display: flex; align-items: flex-start; gap: 7px; margin: 8px 0 0;
      font-size: 12px; line-height: 1.45; color: var(--text-secondary);
    }
    .permission-help ph-icon { color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }
    .capability-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 10px;
      color: var(--text-secondary);
    }
    .capability-table th {
      text-align: center;
      font-weight: 600;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-muted);
      white-space: nowrap;
    }
    .capability-table th:first-child { text-align: left; }
    .capability-table td {
      text-align: center;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-muted);
    }
    .capability-table td:first-child { text-align: left; font-weight: 500; color: var(--text-primary); }
    .capability-table tr.active-row { background: var(--bg-elevated); }
    .cap-yes { color: var(--success); }
    .cap-no  { color: var(--text-muted); }
    .token-status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
      flex-shrink: 0;
    }
    .dot-active { background: var(--success); }
    .dot-expired { background: var(--error); }
    .styled-input {
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-surface);
      color: var(--text-primary);
      font-family: var(--font);
    }
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: var(--bg-scrim);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .dialog {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
  `],
  template: `
    <!-- New token success banner -->
    @if (newToken()) {
      <div class="new-token-banner" role="alert">
        <div class="new-token-banner-title">{{ 'tokens.created.title' | transloco }}</div>
        <div class="new-token-banner-warn">{{ 'tokens.created.warning' | transloco }}</div>
        <div class="token-copy-row">
          <span class="token-copy-value" [attr.aria-label]="'tokens.created.newTokenValueAria' | transloco">{{ newToken() }}</span>
          <button class="btn-copy-prominent" [attr.aria-label]="'tokens.created.copyNewAria' | transloco" (click)="copyNew()">
            @if (copied()) { {{ 'common.copied' | transloco }} } @else { {{ 'tokens.created.copyButton' | transloco }} }
          </button>
        </div>
        <button class="btn-secondary btn btn-sm" style="margin-top:12px;" (click)="clearNew()">{{ 'tokens.created.dismissButton' | transloco }}</button>
      </div>
    }

    <!-- Rotated token banner -->
    @if (regenToken()) {
      <div class="new-token-banner" role="alert">
        <div class="new-token-banner-title">{{ 'tokens.rotated.title' | transloco }}</div>
        <div class="new-token-banner-warn">{{ 'tokens.rotated.warning' | transloco }}</div>
        <div class="token-copy-row">
          <span class="token-copy-value" [attr.aria-label]="'tokens.rotated.tokenValueAria' | transloco">{{ regenToken() }}</span>
          <button class="btn-copy-prominent" [attr.aria-label]="'tokens.rotated.copyAria' | transloco" (click)="copyRegen()">
            @if (copiedRegen()) { {{ 'common.copied' | transloco }} } @else { {{ 'tokens.created.copyButton' | transloco }} }
          </button>
        </div>
        <button class="btn-secondary btn btn-sm" style="margin-top:12px;" (click)="clearRegen()">{{ 'tokens.created.dismissButton' | transloco }}</button>
      </div>
    }

    <!-- The create dialog lives in TokenCreateDialogComponent. It was over a quarter of this file and
         is a self-contained flow with thirteen pieces of its own state; leaving it here is what kept
         this component over the god-file ceiling. -->
    @if (showCreateDialog()) {
      <app-token-create-dialog
        [availableSpaces]="availableSpaces()"
        [spacesLoadFailed]="spacesLoadFailed()"
        [callerIsAdmin]="!!selfToken()?.admin"
        (close)="showCreateDialog.set(false)"
        (created)="onTokenCreated($event)"/>
    }

    <!-- Operator summary -->
    @if (!loading() && tokens().length) {
      <app-summary-strip [heading]="'tokens.list.title' | transloco" [items]="summary()" style="display:block;margin-bottom:16px;"/>
    }

    <!-- Token list -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">{{ 'tokens.list.title' | transloco }}</div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'tokens.list.createButton' | transloco }}</button>
          <button class="btn-secondary btn btn-sm" (click)="load()">{{ 'tokens.list.refreshButton' | transloco }}</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (loadError() !== null) {
        <app-error-state [message]="'tokens.loadError' | transloco" [reason]="loadError() ?? ''" (retry)="load()" />
      } @else {
        <div class="table-wrapper" hscrollTop>
          <table>
            <thead>
              <tr>
                <th>{{ 'tokens.table.label' | transloco }}</th><th>{{ 'tokens.table.permission' | transloco }}</th><th>{{ 'tokens.table.created' | transloco }}</th><th>{{ 'tokens.table.lastUsed' | transloco }}</th><th>{{ 'tokens.table.expires' | transloco }}</th><th>{{ 'tokens.table.spaces' | transloco }}</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (t of tokens(); track t.id) {
                <tr>
                  <td style="font-weight:500;">
                    @if (editingId() === t.id) {
                      <span style="display:inline-flex;align-items:center;gap:6px;">
                        <input type="text" [(ngModel)]="editLabelValue" maxlength="200" style="width:190px;"
                          [attr.aria-label]="'tokens.action.editLabelAriaLabel' | transloco"
                          (keydown.enter)="saveLabel(t)" (keydown.escape)="cancelEditLabel()" />
                        <button class="icon-btn" [attr.title]="'common.save' | transloco" [attr.aria-label]="'common.save' | transloco"
                          (click)="saveLabel(t)" [disabled]="!editLabelValue.trim()"><ph-icon name="check" [size]="14"/></button>
                        <button class="icon-btn" [attr.title]="'common.cancel' | transloco" [attr.aria-label]="'common.cancel' | transloco"
                          (click)="cancelEditLabel()"><ph-icon name="x" [size]="14"/></button>
                      </span>
                    } @else {
                      <span class="token-status-dot" [class.dot-active]="!isExpired(t)" [class.dot-expired]="isExpired(t)"></span>
                      {{ t.name }}
                      <button class="icon-btn" style="margin-left:4px;" [attr.title]="'tokens.action.editLabelTitle' | transloco"
                        [attr.aria-label]="'tokens.action.editLabelAriaLabel' | transloco" (click)="startEditLabel(t)"><ph-icon name="pencil-simple" [size]="13"/></button>
                      @if (t.id === selfToken()?.id) { <span style="margin-left:6px;font-size:0.75rem;color:var(--text-muted);">{{ 'tokens.table.currentSession' | transloco }}</span> }
                    }
                  </td>
                  <td>
                    @if (t.admin) { <app-status-pill variant="error">{{ 'tokens.badge.admin' | transloco }}</app-status-pill> }
                    @else if (t.schemaLibrary) { <app-status-pill variant="pending">{{ 'tokens.badge.schemaLibrary' | transloco }}</app-status-pill> }
                    @else if (t.readOnly) { <app-status-pill variant="warn">{{ 'tokens.badge.readOnly' | transloco }}</app-status-pill> }
                    @else { <app-status-pill variant="ok">{{ 'tokens.badge.standard' | transloco }}</app-status-pill> }
                    <!-- An MFA exemption is a deliberate hole in an instance-wide control. It is shown
                         wherever the token is, because a hole nobody can see is one nobody reviews. -->
                    @if (t.mfa === 'exempt') { <app-status-pill variant="warn">{{ 'tokens.badge.mfaExempt' | transloco }}</app-status-pill> }
                    @else if (t.mfa === 'required') { <app-status-pill variant="pending">{{ 'tokens.badge.mfaRequired' | transloco }}</app-status-pill> }
                    <!-- The badges above say what KIND of token this is. The glyph says what it can reach:
                         one bar per area, height for the ceiling, a red line for the floor. A badge cannot
                         express "admin on Files in one space and nothing anywhere else", which is exactly
                         what the rights model makes possible. Only drawn once a token carries a matrix —
                         OIDC records never get one, and an empty glyph would read as "reaches nothing". -->
                    @if (t.rights) {
                      <app-rights-glyph [rights]="t.rights" style="margin-left:8px;vertical-align:middle;"/>
                    }
                  </td>
                  <td><app-relative-time [value]="t.createdAt"/></td>
                  <td>
                    @if (t.lastUsed) {
                      <app-relative-time [value]="t.lastUsed"/>
                    } @else {
                      <span style="font-style:italic;color:var(--text-muted);">{{ 'tokens.table.neverUsed' | transloco }}</span>
                    }
                  </td>
                  <td>
                    @if (t.expiresAt) {
                      <span style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        @if (isExpired(t)) { <app-status-pill variant="error">{{ 'tokens.table.expired' | transloco }}</app-status-pill> }
                        @else if (isExpiringSoon(t)) { <app-status-pill variant="warn" [dot]="true">{{ 'tokens.table.expiringSoon' | transloco }}</app-status-pill> }
                        <app-relative-time [value]="t.expiresAt"/>
                      </span>
                    } @else {
                      <app-status-pill variant="ok">{{ 'tokens.table.noExpiry' | transloco }}</app-status-pill>
                    }
                  </td>
                  <td>
                    @if (t.schemaLibrary) {
                      <span class="badge badge-gray" style="font-style:italic;">{{ 'tokens.badge.schemaLibraryOnly' | transloco }}</span>
                    } @else if (!t.spaces || t.spaces.length === 0) {
                      <span class="badge badge-green">{{ 'tokens.badge.allSpaces' | transloco }}</span>
                    } @else {
                      <span class="badge badge-gray">{{ t.spaces.join(', ') }}</span>
                    }
                  </td>
                  <td style="white-space:nowrap; display:flex; gap:6px; align-items:center;">
                    <button class="icon-btn" [attr.title]="'tokens.action.rotateTitle' | transloco" [attr.aria-label]="'tokens.action.rotateAriaLabel' | transloco" (click)="regenerate(t)"><ph-icon name="arrows-clockwise" [size]="14"/></button>
                    <button class="icon-btn danger" [attr.title]="'tokens.action.revokeTitle' | transloco" [attr.aria-label]="'tokens.action.revokeAriaLabel' | transloco" (click)="revoke(t)"><ph-icon name="x" [size]="14"/></button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state" style="padding:24px;">
                    <h3>{{ 'tokens.empty.title' | transloco }}</h3>
                    <p style="color:var(--text-secondary);font-size:13px;margin:6px 0 14px;">{{ 'tokens.empty.body' | transloco }}</p>
                    <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'tokens.list.createButton' | transloco }}</button>
                  </div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class TokensComponent implements OnInit {
  private authApi = inject(AuthApi);
  private spacesApi = inject(SpacesApi);
  private transloco = inject(TranslocoService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  tokens = signal<TokenRecord[]>([]);
  selfToken = signal<TokenRecord | null>(null);
  availableSpaces = signal<Space[]>([]);
  loading = signal(true);
  /** Null until the last load failed — checked before the empty state, so a failure never reads as "no tokens". */
  loadError = signal<string | null>(null);
  showCreateDialog = signal(false);

  /**
   * Whether the operator switched from the legacy permission control to the per-space matrix.
   *
   * Not a view toggle — the two are mutually exclusive on the wire, and the server refuses a body carrying
   * both rather than silently preferring one. So this decides WHICH field the create request sends.
   */
  /** Just the ids, because the matrix keys rows by id and does not need the rest of a space. */

  /** Second factor for the token being created. `inherit` is today's behaviour for every existing token. */
  spacesLoadFailed = signal(false);
  newToken = signal('');
  copied = signal(false);
  regenToken = signal('');
  copiedRegen = signal(false);
  /** Inline label edit: the id of the token whose label is being edited (null = none), + its draft. */
  editingId = signal<string | null>(null);
  editLabelValue = '';

  ngOnInit(): void {
    this.authApi.getMe().subscribe({ next: (t) => this.selfToken.set(t), error: () => {} });
    this.spacesApi.listSpaces().subscribe({
      next: ({ spaces }) => this.availableSpaces.set(spaces),
      error: () => this.spacesLoadFailed.set(true),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.authApi.listTokens().subscribe({
      next: ({ tokens }) => { this.tokens.set(tokens); this.loading.set(false); },
      error: (err) => { this.loadError.set(httpErrorReason(err)); this.loading.set(false); },
    });
  }


  /** The dialog owns the create flow; the page owns the list and the one-time plaintext reveal. */
  onTokenCreated(e: { token: TokenRecord; plaintext: string }): void {
    this.showCreateDialog.set(false);
    this.tokens.update(list => [e.token, ...list]);
    this.newToken.set(e.plaintext);
  }




  async regenerate(t: TokenRecord): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('tokens.confirm.rotateTitle'),
      message: this.transloco.translate('tokens.confirm.rotate', { name: t.name }),
      confirmLabel: this.transloco.translate('tokens.rotateButton'),
      danger: true,
    });
    if (!ok) return;
    this.clearRegen();
    this.authApi.regenerateToken(t.id).subscribe({
      next: ({ plaintext }) => this.regenToken.set(plaintext),
      error: () => this.toast.error(this.transloco.translate('tokens.error.rotateFailed')),
    });
  }

  async revoke(t: TokenRecord): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('tokens.confirm.revokeTitle'),
      message: this.transloco.translate('tokens.confirm.revoke', { name: t.name }),
      confirmLabel: this.transloco.translate('common.revoke'),
      danger: true,
    });
    if (!ok) return;
    this.authApi.revokeToken(t.id).subscribe({
      next: () => this.tokens.update(list => list.filter(x => x.id !== t.id)),
      error: () => this.toast.error(this.transloco.translate('tokens.error.revokeFailed')),
    });
  }

  startEditLabel(t: TokenRecord): void {
    this.editingId.set(t.id);
    this.editLabelValue = t.name;
  }

  cancelEditLabel(): void {
    this.editingId.set(null);
    this.editLabelValue = '';
  }

  saveLabel(t: TokenRecord): void {
    const name = this.editLabelValue.trim();
    // A blank or unchanged label is a no-op, not a request — just close the editor.
    if (!name || name === t.name) { this.cancelEditLabel(); return; }
    this.authApi.renameToken(t.id, name).subscribe({
      next: ({ token }) => {
        this.tokens.update(list => list.map(x => x.id === t.id ? { ...x, name: token.name } : x));
        this.cancelEditLabel();
      },
      error: () => this.toast.error(this.transloco.translate('tokens.error.renameFailed')),
    });
  }

  clearNew(): void { this.newToken.set(''); this.copied.set(false); }
  clearRegen(): void { this.regenToken.set(''); this.copiedRegen.set(false); }

  copyNew(): void {
    navigator.clipboard.writeText(this.newToken()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  copyRegen(): void {
    navigator.clipboard.writeText(this.regenToken()).then(() => {
      this.copiedRegen.set(true);
      setTimeout(() => this.copiedRegen.set(false), 2000);
    });
  }

  isExpired(t: TokenRecord): boolean {
    return !!(t.expiresAt && new Date(t.expiresAt) < new Date());
  }

  /** Not yet expired, but expiring within 7 days — the at-risk state that was invisible before. */
  isExpiringSoon(t: TokenRecord): boolean {
    if (!t.expiresAt) return false;
    const exp = new Date(t.expiresAt).getTime();
    const now = Date.now();
    return exp > now && exp - now <= 7 * 24 * 60 * 60 * 1000;
  }

  /** Operator-first rollup: active / expiring-soon / expired counts (warn/error only shown when > 0). */
  summary = computed<SummaryItem[]>(() => {
    const ts = this.tokens();
    const expired = ts.filter(t => this.isExpired(t)).length;
    const expiring = ts.filter(t => this.isExpiringSoon(t)).length;
    const tr = (k: string) => this.transloco.translate(k);
    const items: SummaryItem[] = [{ label: tr('tokens.summary.active'), value: ts.length - expired }];
    if (expiring) items.push({ label: tr('tokens.summary.expiring'), value: expiring, variant: 'warn' });
    if (expired) items.push({ label: tr('tokens.summary.expired'), value: expired, variant: 'error' });
    return items;
  });
}
