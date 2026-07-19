import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent, StatusVariant } from '../../shared/status-pill.component';

interface ProviderCfg { label?: string; baseUrl?: string; model?: string; apiKey?: string; }

type DocMode = 'ocr' | 'vlm' | 'auto' | 'max';
interface DocProcCfg {
  mode?: DocMode;
  renderDpi?: number; maxPages?: number; pageTimeoutMs?: number; concurrency?: number;
  // read-only (env/config-file only — never PATCHed from here)
  vlmModel?: string; vlmBaseUrl?: string; repairModel?: string; repairBaseUrl?: string;
}

interface MediaCfg {
  enabled?: boolean;
  visionProvider?: 'local' | 'external';
  sttProvider?: 'local' | 'external';
  vision?: ProviderCfg;
  stt?: ProviderCfg;
  documentProcessing?: DocProcCfg;
  workerConcurrency?: number;
  fallbackToExternal?: boolean;
  maxFileSizeBytes?: number;
  lockedByInfra?: string[];
}

const MODE_DESC: Record<DocMode, string> = {
  ocr:  'The OCR sidecar (Tesseract) reads text and tables from each page. Fast, fully local, no vision model needed.',
  vlm:  'Render each page and transcribe it with the vision model, grounded on the OCR text.',
  auto: 'Use the vision model when it’s available, otherwise fall back to OCR automatically.',
  max:  'VLM plus a repair pass that reconciles the draft against the OCR text before accepting.',
};
// Which pipeline stages are active per mode (drives the diagram).
const MODE_STAGES: Record<DocMode, Set<string>> = {
  ocr:  new Set(['ocr']),
  vlm:  new Set(['ocr', 'render', 'vlm', 'validate']),
  auto: new Set(['ocr', 'render', 'vlm', 'validate']),
  max:  new Set(['ocr', 'render', 'vlm', 'validate', 'repair']),
};
const STAGES = [
  { key: 'ocr', nm: 'OCR', sub: 'evidence' },
  { key: 'render', nm: 'Render', sub: 'page → PNG' },
  { key: 'vlm', nm: 'VLM', sub: 'vision' },
  { key: 'validate', nm: 'Validate', sub: 'coverage' },
  { key: 'repair', nm: 'Repair', sub: 'reconcile' },
];

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, SettingsCardComponent, StatusPillComponent],
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 18px; }
    /* Responsive card grid — fills horizontal space instead of one narrow column. */
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; align-items: start; }
    .cards > .span-all { grid-column: 1 / -1; }
    .field { margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    .field > label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }
    .field input, .field select { width: 100%; background: var(--bg-primary); color: var(--text-primary);
      border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    .field input[data-mono] { font-family: var(--font-mono, monospace); font-size: 12.5px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
    .hint { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }
    .locked { margin-left: 6px; }

    /* what-runs summary */
    .runs { border: 1px solid var(--border); border-radius: 10px;
      background: linear-gradient(180deg, var(--bg-surface), var(--bg-primary)); overflow: hidden; margin-bottom: 20px; }
    .runs-h { padding: 10px 16px 8px; color: var(--text-muted); font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .07em; }
    .run-row { display: grid; grid-template-columns: 130px 1fr auto; align-items: center; gap: 12px;
      padding: 11px 16px; border-top: 1px solid var(--border-muted); font-size: 13px; }
    .run-row .cap { display: flex; align-items: center; gap: 8px; font-weight: 550; }
    .run-row .cap ph-icon { color: var(--text-secondary); }
    .run-row .desc { color: var(--text-secondary); }
    .run-row code { font-family: var(--font-mono, monospace); font-size: 12px; color: var(--text-primary);
      background: var(--bg-elevated); padding: 1px 6px; border-radius: 5px; }
    @media (max-width: 620px) { .run-row { grid-template-columns: 1fr auto; } .run-row .desc { grid-column: 1 / -1; } .grid2 { grid-template-columns: 1fr; } }

    /* master toggle in header */
    .master { display: flex; align-items: center; gap: 10px; font-size: 13px; }

    /* provider segmented is a plain select here; mode uses a segmented control */
    .modeseg { display: inline-flex; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 9px; padding: 3px; gap: 2px; flex-wrap: wrap; }
    .modeseg button { border: 0; background: transparent; color: var(--text-secondary); font: inherit; font-size: 13px;
      font-weight: 600; padding: 7px 15px; border-radius: 6px; cursor: pointer; }
    .modeseg button.on { background: var(--accent); color: var(--accent-text, #0d1117); }
    .modeseg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .modedesc { font-size: 12.5px; color: var(--text-secondary); margin: 12px 0 2px; min-height: 18px; }
    .modedesc b { color: var(--text-primary); }

    .pipe { display: flex; gap: 0; margin: 14px 0 4px; overflow-x: auto; padding-bottom: 2px; }
    .stage { flex: 1; min-width: 92px; text-align: center; position: relative; padding: 2px 4px; }
    .stage .box { border: 1px solid var(--border); background: var(--bg-primary); border-radius: 9px; padding: 9px 6px; }
    .stage .nm { font-size: 12px; font-weight: 600; }
    .stage .sub { font-size: 10px; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono, monospace); }
    .stage.on .box { border-color: var(--accent); background: rgba(206,255,128,.12); }
    .stage.on .nm { color: var(--accent); }
    .stage.dim .box { opacity: .4; }
    .stage.warn .box { border-color: var(--warning); background: rgba(210,153,34,.14); }
    .stage.warn .nm { color: var(--warning); }
    .stage + .stage::before { content: "→"; position: absolute; left: -7px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px; }

    .runline { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 10px 12px; border-radius: 9px;
      background: var(--bg-primary); border: 1px solid var(--border); font-size: 12.5px; }
    .runline.warn { border-color: rgba(210,153,34,.4); background: rgba(210,153,34,.14); }
    .runline ph-icon { flex: none; }

    .envrow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .envchip { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono, monospace); font-size: 12px;
      background: var(--bg-primary); border: 1px solid var(--border); border-radius: 7px; padding: 5px 9px; color: var(--text-primary); }
    .envchip .lbl { font-family: inherit; font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
    .envchip.empty { color: var(--text-muted); }

    details.adv { margin-top: 6px; border-top: 1px dashed var(--border-muted); padding-top: 6px; }
    details.adv > summary { cursor: pointer; list-style: none; color: var(--text-secondary); font-size: 12.5px; font-weight: 550; padding: 8px 0 4px; }
    details.adv > summary::-webkit-details-marker { display: none; }

    .actions { display: flex; gap: 10px; align-items: center; margin-top: 20px; }
    .save-error { color: var(--error); font-size: 13px; }
    .save-ok { color: var(--success); font-size: 13px; }
  `],
  template: `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
      <div>
        <div class="card-title">Models &amp; Media</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;max-width:52ch;">
          Configure the local AI providers that caption images, transcribe audio, and read documents. Changes apply live.
        </div>
      </div>
      <label class="master">
        <input type="checkbox" [(ngModel)]="form.enabled" [disabled]="isLocked('enabled')" />
        Media embedding
        @if (isLocked('enabled')) { <app-status-pill variant="env" class="locked">env</app-status-pill> }
      </label>
    </div>

    @if (loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (loadError()) {
      <div class="alert alert-error">{{ loadError() }}</div>
    } @else {
      <!-- What runs on upload -->
      <section class="runs" aria-label="What runs on upload">
        <div class="runs-h">What happens when someone uploads a file</div>
        <div class="run-row">
          <span class="cap"><ph-icon name="image" [size]="16"/> Images</span>
          <span class="desc">Captioned by <code>{{ form.vision?.model || 'not set' }}</code> ({{ form.visionProvider === 'external' ? 'external' : 'local' }})</span>
          <app-status-pill [variant]="capVariant(form.vision?.model)" [dot]="true">{{ capLabel(form.vision?.model) }}</app-status-pill>
        </div>
        <div class="run-row">
          <span class="cap"><ph-icon name="microphone" [size]="16"/> Audio &amp; video</span>
          <span class="desc">Transcribed by <code>{{ form.stt?.model || 'not set' }}</code> ({{ form.sttProvider === 'external' ? 'external' : 'local' }})</span>
          <app-status-pill [variant]="capVariant(form.stt?.model)" [dot]="true">{{ capLabel(form.stt?.model) }}</app-status-pill>
        </div>
        <div class="run-row">
          <span class="cap"><ph-icon name="file" [size]="16"/> Documents</span>
          <span class="desc">{{ docSummary() }}</span>
          <app-status-pill [variant]="docVariant()" [dot]="true">{{ docPillLabel() }}</app-status-pill>
        </div>
      </section>

      <div class="cards">
        <!-- Vision -->
        <app-settings-card icon="image" heading="Vision — image captioning" purpose="Describes uploaded images and indexes faces for search.">
          <app-status-pill pill [variant]="form.enabled ? 'active' : 'off'">{{ form.visionProvider === 'external' ? 'External' : 'Local · Ollama' }}</app-status-pill>
          <div class="field">
            <label>Provider @if (isLocked('visionProvider')) { <app-status-pill variant="env">env</app-status-pill> }</label>
            <select [(ngModel)]="form.visionProvider" [disabled]="isLocked('visionProvider')">
              <option value="local">Local (Ollama)</option>
              <option value="external">External (OpenAI-compatible)</option>
            </select>
          </div>
          <div class="grid2">
            <div class="field"><label>Model</label><input data-mono [(ngModel)]="form.vision!.model" [disabled]="isLocked('vision.model')" placeholder="moondream" /></div>
            <div class="field"><label>Endpoint</label><input data-mono type="url" [(ngModel)]="form.vision!.baseUrl" [disabled]="isLocked('vision.baseUrl')" placeholder="http://ollama:11434" /></div>
          </div>
          <details class="adv">
            <summary>Advanced</summary>
            <div class="field"><label>API key (external only)</label><input type="password" [(ngModel)]="visionApiKeyInput" [disabled]="isLocked('vision.apiKey')" placeholder="Leave blank to keep current" /></div>
          </details>
        </app-settings-card>

        <!-- STT -->
        <app-settings-card icon="microphone" heading="Speech-to-Text — audio &amp; video" purpose="Transcribes uploaded media so it's searchable and embeddable.">
          <app-status-pill pill [variant]="form.enabled ? 'active' : 'off'">{{ form.sttProvider === 'external' ? 'External' : 'Local · Whisper' }}</app-status-pill>
          <div class="field">
            <label>Provider @if (isLocked('sttProvider')) { <app-status-pill variant="env">env</app-status-pill> }</label>
            <select [(ngModel)]="form.sttProvider" [disabled]="isLocked('sttProvider')">
              <option value="local">Local (faster-whisper)</option>
              <option value="external">External (OpenAI-compatible)</option>
            </select>
          </div>
          <div class="grid2">
            <div class="field"><label>Model</label><input data-mono [(ngModel)]="form.stt!.model" [disabled]="isLocked('stt.model')" placeholder="base" /></div>
            <div class="field"><label>Endpoint</label><input data-mono type="url" [(ngModel)]="form.stt!.baseUrl" [disabled]="isLocked('stt.baseUrl')" placeholder="http://whisper:8000" /></div>
          </div>
          <details class="adv">
            <summary>Advanced</summary>
            <div class="field"><label>API key (external only)</label><input type="password" [(ngModel)]="sttApiKeyInput" [disabled]="isLocked('stt.apiKey')" placeholder="Leave blank to keep current" /></div>
          </details>
        </app-settings-card>

        <!-- Document extraction (F11) -->
        <app-settings-card class="span-all" icon="file" heading="Document Extraction" purpose="How PDFs, Word docs, and EPUBs are turned into text for the brain.">
          <div class="field" style="margin-bottom:0;">
            <label>Extraction mode</label>
            <div class="modeseg" role="group" aria-label="Extraction mode">
              @for (m of MODES; track m) {
                <button type="button" [class.on]="docMode() === m" (click)="setMode(m)">{{ m.toUpperCase() }}</button>
              }
            </div>
            <p class="modedesc" [innerHTML]="modeDescHtml()"></p>
          </div>

          <div class="pipe" aria-hidden="true">
            @for (s of STAGES; track s.key) {
              <div class="stage" [class]="stageClass(s.key)"><div class="box"><div class="nm">{{ s.nm }}</div><div class="sub">{{ s.sub }}</div></div></div>
            }
          </div>

          <div class="runline" [class.warn]="vlmNeededButMissing()">
            <ph-icon [name]="vlmNeededButMissing() ? 'warning' : 'check'" [size]="15"/>
            <span>{{ runLine() }}</span>
          </div>

          <div class="envrow">
            <span class="envchip" [class.empty]="!docCfg().vlmModel"><span class="lbl">vision model</span>{{ docCfg().vlmModel || '— not set' }}</span>
            <span class="envchip" [class.empty]="!docCfg().repairModel"><span class="lbl">repair model</span>{{ docCfg().repairModel || 'reuses vision' }}</span>
          </div>
          <p class="hint">Model &amp; endpoint values are set via environment (<code style="font-family:var(--font-mono,monospace)">DOC_VLM_MODEL</code>, <code style="font-family:var(--font-mono,monospace)">DOC_REPAIR_MODEL</code>) and shown read-only — they're egress targets, deliberately kept out of the web API.</p>

          <details class="adv">
            <summary>Advanced — rendering &amp; limits</summary>
            <div class="grid2">
              <div class="field"><label>Render DPI</label><input type="number" min="72" max="600" [(ngModel)]="form.documentProcessing!.renderDpi" /></div>
              <div class="field"><label>Max pages per document</label><input type="number" min="1" max="2000" [(ngModel)]="form.documentProcessing!.maxPages" /></div>
              <div class="field"><label>Per-page timeout (ms)</label><input type="number" min="1000" max="600000" [(ngModel)]="form.documentProcessing!.pageTimeoutMs" /></div>
              <div class="field"><label>Page concurrency</label><input type="number" min="1" max="8" [(ngModel)]="form.documentProcessing!.concurrency" /></div>
            </div>
          </details>
        </app-settings-card>

        <!-- Advanced worker -->
        <app-settings-card icon="gear" heading="Advanced" purpose="Worker and upload limits for the media pipeline.">
          <div class="grid2">
            <div class="field"><label>Max file size for embedding (bytes)</label><input type="number" min="1" [(ngModel)]="form.maxFileSizeBytes" [disabled]="isLocked('maxFileSizeBytes')" /></div>
            <div class="field"><label>Worker concurrency</label><input type="number" min="1" max="16" [(ngModel)]="form.workerConcurrency" [disabled]="isLocked('workerConcurrency')" /></div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);">
            <input type="checkbox" [(ngModel)]="form.fallbackToExternal" [disabled]="isLocked('fallbackToExternal')" /> Fall back to external provider on local error
          </label>
        </app-settings-card>
      </div>

      <div class="actions">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
        </button>
        <span class="save-error">{{ saveError() }}</span>
        <span class="save-ok">{{ saveOk() }}</span>
      </div>
    }
  `,
})
export class ModelsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly MODES: DocMode[] = ['ocr', 'vlm', 'auto', 'max'];
  readonly STAGES = STAGES;

  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  saveError = signal('');
  saveOk = signal('');

  form: MediaCfg = { vision: {}, stt: {}, documentProcessing: {} };
  lockedByInfra: string[] = [];
  visionApiKeyInput = '';
  sttApiKeyInput = '';

  /** The loaded doc-processing config (read-only fields like vlmModel live here). */
  private docCfgSig = signal<DocProcCfg>({});
  docCfg = computed(() => this.docCfgSig());
  docMode = signal<DocMode>('ocr');

  ngOnInit(): void {
    this.http.get<MediaCfg>('/api/admin/media-config').subscribe({
      next: cfg => {
        this.lockedByInfra = cfg.lockedByInfra ?? [];
        const dp: DocProcCfg = { mode: 'auto', renderDpi: 150, maxPages: 50, pageTimeoutMs: 60000, concurrency: 2, ...cfg.documentProcessing };
        this.form = { vision: {}, stt: {}, ...cfg, documentProcessing: dp };
        this.form.vision = { ...cfg.vision, apiKey: undefined };
        this.form.stt = { ...cfg.stt, apiKey: undefined };
        this.docCfgSig.set(dp);
        this.docMode.set(dp.mode ?? 'ocr');
        this.loading.set(false);
      },
      error: err => { this.loadError.set(`Failed to load configuration: ${err?.message ?? 'Unknown error'}`); this.loading.set(false); },
    });
  }

  isLocked(field: string): boolean { return this.lockedByInfra.includes(field); }

  // ── document extraction helpers ──
  setMode(m: DocMode): void { this.docMode.set(m); if (this.form.documentProcessing) this.form.documentProcessing.mode = m; }
  private vlmConfigured(): boolean { return !!this.docCfg().vlmModel; }
  vlmNeededButMissing(): boolean { return this.docMode() !== 'ocr' && !this.vlmConfigured(); }
  modeDescHtml(): string { return `<b>${this.docMode().toUpperCase()}</b> — ${MODE_DESC[this.docMode()]}`; }
  stageClass(key: string): string {
    if (!MODE_STAGES[this.docMode()].has(key)) return 'dim';
    if (this.vlmNeededButMissing() && (key === 'render' || key === 'vlm' || key === 'repair')) return 'warn';
    return 'on';
  }
  runLine(): string {
    if (this.vlmNeededButMissing()) return 'No vision model configured (DOC_VLM_MODEL is empty) — this mode falls back to OCR until you set one.';
    return this.docMode() === 'ocr'
      ? 'OCR only — text and tables are read by the OCR sidecar. No page rendering or vision model.'
      : 'Never worse than OCR — the VLM output is only kept if it covers the OCR text.';
  }
  docSummary(): string {
    const m = this.docMode();
    if (m === 'ocr') return 'Read by OCR only';
    if (this.vlmNeededButMissing()) return `Mode is ${m.toUpperCase()}, but no vision model — falls back to OCR`;
    const model = this.docCfg().vlmModel;
    return `Read by ${m.toUpperCase()} — OCR-grounded ${model} vision${m === 'max' ? ', repaired against OCR' : ''}`;
  }
  docPillLabel(): string { return this.vlmNeededButMissing() ? 'OCR fallback' : 'Active'; }
  docVariant(): StatusVariant { return this.vlmNeededButMissing() ? 'warn' : 'active'; }

  // ── summary pill helpers for vision/stt ──
  capVariant(model?: string): StatusVariant { return this.form.enabled ? (model ? 'active' : 'warn') : 'off'; }
  capLabel(model?: string): string { return !this.form.enabled ? 'Off' : (model ? 'Active' : 'No model'); }

  save(): void {
    this.saving.set(true);
    this.saveError.set('');
    this.saveOk.set('');
    const dp = this.form.documentProcessing ?? {};
    const payload: MediaCfg = {
      enabled: this.form.enabled,
      visionProvider: this.form.visionProvider,
      sttProvider: this.form.sttProvider,
      vision: { baseUrl: this.form.vision?.baseUrl, model: this.form.vision?.model, ...(this.visionApiKeyInput ? { apiKey: this.visionApiKeyInput } : {}) },
      stt: { baseUrl: this.form.stt?.baseUrl, model: this.form.stt?.model, ...(this.sttApiKeyInput ? { apiKey: this.sttApiKeyInput } : {}) },
      // Only the PATCH-writable doc fields (vlmModel/repairModel/URLs are env-only, never sent).
      documentProcessing: { mode: dp.mode, renderDpi: dp.renderDpi, maxPages: dp.maxPages, pageTimeoutMs: dp.pageTimeoutMs, concurrency: dp.concurrency },
      fallbackToExternal: this.form.fallbackToExternal,
      maxFileSizeBytes: this.form.maxFileSizeBytes,
      workerConcurrency: this.form.workerConcurrency,
    };
    const body = JSON.parse(JSON.stringify(payload)) as MediaCfg;
    this.http.patch<{ ok: boolean; config: MediaCfg }>('/api/admin/media-config', body).subscribe({
      next: () => {
        this.saveOk.set('Saved');
        this.visionApiKeyInput = '';
        this.sttApiKeyInput = '';
        this.saving.set(false);
        setTimeout(() => this.saveOk.set(''), 3000);
      },
      error: err => { this.saveError.set(`Save failed: ${err?.error?.error ?? err?.message ?? 'Unknown error'}`); this.saving.set(false); },
    });
  }
}
