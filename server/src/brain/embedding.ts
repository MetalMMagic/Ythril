import path from 'node:path';
import { getDataRoot, getEmbeddingConfig } from '../config/loader.js';
import { ssrfSafeFetch } from '../util/ssrf.js';
import { allowPrivateModelEndpoints } from '../config/model-egress-policy.js';
import { log } from '../util/log.js';
import { embeddingDurationSeconds, embeddingQueueDepth } from '../metrics/registry.js';

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
}

export type EmbeddingTask = 'document' | 'query';
export type PrefixScheme = 'auto' | 'none' | 'nomic' | 'qwen';

/**
 * Task prefixes, per model family.
 *
 * An asymmetric retrieval model is trained with the query and the stored passage marked differently.
 * Embedding both sides bare does not fail — it just retrieves worse, which is why this went unnoticed on
 * the HTTP path for as long as it did.
 *
 * `qwen` is deliberately one-sided: Qwen3-Embedding takes an instruction on the QUERY only and embeds
 * passages bare. Applying the nomic shape to it would be worse than applying nothing.
 */
const TASK_PREFIX: Record<Exclude<PrefixScheme, 'auto'>, Record<EmbeddingTask, string>> = {
  none:  { document: '', query: '' },
  nomic: { document: 'search_document: ', query: 'search_query: ' },
  qwen:  { document: '', query: 'Instruct: Given a search query, retrieve relevant passages that answer the query\nQuery: ' },
};

/**
 * Resolve `auto` to the scheme this instance used BEFORE the setting existed.
 *
 * The bundled local model is nomic, and the local path always prefixed. The HTTP path never did — that
 * was the bug, but it is also the behaviour every existing external corpus was embedded under, so `auto`
 * must keep reproducing it or upgrading would silently invalidate those vectors. An operator running
 * nomic behind Ollama has to opt in to `nomic` and re-index; the UI warns exactly as it does for a model
 * change.
 */
export function resolvePrefixScheme(cfg: { baseUrl?: string; prefixScheme?: PrefixScheme }): Exclude<PrefixScheme, 'auto'> {
  const scheme = cfg.prefixScheme ?? 'auto';
  if (scheme !== 'auto') return scheme;
  return cfg.baseUrl ? 'none' : 'nomic';
}

/**
 * The exact string that gets embedded.
 *
 * **This is the single input-preparation site, on purpose.** It used to live inside the local branch of
 * `embed()`, so configuring an HTTP endpoint silently dropped the prefix and degraded every search. One
 * function, called once before the branch, is what makes that impossible to reintroduce.
 */
export function prepareInput(
  text: string,
  task: EmbeddingTask,
  cfg: { baseUrl?: string; prefixScheme?: PrefixScheme },
): string {
  return TASK_PREFIX[resolvePrefixScheme(cfg)][task] + text;
}

// ── Local ONNX pipeline singleton ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocalPipeline = (text: string, opts: Record<string, unknown>) => Promise<any>;

let _pipelineInit: Promise<LocalPipeline> | null = null;
let _pipelineModelId: string | null = null;

