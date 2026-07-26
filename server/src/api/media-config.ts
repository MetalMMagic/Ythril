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
import { getConfig, saveConfig, getMediaEmbeddingConfig, getSecrets, saveSecrets, getDocAssistApiKey, getEmbeddingConfig, getEmbeddingApiKey } from '../config/loader.js';
import { DOC_EXTRACTION_MODES_IN, IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS, normalizeDocExtractionMode } from '../config/types.js';
import type { MediaLevelCeilings } from '../config/types.js';
import { requireAdmin, requireAdminMfa } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { isSsrfSafeUrl, ssrfSafeFetch } from '../util/ssrf.js';
import { allowPrivateModelEndpoints } from '../config/model-egress-policy.js';
import { log } from '../util/log.js';
import { providerSignature, getActiveProviderSignature } from '../files/media/worker.js';

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
// records the operator's egress consent; the handler requires it to match `baseUrl`'s host when `uses` is set.
const AssistModelPatchSchema = z.object({
  baseUrl: z.string().url().optional(),
  model: z.string().max(128).optional(),
  apiKey: z.string().max(512).optional().nullable(),
  uses: z.array(z.enum(['repair'])).max(8).optional(),
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
  enabled: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  minFaceSizeFraction: z.number().min(0).max(1).optional(),
  personEntityTypes: z.array(z.string().min(1).max(64)).max(32).optional(),
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
  // Instance-wide opt-in for self-hosted endpoints on private addresses (env/config only — never a
  // field on this PATCH, so the admin API cannot widen its own egress).
  const allowPrivate = allowPrivateModelEndpoints();
  const effectiveVisionType = parsed.data.visionProvider ?? activeCfg.visionProvider ?? 'local';
  const effectiveSttType    = parsed.data.sttProvider    ?? activeCfg.sttProvider    ?? 'local';
  if (effectiveVisionType === 'external' && parsed.data.vision?.baseUrl
      && !isSsrfSafeUrl(parsed.data.vision.baseUrl, allowPrivate)) {
    res.status(400).json({ error: 'vision.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + (allowPrivate ? '' : ' (set allowPrivateModelEndpoints / YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS=true to permit a self-hosted endpoint on a private address)') });
    return;
  }
  if (effectiveSttType === 'external' && parsed.data.stt?.baseUrl
      && !isSsrfSafeUrl(parsed.data.stt.baseUrl, allowPrivate)) {
    res.status(400).json({ error: 'stt.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + (allowPrivate ? '' : ' (set allowPrivateModelEndpoints / YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS=true to permit a self-hosted endpoint on a private address)') });
    return;
  }
  // Text-embedding external endpoint — same SSRF rule (only when the effective provider is external).
  const effectiveEmbType = parsed.data.embedding?.provider ?? getEmbeddingConfig().provider ?? 'local';
  if (effectiveEmbType === 'external' && parsed.data.embedding?.baseUrl
      && !isSsrfSafeUrl(parsed.data.embedding.baseUrl, allowPrivate)) {
    res.status(400).json({ error: 'embedding.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' + (allowPrivate ? '' : ' (set allowPrivateModelEndpoints / YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS=true to permit a self-hosted endpoint on a private address)') });
    return;
  }

  // ── F11-b: external assist model — locked check + SSRF + egress-acknowledgment enforcement ──
  // This is the only path that sends document content OFF the instance, so a `uses`-active endpoint must be
  // (a) SSRF-safe and (b) acknowledged: `acknowledgedHost` must match the endpoint host. The client's
  // acknowledgment modal sets that field; enforcing it here makes the consent auditable, not just UI.
  const assistPatch = parsed.data.documentProcessing?.assistModel;
  if (assistPatch !== undefined && locked.has('documentProcessing.assistModel')) {
    res.status(403).json({
      error: 'The external assist model is locked by infrastructure env vars and cannot be changed via the UI',
      locked: ['documentProcessing.assistModel'],
    });
    return;
  }
  if (assistPatch) {
    const existingAssist = activeCfg.documentProcessing?.assistModel ?? {};
    const effBaseUrl = assistPatch.baseUrl ?? existingAssist.baseUrl;
    const effUses = assistPatch.uses ?? existingAssist.uses ?? [];
    const effAck = assistPatch.acknowledgedHost ?? existingAssist.acknowledgedHost;
    if (effUses.length > 0 && effBaseUrl) {
      if (!isSsrfSafeUrl(effBaseUrl, allowPrivate)) {
        res.status(400).json({ error: 'assistModel.baseUrl rejected: must be a public http(s) URL (no private/loopback/metadata addresses)' });
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
    // Text-embedding key → secrets.embedding.apiKey (top-level, matching getEmbeddingConfig()).
    const embApiKeyChange = (parsed.data.embedding && 'apiKey' in parsed.data.embedding)
      ? parsed.data.embedding.apiKey ?? null
      : undefined;

    if (visionApiKeyChange !== undefined || sttApiKeyChange !== undefined || assistApiKeyChange !== undefined || embApiKeyChange !== undefined) {
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
      const e = { ...parsed.data.embedding } as Record<string, unknown>;
      delete e['apiKey']; // never in config.json
      // null baseUrl clears it (switch back to the bundled local ONNX model).
      if (e['baseUrl'] === null) delete e['baseUrl'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cfg.embedding = { ...(cfg.embedding as any ?? {}), ...e };
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
  target: z.enum(['vision', 'stt', 'assist', 'embedding']),
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
  // External endpoints must be public — refuse to probe private/loopback/metadata addresses.
  if (external && !isSsrfSafeUrl(baseUrl, allowPrivateModelEndpoints())) {
    res.status(400).json({ error: `The ${target} endpoint is not a public http(s) URL (SSRF-blocked).` });
    return;
  }

  const result = await probeModelEndpoint({ baseUrl, model, apiKey, external })
    .catch(err => ({ ok: false, reachable: false, detail: err instanceof Error ? err.message : String(err), latencyMs: 0 }));
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

interface ProbeResult {
  ok: boolean;
  reachable: boolean;
  status?: number;
  endpoint?: string;
  models?: string[];
  /** Whether the configured model appears in the endpoint's model list (undefined when no model/list). */
  modelPresent?: boolean;
  detail?: string;
  latencyMs: number;
}

/** Probe a model endpoint by LISTING its models — OpenAI-compatible `/v1/models` first, then Ollama
 *  `/api/tags`. Bounded 5s. No inference call, so it's cheap and sends no document content.
 *  Exported for unit testing. */
export async function probeModelEndpoint(
  opts: { baseUrl: string; model?: string; apiKey?: string; external: boolean },
): Promise<ProbeResult> {
  const started = Date.now();
  const base = opts.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {};
  const doFetch = opts.external
    ? (url: string, init: RequestInit) => ssrfSafeFetch(url, init)
    : (url: string, init: RequestInit) => fetch(url, init);

  const attempts: Array<{ url: string; parse: (j: unknown) => string[] }> = [
    { url: `${base}/v1/models`, parse: (j) => ((j as { data?: Array<{ id?: string }> })?.data ?? []).map(m => m?.id).filter((x): x is string => !!x) },
    { url: `${base}/api/tags`, parse: (j) => ((j as { models?: Array<{ name?: string }> })?.models ?? []).map(m => m?.name).filter((x): x is string => !!x) },
  ];

  let lastErr = '';
  for (const a of attempts) {
    try {
      const res = await doFetch(a.url, { method: 'GET', headers, signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const models = a.parse(json);
        // Ollama tags carry a `:tag` suffix (e.g. `moondream:latest`); match exact or `<model>:*`.
        const modelPresent = opts.model
          ? models.some(m => m === opts.model || m.startsWith(`${opts.model}:`))
          : undefined;
        return { ok: true, reachable: true, status: res.status, endpoint: a.url, models: models.slice(0, 50), modelPresent, latencyMs: Date.now() - started };
      }
      lastErr = `HTTP ${res.status} at ${a.url}`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, reachable: false, detail: lastErr || 'no compatible model-list endpoint responded', latencyMs: Date.now() - started };
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
    documentProcessing: dp?.assistModel
      ? { ...dp, assistModel: { ...dp.assistModel, apiKey: mask(getDocAssistApiKey()) } }
      : dp,
  };
}
