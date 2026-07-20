import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent, StatusVariant } from '../../shared/status-pill.component';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

interface ProviderCfg { label?: string; baseUrl?: string; model?: string; apiKey?: string; }

/** F11-PR5b — result of probing a model endpoint (reachability + whether the model is present). */
interface TestResult {
  ok: boolean; reachable: boolean; status?: number; models?: string[];
  modelPresent?: boolean; detail?: string; latencyMs: number;
}
type TestTarget = 'vision' | 'stt' | 'assist' | 'embedding';

/** Text-embedding config (top-level config.embedding, surfaced on this page). Changing model/dimensions/
 *  similarity re-indexes every vector — the save gates those behind an explicit confirmation. */
interface EmbeddingCfg {
  provider?: 'local' | 'external';
  baseUrl?: string | null; model?: string; dimensions?: number;
  similarity?: 'cosine' | 'dotProduct' | 'euclidean';
  apiKey?: string;
}

type DocMode = 'ocr' | 'vlm' | 'auto' | 'max';
type DocAssistUse = 'repair';
/** F11-b — external "assist model": a bigger, hosted LLM (own endpoint) assigned to specific tasks. The
 *  only path that sends document content off the instance, so it's gated by an egress acknowledgment. */
interface DocAssistCfg {
  baseUrl?: string; model?: string; apiKey?: string; uses?: DocAssistUse[]; acknowledgedHost?: string;
}
interface DocProcCfg {
  mode?: DocMode;
  renderDpi?: number; maxPages?: number; pageTimeoutMs?: number; concurrency?: number; ocrTimeoutMs?: number;
  // read-only (env/config-file only — never PATCHed from here)
  vlmModel?: string; vlmBaseUrl?: string; repairModel?: string; repairBaseUrl?: string;
  verifyModel?: string; verifyBaseUrl?: string;
  assistModel?: DocAssistCfg;
}

interface MediaCfg {
  enabled?: boolean;
  visionProvider?: 'local' | 'external';
  sttProvider?: 'local' | 'external';
  vision?: ProviderCfg;
  stt?: ProviderCfg;
  embedding?: EmbeddingCfg;
  documentProcessing?: DocProcCfg;
  workerConcurrency?: number;
  fallbackToExternal?: boolean;
  maxFileSizeBytes?: number;
  lockedByInfra?: string[];
  infraManaged?: boolean;
}

