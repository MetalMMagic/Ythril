/**
 * Admin media embedding configuration API.
 *
 *   GET  /api/admin/media-config   — return current config + lockedByInfra fields
 *   PATCH /api/admin/media-config  — update writable fields in config.json
 *
 * Fields supplied by env vars (listed in `lockedByInfra`) are returned as-is
 * but PATCH rejects attempts to overwrite them.
 */

import { Router } from 'express';
import { z } from 'zod';
import { getConfig, saveConfig, getMediaEmbeddingConfig, getSecrets, saveSecrets, getDocAssistApiKey, getNliApiKey, getEmbeddingConfig, getEmbeddingApiKey, getRerankApiKey } from '../config/loader.js';
import { DOC_EXTRACTION_MODES_IN, IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS, normalizeDocExtractionMode } from '../config/types.js';
import type { MediaLevelCeilings } from '../config/types.js';
import { requireAdmin, requireAdminMfa } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { isSsrfSafeUrl, ssrfSafeFetch } from '../util/ssrf.js';
import {
  allowPrivateForSlot, isLocalModelEndpoint, privateAddressHint, type EgressSlot,
} from '../config/model-egress-policy.js';
import { listUrlFor, type VlmWire } from '../files/converters/vlm-endpoint.js';
import { log } from '../util/log.js';
import { providerSignature, getActiveProviderSignature } from '../files/media/worker.js';
import { MIN_CANDIDATE_MULTIPLIER, MAX_CANDIDATE_MULTIPLIER } from '../brain/rerank-client.js';
import { MAX_EMBED_CONCURRENCY } from '../files/converters/embed-concurrency.js';
import { mergeEmbeddingPatch } from '../config/embedding-patch.js';

export const mediaConfigRouter = Router();

// Rate-limit applies to both methods. Auth differs by mutation level:
//   GET  → requireAdmin (read of (masked) config)
//   PATCH → requireAdminMfa (mutates security-relevant config: external endpoints, API keys)
mediaConfigRouter.use(globalRateLimit);

// ── GET /api/admin/media-config ───────────────────────────────────────────────

mediaConfigRouter.get('/', requireAdmin, (req, res) => {
  const cfg = getMediaEmbeddingConfig();
  // Never return API keys in plaintext — mask them
  const masked = maskSecrets(cfg) as Record<string, unknown>;
  // Is the media worker still running the PREVIOUS providers? It re-reads this
  // config on its next poll tick, so a pending change applies on its own — no
  // restart. Surfacing it lets the UI show "applying…" instead of leaving the
  // operator guessing whether their provider switch is live yet.
  masked['providerReloadPending'] = getActiveProviderSignature() !== providerSignature(cfg);
  // Text embedding lives at top-level config.embedding but is surfaced here so it's on the Models page.
  const emb = getEmbeddingConfig();
  masked['embedding'] = { ...emb, apiKey: emb.apiKey ? '••••••••' : undefined };
  res.json(masked);
});

// ── PATCH /api/admin/media-config ─────────────────────────────────────────────

const ProviderPatchSchema = z.object({
  baseUrl: z.string().url().optional(),
  model: z.string().max(128).optional(),
  apiKey: z.string().max(512).optional().nullable(),
  label: z.string().max(128).optional(),
}).strict();

// F11 — document-processing / extraction settings. Shallow-merged like `vision`/`stt`: the client sends
// the full block. `ocr` mode = today's behaviour; `vlm`/`auto`/`max` opt into the VLM pipeline.
// F11-b — external assist model. `apiKey` is split into secrets.json (like vision/stt). `acknowledgedHost`
// records the operator's egress consent; the handler requires it to match `baseUrl`'s host whenever the
// extraction rung can actually reach the endpoint (mode `repair`/`auto`).
const AssistModelPatchSchema = z.object({
  baseUrl: z.string().url().optional(),
  model: z.string().max(128).optional(),
  apiKey: z.string().max(512).optional().nullable(),
  acknowledgedHost: z.string().max(255).optional(),
}).strict();

const DocumentProcessingPatchSchema = z.object({
  strategy: z.enum(['hi_res', 'auto', 'fast', 'ocr_only']).optional(),
  extractImages: z.boolean().optional(),
  // `max` accepted as the legacy spelling of `repair`; normalised before it is stored.
  mode: z.enum(DOC_EXTRACTION_MODES_IN).optional(),
  renderDpi: z.number().int().min(72).max(600).optional(),
  maxPages: z.number().int().min(1).max(2_000).optional(),
  pageTimeoutMs: z.number().int().min(1_000).max(600_000).optional(),
  concurrency: z.number().int().min(1).max(8).optional(),
  ocrTimeoutMs: z.number().int().min(10_000).max(1_800_000).optional(),
  assistModel: AssistModelPatchSchema.optional(),
}).strict();

// Text-embedding provider. Lives at top-level `config.embedding` (not under mediaEmbedding), but is
// surfaced/edited here so all model config sits on one page. `model`/`dimensions`/`similarity` changes
// re-index every vector — the client gates those behind an explicit confirmation. `apiKey` → secrets.json.
const EmbeddingPatchSchema = z.object({
  provider: z.enum(['local', 'external']).optional(),
  baseUrl: z.string().url().optional().nullable(),
  model: z.string().min(1).max(256).optional(),
  dimensions: z.number().int().min(1).max(16_384).optional(),
  similarity: z.enum(['cosine', 'dotProduct', 'euclidean']).optional(),
  // Also re-indexes every vector: the prefix is part of the embedded string, so changing the scheme
  // changes the vector for identical text. Gated by the same client confirmation as model/dimensions.
  prefixScheme: z.enum(['auto', 'none', 'nomic', 'qwen']).optional(),
  // Chunk-embed concurrency. Accepted here as well as by env so an operator can tune it without a redeploy;
  // the ceiling is the one `embedConcurrency()` clamps to, imported rather than repeated. Absent means "use
  // the per-embedder default", which is why there is no value that means that — clearing it is `null`.
  embedConcurrency: z.number().int().min(1).max(MAX_EMBED_CONCURRENCY).optional().nullable(),
  apiKey: z.string().max(512).optional().nullable(),
}).strict();

