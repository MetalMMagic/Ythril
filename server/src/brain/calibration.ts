/**
 * Score calibration — turn a corpus-dependent similarity into a corpus-independent one.
 *
 * ## The problem
 *
 * Sentence-embedding spaces are **anisotropic**: the vectors occupy a narrow cone rather than the whole
 * sphere, so two documents with nothing in common still score high. "Unrelated" is not 0. It is whatever
 * that particular corpus happens to sit at, and it moves from space to space and from type to type.
 *
 * Measured on a real instance:
 *
 * | corpus                 | unrelated | exact content match | usable spread |
 * |------------------------|-----------|---------------------|---------------|
 * | `adrs` entities        | 0.812     | 0.855               | **0.04**      |
 * | `tickets` chronos      | — | 0.884–0.889 | — |
 *
 * Two consequences, both bad:
 *
 *  - **An absolute threshold cannot suit every corpus.** The default duplicate threshold flagged
 *    **65 of 94 entities** on that instance. Nothing is wrong with the threshold; it is being asked to
 *    be simultaneously right for corpora whose baselines differ by more than the entire spread they
 *    each have to work with.
 *  - **The number is uninterpretable.** 0.855 sounds like a strong match and 0.812 sounds like a
 *    moderate one. In that corpus the first is an exact match and the second is noise.
 *
 * ## The fix
 *
 * Measure where "unrelated" actually sits for **this** corpus, and report distance from it in standard
 * deviations. Sample random pairs, take the mean and spread of their similarities — that is the corpus's
 * null distribution — and report
 *
 *     z = (score − mu) / sigma
 *
 * Now `z = 0` means "indistinguishable from a random pair" **by construction**, in every corpus, and a
 * threshold expressed in z travels between them. The 0.04-spread corpus and the 0.9-baseline corpus are
 * finally talking about the same thing.
 *
 * ## Three properties worth being explicit about
 *
 * **1. This changes no rankings, ever.** `z` is a strictly monotonic transform of `score` (mu and sigma
 * are per-corpus constants), so sorting by z is sorting by score. Calibration cannot make retrieval
 * better or worse — it makes the *numbers* meaningful and the *thresholds* portable. Improving actual
 * separation is a different job (whitening the space), deliberately not done here.
 *
 * **2. Statistics are per (space × type), not per space.** The table above is the evidence: entities and
 * chronos in the same instance sit at different baselines because their text has a different shape —
 * an entity is a name and a type, a chrono is a title and a date range. One number per space would be an
 * average of distributions that are not the same distribution.
 *
 * **3. "Random pair" means random *in this corpus*, not truly independent.** Two ADRs from the same
 * repository are genuinely somewhat related, so the sampled mean sits above what a global null would be.
 * That is the desired behaviour, not a flaw: the question being answered is "is this more similar than
 * two arbitrary records **here**", which is exactly the question a duplicate check is asking.
 *
 * ## Cost
 *
 * One `$sample` of {@link SAMPLE_DOCS} vectors per (space, type), cached in memory and persisted. The
 * pairwise pass is O(k²·d) — at k=192, d=768 that is ~18k dot products, tens of milliseconds, and it
 * happens off the request path. Embeddings are unit vectors (the pipeline normalises), so cosine is a
 * plain dot product and no per-vector normalisation is needed.
 */

import { col, asFilter } from '../db/mongo.js';
import { getEmbeddingConfig } from '../config/loader.js';
import { log } from '../util/log.js';

/** Knowledge types this module calibrates. Mirrors `RecallKnowledgeType` without importing it (recall
 *  imports this module, and the cycle is avoidable by keeping the string union local). */
export type CalibratedType = 'memory' | 'entity' | 'edge' | 'chrono' | 'file';

const TYPE_COLLECTION: Record<CalibratedType, string> = {
  memory: 'memories',
  entity: 'entities',
  edge: 'edges',
  chrono: 'chrono',
  file: 'files',
};

/**
 * How many document vectors to sample. Every pair among them contributes an observation, so the pair
 * count grows quadratically: 192 documents give 18,336 pairs, which pins mu and sigma far more tightly
 * than the sample size suggests.
 */
export const SAMPLE_DOCS = Number(process.env['CALIBRATION_SAMPLE_DOCS'] ?? 192);

/**
 * Below this, refuse to calibrate rather than calibrate badly.
 *
 * A handful of records cannot describe a distribution, and a sigma estimated from noise would produce
 * wild z values that look authoritative. Returning null instead makes the caller fall back to the raw
 * score, which is the honest answer for a corpus too small to have a baseline.
 */
export const MIN_DOCS_TO_CALIBRATE = 24;

/** A sigma this small means the corpus is degenerate (near-identical records). Guard against /0. */
const MIN_SIGMA = 1e-6;