const MODE_DESC: Record<DocMode, string> = {
  ocr:  'The OCR sidecar (Tesseract) reads text and tables from each page. Fast, fully local, no vision model needed.',
  vlm:  'Render each page and transcribe it with the vision model, grounded on the OCR text.',
  auto: 'Use the vision model when it’s available, otherwise fall back to OCR automatically.',
  max:  'VLM, a repair pass that reconciles the draft against the OCR text, plus an optional second-model consensus pass when a verify model is set.',
};
// Which pipeline stages are active per mode (drives the diagram).
const MODE_STAGES: Record<DocMode, Set<string>> = {
  ocr:  new Set(['ocr']),
  vlm:  new Set(['ocr', 'render', 'vlm', 'validate']),
  auto: new Set(['ocr', 'render', 'vlm', 'validate']),
  max:  new Set(['ocr', 'render', 'vlm', 'validate', 'repair', 'verify']),
};
const STAGES = [
  { key: 'ocr', nm: 'OCR', sub: 'evidence' },
  { key: 'render', nm: 'Render', sub: 'page → PNG' },
  { key: 'vlm', nm: 'VLM', sub: 'vision' },
  { key: 'validate', nm: 'Validate', sub: 'coverage' },
  { key: 'repair', nm: 'Repair', sub: 'reconcile' },
  { key: 'verify', nm: 'Verify', sub: 'consensus' },
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

    .managed-banner { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding: 11px 14px;
      border-radius: 10px; background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.35);
      font-size: 13px; color: var(--text-secondary); }
    .managed-banner code { font-family: var(--font-mono, monospace); }
    .managed-banner b { color: var(--text-primary); }
    .managed-banner ph-icon { flex: none; }
    .testrow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
    .testrow .hint { margin: 0; }
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
      @if (managed) {
        <div class="managed-banner">
          <ph-icon name="lock" [size]="16"/>
          <span>These models are <b>managed by infrastructure</b> on this instance — settings are read-only. Change them in <code>config.json</code> or the environment. You can still <b>Test connection</b> below.</span>
        </div>
      }
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
        <!-- Text embedding -->
        <app-settings-card class="span-all" icon="database" heading="Text embedding — semantic recall"
          purpose="Turns text into the vectors that power semantic search across every space.">
          <app-status-pill pill [variant]="embedding.provider === 'external' ? 'active' : 'ok'">
            {{ embedding.provider === 'external' ? 'External' : (embedding.baseUrl ? 'Local · HTTP' : 'Bundled · in-process') }}
          </app-status-pill>
          <div class="field">
            <label>Provider @if (embeddingLocked('provider')) { <app-status-pill variant="env">env</app-status-pill> }</label>
            <select [(ngModel)]="embedding.provider" [disabled]="embeddingLocked('provider')">
              <option value="local">Local / trusted (bundled ONNX, or an internal endpoint)</option>
              <option value="external">External (public OpenAI-compatible endpoint)</option>
            </select>
          </div>
          <div class="grid2">
            <div class="field"><label>Endpoint <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">(blank = bundled in-process model)</span></label><input data-mono type="url" [(ngModel)]="embedding.baseUrl" [disabled]="embeddingLocked('baseUrl')" placeholder="http://ollama:11434 or https://api.example.com" /></div>
            <div class="field"><label>Model</label><input data-mono [(ngModel)]="embedding.model" [disabled]="embeddingLocked('model')" placeholder="nomic-embed-text" /></div>
          </div>
          <div class="grid2">
            <div class="field"><label>Dimensions</label><input type="number" min="1" max="16384" [(ngModel)]="embedding.dimensions" [disabled]="embeddingLocked('dimensions')" /></div>
            <div class="field"><label>Similarity</label>
              <select [(ngModel)]="embedding.similarity" [disabled]="embeddingLocked('model')">
                <option value="cosine">cosine</option>
                <option value="dotProduct">dotProduct</option>
                <option value="euclidean">euclidean</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>API key (external only)</label>
            <input type="password" [(ngModel)]="embeddingApiKeyInput" [disabled]="embeddingLocked('apiKey')"
              [placeholder]="embedding.apiKey ? 'Leave blank to keep current' : 'Bearer token (optional)'" />
          </div>
          @if (embeddingNeedsReindex()) {
            <div class="runline warn" style="margin-top:4px;">
              <ph-icon name="warning" [size]="15"/>
              <span>Changing the <b>model, dimensions, or similarity</b> re-embeds <b>every vector in every space</b>. You'll confirm on save — recall is degraded until the reindex finishes.</span>
            </div>
          }
          <div class="testrow">
            <button class="btn btn-sm btn-secondary" type="button" (click)="testConnection('embedding')" [disabled]="testOf('embedding')?.loading || !embedding.baseUrl">
              {{ testOf('embedding')?.loading ? 'Testing…' : 'Test connection' }}
            </button>
            @if (testOf('embedding')?.res; as r) {
              <app-status-pill [variant]="testPillVariant(r)" [dot]="true">{{ testPillLabel(r) }}</app-status-pill>
              <span class="hint">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
            }
          </div>
        </app-settings-card>

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
          <div class="testrow">
            <button class="btn btn-sm btn-secondary" type="button" (click)="testConnection('vision')" [disabled]="testOf('vision')?.loading">
              {{ testOf('vision')?.loading ? 'Testing…' : 'Test connection' }}
            </button>
            @if (testOf('vision')?.res; as r) {
              <app-status-pill [variant]="testPillVariant(r)" [dot]="true">{{ testPillLabel(r) }}</app-status-pill>
              <span class="hint">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
            }
          </div>
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
          <div class="testrow">
            <button class="btn btn-sm btn-secondary" type="button" (click)="testConnection('stt')" [disabled]="testOf('stt')?.loading">
              {{ testOf('stt')?.loading ? 'Testing…' : 'Test connection' }}
            </button>
            @if (testOf('stt')?.res; as r) {
              <app-status-pill [variant]="testPillVariant(r)" [dot]="true">{{ testPillLabel(r) }}</app-status-pill>
              <span class="hint">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
            }
          </div>
        </app-settings-card>

        <!-- Document extraction (F11) -->
        <app-settings-card class="span-all" icon="file" heading="Document Extraction" purpose="How PDFs, Word docs, and EPUBs are turned into text for the brain.">
          <div class="field" style="margin-bottom:0;">
            <label>Extraction mode</label>
            <div class="modeseg" role="group" aria-label="Extraction mode">
              @for (m of MODES; track m) {
                <button type="button" [class.on]="docMode() === m" (click)="setMode(m)" [disabled]="managed">{{ m.toUpperCase() }}</button>
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
            <span class="envchip" [class.empty]="!docCfg().verifyModel"><span class="lbl">verify model</span>{{ docCfg().verifyModel || '— none (no consensus)' }}</span>
          </div>
          <p class="hint">Model &amp; endpoint values are set via environment (<code style="font-family:var(--font-mono,monospace)">DOC_VLM_MODEL</code>, <code style="font-family:var(--font-mono,monospace)">DOC_REPAIR_MODEL</code>, <code style="font-family:var(--font-mono,monospace)">DOC_VERIFY_MODEL</code>) and shown read-only. For a bigger <em>hosted</em> model, use the External assist model below.</p>

          <details class="adv">
            <summary>Advanced — rendering &amp; limits</summary>
            <div class="grid2">
              <div class="field"><label>Render DPI</label><input type="number" min="72" max="600" [(ngModel)]="form.documentProcessing!.renderDpi" [disabled]="managed" /></div>
              <div class="field"><label>Max pages per document</label><input type="number" min="1" max="2000" [(ngModel)]="form.documentProcessing!.maxPages" [disabled]="managed" /></div>
              <div class="field"><label>Per-page timeout (ms)</label><input type="number" min="1000" max="600000" [(ngModel)]="form.documentProcessing!.pageTimeoutMs" [disabled]="managed" /></div>
              <div class="field"><label>Page concurrency</label><input type="number" min="1" max="8" [(ngModel)]="form.documentProcessing!.concurrency" [disabled]="managed" /></div>
              <div class="field"><label>OCR timeout (ms)</label><input type="number" min="10000" max="1800000" [(ngModel)]="form.documentProcessing!.ocrTimeoutMs" [disabled]="managed" /></div>
            </div>
          </details>
        </app-settings-card>

        <!-- External assist model (F11-b) -->
        <app-settings-card class="span-all" icon="globe" heading="External assist model"
          purpose="An optional bigger, hosted model you assign to specific tasks. This is the only setting that sends document content off this instance.">
          <app-status-pill pill [variant]="assistLocked() ? 'env' : (assistUses('repair') ? 'active' : 'off')">
            {{ assistLocked() ? 'env' : (assistUses('repair') ? 'In use' : 'Not configured') }}
          </app-status-pill>
          <div class="grid2">
            <div class="field"><label>Endpoint (OpenAI-compatible)</label><input data-mono type="url" [(ngModel)]="assist.baseUrl" [disabled]="assistLocked()" placeholder="https://api.example.com" /></div>
            <div class="field"><label>Model</label><input data-mono [(ngModel)]="assist.model" [disabled]="assistLocked()" placeholder="e.g. a hosted GPT / Llama" /></div>
          </div>
          <div class="field">
            <label>API key</label>
            <input type="password" [(ngModel)]="assistApiKeyInput" [disabled]="assistLocked()"
              [placeholder]="assist.apiKey ? 'Leave blank to keep current' : 'Bearer token (optional)'" />
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>Used for</label>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);font-weight:normal;">
              <input type="checkbox" [checked]="assistUses('repair')" (change)="toggleAssistUse('repair', $any($event.target).checked)" [disabled]="assistLocked()" />
              Document repair pass (<code>max</code> mode) — reconcile a page's VLM draft against the OCR text
            </label>
          </div>
          <div class="runline warn" style="margin-top:14px;">
            <ph-icon name="warning" [size]="15"/>
            <span>
              When assigned a task, this model receives document content — OCR-extracted text and draft
              transcriptions (and rendered page images for image-based tasks). <b>That data leaves your
              instance.</b>
              @if (assistNeedsAck()) { You'll confirm egress to <code>{{ assistHost() }}</code> when you save. }
              @else if (assist.acknowledgedHost) { Egress to <code>{{ assist.acknowledgedHost }}</code> is acknowledged. }
            </span>
          </div>
          <div class="testrow">
            <button class="btn btn-sm btn-secondary" type="button" (click)="testConnection('assist')" [disabled]="testOf('assist')?.loading || !assist.baseUrl">
              {{ testOf('assist')?.loading ? 'Testing…' : 'Test connection' }}
            </button>
            @if (testOf('assist')?.res; as r) {
              <app-status-pill [variant]="testPillVariant(r)" [dot]="true">{{ testPillLabel(r) }}</app-status-pill>
              <span class="hint">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
            }
          </div>
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
        <button class="btn btn-primary" (click)="save()" [disabled]="saving() || managed">
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
  private readonly confirmDialog = inject(ConfirmDialogService);

  // Button order: Auto first (it's the default), then OCR · VLM · Max ascending in capability.
  readonly MODES: DocMode[] = ['auto', 'ocr', 'vlm', 'max'];
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
  assistApiKeyInput = '';
  embeddingApiKeyInput = '';
  // Serialized model|dimensions|similarity at load — changing any of these re-indexes every vector.
  private embeddingReindexBaseline = '';

  // ── Text embedding ──
  get embedding(): EmbeddingCfg { return (this.form.embedding ??= {}); }
  embeddingLocked(field: string): boolean { return this.isLocked(`embedding.${field}`); }
  private reindexKey(): string { return `${this.embedding.model ?? ''}|${this.embedding.dimensions ?? ''}|${this.embedding.similarity ?? ''}`; }
  /** True when a reindex-triggering field (model/dimensions/similarity) differs from what was loaded. */
  embeddingNeedsReindex(): boolean { return this.reindexKey() !== this.embeddingReindexBaseline; }

  // ── F11-PR5b: test connection ──
  testState = signal<Partial<Record<TestTarget, { loading?: boolean; res?: TestResult }>>>({});
  testOf(t: TestTarget): { loading?: boolean; res?: TestResult } | undefined { return this.testState()[t]; }
  testConnection(t: TestTarget): void {
    this.testState.update(s => ({ ...s, [t]: { loading: true } }));
    this.http.post<TestResult>('/api/admin/media-config/test-connection', { target: t }).subscribe({
      next: res => this.testState.update(s => ({ ...s, [t]: { res } })),
      error: err => this.testState.update(s => ({ ...s, [t]: { res: {
        ok: false, reachable: false, detail: err?.error?.error ?? err?.message ?? 'Test failed', latencyMs: 0,
      } } })),
    });
  }
  testPillVariant(r: TestResult): StatusVariant { return !r.reachable ? 'error' : (r.modelPresent === false ? 'warn' : 'ok'); }
  testPillLabel(r: TestResult): string {
    if (!r.reachable) return 'Unreachable';
    if (r.modelPresent === false) return 'Reachable · model not found';
    if (r.modelPresent === true) return 'Reachable · model found';
    return 'Reachable';
  }

  // ── F11-b: external assist model ──
  /** Live handle to the editable assist-model block (lazily initialised so the template can bind fields). */
  get assist(): DocAssistCfg { return (this.form.documentProcessing ??= {}).assistModel ??= {}; }
  assistLocked(): boolean { return this.isLocked('documentProcessing.assistModel'); }
  assistUses(u: DocAssistUse): boolean { return this.assist.uses?.includes(u) ?? false; }
  toggleAssistUse(u: DocAssistUse, on: boolean): void {
    const set = new Set(this.assist.uses ?? []);
    if (on) set.add(u); else set.delete(u);
    this.assist.uses = [...set];
  }
  /** The endpoint host (for the egress acknowledgment), or '' when the URL is empty/invalid. */
  assistHost(): string { try { return this.assist.baseUrl ? new URL(this.assist.baseUrl).host : ''; } catch { return ''; } }
  /** True when a task is assigned to an endpoint whose host hasn't been acknowledged yet — save will prompt. */
  assistNeedsAck(): boolean {
    const host = this.assistHost();
    return !!host && (this.assist.uses?.length ?? 0) > 0 && this.assist.acknowledgedHost !== host;
  }

  /** The loaded doc-processing config (read-only fields like vlmModel live here). */
  private docCfgSig = signal<DocProcCfg>({});
  docCfg = computed(() => this.docCfgSig());
  docMode = signal<DocMode>('ocr');

  ngOnInit(): void {
    this.http.get<MediaCfg>('/api/admin/media-config').subscribe({
      next: cfg => {
        this.lockedByInfra = cfg.lockedByInfra ?? [];
        const dp: DocProcCfg = { mode: 'auto', renderDpi: 150, maxPages: 50, pageTimeoutMs: 60000, concurrency: 2, ocrTimeoutMs: 120000, ...cfg.documentProcessing };
        // F11-b — keep a copy of the assist model with `uses` always an array; the masked apiKey stays only
        // so the template can show "key set" — it is never sent back (assistApiKeyInput carries changes).
        dp.assistModel = { uses: [], ...cfg.documentProcessing?.assistModel };
        this.form = { vision: {}, stt: {}, ...cfg, documentProcessing: dp };
        this.form.vision = { ...cfg.vision, apiKey: undefined };
        this.form.stt = { ...cfg.stt, apiKey: undefined };
        this.form.embedding = { provider: 'local', ...cfg.embedding };
        this.embeddingReindexBaseline = this.reindexKey();
        this.assistApiKeyInput = '';
        this.embeddingApiKeyInput = '';
        this.docCfgSig.set(dp);
        this.docMode.set(dp.mode ?? 'ocr');
        this.loading.set(false);
      },
      error: err => { this.loadError.set(`Failed to load configuration: ${err?.message ?? 'Unknown error'}`); this.loading.set(false); },
    });
  }

  /** True when the whole media config is infra-managed (read-only, edits refused by the API). */
  get managed(): boolean { return !!this.form.infraManaged; }
  // When infra-managed, EVERY field is locked (the API refuses edits) — so isLocked() short-circuits true.
  isLocked(field: string): boolean { return this.managed || this.lockedByInfra.includes(field); }

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

  async save(): Promise<void> {
    if (this.managed) return; // infra-managed: the API would reject it anyway
    const dp = this.form.documentProcessing ?? {};
    const assist = dp.assistModel ?? {};
    const uses = assist.uses ?? [];
    const host = this.assistHost();

    // F11-b — egress acknowledgment: assigning a task to an external endpoint whose host isn't yet
    // acknowledged requires an explicit confirmation that document content leaves the instance.
    if (!this.assistLocked() && this.assistNeedsAck()) {
      const ok = await this.confirmDialog.confirm({
        title: 'Send document content to an external model?',
        message: `The model at ${host} will receive document content — OCR-extracted text and draft transcriptions (and rendered page images for image-based tasks). This data leaves your instance and is subject to that provider's handling. Enable egress to ${host}?`,
        confirmLabel: 'Enable — I understand',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (!ok) return;              // not acknowledged → abort the whole save
      assist.acknowledgedHost = host;
    }

    // Reindex confirmation: changing the embedding model / dimensions / similarity re-embeds EVERY vector in
    // every space. Make the operator acknowledge it — and that it takes a while — before saving.
    if (this.embeddingNeedsReindex()) {
      const ok = await this.confirmDialog.confirm({
        title: 'Change the embedding model — re-index everything?',
        message: `Changing the embedding model, dimensions, or similarity means every stored vector in every space must be RE-EMBEDDED. Recall is degraded until it finishes, and on a large instance this can take a long while. Only continue if you understand what you're doing.`,
        confirmLabel: 'Yes, re-index — I understand',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (!ok) return;
    }

    this.saving.set(true);
    this.saveError.set('');
    this.saveOk.set('');
    // Assist block: send baseUrl/model/uses/acknowledgedHost (+ apiKey only when the operator typed a new
    // one — the masked value from GET is never echoed back). Omitted when locked by env.
    const assistPayload: DocAssistCfg | undefined = this.assistLocked() ? undefined : {
      baseUrl: assist.baseUrl || undefined,
      model: assist.model || undefined,
      uses,
      acknowledgedHost: assist.acknowledgedHost,
      ...(this.assistApiKeyInput ? { apiKey: this.assistApiKeyInput } : {}),
    };
    const payload: MediaCfg = {
      enabled: this.form.enabled,
      visionProvider: this.form.visionProvider,
      sttProvider: this.form.sttProvider,
      vision: { baseUrl: this.form.vision?.baseUrl, model: this.form.vision?.model, ...(this.visionApiKeyInput ? { apiKey: this.visionApiKeyInput } : {}) },
      stt: { baseUrl: this.form.stt?.baseUrl, model: this.form.stt?.model, ...(this.sttApiKeyInput ? { apiKey: this.sttApiKeyInput } : {}) },
      embedding: {
        provider: this.embedding.provider,
        baseUrl: this.embedding.baseUrl || null,
        model: this.embedding.model,
        dimensions: this.embedding.dimensions,
        similarity: this.embedding.similarity,
        ...(this.embeddingApiKeyInput ? { apiKey: this.embeddingApiKeyInput } : {}),
      },
      // Only the PATCH-writable doc fields (vlmModel/repairModel/URLs are env-only, never sent).
      documentProcessing: {
        mode: dp.mode, renderDpi: dp.renderDpi, maxPages: dp.maxPages, pageTimeoutMs: dp.pageTimeoutMs, concurrency: dp.concurrency, ocrTimeoutMs: dp.ocrTimeoutMs,
        ...(assistPayload ? { assistModel: assistPayload } : {}),
      },
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
        this.assistApiKeyInput = '';
        this.embeddingApiKeyInput = '';
        this.embeddingReindexBaseline = this.reindexKey(); // re-baseline so a second save won't re-prompt
        this.saving.set(false);
        setTimeout(() => this.saveOk.set(''), 3000);
      },
      error: err => { this.saveError.set(`Save failed: ${err?.error?.error ?? err?.message ?? 'Unknown error'}`); this.saving.set(false); },
    });
  }
}
