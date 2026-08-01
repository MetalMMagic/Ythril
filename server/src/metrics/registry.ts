/**
 * Prometheus metrics registry for Ythril.
 *
 * Defines and exports all application metrics collected by prom-client.
 * Default process metrics (CPU, memory, event loop lag, GC) are registered
 * automatically via `collectDefaultMetrics()`.
 *
 * Async gauges (brain counts, storage usage) use the `collect` callback to
 * query MongoDB / disk at scrape time so the data is always fresh.
 */

import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';
import { col } from '../db/mongo.js';
import { getConfig, getStorageConfig } from '../config/loader.js';
import { measureUsage } from '../quota/quota.js';

export const register = new Registry();

// ── Default process metrics (CPU, memory, event loop lag, GC) ──────────────
collectDefaultMetrics({ register });

// ── HTTP ────────────────────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'ythril_http_requests_total',
  help: 'Total HTTP requests by method, route pattern, and status code',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'ythril_http_request_duration_seconds',
  help: 'HTTP request latency in seconds by method and route pattern',
  labelNames: ['method', 'route'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const httpRequestSizeBytes = new Histogram({
  name: 'ythril_http_request_size_bytes',
  help: 'HTTP request body size in bytes',
  labelNames: ['method', 'route'] as const,
  buckets: [0, 100, 1000, 10_000, 100_000, 1_000_000, 10_000_000],
  registers: [register],
});

export const httpResponseSizeBytes = new Histogram({
  name: 'ythril_http_response_size_bytes',
  help: 'HTTP response body size in bytes',
  labelNames: ['method', 'route'] as const,
  buckets: [0, 100, 1000, 10_000, 100_000, 1_000_000, 10_000_000],
  registers: [register],
});

// ── Brain data (gauges collected at scrape time) ────────────────────────────

export const memoriesTotal = new Gauge({
  name: 'ythril_memories_total',
  help: 'Total number of memories by space',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_memories`).countDocuments({});
        this.set({ space: space.id }, count);
      }
    } catch { /* MongoDB may not be ready at startup */ }
  },
});

export const entitiesTotal = new Gauge({
  name: 'ythril_entities_total',
  help: 'Total number of entities by space',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_entities`).countDocuments({});
        this.set({ space: space.id }, count);
      }
    } catch { /* ignore */ }
  },
});

export const edgesTotal = new Gauge({
  name: 'ythril_edges_total',
  help: 'Total number of edges by space',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_edges`).countDocuments({});
        this.set({ space: space.id }, count);
      }
    } catch { /* ignore */ }
  },
});

export const chronoEntriesTotal = new Gauge({
  name: 'ythril_chrono_entries_total',
  help: 'Total number of chrono entries by space',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_chrono`).countDocuments({});
        this.set({ space: space.id }, count);
      }
    } catch { /* ignore */ }
  },
});

export const spacesTotal = new Gauge({
  name: 'ythril_spaces_total',
  help: 'Number of configured spaces',
  registers: [register],
  collect() {
    try {
      const cfg = getConfig();
      this.set(cfg.spaces.length);
    } catch { /* ignore */ }
  },
});

// ── Embeddings ───────────────────────────────────────────────────────────────

