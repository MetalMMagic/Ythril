/**
 * How long ONE call to each model slot may take, and where that number comes from.
 *
 * ## Why this exists
 *
 * The canary operator asked why they could not configure the vision deadline (2026-08-29T1445Z), and the
 * answer was that only the document pipeline was ever settable. Every other model call carried a literal: two
 * exported constants in `files/media/providers.ts`, one in `face-external.ts`, bare
 * `AbortSignal.timeout(20_000)` in the NLI and rerank clients, `30_000` in the embedder, and `?? 60_000`
 * repeated **five times** in `vlm-client.ts`. Ten slots, four mechanisms, and no way to change any of them
 * short of a rebuild.
 *
 * ## Why one slot-keyed table rather than a field on each provider block
 *
 * `MediaProviderConfig` covers `vision`, `stt`, `nli` and `rerank` — four of the ten. `embedding` has its own
 * shape, the face detector uses a literal, and the four document slots are flat keys inside
 * `DocumentProcessingConfig`. Putting `timeoutMs` on the provider interface would reach four slots and need
 * five more homes for the rest, which is the "one rule, several implementations" defect by construction. Keyed
 * by slot, every slot is reached the same way and an eleventh is one row.
 *
 * It also unlocks the three document slots that are env-only today: because the tuning is keyed BY slot rather
 * than nested inside each slot's own config block, a budget becomes settable without also opening that slot's
 * model and URL fields to the admin PATCH.
 *
 * ## Why this module imports nothing
 *
 * It is read from the config loader, from two brain clients, from the media providers and from the document
 * converter — several of which the loader itself imports. Anything it depended on would close a runtime import
 * cycle, which this codebase has produced twice already. So it is pure and total: it takes the config block as
 * an argument and returns a number. `MODEL_SLOTS` lives here for the same reason, with
 * `model-egress-policy.ts` re-exporting it as `EGRESS_SLOTS` — one vocabulary, not a second one that agrees by
 * coincidence.
 *
 * ## The stall floor is not optional here
 *
 * `hopBudgets()` feeds the stall detector the longest thing one job step may take, and `stall-floor.ts` raises
 * the stall timeout above it. Fed a constant while the operator's value is larger, the detector would keep
 * protecting the DEFAULT — and a call longer than the stall timeout gets re-queued mid-flight, abandons its
 * work, and reaches the same call again. That is the loop `stall-floor.ts` exists to prevent, re-armed by the
 * control meant to help. So the floor resolves through this module too, and
 * `a-model-slot-timeout-is-settable.test.js` asserts it.
 */

/**
 * Every model slot, in one vocabulary.
 *
 * Identical in value to what `model-egress-policy.ts` has always called `EGRESS_SLOTS`; that module now
 * re-exports this so the egress policy and the budget table cannot describe different sets of slots.
 */
export const MODEL_SLOTS = [
  'vision', 'stt', 'embedding', 'rerank', 'nli',
  'assist', 'docVlm', 'docRepair', 'docVerify', 'faceExternal',
] as const;

export type ModelSlot = (typeof MODEL_SLOTS)[number];

/** Per-slot tuning an operator may set. One field today; the shape is what keeps a second one from needing a second home. */
export interface ModelSlotTuning {
  /**
   * Wall-clock budget for ONE call to this slot, in milliseconds. Absent means the built-in default.
   *
   * On `vision` this replaces both legs. The 120 s local and 60 s external defaults exist because a cold local
   * model is slower than a hosted API; an operator who names one number has overridden that reasoning on
   * purpose, and both legs take it.
   */
  timeoutMs?: number;
}

/**
 * The shipped budget for each slot — exactly the literals these call sites carried before they were settable.
 *
 * Deliberately unchanged. A change that made budgets configurable *and* moved them would make any resulting
 * regression impossible to attribute to either half.
 */
export const MODEL_SLOT_DEFAULT_MS: Record<ModelSlot, number> = {
  vision: 120_000,        // a cold local caption model
  stt: 300_000,           // long audio; equal to the default stalledJobTimeoutMs, hence the floor
  embedding: 30_000,
  rerank: 20_000,
  nli: 20_000,
  assist: 60_000,         // the four below were `opts.timeoutMs ?? 60_000`, five times over
  docVlm: 60_000,
  docRepair: 60_000,
  docVerify: 60_000,
  faceExternal: 30_000,
};

/** What an operator may have configured, as stored. */
export type ModelSlotsConfig = Partial<Record<ModelSlot, ModelSlotTuning | undefined>>;

/**
 * The range the admin PATCH accepts for a slot budget.
 *
 * The ceiling matches the widest one already in the admin schema (`ocrTimeoutMs`, 30 minutes) rather than
 * being invented: these are all "one call to a model", and a document OCR pass is the longest such call the
 * product already permits. The floor is 1 s for the same reason `describeTimeoutMs` uses it — a sub-second
 * budget is a mistake, not a preference.
 *
 * There is deliberately **no environment variable** for these. Every setting that had both doors was found to
 * have two different legal ranges, and the fix for that shipped one commit ago; adding ten more dual-door
 * settings on the same day would be re-opening it. `YTHRIL_PINNED_FIELDS` already gives infra what it needs
 * here — it can fix a slot at whatever the config resolves to, which is the actual requirement.
 */
export const MODEL_TIMEOUT_MIN_MS = 1_000;
export const MODEL_TIMEOUT_MAX_MS = 1_800_000;

/**
 * The budget to actually use for one call to `slot`.
 *
 * **A value that is not a usable number falls back rather than propagating.** `config.json` can be hand-edited,
 * so the PATCH schema is not the only way in — and a `NaN` here would reach `AbortSignal.timeout`, where every
 * comparison against it is false. That is the same failure a mistyped `MAX_FILE_SIZE_BYTES` produced one layer
 * down, and the answer is the same: refuse the value, keep the guarantee.
 *
 * Zero and negatives fall back too. A zero budget is not "no limit", it is "abort immediately", and nobody
 * means that — it is what a half-finished edit looks like.
 */
export function slotTimeoutMs(slot: ModelSlot, cfg: ModelSlotsConfig | undefined): number {
  const set = cfg?.[slot]?.timeoutMs;
  return typeof set === 'number' && Number.isFinite(set) && set > 0 ? set : MODEL_SLOT_DEFAULT_MS[slot];
}
