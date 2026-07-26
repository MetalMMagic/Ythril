/**
 * All the state and behaviour behind Settings → Models & Pipelines, with no template attached.
 *
 * This is the load-bearing half of the page rebuild. It was extracted from `models.component.ts`
 * essentially verbatim, because `models.component.spec.ts` (the characterization tests written in
 * #347, before any of this moved) pins its behaviour: masked keys never being echoed back, env-only
 * document fields never being sent, and both confirmations aborting the WHOLE save when declined.
 * Those tests now drive this service directly — the same assertions through a new seam. An assertion
 * that had to change to keep passing would be a behaviour change, not a refactor.
 *
 * It is provided by the page component rather than in root, so leaving and re-entering the page
 * starts from the server's state instead of a previous visit's half-finished edits.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';
import { StatusVariant } from '../../../shared/status-pill.component';
import {
  MediaCfg, DocProcCfg, DocAssistCfg, DocAssistUse, DocMode, EmbeddingCfg,
  TestResult, TestTarget, FaceRecognitionCfg, MODE_STAGES,
} from './models.types';

@Injectable()
export class ModelsStateService {
  private readonly http = inject(HttpClient);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly transloco = inject(TranslocoService);

  /** Button order: Auto first (it is the default), then the rungs ascending in capability. */
  readonly MODES: DocMode[] = ['auto', 'off', 'ocr', 'vlm', 'repair'];

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

  /** Serialized model|dimensions|similarity at load — changing any of these re-indexes every vector. */
  private embeddingReindexBaseline = '';
  /** The saved payload as it stood at load, for the unsaved-changes guard. */
  private savedSnapshot = '';
  /** Flipped by a delegated input/change listener on the page. See `isDirty`. */
  touched = signal(false);

  // ── Face recognition ──
  /** Live handle to the editable face block, lazily initialised so the template can bind fields. */
  get face(): FaceRecognitionCfg { return (this.form.faceRecognition ??= {}); }
  faceLocked(field: string): boolean { return this.isLocked(`faceRecognition.${field}`); }
  /** What face recognition was set to at load — the disable confirmation fires on the transition. */
  private faceEnabledBaseline = false;
  /** True when this save turns face recognition OFF, which is the direction with consequences. */
  faceBeingDisabled(): boolean { return this.faceEnabledBaseline && this.face.enabled === false; }

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
  testPillLabelKey(r: TestResult): string {
    if (!r.reachable) return 'models.test.unreachable';
    if (r.modelPresent === false) return 'models.test.modelMissing';
    if (r.modelPresent === true) return 'models.test.modelFound';
    return 'models.test.reachable';
  }

  // ── F11-b: external assist model ──
  /** Live handle to the editable assist-model block (lazily initialised so templates can bind fields). */
  get assist(): DocAssistCfg { return (this.form.documentProcessing ??= {}).assistModel ??= {}; }
  assistLocked(): boolean { return this.isLocked('documentProcessing.assistModel'); }
  assistUses(u: DocAssistUse): boolean { return this.assist.uses?.includes(u) ?? false; }
  /** True when the external assist model is actually configured — a base URL AND a model to call.
   *  Without both there is no endpoint, so nothing it is "used" for can run. */
  assistConfigured(): boolean { return !!this.assist.baseUrl?.trim() && !!this.assist.model?.trim(); }
  /** True when `u` is BOTH toggled on AND the model is configured — i.e. actually operational. The
   *  "in use" pill keys off this, not the toggle alone: a repair pass toggled on but with no assist
   *  model configured does not run, so the pill must not claim it is in use. */
  assistInUse(u: DocAssistUse): boolean { return this.assistUses(u) && this.assistConfigured(); }
  toggleAssistUse(u: DocAssistUse, on: boolean): void {
    const set = new Set(this.assist.uses ?? []);
    if (on) set.add(u); else set.delete(u);
    this.assist.uses = [...set];
  }
  /** The endpoint host (for the egress acknowledgment), or '' when the URL is empty/invalid. */
  assistHost(): string { try { return this.assist.baseUrl ? new URL(this.assist.baseUrl).host : ''; } catch { return ''; } }
  /** True when a task is assigned to an endpoint whose host has not been acknowledged — save prompts. */
  assistNeedsAck(): boolean {
    const host = this.assistHost();
    return !!host && (this.assist.uses?.length ?? 0) > 0 && this.assist.acknowledgedHost !== host;
  }

  /** The loaded doc-processing config (read-only fields like vlmModel live here). */
  private docCfgSig = signal<DocProcCfg>({});
  docCfg = computed(() => this.docCfgSig());
  docMode = signal<DocMode>('ocr');

  load(): void {
    this.http.get<MediaCfg>('/api/admin/media-config').subscribe({
      next: cfg => {
        this.lockedByInfra = cfg.lockedByInfra ?? [];
        const dp: DocProcCfg = { mode: 'auto', renderDpi: 150, maxPages: 50, pageTimeoutMs: 60000, concurrency: 2, ocrTimeoutMs: 120000, ...cfg.documentProcessing };
        // F11-b — keep a copy of the assist model with `uses` always an array; the masked apiKey stays
        // only so the UI can show "key set" — it is never sent back (assistApiKeyInput carries changes).
        dp.assistModel = { uses: [], ...cfg.documentProcessing?.assistModel };
        this.form = { vision: {}, stt: {}, ...cfg, documentProcessing: dp };
        this.form.vision = { ...cfg.vision, apiKey: undefined };
        this.form.stt = { ...cfg.stt, apiKey: undefined };
        this.form.embedding = { provider: 'local', ...cfg.embedding };
        this.form.faceRecognition = { ...cfg.faceRecognition };
        this.faceEnabledBaseline = cfg.faceRecognition?.enabled === true;
        this.embeddingReindexBaseline = this.reindexKey();
        this.assistApiKeyInput = '';
        this.embeddingApiKeyInput = '';
        this.docCfgSig.set(dp);
        this.docMode.set(dp.mode ?? 'ocr');
        this.savedSnapshot = this.snapshot();
        this.touched.set(false);
        this.loading.set(false);
      },
      error: err => { this.loadError.set(`Failed to load configuration: ${err?.message ?? 'Unknown error'}`); this.loading.set(false); },
    });
  }

  /** True when the whole media config is infra-managed (read-only, edits refused by the API). */
  get managed(): boolean { return !!this.form.infraManaged; }
  // When infra-managed, EVERY field is locked (the API refuses edits) — so isLocked() short-circuits.
  isLocked(field: string): boolean { return this.managed || this.lockedByInfra.includes(field); }

  // ── unsaved-changes guard ──

  /** What a save would send, as a string. Also what dirtiness is measured against. */
  private snapshot(): string { return JSON.stringify(this.payload()); }

  /**
   * True when there is something a save would actually change.
   *
   * `touched` alone would prompt after a keystroke that was undone; the snapshot comparison alone
   * would miss a typed API key, which is deliberately absent from the payload until save. Both
   * together give a prompt that fires when — and only when — leaving would lose something.
   */
  isDirty(): boolean {
    if (this.managed || this.loading()) return false;
    if (this.visionApiKeyInput || this.sttApiKeyInput || this.assistApiKeyInput || this.embeddingApiKeyInput) return true;
    return this.touched() && this.snapshot() !== this.savedSnapshot;
  }

  // ── document extraction helpers ──
  //
  // These return i18n KEYS rather than prose. They used to return English sentences, which is how the
  // page ended up rendering "As much as this instance can do…" underneath a fully German heading — the
  // strings lived in a service, so the template's transloco pipe never saw them. The characterization
  // tests assert on these keys now: same states reported, different representation.
  setMode(m: DocMode): void { this.docMode.set(m); if (this.form.documentProcessing) this.form.documentProcessing.mode = m; }
  private vlmConfigured(): boolean { return !!this.docCfg().vlmModel; }
  // 'off' runs nothing, so a missing vision model is not a problem it can have.
  vlmNeededButMissing(): boolean { return this.docMode() !== 'ocr' && this.docMode() !== 'off' && !this.vlmConfigured(); }
  modeDescKey(): string { return `models.modeDesc.${this.docMode()}`; }
  stageClass(key: string): string {
    if (!MODE_STAGES[this.docMode()].has(key)) return 'dim';
    if (this.vlmNeededButMissing() && (key === 'render' || key === 'vlm' || key === 'repair')) return 'warn';
    return 'on';
  }
  /** Key plus the interpolation params, so the sentence can be re-ordered per language. */
  docSummary(): { key: string; params: Record<string, string> } {
    const m = this.docMode();
    const params = { mode: m.toUpperCase(), model: this.docCfg().vlmModel ?? '' };
    if (m === 'off') return { key: 'models.docSummary.off', params };
    if (m === 'ocr') return { key: 'models.docSummary.ocr', params };
    if (this.vlmNeededButMissing()) return { key: 'models.docSummary.fallback', params };
    return { key: m === 'repair' || m === 'auto' ? 'models.docSummary.repaired' : 'models.docSummary.vlm', params };
  }
  docPillLabelKey(): string {
    if (this.docMode() === 'off') return 'models.docPill.off';
    return this.vlmNeededButMissing() ? 'models.docPill.fallback' : 'models.docPill.active';
  }
  docVariant(): StatusVariant {
    if (this.docMode() === 'off') return 'off';
    return this.vlmNeededButMissing() ? 'warn' : 'active';
  }

  // ── summary pill helpers for vision/stt ──
  capVariant(model?: string): StatusVariant { return this.form.enabled ? (model ? 'active' : 'warn') : 'off'; }
  capLabelKey(model?: string): string {
    return !this.form.enabled ? 'models.cap.off' : (model ? 'models.cap.active' : 'models.cap.noModel');
  }

  /**
   * The PATCH body. Split out of `save()` so the dirty check can compare against it — the set of
   * fields that are actually persisted is exactly the set worth prompting about.
   *
   * API keys are deliberately absent: the values held on `form` are the server's masks, and echoing a
   * mask back would overwrite a real credential with asterisks. Only a key the operator typed is
   * added, in `save()`.
   */
  private payload(): MediaCfg {
    const dp = this.form.documentProcessing ?? {};
    const levels = this.form.levels ?? {};
    return {
      enabled: this.form.enabled,
      // Instance ceilings, sent per class. The server merges class by class for the same reason this
      // sends all four: a partial block would let the classes it omits default back up to `auto`.
      levels: { images: levels.images, audio: levels.audio, video: levels.video, text: levels.text },
      visionProvider: this.form.visionProvider,
      sttProvider: this.form.sttProvider,
      vision: { baseUrl: this.form.vision?.baseUrl, model: this.form.vision?.model },
      stt: { baseUrl: this.form.stt?.baseUrl, model: this.form.stt?.model },
      embedding: {
        provider: this.embedding.provider,
        baseUrl: this.embedding.baseUrl || null,
        model: this.embedding.model,
        dimensions: this.embedding.dimensions,
        similarity: this.embedding.similarity,
      },
      // Only the PATCH-writable doc fields (vlmModel/repairModel/URLs are env-only, never sent).
      documentProcessing: {
        mode: dp.mode, renderDpi: dp.renderDpi, maxPages: dp.maxPages, pageTimeoutMs: dp.pageTimeoutMs,
        concurrency: dp.concurrency, ocrTimeoutMs: dp.ocrTimeoutMs,
      },
      // Only the PATCH-writable face fields. modelPath / reprocessSyncedImages are env-only.
      faceRecognition: {
        enabled: this.face.enabled,
        confidenceThreshold: this.face.confidenceThreshold,
        minFaceSizeFraction: this.face.minFaceSizeFraction,
        personEntityTypes: this.face.personEntityTypes,
      },
      fallbackToExternal: this.form.fallbackToExternal,
      maxFileSizeBytes: this.form.maxFileSizeBytes,
      workerConcurrency: this.form.workerConcurrency,
    };
  }

  async save(): Promise<void> {
    if (this.managed) return; // infra-managed: the API would reject it anyway
    const dp = this.form.documentProcessing ?? {};
    const assist = dp.assistModel ?? {};
    const uses = assist.uses ?? [];
    const host = this.assistHost();

    // F11-b — egress acknowledgment: assigning a task to an external endpoint whose host is not yet
    // acknowledged requires an explicit confirmation that document content leaves the instance.
    if (!this.assistLocked() && this.assistNeedsAck()) {
      const ok = await this.confirmDialog.confirm({
        title: this.transloco.translate('models.confirm.egressTitle'),
        message: this.transloco.translate('models.confirm.egressMessage', { host }),
        confirmLabel: this.transloco.translate('models.confirm.egressConfirm'),
        cancelLabel: this.transloco.translate('common.cancel'),
        danger: true,
      });
      if (!ok) return;              // not acknowledged → abort the whole save
      assist.acknowledgedHost = host;
    }

    // Turning face recognition OFF stops new faces being detected — it does NOT remove the face
    // vectors and person links already stored. An operator disabling this is usually acting on a
    // privacy decision, so letting them believe the existing data went away would be the worst kind
    // of quiet failure: they would have been told the opposite of what happened.
    if (this.faceBeingDisabled()) {
      const ok = await this.confirmDialog.confirm({
        title: this.transloco.translate('models.confirm.faceOffTitle'),
        message: this.transloco.translate('models.confirm.faceOffMessage'),
        confirmLabel: this.transloco.translate('models.confirm.faceOffConfirm'),
        cancelLabel: this.transloco.translate('common.cancel'),
        danger: true,
      });
      if (!ok) return;
    }

    // Reindex confirmation: changing the embedding model / dimensions / similarity re-embeds EVERY
    // vector in every space. Make the operator acknowledge it — and that it takes a while.
    if (this.embeddingNeedsReindex()) {
      const ok = await this.confirmDialog.confirm({
        title: this.transloco.translate('models.confirm.reindexTitle'),
        message: this.transloco.translate('models.confirm.reindexMessage'),
        confirmLabel: this.transloco.translate('models.confirm.reindexConfirm'),
        cancelLabel: this.transloco.translate('common.cancel'),
        danger: true,
      });
      if (!ok) return;
    }

    this.saving.set(true);
    this.saveError.set('');
    this.saveOk.set('');
    // Assist block: send baseUrl/model/uses/acknowledgedHost (+ apiKey only when the operator typed a
    // new one — the masked value from GET is never echoed back). Omitted when locked by env.
    const assistPayload: DocAssistCfg | undefined = this.assistLocked() ? undefined : {
      baseUrl: assist.baseUrl || undefined,
      model: assist.model || undefined,
      uses,
      acknowledgedHost: assist.acknowledgedHost,
      ...(this.assistApiKeyInput ? { apiKey: this.assistApiKeyInput } : {}),
    };
    const base = this.payload();
    const payload: MediaCfg = {
      ...base,
      vision: { ...base.vision, ...(this.visionApiKeyInput ? { apiKey: this.visionApiKeyInput } : {}) },
      stt: { ...base.stt, ...(this.sttApiKeyInput ? { apiKey: this.sttApiKeyInput } : {}) },
      embedding: { ...base.embedding, ...(this.embeddingApiKeyInput ? { apiKey: this.embeddingApiKeyInput } : {}) },
      documentProcessing: { ...base.documentProcessing, ...(assistPayload ? { assistModel: assistPayload } : {}) },
    };
    const body = JSON.parse(JSON.stringify(payload)) as MediaCfg;
    this.http.patch<{ ok: boolean; config: MediaCfg }>('/api/admin/media-config', body).subscribe({
      next: () => {
        this.saveOk.set(this.transloco.translate('models.saved'));
        this.visionApiKeyInput = '';
        this.sttApiKeyInput = '';
        this.assistApiKeyInput = '';
        this.embeddingApiKeyInput = '';
        this.embeddingReindexBaseline = this.reindexKey(); // re-baseline so a second save won't re-prompt
        this.savedSnapshot = this.snapshot();
        this.faceEnabledBaseline = this.face.enabled === true;
        this.touched.set(false);
        this.saving.set(false);
        setTimeout(() => this.saveOk.set(''), 3000);
      },
      error: err => { this.saveError.set(`Save failed: ${err?.error?.error ?? err?.message ?? 'Unknown error'}`); this.saving.set(false); },
    });
  }
}
