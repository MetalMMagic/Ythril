/**
 * VLM document extractor (F11) — composes the capability pipeline for `vlm`/`auto`/`max` modes.
 *
 * Blueprint Path 2, adapted to Markdown output: run OCR (the unstructured sidecar) for both grounding
 * *evidence* and the fallback floor; render the pages; transcribe each with the VLM; then let the
 * validator (OCR-evidence coverage) decide whether to accept the VLM output or fall back to OCR — so the
 * result is never worse than plain OCR. If a capability is missing it degrades: no render/VLM → OCR; OCR
 * down but VLM up → ungrounded VLM; nothing available → the usual ConversionUnavailableError propagates.
 *
 * `max` mode adds one bounded **repair** pass: when the VLM output fails OCR-evidence validation, a single
 * text-only reconciliation call (reusing the VLM, or a wired-in `repairModel`) tries to restore the dropped
 * content before falling back to OCR. Consensus (`verify`) and the external hosted-VLM egress path
 * (with ssrfSafeFetch) are later phases.
 */
import { log } from '../../util/log.js';
import { getDocumentProcessingConfig, getMediaEmbeddingConfig, getDocAssistApiKey } from '../../config/loader.js';
import type { DocExtractionMode } from '../../config/types.js';
import { UnstructuredConverter, type UnstructuredResult } from './unstructured.js';
import { renderDocumentPages, isRenderAvailableFor } from './renderer.js';
import { transcribePageImage, repairMarkdown, repairMarkdownExternal, reconcileConsensus } from './vlm-client.js';
import type { StepProgress } from './types.js';
import { decideRoute, validateExtraction, bestByEvidence } from './extraction-policy.js';

const TRANSCRIBE_PROMPT =
  'Transcribe this document page to GitHub-Flavored Markdown, verbatim. Preserve headings, lists, and ' +
  'tables (use Markdown tables; use minimal HTML only if a table is too complex for Markdown). Do NOT ' +
  'summarize, translate, reorder, or invent content. Output only the transcription — no preamble, no commentary.';

export interface VlmExtractResult extends UnstructuredResult {
  /** Audit trail of which path produced the result: `ocr`, `ocr+vlm`, `ocr+vlm→ocr`, `vlm`, … */
  extractionPath: string;
}

/** Run the configured extraction mode for a document. `mode: 'ocr'` never calls this — the pipeline uses
 *  the plain OCR converter directly. `modeOverride` (F11-c) is the per-space override; when absent the
 *  instance-wide `documentProcessing.mode` applies. */
