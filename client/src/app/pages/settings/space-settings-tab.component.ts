/**
 * Settings tab — label, purpose, usage notes, storage quota.
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

@Component({
  selector: 'app-space-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [SPACE_DIALOG_STYLES],
  template: `
<div style="max-width:720px;">
  <div class="field">
    <label>{{ 'spaces.settings.label' | transloco }}</label>
    <input type="text" [(ngModel)]="state.stForm.label" maxlength="200" />
  </div>
  <div class="field">
    <label>{{ 'spaces.settings.purpose' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.purposeHint' | transloco }}</span></label>
    <textarea [(ngModel)]="state.stForm.purpose" rows="6" maxlength="4000" style="resize:vertical;"></textarea>
  </div>
  <div class="field">
    <label>{{ 'spaces.settings.usageNotes' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.usageNotesHint' | transloco }}</span></label>
    <textarea [(ngModel)]="state.stForm.usageNotes" rows="3" maxlength="2000" style="resize:vertical;"></textarea>
  </div>
  <div class="field" style="max-width:220px;">
    <label>{{ 'spaces.settings.maxStorage' | transloco }}</label>
    <input type="number" [(ngModel)]="state.stForm.maxGiB" min="0" step="0.1" [placeholder]="'spaces.settings.unlimitedPlaceholder' | transloco" />
    <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.maxStorageHint' | transloco }}</div>
  </div>
  <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
    <div class="field" style="margin:0;">
      <label>{{ 'spaces.settings.validationMode' | transloco }}</label>
      <select [(ngModel)]="state.schValidation" style="width:220px;">
        <option value="off">{{ 'spaces.settings.validation.off' | transloco }}</option>
        <option value="warn">{{ 'spaces.settings.validation.warn' | transloco }}</option>
        <option value="strict">{{ 'spaces.settings.validation.strict' | transloco }}</option>
      </select>
    </div>
    <div class="field" style="margin:0;padding-top:22px;">
      <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer;">
        <input type="checkbox" [(ngModel)]="state.schStrictLinkage" />
        {{ 'spaces.settings.strictLinkage' | transloco }}
        <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.strictLinkageHint' | transloco }}</span>
      </label>
    </div>
  </div>
</div>
  `,
})
export class SpaceSettingsTabComponent {
  readonly state = inject(SpaceSettingsState);


}