export const embeddingDurationSeconds = new Histogram({
  name: 'ythril_embedding_duration_seconds',
  help: 'Time to compute a single embedding vector',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const embeddingQueueDepth = new Gauge({
  name: 'ythril_embedding_queue_depth',
  help: 'Number of pending embedding operations',
  registers: [register],
});

export const reindexInProgress = new Gauge({
  name: 'ythril_reindex_in_progress',
  help: '1 if a reindex operation is currently running, 0 otherwise',
  registers: [register],
});

// ── Storage (collected at scrape time) ──────────────────────────────────────

export const storageUsedBytes = new Gauge({
  name: 'ythril_storage_used_bytes',
  help: 'Storage used in bytes by area (brain, files, total)',
  labelNames: ['area'] as const,
  registers: [register],
  async collect() {
    try {
      const usage = await measureUsage();
      const GiB = 1024 ** 3;
      this.set({ area: 'files' }, usage.files * GiB);
      this.set({ area: 'brain' }, usage.brain * GiB);
      this.set({ area: 'total' }, usage.total * GiB);
    } catch { /* ignore */ }
  },
});

export const storageLimitBytes = new Gauge({
  name: 'ythril_storage_limit_bytes',
  help: 'Configured storage limit in bytes by area and tier (soft, hard)',
  labelNames: ['area', 'tier'] as const,
  registers: [register],
  collect() {
    try {
      const GiB = 1024 ** 3;
      const storage = getStorageConfig();
      if (!storage) return;
      if (storage.total?.softLimitGiB != null) this.set({ area: 'total', tier: 'soft' }, storage.total.softLimitGiB * GiB);
      if (storage.total?.hardLimitGiB != null) this.set({ area: 'total', tier: 'hard' }, storage.total.hardLimitGiB * GiB);
      if (storage.files?.softLimitGiB != null) this.set({ area: 'files', tier: 'soft' }, storage.files.softLimitGiB * GiB);
      if (storage.files?.hardLimitGiB != null) this.set({ area: 'files', tier: 'hard' }, storage.files.hardLimitGiB * GiB);
      if (storage.brain?.softLimitGiB != null) this.set({ area: 'brain', tier: 'soft' }, storage.brain.softLimitGiB * GiB);
      if (storage.brain?.hardLimitGiB != null) this.set({ area: 'brain', tier: 'hard' }, storage.brain.hardLimitGiB * GiB);
    } catch { /* ignore */ }
  },
});

// ── Authentication ───────────────────────────────────────────────────────────

export const authAttemptsTotal = new Counter({
  name: 'ythril_auth_attempts_total',
  help: 'Authentication attempts by result (success, invalid, expired)',
  labelNames: ['result'] as const,
  registers: [register],
});

export const tokensActive = new Gauge({
  name: 'ythril_tokens_active',
  help: 'Number of active (non-expired) tokens',
  registers: [register],
  collect() {
    try {
      const cfg = getConfig();
      const now = new Date();
      const active = cfg.tokens.filter(
        t => !t.expiresAt || new Date(t.expiresAt) > now,
      ).length;
      this.set(active);
    } catch { /* ignore */ }
  },
});

// ── MCP ──────────────────────────────────────────────────────────────────────

export const mcpConnectionsActive = new Gauge({
  name: 'ythril_mcp_connections_active',
  help: 'Current number of active MCP SSE connections',
  registers: [register],
});

export const mcpToolCallsTotal = new Counter({
  name: 'ythril_mcp_tool_calls_total',
  help: 'MCP tool invocations by tool name and space',
  labelNames: ['tool', 'space'] as const,
  registers: [register],
});

// ── Sync ─────────────────────────────────────────────────────────────────────

export const syncCyclesTotal = new Counter({
  name: 'ythril_sync_cycles_total',
  help: 'Sync cycles by network and status (success, partial, error)',
  labelNames: ['network', 'status'] as const,
  registers: [register],
});
// Pre-initialise so HELP/TYPE lines appear in /metrics from startup
// (labelled counters are invisible until first .inc() in prom-client)
syncCyclesTotal.labels({ network: '', status: 'success' }).inc(0);

export const syncItemsPulledTotal = new Counter({
  name: 'ythril_sync_items_pulled_total',
  help: 'Items received during sync by type (memories, entities, edges, files, chrono)',
  labelNames: ['type'] as const,
  registers: [register],
});

export const syncItemsPushedTotal = new Counter({
  name: 'ythril_sync_items_pushed_total',
  help: 'Items sent during sync by type (memories, entities, edges, files, chrono)',
  labelNames: ['type'] as const,
  registers: [register],
});

export const syncDurationSeconds = new Histogram({
  name: 'ythril_sync_duration_seconds',
  help: 'Time per sync cycle in seconds',
  labelNames: ['network'] as const,
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [register],
});

// ── Media embedding ──────────────────────────────────────────────────────────
// Pipeline that converts image / audio / video into text → embedding vector.
// Counters are pre-initialised with `.inc(0)` so HELP/TYPE lines appear from
// startup even before the first job (matches the sync-metric convention).

export const mediaJobsCompletedTotal = new Counter({
  name: 'ythril_media_jobs_completed_total',
  help: 'Media embedding jobs that completed successfully, by space and media type',
  labelNames: ['space', 'media_type'] as const,
  registers: [register],
});
mediaJobsCompletedTotal.labels({ space: '', media_type: 'image' }).inc(0);

export const mediaJobsFailedTotal = new Counter({
  name: 'ythril_media_jobs_failed_total',
  help: 'Media embedding jobs that exhausted retries, by space and media type',
  labelNames: ['space', 'media_type'] as const,
  registers: [register],
});
mediaJobsFailedTotal.labels({ space: '', media_type: 'image' }).inc(0);

export const mediaJobsRetriedTotal = new Counter({
  name: 'ythril_media_jobs_retried_total',
  help: 'Media embedding jobs that failed an attempt and were re-queued, by space and media type',
  labelNames: ['space', 'media_type'] as const,
  registers: [register],
});
mediaJobsRetriedTotal.labels({ space: '', media_type: 'image' }).inc(0);

export const mediaJobDurationSeconds = new Histogram({
  name: 'ythril_media_job_duration_seconds',
  help: 'End-to-end processing time per media embedding job',
  labelNames: ['media_type'] as const,
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120, 300, 600, 1800],
  registers: [register],
});

export const mediaJobsPending = new Gauge({
  name: 'ythril_media_jobs_pending',
  help: 'Pending media embedding jobs by space (collected at scrape time)',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_media_jobs`).countDocuments({ status: 'pending' });
        this.set({ space: space.id }, count);
      }
    } catch { /* MongoDB may not be ready */ }
  },
});

export const mediaJobsProcessing = new Gauge({
  name: 'ythril_media_jobs_processing',
  help: 'In-flight media embedding jobs by space (collected at scrape time)',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_media_jobs`).countDocuments({ status: 'processing' });
        this.set({ space: space.id }, count);
      }
    } catch { /* ignore */ }
  },
});