export async function vlmExtractDocument(
  fileBytes: Buffer,
  fileName: string,
  modeOverride?: DocExtractionMode,
  onProgress?: (p: StepProgress) => void,
): Promise<VlmExtractResult> {
  const cfg = getDocumentProcessingConfig();
  const mode = modeOverride ?? cfg.mode;
  const render = await isRenderAvailableFor(fileName);
  // `repair` reuses the VLM (or a wired-in repairModel), so it's available whenever the VLM is; decideRoute
  // only actually schedules the repair stage for `max` mode.
  const route = decideRoute(mode, { ocr: true, render, vlm: !!cfg.vlmModel, repair: !!cfg.vlmModel, verify: !!cfg.verifyModel });
  // The sections of the bar: this document's actual route, so nothing is drawn that will not run.
  const steps = route.stages as string[];

  // OCR is evidence + fallback. Tolerate it being down IF the VLM path can still run (ungrounded).
  let ocr: UnstructuredResult | null = null;
  try {
    ocr = await new UnstructuredConverter().convertRich(fileBytes, fileName);
  } catch (err) {
    if (route.ocrOnly) throw err; // no VLM path to fall through to — surface the OCR error as today
    log.warn(`VLM extract: OCR evidence unavailable (${err instanceof Error ? err.message : err}) — VLM will run ungrounded`);
  }

  if (route.ocrOnly) {
    if (route.fallbackReason) log.info(`VLM extract: ${route.fallbackReason}`);
    return { ...(ocr as UnstructuredResult), extractionPath: 'ocr' };
  }

  // ── VLM path ────────────────────────────────────────────────────────────────
  const baseUrl = cfg.vlmBaseUrl || getMediaEmbeddingConfig().vision?.baseUrl || 'http://ollama:11434';
  try {
    const { pages, truncated, total: totalPages } = await renderDocumentPages(fileBytes, {
      fileName,
      dpi: cfg.renderDpi,
      maxPages: cfg.maxPages,
      timeoutMs: cfg.pageTimeoutMs * Math.min(cfg.maxPages, 20),
    });
    if (pages.length === 0) throw new Error('render produced no pages');
    onProgress?.({ step: 'render', steps, done: pages.length, total: pages.length });
    let pagesDone = 0;

    const parts = await mapLimit(pages, cfg.concurrency, async (img) => {
      const t = await transcribePageImage(img, {
        baseUrl, model: cfg.vlmModel, prompt: TRANSCRIBE_PROMPT, timeoutMs: cfg.pageTimeoutMs,
      });
      // A finished page is the smallest honest unit of progress on this path — it is what makes a
      // long document slow rather than wedged. Counting completions rather than using the map index
      // keeps the number monotonic: pages run concurrently, so index order is not completion order
      // and a bar driven by it would jump backwards.
      onProgress?.({ step: 'vlm', steps, done: ++pagesDone, total: pages.length });
      return t.text.trim();
    });
    let markdown = parts.filter(Boolean).join('\n\n---\n\n').trim();
    if (truncated) {
      // Truncation used to leave ONLY this HTML comment buried in the converted markdown: not
      // logged, not stored, and the file still reported success. A 400-page document silently
      // became its first 50 pages, and recall then answered confidently from a tenth of it.
      markdown += `\n\n<!-- document truncated to ${pages.length} of ${totalPages} pages -->`;
      log.warn(
        `VLM extract: '${fileName}' truncated — read ${pages.length} of ${totalPages} pages ` +
        `(documentProcessing.maxPages = ${cfg.maxPages}). The rest was NOT indexed.`,
      );
    }

    // Validate against OCR evidence when we have it; otherwise just require non-empty output.
    const evidence = ocr?.markdown ?? '';
    const ranLabel = ocr ? 'ocr+vlm' : 'vlm';   // audit label for what the VLM path actually produced
    const v = validateExtraction(markdown, evidence);
    if (v.ok) {
      // ── F11-d max-mode consensus: an independent second-VLM pass + reconcile, kept only if it covers the
      // OCR evidence at least as well as the primary (never worse). Precision step on an ALREADY-accepted
      // draft; failure-gated to `max` (route has the verify stage) and to a configured verify model.
      if (route.stages.includes('verify') && cfg.verifyModel && evidence.trim()) {
        const consensus = await runConsensus(pages, markdown, evidence, cfg, baseUrl).catch(err => {
          log.warn(`VLM extract: consensus pass errored (${err instanceof Error ? err.message : err}) — keeping primary`);
          return null;
        });
        if (consensus && consensus.text !== markdown) {
          log.debug(`VLM extract: accepted ${ranLabel}+verify (coverage ${(consensus.coverage * 100).toFixed(0)}%)`);
          return { markdown: consensus.text, extractedImages: ocr?.extractedImages ?? [], extractionPath: `${ranLabel}+verify` };
        }
      }
      log.debug(`VLM extract: accepted ${ranLabel} (${pages.length} pages, coverage ${(v.coverage * 100).toFixed(0)}%)`);
      return { markdown, extractedImages: ocr?.extractedImages ?? [], extractionPath: ranLabel };
    }

    // ── max-mode repair: ONE bounded reconciliation pass against the OCR evidence before giving up ──
    // Only for `max` (route has the repair stage) and only when we have OCR evidence to reconcile against.
    // Repair can only turn a fallback into an acceptance — it never degrades a result that already passed.
    onProgress?.({ step: 'validate', steps });
    if (route.stages.includes('repair') && ocr && evidence.trim()) {
      onProgress?.({ step: 'repair', steps });
      // F11-b — route repair to the external assist model when it's configured for `repair` AND its egress
      // host has been acknowledged. The host-match is re-checked HERE so document content never leaves the
      // instance without recorded consent, even if config.json were hand-edited to add `uses` without an ack.
      const assist = cfg.assistModel;
      let useExternal = false;
      if (assist?.baseUrl && assist.model && assist.uses?.includes('repair')) {
        try { useExternal = assist.acknowledgedHost === new URL(assist.baseUrl).host; } catch { useExternal = false; }
        if (!useExternal) log.warn('VLM extract: assist model set for repair but its egress host is not acknowledged — using local repair');
      }
      const repairModel = useExternal ? assist!.model! : (cfg.repairModel || cfg.vlmModel);
      try {
        log.info(`VLM extract: validation failed (${v.issues.join('; ')}) — repairing with ${useExternal ? 'external ' : ''}${repairModel}`);
        const r = useExternal
          ? await repairMarkdownExternal({
              baseUrl: assist!.baseUrl!, model: assist!.model!, apiKey: getDocAssistApiKey(),
              draft: markdown, evidence, issues: v.issues, timeoutMs: cfg.pageTimeoutMs,
            })
          : await repairMarkdown({
              baseUrl: cfg.repairBaseUrl || baseUrl, model: repairModel, draft: markdown, evidence, issues: v.issues,
              timeoutMs: cfg.pageTimeoutMs,
            });
        const repaired = r.text.trim();
        const rv = validateExtraction(repaired, evidence, { finishReason: r.truncated ? 'length' : undefined });
        if (rv.ok) {
          log.debug(`VLM extract: accepted ${ranLabel}+repair (coverage ${(rv.coverage * 100).toFixed(0)}%)`);
          return { markdown: repaired, extractedImages: ocr.extractedImages ?? [], extractionPath: `${ranLabel}+repair` };
        }
        log.info(`VLM extract: repair still below threshold (${rv.issues.join('; ')}) — falling back to OCR`);
      } catch (err) {
        log.warn(`VLM extract: repair errored (${err instanceof Error ? err.message : err}) — falling back to OCR`);
      }
    }

    if (ocr) {
      if (!route.stages.includes('repair')) log.info(`VLM extract: validation failed (${v.issues.join('; ')}) — falling back to OCR`);
      return { ...ocr, extractionPath: `${ranLabel}→ocr` };
    }
    throw new Error(`VLM output rejected and no OCR evidence to fall back to: ${v.issues.join('; ')}`);
  } catch (err) {
    if (ocr) {
      log.warn(`VLM extract failed (${err instanceof Error ? err.message : err}) — falling back to OCR`);
      return { ...ocr, extractionPath: `${route.label}→ocr` };
    }
    throw err; // nothing produced a result — let the pipeline surface the failure as today
  }
}

