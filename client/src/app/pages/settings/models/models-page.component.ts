/**
 * Settings → Models & Pipelines — the page shell.
 *
 * Replaces the 656-line `models.component.ts`, whose six cards sat in the order they were added
 * rather than any order a reader would choose ("very wild, no logic structure or consistent layout" —
 * owner, 2026-07-21).
 *
 * **One route, three tabs across the top of the panel.** Not the main navigation, not a left rail,
 * not a full-width strip — that was settled after three wrong attempts, so it is worth stating
 * plainly: tabs, top of the panel, sized to content.
 *
 * The shell owns the three things the tabs cannot own individually:
 *
 *   - **One load, one save.** All three tabs edit one config object, so `ModelsStateService` is
 *     provided here and lives exactly as long as the page.
 *   - **One status fetch**, shared by Pipelines and Tools. Requested once on entry, never per tab.
 *   - **The unsaved-changes guard spans the tabs.** Switching tabs with a dirty form prompts rather
 *     than silently discarding — the tabs look like navigation, and navigation that eats edits is a
 *     data-loss bug regardless of how small the edit was.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent } from '../../../shared/status-pill.component';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';
import { ModelsStateService } from './models-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { ModelsTabComponent } from './models-tab.component';
import { PipelinesTabComponent } from './pipelines-tab.component';
import { ToolsTabComponent } from './tools-tab.component';

type Tab = 'models' | 'pipelines' | 'tools';

@Component({
  selector: 'app-models-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Both services are page-scoped, not root: leaving and re-entering must start from the server's
  // state rather than a previous visit's half-finished edits.
  providers: [ModelsStateService, PipelineStatusService],
  imports: [
    FormsModule, TranslocoPipe, PhIconComponent, StatusPillComponent,
    ModelsTabComponent, PipelinesTabComponent, ToolsTabComponent,
  ],
  styles: [`
    :host { display: block; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .page-header .sub { font-size: 13px; color: var(--text-secondary); margin-top: 4px; max-width: 56ch; }
    .master { display: flex; align-items: center; gap: 9px; font-size: 13px; }

    /* Tabs sized to content, at the top of the panel — not a full-width strip. */
    .tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin-bottom: 18px; }
    .tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 9px 16px;
      cursor: pointer; font-size: 13px; font-family: var(--font); color: var(--text-muted);
      display: flex; align-items: center; gap: 7px; }
    .tab:hover { color: var(--text-primary); }
    .tab.active { color: var(--text-primary); border-bottom-color: var(--accent); font-weight: 550; }
    .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    /* The unsaved marker rides the tab that owns the edit, so switching away names what is at stake. */
    .tab .unsaved { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }

    .managed-banner { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding: 11px 14px;
      border-radius: 10px; background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.35);
      font-size: 13px; color: var(--text-secondary); }
    .managed-banner code { font-family: var(--font-mono, monospace); }
    .managed-banner b { color: var(--text-primary); }
    .managed-banner ph-icon { flex: none; }

    .actions { display: flex; gap: 12px; align-items: center; margin-top: 20px;
      padding-top: 16px; border-top: 1px solid var(--border-muted); }
    .save-error { color: var(--error); font-size: 13px; }
    .save-ok { color: var(--success); font-size: 13px; }
  `],
  template: `
    <div class="page-header">
      <div>
        <div class="card-title">{{ 'models.page.title' | transloco }}</div>
        <div class="sub">{{ 'models.page.subtitle' | transloco }}</div>
      </div>
      <label class="master">
        <input type="checkbox" [(ngModel)]="s.form.enabled" [disabled]="s.isLocked('enabled')"
          (ngModelChange)="s.touched.set(true)" name="mediaEnabled" />
        {{ 'models.page.mediaEmbedding' | transloco }}
        @if (s.isLocked('enabled')) { <app-status-pill variant="env">{{ 'models.pill.env' | transloco }}</app-status-pill> }
      </label>
    </div>

    @if (s.loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (s.loadError(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else {
      @if (s.managed) {
        <div class="managed-banner">
          <ph-icon name="lock" [size]="16"/>
          <span [innerHTML]="'models.page.managedBanner' | transloco"></span>
        </div>
      }

      <nav class="tabs" role="tablist" [attr.aria-label]="'models.page.title' | transloco">
        @for (t of TABS; track t) {
          <button class="tab" type="button" role="tab" [class.active]="tab() === t"
            [attr.aria-selected]="tab() === t" [attr.id]="'tab-' + t" [attr.aria-controls]="'panel-' + t"
            (click)="switchTo(t)">
            {{ 'models.tab.' + t | transloco }}
            @if (t === 'models' && s.isDirty()) { <span class="unsaved" [attr.aria-label]="'models.page.unsaved' | transloco"></span> }
          </button>
        }
      </nav>

      <!-- The whole panel delegates input/change so any field marks the form touched. One listener
           instead of an (ngModelChange) on every control — which is how a control gets added later
           without one and quietly stops arming the guard. -->
      <div [attr.id]="'panel-' + tab()" role="tabpanel" [attr.aria-labelledby]="'tab-' + tab()"
        (input)="s.touched.set(true)" (change)="s.touched.set(true)">
        @switch (tab()) {
          @case ('models') { <app-models-tab/> }
          @case ('pipelines') { <app-pipelines-tab/> }
          @case ('tools') { <app-tools-tab/> }
        }
      </div>

      @if (showsSave()) {
        <div class="actions">
          <button class="btn btn-primary" (click)="s.save()" [disabled]="s.saving() || s.managed">
            {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
          </button>
          <span class="save-error">{{ s.saveError() }}</span>
          <span class="save-ok">{{ s.saveOk() }}</span>
        </div>
      }
    }
  `,
})
export class ModelsPageComponent implements OnInit {
  readonly s = inject(ModelsStateService);
  readonly pipeline = inject(PipelineStatusService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly transloco = inject(TranslocoService);

  readonly TABS: Tab[] = ['models', 'pipelines', 'tools'];
  readonly tab = signal<Tab>('models');

  /** Tools is read-only, so it never needs the save bar. */
  readonly showsSave = computed(() => this.tab() !== 'tools');

  ngOnInit(): void {
    this.s.load();
    this.pipeline.load();
  }

  /**
   * Switching tabs with unsaved edits prompts before discarding.
   *
   * The tabs read as navigation, and navigation that silently eats edits is a data-loss bug however
   * small the edit — a typed API key is the case that stings, since it cannot be recovered by
   * remembering what was in the box.
   */
  async switchTo(t: Tab): Promise<void> {
    if (t === this.tab()) return;
    if (this.s.isDirty()) {
      const ok = await this.confirmDialog.confirm({
        title: this.transloco.translate('models.confirm.discardTitle'),
        message: this.transloco.translate('models.confirm.discardMessage'),
        confirmLabel: this.transloco.translate('models.confirm.discardConfirm'),
        cancelLabel: this.transloco.translate('models.confirm.discardCancel'),
        danger: true,
      });
      if (!ok) return;
      // Discarding means going back to what the server has, not keeping the edits around invisibly on
      // a tab the operator can no longer see.
      this.s.load();
    }
    this.tab.set(t);
  }
}