export const mediaJobsFailed = new Gauge({
  name: 'ythril_media_jobs_failed',
  help: 'Media embedding jobs in terminal failed state by space (collected at scrape time)',
  labelNames: ['space'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const count = await col(`${space.id}_media_jobs`).countDocuments({ status: 'failed' });
        this.set({ space: space.id }, count);
      }
    } catch { /* ignore */ }
  },
});

/**
 * Which phase the in-flight jobs are in, counted by step.
 *
 * `ythril_media_jobs_processing` already says a job is running, and that is where the diagnosis stopped: a
 * fleet with one 358 KB document saw `processing 1` for twenty minutes and could not tell reading from
 * embedding from wedged. The jobs themselves have carried a step report for a while — the worker writes it
 * with every heartbeat — so this is that field, aggregated. Nothing new is measured; something already
 * measured is finally reachable from a dashboard.
 *
 * `step` comes from the route the document is actually taking (`render`, `vlm`, `embed`, `describe`, …), so
 * it is not a fixed list here. Steps are remembered once seen and reported as `0` when no job is in them:
 * a series that disappears cannot be alerted on, because absent and zero look the same in a query.
 */
const _seenJobSteps = new Set<string>();
export const mediaJobPhase = new Gauge({
  name: 'ythril_media_job_phase',
  help: 'In-flight media jobs by the pipeline step they are currently in (collected at scrape time)',
  labelNames: ['space', 'step'] as const,
  registers: [register],
  async collect() {
    try {
      const cfg = getConfig();
      for (const space of cfg.spaces.filter(s => !s.proxyFor)) {
        const rows = await col(`${space.id}_media_jobs`)
          .find({ status: 'processing' }, { projection: { progress: 1 } })
          .toArray() as Array<{ progress?: { step?: string } }>;
        const counts = new Map<string, number>();
        for (const r of rows) {
          // A processing job with no step report is not "no jobs": it is a job whose phase predates the
          // heartbeat, or one that has not reached its first step yet. Both are visible as `unknown`.
          const step = r.progress?.step ?? 'unknown';
          counts.set(step, (counts.get(step) ?? 0) + 1);
        }
        for (const step of counts.keys()) _seenJobSteps.add(step);
        for (const step of _seenJobSteps) this.set({ space: space.id, step }, counts.get(step) ?? 0);
      }
    } catch { /* MongoDB may not be ready */ }
  },
});

/**
 * Chunks embedded, as they are embedded.
 *
 * The signal a fleet actually needs is not "how many jobs are running" but "is this one moving". A gauge
 * cannot answer that; a counter can — `rate(ythril_embed_chunks_total[5m]) == 0` while
 * `ythril_media_jobs_processing > 0` is the difference between a slow document and a stuck one, and it was
 * exactly the question nobody could answer during a liveness crash loop.
 *
 * Counted per chunk regardless of whether the vector came out: a chunk that failed to embed still moved
 * the job forward, and `ythril_media_jobs_*` already carry the failure story.
 */
export const embedChunksTotal = new Counter({
  name: 'ythril_embed_chunks_total',
  help: 'Document chunks put through the embedder, by space (motion, not success)',
  labelNames: ['space'] as const,
  registers: [register],
});
embedChunksTotal.labels({ space: '' }).inc(0);