/**
 * F11-d — one bounded consensus pass. A second VLM (`verifyModel`) independently transcribes the pages; its
 * draft is reconciled with the primary against the OCR evidence; the highest-OCR-coverage of the three
 * (primary, second draft, reconciled) is returned. The primary is listed FIRST so ties keep it — consensus
 * can only match or beat the primary's coverage, never regress it.
 */
async function runConsensus(
  pages: Buffer[],
  primary: string,
  evidence: string,
  cfg: ReturnType<typeof getDocumentProcessingConfig>,
  baseUrl: string,
): Promise<{ text: string; coverage: number }> {
  const verifyBase = cfg.verifyBaseUrl || baseUrl;
  const parts = await mapLimit(pages, cfg.concurrency, async (img) => {
    const t = await transcribePageImage(img, {
      baseUrl: verifyBase, model: cfg.verifyModel, prompt: TRANSCRIBE_PROMPT, timeoutMs: cfg.pageTimeoutMs,
    });
    return t.text.trim();
  });
  const second = parts.filter(Boolean).join('\n\n---\n\n').trim();

  const candidates: { text: string; label: string }[] = [{ text: primary, label: 'primary' }];
  if (second) candidates.push({ text: second, label: 'verify' });

  // Reconcile the two drafts (text-only) via the repair/vlm model; add as a third candidate when non-empty.
  if (second) {
    try {
      const r = await reconcileConsensus({
        baseUrl: cfg.repairBaseUrl || baseUrl, model: cfg.repairModel || cfg.vlmModel,
        draftA: primary, draftB: second, evidence, timeoutMs: cfg.pageTimeoutMs,
      });
      const reconciled = r.text.trim();
      if (reconciled) candidates.push({ text: reconciled, label: 'consensus' });
    } catch (err) {
      log.warn(`VLM extract: consensus reconcile errored (${err instanceof Error ? err.message : err}) — arbitrating on the drafts`);
    }
  }

  const best = bestByEvidence(candidates, evidence);
  return { text: best.candidate.text, coverage: best.coverage };
}

/** Bounded-concurrency map — at most `limit` in flight, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}
