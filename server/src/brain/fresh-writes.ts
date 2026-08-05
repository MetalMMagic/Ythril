/**
 * The records the vector index has not seen yet.
 *
 * ## The defect this exists for
 *
 * `checkDuplicates` asks "is anything already in this space very similar to what I am about to write?" —
 * and it asked the **vector index**, which is eventually consistent. A document committed a moment ago is
 * not in it. So the one check whose entire job is to compare against the neighbourhood of a record being
 * written *now* was the one check guaranteed not to see that neighbourhood.
 *
 * Reported independently by two integrators, symptoms an order of magnitude apart: a 0.98-similar record
 * missed at ~14 s and caught at ~2 min on the **same** threshold (which is what proves elapsed time was
 * the variable, not the threshold), and a record invisible to recall for **150 s** while write-time
 * duplicate detection saw new records immediately.
 *
 * It bites exactly where it hurts. An agent writing a set of related records in one turn is *when*
 * duplicates get created, and that is precisely the window in which the check could not fire — every
 * warning named an older record, none named anything from the same batch.
 *
 * ## Why not `exact: true`
 *
 * The obvious fix, and it does not work. `$vectorSearch` with `exact: true` is an exhaustive scan of the
 * **index**, not of the collection — it skips the approximate traversal, it does not skip mongot. Measured
 * against the test stack (MongoDB 8.3.4, atlas-local), inserting a document and polling both paths:
 *
 * | path | first saw the fresh write |
 * |---|---|
 * | ANN (`numCandidates`) | 1088 ms |
 * | ENN (`exact: true`) | 1083 ms |
 *
 * Identical. Anything that goes through the search index inherits the lag, so the only thing that can see
 * a fresh write is the collection.
 *
 * ## What this does instead
 *
 * Scores the newest records **in the collection**, bounded twice over so the cost cannot run away:
 *
 *  - `$sort { seq: -1 }` + `$limit` — `seq` is already indexed (sync depends on it) and is monotonic per
 *    space, so "the newest N" is an index walk whose cost does not grow with the collection;
 *  - then a time window, applied *before* the vector math, so a quiet space scores nothing.
 *
 * Measured on 20,000 entities at 768 dimensions: **8.9 ms** when the window is empty, **51.8 ms** when it
 * is full. The existing ANN query costs 13.5 ms, so a busy space pays roughly four times one search — and
 * a busy space is the one that needs this. Both numbers are flat in collection size.
 *
 * The pipeline computes `dot` and the document's norm and **nothing else**: the mapping from those to a
 * score lives once, in {@link atlasScoreFromParts}. Restating Atlas's formula in MQL would have been the
 * two-implementations-of-one-rule shape that keeps costing this repo bugs.
 */
import { col } from '../db/mongo.js';
import { getEmbeddingConfig } from '../config/loader.js';
import { atlasScoreFromParts, norm } from './vector-score.js';
import { log } from '../util/log.js';
import { envInt } from '../config/env-num.js';

/**
 * How far back "fresh" reaches.
 *
 * Sized from the worst report rather than the local measurement: index lag was ~1 s on an idle test stack
 * and **150 s** on the loaded deployment that reported it. A window shorter than the lag it compensates
 * for would close exactly when the deployment is busy enough to need it.
 */
export const FRESH_WINDOW_MS = envInt('DUPE_FRESH_WINDOW_MS', 180_000);

/**
 * Hard ceiling on documents scored per check, whatever the window says.
 *
 * The window alone is not a bound: a bulk import writes thousands of records inside it. 200 costs ~52 ms
 * at 768 dimensions and covers the newest — which, ordered by `seq`, are the ones a just-written record is
 * most likely to duplicate. When it truncates, that is logged rather than swallowed: a silent cap reads as
 * "checked everything" to whoever is looking at the result.
 */
export const FRESH_SCAN_CAP = envInt('DUPE_FRESH_SCAN_CAP', 200);

/** A candidate found in the collection rather than the index. */
export interface FreshMatch {
  _id: string;
  /** On the same scale as `$meta: 'vectorSearchScore'` — see {@link atlasScoreFromParts}. */
  score: number;
}

/**
 * Score the most recently written records in a collection against a query vector.
 *
 * Best-effort by design: every caller already has the index result in hand, so a failure here degrades to
 * exactly today's behaviour rather than failing the write it was invoked from.
 *
 * @param collName full collection name, e.g. `general_entities`
 * @param queryVector the vector being checked
 * @param now injectable clock — the window is the thing under test, so a test must be able to set it
 */
export async function matchFreshWrites(
  collName: string,
  queryVector: number[],
  now: number = Date.now(),
): Promise<FreshMatch[]> {
  if (queryVector.length === 0) return [];

  const similarity = getEmbeddingConfig().similarity;
  const queryNorm = norm(queryVector);
  const cutoff = new Date(now - FRESH_WINDOW_MS).toISOString();

  try {
    const rows = await col(collName).aggregate<{ _id: string; dot: number; norm: number }>([
      // Newest first, capped, BEFORE anything expensive. This is the index walk that keeps the cost flat.
      { $sort: { seq: -1 } },
      { $limit: FRESH_SCAN_CAP },
      // Then the window, and then the vector math — in that order, so a quiet space pays for neither.
      // `embedding` is absent on a record still queued for embedding, and on one excluded from vector
      // search; both are correctly invisible to a similarity check.
      { $match: { updatedAt: { $gte: cutoff }, embedding: { $type: 'array' } } },
      {
        $project: {
          _id: 1,
          dot: {
            $reduce: {
              input: { $zip: { inputs: ['$embedding', queryVector] } },
              initialValue: 0,
              in: {
                $add: ['$$value', {
                  $multiply: [{ $arrayElemAt: ['$$this', 0] }, { $arrayElemAt: ['$$this', 1] }],
                }],
              },
            },
          },
          norm: {
            $sqrt: {
              $reduce: {
                input: '$embedding',
                initialValue: 0,
                in: { $add: ['$$value', { $multiply: ['$$this', '$$this'] }] },
              },
            },
          },
          // `$zip` truncates to the shorter input, so a document embedded by a different model would score
          // against a prefix of itself and land anywhere. Carry the length and drop those below.
          dims: { $size: '$embedding' },
        },
      },
    ]).toArray() as Array<{ _id: string; dot: number; norm: number; dims: number }>;

    if (rows.length === FRESH_SCAN_CAP) {
      log.warn(
        `Fresh-write duplicate scan hit its ${FRESH_SCAN_CAP}-document cap on ${collName}: only the newest ` +
        `${FRESH_SCAN_CAP} records of the last ${Math.round(FRESH_WINDOW_MS / 1000)}s were compared. ` +
        'Raise DUPE_FRESH_SCAN_CAP if this space sustains that write rate.',
      );
    }

    const out: FreshMatch[] = [];
    for (const r of rows) {
      if (r.dims !== queryVector.length) continue;    // mid-migration between embedding models
      const score = atlasScoreFromParts(r.dot, r.norm, queryNorm, similarity);
      if (score === null) continue;                    // unrecognised metric — no opinion
      out.push({ _id: r._id, score });
    }
    return out;
  } catch (err) {
    log.debug(`Fresh-write scan skipped for ${collName}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
