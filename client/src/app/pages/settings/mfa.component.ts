import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthApi } from '../../core/auth-api.service';
import { renderSVG } from 'uqr';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent } from '../../shared/status-pill.component';

type MfaState = 'idle' | 'enrolling' | 'disabling';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, SettingsCardComponent, StatusPillComponent],
  styles: [`
    .qr-wrap { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
    .secret-box {
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 8px 12px;
      font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.05em;
      word-break: break-all;
    }
    .code-input {
      width: 160px; padding: 0.55rem 0.75rem;
      border: 1px solid var(--border); border-radius: 6px;
      background: var(--bg-primary); color: var(--text);
      font-size: 1.3rem; letter-spacing: 0.25em; text-align: center;
      font-family: var(--font-mono);
    }
    .code-input:focus { outline: none; border-color: var(--accent); }
    .status-row { display: flex; align-items: center; gap: 12px; }
    img { border-radius: 8px; background: #fff; padding: 8px; }
  `],
  template: `
    <app-settings-card icon="lock" [heading]="'mfa.title' | transloco" [purpose]="'mfa.subtitle' | transloco">
      @if (!loading() && state() === 'idle') {
        <app-status-pill pill [variant]="enabled() ? 'ok' : 'off'" [dot]="true">{{ enabled() ? ('mfa.status.enabled' | transloco) : ('mfa.status.disabled' | transloco) }}</app-status-pill>
      }

      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (state() === 'idle') {

        <div class="status-row">
          @if (enabled()) {
            <button class="btn btn-secondary btn-sm" (click)="startDisable()">{{ 'mfa.disableButton' | transloco }}</button>
          } @else {
            <button class="btn btn-primary btn-sm" (click)="startEnroll()">{{ 'mfa.enableButton' | transloco }}</button>
          }
        </div>

      } @else if (state() === 'enrolling') {

        <p style="font-size:0.88rem;color:var(--text-muted);margin:0 0 1rem;">
          {{ 'mfa.enroll.instructions' | transloco }}
        </p>
        <div class="qr-wrap">
          @if (qrUrl()) {
            <img [src]="qrUrl()" [attr.alt]="'mfa.enroll.qrAlt' | transloco" width="200" height="200" />
          }
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">{{ 'mfa.enroll.manualKey' | transloco }}</div>
            <div class="secret-box">{{ secret() }}</div>
          </div>
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">{{ 'mfa.enroll.enterCode' | transloco }}</div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <input class="code-input" type="text" inputmode="numeric"
                autocomplete="one-time-code" maxlength="6" [placeholder]="'mfa.enroll.codePlaceholder' | transloco"
                     [attr.aria-label]="'mfa.enroll.codeAriaLabel' | transloco"
                     [(ngModel)]="confirmCode" (keyup.enter)="confirmEnroll()" />
              <button class="btn btn-primary btn-sm" (click)="confirmEnroll()"
                      [disabled]="confirming() || confirmCode.length < 6">
                @if (confirming()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'mfa.enroll.confirmButton' | transloco }}
              </button>
              <button class="btn btn-secondary btn-sm" (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
            </div>
          </div>
        </div>
        @if (enrollError()) {
          <div class="alert alert-error" style="margin-top:12px;">{{ enrollError() }}</div>
        }

      } @else if (state() === 'disabling') {

        <div class="alert alert-error" style="margin-bottom:12px;">
          {{ 'mfa.disable.warning' | transloco }}
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary btn-sm" (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
          <button class="btn btn-primary btn-sm danger" (click)="confirmDisable()" [disabled]="disabling()">
            @if (disabling()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
            {{ 'mfa.disable.confirmButton' | transloco }}
          </button>
        </div>

      }

      @if (successMsg()) {
        <div class="alert alert-success" style="margin-top:12px;">{{ successMsg() }}</div>
      }
    </app-settings-card>
  `,
})
export class MfaComponent implements OnInit, OnDestroy {
  private authApi = inject(AuthApi);
  private transloco = inject(TranslocoService);

  loading = signal(true);
  enabled = signal(false);
  state = signal<MfaState>('idle');

  secret = signal('');
  qrUrl = signal('');
  confirmCode = '';
  confirming = signal(false);
  enrollError = signal('');

  disabling = signal(false);
  successMsg = signal('');
  /** Cleared on destroy so a pending dismissal cannot fire into a torn-down component. */
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.refresh(); }

  ngOnDestroy(): void { if (this.successTimer !== null) clearTimeout(this.successTimer); }

  /**
   * Show a success note and retire it on its own.
   *
   * It used to persist until the next action, so "MFA enabled" stayed on screen indefinitely and was
   * still there the next time you opened the page — reading as a live status rather than the receipt for
   * something you did a while ago. Six seconds is long enough to read twice.
   */
  private flashSuccess(message: string): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
    this.successMsg.set(message);
    this.successTimer = setTimeout(() => { this.successMsg.set(''); this.successTimer = null; }, 6000);
  }

  refresh(): void {
    this.loading.set(true);
    this.authApi.getMfaStatus().subscribe({
      next: ({ enabled }) => { this.enabled.set(enabled); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startEnroll(): void {
    this.successMsg.set('');
    this.authApi.setupMfa().subscribe({
      next: ({ secret, otpauth }) => {
        this.secret.set(secret);
        // Render the QR entirely client-side — the TOTP secret never leaves
        // the browser (avoids leaking it to external chart services). uqr is a
        // pure-ESM, zero-dependency renderer; the SVG scales to the <img> box.
        const svg = renderSVG(otpauth, { border: 1 });
        this.qrUrl.set('data:image/svg+xml;utf8,' + encodeURIComponent(svg));
        this.confirmCode = '';
        this.enrollError.set('');
        this.state.set('enrolling');
      },
      error: (err) => this.enrollError.set(err.error?.error ?? this.transloco.translate('mfa.error.setupFailed')),
    });
  }

  confirmEnroll(): void {
    if (this.confirmCode.length < 6) return;
    this.confirming.set(true);
    this.enrollError.set('');
    this.authApi.verifyMfaCode(this.confirmCode).subscribe({
      next: ({ valid }) => {
        this.confirming.set(false);
        if (valid) {
          this.enabled.set(true);
          this.state.set('idle');
          this.flashSuccess(this.transloco.translate('mfa.success.enabled'));
        } else {
          this.enrollError.set(this.transloco.translate('mfa.error.invalidCode'));
        }
      },
      error: () => {
        this.confirming.set(false);
        this.enrollError.set(this.transloco.translate('mfa.error.verifyFailed'));
      },
    });
  }

  startDisable(): void {
    this.successMsg.set('');
    this.state.set('disabling');
  }

  confirmDisable(): void {
    this.disabling.set(true);
    this.authApi.disableMfa().subscribe({
      next: () => {
        this.disabling.set(false);
        this.enabled.set(false);
        this.state.set('idle');
        this.flashSuccess(this.transloco.translate('mfa.success.disabled'));
      },
      error: () => this.disabling.set(false),
    });
  }

  cancel(): void { this.state.set('idle'); }
}