function getLocalPipeline(modelId: string): Promise<LocalPipeline> {
  // Re-init only if the configured model changes (rare: config reload)
  if (_pipelineInit && _pipelineModelId === modelId) return _pipelineInit;
  _pipelineModelId = modelId;
  _pipelineInit = (async (): Promise<LocalPipeline> => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // MODEL_CACHE_DIR: baked into Docker image at /app/model-cache (set in Dockerfile).
    // Falls back to DATA_ROOT/.model-cache for local development.
    const cacheDir = process.env['MODEL_CACHE_DIR'] ??
                     path.join(getDataRoot(), '.model-cache');
    env.cacheDir = cacheDir;
    log.info(`Loading embedding model ${modelId} (cache: ${cacheDir})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipe = await pipeline('feature-extraction', modelId) as any;
    log.info(`Embedding model ready: ${modelId}`);
    return pipe as LocalPipeline;
  })();
  return _pipelineInit;
}

// ── HTTP endpoint fallback ─────────────────────────────────────────────────
/** `input` is already task-prefixed by `prepareInput` — do not prefix again here. */
async function embedViaHttp(
  input: string,
  cfg: ReturnType<typeof getEmbeddingConfig>,
): Promise<EmbeddingResult> {
  const url = `${cfg.baseUrl!.replace(/\/$/, '')}/v1/embeddings`;
  // External endpoints go through the SSRF-guarded fetch (DNS-resolve + IP-pin + redirect re-validation);
  // a local/trusted endpoint (e.g. on-cluster Ollama, private address) uses a plain fetch, which the guard
  // would rightly reject. Mirrors the vision/STT provider split (SSRF follow-up part 2).
  // External → SSRF-guarded. `allowPrivateModelEndpoints` lets a self-hosted OpenAI-compatible
  // embedding server live on a cluster address without dropping the guard: DNS-pinning and redirect
  // re-validation still apply, only the private-address rejection lifts.
  const doFetch = cfg.provider === 'external'
    ? (((url: string, init?: RequestInit) =>
        ssrfSafeFetch(url, init ?? {}, { allowPrivate: allowPrivateModelEndpoints() })) as unknown as typeof fetch)
    : fetch;
  let response: Response;
  try {
    response = await doFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: cfg.model, input }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`Embedding endpoint unreachable (${cfg.baseUrl}): ${msg}`);
    throw new Error(
      `Could not reach embedding endpoint at ${cfg.baseUrl}. ` +
      `Make sure an embedding server (e.g. Ollama) is running and configured.`,
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Embedding request failed (HTTP ${response.status}): ${body}`);
  }
  const json = await response.json() as {
    data?: { embedding?: number[] }[];
    error?: { message?: string };
  };
  if (json.error) throw new Error(`Embedding API error: ${json.error.message ?? JSON.stringify(json.error)}`);
  const vector = json.data?.[0]?.embedding;
  if (!vector || vector.length === 0) throw new Error('Embedding API returned empty vector');
  if (vector.length !== cfg.dimensions) {
    log.warn(`Embedding dimensions mismatch: expected ${cfg.dimensions}, got ${vector.length}.`);
  }
  return { vector, model: cfg.model, dimensions: vector.length };
}

/**
 * Pre-load the local ONNX embedding pipeline without running an actual embed.
 * Returns immediately if the model is already loaded.
 * No-op when an external HTTP embedding endpoint is configured.
 */
export async function warmEmbeddingModel(): Promise<void> {
  const cfg = getEmbeddingConfig();
  if (cfg.baseUrl) return; // External endpoint — nothing local to warm
  await getLocalPipeline(cfg.model);
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Generate an embedding vector for the given text.
 *
 * Uses the bundled local ONNX model (nomic-embed-text-v1.5) by default —
 * works out-of-the-box with no external services required.
 *
 * Set `embedding.baseUrl` in config.json to route through an OpenAI-compatible
 * HTTP endpoint instead (e.g. Ollama, OpenAI, etc.).
 *
 * @param task  'document' (default) marks the text as a stored passage; 'query' marks it as a search
 *              query. How that mark is applied depends on `embedding.prefixScheme` — see `prepareInput`.
 *              The prefix is applied ONCE here, before the local/HTTP branch, so both paths embed the
 *              same string. It used to be applied inside the local branch only.
 */
export async function embed(
  text: string,
  task: EmbeddingTask = 'document',
): Promise<EmbeddingResult> {
  const cfg = getEmbeddingConfig();
  const input = prepareInput(text, task, cfg);

  embeddingQueueDepth.inc();
  const end = embeddingDurationSeconds.startTimer();
  try {
    if (cfg.baseUrl) {
      // External HTTP endpoint configured — delegate entirely
      return await embedViaHttp(input, cfg);
    }

    const pipe = await getLocalPipeline(cfg.model);
    const output = await pipe(input, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data as Float32Array) as number[];

    if (vector.length !== cfg.dimensions) {
      log.warn(
        `Embedding dimensions mismatch: expected ${cfg.dimensions}, got ${vector.length}. ` +
        `Update embedding.dimensions in config.json.`,
      );
    }
    return { vector, model: cfg.model, dimensions: vector.length };
  } finally {
    end();
    embeddingQueueDepth.dec();
  }
}
