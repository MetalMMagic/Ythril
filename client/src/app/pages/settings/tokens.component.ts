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

@Component({
  selector: 'app-tokens',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective,
            SummaryStripComponent, StatusPillComponent, RelativeTimeComponent],
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

    <!-- Create token form (dialog) -->
    @if (showCreateDialog()) {
      <div class="dialog-backdrop">
        <div class="dialog" [appModal]="'tokens.create.title' | transloco" (dismiss)="showCreateDialog.set(false)" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div class="card-title">{{ 'tokens.create.title' | transloco }}</div>
            <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="showCreateDialog.set(false)"><ph-icon name="x" [size]="14"/></button>
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
                <div class="table-wrapper" style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm);">
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
                          <td><span class="badge badge-gray mono" style="font-size:11px;">{{ s.id }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              <div class="scope-hint">{{ 'tokens.create.spacesHint' | transloco }}</div>
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
                @if (selfToken()?.admin) {
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

            <div class="form-grid-bottom" style="margin-top:12px;">
              <button class="btn-secondary btn" type="button" (click)="showCreateDialog.set(false)">{{ 'common.cancel' | transloco }}</button>
              <button class="btn-primary btn" type="submit" style="margin-left:auto;" [disabled]="creating() || !newName.trim()">
                @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'tokens.create.submitButton' | transloco }}
              </button>
            </div>
          </form>
        </div>
      </div>
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
      } @else {
        <div class="table-wrapper">
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
                    <span class="token-status-dot" [class.dot-active]="!isExpired(t)" [class.dot-expired]="isExpired(t)"></span>
                    {{ t.name }}
                    @if (t.id === selfToken()?.id) { <span style="margin-left:6px;font-size:0.75rem;color:var(--text-muted);">{{ 'tokens.table.currentSession' | transloco }}</span> }
                  </td>
                  <td>
                    @if (t.admin) { <app-status-pill variant="error">{{ 'tokens.badge.admin' | transloco }}</app-status-pill> }
                    @else if (t.schemaLibrary) { <app-status-pill variant="pending">{{ 'tokens.badge.schemaLibrary' | transloco }}</app-status-pill> }
                    @else if (t.readOnly) { <app-status-pill variant="warn">{{ 'tokens.badge.readOnly' | transloco }}</app-status-pill> }
                    @else { <app-status-pill variant="ok">{{ 'tokens.badge.standard' | transloco }}</app-status-pill> }
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
  creating = signal(false);
  createError = signal('');
  showCreateDialog = signal(false);
  newName = '';
  newExpiry = '';
  newPermission: 'readOnly' | 'standard' | 'admin' = 'standard';
  newSelectedSpaces: string[] = [];
  newSpacesFallback = '';
  spacesLoadFailed = signal(false);
  newToken = signal('');
  copied = signal(false);
  regenToken = signal('');
  copiedRegen = signal(false);

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
    this.authApi.listTokens().subscribe({
      next: ({ tokens }) => { this.tokens.set(tokens); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createToken(): void {
    if (!this.newName.trim()) return;
    this.creating.set(true);
    this.createError.set('');

    const body: { name: string; expiresAt?: string; admin?: boolean; readOnly?: boolean; spaces?: string[] } = { name: this.newName.trim() };
    if (this.newExpiry) body.expiresAt = new Date(this.newExpiry).toISOString();
    if (this.newPermission === 'admin') body.admin = true;
    if (this.newPermission === 'readOnly') body.readOnly = true;

    let spaceIds: string[];
    if (this.spacesLoadFailed()) {
      spaceIds = this.newSpacesFallback.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      spaceIds = [...this.newSelectedSpaces];
    }
    if (spaceIds.length) body.spaces = spaceIds;

    this.authApi.createToken(body).subscribe({
      next: ({ token, plaintext }) => {
        this.creating.set(false);
        this.showCreateDialog.set(false);
        this.tokens.update(list => [token, ...list]);
        this.newToken.set(plaintext);
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

  isSpaceSelected(id: string): boolean {
    return this.newSelectedSpaces.includes(id);
  }

  toggleSpace(id: string): void {
    if (this.newSelectedSpaces.includes(id)) {
      this.newSelectedSpaces = this.newSelectedSpaces.filter(s => s !== id);
    } else {
      this.newSelectedSpaces = [...this.newSelectedSpaces, id];
    }
  }

  selectAllSpaces(): void {
    this.newSelectedSpaces = [];
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
