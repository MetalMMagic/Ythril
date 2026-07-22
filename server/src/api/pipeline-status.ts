/**
 * Read-only pipeline status — one payload answering "is any of this actually working?".
 *
 *   GET /api/admin/pipeline-status
 *
 * The Models & Pipelines screen draws a health dot on every pipeline step. Those dots must come from
 * ONE request: a poll per step would multiply outbound probes by the number of steps on screen, and
 * the sidecars this probes are the same processes doing the real work.
 *
 * What it reports, and why each one is here rather than inferred from config:
 *
 *   - **sidecars** — reachability of the conversion / page-render / office-render services. Config can
 *     only say what URL was configured; it cannot say whether anything is listening on it.
 *   - **models** — per stage: which model is configured, and whether its endpoint both responds AND
 *     lists that model. "Configured", "reachable" and "serving that model" are three different
 *     failures with one symptom (nothing gets extracted), so they are reported separately.
 *   - **index** — the LIVE `$vectorSearch` index state per space and collection, read from MongoDB
 *     rather than from `space.indexStatus`. That distinction is the entire point: the stored status is
 *     written once when a space is built and never revisited, so an index that later vanishes leaves
 *     `indexStatus: 'ready'` behind it and recall quietly returns nothing. Reading both and reporting
 *     them side by side turns that divergence into something visible instead of something fatal.
 *
 * Nothing here mutates, and nothing here is on a request path a user waits on — so it is cached and
 * single-flighted rather than fast.
 */

import { Router } from 'express';
import { getConfig, getMediaEmbeddingConfig, getEmbeddingConfig, getEmbeddingApiKey, getDocumentProcessingConfig, getDocAssistApiKey, getFaceRecognitionConfig } from '../config/loader.js';
import { requireAdmin } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { isSsrfSafeUrl } from '../util/ssrf.js';
import { allowPrivateModelEndpoints } from '../config/model-egress-policy.js';
import { probeModelEndpoint } from './media-config.js';
import { getDb } from '../db/mongo.js';
import { VECTOR_INDEXED_COLLECTIONS } from '../spaces/vector-index.js';
import { log } from '../util/log.js';

export const pipelineStatusRouter = Router();

/** How long a probe result is served before the next request re-probes. */
const CACHE_TTL_MS = 20_000;
/** Ceiling on a single sidecar health check. Shorter than the model probe: these are local services. */
const SIDECAR_TIMEOUT_MS = 3_000;

// ── Shapes ────────────────────────────────────────────────────────────────────

/** Why a thing is not green. Not a boolean, because "never configured" is not a fault. */
export type HealthState =
  | 'ok'            // reachable, and the configured model was listed
  | 'degraded'      // reachable, but the configured model was NOT listed
  | 'down'          // configured, and did not respond
  | 'blocked'       // an external endpoint that fails the SSRF policy — never probed
  | 'off'           // deliberately disabled
  | 'unconfigured'; // nothing set, so nothing to be wrong

export interface SidecarStatus {
  key: string;
  label: string;
  /** The env var that owns this URL, so the UI can name it on an infra-set card. */
  envVar: string;
  url: string;
  state: HealthState;
  latencyMs?: number;
  detail?: string;
}

export interface ModelStageStatus {
  key: string;
  label: string;
  model: string | null;
  /** Host only — never the full URL, which may carry a credential in its query. */
  endpoint: string | null;
  external: boolean;
  state: HealthState;
  latencyMs?: number;
  detail?: string;
}

export interface CollectionIndexStatus {
  collection: string;
  indexName: string;
  /** MongoDB's own status string (READY / PENDING / …), or null when the index does not exist. */
  status: string | null;
}

export interface SpaceIndexStatus {
  id: string;
  label: string;
  /** What `config.json` believes. Kept beside `live` precisely so the two can disagree visibly. */
  stored: 'building' | 'ready' | 'failed' | 'unknown';
  /** From the live listing: 'ready' only when every expected index reports READY. */
  live: 'ready' | 'building' | 'missing' | 'unknown';
  collections: CollectionIndexStatus[];
  /** True when `stored` claims ready and the live listing disagrees — the silent-loss signature. */
  drifted: boolean;
}

export interface PipelineStatus {
  checkedAt: string;
  sidecars: SidecarStatus[];
  models: ModelStageStatus[];
  index: { spaces: SpaceIndexStatus[]; unavailable?: string };
  faceRecognition: { state: HealthState };
}

