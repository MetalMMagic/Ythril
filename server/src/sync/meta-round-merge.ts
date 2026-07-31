/**
 * Applying a passed `meta_change` round without discarding everyone else's edits.
 *
 * ## The loss
 *
 * A `meta_change` round stored the **whole merged meta** — the proposer's patch already folded into the
 * base they read — and applying it was `updateSpace(spaceId, { meta: round.pendingMeta })`, a wholesale
 * replace. That is correct for one round at a time and silently destructive for two:
 *
 *   1. The space's meta is at version 7.
 *   2. Alice proposes a new `purpose`. Her round carries the full meta: new purpose, v7's everything else.
 *   3. Bob proposes `strictLinkage: true`. His round carries the full meta: v7's purpose, new flag.
 *   4. Alice's round passes → purpose updated, version 8.
 *   5. Bob's round passes → the whole meta is replaced by his snapshot, which still holds **v7's purpose**.
 *
 * Alice's change is gone. Nothing reports it: the round passed, the vote is recorded as carried, and the
 * space's meta is internally consistent — just missing an edit the network voted to make. Rounds run for
 * `votingDeadlineHours` (hours, sometimes days), so overlapping proposals are not an exotic race; they are
 * the normal cadence of a network where more than one operator configures a space.
 *
 * ## What is applied instead
 *
 * Only the fields the proposer actually changed. The round records them (`metaChangedFields`) alongside
 * the meta version it was computed against (`baseMetaVersion`), and conclusion re-merges those fields into
 * whatever the meta says **now**, rather than into whatever it said when the round opened.
 *
 * ## Same-field conflict: the vote wins
 *
 * When two rounds change the *same* field, the later-concluding one takes effect. That is the deliberate
 * answer, not a fallback that got left in:
 *
 *   - The network **voted** for that value. Refusing to apply a passed round because the field moved would
 *     turn a carried motion into a silent no-op, which is the failure this module exists to remove, just
 *     relocated.
 *   - Reopening or re-voting cannot be done here — conclusion runs on every peer independently, and a
 *     decision that needs a new round is not a decision one peer may take alone.
 *
 * So the conflict is *reported*, not resolved by refusal: {@link applyMetaRound} returns which fields were
 * overwritten while the meta had moved on, and the caller logs them. An operator whose edit was superseded
 * learns it from the log rather than from noticing the value is wrong weeks later.
 *
 * ## Peers that have not upgraded
 *
 * `VoteRound` is gossiped, so a round proposed by an older peer arrives with neither field set. Those apply
 * **wholesale**, exactly as before. This is the only safe reading: an older proposer computed
 * `pendingMeta` as the complete intended result, and field-merging a round whose changed-field list is
 * unknown would apply an empty set — a passed round that changes nothing at all. The absence of the
 * version is therefore the compatibility switch, and the pre-upgrade behaviour is the fallback.
 */
import type { SpaceMeta } from '../config/types.js';

/** The parts of a `VoteRound` this module reads. Kept structural so it is testable without a full round. */
export interface MetaRoundProposal {
  /** The full merged meta computed when the round was proposed. */
  pendingMeta: SpaceMeta;
  /**
   * Top-level meta fields the proposer changed. Absent on rounds from peers predating field-merge — see
   * the module header for why those must still apply wholesale.
   */
  metaChangedFields?: string[];
  /** The space's `meta.version` the proposal was computed against. Absent on pre-upgrade rounds. */
  baseMetaVersion?: number;
}

/** Housekeeping the space layer owns — a round must never carry these across. */
const HOUSEKEEPING = ['version', 'updatedAt', 'previousVersions'] as const;

export interface MetaRoundApplication {
  /** The meta to hand to `updateSpace`. */
  meta: Omit<SpaceMeta, 'version' | 'updatedAt' | 'previousVersions'>;
  /** Fields whose current value the round overwrote while the meta had moved past its base version. */
  conflicts: string[];
  /** True when the round carried no provenance and was applied wholesale (pre-upgrade proposer). */
  wholesale: boolean;
}

/**
 * Compute the meta a passed `meta_change` round should produce, given the space's meta right now.
 *
 * Pure: takes the current meta and the round, returns the result and what it collided with. Conclusion
 * happens independently on every peer, so this has to be a function of state both peers can see — anything
 * read from local wall-clock or ambient config would let two peers apply the same round differently.
 */
