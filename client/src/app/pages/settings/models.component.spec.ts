/**
 * ModelsComponent — CHARACTERIZATION tests.
 *
 * Settings → Models is 643 lines and shipped with NO coverage, and it is about to be split into three
 * tabs (Models · Pipelines · Tools) with a per-space pipeline surface behind it. Per
 * characterization-tests-before-refactor these are written and proven green against the ORIGINAL code,
 * so the rebuild has a safety net — a test written after the change only proves the new code agrees
 * with itself.
 *
 * They pin the contracts the rebuild MUST preserve, chosen for consequence rather than coverage:
 *
 *  - **A masked API key is never echoed back.** GET returns keys masked; sending the mask would
 *    overwrite a real credential with asterisks. `apiKey` is only ever in the payload when the operator
 *    typed a new one.
 *  - **Only PATCH-writable document fields are sent.** `vlmModel` / `repairModel` / sidecar URLs are
 *    env-only; including them makes the API reject the whole save.
 *  - **Both confirmations abort the entire save when declined** — egress acknowledgment (document
 *    content leaving the instance) and re-index (every vector in every space re-embedded). A rebuild
 *    that turned either into a fire-and-forget toast would be a silent data/privacy regression.
 *  - **Infra-managed short-circuits everything**, since the API refuses those edits anyway.
 *  - The derived display state (fallback warnings, summaries, stage classes) that tells an operator
 *    whether the pipeline is actually doing what the mode claims.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { ModelsComponent } from './models.component';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

/** The shape GET /api/admin/media-config returns, with keys masked as the server masks them. */
function cfgFixture(over: Record<string, unknown> = {}) {
  return {
    enabled: true,
    visionProvider: 'local',
    sttProvider: 'local',
    vision: { baseUrl: 'http://ollama:11434', model: 'llava', apiKey: '••••••••' },
    stt: { baseUrl: 'http://whisper:9000', model: 'base', apiKey: '••••••••' },
    embedding: { provider: 'local', model: 'nomic-embed-text-v1.5', dimensions: 768, similarity: 'cosine' },
    documentProcessing: {
      mode: 'ocr',
      renderDpi: 150, maxPages: 50, pageTimeoutMs: 60000, concurrency: 2, ocrTimeoutMs: 120000,
      vlmModel: '', repairModel: 'qwen', ocrUrl: 'http://unstructured:8000',
      assistModel: { baseUrl: '', model: '', uses: [], apiKey: '••••••••' },
    },
    fallbackToExternal: false,
    maxFileSizeBytes: 524288000,
    workerConcurrency: 2,
    lockedByInfra: [],
    ...over,
  };
}

function make(cfg: Record<string, unknown> = cfgFixture(), confirmResult = true) {
  TestBed.resetTestingModule();
  const confirm = vi.fn().mockResolvedValue(confirmResult);
  const patch = vi.fn().mockReturnValue(of({ ok: true, config: cfg }));
  const post = vi.fn().mockReturnValue(of({ reachable: true, modelPresent: true }));
  const http = { get: vi.fn().mockReturnValue(of(cfg)), patch, post } as unknown as HttpClient;
  TestBed.configureTestingModule({
    imports: [ModelsComponent, getTranslocoModule()],
    providers: [
      { provide: HttpClient, useValue: http },
      { provide: ConfirmDialogService, useValue: { confirm } },
    ],
  });
  const fixture = TestBed.createComponent(ModelsComponent);
  const c = fixture.componentInstance;
  c.ngOnInit();
  return { c, confirm, patch, post, http, fixture };
}

/** The body handed to PATCH by the most recent save(). */
const sent = (patch: ReturnType<typeof vi.fn>) => patch.mock.calls.at(-1)?.[1] as Record<string, never>;

describe('ModelsComponent — load', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('drops the masked API keys from the form so they can never be sent back', () => {
    const { c } = make();
    expect(c.form.vision?.apiKey).toBeUndefined();
    expect(c.form.stt?.apiKey).toBeUndefined();
    // The typed-input fields start empty — only what the operator types is ever transmitted.
    expect(c.visionApiKeyInput).toBe('');
    expect(c.sttApiKeyInput).toBe('');
    expect(c.assistApiKeyInput).toBe('');
    expect(c.embeddingApiKeyInput).toBe('');
  });

  it('fills document-processing defaults for fields the server omitted', () => {
    const { c } = make(cfgFixture({ documentProcessing: { mode: 'vlm' } }));
    expect(c.docCfg().renderDpi).toBe(150);
    expect(c.docCfg().maxPages).toBe(50);
    expect(c.docCfg().ocrTimeoutMs).toBe(120000);
    expect(c.docMode()).toBe('vlm');
  });

  it('reports a load failure instead of rendering an empty form as if it were config', () => {
    TestBed.resetTestingModule();
    const http = { get: vi.fn().mockReturnValue(throwError(() => new Error('boom'))) } as unknown as HttpClient;
    TestBed.configureTestingModule({
      imports: [ModelsComponent, getTranslocoModule()],
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
      ],
    });
    const c = TestBed.createComponent(ModelsComponent).componentInstance;
    c.ngOnInit();
    expect(c.loadError()).toContain('boom');
    expect(c.loading()).toBe(false);
  });
});

