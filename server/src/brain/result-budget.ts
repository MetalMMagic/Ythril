/**
 * A BYTE BUDGET for a result set, replacing the record cap that collapsed a large answer to three.
 *
 * ## Why the record cap had to go, in one measurement
 *
 * The canary operator, 2026-08-17T1904Z, designed on the owner's instruction rather than proposed. The one
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
 * TWO DEFAULTS, ONE PER DOOR, and this is a deliberate divergence rather than a drift.
 *
 * ## Why the doors differ
 *
 * `CLAUDE.md`'s rule is that MCP and REST take the same parameters. They do: both accept `maxBytes`, with the
 * same floor, the same ceiling, the same refusal text. What differs is the number applied when the caller says
 * nothing, and it differs because the two doors have different physics.
 *
 * An MCP tool result meets a hard per-result ceiling INSIDE THE CLIENT, which the caller cannot raise. A REST
 * body lands in a buffer the caller allocated. So the same response is fine on one door and unusable on the
 * other, and a single default cannot be right for both.
 *
 * ## The measurement, and it is the canary operator's own
 *
 * 2026-08-20T0925Z, from the canary. A recall answered in-budget and fully specified:
 *
 *     bytesReturned: 98,356   budgetBytes: 100,000   truncated: true   returned 29 of 40
 *
 * **Their MCP client refused it outright and spilled it to a local file.** A caller reading over MCP got
 * nothing usable from a call the server answered perfectly.
 *
 * They proposed the 100 KB figure themselves and did not ask us to change it — they asked the narrower
 * question, whether a lower default on the MCP door was something we would consider. Their own diagnosis is
 * what makes the answer yes: *"the old 25-record cap had been acting as the de facto size guard on the MCP
 * door, and removing it removed that guard along with the cliff we were complaining about."* Neither of us
 * said that out loud when the budget was designed.
 *
 * ## Where 25 000 comes from, and what it is NOT
 *
 * ~6 whole records at their measured ~4 KB mean, ~7 000 tokens at 3.5 chars/token.
 *
 * It is **not** a measurement of any client's ceiling — we have exactly one data point, that 98,356 was
 * refused, and no number for where the limit actually is. So it is chosen from the safe side of the one
 * refusal we know about, far enough below it that a client with a tighter limit still works. A caller who
 * wants more passes `maxBytes` and gets it, up to `MAX_MAX_BYTES`, on either door.
 *
 * REST keeps 100 KB — about 25 whole records at that same mean, which is the count the old
 * `SPILL_RECORD_THRESHOLD` used. Matching it is what makes the byte budget invisible to anyone whose answers
 * never overflowed.
 */
export const DEFAULT_MAX_BYTES = 100_000;

/** The MCP door's default. See the note above `DEFAULT_MAX_BYTES` — lower, deliberately, and on one door. */
export const MCP_DEFAULT_MAX_BYTES = 25_000;

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
 * Figures are the canary operator's, established BPE ratios applied to a field inventory read off real
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

/**
 * `skip` and `remainderDump`, validated in ONE place for both doors.
 *
 * Kept beside `resolveBudget` rather than parsed per route for the reason `CLAUDE.md` names as this
 * codebase's most-produced defect: two implementations of one rule, and the weaker one winning. A `skip`
 * that 400s on one door and silently floors to zero on the other would make the behaviour depend on which
 * client the caller picked.
 */
export type PagingResolution =
  | { ok: true; skip: number; remainderDump: boolean }
  | { ok: false; error: string };

export function resolvePaging(req: { skip?: unknown; remainderDump?: unknown }): PagingResolution {
  const { skip, remainderDump } = req;
  // Zero IS valid, so `posInt` is the wrong test here — the first page is `skip: 0` and a caller looping on
  // `nextSkip` has no reason to special-case its first call.
  if (skip !== undefined
      && !(typeof skip === 'number' && Number.isInteger(skip) && skip >= 0)) {
    return { ok: false, error: '`skip` must be a non-negative integer number of matches to skip' };
  }
  if (remainderDump !== undefined && typeof remainderDump !== 'boolean') {
    return { ok: false, error: '`remainderDump` must be a boolean' };
  }
  return { ok: true, skip: typeof skip === 'number' ? skip : 0, remainderDump: remainderDump === true };
}