export function applyMetaRound(current: SpaceMeta | undefined, round: MetaRoundProposal): MetaRoundApplication {
  const strip = (m: SpaceMeta): Omit<SpaceMeta, 'version' | 'updatedAt' | 'previousVersions'> => {
    const { version: _v, updatedAt: _u, previousVersions: _p, ...rest } = m;
    return rest;
  };

  const fields = round.metaChangedFields?.filter(f => !(HOUSEKEEPING as readonly string[]).includes(f));

  // Pre-upgrade round, or one whose proposer recorded no provenance: apply exactly as before. Field-merging
  // an unknown changed-set would mean applying nothing, so a carried motion would silently do nothing.
  if (round.baseMetaVersion === undefined || fields === undefined) {
    return { meta: strip(round.pendingMeta), conflicts: [], wholesale: true };
  }

  const base = current ? strip(current) : {};
  const merged: Record<string, unknown> = { ...base };
  const proposed = strip(round.pendingMeta) as Record<string, unknown>;
  // Only when the meta has actually moved since the proposal can an overwrite be a conflict. Equal
  // versions mean nothing else concluded in between, so every write is uncontested.
  const moved = (current?.version ?? 0) !== round.baseMetaVersion;

  /**
   * The meta as it stood when the round was proposed, recovered from the space's own version history.
   *
   * Without it, "the meta moved and this round is writing field X" is indistinguishable from "someone
   * else changed field X" — and reporting the first as a collision would fire on every ordinary
   * concurrent edit of *different* fields, which is precisely the case this module makes safe. A warning
   * that cries wolf on the normal path is one operators learn to skip.
   *
   * `previousVersions` is capped, so on a space with a burst of edits the base may have rolled off. Then
   * the coarse rule stands: report the overwrite rather than assert it was uncontested. Over-reporting a
   * genuinely rare case is the right side to err on; the value is still applied either way.
   */
  const baseMeta: Record<string, unknown> | undefined =
    current?.version === round.baseMetaVersion
      ? (base as Record<string, unknown>)
      : current?.previousVersions?.find(h => h.version === round.baseMetaVersion)?.meta as Record<string, unknown> | undefined;

  const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  /** Did somebody ELSE change this field since the round was proposed? */
  const contested = (field: string, currentValue: unknown, incoming: unknown) =>
    moved
    && differs(currentValue, incoming)                          // the round is actually changing it now
    && (baseMeta === undefined || differs(baseMeta[field], currentValue)); // and not from where it started

  const conflicts: string[] = [];

  for (const field of fields) {
    if (field === 'typeSchemas') {
      // Merged per knowledge-type and per type name rather than replaced, matching what `mergeSpaceMeta`
      // does on the request path. A type another round added stays; one this round added or edited wins.
      //
      // A type the proposer *deleted* is therefore not deleted here — but it was never deletable this way:
      // under merge semantics an absent type is indistinguishable from a removed one, which is exactly why
      // deletion goes through the schema PUT with its own precondition instead.
      const currentTs = ((base as SpaceMeta).typeSchemas ?? {}) as Record<string, object>;
      const proposedTs = ((proposed as SpaceMeta).typeSchemas ?? {}) as Record<string, object>;
      const baseTs = ((baseMeta?.['typeSchemas'] ?? {}) as Record<string, object>);
      const mergedTs: Record<string, unknown> = { ...currentTs };
      for (const [kt, ktMap] of Object.entries(proposedTs)) {
        if (!ktMap) continue;
        mergedTs[kt] = { ...(currentTs[kt] ?? {}), ...ktMap };
        // Per knowledge-type, on the same rule as a scalar: contested only if this round changes it AND
        // it is no longer where the round found it.
        if (moved && differs(currentTs[kt], mergedTs[kt])
            && (baseMeta === undefined || differs(baseTs[kt], currentTs[kt]))) {
          conflicts.push(`typeSchemas.${kt}`);
        }
      }
      merged['typeSchemas'] = mergedTs;
      continue;
    }

    const incoming = proposed[field];
    if (contested(field, merged[field], incoming)) conflicts.push(field);
    // `undefined` is a real proposal: it is how a scalar is cleared. Deleting the key rather than assigning
    // it keeps the stored object free of explicit-undefined properties, which JSON round-trips away anyway.
    if (incoming === undefined) delete merged[field];
    else merged[field] = incoming;
  }

  return {
    meta: merged as Omit<SpaceMeta, 'version' | 'updatedAt' | 'previousVersions'>,
    conflicts,
    wholesale: false,
  };
}

/**
 * Which top-level meta fields a PATCH body actually proposes to change.
 *
 * Taken from the request body's own keys, not from diffing the result against the base. A patch that sets
 * a field to the value it already holds is still a proposal to set it — the network votes on the intent,
 * and diffing would quietly drop that field from the round so a concurrent change to it would win by
 * default.
 */
export function proposedMetaFields(incoming: Partial<SpaceMeta>): string[] {
  return Object.keys(incoming).filter(k => !(HOUSEKEEPING as readonly string[]).includes(k));
}
