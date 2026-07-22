/**
 * ModelsStateService — the CHARACTERIZATION tests from #347, ported to the extracted service.
 *
 * These were written against the original 656-line `models.component.ts` and proven green there
 * BEFORE the split, per characterization-tests-before-refactor. The page has since been rebuilt into
 * three tabs; all of the behaviour they pin moved into this service, and every assertion about
 * *behaviour* is unchanged — the save payload, the locks, both confirmations, the derived states.
 *
 * **One category of assertion was rewritten, deliberately and visibly:** the display helpers used to
 * return English prose (`'OCR fallback'`, `'Read by OCR only'`) and now return i18n keys
 * (`'models.docPill.fallback'`). Prose in a service is prose no transloco pipe can reach, which is
 * exactly how the rebuilt page rendered "As much as this instance can do…" underneath a fully German
 * heading. The states reported are identical and the branch conditions are untouched; only the
 * representation moved. That is the one kind of edit these tests permit, and it is called out here
 * rather than quietly folded in — an assertion changed to make a test pass is otherwise a behaviour
 * change wearing a refactor's clothes.
 *
 * What they pin, chosen for consequence rather than coverage:
 *
 *  - **A masked API key is never echoed back.** GET returns keys masked; sending the mask would
 *    overwrite a real credential with asterisks. `apiKey` is in the payload only when the operator
 *    typed a new one.
 *  - **Only PATCH-writable document fields are sent.** `vlmModel` / `repairModel` / sidecar URLs are
 *    env-only; including them makes the API reject the whole save.
 *  - **Both confirmations abort the entire save when declined** — egress acknowledgment (document
 *    content leaving the instance) and re-index (every vector in every space re-embedded). Turning
 *    either into a fire-and-forget toast would be a silent privacy/data regression.
 *  - **Infra-managed short-circuits everything**, since the API refuses those edits anyway.
 *  - The derived display state that tells an operator whether the pipeline is doing what the mode
 *    claims (fallback warnings, summaries, stage classes).
 *
 * New here, for behaviour the split introduced: the unsaved-changes guard that spans the tabs.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { ModelsStateService } from './models-state.service';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';

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
    imports: [getTranslocoModule()],
    providers: [
      ModelsStateService,
      { provide: HttpClient, useValue: http },
      { provide: ConfirmDialogService, useValue: { confirm } },
    ],
  });
  const c = TestBed.inject(ModelsStateService);
  c.load();
  return { c, confirm, patch, post, http };
}

/** The body handed to PATCH by the most recent save(). */
const sent = (patch: ReturnType<typeof vi.fn>) => patch.mock.calls.at(-1)?.[1] as Record<string, never>;

describe('ModelsStateService — load', () => {
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
      imports: [getTranslocoModule()],
      providers: [
        ModelsStateService,
        { provide: HttpClient, useValue: http },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
      ],
    });
    const c = TestBed.inject(ModelsStateService);
    c.load();
    expect(c.loadError()).toContain('boom');
    expect(c.loading()).toBe(false);
  });
});