// Reranker — the cross-encoder that re-scores retrieval candidates. `apiKey` → secrets.json, like every
// other provider. `baseUrl` is nullable so the operator can turn reranking back OFF from the UI: the
// feature is gated on being configured (no master toggle, matching `nli`), so clearing the URL is how it
// gets switched off, and a field that can only ever be set would be a one-way door.
const RerankPatchSchema = z.object({
  baseUrl: z.string().url().optional().nullable(),
  model: z.string().max(128).optional().nullable(),
  apiKey: z.string().max(512).optional().nullable(),
  candidateMultiplier: z.number().int().min(MIN_CANDIDATE_MULTIPLIER).max(MAX_CANDIDATE_MULTIPLIER).optional(),
}).strict();

/**
 * NLI — the contradiction judge (F-REVIEW). Same shape and the same nullable-to-clear rule as the
 * reranker, and for the same reason: there is no master toggle, so clearing the URL is how it is turned
 * off, and a field that can only ever be SET would be a one-way door.
 *
 * It was configurable by env and `config.json` from the start but never reachable from the admin API, so
 * the Models screen — the one page that claims to list what the pipeline calls — was silently missing it.
 */
const NliPatchSchema = z.object({
  baseUrl: z.string().url().optional().nullable(),
  model: z.string().max(128).optional().nullable(),
  apiKey: z.string().max(512).optional().nullable(),
}).strict();

/**
 * Instance CEILINGS per media class — the most any space is allowed to do, not a default it inherits.
 *
 * Built from the same `*_LEVELS` constants the lattice in `files/converters/media-level.ts` uses, so
 * the API and the ladder cannot drift apart. Four hand-written enums here is exactly how one class
 * quietly acquires a rung the resolver has never heard of.
 *
 * Each field is independently optional and the handler merges per class: a patch that names only
 * `images` must not drop `audio`/`video`/`text`. They would not stay dropped either — the loader
 * defaults an absent class to `auto` — so a whole-object replace would silently RAISE the ceiling on
 * every class the client did not mention.
 */
const LevelsPatchSchema = z.object({
  images: z.enum(IMAGE_LEVELS).optional(),
  audio: z.enum(AUDIO_LEVELS).optional(),
  video: z.enum(VIDEO_LEVELS).optional(),
  text: z.enum(TEXT_LEVELS).optional(),
}).strict();

/**
 * Face recognition — the one model in the pipeline an operator could not switch off.
 *
 * `modelPath` is deliberately ABSENT and stays env/config-only. It is a filesystem path, and a field
 * that selects which files the process loads should not be settable from the admin API — the same
 * reasoning that keeps `allowPrivateModelEndpoints` and the document model endpoints off this route.
 * `reprocessSyncedImages` is likewise infra-shaped (it decides whether a network peer's images get
 * re-analysed locally) and is left where it is.
 */
const FaceRecognitionPatchSchema = z.object({
  // No `enabled` — face recognition is gated by the image ladder's `recognition` rung (a per-space choice
  // under an instance ceiling), and the surviving `faceRecognition.enabled` is an INFRA pin set by env
  // only. Accepting it here would hand the API back the switch the UI just lost.
  confidenceThreshold: z.number().min(0).max(1).optional(),
  minFaceSizeFraction: z.number().min(0).max(1).optional(),
  personEntityTypes: z.array(z.string().min(1).max(64)).max(32).optional(),
  // Optional external face model. Same shape and same rules as `documentProcessing.assistModel`, because
  // it is the same problem with higher stakes: this one egresses BIOMETRIC data.
  externalModel: z.object({
    baseUrl: z.string().url().optional(),
    model: z.string().max(128).optional(),
    apiKey: z.string().max(512).optional().nullable(),
    acknowledgedHost: z.string().max(255).optional(),
  }).strict().optional(),
}).strict();

const MediaConfigPatchSchema = z.object({
  // No `enabled` — the media-embedding master switch was removed; each class is controlled via `levels`.
  levels: LevelsPatchSchema.optional(),
  faceRecognition: FaceRecognitionPatchSchema.optional(),
  visionProvider: z.enum(['local', 'external']).optional(),
  sttProvider: z.enum(['local', 'external']).optional(),
  vision: ProviderPatchSchema.optional(),
  stt: ProviderPatchSchema.optional(),
  embedding: EmbeddingPatchSchema.optional(),
  rerank: RerankPatchSchema.optional(),
  nli: NliPatchSchema.optional(),
  documentProcessing: DocumentProcessingPatchSchema.optional(),
  workerConcurrency: z.number().int().min(1).max(16).optional(),
  workerPollIntervalMs: z.number().int().min(100).max(60_000).optional(),
  workerMaxPollIntervalMs: z.number().int().min(1_000).max(600_000).optional(),
  fallbackToExternal: z.boolean().optional(),
  maxFileSizeBytes: z.number().int().min(1).max(10_737_418_240 /* 10 GiB */).optional(),
  stalledJobTimeoutMs: z.number().int().min(30_000).max(3_600_000).optional(),
}).strict();

