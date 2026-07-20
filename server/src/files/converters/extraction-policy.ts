/**
 * Document-extraction routing + validation policy (F11) — pure, no I/O.
 *
 * The "capability registry / orchestrator" of the OCR-Blueprint, miniaturised to a decision function:
 * given the configured `mode` and which capabilities are reachable, `decideRoute` picks the stages to run
 * (blueprint "if available" routing), always degrading gracefully to plain OCR so the VLM path is never
 * worse than today. `validateExtraction` is the control signal (blueprint "validation as the steering
 * wheel") — its OCR-evidence coverage check decides whether to accept, promote to a repair model, or fall
 * back to OCR. Kept pure so it is exhaustively unit-testable without a sidecar or a model.
 */
import type { DocExtractionMode } from '../../config/types.js';

/** Which extraction capabilities are currently configured + reachable. */
export interface CapabilityAvailability {
  ocr: boolean;     // unstructured sidecar — text/table evidence + the OCR fallback floor
  render: boolean;  // page rasterizer sidecar (PDF/doc → page images)
  vlm: boolean;     // document VLM (OCR-grounded page → Markdown)
  repair: boolean;  // heavyweight review/repair model (promotion on validation failure)
  verify: boolean;  // optional consensus model
}

export type ExtractionStage = 'ocr' | 'render' | 'ocr-evidence' | 'vlm' | 'validate' | 'repair' | 'verify';

export interface ExtractionRoute {
  /** Ordered stages the extractor will run. */
  stages: ExtractionStage[];
  /** True when this is the plain-OCR path (no VLM). */
  ocrOnly: boolean;
  /** Short audit label recorded per document, e.g. `ocr`, `ocr+vlm`, `ocr+vlm+repair`. */
  label: string;
  /** Set when a VLM mode degraded to OCR because a required capability was absent. */
  fallbackReason?: string;
}

const OCR_ROUTE: ExtractionRoute = { stages: ['ocr'], ocrOnly: true, label: 'ocr' };

/**
 * Decide the extraction route. Never throws: VLM modes that lack `render` or `vlm` degrade to OCR (with a
 * reason); `ocr` mode always runs OCR. If OCR itself is unavailable the extractor surfaces the usual
 * `ConversionUnavailableError` downstream — routing does not mask that.
 */
export function decideRoute(mode: DocExtractionMode, avail: CapabilityAvailability): ExtractionRoute {
  if (mode === 'ocr') return OCR_ROUTE;

  // Every VLM mode needs page rasterization AND a VLM; otherwise fall back to OCR.
  if (!avail.render || !avail.vlm) {
    const missing = [!avail.render ? 'render' : null, !avail.vlm ? 'vlm' : null].filter(Boolean).join(' + ');
    return { ...OCR_ROUTE, fallbackReason: `mode '${mode}' needs ${missing}; fell back to OCR` };
  }

  const stages: ExtractionStage[] = ['render'];
  const label: string[] = [];
  if (avail.ocr) { stages.push('ocr-evidence'); label.push('ocr'); } // OCR grounding (blueprint Path 2)
  stages.push('vlm', 'validate');
  label.push('vlm');

  // `max` composes the heavyweight tiers when they're wired in (promotion is runtime, gated on validation).
  if (mode === 'max' && avail.repair) { stages.push('repair'); label.push('repair'); }
  if (mode === 'max' && avail.verify) { stages.push('verify'); label.push('verify'); }

  return { stages, ocrOnly: false, label: label.join('+') };
}

// ── Validation (the control signal) ─────────────────────────────────────────

/** Coverage tokens: lowercased alphanumeric runs of length ≥ 3 (ignores punctuation/short noise). */
export function coverageTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
}

/**
 * Fraction (0..1) of the OCR-evidence tokens that survive into the result — the load-bearing check that
 * the VLM didn't silently drop or hallucinate away the OCR-grounded content. Returns 1 when there is no
 * evidence to compare against (nothing to violate).
 */
export function evidenceCoverage(resultText: string, evidenceText: string): number {
  const evidence = new Set(coverageTokens(evidenceText));
  if (evidence.size === 0) return 1;
  const result = new Set(coverageTokens(resultText));
  let hit = 0;
  for (const t of evidence) if (result.has(t)) hit++;
  return hit / evidence.size;
}

/**
 * F11-d consensus arbitration — pure. Given several candidate transcriptions of the same document (the
 * primary VLM draft, a second-model draft, and their reconciliation) plus the OCR evidence, pick the one
 * with the highest OCR-evidence coverage. Ties keep the EARLIER candidate, so callers list the primary
 * first and consensus can only ever match or beat it — i.e. it is **never worse** than the primary.
 * `evidence` empty ⇒ every candidate scores 1, so the primary (first) wins unchanged.
 */
export function bestByEvidence<T extends { text: string }>(
  candidates: T[],
  evidence: string,
): { candidate: T; coverage: number; index: number } {
  let best = { candidate: candidates[0]!, coverage: -1, index: 0 };
  candidates.forEach((c, i) => {
    const coverage = evidenceCoverage(c.text, evidence);
    if (coverage > best.coverage) best = { candidate: c, coverage, index: i };
  });
  return best;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
  /** OCR-evidence coverage that was measured (0..1). */
  coverage: number;
}

export interface ValidateOptions {
  /** Minimum evidence-coverage fraction to accept. Default 0.6. */
  minCoverage?: number;
  /** The model's finish reason, when known — `'length'` signals truncation. */
  finishReason?: string;
}

/**
 * Validate an extraction result against the OCR evidence. A failing result drives promotion (to a repair
 * model in `max` mode) or, at the floor, a fall back to plain OCR — the extractor decides which based on
 * the route.
 */
export function validateExtraction(resultText: string, evidenceText: string, opts: ValidateOptions = {}): ValidationResult {
  const issues: string[] = [];
  if (!resultText.trim()) issues.push('empty output');
  if (opts.finishReason === 'length') issues.push('truncated (hit max tokens)');

  const coverage = evidenceCoverage(resultText, evidenceText);
  const minCoverage = opts.minCoverage ?? 0.6;
  if (evidenceText.trim() && coverage < minCoverage) {
    issues.push(`low OCR-evidence coverage ${(coverage * 100).toFixed(0)}% (< ${(minCoverage * 100).toFixed(0)}%)`);
  }

  return { ok: issues.length === 0, issues, coverage };
}