describe('ModelsComponent — infra locks', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('locks every field when the whole config is infra-managed', () => {
    const { c } = make(cfgFixture({ infraManaged: true }));
    expect(c.isLocked('anything.at.all')).toBe(true);
    expect(c.embeddingLocked('model')).toBe(true);
  });

  it('locks only the named fields otherwise', () => {
    const { c } = make(cfgFixture({ lockedByInfra: ['embedding.model', 'documentProcessing.assistModel'] }));
    expect(c.isLocked('embedding.model')).toBe(true);
    expect(c.embeddingLocked('model')).toBe(true);
    expect(c.embeddingLocked('dimensions')).toBe(false);
    expect(c.assistLocked()).toBe(true);
  });

  it('save is a no-op when infra-managed — the API would reject it anyway', async () => {
    const { c, patch } = make(cfgFixture({ infraManaged: true }));
    await c.save();
    expect(patch).not.toHaveBeenCalled();
  });
});

describe('ModelsComponent — save payload', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('omits apiKey entirely unless the operator typed a new one', async () => {
    const { c, patch } = make();
    await c.save();
    expect(sent(patch)['vision']).not.toHaveProperty('apiKey');
    expect(sent(patch)['stt']).not.toHaveProperty('apiKey');
    expect(sent(patch)['embedding']).not.toHaveProperty('apiKey');
  });

  it('sends a typed apiKey', async () => {
    const { c, patch } = make();
    c.visionApiKeyInput = 'sk-real-key';
    await c.save();
    expect((sent(patch)['vision'] as Record<string, unknown>)['apiKey']).toBe('sk-real-key');
  });

  it('never sends the env-only document fields — including them makes the API reject the save', async () => {
    const { c, patch } = make();
    await c.save();
    const dp = sent(patch)['documentProcessing'] as Record<string, unknown>;
    expect(dp).not.toHaveProperty('vlmModel');
    expect(dp).not.toHaveProperty('repairModel');
    expect(dp).not.toHaveProperty('ocrUrl');
    expect(dp['mode']).toBe('ocr');
    expect(dp['renderDpi']).toBe(150);
  });

  it('omits the assist block when it is locked by env', async () => {
    const { c, patch } = make(cfgFixture({ lockedByInfra: ['documentProcessing.assistModel'] }));
    await c.save();
    expect(sent(patch)['documentProcessing']).not.toHaveProperty('assistModel');
  });

  it('clears the typed key inputs after a successful save so a re-save cannot resend them', async () => {
    const { c } = make();
    c.visionApiKeyInput = 'sk-1';
    c.embeddingApiKeyInput = 'sk-2';
    await c.save();
    expect(c.visionApiKeyInput).toBe('');
    expect(c.embeddingApiKeyInput).toBe('');
    expect(c.saveOk()).toBe('Saved');
  });

  it('surfaces the server error rather than reporting success', async () => {
    const { c } = make();
    const http = TestBed.inject(HttpClient) as unknown as { patch: ReturnType<typeof vi.fn> };
    http.patch.mockReturnValue(throwError(() => ({ error: { error: 'infra-managed' } })));
    await c.save();
    expect(c.saveError()).toContain('infra-managed');
    expect(c.saving()).toBe(false);
  });
});

