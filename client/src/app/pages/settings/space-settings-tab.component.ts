/**
 * Settings tab — identity, purpose, and storage limits, grouped into SettingsCards (PR-U9 pt3).
 *
 * Extracted from SpacesComponent (A17.8b). Needs no inputs and no data outputs: SpacesStore owns
 * the server data and SpaceSettingsState owns the dialog form state, and both are services the
 * page provides — so this component just renders them and calls them.
 *
 * The schema-validation controls (`validationMode`, `strictLinkage`) deliberately live on the SCHEMA
 * tab, not here: validation posture governs the schemas, so it belongs beside them (U9 pt3 IA fix).
 * Their state still lives in the shared SpaceSettingsState, so moving the inputs changed nothing about
 * how the footer save persists them.
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState } from './space-settings-state.service';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent } from '../../shared/status-pill.component';

@Component({
  selector: 'app-space-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, SettingsCardComponent, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [SPACE_DIALOG_STYLES],
  template: `
<div style="display:flex;flex-direction:column;gap:16px;max-width:720px;">

  <app-settings-card icon="tag" [heading]="'spaces.settings.card.identity' | transloco" [purpose]="'spaces.settings.card.identityHint' | transloco">
    <div class="field" style="margin:0;">
      <label>{{ 'spaces.settings.label' | transloco }}</label>
      <input type="text" [(ngModel)]="state.stForm.label" maxlength="200" />
    </div>
  </app-settings-card>

  <app-settings-card icon="info" [heading]="'spaces.settings.card.purpose' | transloco" [purpose]="'spaces.settings.card.purposeCardHint' | transloco">
    <div class="field">
      <label>{{ 'spaces.settings.purpose' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.purposeHint' | transloco }}</span></label>
      <textarea [(ngModel)]="state.stForm.purpose" rows="6" maxlength="4000" style="resize:vertical;"></textarea>
    </div>
    <div class="field" style="margin-bottom:0;">
      <label>{{ 'spaces.settings.usageNotes' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.usageNotesHint' | transloco }}</span></label>
      <textarea [(ngModel)]="state.stForm.usageNotes" rows="3" maxlength="2000" style="resize:vertical;"></textarea>
    </div>
  </app-settings-card>

  <app-settings-card icon="database" [heading]="'spaces.settings.card.limits' | transloco" [purpose]="'spaces.settings.card.limitsHint' | transloco">
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
      <div class="field" style="margin:0;max-width:220px;">
        <label style="display:flex;align-items:center;gap:8px;">
          {{ 'spaces.settings.maxStorage' | transloco }}
          @if (state.stForm.maxGiB == null) { <app-status-pill variant="off">{{ 'spaces.settings.unlimitedPill' | transloco }}</app-status-pill> }
        </label>
        <input type="number" [(ngModel)]="state.stForm.maxGiB" min="0" step="0.1" [placeholder]="'spaces.settings.unlimitedPlaceholder' | transloco" />
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.maxStorageHint' | transloco }}</div>
      </div>
      <div class="field" style="margin:0;max-width:220px;">
        <label style="display:flex;align-items:center;gap:8px;">
          {{ 'spaces.settings.recordTtl' | transloco }}
          @if (state.stForm.recordTtlDays == null) { <app-status-pill variant="off">{{ 'spaces.settings.noTtlPill' | transloco }}</app-status-pill> }
        </label>
        <input type="number" [(ngModel)]="state.stForm.recordTtlDays" min="0" step="1" [placeholder]="'spaces.settings.recordTtlPlaceholder' | transloco" />
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.recordTtlHint' | transloco }}</div>
      </div>
    </div>
  </app-settings-card>

</div>
  `,
})
export class SpaceSettingsTabComponent {
  readonly state = inject(SpaceSettingsState);
}
