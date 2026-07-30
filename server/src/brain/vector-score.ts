/**
 * Reproduce Atlas's `$meta: 'vectorSearchScore'` locally, for records the vector search never returned.
 *
 * ## Why this needs to exist
 *
 * Hybrid retrieval's lexical channel currently **reorders but cannot introduce**. `applyLexicalFusion`
 * says so explicitly, and gives its reason: a lexically-found record
 *
 * > has no measured vector similarity, so it would need either a fabricated `score` (a claim, and one
 * > `minScore` would then act on) or a re-implementation of Atlas's score normalisation from guesswork.
 *
 * Both objections are real, and both are avoidable. The record's embedding is one `$in` fetch away and
 * the query vector is in hand, so the similarity can be **measured** rather than invented. What remains
 * is the mapping from similarity to the number Atlas reports — and that is not guesswork either, because
 * it is checkable against Atlas's own output for any record that appears in both channels. See
 * {@link scoresAgree}.
 *
 * That bound matters more than it sounds. The lexical channel exists for opaque identifiers — part
 * codes, clause names, `event-qps` — which are exactly the tokens whose embeddings are nearly arbitrary.
 * So the records it exists to rescue are the ones most likely to fall outside the vector pool, where the
 * current design cannot reach them. The channel is weakest precisely where it is needed.
 *
 * ## The mappings
 *
 * Atlas normalises every similarity into `(0, 1]` so scores are comparable across metrics:
 *
 * | `similarity` | score |
 * |---|---|
 * | `cosine`     | `(1 + cos(a,b)) / 2` |
 * | `dotProduct` | `(1 + dot(a,b)) / 2` — Atlas requires normalised vectors for this metric |
 * | `euclidean`  | `1 / (1 + d(a,b))` |
 *
 * These are stated rather than derived, which is exactly why nothing here is trusted on faith: the
 * agreement check is the load-bearing part, not the table.
 */

/** Dot product. Callers guarantee equal length. */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

/** Euclidean length. */
export function norm(a: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * a[i]!;
  return Math.sqrt(s);
}

/**
 * Cosine similarity, dividing by the actual norms.
 *
 * The embedding pipeline normalises, so these are unit vectors and the division is a no-op — but only
 * to within float error, and a stored vector may predate a change in that guarantee. Dividing costs one
 * pass and removes the assumption.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const na = norm(a), nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

/** Euclidean distance. */
export function euclideanDistance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * The score Atlas would report for this pair under the configured metric.
 *
 * Returns null when the vectors cannot be compared — differing dimensions (a corpus mid-migration
 * between embedding models) or an unrecognised metric. Null means "no opinion", and the caller drops the
 * candidate rather than scoring it wrongly.
 */
export function atlasVectorScore(a: number[], b: number[], similarity: string): number | null {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return null;
  switch (similarity) {
    case 'cosine':
      return (1 + cosineSimilarity(a, b)) / 2;
    case 'dotProduct':
      return (1 + dot(a, b)) / 2;
    case 'euclidean':
      return 1 / (1 + euclideanDistance(a, b));
    default:
      return null;
  }
}

/**
 * How far a locally computed score may sit from the one Atlas reported before we stop trusting the
 * mapping.
 *
 * Generous on purpose. This is not a precision test — it is a "are these the same formula" test, and
 * the failure it guards against (a wrong mapping) is off by a lot, not by a little. Float drift between
 * a BSON double round-trip and a JS multiply is orders of magnitude smaller than this.
 */
export const SCORE_AGREEMENT_EPSILON = 1e-3;

/**
 * Does our local reproduction match what Atlas actually returned?
 *
 * The self-check that makes introducing records safe. Any record present in **both** the vector pool and
 * the lexical results has an Atlas-reported score *and* a locally computable one, so every hybrid query
 * carries its own free verification sample. When they agree, scores computed for lexical-only records
 * are on the same scale as everything else and `minScore` acts on a real measurement. When they disagree
 * — a future Atlas change, an unexpected metric, a mis-stated formula — the caller declines to introduce
 * and hybrid degrades to today's reorder-only behaviour.
 *
 * Degrading to the previous behaviour on disagreement, rather than proceeding on an unverified formula,
 * is the whole point: a wrong score silently changes which results a fixed `minScore` returns, which is
 * the exact failure mode this codebase already refuses for `rerankScore` and `fusedScore`.
 */
export function scoresAgree(local: number, reported: number): boolean {
  return Math.abs(local - reported) <= SCORE_AGREEMENT_EPSILON;
}