// ── Sidecars ──────────────────────────────────────────────────────────────────

/** The HTTP services the document pipeline calls out to, with the health path each one exposes. */
const SIDECARS: Array<{ key: string; label: string; envVar: string; fallback: string; healthPath: string }> = [
  { key: 'unstructured', label: 'Document converter', envVar: 'CONVERSION_SIDECAR_URL', fallback: 'http://localhost:8000', healthPath: '/healthcheck' },
  { key: 'doc-render', label: 'Page renderer', envVar: 'RENDER_SIDECAR_URL', fallback: 'http://localhost:8100', healthPath: '/health' },
  { key: 'doc-office', label: 'Office renderer', envVar: 'RENDER_OFFICE_SIDECAR_URL', fallback: 'http://localhost:8101', healthPath: '/health' },
];

async function probeSidecar(s: (typeof SIDECARS)[number]): Promise<SidecarStatus> {
  const url = (process.env[s.envVar] ?? s.fallback).replace(/\/$/, '');
  const base = { key: s.key, label: s.label, envVar: s.envVar, url };
  const started = Date.now();
  try {
    // Plain fetch, deliberately: the SSRF policy governs operator-supplied model endpoints, not
    // infrastructure the deployment defines for itself. These URLs come from env, not from a user.
    const res = await fetch(`${url}${s.healthPath}`, { method: 'GET', signal: AbortSignal.timeout(SIDECAR_TIMEOUT_MS) });
    const latencyMs = Date.now() - started;
    if (res.ok) return { ...base, state: 'ok', latencyMs };
    return { ...base, state: 'down', latencyMs, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ...base, state: 'down', latencyMs: Date.now() - started, detail: err instanceof Error ? err.message : String(err) };
  }
}

// ── Model stages ──────────────────────────────────────────────────────────────

export interface StageSpec {
  key: string;
  label: string;
  model?: string;
  baseUrl?: string;
  /** Never appears in the response — it exists only to authenticate the probe. */
  apiKey?: string;
  external: boolean;
}

/** What a probe of one endpoint concluded. `blocked` is a refusal to probe, not a failed probe. */
export type ProbeOutcome =
  | { blocked: true }
  | { reachable: boolean; models?: string[]; detail?: string; latencyMs: number };

/** Every model-backed stage, resolved from config. Stages sharing an endpoint are probed once. */
function modelStages(): StageSpec[] {
  const media = getMediaEmbeddingConfig();
  const emb = getEmbeddingConfig();
  const doc = getDocumentProcessingConfig();
  return [
    // A blank embedding baseUrl means the bundled in-process ONNX model — no endpoint to reach.
    { key: 'embedding', label: 'Text embedding', model: emb.model, baseUrl: emb.baseUrl ?? undefined, apiKey: getEmbeddingApiKey(), external: emb.provider === 'external' },
    { key: 'vision', label: 'Vision', model: media.vision?.model, baseUrl: media.vision?.baseUrl, apiKey: media.vision?.apiKey, external: media.visionProvider === 'external' },
    { key: 'stt', label: 'Speech-to-text', model: media.stt?.model, baseUrl: media.stt?.baseUrl, apiKey: media.stt?.apiKey, external: media.sttProvider === 'external' },
    // The document stages fall back to the vision endpoint exactly as the pipeline itself does, so the
    // dot reports the endpoint that would really be called rather than the one nominally configured.
    { key: 'doc-vlm', label: 'Document VLM', model: doc.vlmModel, baseUrl: doc.vlmBaseUrl || media.vision?.baseUrl, apiKey: media.vision?.apiKey, external: false },
    { key: 'doc-repair', label: 'Document repair', model: doc.repairModel || doc.vlmModel, baseUrl: doc.repairBaseUrl || doc.vlmBaseUrl || media.vision?.baseUrl, apiKey: media.vision?.apiKey, external: false },
    { key: 'doc-verify', label: 'Document verify', model: doc.verifyModel, baseUrl: doc.verifyBaseUrl || doc.vlmBaseUrl || media.vision?.baseUrl, apiKey: media.vision?.apiKey, external: false },
    // The assist model is external by definition — it is the one path that sends content off-instance.
    { key: 'assist', label: 'Assist model', model: doc.assistModel?.model, baseUrl: doc.assistModel?.baseUrl, apiKey: getDocAssistApiKey(), external: true },
  ];
}

