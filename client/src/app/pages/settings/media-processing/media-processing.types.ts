/**
 * Shared types for Settings → Models & Pipelines.
 *
 * Lifted out of the single 656-line `mediaProcessing.component.ts` so the three tabs and the provider card can
 * agree on one shape. They previously existed once, inside the component that also rendered them —
 * which is why four provider cards written in that one file each ended up with their own field order.
 */

export interface ProviderCfg { label?: string; baseUrl?: string; model?: string; apiKey?: string; }

/** Result of probing a model endpoint (reachability + whether the model is present). F11-PR5b. */
export interface TestResult {
  ok: boolean; reachable: boolean; status?: number; models?: string[];
  modelPresent?: boolean; detail?: string; latencyMs: number;
}

export type TestTarget = 'vision' | 'stt' | 'assist' | 'embedding';

/** Text-embedding config (top-level `config.embedding`, surfaced on this page). Changing
 *  model/dimensions/similarity re-indexes every vector — the save gates those behind a confirmation. */
export interface EmbeddingCfg {
  provider?: 'local' | 'external';
  baseUrl?: string | null; model?: string; dimensions?: number;
  similarity?: 'cosine' | 'dotProduct' | 'euclidean';
  apiKey?: string;
}

export type DocMode = 'off' | 'ocr' | 'vlm' | 'repair' | 'auto';
export type DocAssistUse = 'repair';

/** F11-b — external "assist model": a bigger, hosted LLM (own endpoint) assigned to specific tasks.
 *  The only path that sends document content off the instance, so it is gated by an egress
 *  acknowledgment that must be re-given whenever the host changes. */
export interface DocAssistCfg {
  baseUrl?: string; model?: string; apiKey?: string; uses?: DocAssistUse[]; acknowledgedHost?: string;
}

export interface DocProcCfg {
  mode?: DocMode;
  renderDpi?: number; maxPages?: number; pageTimeoutMs?: number; concurrency?: number; ocrTimeoutMs?: number;
  // read-only (env/config-file only — never PATCHed from here)
  vlmModel?: string; vlmBaseUrl?: string; repairModel?: string; repairBaseUrl?: string;
  verifyModel?: string; verifyBaseUrl?: string;
  assistModel?: DocAssistCfg;
}

/**
 * Instance CEILINGS per media class (#356) — the most a space is allowed to do, not a default it
 * inherits. Returned by GET and rendered read-only: `PATCH /api/admin/media-config` has no schema for
 * them, so they are config/env-owned today. Making them editable is deliberately its own change —
 * lowering a ceiling silently caps every space above it, and `off` takes a class offline everywhere.
 */
export interface MediaLevelCeilings {
  images?: string; audio?: string; video?: string; text?: string;
}

/** The four classes that have their own ladder. Documents has its own control (`documentProcessing.mode`). */
export type MediaClass = 'images' | 'audio' | 'video' | 'text';

/**
 * The ladders, low → high, mirroring `server/src/config/types.ts`.
 *
 * `auto` is listed FIRST in each because it is the default and means "as much as is possible" — it
 * does not rank, so putting it at the top of a list ordered by capability would be a lie about where
 * it sits. The server validates against its own copy; these only drive the pickers.
 */
export const IMAGE_LEVELS = ['auto', 'off', 'caption', 'recognition'] as const;
export const AUDIO_LEVELS = ['auto', 'off', 'on'] as const;
export const VIDEO_LEVELS = ['auto', 'off', 'audio', 'full'] as const;
export const TEXT_LEVELS = ['auto', 'off', 'embed', 'chunk'] as const;

/**
 * Face recognition (#345 env half, operator control added later).
 *
 * `modelPath` and `reprocessSyncedImages` are deliberately absent: both are infra-shaped and stay
 * env/config-only, so the admin API cannot set them and this block does not carry them.
 */
export interface FaceRecognitionCfg {
  enabled?: boolean;
  confidenceThreshold?: number;
  minFaceSizeFraction?: number;
  personEntityTypes?: string[];
  /** Optional external provider. Configuring one egresses BIOMETRIC data — see `acknowledgedHost`. */
  externalModel?: FaceExternalCfg;
}

export interface FaceExternalCfg {
  baseUrl?: string;
  model?: string;
  /** Masked by the server on read; only a newly typed key is ever sent back. */
  apiKey?: string;
  /** Host the operator consented to. Must match `baseUrl`'s host or the endpoint stays unused. */
  acknowledgedHost?: string;
}

export interface MediaCfg {
  // No master `enabled` switch — media embedding is always on; each class is gated by `levels`.
  levels?: MediaLevelCeilings;
  faceRecognition?: FaceRecognitionCfg;
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

export const MODE_DESC: Record<DocMode, string> = {
  off:    'Documents are stored but never read. No text is extracted, so nothing from them can be recalled.',
  ocr:    'The OCR sidecar (Tesseract) reads text and tables from each page. Fast, fully local, no vision model needed.',
  vlm:    'Render each page and transcribe it with the vision model, grounded on the OCR text.',
  repair: 'VLM, plus a repair pass that reconciles the draft against the OCR text — and a second-model consensus pass when a verify model is set.',
  auto:   'As much as this instance can do: the repair pass when a repair model is configured, otherwise the vision model, otherwise OCR.',
};

/** Which pipeline stages are active per mode (drives the diagram). */
export const MODE_STAGES: Record<DocMode, Set<string>> = {
  off:    new Set([]),
  ocr:    new Set(['ocr']),
  vlm:    new Set(['ocr', 'render', 'vlm', 'validate']),
  repair: new Set(['ocr', 'render', 'vlm', 'validate', 'repair', 'verify']),
  // 'auto' resolves to the top rung the instance can run, so it shows the full chain — the stages it
  // cannot run are the same ones the missing-model warning already calls out.
  auto:   new Set(['ocr', 'render', 'vlm', 'validate', 'repair', 'verify']),
};

export const STAGES = [
  { key: 'ocr', nm: 'OCR', sub: 'evidence' },
  { key: 'render', nm: 'Render', sub: 'page → PNG' },
  { key: 'vlm', nm: 'VLM', sub: 'vision' },
  { key: 'validate', nm: 'Validate', sub: 'coverage' },
  { key: 'repair', nm: 'Repair', sub: 'reconcile' },
  { key: 'verify', nm: 'Verify', sub: 'consensus' },
];

// ── Pipeline status (GET /api/admin/pipeline-status, shipped in #360) ─────────

export type HealthState = 'ok' | 'degraded' | 'down' | 'blocked' | 'off' | 'unconfigured';

export interface SidecarStatus {
  key: string; label: string; envVar: string; url: string;
  state: HealthState; latencyMs?: number; detail?: string;
}

export interface ModelStageStatus {
  key: string; label: string; model: string | null; endpoint: string | null; external: boolean;
  state: HealthState; latencyMs?: number; detail?: string;
}

export interface CollectionIndexStatus { collection: string; indexName: string; status: string | null; }

export interface SpaceIndexStatus {
  id: string; label: string;
  stored: 'building' | 'ready' | 'failed' | 'unknown';
  live: 'ready' | 'building' | 'missing' | 'unknown';
  collections: CollectionIndexStatus[];
  /** Config claims ready and the database disagrees — the silent index-loss signature. */
  drifted: boolean;
}

export interface PipelineStatus {
  checkedAt: string;
  sidecars: SidecarStatus[];
  models: ModelStageStatus[];
  index: { spaces: SpaceIndexStatus[]; unavailable?: string };
  faceRecognition: { state: HealthState };
}
