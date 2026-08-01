/**
 * How many chunk embeds may run at once — and why the answer differs by embedder.
 *
 * ## What was measured
 *
 * With the bundled in-process ONNX model, one chunk embed of ~1.8 KB takes **~208 ms** and blocks the event
 * loop for essentially all of it: a 50 ms timer sampled during a run showed **mean 161 ms / max 222 ms of
 * lag**. Measured inside the shipped image, not inferred.
 *
 * That is fine for one chunk. The pipeline ran **eight** of them at once, and the in-process embedder is
 * CPU-bound, so eight concurrent inferences do not go eight times faster — they saturate every core and leave
 * nothing for the thread that answers `/health`. On a reporting fleet a 358 KB document took ~6 minutes and
 * the pod was killed repeatedly by an ordinary liveness probe while it was working correctly: no error, no
 * `failed` status, just restarts. Nothing pointed at the document.
 *
 * ## Why this is not sized from the core count
 *
 * `os.availableParallelism()` reports the HOST's cores, not the cgroup CPU limit. The reporting deployment is
 * capped at 4 CPU on a 16-core node, so core detection would have "left headroom" of 15 and oversubscribed
 * exactly as before. A container's real budget is not visible from inside it, so the in-process default is a
 * deliberately conservative constant instead of a computed one, and an operator with headroom can raise it.
 *
 * An EXTERNAL embedding endpoint is network-bound: the work happens elsewhere, this process is waiting on
 * sockets, and eight in flight is the right call. Same constant for both was the mistake.
 */

/** In-process default: low enough to leave the event loop responsive on a small CPU allocation. */
export const IN_PROCESS_EMBED_CONCURRENCY = 2;

/** External default: the work is on another host, so this is a socket-count question, not a CPU one. */
export const EXTERNAL_EMBED_CONCURRENCY = 8;

/** Hard ceiling on the operator override, so a typo cannot turn into hundreds of parallel requests. */
export const MAX_EMBED_CONCURRENCY = 32;

/**
 * Resolve the chunk-embed concurrency for the configured embedder.
 *
 * `baseUrl` present ⇒ external. A blank/absent baseUrl is the bundled in-process model, which is the case
 * that starves the loop. An explicit `embedConcurrency` wins for either, clamped to at least 1 — a zero or a
 * negative would otherwise stall ingestion completely, which is a worse failure than a slow one.
 */
export function embedConcurrency(cfg: { baseUrl?: string | null; embedConcurrency?: number }): number {
  const external = !!cfg.baseUrl?.trim();
  const dflt = external ? EXTERNAL_EMBED_CONCURRENCY : IN_PROCESS_EMBED_CONCURRENCY;
  const override = cfg.embedConcurrency;
  if (typeof override !== 'number' || !Number.isFinite(override)) return dflt;
  return Math.max(1, Math.min(MAX_EMBED_CONCURRENCY, Math.floor(override)));
}
