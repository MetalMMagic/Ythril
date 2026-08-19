/**
 * A BYTE BUDGET for a result set, replacing the record cap that collapsed a large answer to three.
 *
 * ## Why the record cap had to go, in one measurement
 *
 * breituai-platform, 2026-08-17T1904Z, designed on the owner's instruction rather than proposed. The one
 * real overflow dump in their board space is 209,339 bytes; at their measured ~4 KB per record that is ~51
 * records. So a caller received **3 records inline plus a 204 KB file** — roughly 52k tokens to read in one
 * piece, because `read_file` takes no offset or limit. Twenty-five whole records inline would have been
 * ~100 KB.
 *
 * **The collapse to three did not reduce the caller's cost. It roughly doubled it** — or the caller
 * abandoned the remainder, which is the usual outcome and the one that looks like success.
 *
 * ## What is preserved, and it is the reason the old shape existed
 *
 * An earlier version truncated SILENTLY, and silent is worse than small. Everything here keeps that: the
 * response says `truncated`, says the budget it applied, says how many bytes it actually sent, and does so
 * on EVERY response rather than only when it bit — so absence never has to be interpreted.
 *
 * ## Bytes are the only limit, and that is deliberate
 *
 * No record count and no node count. Bytes already price a dense subtree higher than a sparse one, so
 * branching needs no separate term. A second limit would let two rules disagree about the same response,
 * which is this codebase's most-produced defect.
 */

/**
 * The operator default, near today's effective ceiling so ordinary calls behave as they did.
 *
 * ~100 KB is about 25 whole records at breituai-platform's measured ~4 KB mean — which is the count the old
 * `SPILL_RECORD_THRESHOLD` used. The point of matching it is that this change should be invisible to anyone
 * whose answers never overflowed, and a plain improvement to everyone whose did.
 */
export const DEFAULT_MAX_BYTES = 100_000;

/** Floor and ceiling on what a caller may ask for. A budget of zero would be a response with no results. */
export const MIN_MAX_BYTES = 1_000;
export const MAX_MAX_BYTES = 5_000_000;

/**
 * Characters per token, for the `maxTokens` convenience. **3.5, and the match count rounds DOWN.**
 *
 * The realistic span across these payload shapes is 3.0–3.9: JSON scaffolding runs ~2.6 (a 36-char `_id` is
 * ~1.8, ISO timestamps ~2.0, a score float ~2.25) and English prose ~4.0, blending to 3.02 for a
 * structure-heavy graph node and 3.92 for a long description.
 *
 * **The customary 4.0 is wrong in the unsafe direction**: it UNDER-counts tokens, and it is worst exactly on
 * graph-heavy responses — the calls this budget exists to make usable. Undershooting a budget costs one
 * page; overshooting costs a blown context, and those are not symmetric.
 *
 * Figures are breituai-platform's, established BPE ratios applied to a field inventory read off real
 * responses rather than a measured tokenisation, and flagged as such by them.
 */
export const DEFAULT_CHARS_PER_TOKEN = 3.5;

export interface BudgetRequest {
  /** The real control: a ceiling on the serialised response body. */
  maxBytes?: unknown;
  /** A convenience, converted to bytes by `charsPerToken`. Never the authority. */
  maxTokens?: unknown;
  /** Per-call override of the conversion ratio. */
  charsPerToken?: unknown;
}

/** What a caller's budget arguments resolve to, or the refusal text if they do not. */
export type BudgetResolution =
  | { ok: true; bytes: number }
  | { ok: false; error: string };

const posInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v > 0 ? v : null;

/**
 * Resolve `maxBytes` / `maxTokens` / `charsPerToken` into one byte figure.
 *
 * **If both arrive, the smaller resulting byte figure applies** — a caller who states two ceilings meant
 * both, and honouring the larger would ignore one of them.
 */
export function resolveBudget(req: BudgetRequest, operatorDefault = DEFAULT_MAX_BYTES): BudgetResolution {
  const { maxBytes, maxTokens, charsPerToken } = req;

  if (maxBytes !== undefined && posInt(maxBytes) === null) {
    return { ok: false, error: '`maxBytes` must be a positive integer number of bytes' };
  }
  if (maxTokens !== undefined && posInt(maxTokens) === null) {
    return { ok: false, error: '`maxTokens` must be a positive integer number of tokens' };
  }
  if (charsPerToken !== undefined
      && !(typeof charsPerToken === 'number' && Number.isFinite(charsPerToken) && charsPerToken > 0)) {
    return { ok: false, error: '`charsPerToken` must be a positive number' };
  }

  const ratio = typeof charsPerToken === 'number' ? charsPerToken : DEFAULT_CHARS_PER_TOKEN;
  const candidates: number[] = [];
  const mb = posInt(maxBytes);
  const mt = posInt(maxTokens);
  if (mb !== null) candidates.push(mb);
  if (mt !== null) candidates.push(Math.floor(mt * ratio));
  if (candidates.length === 0) candidates.push(operatorDefault);

  const chosen = Math.min(...candidates);
  return { ok: true, bytes: Math.min(Math.max(chosen, MIN_MAX_BYTES), MAX_MAX_BYTES) };
}