/** Host of a URL, or the URL itself when it will not parse. Never the path or query. */
export function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).host; } catch { return url; }
}

/** The key identifying one endpoint+credential pair. Stages sharing it share a single probe. */
export function endpointId(s: StageSpec): string {
  return `${s.baseUrl} ${s.external} ${s.apiKey ?? ''}`;
}

/**
 * Group the stages that need probing by DISTINCT endpoint.
 *
 * The document VLM, repair and verify stages normally point at the same Ollama, so probing per stage
 * would triple the load on the very process that is also transcribing pages. Stages with no model or
 * no endpoint are dropped — there is nothing to ask.
 */
export function groupStagesByEndpoint(stages: StageSpec[]): Map<string, StageSpec[]> {
  const byEndpoint = new Map<string, StageSpec[]>();
  for (const s of stages) {
    if (!s.model || !s.baseUrl) continue;
    const id = endpointId(s);
    const group = byEndpoint.get(id);
    if (group) group.push(s); else byEndpoint.set(id, [s]);
  }
  return byEndpoint;
}

/**
 * Turn one stage plus its endpoint's probe outcome into a reportable status.
 *
 * Pure, and deliberately the only place a `HealthState` is chosen. The distinction between "nothing
 * configured", "configured but unreachable" and "reachable but not serving that model" is the whole
 * value of the screen, and three symptoms that all look like "extraction produced nothing" collapse
 * back into one the moment this logic is spread across call sites.
 *
 * The result is built field by field rather than by spreading `s`, because `s` carries the API key.
 * A spread here would leak it into the response, so there is a test pinning exactly that.
 */
export function classifyStage(s: StageSpec, res: ProbeOutcome | undefined): ModelStageStatus {
  const base = { key: s.key, label: s.label, model: s.model || null, endpoint: hostOf(s.baseUrl), external: s.external };
  if (!s.model) return { ...base, state: 'unconfigured' };
  // No endpoint + a model name = the bundled in-process model. There is nothing to reach, and
  // reporting it as `down` would put a red dot on the one component that cannot fail that way.
  if (!s.baseUrl) return { ...base, state: 'ok', detail: 'in-process' };
  if (!res) return { ...base, state: 'unconfigured' };
  if ('blocked' in res) return { ...base, state: 'blocked', detail: 'endpoint is not a public http(s) URL (SSRF-blocked)' };
  if (!res.reachable) return { ...base, state: 'down', latencyMs: res.latencyMs, detail: res.detail };

  // The endpoint answered — but does it serve the model this stage names? Ollama tags carry a `:tag`
  // suffix, so an exact match or a `<model>:` prefix both count. An endpoint that lists nothing is not
  // evidence either way, so it stays `ok` rather than being accused of a missing model.
  const models = res.models ?? [];
  const present = models.length === 0 ? undefined : models.some(m => m === s.model || m.startsWith(`${s.model}:`));
  if (present === false) return { ...base, state: 'degraded', latencyMs: res.latencyMs, detail: `endpoint is up but does not list "${s.model}"` };
  return { ...base, state: 'ok', latencyMs: res.latencyMs };
}

async function probeModelStages(): Promise<ModelStageStatus[]> {
  const stages = modelStages();
  const byEndpoint = groupStagesByEndpoint(stages);

  const results = new Map<string, ProbeOutcome>();
  await Promise.all([...byEndpoint.entries()].map(async ([id, group]) => {
    const { baseUrl, external, apiKey } = group[0];
    if (external && !isSsrfSafeUrl(baseUrl!, allowPrivateModelEndpoints())) {
      results.set(id, { blocked: true });
      return;
    }
    // No `model` is passed: one probe serves several stages, so the per-stage match happens in
    // classifyStage against the returned list.
    const res = await probeModelEndpoint({ baseUrl: baseUrl!, apiKey, external })
      .catch(err => ({ reachable: false, detail: err instanceof Error ? err.message : String(err), latencyMs: 0 }));
    results.set(id, res);
  }));

  return stages.map(s => classifyStage(s, results.get(endpointId(s))));
}

// ── Vector index ──────────────────────────────────────────────────────────────

/**
 * Collapse a space's per-collection listing into one live state.
 *
 * `unknown` outranks everything: a deployment whose MongoDB has no Atlas Search support throws on
 * every listing, and calling that `missing` would paint every space red on an instance where nothing
 * is wrong. Absence of evidence is reported as absence of evidence.
 */
