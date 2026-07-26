/**
 * Tab 2 — Pipelines. What actually runs, drawn as the real step chain.
 *
 * Four pipelines (Documents · Images · Audio & video · Text), each with the actor named under every
 * step and that pipeline's knobs attached to it rather than pooled in one "Advanced" block at the
 * bottom of the page. Pooling them is what made the old page unreadable: a render-DPI field sitting
 * next to a worker-concurrency field tells you nothing about which pipeline either belongs to.
 *
 * Three rules from the approved layout, and what each is for:
 *
 *   - **Conditional steps are dashed, always-run steps are solid.** A repair pass that only engages
 *     when a repair model is wired in is not the same kind of thing as OCR, and drawing them alike
 *     is how an operator concludes a stage ran when it never could.
 *   - **The actor names the model, never the state — the dot is the state.** Writing "off" where a
 *     model name belongs conflates what a step *is* with whether it is *working*.
 *   - **Each pipeline carries its own instance ceiling** — the most any space may do with that class,
 *     not a default a space inherits. Lowering one silently caps every space above it, and "off"
 *     takes the class offline everywhere — so both facts are stated at the control, not in a doc.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent } from '../../../shared/status-pill.component';
import { HealthDotComponent } from './health-dot.component';
import { ModelsStateService } from './models-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { HealthState, MODE_STAGES, IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS, MediaClass } from './models.types';

/** One drawn step. `actor` is a model or tool name; `health` is looked up from the status payload. */
interface Step {
  key: string;
  /** i18n key for the step's name. */
  name: string;
  actor: string;
  health: HealthState | null;
  /** Dashed when true — the step only runs under some configurations. */
  conditional: boolean;
  /** The Models-tab card this actor is configured on. Anchors the deep-link (landing in a later PR). */
  cardId?: string;
}