export interface BudgetOutcome<T> {
  /** The prefix that fits. Every entry is WHOLE — never a partial record, never a partial subtree. */
  returned: T[];
  /** The matches that did not fit, in rank order. Empty when nothing was cut. */
  remainder: T[];
  /** Serialised size of `returned`, in bytes — what `bytesReturned` reports. */
  bytesReturned: number;
  /** True when at least one match was omitted. */
  truncated: boolean;
}

/**
 * Take the longest PREFIX of `results` whose serialised size fits the budget.
 *
 * ## Atomic at the match, and always a prefix
 *
 * The unit is one match plus its entire `_graph` subtree. The first match whose complete subtree would
 * exceed the remaining budget is omitted, **and so is every match after it** — even if a later, smaller one
 * would have fitted.
 *
 * That is not a missed optimisation. A prefix is the only shape that makes `skip` correct: the caller
 * continues from `returned` and receives the next prefix, with no overlap and no gap. Packing the gaps with
 * smaller matches would produce a set that no `skip` can continue from, and a ranked answer with holes in
 * it that the caller cannot detect.
 *
 * ## The measurement is of the SERIALISED form
 *
 * Sizing the objects any other way would price a response differently from how it travels, and the budget
 * is about what arrives. The cost is one `JSON.stringify` per candidate; the loop stops at the first
 * overflow, so it is bounded by what fits plus one.
 *
 * A single match larger than the whole budget is still returned, alone. Returning nothing would turn a
 * budget into a wall and leave a caller unable to read a record at all — and clause 3 of the specification
 * is that every returned record is whole.
 */
export function applyBudget<T>(results: readonly T[], budgetBytes: number): BudgetOutcome<T> {
  const returned: T[] = [];
  // The envelope's own braces and the `results` key cost a little; charging it keeps `bytesReturned` honest
  // against the body the caller receives rather than against the array alone.
  let used = 2;
  let i = 0;
  for (; i < results.length; i++) {
    const size = JSON.stringify(results[i]).length + 1; // +1 for the separating comma
    if (returned.length > 0 && used + size > budgetBytes) break;
    returned.push(results[i]!);
    used += size;
  }
  return {
    returned,
    remainder: results.slice(i) as T[],
    bytesReturned: used,
    truncated: i < results.length,
  };
}

/**
 * The fields every budgeted response carries, truncated or not.
 *
 * **Always present, which is the point.** A field that appears only when it bit is a field whose absence has
 * to be interpreted, and the caller who most needs it is the one who does not know to look. `count` keeps
 * its existing meaning — the total number of matches — so a loop that summed `results.length` and a loop
 * that read `count` do not start disagreeing.
 */
export function budgetFields<T>(
  outcome: BudgetOutcome<T>,
  totalMatches: number,
  budgetBytes: number,
): Record<string, unknown> {
  return {
    returned: outcome.returned.length,
    count: totalMatches,
    truncated: outcome.truncated,
    budgetBytes,
    bytesReturned: outcome.bytesReturned,
  };
}

/**
 * The whole budgeted envelope for one response — the shape every result path returns.
 *
 * Eight call sites use this (recall and find-similar, plain and traversing, on both doors), and that is the
 * reason it exists rather than each building its own object: the old record cap was applied at four of those
 * eight and missing from the others until an E2E caught it, which is the same one-rule-several-places defect
 * this codebase produces most.
 *
 * `spillRemainder` is passed in rather than called here because only the caller knows the member space and
 * the request to describe the file with. **It receives ONLY the matches that did not fit** — the old dump
 * re-sent everything the caller already held, which is most of why the previous shape cost more than it
 * saved.
 */
export async function budgetedEnvelope<T, S>(opts: {
  results: readonly T[];
  budgetBytes: number;
  spillRemainder: (remainder: T[]) => Promise<S | null>;
}): Promise<{ results: T[]; fields: Record<string, unknown> }> {
  const outcome = applyBudget(opts.results, opts.budgetBytes);
  const fields = budgetFields(outcome, opts.results.length, opts.budgetBytes);
  if (outcome.truncated) {
    const spill = await opts.spillRemainder(outcome.remainder);
    if (spill) fields['remainder'] = spill;
  }
  return { results: outcome.returned, fields };
}
