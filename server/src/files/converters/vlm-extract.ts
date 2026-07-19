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
import { getDocumentProcessingConfig, getMediaEmbeddingConfig } from '../../config/loader.js';
import { UnstructuredConverter, type UnstructuredResult } from './unstructured.js';
import { renderPdfPages, isRenderAvailable } from './renderer.js';
import { transcribePageImage, repairMarkdown } from './vlm-client.js';
import { decideRoute, validateExtraction } from './extraction-policy.js';

const TRANSCRIBE_PROMPT =
  'Transcribe this document page to GitHub-Flavored Markdown, verbatim. Preserve headings, lists, and ' +
  'tables (use Markdown tables; use minimal HTML only if a table is too complex for Markdown). Do NOT ' +
  'summarize, translate, reorder, or invent content. Output only the transcription — no preamble, no commentary.';

export interface VlmExtractResult extends UnstructuredResult {
  /** Audit trail of which path produced the result: `ocr`, `ocr+vlm`, `ocr+vlm→ocr`, `vlm`, … */
  extractionPath: string;
}

/** Run the configured extraction mode for a document. `mode: 'ocr'` never calls this — the pipeline uses
 *  the plain OCR converter directly. */
export async function vlmExtractDocument(fileBytes: Buffer, fileName: string): Promise<VlmExtractResult> {
  const cfg = getDocumentProcessingConfig();
  const render = await isRenderAvailable();
  // `repair` reuses the VLM (or a wired-in repairModel), so it's available whenever the VLM is; decideRoute
  // only actually schedules the repair stage for `max` mode.
  const route = decideRoute(cfg.mode, { ocr: true, render, vlm: !!cfg.vlmModel, repair: !!cfg.vlmModel, verify: false });

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
    const { pages, truncated } = await renderPdfPages(fileBytes, {
      dpi: cfg.renderDpi,
      maxPages: cfg.maxPages,
      timeoutMs: cfg.pageTimeoutMs * Math.min(cfg.maxPages, 20),
    });
    if (pages.length === 0) throw new Error('render produced no pages');

    const parts = await mapLimit(pages, cfg.concurrency, async (img) => {
      const t = await transcribePageImage(img, {
        baseUrl, model: cfg.vlmModel, prompt: TRANSCRIBE_PROMPT, timeoutMs: cfg.pageTimeoutMs,
      });
      return t.text.trim();
    });
    let markdown = parts.filter(Boolean).join('\n\n---\n\n').trim();
    if (truncated) markdown += `\n\n<!-- document truncated to ${pages.length} pages -->`;

    // Validate against OCR evidence when we have it; otherwise just require non-empty output.
    const evidence = ocr?.markdown ?? '';
    const ranLabel = ocr ? 'ocr+vlm' : 'vlm';   // audit label for what the VLM path actually produced
    const v = validateExtraction(markdown, evidence);
    if (v.ok) {
      log.debug(`VLM extract: accepted ${ranLabel} (${pages.length} pages, coverage ${(v.coverage * 100).toFixed(0)}%)`);
      return { markdown, extractedImages: ocr?.extractedImages ?? [], extractionPath: ranLabel };
    }

    // ── max-mode repair: ONE bounded reconciliation pass against the OCR evidence before giving up ──
    // Only for `max` (route has the repair stage) and only when we have OCR evidence to reconcile against.
    // Repair can only turn a fallback into an acceptance — it never degrades a result that already passed.
    if (route.stages.includes('repair') && ocr && evidence.trim()) {
      const repairModel = cfg.repairModel || cfg.vlmModel;
      const repairBase = cfg.repairBaseUrl || baseUrl;
      try {
        log.info(`VLM extract: validation failed (${v.issues.join('; ')}) — repairing with ${repairModel}`);
        const r = await repairMarkdown({
          baseUrl: repairBase, model: repairModel, draft: markdown, evidence, issues: v.issues,
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