@Component({
  selector: 'app-pipelines-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, PhIconComponent, StatusPillComponent, HealthDotComponent],
  styles: [`
    :host { display: block; }
    .pipe-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;
      margin-bottom: 16px; overflow: hidden; }
    .pipe-h { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }
    .ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;
      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }
    .pipe-h .t { flex: 1; min-width: 0; }
    .pipe-h h3 { margin: 0; font-size: 14.5px; font-weight: 620; }
    .pipe-h p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }

    /* The chain scrolls inside itself rather than widening the page — this has to survive an iframe. */
    .chain { display: flex; gap: 0; padding: 4px 18px 16px; overflow-x: auto; }
    .step { flex: 1 0 auto; min-width: 108px; max-width: 190px; position: relative; padding: 2px 5px; }
    .step + .step::before { content: "→"; position: absolute; left: -6px; top: 26px;
      color: var(--text-muted); font-size: 12px; }
    .box { border: 1px solid var(--border); background: var(--bg-primary); border-radius: 9px;
      padding: 9px 10px; height: 100%; }
    .step.cond .box { border-style: dashed; }
    .step.dim .box { opacity: .42; }
    /* The extraction mode marks the steps it actually runs: an accent border + faint tint, so the live
       path stands out from the dimmed ones at a glance. */
    .step.active .box { border-color: var(--accent);
      box-shadow: inset 0 0 0 1px var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--bg-primary)); }
    .nm { font-size: 12px; font-weight: 620; display: flex; align-items: center; gap: 6px; }
    /* The actor is the model, the dot is the state — kept visually separate on purpose. */
    .actor { font-size: 10.5px; color: var(--text-muted); margin-top: 3px;
      font-family: var(--font-mono, monospace); overflow-wrap: anywhere; }
    .actor a { color: var(--text-secondary); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
    .actor a.infra { text-decoration-style: dotted; }

    .knobs { border-top: 1px solid var(--border-muted); padding: 14px 18px; }
    .knobs-h { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;
      color: var(--text-muted); margin-bottom: 10px; }
    .modeseg { display: inline-flex; background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: 9px; padding: 3px; gap: 2px; flex-wrap: wrap; }
    .modeseg button { border: 0; background: transparent; color: var(--text-secondary); font: inherit;
      font-size: 12.5px; font-weight: 600; padding: 6px 13px; border-radius: 6px; cursor: pointer; }
    .modeseg button.on { background: var(--accent); color: var(--accent-text, #0d1117); }
    .modeseg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .modedesc { font-size: 12.5px; color: var(--text-secondary); margin: 11px 0 0; }
    .modedesc ::ng-deep b { color: var(--text-primary); }

    .ceiling { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12.5px;
      color: var(--text-secondary); margin-bottom: 9px; }
    .ceiling:last-child { margin-bottom: 0; }
    .ceiling > label { min-width: 108px; font-weight: 500; }
    /* The global select rule sets width:100%, which would take the whole row and wrap the label above
       it — these read as a labelled row, not a stack of full-width fields. */
    .ceiling select { background: var(--bg-primary); color: var(--text-primary); font-size: 13px;
      border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px;
      width: auto; min-width: 190px; max-width: 260px; }
    .ceiling select:disabled { opacity: .6; cursor: not-allowed; }
    .ceiling-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 11px; max-width: 70ch; }
    /* Not a warning box: choosing "off" is legitimate. It states the blast radius, which is easy to
       miss when the control sits next to three that only affect thoroughness. */
    .ceiling-warn { color: var(--warning); font-size: 11.5px; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px 16px; margin-top: 14px; }
    .field > label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }
    .field input { width: 100%; background: var(--bg-primary); color: var(--text-primary);
      border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    .field input:disabled { opacity: .6; cursor: not-allowed; }
    .warnline { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px;
      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }
    .warnline ph-icon { flex: none; margin-top: 1px; }
    .statuswarn { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 12px;
      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--border); background: var(--bg-surface);
      color: var(--text-secondary); }
  `],
  template: `
    @if (pipeline.error(); as e) {
      <!-- A failed status fetch must not read as "everything is off" — say which it is. -->
      <div class="statuswarn">
        <ph-icon name="warning" [size]="15"/>
        <span>{{ 'models.pipelines.statusUnavailable' | transloco: { detail: e } }}</span>
      </div>
    }

    <!-- ── Documents ──────────────────────────────────────────────────── -->
    <section class="pipe-card">
      <header class="pipe-h">
        <span class="ic"><ph-icon name="file" [size]="17"/></span>
        <div class="t">
          <h3>{{ 'models.pipelines.documents' | transloco }}</h3>
          <p>{{ s.docSummary().key | transloco: s.docSummary().params }}</p>
        </div>
        <app-status-pill [variant]="s.docVariant()" [dot]="true">{{ s.docPillLabelKey() | transloco }}</app-status-pill>
      </header>

      <div class="chain">
        @for (st of documentSteps(); track st.key) {
          <div class="step" [class.cond]="st.conditional" [class.dim]="stepDim(st.key)" [class.active]="stepActive(st.key)">
            <div class="box">
              <div class="nm">{{ st.name | transloco }}<app-health-dot [state]="st.health" [subject]="st.name | transloco"/></div>
              <div class="actor">{{ st.actor }}</div>
            </div>
          </div>
        }
      </div>

      <div class="knobs">
        <div class="knobs-h">{{ 'models.pipelines.extractionMode' | transloco }}</div>
        <div class="modeseg" role="group" [attr.aria-label]="'models.pipelines.extractionMode' | transloco">
          @for (m of s.MODES; track m) {
            <button type="button" [class.on]="s.docMode() === m" (click)="s.setMode(m)" [disabled]="s.managed">
              {{ 'models.mode.' + m | transloco }}
            </button>
          }
        </div>
        <p class="modedesc"><b>{{ 'models.mode.' + s.docMode() | transloco }}</b> — {{ s.modeDescKey() | transloco }}</p>

        <!-- The "no vision model configured, falls back to OCR" case is already carried by the header
             pill ("OCR fallback") and the pipeline summary line, so the extra warning box was redundant
             noise — removed per owner feedback. -->

        <div class="grid">
          <div class="field">
            <label for="dp-dpi">{{ 'models.knob.renderDpi' | transloco }}</label>
            <input id="dp-dpi" type="number" min="72" max="600" [(ngModel)]="s.form.documentProcessing!.renderDpi" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-maxpages">{{ 'models.knob.maxPages' | transloco }}</label>
            <input id="dp-maxpages" type="number" min="1" max="2000" [(ngModel)]="s.form.documentProcessing!.maxPages" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-pagetimeout">{{ 'models.knob.pageTimeout' | transloco }}</label>
            <input id="dp-pagetimeout" type="number" min="1000" max="600000" [(ngModel)]="s.form.documentProcessing!.pageTimeoutMs" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-concurrency">{{ 'models.knob.pageConcurrency' | transloco }}</label>
            <input id="dp-concurrency" type="number" min="1" max="8" [(ngModel)]="s.form.documentProcessing!.concurrency" [disabled]="s.managed" />
          </div>
          <div class="field">
            <label for="dp-ocrtimeout">{{ 'models.knob.ocrTimeout' | transloco }}</label>
            <input id="dp-ocrtimeout" type="number" min="10000" max="1800000" [(ngModel)]="s.form.documentProcessing!.ocrTimeoutMs" [disabled]="s.managed" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Images / Audio & video / Text ──────────────────────────────── -->
    @for (p of mediaPipelines(); track p.id) {
      <section class="pipe-card">
        <header class="pipe-h">
          <span class="ic"><ph-icon [name]="p.icon" [size]="17"/></span>
          <div class="t">
            <h3>{{ p.title | transloco }}</h3>
            <p>{{ p.purpose | transloco }}</p>
          </div>
        </header>

        <div class="chain">
          @for (st of p.steps; track st.key) {
            <div class="step" [class.cond]="st.conditional">
              <div class="box">
                <div class="nm">{{ st.name | transloco }}<app-health-dot [state]="st.health" [subject]="st.name | transloco"/></div>
                <div class="actor">{{ st.actor }}</div>
              </div>
            </div>
          }
        </div>

        <div class="knobs">
          <div class="knobs-h">{{ 'models.pipelines.ceiling' | transloco }}</div>
          <p class="ceiling-hint">{{ 'models.pipelines.ceilingHint' | transloco }}</p>
          @for (c of p.ceilings; track c.cls) {
            <div class="ceiling">
              <label [attr.for]="p.ceilings.length > 1 ? 'ceiling-' + c.cls : null">{{ 'models.class.' + c.cls | transloco }}</label>
              @if (p.ceilings.length === 1) {
                <!-- Single-class pipelines (Images, Text) use the same segmented buttons as the document
                     extraction mode, so every pipeline's primary control reads the same way. Audio keeps
                     a select because it carries two ladders (audio + video) side by side. -->
                <div class="modeseg" role="group" [attr.aria-label]="'models.class.' + c.cls | transloco">
                  @for (rung of c.ladder; track rung) {
                    <button type="button" [class.on]="ceilingOf(c.cls) === rung" (click)="setCeiling(c.cls, rung)"
                      [disabled]="s.isLocked('levels.' + c.cls) || s.managed">
                      {{ 'models.level.' + rung | transloco }}
                    </button>
                  }
                </div>
              } @else {
                <select [attr.id]="'ceiling-' + c.cls" [ngModel]="ceilingOf(c.cls)"
                  (ngModelChange)="setCeiling(c.cls, $any($event))" [disabled]="s.isLocked('levels.' + c.cls) || s.managed"
                  [name]="'ceiling-' + c.cls">
                  @for (rung of c.ladder; track rung) {
                    <!-- Video "full" is reserved and not built. Rendered disabled rather than omitted
                         so the ladder reads complete — and the server rejects it either way. -->
                    <option [value]="rung" [disabled]="c.cls === 'video' && rung === 'full'">
                      {{ 'models.level.' + rung | transloco }}{{ c.cls === 'video' && rung === 'full' ? notYet : '' }}
                    </option>
                  }
                </select>
              }
              @if (s.isLocked('levels.' + c.cls)) { <app-status-pill variant="env">{{ 'models.pill.env' | transloco }}</app-status-pill> }
              @if (ceilingOf(c.cls) === 'off') {
                <!-- "off" is a floor as well as a ceiling: it takes the class offline for every space,
                     whatever that space asked for. Worth saying where it is chosen, not in a doc. -->
                <span class="ceiling-warn">{{ 'models.pipelines.ceilingOffWarning' | transloco }}</span>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class PipelinesTabComponent {
  readonly s = inject(ModelsStateService);
  readonly pipeline = inject(PipelineStatusService);

  /** Which document stages the current mode actually runs — dims the rest rather than hiding them. */
  activeStages = computed(() => MODE_STAGES[this.s.docMode()]);

  /**
   * Whether a step is drawn as not-running.
   *
   * `MODE_STAGES` only describes the six EXTRACTION stages, so it cannot be consulted directly: a step
   * outside that vocabulary — Embed, which always runs on whatever text comes out — is absent from
   * every set and would be dimmed under every mode, saying the brain never gets the document. Steps
   * the mode does not govern are only dimmed when the whole pipeline is off.
   */
  stepDim(key: string): boolean {
    if (this.s.docMode() === 'off') return true;          // nothing in this pipeline runs at all
    if (!MODE_STAGES['auto'].has(key)) return false;      // not a mode-governed stage
    return !this.activeStages().has(key);
  }

  /**
   * Whether a step is on the path the current extraction mode actually runs — the inverse of dim while
   * the pipeline is on. Used to mark (border) the live steps in the viz so the chosen mode reads at a
   * glance; when the pipeline is off, nothing is marked.
   */
  stepActive(key: string): boolean {
    return this.s.docMode() !== 'off' && !this.stepDim(key);
  }

  private notSet = '—';

  /** Suffix on the reserved video rung. A disabled option with no explanation reads as a bug. */
  readonly notYet = ' — not built yet';

  /** The stored ceiling for a class, defaulting to `auto` (no policy limit of its own). */
  ceilingOf(cls: MediaClass): string { return (this.s.form.levels ?? {})[cls] ?? 'auto'; }

  /**
   * Set one class's ceiling. Writes only that class, mirroring the server's per-class merge — the
   * whole `levels` block is sent on save, so replacing the object here would be harmless, but keeping
   * the two sides shaped the same way is what stops them drifting apart later.
   */
  setCeiling(cls: MediaClass, value: string): void {
    this.s.form.levels = { ...(this.s.form.levels ?? {}), [cls]: value };
    this.s.touched.set(true);
  }

  documentSteps = computed<Step[]>(() => {
    const doc = this.s.docCfg();
    const ps = this.pipeline;
    return [
      { key: 'ocr', name: 'models.step.ocr', actor: 'Tesseract', health: ps.sidecarState('unstructured'), conditional: false, cardId: 'unstructured' },
      { key: 'render', name: 'models.step.render', actor: 'doc-render', health: ps.sidecarState('doc-render'), conditional: true, cardId: 'doc-render' },
      { key: 'vlm', name: 'models.step.vlm', actor: doc.vlmModel || this.notSet, health: ps.modelState('doc-vlm'), conditional: true, cardId: 'vision' },
      // Validate is pure in-process arithmetic (does the VLM output cover the OCR text?), so it has no
      // endpoint and therefore no dot to report — undefined health, not a green one it has not earned.
      { key: 'validate', name: 'models.step.validate', actor: 'in-process', health: null, conditional: true },
      { key: 'repair', name: 'models.step.repair', actor: doc.repairModel || doc.vlmModel || this.notSet, health: ps.modelState('doc-repair'), conditional: true, cardId: 'assist' },
      { key: 'verify', name: 'models.step.verify', actor: doc.verifyModel || this.notSet, health: ps.modelState('doc-verify'), conditional: true, cardId: 'vision' },
      { key: 'embed', name: 'models.step.embed', actor: this.s.embedding.model || this.notSet, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
    ];
  });

  mediaPipelines = computed(() => {
    const ps = this.pipeline;
    const embedModel = this.s.embedding.model || this.notSet;
    return [
      {
        id: 'images', icon: 'image', title: 'models.pipelines.images', purpose: 'models.pipelines.imagesPurpose',
        ceilings: [{ cls: 'images' as MediaClass, ladder: IMAGE_LEVELS }],
        steps: [
          { key: 'caption', name: 'models.step.caption', actor: this.s.form.vision?.model || this.notSet, health: ps.modelState('vision'), conditional: false, cardId: 'vision' },
          { key: 'img-embed', name: 'models.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
          // Only at the `recognition` rung, and only when faceRecognition is enabled — genuinely conditional.
          { key: 'faces', name: 'models.step.faces', actor: 'BlazeFace + FaceRes', health: ps.status()?.faceRecognition.state ?? null, conditional: true, cardId: 'face' },
        ] as Step[],
      },
      {
        id: 'audio', icon: 'microphone', title: 'models.pipelines.audio', purpose: 'models.pipelines.audioPurpose',
        // This card covers TWO classes: audio files and video files have separate ladders.
        ceilings: [{ cls: 'audio' as MediaClass, ladder: AUDIO_LEVELS }, { cls: 'video' as MediaClass, ladder: VIDEO_LEVELS }],
        steps: [
          // Video only: audio files skip straight to transcription.
          { key: 'split', name: 'models.step.split', actor: 'ffmpeg', health: null, conditional: true },
          { key: 'transcribe', name: 'models.step.transcribe', actor: this.s.form.stt?.model || this.notSet, health: ps.modelState('stt'), conditional: false, cardId: 'stt' },
          { key: 'aud-embed', name: 'models.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
        ] as Step[],
      },
      {
        id: 'text', icon: 'text-align-left', title: 'models.pipelines.text', purpose: 'models.pipelines.textPurpose',
        ceilings: [{ cls: 'text' as MediaClass, ladder: TEXT_LEVELS }],
        steps: [
          // Chunking only happens at the `chunk` rung; `embed` produces one vector for the whole document.
          { key: 'chunk', name: 'models.step.chunk', actor: 'text chunker', health: null, conditional: true },
          { key: 'txt-embed', name: 'models.step.embed', actor: embedModel, health: ps.modelState('embedding'), conditional: false, cardId: 'embedding' },
        ] as Step[],
      },
    ];
  });
}