/**
 * Recompute when the corpus has grown or shrunk by this fraction since sampling.
 *
 * Drift is checked by document count, which is cheap (`estimatedDocumentCount`) and a good proxy: the
 * baseline moves when the *composition* of the corpus changes, and bulk composition change shows up as
 * a size change. A corpus that churns without changing size re-samples on the TTL instead.
 */
const DRIFT_FRACTION = 0.25;

/** Re-sample after this long regardless of drift, so a slowly-churning corpus does not go stale forever. */
const TTL_MS = Number(process.env['CALIBRATION_TTL_MS'] ?? 24 * 60 * 60 * 1000);

/** The null distribution of similarity scores for one (space, type). */
export interface NullStats {
  /** Mean similarity of a random pair — where "unrelated" actually sits in this corpus. */
  mu: number;
  /** Standard deviation of that null. The unit z is measured in. */
  sigma: number;
  /** Pairs observed. */
  pairs: number;
  /** Documents sampled. */
  docs: number;
  /** Corpus size when sampled, for drift detection. */
  corpusSize: number;
  /** Embedding model + dimensions. Stats from a different model describe a different geometry. */
  model: string;
  dim: number;
  sampledAt: string;
}

/** A calibrated view of one raw similarity score. */
export interface CalibratedScore {
  /** Standard deviations above the corpus's random-pair baseline. 0 = indistinguishable from noise. */
  z: number;
  /**
   * `z` squashed to 0..1 by a deliberately boring linear ramp, for callers that want a bounded number.
   *
   * Linear and clamped rather than a logistic or a normal CDF: those saturate so fast that everything
   * past z≈3 reads as 1.000, which throws away the part of the range a duplicate check cares about and
   * implies a precision the estimate does not have. {@link RELEVANCE_FULL_Z} is the documented top of
   * the ramp, not a discovered constant.
   */
  relevance: number;
  /** The baseline this was measured against, so a caller can show its work. */
  mu: number;
  sigma: number;
}

/** z at which `relevance` reaches 1.0. */
export const RELEVANCE_FULL_Z = 8;

/**
 * Default duplicate threshold in z.
 *
 * Eight sigma above the corpus baseline. That sounds extreme by the standards of a normal distribution
 * and is not, because the null here is emphatically not normal: it is the similarity distribution of a
 * topically coherent corpus, with a hard ceiling at 1.0 and a long right tail of genuinely related
 * pairs. The number is a starting point tuned to be *conservative* — the failure this replaces was 65
 * false positives out of 94 records, so erring toward silence is the correct direction.
 */
export const DEFAULT_DUPE_Z = 8;

/** In-memory cache. Keyed `spaceId:type`. */
const cache = new Map<string, NullStats>();
/** In-flight samples, so a burst of recalls triggers one sampling pass rather than N. */
const inFlight = new Map<string, Promise<NullStats | null>>();

const keyOf = (spaceId: string, type: CalibratedType): string => `${spaceId}:${type}`;

/** Persisted copy, so a restart does not re-sample every corpus on the first query.
 *
 *  Deliberately NOT a `{spaceId}_*` collection: those are the synced set, and these numbers are derived,
 *  cheap to recompute, and specific to this instance's embedding model. Replicating them would mean
 *  shipping a peer statistics about a geometry it may not even share. */
const CALIB_COLLECTION = '_calibration';

interface CalibDoc extends NullStats { _id: string }

/**
 * Sample the corpus and measure its null distribution.
 *
 * Returns null when the corpus is too small to describe. Never throws: calibration is an enhancement to
 * a score that is already being returned, so a failure here degrades to "no calibration" rather than
 * failing the recall that asked for it.
 */
