/**
 * The pure shape of a recall answer: merge, rank, and the two text projections.
 *
 * ## Why these four live away from `recall.ts`
 *
 * None of them touch a database, a deadline, or an embedder. They take results and return results — which is
 * why they are the four functions in that file with real unit coverage, and why they were the four that could
 * be moved without a characterization pass: 81 existing assertions across three suites already pin them, and
 * they were green against the original code before this file existed.
 *
 * `recall.ts` had grown to 744 code lines and taken a god-file ratchet raise. A raise names a cost and defers
 * it; this pays part of it back. The remaining file is the part that genuinely needs a database.
 *
 * ## The import direction, and why it is not a cycle
 *
 * `recall.ts` imports these functions, and this module imports `RecallResult` and `RecallKnowledgeType` back
 * from it. That reads like a cycle and is not one: a type-only import is **erased** by TypeScript, so nothing
 * of it survives into the emitted JavaScript. At runtime the dependency is one-way.
 *
 * It is still the wrong shape to leave for ever. The repo already has the fix as precedent — `config/rights-shape.ts`
 * exists precisely because `types.ts` could not import from `auth/` while `auth/` imported `types.ts`, and a
 * leaf module both could import broke it. The follow-up is a `recall-types.ts` leaf holding `RecallResult`, its
 * five variants and `RecallKnowledgeType`; that is a change to every importer of those types and belongs on its
 * own, not bolted onto a file move.
 */
import type { RecallResult, RecallKnowledgeType } from './recall.js';

/** Roughly a 2k-token window at ~4 chars/token, which every current reranker comfortably accepts. */
export const RERANK_TEXT_MAX_CHARS = 8_000;

/**
 * Combine the floor-guaranteed results with the global ones, honour `topK`, and apply `minScore`.
 *
 * Pure, and extracted so it can be tested at all: the surrounding function is two `await`s into
 * MongoDB on either side, so this logic previously had no reachable seam — which is exactly why the
 * standalone test that "covered" it was a hand-written copy that had drifted from it.
 *
 * The order matters and is easy to get subtly wrong:
 *   1. guaranteed results are already deduped by the caller and always survive `topK`;
 *   2. the global results fill whatever slots remain, skipping anything already guaranteed;
 *   3. the combined list is sorted by score — a floor result may legitimately outrank a global one;
 *   4. `minScore` filters LAST, so it can drop a guaranteed result. That is deliberate: a floor is a
 *      request for coverage, not a licence to return matches the caller called too weak to want.
 *
 * `maxPerType` is the CEILING to `minPerType`'s floor, and it is applied here rather than by fetching less.
 * Phase 2 over-fetches on purpose so a cross-encoder has something to reorder; capping the fetch instead
 * would hand the reranker the top-N by vector similarity rather than the best N after reranking — a worse
 * answer for the same cost. The cap's whole value is in step 2: a candidate whose type is already full is
 * SKIPPED and the walk continues, so the slot it would have taken goes to another type. Without that, a
 * ceiling would only shorten the list, and the caller's actual complaint — one long chunk crowding out four
 * one-line principles — would be unaddressed.
 *
 * A ceiling never drops a floor result: `minPerType.x > maxPerType.x` is refused at both API surfaces, so
 * the two cannot contradict by the time they reach here. Guaranteed results still COUNT toward the ceiling,
 * or a floor of 2 plus a ceiling of 2 would return four.
 */