mediaConfigRouter.patch('/', requireAdminMfa, (req, res) => {
  const parsed = MediaConfigPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const activeCfg = getMediaEmbeddingConfig();

  // Levels and extraction mode only — these decide what gets processed and what leaves the instance, which
  // is exactly what an operator needs explained after the fact. The SAME payload carries provider API
  // keys; handing the whole thing over is safe because `audit-changes.ts` reads only the allowlisted
  // paths, but the snapshot is narrowed here as well so the intent is visible at the call site.
  req.auditSnapshots = {
    before: { levels: { ...(activeCfg.levels ?? {}) }, documentProcessing: { mode: activeCfg.documentProcessing?.mode } },
    after: {
      levels: { ...(activeCfg.levels ?? {}), ...(parsed.data.levels ?? {}) },
      documentProcessing: { mode: parsed.data.documentProcessing?.mode ?? activeCfg.documentProcessing?.mode },
    },
  };

  // F11 — whole-config infra lock (like YTHRIL_MONGO_INFRA_MANAGED for the database). When the media/model
  // configuration is managed by infrastructure, the admin API refuses all edits — change config.json / env.
  if (activeCfg.infraManaged) {
    res.status(409).json({
      error: 'Media & model configuration is infra-managed on this instance (YTHRIL_MEDIA_INFRA_MANAGED=true or mediaEmbedding.infraManaged). Update it in your infrastructure config (config.json / environment) instead.',
      code: 'INFRA_MANAGED',
    });
    return;
  }

  const locked = new Set(activeCfg.lockedByInfra ?? []);

  const blocked = blockedByInfra(parsed.data, locked);
  if (blocked.length > 0) {
    res.status(403).json({
      error: 'Fields are locked by infrastructure env vars and cannot be changed via the UI',
      locked: blocked,
    });
    return;
  }

  // ── SSRF guard for external provider URLs ──────────────────────────────────
  // Local providers are trusted (cluster DNS — `*.svc.cluster.local`, addressed
  // via NetworkPolicy). External providers are admin-typed URLs that must
  // resolve to a public endpoint, never to private networks or cloud metadata.
  // Opt-in for self-hosted endpoints on private addresses (env/config only — never a field on this PATCH,
  // so the admin API cannot widen its own egress). Resolved PER SLOT: the save-time check has to agree with
  // what the runtime client will actually be allowed to do, or one of the two is lying. A single instance-
  // wide answer here would accept a private URL for the one endpoint the operator deliberately kept strict.
  const effectiveVisionType = parsed.data.visionProvider ?? activeCfg.visionProvider ?? 'local';
  const effectiveSttType    = parsed.data.sttProvider    ?? activeCfg.sttProvider    ?? 'local';
  if (effectiveVisionType === 'external' && parsed.data.vision?.baseUrl
      && !isSsrfSafeUrl(parsed.data.vision.baseUrl, allowPrivateForSlot('vision'))) {
    res.status(400).json({ error: 'vision.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('vision') });
    return;
  }
  if (effectiveSttType === 'external' && parsed.data.stt?.baseUrl
      && !isSsrfSafeUrl(parsed.data.stt.baseUrl, allowPrivateForSlot('stt'))) {
    res.status(400).json({ error: 'stt.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('stt') });
    return;
  }
  // Text-embedding external endpoint — same SSRF rule (only when the effective provider is external).
  const effectiveEmbType = parsed.data.embedding?.provider ?? getEmbeddingConfig().provider ?? 'local';
  if (effectiveEmbType === 'external' && parsed.data.embedding?.baseUrl
      && !isSsrfSafeUrl(parsed.data.embedding.baseUrl, allowPrivateForSlot('embedding'))) {
    res.status(400).json({ error: 'embedding.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('embedding') });
    return;
  }

  // Reranker endpoint. No `provider` field to branch on — a reranker is either a sidecar or it is not —
  // so the LOCAL-endpoint predicate decides: loopback/bare-hostname is the bundled shape and skips the
  // check, anything else is egress and must be a public http(s) URL (or opted in via
  // allowPrivateModelEndpoints). Gating on a config toggle instead would let a typo'd public hostname
  // through as "local".
  const rerankPatch = parsed.data.rerank;
  if (rerankPatch !== undefined && (locked.has('rerank.baseUrl') || locked.has('rerank.model') || locked.has('rerank.apiKey'))) {
    res.status(403).json({ error: 'The reranker is locked by infrastructure env vars and cannot be changed via the UI' });
    return;
  }
  if (rerankPatch?.baseUrl && !isLocalModelEndpoint(rerankPatch.baseUrl)
      && !isSsrfSafeUrl(rerankPatch.baseUrl, allowPrivateForSlot('rerank'))) {
    res.status(400).json({ error: 'rerank.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('rerank') });
    return;
  }

  // NLI (contradiction judge) — identical enforcement to the reranker. It sees PAIRS OF RECORD TEXTS,
  // so it is an egress path of the same weight as vision or STT, not an infrastructure detail.
  const nliPatch = parsed.data.nli;
  if (nliPatch !== undefined && (locked.has('nli.baseUrl') || locked.has('nli.model') || locked.has('nli.apiKey'))) {
    res.status(403).json({ error: 'The contradiction judge is locked by infrastructure env vars and cannot be changed via the UI' });
    return;
  }
  if (nliPatch?.baseUrl && !isLocalModelEndpoint(nliPatch.baseUrl)
      && !isSsrfSafeUrl(nliPatch.baseUrl, allowPrivateForSlot('nli'))) {
    res.status(400).json({ error: 'nli.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('nli') });
    return;
  }

  // ── External FACE model — locked check + SSRF + biometric-egress acknowledgment ──
  // Same enforcement as the assist model below, for a stronger reason: this endpoint receives face crops,
  // which are biometric data. Consent is keyed off the endpoint being USABLE (a base URL is set), not off
  // a tick, so it cannot be side-stepped by configuring an endpoint and acknowledging nothing.
  const facePatch = parsed.data.faceRecognition?.externalModel;
  if (facePatch !== undefined && locked.has('faceRecognition.externalModel')) {
    res.status(403).json({
      error: 'The external face model is locked by infrastructure env vars and cannot be changed via the UI',
      locked: ['faceRecognition.externalModel'],
    });
    return;
  }
  {
    // Biometric egress consent. Same rule as the assist model and for a stronger reason: face crops are
    // biometric data. Keyed off the endpoint being USABLE (a base URL is set) rather than off a tick, so
    // consent cannot be side-stepped by configuring the endpoint and acknowledging nothing.
    const existingFace = activeCfg.faceRecognition?.externalModel ?? {};
    const effBaseUrl = facePatch?.baseUrl ?? existingFace.baseUrl;
    const effAck = facePatch?.acknowledgedHost ?? existingFace.acknowledgedHost;
    if (effBaseUrl) {
      if (!isSsrfSafeUrl(effBaseUrl, allowPrivateForSlot('faceExternal'))) {
        res.status(400).json({ error: 'faceRecognition.externalModel.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('faceExternal') });
        return;
      }
      let host: string;
      try { host = new URL(effBaseUrl).host; } catch { res.status(400).json({ error: 'faceRecognition.externalModel.baseUrl is not a valid URL' }); return; }
      if (effAck !== host) {
        res.status(400).json({
          error: `Egress to ${host} must be acknowledged before the external face model can be used: face crops (biometric data) would be sent there.`,
          needsAcknowledgment: host,
        });
        return;
      }
    }
  }

  // ── F11-b: external assist model — locked check + SSRF + egress-acknowledgment enforcement ──
  // This is the only path that sends document content OFF the instance, so an endpoint that the pipeline
  // could actually reach must be (a) SSRF-safe and (b) acknowledged: `acknowledgedHost` must match the
  // endpoint host. The client's acknowledgment modal sets that field; enforcing it here makes the consent
  // auditable, not just UI. The trigger is the PIPELINE RUNG, not a separate tick: the assist model exists
  // to serve the `repair` pass, so consent is demanded exactly when repair becomes reachable — whether that
  // happened by configuring the endpoint or by raising the extraction mode in the same or an earlier save.
  const assistPatch = parsed.data.documentProcessing?.assistModel;
  if (assistPatch !== undefined && locked.has('documentProcessing.assistModel')) {
    res.status(403).json({
      error: 'The external assist model is locked by infrastructure env vars and cannot be changed via the UI',
      locked: ['documentProcessing.assistModel'],
    });
    return;
  }
  {
    const existingAssist = activeCfg.documentProcessing?.assistModel ?? {};
    const effBaseUrl = assistPatch?.baseUrl ?? existingAssist.baseUrl;
    const effAck = assistPatch?.acknowledgedHost ?? existingAssist.acknowledgedHost;
    // Effective extraction rung after this patch. `repair` uses the assist model outright; `auto` resolves
    // to repair whenever a repair capability exists — and a configured assist model IS one.
    const effMode = parsed.data.documentProcessing?.mode ?? activeCfg.documentProcessing?.mode ?? 'vlm';
    const repairReachable = effMode === 'repair' || effMode === 'auto';
    if (repairReachable && effBaseUrl) {
      if (!isSsrfSafeUrl(effBaseUrl, allowPrivateForSlot('assist'))) {
        res.status(400).json({ error: 'assistModel.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + privateAddressHint('assist') });
        return;
      }
      let host: string;
      try { host = new URL(effBaseUrl).host; } catch { res.status(400).json({ error: 'assistModel.baseUrl is not a valid URL' }); return; }
      if (effAck !== host) {
        res.status(400).json({
          error: `Egress to ${host} must be acknowledged before the external assist model can be used: document content (OCR text, and page images for image-based uses) would be sent there.`,
          needsAcknowledgment: host,
        });
        return;
      }
    }
  }

  try {
    // ── Split sensitive fields into secrets.json ─────────────────────────────
    // API keys are credentials and live alongside peerTokens / TOTP secret in
    // the 0o600 secrets.json — never in the world-readable config.json.
    const visionApiKeyChange = (parsed.data.vision && 'apiKey' in parsed.data.vision)
      ? parsed.data.vision.apiKey ?? null  // null/undefined both mean "delete"
      : undefined;                          // undefined = "leave existing untouched"
    const sttApiKeyChange = (parsed.data.stt && 'apiKey' in parsed.data.stt)
      ? parsed.data.stt.apiKey ?? null
      : undefined;
    // F11-b — the external assist model's key lives in secrets too (mediaEmbedding.docAssistApiKey).
    const assistApiKeyChange = (assistPatch && 'apiKey' in assistPatch)
      ? assistPatch.apiKey ?? null
      : undefined;
    // External face model's key → secrets.mediaEmbedding.faceApiKey.
    const faceApiKeyChange = (facePatch && 'apiKey' in facePatch)
      ? facePatch.apiKey ?? null
      : undefined;
    // Text-embedding key → secrets.embedding.apiKey (top-level, matching getEmbeddingConfig()).
    const embApiKeyChange = (parsed.data.embedding && 'apiKey' in parsed.data.embedding)
      ? parsed.data.embedding.apiKey ?? null
      : undefined;
    // Reranker key → secrets.mediaEmbedding.rerankApiKey.
    const rerankApiKeyChange = (rerankPatch && 'apiKey' in rerankPatch)
      ? rerankPatch.apiKey ?? null
      : undefined;
    // NLI key → secrets.mediaEmbedding.nliApiKey (the loader already reads it from there).
    const nliApiKeyChange = (nliPatch && 'apiKey' in nliPatch)
      ? nliPatch.apiKey ?? null
      : undefined;

    if (visionApiKeyChange !== undefined || sttApiKeyChange !== undefined || assistApiKeyChange !== undefined || embApiKeyChange !== undefined || faceApiKeyChange !== undefined || rerankApiKeyChange !== undefined || nliApiKeyChange !== undefined) {
      const secrets = getSecrets();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sAny = secrets as any;
      sAny.mediaEmbedding = sAny.mediaEmbedding ?? {};
      if (visionApiKeyChange !== undefined) {
        if (visionApiKeyChange === null || visionApiKeyChange === '') delete sAny.mediaEmbedding.visionApiKey;
        else sAny.mediaEmbedding.visionApiKey = visionApiKeyChange;
      }
      if (sttApiKeyChange !== undefined) {
        if (sttApiKeyChange === null || sttApiKeyChange === '') delete sAny.mediaEmbedding.sttApiKey;
        else sAny.mediaEmbedding.sttApiKey = sttApiKeyChange;
      }
      if (assistApiKeyChange !== undefined) {
        if (assistApiKeyChange === null || assistApiKeyChange === '') delete sAny.mediaEmbedding.docAssistApiKey;
        else sAny.mediaEmbedding.docAssistApiKey = assistApiKeyChange;
      }
      if (faceApiKeyChange !== undefined) {
        if (faceApiKeyChange === null || faceApiKeyChange === '') delete sAny.mediaEmbedding.faceApiKey;
        else sAny.mediaEmbedding.faceApiKey = faceApiKeyChange;
      }
      if (nliApiKeyChange !== undefined) {
        if (nliApiKeyChange === null || nliApiKeyChange === '') delete sAny.mediaEmbedding.nliApiKey;
        else sAny.mediaEmbedding.nliApiKey = nliApiKeyChange;
      }
      if (rerankApiKeyChange !== undefined) {
        if (rerankApiKeyChange === null || rerankApiKeyChange === '') delete sAny.mediaEmbedding.rerankApiKey;
        else sAny.mediaEmbedding.rerankApiKey = rerankApiKeyChange;
      }
      if (embApiKeyChange !== undefined) {
        sAny.embedding = sAny.embedding ?? {};
        if (embApiKeyChange === null || embApiKeyChange === '') delete sAny.embedding.apiKey;
        else sAny.embedding.apiKey = embApiKeyChange;
      }
      saveSecrets(secrets);
    }

    const cfg = getConfig();
    const existing = cfg.mediaEmbedding ?? {};
    const merged: Record<string, unknown> = { ...existing, ...parsed.data };
    // Strip the removed master switch: `existing` may still carry a legacy `enabled` (boot migration
    // normally clears it, but defend the write path so a PATCH can never persist it back).
    delete merged['enabled'];
    // Remove runtime-only lockedByInfra — never persisted to config.json
    delete merged['lockedByInfra'];
    // Strip apiKey from config.json — it lives in secrets.json now
    if (merged['vision']) {
      const v = { ...(merged['vision'] as Record<string, unknown>) };
      delete v['apiKey'];
      merged['vision'] = v;
    }
    if (merged['stt']) {
      const s = { ...(merged['stt'] as Record<string, unknown>) };
      delete s['apiKey'];
      merged['stt'] = s;
    }
    // Reranker: merge per field (a patch changing only `candidateMultiplier` must not wipe the endpoint)
    // and strip the key out to secrets.json. An explicit `null` on baseUrl/model DELETES the field —
    // that is how the operator turns reranking back off, since the feature is gated on being configured.
    if (rerankPatch) {
      const r: Record<string, unknown> = { ...(existing.rerank as Record<string, unknown> ?? {}), ...rerankPatch };
      delete r['apiKey']; // never in config.json
      for (const k of ['baseUrl', 'model'] as const) {
        if (rerankPatch[k] === null || rerankPatch[k] === '') delete r[k];
      }
      merged['rerank'] = r;
    }
    // NLI: same per-field merge and same null-deletes-the-field rule as the reranker above.
    if (nliPatch) {
      const n: Record<string, unknown> = { ...(existing.nli as Record<string, unknown> ?? {}), ...nliPatch };
      delete n['apiKey']; // never in config.json
      for (const k of ['baseUrl', 'model'] as const) {
        if (nliPatch[k] === null || nliPatch[k] === '') delete n[k];
      }
      merged['nli'] = n;
    }
    if (parsed.data.levels) merged['levels'] = mergeLevelCeilings(existing.levels, parsed.data.levels);
    // Face recognition: merge per field for the same reason as the ceilings, and additionally because
    // the block the client sees is RESOLVED (env → config → default). Writing it back wholesale would
    // bake a defaulted or env-derived value into config.json as though an operator had chosen it.
    if (parsed.data.faceRecognition) {
      merged['faceRecognition'] = {
        ...(existing.faceRecognition as Record<string, unknown> ?? {}),
        ...parsed.data.faceRecognition,
      };
    }
    // F11-b — DEEP-merge documentProcessing so a patch that omits `assistModel` (e.g. just changing `mode`)
    // does NOT wipe the stored external-assist config, and strip its apiKey out to secrets.json.
    if (parsed.data.documentProcessing) {
      const dpMerged: Record<string, unknown> = {
        ...(existing.documentProcessing as Record<string, unknown> ?? {}),
        ...parsed.data.documentProcessing,
      };
      // Store the canonical spelling, so `max` never round-trips back out to a client.
      if (parsed.data.documentProcessing.mode !== undefined) {
        dpMerged['mode'] = normalizeDocExtractionMode(parsed.data.documentProcessing.mode);
      }
      if (assistPatch) {
        const a = { ...assistPatch } as Record<string, unknown>;
        delete a['apiKey']; // never in config.json
        dpMerged['assistModel'] = a;
      }
      merged['documentProcessing'] = dpMerged;
    }
    // Text embedding lives at TOP-LEVEL `config.embedding`, not under mediaEmbedding — pull it out of the
    // media merge and apply it separately (apiKey already routed to secrets above).
    delete merged['embedding'];
    if (parsed.data.embedding) {
      // Merge, then clear — see mergeEmbeddingPatch. Doing it the other way round (delete the null from the
      // patch, then spread) is what made `baseUrl: null` a no-op instead of "back to the bundled model".
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cfg.embedding = mergeEmbeddingPatch(cfg.embedding as any, parsed.data.embedding) as any;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cfg.mediaEmbedding = merged as any;
    saveConfig(cfg);
    log.info(`Media embedding config updated by admin`);
    const respBody = maskSecrets(getMediaEmbeddingConfig()) as Record<string, unknown>;
    const emb = getEmbeddingConfig();
    respBody['embedding'] = { ...emb, apiKey: emb.apiKey ? '••••••••' : undefined };
    res.json({ ok: true, config: respBody });
  } catch (err) {
    log.warn(`Failed to save media config: ${err}`);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// ── POST /api/admin/media-config/test-connection (F11-PR5b) ───────────────────
// Probe a configured model endpoint for reachability + whether its model is present. Read-only: it only
// LISTS models (no inference, no document content) so it's safe to run before acknowledging egress. External
// endpoints go through `ssrfSafeFetch`; local (trusted cluster) endpoints use a plain fetch, mirroring how
// the media worker reaches them.

const TestConnectionSchema = z.object({
  target: z.enum(['vision', 'stt', 'assist', 'embedding', 'nli', 'rerank']),
}).strict();

mediaConfigRouter.post('/test-connection', requireAdminMfa, async (req, res) => {
  const parsed = TestConnectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }
  const cfg = getMediaEmbeddingConfig();
  const target = parsed.data.target;

  let baseUrl: string | undefined;
  let model: string | undefined;
  let apiKey: string | undefined;
  let external: boolean;
  if (target === 'vision') {
    baseUrl = cfg.vision?.baseUrl; model = cfg.vision?.model; apiKey = cfg.vision?.apiKey;
    external = cfg.visionProvider === 'external';
  } else if (target === 'stt') {
    baseUrl = cfg.stt?.baseUrl; model = cfg.stt?.model; apiKey = cfg.stt?.apiKey;
    external = cfg.sttProvider === 'external';
  } else if (target === 'nli') {
    // The contradiction judge. External whenever the endpoint is not the bundled sidecar — the probe
    // itself lists models and sends no record text, so it is safe to run before anything is classified.
    baseUrl = cfg.nli?.baseUrl; model = cfg.nli?.model; apiKey = getNliApiKey();
    external = !!baseUrl && !isLocalModelEndpoint(baseUrl);
  } else if (target === 'rerank') {
    // The cross-encoder. Like the NLI probe this only lists models — no query, no passages — so it is
    // safe to run before anything is ever reranked.
    baseUrl = cfg.rerank?.baseUrl; model = cfg.rerank?.model; apiKey = getRerankApiKey();
    external = !!baseUrl && !isLocalModelEndpoint(baseUrl);
  } else if (target === 'embedding') {
    const e = getEmbeddingConfig();
    baseUrl = e.baseUrl; model = e.model; apiKey = getEmbeddingApiKey();
    external = e.provider === 'external';
  } else {
    const a = cfg.documentProcessing?.assistModel;
    baseUrl = a?.baseUrl; model = a?.model; apiKey = getDocAssistApiKey();
    external = true; // the assist model is always external
  }

  if (!baseUrl) {
    res.status(400).json({ error: `No endpoint is configured for ${target}. Save one first, then test.` });
    return;
  }
  // External endpoints must be public — refuse to probe private/loopback/metadata addresses. Resolved for
  // THIS target: the probe must agree with what inference will actually be allowed to do, or an operator
  // who allowed a private address for one slot gets a green test on a call that would then be refused.
  if (external && !isSsrfSafeUrl(baseUrl, allowPrivateForSlot(target))) {
    res.status(400).json({ error: `The ${target} endpoint is not a public http(s) URL (SSRF-blocked).${privateAddressHint(target)}` });
    return;
  }

  const result = await probeModelEndpoint({ baseUrl, model, apiKey, external, slot: target })
    .catch(err => ({ ok: false, reachable: false, verdict: 'unreachable' as const, detail: err instanceof Error ? err.message : String(err), latencyMs: 0 }));
  res.json({ target, external, model: model ?? null, ...result });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Which fields of a patch an env pin forbids.
 *
 * Most locks are top-level names (`visionProvider`, `maxFileSizeBytes`). Face recognition reports
 * its locks per FIELD (`faceRecognition.enabled`, …) because each has its own env var — so a scan of
 * top-level keys alone would let a patch naming the block sail straight past a pin the UI is already
 * rendering as read-only. Getting that wrong means `FACE_RECOGNITION_ENABLED=false` stops being a
 * guarantee, on the setting with the clearest privacy weight in the product.
 *
 * The nested case is handled explicitly rather than by walking every block: this is the only one
 * whose locks are namespaced today, and a generic flatten would silently start applying to blocks
 * that never opted in to being lockable.
 *
 * Exported for unit testing.
 */
export function blockedByInfra(patch: Record<string, unknown>, locked: Set<string>): string[] {
  const blocked = Object.keys(patch).filter(k => locked.has(k));
  const face = patch['faceRecognition'];
  if (face && typeof face === 'object') {
    for (const field of Object.keys(face as Record<string, unknown>)) {
      if (locked.has(`faceRecognition.${field}`)) blocked.push(`faceRecognition.${field}`);
    }
  }
  return blocked;
}

/**
 * Merge a `levels` patch into the stored ceilings, CLASS BY CLASS.
 *
 * The obvious `{...existing, ...patch}` at the top level of the config would replace the whole
 * `levels` object — and because `getMediaEmbeddingConfig()` defaults an absent class to `auto`, the
 * classes the patch did not mention would not merely be forgotten, they would come back as **`auto`**.
 * Saving a change to `images` alone would silently RAISE the ceiling on audio, video and text: a
 * capability grant nobody asked for, on the one setting whose entire job is to withhold capability.
 *
 * Exported for unit testing — this rule is the reason the function exists.
 */
export function mergeLevelCeilings(
  existing: MediaLevelCeilings | undefined,
  patch: Partial<MediaLevelCeilings>,
): MediaLevelCeilings {
  const out = { ...(existing ?? {}) } as Record<string, unknown>;
  // Only keys actually present in the patch overwrite — an explicit `undefined` is not a value, and
  // treating it as one would clear a ceiling the client never mentioned.
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) out[k] = v;
  return out as MediaLevelCeilings;
}

/**
 * What a probe ESTABLISHED, as opposed to what it hoped for. One value per distinguishable finding.
 *
 * `reachable` alone could not carry this. A 404 on the model-list path and a refused connection were both
 * `reachable: false`, and they are not the same discovery at all: one endpoint answered and has no listing
 * route, the other is not there. Collapsing them put a red dot on a speech-to-text service that was
 * transcribing correctly — its only route is `POST /v1/audio/transcriptions`, and a 404 on a path the slot
 * never calls is not information about the slot.
 *
 *   - `listed`         — the endpoint served a model list. The strongest evidence a probe can get.
 *   - `not-enumerable` — it answered with a 4xx on the list path: present, speaking HTTP, no listing
 *                        surface. *Absence of evidence*, which is not evidence of absence.
 *   - `auth-rejected`  — 401/403. Real, and red: inference presents the same credential.
 *   - `erroring`       — 5xx. The server is there and broken, which is about the endpoint, not the path.
 *   - `unreachable`    — nothing answered: refused, DNS, TLS, timeout.
 */
export type ProbeVerdict = 'listed' | 'not-enumerable' | 'auth-rejected' | 'erroring' | 'unreachable';

interface ProbeResult {
  ok: boolean;
  /**
   * True when the endpoint answered at all — NOT when the probe learned what it wanted.
   *
   * Kept because it is published in the test-connection response, but `verdict` is what callers should
   * branch on: `not-enumerable` and `auth-rejected` are both "it answered" and only one of them is fine.
   */
  reachable: boolean;
  verdict: ProbeVerdict;
  status?: number;
  endpoint?: string;
  models?: string[];
  /**
   * Whether the configured model appears in the endpoint's model list (undefined when no model/list).
   *
   * Named for what it measured, not for what it was read as. As `modelPresent` it asserted the model
   * exists; the check can only see an enumeration, and aliasing routers, gateways and Azure deployments
   * routinely serve names they do not list. `false` here is *no information* and must never be reported
   * as degraded — see `classifyStage`.
   */
  modelEnumerated?: boolean;
  detail?: string;
  latencyMs: number;
}

/**
 * Probe a model endpoint by LISTING its models. Bounded 5s, no inference call, no document content.
 *
 * ## Why the URL is derived rather than guessed
 *
 * This used to try `${base}/v1/models` and then `${base}/api/tags`, **blindly, for every target and
 * every provider** — `external` was computed per target but only ever chose the fetch implementation,
 * never the endpoint. That is wrong in both directions:
 *
 *   - Vision-external is the one target whose base is expected to already contain `/v1` (the OpenAI
 *     convention, and what `ExternalVisionProvider` assumes). Hardcoding `/v1/models` produced
 *     `/v1/v1/models` → 404, then fell through to Ollama's `/api/tags` → 404. A reporter's Models page
 *     showed vision red while captions were being generated successfully.
 *   - Removing the `/v1` to satisfy the probe made the probe **green and inference 404** — a green dot
 *     over a broken pipeline, which is the worse direction and the reason this is not merely cosmetic.
 *
 * The URL now comes from `listUrlFor`, the same helper the inference path derives its chat URL from, so
 * a probe cannot disagree with the thing it is probing. `normalizeOpenAiBase` means `…:8080` and
 * `…:8080/v1` both work.
 *
 * On failure it makes ONE diagnostic attempt on the other wire — not to succeed, but so that a
 * mis-selected provider type reports *"this endpoint answers Ollama's API; set the provider to local"*
 * instead of an unexplained red dot.
 *
 * ## Why a non-200 is not one outcome
 *
 * It used to be: every status that was not `ok` became `reachable: false`, so a 404 on the list path read
 * exactly like a refused connection. Those are different discoveries, and the difference is the whole
 * report — a speech-to-text service whose only route is `POST /v1/audio/transcriptions` cannot answer a
 * list probe, and was shown as **down** while it transcribed correctly and Verify was green.
 *
 * So the statuses are ranked by what they prove (see `ProbeVerdict`): a rejected credential is red because
 * inference presents the same one, a 5xx is red because the server is broken, and a plain 4xx is neither —
 * the endpoint answered and has no listing surface. The last one is reported as reachable with the reason
 * attached, not as a failure, for the same reason a model missing from a list is not a failure.
 *
 * Exported for unit testing.
 */
export async function probeModelEndpoint(
  opts: { baseUrl: string; model?: string; apiKey?: string; external: boolean; wire?: VlmWire; slot: EgressSlot },
): Promise<ProbeResult> {
  const started = Date.now();
  const base = opts.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {};
  // The opt-in must be passed HERE, not merely checked by the caller. `ssrfSafeFetch` defaults
  // `allowPrivate` to false, so omitting the third argument silently reimposes the exact rejection the
  // operator turned off. `probeModelStages` already gate-checks the URL with `allowPrivateModelEndpoints()`
  // one line before calling this — the guard was passed correctly at the door and dropped just inside it.
  //
  // This is also the worst place to drop it: the probe is the surface an operator uses to find out whether
  // their endpoint works, so the bug reported the configuration as broken while inference would have run.
  const doFetch = opts.external
    ? (url: string, init: RequestInit) =>
        ssrfSafeFetch(url, init, { allowPrivate: allowPrivateForSlot(opts.slot) })
    : (url: string, init: RequestInit) => fetch(url, init);

  const parseOpenAi = (j: unknown): string[] =>
    ((j as { data?: Array<{ id?: string }> })?.data ?? []).map(m => m?.id).filter((x): x is string => !!x);
  const parseOllama = (j: unknown): string[] =>
    ((j as { models?: Array<{ name?: string }> })?.models ?? []).map(m => m?.name).filter((x): x is string => !!x);

  // The wire this endpoint is configured to speak comes first; the other is tried only so a failure can
  // explain itself. `wire` defaults to `openai` — every target except a local Ollama speaks it.
  const wire: VlmWire = opts.wire ?? 'openai';
  const attempts: Array<{ url: string; wire: VlmWire; parse: (j: unknown) => string[] }> = [
    { url: listUrlFor(wire, base), wire, parse: wire === 'ollama' ? parseOllama : parseOpenAi },
  ];
  const otherWire: VlmWire = wire === 'ollama' ? 'openai' : 'ollama';
  attempts.push({ url: listUrlFor(otherWire, base), wire: otherWire, parse: otherWire === 'ollama' ? parseOllama : parseOpenAi });

  let lastErr = '';
  /** Every HTTP status the attempts came back with. The ladder below reads these, not just the last one. */
  const answered: Array<{ status: number; url: string }> = [];
  for (const a of attempts) {
    try {
      const res = await doFetch(a.url, { method: 'GET', headers, signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const models = a.parse(json);
        // Ollama tags carry a `:tag` suffix (e.g. `moondream:latest`); match exact or `<model>:*`.
        const modelEnumerated = opts.model
          ? models.some(m => m === opts.model || m.startsWith(`${opts.model}:`))
          : undefined;
        // Answered on the OTHER wire: reachable, but the provider type is set wrong, and inference will
        // fail even though this probe just succeeded. Say which, rather than reporting a bare success
        // that the pipeline will then contradict.
        const mismatch = a.wire !== wire
          ? `endpoint answers ${a.wire === 'ollama' ? "Ollama's API" : "the OpenAI-compatible API"} at ${a.url}, `
            + `but this target is configured as ${wire === 'ollama' ? 'local (Ollama)' : 'external (OpenAI-compatible)'} — `
            + 'inference will use the other protocol and fail. Switch the provider type.'
          : undefined;
        return {
          ok: !mismatch, reachable: true, verdict: 'listed', status: res.status, endpoint: a.url,
          models: models.slice(0, 50), modelEnumerated, detail: mismatch,
          latencyMs: Date.now() - started,
        };
      }
      answered.push({ status: res.status, url: a.url });
      lastErr = `HTTP ${res.status} at ${a.url}`;
    } catch (err) {
      lastErr = `${err instanceof Error ? err.message : String(err)} (at ${a.url})`;
    }
  }

  const latencyMs = Date.now() - started;

  // Nothing listed. What follows ranks the evidence rather than treating every non-200 as a failure — the
  // ladder is ordered by what each status actually proves, strongest first.

  // A rejected credential is a real fault, and specifically one that will hit inference too: this is the
  // same key on the same host. Red, and say which, because "unreachable" sends the operator to the
  // network when the fix is the API key field two rows above.
  const auth = answered.find(a => a.status === 401 || a.status === 403);
  if (auth) {
    return {
      ok: false, reachable: true, verdict: 'auth-rejected', status: auth.status, endpoint: auth.url,
      detail: `HTTP ${auth.status} at ${auth.url} — the endpoint answered but rejected the credential. Inference uses the same one.`,
      latencyMs,
    };
  }

  // Any other 4xx: the endpoint is there, speaking HTTP, and has no model-list route. That is the whole
  // finding. It is not evidence about the route the slot actually calls, and reporting it as `down`
  // painted a working transcription service red — the reported bug. A single-route inference server (a
  // Whisper webservice serves only `POST /v1/audio/transcriptions`) can never satisfy a list probe.
  const noListRoute = answered.find(a => a.status >= 400 && a.status < 500);
  if (noListRoute) {
    return {
      ok: true, reachable: true, verdict: 'not-enumerable', status: noListRoute.status, endpoint: noListRoute.url,
      detail: `endpoint answered HTTP ${noListRoute.status} at ${noListRoute.url} — it serves no model list, which is normal for single-route inference servers and says nothing about the route this slot calls. Use Verify to exercise the real path.`,
      latencyMs,
    };
  }

  // 5xx: also an answer, but an answer that the server is broken — and unlike a missing route, that is
  // about the endpoint rather than about the path. Stays red.
  const erroring = answered[0];
  if (erroring) {
    return {
      ok: false, reachable: false, verdict: 'erroring', status: erroring.status, endpoint: erroring.url,
      detail: `HTTP ${erroring.status} at ${erroring.url} — the endpoint is answering but erroring`,
      latencyMs,
    };
  }

  // Nothing answered at all. Name the URL that was tried: a bare "unreachable" leaves an operator unable
  // to tell a wrong base path from a dead endpoint, and the two need opposite fixes.
  return {
    ok: false, reachable: false, verdict: 'unreachable',
    detail: lastErr || `no model list at ${listUrlFor(wire, base)}`, latencyMs,
  };
}

function maskSecrets(cfg: ReturnType<typeof getMediaEmbeddingConfig>): unknown {
  const mask = (v: string | undefined) => v ? '••••••••' : undefined;
  // F11-b — the assist model's key lives in secrets, not in the resolved documentProcessing block; surface a
  // masked indicator so the UI can show "key set" without ever returning the secret.
  const dp = cfg.documentProcessing;
  return {
    ...cfg,
    vision: cfg.vision ? { ...cfg.vision, apiKey: mask(cfg.vision.apiKey) } : cfg.vision,
    stt: cfg.stt ? { ...cfg.stt, apiKey: mask(cfg.stt.apiKey) } : cfg.stt,
    // `nli` was spread through unmasked: the resolved block carries the key from secrets.json, so this
    // endpoint returned it in plaintext to any admin. Every other provider was masked; this one was
    // added later and the mask was not extended with it. Fixed here, and `rerank` is masked from the
    // start rather than repeating it.
    nli: cfg.nli ? { ...cfg.nli, apiKey: mask(cfg.nli.apiKey) } : cfg.nli,
    rerank: cfg.rerank ? { ...cfg.rerank, apiKey: mask(cfg.rerank.apiKey) } : cfg.rerank,
    documentProcessing: dp?.assistModel
      ? { ...dp, assistModel: { ...dp.assistModel, apiKey: mask(getDocAssistApiKey()) } }
      : dp,
  };
}
