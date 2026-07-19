import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Space } from '../../core/api.types';
import { NetworksApi } from '../../core/networks-api.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';

/**
 * Join-network dialog, extracted from the (large) NetworksComponent (PR-U3). Owns the invite-bundle
 * textarea, the bundle validation (JSON / required fields / this brain's URL), the space-id
 * **collision-resolution** UI (merge vs alias, with alias validation), and the `joinRemote` call.
 *
 * `myUrl` is a one-way input: the host computes this brain's own URL (used to gate the enable-networks
 * flow) and passes it in; the join dialog never lets the user edit it, it only needs it to submit. On a
 * successful join the dialog shows its result message and emits `joined` so the host reloads the network
 * list and refreshes its spaces (a join can create new local spaces). Behaviour matches the inline
 * version; the join characterization tests moved here with it.
 */
@Component({
  selector: 'app-network-join-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective],
  styles: [`
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
    <div class="dialog-backdrop" (click)="close.emit()">
      <div class="dialog" [appModal]="'networks.dialog.join.title' | transloco" (dismiss)="close.emit()" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="card-title">{{ 'networks.dialog.join.title' | transloco }}</div>
          <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()"><ph-icon name="x" [size]="14"/></button>
        </div>

        @if (joinError()) { <div class="alert alert-error">{{ joinError() }}</div> }
        @if (joinSuccess()) { <div class="alert alert-success">{{ joinSuccess() }}</div> }

        <div class="field">
          <label>{{ 'networks.dialog.join.bundleLabel' | transloco }}</label>
          <textarea
            [(ngModel)]="joinBundle"
            name="joinBundle"
            rows="5"
            [placeholder]="'networks.dialog.join.bundlePlaceholder' | transloco"
            [attr.aria-label]="'networks.dialog.join.bundleAriaLabel' | transloco"
            style="font-family:var(--font-mono); font-size:12px; resize:vertical;"
          ></textarea>
        </div>

        @if (joinCollisionSpaces().length > 0) {
          <div style="margin:0 0 12px; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-elevated);">
            <div style="font-weight:600; font-size:13px; margin-bottom:8px;">{{ 'networks.dialog.join.collisions.title' | transloco }}</div>
            <p style="font-size:12px; color:var(--text-muted); margin:0 0 12px;">
              {{ 'networks.dialog.join.collisions.body' | transloco }}
            </p>
            @for (remoteId of joinCollisionSpaces(); track remoteId) {
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span class="badge badge-gray mono" style="min-width:80px;">{{ remoteId }}</span>
                <select
                  [ngModel]="joinSpaceActions[remoteId]"
                  (ngModelChange)="onCollisionActionChange(remoteId, $event)"
                  [name]="'collision-' + remoteId"
                  style="width:140px;"
                >
                  <option value="merge">{{ 'networks.dialog.join.collision.merge' | transloco }}</option>
                  <option value="alias">{{ 'networks.dialog.join.collision.alias' | transloco }}</option>
                </select>
                @if (joinSpaceActions[remoteId] === 'alias') {
                  <input
                    type="text"
                    [(ngModel)]="joinSpaceAliases[remoteId]"
                    [name]="'alias-' + remoteId"
                    [placeholder]="'networks.dialog.join.aliasPlaceholder' | transloco"
                    pattern="[a-z0-9-]+"
                    maxlength="40"
                    style="width:140px; padding:4px 8px; font-size:12px;"
                    required
                  />
                }
              </div>
            }
          </div>
        }

        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn-secondary btn" type="button" (click)="close.emit()">{{ 'common.cancel' | transloco }}</button>
          <button
            class="btn-primary btn"
            (click)="joinCollisionSpaces().length > 0 ? confirmJoin() : joinNetwork()"
            [disabled]="joining() || !joinBundle.trim() || !myUrl().trim()"
          >
            @if (joining()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
            {{ joinCollisionSpaces().length > 0 ? ('networks.dialog.join.confirmJoinButton' | transloco) : ('networks.dialog.join.submitButton' | transloco) }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NetworkJoinDialogComponent {
  private networksApi = inject(NetworksApi);
  private transloco = inject(TranslocoService);

  /** Local spaces (for collision detection). */
  readonly availableSpaces = input<Space[]>([]);
  /** This brain's own URL, computed by the host — used to submit the join (never edited here). */
  readonly myUrl = input('');

  /** Emitted after a successful join so the host reloads networks and refreshes its spaces list. */
  readonly joined = output<void>();
  /** Emitted when the user cancels/dismisses. */
  readonly close = output<void>();

  joinBundle = '';
  joining = signal(false);
  joinError = signal('');
  joinSuccess = signal('');
  joinCollisionSpaces = signal<string[]>([]);
  joinSpaceActions: Record<string, 'merge' | 'alias'> = {};
  joinSpaceAliases: Record<string, string> = {};
  private joinParsedBundle: any = null;

  joinNetwork(): void {
    this.joinError.set('');
    this.joinSuccess.set('');
    this.joinCollisionSpaces.set([]);
    let bundle: any;
    try {
      bundle = JSON.parse(this.joinBundle);
    } catch {
      this.joinError.set(this.transloco.translate('networks.dialog.join.error.invalidJson'));
      return;
    }
    if (!bundle.handshakeId || !bundle.inviteUrl || !bundle.rsaPublicKeyPem || !bundle.networkId) {
      this.joinError.set(this.transloco.translate('networks.dialog.join.error.incompleteBundle'));
      return;
    }
    if (!this.myUrl().trim()) {
      this.joinError.set(this.transloco.translate('networks.dialog.join.error.missingMyUrl'));
      return;
    }

    // Detect space name collisions — show resolution UI if any overlap
    if (bundle.spaces?.length) {
      const localIds = new Set(this.availableSpaces().map(s => s.id));
      const overlap = (bundle.spaces as string[]).filter((s: string) => localIds.has(s));
      if (overlap.length > 0) {
        this.joinParsedBundle = bundle;
        this.joinSpaceActions = {};
        this.joinSpaceAliases = {};
        for (const id of overlap) {
          this.joinSpaceActions[id] = 'merge';
          this.joinSpaceAliases[id] = '';
        }
        this.joinCollisionSpaces.set(overlap);
        return; // wait for user to resolve collisions
      }
    }

    this.joinParsedBundle = bundle;
    this.executeJoin();
  }

  onCollisionActionChange(remoteId: string, action: 'merge' | 'alias'): void {
    this.joinSpaceActions[remoteId] = action;
    if (action === 'alias' && !this.joinSpaceAliases[remoteId]) {
      this.joinSpaceAliases[remoteId] = remoteId + '-local';
    }
  }

  confirmJoin(): void {
    // Validate alias inputs
    for (const remoteId of this.joinCollisionSpaces()) {
      if (this.joinSpaceActions[remoteId] === 'alias') {
        const alias = this.joinSpaceAliases[remoteId]?.trim();
        if (!alias) {
          this.joinError.set(this.transloco.translate('networks.dialog.join.error.aliasRequired', { remoteId }));
          return;
        }
        if (!/^[a-z0-9-]+$/.test(alias)) {
          this.joinError.set(this.transloco.translate('networks.dialog.join.error.aliasInvalid', { alias }));
          return;
        }
        const localIds = new Set(this.availableSpaces().map(s => s.id));
        if (localIds.has(alias)) {
          this.joinError.set(this.transloco.translate('networks.dialog.join.error.aliasExists', { alias }));
          return;
        }
      }
    }
    this.executeJoin();
  }

  private executeJoin(): void {
    const bundle = this.joinParsedBundle;
    if (!bundle) return;

    // Build spaceMap from collision resolutions
    const spaceMap: Record<string, string> = {};
    for (const remoteId of this.joinCollisionSpaces()) {
      if (this.joinSpaceActions[remoteId] === 'alias') {
        spaceMap[remoteId] = this.joinSpaceAliases[remoteId].trim();
      }
    }

    this.joining.set(true);
    this.networksApi.joinRemote({
      handshakeId: bundle.handshakeId,
      inviteUrl:   bundle.inviteUrl,
      rsaPublicKeyPem: bundle.rsaPublicKeyPem,
      networkId:   bundle.networkId,
      myUrl:       this.myUrl().trim(),
      expiresAt:   bundle.expiresAt,
      ...(Object.keys(spaceMap).length > 0 ? { spaceMap } : {}),
    }).subscribe({
      next: (result) => {
        this.joining.set(false);
        // Vote-governed networks hold the join in a vote round on the inviter's
        // side; sync begins once the members/ancestors approve.
        const successKey = result.status === 'vote_pending'
          ? 'networks.dialog.join.success.votePending'
          : 'networks.dialog.join.success.joined';
        let msg = this.transloco.translate(successKey, { networkLabel: result.networkLabel });
        if (result.createdSpaces?.length) {
          msg += ` ${this.transloco.translate('networks.dialog.join.success.createdSpaces', { spaces: result.createdSpaces.join(', ') })}`;
        }
        if (result.existingSpaces?.length) {
          msg += ` ${this.transloco.translate('networks.dialog.join.success.existingSpaces', { spaces: result.existingSpaces.join(', ') })}`;
        }
        if (result.spaceMap && Object.keys(result.spaceMap).length > 0) {
          const aliases = Object.entries(result.spaceMap).map(([r, l]) => `${r} → ${l}`).join(', ');
          msg += ` ${this.transloco.translate('networks.dialog.join.success.aliases', { aliases })}`;
        }
        this.joinSuccess.set(msg);
        this.joinBundle = '';
        this.joinParsedBundle = null;
        this.joinCollisionSpaces.set([]);
        this.joinSpaceActions = {};
        this.joinSpaceAliases = {};
        this.joined.emit(); // host reloads networks + refreshes spaces (a join can create local spaces)
      },
      error: (err) => {
        this.joining.set(false);
        this.joinError.set(err.error?.error ?? this.transloco.translate('networks.error.joinFailed'));
      },
    });
  }
}