export function deriveLiveIndexState(collections: CollectionIndexStatus[], listingFailed: boolean): SpaceIndexStatus['live'] {
  if (listingFailed) return 'unknown';
  if (collections.some(c => c.status === null)) return 'missing';
  return collections.every(c => c.status === 'READY') ? 'ready' : 'building';
}

/**
 * The silent-loss signature: config says the space is ready, the database says otherwise.
 *
 * Only flagged in that direction. `stored: 'building'` with a live `ready` is the normal race right
 * after a space is created — the background finalizer simply has not written its result yet — and
 * flagging it would train the operator to ignore the badge that matters.
 */
export function isDrifted(stored: SpaceIndexStatus['stored'], live: SpaceIndexStatus['live']): boolean {
  return stored === 'ready' && (live === 'missing' || live === 'building');
}

async function indexStatus(): Promise<{ spaces: SpaceIndexStatus[]; unavailable?: string }> {
  let spaces;
  try { spaces = getConfig().spaces; } catch { return { spaces: [], unavailable: 'configuration is not loaded' }; }

  const faceEnabled = getFaceRecognitionConfig().enabled;
  const db = (() => { try { return getDb(); } catch { return null; } })();
  if (!db) return { spaces: [], unavailable: 'database is not connected' };

  const out = await Promise.all(spaces
    // Proxy spaces aggregate other spaces' reads and own no collections, so they have no indexes to
    // be missing. Listing them would pin a permanent red dot on a space that is working correctly.
    .filter(s => !s.proxyFor)
    .map(async (space): Promise<SpaceIndexStatus> => {
      const expected: Array<{ collection: string; indexName: string }> = VECTOR_INDEXED_COLLECTIONS.map(suffix => ({
        collection: suffix, indexName: `${space.id}_${suffix}_embedding`,
      }));
      if (faceEnabled) expected.push({ collection: 'files', indexName: `${space.id}_files_faceEmbedding` });

      const collections: CollectionIndexStatus[] = [];
      let listingFailed = false;
      await Promise.all(expected.map(async e => {
        try {
          const found = await db.collection(`${space.id}_${e.collection}`).listSearchIndexes(e.indexName).toArray() as Array<{ status?: string }>;
          collections.push({ ...e, status: found[0]?.status ?? null });
        } catch (err) {
          listingFailed = true;
          log.debug(`pipeline-status: could not list search indexes for ${space.id}_${e.collection}: ${err instanceof Error ? err.message : String(err)}`);
          collections.push({ ...e, status: null });
        }
      }));

      const stored = space.indexStatus ?? 'unknown';
      const live = deriveLiveIndexState(collections, listingFailed);
      return { id: space.id, label: space.label, stored, live, collections, drifted: isDrifted(stored, live) };
    }));

  return { spaces: out };
}

// ── Assembly, cached and single-flighted ──────────────────────────────────────

let cached: { at: number; value: PipelineStatus } | null = null;
let inFlight: Promise<PipelineStatus> | null = null;

async function collect(): Promise<PipelineStatus> {
  const face = getFaceRecognitionConfig();
  const [sidecars, models, index] = await Promise.all([
    Promise.all(SIDECARS.map(probeSidecar)),
    probeModelStages(),
    indexStatus(),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    sidecars,
    models,
    index,
    // Face recognition runs in-process (BlazeFace + FaceRes), so there is no endpoint to probe —
    // enabled or not is the whole of its health.
    faceRecognition: { state: face.enabled ? 'ok' : 'off' },
  };
}

/** Cached + single-flighted: several admins on this screen must not multiply the outbound probes. */
export async function getPipelineStatus(): Promise<PipelineStatus> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  if (inFlight) return inFlight;
  inFlight = collect()
    .then(value => { cached = { at: Date.now(), value }; return value; })
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Test seam — drops the cache so a test never observes a previous test's probes. */
export function resetPipelineStatusCache(): void { cached = null; inFlight = null; }

pipelineStatusRouter.use(globalRateLimit);

// requireAdmin, not requireAdminMfa: this reads status and mutates nothing. It does disclose which
// models and hosts are configured, which is admin-only information — so not anonymous either.
pipelineStatusRouter.get('/', requireAdmin, async (_req, res) => {
  try {
    res.json(await getPipelineStatus());
  } catch (err) {
    log.warn(`pipeline-status failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: 'Failed to collect pipeline status' });
  }
});