export async function sampleNullStats(spaceId: string, type: CalibratedType): Promise<NullStats | null> {
  const embCfg = getEmbeddingConfig();
  const collName = `${spaceId}_${TYPE_COLLECTION[type]}`;

  try {
    const c = col<{ embedding?: number[] }>(collName);
    const corpusSize = await c.estimatedDocumentCount();
    if (corpusSize < MIN_DOCS_TO_CALIBRATE) return null;

    const sampled = await c.aggregate([
      { $match: { embedding: { $type: 'array' } } },
      { $sample: { size: SAMPLE_DOCS } },
      { $project: { _id: 0, embedding: 1 } },
    ]).toArray() as Array<{ embedding?: number[] }>;

    const vectors = sampled
      .map(d => d.embedding)
      .filter((v): v is number[] => Array.isArray(v) && v.length > 0);

    if (vectors.length < MIN_DOCS_TO_CALIBRATE) return null;

    // Guard against a corpus mid-migration between embedding models: mixed dimensions would produce
    // dot products over a truncated overlap, which is not a similarity at all.
    const dim = vectors[0]!.length;
    const usable = vectors.filter(v => v.length === dim);
    if (usable.length < MIN_DOCS_TO_CALIBRATE) return null;

    // Welford over every unordered pair. Streaming rather than collecting the pair scores: at k=192
    // that is 18k numbers we would otherwise hold only to average them.
    let n = 0, mean = 0, m2 = 0;
    for (let i = 0; i < usable.length; i++) {
      const a = usable[i]!;
      for (let j = i + 1; j < usable.length; j++) {
        const b = usable[j]!;
        let dot = 0;
        for (let d = 0; d < dim; d++) dot += a[d]! * b[d]!;
        n++;
        const delta = dot - mean;
        mean += delta / n;
        m2 += delta * (dot - mean);
      }
    }
    if (n < 2) return null;

    const sigma = Math.sqrt(m2 / (n - 1));
    const stats: NullStats = {
      mu: mean,
      sigma: Math.max(sigma, MIN_SIGMA),
      pairs: n,
      docs: usable.length,
      corpusSize,
      model: embCfg.model ?? 'unknown',
      dim,
      sampledAt: new Date().toISOString(),
    };

    // `_id` comes from the filter on upsert, so the replacement carries only the stats.
    await col<CalibDoc>(CALIB_COLLECTION).replaceOne(
      asFilter<CalibDoc>({ _id: keyOf(spaceId, type) }),
      stats as Omit<CalibDoc, '_id'>,
      { upsert: true },
    ).catch(() => { /* the cache still holds it; persistence is an optimisation */ });

    log.debug(
      `Calibrated ${spaceId}/${type}: mu=${stats.mu.toFixed(4)} sigma=${stats.sigma.toFixed(4)} ` +
      `over ${n} pairs from ${usable.length} docs`,
    );
    return stats;
  } catch (err) {
    log.debug(`Calibration sampling failed for ${spaceId}/${type}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** True when cached stats can no longer be trusted for this corpus. */
function isStale(stats: NullStats, corpusSize: number, model: string): boolean {
  if (stats.model !== model) return true;                       // different geometry entirely
  if (Date.now() - Date.parse(stats.sampledAt) > TTL_MS) return true;
  if (stats.corpusSize <= 0) return true;
  const growth = Math.abs(corpusSize - stats.corpusSize) / stats.corpusSize;
  return growth > DRIFT_FRACTION;
}

/**
 * Null statistics for a (space, type), from cache when fresh.
 *
 * Returns null when the corpus is too small to calibrate — callers fall back to the raw score rather
 * than inventing one.
 */
export async function getNullStats(spaceId: string, type: CalibratedType): Promise<NullStats | null> {
  const key = keyOf(spaceId, type);
  const model = getEmbeddingConfig().model ?? 'unknown';

  const cached = cache.get(key);
  if (cached) {
    // Cheap freshness probe. `estimatedDocumentCount` reads collection metadata rather than counting.
    let size = cached.corpusSize;
    try {
      size = await col<{ _id: string }>(`${spaceId}_${TYPE_COLLECTION[type]}`).estimatedDocumentCount();
    } catch { /* keep the cached size; a probe failure must not invalidate good stats */ }
    if (!isStale(cached, size, model)) return cached;
  }

  const running = inFlight.get(key);
  if (running) return running;

  const task = (async (): Promise<NullStats | null> => {
    // Persisted stats first — a restart should not re-sample every corpus on its first query.
    if (!cached) {
      try {
        const doc = await col<CalibDoc>(CALIB_COLLECTION).findOne(asFilter<CalibDoc>({ _id: key })) as CalibDoc | null;
        if (doc) {
          const size = await col<{ _id: string }>(`${spaceId}_${TYPE_COLLECTION[type]}`).estimatedDocumentCount();
          if (!isStale(doc, size, model)) {
            const { _id, ...stats } = doc;
            cache.set(key, stats);
            return stats;
          }
        }
      } catch { /* fall through to sampling */ }
    }
    const fresh = await sampleNullStats(spaceId, type);
    if (fresh) cache.set(key, fresh);
    return fresh;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

/** Calibrate one raw score against a corpus baseline. */
export function calibrate(score: number, stats: NullStats): CalibratedScore {
  const z = (score - stats.mu) / stats.sigma;
  return {
    z: Number(z.toFixed(3)),
    relevance: Number(Math.min(1, Math.max(0, z / RELEVANCE_FULL_Z)).toFixed(4)),
    mu: Number(stats.mu.toFixed(4)),
    sigma: Number(stats.sigma.toFixed(4)),
  };
}

/** Drop cached stats for a space (used when a space is deleted or re-embedded). */
export function invalidateCalibration(spaceId: string): void {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${spaceId}:`)) cache.delete(key);
  }
}

/** Test seam: clear all cached stats. */
export function _resetCalibrationCache(): void {
  cache.clear();
  inFlight.clear();
}