export interface BudgetOutcome<T> {
  /**
   * The prefix that fits. Every entry is WHOLE — never a partial record, never a partial subtree.
   *
   * The unit being budgeted is therefore a match TOGETHER WITH its whole `_graph` subtree, and that is the
   * price of the guarantee: a match with a large subtree can push later matches out of the answer
   * entirely, so a deeper or wider expansion means fewer matches fit. They are absent rather than
   * shortened, which is the behaviour the owner ruled for on 2026-08-30 — a record arriving with half its
   * relationships is a worse answer than a shorter list of complete ones. Every surface that states the
   * guarantee states this alongside it; `expansion-costs-matches-and-says-so.test.js` holds the two
   * together.
   */
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
  /** The offset this page started at, so `nextSkip` is absolute rather than relative to the page. */
  skip = 0,
): Record<string, unknown> {
  return {
    returned: outcome.returned.length,
    count: totalMatches,
    truncated: outcome.truncated,
    budgetBytes,
    bytesReturned: outcome.bytesReturned,
    /*
     * WHERE TO CONTINUE FROM, present exactly when there is somewhere to continue to.
     *
     * This is what makes the dump safe to make optional. Clause 6b of the specification turns the remainder
     * file into an opt-in, and 6a supplies `skip` — but the two must ship together, because an opt-in dump
     * with no stated continuation would leave a truncated caller with no way to reach the rest. That is
     * exactly the regression #969 shipped in its first cut and had to fix.
     *
     * Stated rather than derivable. `skip + returned` is arithmetic a caller could do, and a caller who has
     * to do arithmetic to find the next page is a caller who can get it wrong — off by one, or forgetting
     * that `skip` was already non-zero on this call. The server knows the answer; it says it.
     */
    ...(outcome.truncated ? { nextSkip: skip + outcome.returned.length } : {}),
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
  /** Offset this page began at, so the reported continuation is absolute. */
  skip?: number;
  /**
   * WRITE THE REMAINDER TO THE SPACE? Default NO — clause 6b, and the reason is that it is a WRITE ON A READ
   * PATH.
   *
   * Every truncated recall used to write a file whether anyone wanted it or not. On the canary operator's
   * instance those land in a store whose `storage_used_bytes` collector already takes ~22 s to walk, so a
   * read that overflows made an operator's metrics slower. And the common caller does not want the file at
   * all — it wants the next page, which `skip` now gives.
   *
   * **This may only be optional BECAUSE `nextSkip` exists.** An opt-in dump without a stated continuation
   * strands a truncated caller, which is precisely the regression #969 shipped in its first cut. The two
   * clauses land together for that reason and must not be separated again.
   */
  remainderDump?: boolean;
}): Promise<{ results: T[]; fields: Record<string, unknown> }> {
  // THE SLICE HAPPENS HERE, not at the eight call sites. A route that sliced its own array before calling
  // this would hand over a shortened list, and `count` — documented as the total number of matches — would
  // silently start reporting the total AFTER the skip. A caller paging through would watch `count` shrink
  // page by page and have nothing left that states how big the answer actually is.
  const skip = opts.skip ?? 0;
  const page = skip > 0 ? opts.results.slice(skip) : opts.results;
  const outcome = applyBudget(page, opts.budgetBytes);
  const fields = budgetFields(outcome, opts.results.length, opts.budgetBytes, skip);
  if (outcome.truncated && opts.remainderDump === true) {
    const spill = await opts.spillRemainder(outcome.remainder);
    if (spill) fields['remainder'] = spill;
  }
  return { results: outcome.returned, fields };
}
