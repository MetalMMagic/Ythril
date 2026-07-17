/**
 * Danger zone — rename, wipe, delete the space, and leave its networks.
 *
 * Extracted from SpacesComponent (A17.8b). Needs no inputs and no data outputs: SpacesStore owns
 * the server data and SpaceSettingsState owns the dialog form state, and both are services the
 * page provides — so this component just renders them and calls them.
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { NetworksApi } from '../../core/networks-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-space-danger-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [SPACE_DIALOG_STYLES],
  template: `
<div class="dz-section">
  <div class="dz-section-title">{{ 'spaces.dangerZone.renameTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.renameDescription' | transloco }}</p>
  <form (ngSubmit)="submitDangerRename()" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
    <div class="field" style="margin:0;flex:1;max-width:280px;">
      <label>{{ 'spaces.dangerZone.newId' | transloco }}</label>
      <input type="text" [(ngModel)]="state.dangerRenameId" name="state.dangerRenameId" pattern="[a-z0-9-]+" maxlength="40" [placeholder]="state.settingsSpace()!.id" />
    </div>
    <button class="btn btn-secondary" type="submit" [disabled]="state.dangerRenaming()||!state.dangerRenameId.trim()||state.dangerRenameId.trim()===state.settingsSpace()!.id">
      @if (state.dangerRenaming()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.renameButton' | transloco }}
    </button>
  </form>
  @if (state.dangerRenameError()) { <div class="alert alert-error" style="margin-top:8px;">{{ state.dangerRenameError() }}</div> }
</div>

<div class="dz-section">
  <div class="dz-section-title">{{ 'spaces.dangerZone.wipeTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.wipeDescription' | transloco }}</p>
  @if (state.dangerWipeLoading()) {
    <div style="display:flex;gap:8px;align-items:center;color:var(--text-muted);font-size:13px;margin-bottom:12px;">
      <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> {{ 'spaces.dangerZone.loadingCounts' | transloco }}
    </div>
  } @else if (state.dangerWipeStats()) {
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">
      @for (col of state.wipeStatCols(); track col.label) {
        <div style="text-align:center;padding:10px 6px;background:var(--bg-elevated);border-radius:var(--radius-sm);">
          <div style="font-size:20px;font-weight:700;font-family:var(--font-mono);">{{ col.value }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">{{ col.label }}</div>
        </div>
      }
    </div>
  }
  @if (state.dangerWipeError()) { <div class="alert alert-error" style="margin-bottom:8px;">{{ state.dangerWipeError() }}</div> }
  <button class="btn btn-danger" type="button" (click)="confirmDangerWipe()" [disabled]="state.dangerWiping()">
    @if (state.dangerWiping()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.wipeButton' | transloco }}
  </button>
</div>

@let spaceNets = store.networksForSpace(state.settingsSpace()!.id);
@if (spaceNets.length > 0) {
  <div class="dz-section">
    <div class="dz-section-title">{{ 'spaces.dangerZone.leaveNetworksTitle' | transloco }}</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.leaveNetworksDescription' | transloco }}</p>
    @for (n of spaceNets; track n.id) {
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <div>
          <span style="font-weight:500;">{{ n.label }}</span>
          <span class="badge badge-gray" style="margin-left:8px;font-size:11px;">{{ n.id }}</span>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="leaveNetworkDanger(n.id)">{{ 'spaces.dangerZone.leaveButton' | transloco }}</button>
      </div>
    }
  </div>
}

@if (!state.settingsSpace()!.builtIn) {
  <div class="dz-section dz-red">
    <div class="dz-section-title">{{ 'spaces.dangerZone.deleteTitle' | transloco }}</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.deleteDescription' | transloco }}</p>
    @if (state.dangerDeleteError()) { <div class="alert alert-error" style="margin-bottom:8px;">{{ state.dangerDeleteError() }}</div> }
    <button class="btn btn-danger" type="button" (click)="confirmDangerDelete()" [disabled]="state.dangerDeleting()">
      @if (state.dangerDeleting()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.deleteButton' | transloco }}
    </button>
  </div>
}
  `,
})
export class SpaceDangerTabComponent {
  readonly state = inject(SpaceSettingsState);
  readonly store = inject(SpacesStore);
  private spacesApi = inject(SpacesApi);
  private networksApi = inject(NetworksApi);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private transloco = inject(TranslocoService);

  async submitDangerRename(): Promise<void> {
    const target = this.state.settingsSpace();
    const newId  = this.state.dangerRenameId.trim();
    if (!target || !newId || newId === target.id) return;
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmRenameTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmRename', { label: target.label, id: target.id, newId }),
      confirmLabel: this.transloco.translate('spaces.dangerZone.renameButton'),
    });
    if (!ok) return;
    this.state.dangerRenaming.set(true);
    this.state.dangerRenameError.set('');
    this.spacesApi.renameSpace(target.id, newId).subscribe({
      next: ({ space }) => {
        this.state.dangerRenaming.set(false);
        this.store.spaces.update(list => list.map(s => s.id === target.id ? space : s));
        this.state.settingsSpace.set(space);
        this.state.dangerRenameId = space.id;
        this.networksApi.listNetworks().subscribe({ next: ({ networks }) => this.store.networks.set(networks), error: () => {} });
      },
      error: (err) => { this.state.dangerRenaming.set(false); this.state.dangerRenameError.set(err.error?.error ?? this.transloco.translate('spaces.error.renameFailed')); },
    });
  }

  async confirmDangerWipe(): Promise<void> {
    const target = this.state.settingsSpace();
    if (!target) return;
    // Irreversible: require the operator to type the space id (GitHub-style, C3).
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmWipeTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmWipe', { label: target.label }),
      confirmLabel: this.transloco.translate('spaces.dangerZone.wipeButton'),
      danger: true,
      requireText: target.id,
      requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
    });
    if (!ok) return;
    this.state.dangerWiping.set(true);
    this.state.dangerWipeError.set('');
    this.spacesApi.wipeSpace(target.id).subscribe({
      next: () => {
        this.state.dangerWiping.set(false);
        this.state.dangerWipeStats.set(null);
        this.state.dangerWipeLoading.set(true);
        this.spacesApi.getSpaceStats(target.id).subscribe({
          next: (stats) => { this.state.dangerWipeStats.set(stats); this.state.dangerWipeLoading.set(false); },
          error: () => this.state.dangerWipeLoading.set(false),
        });
      },
      error: (err) => { this.state.dangerWiping.set(false); this.state.dangerWipeError.set(err.error?.error ?? this.transloco.translate('spaces.error.wipeFailed')); },
    });
  }

  async confirmDangerDelete(): Promise<void> {
    const target = this.state.settingsSpace();
    if (!target) return;
    // Irreversible: require the operator to type the space id (GitHub-style, C3).
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmDeleteTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmDelete', { label: target.label, id: target.id }),
      confirmLabel: this.transloco.translate('spaces.dangerZone.deleteButton'),
      danger: true,
      requireText: target.id,
      requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
    });
    if (!ok) return;
    this.state.dangerDeleting.set(true);
    this.state.dangerDeleteError.set('');
    this.spacesApi.deleteSpace(target.id).subscribe({
      next: () => {
        this.state.dangerDeleting.set(false);
        this.store.spaces.update(list => list.filter(s => s.id !== target.id));
        this.state.closeSettings();
      },
      error: (err) => { this.state.dangerDeleting.set(false); this.state.dangerDeleteError.set(err.error?.error ?? this.transloco.translate('spaces.error.deleteFailed')); },
    });
  }

  async leaveNetworkDanger(networkId: string): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmLeaveNetworkTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmLeaveNetwork'),
      confirmLabel: this.transloco.translate('networks.leaveButton'),
      danger: true,
    });
    if (!ok) return;
    this.networksApi.leaveNetwork(networkId).subscribe({
      next: () => this.store.refreshNetworks(),
      error: () => this.toast.error(this.transloco.translate('spaces.error.leaveNetworkFailed')),
    });
  }
}