export function mergeRecallResults(
  guaranteed: RecallResult[],
  allResults: RecallResult[],
  topK: number,
  minScore?: number | null,
  maxPerType?: Partial<Record<RecallKnowledgeType, number>>,
): RecallResult[] {
  const guaranteedIds = new Set(guaranteed.map(r => r._id));
  const fillSlots = Math.max(0, topK - guaranteed.length);

  // Per-type usage starts from the floor results, which are already in the output.
  const used = new Map<RecallKnowledgeType, number>();
  if (maxPerType) for (const r of guaranteed) used.set(r.type, (used.get(r.type) ?? 0) + 1);
  const capOf = (t: RecallKnowledgeType): number =>
    maxPerType?.[t] ?? Number.POSITIVE_INFINITY;

  // Rank BEFORE selecting, not after.
  //
  // This function used to walk `allResults` in the order it was handed and sort only at the end, which was
  // harmless while selection was "take the first `fillSlots`" — the sort fixed the order of whatever came
  // out. It stops being harmless the moment a ceiling exists: with `{file: 1}`, the cap keeps the FIRST file
  // it walks past and skips the rest, so an unranked walk keeps a 0.1 hit and discards a 0.99 one. Its own
  // test caught exactly that.
  //
  // It also fixes the same latent problem in plain `topK` truncation, which picked the first N of the input
  // rather than the best N. Both were masked by every production caller sorting first — and `applyRerank`
  // and `applyLexicalFusion` mutate the scores AFTER that sort, so "the caller sorted" was not even reliably
  // true. A copy, because reordering an argument is a side effect a caller cannot see.
  const ranked = [...allResults].sort((a, b) => rankOf(b) - rankOf(a));

  const fill: RecallResult[] = [];
  for (const r of ranked) {
    if (fill.length >= fillSlots) break;
    if (guaranteedIds.has(r._id)) continue;
    if (maxPerType) {
      const seen = used.get(r.type) ?? 0;
      if (seen >= capOf(r.type)) continue;   // full — keep walking, do not stop
      used.set(r.type, seen + 1);
    }
    fill.push(r);
  }

  const final = [...guaranteed, ...fill];
  // Order by the cross-encoder when it answered, otherwise by vector similarity. `??` rather than a
  // separate branch so a partial rerank — a provider that scored some passages and not others — still
  // orders sensibly instead of collapsing the unscored ones to the bottom.
  final.sort((a, b) => rankOf(b) - rankOf(a));
  // minScore filters on `score`, never on `rerankScore`. The two are different scales, and a caller's
  // threshold was written against vector similarity; silently reinterpreting it against a cross-encoder's
  // logit would change which results a fixed threshold returns without anyone touching the threshold.
  return (minScore != null && minScore > 0)
    ? final.filter(r => (r.score ?? 0) >= minScore)
    : final;
}

/**
 * Sort key, most-precise signal first.
 *
 * Cross-encoder > RRF fusion > raw vector similarity. The order is the order of how much each one
 * actually knows: the reranker read the query and the passage together, fusion only saw two rankings,
 * and the vector score saw one. `??` rather than branches so a partial signal — some records reranked,
 * some not — still orders sensibly instead of collapsing the unscored ones to the bottom.
 */
export function rankOf(r: RecallResult): number {
  return r.rerankScore ?? r.fusedScore ?? r.score ?? 0;
}

/**
 * The text a cross-encoder is asked to judge against the query.
 *
 * Deliberately NOT `summariseRecall`, which truncates a memory to 120 characters for a one-line log or
 * tool response. A reranker scoring a 117-character stub of the passage would be judging a different
 * text from the one that gets returned — worse than not reranking, because the error is invisible.
 * Capped anyway: cross-encoders have a token window, and a runaway document would be silently truncated
 * by the provider at a point we do not control.
 */
export function rerankTextOf(r: RecallResult): string {
  const raw = (() => {
    switch (r.type) {
      case 'memory': return r.fact;
      case 'entity': return [r.name, r.entityType, r.description].filter(Boolean).join(' — ');
      case 'edge':   return [`${r.from} → ${r.label} → ${r.to}`, r.description].filter(Boolean).join(' — ');
      case 'chrono': return [r.title, r.description].filter(Boolean).join(' — ');
      case 'file':   return [r.path, r.description].filter(Boolean).join(' — ');
    }
  })();
  return raw.length > RERANK_TEXT_MAX_CHARS ? raw.slice(0, RERANK_TEXT_MAX_CHARS) : raw;
}

/** One-line human summary of a recall result, for duplicate feedback. */
export function summariseRecall(r: RecallResult): string {
  switch (r.type) {
    case 'memory': return r.fact.length > 120 ? `${r.fact.slice(0, 117)}…` : r.fact;
    case 'entity': return `${r.name} (${r.entityType})`;
    case 'edge': return `${r.from} → ${r.label} → ${r.to}`;
    case 'chrono': return r.title;
    case 'file': return r.path;
  }
}
