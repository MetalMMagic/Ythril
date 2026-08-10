/**
 * Backfill missing embeddings for a space.
 *
 * ## Why this exists
 *
 * `suppressEmbeddings` shipped without a way back. Records written while suppression was on have no vector, and
 * nothing revisited them — so turning the setting off left the space permanently half-indexed, with recall blind
 * to everything written during the suppressed period and no symptom beyond worse results. The owner's call was
 * blunt: *"there should be a way to backfill"*.
 *
 * It is not only for suppression. The same gap opens whenever an enqueue fails: `enqueueEmbedJob` deliberately
 * swallows its error rather than failing the caller's write, and its comment claimed "the periodic backfill sweep
 * will find it". **There was no such sweep** — the comment described a repair mechanism that had never been
 * built, which is exactly the kind of reassurance that stops anyone looking. This is that sweep, on demand.
 *
 * ## It ENQUEUES, and does not embed
 *
 * A space can hold a million records and the model is the slow part. Embedding inline would time out the request
 * somewhere in the middle, having done partial work with no record of where it stopped. Enqueuing is idempotent
 * per record (`enqueueEmbedJob` upserts by job id), so a repeated call over the same space converges instead of
 * duplicating.
 *
 * ## A backfill must not fight the setting
 *
 * A record that is STILL suppressed is skipped, and the same `embeddingSuppressed` resolver the write path uses
 * decides it. Re-deriving the rule here would let a backfill re-index exactly what an operator asked to keep out
 * of recall — the resolver is imported for that reason, not for convenience.
 *
 * So the operator's sequence is: turn suppression off, then backfill. Running it while still suppressed is not an
 * error and reports honestly — every candidate comes back under `skippedSuppressed`, which tells the operator the
 * setting is still on rather than leaving them to wonder why nothing happened.
 *
 * ## Nothing is capped silently
 *
 * `limit` bounds one call. When more candidates remain, `remaining` says how many and `truncated` is `true`. A
 * backfill that quietly stopped at a round number would read as "the space is fully indexed now", which is the
 * same class of lie as the missing sweep this replaces.
 */

import { col, asFilter } from '../db/mongo.js';
import { COLLECTION, } from './embed-record.js';
import { enqueueEmbedJob } from './embed-queue.js';
import { embeddingSuppressed, schemaKeyFor } from './suppress-embeddings.js';
import { getSpaceMeta } from '../spaces/schema-validation.js';
import type { KnowledgeType } from '../config/types-knowledge.js';
import type { BrainEmbedRecordType } from '../config/types.js';

/** Every record kind that carries a vector. Derived from `COLLECTION` so a new kind cannot be missed here. */
export const REEMBED_KINDS = Object.keys(COLLECTION) as BrainEmbedRecordType[];

/** Default and ceiling for one call. The ceiling exists so a single request cannot enqueue unbounded work. */
export const REEMBED_DEFAULT_LIMIT = 5_000;
export const REEMBED_MAX_LIMIT = 50_000;

export interface ReembedResult {
  spaceId: string;
  /** Records with no vector that are not suppressed — the ones a job was queued for. */
  enqueued: number;
  /** Candidates skipped because suppression still applies at some tier. */
  skippedSuppressed: number;
  /** Per-kind breakdown of what was enqueued, so an operator can see WHERE the gap was. */
  byKind: Record<string, number>;
  /** Candidates left over after `limit`. Zero when the space is fully swept. */
  remaining: number;
  /** True when `remaining > 0` — call again to continue. */
  truncated: boolean;
}

/**
 * Whether this stored document is still suppressed.
 *
 * Mirrors `embedStoredRecord` exactly, including the file asymmetry: a file has no type and therefore no type
 * schema, so it skips the middle tier. Narrowed rather than cast — a cast would index `typeSchemas` with
 * `'file'` and miss every time, which here would mean re-embedding files an operator had suppressed.
 */
function stillSuppressed(spaceId: string, kind: BrainEmbedRecordType, doc: Record<string, unknown>): boolean {
  const meta = getSpaceMeta(spaceId);
  const knowledgeType: KnowledgeType | undefined = kind === 'file' ? undefined : kind;
  const schemaKey = knowledgeType === undefined ? undefined : schemaKeyFor(knowledgeType, doc);
  return embeddingSuppressed({
    record: doc['excludeFromVectorSearch'] === true ? true : undefined,
    schema: knowledgeType === undefined || schemaKey === undefined
      ? undefined
      : meta?.typeSchemas?.[knowledgeType]?.[schemaKey],
    space: meta?.suppressEmbeddings === true,
  });
}

/**
 * Queue an embedding job for every record in the space that has no vector and is not suppressed.
 *
 * `kinds` narrows the sweep; omitted means all of them. `limit` bounds one call — see the class comment on why
 * the remainder is reported rather than hidden.
 */
export async function reembedSpace(
  spaceId: string,
  { kinds = REEMBED_KINDS, limit = REEMBED_DEFAULT_LIMIT }: { kinds?: BrainEmbedRecordType[]; limit?: number } = {},
): Promise<ReembedResult> {
  const cap = Math.min(Math.max(1, Math.floor(limit)), REEMBED_MAX_LIMIT);
  const result: ReembedResult = {
    spaceId, enqueued: 0, skippedSuppressed: 0, byKind: {}, remaining: 0, truncated: false,
  };

  for (const kind of kinds) {
    // `$exists: false` on `embedding`, NOT a null check: the suppressed path `$unset`s the field, so a record
    // that was suppressed and later released has no key at all rather than a null one. A `null` filter would
    // find nothing and report a clean sweep over a space that is entirely unindexed.
    const filter = asFilter({ embedding: { $exists: false } });
    const collName = `${spaceId}_${COLLECTION[kind]}`;

    // Counted before the cap is applied, so `remaining` is the truth about the space rather than about this
    // page. Without this a truncated sweep could not tell an operator that more work is left.
    const total = await col(collName).countDocuments(filter);

    const budget = cap - result.enqueued - result.skippedSuppressed;
    if (budget <= 0) { result.remaining += total; continue; }

    const docs = await col(collName).find(filter).limit(budget).toArray() as Array<Record<string, unknown>>;
    for (const doc of docs) {
      const id = doc['_id'];
      if (typeof id !== 'string') continue;
      if (stillSuppressed(spaceId, kind, doc)) { result.skippedSuppressed++; continue; }
      await enqueueEmbedJob(spaceId, kind, id);
      result.enqueued++;
      result.byKind[kind] = (result.byKind[kind] ?? 0) + 1;
    }
    if (total > docs.length) result.remaining += total - docs.length;
  }

  result.truncated = result.remaining > 0;
  return result;
}