describe('ModelsStateService — infra locks', () => {
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

describe('ModelsStateService — save payload', () => {
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

  // Instance ceilings became editable here. The rule that matters is that ALL FOUR classes are sent,
  // every time: the server merges per class, but a client that sent only the class it changed would
  // still be correct only by accident — and the loader reads an absent class as `auto`, so any path
  // that drops one raises that ceiling to the top rung with nothing reporting it.
  it('sends every media-class ceiling, not just the one that changed', async () => {
    const { c, patch } = make(cfgFixture({ levels: { images: 'caption', audio: 'off', video: 'audio', text: 'embed' } }));
    await c.save();
    expect(sent(patch)['levels']).toEqual({ images: 'caption', audio: 'off', video: 'audio', text: 'embed' });
  });

  it('carries an edited ceiling through to the payload without disturbing the others', async () => {
    const { c, patch } = make(cfgFixture({ levels: { images: 'recognition', audio: 'on', video: 'audio', text: 'chunk' } }));
    c.form.levels = { ...c.form.levels, images: 'off' };
    await c.save();
    expect(sent(patch)['levels']).toEqual({ images: 'off', audio: 'on', video: 'audio', text: 'chunk' });
  });

  it('clears the typed key inputs after a successful save so a re-save cannot resend them', async () => {
    const { c } = make();
    c.visionApiKeyInput = 'sk-1';
    c.embeddingApiKeyInput = 'sk-2';
    await c.save();
    expect(c.visionApiKeyInput).toBe('');
    expect(c.embeddingApiKeyInput).toBe('');
    expect(c.saveOk()).toBe('models.saved');
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

describe('ModelsStateService — the two confirmations', () => {
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

describe('ModelsStateService — derived display state', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('warns that a VLM mode silently falls back to OCR when no vision model is set', () => {
    const { c } = make();
    c.setMode('vlm');
    expect(c.vlmNeededButMissing()).toBe(true);
    expect(c.docPillLabelKey()).toBe('models.docPill.fallback');
    expect(c.docVariant()).toBe('warn');
    expect(c.runLineKey()).toBe('models.runLine.fallback');
    expect(c.docSummary().key).toBe('models.docSummary.fallback');
    // The affected stages are flagged rather than shown as running normally.
    expect(c.stageClass('vlm')).toBe('warn');
  });

  it('describes a configured VLM mode as actually running', () => {
    const { c } = make(cfgFixture({ documentProcessing: { mode: 'vlm', vlmModel: 'llava' } }));
    expect(c.vlmNeededButMissing()).toBe(false);
    expect(c.docPillLabelKey()).toBe('models.docPill.active');
    expect(c.docSummary().params['model']).toBe('llava');
    expect(c.stageClass('vlm')).toBe('on');
  });

  it('OCR mode never reports a missing vision model, because it does not use one', () => {
    const { c } = make();
    c.setMode('ocr');
    expect(c.vlmNeededButMissing()).toBe(false);
    expect(c.docSummary().key).toBe('models.docSummary.ocr');
  });

  it('capability pills distinguish off / no-model / active', () => {
    const { c } = make();
    expect(c.capLabelKey('llava')).toBe('models.cap.active');
    expect(c.capVariant('llava')).toBe('active');
    expect(c.capLabelKey(undefined)).toBe('models.cap.noModel');
    expect(c.capVariant(undefined)).toBe('warn');
    c.form.enabled = false;
    expect(c.capLabelKey('llava')).toBe('models.cap.off');
    expect(c.capVariant('llava')).toBe('off');
  });

  it('setMode keeps the form and the signal in step', () => {
    const { c } = make();
    c.setMode('repair');
    expect(c.docMode()).toBe('repair');
    expect(c.form.documentProcessing?.mode).toBe('repair');
  });

  // The ladder gained `off` and renamed `max` to `repair` (owner, 2026-07-21). `off` is the rung with
  // consequences: it must read as a deliberate choice, not as a degraded or broken pipeline.
  it("'off' reads as off, not as a missing model or a fallback", () => {
    const { c } = make();
    c.setMode('off');
    expect(c.docPillLabelKey()).toBe('models.docPill.off');
    expect(c.docVariant()).toBe('off');
    expect(c.vlmNeededButMissing()).toBe(false); // nothing runs, so nothing can be missing
    expect(c.docSummary().key).toBe('models.docSummary.off');
    expect(c.runLineKey()).toBe('models.runLine.off');
    expect(c.stageClass('ocr')).toBe('dim');
  });

  it("'auto' shows the full chain, because it means the most this instance can do", () => {
    const { c } = make(cfgFixture({ documentProcessing: { mode: 'auto', vlmModel: 'llava' } }));
    expect(c.stageClass('repair')).toBe('on');
    expect(c.docSummary().params['model']).toBe('llava');
  });
});

describe('ModelsStateService — test connection', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('distinguishes unreachable from reachable-but-missing-model', () => {
    const { c } = make();
    expect(c.testPillVariant({ reachable: false } as never)).toBe('error');
    expect(c.testPillVariant({ reachable: true, modelPresent: false } as never)).toBe('warn');
    expect(c.testPillVariant({ reachable: true, modelPresent: true } as never)).toBe('ok');
  });

  it('records the result against the target that was tested', () => {
    const { c, post } = make();
    c.testConnection('vision');
    expect(post).toHaveBeenCalledWith('/api/admin/media-config/test-connection', { target: 'vision' });
    expect(c.testOf('vision')?.res?.reachable).toBe(true);
    expect(c.testOf('stt')).toBeUndefined();
  });
});

/**
 * NEW — behaviour the three-tab split introduced.
 *
 * The tabs share one form, so switching tabs must not silently discard edits. The guard has to fire
 * on a real change and stay quiet otherwise: a prompt that appears every time you look at another tab
 * is one an operator learns to dismiss without reading, which is worse than no prompt at all.
 */
describe('ModelsStateService — the cross-tab unsaved-changes guard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is clean immediately after load', () => {
    const { c } = make();
    expect(c.isDirty()).toBe(false);
  });

  it('is clean when the form was touched but nothing actually changed', () => {
    // Focusing a field, or typing and undoing, must not cost a confirmation dialog.
    const { c } = make();
    c.touched.set(true);
    expect(c.isDirty()).toBe(false);
  });

  it('is dirty once a persisted field actually changes', () => {
    const { c } = make();
    c.touched.set(true);
    c.form.documentProcessing!.renderDpi = 300;
    expect(c.isDirty()).toBe(true);
  });

  it('is dirty on a typed API key, which never appears in the payload comparison', () => {
    // The key is deliberately absent from the snapshot (masks must not be echoed back), so a
    // snapshot-only check would let a typed credential be discarded without warning.
    const { c } = make();
    c.visionApiKeyInput = 'sk-typed-but-unsaved';
    expect(c.isDirty()).toBe(true);
  });

  it('is clean again after a successful save', () => {
    const { c } = make();
    c.touched.set(true);
    c.form.documentProcessing!.renderDpi = 300;
    expect(c.isDirty()).toBe(true);
    return c.save().then(() => expect(c.isDirty()).toBe(false));
  });

  it('never prompts on an infra-managed instance, where nothing is editable', () => {
    const { c } = make(cfgFixture({ infraManaged: true }));
    c.touched.set(true);
    c.form.documentProcessing!.renderDpi = 300;
    expect(c.isDirty()).toBe(false);
  });
});