describe('ModelsComponent — the two confirmations', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('re-index: prompts when the embedding model changes, and aborts the WHOLE save if declined', async () => {
    const { c, confirm, patch } = make(cfgFixture(), false);
    expect(c.embeddingNeedsReindex()).toBe(false);
    c.embedding.model = 'a-different-model';
    expect(c.embeddingNeedsReindex()).toBe(true);
    await c.save();
    expect(confirm).toHaveBeenCalledOnce();
    expect(patch).not.toHaveBeenCalled(); // nothing saved, not even the unrelated fields
  });

  it('re-index: dimensions and similarity also trigger it, not just the model name', () => {
    const { c } = make();
    c.embedding.dimensions = 1024;
    expect(c.embeddingNeedsReindex()).toBe(true);
  });

  it('re-index: re-baselines after saving so a second save does not prompt again', async () => {
    const { c, confirm } = make();
    c.embedding.model = 'a-different-model';
    await c.save();
    expect(confirm).toHaveBeenCalledOnce();
    expect(c.embeddingNeedsReindex()).toBe(false);
    await c.save();
    expect(confirm).toHaveBeenCalledOnce(); // still once
  });

  it('egress: prompts for an unacknowledged external assist host and aborts the save if declined', async () => {
    const { c, confirm, patch } = make(cfgFixture(), false);
    const assist = c.form.documentProcessing!.assistModel!;
    assist.baseUrl = 'https://api.example.com/v1';
    assist.model = 'gpt-4o';
    assist.uses = ['repair'];
    expect(c.assistNeedsAck()).toBe(true);
    await c.save();
    expect(confirm).toHaveBeenCalledOnce();
    expect(patch).not.toHaveBeenCalled();
  });

  it('egress: records the acknowledged host on the saved payload when accepted', async () => {
    const { c, patch } = make();
    const assist = c.form.documentProcessing!.assistModel!;
    assist.baseUrl = 'https://api.example.com/v1';
    assist.model = 'gpt-4o';
    assist.uses = ['repair'];
    await c.save();
    const sentAssist = (sent(patch)['documentProcessing'] as Record<string, Record<string, unknown>>)['assistModel'];
    expect(sentAssist['acknowledgedHost']).toBe('api.example.com');
  });

  it('egress: does not re-prompt for a host already acknowledged', async () => {
    const { c, confirm } = make();
    const assist = c.form.documentProcessing!.assistModel!;
    assist.baseUrl = 'https://api.example.com/v1';
    assist.model = 'gpt-4o';
    assist.uses = ['repair'];
    assist.acknowledgedHost = 'api.example.com';
    expect(c.assistNeedsAck()).toBe(false);
    await c.save();
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('ModelsComponent — derived display state', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('warns that a VLM mode silently falls back to OCR when no vision model is set', () => {
    const { c } = make();
    c.setMode('vlm');
    expect(c.vlmNeededButMissing()).toBe(true);
    expect(c.docPillLabel()).toBe('OCR fallback');
    expect(c.docVariant()).toBe('warn');
    expect(c.runLine()).toContain('falls back to OCR');
    expect(c.docSummary()).toContain('falls back to OCR');
    // The affected stages are flagged rather than shown as running normally.
    expect(c.stageClass('vlm')).toBe('warn');
  });

  it('describes a configured VLM mode as actually running', () => {
    const { c } = make(cfgFixture({ documentProcessing: { mode: 'vlm', vlmModel: 'llava' } }));
    expect(c.vlmNeededButMissing()).toBe(false);
    expect(c.docPillLabel()).toBe('Active');
    expect(c.docSummary()).toContain('llava');
    expect(c.stageClass('vlm')).toBe('on');
  });

  it('OCR mode never reports a missing vision model, because it does not use one', () => {
    const { c } = make();
    c.setMode('ocr');
    expect(c.vlmNeededButMissing()).toBe(false);
    expect(c.docSummary()).toBe('Read by OCR only');
  });

  it('capability pills distinguish off / no-model / active', () => {
    const { c } = make();
    expect(c.capLabel('llava')).toBe('Active');
    expect(c.capVariant('llava')).toBe('active');
    expect(c.capLabel(undefined)).toBe('No model');
    expect(c.capVariant(undefined)).toBe('warn');
    c.form.enabled = false;
    expect(c.capLabel('llava')).toBe('Off');
    expect(c.capVariant('llava')).toBe('off');
  });

  it('setMode keeps the form and the signal in step', () => {
    const { c } = make();
    c.setMode('max');
    expect(c.docMode()).toBe('max');
    expect(c.form.documentProcessing?.mode).toBe('max');
  });
});

describe('ModelsComponent — test connection', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('distinguishes unreachable from reachable-but-missing-model', () => {
    const { c } = make();
    expect(c.testPillVariant({ reachable: false })).toBe('error');
    expect(c.testPillVariant({ reachable: true, modelPresent: false })).toBe('warn');
    expect(c.testPillVariant({ reachable: true, modelPresent: true })).toBe('ok');
  });

  it('records the result against the target that was tested', () => {
    const { c, post } = make();
    c.testConnection('vision');
    expect(post).toHaveBeenCalledWith('/api/admin/media-config/test-connection', { target: 'vision' });
    expect(c.testOf('vision')?.res?.reachable).toBe(true);
    expect(c.testOf('stt')).toBeUndefined();
  });
});
