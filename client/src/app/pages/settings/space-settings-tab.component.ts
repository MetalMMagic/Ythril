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
import { SpacesStore } from './spaces-store.service';
import { SettingsCardComponent } from '../../shared/settings-card.component';

@Component({
  selector: 'app-space-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, SettingsCardComponent],
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
        <label>{{ 'spaces.settings.maxStorage' | transloco }}</label>
        <input type="number" [(ngModel)]="state.stForm.maxGiB" min="0" step="0.1" [placeholder]="'spaces.settings.unlimitedPlaceholder' | transloco" />
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.maxStorageHint' | transloco }}</div>
      </div>
      <div class="field" style="margin:0;max-width:220px;">
        <label>{{ 'spaces.settings.recordTtl' | transloco }}</label>
        <input type="number" [(ngModel)]="state.stForm.recordTtlDays" min="0" step="1" [placeholder]="'spaces.settings.recordTtlPlaceholder' | transloco" />
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.recordTtlHint' | transloco }}</div>
      </div>
    </div>
  </app-settings-card>

  <app-settings-card icon="package" [heading]="'spaces.settings.card.extraction' | transloco" [purpose]="'spaces.settings.card.extractionHint' | transloco">
    <div class="field" style="margin:0;max-width:260px;">
      <label>{{ 'spaces.settings.extractionMode' | transloco }}</label>
      <select [(ngModel)]="state.stForm.documentExtraction">
        <option value="">{{ 'spaces.settings.extractionInherit' | transloco }}</option>
        <option value="auto">{{ 'spaces.settings.extractionAuto' | transloco }}</option>
        <option value="off">{{ 'spaces.settings.extractionOff' | transloco }}</option>
        <!-- Only offer modes within the instance ceiling: a space can't extract more than the instance
             allows, so a higher option would just be silently capped. The current value is always kept
             visible, even if a since-lowered ceiling now excludes it. -->
        @if (isExtractionAllowed('ocr') || state.stForm.documentExtraction === 'ocr') { <option value="ocr">{{ 'spaces.settings.extractionOcr' | transloco }}</option> }
        @if (isExtractionAllowed('vlm') || state.stForm.documentExtraction === 'vlm') { <option value="vlm">{{ 'spaces.settings.extractionVlm' | transloco }}</option> }
        @if (isExtractionAllowed('repair') || state.stForm.documentExtraction === 'repair') { <option value="repair">{{ 'spaces.settings.extractionRepair' | transloco }}</option> }
      </select>
      <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.extractionHint' | transloco }}</div>
      @if (store.docExtractionCeiling() !== 'auto' && store.docExtractionCeiling() !== 'repair') {
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.extractionCeilingHint' | transloco: { ceiling: store.docExtractionCeiling() } }}</div>
      }
    </div>
  </app-settings-card>

</div>
  `,
})
export class SpaceSettingsTabComponent {
  readonly state = inject(SpaceSettingsState);
  readonly store = inject(SpacesStore);

  private static readonly LADDER = ['off', 'ocr', 'vlm', 'repair'] as const;

  /**
   * Whether a concrete extraction mode is within the instance ceiling — so the per-space dropdown only
   * offers levels the space could actually reach. `auto` ceiling imposes no limit; `off`/`auto`/inherit
   * options are always offered separately (a space can always do less, or follow the ceiling).
   */
  isExtractionAllowed(mode: 'ocr' | 'vlm' | 'repair'): boolean {
    const ceiling = this.store.docExtractionCeiling();
    if (ceiling === 'auto') return true;
    return SpaceSettingsTabComponent.LADDER.indexOf(mode) <= SpaceSettingsTabComponent.LADDER.indexOf(ceiling);
  }
}