// ── Silent degradation ───────────────────────────────────────────────────────
/**
 * Recall answered, but with a weaker pipeline than the instance is configured for.
 *
 * Every other counter here measures work done or work failed. This one measures the gap between them:
 * the paths where nothing errors, the caller gets a 200, and the answer is quietly worse than it should
 * be. A reranker that has been unreachable for a week produces no failed requests, no error rate, no
 * change in latency worth noticing — every recall simply comes back in vector order and nobody is told.
 * The same is true of a space whose lexical index is missing, and of a rerank skipped because the
 * end-to-end budget had already been spent upstream.
 *
 * These already log a warning each. A log line is the right place to explain ONE occurrence and the
 * wrong place to notice a pattern — nobody greps a week of logs to discover that recall quality has been
 * degraded the whole time. A counter turns "is my reranker actually being used?" into a question the
 * operator can answer, and alert on.
 *
 * `reason` is a closed set, deliberately: an unbounded label is a cardinality bomb.
 *  - `rerank_unavailable`    — configured, but it did not answer (unreachable, non-2xx, unreadable body)
 *  - `rerank_skipped_budget` — not attempted; the end-to-end budget was already spent (see RECALL_BUDGET_MS)
 *
 * **A missing lexical channel is deliberately NOT counted here.** `applyLexicalFusion` cannot currently
 * tell "this space has no text index" from "the query matched nothing lexically" — both surface as an
 * empty result. Counting that would fire on ordinary queries and report degradation where there is none,
 * which is worse than not measuring it: a metric an operator learns to ignore is a metric that will not
 * be read on the day it matters. Wire it only once `lexicalSearch` distinguishes the two.
 */
export const recallDegradedTotal = new Counter({
  name: 'ythril_recall_degraded_total',
  help: 'Recalls answered with a weaker pipeline than configured, by reason',
  labelNames: ['reason'] as const,
  registers: [register],
});
// Pre-declare every series so a scrape before the first degradation reports 0 rather than nothing at
// all — "absent" and "zero" look identical in a graph and mean opposite things.
for (const reason of ['rerank_unavailable', 'rerank_skipped_budget']) {
  recallDegradedTotal.labels({ reason }).inc(0);
}

// ── Security posture (observability audit, lens 9) ────────────────────────────

/**
 * The instance's own PASS/WARN/FAIL posture, countable.
 *
 * `computeSecurityPosture()` already produces this: it is printed once at boot and served on
 * `GET /api/about/security` (admin-only). Both are pull-only and human-shaped, which means a fleet learns
 * that an instance came up misconfigured by someone reading its boot log. On a five-instance fleet nobody
 * reads five boot logs, and the checks that matter most are exactly the ones that produce no runtime
 * symptom — `requireEncryptedTransport` off, or on WITHOUT `trustProxy`, which rejects every request.
 *
 * So the same finding set is a gauge, and an operator can alert on it:
 *
 *     ythril_security_posture_checks{level="fail"} > 0
 *
 * Computed at scrape time from the same function, never a second copy of the rules — a posture metric that
 * could disagree with the endpoint would be worse than no metric.
 *
 * Pre-declared for all three levels so a healthy instance reports `fail 0` rather than nothing: absent and
 * zero look identical in a graph and mean opposite things, which is the trap `recallDegradedTotal` above
 * documents one metric up.
 */
export const securityPostureChecks = new Gauge({
  name: 'ythril_security_posture_checks',
  help: 'Security-posture checks by level (pass/warn/fail) — alert on level="fail"',
  labelNames: ['level'] as const,
  registers: [register],
  collect() {
    try {
      const counts: Record<string, number> = { pass: 0, warn: 0, fail: 0 };
      for (const c of postureProvider?.() ?? []) {
        if (c.level in counts) counts[c.level] = (counts[c.level] ?? 0) + 1;
      }
      for (const [level, n] of Object.entries(counts)) this.set({ level }, n);
    } catch {
      /* A metrics scrape must never be the thing that fails. */
    }
  },
});

/**
 * How the posture reaches the gauge without this module importing config.
 *
 * `registry.ts` is imported by nearly every file, so pulling `security-posture` (and therefore the config
 * loader) in here would invert the dependency direction and risk a cycle. `index.ts` registers the provider
 * once at boot instead. Unregistered — in a test, or before boot finishes — the gauge reports zeros, which
 * is the honest answer for "no posture has been computed".
 */
let postureProvider: (() => Array<{ level: string }>) | null = null;
export function setPostureProvider(fn: () => Array<{ level: string }>): void {
  postureProvider = fn;
}
for (const level of ['pass', 'warn', 'fail']) securityPostureChecks.set({ level }, 0);
